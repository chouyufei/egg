const api = require('../../utils/api');
const app = getApp();

const SORT_OPTIONS = [
  { label: '最新', value: '' },
  { label: '将结束', value: 'ending_soon' },
  { label: '价低', value: 'price_asc' },
  { label: '价高', value: 'price_desc' },
];
const COLOR_OPTIONS = ['全部', '红壳', '粉壳', '杂色'];

Page({
  data: {
    user: null, isFarm: false,
    tab: 'browse', sub: 'active',
    filters: { keyword: '', region: '', color: '', sort: '' },
    sortOptions: SORT_OPTIONS, sortIndex: 0,
    colorOptions: COLOR_OPTIONS, colorIndex: 0,
    all: [],
    mineRaw: [],
    filteredMine: [],
  },
  onLoad(opts) {
    const user = app.globalData.user || wx.getStorageSync('user');
    if (!user) return wx.reLaunch({ url: '/pages/login/login' });
    const patch = { user, isFarm: user.role === 'farm' };
    if (opts.color) {
      patch['filters.color'] = opts.color;
      const i = COLOR_OPTIONS.indexOf(opts.color);
      if (i > 0) patch.colorIndex = i;
    }
    if (opts.province) patch['filters.region'] = opts.province;
    this.setData(patch);
  },
  onShow() { this.reload(); },
  async onPullDownRefresh() { await this.reload(); wx.stopPullDownRefresh(); },
  async reload() {
    if (this.data.tab === 'browse') await this.loadBrowse();
    else await this.loadMine();
  },
  async loadBrowse() {
    const params = { status: 'auctioning', kind: this.data.isFarm ? 'demand' : 'supply' };
    const f = this.data.filters;
    if (f.keyword) params.keyword = f.keyword;
    if (f.region) params.region = f.region;
    if (f.color) params.color = f.color;
    if (f.sort) params.sort = f.sort;
    try {
      const { resources } = await api.get('/resources', params);
      this.setData({ all: resources });
    } catch (e) {}
  },
  async loadMine() {
    try {
      const { resources } = await api.get('/bids/mine');
      const mineRaw = resources.map(r => ({
        ...r,
        statusText: r.status === 'auctioning' ? (r.leading ? '领先中' : (this.data.isFarm ? '已被压价' : '已被反超')) :
          (r.status === 'sold' ? (r.leading ? '已成交' : '未中') :
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
  setTab(e) { this.setData({ tab: e.currentTarget.dataset.t }, () => this.reload()); },
  setSub(e) { this.setData({ sub: e.currentTarget.dataset.s }, () => this.applySub()); },
  pickSort(e) {
    const i = e.detail.value;
    this.setData({ sortIndex: i, 'filters.sort': SORT_OPTIONS[i].value }, () => this.loadBrowse());
  },
  pickColor(e) {
    const i = e.detail.value;
    const v = i === 0 ? '' : COLOR_OPTIONS[i];
    this.setData({ colorIndex: i, 'filters.color': v }, () => this.loadBrowse());
  },
  openRes(e) {
    wx.navigateTo({ url: '/pages/resource-detail/resource-detail?id=' + e.currentTarget.dataset.id });
  },
});
