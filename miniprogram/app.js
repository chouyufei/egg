App({
  globalData: {
    apiBase: 'http://localhost:3000/api',
    token: '',
    user: null,
  },
  onLaunch() {
    const token = wx.getStorageSync('token');
    const user = wx.getStorageSync('user');
    if (token) this.globalData.token = token;
    if (user) this.globalData.user = user;
  },
  setAuth(token, user) {
    this.globalData.token = token || '';
    this.globalData.user = user || null;
    if (token) wx.setStorageSync('token', token); else wx.removeStorageSync('token');
    if (user) wx.setStorageSync('user', user); else wx.removeStorageSync('user');
  },
  logout() {
    this.setAuth('', null);
    wx.reLaunch({ url: '/pages/login/login' });
  },
});
