const api = require('../../utils/api');
const app = getApp();

const PROVINCES = ['北京', '天津', '河北', '山西', '辽宁', '吉林', '黑龙江', '上海', '江苏', '浙江', '安徽',
  '福建', '江西', '山东', '河南', '湖北', '湖南', '广东', '广西', '海南', '重庆', '四川', '贵州', '云南',
  '陕西', '甘肃', '青海', '宁夏', '新疆', '内蒙古', '西藏'];

Page({
  data: {
    isSupply: true,
    provinces: PROVINCES, provinceIndex: 0,
    form: {
      title: '', region: '', chicken_breed: '', farm_size: '',
      egg_color: '红壳', weight_spec: '', shell_quality: '',
      freshness_days: 3, quantity: '', start_price: '',
      min_increment: 2, duration_hours: 2, description: '',
    },
    photosText: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=800',
    loading: false,
  },
  onLoad() {
    const user = app.globalData.user;
    if (!user) return wx.reLaunch({ url: '/pages/login/login' });
    const isSupply = user.role === 'farm';
    let idx = 0;
    if (user.region) {
      for (let i = 0; i < PROVINCES.length; i++) {
        if (user.region.indexOf(PROVINCES[i]) >= 0) { idx = i; break; }
      }
    }
    this.setData({
      isSupply,
      provinceIndex: idx,
      'form.region': user.region || '',
    });
    wx.setNavigationBarTitle({ title: isSupply ? '发布货源' : '发布求购' });
  },
  pickColor(e) { this.setData({ 'form.egg_color': e.detail.value }); },
  pickDur(e) { this.setData({ 'form.duration_hours': Number(e.detail.value) }); },
  pickProvince(e) { this.setData({ provinceIndex: Number(e.detail.value) }); },
  async submit() {
    this.setData({ loading: true });
    try {
      const photos = (this.data.photosText || '').split('\n').map(s => s.trim()).filter(Boolean);
      const f = this.data.form;
      const payload = {
        ...f,
        kind: this.data.isSupply ? 'supply' : 'demand',
        province: this.data.provinces[this.data.provinceIndex],
        farm_size: Number(f.farm_size) || null,
        freshness_days: Number(f.freshness_days) || null,
        quantity: Number(f.quantity),
        start_price: Number(f.start_price),
        min_increment: Number(f.min_increment),
        duration_hours: Number(f.duration_hours),
        unit_label: '元/箱',
        photos,
      };
      await api.post('/resources', payload);
      wx.showToast({ title: '发布成功' });
      setTimeout(() => wx.navigateBack(), 500);
    } catch (e) {} finally { this.setData({ loading: false }); }
  },
});
