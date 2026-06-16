<template>
  <div class="page" v-if="resource">
    <van-nav-bar title="资源详情" left-arrow @click-left="$router.back()" />
    <van-swipe :autoplay="3500" lazy-render style="height: 240px;">
      <van-swipe-item v-for="(p, i) in resource.photos" :key="i">
        <img :src="p" style="width: 100%; height: 240px; object-fit: cover;" onerror="this.src='https://via.placeholder.com/800x300/f6b821/ffffff?text=Egg'"/>
      </van-swipe-item>
      <van-swipe-item v-if="!resource.photos.length">
        <img src="https://via.placeholder.com/800x300/f6b821/ffffff?text=Egg" style="width:100%;height:240px;object-fit:cover;"/>
      </van-swipe-item>
    </van-swipe>

    <div class="card" style="margin: -16px 12px 12px; position: relative; z-index: 1;">
      <div class="row-between">
        <div>
          <div class="muted">当前价</div>
          <div class="price-large">¥{{ resource.current_price }}</div>
          <div class="muted">起拍 ¥{{ resource.start_price }} · 加价 ¥{{ resource.min_increment }}</div>
        </div>
        <div style="text-align: right;">
          <div class="muted">{{ resource.status === 'auctioning' ? '剩余时间' : statusLabel }}</div>
          <div v-if="resource.status === 'auctioning'" style="margin-top: 4px;"><Countdown :end-at="resource.end_at" @end="reload" /></div>
          <div v-if="resource.extend_count > 0" class="muted" style="margin-top: 2px;">已延时 {{ resource.extend_count }} 次</div>
        </div>
      </div>
      <div style="font-size: 16px; font-weight: 600; margin-top: 12px;">{{ resource.title }}</div>
      <div class="tag-line" style="margin-top: 6px;">
        <van-tag plain type="warning" v-if="resource.egg_color">{{ resource.egg_color }}</van-tag>
        <van-tag plain v-if="resource.weight_spec">{{ resource.weight_spec }}</van-tag>
        <van-tag plain type="success" v-if="resource.region">{{ resource.region }}</van-tag>
        <van-tag plain v-if="resource.chicken_breed">{{ resource.chicken_breed }}</van-tag>
      </div>
    </div>

    <div class="card" style="margin: 0 12px 12px;">
      <div class="section-title" style="margin: 0 0 8px;">参数明细</div>
      <van-cell-group :border="false">
        <van-cell title="数量" :value="`${resource.quantity} 枚`" />
        <van-cell title="蛋壳质量" :value="resource.shell_quality || '-'" />
        <van-cell title="鲜度" :value="resource.freshness_days ? `${resource.freshness_days} 天内` : '-'" />
        <van-cell title="规模" :value="resource.farm_size ? `${resource.farm_size} 只` : '-'" />
        <van-cell title="养殖场" :value="resource.farm?.name || '-'" />
      </van-cell-group>
      <div style="margin-top: 6px; line-height: 1.6;">{{ resource.description }}</div>
    </div>

    <div class="card" style="margin: 0 12px 12px;">
      <div class="row-between section-title" style="margin: 0 0 8px;">
        <span>出价记录 ({{ bids.length }})</span>
        <span class="muted">{{ resource.bidder_count }} 位买家参与</span>
      </div>
      <div v-if="!bids.length" class="empty" style="padding: 20px 0;">暂无出价，期待您的第一次出价</div>
      <van-cell v-for="b in bids.slice(0, 10)" :key="b.id" :title="`${b.bidder_name} ${b.is_auto ? '（自动）' : ''}`" :label="formatTime(b.created_at)">
        <template #value><span class="price">¥{{ b.price }}</span></template>
      </van-cell>
    </div>

    <div style="height: 80px;"></div>

    <div class="bid-bar" v-if="resource.status === 'auctioning'">
      <van-button plain type="primary" size="small" @click="showAuto = true">⚙️ 自动</van-button>
      <van-field v-model="bidPrice" type="number" placeholder="出价 ≥ 加价后金额" style="flex:1; background: #f5f6f8; border-radius: 20px; padding: 6px 12px;" />
      <van-button type="primary" round @click="placeBid" :loading="bidding">出价 ¥{{ minBid }}</van-button>
    </div>
    <div class="bid-bar" v-else>
      <van-button block disabled>{{ statusLabel }}</van-button>
    </div>

    <van-dialog v-model:show="showAuto" title="设置自动出价" show-cancel-button @confirm="setAuto">
      <div style="padding: 16px;">
        <div class="muted" style="margin-bottom: 8px;">设置最高心理价位，系统将自动以最低加价帮您出价，直到您拍下或超出心理价。</div>
        <van-field v-model="autoMax" type="number" label="最高出价" placeholder="如 9000" />
      </div>
    </van-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import { showSuccessToast, showFailToast, showConfirmDialog } from 'vant';
import api from '../../api';
import Countdown from '../../components/Countdown.vue';
import dayjs from 'dayjs';
import { useUserStore } from '../../stores/user';

const route = useRoute();
const store = useUserStore();
const resource = ref(null);
const bids = ref([]);
const bidPrice = ref('');
const bidding = ref(false);
const showAuto = ref(false);
const autoMax = ref('');
let poll = null;

const minBid = computed(() => {
  if (!resource.value) return 0;
  return Number((resource.value.current_price + resource.value.min_increment).toFixed(2));
});
const statusLabel = computed(() => ({ auctioning: '竞价中', sold: '已成交', failed: '已流拍', cancelled: '已取消' }[resource.value?.status]));

function formatTime(t) { return dayjs(t).format('MM-DD HH:mm:ss'); }

async function reload() {
  const { resource: r, bids: bs } = await api.get(`/resources/${route.params.id}`);
  resource.value = r;
  bids.value = bs;
  bidPrice.value = String(Number((r.current_price + r.min_increment).toFixed(2)));
}

async function placeBid() {
  if (!resource.value) return;
  await store.loadDepositStatus();
  if (!store.depositStatus?.buyer?.paid) {
    try { await showConfirmDialog({ title: '需要保证金', message: '您还未缴纳 200 元竞价保证金，是否前往缴纳？' }); }
    catch (e) { return; }
    location.hash = '#/buyer/deposit';
    return;
  }
  const price = Number(bidPrice.value);
  if (!price) return showFailToast('请输入出价金额');
  if (price < minBid.value) return showFailToast(`出价至少 ¥${minBid.value}`);
  bidding.value = true;
  try {
    await api.post('/bids', { resource_id: resource.value.id, price });
    showSuccessToast('出价成功');
    await reload();
  } catch (e) {} finally { bidding.value = false; }
}

async function setAuto() {
  const max = Number(autoMax.value);
  if (!max || max < minBid.value) return showFailToast(`最高价需 ≥ ¥${minBid.value}`);
  try {
    await api.post('/bids/auto', { resource_id: resource.value.id, max_price: max });
    showSuccessToast('自动出价已开启');
    await reload();
  } catch (e) {}
}

onMounted(async () => {
  await reload();
  poll = setInterval(reload, 5000);
});
onUnmounted(() => clearInterval(poll));
</script>
