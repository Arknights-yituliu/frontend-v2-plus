<template>
  <div class="landscape-to-portrait-page">
    <header class="tool-header">
      <div>
        <p class="tool-kicker">LogicalByte Post Maker</p>
        <h1>横封转竖封</h1>
      </div>

      <div class="header-actions">
        <button
          class="action-button secondary"
          type="button"
          :disabled="!imageSource"
          @click="resetSettings"
        >
          <span class="mdi mdi-refresh" aria-hidden="true"></span>
          重置参数
        </button>
        <button
          class="action-button primary"
          type="button"
          :disabled="!imageSource || isRendering"
          @click="exportImage(OUTPUT_3_4_HEIGHT, '3比4')"
        >
          <span class="mdi mdi-download" aria-hidden="true"></span>
          {{ isRendering ? '导出中' : '导出 3:4' }}
        </button>
        <button
          class="action-button secondary"
          type="button"
          :disabled="!imageSource || isRendering"
          @click="exportImage(OUTPUT_HEIGHT, '9比16')"
        >
          <span class="mdi mdi-download-outline" aria-hidden="true"></span>
          导出 9:16
        </button>
        <RouterLink class="icon-button" to="/lb" title="返回控制台" aria-label="返回控制台">
          <span class="mdi mdi-arrow-left" aria-hidden="true"></span>
        </RouterLink>
      </div>
    </header>

    <main class="tool-workspace">
      <section class="preview-panel">
        <div class="panel-heading">
          <div>
            <span class="panel-kicker">Preview</span>
            <h2>竖封预览</h2>
          </div>
          <div class="preview-heading-actions">
            <div class="preview-mode-switch" role="group" aria-label="预览比例">
              <button
                type="button"
                :class="{ active: previewHeight === OUTPUT_3_4_HEIGHT }"
                :aria-pressed="previewHeight === OUTPUT_3_4_HEIGHT"
                @click="previewHeight = OUTPUT_3_4_HEIGHT"
              >
                3:4
              </button>
              <button
                type="button"
                :class="{ active: previewHeight === OUTPUT_HEIGHT }"
                :aria-pressed="previewHeight === OUTPUT_HEIGHT"
                @click="previewHeight = OUTPUT_HEIGHT"
              >
                9:16
              </button>
            </div>
            <span class="preview-size">1080 × {{ previewHeight }}</span>
          </div>
        </div>

        <div class="preview-stage">
          <div
            class="preview-frame"
            :class="{
              'is-three-four': previewHeight === OUTPUT_3_4_HEIGHT,
              'is-nine-sixteen': previewHeight === OUTPUT_HEIGHT
            }"
          >
            <canvas
              ref="previewCanvasRef"
              class="preview-canvas"
              :width="OUTPUT_WIDTH"
              :height="previewHeight"
            ></canvas>
            <div v-if="!imageSource" class="empty-preview">
              <span class="mdi mdi-image-plus-outline" aria-hidden="true"></span>
              <strong>上传一张横版图片</strong>
              <span>生成 1080 × {{ previewHeight }} 竖版图片</span>
            </div>
          </div>
        </div>

        <div class="preview-meta">
          <span v-if="imageSource">{{ sourceImageSize }}</span>
          <span v-else>尚未选择图片</span>
          <span>前景宽度 1080px · 背景高度 {{ previewHeight }}px</span>
        </div>
      </section>

      <aside class="control-panel">
        <section class="control-section upload-section">
          <div class="section-heading">
            <div>
              <span class="panel-kicker">Source</span>
              <h2>输入图片</h2>
            </div>
            <span class="file-type">PNG / JPG / WEBP</span>
          </div>

          <input
            ref="fileInputRef"
            class="visually-hidden"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            @change="handleFileInput"
          />
          <button class="upload-dropzone" type="button" @click="openFilePicker">
            <span class="mdi mdi-upload-outline" aria-hidden="true"></span>
            <span class="upload-copy">
              <strong>{{ imageSource ? '更换图片' : '选择图片' }}</strong>
              <small>{{ imageFileName || '点击上传一张原图' }}</small>
            </span>
            <span class="mdi mdi-chevron-right" aria-hidden="true"></span>
          </button>
        </section>

        <section class="control-section">
          <div class="section-heading">
            <div>
              <span class="panel-kicker">Background</span>
              <h2>背景效果</h2>
            </div>
          </div>

          <label class="range-control">
            <span class="range-label">
              <span>模糊度</span>
              <output>{{ blurAmount }}px</output>
            </span>
            <input v-model.number="blurAmount" type="range" min="0" max="40" step="1" />
          </label>

          <label class="range-control">
            <span class="range-label">
              <span>亮度</span>
              <output>{{ brightness }}%</output>
            </span>
            <input v-model.number="brightness" type="range" min="30" max="150" step="1" />
          </label>
        </section>

        <section class="control-section help-section">
          <div class="help-line">
            <span class="mdi mdi-information-outline" aria-hidden="true"></span>
            <span>背景取原图并铺满画布，前景保持清晰并垂直居中。</span>
          </div>
        </section>
      </aside>
    </main>
  </div>
</template>

<script setup>
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { ElMessage } from 'element-plus'

const OUTPUT_WIDTH = 1080
const OUTPUT_HEIGHT = 1920
const OUTPUT_3_4_HEIGHT = 1440
const DEFAULT_BLUR = 18
const DEFAULT_BRIGHTNESS = 72

const fileInputRef = ref(null)
const previewCanvasRef = ref(null)
const imageSource = ref('')
const imageFileName = ref('')
const sourceImage = ref(null)
const sourceImageSize = ref('')
const blurAmount = ref(DEFAULT_BLUR)
const brightness = ref(DEFAULT_BRIGHTNESS)
const previewHeight = ref(OUTPUT_3_4_HEIGHT)
const isRendering = ref(false)

function openFilePicker() {
  fileInputRef.value?.click()
}

function handleFileInput(event) {
  const [file] = event.target.files || []
  if (file) loadImageFile(file)
  event.target.value = ''
}

function loadImageFile(file) {
  if (!file.type.startsWith('image/')) {
    ElMessage.error('请选择 PNG、JPG 或 WEBP 图片')
    return
  }

  const objectUrl = URL.createObjectURL(file)
  const image = new Image()

  image.onload = () => {
    revokeImageSource()
    imageSource.value = objectUrl
    sourceImage.value = image
    imageFileName.value = file.name
    sourceImageSize.value = `${image.naturalWidth} × ${image.naturalHeight}`
    renderPreview()
  }

  image.onerror = () => {
    URL.revokeObjectURL(objectUrl)
    ElMessage.error('图片读取失败，请换一张图片重试')
  }

  image.src = objectUrl
}

function revokeImageSource() {
  if (imageSource.value) URL.revokeObjectURL(imageSource.value)
}

function drawImageToCanvas(canvas, outputHeight = OUTPUT_HEIGHT) {
  const image = sourceImage.value
  if (!image || !canvas) return false

  const context = canvas.getContext('2d')
  if (!context) return false

  const backgroundScale = outputHeight / image.naturalHeight
  const backgroundWidth = image.naturalWidth * backgroundScale
  const foregroundScale = OUTPUT_WIDTH / image.naturalWidth
  const foregroundHeight = image.naturalHeight * foregroundScale

  context.clearRect(0, 0, OUTPUT_WIDTH, outputHeight)
  context.fillStyle = '#000000'
  context.fillRect(0, 0, OUTPUT_WIDTH, outputHeight)

  context.save()
  context.filter = `blur(${blurAmount.value}px) brightness(${brightness.value}%)`
  context.drawImage(
    image,
    (OUTPUT_WIDTH - backgroundWidth) / 2,
    0,
    backgroundWidth,
    outputHeight
  )
  context.restore()

  context.drawImage(
    image,
    (OUTPUT_WIDTH - OUTPUT_WIDTH) / 2,
    (outputHeight - foregroundHeight) / 2,
    OUTPUT_WIDTH,
    foregroundHeight
  )

  return true
}

function renderPreview() {
  nextTick(() => {
    drawImageToCanvas(previewCanvasRef.value)
  })
}

function resetSettings() {
  blurAmount.value = DEFAULT_BLUR
  brightness.value = DEFAULT_BRIGHTNESS
  previewHeight.value = OUTPUT_3_4_HEIGHT
}

async function exportImage(outputHeight, fileSuffix) {
  if (!sourceImage.value || isRendering.value) return

  isRendering.value = true
  try {
    const canvas = document.createElement('canvas')
    canvas.width = OUTPUT_WIDTH
    canvas.height = outputHeight
    if (!drawImageToCanvas(canvas, outputHeight)) throw new Error('无法生成图片')

    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob((result) => {
        if (result) resolve(result)
        else reject(new Error('PNG 编码失败'))
      }, 'image/png')
    })

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.download = `${getBaseName(imageFileName.value)}_${fileSuffix}.png`
    link.href = url
    link.click()
    URL.revokeObjectURL(url)
    ElMessage.success(`${fileSuffix} 图片已导出`)
  } catch (error) {
    console.error('导出横封转竖封图片失败:', error)
    ElMessage.error(error.message || '导出失败，请稍后重试')
  } finally {
    isRendering.value = false
  }
}

function getBaseName(fileName) {
  return fileName.replace(/\.[^.]+$/, '') || 'image'
}

watch([blurAmount, brightness, previewHeight], renderPreview)

onBeforeUnmount(revokeImageSource)
</script>

<style scoped>
.landscape-to-portrait-page {
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

.tool-header,
.tool-workspace {
  width: min(1180px, 100%);
  margin: 0 auto;
}

.tool-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 24px;
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

.tool-header h1,
.panel-heading h2,
.section-heading h2 {
  margin: 0;
  color: var(--heading-color);
  letter-spacing: 0;
}

.tool-header h1 {
  font-size: 28px;
  line-height: 1.2;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.action-button,
.icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 38px;
  border: 1px solid transparent;
  border-radius: 6px;
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
  transition: background-color 0.18s ease, border-color 0.18s ease, color 0.18s ease;
}

.action-button {
  gap: 7px;
  padding: 0 13px;
}

.action-button.primary {
  border-color: #3867d6;
  background: #3867d6;
  color: #ffffff;
}

.action-button.primary:hover:not(:disabled) {
  background: #2f58bb;
}

.action-button.secondary {
  border-color: var(--border-color);
  background: #ffffff;
  color: var(--heading-color);
}

.action-button.secondary:hover:not(:disabled) {
  border-color: #b7c1d3;
  background: #f8faff;
}

.action-button:disabled {
  cursor: not-allowed;
  opacity: 0.48;
}

.icon-button {
  width: 38px;
  color: var(--heading-color);
  background: #ffffff;
  border-color: var(--border-color);
  text-decoration: none;
}

.icon-button:hover {
  border-color: #b7c1d3;
  background: #f8faff;
}

.tool-workspace {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 16px;
  align-items: start;
}

.preview-panel,
.control-panel {
  border: 1px solid var(--border-color);
  background: var(--panel-background);
}

.preview-panel {
  min-height: 720px;
  padding: 18px;
}

.control-panel {
  display: grid;
  gap: 0;
}

.panel-heading,
.section-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.panel-heading h2,
.section-heading h2 {
  font-size: 18px;
  line-height: 1.25;
}

.preview-heading-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.preview-mode-switch {
  display: inline-flex;
  padding: 2px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: #f6f8fb;
}

.preview-mode-switch button {
  min-width: 46px;
  min-height: 28px;
  padding: 0 9px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--muted-color);
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.preview-mode-switch button.active {
  background: #3867d6;
  color: #ffffff;
  box-shadow: 0 2px 6px rgb(56 103 214 / 22%);
}

.preview-size,
.file-type {
  color: var(--muted-color);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.preview-stage {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 620px;
  margin-top: 16px;
  padding: 24px;
  overflow: auto;
  background:
    linear-gradient(45deg, #eef1f5 25%, transparent 25%) 0 0 / 20px 20px,
    linear-gradient(-45deg, #eef1f5 25%, transparent 25%) 0 10px / 20px 20px,
    linear-gradient(45deg, transparent 75%, #eef1f5 75%) 10px -10px / 20px 20px,
    linear-gradient(-45deg, transparent 75%, #eef1f5 75%) -10px 0 / 20px 20px,
    #f8f9fb;
}

.preview-frame {
  position: relative;
  width: min(100%, calc((100vh - 260px) * 0.5625));
  min-width: 198px;
  max-width: 360px;
  overflow: hidden;
  background: #000000;
  box-shadow: 0 18px 38px rgb(29 39 58 / 18%);
}

.preview-frame.is-three-four {
  width: min(100%, calc((100vh - 260px) * 0.75));
  max-width: 420px;
  aspect-ratio: 3 / 4;
}

.preview-frame.is-nine-sixteen {
  aspect-ratio: 9 / 16;
}

.preview-canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.empty-preview {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px;
  color: #d8deea;
  text-align: center;
}

.empty-preview .mdi {
  margin-bottom: 6px;
  color: #91a2c2;
  font-size: 42px;
}

.empty-preview strong {
  color: #ffffff;
  font-size: 15px;
}

.empty-preview span:last-child {
  color: #aeb9cd;
  font-size: 12px;
}

.preview-meta {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-top: 12px;
  color: var(--muted-color);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.control-section {
  padding: 18px;
  border-bottom: 1px solid var(--border-color);
}

.control-section:last-child {
  border-bottom: 0;
}

.upload-section {
  background: #fbfcfe;
}

.upload-dropzone {
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 72px;
  margin-top: 16px;
  padding: 12px;
  gap: 12px;
  border: 1px dashed #b7c1d3;
  border-radius: 6px;
  background: #ffffff;
  color: var(--heading-color);
  text-align: left;
  cursor: pointer;
  transition: border-color 0.18s ease, background-color 0.18s ease;
}

.upload-dropzone:hover {
  border-color: #3867d6;
  background: #f8faff;
}

.upload-dropzone > .mdi:first-child {
  color: #3867d6;
  font-size: 24px;
}

.upload-copy {
  display: grid;
  min-width: 0;
  flex: 1;
  gap: 4px;
}

.upload-copy strong {
  font-size: 13px;
}

.upload-copy small {
  overflow: hidden;
  color: var(--muted-color);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.upload-dropzone > .mdi:last-child {
  color: var(--muted-color);
}

.range-control {
  display: grid;
  gap: 10px;
  margin-top: 20px;
}

.range-control:first-of-type {
  margin-top: 18px;
}

.range-label {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: var(--heading-color);
  font-size: 13px;
  font-weight: 700;
}

.range-label output {
  color: #3867d6;
  font-variant-numeric: tabular-nums;
}

.range-control input {
  width: 100%;
  accent-color: #3867d6;
  cursor: pointer;
}

.help-section {
  background: #fbfcfe;
}

.help-line {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  color: var(--muted-color);
  font-size: 12px;
  line-height: 1.6;
}

.help-line .mdi {
  flex: 0 0 auto;
  color: #3867d6;
  font-size: 17px;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (max-width: 900px) {
  .tool-workspace {
    grid-template-columns: 1fr;
  }

  .preview-panel {
    min-height: 0;
  }

  .preview-stage {
    min-height: 0;
  }

  .preview-frame {
    width: min(100%, 320px);
  }

  .preview-frame.is-three-four {
    width: min(100%, 320px);
  }
}

@media (max-width: 640px) {
  .landscape-to-portrait-page {
    padding: 18px 12px 32px;
  }

  .tool-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .header-actions {
    width: 100%;
  }

  .header-actions .action-button {
    flex: 1;
  }

  .header-actions .icon-button {
    flex: 0 0 38px;
  }

  .preview-panel {
    padding: 12px;
  }

  .panel-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .preview-heading-actions {
    width: 100%;
    justify-content: space-between;
  }

  .preview-stage {
    padding: 16px;
  }

  .preview-meta {
    flex-direction: column;
    gap: 4px;
  }
}
</style>
