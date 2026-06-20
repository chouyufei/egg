const api = require('../../utils/api');
const { statusLabel, statusTag } = require('../../utils/format');
const app = getApp();

Page({
  data: {
    user: null, unread: 0,
    licText: '', licCls: '', depositText: '未缴纳 →',
    roleText: '',
    walletBalance: '0.00',
    reviewMode: false,
  },
  async onShow() {
    if (!app.globalData.token) return wx.reLaunch({ url: '/pages/login/login' });
    this.setData({ reviewMode: !!app.globalData.reviewMode });
    const user = app.globalData.user;
    if (!user) return;
    const roleMap = { farm: '养殖场', buyer: '采购商', admin: '管理员' };
    this.setData({
      user, roleText: roleMap[user.role],
      licText: statusLabel(user.license_status),
      licCls: statusTag(user.license_status),
    });
    try { const m = await api.get('/messages/unread-count'); this.setData({ unread: m.count || 0 }); } catch (e) {}
    try { const b = await api.get('/wallet/balance'); this.setData({ walletBalance: Number(b.balance || 0).toFixed(2) }); } catch (e) {}
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
  goWallet() { wx.navigateTo({ url: '/pages/wallet/wallet' }); },
  goAgreement() { wx.navigateTo({ url: '/pages/agreement/agreement' }); },
  goPrivacy()   { wx.navigateTo({ url: '/pages/privacy/privacy' }); },
  goAbout()     { wx.navigateTo({ url: '/pages/about/about' }); },
  callCs()      { wx.makePhoneCall({ phoneNumber: '18675545968', fail: () => {} }); },
  editName() {
    const current = (this.data.user && this.data.user.name) || '';
    wx.showModal({
      title: '修改昵称',
      placeholderText: '请输入新昵称（2-20 字）',
      content: current,
      editable: true,
      confirmText: '保存',
      success: async (r) => {
        if (!r.confirm) return;
        const v = String(r.content || '').trim();
        if (!v) return wx.showToast({ title: '昵称不能为空', icon: 'none' });
        if (v.length < 2 || v.length > 20) return wx.showToast({ title: '昵称限 2-20 字', icon: 'none' });
        if (v === current) return;
        try {
          const { user } = await api.patch('/auth/me', { name: v });
          app.globalData.user = user;
          wx.setStorageSync('user', user);
          this.setData({ user });
          wx.showToast({ title: '已保存' });
        } catch (e) {
          wx.showToast({ title: e.message || '保存失败', icon: 'none' });
        }
      },
    });
  },
  logout() {
    wx.showModal({ title: '退出登录', content: '确认退出？', success: r => { if (r.confirm) app.logout(); } });
  },
});
