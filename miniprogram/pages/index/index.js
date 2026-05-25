const api = require('../../utils/api');
const app = getApp();

const QUALIFY_HINT = {
  pending: '资质审核中，平台一般 1 个工作日内处理',
  rejected: '资质未通过，请重新提交',
  none: '请先提交营业执照等资质',
};

Page({
  data: {
    user: null,
    unread: 0,
    endingSoon: [],
    newest: [],
    myResources: [],
    stats: { active: 0, sold: 0, gmv: 0 },
    farmDeposit: false,
    qualifyHint: '',
  },
  onLoad() {
    const user = app.globalData.user || wx.getStorageSync('user');
    if (!user) return wx.reLaunch({ url: '/pages/login/login' });
    this.setData({ user });
  },
  async onShow() {
    if (!app.globalData.token) return wx.reLaunch({ url: '/pages/login/login' });
    await this.refresh();
  },
  async onPullDownRefresh() { await this.refresh(); wx.stopPullDownRefresh(); },
  async refresh() {
    try {
      const me = await api.get('/auth/me');
      app.setAuth(app.globalData.token, me.user);
      this.setData({ user: me.user, qualifyHint: QUALIFY_HINT[me.user.license_status] || '' });
    } catch (e) {}
    try { const m = await api.get('/messages/unread-count'); this.setData({ unread: m.count || 0 }); } catch (e) {}
    if (this.data.user.role === 'buyer') await this.loadBuyer();
    if (this.data.user.role === 'farm') await this.loadFarm();
  },
  async loadBuyer() {
    const { resources } = await api.get('/resources', { status: 'auctioning' });
    const active = resources.filter(r => r.status === 'auctioning');
    const endingSoon = [...active].sort((a, b) => a.end_at - b.end_at).slice(0, 3);
    const newest = [...active].sort((a, b) => b.created_at - a.created_at).slice(0, 6);
    this.setData({ endingSoon, newest });
  },
  async loadFarm() {
    const { resources } = await api.get('/resources/mine');
    let active = 0, sold = 0, gmv = 0;
    for (const r of resources) {
      if (r.status === 'auctioning') active++;
      if (r.status === 'sold') { sold++; gmv += r.current_price; }
    }
    this.setData({
      myResources: resources.slice(0, 6),
      stats: { active, sold, gmv: gmv.toFixed(0) },
    });
    try {
      const ds = await api.get('/deposits/status');
      this.setData({ farmDeposit: !!ds.farm.paid });
    } catch (e) {}
  },
  openRes(e) {
    wx.navigateTo({ url: '/pages/resource-detail/resource-detail?id=' + e.currentTarget.dataset.id });
  },
  goMessages() { wx.navigateTo({ url: '/pages/messages/messages' }); },
  goQualify() { wx.navigateTo({ url: '/pages/qualify/qualify' }); },
  goDeposit() { wx.navigateTo({ url: '/pages/deposit/deposit' }); },
  goPublish() { wx.navigateTo({ url: '/pages/publish/publish' }); },
  goSearch() { wx.switchTab({ url: '/pages/auction/auction' }); },
  quickFilter(e) {
    const ds = e.currentTarget.dataset;
    const q = {};
    if (ds.color) q.color = ds.color;
    if (ds.sort) q.sort = ds.sort;
    wx.setStorageSync('filterPreset', q);
    wx.switchTab({ url: '/pages/auction/auction' });
  },
  logout() { app.logout(); },
});
