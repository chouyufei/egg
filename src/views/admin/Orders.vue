<template>
  <div>
    <h2 style="margin-top: 0;">📦 订单管理</h2>
    <div class="admin-card">
      <table class="admin-tbl">
        <thead><tr><th>订单编号</th><th>类型</th><th>资源</th><th>成交价</th><th>数量</th><th>卖方</th><th>买方</th><th>状态</th><th>成交时间</th><th></th></tr></thead>
        <tbody>
          <tr v-for="o in list" :key="o.id">
            <td style="font-family: monospace;">{{ o.order_no || ('#' + o.id) }}</td>
            <td>{{ o.kind === 'demand' ? '求购' : '货源' }}</td>
            <td>{{ o.resource_title }}</td>
            <td>¥{{ o.final_price }}</td>
            <td>{{ o.quantity }} 箱</td>
            <td>{{ o.farm_name }}<br/><span class="muted">{{ o.farm_phone }}</span></td>
            <td>{{ o.buyer_name }}<br/><span class="muted">{{ o.buyer_phone }}</span></td>
            <td><span class="pill" :class="cls(o.status)">{{ label(o.status) }}</span></td>
            <td>{{ formatTime(o.created_at) }}</td>
            <td><button @click="detail(o)">详情</button></td>
          </tr>
          <tr v-if="!list.length"><td colspan="10" class="muted" style="text-align:center;padding:24px;">暂无订单</td></tr>
        </tbody>
      </table>
    </div>

    <!-- 成交详情弹层 -->
    <div v-if="cur" class="modal-mask" @click.self="cur = null">
      <div class="modal">
        <h3 style="margin-top: 0;">订单 {{ cur.order_no || ('#' + cur.id) }} 详情</h3>
        <div class="kv"><span>类型</span><b>{{ cur.kind === 'demand' ? '求购' : '货源' }}</b></div>
        <div class="kv"><span>资源</span><b>{{ cur.resource_title }}</b></div>
        <div class="kv"><span>蛋品 / 净重</span><b>{{ cur.egg_color || '-' }} / {{ cur.weight_spec || '-' }}</b></div>
        <div class="kv"><span>车型</span><b>{{ cur.truck_type ? cur.truck_type + ' 米车' : '-' }}</b></div>
        <div class="kv"><span>成交价 / 数量</span><b>¥{{ cur.final_price }} / {{ cur.quantity }} 箱</b></div>
        <div class="kv"><span>卖方</span><b>{{ cur.farm_name }}（{{ cur.farm_phone }}）</b></div>
        <div class="kv"><span>买方</span><b>{{ cur.buyer_name }}（{{ cur.buyer_phone }}）</b></div>
        <div class="kv"><span>状态 / 成交时间</span><b>{{ label(cur.status) }} · {{ formatTime(cur.created_at) }}</b></div>
        <div v-if="cur.weight_specs && cur.weight_specs.length" style="margin-top: 12px;">
          <div class="muted" style="margin-bottom: 6px;">各规格箱数 / 价格</div>
          <table class="admin-tbl">
            <thead><tr><th>净重</th><th>箱数</th><th>价格</th></tr></thead>
            <tbody>
              <tr v-for="(w, i) in cur.weight_specs" :key="i">
                <td>{{ w.weight }} 斤</td><td>{{ w.boxes }} 箱</td><td>¥{{ w.price }}/箱</td>
              </tr>
            </tbody>
          </table>
        </div>
        <button style="margin-top: 16px;" @click="cur = null">关闭</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import api from '../../api';
import dayjs from 'dayjs';

const list = ref([]);
const cur = ref(null);
function label(s) { return ({ pending_group: '待拉群', communicating: '沟通中', completed: '已完成', disputed: '纠纷中', cancelled: '已取消' }[s] || s); }
function cls(s) { return ({ pending_group: 'pill-y', communicating: 'pill-b', completed: 'pill-g', disputed: 'pill-r', cancelled: 'pill-d' }[s] || ''); }
function formatTime(t) { return dayjs(t).format('YYYY-MM-DD HH:mm'); }
function detail(o) { cur.value = o; }

async function load() {
  const { orders } = await api.get('/admin/orders');
  list.value = orders;
}
onMounted(load);
</script>

<style scoped>
.muted { color: #8a8d93; font-size: 12px; }
.modal-mask { position: fixed; inset: 0; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal { background: #fff; border-radius: 10px; padding: 24px; width: 560px; max-height: 80vh; overflow: auto; }
.kv { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0f0f0; font-size: 14px; }
.kv span { color: #8a8d93; }
</style>
