const api = require('../../utils/api');
const app = getApp();

const ROLE_LABEL = { farm: '🐔 我要卖蛋', buyer: '🛒 我要买蛋', admin: '⚙️ 管理员' };

Page({
  data: {
    stage: 'pick',  // pick | input
    role: '', roleLabel: '',
    phone: '', otp: '', loading: false, cd: 0,
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
    try {
      await api.post('/auth/send-otp', { phone: this.data.phone });
      wx.showToast({ title: '验证码：123456', icon: 'none' });
      this.setData({ cd: 60 });
      this.timer = setInterval(() => {
        const cd = this.data.cd - 1;
        this.setData({ cd });
        if (cd <= 0) clearInterval(this.timer);
      }, 1000);
    } catch (e) {}
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
  onUnload() { clearInterval(this.timer); },
});
