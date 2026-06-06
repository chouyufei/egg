const CATEGORIES = [
  { value: '',     icon: '🥚', label: '全部',   tip: '不限蛋色' },
  { value: '红壳', icon: '🔴', label: '红壳蛋', tip: '海兰褐 / 罗曼' },
  { value: '粉壳', icon: '🤎', label: '粉壳蛋', tip: '罗曼粉 / 海赛克斯' },
  { value: '杂色', icon: '🟡', label: '土鸡蛋', tip: '本地笨鸡·散养' },
];

Page({
  data: { categories: CATEGORIES, activeColor: '' },
  onLoad(opts) {
    this.setData({ activeColor: opts.current || '' });
  },
  pick(e) {
    const v = e.currentTarget.dataset.v;
    wx.setStorageSync('selectedColor', v);
    wx.navigateBack();
  },
});
