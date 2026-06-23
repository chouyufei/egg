const { defaultShare } = require('../../utils/share');
const api = require('../../utils/api');
const { formatTime } = require('../../utils/format');
const app = getApp();

Page({
  onShareAppMessage() { return defaultShare(); },
  onShareTimeline()   { return defaultShare(); },
  data: {
    balance: 0, locked: 0, available: 0,
    transactions: [],
    tab: 'tx',  // tx | withdraw
    withdrawals: [],
    depositAmount: 1000,
    serviceFee: 50,
  },
  async onShow() {
    if (app.globalData.reviewMode) {
      wx.showModal({
        title: '功能升级中', content: '钱包功能即将上线，敬请期待。',
        showCancel: false, success: () => wx.switchTab({ url: '/pages/index/index' }),
      });
      return;
    }
    await this.load();
  },
  async load() {
    try {
      const b = await api.get('/wallet/balance');
      this.setData({
        balance: Number(b.balance || 0).toFixed(2),
        locked: Number(b.locked_balance || 0).toFixed(2),
        available: Number(b.available || 0).toFixed(2),
      });
    } catch (e) {}
    try {
      const d = await api.get('/deposits/status');
      this.setData({
        depositAmount: d.required,
        serviceFee: d.service_fee,
      });
    } catch (e) {}
    try {
      const { transactions } = await api.get('/wallet/transactions');
      // 三类视觉：实际出/入账（红/绿 +- 金额）；冻结/解冻（中性灰，🔒/🔓 不带 ± 号）
      const LOCK_TYPES = ['withdraw_lock', 'deposit_lock'];
      const UNLOCK_TYPES = ['withdraw_refund', 'deposit_unlock'];
      this.setData({
        transactions: transactions.map(t => {
          const isLock = LOCK_TYPES.includes(t.type);
          const isUnlock = UNLOCK_TYPES.includes(t.type);
          const abs = Math.abs(Number(t.amount)).toFixed(2);
          let amount_str, amount_cls;
          if (isLock) {
            amount_str = '🔒 ¥' + abs;
            amount_cls = 'tx-lock';
          } else if (isUnlock) {
            amount_str = '🔓 ¥' + abs;
            amount_cls = 'tx-unlock';
          } else {
            amount_str = (t.amount > 0 ? '+' : '') + Number(t.amount).toFixed(2);
            amount_cls = t.amount > 0 ? 'tx-in' : 'tx-out';
          }
          return { ...t, amount_str, amount_cls, time_str: formatTime(t.created_at) };
        }),
      });
    } catch (e) {}
    try {
      const { withdrawals } = await api.get('/wallet/withdrawals/mine');
      this.setData({
        withdrawals: withdrawals.map(w => ({
          ...w,
          time_str: formatTime(w.applied_at),
          status_label: ({
            pending: '待审核',
            approved: '已批准 · 待打款',
            transferring: '待您在微信确认收款',
            paid: '平台已打款',
            rejected: '已拒绝',
            failed: '打款失败',
            cancelled: '已取消',
          })[w.status] || w.status,
          status_cls: ({
            pending: 'tag', approved: 'tag-b', transferring: 'tag-y',
            paid: 'tag-g', rejected: 'tag-r', failed: 'tag-r',
            cancelled: 'tag-d',
          })[w.status] || 'tag',
          can_confirm: w.status === 'transferring' && !!w.package_info,
        })),
      });
    } catch (e) {}
  },
  setTab(e) { this.setData({ tab: e.currentTarget.dataset.t }); },
  goRecharge() { wx.navigateTo({ url: '/pages/recharge/recharge' }); },
  onTxTap(e) {
    const t = this.data.transactions[Number(e.currentTarget.dataset.i)];
    if (!t || !t.related) return;
    if (t.related.kind === 'order' && t.related.order_id) {
      wx.navigateTo({ url: '/pages/order-detail/order-detail?id=' + t.related.order_id });
    } else if ((t.related.kind === 'deposit') && t.related.order_id) {
      wx.navigateTo({ url: '/pages/order-detail/order-detail?id=' + t.related.order_id });
    } else if ((t.related.kind === 'deposit') && t.related.resource_id) {
      wx.navigateTo({ url: '/pages/resource-detail/resource-detail?id=' + t.related.resource_id });
    }
  },
  goWithdraw() {
    if (Number(this.data.available) <= 0) {
      return wx.showToast({ title: '可用余额为 0，无法提现', icon: 'none' });
    }
    wx.navigateTo({ url: '/pages/withdraw/withdraw?available=' + this.data.available });
  },
  // 在小程序里拉起微信"商家转账"确认收款 UI，到账后通知后端结算
  async confirmReceive(e) {
    const w = this.data.withdrawals.find(x => x.id === Number(e.currentTarget.dataset.id));
    if (!w || !w.package_info) return wx.showToast({ title: '缺少转账信息', icon: 'none' });
    let cfg;
    try { cfg = await api.get('/wallet/wechat-pay-config'); } catch (err) {}
    if (!cfg || !cfg.mch_id || !cfg.appid) {
      return wx.showToast({ title: '商户配置缺失，请联系客服', icon: 'none' });
    }
    if (!wx.requestMerchantTransfer) {
      return wx.showModal({
        title: '微信版本过低',
        content: '请升级微信到最新版本后再点【确认收款】',
        showCancel: false,
      });
    }
    wx.requestMerchantTransfer({
      mchId: cfg.mch_id,
      appId: cfg.appid,
      package: w.package_info,
      success: async () => {
        try {
          await api.post('/wallet/withdrawals/' + w.id + '/confirm-received');
          wx.showToast({ title: '已到账', icon: 'success' });
          await this.load();
        } catch (err) {
          wx.showToast({ title: err.message || '回执失败', icon: 'none' });
        }
      },
      fail: (err) => {
        wx.showToast({ title: '取消或失败：' + (err && err.errMsg || ''), icon: 'none', duration: 2500 });
      },
    });
  },
  cancelWithdraw(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '取消提现', content: '确认取消该提现申请？',
      success: async r => {
        if (!r.confirm) return;
        try {
          await api.post('/wallet/withdrawals/' + id + '/cancel');
          wx.showToast({ title: '已取消' });
          await this.load();
        } catch (e) {}
      },
    });
  },
});
