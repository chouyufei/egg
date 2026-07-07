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
          <th>ID</th><th>类型</th><th>图</th><th>标题</th><th>发布人</th><th>地区</th>
          <th>起报/当前</th><th>状态</th><th>报价数</th><th>截止</th><th>操作</th>
        </tr></thead>
        <tbody>
          <tr v-for="r in list" :key="r.id">
            <td>{{ r.id }}</td>
            <td><span class="pill" :class="r.kind === 'demand' ? 'pill-b' : 'pill-y'">{{ kindLabel(r.kind) }}</span></td>
            <td>
              <img v-if="parsePhotos(r.photos).length" :src="parsePhotos(r.photos)[0]" class="thumb-sm" />
              <span v-else class="muted" style="font-size: 12px;">无图</span>
            </td>
            <td>{{ r.title }}</td>
            <td>{{ r.farm_name || '-' }}<br><span class="muted" style="font-size: 12px;">{{ r.farm_phone || '' }}</span></td>
            <td>{{ r.region || '-' }}</td>
            <td>¥{{ r.start_price }} → <b>¥{{ r.current_price }}</b></td>
            <td><span class="pill" :class="cls(r.status)">{{ label(r.status) }}</span></td>
            <td>{{ bidsOf(r) }}</td>
            <td>{{ formatTime(r.end_at) }}</td>
            <td style="white-space: nowrap;">
              <button @click="openEdit(r)">编辑</button>
              <button v-if="r.status === 'auctioning' || r.status === 'draft'" @click="takedown(r)">下架</button>
              <button class="danger" @click="delRes(r)">删除</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 编辑弹窗：可改全部参数 + 上传图片 -->
    <van-popup v-model:show="editVisible" position="right" :style="{ width: '520px', maxWidth: '96vw', height: '100%' }">
      <div class="edit-panel" v-if="ef">
        <div class="edit-head">
          <b>编辑资源 #{{ ef.id }}（{{ kindLabel(ef.kind) }}）</b>
          <span class="x" @click="editVisible = false">✕</span>
        </div>
        <div class="edit-body">
          <div class="grp">图片</div>
          <div class="photos">
            <div v-for="(p, i) in ef.photos" :key="i" class="ph">
              <img :src="p" />
              <span class="del" @click="ef.photos.splice(i, 1)">✕</span>
            </div>
            <van-uploader :after-read="onUpload" :preview-image="false" accept="image/*" multiple>
              <div class="ph add">＋<div style="font-size:12px;">上传</div></div>
            </van-uploader>
          </div>
          <div class="muted" style="font-size:12px;margin:2px 0 8px;">第 1 张为封面，可上传帮用户补全</div>

          <div class="grp">基本信息</div>
          <label>标题<input v-model="ef.title" /></label>
          <div class="row2">
            <label>地区<input v-model="ef.region" /></label>
            <label>省份<input v-model="ef.province" /></label>
          </div>
          <div class="row2">
            <label>蛋壳颜色<input v-model="ef.egg_color" placeholder="如 红壳" /></label>
            <label>鸡种<input v-model="ef.chicken_breed" placeholder="如 海兰褐" /></label>
          </div>

          <div class="grp">品质规格</div>
          <div class="row2">
            <label>蛋黄颜色<input v-model="ef.yolk_color" /></label>
            <label>蛋黄色号<input v-model="ef.yolk_shade" /></label>
          </div>
          <div class="row2">
            <label>鲜度(天内)<input type="number" v-model="ef.freshness_days" /></label>
            <label>次品率(%)<input type="number" v-model="ef.defect_rate" /></label>
          </div>
          <label>次品说明<input v-model="ef.defect_note" /></label>
          <div class="row2">
            <label>规格(枚/箱)<input type="number" v-model="ef.pack_size" /></label>
            <label>单箱净重<input v-model="ef.weight_spec" placeholder="如 38-40 斤/箱" /></label>
          </div>
          <label>车型(米)<input v-model="ef.truck_type" placeholder="如 4.2" /></label>

          <div class="grp">数量 / 价格</div>
          <div class="row2">
            <label>数量(箱)<input type="number" v-model="ef.quantity" /></label>
            <label>{{ ef.kind === 'demand' ? '降价幅度' : '加价幅度' }}<input type="number" v-model="ef.min_increment" /></label>
          </div>
          <div class="row2">
            <label>{{ ef.kind === 'demand' ? '心理价' : '起报价' }}<input type="number" v-model="ef.start_price" /></label>
            <label>当前价<input type="number" v-model="ef.current_price" /></label>
          </div>

          <div class="grp">各规格箱数 / 价格</div>
          <div v-for="(s, i) in ef.weight_specs" :key="i" class="spec-row">
            <input v-model="s.weight" placeholder="斤" style="width:70px;" /><span>斤箱</span>
            <input type="number" v-model="s.boxes" placeholder="箱数" style="width:80px;" /><span>箱</span>
            <input type="number" v-model="s.price" placeholder="价格" style="width:90px;" /><span>元</span>
            <span class="del-row" @click="ef.weight_specs.splice(i, 1)">删</span>
          </div>
          <button class="add-spec" @click="ef.weight_specs.push({ weight: '', boxes: '', price: '' })">+ 添加规格行</button>

          <template v-if="ef.kind === 'demand'">
            <div class="grp">允许参与地区（求购）</div>
            <label><input v-model="ef.allowText" placeholder="用 、或逗号 分隔，如 湖北、湖南；留空=不限" /></label>
          </template>

          <div class="grp">描述</div>
          <label><textarea v-model="ef.description" rows="3"></textarea></label>
        </div>
        <div class="edit-foot">
          <button @click="editVisible = false">取消</button>
          <button class="save" @click="saveEdit" :disabled="saving">{{ saving ? '保存中…' : '保存' }}</button>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import api from '../../api';
import dayjs from 'dayjs';
import { showSuccessToast, showFailToast } from 'vant';

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
function parsePhotos(s) {
  if (!s) return [];
  if (Array.isArray(s)) return s;
  try { const v = JSON.parse(s); return Array.isArray(v) ? v : []; } catch (e) { return []; }
}

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
async function delRes(r) {
  if (!confirm(`确认删除「${r.title}」？删除后用户端不再展示。`)) return;
  await api.delete(`/admin/resources/${r.id}`);
  load();
}

// ---- 编辑 ----
const editVisible = ref(false);
const ef = ref(null);
const saving = ref(false);

function toArr(s) {
  if (!s) return [];
  if (Array.isArray(s)) return s;
  try { const v = JSON.parse(s); return Array.isArray(v) ? v : []; } catch (e) { return []; }
}

function openEdit(r) {
  const specs = toArr(r.weight_specs).map(s => ({ weight: s.weight, boxes: s.boxes, price: s.price }));
  const allow = toArr(r.allow_provinces);
  ef.value = reactive({
    id: r.id, kind: r.kind || 'supply',
    title: r.title || '', region: r.region || '', province: r.province || '',
    egg_color: r.egg_color || '', chicken_breed: r.chicken_breed || '',
    yolk_color: r.yolk_color || '', yolk_shade: r.yolk_shade || '',
    freshness_days: r.freshness_days ?? '', defect_rate: r.defect_rate ?? '', defect_note: r.defect_note || '',
    pack_size: r.pack_size ?? '', weight_spec: r.weight_spec || '', truck_type: r.truck_type || '',
    quantity: r.quantity ?? '', min_increment: r.min_increment ?? '',
    start_price: r.start_price ?? '', current_price: r.current_price ?? '',
    weight_specs: specs,
    allowText: allow.join('、'),
    description: r.description || '',
    photos: parsePhotos(r.photos),
  });
  editVisible.value = true;
}

async function onUpload(item) {
  const items = Array.isArray(item) ? item : [item];
  for (const it of items) {
    try {
      const fd = new FormData();
      fd.append('file', it.file);
      const { url } = await api.post('/upload', fd);
      if (url) ef.value.photos.push(url);
    } catch (e) { showFailToast('图片上传失败'); }
  }
}

async function saveEdit() {
  const f = ef.value;
  saving.value = true;
  try {
    const allow = f.allowText.split(/[、,，\s]+/).map(x => x.trim()).filter(Boolean);
    const specs = f.weight_specs
      .filter(s => s.weight !== '' && s.weight != null)
      .map(s => ({ weight: Number(s.weight), boxes: Number(s.boxes) || 0, price: Number(s.price) || 0 }));
    const payload = {
      title: f.title, region: f.region, province: f.province,
      egg_color: f.egg_color, chicken_breed: f.chicken_breed,
      yolk_color: f.yolk_color, yolk_shade: f.yolk_shade,
      freshness_days: f.freshness_days, defect_rate: f.defect_rate, defect_note: f.defect_note,
      pack_size: f.pack_size, weight_spec: f.weight_spec, truck_type: f.truck_type,
      quantity: f.quantity, min_increment: f.min_increment,
      start_price: f.start_price, current_price: f.current_price,
      description: f.description,
      photos: f.photos,
      weight_specs: specs,
    };
    if (f.kind === 'demand') payload.allow_provinces = allow.length ? allow : null;
    await api.patch(`/admin/resources/${f.id}`, payload);
    showSuccessToast('已保存');
    editVisible.value = false;
    load();
  } catch (e) { /* 拦截器已提示 */ } finally { saving.value = false; }
}

onMounted(load);
</script>

<style scoped>
.danger { color: #ee0a24; }
.admin-tbl button { margin-right: 6px; }
.thumb-sm { width: 44px; height: 44px; object-fit: cover; border-radius: 6px; border: 1px solid #eee; }

.edit-panel { display: flex; flex-direction: column; height: 100%; }
.edit-head { padding: 14px 18px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; }
.edit-head .x { cursor: pointer; color: #999; font-size: 18px; }
.edit-body { flex: 1; overflow-y: auto; padding: 14px 18px; }
.edit-foot { padding: 12px 18px; border-top: 1px solid #eee; display: flex; gap: 12px; justify-content: flex-end; }
.edit-foot .save { background: #f6b821; color: #fff; border: none; padding: 8px 28px; border-radius: 6px; cursor: pointer; }
.edit-foot .save[disabled] { background: #ccc; }

.grp { font-weight: 700; color: #8a5a00; margin: 16px 0 8px; padding-left: 8px; border-left: 4px solid #f6b821; }
.edit-body label { display: block; font-size: 13px; color: #555; margin-bottom: 10px; }
.edit-body input, .edit-body textarea {
  display: block; width: 100%; margin-top: 4px; padding: 8px 10px;
  border: 1px solid #ddd; border-radius: 6px; font-size: 14px; box-sizing: border-box;
}
.row2 { display: flex; gap: 12px; }
.row2 label { flex: 1; }

.photos { display: flex; flex-wrap: wrap; gap: 10px; }
.photos .ph { position: relative; width: 84px; height: 84px; border-radius: 8px; overflow: hidden; border: 1px solid #e0e0e0; }
.photos .ph img { width: 100%; height: 100%; object-fit: cover; }
.photos .ph .del { position: absolute; top: 2px; right: 2px; background: rgba(0,0,0,.55); color: #fff; width: 20px; height: 20px; border-radius: 50%; text-align: center; line-height: 20px; cursor: pointer; font-size: 12px; }
.photos .ph.add { display: flex; flex-direction: column; align-items: center; justify-content: center; color: #999; background: #f7f7f7; border: 1px dashed #ccc; cursor: pointer; font-size: 24px; }

.spec-row { display: flex; align-items: center; gap: 6px; margin-bottom: 8px; font-size: 13px; }
.spec-row input { display: inline-block; width: auto; margin-top: 0; padding: 6px 8px; }
.spec-row .del-row { color: #ee0a24; cursor: pointer; margin-left: 4px; }
.add-spec { background: #fff7e0; border: 1px solid #f6b821; color: #b78300; padding: 6px 14px; border-radius: 6px; cursor: pointer; }
</style>
