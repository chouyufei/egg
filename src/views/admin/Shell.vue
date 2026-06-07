<template>
  <div class="admin-shell">
    <aside class="admin-sidebar">
      <h1>🥚 凤伯乐 · 管理后台</h1>
      <router-link to="/admin" exact-active-class="active" :class="{ active: $route.path === '/admin' }">📊 数据看板</router-link>
      <router-link to="/admin/users" active-class="active">👤 用户管理</router-link>
      <router-link to="/admin/qualifications" active-class="active">📜 资质审核</router-link>
      <router-link to="/admin/resources" active-class="active">🛒 资源监管</router-link>
      <router-link to="/admin/deposits" active-class="active">💰 保证金</router-link>
      <router-link to="/admin/deposit-settings" active-class="active">💴 保证金金额规则</router-link>
      <router-link to="/admin/disputes" active-class="active">⚖️ 纠纷仲裁</router-link>
      <router-link to="/admin/notice" active-class="active">🔔 通知设置</router-link>
      <router-link to="/admin/settings" active-class="active">⚙️ 管理员设置</router-link>

      <div style="margin-top: 30px; padding: 12px 16px; border-top: 1px solid #2a2a2c; color: #999; font-size: 12px;">
        登录：{{ store.user?.name }}<br/>
        <a href="#" @click.prevent="logout" style="color: #f6b821; padding: 0; border: none;">退出</a>
      </div>
    </aside>
    <main class="admin-main">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { useUserStore } from '../../stores/user';
import { useRouter } from 'vue-router';
const store = useUserStore();
const router = useRouter();
function logout() { store.logout(); router.replace('/login'); }
</script>
