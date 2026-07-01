// 界面偏好：字体大小 + 主题（白天/夜间），持久化到本地存储。
// 通过给页面 <page-meta page-style> 注入一组 CSS 变量实现全局生效，
// 页面里的通用样式（app.wxss 用 var() / calc(*var(--fs-scale)) 引用这些变量）。
const KEY_THEME = 'pref_theme';       // 'day' | 'night'
const KEY_FONT  = 'pref_font';        // 'normal' | 'large' | 'xlarge'

function getTheme() {
  const app = getApp();
  return (app && app.globalData && app.globalData.theme) || wx.getStorageSync(KEY_THEME) || 'day';
}
function getFont() {
  const app = getApp();
  return (app && app.globalData && app.globalData.fontSize) || wx.getStorageSync(KEY_FONT) || 'normal';
}
function setTheme(t) {
  wx.setStorageSync(KEY_THEME, t);
  const app = getApp(); if (app && app.globalData) app.globalData.theme = t;
}
function setFont(f) {
  wx.setStorageSync(KEY_FONT, f);
  const app = getApp(); if (app && app.globalData) app.globalData.fontSize = f;
}

function fontScale(f) {
  return f === 'xlarge' ? 1.3 : f === 'large' ? 1.15 : 1;
}

// 生成注入到 <page-meta page-style> 的 CSS 变量串
function pageStyle(theme, font) {
  const t = theme || getTheme();
  const f = font || getFont();
  let s = '--fs-scale:' + fontScale(f) + ';';
  if (t === 'night') {
    s += '--bg:#0e0f12;--fg:#e9e9ee;--card:#1b1c20;--muted:#9aa0a6;--border:#2a2b30;'
       + 'background:#0e0f12;color:#e9e9ee;';
  }
  return s;
}

module.exports = { getTheme, getFont, setTheme, setFont, pageStyle };
