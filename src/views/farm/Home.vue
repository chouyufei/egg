<template>
  <div class="page">
    <div class="hero-banner">
      <div class="row-between">
        <div>
          <div class="hero-title">🐔 养殖场工作台</div>
          <div class="hero-sub">{{ user?.name }}</div>
        </div>
        <van-icon name="bell-o" size="22" color="#fff" :badge="store.unreadCount || ''" @click="$router.push('/farm/messages')" />
      </div>
    </div>

    <div v-if="user?.license_status !== 'approved'" class="card" style="margin: 16px 12px; border-left: 3px solid #f6b821;">
      <div style="font-weight: 600;">⚠️ 完成资质认证</div>
      <div class="muted" style="margin-top: 4px;">{{ qualifyHint }}</div>
      <van-button type="primary" size="small" round style="margin-top: 10px;" @click="$router.push('/farm/qualify')">前往认证</van-button>
    </div>

    <div v-else-if="!depositPaid" class="card" style="margin: 16px 12px; border-left: 3px solid #f6b821;">
      <div style="font-weight: 600;">💰 缴纳服务保障金</div>
      <div class="muted" style="margin-top: 4px;">需缴纳 1000 元方可发布资源</div>
      <van-button type="primary" size="small" round style="margin-top: 10px;" @click="$router.push('/farm/deposit')">前往缴纳</van-button>
    </div>

    <div class="stat-grid" style="padding: 0 12px; margin-bottom: 12px;">
      <div class="stat"><div class="v">{{ stats.active }}</div><div class="l">报价中</div></div>
      <div class="stat"><div class="v">{{ stats.sold }}</div><div class="l">已成交</div></div>
      <div class="stat"><div class="v price">¥{{ stats.gmv }}</div><div class="l">总成交额</div></div>
    </div>

    <div class="row-between" style="padding: 0 12px;">
      <div class="section-title" style="margin: 0;">我的资源</div>
      <van-button size="small" type="primary" round @click="$router.push('/farm/publish')"
                  :disabled="user?.license_status !== 'approved' || !depositPaid">
        + 发布新资源
      </van-button>
    </div>

    <div class="page-pad">
      <div v-if="!resources.length" class="empty">还没有发布资源，点上方按钮开始</div>
      <EggCard v-for="r in resources.slice(0, 6)" :key="r.id" :r="r" @click="open(r.id)" />
      <div v-if="resources.length > 6" style="text-align: center; padding: 8px 0;">
        <van-button plain size="small" @click="$router.push('/farm/resources')">查看全部 ({{ resources.length }})</van-button>
      </div>
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
import { useUserStore } from '../../stores/user';

const router = useRouter();
const store = useUserStore();
const user = computed(() => store.user);
const resources = ref([]);
const depositPaid = computed(() => store.depositStatus?.farm?.paid);

const tabs = [
  { to: '/farm', icon: 'home-o', label: '工作台' },
  { to: '/farm/resources', icon: 'shop-o', label: '资源' },
  { to: '/farm/publish', icon: 'plus', label: '发布' },
  { to: '/farm/orders', icon: 'orders-o', label: '订单' },
  { to: '/farm/me', icon: 'user-o', label: '我的' },
];

const qualifyHint = computed(() => ({
  pending: '资质审核中，平台一般 1 个工作日内处理',
  rejected: '资质未通过，请重新提交',
  none: '请先提交营业执照等资质',
}[user.value?.license_status] || ''));

const stats = computed(() => {
  let active = 0, sold = 0, gmv = 0;
  for (const r of resources.value) {
    if (r.status === 'auctioning') active++;
    if (r.status === 'sold') { sold++; gmv += r.current_price; }
  }
  return { active, sold, gmv: gmv.toFixed(0) };
});

function open(id) { router.push(`/farm/resource/${id}`); }

onMounted(async () => {
  await store.refresh();
  await store.loadDepositStatus();
  await store.loadUnread();
  const { resources: rs } = await api.get('/resources/mine');
  resources.value = rs;
});
</script>
