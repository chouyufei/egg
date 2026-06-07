const api = require('../../utils/api');
const { chooseAndUpload, uploadOne } = require('../../utils/upload');
const { requestSubscribe } = require('../../utils/subscribe');
const { ensureFarmDeposit } = require('../../utils/deposit');
const app = getApp();

// 从 "38-42 斤/箱" 反解出 [min, max]
function parseWeightSpec(s) {
  if (!s) return ['', ''];
  const m = String(s).match(/(\d+(?:\.\d+)?)\s*[-~—]\s*(\d+(?:\.\d+)?)/);
  return m ? [m[1], m[2]] : ['', ''];
}

const PROVINCES = ['北京', '天津', '河北', '山西', '辽宁', '吉林', '黑龙江', '上海', '江苏', '浙江', '安徽',
  '福建', '江西', '山东', '河南', '湖北', '湖南', '广东', '广西', '海南', '重庆', '四川', '贵州', '云南',
  '陕西', '甘肃', '青海', '宁夏', '新疆', '内蒙古', '西藏'];

// 常用车型对照（4.2/6.8/9.6/13.5 米厢货 → 标准箱数）
const TRUCK_PRESETS = [
  { value: 4.2, boxes: 250 },
  { value: 6.8, boxes: 450 },
  { value: 9.6, boxes: 720 },
  { value: 13.5, boxes: 1250 },
];

Page({
  data: {
    isSupply: true,
    provinces: PROVINCES, provinceIndex: 0,
    truckPresets: TRUCK_PRESETS,
    form: {
      title: '', region: '', chicken_breed: '',
      farm_size_wan: '',
      egg_color: '红壳',
      weight_min: '', weight_max: '',
      shell_quality: '',
      defect_rate: '', defect_note: '',
      freshness_days: 3, quantity: '', unit_size: '车', start_price: '',
      min_increment: 2, duration_hours: 2, description: '',
    },
    photos: [],
    video: '',
    loading: false,
    fromId: 0,
    depositPaid: false,
    depositAmount: 0,
  },

  async refreshDepositStatus() {
    if (!this.data.isSupply) return;
    try {
      const ds = await api.get('/deposits/status');
      this.setData({
        depositPaid: !!(ds.farm && ds.farm.paid),
        depositAmount: (ds.farm && ds.farm.required) || 0,
      });
    } catch (e) {}
  },

  async onShow() {
    // 每次回到本页都重新查保证金状态（缴纳 / 退还后即时反映）
    await this.refreshDepositStatus();
  },

  async onDepositTap() {
    if (this.data.depositPaid) return;
    const ok = await ensureFarmDeposit();
    if (ok) await this.refreshDepositStatus();
  },
  async onLoad(opt) {
    const user = app.globalData.user;
    if (!user) return wx.reLaunch({ url: '/pages/login/login' });
    const isSupply = user.role === 'farm';
    let idx = 0;
    if (user.region) for (let i = 0; i < PROVINCES.length; i++) {
      if (user.region.indexOf(PROVINCES[i]) >= 0) { idx = i; break; }
    }
    this.setData({
      isSupply,
      provinceIndex: idx,
      'form.region': user.region || '',
    });
    wx.setNavigationBarTitle({ title: isSupply ? '发布货源' : '发布求购' });

    // 流拍重新上架：?from=<resource_id> → 拉旧数据预填
    if (opt && opt.from) {
      this.setData({ fromId: Number(opt.from) });
      try {
        const { resource: r } = await api.get('/resources/' + Number(opt.from));
        const [minW, maxW] = parseWeightSpec(r.weight_spec);
        let pIdx = 0;
        if (r.province) for (let i = 0; i < PROVINCES.length; i++) {
          if (PROVINCES[i] === r.province) { pIdx = i; break; }
        }
        this.setData({
          provinceIndex: pIdx,
          'form.title': r.title || '',
          'form.region': r.region || '',
          'form.chicken_breed': r.chicken_breed || '',
          'form.farm_size_wan': r.farm_size ? +(r.farm_size / 10000).toFixed(2) : '',
          'form.egg_color': r.egg_color || '红壳',
          'form.weight_min': minW,
          'form.weight_max': maxW,
          'form.shell_quality': r.shell_quality || '',
          'form.defect_rate': r.defect_rate != null ? String(r.defect_rate) : '',
          'form.defect_note': r.defect_note || '',
          'form.freshness_days': r.freshness_days || 3,
          'form.quantity': r.quantity || '',
          'form.unit_size': r.unit_size || '车',
          'form.start_price': r.start_price || '',
          'form.min_increment': r.min_increment || 2,
          'form.description': r.description || '',
          photos: r.photos || [],
          video: r.intro_video || '',
        });
      } catch (e) {}
    }
  },
  pickColor(e) { this.setData({ 'form.egg_color': e.detail.value }); },
  pickDur(e) { this.setData({ 'form.duration_hours': Number(e.detail.value) }); },
  pickProvince(e) { this.setData({ provinceIndex: Number(e.detail.value) }); },
  pickUnitSize(e) { this.setData({ 'form.unit_size': e.detail.value }); },
  pickTruck(e) { this.setData({ 'form.quantity': String(e.currentTarget.dataset.v) }); },

  onInput(e) {
    const key = e.currentTarget.dataset.k;
    if (!key) return;
    this.setData({ ['form.' + key]: e.detail.value });
  },

  async addPhoto() {
    const remain = 9 - this.data.photos.length;
    if (remain <= 0) return;
    try {
      const urls = await chooseAndUpload({ count: remain });
      if (urls.length) this.setData({ photos: this.data.photos.concat(urls) });
    } catch (e) {}
  },
  delPhoto(e) {
    const i = Number(e.currentTarget.dataset.i);
    const arr = this.data.photos.slice();
    arr.splice(i, 1);
    this.setData({ photos: arr });
  },
  preview(e) {
    wx.previewImage({ current: e.currentTarget.dataset.url, urls: this.data.photos });
  },

  addVideo() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['video'],
      sourceType: ['album', 'camera'],
      maxDuration: 60,
      camera: 'back',
      success: async (res) => {
        const tempPath = res.tempFiles && res.tempFiles[0] && res.tempFiles[0].tempFilePath;
        if (!tempPath) return;
        wx.showLoading({ title: '上传视频…', mask: true });
        try {
          const url = await uploadOne(tempPath);
          this.setData({ video: url });
          wx.hideLoading();
          wx.showToast({ title: '已上传' });
        } catch (e) {
          wx.hideLoading();
          wx.showToast({ title: '视频上传失败', icon: 'none' });
        }
      },
    });
  },
  delVideo() { this.setData({ video: '' }); },

  async submit() {
    const f = this.data.form;
    // 简单必填校验
    if (!f.title || !f.quantity || !f.start_price) {
      return wx.showToast({ title: '请填写标题/数量/起拍价', icon: 'none' });
    }

    // 发布货源前：检查品质保证金。未缴则弹窗直接拉起支付，支付完留在本页继续发布
    if (this.data.isSupply) {
      const ok = await ensureFarmDeposit();
      if (!ok) return;
    }

    await requestSubscribe(['order_received']);
    this.setData({ loading: true });
    try {
      const farmSizeWan = Number(f.farm_size_wan) || 0;
      const wMin = String(f.weight_min || '').trim();
      const wMax = String(f.weight_max || '').trim();
      const weightSpec = (wMin && wMax) ? `${wMin}-${wMax} 斤/箱` : (wMin || wMax || '');
      const payload = {
        ...f,
        kind: this.data.isSupply ? 'supply' : 'demand',
        province: this.data.provinces[this.data.provinceIndex],
        // 养殖规模：用户填 1.5 (万只) → 存 15000 (只)
        farm_size: farmSizeWan ? Math.round(farmSizeWan * 10000) : null,
        weight_spec: weightSpec,
        defect_rate: f.defect_rate !== '' ? Number(f.defect_rate) : null,
        defect_note: f.defect_note || null,
        freshness_days: Number(f.freshness_days) || null,
        quantity: Number(f.quantity),
        start_price: Number(f.start_price),
        min_increment: Number(f.min_increment),
        duration_hours: Number(f.duration_hours),
        unit_label: '元/' + (f.unit_size || '车'),
        unit_size: f.unit_size || '车',
        intro_video: this.data.video || null,
        photos: this.data.photos,
      };
      delete payload.farm_size_wan;
      delete payload.weight_min;
      delete payload.weight_max;
      await api.post('/resources', payload);
      wx.showToast({ title: '发布成功' });
      setTimeout(() => wx.navigateBack(), 500);
    } catch (e) {} finally { this.setData({ loading: false }); }
  },
});
