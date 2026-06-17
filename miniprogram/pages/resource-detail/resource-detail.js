const api = require('../../utils/api');
const { formatDateTime, statusLabel } = require('../../utils/format');
const { requestSubscribe } = require('../../utils/subscribe');
const { ensureBuyerBidDeposit } = require('../../utils/deposit');
const { getLocation, distanceKm, formatDistance, FAR_THRESHOLD_KM } = require('../../utils/location');
const app = getApp();

Page({
  data: {
    id: 0, r: null, bids: [], photos: [],
    user: null, isMine: false,
    isSupply: true,
    kindLabel: '货源', kindCls: 'tag',
    canBid: false, blockReason: '',
    bidPrice: '', nextLimit: 0, bidding: false, ending: false,
    showAuto: false, autoMax: '',
    statusLabel: '',
    distText: '', distNear: false, distFar: false,
    reviewMode: false,
    // 还价弹窗
    showHaggle: false, showFreight: false,
    haggleVal: 0, haggleMin: 0, haggleMax: 0, haggleReasonable: true,
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

      let canBid = false, blockReason = '';
      if (resource.status !== 'auctioning') {
        blockReason = statusLabel(resource.status);
      } else if (isMine) {
        blockReason = '不能参与自己发布的报价';
      } else if (isSupply && me.role !== 'buyer') {
        blockReason = '货源仅限采购商报价';
      } else if (!isSupply && me.role !== 'farm') {
        blockReason = '求购仅限养殖场应标';
      } else {
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
      this.setData({
        r: resource,
        bids: bidsMapped,
        photos,
        isSupply,
        kindLabel: isSupply ? '货源' : '求购',
        kindCls: isSupply ? 'tag' : 'tag-b',
        nextLimit,
        bidPrice: this.data.bidPrice || String(nextLimit),
        isMine, canBid, blockReason,
        statusLabel: statusLabel(resource.status),
        farmSizeText,
        distText, distNear, distFar,
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
    // 走原有 placeBid 逻辑，bidPrice 设为滑块当前值
    this.setData({ bidPrice: String(this.data.haggleVal) });
    await this.placeBid();
    this.setData({ showHaggle: false });
  },

  // 运费说明 / 留言 / 电话
  showFreight() { this.setData({ showFreight: true }); },
  closeFreight() { this.setData({ showFreight: false }); },
  callPhone() {
    const phone = this.data.r && this.data.r.farm && this.data.r.farm.phone;
    if (!phone || /^wx_/i.test(phone)) {
      return wx.showToast({ title: '对方未登记电话，请用"留言"联系', icon: 'none', duration: 2500 });
    }
    wx.makePhoneCall({ phoneNumber: phone, fail: () => {} });
  },
  callOther() {
    // 用微信客服会话作为留言入口
    wx.showActionSheet({
      itemList: ['📞 电话联系卖方', '📲 联系平台客服'],
      success: (r) => {
        if (r.tapIndex === 0) this.callPhone();
        else wx.openCustomerServiceChat && wx.openCustomerServiceChat({ extInfo: { url: '' }, corpId: '', fail: () => wx.showToast({ title: '请在订单详情联系客服', icon: 'none' }) });
      },
    });
  },

  async placeBid() {
    if (!this.data.canBid) return wx.showToast({ title: this.data.blockReason, icon: 'none' });

    // 履约保证金按场缴纳：未缴则弹窗直接拉起支付，支付完留在本页继续报价
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
      wx.showToast({ title: this.data.isSupply ? '报价成功' : '报价成功' });
      this.setData({ bidPrice: '' });
      await this.load();
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

  openSeller() {
    if (!this.data.r || !this.data.r.farm) return;
    wx.navigateTo({ url: '/pages/seller-profile/seller-profile?id=' + this.data.r.farm.id });
  },

  openRouteMap() {
    const r = this.data.r;
    console.log('[openRouteMap] _myLoc=', this._myLoc, 'r.lat=', r && r.lat, 'r.lng=', r && r.lng);
    if (!r) return wx.showToast({ title: '资源未加载', icon: 'none' });
    if (r.lat == null || r.lng == null) {
      return wx.showToast({ title: '该货源未登记位置，无法显示路线', icon: 'none', duration: 2500 });
    }
    // 没拿到我的位置时也允许进地图：用户在地图页可以看到货源位置 + 拉起原生导航
    const myLat = (this._myLoc && this._myLoc.lat) || r.lat;
    const myLng = (this._myLoc && this._myLoc.lng) || r.lng;
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
