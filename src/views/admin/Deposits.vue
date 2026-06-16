<template>
  <div>
    <h2 style="margin-top: 0;">💰 保证金管理</h2>
    <div class="admin-card">
      <table class="admin-tbl">
        <thead><tr><th>ID</th><th>用户</th><th>角色</th><th>类型</th><th>金额</th><th>状态</th><th>缴纳时间</th><th>备注</th><th>操作</th></tr></thead>
        <tbody>
          <tr v-for="d in list" :key="d.id">
            <td>{{ d.id }}</td>
            <td>{{ d.user_name }}</td>
            <td>{{ roleLabel(d.user_role) }}</td>
            <td>{{ d.type === 'farm_quality' ? '品质保证金' : '竞价保证金' }}</td>
            <td>¥{{ d.amount }}</td>
            <td><span class="pill" :class="cls(d.status)">{{ label(d.status) }}</span></td>
            <td>{{ formatTime(d.paid_at) }}</td>
            <td>{{ d.note || '-' }}</td>
            <td>
              <button v-if="d.status === 'available' || d.status === 'frozen'" @click="deduct(d)">扣款</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import api from '../../api';
import dayjs from 'dayjs';

const list = ref([]);
function roleLabel(r) { return ({ farm: '养殖场', buyer: '采购商' }[r] || '-'); }
function label(s) { return ({ available: '可用', frozen: '冻结', released: '已退还', deducted: '已扣除' }[s]); }
function cls(s) { return ({ available: 'pill-g', frozen: 'pill-y', released: 'pill-d', deducted: 'pill-r' }[s]); }
function formatTime(t) { return dayjs(t).format('MM-DD HH:mm'); }

async function load() {
  const { deposits } = await api.get('/admin/deposits');
  list.value = deposits;
}
async function deduct(d) {
  const reason = prompt('扣款原因？', '货不对板');
  if (reason === null) return;
  await api.post(`/admin/deposits/${d.id}/deduct`, { reason });
  load();
}
onMounted(load);
</script>
