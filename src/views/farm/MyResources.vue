<template>
  <div class="page">
    <van-nav-bar title="我的资源" />
    <van-tabs v-model:active="tab">
      <van-tab name="all" title="全部" />
      <van-tab name="auctioning" title="竞拍中" />
      <van-tab name="sold" title="已成交" />
      <van-tab name="failed" title="已流拍" />
    </van-tabs>
    <div class="page-pad">
      <div v-if="!filtered.length" class="empty">暂无资源</div>
      <EggCard v-for="r in filtered" :key="r.id" :r="r" @click="open(r.id)" />
    </div>
    <Tabbar :tabs="tabs" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import api from '../../api';
import EggCard from '../../components/EggCard.vue';
import Tabbar from '../../components/Tabbar.vue';

const router = useRouter();
const list = ref([]);
const tab = ref('all');

const tabs = [
  { to: '/farm', icon: 'home-o', label: '工作台' },
  { to: '/farm/resources', icon: 'shop-o', label: '资源' },
  { to: '/farm/publish', icon: 'plus', label: '发布' },
  { to: '/farm/orders', icon: 'orders-o', label: '订单' },
  { to: '/farm/me', icon: 'user-o', label: '我的' },
];

const filtered = computed(() => tab.value === 'all' ? list.value : list.value.filter(r => r.status === tab.value));

function open(id) { router.push(`/farm/resource/${id}`); }
onMounted(async () => { const { resources } = await api.get('/resources/mine'); list.value = resources; });
</script>
