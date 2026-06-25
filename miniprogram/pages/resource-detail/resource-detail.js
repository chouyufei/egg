const api = require('../../utils/api');
const { formatDateTime, statusLabel } = require('../../utils/format');
const { requestSubscribe } = require('../../utils/subscribe');
const { ensureBuyerBidDeposit } = require('../../utils/deposit');
const { getLocation, distanceKm, formatDistance, FAR_THRESHOLD_KM } = require('../../utils/location');
const app = getApp();

Page({
  data: {
    id: 0, r: null, bids: [], photos: [],
    user: null, isMine: false, needLogin: false,
    isSupply: true,
    kindLabel: '货源', kindCls: 'tag',
    canBid: false, blockReason: '',
    bidPrice: '', nextLimit: 0, bidding: false, ending: false,
    showAuto: false, autoMax: '',
    statusLabel: '',
    distText: '', distNear: false, distFar: false,
    reviewMode: false,
    // 还价弹窗
    showHaggle: false,
    haggleVal: 0, haggleMin: 0, haggleMax: 0, haggleReasonable: true,
    priceUnit: '箱',
    weightSpecsList: [],   // 详情页展示各斤值规格的箱数 / 价格
  },
  onLoad(opt) {
    this.setData({ reviewMode: !!app.globalData.reviewMode });
    this.setData({ id: Number(opt.id), user: app.globalData.user });
    this.load();
    this.poll = setInterval(() => this.load(), 5000);
    // 静默拿一次当前定位，下次 load 时计算距离
    getLocation().then(loc => { this._myLoc = loc; this.load(); });
  },
  onUnload() { clearInterval(this.poll); },

  // 转发到微信好友 / 群（裂变分享）
  onShareAppMessage() {
    const r = this.data.r;
    const id = this.data.id;
    const path = '/pages/resource-detail/resource-detail?id=' + id;
    if (!r) return { title: '凤伯乐 · 鸡蛋询价撮合', path };
    const isSupply = (r.kind || 'supply') === 'supply';
    const watchers = r.bidder_count || r.view_count || 0;
    const region = r.region || '';
    const tag = r.egg_color || '';
    const title = isSupply
      ? `🔥 一车${region}${tag}鸡蛋已 ${watchers} 人围观，现价 ¥${r.current_price}/${r.unit_size || '箱'}，赶紧抢锁！`
      : `🛒 ${region}求购${tag}鸡蛋 ${r.quantity} ${r.unit_size || '车'}，有货速来抢报，价高者优先！`;
    return {
      title,
      path,
      imageUrl: (r.photos && r.photos[0]) || '',
    };
  },

  // 转发到朋友圈
  onShareTimeline() {
    const r = this.data.r;
    const id = this.data.id;
    if (!r) return { title: '凤伯乐 · 鸡蛋询价撮合', query: 'id=' + id };
    const isSupply = (r.kind || 'supply') === 'supply';
    const region = r.region || '';
    const tag = r.egg_color || '';
    const title = isSupply
      ? `🔥 ${region}${tag}鸡蛋 现价 ¥${r.current_price}/${r.unit_size || '箱'}，多人围观中`
      : `🛒 ${region}求购${tag}鸡蛋 ${r.quantity} ${r.unit_size || '车'}，有货请进`;
    return {
      title,
      query: 'id=' + id,
      imageUrl: (r.photos && r.photos[0]) || '',
    };
  },
  async load() {
    try {
      const { resource, bids } = await api.get('/resources/' + this.data.id);
      const photos = resource.photos && resource.photos.length ? resource.photos
        : ['https://placehold.co/800x400/f6b821/fff?text=Egg'];
      const isSupply = (resource.kind || 'supply') === 'supply';
      const me = this.data.user;
      const isMine = resource.farm_id === (me && me.id);

      const nextLimit = isSupply
        ? Number((resource.current_price + resource.min_increment).toFixed(2))
        : Number((resource.current_price - resource.min_increment).toFixed(2));

      // 未登录访客（通过分享链接进入）：允许浏览，不允许出价；提示登录
      const needLogin = !me;
      let canBid = false, blockReason = '';
      if (needLogin) {
        blockReason = '登录后可参与报价 / 联系卖方';
      } else if (resource.status !== 'auctioning') {
        blockReason = statusLabel(resource.status);
      } else if (isMine) {
        blockReason = '不能参与自己发布的报价';
      } else if (!isSupply && me.license_status !== 'approved') {
        // 求购需求：仅资质认证通过的养殖场可应标
        blockReason = '应标求购需先完成鸡场资质认证';
      } else {
        // 货源出价：任何登录用户均可（不再限 role）
        canBid = true;
      }

      const bidsMapped = bids.map(b => ({ ...b, timeText: formatDateTime(b.created_at) }));

      // 距离计算：用本地缓存或刚拿到的定位
      let distText = '', distNear = false, distFar = false;
      const my = this._myLoc;
      if (my && resource.lat != null && resource.lng != null) {
        const km = distanceKm(my.lat, my.lng, resource.lat, resource.lng);
        if (km != null) {
          distText = formatDistance(km);
          distNear = km <= FAR_THRESHOLD_KM;
          distFar = km > FAR_THRESHOLD_KM;
        }
      }

      const sizeNum = Number(resource.farm_size);
      const farmSizeText = sizeNum >= 10000
        ? (sizeNum / 10000).toFixed(sizeNum % 10000 === 0 ? 0 : 1) + ' 万只'
        : (sizeNum ? sizeNum + ' 只' : '');
      // 价格单位（用于还价弹窗显示 "/箱" / "/车"）
      const unitLabel = resource.unit_label || '元/箱';
      const priceUnit = unitLabel.replace(/^元\//, '');
      // weight_specs（JSON 字符串）→ 解析成列表
      // 每条 spec 的 price 是发布时定的"起报价"；展示价 = price + (current_price - start_price) 差额，
      // 让出价一次后所有斤值价格联动同步（截图反馈）
      let weightSpecsList = [];
      if (resource.weight_specs) {
        try {
          const parsed = typeof resource.weight_specs === 'string'
            ? JSON.parse(resource.weight_specs) : resource.weight_specs;
          if (Array.isArray(parsed)) {
            const delta = Number(resource.current_price) - Number(resource.start_price);
            weightSpecsList = parsed.map(s => ({
              weight: s.weight,
              boxes: s.boxes,
              price: s.price,
              current: Number((Number(s.price) + delta).toFixed(2)),
            }));
          }
        } catch (e) {}
      }
      this.setData({
        r: resource,
        bids: bidsMapped,
        photos,
        isSupply,
        kindLabel: isSupply ? '货源' : '求购',
        kindCls: isSupply ? 'tag' : 'tag-b',
        nextLimit,
        bidPrice: this.data.bidPrice || String(nextLimit),
        isMine, canBid, blockReason, needLogin,
        statusLabel: statusLabel(resource.status),
        farmSizeText,
        distText, distNear, distFar,
        priceUnit,
        weightSpecsList,
      });
    } catch (e) {}
  },
  onEnd() { this.load(); },
  openAuto() { this.setData({ showAuto: true, autoMax: String(this.data.nextLimit) }); },
  closeAuto() { this.setData({ showAuto: false }); },
  noop() {},

  // 我要还价：弹窗 + 滑块（参考行业批发还价模式）
  openHaggle() {
    if (!this.data.canBid) return wx.showToast({ title: this.data.blockReason, icon: 'none' });
    const r = this.data.r;
    const inc = Number(r.min_increment) || 1;
    const cur = Number(r.current_price);
    let min, max, val;
    if (this.data.isSupply) {
      // 货源（买家还价 / 加价）：min = 当前价；max = 当前价 + 10 档加价；初始 = nextLimit
      min = cur;
      max = +(cur + inc * 10).toFixed(2);
      val = this.data.nextLimit;
    } else {
      // 求购（卖家应标 / 降价）：min = 当前价 - 10 档；max = 当前价；初始 = nextLimit
      min = Math.max(0, +(cur - inc * 10).toFixed(2));
      max = cur;
      val = this.data.nextLimit;
    }
    this.setData({
      showHaggle: true,
      haggleMin: min,
      haggleMax: max,
      haggleVal: val,
      haggleReasonable: this._reasonable(val, min, max),
    });
  },
  closeHaggle() { this.setData({ showHaggle: false }); },
  _reasonable(v, min, max) {
    // 在中段 60% 区间内视为"价格合理"
    const span = max - min;
    if (span <= 0) return true;
    const lo = min + span * 0.2;
    const hi = max - span * 0.2;
    return v >= lo && v <= hi;
  },
  onHaggleSlider(e) {
    const v = Number(e.detail.value);
    this.setData({ haggleVal: v, haggleReasonable: this._reasonable(v, this.data.haggleMin, this.data.haggleMax) });
  },
  haggleMinus() {
    const inc = Number(this.data.r.min_increment) || 1;
    const v = Math.max(this.data.haggleMin, +(this.data.haggleVal - inc).toFixed(2));
    this.setData({ haggleVal: v, haggleReasonable: this._reasonable(v, this.data.haggleMin, this.data.haggleMax) });
  },
  hagglePlus() {
    const inc = Number(this.data.r.min_increment) || 1;
    const v = Math.min(this.data.haggleMax, +(this.data.haggleVal + inc).toFixed(2));
    this.setData({ haggleVal: v, haggleReasonable: this._reasonable(v, this.data.haggleMin, this.data.haggleMax) });
  },
  async submitHaggle() {
    // 出价前再弹一次确认（截图反馈要求）
    const isSupply = this.data.isSupply;
    const verb = isSupply ? '加价' : '让价';
    const confirmed = await new Promise(resolve => {
      wx.showModal({
        title: `确认${verb}`,
        content: `确认以 ¥${this.data.haggleVal}/箱 ${verb}吗？\n该价格将作为最小斤值价，其它斤值价格按差额同步调整。`,
        confirmText: `确认${verb}`,
        cancelText: '再想想',
        confirmColor: '#e0a40d',
        success: r => resolve(!!r.confirm),
        fail: () => resolve(false),
      });
    });
    if (!confirmed) return;
    this.setData({ bidPrice: String(this.data.haggleVal) });
    await this.placeBid();
    this.setData({ showHaggle: false });
  },


  async placeBid() {
    if (!this.data.canBid) return wx.showToast({ title: this.data.blockReason, icon: 'none' });

    // 服务保障金按场缴纳：未缴则弹窗直接拉起支付，支付完留在本页继续报价
    const depositOk = await ensureBuyerBidDeposit(this.data.id);
    if (!depositOk) return;

    const price = Number(this.data.bidPrice);
    if (!price) return wx.showToast({ title: '请输入价格', icon: 'none' });
    if (this.data.isSupply && price < this.data.nextLimit) {
      return wx.showToast({ title: '报价至少 ¥' + this.data.nextLimit, icon: 'none' });
    }
    if (!this.data.isSupply && price > this.data.nextLimit) {
      return wx.showToast({ title: '报价至多 ¥' + this.data.nextLimit, icon: 'none' });
    }

    // 报价前先请求微信订阅消息授权（中标 / 未中标 两个模板），用户拒绝也不影响报价
    await requestSubscribe(['auction_won', 'auction_lost']);

    this.setData({ bidding: true });
    try {
      await api.post('/bids', { resource_id: this.data.id, price });
      this.setData({ bidPrice: '', showHaggle: false });
      await this.load();
      // 用 modal 替代 toast：保证用户充值返回后能明确看到「报价成功」，
      // 避免误以为没成功又重复出价
      wx.showModal({
        title: '✅ 报价成功',
        content: `您已成功报价 ¥${price}，当前价格 ¥${this.data.r.current_price}，可在「我的参与」查看进展。`,
        showCancel: false,
        confirmText: '我知道了',
        confirmColor: '#06883b',
      });
    } catch (e) {} finally { this.setData({ bidding: false }); }
  },

  async setAuto() {
    if (!this.data.isSupply) return wx.showToast({ title: '求购暂不支持自动报价', icon: 'none' });
    const max = Number(this.data.autoMax);
    if (!max || max < this.data.nextLimit) {
      return wx.showToast({ title: '最高价需 ≥ ¥' + this.data.nextLimit, icon: 'none' });
    }
    try {
      await api.post('/bids/auto', { resource_id: this.data.id, max_price: max });
      wx.showToast({ title: '自动报价已开启' });
      this.setData({ showAuto: false });
      await this.load();
    } catch (e) {}
  },

  cancel() {
    wx.showModal({
      title: '取消报价', content: '确认取消？已有报价后无法取消',
      success: async (r) => {
        if (!r.confirm) return;
        try { await api.post('/resources/' + this.data.id + '/cancel'); wx.showToast({ title: '已取消' }); setTimeout(() => wx.navigateBack(), 500); }
        catch (e) {}
      },
    });
  },

  report() {
    wx.navigateTo({ url: '/pages/report/report?t=resource&id=' + this.data.id });
  },

  openSeller() {
    if (!this.data.r || !this.data.r.farm) return;
    wx.navigateTo({ url: '/pages/seller-profile/seller-profile?id=' + this.data.r.farm.id });
  },

  openRouteMap() {
    const r = this.data.r;
    if (!r) return wx.showToast({ title: '资源未加载', icon: 'none' });
    if (r.lat == null || r.lng == null) {
      return wx.showToast({ title: '该货源未登记位置，无法显示路线', icon: 'none', duration: 2500 });
    }
    // 「我的位置」优先级：首页自选地址 > 当前 GPS > 货源点兜底
    const custom = wx.getStorageSync('customLoc');
    let myLat, myLng;
    if (custom && Number.isFinite(custom.lat) && Number.isFinite(custom.lng)) {
      myLat = custom.lat; myLng = custom.lng;
    } else if (this._myLoc) {
      myLat = this._myLoc.lat; myLng = this._myLoc.lng;
    } else {
      myLat = r.lat; myLng = r.lng;
    }
    const label = (r.farm && r.farm.name) || r.title || '货源地';
    const addr = r.region || '';
    const q = `?mLat=${myLat}&mLng=${myLng}` +
              `&dLat=${r.lat}&dLng=${r.lng}` +
              `&dLabel=${encodeURIComponent(label)}` +
              `&dAddr=${encodeURIComponent(addr)}`;
    wx.navigateTo({
      url: '/pages/route-map/route-map' + q,
      fail: (e) => {
        console.error('[openRouteMap] navigateTo failed', e);
        wx.showToast({ title: '跳转失败: ' + (e && e.errMsg || ''), icon: 'none', duration: 3000 });
      },
    });
  },

  relist() {
    wx.navigateTo({ url: '/pages/publish/publish?from=' + this.data.id });
  },

  // 未登录访客点登录：去登录页，登录成功后返回首页（用户可重走分享路径）
  goLogin() {
    wx.redirectTo({ url: '/pages/login/login' });
  },

  // 删除（仅未成交 / 已取消的资源由发布方主动移除）
  deleteRes() {
    wx.showModal({
      title: '删除货源',
      content: '删除后将无法恢复，且在"我的参与/我的发布"列表中不再出现。确认删除？',
      confirmText: '确认删除',
      confirmColor: '#ee0a24',
      success: async (r) => {
        if (!r.confirm) return;
        try {
          await api.post('/resources/' + this.data.id + '/delete');
          wx.showToast({ title: '已删除', icon: 'success' });
          setTimeout(() => wx.navigateBack(), 600);
        } catch (e) {}
      },
    });
  },

  endNow() {
    const price = this.data.r.current_price;
    wx.showModal({
      title: '确认成交并成交',
      content: `确认以当前最高价 ¥${price} 成交？后续不再接受报价。`,
      confirmText: '确认成交',
      success: async (r) => {
        if (!r.confirm) return;
        this.setData({ ending: true });
        try {
          await api.post('/resources/' + this.data.id + '/end-now');
          wx.showToast({ title: '已成交', icon: 'success' });
          await this.load();
        } catch (e) {} finally { this.setData({ ending: false }); }
      },
    });
  },
});
