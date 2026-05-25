<template>
  <div class="page">
    <van-nav-bar title="品质保证金" left-arrow @click-left="$router.back()" />

    <div class="card" style="margin: 12px;">
      <div style="font-size: 16px; font-weight: 600;">品质保证金说明</div>
      <div class="muted" style="margin-top: 6px; line-height: 1.7;">
        养殖场需缴纳 <b>1000 元</b> 品质保证金。<br/>
        - 货不对板：扣除 200 元 + 退还差价<br/>
        - 长期不发货：扣除 1000 元 + 200 元 + 退款<br/>
        - 严重违规：永久没收，封禁账号
      </div>
    </div>

    <div class="card" style="margin: 12px;">
      <div class="row-between">
        <div>
          <div class="muted">应缴保证金</div>
          <div class="price-large">¥ 1000</div>
        </div>
        <div>
          <van-tag v-if="status?.farm?.paid" type="success" size="large">已缴纳</van-tag>
          <van-tag v-else type="warning" size="large">未缴纳</van-tag>
        </div>
      </div>
      <van-button block round type="primary" style="margin-top: 16px;"
                  :disabled="store.user?.license_status !== 'approved' || status?.farm?.paid"
                  :loading="paying" @click="pay">
        {{ status?.farm?.paid ? '已缴纳' : '立即缴纳 ¥1000（演示模式）' }}
      </van-button>
      <div v-if="store.user?.license_status !== 'approved'" class="muted" style="margin-top: 8px; text-align: center;">
        资质审核通过后方可缴纳
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { showSuccessToast } from 'vant';
import api from '../../api';
import { useUserStore } from '../../stores/user';

const store = useUserStore();
const status = ref(null);
const paying = ref(false);

async function load() { status.value = await api.get('/deposits/status'); }
async function pay() {
  paying.value = true;
  try { await api.post('/deposits/pay', { type: 'farm_quality' }); showSuccessToast('保证金已缴纳'); await load(); await store.loadDepositStatus(); }
  finally { paying.value = false; }
}
onMounted(load);
</script>
