const api = require('../../utils/api');
const { chooseAndUpload, uploadOne } = require('../../utils/upload');
const { requestSubscribe } = require('../../utils/subscribe');
const { ensureFarmDeposit, ensureDemandDeposit } = require('../../utils/deposit');
const { getLocation, chooseLocation } = require('../../utils/location');
const app = getApp();

// 从 "38-42 斤/箱" 反解出 [min, max]
function parseWeightSpec(s) {
  if (!s) return ['', ''];
  const m = String(s).match(/(\d+(?:\.\d+)?)\s*[-~—]\s*(\d+(?:\.\d+)?)/);
  return m ? [m[1], m[2]] : ['', ''];
}

// 从微信地址文本中提取省 + 市
// 例：
//   "北京市朝阳区阜通东大街6号"      → { province: '北京', city: '北京' }
//   "湖北省武汉市江夏区..."          → { province: '湖北', city: '武汉' }
//   "山东省青岛市市南区..."          → { province: '山东', city: '青岛' }
//   "内蒙古自治区呼和浩特市..."      → { province: '内蒙古', city: '呼和浩特' }
//   "新疆维吾尔自治区乌鲁木齐市..."  → { province: '新疆', city: '乌鲁木齐' }
function parseAddress(addr) {
  const s = String(addr || '');
  if (!s) return { province: '', city: '' };
  // 直辖市
  for (const m of ['北京', '天津', '上海', '重庆']) {
    if (s.indexOf(m) === 0) return { province: m, city: m };
  }
  let province = '';
  let rest = s;
  // 标准 "X省" / "X自治区"，省字 / 自治区 在地址里。用 match[0].length 跳过整段
  const provMatch = s.match(/^(.+?)(省|自治区)/);
  if (provMatch) {
    province = provMatch[1].replace(/(回族|壮族|维吾尔|藏族)$/, '');
    rest = s.substring(provMatch[0].length);
  }
  // 兜底 1：地址没"自治区"后缀（如 "宁夏银川市..."）
  if (!province) {
    const known = ['内蒙古', '广西', '宁夏', '新疆', '西藏'];
    const p = known.find(k => s.indexOf(k) === 0);
    if (p) { province = p; rest = s.substring(p.length); }
  }
  // 兜底 2：地址没"省"字（如 "湖北武汉市..."），按已知省份名匹配前缀
  if (!province) {
    const p = PROVINCES.find(k => s.indexOf(k) === 0);
    if (p) { province = p; rest = s.substring(p.length); }
  }
  // 找市：取剩余字符串开头的 2-8 个汉字 + "市"
  const cityMatch = rest.match(/^([一-龥]{2,8}?)市/);
  const city = cityMatch ? cityMatch[1] : '';
  return { province, city };
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

// 蛋色 → 常见鸡种品种映射（参考行业「鸡蛋种类」分类）
const BREEDS_BY_COLOR = {
  '粉壳': ['海兰系列', '罗曼系列', '粉六', '大午金风', '京柏一号', '农三', '其它'],
  '红壳': ['海兰褐', '京红', '罗曼褐', '农大三号', '尼克红', '其它'],
  '土鸡': ['粉八', '新阳黑', '新黛果', '白凤', '花风', '黑凤山', '本地散养', '其它'],
  '乌鸡': ['宝凤绿', '五黑', '新阳绿', '苏禽', '苏禽二代', '达康', '神丹六号', '上海梨园', '其它'],
  '白壳': ['京白', '海兰白', '其它'],
};
// 旧数据兼容
const COLOR_ALIAS = { '杂色': '土鸡' };

Page({
  data: {
    isSupply: true,
    provinces: PROVINCES, provinceIndex: 0,
    truckPresets: TRUCK_PRESETS,
    truckRangeLabels: TRUCK_PRESETS.map(t => `${t.value} m 车  ≈ ${t.boxes} 箱`),
    truckIndex: -1,
    weightWarn: '',           // 净重区间超 2 时的提示
    weightRows: [],           // [{ weight, boxes, price }]，按 weight_min/max 整数斤值动态生成
    totalBoxesNow: 0,         // 各斤值箱数实时合计
    totalBoxesOver: false,    // 是否超过车型容量 + 50
    // 当前蛋色对应的鸡种列表 + picker 索引
    breedOptions: BREEDS_BY_COLOR['红壳'],
    breedIndex: -1,                    // -1 表示未选；>= 0 是 picker 索引
    breedCustom: '',                   // 选"其它"时的文本输入
    // 单箱枚数预设：'360' / '480' / 'other'；'other' 时显示自填输入框
    packSizePreset: '',
    // 蛋黄颜色 picker
    yolkColorOptions: ['红心', '黄心', '双色'],
    yolkColorIndex: -1,
    form: {
      title: '', region: '', chicken_breed: '',
      farm_size_wan: '',
      egg_color: '红壳',
      weight_min: '', weight_max: '',
      pack_size: '',
      yolk_color: '', yolk_shade: '',
      defect_rate: '0.2', defect_note: '',
      freshness_days: 3, truck_count: 1, truck_type: '', quantity: '', unit_size: '车', start_price: '',
      min_increment: 1, duration_hours: 1, description: '',
    },
    photos: [],
    video: '',
    loading: false,
    fromId: 0,
    agreed: false,
    depositPaid: false,    // 钱包可用余额 ≥ 保证金额度
    depositAmount: 0,      // 需冻结金额
    walletAvailable: 0,    // 当前可用余额
    // 用户主动定位（可选）：未选时发布时会回退到自动定位
    pickedLoc: null,    // { lat, lng, name, address }
    locText: '',        // 主显示
    locSub: '',         // 副显示（详细地址）
  },

  async pickLocation() {
    // 优先用 chooseLocation（地图选点，最直观）；不可用则回退到 getLocation（仅当前点）
    let loc = await chooseLocation();
    if (!loc) {
      const auto = await getLocation({ force: true });
      if (!auto) return wx.showToast({ title: '定位失败，请允许定位权限', icon: 'none', duration: 2500 });
      loc = { ...auto, name: '当前位置', address: `${auto.lat.toFixed(4)}, ${auto.lng.toFixed(4)}` };
    }

    // 把地址解析成 省 + 市，自动写回省份下拉 + 具体地区输入框
    const parsed = parseAddress(loc.address || loc.name || '');
    const update = {
      pickedLoc: loc,
      locText: loc.name || '已定位',
      locSub: loc.address || '',
    };
    if (parsed.province) {
      const idx = PROVINCES.findIndex(p => parsed.province.indexOf(p) >= 0 || p.indexOf(parsed.province) >= 0);
      if (idx >= 0) update.provinceIndex = idx;
    }
    if (parsed.city) update['form.region'] = parsed.city;
    this.setData(update);
  },

  clearLocation() {
    this.setData({ pickedLoc: null, locText: '', locSub: '' });
  },

  async refreshDepositStatus() {
    try {
      const ds = await api.get('/deposits/status');
      const required = ds.required || 0;
      const available = (ds.balance && ds.balance.available) || 0;
      this.setData({
        depositPaid: available >= required,
        depositAmount: required,
        walletAvailable: Number(available).toFixed(2),
      });
    } catch (e) {}
  },

  async onShow() {
    await this.refreshDepositStatus();
  },

  async onDepositTap() {
    if (this.data.depositPaid) return;
    const ok = this.data.isSupply
      ? await ensureFarmDeposit()
      : await ensureDemandDeposit();
    if (ok) await this.refreshDepositStatus();
  },
  async onLoad(opt) {
    if (app.globalData.reviewMode) {
      // 审核模式：禁止发布，跳回首页 + 提示用客服
      wx.showModal({
        title: '功能升级中',
        content: '当前版本仅供浏览，发布相关功能即将上线，如需上架请联系客服。',
        showCancel: false,
        success: () => wx.switchTab({ url: '/pages/index/index' }),
      });
      return;
    }
    const user = app.globalData.user;
    if (!user) return wx.reLaunch({ url: '/pages/login/login' });
    const isSupply = user.role === 'farm';
    // 发布货源需先完成养殖场资质认证（求购不限）
    if (isSupply && user.license_status !== 'approved') {
      wx.showModal({
        title: '暂不能发布货源',
        content: '发布货源需先完成养殖场资质认证并通过审核。是否前往认证？',
        confirmText: '去认证',
        cancelText: '返回',
        success: (r) => {
          if (r.confirm) wx.redirectTo({ url: '/pages/qualify/qualify' });
          else { wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/index/index' }) }); }
        },
      });
      return;
    }
    let idx = 0;
    if (user.region) for (let i = 0; i < PROVINCES.length; i++) {
      if (user.region.indexOf(PROVINCES[i]) >= 0) { idx = i; break; }
    }
    // 省份按 user.region 自动匹配（仅默认下拉位置），具体地区不预填，让 placeholder 提示用户
    this.setData({
      isSupply,
      provinceIndex: idx,
    });
    wx.setNavigationBarTitle({ title: isSupply ? '发布货源' : '发布求购' });

    // 未成交重新上架：?from=<resource_id> → 拉旧数据预填
    if (opt && opt.from) {
      this.setData({ fromId: Number(opt.from) });
      try {
        const { resource: r } = await api.get('/resources/' + Number(opt.from));
        const [minW, maxW] = parseWeightSpec(r.weight_spec);
        let pIdx = 0;
        if (r.province) for (let i = 0; i < PROVINCES.length; i++) {
          if (PROVINCES[i] === r.province) { pIdx = i; break; }
        }
        // 蛋色：旧"杂色"映射到"土鸡"；蛋色变 → 同步换鸡种 picker 列表
        const color = COLOR_ALIAS[r.egg_color] || r.egg_color || '红壳';
        const breedOpts = BREEDS_BY_COLOR[color] || BREEDS_BY_COLOR['红壳'];
        let bIdx = breedOpts.indexOf(r.chicken_breed || '');
        let bCustom = '';
        if (bIdx < 0 && r.chicken_breed) {
          // 旧资源里写了不在列表里的鸡种 → 算作"其它"+ 自填
          bIdx = breedOpts.indexOf('其它');
          bCustom = r.chicken_breed;
        }
        // 还原单箱枚数预设（命中 360 / 480 → 对应单选；否则归类为 自填）
        const ps = r.pack_size != null && r.pack_size !== '' ? String(r.pack_size) : '';
        const psPreset = ps === '360' || ps === '480' ? ps : (ps ? 'other' : '');
        // 还原蛋黄颜色 picker
        const yIdx = ['红心', '黄心', '双色'].indexOf(r.yolk_color || '');
        this.setData({
          provinceIndex: pIdx,
          breedOptions: breedOpts,
          breedIndex: bIdx,
          breedCustom: bCustom,
          packSizePreset: psPreset,
          yolkColorIndex: yIdx,
          'form.title': r.title || '',
          'form.region': r.region || '',
          'form.chicken_breed': r.chicken_breed || '',
          'form.farm_size_wan': r.farm_size ? +(r.farm_size / 10000).toFixed(2) : '',
          'form.egg_color': color,
          'form.weight_min': minW,
          'form.weight_max': maxW,
          'form.pack_size': ps,
          'form.yolk_color': r.yolk_color || '',
          'form.yolk_shade': r.yolk_shade || '',
          'form.defect_rate': r.defect_rate != null ? String(r.defect_rate) : '0.2',
          'form.defect_note': r.defect_note || '',
          'form.freshness_days': r.freshness_days || 3,
          'form.quantity': r.quantity || '1',
          'form.truck_count': Number(r.quantity) || 1,
          'form.truck_type': r.truck_type || '',
          truckIndex: r.truck_type ? TRUCK_PRESETS.findIndex(t => Number(t.value) === Number(r.truck_type)) : -1,
          totalBoxes: (function () {
            const i = r.truck_type ? TRUCK_PRESETS.findIndex(t => Number(t.value) === Number(r.truck_type)) : -1;
            return i >= 0 ? TRUCK_PRESETS[i].boxes * (Number(r.quantity) || 1) : 0;
          })(),
          'form.unit_size': r.unit_size || '车',
          'form.start_price': r.start_price || '',
          'form.min_increment': r.min_increment || 1,
          'form.description': r.description || '',
          photos: r.photos || [],
          video: r.intro_video || '',
        });
        if (r.lat != null && r.lng != null) {
          this.setData({
            pickedLoc: { lat: r.lat, lng: r.lng, name: r.region || '原货源位置', address: '' },
            locText: r.region || '原货源位置',
            locSub: `${Number(r.lat).toFixed(4)}, ${Number(r.lng).toFixed(4)}`,
          });
        }
      } catch (e) {}
    }
  },
  toggleAgree() { this.setData({ agreed: !this.data.agreed }); },
  openAgreement() { wx.navigateTo({ url: '/pages/agreement/agreement' }); },
  openPrivacy()   { wx.navigateTo({ url: '/pages/privacy/privacy' }); },

  // 沿用上次发布的数据：从 /resources/last-published 拉最近一次的同类资源，
  // 把表单字段一次性填入（按 onLoad 中"未成交重新上架"的逻辑复用）
  async fillFromLast() {
    try {
      const kind = this.data.isSupply ? 'supply' : 'demand';
      const { resource: r } = await api.get('/resources/last-published?kind=' + kind);
      if (!r) return wx.showToast({ title: '暂无上次发布记录', icon: 'none' });

      const [minW, maxW] = parseWeightSpec(r.weight_spec);
      let pIdx = 0;
      if (r.province) for (let i = 0; i < PROVINCES.length; i++) {
        if (PROVINCES[i] === r.province) { pIdx = i; break; }
      }
      const color = COLOR_ALIAS[r.egg_color] || r.egg_color || '红壳';
      const breedOpts = BREEDS_BY_COLOR[color] || BREEDS_BY_COLOR['红壳'];
      let bIdx = breedOpts.indexOf(r.chicken_breed || '');
      let bCustom = '';
      if (bIdx < 0 && r.chicken_breed) { bIdx = breedOpts.indexOf('其它'); bCustom = r.chicken_breed; }

      const ps = r.pack_size != null && r.pack_size !== '' ? String(r.pack_size) : '';
      const psPreset = ps === '360' || ps === '480' ? ps : (ps ? 'other' : '');
      const yIdx = ['红心', '黄心', '双色'].indexOf(r.yolk_color || '');

      // weight_specs 复原：上次发的箱数 / 价格直接拿回来
      let weightRows = [];
      if (r.weight_specs) {
        try {
          const parsed = typeof r.weight_specs === 'string' ? JSON.parse(r.weight_specs) : r.weight_specs;
          if (Array.isArray(parsed)) {
            weightRows = parsed.map(s => ({ weight: s.weight, boxes: String(s.boxes || ''), price: String(s.price || '') }));
          }
        } catch (e) {}
      }

      this.setData({
        provinceIndex: pIdx,
        breedOptions: breedOpts,
        breedIndex: bIdx,
        breedCustom: bCustom,
        packSizePreset: psPreset,
        yolkColorIndex: yIdx,
        truckIndex: r.truck_type ? TRUCK_PRESETS.findIndex(t => Number(t.value) === Number(r.truck_type)) : -1,
        weightRows,
        weightWarn: '',
        'form.title': r.title || '',
        'form.region': r.region || '',
        'form.chicken_breed': r.chicken_breed || '',
        'form.egg_color': color,
        'form.weight_min': minW,
        'form.weight_max': maxW,
        'form.pack_size': ps,
        'form.yolk_color': r.yolk_color || '',
        'form.yolk_shade': r.yolk_shade || '',
        'form.defect_rate': r.defect_rate != null ? String(r.defect_rate) : '0.2',
        'form.defect_note': r.defect_note || '',
        'form.freshness_days': r.freshness_days || 3,
        'form.truck_type': r.truck_type || '',
        'form.unit_size': r.unit_size || '车',
        'form.min_increment': r.min_increment || 1,
        'form.description': r.description || '',
      });
      wx.showToast({ title: '已填入上次发布的数据', icon: 'success' });
    } catch (e) {}
  },

  pickColor(e) {
    const v = e.detail.value;
    const opts = BREEDS_BY_COLOR[v] || BREEDS_BY_COLOR['红壳'];
    this.setData({
      'form.egg_color': v,
      breedOptions: opts,
      breedIndex: -1,
      breedCustom: '',
      'form.chicken_breed': '',
    });
  },
  // 鸡种 picker change
  pickBreed(e) {
    const idx = Number(e.detail.value);
    const opts = this.data.breedOptions || [];
    const v = opts[idx] || '';
    this.setData({
      breedIndex: idx,
      'form.chicken_breed': v === '其它' ? (this.data.breedCustom || '') : v,
    });
  },
  // 选"其它"时的自定义文本输入
  onBreedCustomInput(e) {
    const v = e.detail.value || '';
    this.setData({ breedCustom: v, 'form.chicken_breed': v });
  },
  pickPackSize(e) {
    const v = e.detail.value;
    if (v === 'other') {
      this.setData({ packSizePreset: 'other', 'form.pack_size': '' });
    } else {
      this.setData({ packSizePreset: v, 'form.pack_size': v });
    }
  },
  pickYolkColor(e) {
    const i = Number(e.detail.value);
    const v = this.data.yolkColorOptions[i] || '';
    this.setData({ yolkColorIndex: i, 'form.yolk_color': v });
  },
  pickDur(e) { this.setData({ 'form.duration_hours': Number(e.detail.value) }); },
  pickProvince(e) { this.setData({ provinceIndex: Number(e.detail.value) }); },

  onInput(e) {
    const key = e.currentTarget.dataset.k;
    if (!key) return;
    this.setData({ ['form.' + key]: e.detail.value });
  },

  // 车型 picker 选择 → 同步 form.truck_type 为车长（米数）
  pickTruckPicker(e) {
    const idx = Number(e.detail.value);
    const t = TRUCK_PRESETS[idx];
    if (!t) return;
    this.setData({
      truckIndex: idx,
      'form.truck_type': String(t.value),
    });
    this._recalcTotalBoxes();
    this.refreshDepositStatus();
  },

  // 单箱净重区间 blur：校验 max - min ≤ 3，符合则按整数斤生成 weightRows
  onWeightBlur() {
    const f = this.data.form;
    const mn = Number(f.weight_min);
    const mx = Number(f.weight_max);
    if (!Number.isFinite(mn) || !Number.isFinite(mx)) return;
    if (mx < mn) {
      this.setData({ weightWarn: '单箱净重最大值不能小于最小值', weightRows: [] });
      return;
    }
    if (mx - mn > 2) {
      this.setData({ weightWarn: `单箱净重区间跨度最多 2（如 20-22），当前 ${mn}-${mx}，请填到 ${mn + 2} 以内`, weightRows: [] });
      return;
    }
    // 按整数斤展开：20-22 → 20 / 21 / 22 三行；保留已填的 boxes / price
    const old = this.data.weightRows || [];
    const rows = [];
    for (let w = Math.floor(mn); w <= Math.floor(mx); w++) {
      const prev = old.find(r => r.weight === w);
      rows.push({ weight: w, boxes: prev ? prev.boxes : '', price: prev ? prev.price : '' });
    }
    this.setData({ weightWarn: '', weightRows: rows });
  },
  onWeightBoxes(e) {
    const i = Number(e.currentTarget.dataset.i);
    const rows = this.data.weightRows.slice();
    if (!rows[i]) return;
    rows[i].boxes = e.detail.value;
    this.setData({ weightRows: rows });
    this._recalcTotalBoxes();
    clearTimeout(this._qtyTimer);
    this._qtyTimer = setTimeout(() => this.refreshDepositStatus(), 300);
  },
  onWeightPrice(e) {
    const i = Number(e.currentTarget.dataset.i);
    const rows = this.data.weightRows.slice();
    if (!rows[i]) return;
    rows[i].price = e.detail.value;
    this.setData({ weightRows: rows });
  },
  _recalcTotalBoxes() {
    const sum = (this.data.weightRows || []).reduce((s, r) => s + (parseInt(r.boxes, 10) || 0), 0);
    const t = TRUCK_PRESETS[this.data.truckIndex];
    const cap = t ? t.boxes + 50 : Infinity;
    this.setData({ totalBoxesNow: sum, totalBoxesOver: sum > cap });
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
  // 长按图片调整顺序：弹菜单 设为封面 / 前移 / 后移
  reorderPhoto(e) {
    const i = Number(e.currentTarget.dataset.i);
    const arr = this.data.photos.slice();
    const n = arr.length;
    if (n < 2) return;
    const items = [];
    const acts = [];
    if (i !== 0) { items.push('⬆ 设为封面（第 1 张）'); acts.push('cover'); }
    if (i > 0)     { items.push('← 前移一位'); acts.push('prev'); }
    if (i < n - 1) { items.push('后移一位 →'); acts.push('next'); }
    wx.showActionSheet({
      itemList: items,
      success: (r) => {
        const a = acts[r.tapIndex];
        let to = i;
        if (a === 'cover') to = 0;
        else if (a === 'prev') to = i - 1;
        else if (a === 'next') to = i + 1;
        if (to === i) return;
        const [moved] = arr.splice(i, 1);
        arr.splice(to, 0, moved);
        this.setData({ photos: arr });
      },
    });
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
    // 必填校验：标题、单箱净重区间、车型、每个净重斤值的箱数 + 起报价
    if (!f.title) return wx.showToast({ title: '请填写标题', icon: 'none' });
    if (this.data.weightWarn) return wx.showToast({ title: this.data.weightWarn, icon: 'none' });
    if (!this.data.weightRows.length) return wx.showToast({ title: '请填写单箱净重区间', icon: 'none' });
    if (!f.truck_type) return wx.showToast({ title: '请选择车型', icon: 'none' });
    const specs = this.data.weightRows.map(r => ({
      weight: Number(r.weight),
      boxes: parseInt(r.boxes, 10) || 0,
      price: Number(r.price) || 0,
    }));
    if (specs.some(s => s.boxes <= 0 || s.price <= 0)) {
      return wx.showToast({ title: '每个净重斤值都要填箱数和价格', icon: 'none' });
    }
    // 总箱数 = 各斤值箱数之和；上限 = 选定车型对应箱数 + 50（允许少量装载冗余）
    const totalBoxes = specs.reduce((s, x) => s + x.boxes, 0);
    const truckPreset = TRUCK_PRESETS[this.data.truckIndex];
    const cap = truckPreset ? truckPreset.boxes + 50 : Infinity;
    if (totalBoxes > cap) {
      return wx.showModal({
        title: '总箱数超过车型上限',
        content: `当前总箱数 ${totalBoxes}，所选车型「${truckPreset.value} m 车 ≈ ${truckPreset.boxes} 箱」最多允许 ${cap} 箱（含 50 箱冗余），请调整各斤值的箱数。`,
        showCancel: false,
        confirmText: '我知道了',
      });
    }
    const displayPrice = specs[0].price;

    // 发布前：确保钱包可用余额够冻结一笔保证金；不够提示去充值
    const ok = this.data.isSupply ? await ensureFarmDeposit() : await ensureDemandDeposit();
    if (!ok) return;
    await this.refreshDepositStatus();

    await requestSubscribe(['order_received']);
    this.setData({ loading: true });
    try {
      const wMin = specs[0].weight;
      const wMax = specs[specs.length - 1].weight;
      const weightSpec = wMin === wMax ? `${wMin} 斤/箱` : `${wMin}-${wMax} 斤/箱`;
      const loc = this.data.pickedLoc || await getLocation();
      const payload = {
        ...f,
        kind: this.data.isSupply ? 'supply' : 'demand',
        province: this.data.provinces[this.data.provinceIndex],
        farm_size: null,                 // 已隐藏
        weight_spec: weightSpec,
        weight_specs: specs,             // 每斤值的 { weight, boxes, price }
        pack_size: f.pack_size !== '' ? Number(f.pack_size) : null,
        yolk_color: f.yolk_color || null,
        yolk_shade: f.yolk_shade || null,
        defect_rate: f.defect_rate !== '' ? Number(f.defect_rate) : null,
        defect_note: f.defect_note || null,
        freshness_days: Number(f.freshness_days) || null,
        quantity: totalBoxes,            // 总箱数
        truck_type: f.truck_type || null,
        start_price: displayPrice,       // 最小斤值价 → 列表展示
        min_increment: Number(f.min_increment),
        duration_hours: Number(f.duration_hours),
        unit_label: '元/箱',
        unit_size: f.unit_size || '车',
        intro_video: this.data.video || null,
        photos: this.data.photos,
        lat: loc ? loc.lat : null,
        lng: loc ? loc.lng : null,
      };
      delete payload.farm_size_wan;
      delete payload.weight_min;
      delete payload.weight_max;
      delete payload.truck_count;
      delete payload.shell_quality;
      // 重新上架：复用原资源（PATCH 重置为 auctioning），不再新建，避免列表重复
      if (this.data.fromId) {
        await api.post('/resources/' + this.data.fromId + '/relist', payload);
      } else {
        await api.post('/resources', payload);
      }
      wx.showToast({ title: this.data.fromId ? '已重新上架' : '发布成功' });
      // 发布 / 重新上架成功后统一回首页（避免重新上架页残留旧资源数据）
      setTimeout(() => wx.switchTab({ url: '/pages/index/index' }), 600);
    } catch (e) {} finally { this.setData({ loading: false }); }
  },
});
