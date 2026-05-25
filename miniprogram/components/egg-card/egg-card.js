Component({
  properties: { r: { type: Object, value: {} } },
  data: { cover: '', statusLabel: '', statusCls: '' },
  observers: {
    r(r) {
      if (!r) return;
      const labels = { auctioning: '竞拍中', sold: '已成交', failed: '已流拍', cancelled: '已取消', draft: '草稿' };
      const cls = { auctioning: 'tag', sold: 'tag-g', failed: 'tag-d', cancelled: 'tag-d', draft: 'tag-b' };
      this.setData({
        cover: (r.photos && r.photos[0]) || 'https://placehold.co/600x300/f6b821/fff?text=Egg',
        statusLabel: labels[r.status] || '',
        statusCls: cls[r.status] || 'tag-d',
      });
    },
  },
  methods: {
    tap() { this.triggerEvent('tap'); },
  },
});
