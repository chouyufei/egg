<template>
  <div class="page">
    <div class="hero-banner" style="border-radius: 0 0 24px 24px; padding: 24px 16px 32px;">
      <div class="row" style="gap: 14px;">
        <van-image round width="56" height="56" :src="user?.avatar || 'https://api.dicebear.com/7.x/icons/svg?seed=' + user?.phone" />
        <div>
          <div style="font-size: 18px; font-weight: 700;">{{ user?.name }}</div>
          <div class="hero-sub">采购商 · {{ user?.phone }}</div>
        </div>
      </div>
    </div>

    <van-cell-group inset style="margin: 16px 12px;">
      <van-cell title="🛡️ 服务保障金" :value="depositText" is-link to="/buyer/deposit" />
      <van-cell title="📩 消息中心" is-link to="/buyer/messages" :value="store.unreadCount ? `${store.unreadCount} 条未读` : ''" />
      <van-cell title="📦 我的订单" is-link to="/buyer/orders" />
      <van-cell title="🔥 我的报价" is-link to="/buyer/bids" />
    </van-cell-group>

    <van-cell-group inset style="margin: 16px 12px;">
      <van-cell title="🚪 退出登录" is-link @click="logout" />
    </van-cell-group>

    <Tabbar :tabs="tabs" />
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '../../stores/user';
import Tabbar from '../../components/Tabbar.vue';

const store = useUserStore();
const router = useRouter();
const user = computed(() => store.user);
const depositText = computed(() => store.depositStatus?.buyer?.paid ? '已缴纳' : '未缴纳 →');
const tabs = [
  { to: '/buyer', icon: 'home-o', label: '首页' },
  { to: '/buyer/search', icon: 'search', label: '搜索' },
  { to: '/buyer/bids', icon: 'fire-o', label: '我的报价' },
  { to: '/buyer/orders', icon: 'orders-o', label: '订单' },
  { to: '/buyer/me', icon: 'user-o', label: '我的' },
];
function logout() { store.logout(); router.replace('/login'); }
onMounted(() => { store.loadDepositStatus(); store.loadUnread(); });
</script>
