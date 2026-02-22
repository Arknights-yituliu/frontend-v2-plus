<template>
  <div class="jie-garden-container">
    <iframe
      src="/jie-garden/index.html"
      class="jie-garden-iframe"
      frameborder="0"
      title="界园树洞模拟"
    ></iframe>
  </div>
</template>

<script setup>
// 界园树洞模拟器页面
</script>

<style scoped>
.jie-garden-container {
  width: 100%;
  height: calc(100vh - 64px);
  overflow: hidden;
}

.jie-garden-iframe {
  width: 100%;
  height: 100%;
  border: none;
}
</style>