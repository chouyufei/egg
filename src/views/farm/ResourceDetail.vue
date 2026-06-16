<template>
  <div class="page" v-if="resource">
    <van-nav-bar title="资源详情" left-arrow @click-left="$router.back()" />
    <van-swipe :autoplay="3500" lazy-render style="height: 220px;">
      <van-swipe-item v-for="(p, i) in resource.photos" :key="i">
        <img :src="p" style="width: 100%; height: 220px; object-fit: cover;" onerror="this.src='https://via.placeholder.com/800x300/f6b821/ffffff?text=Egg'"/>
      </van-swipe-item>
      <van-swipe-item v-if="!resource.photos.length">
        <img src="https://via.placeholder.com/800x300/f6b821/ffffff?text=Egg" style="width:100%;height:220px;object-fit:cover;"/>
      </van-swipe-item>
    </van-swipe>

    <div class="card" style="margin: -16px 12px 12px;">
      <div class="row-between">
        <div>
          <div class="muted">当前价</div>
          <div class="price-large">¥{{ resource.current_price }}</div>
          <div class="muted">起拍 ¥{{ resource.start_price }} · 加价 ¥{{ resource.min_increment }}</div>
        </div>
        <div style="text-align: right;">
          <van-tag :type="statusType" size="large">{{ statusLabel }}</van-tag>
          <div v-if="resource.status === 'auctioning'" style="margin-top: 6px;">剩 <Countdown :end-at="resource.end_at" @end="load" /></div>
          <div v-if="resource.extend_count > 0" class="muted" style="margin-top: 2px;">已延时 {{ resource.extend_count }} 次</div>
        </div>
      </div>
      <div style="font-weight: 600; font-size: 16px; margin-top: 12px;">{{ resource.title }}</div>
      <div class="row-between" style="margin-top: 10px;">
        <span class="muted">{{ resource.bid_count }} 次出价 · {{ resource.bidder_count }} 位买家</span>
      </div>
    </div>

    <div class="card" style="margin: 0 12px 12px;">
      <div class="section-title" style="margin: 0 0 8px;">出价记录</div>
      <div v-if="!bids.length" class="empty" style="padding: 20px 0;">暂无出价</div>
      <van-cell v-for="b in bids" :key="b.id" :title="`${b.bidder_name} ${b.is_auto ? '（自动）' : ''}`" :label="format(b.created_at)">
        <template #value><span class="price">¥{{ b.price }}</span></template>
      </van-cell>
    </div>

    <div v-if="resource.status === 'auctioning' && resource.bid_count === 0" style="padding: 12px;">
      <van-button block plain type="danger" @click="cancel">取消竞价</van-button>
      <div class="muted" style="text-align: center; margin-top: 6px;">已有出价后不可取消</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { showSuccessToast, showConfirmDialog } from 'vant';
import api from '../../api';
import Countdown from '../../components/Countdown.vue';
import dayjs from 'dayjs';

const route = useRoute();
const router = useRouter();
const resource = ref(null);
const bids = ref([]);
let poll = null;

const statusLabel = computed(() => ({ auctioning: '竞价中', sold: '已成交', failed: '已流拍', cancelled: '已取消', draft: '草稿' }[resource.value?.status]));
const statusType = computed(() => ({ auctioning: 'warning', sold: 'success', failed: 'default', cancelled: 'default' }[resource.value?.status] || 'default'));

function format(t) { return dayjs(t).format('MM-DD HH:mm:ss'); }

async function load() {
  const { resource: r, bids: bs } = await api.get(`/resources/${route.params.id}`);
  resource.value = r;
  bids.value = bs;
}

async function cancel() {
  try { await showConfirmDialog({ title: '取消竞价', message: '确认取消该竞价？' }); }
  catch (e) { return; }
  await api.post(`/resources/${route.params.id}/cancel`);
  showSuccessToast('已取消');
  router.back();
}

onMounted(async () => { await load(); poll = setInterval(load, 5000); });
onUnmounted(() => clearInterval(poll));
</script>
