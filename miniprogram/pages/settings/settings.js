const prefs = require('../../utils/prefs');

Page({
  data: {
    theme: 'day',
    fontSize: 'normal',
    pageStyle: '',
    fontOptions: [
      { v: 'normal', label: '标准', px: '30rpx' },
      { v: 'large',  label: '大',   px: '34rpx' },
      { v: 'xlarge', label: '特大', px: '40rpx' },
    ],
    themeOptions: [
      { v: 'day',   label: '白天', icon: '☀️' },
      { v: 'night', label: '夜间', icon: '🌙' },
    ],
  },

  onLoad() {
    this.apply(prefs.getTheme(), prefs.getFont());
  },

  // 更新数据 + 实时预览（本页 page-meta 绑定 pageStyle）
  apply(theme, font) {
    this.setData({ theme, fontSize: font, pageStyle: prefs.pageStyle(theme, font) });
  },

  pickFont(e) {
    const font = e.currentTarget.dataset.v;
    prefs.setFont(font);
    this.apply(this.data.theme, font);
    wx.showToast({ title: '已应用', icon: 'none' });
  },

  pickTheme(e) {
    const theme = e.currentTarget.dataset.v;
    prefs.setTheme(theme);
    this.apply(theme, this.data.fontSize);
    wx.showToast({ title: theme === 'night' ? '已切换夜间' : '已切换白天', icon: 'none' });
  },
});
