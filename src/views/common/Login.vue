<template>
  <div class="page" style="background: linear-gradient(180deg, #ffd84d 0%, #f6b821 40%, #fff 100%); min-height: 100vh; padding: 24px;">
    <div style="text-align: center; padding: 40px 0 16px;">
      <div style="font-size: 56px;">🥚</div>
      <h1 style="margin: 8px 0 4px; font-size: 28px; color: #fff; text-shadow: 0 2px 6px rgba(0,0,0,.1);">凤伯乐</h1>
      <p style="margin: 0; color: #fff; opacity: .9;">管理后台</p>
    </div>

    <div class="card" style="margin-top: 30px; padding: 20px; max-width: 420px; margin-left: auto; margin-right: auto;">
      <div style="text-align: center; font-size: 18px; font-weight: 600; margin-bottom: 16px;">⚙️ 管理员登录</div>

      <van-field v-model="phone" label="手机号" placeholder="请输入管理员手机号" type="digit" maxlength="11" />
      <van-field v-model="otp" label="验证码" placeholder="演示请用 123456" type="digit" maxlength="6" />

      <van-button block round type="primary" style="margin-top: 16px;" :loading="loading" @click="onLogin">登录</van-button>

      <div class="muted" style="margin-top: 14px; line-height: 1.7; text-align: center; font-size: 12px;">
        演示账号：<b>13800000000</b> · 验证码 <b>123456</b><br/>
        养殖场 / 采购商请使用<b>微信小程序</b>登录
      </div>
    </div>

    <div style="text-align: center; color: #fff; font-size: 12px; margin-top: 30px; opacity: .8;">
      ✓ 用户管理 · ✓ 资源监管 · ✓ 保证金 · ✓ 纠纷仲裁
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { showSuccessToast, showFailToast } from 'vant';
import { useUserStore } from '../../stores/user';

const router = useRouter();
const store = useUserStore();

const phone = ref('');
const otp = ref('');
const loading = ref(false);

async function onLogin() {
  if (!phone.value || !otp.value) return showFailToast('请填写手机号和验证码');
  loading.value = true;
  try {
    const u = await store.login(phone.value, otp.value);
    if (u.role !== 'admin') {
      store.logout();
      showFailToast('该账号非管理员，请使用微信小程序登录');
      return;
    }
    showSuccessToast('登录成功');
    router.replace('/admin');
  } catch (e) {
  } finally { loading.value = false; }
}
</script>
