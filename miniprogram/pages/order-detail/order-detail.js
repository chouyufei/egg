const api = require('../../utils/api');
const { formatTime, statusLabel, statusTag } = require('../../utils/format');
const app = getApp();

Page({
  data: {
    id: 0, order: null, chats: [], msg: '',
    user: null,
    statusText: '', statusCls: '',
    otherLabel: '', otherName: '', otherPhone: '',
    showDispute: false, dispute: { type: '', description: '' },
    serviceQr: { url: '', owner: '' },
  },
  onLoad(opt) {
    this.setData({ id: Number(opt.id), user: app.globalData.user });
    this.load();
    this.poll = setInterval(() => this.load(), 5000);
  },
  onUnload() { clearInterval(this.poll); },
  async load() {
    try {
      const { order, chats, service_qr } = await api.get('/orders/' + this.data.id);
      const me = this.data.user;
      const isFarm = me && me.role === 'farm';
      const other = isFarm ? order.buyer : order.farm;
      this.setData({
        order,
        chats: chats.map(c => ({ ...c, mine: c.sender_id === me.id, timeText: formatTime(c.created_at) })),
        statusText: statusLabel(order.status),
        statusCls: statusTag(order.status),
        otherLabel: isFarm ? '采购商' : '养殖场',
        otherName: other ? other.name : '-',
        otherPhone: other ? other.phone : '-',
        serviceQr: service_qr || { url: '', owner: '' },
      });
    } catch (e) {}
  },
  previewQr() {
    const url = this.data.serviceQr.url;
    if (url) wx.previewImage({ current: url, urls: [url] });
  },
  previewChatImg(e) {
    const url = e.currentTarget.dataset.url;
    if (url) wx.previewImage({ current: url, urls: [url] });
  },
  saveQr() {
    const url = this.data.serviceQr.url;
    if (!url) return;
    wx.showLoading({ title: '保存中…' });
    wx.downloadFile({
      url,
      success: (r) => {
        wx.saveImageToPhotosAlbum({
          filePath: r.tempFilePath,
          success: () => { wx.hideLoading(); wx.showToast({ title: '已保存到相册', icon: 'success' }); },
          fail: () => { wx.hideLoading(); wx.showToast({ title: '保存失败，请允许相册权限', icon: 'none' }); },
        });
      },
      fail: () => { wx.hideLoading(); wx.showToast({ title: '下载失败', icon: 'none' }); },
    });
  },
  async createGroup() {
    try { await api.post('/orders/' + this.data.id + '/create-group'); wx.showToast({ title: '群已创建' }); await this.load(); }
    catch (e) {}
  },
  async send() {
    const v = (this.data.msg || '').trim();
    if (!v) return;
    try { await api.post('/orders/' + this.data.id + '/chat', { content: v }); this.setData({ msg: '' }); await this.load(); }
    catch (e) {}
  },
  confirm() {
    wx.showModal({
      title: '确认收货', content: '确认后保证金将释放，且无法发起纠纷',
      success: async (r) => {
        if (!r.confirm) return;
        try { await api.post('/orders/' + this.data.id + '/confirm'); wx.showToast({ title: '已确认' }); await this.load(); }
        catch (e) {}
      },
    });
  },
  openDispute() { this.setData({ showDispute: true }); },
  closeDispute() { this.setData({ showDispute: false }); },
  noop() {},
  onDisputeInput(e) {
    const key = e.currentTarget.dataset.k;
    if (!key) return;
    this.setData({ ['dispute.' + key]: e.detail.value });
  },
  async submitDispute() {
    if (!this.data.dispute.type) return wx.showToast({ title: '请填写类型', icon: 'none' });
    try {
      await api.post('/orders/' + this.data.id + '/dispute', this.data.dispute);
      wx.showToast({ title: '纠纷已提交' });
      this.setData({ showDispute: false, dispute: { type: '', description: '' } });
      await this.load();
    } catch (e) {}
  },
});
