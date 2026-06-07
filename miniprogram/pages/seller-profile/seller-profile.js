const api = require('../../utils/api');

const LIC_TEXT = {
  approved: '已认证',
  pending: '审核中',
  rejected: '认证未通过',
  none: '未认证',
};

Page({
  data: {
    id: 0,
    seller: null,
    stats: null,
    active: [],
    sold: [],
    tab: 'active',
    licText: '',
  },
  onLoad(opt) {
    this.setData({ id: Number(opt.id) });
    this.load();
  },
  async load() {
    try {
      const r = await api.get('/resources/seller/' + this.data.id);
      this.setData({
        seller: r.seller,
        stats: r.stats,
        active: r.active,
        sold: r.sold,
        licText: LIC_TEXT[r.seller.license_status] || '未认证',
      });
    } catch (e) {}
  },
  setTab(e) { this.setData({ tab: e.currentTarget.dataset.t }); },
  openRes(e) { wx.navigateTo({ url: '/pages/resource-detail/resource-detail?id=' + e.currentTarget.dataset.id }); },
});
