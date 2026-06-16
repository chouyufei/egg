<template>
  <div class="card shadow-sm" @click="$emit('click')" style="overflow: hidden; padding: 0;">
    <div style="position: relative;">
      <img :src="cover" :alt="r.title" style="width: 100%; height: 180px; object-fit: cover; display: block;"
           onerror="this.src='https://via.placeholder.com/600x300/f6b821/ffffff?text=Egg'" />
      <div :class="['pill', statusPill]" style="position: absolute; top: 10px; left: 10px; font-size: 12px; padding: 3px 10px;">
        {{ statusLabel }}
      </div>
      <div v-if="r.status === 'auctioning'" style="position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.6); color: #fff; padding: 4px 8px; border-radius: 10px; font-size: 12px;">
        剩余 <Countdown :end-at="r.end_at" />
      </div>
    </div>
    <div style="padding: 10px 14px 14px;">
      <div style="font-weight: 600; font-size: 15px; line-height: 1.4;">{{ r.title }}</div>
      <div class="tag-line">
        <van-tag plain type="warning" size="medium" v-if="r.egg_color">{{ r.egg_color }}</van-tag>
        <van-tag plain v-if="r.weight_spec">{{ r.weight_spec }}</van-tag>
        <van-tag plain type="success" v-if="r.region">{{ r.region }}</van-tag>
      </div>
      <div class="row-between" style="margin-top: 10px;">
        <div>
          <span class="price-large">¥{{ r.current_price }}</span>
          <span class="muted" style="margin-left: 4px;">起拍 ¥{{ r.start_price }}</span>
        </div>
        <div class="muted">{{ r.bid_count || 0 }} 次出价</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import Countdown from './Countdown.vue';
const props = defineProps({ r: Object });
defineEmits(['click']);
const cover = computed(() => (props.r.photos && props.r.photos[0]) || 'https://via.placeholder.com/600x300/f6b821/ffffff?text=Egg');
const statusLabel = computed(() => ({ auctioning: '竞价中', sold: '已成交', failed: '已流拍', cancelled: '已取消', draft: '草稿' }[props.r.status]));
const statusPill = computed(() => ({ auctioning: 'pill-y', sold: 'pill-g', failed: 'pill-d', cancelled: 'pill-d', draft: 'pill-b' }[props.r.status]));
</script>
