<template>
  <div>
    <h2 style="margin-top: 0;">⚖️ 纠纷仲裁</h2>
    <div class="admin-card">
      <table class="admin-tbl">
        <thead><tr><th>ID</th><th>订单</th><th>发起方</th><th>类型</th><th>描述</th><th>状态</th><th>时间</th><th>操作</th></tr></thead>
        <tbody>
          <tr v-for="d in list" :key="d.id">
            <td>{{ d.id }}</td>
            <td>#{{ d.order_id }} ({{ d.farm_name }} → {{ d.buyer_name }})<br/><span class="muted">¥{{ d.final_price }}</span></td>
            <td>{{ d.raised_by === d.farm_id ? '养殖场' : '采购商' }}</td>
            <td>{{ d.type }}</td>
            <td>{{ d.description }}</td>
            <td><span class="pill" :class="cls(d.status)">{{ label(d.status) }}</span></td>
            <td>{{ formatTime(d.created_at) }}</td>
            <td>
              <template v-if="d.status === 'open'">
                <button @click="resolve(d, 'buyer')">支持采购商</button>
                <button @click="resolve(d, 'farm')">支持养殖场</button>
              </template>
              <span v-else class="muted">{{ d.resolution }}</span>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="!list.length" class="empty">暂无纠纷</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import api from '../../api';
import dayjs from 'dayjs';

const list = ref([]);
function label(s) { return ({ open: '处理中', resolved: '已解决', rejected: '已驳回' }[s]); }
function cls(s) { return ({ open: 'pill-y', resolved: 'pill-g', rejected: 'pill-d' }[s]); }
function formatTime(t) { return dayjs(t).format('MM-DD HH:mm'); }

async function load() {
  const { disputes } = await api.get('/admin/disputes');
  list.value = disputes;
}
async function resolve(d, side) {
  const note = prompt(`仲裁结果说明（支持${side === 'buyer' ? '采购商，扣养殖场保证金' : '养殖场，正常释放'}）`,
    side === 'buyer' ? '货品不符合描述，扣除养殖场保证金 200 元' : '采购商反馈不实，正常释放');
  if (note === null) return;
  await api.post(`/admin/disputes/${d.id}/resolve`, { resolution: note, side });
  load();
}
onMounted(load);
</script>
