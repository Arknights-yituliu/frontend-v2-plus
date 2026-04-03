<template>
  <div class="logical-byte-container">
    <!-- 左栏：制图区 -->
    <div class="left-panel">
      <div class="panel-header">
        <h2>制图区</h2>
      </div>
      <div class="canvas-area">
        <!-- 图片预览区域 -->
        <div class="image-preview">
          <!-- 表头 -->
          <div class="image-section header-section">
            <div v-if="headerImageUrl" class="image-container">
              <img :src="headerImageUrl" alt="表头图片" @error="handleImageError('header')" />
            </div>
            <div v-else class="empty-placeholder">
              表头图片（请在右侧输入图片链接）
            </div>
          </div>

          <!-- 内容 -->
          <div class="image-section content-section">
            <!-- 表格1：六行四列（第一列固定） -->
            <div v-if="table1.some(row => row.some(cell => cell))" class="table-section">
              <div class="data-grid table1-grid">
                <table>
                  <tbody>
                    <tr v-for="(row, rowIndex) in table1" :key="'t1-r' + rowIndex">
                      <td class="data-cell label-cell">{{ table1Labels[rowIndex] }}</td>
                      <!-- 材料行：显示图标 -->
                      <template v-if="rowIndex === 1">
                        <td v-for="(cell, colIndex) in row" :key="'t1-r' + rowIndex + '-c' + colIndex" class="data-cell">
                          <div v-if="cell" class="item-icon-container">
                            <ItemImage :item-id="cell" size="36" />
                          </div>
                        </td>
                      </template>
                      <!-- 其他行：显示文本 -->
                      <template v-else>
                        <td v-for="(cell, colIndex) in row" :key="'t1-r' + rowIndex + '-c' + colIndex" class="data-cell">
                          {{ cell }}
                        </td>
                      </template>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div v-else class="empty-placeholder">
              表格1数据（请在右侧配置）
            </div>

            <!-- 表格2：五行三列 -->
            <div v-if="table2.some(row => row.some(cell => cell))" class="table-section">
              <div class="data-grid table2-grid">
                <table>
                  <tbody>
                    <tr v-for="(row, rowIndex) in table2" :key="'t2-r' + rowIndex">
                      <td v-for="(cell, colIndex) in row" :key="'t2-r' + rowIndex + '-c' + colIndex" class="data-cell">
                        {{ cell }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div v-else class="empty-placeholder">
              表格2数据（请在右侧配置）
            </div>

            <!-- 历史活动JSON数据 -->
            <div v-if="historyActivityList.length > 0" class="json-section">
              <div class="json-header">
                <h3>历史活动数据</h3>
                <span class="json-count">{{ historyActivityList.length }} 个活动</span>
              </div>
              <div class="json-content">
                <pre class="json-display">{{ JSON.stringify(historyActivityList, null, 2) }}</pre>
              </div>
            </div>
            <div v-else-if="isLoadingHistory" class="empty-placeholder loading-placeholder">
              正在加载历史活动数据...
            </div>
            <div v-else-if="historyLoadError" class="empty-placeholder error-placeholder">
              <div class="error-content">
                <div class="error-icon">⚠️</div>
                <div class="error-text">{{ historyLoadError }}</div>
              </div>
            </div>
            <div v-else class="empty-placeholder no-data-placeholder">
              暂无历史活动数据
            </div>
          </div>

          <!-- 页脚 -->
          <div class="image-section footer-section">
            <div class="footer-content">
              <div class="footer-text">
                <div class="footer-row">
                  <span class="footer-label">数据源：</span>
                  <span class="footer-value">明日方舟一图流 https://ark.yituliu.cn/</span>
                </div>
                <div class="footer-row">
                  <span class="footer-label"></span>
                  <span class="footer-value">企鹅物流数据统计 https://penguin-stats.cn/</span>
                </div>
                <div class="footer-row">
                  <span class="footer-label">数据整理：</span>
                  <span class="footer-value">逻辑元LogicalByte@Bilibili</span>
                </div>
              </div>
              <div class="footer-image">
                <img src="https://yituliu-dev-1307648010.cos.ap-beijing.myqcloud.com/image/website/QR/LogicalByteQR.png?q-sign-algorithm=sha1&q-ak=AKIDEpcgVogk4rlAG0uUqNmIbxGkHB2c-fZSPrhKJae_QsWKBmsS7zIM9HNMtc2mxSmU&q-sign-time=1773116074;1773119674&q-key-time=1773116074;1773119674&q-header-list=host&q-url-param-list=&q-signature=b9e546bf82f826a060854fcdc0a5a3063756d2fc&x-cos-security-token=XZiLyE60RcoeRbhoLkKT9Hkv7knzYMza8373400ba16a5183c4ec4f9b2dea3071TuKK-c_U9FCJX0kem7AsMITAqllPJwzA0HXlmHp6TKVKIE1cc5m83jQKrPLKM9yvzhyRz_PMaurjHeWcNZHDLhE2RSM-MX-ZwyvNmFPiFVVO7VC7-rH87SSB7s5xFjBWBT3BfGpjNoMZabi7foiFDeIC-bToPIWWg6MIQoBcfiZmnGeeQd9mpI1kXyOP2T_DvU_iZpME5KGrBe6oY3m8-5iBPEIz-MAqw9POKajK-DRk0WwoWk19A7GuyRaqO1bq0AVohPMiO6E4MGUblwqoLQ" alt="LogicalByte QR Code" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 右栏：输入区 -->
    <div class="right-panel">
      <div class="panel-header">
        <h2>输入区</h2>
        <button @click="clearAllData" class="clear-all-btn" title="清除所有数据">
          🗑️ 清空
        </button>
      </div>

      <div class="input-area">
        <!-- 表头图片输入 -->
        <div class="input-group">
          <label class="input-label">表头图片</label>
          <input ref="fileInput" v-model="headerImageUrl" type="text" class="input-field image-url-input"
            placeholder="输入图片链接，或点击后粘贴图片（Ctrl+V）" @click="triggerFileInput" @paste="handlePaste" />
          <div v-if="headerImageUrl" class="image-info">
            <span class="info-text">✓ 图片已加载</span>
            <button @click="clearHeaderImage" class="clear-btn">清除</button>
          </div>
          <div v-if="imageErrors.header" class="error-message">
            图片加载失败，请重试
          </div>
        </div>

        <!-- 活动名称输入 -->
        <div class="input-group">
          <label class="input-label">活动名称（自动匹配历史活动）</label>
          <div class="activity-input-container">
            <div class="activity-input-wrapper">
              <input
                v-model="activityName"
                type="text"
                class="input-field activity-name-input"
                placeholder="输入活动名称进行搜索..."
                @keyup.enter="selectActivity(0)"
              />
              <button v-if="activityName" @click="clearActivityMatch" class="clear-activity-btn">×</button>
            </div>
            
            <!-- 匹配活动列表 -->
            <div v-if="matchedActivities.length > 0" class="activity-matches-list">
              <div
                v-for="(activity, index) in matchedActivities"
                :key="index"
                class="activity-match-item"
                @click="selectActivity(index)"
              >
                <div class="activity-match-name">{{ activity.zoneName }}</div>
                <div class="activity-match-info">{{ activity.actStageList?.length || 0 }} 个关卡</div>
              </div>
            </div>
            
            <!-- 无匹配提示 -->
            <div v-else-if="activityName && matchedActivities.length === 0 && !isLoadingHistory" class="no-match-hint">
              未找到匹配的活动
            </div>
          </div>
        </div>

        <!-- 表格1：六行四列（第一列固定为标签） -->
        <div class="input-group">
          <label class="input-label">表格1（6行 × 4列）</label>
          <div class="table-input-container">
            <!-- 关卡行：和其他行一样，3个独立输入框 -->
            <div v-for="(row, rowIndex) in table1" :key="'t1-input-r' + rowIndex" class="table-row stage-input-row">
              <span class="row-number label-preview">{{ table1Labels[rowIndex] }}</span>
              <div class="row-cells">
                <input
                  v-for="(cell, colIndex) in row"
                  :key="'t1-input-r' + rowIndex + '-c' + colIndex"
                  v-model="table1[rowIndex][colIndex]"
                  type="text"
                  class="input-field cell-field"
                  placeholder=""
                />
              </div>
            </div>
          </div>
        </div>

        <!-- 表格2：五行三列 -->
        <div class="input-group">
          <label class="input-label">表格2（5行 × 3列）</label>
          <div class="table-input-container">
            <div v-for="(row, rowIndex) in table2" :key="'t2-input-r' + rowIndex" class="table-row">
              <span class="row-number">第{{ rowIndex + 1 }}行</span>
              <div class="row-cells">
                <input
                  v-for="(cell, colIndex) in row"
                  :key="'t2-input-r' + rowIndex + '-c' + colIndex"
                  v-model="table2[rowIndex][colIndex]"
                  type="text"
                  class="input-field cell-field"
                  placeholder=""
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { getStageData } from '/src/utils/item/stageEfficiencyCal.js'
import TMP_STAGE_RESULT from '/src/static/json/material/tmp_stage_result.json'
import ItemImage from '/src/components/sprite/ItemImage.vue'

const STORAGE_KEY = 'logicalByte_data'

// 组件挂载状态
const isMounted = ref(false)

// 图片链接（使用 base64 或 blob URL）
const headerImageUrl = ref('')

// 文件输入引用
const fileInput = ref(null)

// 图片加载错误状态
const imageErrors = ref({
  header: false,
  content: false,
  footer: false
})

// 表格1：6行3列（第一列为固定标签，第一行为关卡特殊处理）
const table1 = ref([
  ['', '', ''],  // 关卡行（将使用前缀+编号生成）
  ['', '', ''],  // 材料行
  ['', '', ''],  // 掉率行
  ['', '', ''],  // 史均效率行
  ['', '', ''],  // 总需求量行
  ['', '', '']   // 下次复刻行
])

// 表格1的固定标签
const table1Labels = ['关卡', '材料', '掉率', '史均效率', '总需求量', '下次复刻']

// 关卡前缀和编号
const stagePrefix = ref('')
const stageNumber = ref('')

// 关卡匹配相关
const stageMatchQuery = ref('')
const matchedStages = ref([])

// 收集所有历史活动关卡
const allStages = ref([])

// 计算关卡名称
const getStageNames = () => {
  if (!stagePrefix.value || !stageNumber.value) {
    return ['', '', '']
  }
  const num = parseInt(stageNumber.value)
  if (isNaN(num)) {
    return ['', '', '']
  }
  return [
    `${stagePrefix.value}-${num}`,
    `${stagePrefix.value}-${num + 1}`,
    `${stagePrefix.value}-${num + 2}`
  ]
}

// 表格2：5行3列
const table2 = ref([
  ['', '', ''],
  ['', '', ''],
  ['', '', ''],
  ['', '', ''],
  ['', '', '']
])

// 历史活动数据
const historyActivityList = ref([])
const isLoadingHistory = ref(false)
const historyLoadError = ref('')

// 活动名称输入
const activityName = ref('')
const matchedActivities = ref([])
const selectedActivityIndex = ref(-1)

// 监听活动名称输入，实现自动匹配
watch(activityName, (newValue) => {
  if (!newValue || newValue.trim() === '') {
    matchedActivities.value = []
    selectedActivityIndex.value = -1
    return
  }
  
  // 在历史活动列表中搜索匹配的活动
  matchedActivities.value = historyActivityList.value.filter(activity => {
    return activity.zoneName && activity.zoneName.toLowerCase().includes(newValue.toLowerCase())
  })
  
  selectedActivityIndex.value = -1
})

// 选择匹配的活动
const selectActivity = (index) => {
  const activity = matchedActivities.value[index]
  if (activity) {
    activityName.value = activity.zoneName
    matchedActivities.value = []
    selectedActivityIndex.value = index
    fillActivityData(activity)
  }
}

// 将活动数据填充到表格
const fillActivityData = (activity) => {
  if (!activity || !activity.actStageList || activity.actStageList.length === 0) {
    return
  }
  
  // 获取活动关卡数据
  const stageData = activity.actStageList
  
  // 填充表格1
  // 第一行：关卡名称
  table1.value[0] = stageData.slice(0, 3).map(stage => stage.stageCode || '')
  
  // 第二行：材料名称
  table1.value[1] = stageData.slice(0, 3).map(stage => stage.itemId || '')
  
  // 第三行：掉率
  table1.value[2] = stageData.slice(0, 3).map(stage => 
    stage.knockRating ? `${(stage.knockRating * 100).toFixed(1)}%` : ''
  )
  
  // 第四行：史均效率
  table1.value[3] = stageData.slice(0, 3).map(stage =>
    stage.stageEfficiency ? `${(stage.stageEfficiency * 100).toFixed(2)}%` : ''
  )
  
  // 第五行：总需求量（暂不填充）
  table1.value[4] = ['', '', '']
  
  // 第六行：下次复刻（暂不填充）
  table1.value[5] = ['', '', '']
  
  console.log('活动数据已填充到表格:', activity.zoneName)
}

// 清除活动匹配
const clearActivityMatch = () => {
  activityName.value = ''
  matchedActivities.value = []
  selectedActivityIndex.value = -1
}

// 从 localStorage 加载数据
const loadFromStorage = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const data = JSON.parse(saved)
      if (data.headerImageUrl) {
        headerImageUrl.value = data.headerImageUrl
      }
      if (data.stagePrefix !== undefined) {
        stagePrefix.value = data.stagePrefix
      }
      if (data.stageNumber !== undefined) {
        stageNumber.value = data.stageNumber
      }
      if (data.table1 && Array.isArray(data.table1) && data.table1.length === 6) {
        table1.value = data.table1.map(row =>
          Array.isArray(row) && row.length === 3 ? [...row] : ['', '', '']
        )
      }
      if (data.table2 && Array.isArray(data.table2) && data.table2.length === 5) {
        table2.value = data.table2.map(row =>
          Array.isArray(row) && row.length === 3 ? [...row] : ['', '', '']
        )
      }
      console.log('数据已从本地存储恢复')
    }
  } catch (error) {
    console.error('恢复数据失败:', error)
  }
}

// 保存到 localStorage
const saveToStorage = () => {
  try {
    const data = {
      headerImageUrl: headerImageUrl.value || '',
      stagePrefix: stagePrefix.value || '',
      stageNumber: stageNumber.value || '',
      table1: table1.value || [],
      table2: table2.value || [],
      lastSaved: new Date().toISOString()
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    console.log('数据已自动保存')
  } catch (error) {
    console.error('保存数据失败:', error)
  }
}

// 监听数据变化并自动保存
const stopWatch = watch([headerImageUrl, stagePrefix, stageNumber, table1, table2], () => {
  // 只在组件挂载时才保存
  if (isMounted.value) {
    try {
      saveToStorage()
    } catch (error) {
      console.error('自动保存失败:', error)
    }
  }
}, { deep: true })

// 组件卸载时停止监听和设置挂载状态
onUnmounted(() => {
  isMounted.value = false
  stopWatch()
})

// 处理图片加载错误
const handleImageError = (section) => {
  imageErrors.value[section] = true
}

// 触发文件选择
const triggerFileInput = () => {
  fileInput.value?.click()
}

// 处理文件选择
const handleFileSelect = (event) => {
  const file = event.target.files[0]
  if (file && file.type.startsWith('image/')) {
    loadImageFile(file)
  }
}

// 处理粘贴事件
const handlePaste = (event) => {
  const items = event.clipboardData?.items
  if (!items) return

  // 优先处理图片粘贴
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    if (item.type.startsWith('image/')) {
      event.preventDefault()
      const file = item.getAsFile()
      if (file) {
        loadImageFile(file)
      }
      return
    }
  }

  // 如果没有图片，尝试粘贴文本URL
  const text = event.clipboardData?.getData('text')
  if (text && isValidImageUrl(text)) {
    event.preventDefault()
    headerImageUrl.value = text.trim()
    imageErrors.value.header = false
  }
}

// 检查是否为有效的图片URL
const isValidImageUrl = (url) => {
  return /^https?:\/\//i.test(url)
}

// 加载图片文件
const loadImageFile = (file) => {
  const reader = new FileReader()

  reader.onload = (e) => {
    if (isMounted.value) {
      try {
        headerImageUrl.value = e.target.result
        imageErrors.value.header = false
      } catch (error) {
        console.error('加载图片失败:', error)
      }
    }
  }

  reader.onerror = () => {
    if (isMounted.value) {
      try {
        imageErrors.value.header = true
      } catch (error) {
        console.error('设置图片错误状态失败:', error)
      }
    }
  }

  reader.readAsDataURL(file)
}

// 清除表头图片
const clearHeaderImage = () => {
  headerImageUrl.value = ''
  imageErrors.value.header = false
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

// 清除所有数据
const clearAllData = () => {
  if (confirm('确定要清除所有数据吗？此操作不可恢复！')) {
    headerImageUrl.value = ''
    stagePrefix.value = ''
    stageNumber.value = ''
    table1.value = [
      ['', '', ''],
      ['', '', ''],
      ['', '', ''],
      ['', '', ''],
      ['', '', ''],
      ['', '', '']
    ]
    table2.value = [
      ['', '', ''],
      ['', '', ''],
      ['', '', ''],
      ['', '', ''],
      ['', '', '']
    ]
    localStorage.removeItem(STORAGE_KEY)
    console.log('所有数据已清除')
  }
}

// 加载历史活动数据
const loadHistoryActivityData = async () => {
  try {
    isLoadingHistory.value = true
    historyLoadError.value = ''
    console.log('开始加载历史活动数据...')
    
    // 先从本地JSON文件加载
    if (TMP_STAGE_RESULT && TMP_STAGE_RESULT.historyActStage) {
      historyActivityList.value = TMP_STAGE_RESULT.historyActStage
      console.log('从本地JSON加载历史活动数据成功:', historyActivityList.value.length, '个活动')
      // 收集所有关卡
      collectAllStages()
    } else {
      console.warn('本地JSON中没有历史活动数据')
      // 尝试从API加载
      try {
        const response = await getStageData({})
        if (response && response.historyActStage) {
          historyActivityList.value = response.historyActStage
          console.log('从API加载历史活动数据成功:', historyActivityList.value.length, '个活动')
          // 收集所有关卡
          collectAllStages()
        } else {
          console.warn('API返回的数据格式不正确:', response)
          historyLoadError.value = '数据格式错误，请联系管理员'
        }
      } catch (apiError) {
        console.error('从API加载历史活动数据失败:', apiError)
        historyLoadError.value = `加载失败: ${apiError.message || '请检查网络连接'}`
      }
    }
  } catch (error) {
    console.error('加载历史活动数据失败:', error)
    console.error('错误详情:', error.message, error.stack)
    historyLoadError.value = `加载失败: ${error.message || '请检查网络连接'}`
  } finally {
    isLoadingHistory.value = false
  }
}

// 收集所有历史活动关卡
const collectAllStages = () => {
  allStages.value = []
  for (const activity of historyActivityList.value) {
    if (activity.actStageList) {
      for (const stage of activity.actStageList) {
        allStages.value.push({
          stageCode: stage.stageCode,
          zoneName: activity.zoneName,
          itemId: stage.itemId,
          knockRating: stage.knockRating,
          stageEfficiency: stage.stageEfficiency
        })
      }
    }
  }
  console.log('收集到', allStages.value.length, '个关卡')
}

// 监听关卡搜索输入
watch(stageMatchQuery, (newValue) => {
  if (!newValue || newValue.trim() === '') {
    matchedStages.value = []
    return
  }
  
  // 在所有关卡中搜索
  matchedStages.value = allStages.value.filter(stage => {
    return stage.stageCode && stage.stageCode.toLowerCase().includes(newValue.toLowerCase())
  })
})

// 选择匹配的关卡
const selectStage = (index) => {
  const stage = matchedStages.value[index]
  if (stage) {
    stageMatchQuery.value = stage.stageCode
    matchedStages.value = []
    
    // 填充到表格1
    // 第一行：关卡名称
    table1.value[0][0] = stage.stageCode || ''
    
    // 第二行：材料名称
    table1.value[1][0] = stage.itemId || ''
    
    // 第三行：掉率
    table1.value[2][0] = stage.knockRating ? `${(stage.knockRating * 100).toFixed(1)}%` : ''
    
    // 第四行：史均效率
    table1.value[3][0] = stage.stageEfficiency ? `${(stage.stageEfficiency * 100).toFixed(2)}%` : ''
    
    console.log('关卡数据已填充到表格:', stage.stageCode)
  }
}

// 清除关卡匹配
const clearStageMatch = () => {
  stageMatchQuery.value = ''
  matchedStages.value = []
}

onMounted(() => {
  isMounted.value = true
  console.log('LogicalByte 页面已加载')
  loadFromStorage()
  loadHistoryActivityData()
})
</script>

<style scoped>
.logical-byte-container {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

/* 左栏：制图区 */
.left-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #ddd;
  background-color: #f5f5f5;
}

/* 右栏：输入区 */
.right-panel {
  width: 450px;
  display: flex;
  flex-direction: column;
  background-color: #fff;
}

/* 面板头部 */
.panel-header {
  padding: 16px 20px;
  border-bottom: 1px solid #ddd;
  background-color: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.panel-header h2 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
}

.clear-all-btn {
  padding: 6px 12px;
  background-color: #fff;
  border: 1px solid #ddd;
  border-radius: 4px;
  color: #666;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 4px;
}

.clear-all-btn:hover {
  background-color: #fee;
  border-color: #f56c6c;
  color: #f56c6c;
}

/* 制图区域 */
.canvas-area {
  flex: 1;
  padding: 20px;
  overflow: auto;
  display: flex;
  align-items: flex-start;
  justify-content: center;
}

/* 图片预览容器 */
.image-preview {
  width: 1080px;
  background-color: #fff;
  overflow: hidden;
}

/* 图片区块 */
.image-section {
  position: relative;
  border-bottom: 2px solid #e0e0e0;
}

.image-section:last-child {
  border-bottom: none;
}

/* 图片容器 */
.image-container {
  width: 100%;
  min-height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #fafafa;
}

.image-container img {
  max-width: 100%;
  height: auto;
  display: block;
}

/* 空白占位符 */
.empty-placeholder {
  min-height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #fafafa;
  color: #999;
  font-size: 0.95rem;
  border: 2px dashed #ddd;
  margin: 0;
}

/* 表头区域 */
.header-section {
  background-color: #f0f7ff;
}

.header-section .empty-placeholder {
  background-color: #f0f7ff;
}

/* 内容区域 */
.content-section {
  padding: 20px 0;
}

/* 表格区块 */
.table-section {
  margin-bottom: 20px;
}

.table-section:last-child {
  margin-bottom: 0;
}

/* 数据表格 */
.data-grid {
  width: 100%;
  overflow: hidden;
  display: block;
}

.table1-grid table {
  width: 100%;
  border-collapse: collapse;
  font-size: 1.2rem;
  display: table;
  table-layout: fixed;
}

.table2-grid table {
  width: 75%;
  border-collapse: collapse;
  font-size: 1.2rem;
  display: table;
  table-layout: fixed;
  margin: 0 auto;
}

.data-cell {
  padding: 12px 8px;
  border: 2px solid #333;
  color: #333;
  text-align: center;
  height: 50px;
  vertical-align: middle;
  font-weight: 600;
  display: table-cell;
  background-color: white;
}

.table1-grid .data-cell {
  width: 25%;
}

.table1-grid .data-cell.label-cell {
  background-color: #e3f2fd;
  font-weight: 700;
  color: #1565c0;
}

.table2-grid .data-cell {
  width: 33.33%;
}

/* 材料图标容器 */
.item-icon-container {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

/* 页脚区域 */
.footer-section {
  height: 168px;
  min-height: 168px;
}

.footer-section .empty-placeholder {
  min-height: 100px;
}

.footer-content {
  height: 168px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: linear-gradient(135deg, #ff8a3d 0%, #ff6b35 100%);
  color: #fff;
  padding: 0 0 0 40px;
  gap: 32px;
}

.footer-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.footer-row {
  display: flex;
  align-items: baseline;
  font-size: 1.75rem;
  font-weight: bold;
}

.footer-label {
  min-width: 140px;
  flex-shrink: 0;
  color: #fff;
}

.footer-value {
  color: #fff;
  flex: 1;
}

.footer-image {
  width: 168px;
  height: 168px;
  flex-shrink: 0;
  background-color: rgba(255, 255, 255, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.footer-image img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

/* 输入区域 */
.input-area {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

/* 输入组 */
.input-group {
  margin-bottom: 24px;
}

.input-label {
  display: block;
  margin-bottom: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  color: #333;
}

.input-field {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.input-field:focus {
  outline: none;
  border-color: #409eff;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.1);
}

.input-field::placeholder {
  color: #aaa;
}

/* 错误提示 */
.error-message {
  margin-top: 6px;
  color: #f56c6c;
  font-size: 0.85rem;
}

/* 图片链接输入框 */
.image-url-input {
  cursor: text;
  background-color: #fafafa;
  position: relative;
}

.image-url-input:hover {
  background-color: #f0f7ff;
}

.image-url-input:focus {
  background-color: #f0f7ff;
}

/* 图片信息 */
.image-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 10px;
  padding: 8px 12px;
  background-color: #f0f9ff;
  border: 1px solid #b3e0ff;
  border-radius: 4px;
}

.info-text {
  color: #0c7cd5;
  font-size: 0.85rem;
  font-weight: 500;
}

.clear-btn {
  padding: 4px 12px;
  background-color: #fff;
  border: 1px solid #ddd;
  border-radius: 4px;
  color: #666;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
}

.clear-btn:hover {
  background-color: #fee;
  border-color: #f56c6c;
  color: #f56c6c;
}

/* 表格输入容器 */
.table-input-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  background-color: #fafafa;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
}

.table-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.row-number {
  font-size: 0.85rem;
  font-weight: 600;
  color: #666;
  width: 50px;
  flex-shrink: 0;
}

.row-cells {
  flex: 1;
  display: grid;
}

.table1-grid + .table-input-container .row-cells {
  grid-template-columns: repeat(4, 1fr);
}

.table2-grid + .table-input-container .row-cells {
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.table1-grid + .table-input-container .row-cells {
  gap: 6px;
}

.cell-field {
  padding: 8px;
  font-size: 0.85rem;
  width: 100%;
}

/* 关卡输入行 */
.stage-input-row {
  background-color: #e3f2fd;
  border-radius: 4px;
  padding: 12px;
  border: 1px solid #2196f3;
}

/* 关卡搜索容器 */
.stage-search-container {
  flex: 1;
  position: relative;
}

.stage-search-input {
  width: 100%;
  padding-right: 36px;
  background-color: #fff;
  border-color: #1565c0;
  font-weight: 600;
  transition: all 0.2s;
}

.stage-search-input:focus {
  background-color: #f0f7ff;
  border-color: #409eff;
  box-shadow: 0 0 0 3px rgba(64, 158, 255, 0.1);
}

.clear-stage-btn {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  width: 24px;
  height: 24px;
  padding: 0;
  background-color: #f0f7ff;
  border: 1px solid #2196f3;
  border-radius: 50%;
  color: #2196f3;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.clear-stage-btn:hover {
  background-color: #2196f3;
  color: #fff;
}

/* 匹配关卡列表 */
.stage-matches-list {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 4px;
  max-height: 300px;
  overflow-y: auto;
  background-color: #fff;
  border: 1px solid #ddd;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
}

.stage-match-item {
  padding: 10px 12px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background-color 0.2s;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.stage-match-item:last-child {
  border-bottom: none;
}

.stage-match-item:hover {
  background-color: #f0f7ff;
}

.stage-match-code {
  font-weight: 600;
  color: #1565c0;
  font-size: 0.95rem;
  flex-shrink: 0;
}

.stage-match-zone {
  font-size: 0.8rem;
  color: #666;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.stage-inputs {
  flex: 1;
  display: flex;
  gap: 8px;
}

.stage-field {
  flex: 1;
  background-color: #fff;
  border-color: #1565c0;
  font-weight: 600;
}

.stage-field:focus {
  background-color: #f0f7ff;
  border-color: #409eff;
}

/* JSON显示区域 */
.json-section {
  margin-top: 20px;
  border: 2px solid #e0e0e0;
  border-radius: 6px;
  overflow: hidden;
}

.json-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background-color: #f5f5f5;
  border-bottom: 2px solid #e0e0e0;
}

.json-header h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #333;
}

.json-count {
  font-size: 0.85rem;
  color: #666;
  background-color: #fff;
  padding: 4px 12px;
  border-radius: 12px;
  border: 1px solid #ddd;
}

.json-content {
  max-height: 400px;
  overflow-y: auto;
  background-color: #fafafa;
}

.json-display {
  margin: 0;
  padding: 16px;
  font-family: 'Courier New', Courier, monospace;
  font-size: 0.85rem;
  line-height: 1.6;
  color: #333;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.error-placeholder {
  color: #f56c6c;
  border-color: #f56c6c;
  background-color: #fef0f0;
}

.error-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.error-icon {
  font-size: 2rem;
}

.error-text {
  font-size: 0.95rem;
  font-weight: 500;
  text-align: center;
  color: #f56c6c;
}

.loading-placeholder {
  color: #409eff;
  border-color: #409eff;
  background-color: #f0f7ff;
  font-weight: 500;
}

.no-data-placeholder {
  color: #909399;
  background-color: #fafafa;
}

/* 活动名称输入区域 */
.activity-input-container {
  position: relative;
}

.activity-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
}

.activity-name-input {
  flex: 1;
  padding-right: 36px;
  background-color: #f0f7ff;
  border-color: #2196f3;
  transition: all 0.2s;
}

.activity-name-input:focus {
  background-color: #fff;
  border-color: #409eff;
  box-shadow: 0 0 0 3px rgba(64, 158, 255, 0.1);
}

.activity-name-input::placeholder {
  color: #90caf9;
}

.clear-activity-btn {
  position: absolute;
  right: 8px;
  width: 24px;
  height: 24px;
  padding: 0;
  background-color: #f0f7ff;
  border: 1px solid #2196f3;
  border-radius: 50%;
  color: #2196f3;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.clear-activity-btn:hover {
  background-color: #2196f3;
  color: #fff;
}

/* 匹配活动列表 */
.activity-matches-list {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 4px;
  max-height: 300px;
  overflow-y: auto;
  background-color: #fff;
  border: 1px solid #ddd;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
}

.activity-match-item {
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background-color 0.2s;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.activity-match-item:last-child {
  border-bottom: none;
}

.activity-match-item:hover {
  background-color: #f0f7ff;
}

.activity-match-name {
  font-weight: 500;
  color: #333;
  flex: 1;
}

.activity-match-info {
  font-size: 0.85rem;
  color: #909399;
  padding: 4px 8px;
  background-color: #f5f5f5;
  border-radius: 12px;
}

/* 无匹配提示 */
.no-match-hint {
  padding: 12px 16px;
  background-color: #fef0f0;
  border: 1px solid #f56c6c;
  border-radius: 6px;
  color: #f56c6c;
  font-size: 0.9rem;
  text-align: center;
  margin-top: 4px;
}

/* 暗色主题适配 */
@media (prefers-color-scheme: dark) {
  .left-panel {
    background-color: #1e1e1e;
    border-right-color: #444;
  }

  .right-panel {
    background-color: #2d2d2d;
  }

  .panel-header {
    background-color: #2d2d2d;
    border-bottom-color: #444;
    color: #e0e0e0;
  }

  .clear-all-btn {
    background-color: #2d2d2d;
    border-color: #555;
    color: #aaa;
  }

  .clear-all-btn:hover {
    background-color: #3d1f1f;
    border-color: #f56c6c;
    color: #f56c6c;
  }

  .image-preview {
    background-color: #2d2d2d;
  }

  .image-section {
    border-bottom-color: #444;
  }

  .image-container {
    background-color: #1e1e1e;
  }

  .empty-placeholder {
    background-color: #1e1e1e;
    border-color: #555;
    color: #888;
  }

  .header-section {
    background-color: #1a2332;
  }

  .header-section .empty-placeholder {
    background-color: #1a2332;
  }

  .input-label {
    color: #e0e0e0;
  }

  .input-field {
    background-color: #1e1e1e;
    border-color: #555;
    color: #e0e0e0;
  }

  .input-field:focus {
    border-color: #409eff;
  }

  .input-field::placeholder {
    color: #666;
  }

  .image-url-input {
    background-color: #1e1e1e;
  }

  .image-url-input:hover {
    background-color: #1a3a52;
  }

  .image-url-input:focus {
    background-color: #1a3a52;
  }

  .image-info {
    background-color: #1a3a52;
    border-color: #2196f3;
  }

  .info-text {
    color: #64b5f6;
  }

  .clear-btn {
    background-color: #2d2d2d;
    border-color: #555;
    color: #e0e0e0;
  }

  .clear-btn:hover {
    background-color: #3d1f1f;
    border-color: #f56c6c;
    color: #f56c6c;
  }

  .data-cell {
    border-color: #666;
    color: #e0e0e0;
    background-color: #2d2d2d;
  }

  .table-input-container {
    background-color: #1e1e1e;
    border-color: #555;
  }

  .row-number {
    color: #aaa;
  }

  .cell-field {
    background-color: #2d2d2d;
    border-color: #555;
    color: #e0e0e0;
  }

  .cell-field:focus {
    border-color: #409eff;
  }
}
</style>