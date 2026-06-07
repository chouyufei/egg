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

// 养殖场：发布货源前的品质保证金（按数量动态计算）
async function ensureFarmDeposit(qty) {
  let required = 0;
  try {
    const ds = await api.get('/deposits/status', { qty });
    if (ds.supply && ds.supply.paid) return true;
    required = (ds.supply && ds.supply.required) || 0;
  } catch (e) { return false; }

  const ok = await confirmModal({
    title: '请先缴纳品质保证金',
    content: `本次发布 ${qty} 车，需缴 ${required} 元品质保证金（竞拍结束后自动释放）。\n现在去缴纳吗？支付完成后会自动回到本页继续发布。`,
  });
  if (!ok) return false;

  const r = await payAndConfirm({ type: 'farm_quality', qty });
  wx.showToast({
    title: r.ok ? r.msg + '，继续发布' : r.msg,
    icon: r.ok ? 'success' : 'none',
    duration: r.ok ? 1500 : 3000,
  });
  return r.ok;
}

// 采购商：发布求购前的求购保证金（按数量动态计算）
async function ensureDemandDeposit(qty) {
  let required = 0;
  try {
    const ds = await api.get('/deposits/status', { qty });
    if (ds.demand && ds.demand.paid) return true;
    required = (ds.demand && ds.demand.required) || 0;
  } catch (e) { return false; }

  const ok = await confirmModal({
    title: '请先缴纳求购保证金',
    content: `本次发布求购 ${qty} 车，需缴 ${required} 元保证金（无人应标 / 竞拍结束后自动释放）。\n现在去缴纳吗？`,
  });
  if (!ok) return false;

  const r = await payAndConfirm({ type: 'demand_quality', qty });
  wx.showToast({
    title: r.ok ? r.msg + '，继续发布' : r.msg,
    icon: r.ok ? 'success' : 'none',
    duration: r.ok ? 1500 : 3000,
  });
  return r.ok;
}

// 出价方：竞拍保证金（按场缴纳，金额按该场 quantity 动态计算）
async function ensureBuyerBidDeposit(resourceId) {
  let required = 0;
  try {
    const ds = await api.get('/deposits/status', { resource_id: resourceId });
    if (ds.bid && ds.bid.paid) return true;
    required = (ds.bid && ds.bid.required) || 0;
  } catch (e) { return false; }

  const ok = await confirmModal({
    title: '请先缴纳本场竞拍保证金',
    content: `本场需缴 ${required} 元竞拍保证金（成交后抵货款，未中标 / 流拍自动退还）。\n现在去缴纳吗？支付完成后会自动回到本页继续出价。`,
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

module.exports = { ensureFarmDeposit, ensureDemandDeposit, ensureBuyerBidDeposit };
