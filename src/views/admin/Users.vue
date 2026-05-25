<template>
  <div>
    <h2 style="margin-top: 0;">👤 用户管理</h2>
    <div class="admin-card">
      <div class="row" style="gap: 8px;">
        <select v-model="role" @change="load" style="padding: 4px;">
          <option value="">全部角色</option><option value="farm">养殖场</option>
          <option value="buyer">采购商</option><option value="admin">管理员</option>
        </select>
        <select v-model="status" @change="load" style="padding: 4px;">
          <option value="">全部状态</option><option value="pending">资质待审</option>
          <option value="approved">已通过</option><option value="rejected">未通过</option>
        </select>
      </div>
    </div>

    <div class="admin-card">
      <table class="admin-tbl">
        <thead><tr><th>ID</th><th>姓名</th><th>手机号</th><th>角色</th><th>地区</th><th>资质</th><th>状态</th><th>操作</th></tr></thead>
        <tbody>
          <tr v-for="u in list" :key="u.id">
            <td>{{ u.id }}</td>
            <td>{{ u.name }}</td>
            <td>{{ u.phone }}</td>
            <td>{{ roleLabel(u.role) }}</td>
            <td>{{ u.region || '-' }}</td>
            <td><span class="pill" :class="licClass(u.license_status)">{{ licLabel(u.license_status) }}</span></td>
            <td><span class="pill" :class="u.banned ? 'pill-r' : 'pill-g'">{{ u.banned ? '已冻结' : '正常' }}</span></td>
            <td>
              <template v-if="u.role === 'farm' && u.license_status === 'pending'">
                <button @click="approve(u)">通过</button>
                <button @click="reject(u)">驳回</button>
              </template>
              <button @click="ban(u)" v-if="u.role !== 'admin'">{{ u.banned ? '解冻' : '冻结' }}</button>
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

const list = ref([]);
const role = ref('');
const status = ref('');

function roleLabel(r) { return ({ farm: '养殖场', buyer: '采购商', admin: '管理员' }[r]); }
function licLabel(s) { return ({ pending: '待审', approved: '已通过', rejected: '未通过', none: '无需' }[s]); }
function licClass(s) { return ({ pending: 'pill-y', approved: 'pill-g', rejected: 'pill-r', none: 'pill-d' }[s]); }

async function load() {
  const params = {};
  if (role.value) params.role = role.value;
  if (status.value) params.status = status.value;
  const { users } = await api.get('/admin/users', { params });
  list.value = users;
}
async function approve(u) { await api.post(`/admin/users/${u.id}/approve`); load(); }
async function reject(u) {
  const reason = prompt('驳回原因？', '资质材料不全');
  if (reason === null) return;
  await api.post(`/admin/users/${u.id}/reject`, { reason }); load();
}
async function ban(u) { await api.post(`/admin/users/${u.id}/ban`, { ban: !u.banned }); load(); }
onMounted(load);
</script>
