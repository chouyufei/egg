<template>
  <div class="page">
    <div class="hero-banner">
      <div class="row-between">
        <div>
          <div class="hero-title">🥚 风伯乐</div>
          <div class="hero-sub">让你的蛋，自己定价</div>
        </div>
        <van-icon name="bell-o" size="22" color="#fff" :badge="store.unreadCount || ''" @click="$router.push('/buyer/messages')" />
      </div>
      <van-search v-model="kw" placeholder="搜地区 / 鸡种 / 蛋色" shape="round" background="transparent"
                  style="margin-top: 12px; padding: 0;" @search="goSearch" />
    </div>

    <div style="display: flex; gap: 8px; padding: 16px 12px 0;">
      <div v-for="q in quickFilters" :key="q.label" class="card" style="flex:1; margin: 0; text-align: center; padding: 12px 4px;"
           @click="quickGo(q)">
        <div style="font-size: 22px;">{{ q.icon }}</div>
        <div style="font-size: 12px; margin-top: 4px;">{{ q.label }}</div>
      </div>
    </div>

    <div class="section-title">竞拍中 · 即将结束</div>
    <div class="page-pad" v-if="endingSoon.length">
      <EggCard v-for="r in endingSoon" :key="r.id" :r="r" @click="open(r.id)" />
    </div>
    <div v-else class="empty">暂无即将结束的资源</div>

    <div class="section-title">新发布</div>
    <div class="page-pad" v-if="newest.length">
      <EggCard v-for="r in newest" :key="r.id" :r="r" @click="open(r.id)" />
    </div>

    <Tabbar :tabs="tabs" />
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import api from '../../api';
import EggCard from '../../components/EggCard.vue';
import Tabbar from '../../components/Tabbar.vue';
import { useUserStore } from '../../stores/user';

const router = useRouter();
const store = useUserStore();
const all = ref([]);
const kw = ref('');

const tabs = [
  { to: '/buyer', icon: 'home-o', label: '首页' },
  { to: '/buyer/search', icon: 'search', label: '搜索' },
  { to: '/buyer/bids', icon: 'fire-o', label: '我的竞拍' },
  { to: '/buyer/orders', icon: 'orders-o', label: '订单' },
  { to: '/buyer/me', icon: 'user-o', label: '我的' },
];
const quickFilters = [
  { icon: '🔴', label: '红壳', query: { color: '红壳' } },
  { icon: '🤎', label: '粉壳', query: { color: '粉壳' } },
  { icon: '⏰', label: '即将结束', query: { sort: 'ending_soon' } },
  { icon: '💰', label: '低价好货', query: { sort: 'price_asc' } },
];

const endingSoon = computed(() =>
  all.value.filter(r => r.status === 'auctioning').sort((a, b) => a.end_at - b.end_at).slice(0, 3));
const newest = computed(() =>
  all.value.filter(r => r.status === 'auctioning').sort((a, b) => b.created_at - a.created_at).slice(0, 6));

function open(id) { router.push(`/buyer/resource/${id}`); }
function goSearch() { router.push({ path: '/buyer/search', query: { keyword: kw.value } }); }
function quickGo(q) { router.push({ path: '/buyer/search', query: q.query }); }

onMounted(async () => {
  const { resources } = await api.get('/resources', { params: { status: 'auctioning' } });
  all.value = resources;
  store.loadUnread();
});
</script>
