const api = require('../../utils/api');
const app = getApp();

Page({
  data: {
    available: 0,
    method: 'wechat',
    amount: '',
    account_name: '',
    account_no: '',
    bank_name: '',
    submitting: false,
  },
  onLoad(opt) {
    if (app.globalData.reviewMode) {
      wx.showModal({ title: '功能升级中', content: '提现功能即将上线。', showCancel: false, success: () => wx.navigateBack() });
      return;
    }
    this.setData({ available: Number(opt.available || 0) });
  },
  pickMethod(e) { this.setData({ method: e.detail.value }); },
  fillAll() { this.setData({ amount: String(this.data.available) }); },
  onInput(e) {
    const key = e.currentTarget.dataset.k;
    if (key) this.setData({ [key]: e.detail.value });
  },
  async submit() {
    const amt = Number(this.data.amount);
    if (!amt || amt <= 0) return wx.showToast({ title: '请输入提现金额', icon: 'none' });
    if (amt > this.data.available) return wx.showToast({ title: '不能超过可用余额', icon: 'none' });
    if (this.data.method === 'bank') {
      if (!this.data.account_name || !this.data.account_no || !this.data.bank_name) {
        return wx.showToast({ title: '请完整填写银行卡信息', icon: 'none' });
      }
    }
    this.setData({ submitting: true });
    try {
      await api.post('/wallet/withdrawals', {
        amount: amt,
        method: this.data.method,
        account_name: this.data.account_name,
        account_no: this.data.account_no,
        bank_name: this.data.bank_name,
      });
      wx.showToast({ title: '已提交，等待审核', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 800);
    } catch (e) {} finally { this.setData({ submitting: false }); }
  },
});
