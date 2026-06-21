const api = require('../../utils/api');
const app = getApp();

const DEFAULT_RULES = {
  min_amount: 1,
  processing_hours: 24,
  arrival_hours: 72,
  fee_pct: 0,
  window: '工作日 09:00-18:00',
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
