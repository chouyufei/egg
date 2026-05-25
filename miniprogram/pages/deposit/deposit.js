const api = require('../../utils/api');
const { formatTime, statusLabel, statusTag } = require('../../utils/format');
const app = getApp();

Page({
  data: { isFarm: false, paid: false, approved: false, history: [], paying: false },
  async onShow() {
    const u = app.globalData.user;
    if (!u) return;
    const isFarm = u.role === 'farm';
    this.setData({ isFarm, approved: u.license_status === 'approved' });
    await this.load();
  },
  async load() {
    try {
      const ds = await api.get('/deposits/status');
      const paid = this.data.isFarm ? ds.farm.paid : ds.buyer.paid;
      this.setData({ paid });
    } catch (e) {}
    try {
      const { deposits } = await api.get('/deposits');
      const t = this.data.isFarm ? 'farm_quality' : 'buyer_bid';
      this.setData({
        history: deposits.filter(d => d.type === t).map(d => ({
          ...d,
          timeText: formatTime(d.paid_at),
          statusText: statusLabel(d.status),
          statusCls: statusTag(d.status),
        })),
      });
    } catch (e) {}
  },
  async pay() {
    this.setData({ paying: true });
    try {
      const type = this.data.isFarm ? 'farm_quality' : 'buyer_bid';
      await api.post('/deposits/pay', { type });
      wx.showToast({ title: '保证金已缴纳' });
      await this.load();
    } catch (e) {} finally { this.setData({ paying: false }); }
  },
});
