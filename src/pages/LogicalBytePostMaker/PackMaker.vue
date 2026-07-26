<template>
  <main class="pack-maker-page">
    <header class="pack-maker-header">
      <div>
        <p class="pack-maker-kicker">LogicalByte Post Maker</p>
        <h1>礼包性价比制图</h1>
      </div>
    </header>

    <div class="pack-maker-workspace">
      <section class="pack-maker-preview-panel">
        <header class="pack-maker-panel-header">
          <div>
            <p class="pack-maker-panel-kicker">Preview</p>
            <h2>长图预览</h2>
          </div>
          <span class="pack-maker-preview-size">1080px</span>
        </header>

        <div class="pack-maker-preview-viewport">
          <div
            ref="previewRef"
            class="pack-maker-preview pack-efficiency-page pack-content-white-background pack-hide-countdown"
            data-export-target="pack-maker-preview"
          >
            <section class="pack-maker-header-image-section">
              <img
                v-if="headerImageUrl"
                :src="headerImageUrl"
                alt="礼包制图头图"
                @error="headerImageFailed = true"
              />
              <div v-else class="pack-maker-header-placeholder">
                请在右侧上传头图
              </div>
            </section>

            <section class="pack-maker-package-section">
              <div v-if="selectedPacks.length > 0" class="pack-maker-pack-list">
                <PackCardGroup :model-value="selectedPacks" :display-scale="2" force-expanded />
              </div>
              <div v-else class="pack-maker-pack-placeholder">
                请选择在售礼包
              </div>
            </section>

            <footer class="pack-maker-footer">
              <div class="pack-maker-footer-text">
                <div
                  v-for="(row, index) in footerRows"
                  :key="`footer-row-${index}`"
                  class="pack-maker-footer-row"
                >
                  <span class="pack-maker-footer-label">{{ row.label }}</span>
                  <span class="pack-maker-footer-value">{{ row.content }}</span>
                </div>
              </div>
              <div class="pack-maker-footer-qr">
                <img src="/image/website/QR/LogicalByteQR.png" alt="LogicalByte 二维码" />
              </div>
            </footer>
          </div>
        </div>
      </section>

      <aside class="pack-maker-control-panel">
        <header class="pack-maker-panel-header">
          <div>
            <p class="pack-maker-panel-kicker">Controls</p>
            <h2>制图设置</h2>
          </div>
          <el-button
            :icon="Refresh"
            circle
            plain
            :loading="isLoadingPacks"
            title="刷新在售礼包"
            @click="loadPacks({ notify: true })"
          />
        </header>

        <div class="pack-maker-controls">
          <section class="pack-maker-control-section pack-maker-news-link">
            <el-link
              :icon="Link"
              href="https://ak.hypergryph.com/news"
              target="_blank"
              rel="noopener noreferrer"
              type="primary"
            >
              官方公告
            </el-link>
          </section>

          <section class="pack-maker-control-section">
            <div class="pack-maker-control-heading">
              <h3>头图</h3>
              <span>固定宽度 1080px</span>
            </div>
            <el-upload
              ref="headerUploadRef"
              class="pack-maker-header-upload"
              accept="image/*"
              :auto-upload="false"
              :show-file-list="false"
              :on-change="handleHeaderFileChange"
            >
              <el-button :icon="UploadFilled" type="primary">上传头图</el-button>
            </el-upload>
            <div v-if="headerImageUrl" class="pack-maker-upload-status">
              <span>{{ headerImageName || '已上传头图' }}</span>
              <el-tooltip content="移除头图" placement="top">
                <el-button :icon="Delete" circle text @click="clearHeaderImage" />
              </el-tooltip>
            </div>
            <p v-if="headerImageFailed" class="pack-maker-error">
              头图加载失败，请重新上传。
            </p>
          </section>

          <section class="pack-maker-control-section">
            <div class="pack-maker-control-heading">
              <h3>礼包选择</h3>
              <span>{{ visiblePackCount }} 个匹配</span>
            </div>
            <el-input
              v-model="packSearch"
              clearable
              :prefix-icon="Search"
              placeholder="搜索礼包名称"
            />
            <div v-if="isLoadingPacks" class="pack-maker-status">
              正在读取礼包数据...
            </div>
            <div v-else-if="visiblePackCount === 0" class="pack-maker-status">
              没有匹配的礼包。
            </div>
            <div v-else class="pack-maker-candidate-groups">
              <div v-if="currentOrUpcomingPacks.length > 0" class="pack-maker-candidate-group">
                <div class="pack-maker-candidate-group-heading">
                  <span>在售 / 即将开售</span>
                  <span>{{ currentOrUpcomingPacks.length }}</span>
                </div>
                <div class="pack-maker-candidate-list">
                  <label
                    v-for="pack in currentOrUpcomingPacks"
                    :key="pack.id"
                    class="pack-maker-candidate"
                    :class="{ 'pack-maker-candidate-selected': isPackSelected(pack.id) }"
                  >
                    <el-checkbox
                      :model-value="isPackSelected(pack.id)"
                      @change="togglePackSelection(pack.id, $event)"
                    />
                    <img :src="getPackImageLink(pack.imageLink)" alt="" />
                    <span class="pack-maker-candidate-name">{{ pack.officialName || pack.name }}</span>
                    <span class="pack-maker-candidate-price">￥{{ pack.price }}</span>
                  </label>
                </div>
              </div>

              <div v-if="otherPacks.length > 0" class="pack-maker-candidate-group">
                <div class="pack-maker-candidate-group-heading">
                  <span>其余礼包</span>
                  <span>{{ otherPacks.length }}</span>
                </div>
                <div class="pack-maker-candidate-list">
                  <label
                    v-for="pack in otherPacks"
                    :key="pack.id"
                    class="pack-maker-candidate"
                    :class="{ 'pack-maker-candidate-selected': isPackSelected(pack.id) }"
                  >
                    <el-checkbox
                      :model-value="isPackSelected(pack.id)"
                      @change="togglePackSelection(pack.id, $event)"
                    />
                    <img :src="getPackImageLink(pack.imageLink)" alt="" />
                    <span class="pack-maker-candidate-name">{{ pack.officialName || pack.name }}</span>
                    <span class="pack-maker-candidate-price">￥{{ pack.price }}</span>
                  </label>
                </div>
              </div>
            </div>
          </section>

          <section class="pack-maker-control-section">
            <div class="pack-maker-control-heading">
              <h3>已选礼包</h3>
              <span>{{ selectedPacks.length }} 个</span>
            </div>
            <div v-if="selectedPacks.length === 0" class="pack-maker-status">
              选择后的礼包会按这里的顺序排入长图。
            </div>
            <ol v-else class="pack-maker-selected-list">
              <li v-for="(pack, index) in selectedPacks" :key="pack.id">
                <span class="pack-maker-selected-index">{{ index + 1 }}</span>
                <span class="pack-maker-selected-name">{{ pack.officialName || pack.name }}</span>
                <div class="pack-maker-selected-actions">
                  <el-tooltip content="上移" placement="top">
                    <el-button
                      :icon="ArrowUp"
                      circle
                      text
                      :disabled="index === 0"
                      @click="moveSelectedPack(index, -1)"
                    />
                  </el-tooltip>
                  <el-tooltip content="下移" placement="top">
                    <el-button
                      :icon="ArrowDown"
                      circle
                      text
                      :disabled="index === selectedPacks.length - 1"
                      @click="moveSelectedPack(index, 1)"
                    />
                  </el-tooltip>
                  <el-tooltip content="移除" placement="top">
                    <el-button :icon="Delete" circle text @click="removeSelectedPack(pack.id)" />
                  </el-tooltip>
                </div>
              </li>
            </ol>
          </section>

          <section class="pack-maker-control-section">
            <div class="pack-maker-control-heading">
              <h3>页脚文案</h3>
              <el-button link type="primary" @click="resetFooterRows">恢复默认</el-button>
            </div>
            <div class="pack-maker-footer-editors">
              <div v-for="(row, index) in footerRows" :key="`footer-editor-${index}`">
                <el-input
                  v-model="row.label"
                  maxlength="16"
                  placeholder="标签"
                  show-word-limit
                />
                <el-input
                  v-model="row.content"
                  maxlength="72"
                  placeholder="文案"
                  show-word-limit
                />
              </div>
            </div>
          </section>

          <section class="pack-maker-export-section">
            <el-button
              type="primary"
              size="large"
              :icon="Download"
              :loading="isExporting"
              :disabled="!canExport"
              @click="exportPng"
            >
              下载 PNG
            </el-button>
            <p>需先上传头图并选择至少一个礼包。</p>
          </section>
        </div>
      </aside>
    </div>
  </main>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  ArrowDown,
  ArrowUp,
  Delete,
  Download,
  Link,
  Refresh,
  Search,
  UploadFilled
} from '@element-plus/icons-vue'

import PackCardGroup from '/src/components/material/PackCardGroup.vue'
import packInfoCache from '/src/plugins/indexedDB/packInfoCache.js'
import itemCache from '/src/plugins/indexedDB/itemCache.js'
import { getStageConfig } from '/src/utils/user/userConfig.js'
import { calculatePackEfficiency } from '/src/utils/item/packEfficiency.js'
import '/src/assets/css/material/pack.scss'

const STORAGE_KEY = 'logicalByte_packMaker_settings_v1'
const DEFAULT_FOOTER_ROWS = [
  {
    label: '数据源：',
    content: '明日方舟一图流 https://ark.yituliu.cn/'
  },
  {
    label: '',
    content: '企鹅物流数据统计 https://penguin-stats.cn/'
  },
  {
    label: '数据整理：',
    content: '逻辑元LogicalByte@Bilibili'
  }
]

const previewRef = ref(null)
const headerUploadRef = ref(null)
const headerImageUrl = ref('')
const headerImageName = ref('')
const headerImageFailed = ref(false)
const packSearch = ref('')
const isLoadingPacks = ref(false)
const isExporting = ref(false)
const packs = ref([])
const selectedPackIds = ref([])
const footerRows = ref(createDefaultFooterRows())
const packDataLoadedAt = ref(Date.now())
const isStorageReady = ref(false)

const searchedPacks = computed(() => {
  const keyword = packSearch.value.trim().toLocaleLowerCase()
  if (!keyword) {
    return packs.value
  }

  return packs.value.filter(pack => {
    const name = String(pack.officialName || pack.name || '').toLocaleLowerCase()
    return name.includes(keyword)
  })
})

const currentOrUpcomingPacks = computed(() => {
  const now = packDataLoadedAt.value
  return searchedPacks.value.filter(pack => getTimestamp(pack.end) > now)
})

const otherPacks = computed(() => {
  const now = packDataLoadedAt.value
  return searchedPacks.value.filter(pack => getTimestamp(pack.end) <= now)
})

const visiblePackCount = computed(() => currentOrUpcomingPacks.value.length + otherPacks.value.length)

const selectedPacks = computed(() => {
  const packMap = new Map(packs.value.map(pack => [getPackId(pack.id), pack]))
  return selectedPackIds.value
    .map(packId => packMap.get(packId))
    .filter(Boolean)
})

const canExport = computed(() => headerImageUrl.value && selectedPacks.value.length > 0 && !isExporting.value)

onMounted(() => {
  loadFromStorage()
  isStorageReady.value = true
  loadPacks()
})

watch([headerImageUrl, headerImageName, packSearch, selectedPackIds, footerRows], () => {
  if (isStorageReady.value) {
    saveToStorage()
  }
}, { deep: true })

async function loadPacks({ notify = false } = {}) {
  if (isLoadingPacks.value) {
    return
  }

  isLoadingPacks.value = true
  try {
    const stageConfig = getStageConfig()
    const itemValueMap = await itemCache.getItemValueMapCacheByConfig(stageConfig)
    const packInfoList = await packInfoCache.listPackInfo(true)
    const now = Date.now()

    packs.value = packInfoList
      .map(pack => buildPackPresentation(pack, itemValueMap))
      .sort((left, right) => getTimestamp(right.start) - getTimestamp(left.start))
    packDataLoadedAt.value = now

    const availableIds = new Set(packs.value.map(pack => getPackId(pack.id)))
    selectedPackIds.value = selectedPackIds.value.filter(packId => availableIds.has(packId))

    if (notify) {
      ElMessage.success('礼包数据已从服务器刷新')
    }
  } catch (error) {
    console.error('加载在售礼包失败:', error)
    ElMessage.error(getErrorMessage(error, '礼包数据加载失败'))
  } finally {
    isLoadingPacks.value = false
  }
}

function buildPackPresentation(pack, itemValueMap) {
  const presentation = calculatePackEfficiency(pack, itemValueMap, false, false)
  presentation.lineChartData = [
    { label: '大月卡', value: 1.57, color: 'rgb(65,147,220)', display: true },
    { label: '648源石', value: 1, color: 'rgb(65,147,220)', display: true },
    { label: '仅抽卡', value: presentation.drawEfficiency, color: '#F88C20', display: true },
    { label: '全物品', value: presentation.packEfficiency, color: 'rgb(250, 83, 83)', display: true }
  ].sort((left, right) => right.value - left.value)
  return presentation
}

function getTimestamp(value) {
  if (typeof value === 'number') {
    return value
  }

  const timestamp = new Date(value).getTime()
  return Number.isNaN(timestamp) ? 0 : timestamp
}

function getPackId(packId) {
  return String(packId)
}

function getPackImageLink(imageLink) {
  return imageLink ? `https://cos.yituliu.cn/${imageLink}` : ''
}

function isPackSelected(packId) {
  return selectedPackIds.value.includes(getPackId(packId))
}

function togglePackSelection(packId, selected) {
  const normalizedPackId = getPackId(packId)
  if (selected) {
    if (!selectedPackIds.value.includes(normalizedPackId)) {
      selectedPackIds.value.push(normalizedPackId)
    }
    return
  }

  selectedPackIds.value = selectedPackIds.value.filter(id => id !== normalizedPackId)
}

function removeSelectedPack(packId) {
  togglePackSelection(packId, false)
}

function moveSelectedPack(index, direction) {
  const destination = index + direction
  if (destination < 0 || destination >= selectedPackIds.value.length) {
    return
  }

  const next = [...selectedPackIds.value]
  ;[next[index], next[destination]] = [next[destination], next[index]]
  selectedPackIds.value = next
}

function handleHeaderFileChange(uploadFile) {
  const file = uploadFile.raw
  if (!file) {
    return
  }

  if (!file.type.startsWith('image/')) {
    ElMessage.warning('请选择图片文件')
    return
  }

  const reader = new FileReader()
  reader.onload = event => {
    headerImageUrl.value = String(event.target?.result || '')
    headerImageName.value = file.name
    headerImageFailed.value = false
  }
  reader.onerror = () => {
    ElMessage.error('读取头图失败')
  }
  reader.readAsDataURL(file)
}

function clearHeaderImage() {
  headerImageUrl.value = ''
  headerImageName.value = ''
  headerImageFailed.value = false
  headerUploadRef.value?.clearFiles()
}

function resetFooterRows() {
  footerRows.value = createDefaultFooterRows()
}

function createDefaultFooterRows() {
  return DEFAULT_FOOTER_ROWS.map(row => ({ ...row }))
}

function loadFromStorage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) {
      return
    }

    const data = JSON.parse(saved)
    if (typeof data.headerImageUrl === 'string') {
      headerImageUrl.value = data.headerImageUrl
    }
    if (typeof data.headerImageName === 'string') {
      headerImageName.value = data.headerImageName
    }
    if (typeof data.packSearch === 'string') {
      packSearch.value = data.packSearch
    }
    if (Array.isArray(data.selectedPackIds)) {
      selectedPackIds.value = data.selectedPackIds.map(getPackId)
    }
    if (Array.isArray(data.footerRows)) {
      footerRows.value = DEFAULT_FOOTER_ROWS.map((defaultRow, index) => {
        const savedRow = data.footerRows[index]
        return {
          label: typeof savedRow?.label === 'string' ? savedRow.label : defaultRow.label,
          content: typeof savedRow?.content === 'string' ? savedRow.content : defaultRow.content
        }
      })
    }
  } catch (error) {
    console.error('恢复礼包制图设置失败:', error)
  }
}

function saveToStorage() {
  const settings = {
    headerImageUrl: headerImageUrl.value,
    headerImageName: headerImageName.value,
    packSearch: packSearch.value,
    selectedPackIds: selectedPackIds.value,
    footerRows: footerRows.value
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch (error) {
    console.warn('保存礼包制图设置失败，尝试跳过头图保存:', error)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        ...settings,
        headerImageUrl: '',
        headerImageName: ''
      }))
    } catch (fallbackError) {
      console.error('保存礼包制图设置失败:', fallbackError)
    }
  }
}

async function exportPng() {
  if (!headerImageUrl.value || selectedPacks.value.length === 0) {
    ElMessage.warning('请先上传头图并选择礼包')
    return
  }

  if (!previewRef.value || isExporting.value) {
    return
  }

  isExporting.value = true
  try {
    await nextTick()
    await document.fonts?.ready
    await waitForImages(previewRef.value)

    const { default: html2canvas } = await import('html2canvas')
    const canvas = await html2canvas(previewRef.value, {
      backgroundColor: '#ffffff',
      scale: 1,
      useCORS: true,
      allowTaint: false,
      logging: false
    })

    const link = document.createElement('a')
    link.download = `礼包性价比_${formatDateForFileName(new Date())}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
    ElMessage.success('PNG 已下载')
  } catch (error) {
    console.error('导出礼包长图失败:', error)
    ElMessage.error(getErrorMessage(error, '导出失败，可能是远程图片不支持跨域读取'))
  } finally {
    isExporting.value = false
  }
}

async function waitForImages(container) {
  const images = Array.from(container.querySelectorAll('img'))
  await Promise.all(images.map(image => {
    if (image.complete) {
      return Promise.resolve()
    }

    return new Promise(resolve => {
      const finish = () => resolve()
      image.addEventListener('load', finish, { once: true })
      image.addEventListener('error', finish, { once: true })
    })
  }))
}

function formatDateForFileName(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}${month}${day}`
}

function getErrorMessage(error, fallback) {
  return error?.message || fallback
}
</script>

<style scoped>
.pack-maker-page {
  --pack-maker-page-bg: #f3f5f8;
  --pack-maker-panel-bg: #ffffff;
  --pack-maker-border: #dfe3eb;
  --pack-maker-heading: #172033;
  --pack-maker-text: #596276;
  --pack-maker-muted: #7b8496;

  min-height: calc(100vh - 64px);
  padding: 24px;
  background: var(--pack-maker-page-bg);
}

.pack-maker-header,
.pack-maker-workspace {
  max-width: 1600px;
  margin: 0 auto;
}

.pack-maker-header {
  margin-bottom: 18px;
}

.pack-maker-kicker,
.pack-maker-panel-kicker {
  margin: 0 0 4px;
  color: #3867d6;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
}

.pack-maker-header h1,
.pack-maker-panel-header h2,
.pack-maker-control-heading h3 {
  margin: 0;
  color: var(--pack-maker-heading);
}

.pack-maker-header h1 {
  font-size: 2rem;
  line-height: 1.2;
}

.pack-maker-workspace {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 390px;
  gap: 18px;
  align-items: start;
}

.pack-maker-preview-panel,
.pack-maker-control-panel {
  border: 1px solid var(--pack-maker-border);
  border-radius: 8px;
  background: var(--pack-maker-panel-bg);
  box-shadow: 0 6px 18px rgba(29, 38, 58, 0.06);
}

.pack-maker-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: 70px;
  padding: 14px 18px;
  border-bottom: 1px solid var(--pack-maker-border);
}

.pack-maker-panel-header h2 {
  font-size: 1.05rem;
  line-height: 1.25;
}

.pack-maker-preview-size {
  flex: 0 0 auto;
  color: var(--pack-maker-muted);
  font-family: Consolas, "Courier New", monospace;
  font-size: 0.78rem;
}

.pack-maker-preview-viewport {
  overflow: auto;
  padding: 18px;
  background: #e8ebf0;
}

.pack-maker-preview {
  width: 1080px;
  margin: 0;
  overflow: hidden;
  background: #ffffff;
  color: #20252e;
  box-shadow: 0 8px 22px rgba(30, 39, 58, 0.15);
}

.pack-maker-header-image-section {
  width: 1080px;
  background: #f3f4f6;
}

.pack-maker-header-image-section img {
  display: block;
  width: 1080px;
  height: auto;
}

.pack-maker-header-placeholder,
.pack-maker-pack-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
}

.pack-maker-header-placeholder {
  min-height: 260px;
  border-bottom: 1px dashed #c7ced9;
  font-size: 28px;
}

.pack-maker-package-section {
  min-height: 180px;
  padding: 20px 0;
  background: #f6f7f9;
}

.pack-maker-pack-list {
  width: 1032px;
  margin: 0 auto;
}

.pack-maker-pack-list :deep(.pack-card-container) {
  display: flex;
  width: 1032px;
  max-width: none;
  flex-direction: column;
  flex-wrap: nowrap;
}

.pack-maker-pack-list :deep(.pack-card) {
  width: 1000px;
  max-width: none;
  margin: 16px;
}

.pack-maker-pack-list :deep(.pack-card-part-left) {
  width: 300px;
  height: 220px;
}

.pack-maker-pack-list :deep(.pack-image) {
  width: 300px;
  height: 220px;
}

.pack-maker-pack-list :deep(.pack-display-name) {
  top: 172px;
  width: 300px;
  height: 48px;
  padding-top: 6px;
  font-size: 24px;
}

.pack-maker-pack-list :deep(.pack-corner) {
  width: 192px;
  top: 16px;
  left: -56px;
  font-size: 28px;
}

.pack-maker-pack-list :deep(.pack-info) {
  width: 708px;
  height: 200px;
  margin-top: 8px;
  margin-left: -8px;
  border-radius: 8px;
}

.pack-maker-pack-list :deep(.pack-info-text) {
  width: 184px;
  margin-left: 12px;
  font-size: 32px;
}

.pack-maker-pack-list :deep(.pack-info-text span) {
  line-height: 44px;
}

.pack-maker-pack-list :deep(.pack-chart-line) {
  width: 504px;
  border-left-width: 2px;
}

.pack-maker-pack-list :deep(.pack-chart-line-item) {
  font-size: 30px;
}

.pack-maker-pack-list :deep(.pack-chart-line-label) {
  width: 160px;
}

.pack-maker-pack-list :deep(.pack-line-bar) {
  height: 36px;
  padding: 0 16px;
  border-radius: 200px;
  font-size: 24px;
  line-height: 36px;
}

.pack-maker-pack-list :deep(.pack-content) {
  display: flex;
  width: 960px;
  margin-top: -40px;
  margin-left: 20px;
  padding: 40px 16px 0;
  font-size: 28px;
}

.pack-maker-pack-list :deep(.pack-content-material) {
  padding: 8px;
  font-size: 24px;
}

.pack-maker-pack-list :deep(.pack-content-material .v-table) {
  font-size: 24px;
}

.pack-maker-pack-list :deep(.pack-content-material th),
.pack-maker-pack-list :deep(.pack-content-material td) {
  min-height: 72px;
  padding: 8px 12px;
}

.pack-maker-pack-list :deep(.pack-content-item) {
  width: 200px;
}

.pack-maker-pack-list :deep(.pack-content-item-name) {
  font-size: 20px;
}

.pack-maker-pack-list :deep(.pack-note) {
  width: 96%;
  margin: 0 1%;
  font-size: 28px;
}

.pack-maker-pack-placeholder {
  min-height: 180px;
  font-size: 24px;
}

.pack-maker-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 168px;
  padding-left: 40px;
  gap: 32px;
  background: linear-gradient(135deg, #f5a14b 0%, #ed7f33 100%);
  color: #ffffff;
  box-shadow: 0 -6px 16px rgba(92, 52, 22, 0.14);
}

.pack-maker-footer-text {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 10px;
}

.pack-maker-footer-row {
  display: flex;
  min-width: 0;
  align-items: baseline;
  font-size: 28px;
  font-weight: 700;
}

.pack-maker-footer-label {
  min-width: 140px;
  flex-shrink: 0;
}

.pack-maker-footer-value {
  min-width: 0;
  overflow-wrap: anywhere;
}

.pack-maker-footer-qr {
  display: flex;
  width: 168px;
  height: 168px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.pack-maker-footer-qr img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.pack-maker-controls {
  display: flex;
  flex-direction: column;
}

.pack-maker-news-link {
  display: flex;
  align-items: center;
}

.pack-maker-control-section,
.pack-maker-export-section {
  padding: 16px 18px;
  border-bottom: 1px solid var(--pack-maker-border);
}

.pack-maker-control-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.pack-maker-control-heading h3 {
  font-size: 0.92rem;
  line-height: 1.35;
}

.pack-maker-control-heading span,
.pack-maker-export-section p {
  color: var(--pack-maker-muted);
  font-size: 0.78rem;
}

.pack-maker-header-upload {
  display: inline-flex;
}

.pack-maker-upload-status {
  display: flex;
  min-width: 0;
  margin-top: 8px;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  color: var(--pack-maker-text);
  font-size: 0.82rem;
}

.pack-maker-upload-status span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pack-maker-error {
  margin: 8px 0 0;
  color: #c45656;
  font-size: 0.8rem;
}

.pack-maker-status {
  margin-top: 10px;
  color: var(--pack-maker-muted);
  font-size: 0.82rem;
  line-height: 1.5;
}

.pack-maker-candidate-list {
  display: grid;
  max-height: 220px;
  overflow-y: auto;
  border: 1px solid var(--pack-maker-border);
  border-radius: 6px;
}

.pack-maker-candidate-groups {
  display: grid;
  gap: 14px;
  margin-top: 10px;
}

.pack-maker-candidate-group {
  display: grid;
  gap: 6px;
}

.pack-maker-candidate-group-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  color: var(--pack-maker-text);
  font-size: 0.82rem;
  font-weight: 700;
}

.pack-maker-candidate-group-heading span:last-child {
  color: var(--pack-maker-muted);
  font-family: Consolas, "Courier New", monospace;
  font-size: 0.76rem;
}

.pack-maker-candidate {
  display: grid;
  min-width: 0;
  grid-template-columns: auto 46px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  padding: 7px 9px;
  border-bottom: 1px solid var(--pack-maker-border);
  cursor: pointer;
}

.pack-maker-candidate:last-child {
  border-bottom: 0;
}

.pack-maker-candidate-selected {
  background: #edf4ff;
}

.pack-maker-candidate img {
  display: block;
  width: 46px;
  height: 34px;
  border-radius: 4px;
  object-fit: cover;
}

.pack-maker-candidate-name,
.pack-maker-selected-name {
  min-width: 0;
  overflow: hidden;
  color: var(--pack-maker-text);
  font-size: 0.84rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pack-maker-candidate-price {
  color: var(--pack-maker-muted);
  font-size: 0.76rem;
  white-space: nowrap;
}

.pack-maker-selected-list {
  display: grid;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.pack-maker-selected-list li {
  display: grid;
  min-width: 0;
  grid-template-columns: 24px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  padding: 5px 4px 5px 0;
  border-bottom: 1px solid var(--pack-maker-border);
}

.pack-maker-selected-list li:last-child {
  border-bottom: 0;
}

.pack-maker-selected-index {
  color: var(--pack-maker-muted);
  font-family: Consolas, "Courier New", monospace;
  font-size: 0.78rem;
  text-align: center;
}

.pack-maker-selected-actions {
  display: flex;
  align-items: center;
}

.pack-maker-footer-editors {
  display: grid;
  gap: 8px;
}

.pack-maker-footer-editors > div {
  display: grid;
  grid-template-columns: 100px minmax(0, 1fr);
  gap: 8px;
}

.pack-maker-export-section {
  border-bottom: 0;
}

.pack-maker-export-section .el-button {
  width: 100%;
}

.pack-maker-export-section p {
  margin: 8px 0 0;
  line-height: 1.45;
}

:global(html.dark) .pack-maker-page {
  --pack-maker-page-bg: #17191e;
  --pack-maker-panel-bg: #22252c;
  --pack-maker-border: #353a45;
  --pack-maker-heading: #f0f2f6;
  --pack-maker-text: #c1c8d3;
  --pack-maker-muted: #929cac;
}

:global(html.dark) .pack-maker-candidate-selected {
  background: #263b58;
}

@media (max-width: 1200px) {
  .pack-maker-workspace {
    grid-template-columns: 1fr;
  }

  .pack-maker-control-panel {
    max-width: 760px;
  }
}

@media (max-width: 640px) {
  .pack-maker-page {
    padding: 12px;
  }

  .pack-maker-header h1 {
    font-size: 1.6rem;
  }

  .pack-maker-preview-viewport {
    padding: 10px;
  }

  .pack-maker-panel-header,
  .pack-maker-control-section,
  .pack-maker-export-section {
    padding-right: 14px;
    padding-left: 14px;
  }
}
</style>
