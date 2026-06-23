const { defaultShare } = require('../../utils/share');
Page({
  onShareAppMessage() { return defaultShare(); },
  onShareTimeline()   { return defaultShare(); },});
