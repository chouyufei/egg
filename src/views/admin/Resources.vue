<template>
  <div>
    <h2 style="margin-top: 0;">🛒 资源监管</h2>

    <div class="admin-card" style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
      <span class="muted">类型：</span>
      <button v-for="k in kinds" :key="k.v" @click="kind = k.v; load()"
              :style="kind === k.v ? 'background: #f6b821; color: #fff;' : ''">{{ k.label }}</button>
      <span class="muted" style="margin-left: 12px;">状态：</span>
      <button v-for="s in statuses" :key="s.v" @click="status = s.v; load()"
              :style="status === s.v ? 'background: #f6b821; color: #fff;' : ''">{{ s.label }}</button>
      <span class="muted" style="margin-left: auto;">共 {{ list.length }} 条</span>
    </div>

    <div v-if="!list.length" class="admin-card" style="text-align: center; padding: 50px 0; color: #8a8d93;">
      暂无记录
    </div>

    <div v-else class="admin-card">
      <table class="admin-tbl">
        <thead><tr>
          <th>ID</th><th>类型</th><th>标题</th><th>发布人</th><th>地区</th>
          <th>起报/当前</th><th>状态</th><th>报价数</th><th>截止</th><th>操作</th>
        </tr></thead>
        <tbody>
          <tr v-for="r in list" :key="r.id">
            <td>{{ r.id }}</td>
            <td><span class="pill" :class="r.kind === 'demand' ? 'pill-b' : 'pill-y'">{{ kindLabel(r.kind) }}</span></td>
            <td>{{ r.title }}</td>
            <td>{{ r.farm_name || '-' }}<br><span class="muted" style="font-size: 12px;">{{ r.farm_phone || '' }}</span></td>
            <td>{{ r.region || '-' }}</td>
            <td>¥{{ r.start_price }} → <b>¥{{ r.current_price }}</b></td>
            <td><span class="pill" :class="cls(r.status)">{{ label(r.status) }}</span></td>
            <td>{{ bidsOf(r) }}</td>
            <td>{{ formatTime(r.end_at) }}</td>
            <td style="white-space: nowrap;">
              <button @click="editRes(r)">编辑</button>
              <button v-if="r.status === 'auctioning' || r.status === 'draft'" @click="takedown(r)">下架</button>
              <button class="danger" @click="delRes(r)">删除</button>
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

const kinds = [
  { v: '',        label: '全部' },
  { v: 'supply',  label: '货源' },
  { v: 'demand',  label: '采购需求' },
];
const statuses = [
  { v: '',           label: '全部' },
  { v: 'auctioning', label: '报价中' },
  { v: 'sold',       label: '已成交' },
  { v: 'failed',     label: '未成交' },
  { v: 'cancelled',  label: '已取消' },
];

const kind = ref('');
const status = ref('');
const list = ref([]);

function kindLabel(k) { return (k === 'demand' ? '采购需求' : '货源'); }
function label(s) { return ({ auctioning: '报价中', sold: '已成交', failed: '未成交', cancelled: '已取消', draft: '草稿' }[s] || s); }
function cls(s) { return ({ auctioning: 'pill-y', sold: 'pill-g', failed: 'pill-d', cancelled: 'pill-d', draft: 'pill-b' }[s] || 'pill-d'); }
function formatTime(t) { return t ? dayjs(t).format('MM-DD HH:mm') : '-'; }
function bidsOf(r) { return r.bid_count ?? '-'; }

async function load() {
  const params = {};
  if (kind.value) params.kind = kind.value;
  if (status.value) params.status = status.value;
  const { resources } = await api.get('/admin/resources', { params });
  list.value = resources;
}
async function takedown(r) {
  const reason = prompt('下架原因？', '内容违规');
  if (reason === null) return;
  await api.post(`/admin/resources/${r.id}/takedown`, { reason });
  load();
}
async function editRes(r) {
  const isDemand = r.kind === 'demand';
  const title = prompt(isDemand ? '采购需求标题' : '货源标题', r.title);
  if (title === null) return;
  const start_price = prompt(isDemand ? '心理价(元/箱)' : '起报价(元/箱)', r.start_price);
  if (start_price === null) return;
  const quantity = prompt('数量(箱)', r.quantity);
  if (quantity === null) return;
  const description = prompt('描述', r.description || '');
  if (description === null) return;
  await api.patch(`/admin/resources/${r.id}`, { title, start_price, quantity, description });
  load();
}
async function delRes(r) {
  if (!confirm(`确认删除「${r.title}」？删除后用户端不再展示。`)) return;
  await api.delete(`/admin/resources/${r.id}`);
  load();
}
onMounted(load);
</script>

<style scoped>
.danger { color: #ee0a24; }
.admin-tbl button { margin-right: 6px; }
</style>
