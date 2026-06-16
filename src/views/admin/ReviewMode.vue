<template>
  <div>
    <h2 style="margin-top: 0;">🛡️ 审核模式总开关</h2>

    <div class="admin-card warn">
      <h3 style="margin-top: 0;">用途</h3>
      <p style="margin: 0; line-height: 1.8;">
        微信小程序审核时，「保证金」「钱包充值/提现」「拍卖竞价」「自营资金池」等
        功能容易被驳回。打开「审核模式」后，小程序前端会自动：<br/>
        · 隐藏 <strong>钱包 / 充值 / 提现 / 保证金</strong> 入口<br/>
        · 隐藏 <strong>出价 / 报价</strong> 输入区，改为「📞 联系客服咨询」按钮<br/>
        · 关闭顶部「买 / 卖」切换，只保留「🥚 浏览货源」<br/>
        · 进入发布页 / 钱包页 自动跳回首页并提示"功能升级中"<br/><br/>
        审核员看到的是一个 <strong>纯浏览 + 客服咨询</strong> 的极简版本，通过率显著提升。<br/>
        <strong>审核通过后立即关掉本开关</strong>，全部功能即时恢复。
      </p>
    </div>

    <div class="admin-card">
      <div class="big-toggle">
        <label class="switch-big">
          <input type="checkbox" v-model="reviewMode" @change="save" />
          <span class="track" :class="{ on: reviewMode }">
            <span class="thumb"></span>
          </span>
        </label>
        <div>
          <div class="state">{{ reviewMode ? '审核模式 · 已开启' : '正常模式 · 已开启' }}</div>
          <div class="muted">{{ reviewMode ? '小程序前端正藏起复杂功能' : '小程序前端全部功能可用' }}</div>
        </div>
      </div>
      <p class="muted" style="margin-top: 16px; font-size: 13px;">
        💡 切换立即生效，小程序用户下次启动 / 切换页面时拉取新配置。
        没等到刷新的可以让用户「下拉刷新」首页或彻底退出再进。
      </p>
    </div>

    <div v-if="reviewMode" class="admin-card tip">
      <h3 style="margin-top: 0;">提审建议</h3>
      <ol style="line-height: 1.9; padding-left: 22px;">
        <li>类目选「商业服务 - 供应链管理」或「农林牧渔」</li>
        <li>不要勾选含"拍卖"的二级类目</li>
        <li>用户协议 / 隐私政策必须挂出，链接可点</li>
        <li>留管理员测试账号 + 截图全部功能演示路径</li>
        <li>过审后第一时间关掉本开关</li>
      </ol>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { showSuccessToast, showFailToast } from 'vant';
import api from '../../api';

const reviewMode = ref(false);

async function load() {
  try {
    const r = await api.get('/admin/review-mode');
    reviewMode.value = !!r.review_mode;
  } catch (e) {}
}

async function save() {
  try {
    await api.put('/admin/review-mode', { review_mode: reviewMode.value });
    showSuccessToast(reviewMode.value ? '已开启审核模式' : '已恢复正常模式');
  } catch (e) {
    showFailToast(e?.message);
    reviewMode.value = !reviewMode.value;
  }
}

onMounted(load);
</script>

<style scoped>
.warn { background: #fff7e0; border: 1px solid #f6b821; }
.tip { background: #e7f7eb; border: 1px solid #06883b; }
.big-toggle {
  display: flex; align-items: center; gap: 24px;
  padding: 16px 0;
}
.switch-big input { display: none; }
.track {
  width: 72px; height: 36px; border-radius: 36px;
  background: #d0d0d0; position: relative; display: inline-block;
  transition: background .25s;
  cursor: pointer;
}
.track.on { background: #f6b821; }
.thumb {
  position: absolute; left: 4px; top: 4px;
  width: 28px; height: 28px; border-radius: 50%;
  background: #fff; box-shadow: 0 2px 6px rgba(0,0,0,0.2);
  transition: left .25s;
}
.track.on .thumb { left: 40px; }
.state { font-size: 18px; font-weight: 700; }
.muted { color: #8a8d93; font-size: 13px; margin-top: 4px; }
</style>
