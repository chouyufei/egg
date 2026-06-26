const { defaultShare } = require('../../utils/share');
const api = require('../../utils/api');
const { formatTime, statusLabel, statusTag } = require('../../utils/format');
const { getLocation, distanceKm, formatDistance } = require('../../utils/location');
const app = getApp();

Page({
  onShareAppMessage() { return defaultShare(); },
  onShareTimeline()   { return defaultShare(); },
  data: {
    id: 0, order: null, chats: [], msg: '',
    user: null,
    statusText: '', statusCls: '',
    otherLabel: '', otherName: '', otherPhone: '',
    showDispute: false, dispute: { type: '', description: '' },
    serviceQr: { url: '', owner: '' },
    distText: '',
    isBuyerSide: false,   // 本订单中本人是否为买方（参与货源出价 / 发布求购）
    weightSpecsList: [],
  },
  onLoad(opt) {
    this.setData({ id: Number(opt.id), user: app.globalData.user });
    this.load();
    this.poll = setInterval(() => this.load(), 5000);
    // 静默拿一次当前定位，下次 load 时计算距离
    getLocation().then(loc => { this._myLoc = loc; this.computeDist(); });
  },
  onUnload() { clearInterval(this.poll); },
  computeDist() {
    if (!this._myLoc || !this.data.order) return;
    const dst = this._otherPoint(this.data.order);
    if (!dst) return;
    const km = distanceKm(this._myLoc.lat, this._myLoc.lng, dst.lat, dst.lng);
    if (km != null) this.setData({ distText: formatDistance(km) });
  },
  // "对方"端点：按本订单角色判（不依赖 user.role 全局切换）
  //   我=卖方（farm_id===me）→ 对方=买家
  //   我=买方（buyer_id===me）→ 对方=货源点（优先 resource.lat/lng）/ 养殖场
  //   都不匹配（admin / 看他人订单）→ 默认按"我是买家"看货源点
  _otherPoint(order) {
    if (!order) return null;
    const me = this.data.user;
    const meIsSeller = !!(me && order.farm_id === me.id);
    if (meIsSeller) {
      const b = order.buyer;
      return (b && b.lat != null && b.lng != null)
        ? { lat: b.lat, lng: b.lng, label: b.name || '采购方', address: b.region || '' }
        : null;
    }
    const r = order.resource;
    if (r && r.lat != null && r.lng != null) {
      return { lat: r.lat, lng: r.lng, label: (order.farm && order.farm.name) || r.title || '货源地', address: r.region || '' };
    }
    const f = order.farm;
    if (f && f.lat != null && f.lng != null) {
      return { lat: f.lat, lng: f.lng, label: f.name || '养殖场', address: f.region || '' };
    }
    return null;
  },
  report() {
    const o = this.data.order;
    const no = (o && o.order_no) ? '&no=' + encodeURIComponent(o.order_no) : '';
    wx.navigateTo({ url: '/pages/report/report?t=order&id=' + this.data.id + no });
  },

  copyOrderNo() {
    const no = this.data.order && (this.data.order.order_no || ('#' + this.data.order.id));
    if (!no) return;
    wx.setClipboardData({
      data: String(no),
      success: () => wx.showToast({ title: '订单编号已复制', icon: 'success' }),
    });
  },

  openRouteMap() {
    const dst = this._otherPoint(this.data.order);
    if (!dst) return wx.showToast({ title: '对方未登记位置，无法显示路线', icon: 'none', duration: 2500 });
    // 「我的位置」优先级：首页自选地址 > 当前 GPS > 对方点兜底
    const custom = wx.getStorageSync('customLoc');
    let myLat, myLng;
    if (custom && Number.isFinite(custom.lat) && Number.isFinite(custom.lng)) {
      myLat = custom.lat; myLng = custom.lng;
    } else if (this._myLoc) {
      myLat = this._myLoc.lat; myLng = this._myLoc.lng;
    } else {
      myLat = dst.lat; myLng = dst.lng;
    }
    const q = `?mLat=${myLat}&mLng=${myLng}` +
              `&dLat=${dst.lat}&dLng=${dst.lng}` +
              `&dLabel=${encodeURIComponent(dst.label)}` +
              `&dAddr=${encodeURIComponent(dst.address || '')}` +
              `&orderId=${this.data.id}`;
    wx.navigateTo({
      url: '/pages/route-map/route-map' + q,
      fail: (e) => {
        console.error('[openRouteMap] navigateTo failed', e);
        wx.showToast({ title: '跳转失败: ' + (e && e.errMsg || ''), icon: 'none', duration: 3000 });
      },
    });
  },
  async load() {
    try {
      const { order, chats, service_qr } = await api.get('/orders/' + this.data.id);
      const me = this.data.user;
      // 卖方判定按本订单 farm_id（单个账号可能同时卖货 / 买货）
      const isSellerSide = me && order.farm_id === me.id;
      const other = isSellerSide ? order.buyer : order.farm;
      // weight_specs JSON 解析。订单成交后每个斤值的"成交价" = 该斤值起报价
      // + (订单 final_price - 资源 start_price) 差额；与详情页"各规格价格联动"
      // 思路一致，保证所有斤值按同一差额收尾。
      let weightSpecsList = [];
      if (order.resource && order.resource.weight_specs) {
        try {
          const parsed = typeof order.resource.weight_specs === 'string'
            ? JSON.parse(order.resource.weight_specs) : order.resource.weight_specs;
          if (Array.isArray(parsed)) {
            const delta = Number(order.final_price || 0) - Number(order.resource.start_price || 0);
            weightSpecsList = parsed.map(s => ({
              weight: s.weight,
              boxes: s.boxes,
              startPrice: s.price,
              price: Number((Number(s.price) + delta).toFixed(2)),  // 成交价
            }));
          }
        } catch (e) {}
      }
      this.setData({
        order,
        chats: chats.map(c => ({ ...c, mine: c.sender_id === me.id, timeText: formatTime(c.created_at) })),
        statusText: statusLabel(order.status),
        statusCls: statusTag(order.status),
        otherLabel: isSellerSide ? '采购商' : '养殖场',
        otherName: other ? other.name : '-',
        otherPhone: other ? other.phone : '-',
        serviceQr: service_qr || { url: '', owner: '' },
        isBuyerSide: !isSellerSide && order.buyer_id === me.id,
        weightSpecsList,
      });
      this.computeDist();
    } catch (e) {}
  },
  previewQr() {
    const url = this.data.serviceQr.url;
    if (url) wx.previewImage({ current: url, urls: [url] });
  },
  saveQr() {
    const url = this.data.serviceQr.url;
    if (!url) return;
    wx.showLoading({ title: '保存中…' });
    wx.downloadFile({
      url,
      success: (r) => {
        wx.saveImageToPhotosAlbum({
          filePath: r.tempFilePath,
          success: () => { wx.hideLoading(); wx.showToast({ title: '已保存到相册', icon: 'success' }); },
          fail: () => { wx.hideLoading(); wx.showToast({ title: '保存失败，请允许相册权限', icon: 'none' }); },
        });
      },
      fail: () => { wx.hideLoading(); wx.showToast({ title: '下载失败', icon: 'none' }); },
    });
  },
  async createGroup() {
    try { await api.post('/orders/' + this.data.id + '/create-group'); wx.showToast({ title: '群已创建' }); await this.load(); }
    catch (e) {}
  },
  async send() {
    const v = (this.data.msg || '').trim();
    if (!v) return;
    try { await api.post('/orders/' + this.data.id + '/chat', { content: v }); this.setData({ msg: '' }); await this.load(); }
    catch (e) {}
  },
  confirm() {
    wx.showModal({
      title: '确认收货', content: '确认后保证金将释放，且无法发起纠纷',
      success: async (r) => {
        if (!r.confirm) return;
        try { await api.post('/orders/' + this.data.id + '/confirm'); wx.showToast({ title: '已确认' }); await this.load(); }
        catch (e) {}
      },
    });
  },
  openDispute() { this.setData({ showDispute: true }); },
  closeDispute() { this.setData({ showDispute: false }); },
  noop() {},
  onDisputeInput(e) {
    const key = e.currentTarget.dataset.k;
    if (!key) return;
    this.setData({ ['dispute.' + key]: e.detail.value });
  },
  async submitDispute() {
    if (!this.data.dispute.type) return wx.showToast({ title: '请填写类型', icon: 'none' });
    try {
      await api.post('/orders/' + this.data.id + '/dispute', this.data.dispute);
      wx.showToast({ title: '纠纷已提交' });
      this.setData({ showDispute: false, dispute: { type: '', description: '' } });
      await this.load();
    } catch (e) {}
  },
});
