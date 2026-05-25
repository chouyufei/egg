<template>
  <div class="page">
    <van-nav-bar title="消息中心" left-arrow @click-left="$router.back()" />
    <div v-if="!list.length" class="empty">暂无消息</div>
    <van-cell-group v-else inset style="margin: 12px;">
      <van-cell v-for="m in list" :key="m.id" :title="m.title" :label="m.content" :value="formatTime(m.created_at)">
        <template #icon><span style="margin-right: 8px;">{{ iconFor(m.type) }}</span></template>
      </van-cell>
    </van-cell-group>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import api from '../../api';
import dayjs from 'dayjs';

const list = ref([]);

function iconFor(t) {
  return ({
    new_bid: '💰', outbid: '⚠️', auction_won: '🎉', auction_failed: '😔', auction_extended: '⏱',
    order_completed: '✅', order_auto_complete: '🤖', group_created: '👥',
    qualify_approved: '✔️', qualify_rejected: '❌',
    dispute_raised: '⚖️', dispute_resolved: '🤝',
    deposit_deducted: '💸', resource_takedown: '🚫',
  }[t] || '📩');
}
function formatTime(t) { return dayjs(t).format('MM-DD HH:mm'); }

onMounted(async () => {
  const { messages } = await api.get('/messages');
  list.value = messages;
  await api.post('/messages/read', {});
});
</script>
