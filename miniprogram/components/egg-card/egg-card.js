const { formatDistance } = require('../../utils/location');

Component({
  properties: { r: { type: Object, value: {} } },
  data: { cover: '', statusLabel: '', statusCls: '', kindLabel: '', kindCls: '', kindBidLabel: '出价', priceHint: '起 ¥', distText: '', distNear: false },
  observers: {
    r(r) {
      if (!r) return;
      const labels = { auctioning: '竞价中', sold: '已成交', failed: '已流拍', cancelled: '已取消', draft: '草稿' };
      const cls = { auctioning: 'tag', sold: 'tag-g', failed: 'tag-d', cancelled: 'tag-d', draft: 'tag-b' };
      const isSupply = (r.kind || 'supply') === 'supply';
      this.setData({
        cover: (r.photos && r.photos[0]) || 'https://placehold.co/600x300/f6b821/fff?text=Egg',
        statusLabel: labels[r.status] || '',
        statusCls: cls[r.status] || 'tag-d',
        kindLabel: isSupply ? '供' : '求',
        kindCls: isSupply ? 'supply' : 'demand',
        kindBidLabel: isSupply ? '出价' : '报价',
        priceHint: isSupply ? '起 ¥' + r.start_price : '心理价 ¥' + r.start_price,
        distText: r.distance_km != null ? formatDistance(r.distance_km) : '',
        distNear: r.distance_km != null && r.distance_km <= 500,
      });
    },
  },
  methods: {
    tap() { this.triggerEvent('cardtap'); },
  },
});
