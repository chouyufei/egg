const api = require('../../utils/api');
const app = getApp();

const CATEGORIES = [
  { value: '',     icon: '🥚', label: '全部' },
  { value: '红壳', icon: '🔴', label: '红壳' },
  { value: '粉壳', icon: '🤎', label: '粉壳' },
  { value: '杂色', icon: '🟡', label: '土鸡蛋' },
];

const PROVINCES_DEFAULT = ['北京', '山东', '河南', '河北', '江苏', '上海', '广东'];

function inferNearbyProvinces(userRegion) {
  if (!userRegion) return PROVINCES_DEFAULT;
  const map = {
    '山东': ['山东', '河北', '河南', '江苏', '北京', '天津'],
    '北京': ['北京', '天津', '河北', '山东', '河南'],
    '河南': ['河南', '湖北', '山东', '河北', '安徽'],
    '河北': ['河北', '北京', '山东', '天津', '山西'],
    '上海': ['上海', '江苏', '浙江', '安徽'],
    '广东': ['广东', '广西', '湖南', '江西', '福建'],
    '湖北': ['湖北', '河南', '湖南', '安徽', '江西'],
  };
  for (const k of Object.keys(map)) {
    if (userRegion.indexOf(k) >= 0) return map[k];
  }
  return PROVINCES_DEFAULT;
}

function formatFilterText(color, province) {
  const c = color || '全部类目';
  const p = province || '推荐地区';
  return `${c} · ${p}`;
}

Page({
  data: {
    user: null,
    unread: 0,

    // 顶部模式：buy / sell（默认买）
    activeMode: 'buy',

    // 子 tab：browse=对方发布的 / mine=我自己的
    buyerTab: 'browse',
    sellerTab: 'mine',

    others: [],          // 对方发布的列表（按当前 mode 决定看 supply 还是 demand）
    mineDemands: [],     // 我发的求购
    mineSupplies: [],    // 我发的货源

    categories: CATEGORIES,
    provinces: PROVINCES_DEFAULT,

    activeColor: '',
    activeProvince: '',

    showFilter: false,
    tempColor: '',
    tempProvince: '',

    filterText: formatFilterText('', ''),
  },

  onLoad() {
    const user = app.globalData.user || wx.getStorageSync('user');
    if (!user) return wx.reLaunch({ url: '/pages/login/login' });
    this.setData({
      user,
      provinces: inferNearbyProvinces(user.region),
    });
  },

  async onShow() {
    if (!app.globalData.token) return wx.reLaunch({ url: '/pages/login/login' });

    // 同步 DB role 到当前 UI 模式，让发布 / 出价 等操作能通过权限校验
    const targetRole = this.data.activeMode === 'sell' ? 'farm' : 'buyer';
    if (this.data.user && this.data.user.role !== 'admin' && this.data.user.role !== targetRole) {
      try {
        const res = await api.post('/auth/switch-role', { role: targetRole });
        app.setAuth(app.globalData.token, res.user);
        this.setData({ user: res.user });
      } catch (e) {}
    }

    await this.refresh();
  },

  async refresh() {
    try { const m = await api.get('/messages/unread-count'); this.setData({ unread: m.count || 0 }); } catch (e) {}
    await this.load();
  },

  async load() {
    // 我的发布（按 kind 分两堆）
    try {
      const { resources } = await api.get('/resources/mine');
      this.setData({
        mineDemands: resources.filter(r => (r.kind || 'supply') === 'demand'),
        mineSupplies: resources.filter(r => (r.kind || 'supply') === 'supply'),
      });
    } catch (e) {}

    // 对方发布（买视角看 supply，卖视角看 demand），带筛选
    const browseKind = this.data.activeMode === 'sell' ? 'demand' : 'supply';
    const params = { status: 'auctioning', kind: browseKind };
    if (this.data.activeColor) params.color = this.data.activeColor;
    if (this.data.activeProvince) params.province = this.data.activeProvince;
    try {
      const { resources } = await api.get('/resources', params);
      this.setData({ others: resources });
    } catch (e) {}
  },

  async setMode(e) {
    const m = e.currentTarget.dataset.m;
    if (m === 'other') return wx.navigateTo({ url: '/pages/select-mode/select-mode' });
    if (m === this.data.activeMode) return;

    // 切换 UI 模式 + 同步 DB role
    const targetRole = m === 'sell' ? 'farm' : 'buyer';
    if (this.data.user.role !== 'admin' && this.data.user.role !== targetRole) {
      try {
        const res = await api.post('/auth/switch-role', { role: targetRole });
        app.setAuth(app.globalData.token, res.user);
        this.setData({ user: res.user, activeMode: m });
      } catch (e) { return; }
    } else {
      this.setData({ activeMode: m });
    }
    await this.load();
  },

  setBuyerTab(e) { this.setData({ buyerTab: e.currentTarget.dataset.t }); },
  setSellerTab(e) { this.setData({ sellerTab: e.currentTarget.dataset.t }); },

  openFilter() {
    this.setData({
      showFilter: true,
      tempColor: this.data.activeColor,
      tempProvince: this.data.activeProvince,
    });
  },
  closeFilter() { this.setData({ showFilter: false }); },
  noop() {},
  tempPickColor(e) { this.setData({ tempColor: e.currentTarget.dataset.v }); },
  tempPickProvince(e) { this.setData({ tempProvince: e.currentTarget.dataset.v }); },
  resetFilter() { this.setData({ tempColor: '', tempProvince: '' }); },
  async applyFilter() {
    const c = this.data.tempColor;
    const p = this.data.tempProvince;
    this.setData({
      activeColor: c,
      activeProvince: p,
      showFilter: false,
      filterText: formatFilterText(c, p),
    });
    await this.load();
  },

  openRes(e) { wx.navigateTo({ url: '/pages/resource-detail/resource-detail?id=' + e.currentTarget.dataset.id }); },
  goMessages() { wx.navigateTo({ url: '/pages/messages/messages' }); },
  goPublishDemand() { wx.navigateTo({ url: '/pages/publish/publish' }); },
  goPublishSupply() { wx.navigateTo({ url: '/pages/publish/publish' }); },
  logout() { app.logout(); },
});
