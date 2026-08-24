<script setup>
import { watch } from 'vue'
import { useRoute } from 'vue-router'
import toolApi from '/src/api/tool.js'

const route = useRoute()

/**
 * 监听路由变化，自动将当前页面 URL 发送到后端记录
 * immediate: true 确保页面加载时立即执行一次
 */
watch(
  () => route.fullPath,
  async () => {
    try {
      const data = {
        url: window.location.href,
      }

      await toolApi.accessLog(data)
      // console.log('[PageTracker] 访问记录已上传:', data.url)
    } catch (error) {
      // console.error('[PageTracker] 上传访问记录失败:', error)
    }
  },
  { immediate: true }
)
</script>

<template>
  <!-- 无 UI，仅逻辑组件 -->
  <div />
</template>
