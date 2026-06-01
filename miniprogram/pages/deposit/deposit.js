const api = require('../../utils/api');
const { formatTime, statusLabel, statusTag } = require('../../utils/format');
const app = getApp();

Page({
  data: { isFarm: false, paid: false, approved: false, history: [], paying: false, payMode: 'demo', requiredAmount: 0 },
  async onShow() {
    const u = app.globalData.user;
    if (!u) return;
    const isFarm = u.role === 'farm';
    this.setData({ isFarm, approved: u.license_status === 'approved' });
    try { const m = await api.get('/pay/mode'); this.setData({ payMode: m.mode }); } catch (e) {}
    await this.load();
  },
  async load() {
    try {
      const ds = await api.get('/deposits/status');
      // 买家竞拍保证金按场缴纳，此页不预缴；只用 required 展示单价
      this.setData({ paid: this.data.isFarm ? ds.farm.paid : false, requiredAmount: (this.data.isFarm ? ds.farm.required : ds.buyer.required) });
    } catch (e) {}
    try {
      const { deposits } = await api.get('/deposits');
      const t = this.data.isFarm ? 'farm_quality' : 'buyer_bid';
      this.setData({
        history: deposits.filter(d => d.type === t).map(d => ({
          ...d,
          timeText: formatTime(d.paid_at),
          statusText: statusLabel(d.status),
          statusCls: statusTag(d.status),
        })),
      });
    } catch (e) {}
  },
  async pay() {
    this.setData({ paying: true });
    try {
      const type = this.data.isFarm ? 'farm_quality' : 'buyer_bid';
      const res = await api.post('/pay/create-order', { type });
      if (res.paid) { wx.showToast({ title: '已缴纳' }); return await this.load(); }
      if (res.demo) {
        wx.showToast({ title: '已缴纳保证金（演示模式）', icon: 'success' });
        return await this.load();
      }
      await new Promise((resolve, reject) => {
        wx.requestPayment({
          timeStamp: res.timeStamp,
          nonceStr: res.nonceStr,
          package: res.package,
          signType: res.signType || 'RSA',
          paySign: res.paySign,
          success: resolve,
          fail: reject,
        });
      });
      wx.showLoading({ title: '确认支付结果…' });
      const ok = await this.pollPayResult(res.out_trade_no, 8);
      wx.hideLoading();
      if (ok) {
        wx.showToast({ title: '支付成功', icon: 'success' });
      } else {
        wx.showToast({ title: '支付已提交，结果稍后同步', icon: 'none', duration: 3000 });
      }
      await this.load();
    } catch (e) {
      wx.hideLoading();
      if (e && e.errMsg && /cancel/.test(e.errMsg)) {
        wx.showToast({ title: '已取消支付', icon: 'none' });
      }
    } finally { this.setData({ paying: false }); }
  },

  async pollPayResult(outTradeNo, maxTries) {
    for (let i = 0; i < maxTries; i++) {
      await new Promise(r => setTimeout(r, 1000));
      try {
        const r = await api.get('/pay/check/' + encodeURIComponent(outTradeNo));
        if (r.paid) return true;
      } catch (e) {}
    }
    return false;
  },
});
