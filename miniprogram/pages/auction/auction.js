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
    user: null,
    tab: 'all',
    sub: 'active',
    farmTab: 'all',
    filters: { keyword: '', region: '', color: '', sort: '' },
    sortOptions: SORT_OPTIONS, sortIndex: 0,
    colorOptions: COLOR_OPTIONS, colorIndex: 0,
    all: [],
    mineRaw: [],
    filteredMine: [],
    farmResources: [],
  },
  onLoad() {
    const user = app.globalData.user || wx.getStorageSync('user');
    if (!user) return wx.reLaunch({ url: '/pages/login/login' });
    this.setData({ user });
    const preset = wx.getStorageSync('filterPreset');
    if (preset) {
      wx.removeStorageSync('filterPreset');
      const filters = { ...this.data.filters, ...preset };
      let sortIndex = 0, colorIndex = 0;
      if (preset.sort) sortIndex = SORT_OPTIONS.findIndex(o => o.value === preset.sort);
      if (preset.color) colorIndex = COLOR_OPTIONS.indexOf(preset.color);
      this.setData({ filters, sortIndex: sortIndex < 0 ? 0 : sortIndex, colorIndex: colorIndex < 0 ? 0 : colorIndex });
    }
  },
  onShow() { this.reload(); },
  async onPullDownRefresh() { await this.reload(); wx.stopPullDownRefresh(); },
  async reload() {
    if (this.data.user.role === 'buyer') {
      if (this.data.tab === 'all') await this.loadAll(); else await this.loadMine();
    } else if (this.data.user.role === 'farm') {
      await this.loadFarm();
    }
  },
  async loadAll() {
    const params = { status: 'auctioning' };
    const f = this.data.filters;
    if (f.keyword) params.keyword = f.keyword;
    if (f.region) params.region = f.region;
    if (f.color) params.color = f.color;
    if (f.sort) params.sort = f.sort;
    const { resources } = await api.get('/resources', params);
    this.setData({ all: resources });
  },
  async loadMine() {
    const { resources } = await api.get('/bids/mine');
    const mineRaw = resources.map(r => ({
      ...r,
      statusText: r.status === 'auctioning' ? (r.leading ? '领先中' : '已被反超') :
        (r.status === 'sold' ? (r.leading ? '已中标' : '未中标') :
         (r.status === 'failed' ? '已流拍' : '已取消')),
      timeText: r.status === 'auctioning' ? this.fmtCountdown(r.end_at) : '已结束',
    }));
    this.setData({ mineRaw }, () => this.applySub());
  },
  fmtCountdown(end) {
    const left = Math.max(0, end - Date.now());
    const h = Math.floor(left / 3600000);
    const m = Math.floor((left % 3600000) / 60000);
    return '剩 ' + h + 'h ' + m + 'm';
  },
  async loadFarm() {
    const { resources } = await api.get('/resources/mine');
    const filtered = this.data.farmTab === 'all' ? resources : resources.filter(r => r.status === this.data.farmTab);
    this.setData({ farmResources: filtered });
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
  setFarmTab(e) { this.setData({ farmTab: e.currentTarget.dataset.t }, () => this.loadFarm()); },
  pickSort(e) {
    const i = e.detail.value;
    this.setData({ sortIndex: i, 'filters.sort': SORT_OPTIONS[i].value }, () => this.loadAll());
  },
  pickColor(e) {
    const i = e.detail.value;
    const v = i === 0 ? '' : COLOR_OPTIONS[i];
    this.setData({ colorIndex: i, 'filters.color': v }, () => this.loadAll());
  },
  openRes(e) {
    wx.navigateTo({ url: '/pages/resource-detail/resource-detail?id=' + e.currentTarget.dataset.id });
  },
});
