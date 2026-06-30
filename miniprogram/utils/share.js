// 通用分享配置：给所有页面都开放"转发 / 朋友圈"入口，统一回首页
// Page 中只需 onShareAppMessage / onShareTimeline 各 return defaultShare()
// 即可让微信"…"菜单里的「转发」「分享到朋友圈」点亮
// 分享卡片统一使用的品牌 logo（黑底橙色凤伯乐）
const SHARE_LOGO = '/images/share-logo.png';

function defaultShare() {
  return {
    title: '凤伯乐 · 让你的蛋自己定价',
    path: '/pages/index/index',
    imageUrl: SHARE_LOGO,
  };
}

module.exports = { defaultShare, SHARE_LOGO };
