const api = require('../../utils/api');
const app = getApp();

const ROLE_LABEL = { farm: '🐔 我要卖蛋', buyer: '🛒 我要买蛋', admin: '⚙️ 管理员' };

Page({
  data: {
    stage: 'pick',
    role: '', roleLabel: '',
    phone: '', otp: '',
    loading: false, sendingOtp: false, cd: 0,
    wxLoading: false,
    modes: { sms: { live: false, provider: 'demo' }, wechat: { live: false } },
    showBindPhone: false,
    bindPhone: '', bindOtp: '', bindCd: 0,
  },
  onLoad() { this.loadModes(); },

  async loadModes() {
    try { const m = await api.get('/auth/login-modes'); this.setData({ modes: m }); } catch (e) {}
  },

  pickRole(e) {
    const role = e.currentTarget.dataset.r;
    this.setData({ role, roleLabel: ROLE_LABEL[role], stage: 'input' });
  },
  adminLogin() {
    this.setData({ role: 'admin', roleLabel: ROLE_LABEL.admin, stage: 'input' });
  },
  backToPick() { this.setData({ stage: 'pick', role: '', phone: '', otp: '' }); },

  async sendOtp() {
    if (!/^1\d{10}$/.test(this.data.phone)) {
      return wx.showToast({ title: '手机号格式错误', icon: 'none' });
    }
    this.setData({ sendingOtp: true });
    try {
      const r = await api.post('/auth/send-otp', { phone: this.data.phone });
      wx.showToast({ title: r.message || '验证码已发送', icon: 'none' });
      this.startCooldown('cd');
    } catch (e) {} finally { this.setData({ sendingOtp: false }); }
  },

  startCooldown(key) {
    this.setData({ [key]: 60 });
    const t = setInterval(() => {
      const v = this.data[key] - 1;
      this.setData({ [key]: v });
      if (v <= 0) clearInterval(t);
    }, 1000);
    this._timers = (this._timers || []).concat(t);
  },

  async login() {
    if (!this.data.phone || !this.data.otp) {
      return wx.showToast({ title: '请填写手机号和验证码', icon: 'none' });
    }
    this.setData({ loading: true });
    try {
      const res = await api.post('/auth/login', {
        phone: this.data.phone,
        otp: this.data.otp,
        role: this.data.role,
      });
      app.setAuth(res.token, res.user);
      wx.showToast({ title: '登录成功', icon: 'success' });
      setTimeout(() => wx.switchTab({ url: '/pages/index/index' }), 300);
    } catch (e) {} finally { this.setData({ loading: false }); }
  },

  async wechatLogin() {
    this.setData({ wxLoading: true });
    try {
      const code = await new Promise((resolve, reject) => {
        wx.login({ success: r => r.code ? resolve(r.code) : reject(new Error('未获取到 code')), fail: reject });
      });
      const res = await api.post('/auth/wechat-login', { code, role: this.data.role });
      app.setAuth(res.token, res.user);
      wx.showToast({ title: '微信登录成功', icon: 'success' });
      if (res.needs_phone) {
        setTimeout(() => this.setData({ showBindPhone: true }), 500);
      } else {
        setTimeout(() => wx.switchTab({ url: '/pages/index/index' }), 300);
      }
    } catch (e) {
      wx.showToast({ title: e.message || '微信登录失败', icon: 'none' });
    } finally { this.setData({ wxLoading: false }); }
  },

  onGetUserInfo() {},

  async sendBindOtp() {
    if (!/^1\d{10}$/.test(this.data.bindPhone)) return wx.showToast({ title: '手机号格式错误', icon: 'none' });
    try {
      const r = await api.post('/auth/send-otp', { phone: this.data.bindPhone });
      wx.showToast({ title: r.message || '已发送', icon: 'none' });
      this.startCooldown('bindCd');
    } catch (e) {}
  },

  async submitBind() {
    if (!this.data.bindPhone || !this.data.bindOtp) {
      return wx.showToast({ title: '请填写手机号和验证码', icon: 'none' });
    }
    try {
      const res = await api.post('/auth/bind-phone', { phone: this.data.bindPhone, otp: this.data.bindOtp });
      app.setAuth(app.globalData.token, res.user);
      wx.showToast({ title: '已绑定', icon: 'success' });
      setTimeout(() => { this.setData({ showBindPhone: false }); wx.switchTab({ url: '/pages/index/index' }); }, 500);
    } catch (e) {}
  },

  skipBind() {
    this.setData({ showBindPhone: false });
    wx.switchTab({ url: '/pages/index/index' });
  },

  onUnload() {
    (this._timers || []).forEach(t => clearInterval(t));
  },
});
