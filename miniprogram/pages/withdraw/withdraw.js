const api = require('../../utils/api');
const app = getApp();

const DEFAULT_RULES = {
  min_amount: 1,
  processing_hours: 1,
  arrival_hours: 2,
  fee_pct: 0,
  window: '7×24 小时',
  methods: {
    wechat: { max_per_request: 200, max_daily_count: 10, max_daily_amount: 2000 },
    bank: { max_per_request: 5000, max_daily_count: 3, max_daily_amount: 5000 },
  },
};

Page({
  data: {
    available: 0,
    method: 'wechat',
    amount: '',
    account_name: '',
    account_no: '',
    bank_name: '',
    submitting: false,
    rules: DEFAULT_RULES,
    current: DEFAULT_RULES.methods.wechat,  // 当前 method 对应的额度规则
  },
  async onLoad(opt) {
    this.setData({ available: Number(opt.available || 0) });
    try {
      const rules = await api.get('/wallet/withdraw-rules');
      const merged = { ...DEFAULT_RULES, ...rules };
      if (rules.methods) merged.methods = { ...DEFAULT_RULES.methods, ...rules.methods };
      this.setData({ rules: merged, current: merged.methods[this.data.method] });
    } catch (e) {}
  },
  pickMethod(e) {
    const m = e.detail.value;
    this.setData({ method: m, current: this.data.rules.methods[m] });
  },
  fillAll() {
    const max = Math.min(this.data.available, this.data.current.max_per_request);
    this.setData({ amount: String(max) });
  },
  onInput(e) {
    const key = e.currentTarget.dataset.k;
    if (key) this.setData({ [key]: e.detail.value });
  },
  async submit() {
    const amt = Number(this.data.amount);
    const r = this.data.rules;
    const cur = this.data.current;
    const label = this.data.method === 'wechat' ? '微信零钱' : '银行卡';
    if (!amt || amt < r.min_amount) return wx.showToast({ title: `单笔提现至少 ${r.min_amount} 元`, icon: 'none' });
    if (amt > cur.max_per_request) return wx.showToast({ title: `${label}单笔上限 ${cur.max_per_request} 元`, icon: 'none' });
    if (amt > this.data.available) return wx.showToast({ title: '不能超过可用余额', icon: 'none' });
    if (this.data.method === 'bank') {
      if (!this.data.account_name || !this.data.account_no || !this.data.bank_name) {
        return wx.showToast({ title: '请完整填写银行卡信息', icon: 'none' });
      }
    }
    this.setData({ submitting: true });
    try {
      const res = await api.post('/wallet/withdrawals', {
        amount: amt,
        method: this.data.method,
        account_name: this.data.account_name,
        account_no: this.data.account_no,
        bank_name: this.data.bank_name,
      });
      const w = res.withdrawal || {};
      // 微信零钱 + 拿到 package_info → 直接拉起微信"商家转账到零钱"确认收款窗口
      if (this.data.method === 'wechat' && w.package_info && wx.requestMerchantTransfer) {
        let cfg;
        try { cfg = await api.get('/wallet/wechat-pay-config'); } catch (err) {}
        if (cfg && cfg.appid && cfg.mch_id) {
          wx.requestMerchantTransfer({
            mchId: cfg.mch_id,
            appId: cfg.appid,
            package: w.package_info,
            success: async () => {
              try {
                await api.post('/wallet/withdrawals/' + w.id + '/confirm-received');
                wx.showToast({ title: '已到账', icon: 'success' });
                setTimeout(() => wx.navigateBack(), 800);
              } catch (err) {
                wx.showToast({ title: err.message || '回执失败', icon: 'none' });
              }
            },
            fail: () => {
              wx.showToast({ title: '可在「提现记录」点【确认收款】完成到账', icon: 'none', duration: 3000 });
              setTimeout(() => wx.navigateBack(), 1500);
            },
          });
          return;
        }
      }
      // 微信零钱已直接 paid / 银行卡需人工 / demo：提示并返回
      const msg = w.status === 'paid' ? '已到账'
        : this.data.method === 'bank' ? '已提交，2 小时内到账'
        : '已提交';
      wx.showToast({ title: msg, icon: 'success' });
      setTimeout(() => wx.navigateBack(), 800);
    } catch (e) {} finally { this.setData({ submitting: false }); }
  },
});
