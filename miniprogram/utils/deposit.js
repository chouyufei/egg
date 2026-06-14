const api = require('./api');

function confirmModal({ title, content, confirmText = '立即缴纳', cancelText = '稍后再说' }) {
  return new Promise(resolve => {
    wx.showModal({
      title, content, confirmText, cancelText,
      confirmColor: '#e0a40d',
      success: r => resolve(!!r.confirm),
      fail: () => resolve(false),
    });
  });
}

// 进行钱包充值（演示模式秒到账；正式微信支付走 requestPayment + 轮询）
async function rechargeWallet(amount) {
  try {
    const res = await api.post('/pay/recharge', { amount });
    if (res.demo) return { ok: true, msg: `已充值 ${amount} 元（演示模式）` };
    await new Promise((resolve, reject) => {
      wx.requestPayment({
        timeStamp: res.timeStamp,
        nonceStr: res.nonceStr,
        package: res.package,
        signType: res.signType || 'RSA',
        paySign: res.paySign,
        success: resolve,
        fail: reject,
      });
    });
    wx.showLoading({ title: '确认充值结果…', mask: true });
    let confirmed = false;
    for (let i = 0; i < 8; i++) {
      await new Promise(r => setTimeout(r, 1000));
      try {
        const r = await api.get('/pay/check/' + encodeURIComponent(res.out_trade_no));
        if (r.paid) { confirmed = true; break; }
      } catch (e) {}
    }
    wx.hideLoading();
    if (confirmed) return { ok: true, msg: `充值成功 ${amount} 元` };
    return { ok: false, msg: '充值未到账，请稍后重试' };
  } catch (e) {
    wx.hideLoading();
    if (e && e.errMsg && /cancel/.test(e.errMsg)) return { ok: false, msg: '已取消充值' };
    return { ok: false, msg: e && e.message || '充值失败' };
  }
}

// 通用：本次操作需冻结一笔保证金，先查钱包余额够不够。
// 不够 → 弹"去充值"；够 → 直接返回 true（实际冻结在 /resources POST 或 /bids 时由后端原子完成）
async function ensureWalletForDeposit(actionLabel) {
  let required = 0, available = 0;
  try {
    const ds = await api.get('/deposits/status');
    required = ds.required;
    available = ds.balance && ds.balance.available || 0;
  } catch (e) { return false; }

  if (available >= required) return true;

  const short = (required - available).toFixed(2);
  const ok = await confirmModal({
    title: `${actionLabel}需冻结 ${required} 元保证金`,
    content: `当前钱包可用余额 ${available.toFixed(2)} 元，还差 ${short} 元。\n是否立即充值 ${short} 元到钱包？充值后会自动回到本页继续${actionLabel}。`,
    confirmText: '去充值',
  });
  if (!ok) return false;

  const r = await rechargeWallet(Number(short));
  wx.showToast({
    title: r.ok ? r.msg : r.msg,
    icon: r.ok ? 'success' : 'none',
    duration: r.ok ? 1500 : 3000,
  });
  return r.ok;
}

// 三个原 API 保留对外兼容名字，统一走钱包余额检查
const ensureFarmDeposit   = () => ensureWalletForDeposit('发布货源');
const ensureDemandDeposit = () => ensureWalletForDeposit('发布求购');
const ensureBuyerBidDeposit = () => ensureWalletForDeposit('参与竞拍');

module.exports = { rechargeWallet, ensureWalletForDeposit, ensureFarmDeposit, ensureDemandDeposit, ensureBuyerBidDeposit };
