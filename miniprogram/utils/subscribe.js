const api = require('./api');

let _templates = null;

async function loadTemplates() {
  if (_templates) return _templates;
  try {
    const r = await api.get('/auth/notice-templates');
    _templates = r.wechat?.templates || {};
  } catch (e) { _templates = {}; }
  return _templates;
}

// 请求微信订阅消息授权。keys 例如 ['auction_won', 'auction_lost']
// 静默失败：用户拒绝或后端未配模板都不影响主流程
function requestSubscribe(keys) {
  return new Promise(async (resolve) => {
    const tpl = await loadTemplates();
    const ids = keys.map(k => tpl[k]).filter(Boolean);
    if (!ids.length) return resolve({ ok: false, reason: 'no_template' });
    wx.requestSubscribeMessage({
      tmplIds: ids,
      success: (res) => resolve({ ok: true, res }),
      fail: (err) => resolve({ ok: false, err }),
    });
  });
}

module.exports = { requestSubscribe, loadTemplates };
