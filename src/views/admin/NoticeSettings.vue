<template>
  <div>
    <h2 style="margin-top: 0;">🔔 通知设置</h2>

    <div class="admin-card">
      <h3 style="margin-top: 0;">短信通知开关</h3>
      <p class="muted" style="margin-top: 0;">竞拍成交时是否给对应角色发送短信（不影响微信订阅消息）</p>
      <div class="toggle-row">
        <label class="switch"><input type="checkbox" v-model="s.notify_seller_sms" /><span>卖方短信通知</span></label>
        <span class="muted">货源被拍下时通知卖方</span>
      </div>
      <div class="toggle-row">
        <label class="switch"><input type="checkbox" v-model="s.notify_buyer_sms" /><span>买方短信通知</span></label>
        <span class="muted">中标/未中标时通知买方</span>
      </div>
      <div class="toggle-row">
        <label class="switch"><input type="checkbox" v-model="s.notify_platform_sms" /><span>平台方短信通知</span></label>
        <span class="muted">竞拍成交时通知下方配置的所有平台手机号</span>
      </div>
    </div>

    <div class="admin-card">
      <h3 style="margin-top: 0;">平台方接收短信手机号</h3>
      <p class="muted" style="margin-top: 0;">可配置多个手机号，每个号都会收到成交短信（仅在「平台方短信通知」打开时生效）</p>
      <div v-for="(p, i) in s.platform_phones" :key="i" class="phone-row">
        <input v-model="s.platform_phones[i]" placeholder="13xxxxxxxxx" maxlength="11" />
        <button class="btn-small btn-danger-sm" @click="removePhone(i)">删除</button>
      </div>
      <button class="btn-small" @click="addPhone">+ 添加手机号</button>
    </div>

    <div class="admin-card">
      <h3 style="margin-top: 0;">企业微信群机器人 webhook</h3>
      <p class="muted" style="margin-top: 0;">竞拍成交时往该机器人推送一条文本消息（含货源标题 + 买卖双方账号/手机号）。在企业微信群里添加「群机器人」→ 复制 Webhook URL 粘贴到此。留空 = 不发企业微信通知。</p>
      <input v-model="s.wecom_webhook_url" placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=..." style="width: 100%; padding: 8px; box-sizing: border-box;" />
    </div>

    <div class="admin-card">
      <button class="btn-primary" @click="save" :disabled="saving">{{ saving ? '保存中…' : '💾 保存设置' }}</button>
      <span v-if="lastSavedAt" class="muted" style="margin-left: 12px;">最后保存：{{ lastSavedAt }}</span>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue';
import { showSuccessToast, showFailToast } from 'vant';
import api from '../../api';
import dayjs from 'dayjs';

const s = reactive({
  notify_seller_sms: true,
  notify_buyer_sms: true,
  notify_platform_sms: false,
  platform_phones: [],
  wecom_webhook_url: '',
});
const saving = ref(false);
const lastSavedAt = ref('');

async function load() {
  const r = await api.get('/admin/notice-settings');
  Object.assign(s, r.settings);
  if (!Array.isArray(s.platform_phones)) s.platform_phones = [];
}
function addPhone() { s.platform_phones.push(''); }
function removePhone(i) { s.platform_phones.splice(i, 1); }

async function save() {
  // 过滤空号 + 校验
  const phones = s.platform_phones.map(p => String(p).trim()).filter(Boolean);
  const bad = phones.filter(p => !/^1\d{10}$/.test(p));
  if (bad.length) return showFailToast('手机号格式错误：' + bad.join(', '));
  saving.value = true;
  try {
    await api.put('/admin/notice-settings', {
      notify_seller_sms: s.notify_seller_sms,
      notify_buyer_sms: s.notify_buyer_sms,
      notify_platform_sms: s.notify_platform_sms,
      platform_phones: phones,
      wecom_webhook_url: s.wecom_webhook_url,
    });
    showSuccessToast('已保存');
    lastSavedAt.value = dayjs().format('HH:mm:ss');
    await load();
  } catch (e) {} finally { saving.value = false; }
}

onMounted(load);
</script>

<style scoped>
.toggle-row {
  display: flex; align-items: center; gap: 16px;
  padding: 10px 0; border-bottom: 1px solid #f0f0f0;
}
.toggle-row:last-of-type { border-bottom: none; }
.switch { display: flex; align-items: center; gap: 8px; cursor: pointer; min-width: 200px; }
.switch input { width: 18px; height: 18px; }
.phone-row { display: flex; gap: 8px; align-items: center; margin-bottom: 8px; max-width: 480px; }
.phone-row input { flex: 1; padding: 8px; }
.btn-primary {
  background: #f6b821; color: #fff; border: none;
  padding: 10px 28px; border-radius: 6px; cursor: pointer; font-size: 14px;
}
.btn-primary:disabled { background: #ccc; }
.btn-small {
  background: #fff; border: 1px solid #d0d0d0; padding: 6px 14px;
  border-radius: 4px; cursor: pointer; font-size: 13px;
}
.btn-danger-sm { color: #ee0a24; border-color: #ee0a24; }
</style>
