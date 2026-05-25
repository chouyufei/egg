const api = require('../../utils/api');
const { statusLabel, statusTag } = require('../../utils/format');
const app = getApp();

Page({
  data: {
    form: { name: '', region: '', business_license: '' },
    statusText: '未提交', statusCls: 'tag-d',
    loading: false,
  },
  onShow() {
    const u = app.globalData.user;
    if (!u) return;
    this.setData({
      form: { name: u.name || '', region: u.region || '', business_license: u.business_license || '' },
      statusText: statusLabel(u.license_status),
      statusCls: statusTag(u.license_status),
    });
  },
  async submit() {
    this.setData({ loading: true });
    try {
      await api.post('/auth/qualify', this.data.form);
      wx.showToast({ title: '已提交' });
      const me = await api.get('/auth/me');
      app.setAuth(app.globalData.token, me.user);
      this.setData({
        statusText: statusLabel(me.user.license_status),
        statusCls: statusTag(me.user.license_status),
      });
    } catch (e) {} finally { this.setData({ loading: false }); }
  },
});
