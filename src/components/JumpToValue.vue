<template>
  <div class="value-card">
    <a href="/value">
      <span>点击前往</span>
      <svg style="width: 32px; height: 32px; fill: white; margin-left: 8px" viewbox="0 0 24 24">
        <path :d="mdiGold" />
      </svg>
      <span class="bold">物品价值</span>
      <span>页面</span>
    </a>
  </div>
</template>

<script setup>
import { mdiGold } from "@mdi/js";
</script>

<style scoped>
.value-card {
  background-color: rgb(52, 68, 104);
  margin: 20px auto;
  height: 80px;
  border-radius: 16px;
  box-shadow: var(--el-box-shadow-light);
  width: 400px;
}

.value-card a {
  display: flex;
  width: 100%;
  height: 100%;
  justify-content: center;
  align-items: center;
  color: white;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue",
    sans-serif;
  font-size: 22px;
  text-decoration: none;
}

.bold {
  font-weight: bold;
  margin-left: 4px;
  margin-right: 8px;
  font-size: 24px;
}
</style>
