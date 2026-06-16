<template>
  <div>
    <h2 style="margin-top: 0;">🛒 资源监管</h2>
    <div class="admin-card">
      <table class="admin-tbl">
        <thead><tr><th>ID</th><th>标题</th><th>养殖场</th><th>地区</th><th>起拍/当前</th><th>状态</th><th>出价数</th><th>截止</th><th>操作</th></tr></thead>
        <tbody>
          <tr v-for="r in list" :key="r.id">
            <td>{{ r.id }}</td>
            <td>{{ r.title }}</td>
            <td>{{ r.farm_name }}</td>
            <td>{{ r.region || '-' }}</td>
            <td>¥{{ r.start_price }} → <b>¥{{ r.current_price }}</b></td>
            <td><span class="pill" :class="cls(r.status)">{{ label(r.status) }}</span></td>
            <td>{{ bidsOf(r) }}</td>
            <td>{{ formatTime(r.end_at) }}</td>
            <td>
              <button v-if="r.status === 'auctioning' || r.status === 'draft'" @click="takedown(r)">下架</button>
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
function label(s) { return ({ auctioning: '竞价中', sold: '已成交', failed: '已流拍', cancelled: '已取消', draft: '草稿' }[s]); }
function cls(s) { return ({ auctioning: 'pill-y', sold: 'pill-g', failed: 'pill-d', cancelled: 'pill-d', draft: 'pill-b' }[s]); }
function formatTime(t) { return dayjs(t).format('MM-DD HH:mm'); }
function bidsOf(r) { return r.bid_count ?? '-'; }

async function load() {
  const { resources } = await api.get('/admin/resources');
  list.value = resources;
}
async function takedown(r) {
  const reason = prompt('下架原因？', '内容违规');
  if (reason === null) return;
  await api.post(`/admin/resources/${r.id}/takedown`, { reason });
  load();
}
onMounted(load);
</script>
