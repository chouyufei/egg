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
    others: [], othersTop: [], mine: [],
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
        ? '上架货源 → 采购商竞价 → 价高者得，5 分钟无新出价即成交'
        : '默认浏览货源 → 您可竞拍，也可点「+发布求购」让卖方应标',
    });
  },
  async onShow() {
    if (!app.globalData.token) return wx.reLaunch({ url: '/pages/login/login' });
    // 二级类目页选完后会写到 storage，回到首页时同步过来
    const picked = wx.getStorageSync('selectedColor');
    if (picked !== undefined && picked !== this.data.activeColor) {
      this.setData({ activeColor: picked });
    }
    wx.removeStorageSync('selectedColor');
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
    // 我的发布（卖方=我的货源，买方=我的求购）
    try {
      const { resources } = await api.get('/resources/mine');
      this.setData({ mine: resources });
    } catch (e) {}

    // 买方首页额外展示「可竞拍货源」一屏（最多 6 张，"更多"进 auction 二级页）
    if (this.data.user.role === 'buyer') {
      const params = { status: 'auctioning', kind: 'supply' };
      if (this.data.activeColor) params.color = this.data.activeColor;
      if (this.data.activeProvince) params.province = this.data.activeProvince;
      try {
        const { resources } = await api.get('/resources', params);
        this.setData({
          others: resources,
          othersCount: resources.length,
          othersTop: resources.slice(0, 6),
        });
      } catch (e) {}
    } else {
      this.setData({ others: [], othersCount: 0, othersTop: [] });
    }
  },
  goAuction() {
    const qs = [];
    if (this.data.activeColor) qs.push('color=' + encodeURIComponent(this.data.activeColor));
    if (this.data.activeProvince) qs.push('province=' + encodeURIComponent(this.data.activeProvince));
    wx.navigateTo({ url: '/pages/auction/auction' + (qs.length ? '?' + qs.join('&') : '') });
  },
  pickProvince(e) { this.setData({ activeProvince: e.currentTarget.dataset.v }, () => this.load()); },
  setViewTab(e) { this.setData({ viewTab: e.currentTarget.dataset.t }); },
  openRes(e) { wx.navigateTo({ url: '/pages/resource-detail/resource-detail?id=' + e.currentTarget.dataset.id }); },
  goMessages() { wx.navigateTo({ url: '/pages/messages/messages' }); },
  goSearch() { wx.navigateTo({ url: '/pages/auction/auction' }); },
  goPublish() { wx.navigateTo({ url: '/pages/publish/publish' }); },
  goCategory() {
    wx.navigateTo({ url: '/pages/category/category?current=' + (this.data.activeColor || '') });
  },
  goMore() { wx.navigateTo({ url: '/pages/select-mode/select-mode' }); },
  // 顶部三段：
  //   卖 → 切到养殖场身份（留在首页）
  //   买 → 跳到「竞拍」二级页（浏览/出价），带上当前首页选的类目/省份过滤
  //   其他 → 选模式页
  async switchToMode(e) {
    const role = e.currentTarget.dataset.r;
    if (role === 'buyer') {
      const qs = [];
      if (this.data.activeColor) qs.push('color=' + encodeURIComponent(this.data.activeColor));
      if (this.data.activeProvince) qs.push('province=' + encodeURIComponent(this.data.activeProvince));
      return wx.navigateTo({ url: '/pages/auction/auction' + (qs.length ? '?' + qs.join('&') : '') });
    }
    if (role === 'farm') {
      if (this.data.user.role === 'farm') return;
      try {
        const res = await api.post('/auth/switch-role', { role: 'farm' });
        app.setAuth(app.globalData.token, res.user);
        this.setData({ user: res.user });
        await this.load();
      } catch (e) {}
    }
  },
  guideAction() { if (this.data._guideRoute) wx.navigateTo({ url: this.data._guideRoute }); },
  logout() { app.logout(); },
});
