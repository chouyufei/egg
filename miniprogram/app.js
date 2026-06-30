App({
  globalData: {
    apiBase: 'http://localhost:3000/api',
    token: '',
    user: null,
    // 审核模式：后端 /auth/app-config 拉。开启后小程序前端会藏起所有
    // 金融 / 复杂功能（钱包、保证金、报价、提现），只剩浏览 + 咨询。
    // 提审时打开，过审后关掉。
    reviewMode: false,
  },
  onLaunch() {
    const token = wx.getStorageSync('token');
    const user = wx.getStorageSync('user');
    if (token) this.globalData.token = token;
    if (user) this.globalData.user = user;
    this.fetchAppConfig();
  },
  fetchAppConfig() {
    wx.request({
      url: this.globalData.apiBase + '/auth/app-config',
      success: (res) => {
        if (res.data && typeof res.data.review_mode === 'boolean') {
          this.globalData.reviewMode = res.data.review_mode;
          if (typeof this._onConfigReady === 'function') this._onConfigReady();
        }
      },
    });
  },
  onConfigReady(cb) {
    if (this.globalData.reviewMode !== false || this._configFetched) cb();
    else this._onConfigReady = cb;
  },
  setAuth(token, user) {
    this.globalData.token = token || '';
    this.globalData.user = user || null;
    if (token) wx.setStorageSync('token', token); else wx.removeStorageSync('token');
    if (user) wx.setStorageSync('user', user); else wx.removeStorageSync('user');
  },
  logout() {
    this.setAuth('', null);
    // 退出后回到首页，以游客身份继续浏览（而不是强制停在登录页）
    wx.switchTab({ url: '/pages/index/index' });
  },
});
