const api = require('../../utils/api');
const { formatTime } = require('../../utils/format');

Page({
  data: {
    balance: 0, locked: 0, available: 0,
    transactions: [],
    tab: 'tx',  // tx | withdraw
    withdrawals: [],
    depositAmount: 1000,
    serviceFee: 50,
  },
  async onShow() {
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
      this.setData({
        transactions: transactions.map(t => ({
          ...t,
          amount_str: (t.amount > 0 ? '+' : '') + Number(t.amount).toFixed(2),
          amount_cls: t.amount > 0 ? 'tx-in' : 'tx-out',
          time_str: formatTime(t.created_at),
        })),
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
            approved: '已批准 · 等待打款',
            paid: '已到账',
            rejected: '已拒绝',
            failed: '打款失败',
            cancelled: '已取消',
          })[w.status] || w.status,
          status_cls: ({
            pending: 'tag', approved: 'tag-b',
            paid: 'tag-g', rejected: 'tag-r', failed: 'tag-r',
            cancelled: 'tag-d',
          })[w.status] || 'tag',
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
