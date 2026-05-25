<template>
  <van-config-provider :theme-vars="themeVars">
    <router-view />
  </van-config-provider>
</template>

<script setup>
const themeVars = {
  primaryColor: '#f6b821',
  buttonPrimaryBackground: '#f6b821',
  buttonPrimaryBorderColor: '#f6b821',
  tabbarItemActiveColor: '#f6b821',
};
</script>
