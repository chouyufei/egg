const api = require('../../utils/api');
const app = getApp();

Page({
  data: { switching: false },
  async pick(e) {
    if (this.data.switching) return;
    const role = e.currentTarget.dataset.r;
    this.setData({ switching: true });
    try {
      const res = await api.post('/auth/switch-role', { role });
      app.setAuth(app.globalData.token, res.user);
      wx.switchTab({ url: '/pages/index/index' });
    } catch (e) {} finally { this.setData({ switching: false }); }
  },
});
