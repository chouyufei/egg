<template>
  <div class="page">
    <van-nav-bar title="服务保障金" left-arrow @click-left="$router.back()" />
    <div class="card" style="margin: 12px;">
      <div style="font-size: 16px; font-weight: 600;">为什么要缴纳保证金？</div>
      <div class="muted" style="margin-top: 6px; line-height: 1.7;">
        采购商需缴纳 <b>200 元</b> 服务保障金。每次同时仅冻结一笔，被反超或报价结束即自动解冻。中标后若 7 天未拉群，将扣除保证金；恶意拉黑联系人将永久没收。
      </div>
    </div>

    <div class="card" style="margin: 12px;">
      <div class="row-between">
        <div>
          <div class="muted">应缴保证金</div>
          <div class="price-large">¥ 200</div>
        </div>
        <div>
          <van-tag v-if="status?.buyer?.paid" type="success" size="large">已缴纳</van-tag>
          <van-tag v-else type="warning" size="large">未缴纳</van-tag>
        </div>
      </div>
      <van-button block round type="primary" style="margin-top: 16px;"
                  :disabled="status?.buyer?.paid" :loading="paying" @click="pay">
        {{ status?.buyer?.paid ? '已缴纳保证金' : '立即缴纳 ¥200（演示模式）' }}
      </van-button>
    </div>

    <div class="card" style="margin: 12px;">
      <div class="section-title" style="margin: 0 0 8px;">缴纳记录</div>
      <div v-if="!history.length" class="empty" style="padding: 20px 0;">暂无记录</div>
      <van-cell v-for="d in history" :key="d.id" :title="`保证金 ¥${d.amount}`" :label="format(d.paid_at)">
        <template #value>
          <span :class="statusClass(d.status)" class="pill">{{ statusLabel(d.status) }}</span>
        </template>
      </van-cell>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { showSuccessToast } from 'vant';
import api from '../../api';
import dayjs from 'dayjs';
import { useUserStore } from '../../stores/user';

const store = useUserStore();
const status = ref(null);
const history = ref([]);
const paying = ref(false);

function format(t) { return dayjs(t).format('YYYY-MM-DD HH:mm'); }
function statusLabel(s) { return { available: '可用', frozen: '冻结中', released: '已退还', deducted: '已扣除' }[s] || s; }
function statusClass(s) { return ({ available: 'pill-g', frozen: 'pill-y', released: 'pill-d', deducted: 'pill-r' }[s] || 'pill-d'); }

async function load() {
  status.value = await api.get('/deposits/status');
  const { deposits } = await api.get('/deposits');
  history.value = deposits.filter(d => d.type === 'buyer_bid');
}
async function pay() {
  paying.value = true;
  try { await api.post('/deposits/pay', { type: 'buyer_bid' }); showSuccessToast('保证金已缴纳'); await load(); }
  finally { paying.value = false; }
}
onMounted(async () => { await load(); await store.loadDepositStatus(); });
</script>
