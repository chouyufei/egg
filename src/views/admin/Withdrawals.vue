<template>
  <div>
    <h2 style="margin-top: 0;">💸 提现审核</h2>

    <div class="filter-bar">
      <button v-for="opt in tabs" :key="opt.value"
              :class="['tab', { on: status === opt.value }]"
              @click="status = opt.value; load()">
        {{ opt.label }}<span v-if="counts[opt.value]"> ({{ counts[opt.value] }})</span>
      </button>
    </div>

    <div class="warn-box">
      <strong>⚠ 资金实际打款说明</strong><br/>
      · 「直接打款」/「标记已打款」会从用户余额扣款 + 记入流水，
        然后<strong>尝试调用微信「商家转账到零钱」API</strong> 给用户微信打钱<br/>
      · 商家转账 API 需在微信商户后台先开通「商家转账」产品权限 + 完成 KYC，
        否则会返回 demo 模式（仅记账，未真实转账），<strong>请在微信商户后台手工打款后</strong>
        再点击此按钮，避免用户余额已扣但收不到钱
    </div>

    <div class="admin-card">
      <table class="w-table">
        <thead>
          <tr>
            <th>申请时间</th>
            <th>用户</th>
            <th>金额</th>
            <th>方式</th>
            <th>收款信息</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="w in list" :key="w.id">
            <td>{{ fmt(w.applied_at) }}</td>
            <td>
              {{ w.user_name }}<br/>
              <span class="muted">{{ w.user_phone }} · {{ roleLabel(w.user_role) }}</span>
            </td>
            <td class="amount">¥ {{ w.amount }}</td>
            <td>{{ w.method === 'wechat' ? '微信零钱' : '银行卡' }}</td>
            <td>
              <template v-if="w.method === 'bank'">
                {{ w.account_name }} · {{ maskCard(w.account_no) }}<br/>
                <span class="muted">{{ w.bank_name }}</span>
              </template>
              <span v-else class="muted">本人微信号</span>
            </td>
            <td><span :class="['tag', statusCls(w.status)]">{{ statusLabel(w.status) }}</span></td>
            <td>
              <template v-if="w.status === 'pending'">
                <button class="btn-small btn-green" @click="approve(w)">批准</button>
                <button class="btn-small" @click="markPaid(w)">直接打款</button>
                <button class="btn-small btn-danger-sm" @click="reject(w)">拒绝</button>
              </template>
              <template v-else-if="w.status === 'approved'">
                <button class="btn-small btn-green" @click="markPaid(w)">标记已打款</button>
                <button class="btn-small btn-danger-sm" @click="markFailed(w)">标记打款失败 (退款)</button>
              </template>
              <template v-else-if="w.status === 'paid'">
                <button class="btn-small btn-danger-sm" @click="markFailed(w)">标记打款失败 (退款)</button>
                <span v-if="w.out_trade_no" class="muted" style="margin-left: 8px;">流水 {{ w.out_trade_no }}</span>
              </template>
              <span v-else-if="w.failure_reason" class="muted">{{ w.failure_reason }}</span>
              <span v-else-if="w.out_trade_no" class="muted">流水 {{ w.out_trade_no }}</span>
            </td>
          </tr>
          <tr v-if="!list.length">
            <td colspan="7" class="muted text-c" style="padding: 32px;">没有记录</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { showSuccessToast, showFailToast, showConfirmDialog } from 'vant';
import api from '../../api';
import dayjs from 'dayjs';

const status = ref('pending');
const list = ref([]);
const counts = reactive({ pending: 0, approved: 0, paid: 0, rejected: 0 });

const tabs = [
  { value: 'pending', label: '待审核' },
  { value: 'approved', label: '已批准' },
  { value: 'paid', label: '已打款' },
  { value: 'rejected', label: '已拒绝' },
  { value: '', label: '全部' },
];

function fmt(t) { return dayjs(t).format('MM-DD HH:mm'); }
function maskCard(n) { if (!n) return ''; return n.length > 8 ? n.slice(0, 4) + '****' + n.slice(-4) : n; }
function roleLabel(r) { return ({ farm: '养殖场', buyer: '采购商' })[r] || r; }
function statusLabel(s) {
  return ({ pending: '待审核', approved: '已批准', paid: '已打款', rejected: '已拒绝', cancelled: '已取消', failed: '打款失败' })[s] || s;
}
function statusCls(s) {
  return ({ pending: 'tag-y', approved: 'tag-b', paid: 'tag-g', rejected: 'tag-r', cancelled: 'tag-d', failed: 'tag-r' })[s] || '';
}

async function load() {
  const params = status.value ? { status: status.value } : {};
  const { withdrawals } = await api.get('/admin/withdrawals', { params });
  list.value = withdrawals;
  // 同步各状态计数
  await loadCounts();
}
async function loadCounts() {
  for (const s of ['pending', 'approved', 'paid', 'rejected']) {
    const { withdrawals } = await api.get('/admin/withdrawals', { params: { status: s } });
    counts[s] = withdrawals.length;
  }
}

async function approve(w) {
  await showConfirmDialog({ title: '批准提现', message: `确认批准 ¥${w.amount} 提现？批准后请尽快打款。` }).catch(() => null);
  try {
    await api.post(`/admin/withdrawals/${w.id}/approve`);
    showSuccessToast('已批准');
    await load();
  } catch (e) { showFailToast(e?.message); }
}

async function markPaid(w) {
  const useAuto = confirm(
    `准备处理 ${w.user_name} 的 ¥${w.amount} 提现到 ${w.method === 'wechat' ? '微信零钱' : '银行卡'}。\n\n` +
    `点【确定】尝试自动转账（微信商家转账 API，需开通商家转账权限）\n` +
    `点【取消】仅记账（请确认已在微信商户后台手工打款）`
  );
  const mode = useAuto ? 'auto' : 'manual';
  const out_trade_no = prompt('请输入打款流水号（可选，留空由系统生成）') || undefined;
  try {
    const r = await api.post(`/admin/withdrawals/${w.id}/mark-paid`, { out_trade_no, mode });
    showSuccessToast(r.note || '已标记为已打款');
    await load();
  } catch (e) { showFailToast(e?.message); }
}

async function reject(w) {
  const reason = prompt('拒绝原因');
  if (!reason) return;
  try {
    await api.post(`/admin/withdrawals/${w.id}/reject`, { reason });
    showSuccessToast('已拒绝，金额已退回用户余额');
    await load();
  } catch (e) { showFailToast(e?.message); }
}

// 标记打款失败：把金额退回用户钱包 + 发"提现失败，请稍后再试"通知。
// 适用于"已标记打款但银行卡转账实际没成功"（status=paid → failed）和
// "已批准但还没动手就发现商户余额不足"（status=approved → failed）等场景。
async function markFailed(w) {
  const reason = prompt('打款失败原因（用户可见）', '银行卡转账失败，请稍后再试');
  if (!reason) return;
  if (!confirm(`确认将 ¥${w.amount} 提现标记为打款失败？\n金额会退回用户钱包，用户会收到失败通知。`)) return;
  try {
    await api.post(`/admin/withdrawals/${w.id}/mark-failed`, { reason });
    showSuccessToast('已标记失败，金额已退回');
    await load();
  } catch (e) { showFailToast(e?.message); }
}

onMounted(load);
</script>

<style scoped>
.filter-bar { display: flex; gap: 8px; margin-bottom: 12px; }
.tab {
  padding: 8px 16px; border: 1px solid #d0d0d0; background: #fff;
  border-radius: 4px; cursor: pointer; font-size: 13px;
}
.tab.on { background: #f6b821; color: #fff; border-color: #f6b821; }
.w-table { width: 100%; border-collapse: collapse; }
.w-table th, .w-table td {
  border-bottom: 1px solid #f0f0f0; padding: 12px;
  text-align: left; font-size: 13px; vertical-align: top;
}
.w-table th { background: #fafafa; font-weight: 600; }
.amount { font-weight: 700; color: #ee0a24; }
.tag {
  display: inline-block; padding: 2px 10px; border-radius: 12rpx;
  font-size: 12px; border: 1px solid;
}
.tag-y { color: #b78300; background: #fff7e0; border-color: #f6b821; }
.tag-b { color: #1c5bd8; background: #e6f0ff; border-color: #1c5bd8; }
.tag-g { color: #06883b; background: #e7f7eb; border-color: #06883b; }
.tag-r { color: #c61212; background: #ffeaea; border-color: #ee0a24; }
.tag-d { color: #666; background: #f0f0f0; border-color: #ccc; }
.muted { color: #8a8d93; font-size: 12px; }
.btn-small {
  padding: 6px 12px; border: 1px solid #d0d0d0;
  background: #fff; border-radius: 4px; cursor: pointer;
  font-size: 12px; margin-right: 4px;
}
.btn-green { color: #06883b; border-color: #06883b; }
.btn-danger-sm { color: #ee0a24; border-color: #ee0a24; }

.warn-box {
  background: #fff7e0;
  border: 1px solid #f6b821;
  color: #8a6b15;
  padding: 12px 16px;
  border-radius: 6px;
  font-size: 13px;
  line-height: 1.8;
  margin-bottom: 12px;
}
</style>
