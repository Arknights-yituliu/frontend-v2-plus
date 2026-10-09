<template>
  <main class="yield-cover-maker">
    <header class="yield-cover-header">
      <div>
        <p class="tool-kicker">LogicalByte Post Maker</p>
        <h1>收益速览封面制作</h1>
        <p class="tool-subtitle">上传美工底图，填写关卡、材料和刷图效率，导出横封或竖封。</p>
      </div>

      <div class="header-actions">
        <button class="action-button secondary" type="button" @click="resetCurrentOrientation">
          <span class="mdi mdi-refresh" aria-hidden="true"></span>
          重置当前
        </button>
        <button
          class="action-button primary"
          type="button"
          :disabled="!canExport || isExporting"
          @click="exportCurrentCover"
        >
          <span class="mdi mdi-download" aria-hidden="true"></span>
          {{ isExporting ? '导出中' : `导出${activeConfig.label}` }}
        </button>
        <RouterLink class="icon-button" to="/lb" title="返回控制台" aria-label="返回控制台">
          <span class="mdi mdi-arrow-left" aria-hidden="true"></span>
        </RouterLink>
      </div>
    </header>

    <div class="orientation-tabs" role="tablist" aria-label="封面方向">
      <button
        v-for="(config, key) in ORIENTATION_CONFIGS"
        :key="key"
        class="orientation-tab"
        :class="{ active: activeOrientation === key }"
        type="button"
        role="tab"
        :aria-selected="activeOrientation === key"
        @click="activeOrientation = key"
      >
        <span class="orientation-tab-icon mdi" :class="key === 'landscape' ? 'mdi-monitor' : 'mdi-cellphone'" aria-hidden="true"></span>
        <span>
          <strong>{{ config.label }}</strong>
          <small>{{ config.width }} × {{ config.height }}</small>
        </span>
        <span class="orientation-tab-status" :class="{ ready: layoutStates[key].backgroundUrl }">
          {{ layoutStates[key].backgroundUrl ? '已上传' : '待上传' }}
        </span>
      </button>
    </div>

    <div class="yield-cover-workspace">
      <section class="workspace-panel preview-panel">
        <header class="panel-header">
          <div>
            <span class="panel-kicker">Preview</span>
            <h2>{{ activeConfig.label }}预览</h2>
          </div>
          <div class="preview-meta">
            <span>{{ activeConfig.width }} × {{ activeConfig.height }}</span>
            <span>{{ completedSlotCount }}/3 个材料</span>
          </div>
        </header>

        <div ref="previewViewportRef" class="preview-viewport">
          <div class="preview-frame-shell" :style="previewShellStyle">
            <div
              ref="previewFrameRef"
              class="cover-frame"
              :class="{ exporting: isExporting }"
              :style="coverFrameStyle"
              data-export-target="yield-overview-cover"
            >
              <img
                v-if="activeState.backgroundUrl"
                class="cover-background"
                :src="activeState.backgroundUrl"
                alt="收益速览封面底图"
                draggable="false"
              >
              <div v-else class="cover-empty-state">
                <span class="mdi mdi-image-plus-outline" aria-hidden="true"></span>
                <strong>上传{{ activeConfig.label }}底图</strong>
                <span>{{ activeConfig.width }} × {{ activeConfig.height }}</span>
              </div>

              <template v-for="(slot, index) in activeState.slots" :key="slot.id">
                <div
                  v-if="hasSlotContent(slot)"
                  class="cover-slot"
                  :style="getSlotStyle(slot, index)"
                >
                  <div v-if="slot.itemId" class="cover-slot-icon">
                    <ItemImage
                      :item-id="slot.itemId"
                      :size="getSlotLayout(index).iconSize - 16"
                      :mobile-size="getSlotLayout(index).iconSize - 16"
                    />
                  </div>
                  <div class="cover-slot-copy">
                    <div
                      v-if="slot.stageName"
                      class="cover-slot-stage"
                      :style="getStageNameStyle(slot, index)"
                    >
                      {{ slot.stageName }}
                    </div>
                    <div
                      v-if="isEfficiencyValid(slot.efficiency)"
                      class="cover-slot-efficiency"
                    >
                      {{ formatEfficiency(slot.efficiency) }}
                    </div>
                  </div>
                </div>
              </template>

              <div v-if="isExporting" class="export-loading-mask" data-html2canvas-ignore="true">
                正在生成图片
              </div>
            </div>
          </div>
        </div>

        <footer class="preview-footer">
          <span v-if="activeState.backgroundUrl">{{ activeState.fileName || '已上传底图' }}</span>
          <span v-else>尚未选择底图</span>
          <span :class="{ warning: backgroundSizeMismatch }">{{ backgroundSizeText }}</span>
        </footer>
      </section>

      <aside class="workspace-panel control-panel">
        <section class="control-section">
          <header class="section-header">
            <div>
              <span class="panel-kicker">Background</span>
              <h2>{{ activeConfig.label }}底图</h2>
            </div>
            <span class="section-size">{{ activeConfig.width }} × {{ activeConfig.height }}</span>
          </header>

          <input
            ref="backgroundInputRef"
            class="visually-hidden"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            @change="handleBackgroundInput"
          >
          <button
            class="upload-dropzone"
            type="button"
            @click="openBackgroundPicker"
            @dragover.prevent
            @drop.prevent="handleBackgroundDrop"
          >
            <span class="mdi mdi-upload-outline" aria-hidden="true"></span>
            <span class="upload-copy">
              <strong>{{ activeState.backgroundUrl ? '更换底图' : '上传底图' }}</strong>
              <small>{{ activeState.fileName || '点击选择，或将图片拖到这里' }}</small>
            </span>
            <span class="mdi mdi-chevron-right" aria-hidden="true"></span>
          </button>

          <div v-if="activeState.backgroundUrl" class="upload-status">
            <span class="mdi mdi-check-circle-outline" aria-hidden="true"></span>
            <span>{{ activeState.naturalWidth }} × {{ activeState.naturalHeight }}</span>
            <button type="button" title="移除底图" aria-label="移除底图" @click="clearBackground">
              <span class="mdi mdi-close" aria-hidden="true"></span>
            </button>
          </div>
        </section>

        <section class="control-section material-section">
          <header class="section-header">
            <div>
              <span class="panel-kicker">Materials</span>
              <h2>材料信息</h2>
            </div>
            <span class="section-size">填写 2 或 3 项</span>
          </header>

          <div
            v-for="(slot, index) in activeState.slots"
            :key="slot.id"
            class="material-editor"
            :class="{ invalid: hasSlotContent(slot) && !isSlotComplete(slot) }"
          >
            <div class="material-editor-heading">
              <span class="material-editor-index">{{ index + 1 }}</span>
              <strong>材料 {{ index + 1 }}</strong>
              <button
                v-if="hasSlotContent(slot)"
                class="clear-slot-button"
                type="button"
                title="清空该材料"
                aria-label="清空该材料"
                @click="clearSlot(slot)"
              >
                <span class="mdi mdi-close" aria-hidden="true"></span>
              </button>
            </div>

            <label class="field-label">
              <span>材料</span>
              <el-select
                v-model="slot.itemId"
                class="material-select"
                filterable
                clearable
                placeholder="选择材料"
                @change="handleSlotChange(slot)"
              >
                <el-option
                  v-for="item in materialOptions"
                  :key="item.itemId"
                  :label="`${item.itemName} (${item.itemId})`"
                  :value="item.itemId"
                />
              </el-select>
            </label>

            <div v-if="slot.itemId" class="selected-material">
              <ItemImage :item-id="slot.itemId" :size="42" :mobile-size="42" />
              <span>{{ getMaterialName(slot.itemId) }}</span>
            </div>

            <div class="material-fields">
              <label class="field-label">
                <span>关卡名</span>
                <input v-model.trim="slot.stageName" type="text" maxlength="16" placeholder="如 SR-6">
              </label>
              <label class="field-label efficiency-field">
                <span>效率值</span>
                <span class="number-input-wrap">
                  <input
                    v-model.number="slot.efficiency"
                    type="number"
                    min="90"
                    max="130"
                    step="0.1"
                    placeholder="113.4"
                    @blur="normalizeEfficiency(slot)"
                  >
                  <span>%</span>
                </span>
              </label>
            </div>

            <p v-if="hasSlotContent(slot) && !isSlotComplete(slot)" class="field-error">
              请填写材料、关卡名，并输入 90.0% 至 130.0% 的效率值。
            </p>
          </div>
        </section>

        <section class="control-section status-section">
          <div class="status-line" :class="{ ready: canExport, warning: !canExport }">
            <span class="mdi" :class="canExport ? 'mdi-check-circle-outline' : 'mdi-information-outline'" aria-hidden="true"></span>
            <span>{{ exportStatusText }}</span>
          </div>
        </section>
      </aside>
    </div>
  </main>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { ElMessage } from 'element-plus'
import ItemImage from '/src/components/sprite/ItemImage.vue'
import itemInfoList from '/src/static/json/material/item_info.json'

const ORIENTATION_CONFIGS = Object.freeze({
  landscape: Object.freeze({
    label: '横封',
    width: 2400,
    height: 1800,
    slots: Object.freeze([
      Object.freeze({ left: 11.5, top: 57.5, width: 36.5, height: 21, rotate: -10, iconSize: 176, stageFontSize: 72, efficiencyFontSize: 78 }),
      Object.freeze({ left: 4.5, top: 72.5, width: 30.5, height: 17.5, rotate: 3, iconSize: 164, stageFontSize: 66, efficiencyFontSize: 72 }),
      Object.freeze({ left: 29.5, top: 61, width: 36, height: 21, rotate: 8, iconSize: 176, stageFontSize: 72, efficiencyFontSize: 78 }),
    ]),
  }),
  portrait: Object.freeze({
    label: '竖封',
    width: 1800,
    height: 2400,
    slots: Object.freeze([
      Object.freeze({ left: 9.5, top: 55.5, width: 40, height: 18.5, rotate: -10, iconSize: 164, stageFontSize: 68, efficiencyFontSize: 74 }),
      Object.freeze({ left: 28.5, top: 55, width: 42, height: 19, rotate: 4, iconSize: 164, stageFontSize: 68, efficiencyFontSize: 74 }),
      Object.freeze({ left: 52, top: 51.5, width: 40, height: 18.5, rotate: 8, iconSize: 164, stageFontSize: 68, efficiencyFontSize: 74 }),
    ]),
  }),
})

const activeOrientation = ref('landscape')
const backgroundInputRef = ref(null)
const previewViewportRef = ref(null)
const previewFrameRef = ref(null)
const previewScale = ref(0.25)
const isExporting = ref(false)
const materialOptionMap = new Map()
let resizeObserver = null

function createSlot(index) {
  return {
    id: `slot-${index + 1}`,
    itemId: '',
    stageName: '',
    efficiency: null,
  }
}

function createOrientationState() {
  return {
    backgroundUrl: '',
    fileName: '',
    naturalWidth: 0,
    naturalHeight: 0,
    slots: [createSlot(0), createSlot(1), createSlot(2)],
  }
}

const layoutStates = reactive({
  landscape: createOrientationState(),
  portrait: createOrientationState(),
})

const materialOptions = [...new Map(
  itemInfoList
    .filter(item => item?.itemId && item?.itemName)
    .map(item => [String(item.itemId), {
      itemId: String(item.itemId),
      itemName: String(item.itemName),
      type: String(item.type || ''),
    }]),
).values()].sort((left, right) => (
  left.itemName.localeCompare(right.itemName, 'zh-CN')
  || left.itemId.localeCompare(right.itemId)
))

for (const item of materialOptions) {
  materialOptionMap.set(item.itemId, item)
}

const activeConfig = computed(() => ORIENTATION_CONFIGS[activeOrientation.value])
const activeState = computed(() => layoutStates[activeOrientation.value])
const completedSlotCount = computed(() => activeState.value.slots.filter(isSlotComplete).length)
const hasIncompleteSlot = computed(() => activeState.value.slots.some(slot => hasSlotContent(slot) && !isSlotComplete(slot)))
const backgroundSizeMismatch = computed(() => (
  Boolean(activeState.value.backgroundUrl)
  && (activeState.value.naturalWidth !== activeConfig.value.width || activeState.value.naturalHeight !== activeConfig.value.height)
))
const backgroundSizeText = computed(() => {
  if (!activeState.value.backgroundUrl) return '等待底图'
  if (backgroundSizeMismatch.value) return `原图 ${activeState.value.naturalWidth} × ${activeState.value.naturalHeight}`
  return '尺寸符合当前画布'
})
const canExport = computed(() => (
  Boolean(activeState.value.backgroundUrl)
  && !backgroundSizeMismatch.value
  && completedSlotCount.value >= 2
  && !hasIncompleteSlot.value
))
const exportStatusText = computed(() => {
  if (!activeState.value.backgroundUrl) return `请先上传${activeConfig.value.label}底图`
  if (backgroundSizeMismatch.value) return `底图尺寸必须为 ${activeConfig.value.width} × ${activeConfig.value.height}`
  if (hasIncompleteSlot.value) return '有未填写完整的材料项'
  if (completedSlotCount.value < 2) return '至少填写 2 个材料项'
  return `${activeConfig.value.label}已就绪，可以导出`
})
const previewShellStyle = computed(() => ({
  width: `${activeConfig.value.width * previewScale.value}px`,
  height: `${activeConfig.value.height * previewScale.value}px`,
}))
const coverFrameStyle = computed(() => ({
  width: `${activeConfig.value.width}px`,
  height: `${activeConfig.value.height}px`,
  transform: `scale(${isExporting.value ? 1 : previewScale.value})`,
}))

function getSlotLayout(index) {
  return activeConfig.value.slots[index] || activeConfig.value.slots[0]
}

function getSlotStyle(slot, index) {
  const layout = getSlotLayout(index)
  return {
    left: `${layout.left}%`,
    top: `${layout.top}%`,
    width: `${layout.width}%`,
    height: `${layout.height}%`,
    transform: `rotate(${layout.rotate}deg)`,
    '--slot-icon-size': `${layout.iconSize}px`,
    '--slot-stage-size': `${getStageFontSize(slot, layout)}px`,
    '--slot-efficiency-size': `${layout.efficiencyFontSize}px`,
  }
}

function getStageFontSize(slot, layout) {
  const length = Array.from(String(slot.stageName || '')).length
  if (length <= 8) return layout.stageFontSize
  return Math.max(42, Math.round(layout.stageFontSize * (8 / length)))
}

function getStageNameStyle(slot, index) {
  const layout = getSlotLayout(index)
  return {
    fontSize: `${getStageFontSize(slot, layout)}px`,
  }
}

function hasSlotContent(slot) {
  return Boolean(slot.itemId || slot.stageName || slot.efficiency !== null && slot.efficiency !== '')
}

function isEfficiencyValid(value) {
  const numericValue = Number(value)
  return Number.isFinite(numericValue) && numericValue >= 90 && numericValue <= 130
}

function isSlotComplete(slot) {
  return Boolean(slot.itemId && slot.stageName?.trim() && isEfficiencyValid(slot.efficiency))
}

function formatEfficiency(value) {
  return isEfficiencyValid(value) ? `${Number(value).toFixed(1)}%` : ''
}

function normalizeEfficiency(slot) {
  if (slot.efficiency === '' || slot.efficiency === null || slot.efficiency === undefined) return
  const numericValue = Number(slot.efficiency)
  if (Number.isFinite(numericValue)) {
    slot.efficiency = Math.round(numericValue * 10) / 10
  }
}

function getMaterialName(itemId) {
  return materialOptionMap.get(String(itemId))?.itemName || itemId
}

function handleSlotChange(slot) {
  if (!slot.itemId) return
  if (!slot.stageName) {
    slot.stageName = ''
  }
}

function clearSlot(slot) {
  Object.assign(slot, createSlot(Number(slot.id.split('-').at(-1)) - 1))
}

function openBackgroundPicker() {
  backgroundInputRef.value?.click()
}

function handleBackgroundInput(event) {
  const [file] = event.target.files || []
  if (file) loadBackground(file)
  event.target.value = ''
}

function handleBackgroundDrop(event) {
  const [file] = event.dataTransfer?.files || []
  if (file) loadBackground(file)
}

function loadBackground(file) {
  if (!file.type.startsWith('image/')) {
    ElMessage.error('请选择 PNG、JPG 或 WEBP 图片')
    return
  }

  const objectUrl = URL.createObjectURL(file)
  const image = new Image()
  image.onload = () => {
    revokeBackgroundUrl(activeState.value)
    activeState.value.backgroundUrl = objectUrl
    activeState.value.fileName = file.name
    activeState.value.naturalWidth = image.naturalWidth
    activeState.value.naturalHeight = image.naturalHeight
    if (backgroundSizeMismatch.value) {
      ElMessage.warning(`图片尺寸为 ${image.naturalWidth} × ${image.naturalHeight}，当前画布为 ${activeConfig.value.width} × ${activeConfig.value.height}`)
    } else {
      ElMessage.success(`${activeConfig.value.label}底图已上传`)
    }
  }
  image.onerror = () => {
    URL.revokeObjectURL(objectUrl)
    ElMessage.error('图片读取失败，请换一张图片重试')
  }
  image.src = objectUrl
}

function revokeBackgroundUrl(state) {
  if (state.backgroundUrl) {
    URL.revokeObjectURL(state.backgroundUrl)
    state.backgroundUrl = ''
  }
}

function clearBackground() {
  revokeBackgroundUrl(activeState.value)
  activeState.value.fileName = ''
  activeState.value.naturalWidth = 0
  activeState.value.naturalHeight = 0
}

function resetCurrentOrientation() {
  clearBackground()
  activeState.value.slots = [createSlot(0), createSlot(1), createSlot(2)]
}

async function exportCurrentCover() {
  if (!canExport.value || isExporting.value) return

  isExporting.value = true
  try {
    await nextTick()
    await document.fonts?.ready
    const { default: html2canvas } = await import('html2canvas')
    const canvas = await html2canvas(previewFrameRef.value, {
      backgroundColor: null,
      width: activeConfig.value.width,
      height: activeConfig.value.height,
      scale: 1,
      useCORS: true,
      allowTaint: false,
      logging: false,
      imageTimeout: 15000,
    })
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob(result => {
        if (result) resolve(result)
        else reject(new Error('PNG 编码失败'))
      }, 'image/png')
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.download = `${getExportBaseName(activeState.value.fileName)}-${activeConfig.value.label}-${Date.now()}.png`
    link.href = url
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 0)
    ElMessage.success(`${activeConfig.value.label}已导出`)
  } catch (error) {
    console.error('导出收益速览封面失败:', error)
    ElMessage.error(error?.message || '导出失败，请稍后重试')
  } finally {
    isExporting.value = false
  }
}

function getExportBaseName(fileName) {
  const baseName = String(fileName || '').replace(/\.[^.]+$/, '').trim()
  return baseName || '收益速览封面'
}

function updatePreviewScale() {
  const viewport = previewViewportRef.value
  if (!viewport) return
  const availableWidth = Math.max(260, viewport.clientWidth - 32)
  const availableHeight = Math.max(260, Math.min(window.innerHeight * 0.68, 760))
  previewScale.value = Math.min(
    availableWidth / activeConfig.value.width,
    availableHeight / activeConfig.value.height,
    1,
  )
}

watch(activeOrientation, () => nextTick(updatePreviewScale))

onMounted(() => {
  updatePreviewScale()
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(updatePreviewScale)
    if (previewViewportRef.value) resizeObserver.observe(previewViewportRef.value)
  }
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  revokeBackgroundUrl(layoutStates.landscape)
  revokeBackgroundUrl(layoutStates.portrait)
})
</script>

<style scoped>
.yield-cover-maker {
  --page-background: #f3f5f8;
  --panel-background: #ffffff;
  --border-color: #dfe3eb;
  --heading-color: #172033;
  --body-color: #596276;
  --muted-color: #7b8496;
  min-height: 100vh;
  padding: 28px 24px 48px;
  background: var(--page-background);
  color: var(--body-color);
}

.yield-cover-header,
.orientation-tabs,
.yield-cover-workspace {
  width: min(1360px, 100%);
  margin-right: auto;
  margin-left: auto;
}

.yield-cover-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 22px;
}

.tool-kicker,
.panel-kicker {
  display: block;
  margin: 0 0 6px;
  color: #3867d6;
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
}

.yield-cover-header h1,
.panel-header h2,
.section-header h2 {
  margin: 0;
  color: var(--heading-color);
}

.yield-cover-header h1 {
  font-size: 2.05rem;
  line-height: 1.2;
}

.tool-subtitle {
  margin: 9px 0 0;
  color: var(--muted-color);
  font-size: 0.9rem;
}

.header-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
}

.action-button,
.icon-button,
.orientation-tab,
.upload-dropzone,
.clear-slot-button,
.upload-status button {
  border: 0;
  font: inherit;
  cursor: pointer;
}

.action-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 38px;
  padding: 0 14px;
  border-radius: 5px;
  font-size: 0.86rem;
  font-weight: 700;
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.action-button:hover:not(:disabled) {
  transform: translateY(-1px);
}

.action-button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.action-button.primary {
  background: #3867d6;
  color: #ffffff;
}

.action-button.secondary {
  border: 1px solid var(--border-color);
  background: #ffffff;
  color: var(--heading-color);
}

.icon-button {
  display: inline-grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border: 1px solid var(--border-color);
  border-radius: 5px;
  background: #ffffff;
  color: var(--heading-color);
  text-decoration: none;
}

.orientation-tabs {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 16px;
}

.orientation-tab {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  padding: 12px 15px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--panel-background);
  color: var(--body-color);
  text-align: left;
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}

.orientation-tab:hover,
.orientation-tab.active {
  border-color: #3867d6;
  box-shadow: 0 3px 12px rgba(56, 103, 214, 0.1);
}

.orientation-tab-icon {
  flex: 0 0 auto;
  color: #3867d6;
  font-size: 1.35rem;
}

.orientation-tab strong,
.orientation-tab small {
  display: block;
}

.orientation-tab strong {
  color: var(--heading-color);
  font-size: 0.92rem;
}

.orientation-tab small {
  margin-top: 3px;
  color: var(--muted-color);
  font-size: 0.76rem;
}

.orientation-tab-status {
  margin-left: auto;
  color: var(--muted-color);
  font-size: 0.76rem;
  white-space: nowrap;
}

.orientation-tab-status.ready {
  color: #18866b;
}

.yield-cover-workspace {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(340px, 430px);
  align-items: start;
  gap: 16px;
}

.workspace-panel {
  min-width: 0;
  border: 1px solid var(--border-color);
  border-radius: 7px;
  background: var(--panel-background);
  box-shadow: 0 5px 18px rgba(29, 38, 58, 0.06);
}

.preview-panel {
  overflow: hidden;
}

.panel-header,
.section-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
}

.panel-header {
  padding: 18px 20px 14px;
  border-bottom: 1px solid var(--border-color);
}

.panel-header h2,
.section-header h2 {
  font-size: 1.03rem;
  line-height: 1.25;
}

.preview-meta,
.preview-footer,
.section-size {
  color: var(--muted-color);
  font-size: 0.76rem;
}

.preview-meta {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 6px 12px;
}

.preview-viewport {
  min-height: 600px;
  padding: 22px;
  overflow: auto;
  background:
    linear-gradient(45deg, #eef1f6 25%, transparent 25%) 0 0 / 20px 20px,
    linear-gradient(-45deg, #eef1f6 25%, transparent 25%) 0 10px / 20px 20px,
    linear-gradient(45deg, transparent 75%, #eef1f6 75%) 10px -10px / 20px 20px,
    linear-gradient(-45deg, transparent 75%, #eef1f6 75%) -10px 0 / 20px 20px,
    #ffffff;
}

.preview-frame-shell {
  position: relative;
  margin: 0 auto;
}

.cover-frame {
  position: relative;
  transform-origin: top left;
  overflow: hidden;
  background: #d9e1ec;
}

.cover-frame.exporting {
  position: fixed;
  top: 0;
  left: -10000px;
  z-index: -1;
  transform: none !important;
}

.cover-background,
.cover-empty-state {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.cover-background {
  display: block;
  object-fit: fill;
}

.cover-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: linear-gradient(135deg, #dbe6f7, #eef3fa);
  color: #5b6b84;
}

.cover-empty-state .mdi {
  font-size: 4rem;
  color: #7192c8;
}

.cover-empty-state strong {
  color: #263852;
  font-size: 2rem;
}

.cover-empty-state span:last-child {
  font-size: 1.1rem;
}

.cover-slot {
  position: absolute;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 25px 34px;
  color: #111820;
  font-family: Arial, "Microsoft YaHei", sans-serif;
  line-height: 0.96;
  pointer-events: none;
  transform-origin: center;
}

.cover-slot-icon {
  display: grid;
  box-sizing: border-box;
  flex: 0 0 var(--slot-icon-size);
  width: var(--slot-icon-size);
  height: var(--slot-icon-size);
  place-items: center;
  overflow: hidden;
  border: 8px solid #11a9df;
  border-radius: 50%;
  background: #102231;
  box-shadow: 0 0 0 3px rgba(10, 47, 74, 0.9), 0 3px 9px rgba(0, 0, 0, 0.3);
}

.cover-slot-copy {
  min-width: 0;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.35);
}

.cover-slot-stage {
  max-width: 420px;
  overflow: hidden;
  font-size: var(--slot-stage-size);
  font-weight: 400;
  line-height: 1;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cover-slot-efficiency {
  margin-top: 12px;
  font-size: var(--slot-efficiency-size);
  font-weight: 800;
  line-height: 0.9;
  white-space: nowrap;
}

.export-loading-mask {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.01);
  color: transparent;
}

.preview-footer {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 20px 14px;
  border-top: 1px solid var(--border-color);
}

.preview-footer .warning {
  color: #b66b00;
}

.control-panel {
  overflow: hidden;
}

.control-section {
  padding: 18px;
  border-bottom: 1px solid var(--border-color);
}

.control-section:last-child {
  border-bottom: 0;
}

.section-header {
  align-items: baseline;
  margin-bottom: 13px;
}

.section-size {
  flex: 0 0 auto;
  white-space: nowrap;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  clip-path: inset(50%);
}

.upload-dropzone {
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 70px;
  padding: 12px 14px;
  border: 1px dashed #aebbd0;
  border-radius: 6px;
  background: #f7f9fc;
  color: var(--body-color);
  text-align: left;
}

.upload-dropzone:hover {
  border-color: #3867d6;
  background: #f1f5ff;
}

.upload-dropzone > .mdi:first-child {
  margin-right: 11px;
  color: #3867d6;
  font-size: 1.45rem;
}

.upload-copy {
  display: grid;
  min-width: 0;
  gap: 4px;
}

.upload-copy strong {
  color: var(--heading-color);
  font-size: 0.86rem;
}

.upload-copy small {
  overflow: hidden;
  color: var(--muted-color);
  font-size: 0.75rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.upload-dropzone > .mdi:last-child {
  margin-left: auto;
  color: var(--muted-color);
}

.upload-status {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-top: 9px;
  color: #18866b;
  font-size: 0.78rem;
}

.upload-status button {
  display: grid;
  width: 24px;
  height: 24px;
  margin-left: auto;
  place-items: center;
  border-radius: 4px;
  background: transparent;
  color: var(--muted-color);
}

.upload-status button:hover {
  background: #eef1f5;
  color: #b34d4d;
}

.material-section {
  padding-bottom: 10px;
}

.material-editor {
  margin-bottom: 10px;
  padding: 12px;
  border: 1px solid #e1e6ee;
  border-radius: 6px;
  background: #fbfcfe;
}

.material-editor.invalid {
  border-color: #e2b8a9;
  background: #fffaf8;
}

.material-editor-heading {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  color: var(--heading-color);
  font-size: 0.83rem;
}

.material-editor-index {
  display: inline-grid;
  width: 22px;
  height: 22px;
  place-items: center;
  border-radius: 50%;
  background: #e6edff;
  color: #3867d6;
  font-size: 0.73rem;
  font-weight: 700;
}

.clear-slot-button {
  display: grid;
  width: 24px;
  height: 24px;
  margin-left: auto;
  place-items: center;
  border-radius: 4px;
  background: transparent;
  color: var(--muted-color);
}

.clear-slot-button:hover {
  background: #eef1f5;
  color: #b34d4d;
}

.field-label {
  display: grid;
  gap: 5px;
  color: var(--body-color);
  font-size: 0.76rem;
}

.material-select {
  width: 100%;
}

.selected-material {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 42px;
  margin: 8px 0 10px;
  color: var(--heading-color);
  font-size: 0.8rem;
  font-weight: 700;
}

.material-fields {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 130px;
  gap: 9px;
}

.field-label input {
  box-sizing: border-box;
  width: 100%;
  min-height: 34px;
  padding: 0 9px;
  border: 1px solid #d6dde8;
  border-radius: 4px;
  background: #ffffff;
  color: var(--heading-color);
  font: inherit;
  outline: none;
}

.field-label input:focus {
  border-color: #3867d6;
  box-shadow: 0 0 0 2px rgba(56, 103, 214, 0.12);
}

.number-input-wrap {
  position: relative;
  display: block;
}

.number-input-wrap input {
  padding-right: 27px;
}

.number-input-wrap > span {
  position: absolute;
  top: 50%;
  right: 9px;
  transform: translateY(-50%);
  color: var(--muted-color);
  pointer-events: none;
}

.field-error {
  margin: 8px 0 0;
  color: #b34d4d;
  font-size: 0.72rem;
  line-height: 1.4;
}

.status-section {
  padding-top: 13px;
  padding-bottom: 13px;
}

.status-line {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  color: #b66b00;
  font-size: 0.78rem;
  line-height: 1.4;
}

.status-line.ready {
  color: #18866b;
}

@media (max-width: 1020px) {
  .yield-cover-workspace {
    grid-template-columns: minmax(0, 1fr);
  }

  .control-panel {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .control-section:last-child {
    grid-column: 1 / -1;
  }
}

@media (max-width: 640px) {
  .yield-cover-maker {
    padding: 18px 12px 34px;
  }

  .yield-cover-header {
    display: grid;
    gap: 16px;
  }

  .yield-cover-header h1 {
    font-size: 1.65rem;
  }

  .header-actions {
    justify-content: flex-start;
  }

  .orientation-tabs,
  .control-panel {
    grid-template-columns: minmax(0, 1fr);
  }

  .preview-viewport {
    min-height: 360px;
    padding: 12px;
  }

  .panel-header,
  .preview-footer {
    align-items: flex-start;
    flex-direction: column;
  }

  .preview-meta {
    justify-content: flex-start;
  }

  .material-fields {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
