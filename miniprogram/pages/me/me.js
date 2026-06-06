const api = require('../../utils/api');
const { statusLabel, statusTag } = require('../../utils/format');
const app = getApp();

Page({
  data: {
    user: null, unread: 0,
    licText: '', licCls: '', depositText: '未缴纳 →',
    roleText: '',
  },
  async onShow() {
    if (!app.globalData.token) return wx.reLaunch({ url: '/pages/login/login' });
    const user = app.globalData.user;
    if (!user) return;
    const roleMap = { farm: '养殖场', buyer: '采购商', admin: '管理员' };
    this.setData({
      user, roleText: roleMap[user.role],
      licText: statusLabel(user.license_status),
      licCls: statusTag(user.license_status),
    });
    try { const m = await api.get('/messages/unread-count'); this.setData({ unread: m.count || 0 }); } catch (e) {}
    if (user.role === 'farm') {
      try {
        const ds = await api.get('/deposits/status');
        this.setData({ depositText: ds.farm.paid ? '已缴纳' : '未缴纳 →' });
      } catch (e) {}
    } else if (user.role === 'buyer') {
      this.setData({ depositText: '按场缴纳 →' });
    }
  },
  async onPullDownRefresh() { await this.onShow(); wx.stopPullDownRefresh(); },
  goQualify() { wx.navigateTo({ url: '/pages/qualify/qualify' }); },
  goDeposit() { wx.navigateTo({ url: '/pages/deposit/deposit' }); },
  goMessages() { wx.navigateTo({ url: '/pages/messages/messages' }); },
  goOrders() { wx.switchTab({ url: '/pages/orders/orders' }); },
  goAuction() { wx.navigateTo({ url: '/pages/auction/auction' }); },
  logout() {
    wx.showModal({ title: '退出登录', content: '确认退出？', success: r => { if (r.confirm) app.logout(); } });
  },
});
