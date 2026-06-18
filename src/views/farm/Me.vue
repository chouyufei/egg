<template>
  <div class="page">
    <div class="hero-banner" style="border-radius: 0 0 24px 24px; padding: 24px 16px 32px;">
      <div class="row" style="gap: 14px;">
        <van-image round width="56" height="56" :src="user?.avatar || 'https://api.dicebear.com/7.x/icons/svg?seed=' + user?.phone" />
        <div>
          <div style="font-size: 18px; font-weight: 700;">{{ user?.name }}</div>
          <div class="hero-sub">养殖场 · {{ user?.phone }}</div>
          <van-tag size="small" :type="licTag" style="margin-top: 4px;">{{ licLabel }}</van-tag>
        </div>
      </div>
    </div>

    <van-cell-group inset style="margin: 16px 12px;">
      <van-cell title="📜 资质认证" :value="licLabel" is-link to="/farm/qualify" />
      <van-cell title="💰 服务保障金" :value="depositText" is-link to="/farm/deposit" />
      <van-cell title="📩 消息中心" is-link to="/farm/messages" :value="store.unreadCount ? `${store.unreadCount} 条未读` : ''" />
      <van-cell title="📦 我的订单" is-link to="/farm/orders" />
      <van-cell title="🛍️ 我的资源" is-link to="/farm/resources" />
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
const tabs = [
  { to: '/farm', icon: 'home-o', label: '工作台' },
  { to: '/farm/resources', icon: 'shop-o', label: '资源' },
  { to: '/farm/publish', icon: 'plus', label: '发布' },
  { to: '/farm/orders', icon: 'orders-o', label: '订单' },
  { to: '/farm/me', icon: 'user-o', label: '我的' },
];
const licLabel = computed(() => ({ pending: '审核中', approved: '已通过', rejected: '未通过', none: '未提交' }[user.value?.license_status] || '未提交'));
const licTag = computed(() => ({ pending: 'warning', approved: 'success', rejected: 'danger', none: 'default' }[user.value?.license_status]));
const depositText = computed(() => store.depositStatus?.farm?.paid ? '已缴纳' : '未缴纳 →');

function logout() { store.logout(); router.replace('/login'); }
onMounted(async () => { await store.refresh(); await store.loadDepositStatus(); await store.loadUnread(); });
</script>
