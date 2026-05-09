<template>
  <div class="image-tagger-page">
    <header class="image-tagger-hero">
      <div>
        <p class="image-tagger-kicker">LogicalByte Post Maker</p>
        <h1>图片标记器</h1>
        <p class="image-tagger-description">
          放入一张底图，叠加彩色 tag 或说明条，拖到合适的位置后直接导出 PNG。
        </p>
      </div>

      <div class="image-tagger-hero-actions">
        <el-button type="primary" :disabled="!canAddOverlay" @click="addOverlay('tag')">
          添加 Tag
        </el-button>
        <el-button type="warning" :disabled="!canAddOverlay" @click="addOverlay('banner')">
          添加说明条
        </el-button>
        <el-button type="success" :disabled="!canExport" @click="exportImage">
          导出 PNG
        </el-button>
      </div>
    </header>

    <div class="workspace-layout">
      <main class="workspace-stage">
        <div class="canvas-toolbar panel-card">
          <div class="canvas-toolbar-copy">
            <span>双击画布可快速新增 Tag，拖拽时可按吸附步进对齐。</span>
            <span v-if="selectedOverlay">当前选中：{{ selectedOverlay.type === 'tag' ? 'Tag' : 'Banner' }}</span>
          </div>
          <div class="canvas-toolbar-actions">
            <el-button size="small" :disabled="!canAddOverlay" @click="addOverlay('tag')">
              新建 Tag
            </el-button>
            <el-button size="small" :disabled="!canAddOverlay" @click="addOverlay('banner')">
              新建说明条
            </el-button>
            <el-button size="small" :disabled="!canExport" type="success" @click="exportImage">
              导出 PNG
            </el-button>
          </div>
        </div>

        <div
          class="canvas-shell panel-card"
          tabindex="0"
          @dragover.prevent
          @drop.prevent="handleDrop"
          @paste="handlePaste"
        >
          <div v-if="!imageSrc" class="canvas-empty-state">
            <div class="canvas-empty-badge">Ready</div>
            <h2>先放一张底图进来</h2>
            <p>上传图片、拖进来，或者点右侧素材区“粘贴截图”后直接 `Ctrl + V`。</p>
          </div>

          <div v-else class="canvas-scroller is-large">
            <div
              ref="previewStageRef"
              class="canvas-stage"
              :style="{
                width: `${previewStageWidth}px`,
                height: `${previewStageHeight}px`
              }"
              @click="handleStageClick"
              @dblclick="handleStageDoubleClick"
            >
              <img
                ref="previewImageRef"
                class="stage-image"
                :src="imageSrc"
                :crossorigin="remoteImageSource ? 'anonymous' : undefined"
                alt="preview"
                draggable="false"
              />

              <button
                v-for="overlay in overlays"
                :key="overlay.id"
                type="button"
                class="stage-overlay"
                :class="{
                  'is-selected': overlay.id === selectedOverlayId,
                  'is-banner': overlay.type === 'banner'
                }"
                :style="getOverlayStyle(overlay, false)"
                @click.stop="selectOverlay(overlay.id)"
                @pointerdown.stop.prevent="startDrag($event, overlay.id)"
              >
                {{ overlay.text }}
              </button>
            </div>
          </div>
        </div>
      </main>

      <aside class="workspace-sidebar">
        <section class="tool-panel panel-card">
          <div class="tool-panel-header">
            <div>
              <p class="tool-panel-kicker">素材与导出</p>
              <h2>底图、缩放和导出放一起</h2>
            </div>
            <span v-if="canExport" class="panel-card-meta">
              {{ imageNaturalWidth }} × {{ imageNaturalHeight }}
            </span>
          </div>

          <div class="tool-panel-grid">
            <section class="panel-subcard">
              <div class="panel-subcard-header">
                <h3>底图</h3>
              </div>

              <div
                ref="uploadZoneRef"
                class="upload-dropzone"
                tabindex="0"
                @dragover.prevent
                @drop.prevent="handleDrop"
                @paste="handlePaste"
              >
                <input
                  ref="fileInputRef"
                  type="file"
                  accept="image/*"
                  class="hidden-input"
                  @change="handleFileChange"
                />
                <input
                  ref="tagFileInputRef"
                  type="file"
                  accept="application/json,.json"
                  class="hidden-input"
                  @change="handleTagFileChange"
                />

                <div class="upload-dropzone-actions">
                  <el-button type="primary" plain @click="triggerFileInput">上传图片</el-button>
                  <el-button plain @click="focusPasteZone">粘贴截图</el-button>
                </div>

                <p>支持本地文件、拖拽图片或 Tag JSON、截图粘贴，以及远程图片 URL。</p>
                <p v-if="imageSourceName" class="upload-source-name">当前底图：{{ imageSourceName }}</p>
              </div>

              <div class="field-stack">
                <label class="field-label">远程图片地址</label>
                <div class="url-row">
                  <el-input
                    v-model="imageUrlInput"
                    placeholder="https://example.com/image.png"
                    @keyup.enter="applyImageUrl"
                  />
                  <el-button plain @click="applyImageUrl">载入</el-button>
                </div>
              </div>

              <div v-if="canExport" class="panel-inline-actions">
                <button class="ghost-action" type="button" @click="clearImage">移除底图</button>
              </div>
            </section>

            <section class="panel-subcard">
              <div class="panel-subcard-header">
                <h3>预览与导出</h3>
              </div>

              <div class="field-stack">
                <label class="field-label">文件名</label>
                <el-input v-model="exportFileName" placeholder="image-tagged" />
              </div>

              <div class="field-stack">
                <div class="field-inline">
                  <label class="field-label">预览缩放</label>
                  <span class="field-value">{{ Math.round(previewZoom * 100) }}%</span>
                </div>
                <el-slider v-model="previewZoom" :min="0.7" :max="2.4" :step="0.05" />
              </div>

              <div class="export-actions">
                <el-button type="success" :disabled="!canExport" @click="exportImage">
                  导出原图尺寸 PNG
                </el-button>
                <el-button plain @click="resetView">重置缩放</el-button>
                <el-button :disabled="!overlays.length" plain @click="clearOverlays">
                  清空标记
                </el-button>
              </div>

              <div class="editor-divider"></div>

              <div class="export-actions">
                <el-button :disabled="!overlays.length" plain @click="exportTagData">
                  导出 Tag JSON
                </el-button>
                <el-button plain @click="triggerTagFileInput">
                  导入 Tag JSON
                </el-button>
              </div>

              <p class="panel-tip">
                Tag 和排版设置会自动保存在本机；JSON 只包含标记数据和画布尺寸，不包含本地底图。
              </p>
            </section>
          </div>
        </section>

        <section class="tool-panel panel-card">
          <div class="tool-panel-header">
            <div>
              <p class="tool-panel-kicker">标记与排版</p>
              <h2>把图层、批量录入、对齐和单个编辑靠在一起</h2>
            </div>
            <span class="panel-card-meta">{{ overlays.length }} 个图层</span>
          </div>

          <div class="tool-panel-grid">
            <section class="panel-subcard">
              <div class="panel-subcard-header">
                <h3>图层</h3>
                <div class="layer-toolbar">
                  <el-button size="small" :disabled="!canAddOverlay" @click="addOverlay('tag')">
                    新建 Tag
                  </el-button>
                  <el-button size="small" :disabled="!canAddOverlay" @click="addOverlay('banner')">
                    新建说明条
                  </el-button>
                </div>
              </div>

              <div v-if="overlays.length" class="layer-list">
                <button
                  v-for="(overlay, index) in overlays"
                  :key="overlay.id"
                  type="button"
                  class="layer-item"
                  :class="{ 'is-selected': overlay.id === selectedOverlayId }"
                  @click="selectOverlay(overlay.id)"
                >
                  <span class="layer-item-swatch" :style="{ background: overlay.bgColor }"></span>
                  <span class="layer-item-order">{{ String(index + 1).padStart(2, '0') }}</span>
                  <span class="layer-item-title">{{ overlay.type === 'tag' ? 'Tag' : 'Banner' }}</span>
                  <span class="layer-item-text">{{ formatOverlayText(overlay.text) }}</span>
                </button>
              </div>
              <div v-else class="empty-note">先放入一张图，再开始摆 tag 会更顺手。</div>

              <div v-if="selectedOverlay" class="editor-block">
                <div class="panel-subcard-header tight">
                  <h3>当前图层</h3>
                  <span class="panel-card-meta">{{ selectedOverlay.type === 'tag' ? 'Tag' : 'Banner' }}</span>
                </div>

                <div class="selection-toolbar">
                  <el-button size="small" @click="duplicateSelectedOverlay">复制</el-button>
                  <el-button size="small" :disabled="!canMoveBackward" @click="moveSelectedLayer(-1)">
                    后移
                  </el-button>
                  <el-button size="small" :disabled="!canMoveForward" @click="moveSelectedLayer(1)">
                    前移
                  </el-button>
                  <el-button size="small" type="danger" plain @click="removeSelectedOverlay">
                    删除
                  </el-button>
                </div>

                <div class="field-stack">
                  <label class="field-label">文本内容</label>
                  <el-input
                    v-if="selectedOverlay.type === 'tag'"
                    v-model="selectedOverlay.text"
                    placeholder="例如 8.8"
                  />
                  <el-input
                    v-else
                    v-model="selectedOverlay.text"
                    type="textarea"
                    :rows="4"
                    placeholder="输入多行说明文案"
                  />
                </div>

                <div class="field-stack">
                  <label class="field-label">快速颜色</label>
                  <div class="preset-row">
                    <button
                      v-for="preset in colorPresets"
                      :key="preset.name"
                      type="button"
                      class="preset-swatch"
                      :style="{ background: preset.bg, color: preset.text }"
                      @click="applyColorPreset(preset)"
                    >
                      {{ preset.name }}
                    </button>
                  </div>
                </div>

                <div class="control-grid two-column">
                  <div class="field-stack">
                    <label class="field-label">背景色</label>
                    <el-color-picker v-model="selectedOverlay.bgColor" />
                  </div>
                  <div class="field-stack">
                    <label class="field-label">文字色</label>
                    <el-color-picker v-model="selectedOverlay.textColor" />
                  </div>
                  <div class="field-stack">
                    <label class="field-label">字号</label>
                    <el-input-number
                      v-model="selectedOverlay.fontSize"
                      :min="16"
                      :max="240"
                      :step="2"
                      controls-position="right"
                    />
                  </div>
                  <div class="field-stack">
                    <label class="field-label">字重</label>
                    <el-select v-model="selectedOverlay.fontWeight">
                      <el-option label="600" value="600" />
                      <el-option label="700" value="700" />
                      <el-option label="800" value="800" />
                      <el-option label="900" value="900" />
                    </el-select>
                  </div>
                  <div class="field-stack">
                    <label class="field-label">圆角</label>
                    <el-input-number
                      v-model="selectedOverlay.radius"
                      :min="0"
                      :max="120"
                      :step="2"
                      controls-position="right"
                    />
                  </div>
                  <div class="field-stack">
                    <label class="field-label">透明度</label>
                    <el-slider v-model="selectedOverlay.opacity" :min="0.2" :max="1" :step="0.05" />
                  </div>
                  <div class="field-stack">
                    <label class="field-label">横向留白</label>
                    <el-input-number
                      v-model="selectedOverlay.paddingX"
                      :min="4"
                      :max="240"
                      :step="2"
                      controls-position="right"
                    />
                  </div>
                  <div class="field-stack">
                    <label class="field-label">纵向留白</label>
                    <el-input-number
                      v-model="selectedOverlay.paddingY"
                      :min="2"
                      :max="160"
                      :step="2"
                      controls-position="right"
                    />
                  </div>
                </div>

                <div v-if="selectedOverlay.type === 'banner'" class="control-grid two-column">
                  <div class="field-stack">
                    <label class="field-label">宽度</label>
                    <el-input-number
                      v-model="selectedOverlay.width"
                      :min="160"
                      :max="Math.max(imageNaturalWidth, 160)"
                      :step="10"
                      controls-position="right"
                    />
                  </div>
                  <div class="field-stack">
                    <label class="field-label">对齐</label>
                    <el-select v-model="selectedOverlay.textAlign">
                      <el-option label="左对齐" value="left" />
                      <el-option label="居中" value="center" />
                      <el-option label="右对齐" value="right" />
                    </el-select>
                  </div>
                  <div class="field-stack wide-field">
                    <label class="field-label">行高</label>
                    <el-slider v-model="selectedOverlay.lineHeight" :min="1" :max="1.8" :step="0.05" />
                  </div>
                </div>

                <div class="control-grid two-column">
                  <div class="field-stack">
                    <label class="field-label">X 坐标</label>
                    <el-input-number
                      v-model="selectedOverlay.x"
                      :min="0"
                      :max="Math.max(imageNaturalWidth, 0)"
                      :step="4"
                      controls-position="right"
                    />
                  </div>
                  <div class="field-stack">
                    <label class="field-label">Y 坐标</label>
                    <el-input-number
                      v-model="selectedOverlay.y"
                      :min="0"
                      :max="Math.max(imageNaturalHeight, 0)"
                      :step="4"
                      controls-position="right"
                    />
                  </div>
                </div>
              </div>
            </section>

            <section class="panel-subcard">
              <div class="panel-subcard-header">
                <h3>批量录入与排版</h3>
              </div>

              <div class="field-stack">
                <label class="field-label">批量文本</label>
                <el-input
                  v-model="bulkInputText"
                  type="textarea"
                  :rows="7"
                  placeholder="例如：&#10;8.9&#10;3.0&#10;7.8&#10;7.8&#10;8.2"
                />
              </div>

              <div class="control-grid two-column">
                <div class="field-stack">
                  <label class="field-label">起始 X</label>
                  <el-input-number
                    v-model="bulkStartX"
                    :min="0"
                    :max="Math.max(imageNaturalWidth, 0)"
                    :step="4"
                    controls-position="right"
                  />
                </div>
                <div class="field-stack">
                  <label class="field-label">起始 Y</label>
                  <el-input-number
                    v-model="bulkStartY"
                    :min="0"
                    :max="Math.max(imageNaturalHeight, 0)"
                    :step="4"
                    controls-position="right"
                  />
                </div>
                <div class="field-stack">
                  <label class="field-label">每行数量</label>
                  <el-input-number
                    v-model="bulkColumns"
                    :min="1"
                    :max="20"
                    :step="1"
                    controls-position="right"
                  />
                </div>
                <div class="field-stack">
                  <label class="field-label">颜色预设</label>
                  <el-select v-model="bulkColorPresetName">
                    <el-option label="按数值自动" value="auto" />
                    <el-option
                      v-for="preset in colorPresets"
                      :key="preset.name"
                      :label="preset.name"
                      :value="preset.name"
                    />
                  </el-select>
                </div>
                <div class="field-stack">
                  <div class="field-inline">
                    <label class="field-label">横向间距</label>
                    <span class="field-value">{{ bulkAutoGapX ? '自动' : `${bulkGapX}px` }}</span>
                  </div>
                  <el-input-number
                    v-model="bulkGapX"
                    :min="0"
                    :max="1000"
                    :step="2"
                    :disabled="bulkAutoGapX"
                    controls-position="right"
                  />
                </div>
                <div class="field-stack">
                  <label class="field-label">纵向间距</label>
                  <el-input-number
                    v-model="bulkGapY"
                    :min="0"
                    :max="1000"
                    :step="2"
                    controls-position="right"
                  />
                </div>
              </div>

              <div class="export-actions">
                <el-button type="primary" :disabled="!canAddOverlay" @click="createBulkTags">
                  批量生成 Tag
                </el-button>
                <el-button :disabled="!canAddOverlay" plain @click="applyAutoBulkGapX">
                  估算横向间距
                </el-button>
                <el-button :disabled="!canAddOverlay" plain @click="fillBulkStartFromSelected">
                  用当前选中点做起点
                </el-button>
              </div>

              <div class="field-stack compact-toggle">
                <el-checkbox v-model="bulkAutoGapX">生成时自动估算横向间距</el-checkbox>
              </div>

              <div class="editor-divider"></div>

              <div class="field-stack">
                <div class="field-inline">
                  <label class="field-label">拖拽吸附</label>
                  <span class="field-value">{{ snapEnabled ? `开 / ${snapStep}px` : '关' }}</span>
                </div>
                <div class="selection-toolbar">
                  <el-switch v-model="snapEnabled" />
                  <el-input-number
                    v-model="snapStep"
                    :min="2"
                    :max="200"
                    :step="2"
                    controls-position="right"
                  />
                </div>
              </div>

              <div class="control-grid two-column">
                <div class="field-stack">
                  <label class="field-label">每行数量</label>
                  <el-input-number
                    v-model="alignColumns"
                    :min="1"
                    :max="20"
                    :step="1"
                    controls-position="right"
                  />
                </div>
                <div class="field-stack">
                  <label class="field-label">横向间距</label>
                  <el-input-number
                    v-model="alignGapX"
                    :min="0"
                    :max="1000"
                    :step="2"
                    controls-position="right"
                  />
                </div>
                <div class="field-stack">
                  <label class="field-label">纵向间距</label>
                  <el-input-number
                    v-model="alignGapY"
                    :min="0"
                    :max="1000"
                    :step="2"
                    controls-position="right"
                  />
                </div>
                <div class="field-stack">
                  <label class="field-label">基准模式</label>
                  <el-select v-model="alignAnchorMode">
                    <el-option label="选中图层" value="selected" />
                    <el-option label="最左上图层" value="top-left" />
                  </el-select>
                </div>
              </div>

              <div class="selection-toolbar">
                <el-button :disabled="!tagOverlays.length" @click="alignTagsToGrid">
                  网格对齐全部 Tag
                </el-button>
                <el-button :disabled="!tagOverlays.length" plain @click="distributeTagsHorizontally">
                  横向等距
                </el-button>
                <el-button :disabled="!tagOverlays.length" plain @click="distributeTagsVertically">
                  纵向等距
                </el-button>
              </div>
            </section>
          </div>
        </section>
      </aside>
    </div>

    <div class="export-stage-host" aria-hidden="true">
      <div
        ref="exportStageRef"
        class="export-stage"
        :style="{
          width: `${imageNaturalWidth}px`,
          height: `${imageNaturalHeight}px`
        }"
      >
        <img
          v-if="imageSrc"
          class="stage-image"
          :src="imageSrc"
          :crossorigin="remoteImageSource ? 'anonymous' : undefined"
          alt="export"
          draggable="false"
        />

        <div
          v-for="overlay in overlays"
          :key="`export-${overlay.id}`"
          class="stage-overlay export-overlay"
          :class="{ 'is-banner': overlay.type === 'banner' }"
          :style="getOverlayStyle(overlay, true)"
        >
          {{ overlay.text }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'

const STORAGE_KEY = 'logical_byte_image_tagger_config_v1'
const TAG_DATA_VERSION = 1

const fileInputRef = ref(null)
const tagFileInputRef = ref(null)
const uploadZoneRef = ref(null)
const previewStageRef = ref(null)
const exportStageRef = ref(null)

const imageSrc = ref('')
const imageUrlInput = ref('')
const imageSourceName = ref('')
const imageNaturalWidth = ref(0)
const imageNaturalHeight = ref(0)
const savedReferenceWidth = ref(0)
const savedReferenceHeight = ref(0)

const previewZoom = ref(1)
const exportFileName = ref('image-tagged')
const overlays = ref([])
const selectedOverlayId = ref('')
const bulkInputText = ref('')
const bulkStartX = ref(120)
const bulkStartY = ref(160)
const bulkColumns = ref(6)
const bulkGapX = ref(150)
const bulkGapY = ref(130)
const bulkColorPresetName = ref('橙')
const bulkAutoGapX = ref(true)
const snapEnabled = ref(true)
const snapStep = ref(8)
const alignColumns = ref(6)
const alignGapX = ref(150)
const alignGapY = ref(130)
const alignAnchorMode = ref('selected')

const dragState = ref(null)
let saveTimer = null

const colorPresets = [
  { name: '橙', bg: '#f47a2c', text: '#ffffff' },
  { name: '蓝', bg: '#1f6f96', text: '#ffffff' },
  { name: '紫', bg: '#a52da3', text: '#ffffff' },
  { name: '金', bg: '#e0a01b', text: '#1f1400' },
  { name: '红', bg: '#d44e53', text: '#ffffff' },
  { name: '绿', bg: '#23866f', text: '#ffffff' },
  { name: '灰', bg: '#4f566b', text: '#ffffff' }
]

const previewBaseScale = computed(() => {
  if (!imageNaturalWidth.value) return 1
  return Math.min(1, 980 / imageNaturalWidth.value)
})

const previewScale = computed(() => previewBaseScale.value * previewZoom.value)

const previewStageWidth = computed(() => {
  if (!imageNaturalWidth.value) return 960
  return Math.max(320, Math.round(imageNaturalWidth.value * previewScale.value))
})

const previewStageHeight = computed(() => {
  if (!imageNaturalHeight.value) return 540
  return Math.max(180, Math.round(imageNaturalHeight.value * previewScale.value))
})

const selectedOverlay = computed(() => {
  return overlays.value.find((overlay) => overlay.id === selectedOverlayId.value) || null
})

const selectedOverlayIndex = computed(() => {
  return overlays.value.findIndex((overlay) => overlay.id === selectedOverlayId.value)
})

const canAddOverlay = computed(() => Boolean(imageSrc.value))
const canExport = computed(() => Boolean(imageSrc.value && imageNaturalWidth.value && imageNaturalHeight.value))
const remoteImageSource = computed(() => /^https?:\/\//i.test(imageSrc.value))
const canMoveForward = computed(() => {
  return selectedOverlayIndex.value > -1 && selectedOverlayIndex.value < overlays.value.length - 1
})
const canMoveBackward = computed(() => selectedOverlayIndex.value > 0)
const tagOverlays = computed(() => overlays.value.filter((overlay) => overlay.type === 'tag'))

function makeOverlayId() {
  return `overlay_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function getFiniteNumber(value, fallback) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

function clampPosition(value, maxValue) {
  const numeric = Math.max(0, getFiniteNumber(value, 0))
  return maxValue ? clamp(numeric, 0, maxValue) : numeric
}

function quantize(value) {
  if (!snapEnabled.value) {
    return value
  }

  const step = Math.max(1, Number(snapStep.value) || 1)
  return Math.round(value / step) * step
}

function createOverlay(type) {
  const baseWidth = imageNaturalWidth.value || 1600
  const baseHeight = imageNaturalHeight.value || 900
  const stackOffset = overlays.value.length * 22

  if (type === 'banner') {
    return {
      id: makeOverlayId(),
      type: 'banner',
      text: '数字为性价比（理智价值/1000代币）\n越大越值得买',
      bgColor: '#f47a2c',
      textColor: '#ffffff',
      x: Math.round(baseWidth * 0.38),
      y: Math.round(baseHeight * 0.08) + stackOffset,
      width: Math.round(baseWidth * 0.46),
      fontSize: Math.max(30, Math.round(baseWidth * 0.026)),
      fontWeight: '900',
      radius: 0,
      paddingX: 38,
      paddingY: 24,
      lineHeight: 1.3,
      opacity: 1,
      textAlign: 'right'
    }
  }

  return {
    id: makeOverlayId(),
    type: 'tag',
    text: '8.8',
    bgColor: '#f47a2c',
    textColor: '#ffffff',
    x: Math.round(baseWidth * 0.12) + stackOffset,
    y: Math.round(baseHeight * 0.16) + stackOffset,
    width: 0,
    fontSize: Math.max(28, Math.round(baseWidth * 0.027)),
    fontWeight: '800',
    radius: 16,
    paddingX: 18,
    paddingY: 10,
    lineHeight: 1,
    opacity: 1,
    textAlign: 'center'
  }
}

function normalizeOverlay(overlay, bounds = {}) {
  const rawOverlay = overlay || {}
  const type = rawOverlay.type === 'banner' ? 'banner' : 'tag'
  const boundsWidth = Math.max(
    getFiniteNumber(bounds.width, 0) || imageNaturalWidth.value || savedReferenceWidth.value || 0,
    0
  )
  const boundsHeight = Math.max(
    getFiniteNumber(bounds.height, 0) || imageNaturalHeight.value || savedReferenceHeight.value || 0,
    0
  )

  return {
    ...rawOverlay,
    id: rawOverlay.id || makeOverlayId(),
    type,
    text: `${rawOverlay.text ?? (type === 'banner' ? '说明文字' : '8.8')}`,
    bgColor: rawOverlay.bgColor || '#f47a2c',
    textColor: rawOverlay.textColor || '#ffffff',
    x: clampPosition(rawOverlay.x, boundsWidth),
    y: clampPosition(rawOverlay.y, boundsHeight),
    width: Math.max(0, getFiniteNumber(rawOverlay.width, 0)),
    fontSize: Math.max(16, getFiniteNumber(rawOverlay.fontSize, 48)),
    fontWeight: `${rawOverlay.fontWeight || (type === 'banner' ? '900' : '800')}`,
    radius: Math.max(0, getFiniteNumber(rawOverlay.radius, 0)),
    paddingX: Math.max(4, getFiniteNumber(rawOverlay.paddingX, 16)),
    paddingY: Math.max(2, getFiniteNumber(rawOverlay.paddingY, 10)),
    lineHeight: getFiniteNumber(rawOverlay.lineHeight, type === 'banner' ? 1.3 : 1),
    opacity: clamp(getFiniteNumber(rawOverlay.opacity, 1), 0.2, 1),
    textAlign: rawOverlay.textAlign || (type === 'banner' ? 'right' : 'center')
  }
}

function scaleOverlays(fromWidth, fromHeight, toWidth, toHeight) {
  if (!fromWidth || !fromHeight || !toWidth || !toHeight) return

  const scaleX = toWidth / fromWidth
  const scaleY = toHeight / fromHeight
  const scaleAvg = (scaleX + scaleY) / 2

  overlays.value = overlays.value.map((overlay) => {
    const nextOverlay = {
      ...overlay,
      x: Math.round((overlay.x || 0) * scaleX),
      y: Math.round((overlay.y || 0) * scaleY),
      width: overlay.width ? Math.round(overlay.width * scaleX) : overlay.width,
      fontSize: Math.max(16, Math.round((overlay.fontSize || 48) * scaleAvg)),
      radius: Math.max(0, Math.round((overlay.radius || 0) * scaleAvg)),
      paddingX: Math.max(4, Math.round((overlay.paddingX || 16) * scaleX)),
      paddingY: Math.max(2, Math.round((overlay.paddingY || 10) * scaleY))
    }

    return normalizeOverlay(nextOverlay, {
      width: toWidth,
      height: toHeight
    })
  })
}

function selectOverlay(id) {
  selectedOverlayId.value = id
}

function addOverlay(type, placement = null) {
  if (!canAddOverlay.value) {
    ElMessage.warning('请先放入一张底图')
    return
  }

  const overlay = createOverlay(type)

  if (placement) {
    overlay.x = clamp(Math.round(placement.x), 0, imageNaturalWidth.value)
    overlay.y = clamp(Math.round(placement.y), 0, imageNaturalHeight.value)
  }

  overlays.value = [...overlays.value, normalizeOverlay(overlay)]
  selectedOverlayId.value = overlay.id
}

function getPresetByName(name) {
  return colorPresets.find((preset) => preset.name === name) || colorPresets[0]
}

function parseNumericValue(text) {
  const match = `${text || ''}`.match(/-?\d+(?:\.\d+)?/)
  return match ? Number(match[0]) : null
}

function getAutoColorPreset(value, numericValues) {
  if (!Number.isFinite(value)) {
    return getPresetByName('灰')
  }

  const sortedValues = numericValues
    .filter((item) => Number.isFinite(item))
    .sort((a, b) => a - b)

  if (!sortedValues.length) {
    return getPresetByName('灰')
  }

  const min = sortedValues[0]
  const max = sortedValues[sortedValues.length - 1]

  if (max === min) {
    return getPresetByName('橙')
  }

  const ratio = (value - min) / (max - min)

  if (ratio >= 0.8) return getPresetByName('金')
  if (ratio >= 0.6) return getPresetByName('橙')
  if (ratio >= 0.35) return getPresetByName('紫')
  return getPresetByName('蓝')
}

function estimateBulkGapX() {
  const columns = Math.max(1, Number(bulkColumns.value) || 1)
  if (columns <= 1) {
    return 0
  }

  const baseWidth = imageNaturalWidth.value || savedReferenceWidth.value || 1600
  const startX = Math.max(0, Number(bulkStartX.value) || 0)
  const estimatedTagWidth = Math.max(72, Math.round(baseWidth * 0.035))
  const rightPadding = Math.max(48, Math.round(baseWidth * 0.03))
  const availableWidth = Math.max(0, baseWidth - startX - rightPadding - estimatedTagWidth)

  return Math.max(0, Math.round(availableWidth / (columns - 1)))
}

function applyAutoBulkGapX() {
  bulkGapX.value = estimateBulkGapX()
  ElMessage.success(`横向间距已估算为 ${bulkGapX.value}px`)
}

function createBulkTags() {
  if (!canAddOverlay.value) {
    ElMessage.warning('请先放入一张底图')
    return
  }

  const lines = bulkInputText.value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  if (!lines.length) {
    ElMessage.warning('先输入要批量生成的内容')
    return
  }

  const columns = Math.max(1, Number(bulkColumns.value) || 1)
  const gapX = bulkAutoGapX.value ? estimateBulkGapX() : Math.max(0, Number(bulkGapX.value) || 0)
  const gapY = Math.max(0, Number(bulkGapY.value) || 0)
  const startX = Math.max(0, Number(bulkStartX.value) || 0)
  const startY = Math.max(0, Number(bulkStartY.value) || 0)
  const preset = getPresetByName(bulkColorPresetName.value)
  const numericValues = lines.map(parseNumericValue)

  const newOverlays = lines.map((text, index) => {
    const column = index % columns
    const row = Math.floor(index / columns)
    const overlay = createOverlay('tag')
    const currentPreset = bulkColorPresetName.value === 'auto'
      ? getAutoColorPreset(numericValues[index], numericValues)
      : preset

    overlay.text = text
    overlay.bgColor = currentPreset.bg
    overlay.textColor = currentPreset.text
    overlay.x = quantize(startX + column * gapX)
    overlay.y = quantize(startY + row * gapY)
    return normalizeOverlay(overlay)
  })

  if (bulkAutoGapX.value) {
    bulkGapX.value = gapX
  }

  overlays.value = [...overlays.value, ...newOverlays]
  selectedOverlayId.value = newOverlays[0]?.id || selectedOverlayId.value
  ElMessage.success(`已生成 ${newOverlays.length} 个 Tag`)
}

function fillBulkStartFromSelected() {
  if (!selectedOverlay.value) {
    ElMessage.warning('先选中一个图层')
    return
  }

  bulkStartX.value = Math.round(selectedOverlay.value.x)
  bulkStartY.value = Math.round(selectedOverlay.value.y)
  ElMessage.success('已用当前选中图层的位置作为起点')
}

function duplicateSelectedOverlay() {
  if (!selectedOverlay.value) return

  const duplicate = normalizeOverlay({
    ...selectedOverlay.value,
    id: makeOverlayId(),
    x: selectedOverlay.value.x + 28,
    y: selectedOverlay.value.y + 28
  })

  const nextOverlays = [...overlays.value]
  nextOverlays.splice(selectedOverlayIndex.value + 1, 0, duplicate)
  overlays.value = nextOverlays
  selectedOverlayId.value = duplicate.id
}

function removeSelectedOverlay() {
  if (!selectedOverlay.value) return

  overlays.value = overlays.value.filter((overlay) => overlay.id !== selectedOverlayId.value)
  selectedOverlayId.value = overlays.value[0]?.id || ''
}

function clearOverlays() {
  overlays.value = []
  selectedOverlayId.value = ''
  ElMessage.success('标记已清空')
}

function moveSelectedLayer(direction) {
  const currentIndex = selectedOverlayIndex.value
  const targetIndex = currentIndex + direction

  if (currentIndex < 0 || targetIndex < 0 || targetIndex >= overlays.value.length) {
    return
  }

  const nextOverlays = [...overlays.value]
  const [currentItem] = nextOverlays.splice(currentIndex, 1)
  nextOverlays.splice(targetIndex, 0, currentItem)
  overlays.value = nextOverlays
}

function applyColorPreset(preset) {
  if (!selectedOverlay.value) return

  selectedOverlay.value.bgColor = preset.bg
  selectedOverlay.value.textColor = preset.text
}

function formatOverlayText(text) {
  const normalized = `${text || ''}`.replace(/\n/g, ' ')
  return normalized.length > 16 ? `${normalized.slice(0, 16)}...` : normalized || '空文本'
}

function getOverlayStyle(overlay, isExport) {
  const scale = isExport ? 1 : previewScale.value
  const width = overlay.type === 'banner' ? overlay.width * scale : undefined

  return {
    left: `${overlay.x * scale}px`,
    top: `${overlay.y * scale}px`,
    width: width ? `${width}px` : undefined,
    background: overlay.bgColor,
    color: overlay.textColor,
    opacity: overlay.opacity,
    fontSize: `${overlay.fontSize * scale}px`,
    fontWeight: overlay.fontWeight,
    borderRadius: `${overlay.radius * scale}px`,
    padding: `${overlay.paddingY * scale}px ${overlay.paddingX * scale}px`,
    lineHeight: overlay.lineHeight,
    textAlign: overlay.textAlign,
    boxShadow: `0 ${8 * scale}px ${24 * scale}px rgba(0, 0, 0, 0.2)`
  }
}

function ensureOverlayInsideBounds(overlay) {
  if (!imageNaturalWidth.value || !imageNaturalHeight.value) return

  overlay.x = clamp(Math.round(overlay.x), 0, imageNaturalWidth.value)
  overlay.y = clamp(Math.round(overlay.y), 0, imageNaturalHeight.value)

  if (overlay.type === 'banner') {
    overlay.width = clamp(Math.round(overlay.width), 160, imageNaturalWidth.value)
  }

  overlay.fontSize = clamp(Math.round(overlay.fontSize), 16, 240)
  overlay.radius = clamp(Math.round(overlay.radius), 0, 120)
  overlay.paddingX = clamp(Math.round(overlay.paddingX), 4, 240)
  overlay.paddingY = clamp(Math.round(overlay.paddingY), 2, 160)
  overlay.opacity = clamp(Number(overlay.opacity), 0.2, 1)
  overlay.lineHeight = clamp(Number(overlay.lineHeight), 1, 1.8)
}

function getAlignAnchor() {
  const tagList = tagOverlays.value
  if (!tagList.length) return { x: 0, y: 0 }

  if (alignAnchorMode.value === 'selected' && selectedOverlay.value?.type === 'tag') {
    return {
      x: selectedOverlay.value.x,
      y: selectedOverlay.value.y
    }
  }

  const sorted = [...tagList].sort((a, b) => {
    if (a.y !== b.y) return a.y - b.y
    return a.x - b.x
  })

  return {
    x: sorted[0].x,
    y: sorted[0].y
  }
}

function getSortedTags() {
  return [...tagOverlays.value].sort((a, b) => {
    if (a.y !== b.y) return a.y - b.y
    return a.x - b.x
  })
}

function alignTagsToGrid() {
  const tagList = getSortedTags()
  if (!tagList.length) {
    ElMessage.warning('当前没有可对齐的 Tag')
    return
  }

  const anchor = getAlignAnchor()
  const columns = Math.max(1, Number(alignColumns.value) || 1)
  const gapX = Math.max(0, Number(alignGapX.value) || 0)
  const gapY = Math.max(0, Number(alignGapY.value) || 0)

  tagList.forEach((overlay, index) => {
    const column = index % columns
    const row = Math.floor(index / columns)
    overlay.x = quantize(anchor.x + column * gapX)
    overlay.y = quantize(anchor.y + row * gapY)
    ensureOverlayInsideBounds(overlay)
  })

  ElMessage.success('Tag 已按网格对齐')
}

function distributeTagsHorizontally() {
  const tagList = getSortedTags()
  if (tagList.length < 2) {
    ElMessage.warning('至少需要两个 Tag')
    return
  }

  const anchor = getAlignAnchor()
  const gapX = Math.max(0, Number(alignGapX.value) || 0)

  tagList.forEach((overlay, index) => {
    overlay.x = quantize(anchor.x + index * gapX)
    if (alignAnchorMode.value === 'selected' && selectedOverlay.value?.type === 'tag') {
      overlay.y = quantize(selectedOverlay.value.y)
    } else {
      overlay.y = quantize(anchor.y)
    }
    ensureOverlayInsideBounds(overlay)
  })

  ElMessage.success('Tag 已横向等距排列')
}

function distributeTagsVertically() {
  const tagList = getSortedTags()
  if (tagList.length < 2) {
    ElMessage.warning('至少需要两个 Tag')
    return
  }

  const anchor = getAlignAnchor()
  const gapY = Math.max(0, Number(alignGapY.value) || 0)

  tagList.forEach((overlay, index) => {
    overlay.y = quantize(anchor.y + index * gapY)
    if (alignAnchorMode.value === 'selected' && selectedOverlay.value?.type === 'tag') {
      overlay.x = quantize(selectedOverlay.value.x)
    } else {
      overlay.x = quantize(anchor.x)
    }
    ensureOverlayInsideBounds(overlay)
  })

  ElMessage.success('Tag 已纵向等距排列')
}

function startDrag(event, overlayId) {
  const overlay = overlays.value.find((item) => item.id === overlayId)
  if (!overlay || !imageSrc.value) return

  selectedOverlayId.value = overlayId
  dragState.value = {
    overlayId,
    startX: event.clientX,
    startY: event.clientY,
    originX: overlay.x,
    originY: overlay.y
  }

  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', stopDrag)
}

function onPointerMove(event) {
  if (!dragState.value || !previewScale.value) return

  const overlay = overlays.value.find((item) => item.id === dragState.value.overlayId)
  if (!overlay) return

  const deltaX = (event.clientX - dragState.value.startX) / previewScale.value
  const deltaY = (event.clientY - dragState.value.startY) / previewScale.value

  overlay.x = quantize(dragState.value.originX + deltaX)
  overlay.y = quantize(dragState.value.originY + deltaY)
  ensureOverlayInsideBounds(overlay)
}

function stopDrag() {
  dragState.value = null
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', stopDrag)
}

function handleStageClick(event) {
  if (event.target === event.currentTarget || event.target === event.currentTarget.querySelector('.stage-image')) {
    selectedOverlayId.value = ''
  }
}

function handleStageDoubleClick(event) {
  if (!previewStageRef.value || !imageSrc.value) return

  const rect = previewStageRef.value.getBoundingClientRect()
  const x = (event.clientX - rect.left) / previewScale.value - 42
  const y = (event.clientY - rect.top) / previewScale.value - 22

  addOverlay('tag', { x, y })
}

function resetView() {
  previewZoom.value = 1
}

function triggerFileInput() {
  fileInputRef.value?.click()
}

function triggerTagFileInput() {
  tagFileInputRef.value?.click()
}

function focusPasteZone() {
  uploadZoneRef.value?.focus()
  ElMessage.info('现在可以直接按 Ctrl + V 粘贴截图')
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error || new Error('读取图片失败'))
    reader.readAsDataURL(file)
  })
}

function loadImageMeta(src) {
  return new Promise((resolve, reject) => {
    const image = new Image()

    if (/^https?:\/\//i.test(src)) {
      image.crossOrigin = 'anonymous'
    }

    image.onload = () => {
      resolve({
        width: image.naturalWidth,
        height: image.naturalHeight
      })
    }

    image.onerror = () => reject(new Error('图片加载失败'))
    image.src = src
  })
}

async function setImageSource(src, sourceName = '') {
  const trimmed = `${src || ''}`.trim()
  if (!trimmed) return

  try {
    const meta = await loadImageMeta(trimmed)
    const referenceWidth = imageNaturalWidth.value || savedReferenceWidth.value
    const referenceHeight = imageNaturalHeight.value || savedReferenceHeight.value

    if (referenceWidth && referenceHeight && overlays.value.length) {
      scaleOverlays(referenceWidth, referenceHeight, meta.width, meta.height)
    }

    imageSrc.value = trimmed
    imageNaturalWidth.value = meta.width
    imageNaturalHeight.value = meta.height
    savedReferenceWidth.value = meta.width
    savedReferenceHeight.value = meta.height
    imageSourceName.value = sourceName || '远程图片'

    overlays.value.forEach((overlay) => ensureOverlayInsideBounds(overlay))

    await nextTick()
    ElMessage.success('底图已载入')
  } catch (error) {
    ElMessage.error(error.message || '图片载入失败')
  }
}

async function handleFileChange(event) {
  const file = event.target.files?.[0]
  if (!file) return

  try {
    const dataUrl = await readFileAsDataUrl(file)
    await setImageSource(dataUrl, file.name)
  } finally {
    event.target.value = ''
  }
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error || new Error('读取文件失败'))
    reader.readAsText(file)
  })
}

async function handleTagFileChange(event) {
  const file = event.target.files?.[0]
  if (!file) return

  try {
    const text = await readFileAsText(file)
    importTagData(JSON.parse(text))
  } catch (error) {
    ElMessage.error(error.message || 'Tag JSON 导入失败')
  } finally {
    event.target.value = ''
  }
}

async function handleDrop(event) {
  const files = Array.from(event.dataTransfer?.files || [])
  const imageFile = files.find((item) => item.type.startsWith('image/'))
  const tagFile = files.find((item) => {
    return item.type === 'application/json' || /\.json$/i.test(item.name)
  })

  if (tagFile && !imageFile) {
    try {
      const text = await readFileAsText(tagFile)
      importTagData(JSON.parse(text))
    } catch (error) {
      ElMessage.error(error.message || 'Tag JSON 导入失败')
    }
    return
  }

  if (!imageFile) {
    ElMessage.warning('请拖入图片或 Tag JSON 文件')
    return
  }

  const dataUrl = await readFileAsDataUrl(imageFile)
  await setImageSource(dataUrl, imageFile.name)
}

async function handlePaste(event) {
  const items = Array.from(event.clipboardData?.items || [])
  const imageItem = items.find((item) => item.type.startsWith('image/'))

  if (imageItem) {
    const file = imageItem.getAsFile()
    if (!file) return

    const dataUrl = await readFileAsDataUrl(file)
    await setImageSource(dataUrl, file.name || '粘贴图片')
    return
  }

  const text = event.clipboardData?.getData('text/plain')?.trim()
  if (text && /^https?:\/\//i.test(text)) {
    imageUrlInput.value = text
    ElMessage.info('检测到图片地址，点“载入”即可')
  }
}

async function applyImageUrl() {
  if (!imageUrlInput.value.trim()) {
    ElMessage.warning('先输入图片地址')
    return
  }

  await setImageSource(imageUrlInput.value.trim(), '远程图片')
}

function clearImage() {
  imageSrc.value = ''
  imageUrlInput.value = ''
  imageSourceName.value = ''
  imageNaturalWidth.value = 0
  imageNaturalHeight.value = 0
  selectedOverlayId.value = ''
}

function getTagDataPayload() {
  return {
    type: 'logical-byte-image-tagger',
    version: TAG_DATA_VERSION,
    exportedAt: new Date().toISOString(),
    canvas: {
      width: imageNaturalWidth.value || savedReferenceWidth.value || 0,
      height: imageNaturalHeight.value || savedReferenceHeight.value || 0,
      imageSourceName: imageSourceName.value || '',
      remoteImageUrl: remoteImageSource.value ? imageSrc.value : ''
    },
    overlays: overlays.value.map((overlay) => ({ ...overlay })),
    settings: {
      exportFileName: exportFileName.value,
      previewZoom: previewZoom.value,
      bulkStartX: bulkStartX.value,
      bulkStartY: bulkStartY.value,
      bulkColumns: bulkColumns.value,
      bulkGapX: bulkGapX.value,
      bulkGapY: bulkGapY.value,
      bulkColorPresetName: bulkColorPresetName.value,
      bulkAutoGapX: bulkAutoGapX.value,
      snapEnabled: snapEnabled.value,
      snapStep: snapStep.value,
      alignColumns: alignColumns.value,
      alignGapX: alignGapX.value,
      alignGapY: alignGapY.value,
      alignAnchorMode: alignAnchorMode.value
    }
  }
}

function exportTagData() {
  const payload = getTagDataPayload()
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json'
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = `${(exportFileName.value || 'image-tagged').trim()}-tags.json`
  link.click()
  URL.revokeObjectURL(url)
  ElMessage.success('Tag JSON 已导出')
}

function importTagData(payload) {
  const importedOverlays = Array.isArray(payload?.overlays)
    ? payload.overlays
    : Array.isArray(payload)
      ? payload
      : []

  if (!importedOverlays.length) {
    throw new Error('没有找到可导入的 Tag 数据')
  }

  const sourceCanvas = payload?.canvas || {}
  const sourceWidth = getFiniteNumber(sourceCanvas.width, 0)
  const sourceHeight = getFiniteNumber(sourceCanvas.height, 0)
  const importReferenceWidth = sourceWidth || imageNaturalWidth.value || savedReferenceWidth.value
  const importReferenceHeight = sourceHeight || imageNaturalHeight.value || savedReferenceHeight.value
  const targetWidth = imageNaturalWidth.value || importReferenceWidth
  const targetHeight = imageNaturalHeight.value || importReferenceHeight

  let nextOverlays = importedOverlays.map((overlay) => normalizeOverlay(overlay, {
    width: importReferenceWidth,
    height: importReferenceHeight
  }))

  if (sourceWidth && sourceHeight && targetWidth && targetHeight && (sourceWidth !== targetWidth || sourceHeight !== targetHeight)) {
    const scaleX = targetWidth / sourceWidth
    const scaleY = targetHeight / sourceHeight
    const scaleAvg = (scaleX + scaleY) / 2

    nextOverlays = nextOverlays.map((overlay) => normalizeOverlay({
      ...overlay,
      x: Math.round((overlay.x || 0) * scaleX),
      y: Math.round((overlay.y || 0) * scaleY),
      width: overlay.width ? Math.round(overlay.width * scaleX) : overlay.width,
      fontSize: Math.max(16, Math.round((overlay.fontSize || 48) * scaleAvg)),
      radius: Math.max(0, Math.round((overlay.radius || 0) * scaleAvg)),
      paddingX: Math.max(4, Math.round((overlay.paddingX || 16) * scaleX)),
      paddingY: Math.max(2, Math.round((overlay.paddingY || 10) * scaleY))
    }, {
      width: targetWidth,
      height: targetHeight
    }))
  }

  overlays.value = nextOverlays
  selectedOverlayId.value = overlays.value[0]?.id || ''
  savedReferenceWidth.value = targetWidth || savedReferenceWidth.value
  savedReferenceHeight.value = targetHeight || savedReferenceHeight.value

  const settings = payload?.settings || {}
  if (settings.exportFileName) exportFileName.value = settings.exportFileName
  if (Number.isFinite(Number(settings.previewZoom))) previewZoom.value = clamp(Number(settings.previewZoom), 0.7, 2.4)
  if (Number.isFinite(Number(settings.bulkStartX))) bulkStartX.value = Number(settings.bulkStartX)
  if (Number.isFinite(Number(settings.bulkStartY))) bulkStartY.value = Number(settings.bulkStartY)
  if (Number.isFinite(Number(settings.bulkColumns))) bulkColumns.value = Number(settings.bulkColumns)
  if (Number.isFinite(Number(settings.bulkGapX))) bulkGapX.value = Number(settings.bulkGapX)
  if (Number.isFinite(Number(settings.bulkGapY))) bulkGapY.value = Number(settings.bulkGapY)
  if (settings.bulkColorPresetName) bulkColorPresetName.value = settings.bulkColorPresetName
  if (typeof settings.bulkAutoGapX === 'boolean') bulkAutoGapX.value = settings.bulkAutoGapX
  if (Number.isFinite(Number(settings.snapStep))) snapStep.value = Number(settings.snapStep)
  if (typeof settings.snapEnabled === 'boolean') snapEnabled.value = settings.snapEnabled
  if (Number.isFinite(Number(settings.alignColumns))) alignColumns.value = Number(settings.alignColumns)
  if (Number.isFinite(Number(settings.alignGapX))) alignGapX.value = Number(settings.alignGapX)
  if (Number.isFinite(Number(settings.alignGapY))) alignGapY.value = Number(settings.alignGapY)
  if (settings.alignAnchorMode) alignAnchorMode.value = settings.alignAnchorMode

  if (!imageSrc.value && sourceCanvas.remoteImageUrl) {
    imageUrlInput.value = sourceCanvas.remoteImageUrl
    ElMessage.info('Tag 已导入；JSON 中有远程底图地址，可点“载入”恢复底图')
  } else {
    ElMessage.success(`已导入 ${overlays.value.length} 个 Tag`)
  }
}

function waitForImages(rootElement) {
  const images = Array.from(rootElement?.querySelectorAll('img') || [])

  return Promise.all(
    images.map((image) => {
      if (image.complete && image.naturalWidth > 0) {
        return Promise.resolve()
      }

      return new Promise((resolve, reject) => {
        const handleLoad = () => resolve()
        const handleError = () => reject(new Error('导出前图片未加载成功'))

        image.addEventListener('load', handleLoad, { once: true })
        image.addEventListener('error', handleError, { once: true })
      })
    })
  )
}

async function exportImage() {
  if (!canExport.value || !exportStageRef.value) {
    ElMessage.warning('请先准备好底图')
    return
  }

  try {
    await waitForImages(exportStageRef.value)
    const { default: html2canvas } = await import('html2canvas')

    const canvas = await html2canvas(exportStageRef.value, {
      backgroundColor: null,
      scale: 1,
      useCORS: true,
      width: imageNaturalWidth.value,
      height: imageNaturalHeight.value,
      logging: false
    })

    const link = document.createElement('a')
    link.download = `${(exportFileName.value || 'image-tagged').trim()}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()

    ElMessage.success('PNG 已导出')
  } catch (error) {
    ElMessage.error(error.message || '导出失败，可能是远程图片不支持跨域')
  }
}

function scheduleSave() {
  if (saveTimer) {
    window.clearTimeout(saveTimer)
  }

  saveTimer = window.setTimeout(saveConfig, 160)
}

function saveConfig() {
  const payload = {
    overlays: overlays.value,
    exportFileName: exportFileName.value,
    previewZoom: previewZoom.value,
    bulkInputText: bulkInputText.value,
    bulkStartX: bulkStartX.value,
    bulkStartY: bulkStartY.value,
    bulkColumns: bulkColumns.value,
    bulkGapX: bulkGapX.value,
    bulkGapY: bulkGapY.value,
    bulkColorPresetName: bulkColorPresetName.value,
    bulkAutoGapX: bulkAutoGapX.value,
    snapEnabled: snapEnabled.value,
    snapStep: snapStep.value,
    alignColumns: alignColumns.value,
    alignGapX: alignGapX.value,
    alignGapY: alignGapY.value,
    alignAnchorMode: alignAnchorMode.value,
    canvasWidth: imageNaturalWidth.value || savedReferenceWidth.value,
    canvasHeight: imageNaturalHeight.value || savedReferenceHeight.value,
    imageSourceName: imageSourceName.value,
    remoteImageUrl: remoteImageSource.value ? imageSrc.value : ''
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
}

function loadConfig() {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null

  try {
    const config = JSON.parse(raw)
    savedReferenceWidth.value = Number(config.canvasWidth) || 0
    savedReferenceHeight.value = Number(config.canvasHeight) || 0
    overlays.value = Array.isArray(config.overlays)
      ? config.overlays.map((overlay) => normalizeOverlay(overlay, {
        width: savedReferenceWidth.value,
        height: savedReferenceHeight.value
      }))
      : []
    exportFileName.value = config.exportFileName || 'image-tagged'
    previewZoom.value = clamp(Number(config.previewZoom) || 1, 0.7, 2.4)
    bulkInputText.value = config.bulkInputText || ''
    bulkStartX.value = Number(config.bulkStartX) || 120
    bulkStartY.value = Number(config.bulkStartY) || 160
    bulkColumns.value = Number(config.bulkColumns) || 6
    bulkGapX.value = Number(config.bulkGapX) || 150
    bulkGapY.value = Number(config.bulkGapY) || 130
    bulkColorPresetName.value = config.bulkColorPresetName || '橙'
    bulkAutoGapX.value = typeof config.bulkAutoGapX === 'boolean' ? config.bulkAutoGapX : true
    snapEnabled.value = typeof config.snapEnabled === 'boolean' ? config.snapEnabled : true
    snapStep.value = Number(config.snapStep) || 8
    alignColumns.value = Number(config.alignColumns) || 6
    alignGapX.value = Number(config.alignGapX) || 150
    alignGapY.value = Number(config.alignGapY) || 130
    alignAnchorMode.value = config.alignAnchorMode || 'selected'
    imageSourceName.value = config.imageSourceName || ''
    imageUrlInput.value = config.remoteImageUrl || ''
    selectedOverlayId.value = overlays.value[0]?.id || ''
    return config
  } catch (error) {
    console.error('读取图片标记配置失败', error)
    return null
  }
}

watch(
  overlays,
  (nextOverlays) => {
    nextOverlays.forEach((overlay) => ensureOverlayInsideBounds(overlay))
    scheduleSave()
  },
  { deep: true }
)

watch(
  [
    exportFileName,
    previewZoom,
    bulkInputText,
    bulkStartX,
    bulkStartY,
    bulkColumns,
    bulkGapX,
    bulkGapY,
    bulkColorPresetName,
    bulkAutoGapX,
    snapEnabled,
    snapStep,
    alignColumns,
    alignGapX,
    alignGapY,
    alignAnchorMode
  ],
  scheduleSave
)

onMounted(async () => {
  const config = loadConfig()

  if (config?.remoteImageUrl) {
    await setImageSource(config.remoteImageUrl, config.imageSourceName || '远程图片')
  }
})

onBeforeUnmount(() => {
  stopDrag()
  if (saveTimer) {
    window.clearTimeout(saveTimer)
  }
})
</script>

<style scoped>
.image-tagger-page {
  min-height: 100vh;
  padding: 28px;
  width: 100vw;
  max-width: none;
  margin-left: calc(50% - 50vw);
  margin-right: calc(50% - 50vw);
  background:
    radial-gradient(circle at top left, rgba(79, 203, 198, 0.16), transparent 28%),
    radial-gradient(circle at top right, rgba(244, 122, 44, 0.16), transparent 30%),
    linear-gradient(180deg, #f5f7fb 0%, #eef2f7 100%);
  color: #172235;
  font-family:
    "HarmonyOS Sans SC",
    "PingFang SC",
    "Microsoft YaHei",
    sans-serif;
}

.image-tagger-hero {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  align-items: flex-start;
  padding: 24px 28px;
  border: 1px solid rgba(23, 34, 53, 0.08);
  border-radius: 28px;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(247, 250, 255, 0.9)),
    linear-gradient(90deg, rgba(79, 203, 198, 0.1), rgba(244, 122, 44, 0.1));
  box-shadow: 0 24px 60px rgba(23, 34, 53, 0.08);
}

.image-tagger-kicker {
  margin: 0 0 8px;
  font-size: 0.82rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #1f8f99;
}

.image-tagger-hero h1 {
  margin: 0;
  font-size: clamp(2rem, 4vw, 3rem);
  line-height: 1;
}

.image-tagger-description {
  margin: 14px 0 0;
  max-width: 700px;
  font-size: 1rem;
  line-height: 1.7;
  color: #546179;
}

.image-tagger-hero-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 12px;
}

.workspace-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(420px, 520px);
  gap: 20px;
  margin-top: 20px;
  align-items: start;
}

.workspace-stage,
.workspace-sidebar {
  min-width: 0;
}

.workspace-stage {
  position: sticky;
  top: 76px;
  align-self: start;
}

.workspace-sidebar {
  display: grid;
  gap: 16px;
}

.panel-card {
  padding: 18px;
  border: 1px solid rgba(23, 34, 53, 0.08);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 20px 48px rgba(23, 34, 53, 0.08);
}

.tool-panel {
  display: grid;
  gap: 16px;
}

.tool-panel-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.tool-panel-header h2 {
  margin: 4px 0 0;
  font-size: 1.15rem;
}

.tool-panel-kicker {
  margin: 0;
  font-size: 0.76rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #1f8f99;
}

.tool-panel-grid {
  display: grid;
  gap: 14px;
}

.panel-subcard {
  padding: 16px;
  border: 1px solid rgba(23, 34, 53, 0.08);
  border-radius: 20px;
  background:
    linear-gradient(180deg, rgba(248, 250, 254, 0.98), rgba(255, 255, 255, 0.95));
}

.panel-subcard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.panel-subcard-header.tight {
  margin-top: 4px;
}

.panel-subcard-header h3 {
  margin: 0;
  font-size: 1rem;
}

.editor-block {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid rgba(23, 34, 53, 0.08);
}

.editor-divider {
  height: 1px;
  margin: 16px 0;
  background: rgba(23, 34, 53, 0.08);
}

.panel-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}

.panel-card-header h2 {
  margin: 0;
  font-size: 1.05rem;
}

.panel-card-meta {
  font-size: 0.82rem;
  color: #66748d;
}

.panel-tip {
  margin: 12px 0 0;
  color: #66748d;
  font-size: 0.84rem;
  line-height: 1.7;
}

.upload-dropzone {
  padding: 18px;
  border: 1px dashed rgba(31, 111, 150, 0.25);
  border-radius: 20px;
  background:
    linear-gradient(180deg, rgba(241, 247, 255, 0.92), rgba(249, 251, 255, 0.88));
  outline: none;
}

.upload-dropzone:focus {
  border-color: rgba(31, 111, 150, 0.5);
  box-shadow: 0 0 0 4px rgba(31, 111, 150, 0.08);
}

.upload-dropzone p {
  margin: 10px 0 0;
  line-height: 1.6;
  color: #5d6a82;
}

.upload-dropzone-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.upload-source-name {
  font-size: 0.9rem;
  font-weight: 700;
  color: #1f6f96;
}

.hidden-input {
  display: none;
}

.field-stack {
  display: grid;
  gap: 8px;
}

.field-stack + .field-stack {
  margin-top: 12px;
}

.compact-toggle {
  margin-top: 10px;
}

.field-label {
  font-size: 0.86rem;
  font-weight: 700;
  color: #4b5870;
}

.field-inline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.field-value {
  font-size: 0.84rem;
  color: #66748d;
}

.url-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
}

.panel-inline-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 12px;
}

.ghost-action {
  padding: 0;
  border: none;
  background: transparent;
  color: #1f6f96;
  font: inherit;
  cursor: pointer;
}

.layer-toolbar,
.selection-toolbar,
.export-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.layer-list {
  display: grid;
  gap: 10px;
  max-height: 300px;
  overflow: auto;
}

.layer-item {
  display: grid;
  grid-template-columns: 14px 36px 60px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 12px 14px;
  border: 1px solid rgba(23, 34, 53, 0.08);
  border-radius: 16px;
  background: #f8fafd;
  text-align: left;
  cursor: pointer;
  transition:
    transform 0.18s ease,
    border-color 0.18s ease,
    box-shadow 0.18s ease;
}

.layer-item:hover,
.layer-item.is-selected {
  transform: translateY(-1px);
  border-color: rgba(31, 111, 150, 0.3);
  box-shadow: 0 14px 26px rgba(23, 34, 53, 0.08);
}

.layer-item-swatch {
  width: 14px;
  height: 14px;
  border-radius: 999px;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.4);
}

.layer-item-order {
  font-family: "SFMono-Regular", Consolas, monospace;
  font-size: 0.82rem;
  color: #738198;
}

.layer-item-title {
  font-size: 0.84rem;
  font-weight: 800;
}

.layer-item-text {
  overflow: hidden;
  color: #546179;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.empty-note {
  padding: 16px;
  border-radius: 16px;
  background: #f6f8fc;
  color: #66748d;
  line-height: 1.7;
}

.preset-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.preset-swatch {
  min-width: 54px;
  padding: 8px 12px;
  border: none;
  border-radius: 999px;
  font: inherit;
  font-size: 0.84rem;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 10px 18px rgba(23, 34, 53, 0.08);
}

.control-grid {
  display: grid;
  gap: 12px;
  margin-top: 12px;
}

.control-grid.two-column {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.wide-field {
  grid-column: 1 / -1;
}

.image-tagger-main {
  min-width: 0;
}

.canvas-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
  color: #516078;
  line-height: 1.6;
}

.canvas-toolbar-copy {
  display: grid;
  gap: 4px;
}

.canvas-toolbar-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.canvas-shell {
  min-height: calc(100vh - 120px);
  max-height: calc(100vh - 120px);
  padding: 14px;
  background:
    linear-gradient(180deg, rgba(18, 26, 41, 0.92), rgba(10, 16, 28, 0.96)),
    linear-gradient(135deg, rgba(79, 203, 198, 0.08), rgba(244, 122, 44, 0.08));
  box-shadow: 0 24px 60px rgba(10, 16, 28, 0.22);
  outline: none;
}

.canvas-empty-state {
  display: grid;
  place-items: center;
  min-height: calc(100vh - 180px);
  padding: 28px;
  text-align: center;
  color: rgba(255, 255, 255, 0.86);
}

.canvas-empty-state h2 {
  margin: 18px 0 12px;
  font-size: clamp(1.8rem, 3vw, 2.5rem);
}

.canvas-empty-state p {
  margin: 0;
  max-width: 520px;
  line-height: 1.8;
  color: rgba(255, 255, 255, 0.68);
}

.canvas-empty-badge {
  padding: 8px 14px;
  border-radius: 999px;
  background: rgba(79, 203, 198, 0.18);
  color: #8ee7df;
  font-size: 0.84rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.canvas-scroller {
  overflow: auto;
  display: grid;
  justify-items: center;
}

.canvas-scroller.is-large {
  min-height: calc(100vh - 200px);
  max-height: calc(100vh - 200px);
}

.canvas-stage {
  position: relative;
  overflow: hidden;
  margin: 0 auto;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.08);
  box-shadow: 0 24px 50px rgba(0, 0, 0, 0.3);
}

.stage-image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  user-select: none;
  -webkit-user-drag: none;
}

.stage-overlay {
  position: absolute;
  border: none;
  cursor: grab;
  white-space: pre-wrap;
  user-select: none;
  transform: translate3d(0, 0, 0);
  transition: box-shadow 0.16s ease, outline-color 0.16s ease;
  font-family:
    "DIN Alternate",
    "HarmonyOS Sans SC",
    "PingFang SC",
    sans-serif;
}

.stage-overlay.is-banner {
  letter-spacing: 0.01em;
}

.stage-overlay.is-selected {
  outline: 3px solid rgba(255, 255, 255, 0.96);
  outline-offset: 0;
}

.stage-overlay:active {
  cursor: grabbing;
}

.export-stage-host {
  position: fixed;
  top: 0;
  left: -100000px;
  opacity: 0;
  pointer-events: none;
}

.export-stage {
  position: relative;
  overflow: hidden;
}

.export-overlay {
  outline: none;
}

@media (max-width: 1200px) {
  .workspace-layout {
    grid-template-columns: 1fr;
  }

  .workspace-stage {
    position: static;
  }

  .canvas-shell {
    min-height: 620px;
    max-height: none;
  }

  .canvas-empty-state {
    min-height: 580px;
  }

  .canvas-scroller.is-large {
    max-height: none;
  }
}

@media (max-width: 768px) {
  .image-tagger-page {
    padding: 16px;
    margin-left: 0;
    margin-right: 0;
    width: auto;
  }

  .image-tagger-hero {
    padding: 18px;
  }

  .image-tagger-hero,
  .canvas-toolbar {
    display: grid;
  }

  .tool-panel-header,
  .panel-subcard-header {
    display: grid;
  }

  .control-grid.two-column,
  .url-row {
    grid-template-columns: 1fr;
  }

  .selection-toolbar,
  .export-actions,
  .layer-toolbar,
  .canvas-toolbar-actions,
  .upload-dropzone-actions,
  .panel-inline-actions {
    display: grid;
  }

  .canvas-shell {
    padding: 12px;
    border-radius: 20px;
    min-height: 480px;
    max-height: none;
  }

  .canvas-empty-state,
  .canvas-scroller.is-large {
    min-height: 420px;
    max-height: none;
  }
}
</style>
