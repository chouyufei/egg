<template>
  <div class="page">
    <van-nav-bar title="发布新资源" left-arrow @click-left="$router.back()" />

    <div class="card" style="margin: 12px;">
      <van-field v-model="form.title" label="标题" placeholder="如：青州散养土鸡蛋·1 车整批" />
      <van-field v-model="form.region" label="地区" placeholder="如：山东青州" />
      <van-field v-model="form.chicken_breed" label="鸡种" placeholder="如：海兰褐/罗曼粉/笨鸡" />
      <van-field v-model.number="form.farm_size" type="digit" label="养殖规模" placeholder="只" />
      <van-field name="egg_color" label="蛋色">
        <template #input>
          <van-radio-group v-model="form.egg_color" direction="horizontal">
            <van-radio name="红壳">红壳</van-radio>
            <van-radio name="粉壳">粉壳</van-radio>
            <van-radio name="杂色">杂色</van-radio>
          </van-radio-group>
        </template>
      </van-field>
      <van-field v-model="form.weight_spec" label="规格" placeholder="如：55-65g/枚" />
      <van-field v-model="form.shell_quality" label="蛋壳质量" placeholder="如：硬壳-无裂纹" />
      <van-field v-model.number="form.freshness_days" type="digit" label="鲜度" placeholder="x 天内" />
      <van-field v-model.number="form.quantity" type="digit" label="数量(车)" placeholder="如 1" />
    </div>

    <div class="card" style="margin: 12px;">
      <van-field v-model.number="form.start_price" type="number" label="起拍价(¥)" placeholder="如 8500" />
      <van-field v-model.number="form.min_increment" type="number" label="加价幅度" placeholder="≥ 2" />
      <van-field name="duration_hours" label="报价时长">
        <template #input>
          <van-radio-group v-model="form.duration_hours" direction="horizontal">
            <van-radio :name="1">1 小时</van-radio>
            <van-radio :name="2">2 小时</van-radio>
            <van-radio :name="3">3 小时</van-radio>
          </van-radio-group>
        </template>
      </van-field>
    </div>

    <div class="card" style="margin: 12px;">
      <van-field v-model="form.description" type="textarea" rows="4" label="描述"
                 placeholder="饲养方式、检疫情况、发货时效..." />
      <van-field v-model="photosText" type="textarea" rows="2" label="图片"
                 placeholder="每行一个图片 URL（演示模式）" />
    </div>

    <div style="padding: 12px;">
      <van-button block round type="primary" :loading="submitting" @click="submit">立即发布</van-button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { showSuccessToast } from 'vant';
import api from '../../api';

const router = useRouter();
const submitting = ref(false);
const photosText = ref('https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=800');
const form = reactive({
  title: '', region: '', chicken_breed: '', farm_size: null, egg_color: '红壳',
  weight_spec: '', shell_quality: '', freshness_days: 3, quantity: null,
  start_price: null, min_increment: 2, duration_hours: 2, description: '',
});

async function submit() {
  submitting.value = true;
  try {
    const photos = photosText.value.split('\n').map(s => s.trim()).filter(Boolean);
    await api.post('/resources', { ...form, photos });
    showSuccessToast('发布成功');
    router.replace('/farm/resources');
  } finally { submitting.value = false; }
}
</script>
