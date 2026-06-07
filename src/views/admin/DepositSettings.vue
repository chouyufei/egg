<template>
  <div>
    <h2 style="margin-top: 0;">💰 保证金金额规则</h2>

    <div class="admin-card">
      <h3 style="margin-top: 0;">档位说明</h3>
      <p class="muted" style="line-height: 1.7;">
        三类保证金都按「车数」分档收取，金额公式：<br/>
        <code>amount = ceil(qty / 档位车数) × 每档金额</code>
      </p>
      <table class="example-table">
        <thead><tr><th>本次车数</th><th>货源保证金</th><th>求购保证金</th><th>竞拍保证金</th></tr></thead>
        <tbody>
          <tr v-for="q in [1,2,3,4,5,6,8,10]" :key="q">
            <td>{{ q }} 车</td>
            <td>¥ {{ calc(q, s.deposit_supply_per_step) }}</td>
            <td>¥ {{ calc(q, s.deposit_demand_per_step) }}</td>
            <td>¥ {{ calc(q, s.deposit_bid_per_step) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="admin-card">
      <h3 style="margin-top: 0;">档位车数</h3>
      <p class="muted" style="margin-top: 0;">每多少车作为一档累加金额（修改后预览表会自动更新）</p>
      <div class="num-row">
        <label>档位车数</label>
        <input type="number" min="1" v-model.number="s.deposit_step_qty" />
        <span class="muted">车 / 档</span>
      </div>
    </div>

    <div class="admin-card">
      <h3 style="margin-top: 0;">每档金额</h3>
      <div class="num-row">
        <label>发布货源</label>
        <input type="number" min="0" step="100" v-model.number="s.deposit_supply_per_step" />
        <span class="muted">元 / 档（养殖场发布货源时缴）</span>
      </div>
      <div class="num-row">
        <label>发布求购</label>
        <input type="number" min="0" step="100" v-model.number="s.deposit_demand_per_step" />
        <span class="muted">元 / 档（采购商发布求购时缴）</span>
      </div>
      <div class="num-row">
        <label>竞拍出价</label>
        <input type="number" min="0" step="100" v-model.number="s.deposit_bid_per_step" />
        <span class="muted">元 / 档（参与某场竞拍 / 应标时缴）</span>
      </div>
    </div>

    <div class="admin-card">
      <button class="btn-primary" @click="save" :disabled="saving">{{ saving ? '保存中…' : '💾 保存' }}</button>
      <span v-if="lastSavedAt" class="muted" style="margin-left: 12px;">最后保存：{{ lastSavedAt }}</span>
      <p class="muted" style="margin-top: 12px; font-size: 13px;">
        💡 修改后立即生效，作用于"修改后"的新发布 / 新出价；已生成的保证金记录不变动。
      </p>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue';
import { showSuccessToast, showFailToast } from 'vant';
import api from '../../api';
import dayjs from 'dayjs';

const s = reactive({
  deposit_step_qty: 2,
  deposit_supply_per_step: 2000,
  deposit_demand_per_step: 1000,
  deposit_bid_per_step: 1000,
});
const saving = ref(false);
const lastSavedAt = ref('');

function calc(qty, perStep) {
  const step = Math.max(1, Number(s.deposit_step_qty) || 1);
  return Math.ceil(qty / step) * Number(perStep || 0);
}

async function load() {
  const r = await api.get('/admin/deposit-settings');
  Object.assign(s, r);
}

async function save() {
  for (const k of ['deposit_step_qty', 'deposit_supply_per_step', 'deposit_demand_per_step', 'deposit_bid_per_step']) {
    if (!(Number(s[k]) > 0)) return showFailToast(k + ' 必须 > 0');
  }
  saving.value = true;
  try {
    await api.put('/admin/deposit-settings', {
      deposit_step_qty: s.deposit_step_qty,
      deposit_supply_per_step: s.deposit_supply_per_step,
      deposit_demand_per_step: s.deposit_demand_per_step,
      deposit_bid_per_step: s.deposit_bid_per_step,
    });
    showSuccessToast('已保存');
    lastSavedAt.value = dayjs().format('HH:mm:ss');
    await load();
  } catch (e) {} finally { saving.value = false; }
}

onMounted(load);
</script>

<style scoped>
.num-row {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 0; border-bottom: 1px solid #f0f0f0;
}
.num-row:last-of-type { border-bottom: none; }
.num-row label { min-width: 120px; font-weight: 600; }
.num-row input {
  width: 140px; padding: 8px;
  border: 1px solid #d0d0d0; border-radius: 4px;
}
.example-table {
  width: 100%; max-width: 560px;
  border-collapse: collapse; margin-top: 12px;
}
.example-table th, .example-table td {
  border: 1px solid #e8e8e8; padding: 8px 12px;
  text-align: center; font-size: 13px;
}
.example-table th { background: #fafafa; font-weight: 600; }
.btn-primary {
  background: #f6b821; color: #fff; border: none;
  padding: 10px 28px; border-radius: 6px; cursor: pointer; font-size: 14px;
}
.btn-primary:disabled { background: #ccc; }
code {
  background: #f5f6f8; padding: 2px 6px; border-radius: 4px;
  font-family: 'SF Mono', Menlo, monospace; font-size: 13px;
}
</style>
