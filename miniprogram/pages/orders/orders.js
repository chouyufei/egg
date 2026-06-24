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
    try {
      const { orders } = await api.get('/orders');
      const mapped = orders.map(o => {
        // 同一个用户可能既是卖方又是买方，按本条订单的角色（farm/buyer）
        // 打标签，避免老用户在主页切换"买/卖"才能看到对应订单
        const isFarmSide = o.farm_id === user.id;
        return {
          ...o,
          cover: (o.resource && o.resource.photos && o.resource.photos[0]) || 'https://placehold.co/100x100/f6b821/fff?text=Egg',
          statusText: statusLabel(o.status),
          statusCls: statusTag(o.status),
          timeText: formatTime(o.created_at),
          sideLabel:  isFarmSide ? '卖单 · 我的货源被采购' : '买单 · 我参与的采购',
          sideShort:  isFarmSide ? '卖' : '买',
          sideCls:    isFarmSide ? 'side-pill side-pill-sell' : 'side-pill side-pill-buy',
          otherLabel: isFarmSide ? '采购商' : '养殖场',
          otherName:  isFarmSide ? (o.buyer && o.buyer.name) : (o.farm && o.farm.name),
        };
      });
      this.setData({ orders: mapped });
    } catch (e) {}
  },
  open(e) { wx.navigateTo({ url: '/pages/order-detail/order-detail?id=' + e.currentTarget.dataset.id }); },
});
