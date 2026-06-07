const api = require('./api');

async function payAndConfirm(payload) {
  try {
    const res = await api.post('/pay/create-order', payload);
    if (res.paid) return { ok: true, msg: '已缴纳' };
    if (res.demo) return { ok: true, msg: '已缴纳（演示模式）' };

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

    wx.showLoading({ title: '确认支付结果…', mask: true });
    let confirmed = false;
    for (let i = 0; i < 8; i++) {
      await new Promise(r => setTimeout(r, 1000));
      try {
        const r = await api.get('/pay/check/' + encodeURIComponent(res.out_trade_no));
        if (r.paid) { confirmed = true; break; }
      } catch (e) {}
    }
    wx.hideLoading();
    if (confirmed) return { ok: true, msg: '支付成功' };
    return { ok: false, msg: '支付未到账，请稍后重试' };
  } catch (e) {
    wx.hideLoading();
    if (e && e.errMsg && /cancel/.test(e.errMsg)) {
      return { ok: false, msg: '已取消支付' };
    }
    return { ok: false, msg: '支付失败' };
  }
}

function confirmModal({ title, content }) {
  return new Promise(resolve => {
    wx.showModal({
      title,
      content,
      confirmText: '立即缴纳',
      cancelText: '稍后再说',
      confirmColor: '#e0a40d',
      success: r => resolve(!!r.confirm),
      fail: () => resolve(false),
    });
  });
}

// 养殖场：发布货源前的品质保证金（一次性、通用）
async function ensureFarmDeposit() {
  let required = 0;
  try {
    const ds = await api.get('/deposits/status');
    if (ds.farm && ds.farm.paid) return true;
    required = (ds.farm && ds.farm.required) || 0;
  } catch (e) { return false; }

  const ok = await confirmModal({
    title: '请先缴纳品质保证金',
    content: `发布货源需缴纳 ${required} 元品质保证金（一次性，符合条件可申请退还）。\n现在去缴纳吗？支付完成后会自动回到本页继续发布。`,
  });
  if (!ok) return false;

  const r = await payAndConfirm({ type: 'farm_quality' });
  wx.showToast({
    title: r.ok ? r.msg + '，继续发布' : r.msg,
    icon: r.ok ? 'success' : 'none',
    duration: r.ok ? 1500 : 3000,
  });
  return r.ok;
}

// 出价方：竞拍保证金（按场缴纳，每个货源单独一次）
async function ensureBuyerBidDeposit(resourceId) {
  let required = 0;
  try {
    const ds = await api.get('/deposits/status', { resource_id: resourceId });
    if (ds.buyer && ds.buyer.paid) return true;
    required = (ds.buyer && ds.buyer.required) || 0;
  } catch (e) { return false; }

  const ok = await confirmModal({
    title: '请先缴纳本场竞拍保证金',
    content: `每个货源需单独缴纳 ${required} 元竞拍保证金（成交后抵货款，未中标自动退还）。\n现在去缴纳吗？支付完成后会自动回到本页继续出价。`,
  });
  if (!ok) return false;

  const r = await payAndConfirm({ type: 'buyer_bid', resource_id: resourceId });
  wx.showToast({
    title: r.ok ? r.msg + '，继续出价' : r.msg,
    icon: r.ok ? 'success' : 'none',
    duration: r.ok ? 1500 : 3000,
  });
  return r.ok;
}

module.exports = { ensureFarmDeposit, ensureBuyerBidDeposit };
