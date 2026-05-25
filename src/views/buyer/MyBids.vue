<template>
  <div class="page">
    <van-nav-bar title="我的竞拍" />
    <van-tabs v-model:active="tab" @change="load">
      <van-tab name="active" title="进行中" />
      <van-tab name="won" title="已中标" />
      <van-tab name="lost" title="未中标" />
    </van-tabs>
    <div class="page-pad">
      <div v-if="!list.length" class="empty">暂无记录</div>
      <div v-for="r in list" :key="r.id" class="card shadow-sm" @click="open(r.id)" style="padding: 12px;">
        <div class="row" style="align-items: flex-start;">
          <img :src="r.photos[0] || 'https://via.placeholder.com/100x100/f6b821/ffffff?text=Egg'"
               style="width: 80px; height: 80px; border-radius: 8px; object-fit: cover;" />
          <div style="flex: 1;">
            <div style="font-weight: 600;">{{ r.title }}</div>
            <div class="tag-line">
              <van-tag :type="leadingType(r)">{{ statusLabel(r) }}</van-tag>
              <van-tag plain v-if="r.region">{{ r.region }}</van-tag>
            </div>
            <div class="row-between" style="margin-top: 8px;">
              <span class="price">¥{{ r.current_price }}</span>
              <span v-if="r.status === 'auctioning'" class="muted">剩 <Countdown :end-at="r.end_at" /></span>
              <span v-else class="muted">已结束</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    <Tabbar :tabs="tabs" />
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import api from '../../api';
import Countdown from '../../components/Countdown.vue';
import Tabbar from '../../components/Tabbar.vue';
import { useUserStore } from '../../stores/user';

const router = useRouter();
const store = useUserStore();
const tab = ref('active');
const raw = ref([]);

const tabs = [
  { to: '/buyer', icon: 'home-o', label: '首页' },
  { to: '/buyer/search', icon: 'search', label: '搜索' },
  { to: '/buyer/bids', icon: 'fire-o', label: '我的竞拍' },
  { to: '/buyer/orders', icon: 'orders-o', label: '订单' },
  { to: '/buyer/me', icon: 'user-o', label: '我的' },
];

const list = computed(() => {
  if (tab.value === 'active') return raw.value.filter(r => r.status === 'auctioning');
  if (tab.value === 'won') return raw.value.filter(r => r.status === 'sold' && r.leading);
  return raw.value.filter(r => (r.status === 'sold' && !r.leading) || r.status === 'failed' || r.status === 'cancelled');
});

function statusLabel(r) {
  if (r.status !== 'auctioning') return ({ sold: r.leading ? '已中标' : '未中标', failed: '已流拍', cancelled: '已取消' }[r.status]);
  return r.leading ? '领先中' : '已被反超';
}
function leadingType(r) {
  if (r.status === 'auctioning') return r.leading ? 'success' : 'danger';
  return r.leading ? 'success' : 'default';
}
function open(id) { router.push(`/buyer/resource/${id}`); }

async function load() {
  const { resources } = await api.get('/bids/mine');
  raw.value = resources;
}
onMounted(load);
</script>
