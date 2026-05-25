<template>
  <van-tabbar :model-value="active" @change="onChange" placeholder route active-color="#f6b821">
    <van-tabbar-item v-for="t in tabs" :key="t.to" :to="t.to" :icon="t.icon">{{ t.label }}</van-tabbar-item>
  </van-tabbar>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
const props = defineProps({ tabs: Array });
const route = useRoute();
const active = computed(() => props.tabs.findIndex(t => route.path.startsWith(t.to)));
const onChange = () => {};
</script>
