<template>
  <div class="page" style="background: linear-gradient(180deg, #ffd84d 0%, #f6b821 40%, #fff 100%); min-height: 100vh; padding: 24px;">
    <div style="text-align: center; padding: 40px 0 16px;">
      <div style="font-size: 56px;">🥚</div>
      <h1 style="margin: 8px 0 4px; font-size: 28px; color: #fff; text-shadow: 0 2px 6px rgba(0,0,0,.1);">风伯乐</h1>
      <p style="margin: 0; color: #fff; opacity: .9;">让你的蛋，自己定价</p>
    </div>

    <div class="card" style="margin-top: 30px; padding: 20px;">
      <div class="section-title" style="margin: 0 0 12px;">选择身份</div>
      <van-radio-group v-model="role" direction="horizontal">
        <van-radio name="farm" icon-size="16px">🐔 养殖场</van-radio>
        <van-radio name="buyer" icon-size="16px">🛒 采购商</van-radio>
        <van-radio name="admin" icon-size="16px">⚙️ 管理员</van-radio>
      </van-radio-group>

      <div style="height: 14px"></div>

      <van-field v-model="phone" label="手机号" placeholder="请输入手机号" type="digit" maxlength="11" />
      <van-field v-model="otp" label="验证码" placeholder="演示请用 123456" type="digit" maxlength="6">
        <template #button>
          <van-button size="small" type="primary" plain @click="sendOtp" :loading="sendingOtp" :disabled="cd > 0">
            {{ cd > 0 ? `${cd}s` : '获取' }}
          </van-button>
        </template>
      </van-field>

      <van-button block round type="primary" style="margin-top: 16px;" :loading="loading" @click="onLogin">登录 / 注册</van-button>

      <div class="muted" style="margin-top: 14px; line-height: 1.7; text-align: center;">
        演示账号：管理员 13800000000 · 养殖场 13800000001 · 采购商 13900000001<br/>
        所有验证码统一为 <b>123456</b>
      </div>
    </div>

    <div style="text-align: center; color: #fff; font-size: 12px; margin-top: 30px; opacity: .8;">
      ✓ 自主竞拍 · ✓ 双向保证金 · ✓ 7 天自动结算
    </div>
  </div>
</template>

<script setup>
import { ref, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { showSuccessToast, showFailToast } from 'vant';
import api from '../../api';
import { useUserStore } from '../../stores/user';

const router = useRouter();
const store = useUserStore();

const role = ref('buyer');
const phone = ref('');
const otp = ref('');
const loading = ref(false);
const sendingOtp = ref(false);
const cd = ref(0);
let timer = null;

async function sendOtp() {
  if (!/^1\d{10}$/.test(phone.value)) return showFailToast('手机号格式错误');
  sendingOtp.value = true;
  try {
    await api.post('/auth/send-otp', { phone: phone.value });
    showSuccessToast('验证码：123456');
    cd.value = 60;
    timer = setInterval(() => { cd.value--; if (cd.value <= 0) clearInterval(timer); }, 1000);
  } finally { sendingOtp.value = false; }
}

async function onLogin() {
  if (!phone.value || !otp.value) return showFailToast('请填写手机号和验证码');
  loading.value = true;
  try {
    const u = await store.login(phone.value, otp.value, role.value);
    showSuccessToast('登录成功');
    if (u.role === 'farm') router.replace('/farm');
    else if (u.role === 'admin') router.replace('/admin');
    else router.replace('/buyer');
  } catch (e) {
  } finally { loading.value = false; }
}

onUnmounted(() => clearInterval(timer));
</script>
