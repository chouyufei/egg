<template>
  <div class="page">
    <van-nav-bar title="我的订单" />
    <div class="page-pad">
      <div v-if="!list.length" class="empty">暂无订单</div>
      <div v-for="o in list" :key="o.id" class="card" @click="open(o.id)">
        <div class="row-between">
          <span style="font-weight: 600;">订单 #{{ o.id }}</span>
          <van-tag :type="statusType(o.status)">{{ statusLabel(o.status) }}</van-tag>
        </div>
        <div class="row" style="margin-top: 8px; gap: 12px;">
          <img :src="o.resource?.photos?.[0] || 'https://via.placeholder.com/80'" style="width: 60px; height: 60px; border-radius: 6px; object-fit: cover;" />
          <div style="flex: 1;">
            <div>{{ o.resource?.title }}</div>
            <div class="muted">养殖场：{{ o.farm?.name }}</div>
            <div class="row-between" style="margin-top: 4px;">
              <span class="price">¥{{ o.final_price }}</span>
              <span class="muted">{{ formatTime(o.created_at) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    <Tabbar :tabs="tabs" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import api from '../../api';
import dayjs from 'dayjs';
import Tabbar from '../../components/Tabbar.vue';

const router = useRouter();
const list = ref([]);
const tabs = [
  { to: '/buyer', icon: 'home-o', label: '首页' },
  { to: '/buyer/search', icon: 'search', label: '搜索' },
  { to: '/buyer/bids', icon: 'fire-o', label: '我的竞价' },
  { to: '/buyer/orders', icon: 'orders-o', label: '订单' },
  { to: '/buyer/me', icon: 'user-o', label: '我的' },
];
function formatTime(t) { return dayjs(t).format('MM-DD HH:mm'); }
function statusLabel(s) { return { pending_group: '待拉群', communicating: '沟通中', completed: '已完成', cancelled: '已取消', disputed: '纠纷中' }[s]; }
function statusType(s) { return ({ pending_group: 'warning', communicating: 'primary', completed: 'success', cancelled: 'default', disputed: 'danger' }[s] || 'default'); }
function open(id) { router.push(`/buyer/order/${id}`); }
onMounted(async () => { const { orders } = await api.get('/orders'); list.value = orders; });
</script>
