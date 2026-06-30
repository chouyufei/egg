<template>
  <span class="countdown">
    <span>{{ hh }}</span><span>{{ mm }}</span><span>{{ ss }}</span>
  </span>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, computed } from 'vue';

const props = defineProps({ endAt: { type: Number, required: true } });
const emit = defineEmits(['end']);
const now = ref(Date.now());
let timer = null;

onMounted(() => { timer = setInterval(() => { now.value = Date.now(); }, 1000); });
onUnmounted(() => clearInterval(timer));

const left = computed(() => Math.max(0, props.endAt - now.value));
const hh = computed(() => String(Math.floor(left.value / 3600000)).padStart(2, '0'));
const mm = computed(() => String(Math.floor((left.value % 3600000) / 60000)).padStart(2, '0'));
const ss = computed(() => String(Math.floor((left.value % 60000) / 1000)).padStart(2, '0'));

watch(left, (v, o) => { if (o > 0 && v === 0) emit('end'); });
</script>
