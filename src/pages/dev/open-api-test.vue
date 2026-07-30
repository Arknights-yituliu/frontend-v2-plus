<template>
  <div class="open-api-test-container">
    <h2>第三方 OpenAPI 测试 - 干员练度数据</h2>

    <!-- Token 配置区域 -->
    <el-card class="config-card">
      <template #header>
        <span>认证配置</span>
      </template>
      <div class="config-row">
        <el-input
          v-model="apiToken"
          type="text"
          placeholder="请输入第三方 OpenAPI Token"
          clearable
          style="flex: 1"
        >
          <template #prepend>Authorization Token</template>
        </el-input>
        <el-input
          v-model="baseUrl"
          placeholder="API 地址"
          style="width: 260px; margin-left: 12px"
        >
          <template #prepend>Base URL</template>
        </el-input>
      </div>
    </el-card>

    <!-- 请求操作区域 -->
    <el-card class="action-card">
      <template #header>
        <span>请求操作</span>
      </template>
      <div class="action-row">
        <el-tag type="info" style="margin-right: 8px">GET</el-tag>
        <el-input
          :value="fullUrl"
          readonly
          style="flex: 1"
        />
        <el-button
          type="primary"
          :loading="loading"
          :disabled="!apiToken"
          @click="sendRequest"
          style="margin-left: 12px"
        >
          发送请求
        </el-button>
        <el-button @click="clearResult" style="margin-left: 8px">
          清空结果
        </el-button>
      </div>
    </el-card>

    <!-- 响应结果区域 -->
    <el-card v-if="result !== null || errorMsg" class="result-card">
      <template #header>
        <div class="result-header">
          <span>响应结果</span>
          <el-tag v-if="httpStatus" :type="httpStatus === 200 ? 'success' : 'danger'">
            HTTP {{ httpStatus }}
          </el-tag>
          <el-tag v-if="responseTime !== null" type="info" style="margin-left: 8px">
            {{ responseTime }}ms
          </el-tag>
        </div>
      </template>

      <!-- 错误信息 -->
      <el-alert
        v-if="errorMsg"
        :title="errorMsg"
        type="error"
        show-icon
        :closable="false"
        style="margin-bottom: 16px"
      />

      <!-- 响应数据概览 -->
      <div v-if="result" class="result-summary">
        <el-descriptions :column="3" border size="small">
          <el-descriptions-item label="code">{{ result.code }}</el-descriptions-item>
          <el-descriptions-item label="message">{{ result.message }}</el-descriptions-item>
          <el-descriptions-item label="干员数量">
            {{ result.data ? result.data.length : 0 }}
          </el-descriptions-item>
        </el-descriptions>
      </div>

      <!-- 原始 JSON -->
      <div v-if="result" class="json-section">
        <div class="section-header">
          <span>原始 JSON 响应</span>
          <el-button size="small" @click="copyJson">复制 JSON</el-button>
        </div>
        <pre class="json-preview">{{ formattedJson }}</pre>
      </div>
    </el-card>

    <!-- 空状态提示 -->
    <el-card v-if="result === null && !errorMsg" class="empty-card">
      <el-empty description="输入 Token 后点击发送请求查看结果" />
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import axios from 'axios'
import { ElMessage } from 'element-plus'

/** 第三方 API Token */
const apiToken = ref('')

/** API 基础地址 */
const baseUrl = ref('https://backend.yituliu.cn')

/** 请求加载状态 */
const loading = ref(false)

/** 响应数据 */
const result = ref(null)

/** HTTP 状态码 */
const httpStatus = ref(null)

/** 响应耗时 */
const responseTime = ref(null)

/** 错误信息 */
const errorMsg = ref('')

/**
 * 完整的请求 URL（计算属性）
 */
const fullUrl = computed(() => {
  return `${baseUrl.value}/open-api/operator/info`
})

/**
 * 格式化后的 JSON 字符串（计算属性）
 */
const formattedJson = computed(() => {
  if (!result.value) return ''
  return JSON.stringify(result.value, null, 2)
})

/**
 * 发送 API 请求
 */
const sendRequest = async () => {
  if (!apiToken.value) {
    ElMessage.warning('请输入 Token')
    return
  }

  loading.value = true
  errorMsg.value = ''
  result.value = null
  httpStatus.value = null
  responseTime.value = null

  const startTime = performance.now()

  try {
    const response = await axios.get(`${baseUrl.value}/open-api/operator/info`, {
      headers: {
        Authorization: apiToken.value
      },
      // 不经过项目统一拦截器，直接使用原始 axios
      validateStatus: () => true
    })

    const endTime = performance.now()
    responseTime.value = Math.round(endTime - startTime)
    httpStatus.value = response.status

    if (response.status === 200) {
      result.value = response.data
      ElMessage.success('请求成功')
    } else {
      result.value = response.data
      errorMsg.value = `HTTP ${response.status}: ${response.data?.message || response.data?.msg || '未知错误'}`
    }
  } catch (err) {
    const endTime = performance.now()
    responseTime.value = Math.round(endTime - startTime)
    errorMsg.value = err.message || '网络请求失败'
    ElMessage.error(errorMsg.value)
  } finally {
    loading.value = false
  }
}

/**
 * 清空响应结果
 */
const clearResult = () => {
  result.value = null
  httpStatus.value = null
  responseTime.value = null
  errorMsg.value = ''
}

/**
 * 复制 JSON 到剪贴板
 */
const copyJson = async () => {
  try {
    await navigator.clipboard.writeText(formattedJson.value)
    ElMessage.success('已复制到剪贴板')
  } catch {
    ElMessage.error('复制失败，请手动复制')
  }
}
</script>

<style scoped>
.open-api-test-container {
  max-width: 960px;
  margin: 0 auto;
  padding: 24px 16px;
}

.open-api-test-container h2 {
  margin-bottom: 20px;
  font-size: 20px;
  color: var(--el-text-color-primary);
}

.config-card,
.action-card,
.result-card,
.empty-card {
  margin-bottom: 16px;
}

.config-row,
.action-row {
  display: flex;
  align-items: center;
}

.result-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.result-summary {
  margin-bottom: 16px;
}

.json-section {
  margin-top: 16px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.json-preview {
  background: var(--el-fill-color-light);
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  padding: 12px 16px;
  font-size: 13px;
  line-height: 1.6;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 600px;
  overflow-y: auto;
}
</style>
