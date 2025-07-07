// useLoadingGuard.js

import { ref, watch, onMounted } from 'vue'

/**
 * 用于处理数据加载超时弹窗和自动刷新
 * @param {Ref} dataRef 要监听的数据（如 fixedPacks）
 * @param {number} showDelay 弹窗延迟显示时间（毫秒），默认 1500
 * @param {number} minShowTime 弹窗最短显示时间（毫秒），默认 2000
 * @param {number} reloadDelay 自动刷新的超时时间（毫秒），默认 3000
 * @returns {Object} { isLoading, showLoadingTime, reloadPage }
 */
export function useLoadingGuard(dataRef, showDelay = 1500, minShowTime = 2000, reloadDelay = 3000) {
  const isLoading = ref(false)
  const showLoadingTime = ref(0)

  function reloadPage() {
    location.reload()
  }

  onMounted(() => {
    // 延时显示加载弹窗
    setTimeout(() => {
      if (!Array.isArray(dataRef.value) || dataRef.value.length === 0) {
        isLoading.value = true
        showLoadingTime.value = Date.now()
      }
    }, showDelay)

    // 到达 reloadDelay 时仍未加载，自动刷新
    setTimeout(() => {
      if (!Array.isArray(dataRef.value) || dataRef.value.length === 0) {
        console.warn(`超时 ${reloadDelay}ms 未加载，自动刷新页面`)
        reloadPage()
      }
    }, reloadDelay)
  })

  // 一旦数据有值，关闭弹窗，但至少保证 minShowTime
  watch(
    dataRef,
    (newVal) => {
      if (Array.isArray(newVal) && newVal.length > 0 && isLoading.value) {
        const elapsed = Date.now() - showLoadingTime.value
        if (elapsed < minShowTime) {
          setTimeout(() => {
            isLoading.value = false
          }, minShowTime - elapsed)
        } else {
          isLoading.value = false
        }
      }
    },
    { immediate: true }
  )

  return {
    isLoading,
    showLoadingTime,
    reloadPage
  }
}
