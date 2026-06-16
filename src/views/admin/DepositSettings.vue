<template>
  <div>
    <h2 style="margin-top: 0;">💰 保证金 / 服务费规则</h2>

    <div class="admin-card explain">
      <h3 style="margin-top: 0;">机制说明</h3>
      <ul style="margin: 0; padding-left: 24px; line-height: 1.9;">
        <li>用户钱包通过<strong>充值</strong>注入资金</li>
        <li>三类操作（<strong>发布货源</strong> / <strong>发起求购</strong> / <strong>参与报价</strong>）
          每次从钱包<strong>统一冻结</strong>同一笔保证金</li>
        <li>订单完成（采购方确认收货）→ 平台从买卖双方各扣一笔<strong>服务费</strong>，
          剩余<strong>自动解冻</strong>回可用余额</li>
        <li>未成交 / 取消 → 全部解冻回可用</li>
      </ul>
    </div>

    <div class="admin-card">
      <h3 style="margin-top: 0;">金额配置</h3>
      <div class="num-row">
        <label>保证金额度</label>
        <input type="number" min="0" step="100" v-model.number="s.deposit_amount" />
        <span class="muted">元 / 次（发布货源 / 发起求购 / 参与报价 统一冻结）</span>
      </div>
      <div class="num-row">
        <label>平台服务费</label>
        <input type="number" min="0" step="10" v-model.number="s.service_fee_amount" />
        <span class="muted">元 / 笔（订单完成时从每方冻结里扣除）</span>
      </div>

      <div class="preview-box">
        <div class="preview-title">📊 单笔订单资金示意（基于当前配置）</div>
        <table class="preview-table">
          <thead><tr><th></th><th>买方</th><th>卖方</th></tr></thead>
          <tbody>
            <tr><td>下单 / 发布时冻结</td><td>¥ {{ s.deposit_amount }}</td><td>¥ {{ s.deposit_amount }}</td></tr>
            <tr><td>订单完成扣服务费</td><td>- ¥ {{ s.service_fee_amount }}</td><td>- ¥ {{ s.service_fee_amount }}</td></tr>
            <tr class="hl"><td>解冻回可用</td><td>¥ {{ Math.max(0, s.deposit_amount - s.service_fee_amount) }}</td><td>¥ {{ Math.max(0, s.deposit_amount - s.service_fee_amount) }}</td></tr>
            <tr class="hl-rev"><td>平台单笔收入</td><td colspan="2" style="text-align:center;">¥ {{ s.service_fee_amount * 2 }}（买卖各 {{ s.service_fee_amount }}）</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="admin-card">
      <button class="btn-primary" @click="save" :disabled="saving">{{ saving ? '保存中…' : '💾 保存' }}</button>
      <span v-if="lastSavedAt" class="muted" style="margin-left: 12px;">最后保存：{{ lastSavedAt }}</span>
      <p class="muted" style="margin-top: 12px; font-size: 13px;">
        💡 修改后立即生效，作用于"修改后"的新发布 / 新报价；已经冻结的资金沿用原金额结算。
      </p>
    </div>

    <div class="admin-card">
      <h3 style="margin-top: 0;">🔁 历史保证金对账</h3>
      <p class="muted" style="margin-top: 0; line-height: 1.7;">
        修复钱包系统上线"之前"已经释放、但未入账到用户钱包的历史保证金。
        会扫描所有 <code>available</code> 未绑定记录 + 绑定到已结束资源（未成交/取消/成交）
        但仍 <code>frozen</code> 的记录，统一补释放 + 入账户余额。<br/>
        <strong>幂等</strong>：已入账的不会重复。可在任何时候安全运行。
      </p>
      <button class="btn-secondary" @click="reconcile" :disabled="reconciling">
        {{ reconciling ? '对账中…' : '一键重新对账' }}
      </button>
      <span v-if="lastReconcileAt" class="muted" style="margin-left: 12px;">最后对账：{{ lastReconcileAt }}</span>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue';
import { showSuccessToast, showFailToast } from 'vant';
import api from '../../api';
import dayjs from 'dayjs';

const s = reactive({
  deposit_amount: 1000,
  service_fee_amount: 50,
});
const saving = ref(false);
const lastSavedAt = ref('');
const reconciling = ref(false);
const lastReconcileAt = ref('');

async function reconcile() {
  reconciling.value = true;
  try {
    await api.post('/admin/reconcile-deposits');
    showSuccessToast('对账完成，钱包余额已更新');
    lastReconcileAt.value = dayjs().format('HH:mm:ss');
  } catch (e) { showFailToast(e?.message); } finally { reconciling.value = false; }
}

async function load() {
  const r = await api.get('/admin/deposit-settings');
  s.deposit_amount = Number(r.deposit_amount) || 1000;
  s.service_fee_amount = Number(r.service_fee_amount) || 0;
}

async function save() {
  if (!(Number(s.deposit_amount) >= 0)) return showFailToast('保证金额度需为非负数');
  if (!(Number(s.service_fee_amount) >= 0)) return showFailToast('服务费需为非负数');
  if (Number(s.service_fee_amount) > Number(s.deposit_amount)) {
    return showFailToast('服务费不能大于保证金额度');
  }
  saving.value = true;
  try {
    await api.put('/admin/deposit-settings', {
      deposit_amount: s.deposit_amount,
      service_fee_amount: s.service_fee_amount,
    });
    showSuccessToast('已保存');
    lastSavedAt.value = dayjs().format('HH:mm:ss');
    await load();
  } catch (e) { showFailToast(e?.message); } finally { saving.value = false; }
}

onMounted(load);
</script>

<style scoped>
.explain { background: #fff7e0; border: 1px solid #f6b821; }
.explain li { color: #5a4810; }
.num-row {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 0; border-bottom: 1px solid #f0f0f0;
}
.num-row:last-of-type { border-bottom: none; }
.num-row label { min-width: 130px; font-weight: 600; }
.num-row input {
  width: 160px; padding: 10px; font-size: 15px;
  border: 1px solid #d0d0d0; border-radius: 4px;
}
.preview-box {
  background: #fafafa; border-radius: 6px;
  padding: 14px; margin-top: 16px;
}
.preview-title { font-weight: 600; margin-bottom: 10px; color: #1d1d1f; }
.preview-table {
  width: 100%; max-width: 480px;
  border-collapse: collapse;
}
.preview-table th, .preview-table td {
  border: 1px solid #e8e8e8; padding: 8px 12px;
  text-align: center; font-size: 13px;
}
.preview-table th { background: #f0f0f0; font-weight: 600; }
.preview-table .hl td { background: #e7f7eb; color: #06883b; font-weight: 600; }
.preview-table .hl-rev td { background: #fff7e0; color: #b78300; font-weight: 600; }
.btn-primary {
  background: #f6b821; color: #fff; border: none;
  padding: 10px 28px; border-radius: 6px; cursor: pointer; font-size: 14px;
}
.btn-primary:disabled { background: #ccc; }
.btn-secondary {
  background: #fff; color: #f6b821; border: 2px solid #f6b821;
  padding: 8px 24px; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 600;
}
.btn-secondary:disabled { background: #f5f5f5; color: #aaa; border-color: #ccc; }
code {
  background: #f5f6f8; padding: 2px 6px; border-radius: 4px;
  font-family: 'SF Mono', Menlo, monospace; font-size: 13px;
}
</style>
