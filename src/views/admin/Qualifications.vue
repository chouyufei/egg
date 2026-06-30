<template>
  <div>
    <h2 style="margin-top: 0;">📜 资质审核</h2>

    <div class="admin-card" style="display: flex; gap: 12px; align-items: center;">
      <span class="muted">状态筛选：</span>
      <button v-for="t in tabs" :key="t.v" @click="status = t.v; load()"
              :style="status === t.v ? 'background: #f6b821; color: #fff;' : ''">
        {{ t.label }} {{ counts[t.v] !== undefined ? `(${counts[t.v]})` : '' }}
      </button>
      <span class="muted" style="margin-left: auto;">共 {{ list.length }} 条</span>
    </div>

    <div v-if="!list.length" class="admin-card" style="text-align: center; padding: 60px 0; color: #8a8d93;">
      暂无{{ tabs.find(t => t.v === status)?.label || '' }}资质
    </div>

    <div v-for="u in list" :key="u.id" class="admin-card qf-card">
      <div class="qf-header">
        <div>
          <span class="qf-name">🐔 {{ u.name || '未填写' }}</span>
          <span class="pill" :class="licClass(u.license_status)" style="margin-left: 10px;">{{ licLabel(u.license_status) }}</span>
          <span v-if="u._pending" class="pill pill-y" style="margin-left: 8px;">本次为修改提交</span>
        </div>
        <div class="muted" style="font-size: 12px;">提交时间：{{ formatTime(u.created_at) }} · ID #{{ u.id }}</div>
      </div>

      <div class="qf-grid">
        <div><span class="muted">联系人：</span>{{ u.contact_name || '-' }}</div>
        <div><span class="muted">手机号：</span>{{ u.phone }}</div>
        <div><span class="muted">地区：</span>{{ u.region || '-' }}</div>
        <div><span class="muted">详细地址：</span>{{ u.address || '-' }}</div>
        <div><span class="muted">养殖规模：</span>{{ u.farm_size_int ? (+(u.farm_size_int / 10000).toFixed(2)) + ' 万只' : '-' }}</div>
        <div><span class="muted">日产量：</span>{{ u.daily_output ? u.daily_output + ' 箱/天' : '-' }}</div>
        <div style="grid-column: span 2;"><span class="muted">主营蛋品：</span>{{ u.main_products || '-' }}</div>
        <div style="grid-column: span 2;"><span class="muted">营业执照号：</span><code style="background: #f5f6f8; padding: 2px 6px; border-radius: 4px;">{{ u.business_license || '-' }}</code></div>
      </div>

      <div class="qf-photos-block">
        <div class="qf-label">营业执照照片 ({{ parsePhotos(u.license_photos).length }})</div>
        <div class="qf-photos">
          <a v-for="p in parsePhotos(u.license_photos)" :key="p" :href="p" target="_blank">
            <img :src="p" :alt="'营业执照'" />
          </a>
          <div v-if="!parsePhotos(u.license_photos).length" class="muted">未上传</div>
        </div>
      </div>

      <div class="qf-photos-block">
        <div class="qf-label">鸡场实景照 ({{ parsePhotos(u.farm_photos).length }})</div>
        <div class="qf-photos">
          <a v-for="p in parsePhotos(u.farm_photos)" :key="p" :href="p" target="_blank">
            <img :src="p" :alt="'鸡场实景'" />
          </a>
          <div v-if="!parsePhotos(u.farm_photos).length" class="muted">未上传</div>
        </div>
      </div>

      <div class="qf-photos-block">
        <div class="qf-label">检疫合格证 / 其他资质 ({{ parsePhotos(u.quarantine_photos).length }})</div>
        <div class="qf-photos">
          <a v-for="p in parsePhotos(u.quarantine_photos)" :key="p" :href="p" target="_blank">
            <img :src="p" :alt="'检疫合格证'" />
          </a>
          <div v-if="!parsePhotos(u.quarantine_photos).length" class="muted">未上传</div>
        </div>
      </div>

      <div class="qf-actions" v-if="u.license_status === 'pending'">
        <button class="btn-approve" @click="approve(u)">✓ 审核通过</button>
        <button class="btn-reject" @click="reject(u)">✗ 驳回</button>
      </div>
      <div v-else-if="u.license_status === 'rejected'" class="qf-actions">
        <button class="btn-approve" @click="approve(u)">改判通过</button>
      </div>
      <div v-else-if="u.license_status === 'approved'" class="qf-actions">
        <button @click="reject(u)">撤销并驳回</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { showSuccessToast } from 'vant';
import api from '../../api';
import dayjs from 'dayjs';

const tabs = [
  { v: 'pending',  label: '待审核' },
  { v: 'approved', label: '已通过' },
  { v: 'rejected', label: '已驳回' },
  { v: '',         label: '全部' },
];

const status = ref('pending');
const list = ref([]);
const counts = reactive({});

function formatTime(t) { return t ? dayjs(t).format('YYYY-MM-DD HH:mm') : '-'; }
function licLabel(s) { return ({ pending: '待审核', approved: '已通过', rejected: '已驳回', none: '未提交' }[s] || s); }
function licClass(s) { return ({ pending: 'pill-y', approved: 'pill-g', rejected: 'pill-r', none: 'pill-d' }[s] || 'pill-d'); }

function parsePhotos(s) {
  if (!s) return [];
  if (Array.isArray(s)) return s;
  try { const v = JSON.parse(s); return Array.isArray(v) ? v : []; }
  catch (e) { return []; }
}

// 已通过的养殖场重新提交时，新资料存在 license_pending 快照里，正式字段不动。
// 审核页要展示"本次实际提交"的内容，否则会看到旧资料、误以为新提交不见了。
function applyPending(u) {
  if (!u.license_pending) return u;
  let p = null;
  try { p = JSON.parse(u.license_pending); } catch (e) { return u; }
  if (!p || typeof p !== 'object') return u;
  // 用快照覆盖展示字段，保留 id/phone/license_status/created_at 等基础信息
  return { ...u, ...p, _pending: true };
}

// 资质认证与角色无关：采购商 / 养殖场都可提交，所以这里不再按 role 过滤，
// 只要提交过资质（license_status 非 none / 空）的用户都纳入审核列表。
const SUBMITTED = ['pending', 'approved', 'rejected'];

async function load() {
  const params = {};
  if (status.value) params.status = status.value;
  const { users } = await api.get('/admin/users', { params });
  list.value = users.filter(u => SUBMITTED.includes(u.license_status)).map(applyPending);
  await loadCounts();
}

async function loadCounts() {
  const out = {};
  for (const t of tabs) {
    const params = {};
    if (t.v) params.status = t.v;
    const { users } = await api.get('/admin/users', { params });
    out[t.v] = users.filter(u => SUBMITTED.includes(u.license_status)).length;
  }
  Object.assign(counts, out);
}

async function approve(u) {
  await api.post(`/admin/users/${u.id}/approve`);
  showSuccessToast('已通过：' + (u.name || '#' + u.id));
  await load();
}
async function reject(u) {
  const reason = prompt(`驳回 ${u.name || '#' + u.id} 的原因？`, '资质材料不全，请重新提交');
  if (reason === null) return;
  await api.post(`/admin/users/${u.id}/reject`, { reason });
  showSuccessToast('已驳回');
  await load();
}

onMounted(load);
</script>

<style scoped>
.qf-card { padding: 20px; }
.qf-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #f0f0f0;
}
.qf-name { font-size: 16px; font-weight: 700; }
.qf-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 10px 24px;
  margin-bottom: 16px;
}
.qf-grid > div { font-size: 13px; line-height: 1.6; }
.qf-photos-block { margin: 14px 0; }
.qf-label { font-size: 13px; color: #555; margin-bottom: 8px; font-weight: 500; }
.qf-photos { display: flex; flex-wrap: wrap; gap: 10px; }
.qf-photos a { display: block; }
.qf-photos img {
  width: 120px; height: 120px; border-radius: 8px; object-fit: cover;
  border: 1px solid #e0e0e0;
}
.qf-actions {
  display: flex; gap: 10px; margin-top: 16px;
  padding-top: 16px; border-top: 1px solid #f0f0f0;
}
.btn-approve {
  background: #07c160; color: #fff; border: none;
  padding: 8px 24px; border-radius: 6px; font-size: 14px; cursor: pointer;
}
.btn-reject {
  background: #ee0a24; color: #fff; border: none;
  padding: 8px 24px; border-radius: 6px; font-size: 14px; cursor: pointer;
}
</style>
