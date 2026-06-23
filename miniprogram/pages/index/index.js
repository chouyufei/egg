const api = require('../../utils/api');
const { getAndReportLocation, getLocation, chooseLocation } = require('../../utils/location');
const { defaultShare } = require('../../utils/share');
const app = getApp();

const CUSTOM_LOC_KEY = 'customLoc';   // 持久化自选位置

// 蛋品类目（按蛋壳颜色 + 品种细化，对应行业「鸡蛋种类」常见分类）
const CATEGORIES = [
  { value: '',     icon: '🥚', label: '全部' },
  { value: '粉壳', icon: '🤎', label: '粉壳蛋' },   // 海兰系列 / 罗曼系列 / 粉六 / 大午金风 / 京柏一号 / 农三
  { value: '红壳', icon: '🔴', label: '红壳蛋' },   // 海兰褐 / 京红 / 农大三号
  { value: '土鸡', icon: '🟡', label: '土鸡蛋' },   // 土麻、新阳黑、新黛果、白凤、花风等本地土鸡
  { value: '乌鸡', icon: '⚫', label: '乌鸡蛋' },   // 五黑 / 乌鸡系列
  { value: '白壳', icon: '⚪', label: '白壳蛋' },   // 京白 / 海兰白 / 神丹六号 / 上海梨园
];

const PROVINCES_ALL = [
  '北京', '天津', '上海', '重庆',
  '河北', '山西', '辽宁', '吉林', '黑龙江',
  '江苏', '浙江', '安徽', '福建', '江西', '山东',
  '河南', '湖北', '湖南', '广东', '海南',
  '四川', '贵州', '云南', '陕西', '甘肃', '青海',
  '广西', '内蒙古', '宁夏', '新疆', '西藏',
];

function formatFilterText(color, province) {
  const c = color || '全部类目';
  const p = province || '推荐地区';
  return `${c} · ${p}`;
}

Page({
  onShareAppMessage() { return defaultShare(); },
  onShareTimeline()   { return defaultShare(); },
  data: {
    user: null,
    unread: 0,
    reviewMode: false,    // 审核模式：藏起金融/复杂功能

    // 顶部模式：buy / sell（默认买）
    activeMode: 'buy',

    // 子 tab：browse=对方发布的 / mine=我自己的
    buyerTab: 'browse',
    sellerTab: 'mine',

    others: [],          // 对方发布的列表（按当前 mode 决定看 supply 还是 demand）
    mineDemands: [],     // 我发的求购
    mineSupplies: [],    // 我发的货源

    categories: CATEGORIES,
    allProvinces: PROVINCES_ALL,     // 全部省份 / 直辖市 / 自治区

    activeColor: '',
    activeProvince: '',

    showFilter: false,
    tempColor: '',
    tempProvince: '',

    filterText: formatFilterText('', ''),

    // 用户当前定位（用于按距离推荐）；获取失败时为 null
    myLoc: null,
    nearRadius: 500,
    locSource: 'gps',   // 'gps' | 'custom'
    locName: '',        // 自选位置的显示名
  },

  onLoad() {
    const user = app.globalData.user || wx.getStorageSync('user');
    if (!user) return wx.reLaunch({ url: '/pages/login/login' });
    this.setData({ user });
  },

  async onShow() {
    if (!app.globalData.token) return wx.reLaunch({ url: '/pages/login/login' });
    this.setData({ reviewMode: !!app.globalData.reviewMode });

    // 同步 DB role 到当前 UI 模式，让发布 / 报价 等操作能通过权限校验
    const targetRole = this.data.activeMode === 'sell' ? 'farm' : 'buyer';
    if (this.data.user && this.data.user.role !== 'admin' && this.data.user.role !== targetRole) {
      try {
        const res = await api.post('/auth/switch-role', { role: targetRole });
        app.setAuth(app.globalData.token, res.user);
        this.setData({ user: res.user });
      } catch (e) {}
    }

    // 自选位置优先；没有再用 GPS 定位
    const custom = wx.getStorageSync(CUSTOM_LOC_KEY);
    if (custom && custom.lat && custom.lng) {
      this.setData({
        myLoc: { lat: custom.lat, lng: custom.lng },
        locSource: 'custom',
        locName: custom.name || '自选位置',
      });
    } else {
      getAndReportLocation().then(loc => {
        if (loc) this.setData({ myLoc: loc, locSource: 'gps', locName: '' });
      });
    }

    await this.refresh();
  },

  async pickCustomLoc() {
    const loc = await chooseLocation();
    if (!loc) return wx.showToast({ title: '已取消', icon: 'none' });
    wx.setStorageSync(CUSTOM_LOC_KEY, loc);
    // 同步到后端，让发布 / 资源详情等共用
    try { await api.post('/auth/location', { lat: loc.lat, lng: loc.lng }); } catch (e) {}
    this.setData({
      myLoc: { lat: loc.lat, lng: loc.lng },
      locSource: 'custom',
      locName: loc.name || '自选位置',
    });
    await this.load();
    wx.showToast({ title: '已切换为「' + (loc.name || '自选位置') + '」', icon: 'none', duration: 2500 });
  },

  // 长按"自选位置"清除，恢复 GPS 定位
  async resetToGps() {
    wx.removeStorageSync(CUSTOM_LOC_KEY);
    const loc = await getLocation({ force: true });
    if (loc) {
      this.setData({ myLoc: loc, locSource: 'gps', locName: '' });
      await this.load();
      wx.showToast({ title: '已恢复手机定位', icon: 'success' });
    } else {
      this.setData({ myLoc: null, locSource: 'gps', locName: '' });
    }
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

    // 对方发布（买视角看 supply，卖视角看 demand），带筛选 + 附近优先
    const browseKind = this.data.activeMode === 'sell' ? 'demand' : 'supply';
    const params = { status: 'auctioning', kind: browseKind };
    if (this.data.activeColor) params.color = this.data.activeColor;
    if (this.data.activeProvince) params.province = this.data.activeProvince;
    if (this.data.myLoc) {
      params.near_lat = this.data.myLoc.lat;
      params.near_lng = this.data.myLoc.lng;
    }
    try {
      const { resources } = await api.get('/resources', params);
      this.setData({ others: resources });
    } catch (e) {}
  },

  async setMode(e) {
    const m = e.currentTarget.dataset.m;
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

  async askLocation() {
    const loc = await getAndReportLocation();
    if (loc) {
      this.setData({ myLoc: loc });
      await this.load();
      wx.showToast({ title: '已按距离排序', icon: 'success' });
    } else {
      wx.showToast({ title: '未授权定位，可在小程序设置中开启', icon: 'none', duration: 3000 });
    }
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
