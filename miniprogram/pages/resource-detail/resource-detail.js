const api = require('../../utils/api');
const { formatDateTime, statusLabel } = require('../../utils/format');
const { requestSubscribe } = require('../../utils/subscribe');
const { ensureBuyerBidDeposit } = require('../../utils/deposit');
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
      });
    } catch (e) {}
  },
  onEnd() { this.load(); },
  openAuto() { this.setData({ showAuto: true, autoMax: String(this.data.nextLimit) }); },
  closeAuto() { this.setData({ showAuto: false }); },
  noop() {},

  async placeBid() {
    if (!this.data.canBid) return wx.showToast({ title: this.data.blockReason, icon: 'none' });

    // 竞拍保证金按场缴纳：未缴则弹窗直接拉起支付，支付完留在本页继续出价
    const depositOk = await ensureBuyerBidDeposit(this.data.id);
    if (!depositOk) return;

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
