const { defaultShare } = require('../../utils/share');
const CATEGORIES = [
  { value: '',     icon: '🥚', label: '全部',   tip: '不限蛋色' },
  { value: '粉壳', icon: '🤎', label: '粉壳蛋', tip: '海兰系列 / 罗曼系列 / 粉六 / 大午金风' },
  { value: '红壳', icon: '🔴', label: '红壳蛋', tip: '海兰褐 / 京红 / 农大三号' },
  { value: '土鸡', icon: '🟡', label: '土鸡蛋', tip: '土麻 / 新阳黑 / 白凤 / 本地散养' },
  { value: '乌鸡', icon: '⚫', label: '乌鸡蛋', tip: '五黑 / 乌鸡系列' },
  { value: '白壳', icon: '⚪', label: '白壳蛋', tip: '京白 / 海兰白 / 神丹六号 / 上海梨园' },
];

Page({
  onShareAppMessage() { return defaultShare(); },
  onShareTimeline()   { return defaultShare(); },
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
