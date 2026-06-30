// 游客模式辅助：未登录也能浏览，触发受限操作（发布/报价/下单/钱包等）时再引导登录
function isLoggedIn() {
  const app = getApp();
  return !!((app && app.globalData && app.globalData.token) || wx.getStorageSync('token'));
}

function goLogin() {
  wx.navigateTo({ url: '/pages/login/login' });
}

// 受限操作前调用：已登录返回 true；未登录弹框引导登录并返回 false
function requireLogin(actionText) {
  if (isLoggedIn()) return true;
  wx.showModal({
    title: '登录后即可' + (actionText || '使用'),
    content: '游客可自由浏览货源与求购，登录后才能发布、报价、下单。',
    confirmText: '去登录',
    cancelText: '再逛逛',
    success: (r) => { if (r.confirm) goLogin(); },
  });
  return false;
}

module.exports = { isLoggedIn, goLogin, requireLogin };
