function pad(n) { return n < 10 ? '0' + n : '' + n; }

function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return (d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
}

function formatDateTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
    ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
}

function statusLabel(s) {
  return ({
    auctioning: '竞拍中', sold: '已成交', failed: '已流拍', cancelled: '已取消', draft: '草稿',
    pending_group: '待拉群', communicating: '沟通中', completed: '已完成', disputed: '纠纷中',
    available: '可用', frozen: '冻结', released: '已退还', deducted: '已扣除',
    pending: '审核中', approved: '已通过', rejected: '未通过', none: '未提交',
  }[s] || s);
}

function statusTag(s) {
  return ({
    auctioning: 'tag', sold: 'tag-g', failed: 'tag-d', cancelled: 'tag-d', draft: 'tag-b',
    pending_group: 'tag', communicating: 'tag-b', completed: 'tag-g', disputed: 'tag-r',
    available: 'tag-g', frozen: 'tag', released: 'tag-d', deducted: 'tag-r',
    pending: 'tag', approved: 'tag-g', rejected: 'tag-r', none: 'tag-d',
  }[s] || 'tag-d');
}

module.exports = { pad, formatTime, formatDateTime, statusLabel, statusTag };
