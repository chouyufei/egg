const api = require('../../utils/api');
const { formatDateTime, statusLabel } = require('../../utils/format');
const { requestSubscribe } = require('../../utils/subscribe');
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
  },
  onLoad(opt) {
    this.setData({ id: Number(opt.id), user: app.globalData.user });
    this.load();
    this.poll = setInterval(() => this.load(), 5000);
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
        blockReason = '不能参与自己发布的竞拍';
      } else if (isSupply && me.role !== 'buyer') {
        blockReason = '货源仅限采购商出价';
      } else if (!isSupply && me.role !== 'farm') {
        blockReason = '求购仅限养殖场应标';
      } else {
        canBid = true;
      }

      const bidsMapped = bids.map(b => ({ ...b, timeText: formatDateTime(b.created_at) }));
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
      });
    } catch (e) {}
  },
  onEnd() { this.load(); },
  openAuto() { this.setData({ showAuto: true, autoMax: String(this.data.nextLimit) }); },
  closeAuto() { this.setData({ showAuto: false }); },
  noop() {},

  async placeBid() {
    if (!this.data.canBid) return wx.showToast({ title: this.data.blockReason, icon: 'none' });

    // 竞拍保证金按场缴纳：先查本场是否已缴，未缴则引导支付本场保证金
    let required = 0.1;
    try {
      const ds = await api.get('/deposits/status', { resource_id: this.data.id });
      required = ds.buyer.required;
      if (!ds.buyer.paid) {
        const ok = await new Promise((resolve) => {
          wx.showModal({
            title: '缴纳本场竞拍保证金',
            content: `每个货源需单独缴纳 ${required} 元竞拍保证金，是否立即缴纳？`,
            confirmText: '立即缴纳',
            success: (r) => resolve(r.confirm),
            fail: () => resolve(false),
          });
        });
        if (!ok) return;
        const paid = await this.payDeposit();
        if (!paid) return;
      }
    } catch (e) { return; }

    const price = Number(this.data.bidPrice);
    if (!price) return wx.showToast({ title: '请输入价格', icon: 'none' });
    if (this.data.isSupply && price < this.data.nextLimit) {
      return wx.showToast({ title: '出价至少 ¥' + this.data.nextLimit, icon: 'none' });
    }
    if (!this.data.isSupply && price > this.data.nextLimit) {
      return wx.showToast({ title: '报价至多 ¥' + this.data.nextLimit, icon: 'none' });
    }

    // 出价前先请求微信订阅消息授权（中标 / 未中标 两个模板），用户拒绝也不影响出价
    await requestSubscribe(['auction_won', 'auction_lost']);

    this.setData({ bidding: true });
    try {
      await api.post('/bids', { resource_id: this.data.id, price });
      wx.showToast({ title: this.data.isSupply ? '出价成功' : '报价成功' });
      this.setData({ bidPrice: '' });
      await this.load();
    } catch (e) {} finally { this.setData({ bidding: false }); }
  },

  // 为本场缴纳竞拍保证金（demo 直接成功；正式微信支付拉起钱包）。返回是否成功
  async payDeposit() {
    try {
      wx.showLoading({ title: '缴纳保证金…', mask: true });
      const res = await api.post('/pay/create-order', { type: 'buyer_bid', resource_id: this.data.id });
      if (res.paid || res.demo) {
        wx.hideLoading();
        wx.showToast({ title: '保证金已缴纳', icon: 'success' });
        return true;
      }
      // 正式微信支付
      await new Promise((resolve, reject) => {
        wx.requestPayment({
          timeStamp: res.timeStamp, nonceStr: res.nonceStr, package: res.package,
          signType: res.signType || 'RSA', paySign: res.paySign,
          success: resolve, fail: reject,
        });
      });
      // 轮询确认
      for (let i = 0; i < 8; i++) {
        await new Promise(r => setTimeout(r, 1000));
        try { const r = await api.get('/pay/check/' + encodeURIComponent(res.out_trade_no)); if (r.paid) break; } catch (e) {}
      }
      wx.hideLoading();
      wx.showToast({ title: '保证金已缴纳', icon: 'success' });
      return true;
    } catch (e) {
      wx.hideLoading();
      if (e && e.errMsg && /cancel/.test(e.errMsg)) wx.showToast({ title: '已取消支付', icon: 'none' });
      return false;
    }
  },

  async setAuto() {
    if (!this.data.isSupply) return wx.showToast({ title: '求购暂不支持自动出价', icon: 'none' });
    const max = Number(this.data.autoMax);
    if (!max || max < this.data.nextLimit) {
      return wx.showToast({ title: '最高价需 ≥ ¥' + this.data.nextLimit, icon: 'none' });
    }
    try {
      await api.post('/bids/auto', { resource_id: this.data.id, max_price: max });
      wx.showToast({ title: '自动出价已开启' });
      this.setData({ showAuto: false });
      await this.load();
    } catch (e) {}
  },

  cancel() {
    wx.showModal({
      title: '取消竞拍', content: '确认取消？已有出价后无法取消',
      success: async (r) => {
        if (!r.confirm) return;
        try { await api.post('/resources/' + this.data.id + '/cancel'); wx.showToast({ title: '已取消' }); setTimeout(() => wx.navigateBack(), 500); }
        catch (e) {}
      },
    });
  },

  endNow() {
    const price = this.data.r.current_price;
    wx.showModal({
      title: '结束竞拍并成交',
      content: `确认以当前最高价 ¥${price} 成交？后续不再接受出价。`,
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
