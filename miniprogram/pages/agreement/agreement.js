Page({
  data: { tab: '' },
  onLoad(opt) {
    const tab = opt && opt.tab === 'fund' ? 'fund' : '';
    this.setData({ tab });
    wx.setNavigationBarTitle({ title: tab === 'fund' ? '资金管理说明' : '用户协议' });
  },
});
