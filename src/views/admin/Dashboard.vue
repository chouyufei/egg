<template>
  <div>
    <h2 style="margin-top: 0;">📊 数据看板</h2>
    <div class="stat-grid">
      <div class="stat"><div class="v">{{ stats.farmCount }}</div><div class="l">养殖场</div></div>
      <div class="stat"><div class="v">{{ stats.buyerCount }}</div><div class="l">采购商</div></div>
      <div class="stat"><div class="v">{{ stats.activeAuctions }}</div><div class="l">竞拍中</div></div>
      <div class="stat"><div class="v">{{ stats.soldCount }}</div><div class="l">成交数</div></div>
      <div class="stat"><div class="v price">¥{{ formatMoney(stats.gmv) }}</div><div class="l">累计成交额 (GMV)</div></div>
      <div class="stat"><div class="v">¥{{ stats.avgPrice }}</div><div class="l">平均成交价</div></div>
      <div class="stat"><div class="v">{{ stats.successRate }}%</div><div class="l">成交率</div></div>
      <div class="stat"><div class="v" :class="stats.premiumRate >= 0 ? 'brand-text' : 'price'">{{ stats.premiumRate >= 0 ? '+' : '' }}{{ stats.premiumRate }}%</div><div class="l">平均溢价率</div></div>
      <div class="stat" :style="stats.openDisputes ? 'border:1px solid #ee0a24' : ''">
        <div class="v price">{{ stats.openDisputes }}</div><div class="l">待处理纠纷</div>
      </div>
    </div>

    <div class="admin-card" style="margin-top: 24px;">
      <h3 style="margin-top: 0;">关键业务规则</h3>
      <ul style="line-height: 2; color: #555;">
        <li>每次加价 ≥ <b>2 元</b>；最后 5 分钟有出价 → 自动延时 5 分钟（最多 3 次）</li>
        <li>养殖场 <b>1000 元</b> 品质保证金；采购商 <b>200 元</b> 竞拍保证金（同时仅冻结 1 笔）</li>
        <li>中标 <b>7 天内</b> 未拉群 → 扣除 200 元；恶意拉黑 → 永久没收</li>
        <li>沟通完成 7 天采购商未确认 → 系统自动确认并释放保证金</li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import api from '../../api';
const stats = ref({ farmCount: 0, buyerCount: 0, activeAuctions: 0, soldCount: 0, failedCount: 0, gmv: 0, avgPrice: 0, successRate: 0, premiumRate: 0, openDisputes: 0 });
function formatMoney(n) { return Number(n).toLocaleString('zh-CN', { maximumFractionDigits: 2 }); }
onMounted(async () => { stats.value = await api.get('/admin/stats'); });
</script>
