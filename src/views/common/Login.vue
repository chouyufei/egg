<template>
  <div class="page" style="background: linear-gradient(180deg, #ffd84d 0%, #f6b821 40%, #fff 100%); min-height: 100vh; padding: 24px;">
    <div style="text-align: center; padding: 40px 0 16px;">
      <div style="font-size: 56px;">🥚</div>
      <h1 style="margin: 8px 0 4px; font-size: 28px; color: #fff; text-shadow: 0 2px 6px rgba(0,0,0,.1);">凤伯乐</h1>
      <p style="margin: 0; color: #fff; opacity: .9;">管理后台</p>
    </div>

    <div class="card" style="margin-top: 30px; padding: 20px; max-width: 420px; margin-left: auto; margin-right: auto;">
      <div style="text-align: center; font-size: 18px; font-weight: 600; margin-bottom: 16px;">⚙️ 管理员登录</div>

      <van-field v-model="username" label="账号" placeholder="请输入管理员账号" autofocus @keyup.enter="onLogin" />
      <van-field v-model="password" label="密码" type="password" placeholder="请输入密码" @keyup.enter="onLogin" />

      <van-button block round type="primary" style="margin-top: 16px;" :loading="loading" @click="onLogin">登录</van-button>

      <div class="muted" style="margin-top: 14px; line-height: 1.7; text-align: center; font-size: 12px;">
        默认账号：<b>admin</b> · 默认密码：<b>123456</b><br/>
        登录后请到「管理员设置」修改密码<br/>
        养殖场 / 采购商请使用<b>微信小程序</b>登录
      </div>
    </div>

    <div style="text-align: center; color: #fff; font-size: 12px; margin-top: 30px; opacity: .8;">
      ✓ 用户管理 · ✓ 资源监管 · ✓ 保证金 · ✓ 纠纷仲裁 · ✓ 管理员设置
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { showSuccessToast, showFailToast } from 'vant';
import api from '../../api';
import { useUserStore } from '../../stores/user';

const router = useRouter();
const store = useUserStore();

const username = ref('');
const password = ref('');
const loading = ref(false);

async function onLogin() {
  if (!username.value || !password.value) return showFailToast('请填写账号和密码');
  loading.value = true;
  try {
    const { token, user } = await api.post('/auth/admin-login', {
      username: username.value,
      password: password.value,
    });
    store.token = token;
    store.user = user;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    showSuccessToast('登录成功');
    router.replace('/admin');
  } catch (e) {
  } finally { loading.value = false; }
}
</script>
