const api = require('../../utils/api');
const { chooseAndUpload } = require('../../utils/upload');
const { statusLabel, statusTag } = require('../../utils/format');
const app = getApp();

const PROVINCES = ['北京', '天津', '河北', '山西', '辽宁', '吉林', '黑龙江', '上海', '江苏', '浙江', '安徽',
  '福建', '江西', '山东', '河南', '湖北', '湖南', '广东', '广西', '海南', '重庆', '四川', '贵州', '云南',
  '陕西', '甘肃', '青海', '宁夏', '新疆', '内蒙古', '西藏'];

Page({
  data: {
    form: {
      name: '', contact_name: '', contact_phone: '', address: '',
      business_license: '', farm_size_int: '', daily_output: '', main_products: '',
      license_photos: [], farm_photos: [], quarantine_photos: [],
    },
    provinces: PROVINCES, provinceIndex: 0,
    statusText: '未提交', statusCls: 'tag-d',
    loading: false,
  },
  onLoad() {
    const u = app.globalData.user;
    if (!u) return;
    let idx = 0;
    if (u.region) for (let i = 0; i < PROVINCES.length; i++) {
      if (u.region.indexOf(PROVINCES[i]) >= 0) { idx = i; break; }
    }
    this.setData({
      provinceIndex: idx,
      'form.name': u.name || '',
      'form.contact_phone': u.phone || '',
      'form.address': u.address || '',
      'form.business_license': u.business_license || '',
      'form.contact_name': u.contact_name || '',
      'form.farm_size_int': u.farm_size_int || '',
      'form.daily_output': u.daily_output || '',
      'form.main_products': u.main_products || '',
      'form.license_photos': safeParse(u.license_photos),
      'form.farm_photos': safeParse(u.farm_photos),
      'form.quarantine_photos': safeParse(u.quarantine_photos),
      statusText: statusLabel(u.license_status),
      statusCls: statusTag(u.license_status),
    });
  },
  onShow() {
    const u = app.globalData.user;
    if (!u) return;
    this.setData({
      statusText: statusLabel(u.license_status),
      statusCls: statusTag(u.license_status),
    });
  },
  pickProvince(e) { this.setData({ provinceIndex: Number(e.detail.value) }); },

  onInput(e) {
    const key = e.currentTarget.dataset.k;
    if (!key) return;
    this.setData({ ['form.' + key]: e.detail.value });
  },

  async upload(e) {
    const key = e.currentTarget.dataset.k;
    const max = Number(e.currentTarget.dataset.count) || 1;
    const current = this.data.form[key] || [];
    const remain = Math.max(1, max - current.length);
    try {
      const urls = await chooseAndUpload({ count: remain });
      if (urls.length) this.setData({ ['form.' + key]: current.concat(urls) });
    } catch (e) {}
  },
  del(e) {
    const key = e.currentTarget.dataset.k;
    const i = Number(e.currentTarget.dataset.i);
    const arr = (this.data.form[key] || []).slice();
    arr.splice(i, 1);
    this.setData({ ['form.' + key]: arr });
  },
  preview(e) {
    const url = e.currentTarget.dataset.url;
    const list = e.currentTarget.dataset.list;
    wx.previewImage({ current: url, urls: list });
  },

  scrollToField(id) {
    const q = wx.createSelectorQuery();
    q.select('#' + id).boundingClientRect();
    q.selectViewport().scrollOffset();
    q.exec((res) => {
      const rect = res[0];
      const vp = res[1];
      if (!rect || !vp) return;
      const target = Math.max(0, rect.top + vp.scrollTop - 100);
      wx.pageScrollTo({ scrollTop: target, duration: 300 });
    });
  },

  async submit() {
    const f = this.data.form;
    const checks = [
      { key: 'name', label: '鸡场名称', missing: !f.name },
      { key: 'contact_name', label: '联系人', missing: !f.contact_name },
      { key: 'contact_phone', label: '联系电话', missing: !f.contact_phone },
      { key: 'address', label: '详细地址', missing: !f.address },
      { key: 'farm_size_int', label: '养殖规模', missing: !f.farm_size_int },
      { key: 'main_products', label: '主营蛋品', missing: !f.main_products },
      { key: 'business_license', label: '营业执照号', missing: !f.business_license },
      { key: 'license_photos', label: '营业执照照片', missing: !f.license_photos.length },
      { key: 'farm_photos', label: '鸡场实景照', missing: !f.farm_photos.length },
    ];
    const missing = checks.filter(c => c.missing);
    if (missing.length) {
      wx.showModal({
        title: '资料未填完整',
        content: '请补充以下信息：\n· ' + missing.map(c => c.label).join('\n· '),
        showCancel: false,
        confirmText: '去补充',
      });
      this.scrollToField('field-' + missing[0].key);
      return;
    }

    this.setData({ loading: true });
    try {
      const province = this.data.provinces[this.data.provinceIndex];
      const region = province + (f.address.indexOf(province) >= 0 ? '' : '·' + (f.address.split(/[市县区]/)[0] || ''));
      await api.post('/auth/qualify', {
        ...f,
        region,
      });
      wx.showToast({ title: '已提交，等待审核' });
      const me = await api.get('/auth/me');
      app.setAuth(app.globalData.token, me.user);
      this.setData({
        statusText: statusLabel(me.user.license_status),
        statusCls: statusTag(me.user.license_status),
      });
    } catch (e) {} finally { this.setData({ loading: false }); }
  },
});

function safeParse(s) {
  if (!s) return [];
  if (Array.isArray(s)) return s;
  try { const v = JSON.parse(s); return Array.isArray(v) ? v : []; }
  catch (e) { return []; }
}
