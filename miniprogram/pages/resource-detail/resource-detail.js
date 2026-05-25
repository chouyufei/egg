const api = require('../../utils/api');
const { formatDateTime, statusLabel } = require('../../utils/format');
const app = getApp();

Page({
  data: {
    id: 0, r: null, bids: [], photos: [],
    user: null, isMine: false,
    bidPrice: '', minBid: 0, bidding: false,
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
      const minBid = Number((resource.current_price + resource.min_increment).toFixed(2));
      const bidsMapped = bids.map(b => ({ ...b, timeText: formatDateTime(b.created_at) }));
      this.setData({
        r: resource,
        bids: bidsMapped,
        photos,
        minBid,
        bidPrice: this.data.bidPrice || String(minBid),
        isMine: resource.farm_id === (this.data.user && this.data.user.id),
        statusLabel: statusLabel(resource.status),
      });
    } catch (e) {}
  },
  onEnd() { this.load(); },
  openAuto() { this.setData({ showAuto: true, autoMax: String(this.data.minBid) }); },
  closeAuto() { this.setData({ showAuto: false }); },
  noop() {},

  async placeBid() {
    if (this.data.user.role !== 'buyer') {
      return wx.showToast({ title: '仅采购商可出价', icon: 'none' });
    }
    try {
      const ds = await api.get('/deposits/status');
      if (!ds.buyer.paid) {
        wx.showModal({
          title: '需要保证金', content: '您还未缴纳 200 元竞拍保证金，是否前往缴纳？',
          success(r) { if (r.confirm) wx.navigateTo({ url: '/pages/deposit/deposit' }); },
        });
        return;
      }
    } catch (e) { return; }

    const price = Number(this.data.bidPrice);
    if (!price) return wx.showToast({ title: '请输入出价', icon: 'none' });
    if (price < this.data.minBid) return wx.showToast({ title: '出价至少 ¥' + this.data.minBid, icon: 'none' });

    this.setData({ bidding: true });
    try {
      await api.post('/bids', { resource_id: this.data.id, price });
      wx.showToast({ title: '出价成功' });
      this.setData({ bidPrice: '' });
      await this.load();
    } catch (e) {} finally { this.setData({ bidding: false }); }
  },

  async setAuto() {
    const max = Number(this.data.autoMax);
    if (!max || max < this.data.minBid) {
      return wx.showToast({ title: '最高价需 ≥ ¥' + this.data.minBid, icon: 'none' });
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
});
