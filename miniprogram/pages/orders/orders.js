const api = require('../../utils/api');
const { formatTime, statusLabel, statusTag } = require('../../utils/format');
const { defaultShare } = require('../../utils/share');
const app = getApp();

Page({
  onShareAppMessage() { return defaultShare(); },
  onShareTimeline()   { return defaultShare(); },
  data: { orders: [], otherLabel: '' },
  onShow() { this.load(); },
  async onPullDownRefresh() { await this.load(); wx.stopPullDownRefresh(); },
  async load() {
    const user = app.globalData.user;
    if (!user) return;
    const otherLabel = user.role === 'farm' ? '采购商' : '养殖场';
    try {
      const { orders } = await api.get('/orders');
      const mapped = orders.map(o => ({
        ...o,
        cover: (o.resource && o.resource.photos && o.resource.photos[0]) || 'https://placehold.co/100x100/f6b821/fff?text=Egg',
        statusText: statusLabel(o.status),
        statusCls: statusTag(o.status),
        timeText: formatTime(o.created_at),
        otherName: user.role === 'farm' ? (o.buyer && o.buyer.name) : (o.farm && o.farm.name),
      }));
      this.setData({ orders: mapped, otherLabel });
    } catch (e) {}
  },
  open(e) { wx.navigateTo({ url: '/pages/order-detail/order-detail?id=' + e.currentTarget.dataset.id }); },
});
