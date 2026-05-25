const api = require('../../utils/api');

Page({
  data: {
    form: {
      title: '', region: '', chicken_breed: '', farm_size: '',
      egg_color: '红壳', weight_spec: '', shell_quality: '',
      freshness_days: 3, quantity: '', start_price: '',
      min_increment: 2, duration_hours: 2, description: '',
    },
    photosText: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=800',
    loading: false,
  },
  pickColor(e) { this.setData({ 'form.egg_color': e.detail.value }); },
  pickDur(e) { this.setData({ 'form.duration_hours': Number(e.detail.value) }); },
  async submit() {
    this.setData({ loading: true });
    try {
      const photos = (this.data.photosText || '').split('\n').map(s => s.trim()).filter(Boolean);
      const f = this.data.form;
      const payload = {
        ...f,
        farm_size: Number(f.farm_size) || null,
        freshness_days: Number(f.freshness_days) || null,
        quantity: Number(f.quantity),
        start_price: Number(f.start_price),
        min_increment: Number(f.min_increment),
        duration_hours: Number(f.duration_hours),
        photos,
      };
      await api.post('/resources', payload);
      wx.showToast({ title: '发布成功' });
      setTimeout(() => wx.navigateBack(), 500);
    } catch (e) {} finally { this.setData({ loading: false }); }
  },
});
