Page({
  goAgreement() { wx.navigateTo({ url: '/pages/agreement/agreement' }); },
  goPrivacy()   { wx.navigateTo({ url: '/pages/privacy/privacy' }); },
  goFund()      { wx.navigateTo({ url: '/pages/agreement/agreement?tab=fund' }); },
  callCs() {
    wx.makePhoneCall({ phoneNumber: '4008888888', fail: () => {} });
  },
});
