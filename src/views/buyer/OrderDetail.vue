<template>
  <div class="page" v-if="order">
    <van-nav-bar title="订单详情" left-arrow @click-left="$router.back()" />

    <div class="card" style="margin: 12px;">
      <div class="row-between">
        <span style="font-weight: 600;">订单 #{{ order.id }}</span>
        <van-tag :type="statusType(order.status)">{{ statusLabel(order.status) }}</van-tag>
      </div>
      <van-cell-group :border="false" style="margin-top: 8px;">
        <van-cell title="资源" :value="order.resource?.title" />
        <van-cell title="成交价" :value="`¥${order.final_price}`" />
        <van-cell title="数量" :value="`${order.quantity} 枚`" />
        <van-cell title="养殖场" :value="order.farm?.name" />
        <van-cell title="联系电话" :value="order.farm?.phone" />
      </van-cell-group>
    </div>

    <div class="card" style="margin: 12px;">
      <div class="section-title" style="margin: 0 0 8px;">沟通群</div>
      <div v-if="!order.group_id" style="text-align: center; padding: 10px 0;">
        <div class="muted" style="margin-bottom: 12px;">中标后请尽快建群联系养殖场，否则会扣除保证金</div>
        <van-button type="primary" round @click="createGroup">建立沟通群</van-button>
      </div>
      <div v-else>
        <div class="muted">群编号：{{ order.group_id }}</div>
        <div style="max-height: 240px; overflow: auto; margin: 10px 0; padding: 8px; background: #f5f6f8; border-radius: 8px;">
          <div v-for="c in chats" :key="c.id" :style="{ textAlign: c.sender_id === order.buyer_id ? 'right' : 'left', margin: '6px 0' }">
            <div class="muted" style="font-size: 11px;">{{ c.sender_name }} · {{ formatTime(c.created_at) }}</div>
            <div :style="{ display: 'inline-block', maxWidth: '70%', padding: '6px 10px', borderRadius: '12px', background: c.sender_id === order.buyer_id ? '#f6b821' : '#fff', color: c.sender_id === order.buyer_id ? '#fff' : '#1d1d1f' }">
              {{ c.content }}
            </div>
          </div>
          <div v-if="!chats.length" class="muted" style="text-align: center; padding: 20px;">还没有消息</div>
        </div>
        <van-field v-model="msg" placeholder="输入消息..." :border="true">
          <template #button>
            <van-button size="small" type="primary" @click="send">发送</van-button>
          </template>
        </van-field>
      </div>
    </div>

    <div class="card" style="margin: 12px;" v-if="order.status === 'communicating' || order.status === 'pending_group'">
      <van-button block type="primary" round @click="confirm">确认收货</van-button>
      <div class="muted" style="text-align: center; margin-top: 8px;">7天未操作系统自动确认</div>
      <van-button block plain style="margin-top: 8px;" @click="showDispute = true">货不对板，发起纠纷</van-button>
    </div>

    <van-dialog v-model:show="showDispute" title="发起纠纷" show-cancel-button @confirm="submitDispute">
      <div style="padding: 16px;">
        <van-field v-model="dispute.type" label="类型" placeholder="如：货不对板/数量不足" />
        <van-field v-model="dispute.description" type="textarea" rows="3" label="描述" placeholder="请详细描述情况" />
      </div>
    </van-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { showSuccessToast, showConfirmDialog } from 'vant';
import api from '../../api';
import dayjs from 'dayjs';

const route = useRoute();
const router = useRouter();
const order = ref(null);
const chats = ref([]);
const msg = ref('');
const showDispute = ref(false);
const dispute = reactive({ type: '', description: '' });
let poll = null;

function formatTime(t) { return dayjs(t).format('MM-DD HH:mm'); }
function statusLabel(s) { return { pending_group: '待拉群', communicating: '沟通中', completed: '已完成', cancelled: '已取消', disputed: '纠纷中' }[s]; }
function statusType(s) { return ({ pending_group: 'warning', communicating: 'primary', completed: 'success', cancelled: 'default', disputed: 'danger' }[s] || 'default'); }

async function load() {
  const data = await api.get(`/orders/${route.params.id}`);
  order.value = data.order;
  chats.value = data.chats;
}
async function createGroup() {
  await api.post(`/orders/${route.params.id}/create-group`);
  showSuccessToast('沟通群已创建');
  await load();
}
async function send() {
  if (!msg.value.trim()) return;
  await api.post(`/orders/${route.params.id}/chat`, { content: msg.value });
  msg.value = '';
  await load();
}
async function confirm() {
  try { await showConfirmDialog({ title: '确认收货', message: '确认后保证金将释放，且无法发起纠纷' }); }
  catch (e) { return; }
  await api.post(`/orders/${route.params.id}/confirm`);
  showSuccessToast('已确认收货');
  await load();
}
async function submitDispute() {
  if (!dispute.type) return;
  await api.post(`/orders/${route.params.id}/dispute`, dispute);
  showSuccessToast('纠纷已提交');
  await load();
}

onMounted(async () => { await load(); poll = setInterval(load, 5000); });
onUnmounted(() => clearInterval(poll));
</script>
