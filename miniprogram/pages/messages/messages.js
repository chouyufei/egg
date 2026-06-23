const { defaultShare } = require('../../utils/share');
const api = require('../../utils/api');
const { formatTime } = require('../../utils/format');

const ICONS = {
  new_bid: '💰', outbid: '⚠️', auction_won: '🎉', auction_failed: '😔', auction_extended: '⏱',
  order_completed: '✅', order_auto_complete: '🤖', group_created: '👥', order_group: '📲',
  qualify_approved: '✔️', qualify_rejected: '❌',
  dispute_raised: '⚖️', dispute_resolved: '🤝',
  deposit_deducted: '💸', resource_takedown: '🚫',
  withdraw_approved: '✅', withdraw_paid: '💴', withdraw_rejected: '❌',
};

Page({
  onShareAppMessage() { return defaultShare(); },
  onShareTimeline()   { return defaultShare(); },
  data: { list: [] },
  async onShow() {
    try {
      const { messages } = await api.get('/messages');
      this.setData({
        list: messages.map(m => ({ ...m, icon: ICONS[m.type] || '📩', timeText: formatTime(m.created_at) })),
      });
      await api.post('/messages/read', {});
    } catch (e) {}
  },
  previewQr(e) {
    const url = e.currentTarget.dataset.url;
    if (!url) return;
    wx.previewImage({ current: url, urls: [url] });
  },
});
