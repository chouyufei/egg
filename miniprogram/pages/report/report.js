const api = require('../../utils/api');
const { chooseAndUpload } = require('../../utils/upload');

const TYPE_LABEL = {
  resource: '资源 / 货源',
  user: '用户',
  chat_message: '聊天消息',
  order: '订单',
};

Page({
  data: {
    target_type: '',
    target_id: 0,
    targetLabel: '',
    categories: [],
    category: '',
    description: '',
    evidence: [],
    submitting: false,
  },
  async onLoad(opt) {
    const t = String(opt.t || 'resource');
    const id = Number(opt.id || 0);
    this.setData({
      target_type: t,
      target_id: id,
      targetLabel: (TYPE_LABEL[t] || '内容') + ' #' + id,
    });
    try {
      const r = await api.get('/reports/categories');
      this.setData({ categories: r.categories || [] });
    } catch (e) {
      this.setData({ categories: ['虚假信息', '违禁品', '涉嫌欺诈', '不当言论', '冒充身份', '其它'] });
    }
  },
  pickCat(e) { this.setData({ category: e.currentTarget.dataset.v }); },
  async addImg() {
    const remain = 4 - this.data.evidence.length;
    if (remain <= 0) return;
    try {
      const urls = await chooseAndUpload({ count: remain });
      if (urls.length) this.setData({ evidence: this.data.evidence.concat(urls) });
    } catch (e) {}
  },
  delImg(e) {
    const i = Number(e.currentTarget.dataset.i);
    const arr = this.data.evidence.slice();
    arr.splice(i, 1);
    this.setData({ evidence: arr });
  },
  async submit() {
    if (!this.data.category) return wx.showToast({ title: '请选择举报类型', icon: 'none' });
    if (this.data.description.trim().length < 5) {
      return wx.showToast({ title: '请填写详细说明', icon: 'none' });
    }
    this.setData({ submitting: true });
    try {
      await api.post('/reports', {
        target_type: this.data.target_type,
        target_id: this.data.target_id,
        category: this.data.category,
        description: this.data.description,
        evidence: this.data.evidence,
      });
      wx.showModal({
        title: '举报已受理',
        content: '平台将在 24 小时内核实处理，结果会通过站内消息通知您。',
        showCancel: false,
        success: () => wx.navigateBack(),
      });
    } catch (e) {} finally { this.setData({ submitting: false }); }
  },
});
