<template>
  <div>
    <h2 style="margin-top: 0;">🔔 通知设置</h2>

    <div class="admin-card">
      <h3 style="margin-top: 0;">短信通知开关</h3>
      <p class="muted" style="margin-top: 0;">报价成交时是否给对应角色发送短信（不影响微信订阅消息）</p>
      <div class="toggle-row">
        <label class="switch"><input type="checkbox" v-model="s.notify_seller_sms" /><span>卖方短信通知</span></label>
        <span class="muted">货源已成交时通知卖方</span>
      </div>
      <div class="toggle-row">
        <label class="switch"><input type="checkbox" v-model="s.notify_buyer_sms" /><span>买方短信通知</span></label>
        <span class="muted">中标/未中标时通知买方</span>
      </div>
      <div class="toggle-row">
        <label class="switch"><input type="checkbox" v-model="s.notify_platform_sms" /><span>平台方短信通知</span></label>
        <span class="muted">报价成交时通知下方配置的所有平台手机号</span>
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
      <h3 style="margin-top: 0;">📍 消息提醒推送距离</h3>
      <p class="muted" style="margin-top: 0; line-height: 1.7;">新货源 / 求购发布时，会给定位在此距离范围内的用户推送订阅消息 + 站内提醒。距离按用户主页选择的定位与货源位置计算。默认 500km。</p>
      <div style="display: flex; align-items: center; gap: 8px;">
        <input v-model.number="s.push_radius_km" type="number" min="0" max="5000" style="width: 160px; padding: 8px;" />
        <span class="muted">km</span>
      </div>
    </div>

    <div class="admin-card">
      <h3 style="margin-top: 0;">企业微信群机器人 webhook</h3>
      <p class="muted" style="margin-top: 0;">报价成交时往该机器人推送一条文本消息（含货源标题 + 买卖双方账号/手机号）。在企业微信群里添加「群机器人」→ 复制 Webhook URL 粘贴到此。留空 = 不发企业微信通知。</p>
      <input v-model="s.wecom_webhook_url" placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=..." style="width: 100%; padding: 8px; box-sizing: border-box;" />
    </div>

    <div class="admin-card">
      <h3 style="margin-top: 0;">📲 客服企业微信二维码</h3>
      <p class="muted" style="margin-top: 0; line-height: 1.7;">
        订单生成（报价成交）后会自动推送给买卖双方，提示扫码加好友以便客服后续拉群对接发货。<br/>
        二维码图片建议尺寸正方形 ≥ 400×400，清晰可扫即可。
      </p>
      <div class="qr-row">
        <div class="qr-preview">
          <img v-if="s.service_qr_url" :src="s.service_qr_url" alt="客服二维码" />
          <div v-else class="qr-placeholder">尚未上传</div>
        </div>
        <div style="flex: 1;">
          <div style="margin-bottom: 10px;">
            <label class="muted" style="display: block; margin-bottom: 4px;">归属人 / 部门名</label>
            <input v-model="s.service_qr_owner" placeholder="如：费晗 / 乘子农业" style="width: 100%; padding: 8px; box-sizing: border-box;" />
          </div>
          <div style="margin-bottom: 10px;">
            <label class="muted" style="display: block; margin-bottom: 4px;">二维码图片 URL</label>
            <input v-model="s.service_qr_url" placeholder="https://example.com/qr.png" style="width: 100%; padding: 8px; box-sizing: border-box;" />
          </div>
          <input type="file" accept="image/*" @change="uploadQr" style="display: block;" />
          <p class="muted" style="margin-top: 8px; font-size: 12px;">上传后会自动填到上方 URL 框，记得点最下方"保存设置"</p>
        </div>
      </div>
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
  push_radius_km: 500,
  service_qr_url: '',
  service_qr_owner: '',
});

async function uploadQr(e) {
  const f = e.target.files[0];
  if (!f) return;
  const fd = new FormData();
  fd.append('file', f);
  try {
    const r = await api.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    s.service_qr_url = r.url;
    showSuccessToast('已上传，记得点保存');
  } catch (err) { showFailToast(err?.message || '上传失败'); }
  e.target.value = '';
}
const saving = ref(false);
const lastSavedAt = ref('');

async function load() {
  const r = await api.get('/admin/notice-settings');
  Object.assign(s, r.settings);
  if (!Array.isArray(s.platform_phones)) s.platform_phones = [];
  try {
    const q = await api.get('/admin/service-qr');
    s.service_qr_url = q.service_qr_url || '';
    s.service_qr_owner = q.service_qr_owner || '';
  } catch (e) {}
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
      push_radius_km: s.push_radius_km,
    });
    // 客服二维码走单独接口
    await api.put('/admin/service-qr', {
      service_qr_url: s.service_qr_url,
      service_qr_owner: s.service_qr_owner,
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

.qr-row { display: flex; gap: 16px; align-items: flex-start; }
.qr-preview {
  width: 180px; height: 180px; background: #fafafa;
  border: 2px dashed #d0d0d0; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; overflow: hidden;
}
.qr-preview img { width: 100%; height: 100%; object-fit: contain; }
.qr-placeholder { color: #aaa; font-size: 13px; }
</style>
