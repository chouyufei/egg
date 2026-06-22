const { distanceKm, formatDistance, chooseLocation } = require('../../utils/location');

function safeDecode(s) {
  try { return decodeURIComponent(s || ''); } catch (e) { return s || ''; }
}

Page({
  data: {
    me: null,           // { lat, lng, name, address }
    dst: null,          // { lat, lng, label, address }
    orderId: 0,
    markers: [],
    polyline: [],
    includePoints: [],
    centerLat: 39.91,
    centerLng: 116.4,
    distText: '',
  },
  onLoad(opt) {
    const mLat = Number(opt.mLat);
    const mLng = Number(opt.mLng);
    const dLat = Number(opt.dLat);
    const dLng = Number(opt.dLng);
    const dLabel = safeDecode(opt.dLabel) || '货源地';
    const dAddr  = safeDecode(opt.dAddr);
    const orderId = Number(opt.orderId) || 0;
    if (![mLat, mLng, dLat, dLng].every(Number.isFinite)) {
      return wx.showToast({ title: '参数缺失', icon: 'none' });
    }

    // 「我的位置」尽量用自选位置 storage 里的 name/address；否则就显示「我的位置」
    let myName = '我的位置';
    let myAddr = '';
    try {
      const custom = wx.getStorageSync('customLoc');
      if (custom && Math.abs(custom.lat - mLat) < 1e-4 && Math.abs(custom.lng - mLng) < 1e-4) {
        myName = custom.name || myName;
        myAddr = custom.address || '';
      }
    } catch (e) {}

    const me = { lat: mLat, lng: mLng, name: myName, address: myAddr };
    const dst = { lat: dLat, lng: dLng, label: dLabel, address: dAddr };
    const km = distanceKm(mLat, mLng, dLat, dLng);

    this.setData({
      me, dst, orderId,
      distText: formatDistance(km),
      centerLat: (mLat + dLat) / 2,
      centerLng: (mLng + dLng) / 2,
      includePoints: [
        { latitude: mLat, longitude: mLng },
        { latitude: dLat, longitude: dLng },
      ],
      markers: [
        {
          id: 1, latitude: mLat, longitude: mLng,
          iconPath: '', width: 40, height: 40,
          callout: { content: '我的位置', display: 'ALWAYS', color: '#fff', bgColor: '#1c5bd8', padding: 6, borderRadius: 8, fontSize: 12, textAlign: 'center' },
        },
        {
          id: 2, latitude: dLat, longitude: dLng,
          iconPath: '', width: 40, height: 40,
          callout: { content: dLabel, display: 'ALWAYS', color: '#fff', bgColor: '#ee0a24', padding: 6, borderRadius: 8, fontSize: 12, textAlign: 'center' },
        },
      ],
      polyline: [{
        points: [
          { latitude: mLat, longitude: mLng },
          { latitude: dLat, longitude: dLng },
        ],
        color: '#f6b821',
        width: 6,
        dottedLine: true,
        arrowLine: true,
      }],
    });
  },
  // 调起微信内置地图，方便用户继续导航 / 拷贝地址 / 调起第三方导航
  openNativeToDst() {
    if (!this.data.dst) return;
    wx.openLocation({
      latitude: this.data.dst.lat,
      longitude: this.data.dst.lng,
      name: this.data.dst.label,
      scale: 14,
    });
  },
  openNativeToMe() {
    if (!this.data.me) return;
    wx.openLocation({
      latitude: this.data.me.lat,
      longitude: this.data.me.lng,
      name: '我的位置',
      scale: 14,
    });
  },
  // 用户在路线页直接换"我的位置"，重新计算距离 / 路径
  async pickMyLoc() {
    const loc = await chooseLocation();
    if (!loc) return;
    const dst = this.data.dst;
    if (!dst) return;
    const me = { lat: loc.lat, lng: loc.lng, name: loc.name || '我的位置', address: loc.address || '' };
    const km = distanceKm(me.lat, me.lng, dst.lat, dst.lng);
    this.setData({
      me,
      distText: formatDistance(km),
      centerLat: (me.lat + dst.lat) / 2,
      centerLng: (me.lng + dst.lng) / 2,
      includePoints: [
        { latitude: me.lat, longitude: me.lng },
        { latitude: dst.lat, longitude: dst.lng },
      ],
      markers: [
        {
          id: 1, latitude: me.lat, longitude: me.lng,
          iconPath: '', width: 40, height: 40,
          callout: { content: me.name, display: 'ALWAYS', color: '#fff', bgColor: '#1c5bd8', padding: 6, borderRadius: 8, fontSize: 12, textAlign: 'center' },
        },
        {
          id: 2, latitude: dst.lat, longitude: dst.lng,
          iconPath: '', width: 40, height: 40,
          callout: { content: dst.label, display: 'ALWAYS', color: '#fff', bgColor: '#ee0a24', padding: 6, borderRadius: 8, fontSize: 12, textAlign: 'center' },
        },
      ],
      polyline: [{
        points: [
          { latitude: me.lat, longitude: me.lng },
          { latitude: dst.lat, longitude: dst.lng },
        ],
        color: '#f6b821',
        width: 6,
        dottedLine: true,
        arrowLine: true,
      }],
    });
  },
  backToOrder() {
    if (this.data.orderId) {
      wx.navigateBack();
    }
  },
});
