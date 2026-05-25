<template>
  <div class="page">
    <van-nav-bar title="资质认证" left-arrow @click-left="$router.back()" />

    <div class="card" style="margin: 12px;">
      <div class="row-between">
        <div style="font-weight: 600;">当前状态</div>
        <van-tag :type="tagType">{{ statusLabel }}</van-tag>
      </div>
      <div class="muted" style="margin-top: 6px; line-height: 1.7;">
        平台审核养殖场营业执照等资质，审核通过后方可缴纳保证金、发布资源。
      </div>
    </div>

    <div class="card" style="margin: 12px;">
      <van-field v-model="form.name" label="养殖场名称" placeholder="如：阳光散养鸡场" />
      <van-field v-model="form.region" label="所在地区" placeholder="如：山东青州" />
      <van-field v-model="form.business_license" type="textarea" rows="3" label="营业执照"
                 placeholder="请输入营业执照号或上传图片链接（演示模式）" />
    </div>

    <div style="padding: 12px;">
      <van-button block round type="primary" :loading="submitting" @click="submit">提交审核</van-button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { showSuccessToast } from 'vant';
import api from '../../api';
import { useUserStore } from '../../stores/user';

const store = useUserStore();
const submitting = ref(false);
const form = reactive({ name: '', region: '', business_license: '' });

const statusLabel = computed(() => ({ pending: '审核中', approved: '已通过', rejected: '未通过', none: '未提交' }[store.user?.license_status] || '未提交'));
const tagType = computed(() => ({ pending: 'warning', approved: 'success', rejected: 'danger', none: 'default' }[store.user?.license_status]));

async function submit() {
  submitting.value = true;
  try {
    await api.post('/auth/qualify', form);
    showSuccessToast('已提交');
    await store.refresh();
  } finally { submitting.value = false; }
}

onMounted(() => {
  form.name = store.user?.name || '';
  form.region = store.user?.region || '';
  form.business_license = store.user?.business_license || '';
});
</script>
