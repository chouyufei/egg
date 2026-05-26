const api = require('../../utils/api');
const { formatDateTime, statusLabel } = require('../../utils/format');
const app = getApp();

Page({
  data: {
    id: 0, r: null, bids: [], photos: [],
    user: null, isMine: false,
    isSupply: true,
    kindLabel: '货源', kindCls: 'tag',
    canBid: false, blockReason: '',
    bidPrice: '', nextLimit: 0, bidding: false,
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
    const me = this.data.user;
    try {
      const ds = await api.get('/deposits/status');
      const needPaid = me.role === 'farm' ? ds.farm.paid : ds.buyer.paid;
      if (!needPaid) {
        wx.showModal({
          title: '需要保证金',
          content: me.role === 'farm' ? '需缴纳 1000 元品质保证金' : '需缴纳 200 元采购保证金',
          success(r) { if (r.confirm) wx.navigateTo({ url: '/pages/deposit/deposit' }); },
        });
        return;
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

    this.setData({ bidding: true });
    try {
      await api.post('/bids', { resource_id: this.data.id, price });
      wx.showToast({ title: this.data.isSupply ? '出价成功' : '报价成功' });
      this.setData({ bidPrice: '' });
      await this.load();
    } catch (e) {} finally { this.setData({ bidding: false }); }
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
});
