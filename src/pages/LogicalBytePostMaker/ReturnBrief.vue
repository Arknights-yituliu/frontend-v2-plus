<template>
  <div class="logical-byte-container">
    <!-- 左栏：制图区 -->
    <div class="left-panel">
      <div class="panel-header">
        <h2>制图区</h2>
      </div>
      <div class="canvas-area">
        <!-- 图片预览区域 -->
        <div
          ref="imagePreviewRef"
          class="image-preview"
          :style="selectedPreviewThemeStyle"
          data-export-target="return-brief-preview"
        >
          <!-- 表头 -->
          <div class="image-section header-section">
            <div v-if="headerImageUrl" class="image-container">
              <img :src="headerImageUrl" alt="表头图片" referrerpolicy="no-referrer" @error="handleImageError('header')" />
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
                  <colgroup>
                    <col class="brief-table-label-column" />
                    <col class="brief-table-data-column" />
                    <col class="brief-table-data-column" />
                    <col class="brief-table-data-column" />
                  </colgroup>
                  <tbody>
                    <template v-for="(row, rowIndex) in table1" :key="'t1-r' + rowIndex">
                      <tr
                        v-if="rowIndex !== 1"
                        :class="{
                          'table1-accent-row': rowIndex === 4 || rowIndex === 5,
                          'table1-next-up-row': rowIndex === 5
                        }"
                      >
                        <td class="data-cell label-cell">{{ table1Labels[rowIndex] }}</td>
                        <template v-if="rowIndex === 0">
                          <td v-for="(cell, colIndex) in row" :key="'t1-r' + rowIndex + '-c' + colIndex" class="data-cell">
                            <div class="stage-material-cell">
                              <span>{{ cell }}</span>
                              <ItemImage
                                v-if="table1[1]?.[colIndex]"
                                :item-id="table1[1][colIndex]"
                                :size="previewMaterialIconSize"
                              />
                            </div>
                          </td>
                        </template>
                        <template v-else-if="rowIndex === 5">
                          <td v-for="(cell, colIndex) in row" :key="'t1-r' + rowIndex + '-c' + colIndex" class="data-cell">
                            <div class="next-up-cell">
                              <template v-if="getNextUpActivityNameFromText(cell)">
                                <div class="next-up-activity-name">{{ getNextUpActivityNameFromText(cell) }}</div>
                                <div v-if="getTable1NextUpIconIds(colIndex).length > 0" class="next-up-material-icons">
                                  <ItemImage
                                    v-for="itemId in getTable1NextUpIconIds(colIndex)"
                                    :key="'next-up-icon-' + colIndex + '-' + itemId"
                                    :item-id="itemId"
                                    :size="previewNextUpIconSize"
                                  />
                                </div>
                                <div class="next-up-expected-time">{{ getNextUpExpectedTimeFromText(cell) }}</div>
                              </template>
                              <div v-else class="next-up-text">{{ cell }}</div>
                            </div>
                          </td>
                        </template>
                        <template v-else>
                          <td v-for="(cell, colIndex) in row" :key="'t1-r' + rowIndex + '-c' + colIndex" class="data-cell">
                            {{ cell }}
                          </td>
                        </template>
                      </tr>
                    </template>
                  </tbody>
                </table>
              </div>
            </div>

            <div
              v-if="table1.some(row => row.some(cell => cell)) && table2.some(row => row.some(cell => cell))"
              class="table-divider-band"
            >
              <span v-for="index in 3" :key="'divider-watermark-' + index">逻辑元LogicalByte</span>
            </div>

            <!-- 表格2：搓玉数据，四行四列 -->
            <div v-if="table2.some(row => row.some(cell => cell))" class="table-section">
              <div class="data-grid table2-grid">
                <table>
                  <colgroup>
                    <col class="brief-table-label-column" />
                    <col class="brief-table-data-column" />
                    <col class="brief-table-data-column" />
                    <col class="brief-table-data-column" />
                  </colgroup>
                  <tbody>
                    <tr v-for="(row, rowIndex) in table2" :key="'t2-r' + rowIndex">
                      <td
                        v-for="(cell, colIndex) in row"
                        :key="'t2-r' + rowIndex + '-c' + colIndex"
                        class="data-cell"
                        :class="{ 'label-cell': colIndex === 0 }"
                      >
                        <div v-if="rowIndex === 0 && getTable2CellIconIds(colIndex).length > 0" class="orundum-stage-cell">
                          <span>{{ cell }}</span>
                          <span class="orundum-material-icons">
                            <ItemImage
                              v-for="itemId in getTable2CellIconIds(colIndex)"
                              :key="'orundum-icon-' + colIndex + '-' + itemId"
                              :item-id="itemId"
                              :size="previewOrundumIconSize"
                            />
                          </span>
                        </div>
                        <div v-else-if="rowIndex === 1 && colIndex > 0" class="orundum-yield-cell">
                          <div class="orundum-yield-line">{{ getOrundumYieldPerApText(cell) }}</div>
                          <div v-if="getOrundumYieldTotalText(cell)" class="orundum-yield-line orundum-yield-total">
                            <span>{{ getOrundumYieldTotalText(cell) }}</span>
                            <span class="orundum-result-icon bg-4003_icon" aria-label="合成玉"></span>
                          </div>
                        </div>
                        <template v-else>
                          {{ cell }}
                        </template>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div v-if="!table1.some(row => row.some(cell => cell)) && !table2.some(row => row.some(cell => cell))" class="empty-placeholder">
              表格数据（请在右侧配置）
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
                <img src="/image/website/QR/LogicalByteQR.png" alt="LogicalByte QR Code" />
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
        <div class="panel-actions">
          <button
            @click="downloadPreviewPng"
            class="download-preview-btn"
            :disabled="isExportingPreview"
            title="下载绘图区PNG图片"
          >
            {{ isExportingPreview ? '生成中...' : '下载PNG' }}
          </button>
          <button @click="clearAllData" class="clear-all-btn" title="清除所有数据">
            🗑️ 清空
          </button>
        </div>
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

        <!-- 配色主题 -->
        <div class="input-group">
          <label class="input-label">配色主题</label>
          <div class="theme-selector">
            <button
              v-for="theme in previewThemeOptions"
              :key="theme.key"
              type="button"
              class="theme-option"
              :class="{ 'theme-option-active': selectedPreviewThemeKey === theme.key }"
              @click="selectPreviewTheme(theme.key)"
            >
              <span class="theme-swatch-row">
                <span
                  v-for="color in theme.swatches"
                  :key="theme.key + color"
                  class="theme-swatch"
                  :style="{ backgroundColor: color }"
                ></span>
              </span>
              <span class="theme-name">{{ theme.name }}</span>
            </button>
          </div>
        </div>

        <!-- 往期活动数据引用 -->
        <div class="input-group">
          <label class="input-label">引用往期活动</label>
          <div class="reference-actions">
            <button
              @click="quoteLatestReferenceActivity"
              class="reference-btn"
              :disabled="isLoadingHistory || recentReferenceActivities.length === 0"
            >
              引用最新活动
            </button>
            <button
              @click="quoteLatestOfficialRerunNews"
              class="reference-btn official-news-btn"
              :disabled="isLoadingOfficialNews || isLoadingHistory"
            >
              {{ isLoadingOfficialNews ? '读取官网中...' : '实验：官网复刻' }}
            </button>
          </div>
          <div class="reference-info" :class="{ 'reference-info-error': referenceError }">
            {{ referenceInfo }}
          </div>
          <div
            v-if="officialNewsInfo"
            class="reference-info official-news-info"
            :class="{ 'reference-info-error': officialNewsError }"
          >
            {{ officialNewsInfo }}
          </div>
          <div v-if="recentReferenceActivities.length > 0" class="reference-activity-list">
            <button
              v-for="activity in recentReferenceActivities"
              :key="activity.zoneName"
              class="reference-activity-item"
              :class="{ 'reference-activity-item-active': selectedReferenceActivityName === activity.zoneName }"
              @click="quoteActivityData(activity)"
            >
              <span class="reference-activity-name">{{ activity.zoneName }}</span>
              <span class="reference-activity-meta">
                {{ formatActivityEndTime(activity.endTime) }} / {{ getActivityStagesForChart(activity).map(stage => stage.stageCode).join('、') }}
              </span>
            </button>
          </div>
          <div v-else-if="!isLoadingHistory" class="reference-empty">
            暂无近 15 个月非复刻活动
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
          <div class="table-input-container table1-input-container">
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

        <!-- 表格2：搓玉数据，左两列固定基准，右两列自动引用活动关 -->
        <div class="input-group">
          <label class="input-label">表格2（搓玉数据，4行 × 4列）</label>
          <div class="table-input-container table2-input-container">
            <div v-for="(row, rowIndex) in table2" :key="'t2-input-r' + rowIndex" class="table-row">
              <span class="row-number">{{ table2Labels[rowIndex] }}</span>
              <div class="row-cells">
                <input
                  v-for="(cell, colIndex) in row"
                  :key="'t2-input-r' + rowIndex + '-c' + colIndex"
                  v-model="table2[rowIndex][colIndex]"
                  type="text"
                  class="input-field cell-field"
                  :class="{ 'fixed-cell-field': colIndex < TABLE2_AUTO_START_COLUMN }"
                  :readonly="colIndex < TABLE2_AUTO_START_COLUMN"
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
import { computed, ref, nextTick, onMounted, onUnmounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { getStageData } from '/src/utils/item/stageEfficiencyCal.js'
import TMP_STAGE_RESULT from '/src/static/json/material/tmp_stage_result.json'
import {
  formatMaterialDemandCount,
  getRecentR3MaterialDemand
} from '/src/utils/material/materialDemandStatistics.js'
import { getStageConfig } from '/src/utils/user/userConfig.js'
import ItemImage from '/src/components/sprite/ItemImage.vue'

const STORAGE_KEY = 'logicalByte_data'
const TABLE2_ICON_SCHEMA_VERSION = 2
const OFFICIAL_NEWS_PROXY_PREFIX = '/official-news-proxy'
const OFFICIAL_NEWS_ORIGIN = 'https://ak.hypergryph.com'
const OFFICIAL_RERUN_KEYWORD = '复刻即将开启'
const DEFAULT_PREVIEW_THEME_KEY = 'default'
const previewThemeOptions = [
  {
    key: 'default',
    name: '默认橙金',
    swatches: ['#f6c491', '#f3b260', '#fff7ea', '#ed7f33'],
    variables: {
      '--lb-preview-font-family': '"Source Han Sans SC", "Noto Sans CJK SC", "Noto Sans SC", "思源黑体", "Microsoft YaHei", "PingFang SC", Arial, sans-serif',
      '--lb-preview-table-font-size': '36px',
      '--lb-preview-table-line-height': '44px',
      '--lb-preview-cell-padding': '22px 10px',
      '--lb-preview-cell-height': '110px',
      '--lb-preview-page-bg': '#fff',
      '--lb-preview-section-bg': '#f6c491',
      '--lb-preview-cell-bg': '#fff7ea',
      '--lb-preview-secondary-cell-bg': '#fff0da',
      '--lb-preview-label-bg': '#f3b260',
      '--lb-preview-head-bg': '#f8cd8a',
      '--lb-preview-head-label-bg': '#f0a85a',
      '--lb-preview-border': '#efc185',
      '--lb-preview-text': '#3f2b1d',
      '--lb-preview-strong-text': '#573018',
      '--lb-preview-accent-text': '#cf6525',
      '--lb-preview-footer-start': '#f5a14b',
      '--lb-preview-footer-end': '#ed7f33',
      '--lb-preview-footer-text': '#fff'
    }
  },
  {
    key: 'fresh',
    name: '清新薄荷',
    swatches: ['#cfe8de', '#86b9a8', '#f5fbf7', '#3f8f7a'],
    variables: {
      '--lb-preview-font-family': '"Source Han Sans SC", "Noto Sans CJK SC", "Noto Sans SC", "思源黑体", "Microsoft YaHei", "PingFang SC", Arial, sans-serif',
      '--lb-preview-table-font-size': '36px',
      '--lb-preview-table-line-height': '44px',
      '--lb-preview-cell-padding': '22px 10px',
      '--lb-preview-cell-height': '110px',
      '--lb-preview-page-bg': '#fff',
      '--lb-preview-section-bg': '#cfe8de',
      '--lb-preview-cell-bg': '#f5fbf7',
      '--lb-preview-secondary-cell-bg': '#e8f5ee',
      '--lb-preview-label-bg': '#86b9a8',
      '--lb-preview-head-bg': '#b7ddce',
      '--lb-preview-head-label-bg': '#6da894',
      '--lb-preview-border': '#a6d0bf',
      '--lb-preview-text': '#263d36',
      '--lb-preview-strong-text': '#21463c',
      '--lb-preview-accent-text': '#2c806c',
      '--lb-preview-footer-start': '#68aa96',
      '--lb-preview-footer-end': '#3f8f7a',
      '--lb-preview-footer-text': '#fff'
    }
  },
  {
    key: 'sky',
    name: '晴空蓝',
    swatches: ['#cfe4f6', '#83add6', '#f4f9fe', '#477fb7'],
    variables: {
      '--lb-preview-font-family': '"Source Han Sans SC", "Noto Sans CJK SC", "Noto Sans SC", "思源黑体", "Microsoft YaHei", "PingFang SC", Arial, sans-serif',
      '--lb-preview-table-font-size': '36px',
      '--lb-preview-table-line-height': '44px',
      '--lb-preview-cell-padding': '22px 10px',
      '--lb-preview-cell-height': '110px',
      '--lb-preview-page-bg': '#fff',
      '--lb-preview-section-bg': '#cfe4f6',
      '--lb-preview-cell-bg': '#f4f9fe',
      '--lb-preview-secondary-cell-bg': '#e6f1fb',
      '--lb-preview-label-bg': '#83add6',
      '--lb-preview-head-bg': '#b7d4ee',
      '--lb-preview-head-label-bg': '#6c9ccc',
      '--lb-preview-border': '#a5c5e3',
      '--lb-preview-text': '#263848',
      '--lb-preview-strong-text': '#21445f',
      '--lb-preview-accent-text': '#2f72aa',
      '--lb-preview-footer-start': '#6f9dcc',
      '--lb-preview-footer-end': '#477fb7',
      '--lb-preview-footer-text': '#fff'
    }
  },
  {
    key: 'rose',
    name: '暖粉珊瑚',
    swatches: ['#f3d3d0', '#d99a92', '#fff7f5', '#bf6f67'],
    variables: {
      '--lb-preview-font-family': '"Source Han Sans SC", "Noto Sans CJK SC", "Noto Sans SC", "思源黑体", "Microsoft YaHei", "PingFang SC", Arial, sans-serif',
      '--lb-preview-table-font-size': '36px',
      '--lb-preview-table-line-height': '44px',
      '--lb-preview-cell-padding': '22px 10px',
      '--lb-preview-cell-height': '110px',
      '--lb-preview-page-bg': '#fff',
      '--lb-preview-section-bg': '#f3d3d0',
      '--lb-preview-cell-bg': '#fff7f5',
      '--lb-preview-secondary-cell-bg': '#fdecea',
      '--lb-preview-label-bg': '#d99a92',
      '--lb-preview-head-bg': '#edbcb7',
      '--lb-preview-head-label-bg': '#ca8178',
      '--lb-preview-border': '#e0b1aa',
      '--lb-preview-text': '#4a2d2a',
      '--lb-preview-strong-text': '#63352f',
      '--lb-preview-accent-text': '#ad5b52',
      '--lb-preview-footer-start': '#d7867f',
      '--lb-preview-footer-end': '#bf6f67',
      '--lb-preview-footer-text': '#fff'
    }
  },
  {
    key: 'mono',
    name: '灰白报表',
    swatches: ['#d9dee3', '#a7b1bc', '#fbfcfd', '#687684'],
    variables: {
      '--lb-preview-font-family': '"Source Han Sans SC", "Noto Sans CJK SC", "Noto Sans SC", "思源黑体", "Microsoft YaHei", "PingFang SC", Arial, sans-serif',
      '--lb-preview-table-font-size': '36px',
      '--lb-preview-table-line-height': '44px',
      '--lb-preview-cell-padding': '22px 10px',
      '--lb-preview-cell-height': '110px',
      '--lb-preview-page-bg': '#fff',
      '--lb-preview-section-bg': '#d9dee3',
      '--lb-preview-cell-bg': '#fbfcfd',
      '--lb-preview-secondary-cell-bg': '#f0f3f5',
      '--lb-preview-label-bg': '#a7b1bc',
      '--lb-preview-head-bg': '#c6ced6',
      '--lb-preview-head-label-bg': '#8f9aa5',
      '--lb-preview-border': '#c2c9d0',
      '--lb-preview-text': '#2f3942',
      '--lb-preview-strong-text': '#25303a',
      '--lb-preview-accent-text': '#5e6e7b',
      '--lb-preview-footer-start': '#8f9aa5',
      '--lb-preview-footer-end': '#687684',
      '--lb-preview-footer-text': '#fff'
    }
  }
]

// 组件挂载状态
const isMounted = ref(false)

const selectedPreviewThemeKey = ref(DEFAULT_PREVIEW_THEME_KEY)
const selectedPreviewTheme = computed(() =>
  previewThemeOptions.find(theme => theme.key === selectedPreviewThemeKey.value) || previewThemeOptions[0]
)
const selectedPreviewThemeStyle = computed(() => selectedPreviewTheme.value.variables)
const previewMaterialIconSize = computed(() => 64)
const previewOrundumIconSize = computed(() => 64)
const previewNextUpIconSize = computed(() => 40)

const selectPreviewTheme = (themeKey) => {
  if (previewThemeOptions.some(theme => theme.key === themeKey)) {
    selectedPreviewThemeKey.value = themeKey
  }
}

// 图片链接（使用 base64 或 blob URL）
const headerImageUrl = ref('')

// 文件输入引用
const fileInput = ref(null)
const imagePreviewRef = ref(null)
const isExportingPreview = ref(false)

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
const createEmptyTable1NextUpIconIds = () => Array.from({ length: 3 }, () => [])
const table1NextUpIconIds = ref(createEmptyTable1NextUpIconIds())

// 表格1的固定标签
const table1Labels = ['关卡', '材料', '掉率', '收益率\n(相对主线)', '近两年消耗量', '预计下次up']

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

// 表格2：搓玉数据，4行4列，左两列固定为1-7基准，右两列自动引用活动关
const TABLE2_FIXED_ROWS = [
  ['关卡', '1-7'],
  ['每1理智可搓玉\n2400理智可搓', '1.09\n2616'],
  ['每抽消耗龙门币', '9.54w'],
  ['搓玉效率(相对)', '100%']
]
const table2Labels = TABLE2_FIXED_ROWS.map(row => row[0])
const TABLE2_COLUMN_COUNT = 4
const TABLE2_AUTO_START_COLUMN = 2
const TABLE2_ORUNDUM_BASELINE = 1.0898
const TABLE2_FIXED_ICON_IDS = [[], ['30012'], [], []]
const ORUNDUM_MATERIAL_ICON_ORDER = ['30011', '30012', '30061', '30062']
const ORUNDUM_MATERIAL_ICON_BY_ITEM_ID = {
  30011: '30011',
  30012: '30012',
  30061: '30061',
  30062: '30062'
}

const createEmptyTable2 = () => TABLE2_FIXED_ROWS.map(row => [
  ...row,
  ...Array(TABLE2_COLUMN_COUNT - row.length).fill('')
])
const createEmptyTable2IconIds = () => TABLE2_FIXED_ICON_IDS.map(ids => [...ids])

const table2 = ref(createEmptyTable2())
const table2IconIds = ref(createEmptyTable2IconIds())

// 历史活动数据
const sourceHistoryActivityList = ref([])
const historyActivityOrundumList = ref([])
const isLoadingHistory = ref(false)
const historyLoadError = ref('')
const referenceInfo = ref('加载往期活动数据后，可一键引用近 15 个月非复刻活动到上方表格。')
const referenceError = ref(false)
const selectedReferenceActivityName = ref('')
const matchedExportActivityName = ref('')
const isLoadingOfficialNews = ref(false)
const officialNewsInfo = ref('')
const officialNewsError = ref(false)

const recentReferenceActivities = computed(() => getRecentNonReprintHistoryActivities())

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
  matchedActivities.value = sourceHistoryActivityList.value.filter(activity => {
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
    quoteActivityData(activity)
  }
}

const getFifteenMonthsAgo = () => {
  const date = new Date()
  date.setMonth(date.getMonth() - 15)
  date.setHours(0, 0, 0, 0)
  return date
}

const isReprintActivity = (activity) => {
  const zoneName = String(activity?.zoneName || '')
  return zoneName.includes('复刻') || activity?.stageType === 'ACT_REP'
}

const getRecentNonReprintHistoryActivities = () => {
  const cutoffTime = getFifteenMonthsAgo().getTime()
  return sourceHistoryActivityList.value
    .filter(activity => {
      const endTime = Number(activity?.endTime || 0)
      return endTime >= cutoffTime && !isReprintActivity(activity)
    })
    .sort((a, b) => Number(b.endTime || 0) - Number(a.endTime || 0))
}

const getActivityStagesForChart = (activity) => {
  return [...(activity?.actStageList || [])]
    .sort((a, b) => getStageSortValue(a.stageCode) - getStageSortValue(b.stageCode))
    .slice(0, 3)
}

const mapStagesToTableRow = (stageData, mapper) => {
  return Array.from({ length: 3 }, (_, index) => {
    const stage = stageData[index]
    return stage ? mapper(stage) : ''
  })
}

const normalizeTable1NextUpIconIds = (data) => {
  const source = Array.isArray(data) ? data : []
  return createEmptyTable1NextUpIconIds().map((_, index) => {
    const ids = Array.isArray(source[index]) ? source[index] : []
    return [...new Set(ids.map(itemId => String(itemId)).filter(Boolean))].slice(0, 3)
  })
}

const getNextUpActivityNameFromText = (text) => {
  const rawText = String(text || '').trim()
  if (!rawText || rawText === '遥遥无期') {
    return ''
  }

  return rawText
    .split(/\r?\n/)[0]
    .replace(/\s*预计\d{4}\/\d{1,2}.*/, '')
    .trim()
}

const getNextUpExpectedTimeFromText = (text) => {
  const match = String(text || '').match(/预计\d{4}\/\d{1,2}/)
  return match ? match[0] : ''
}

const getTable1NextUpIconIds = (colIndex) => {
  const storedIds = table1NextUpIconIds.value[colIndex] || []
  if (storedIds.length > 0) {
    return storedIds
  }

  const nextUpActivityName = getNextUpActivityNameFromText(table1.value[5]?.[colIndex])
  if (!nextUpActivityName) {
    return []
  }

  const nextUpActivity = sourceHistoryActivityList.value.find(activity => activity?.zoneName === nextUpActivityName)
  return getNextUpMaterialIconIds(nextUpActivity)
}

const normalizeTable2Row = (row, rowIndex) => {
  const source = Array.isArray(row) ? row : []
  const nextRow = [...createEmptyTable2()[rowIndex]]

  if (source.length >= TABLE2_COLUMN_COUNT) {
    for (let index = TABLE2_AUTO_START_COLUMN; index < TABLE2_COLUMN_COUNT; index += 1) {
      nextRow[index] = rowIndex === 1
        ? normalizeOrundumYieldText(source[index])
        : source[index]
    }
  }
  return nextRow
}

const normalizeTable2 = (data) => {
  const source = Array.isArray(data) ? data : []
  return createEmptyTable2().map((row, rowIndex) => normalizeTable2Row(source[rowIndex], rowIndex))
}

const normalizeTable2IconIds = (data) => {
  const source = Array.isArray(data) ? data : []
  return createEmptyTable2IconIds().map((defaultIds, colIndex) => {
    if (colIndex < TABLE2_AUTO_START_COLUMN) {
      return defaultIds
    }
    const ids = Array.isArray(source[colIndex]) ? source[colIndex] : []
    const validIds = ids
      .map(itemId => String(itemId))
      .filter(itemId => ORUNDUM_MATERIAL_ICON_ORDER.includes(itemId))
    return [...new Set(validIds)]
  })
}

const getTable2CellIconIds = (colIndex) => {
  return table2IconIds.value[colIndex] || []
}

const getStageSortValue = (stageCode = '') => {
  const match = String(stageCode).match(/(\d+)(?!.*\d)/)
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER
}

const formatPercent = (value, digit = 1) => {
  return Number.isFinite(value) ? `${(value * 100).toFixed(digit)}%` : ''
}

const formatFixed = (value, digit = 2) => {
  return Number.isFinite(Number(value)) ? Number(value).toFixed(digit) : ''
}

const formatOrundumYieldText = (value) => {
  const numberValue = Number(value)
  if (!Number.isFinite(numberValue)) {
    return ''
  }
  return `${formatFixed(numberValue, 2)}\n${formatFixed(numberValue * 2400, 0)}`
}

const normalizeOrundumYieldText = (value) => {
  const text = String(value || '')
  if (!text || text.includes('\n')) {
    return text
  }
  return formatOrundumYieldText(text) || text
}

const getOrundumYieldLines = (value) => String(value || '').split('\n')

const getOrundumYieldPerApText = (value) => getOrundumYieldLines(value)[0] || ''

const getOrundumYieldTotalText = (value) => getOrundumYieldLines(value)[1] || ''

const formatRecentTwoYearDemand = (itemId) => {
  return formatMaterialDemandCount(getRecentR3MaterialDemand(itemId))
}

const activityHasItem = (activity, itemId) => {
  return (activity?.actStageList || []).some(stage => stage.itemId === itemId)
}

const formatExpectedNextUpTime = (time) => {
  const date = new Date(Number(time))
  if (Number.isNaN(date.getTime())) {
    return ''
  }
  date.setFullYear(date.getFullYear() + 1)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}/${month}`
}

const getNextUpActivity = (activity, itemId) => {
  const currentEndTime = Number(activity?.endTime || 0)
  if (!itemId || !Number.isFinite(currentEndTime) || currentEndTime <= 0) {
    return null
  }

  return sourceHistoryActivityList.value
    .filter(candidate =>
      !isReprintActivity(candidate) &&
      Number(candidate?.endTime || 0) > currentEndTime &&
      activityHasItem(candidate, itemId)
    )
    .sort((a, b) => Number(a.endTime || 0) - Number(b.endTime || 0))[0] || null
}

const formatNextUpText = (nextActivity) => {
  const expectedTime = formatExpectedNextUpTime(nextActivity?.endTime)
  return nextActivity && expectedTime
    ? `${nextActivity.zoneName}\n预计${expectedTime}`
    : '遥遥无期'
}

const getNextUpText = (activity, itemId) => {
  return formatNextUpText(getNextUpActivity(activity, itemId))
}

const getNextUpMaterialIconIds = (activity) => {
  if (!activity) {
    return []
  }

  return getActivityStagesForChart(activity)
    .map(stage => String(stage.itemId || ''))
    .filter(Boolean)
}

const getActivityByStage = (stage) => {
  return sourceHistoryActivityList.value.find(activity =>
    activity.zoneName === stage.zoneName &&
    Number(activity.endTime || 0) === Number(stage.endTime || 0)
  ) || sourceHistoryActivityList.value.find(activity =>
    activity.zoneName === stage.zoneName
  )
}

const getActivityOrundumStages = (activity) => {
  const matchedActivity = historyActivityOrundumList.value.find(candidate =>
    candidate.zoneName === activity?.zoneName &&
    Number(candidate.endTime || 0) === Number(activity?.endTime || 0)
  ) || historyActivityOrundumList.value.find(candidate =>
    candidate.zoneName === activity?.zoneName
  )

  if (!matchedActivity?.actStageList?.length) {
    return []
  }

  return [...matchedActivity.actStageList]
    .sort((a, b) => {
      const efficiencyDiff = Number(b.orundumPerAp || 0) - Number(a.orundumPerAp || 0)
      return efficiencyDiff || getStageSortValue(a.stageCode) - getStageSortValue(b.stageCode)
    })
    .slice(0, 2)
}

const getOrundumMaterialIconIds = (stage) => {
  if (!stage) {
    return []
  }

  const sourceItemIds = [
    stage.itemId,
    stage.secondaryItemId,
    ...(Array.isArray(stage.dropDetail) ? stage.dropDetail.map(item => item.itemId) : [])
  ]
  const iconIds = new Set()
  for (const itemId of sourceItemIds) {
    const iconId = ORUNDUM_MATERIAL_ICON_BY_ITEM_ID[String(itemId)]
    if (iconId) {
      iconIds.add(iconId)
    }
  }
  return ORUNDUM_MATERIAL_ICON_ORDER.filter(itemId => iconIds.has(itemId))
}

const formatOrundumTableCell = (stage, rowIndex) => {
  if (!stage) {
    return ''
  }

  switch (rowIndex) {
    case 0:
      return stage.stageCode || ''
    case 1:
      return formatOrundumYieldText(stage.orundumPerAp)
    case 2:
      return `${formatFixed(stage.lmdCost, 2)}w`
    case 3:
      return formatPercent(Number(stage.orundumPerAp) / TABLE2_ORUNDUM_BASELINE, 2)
    default:
      return ''
  }
}

const quoteActivityOrundumData = (activity) => {
  const orundumStages = getActivityOrundumStages(activity)
  const nextTable2IconIds = createEmptyTable2IconIds()
  table2.value = normalizeTable2(table2.value).map((row, rowIndex) => {
    const nextRow = [...row]
    for (let index = 0; index < 2; index += 1) {
      const columnIndex = TABLE2_AUTO_START_COLUMN + index
      nextRow[columnIndex] = formatOrundumTableCell(orundumStages[index], rowIndex)
      nextTable2IconIds[columnIndex] = getOrundumMaterialIconIds(orundumStages[index])
    }
    return nextRow
  })
  table2IconIds.value = nextTable2IconIds
  return orundumStages
}

const quoteActivityData = (activity) => {
  const stageData = getActivityStagesForChart(activity)
  if (stageData.length === 0) {
    updateReferenceInfo('该活动没有可引用的关卡数据。', true)
    return
  }

  table1.value[0] = mapStagesToTableRow(stageData, stage => stage.stageCode || '')
  table1.value[1] = mapStagesToTableRow(stageData, stage => stage.itemId || '')
  table1.value[2] = mapStagesToTableRow(stageData, stage => formatPercent(stage.knockRating, 1))
  table1.value[3] = mapStagesToTableRow(stageData, stage => formatPercent(stage.stageEfficiency, 1))
  table1.value[4] = mapStagesToTableRow(stageData, stage => formatRecentTwoYearDemand(stage.itemId))
  const nextUpActivities = mapStagesToTableRow(stageData, stage => getNextUpActivity(activity, stage.itemId))
  table1.value[5] = nextUpActivities.map(nextActivity => formatNextUpText(nextActivity))
  table1NextUpIconIds.value = normalizeTable1NextUpIconIds(nextUpActivities.map(nextActivity => getNextUpMaterialIconIds(nextActivity)))
  const orundumStages = quoteActivityOrundumData(activity)

  activityName.value = activity.zoneName || ''
  matchedActivities.value = []
  selectedReferenceActivityName.value = activity.zoneName || ''
  matchedExportActivityName.value = activity.zoneName || ''
  const orundumText = orundumStages.length > 0
    ? `；搓玉数据：${orundumStages.map(stage => stage.stageCode).join('、')}。`
    : '；未匹配到活动关搓玉数据。'
  updateReferenceInfo(`已引用 ${activity.zoneName}：${stageData.map(stage => stage.stageCode).join('、')}${orundumText}`)
}

const quoteLatestReferenceActivity = () => {
  if (recentReferenceActivities.value.length === 0) {
    updateReferenceInfo('暂无近 15 个月非复刻活动可引用。', true)
    return
  }

  quoteActivityData(recentReferenceActivities.value[0])
}

const getOfficialNewsProxyPath = (path) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${OFFICIAL_NEWS_PROXY_PREFIX}${normalizedPath}`
}

const fetchOfficialNewsHtml = async (path) => {
  const response = await fetch(getOfficialNewsProxyPath(path))
  if (!response.ok) {
    throw new Error(`官网请求失败：${response.status}`)
  }
  return response.text()
}

const normalizeOfficialNewsHtml = (html) => String(html || '')
  .replace(/\\"/g, '"')
  .replace(/\\u003c/g, '<')
  .replace(/\\u003e/g, '>')
  .replace(/\\u0026/g, '&')
  .replace(/\\\//g, '/')

const decodeHtmlText = (text) => {
  const textarea = document.createElement('textarea')
  textarea.innerHTML = String(text || '')
  return textarea.value
}

const getOfficialNewsPath = (url) => {
  const parsedUrl = new URL(url, OFFICIAL_NEWS_ORIGIN)
  if (parsedUrl.origin !== OFFICIAL_NEWS_ORIGIN) {
    throw new Error('官网链接来源异常')
  }
  return `${parsedUrl.pathname}${parsedUrl.search}`
}

const findLatestOfficialRerunNews = (html) => {
  const normalizedHtml = normalizeOfficialNewsHtml(html)
  const candidates = []
  const itemPattern = /\{[^{}]*"cid":"([^"]+)"[^{}]*"title":"([^"]*复刻即将开启[^"]*)"[^{}]*(?:"displayTime"|"ts"):(\d+)[^{}]*(?:"link":"([^"]+)")?[^{}]*\}/g

  let match = itemPattern.exec(normalizedHtml)
  while (match) {
    candidates.push({
      cid: match[1],
      title: decodeHtmlText(match[2]),
      time: Number(match[3]) || 0,
      link: decodeHtmlText(match[4] || `${OFFICIAL_NEWS_ORIGIN}/news/${match[1]}`)
    })
    match = itemPattern.exec(normalizedHtml)
  }

  const uniqueCandidates = Array.from(
    new Map(candidates.map(candidate => [candidate.cid, candidate])).values()
  ).filter(candidate => candidate.title.includes(OFFICIAL_RERUN_KEYWORD))

  return uniqueCandidates.sort((a, b) => b.time - a.time)[0] || null
}

const getImageUrlFromElement = (imageElement) => {
  const src = imageElement?.getAttribute('src') || ''
  return src ? new URL(src, OFFICIAL_NEWS_ORIGIN).toString() : ''
}

const extractFirstLargeOfficialImage = (html) => {
  const normalizedHtml = normalizeOfficialNewsHtml(html)
  const parser = new DOMParser()
  const documentFromHtml = parser.parseFromString(normalizedHtml, 'text/html')
  const imageElements = Array.from(documentFromHtml.querySelectorAll('img'))
  const largeImageElement = imageElements.find(imageElement => {
    const width = Number(imageElement.getAttribute('data-width') || imageElement.getAttribute('width') || 0)
    const height = Number(imageElement.getAttribute('data-height') || imageElement.getAttribute('height') || 0)
    const src = imageElement.getAttribute('src') || ''
    return src.includes('/upload/image/') && (width >= 1000 || height >= 300)
  }) || imageElements.find(imageElement => (imageElement.getAttribute('src') || '').includes('/upload/image/'))

  return getImageUrlFromElement(largeImageElement)
}

const extractActivityNameFromOfficialTitle = (title) => {
  const normalizedTitle = decodeHtmlText(title)
  const patterns = [
    /「([^」]+)」/,
    /【([^】]+)】/,
    /《([^》]+)》/,
    /\{([^}]+)\}/,
    /{([^}]+)}/
  ]
  for (const pattern of patterns) {
    const match = normalizedTitle.match(pattern)
    if (match?.[1]) {
      return match[1].trim()
    }
  }
  return ''
}

const normalizeActivityKeyword = (text) => String(text || '')
  .replace(/[\s"'“”‘’「」【】《》{}]/g, '')
  .replace(/SideStory|故事集|限时活动|限时复刻|复刻|即将开启|活动预告/gi, '')
  .toLowerCase()

const findActivityByOfficialName = (activityKeyword) => {
  const normalizedKeyword = normalizeActivityKeyword(activityKeyword)
  if (!normalizedKeyword) {
    return null
  }

  const activities = [...sourceHistoryActivityList.value]
    .sort((a, b) => {
      const reprintDiff = Number(isReprintActivity(a)) - Number(isReprintActivity(b))
      return reprintDiff || Number(b.endTime || 0) - Number(a.endTime || 0)
    })

  return activities.find(activity => {
    const normalizedZoneName = normalizeActivityKeyword(activity.zoneName)
    return normalizedZoneName === normalizedKeyword ||
      normalizedZoneName.includes(normalizedKeyword) ||
      normalizedKeyword.includes(normalizedZoneName)
  }) || null
}

const quoteLatestOfficialRerunNews = async () => {
  try {
    isLoadingOfficialNews.value = true
    officialNewsError.value = false
    officialNewsInfo.value = '正在读取官网复刻公告...'

    const newsHtml = await fetchOfficialNewsHtml('/news')
    const officialNews = findLatestOfficialRerunNews(newsHtml)
    if (!officialNews) {
      throw new Error('未找到包含“复刻即将开启”的官网新闻')
    }

    const detailHtml = await fetchOfficialNewsHtml(getOfficialNewsPath(officialNews.link))
    const imageUrl = extractFirstLargeOfficialImage(detailHtml)
    if (!imageUrl) {
      throw new Error('已找到公告，但未找到正文大图')
    }

    headerImageUrl.value = imageUrl
    imageErrors.value.header = false

    const activityKeyword = extractActivityNameFromOfficialTitle(officialNews.title)
    if (!activityKeyword) {
      throw new Error(`已设置头图，但无法从标题中解析活动名：${officialNews.title}`)
    }

    const matchedActivity = findActivityByOfficialName(activityKeyword)
    activityName.value = activityKeyword

    if (!matchedActivity) {
      matchedActivities.value = sourceHistoryActivityList.value.filter(activity =>
        normalizeActivityKeyword(activity.zoneName).includes(normalizeActivityKeyword(activityKeyword))
      )
      throw new Error(`已设置头图，但未匹配到活动：${activityKeyword}`)
    }

    quoteActivityData(matchedActivity)
    officialNewsInfo.value = `已读取 ${officialNews.title}，并引用 ${matchedActivity.zoneName}。`
  } catch (error) {
    officialNewsError.value = true
    officialNewsInfo.value = error?.message || '官网复刻公告读取失败'
  } finally {
    isLoadingOfficialNews.value = false
  }
}

const formatActivityEndTime = (time) => {
  const date = new Date(Number(time))
  if (Number.isNaN(date.getTime())) {
    return ''
  }
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}/${month}`
}

const updateReferenceInfo = (message, isError = false) => {
  referenceInfo.value = message
  referenceError.value = isError
}

const getLoadedReferenceInfo = () => {
  const cutoffDate = getFifteenMonthsAgo()
  const year = cutoffDate.getFullYear()
  const month = String(cutoffDate.getMonth() + 1).padStart(2, '0')
  const day = String(cutoffDate.getDate()).padStart(2, '0')
  return `已加载 ${sourceHistoryActivityList.value.length} 个往期活动，可引用 ${recentReferenceActivities.value.length} 个 ${year}/${month}/${day} 之后的非复刻活动。`
}

const waitForImages = async (container) => {
  const images = Array.from(container?.querySelectorAll('img') || [])
  await Promise.all(images.map(image => {
    if (image.complete && image.naturalWidth > 0) {
      return Promise.resolve()
    }

    return new Promise((resolve, reject) => {
      const handleLoad = () => resolve()
      const handleError = () => reject(new Error('导出前图片未加载成功'))

      image.addEventListener('load', handleLoad, { once: true })
      image.addEventListener('error', handleError, { once: true })
    })
  }))
}

const formatExportDate = () => {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}${month}${day}`
}

const sanitizeFileNamePart = (text, fallback = '活动') => {
  const sanitizedText = String(text || '')
    .replace(/复刻简报|复刻/g, '')
    .replace(/[\\/:*?"<>|\r\n]/g, '')
    .replace(/\s+/g, '')
    .trim()
  return sanitizedText || fallback
}

const getExportActivityName = () => sanitizeFileNamePart(
  matchedExportActivityName.value || selectedReferenceActivityName.value || activityName.value,
  '活动'
)

const getPreviewExportFileName = () => {
  return `${formatExportDate()}${getExportActivityName()}复刻简报.png`
}

const getExportImageSrc = (src) => {
  if (!src || src.startsWith('data:') || src.startsWith('blob:')) {
    return src
  }

  try {
    const parsedUrl = new URL(src, window.location.href)
    return parsedUrl.origin === OFFICIAL_NEWS_ORIGIN
      ? getOfficialNewsProxyPath(`${parsedUrl.pathname}${parsedUrl.search}`)
      : src
  } catch (error) {
    return src
  }
}

const prepareExportClone = (clonedDocument) => {
  const clonedPreview = clonedDocument.querySelector('[data-export-target="return-brief-preview"]')
  const images = Array.from(clonedPreview?.querySelectorAll('img') || [])
  for (const image of images) {
    const exportSrc = getExportImageSrc(image.getAttribute('src') || '')
    if (exportSrc) {
      image.setAttribute('src', exportSrc)
      image.setAttribute('referrerpolicy', 'no-referrer')
    }
  }
}

const downloadPreviewPng = async () => {
  if (!imagePreviewRef.value || isExportingPreview.value) {
    return
  }

  try {
    isExportingPreview.value = true
    await nextTick()
    await waitForImages(imagePreviewRef.value)

    const { default: html2canvas } = await import('html2canvas')
    const canvas = await html2canvas(imagePreviewRef.value, {
      backgroundColor: null,
      scale: 1,
      useCORS: true,
      allowTaint: false,
      logging: false,
      onclone: prepareExportClone
    })

    const link = document.createElement('a')
    link.download = getPreviewExportFileName()
    link.href = canvas.toDataURL('image/png')
    link.click()
    ElMessage.success('PNG 已下载')
  } catch (error) {
    console.error('下载绘图区PNG失败:', error)
    ElMessage.error(error?.message || '下载失败，可能是远程图片不支持跨域')
  } finally {
    isExportingPreview.value = false
  }
}

// 清除活动匹配
const clearActivityMatch = () => {
  activityName.value = ''
  matchedActivities.value = []
  selectedActivityIndex.value = -1
  selectedReferenceActivityName.value = ''
  matchedExportActivityName.value = ''
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
      if (data.previewThemeKey !== undefined) {
        selectPreviewTheme(data.previewThemeKey)
      }
      if (data.activityName !== undefined) {
        activityName.value = data.activityName
      }
      if (data.selectedReferenceActivityName !== undefined) {
        selectedReferenceActivityName.value = data.selectedReferenceActivityName
      }
      if (data.matchedExportActivityName !== undefined) {
        matchedExportActivityName.value = data.matchedExportActivityName
      }
      if (data.table1 && Array.isArray(data.table1) && data.table1.length === 6) {
        table1.value = data.table1.map(row =>
          Array.isArray(row) && row.length === 3 ? [...row] : ['', '', '']
        )
      }
      if (data.table1NextUpIconIds && Array.isArray(data.table1NextUpIconIds)) {
        table1NextUpIconIds.value = normalizeTable1NextUpIconIds(data.table1NextUpIconIds)
      } else {
        table1NextUpIconIds.value = createEmptyTable1NextUpIconIds()
      }
      if (data.table2 && Array.isArray(data.table2)) {
        table2.value = normalizeTable2(data.table2)
      }
      if (
        data.table2IconSchemaVersion === TABLE2_ICON_SCHEMA_VERSION &&
        data.table2IconIds &&
        Array.isArray(data.table2IconIds)
      ) {
        table2IconIds.value = normalizeTable2IconIds(data.table2IconIds)
      } else {
        table2IconIds.value = createEmptyTable2IconIds()
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
      previewThemeKey: selectedPreviewThemeKey.value || DEFAULT_PREVIEW_THEME_KEY,
      activityName: activityName.value || '',
      selectedReferenceActivityName: selectedReferenceActivityName.value || '',
      matchedExportActivityName: matchedExportActivityName.value || '',
      table1: table1.value || [],
      table1NextUpIconIds: table1NextUpIconIds.value || [],
      table2: table2.value || [],
      table2IconIds: table2IconIds.value || [],
      table2IconSchemaVersion: TABLE2_ICON_SCHEMA_VERSION,
      lastSaved: new Date().toISOString()
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    console.log('数据已自动保存')
  } catch (error) {
    console.error('保存数据失败:', error)
  }
}

// 监听数据变化并自动保存
const stopWatch = watch([headerImageUrl, stagePrefix, stageNumber, selectedPreviewThemeKey, activityName, selectedReferenceActivityName, matchedExportActivityName, table1, table1NextUpIconIds, table2, table2IconIds], () => {
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
    selectedPreviewThemeKey.value = DEFAULT_PREVIEW_THEME_KEY
    table1.value = [
      ['', '', ''],
      ['', '', ''],
      ['', '', ''],
      ['', '', ''],
      ['', '', ''],
      ['', '', '']
    ]
    table2.value = createEmptyTable2()
    table1NextUpIconIds.value = createEmptyTable1NextUpIconIds()
    table2IconIds.value = createEmptyTable2IconIds()
    activityName.value = ''
    matchedActivities.value = []
    selectedReferenceActivityName.value = ''
    matchedExportActivityName.value = ''
    officialNewsInfo.value = ''
    officialNewsError.value = false
    updateReferenceInfo(getLoadedReferenceInfo())
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
    
    // 先用本地JSON兜底，随后始终刷新关卡推荐的实时数据。
    if (TMP_STAGE_RESULT && TMP_STAGE_RESULT.historyActStage) {
      sourceHistoryActivityList.value = TMP_STAGE_RESULT.historyActStage
      historyActivityOrundumList.value = TMP_STAGE_RESULT.historyActOrundumStage || []
      updateReferenceInfo(`${getLoadedReferenceInfo()} 正在刷新最新数据...`)
      console.log('从本地JSON加载历史活动数据成功:', sourceHistoryActivityList.value.length, '个活动')
      collectAllStages()
    }

    try {
      const response = await getStageData(getStageConfig())
      if (response && response.historyActStage) {
        sourceHistoryActivityList.value = response.historyActStage
        historyActivityOrundumList.value = response.historyActOrundumStage || []
        updateReferenceInfo(getLoadedReferenceInfo())
        console.log('刷新历史活动数据成功:', sourceHistoryActivityList.value.length, '个活动')
        collectAllStages()
      } else {
        console.warn('实时关卡数据格式不正确:', response)
        if (!sourceHistoryActivityList.value.length) {
          historyLoadError.value = '数据格式错误，请联系管理员'
          updateReferenceInfo(historyLoadError.value, true)
        } else {
          updateReferenceInfo(`${getLoadedReferenceInfo()} 最新数据刷新失败，当前显示本地兜底数据。`, true)
        }
      }
    } catch (apiError) {
      console.error('刷新历史活动数据失败:', apiError)
      if (!sourceHistoryActivityList.value.length) {
        historyLoadError.value = `加载失败: ${apiError.message || '请检查网络连接'}`
        updateReferenceInfo(historyLoadError.value, true)
      } else {
        updateReferenceInfo(`${getLoadedReferenceInfo()} 最新数据刷新失败，当前显示本地兜底数据。`, true)
      }
    }
  } catch (error) {
    console.error('加载历史活动数据失败:', error)
    console.error('错误详情:', error.message, error.stack)
    historyLoadError.value = `加载失败: ${error.message || '请检查网络连接'}`
    updateReferenceInfo(historyLoadError.value, true)
  } finally {
    isLoadingHistory.value = false
  }
}

// 收集所有历史活动关卡
const collectAllStages = () => {
  allStages.value = []
  for (const activity of sourceHistoryActivityList.value) {
    if (activity.actStageList) {
      for (const stage of activity.actStageList) {
        allStages.value.push({
          stageCode: stage.stageCode,
          zoneName: activity.zoneName,
          itemId: stage.itemId,
          knockRating: stage.knockRating,
          stageEfficiency: stage.stageEfficiency,
          endTime: activity.endTime
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

    // 第五行：近两年消耗量
    table1.value[4][0] = formatRecentTwoYearDemand(stage.itemId)

    // 第六行：预计下次 up
    const activity = getActivityByStage(stage)
    const nextUpActivity = activity ? getNextUpActivity(activity, stage.itemId) : null
    table1.value[5][0] = formatNextUpText(nextUpActivity)
    table1NextUpIconIds.value[0] = getNextUpMaterialIconIds(nextUpActivity)
    
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
  font-size: 20px;
  font-weight: 600;
}

.panel-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.download-preview-btn {
  padding: 6px 12px;
  background-color: #409eff;
  border: 1px solid #409eff;
  border-radius: 4px;
  color: #fff;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.download-preview-btn:hover:not(:disabled) {
  background-color: #1f88ff;
  border-color: #1f88ff;
}

.download-preview-btn:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.clear-all-btn {
  padding: 6px 12px;
  background-color: #fff;
  border: 1px solid #ddd;
  border-radius: 4px;
  color: #666;
  font-size: 14px;
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
  background-color: var(--lb-preview-page-bg, #fff);
  font-family: var(--lb-preview-font-family, "Source Han Sans SC", "Noto Sans CJK SC", "Noto Sans SC", "思源黑体", "Microsoft YaHei", "PingFang SC", Arial, sans-serif);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 0;
}

/* 图片区块 */
.image-section {
  position: relative;
  display: block;
  margin: 0;
  padding: 0;
  border-bottom: none;
}

.image-section:last-child {
  border-bottom: none;
}

/* 图片容器 */
.image-container {
  width: 100%;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--lb-preview-page-bg, #fff);
  line-height: 0;
}

.image-container img {
  width: 100%;
  max-width: none;
  height: auto;
  display: block;
  vertical-align: top;
}

/* 空白占位符 */
.empty-placeholder {
  min-height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--lb-preview-secondary-cell-bg, #fff5ea);
  color: var(--lb-preview-accent-text, #bf6a2d);
  font-size: 15px;
  border: 1px dashed var(--lb-preview-border, #f2b27f);
  margin: 0;
}

/* 表头区域 */
.header-section {
  background-color: var(--lb-preview-page-bg, #fff);
  z-index: 1;
  box-shadow: 0 6px 16px rgba(92, 52, 22, 0.14);
}

.header-section .empty-placeholder {
  background-color: var(--lb-preview-secondary-cell-bg, #fff5ea);
  color: var(--lb-preview-accent-text, #bf6a2d);
  border-color: var(--lb-preview-border, #f2b27f);
}

/* 内容区域 */
.content-section {
  padding: 0;
  background-color: var(--lb-preview-section-bg, #f6c491);
}

/* 表格区块 */
.table-section {
  margin-bottom: 0;
  line-height: 0;
}

.table-section:last-child {
  margin-bottom: 0;
}

.table-divider-band {
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: space-around;
  background: var(--lb-preview-secondary-cell-bg, #fff0da);
  color: var(--lb-preview-accent-text, #cf6525);
  font-family: "Noto Sans SC", "Source Han Sans SC", "思源黑体", "Microsoft YaHei", sans-serif;
  font-size: 15px;
  font-weight: 300;
  line-height: 1;
  letter-spacing: 0;
  overflow: hidden;
}

.table-divider-band span {
  opacity: 0.36;
  white-space: nowrap;
}

/* 数据表格 */
.data-grid {
  width: 100%;
  overflow: hidden;
  display: block;
  line-height: normal;
}

.table1-grid table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: var(--lb-preview-table-font-size, 36px);
  display: table;
  table-layout: fixed;
  border: 0;
  box-shadow: none;
}

.table2-grid table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: var(--lb-preview-table-font-size, 36px);
  display: table;
  table-layout: fixed;
  margin: 0 auto;
  border: 0;
  box-shadow: none;
}

.data-cell {
  padding: var(--lb-preview-cell-padding, 14px 10px);
  border: 0;
  border-right: 1px solid var(--lb-preview-border, #efc185);
  border-bottom: 1px solid var(--lb-preview-border, #efc185);
  color: var(--lb-preview-text, #3f2b1d);
  text-align: center;
  white-space: pre-line;
  height: var(--lb-preview-cell-height, 58px);
  line-height: var(--lb-preview-table-line-height, 1.18);
  vertical-align: middle;
  font-weight: 600;
  display: table-cell;
  background-color: var(--lb-preview-cell-bg, #fff7ea);
}

.data-cell:last-child {
  border-right: 0;
}

tr:last-child .data-cell {
  border-bottom: 0;
}

.brief-table-label-column {
  width: 28%;
}

.brief-table-data-column {
  width: 24%;
}

.table1-grid .data-cell.label-cell,
.table2-grid .data-cell.label-cell {
  background-color: var(--lb-preview-label-bg, #f3b260);
  font-weight: 700;
  color: var(--lb-preview-strong-text, #573018);
  letter-spacing: 0;
}

.table1-grid tr:first-child .data-cell,
.table2-grid tr:first-child .data-cell {
  background-color: var(--lb-preview-head-bg, #f8cd8a);
  color: var(--lb-preview-strong-text, #573018);
  font-weight: 800;
}

.table1-grid tr:first-child .data-cell.label-cell,
.table2-grid tr:first-child .data-cell.label-cell {
  background-color: var(--lb-preview-head-label-bg, #f0a85a);
  color: var(--lb-preview-strong-text, #573018);
}

.table1-grid .table1-accent-row .data-cell:not(.label-cell) {
  font-weight: 800;
}

.table1-grid .table1-next-up-row .data-cell:not(.label-cell) {
  font-size: 30px;
  line-height: 1.25;
}

.next-up-cell {
  display: flex;
  min-height: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.next-up-text {
  white-space: pre-line;
}

.next-up-activity-name,
.next-up-expected-time {
  display: block;
  line-height: 1.12;
}

.next-up-material-icons {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  line-height: 0;
}

.next-up-material-icons :deep(div) {
  display: block;
  flex-shrink: 0;
}

.orundum-stage-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 100%;
}

.stage-material-cell {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 100%;
}

.stage-material-cell :deep(img) {
  display: block;
  flex-shrink: 0;
}

.orundum-material-icons {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  flex-shrink: 0;
}

.orundum-material-icons :deep(img) {
  display: block;
}

.orundum-yield-cell {
  display: flex;
  min-height: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  line-height: 1.1;
}

.orundum-yield-line,
.orundum-yield-total {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.orundum-yield-total {
  gap: 6px;
}

.orundum-result-icon {
  display: inline-block;
  flex-shrink: 0;
  transform: scale(0.9);
  transform-origin: center;
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
  background: linear-gradient(135deg, var(--lb-preview-footer-start, #f5a14b) 0%, var(--lb-preview-footer-end, #ed7f33) 100%);
  color: var(--lb-preview-footer-text, #fff);
  padding: 0 0 0 40px;
  gap: 32px;
  position: relative;
  z-index: 1;
  box-shadow: 0 -6px 16px rgba(92, 52, 22, 0.14);
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
  font-size: 28px;
  font-weight: bold;
}

.footer-label {
  min-width: 140px;
  flex-shrink: 0;
  color: var(--lb-preview-footer-text, #fff);
}

.footer-value {
  color: var(--lb-preview-footer-text, #fff);
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
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.input-field {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
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
  font-size: 14px;
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
  font-size: 14px;
  font-weight: 500;
}

.clear-btn {
  padding: 4px 12px;
  background-color: #fff;
  border: 1px solid #ddd;
  border-radius: 4px;
  color: #666;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.clear-btn:hover {
  background-color: #fee;
  border-color: #f56c6c;
  color: #f56c6c;
}

/* 配色主题 */
.theme-selector {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.theme-option {
  min-height: 74px;
  padding: 10px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  background-color: #fff;
  color: #333;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 8px;
  text-align: left;
  transition: border-color 0.2s, box-shadow 0.2s, background-color 0.2s;
}

.theme-option:hover,
.theme-option-active {
  border-color: #409eff;
  background-color: #f7fbff;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.12);
}

.theme-swatch-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  height: 24px;
  overflow: hidden;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 4px;
}

.theme-swatch {
  min-width: 0;
}

.theme-name {
  font-size: 14px;
  font-weight: 600;
  line-height: 1.2;
}

/* 往期活动引用 */
.reference-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.reference-btn {
  padding: 8px 14px;
  border: 1px solid #409eff;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  background-color: #409eff;
  color: #fff;
}

.reference-btn:hover:not(:disabled) {
  background-color: #1f88ff;
  border-color: #1f88ff;
}

.reference-btn:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.reference-info {
  margin-top: 8px;
  color: #666;
  font-size: 14px;
  line-height: 1.5;
}

.reference-info-error {
  color: #f56c6c;
}

.reference-activity-list {
  margin-top: 10px;
  max-height: 210px;
  overflow-y: auto;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  background-color: #fff;
}

.reference-activity-item {
  width: 100%;
  padding: 10px 12px;
  border: 0;
  border-bottom: 1px solid #f0f0f0;
  background-color: #fff;
  color: #333;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  text-align: left;
  transition: background-color 0.2s;
}

.reference-activity-item:last-child {
  border-bottom: 0;
}

.reference-activity-item:hover,
.reference-activity-item-active {
  background-color: #f0f7ff;
}

.reference-activity-name {
  font-size: 14px;
  font-weight: 600;
}

.reference-activity-meta {
  color: #666;
  font-size: 13px;
}

.reference-empty {
  margin-top: 8px;
  color: #999;
  font-size: 14px;
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
  font-size: 14px;
  font-weight: 600;
  color: #666;
  width: 50px;
  flex-shrink: 0;
}

.row-cells {
  flex: 1;
  display: grid;
}

.table1-input-container .row-cells,
.table2-input-container .row-cells {
  gap: 6px;
}

.table1-input-container .row-cells {
  grid-template-columns: repeat(3, 1fr);
}

.table2-input-container .row-cells {
  grid-template-columns: repeat(4, 1fr);
}

.table2-input-container .row-number {
  width: 120px;
}

.cell-field {
  padding: 8px;
  font-size: 14px;
  width: 100%;
}

.fixed-cell-field {
  background-color: #f5f7fa;
  color: #606266;
  cursor: default;
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
  font-size: 15px;
  flex-shrink: 0;
}

.stage-match-zone {
  font-size: 13px;
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
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.json-count {
  font-size: 14px;
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
  font-size: 14px;
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
  font-size: 32px;
}

.error-text {
  font-size: 15px;
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
  font-size: 14px;
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
  font-size: 14px;
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
    background-color: #fff;
  }

  .image-section {
    border-bottom-color: transparent;
  }

  .image-container {
    background-color: #fff;
  }

  .empty-placeholder {
    background-color: #1e1e1e;
    border-color: #555;
    color: #888;
  }

  .image-preview .empty-placeholder {
    background-color: var(--lb-preview-secondary-cell-bg, #fff5ea);
    border-color: var(--lb-preview-border, #f2b27f);
    color: var(--lb-preview-accent-text, #bf6a2d);
  }

  .header-section {
    background-color: var(--lb-preview-page-bg, #fff);
  }

  .header-section .empty-placeholder {
    background-color: var(--lb-preview-secondary-cell-bg, #fff5ea);
    color: var(--lb-preview-accent-text, #bf6a2d);
    border-color: var(--lb-preview-border, #f2b27f);
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

  .reference-info {
    color: #aaa;
  }

  .reference-info-error {
    color: #f56c6c;
  }

  .reference-activity-list {
    background-color: #1e1e1e;
    border-color: #555;
  }

  .reference-activity-item {
    background-color: #1e1e1e;
    border-bottom-color: #444;
    color: #e0e0e0;
  }

  .reference-activity-item:hover,
  .reference-activity-item-active {
    background-color: #1a3a52;
  }

  .reference-activity-meta,
  .reference-empty {
    color: #aaa;
  }

  .theme-option {
    background-color: #1e1e1e;
    border-color: #555;
    color: #e0e0e0;
  }

  .theme-option:hover,
  .theme-option-active {
    background-color: #1a3a52;
    border-color: #409eff;
  }

  .theme-swatch-row {
    border-color: rgba(255, 255, 255, 0.14);
  }

  .data-cell {
    border-color: var(--lb-preview-border, #efc185);
    color: var(--lb-preview-text, #3f2b1d);
    background-color: var(--lb-preview-cell-bg, #fff7ea);
  }

  .table1-grid .data-cell.label-cell,
  .table2-grid .data-cell.label-cell {
    background-color: var(--lb-preview-label-bg, #f3b260);
    color: var(--lb-preview-strong-text, #573018);
  }

  .table1-grid tr:first-child .data-cell,
  .table2-grid tr:first-child .data-cell {
    background-color: var(--lb-preview-head-bg, #f8cd8a);
    color: var(--lb-preview-strong-text, #573018);
  }

  .table1-grid tr:first-child .data-cell.label-cell,
  .table2-grid tr:first-child .data-cell.label-cell {
    background-color: var(--lb-preview-head-label-bg, #f0a85a);
    color: var(--lb-preview-strong-text, #573018);
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
