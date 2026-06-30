<template>
  <div class="page">
    <van-nav-bar title="搜索筛选" left-arrow @click-left="$router.back()" />
    <van-search v-model="filters.keyword" placeholder="标题或描述关键词" shape="round" @search="reload" />
    <div class="page-pad">
      <van-cell-group inset>
        <van-field v-model="filters.region" label="地区" placeholder="如：山东" />
        <van-field name="color" label="蛋色">
          <template #input>
            <van-radio-group v-model="filters.color" direction="horizontal">
              <van-radio name="">全部</van-radio>
              <van-radio name="红壳">红壳</van-radio>
              <van-radio name="粉壳">粉壳</van-radio>
              <van-radio name="杂色">杂色</van-radio>
            </van-radio-group>
          </template>
        </van-field>
        <van-field name="sort" label="排序">
          <template #input>
            <van-radio-group v-model="filters.sort" direction="horizontal">
              <van-radio name="">最新</van-radio>
              <van-radio name="price_asc">价低</van-radio>
              <van-radio name="price_desc">价高</van-radio>
              <van-radio name="ending_soon">将结束</van-radio>
            </van-radio-group>
          </template>
        </van-field>
      </van-cell-group>
      <van-button block type="primary" style="margin-top: 12px;" @click="reload">应用筛选</van-button>
    </div>

    <div class="page-pad">
      <div v-if="!list.length" class="empty">未找到资源</div>
      <EggCard v-for="r in list" :key="r.id" :r="r" @click="open(r.id)" />
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import api from '../../api';
import EggCard from '../../components/EggCard.vue';

const router = useRouter();
const route = useRoute();
const list = ref([]);
const filters = reactive({
  keyword: route.query.keyword || '',
  region: route.query.region || '',
  color: route.query.color || '',
  sort: route.query.sort || '',
});

async function reload() {
  const params = { status: 'auctioning' };
  for (const k of Object.keys(filters)) if (filters[k]) params[k] = filters[k];
  const { resources } = await api.get('/resources', { params });
  list.value = resources;
}
function open(id) { router.push(`/buyer/resource/${id}`); }
onMounted(reload);
</script>
