const { distanceKm, formatDistance } = require('../../utils/location');

Page({
  data: {
    me: null,           // { lat, lng }
    dst: null,          // { lat, lng, label }
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
    const dLabel = opt.dLabel || '对方';
    const orderId = Number(opt.orderId) || 0;
    if (![mLat, mLng, dLat, dLng].every(Number.isFinite)) {
      return wx.showToast({ title: '参数缺失', icon: 'none' });
    }
    const me = { lat: mLat, lng: mLng };
    const dst = { lat: dLat, lng: dLng, label: dLabel };
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
  backToOrder() {
    if (this.data.orderId) {
      wx.navigateBack();
    }
  },
});
