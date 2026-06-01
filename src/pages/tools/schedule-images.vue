<script setup>
const baseUrl = "https://cos.yituliu.cn/arknights/schedule-images/2026-06-01/";

const imageFiles = [
  "1.webp",
  "2.webp",
  "3.webp",
  "4.webp",
  "5.webp",
  "6.webp",
  "7.webp",
  "8.webp",
  "9.webp",
  "10.webp",
  "11.webp",
  "幻灯片22.webp",
  "幻灯片23.webp",
  "幻灯片24.webp",
  "幻灯片25.webp",
  "幻灯片26.webp",
  "幻灯片27.webp",
  "幻灯片28.webp",
  "幻灯片29.webp",
  "幻灯片30.webp",
  "幻灯片31.webp",
  "幻灯片32.webp",
  "幻灯片33.webp",
  "幻灯片34.webp",
  "幻灯片35.webp",
  "幻灯片36.webp",
  "幻灯片37.webp",
  "幻灯片38.webp",
  "幻灯片39.webp",
  "幻灯片40.webp",
  "幻灯片41.webp",
  "幻灯片42.webp",
];
</script>

<template>
  <div>
    <div v-for="(file, index) in imageFiles" :key="index" class="mx-auto">
        <v-img :src="baseUrl + file" class="mb-4" max-width="100%" contain />
    </div>
  </div>
</template>

<style scoped></style>
