const api = require('../../utils/api');
const { rechargeWallet } = require('../../utils/deposit');
const app = getApp();

const PRESETS = [200, 500, 1000, 2000, 5000];

Page({
  data: {
    available: '0.00',
    amount: '',
    presets: PRESETS,
    paying: false,
  },
  async onShow() {
    if (app.globalData.reviewMode) {
      wx.showModal({ title: '功能升级中', content: '充值功能即将上线。', showCancel: false, success: () => wx.navigateBack() });
      return;
    }
    try {
      const b = await api.get('/wallet/balance');
      this.setData({ available: Number(b.available || 0).toFixed(2) });
    } catch (e) {}
  },
  onInput(e) { this.setData({ amount: e.detail.value }); },
  pickPreset(e) { this.setData({ amount: String(e.currentTarget.dataset.v) }); },
  async submit() {
    const amt = Number(this.data.amount);
    if (!amt || amt < 1) return wx.showToast({ title: '请输入 ≥ 1 元的金额', icon: 'none' });
    if (amt > 50000) return wx.showToast({ title: '单笔上限 50000 元', icon: 'none' });
    this.setData({ paying: true });
    const r = await rechargeWallet(amt);
    this.setData({ paying: false });
    if (r.ok) {
      wx.showToast({ title: r.msg, icon: 'success' });
      setTimeout(() => wx.navigateBack(), 800);
    } else {
      wx.showToast({ title: r.msg, icon: 'none', duration: 3000 });
    }
  },
});
