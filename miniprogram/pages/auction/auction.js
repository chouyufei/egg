const { defaultShare } = require('../../utils/share');
const api = require('../../utils/api');
const app = getApp();

Page({
  onShareAppMessage() { return defaultShare(); },
  onShareTimeline()   { return defaultShare(); },
  data: {
    user: null, isFarm: false,
    sub: 'active',
    mineRaw: [],
    filteredMine: [],
  },
  onLoad() {
    const user = app.globalData.user || wx.getStorageSync('user');
    if (!user) return wx.reLaunch({ url: '/pages/login/login' });
    this.setData({ user, isFarm: user.role === 'farm' });
  },
  onShow() { this.loadMine(); },
  async onPullDownRefresh() { await this.loadMine(); wx.stopPullDownRefresh(); },
  async loadMine() {
    try {
      const { resources } = await api.get('/bids/mine');
      const mineRaw = resources.map(r => ({
        ...r,
        statusText: r.status === 'auctioning' ? (r.leading ? '领先中' : (this.data.isFarm ? '已被压价' : '已被反超')) :
          (r.status === 'sold' ? (r.leading ? '已中' : '未中') :
           (r.status === 'failed' ? '未成交' : '已取消')),
        timeText: r.status === 'auctioning' ? this.fmtCountdown(r.end_at) : '已结束',
      }));
      this.setData({ mineRaw }, () => this.applySub());
    } catch (e) {}
  },
  fmtCountdown(end) {
    const left = Math.max(0, end - Date.now());
    const h = Math.floor(left / 3600000);
    const m = Math.floor((left % 3600000) / 60000);
    return '剩 ' + h + 'h ' + m + 'm';
  },
  applySub() {
    const t = this.data.sub;
    const out = this.data.mineRaw.filter(r => {
      if (t === 'active') return r.status === 'auctioning';
      if (t === 'won') return r.status === 'sold' && r.leading;
      return (r.status === 'sold' && !r.leading) || r.status === 'failed' || r.status === 'cancelled';
    });
    this.setData({ filteredMine: out });
  },
  setSub(e) { this.setData({ sub: e.currentTarget.dataset.s }, () => this.applySub()); },
  openRes(e) {
    wx.navigateTo({ url: '/pages/resource-detail/resource-detail?id=' + e.currentTarget.dataset.id });
  },
});
