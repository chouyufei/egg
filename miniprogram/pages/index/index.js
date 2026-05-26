const api = require('../../utils/api');
const app = getApp();

const CATEGORIES = [
  { value: '', icon: '🥚', label: '全部' },
  { value: '红壳', icon: '🔴', label: '红壳' },
  { value: '粉壳', icon: '🤎', label: '粉壳' },
  { value: '杂色', icon: '🟡', label: '土鸡蛋' },
];

const PROVINCES_DEFAULT = ['北京', '山东', '河南', '河北', '江苏', '上海', '广东'];

function inferNearbyProvinces(userRegion) {
  if (!userRegion) return PROVINCES_DEFAULT;
  const regionToNeighbors = {
    '山东': ['山东', '河北', '河南', '江苏', '北京', '天津'],
    '北京': ['北京', '天津', '河北', '山东', '河南'],
    '河南': ['河南', '湖北', '山东', '河北', '安徽'],
    '河北': ['河北', '北京', '山东', '天津', '山西'],
    '上海': ['上海', '江苏', '浙江', '安徽'],
    '广东': ['广东', '广西', '湖南', '江西', '福建'],
    '湖北': ['湖北', '河南', '湖南', '安徽', '江西'],
  };
  for (const k of Object.keys(regionToNeighbors)) {
    if (userRegion.indexOf(k) >= 0) return regionToNeighbors[k];
  }
  return PROVINCES_DEFAULT;
}

Page({
  data: {
    user: null,
    unread: 0,
    categories: CATEGORIES, activeColor: '',
    provinces: PROVINCES_DEFAULT, activeProvince: '',
    viewTab: 'others',
    others: [], mine: [],
    othersCount: 0,
    tipText: '',
    guideTitle: '', guideText: '', guideAction: '',
    _guideRoute: '',
  },
  onLoad() {
    const user = app.globalData.user || wx.getStorageSync('user');
    if (!user) return wx.reLaunch({ url: '/pages/login/login' });
    this.setData({
      user,
      provinces: inferNearbyProvinces(user.region),
      tipText: user.role === 'farm'
        ? '默认查看采购需求 → 您可应标，也可点「发布」上架自己的货源'
        : '默认浏览货源 → 您可竞拍，也可点「发布」发布自己的采购需求',
    });
  },
  async onShow() {
    if (!app.globalData.token) return wx.reLaunch({ url: '/pages/login/login' });
    await this.refresh();
  },
  async refresh() {
    try {
      const me = await api.get('/auth/me');
      app.setAuth(app.globalData.token, me.user);
      this.setData({ user: me.user });
      this.computeGuide(me.user);
    } catch (e) {}
    try { const m = await api.get('/messages/unread-count'); this.setData({ unread: m.count || 0 }); } catch (e) {}
    await this.load();
  },
  computeGuide(user) {
    const ds = app.globalData.deposit || {};
    let title = '', text = '', action = '', route = '';
    if (user.role === 'farm') {
      if (user.license_status !== 'approved') {
        title = '⚠️ 完成资质认证';
        text = '认证通过后才可发布货源';
        action = '去认证'; route = '/pages/qualify/qualify';
      }
    }
    this.setData({ guideTitle: title, guideText: text, guideAction: action, _guideRoute: route });
  },
  async load() {
    const params = { status: 'auctioning' };
    if (this.data.activeColor) params.color = this.data.activeColor;
    if (this.data.activeProvince) params.province = this.data.activeProvince;
    params.kind = this.data.user.role === 'farm' ? 'demand' : 'supply';
    try {
      const { resources } = await api.get('/resources', params);
      this.setData({ others: resources, othersCount: resources.length });
    } catch (e) {}
    try {
      const { resources } = await api.get('/resources/mine');
      this.setData({ mine: resources });
    } catch (e) {}
  },
  pickColor(e) { this.setData({ activeColor: e.currentTarget.dataset.v }, () => this.load()); },
  pickProvince(e) { this.setData({ activeProvince: e.currentTarget.dataset.v }, () => this.load()); },
  setViewTab(e) { this.setData({ viewTab: e.currentTarget.dataset.t }); },
  openRes(e) { wx.navigateTo({ url: '/pages/resource-detail/resource-detail?id=' + e.currentTarget.dataset.id }); },
  goMessages() { wx.navigateTo({ url: '/pages/messages/messages' }); },
  goSearch() { wx.switchTab({ url: '/pages/auction/auction' }); },
  goPublish() { wx.navigateTo({ url: '/pages/publish/publish' }); },
  guideAction() { if (this.data._guideRoute) wx.navigateTo({ url: this.data._guideRoute }); },
  logout() { app.logout(); },
});
