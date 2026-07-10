<template>
  <div class="cover-maker-page">
    <header class="cover-maker-header">
      <div>
        <p class="cover-maker-kicker">LogicalByte Post Maker</p>
        <h1>封面制作器</h1>
      </div>

      <div class="header-actions">
        <span class="draft-status" :class="{ error: saveStatus === '保存失败' }">
          <span class="mdi mdi-database-check-outline" aria-hidden="true"></span>
          {{ saveStatus }}
        </span>
        <button class="action-button secondary" type="button" @click="saveDraft(true)">
          <span class="mdi mdi-content-save-outline" aria-hidden="true"></span>
          保存
        </button>
        <button class="action-button secondary" type="button" title="重置草稿" @click="resetDraft">
          <span class="mdi mdi-refresh" aria-hidden="true"></span>
          重置
        </button>
        <button class="action-button primary" type="button" :disabled="isExporting" @click="exportCover">
          <span class="mdi mdi-download" aria-hidden="true"></span>
          {{ isExporting ? '导出中' : '导出 PNG' }}
        </button>
        <RouterLink class="icon-button" to="/lb" title="返回控制台" aria-label="返回控制台">
          <span class="mdi mdi-arrow-left" aria-hidden="true"></span>
        </RouterLink>
      </div>
    </header>

    <div class="cover-maker-workspace">
      <main class="workspace-panel preview-panel">
        <div class="panel-header">
          <div>
            <span class="panel-kicker">Preview</span>
            <h2>封面预览</h2>
          </div>
          <div class="preview-header-actions">
            <div class="canvas-mode-switch" role="group" aria-label="封面方向">
              <button
                type="button"
                :disabled="isExporting"
                :class="{ active: canvasMode === 'landscape' }"
                :aria-pressed="canvasMode === 'landscape'"
                title="切换为横版封面"
                @click="switchCanvasMode('landscape')"
              >
                <span class="mdi mdi-monitor" aria-hidden="true"></span>
                横版
              </button>
              <button
                type="button"
                :disabled="isExporting"
                :class="{ active: canvasMode === 'portrait' }"
                :aria-pressed="canvasMode === 'portrait'"
                title="切换为 3:4 竖版封面"
                @click="switchCanvasMode('portrait')"
              >
                <span class="mdi mdi-cellphone" aria-hidden="true"></span>
                竖版
              </button>
            </div>
            <button
              class="preview-guide-button"
              :class="{ active: showReferenceGuides }"
              type="button"
              :aria-pressed="showReferenceGuides"
              title="切换参考线"
              @click="showReferenceGuides = !showReferenceGuides"
            >
              <span class="mdi mdi-crop-free" aria-hidden="true"></span>
              参考线
            </button>
            <span class="preview-size">{{ canvasWidth }} × {{ canvasHeight }}</span>
          </div>
        </div>

        <div ref="previewViewportRef" class="preview-stage">
          <div
            class="cover-frame"
            :style="{
              width: `${canvasWidth * previewScale}px`,
              height: `${canvasHeight * previewScale}px`
            }"
          >
            <div
              ref="coverCanvasRef"
              class="cover-canvas"
              :class="{
                'is-exporting': isExporting,
                'is-portrait': isPortrait
              }"
              :style="canvasStyle"
              data-cover-canvas="main"
              @pointerdown="clearSelection"
            >
              <div class="background-pattern" aria-hidden="true">
                <div class="pattern-columns"></div>
                <div class="pattern-position-layer">
                  <div class="pattern-grid"></div>
                  <div class="pattern-cards">
                    <span v-for="index in 9" :key="index"></span>
                  </div>
                  <div class="pattern-nodes">
                    <span v-for="index in 6" :key="index"></span>
                  </div>
                  <div class="pattern-hatch"></div>
                  <div class="pattern-caption">
                    GENERAL&nbsp;&nbsp;|&nbsp;&nbsp;LOGICALBYTE COVER SYSTEM
                  </div>
                </div>
              </div>

              <img
                v-for="artwork in visibleArtworks"
                :key="artwork.id"
                class="artwork-layer"
                :class="{ 'is-selected': selectedItemId === artwork.id }"
                :src="artwork.src"
                :alt="artwork.name"
                draggable="false"
                :style="getArtworkStyle(artwork)"
                @pointerdown.stop.prevent="startArtworkDrag($event, artwork)"
                @click.stop="selectedItemId = artwork.id"
              />

              <div class="artwork-blur-layer" aria-hidden="true"></div>

              <div
                class="cover-copy"
                :class="{ 'is-selected': selectedItemId === 'text' }"
                :style="textBlockStyle"
                @pointerdown.stop.prevent="startTextDrag"
                @click.stop="selectedItemId = 'text'"
              >
                <div v-if="textSettings.eyebrow" class="copy-eyebrow">
                  {{ textSettings.eyebrow }}
                </div>
                <div
                  v-if="textSettings.titleOneFirst || textSettings.titleOneSecond"
                  class="copy-line copy-line-primary"
                >
                  <span class="copy-title-one-first">{{ textSettings.titleOneFirst }}</span>
                  <span class="copy-title-one-second">{{ textSettings.titleOneSecond }}</span>
                </div>
                <div
                  v-if="textSettings.titleTwoFirst || textSettings.titleTwoSecond"
                  class="copy-line copy-line-secondary"
                >
                  <strong v-if="textSettings.showAmpersand">&amp;</strong>
                  <span class="copy-title-two-first">{{ textSettings.titleTwoFirst }}</span>
                  <span class="copy-title-two-second">{{ textSettings.titleTwoSecond }}</span>
                </div>
              </div>

              <img
                v-for="icon in visibleIcons"
                :key="icon.id"
                class="cover-icon-layer"
                :class="{ 'is-selected': selectedItemId === icon.id }"
                :src="icon.src"
                :alt="icon.name"
                draggable="false"
                :style="getIconStyle(icon)"
                @pointerdown.stop.prevent="startIconDrag($event, icon)"
                @click.stop="selectedItemId = icon.id"
              />

              <div
                v-if="showReferenceGuides"
                class="reference-guides"
                :style="referenceGuideStyle"
                data-html2canvas-ignore="true"
                aria-hidden="true"
              >
                <span class="reference-guide vertical crop-left"></span>
                <span class="reference-guide vertical crop-right"></span>
                <span class="reference-guide horizontal safe-top"></span>
                <span class="reference-guide horizontal safe-bottom"></span>
              </div>

              <div
                v-if="!hasArtwork"
                class="empty-canvas-hint"
                data-html2canvas-ignore="true"
              >
                <span class="mdi mdi-account-multiple-plus-outline" aria-hidden="true"></span>
                <strong>从右侧上传 2-3 张透明立绘</strong>
              </div>
            </div>
          </div>
        </div>

        <section class="thumbnail-preview-section" aria-label="小图预览">
          <div class="thumbnail-preview-grid" :class="{ portrait: isPortrait }">
            <figure class="thumbnail-preview-item">
              <figcaption>
                <strong>原图</strong>
                <span>{{ isPortrait ? '3:4' : '16:9' }}</span>
              </figcaption>
              <div class="thumbnail-image-frame original" :class="{ portrait: isPortrait }">
                <img
                  v-if="thumbnailPreviewUrl"
                  :src="thumbnailPreviewUrl"
                  alt="原图小图预览"
                />
                <span v-else class="thumbnail-placeholder mdi mdi-image-outline" aria-hidden="true"></span>
              </div>
            </figure>

            <figure v-if="!isPortrait" class="thumbnail-preview-item">
              <figcaption>
                <strong>裁剪预览</strong>
                <span>4:3</span>
              </figcaption>
              <div class="thumbnail-image-frame cropped">
                <img
                  v-if="thumbnailPreviewUrl"
                  :src="thumbnailPreviewUrl"
                  alt="居中裁剪为 4:3 的小图预览"
                />
                <span v-else class="thumbnail-placeholder mdi mdi-image-outline" aria-hidden="true"></span>
              </div>
            </figure>
          </div>
        </section>
      </main>

      <aside class="workspace-panel control-panel">
        <div class="panel-header">
          <div>
            <span class="panel-kicker">Controls</span>
            <h2>控制区域</h2>
          </div>
        </div>

        <el-tabs v-model="activeTab" class="control-tabs" stretch>
          <el-tab-pane label="背景" name="background">
            <div class="control-content">
              <section class="control-section">
                <h3>配色方案</h3>
                <div class="color-scheme-grid">
                  <button
                    v-for="scheme in backgroundPresets"
                    :key="scheme.id"
                    class="color-scheme-button"
                    :class="{ active: isColorSchemeActive(scheme) }"
                    type="button"
                    :title="`应用${scheme.name}配色`"
                    @click="applyColorScheme(scheme)"
                  >
                    <span
                      class="color-scheme-preview"
                      :style="{ backgroundColor: scheme.color }"
                      aria-hidden="true"
                    >
                      <span :style="{ backgroundColor: scheme.accentColor }"></span>
                    </span>
                    <span>{{ scheme.name }}</span>
                  </button>
                </div>
              </section>

              <section class="control-section">
                <h3>底层颜色</h3>
                <div class="control-row">
                  <label>背景色</label>
                  <el-color-picker v-model="backgroundSettings.color" show-alpha />
                </div>
                <div class="control-row">
                  <label>强调色</label>
                  <el-color-picker v-model="backgroundSettings.accentColor" show-alpha />
                </div>
              </section>

              <section class="control-section">
                <div class="section-title-row">
                  <h3>莫奈取色</h3>
                  <span v-if="monetSource.sourceColor" class="source-color-value">
                    <i :style="{ backgroundColor: monetSource.sourceColor }"></i>
                    {{ monetSource.sourceColor }}
                  </span>
                </div>

                <label class="upload-button" :class="{ disabled: isExtractingPalette }">
                  <span class="mdi mdi-palette-outline" aria-hidden="true"></span>
                  <span class="upload-text">
                    <strong>{{ isExtractingPalette ? '正在生成配色' : '上传取色图片' }}</strong>
                    <small>{{ monetSource.fileName || 'PNG / WebP / JPEG' }}</small>
                  </span>
                  <input
                    type="file"
                    accept="image/png,image/webp,image/jpeg"
                    :disabled="isExtractingPalette"
                    @change="handleMonetImageUpload"
                  />
                </label>

                <div v-if="availableArtworkSources.length" class="artwork-color-source-list">
                  <button
                    v-for="artwork in availableArtworkSources"
                    :key="artwork.id"
                    class="small-button artwork-color-source"
                    type="button"
                    :disabled="isExtractingPalette"
                    :title="`从${artwork.name}取色`"
                    @click="extractMonetColors(artwork.src, {
                      type: 'artwork',
                      artworkId: artwork.id,
                      fileName: artwork.fileName || artwork.name
                    })"
                  >
                    <span class="mdi mdi-eyedropper-variant" aria-hidden="true"></span>
                    {{ artwork.name }}
                  </button>
                </div>

                <div v-if="monetSourcePreview" class="monet-source-preview">
                  <img :src="monetSourcePreview" alt="莫奈取色来源" />
                  <span>{{ monetSource.fileName }}</span>
                  <button
                    class="icon-action-button"
                    type="button"
                    title="清除取色结果"
                    aria-label="清除取色结果"
                    @click="clearMonetColors"
                  >
                    <span class="mdi mdi-close" aria-hidden="true"></span>
                  </button>
                </div>

                <div v-if="monetSchemes.length" class="color-scheme-grid monet-scheme-grid">
                  <button
                    v-for="scheme in monetSchemes"
                    :key="scheme.id"
                    class="color-scheme-button"
                    :class="{ active: isColorSchemeActive(scheme) }"
                    type="button"
                    :title="`应用${scheme.name}配色`"
                    @click="applyColorScheme(scheme)"
                  >
                    <span
                      class="color-scheme-preview"
                      :style="{ backgroundColor: scheme.color }"
                      aria-hidden="true"
                    >
                      <span :style="{ backgroundColor: scheme.accentColor }"></span>
                    </span>
                    <span>{{ scheme.name }}</span>
                  </button>
                </div>
              </section>

              <section class="control-section">
                <h3>底层样式</h3>
                <div class="control-row">
                  <label>装饰纹理</label>
                  <el-switch v-model="backgroundSettings.showPattern" />
                </div>
                <div class="control-field">
                  <div class="field-label">
                    <label>纹理强度</label>
                    <div class="field-value-actions">
                      <span>{{ backgroundSettings.patternIntensity }}%</span>
                      <button
                        class="field-reset-button"
                        type="button"
                        title="重置纹理强度"
                        aria-label="重置纹理强度"
                        @click="resetValue(
                          backgroundSettings,
                          'patternIntensity',
                          backgroundDefaults.patternIntensity
                        )"
                      >
                        <span class="mdi mdi-restore" aria-hidden="true"></span>
                      </button>
                    </div>
                  </div>
                  <el-slider
                    v-model="backgroundSettings.patternIntensity"
                    :min="0"
                    :max="100"
                    :disabled="!backgroundSettings.showPattern"
                  />
                </div>
                <div class="control-field">
                  <div class="field-label">
                    <label>纹理水平位置</label>
                    <div class="field-value-actions">
                      <span>{{ Math.round(backgroundSettings.patternX) }} px</span>
                      <button
                        class="field-reset-button"
                        type="button"
                        title="重置纹理水平位置"
                        aria-label="重置纹理水平位置"
                        @click="resetValue(
                          backgroundSettings,
                          'patternX',
                          activeLayoutDefaults.background.patternX
                        )"
                      >
                        <span class="mdi mdi-restore" aria-hidden="true"></span>
                      </button>
                    </div>
                  </div>
                  <el-slider
                    v-model="backgroundSettings.patternX"
                    :min="patternXMin"
                    :max="patternXMax"
                    :disabled="!backgroundSettings.showPattern"
                  />
                </div>
                <div class="control-field">
                  <div class="field-label">
                    <label>纹理垂直位置</label>
                    <div class="field-value-actions">
                      <span>{{ Math.round(backgroundSettings.patternY) }} px</span>
                      <button
                        class="field-reset-button"
                        type="button"
                        title="重置纹理垂直位置"
                        aria-label="重置纹理垂直位置"
                        @click="resetValue(
                          backgroundSettings,
                          'patternY',
                          activeLayoutDefaults.background.patternY
                        )"
                      >
                        <span class="mdi mdi-restore" aria-hidden="true"></span>
                      </button>
                    </div>
                  </div>
                  <el-slider
                    v-model="backgroundSettings.patternY"
                    :min="patternYMin"
                    :max="patternYMax"
                    :disabled="!backgroundSettings.showPattern"
                  />
                </div>
                <div class="control-field">
                  <div class="field-label">
                    <label>暗角强度</label>
                    <div class="field-value-actions">
                      <span>{{ backgroundSettings.vignette }}%</span>
                      <button
                        class="field-reset-button"
                        type="button"
                        title="重置暗角强度"
                        aria-label="重置暗角强度"
                        @click="resetValue(backgroundSettings, 'vignette', backgroundDefaults.vignette)"
                      >
                        <span class="mdi mdi-restore" aria-hidden="true"></span>
                      </button>
                    </div>
                  </div>
                  <el-slider v-model="backgroundSettings.vignette" :min="0" :max="100" />
                </div>
              </section>

              <section class="control-section">
                <h3>导出文件</h3>
                <el-input
                  v-model="exportFileName"
                  maxlength="60"
                  placeholder="封面文件名"
                />
              </section>
            </div>
          </el-tab-pane>

          <el-tab-pane label="立绘" name="artwork">
            <div class="control-content artwork-controls">
              <section class="control-section">
                <h3>立绘层效果</h3>
                <div class="control-field">
                  <div class="field-label">
                    <label>边缘虚化强度</label>
                    <div class="field-value-actions">
                      <span>{{ artworkLayerSettings.blur }}%</span>
                      <button
                        class="field-reset-button"
                        type="button"
                        title="重置立绘层边缘虚化强度"
                        aria-label="重置立绘层边缘虚化强度"
                        @click="resetValue(
                          artworkLayerSettings,
                          'blur',
                          artworkLayerDefaults.blur
                        )"
                      >
                        <span class="mdi mdi-restore" aria-hidden="true"></span>
                      </button>
                    </div>
                  </div>
                  <el-slider v-model="artworkLayerSettings.blur" :min="0" :max="100" />
                </div>
              </section>

              <section
                v-for="(artwork, index) in artworks"
                :key="artwork.id"
                class="control-section artwork-section"
                :class="{ active: selectedItemId === artwork.id }"
                @click="selectedItemId = artwork.id"
              >
                <div class="section-title-row">
                  <h3>立绘 {{ index + 1 }}</h3>
                  <el-switch v-model="artwork.visible" :disabled="!artwork.src" />
                </div>

                <label class="upload-button">
                  <span class="mdi mdi-image-plus-outline" aria-hidden="true"></span>
                  <span class="upload-text">
                    <strong>{{ artwork.src ? '更换立绘' : '上传立绘' }}</strong>
                    <small>{{ artwork.fileName || '推荐透明 PNG / WebP' }}</small>
                  </span>
                  <input
                    type="file"
                    accept="image/png,image/webp,image/jpeg"
                    @change="handleArtworkUpload($event, artwork)"
                  />
                </label>

                <template v-if="artwork.src">
                  <div class="control-field">
                    <div class="field-label">
                      <label>水平位置</label>
                      <div class="field-value-actions">
                        <span>{{ Math.round(artwork.x) }}</span>
                        <button
                          class="field-reset-button"
                          type="button"
                          title="重置水平位置"
                          aria-label="重置水平位置"
                          @click.stop="resetValue(
                            artwork,
                            'x',
                            activeLayoutDefaults.artworks[index].x
                          )"
                        >
                          <span class="mdi mdi-restore" aria-hidden="true"></span>
                        </button>
                      </div>
                    </div>
                    <el-slider
                      v-model="artwork.x"
                      :min="artworkXMin"
                      :max="artworkXMax"
                    />
                  </div>
                  <div class="control-field">
                    <div class="field-label">
                      <label>垂直位置</label>
                      <div class="field-value-actions">
                        <span>{{ Math.round(artwork.y) }}</span>
                        <button
                          class="field-reset-button"
                          type="button"
                          title="重置垂直位置"
                          aria-label="重置垂直位置"
                          @click.stop="resetValue(
                            artwork,
                            'y',
                            activeLayoutDefaults.artworks[index].y
                          )"
                        >
                          <span class="mdi mdi-restore" aria-hidden="true"></span>
                        </button>
                      </div>
                    </div>
                    <el-slider
                      v-model="artwork.y"
                      :min="artworkYMin"
                      :max="artworkYMax"
                    />
                  </div>
                  <div class="control-field">
                    <div class="field-label">
                      <label>缩放</label>
                      <div class="field-value-actions">
                        <span>{{ artwork.scale }}%</span>
                        <button
                          class="field-reset-button"
                          type="button"
                          title="重置缩放"
                          aria-label="重置缩放"
                          @click.stop="resetValue(
                            artwork,
                            'scale',
                            activeLayoutDefaults.artworks[index].scale
                          )"
                        >
                          <span class="mdi mdi-restore" aria-hidden="true"></span>
                        </button>
                      </div>
                    </div>
                    <el-slider v-model="artwork.scale" :min="20" :max="180" />
                  </div>
                  <div class="artwork-actions">
                    <button class="small-button" type="button" @click.stop="resetArtwork(artwork, index)">
                      <span class="mdi mdi-crosshairs-gps" aria-hidden="true"></span>
                      复位
                    </button>
                    <button class="small-button danger" type="button" @click.stop="removeArtwork(artwork)">
                      <span class="mdi mdi-delete-outline" aria-hidden="true"></span>
                      移除
                    </button>
                  </div>
                </template>
              </section>
            </div>
          </el-tab-pane>

          <el-tab-pane label="文本" name="text">
            <div class="control-content">
              <section class="control-section" @click="selectedItemId = 'text'">
                <h3>文本内容</h3>
                <div class="control-field">
                  <label>小标题</label>
                  <el-input v-model="textSettings.eyebrow" maxlength="24" />
                </div>
                <div class="control-field">
                  <label>主标题前段</label>
                  <el-input v-model="textSettings.titleOneFirst" maxlength="12" />
                </div>
                <div class="control-field">
                  <label>主标题后段</label>
                  <el-input v-model="textSettings.titleOneSecond" maxlength="12" />
                </div>
                <div class="control-field">
                  <label>第二行前段</label>
                  <el-input v-model="textSettings.titleTwoFirst" maxlength="12" />
                </div>
                <div class="control-field">
                  <label>第二行后段</label>
                  <el-input v-model="textSettings.titleTwoSecond" maxlength="12" />
                </div>
                <div class="control-row">
                  <label>显示 &amp;</label>
                  <el-switch v-model="textSettings.showAmpersand" />
                </div>
              </section>

              <section
                v-for="group in textFontGroups"
                :key="group.id"
                class="control-section"
                @click="selectedItemId = 'text'"
              >
                <h3>{{ group.label }}字体</h3>
                <div class="control-field">
                  <div class="field-label">
                    <label>字体</label>
                    <button
                      class="field-reset-button"
                      type="button"
                      :title="`重置${group.label}字体`"
                      :aria-label="`重置${group.label}字体`"
                      @click.stop="resetValue(
                        textSettings,
                        group.fontFamilyKey,
                        textDefaults[group.fontFamilyKey]
                      )"
                    >
                      <span class="mdi mdi-restore" aria-hidden="true"></span>
                    </button>
                  </div>
                  <el-select v-model="textSettings[group.fontFamilyKey]">
                    <el-option
                      v-for="font in fontFamilyOptions"
                      :key="font.value"
                      :label="font.label"
                      :value="font.value"
                    />
                  </el-select>
                </div>
                <div class="control-field">
                  <div class="field-label">
                    <label>字重</label>
                    <button
                      class="field-reset-button"
                      type="button"
                      :title="`重置${group.label}字重`"
                      :aria-label="`重置${group.label}字重`"
                      @click.stop="resetValue(
                        textSettings,
                        group.fontWeightKey,
                        textDefaults[group.fontWeightKey]
                      )"
                    >
                      <span class="mdi mdi-restore" aria-hidden="true"></span>
                    </button>
                  </div>
                  <el-select v-model="textSettings[group.fontWeightKey]">
                    <el-option
                      v-for="weight in fontWeightOptions"
                      :key="weight.value"
                      :label="weight.label"
                      :value="weight.value"
                    />
                  </el-select>
                </div>
                <div class="control-field">
                  <div class="field-label">
                    <label>字号</label>
                    <div class="field-value-actions">
                      <span>{{ textSettings[group.fontSizeKey] }} px</span>
                      <button
                        class="field-reset-button"
                        type="button"
                        :title="`重置${group.label}字号`"
                        :aria-label="`重置${group.label}字号`"
                        @click.stop="resetValue(
                          textSettings,
                          group.fontSizeKey,
                          getTextDefaultValue(group.fontSizeKey)
                        )"
                      >
                        <span class="mdi mdi-restore" aria-hidden="true"></span>
                      </button>
                    </div>
                  </div>
                  <el-slider
                    v-model="textSettings[group.fontSizeKey]"
                    :min="group.minSize"
                    :max="group.maxSize"
                  />
                </div>
                <div class="control-field">
                  <div class="field-label">
                    <label>字间距</label>
                    <div class="field-value-actions">
                      <span>{{ textSettings[group.letterSpacingKey] }}%</span>
                      <button
                        class="field-reset-button"
                        type="button"
                        :title="`重置${group.label}字间距`"
                        :aria-label="`重置${group.label}字间距`"
                        @click.stop="resetValue(
                          textSettings,
                          group.letterSpacingKey,
                          textDefaults[group.letterSpacingKey]
                        )"
                      >
                        <span class="mdi mdi-restore" aria-hidden="true"></span>
                      </button>
                    </div>
                  </div>
                  <el-slider
                    v-model="textSettings[group.letterSpacingKey]"
                    :min="-20"
                    :max="20"
                  />
                </div>
              </section>

              <section class="control-section" @click="selectedItemId = 'text'">
                <h3>文本位置</h3>
                <div class="control-field">
                  <div class="field-label">
                    <label>水平位置</label>
                    <div class="field-value-actions">
                      <span>{{ Math.round(textSettings.x) }}</span>
                      <button
                        class="field-reset-button"
                        type="button"
                        title="重置水平位置"
                        aria-label="重置水平位置"
                        @click.stop="resetValue(
                          textSettings,
                          'x',
                          activeLayoutDefaults.text.x
                        )"
                      >
                        <span class="mdi mdi-restore" aria-hidden="true"></span>
                      </button>
                    </div>
                  </div>
                  <el-slider v-model="textSettings.x" :min="0" :max="textXMax" />
                </div>
                <div class="control-field">
                  <div class="field-label">
                    <label>垂直位置</label>
                    <div class="field-value-actions">
                      <span>{{ Math.round(textSettings.y) }}</span>
                      <button
                        class="field-reset-button"
                        type="button"
                        title="重置垂直位置"
                        aria-label="重置垂直位置"
                        @click.stop="resetValue(
                          textSettings,
                          'y',
                          activeLayoutDefaults.text.y
                        )"
                      >
                        <span class="mdi mdi-restore" aria-hidden="true"></span>
                      </button>
                    </div>
                  </div>
                  <el-slider v-model="textSettings.y" :min="0" :max="textYMax" />
                </div>
                <div v-if="isPortrait" class="control-field">
                  <div class="field-label">
                    <label>整体缩放</label>
                    <div class="field-value-actions">
                      <span>{{ Math.round(textSettings.scale) }}%</span>
                      <button
                        class="field-reset-button"
                        type="button"
                        title="重置整体缩放"
                        aria-label="重置整体缩放"
                        @click.stop="resetValue(
                          textSettings,
                          'scale',
                          activeLayoutDefaults.text.scale
                        )"
                      >
                        <span class="mdi mdi-restore" aria-hidden="true"></span>
                      </button>
                    </div>
                  </div>
                  <el-slider v-model="textSettings.scale" :min="60" :max="160" />
                </div>
              </section>

              <section class="control-section">
                <h3>文本颜色</h3>
                <div class="control-row">
                  <label>主标题前段</label>
                  <el-color-picker v-model="textSettings.titleOneFirstColor" />
                </div>
                <div class="control-row">
                  <label>主标题后段</label>
                  <el-color-picker v-model="textSettings.titleOneSecondColor" />
                </div>
                <div class="control-row">
                  <label>第二行前段</label>
                  <el-color-picker v-model="textSettings.titleTwoFirstColor" />
                </div>
                <div class="control-row">
                  <label>第二行后段</label>
                  <el-color-picker v-model="textSettings.titleTwoSecondColor" />
                </div>
                <div class="control-row">
                  <label>强调符号</label>
                  <el-color-picker v-model="textSettings.ampersandColor" />
                </div>
              </section>

              <section class="control-section">
                <div class="section-title-row">
                  <h3>Icon 区域</h3>
                  <span class="section-note">固定 2 个槽位</span>
                </div>

                <div
                  v-for="(icon, index) in icons"
                  :key="icon.id"
                  class="icon-control-item"
                  :class="{ active: selectedItemId === icon.id }"
                  @click="selectedItemId = icon.id"
                >
                  <div class="section-title-row">
                    <strong>Icon {{ index + 1 }}</strong>
                    <el-switch v-model="icon.visible" :disabled="!icon.src" />
                  </div>

                  <label class="upload-button">
                    <span class="mdi mdi-image-plus-outline" aria-hidden="true"></span>
                    <span class="upload-text">
                      <strong>{{ icon.src ? '更换 Icon' : '上传 Icon' }}</strong>
                      <small>{{ icon.fileName || '推荐透明 PNG / WebP' }}</small>
                    </span>
                    <input
                      type="file"
                      accept="image/png,image/webp,image/jpeg"
                      @change="handleIconUpload($event, icon)"
                    />
                  </label>

                  <template v-if="icon.src">
                    <div class="control-field">
                      <div class="field-label">
                        <label>水平位置</label>
                        <div class="field-value-actions">
                          <span>{{ Math.round(icon.x) }}</span>
                          <button
                            class="field-reset-button"
                            type="button"
                            title="重置水平位置"
                            aria-label="重置水平位置"
                            @click.stop="resetValue(
                              icon,
                              'x',
                              activeLayoutDefaults.icons[index].x
                            )"
                          >
                            <span class="mdi mdi-restore" aria-hidden="true"></span>
                          </button>
                        </div>
                      </div>
                      <el-slider v-model="icon.x" :min="0" :max="canvasWidth" />
                    </div>
                    <div class="control-field">
                      <div class="field-label">
                        <label>垂直位置</label>
                        <div class="field-value-actions">
                          <span>{{ Math.round(icon.y) }}</span>
                          <button
                            class="field-reset-button"
                            type="button"
                            title="重置垂直位置"
                            aria-label="重置垂直位置"
                            @click.stop="resetValue(
                              icon,
                              'y',
                              activeLayoutDefaults.icons[index].y
                            )"
                          >
                            <span class="mdi mdi-restore" aria-hidden="true"></span>
                          </button>
                        </div>
                      </div>
                      <el-slider v-model="icon.y" :min="0" :max="canvasHeight" />
                    </div>
                    <div class="control-field">
                      <div class="field-label">
                        <label>尺寸</label>
                        <div class="field-value-actions">
                          <span>{{ icon.size }} px</span>
                          <button
                            class="field-reset-button"
                            type="button"
                            title="重置尺寸"
                            aria-label="重置尺寸"
                            @click.stop="resetValue(
                              icon,
                              'size',
                              activeLayoutDefaults.icons[index].size
                            )"
                          >
                            <span class="mdi mdi-restore" aria-hidden="true"></span>
                          </button>
                        </div>
                      </div>
                      <el-slider v-model="icon.size" :min="40" :max="300" />
                    </div>
                    <div class="artwork-actions">
                      <button class="small-button" type="button" @click.stop="resetIcon(icon, index)">
                        <span class="mdi mdi-crosshairs-gps" aria-hidden="true"></span>
                        复位
                      </button>
                      <button class="small-button danger" type="button" @click.stop="removeIcon(icon)">
                        <span class="mdi mdi-delete-outline" aria-hidden="true"></span>
                        移除
                      </button>
                    </div>
                  </template>
                </div>
              </section>
            </div>
          </el-tab-pane>
        </el-tabs>
      </aside>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import Dexie from 'dexie'

const canvasPresets = {
  landscape: {
    width: 1920,
    height: 1080
  },
  portrait: {
    width: 1440,
    height: 1920
  }
}
const ARTWORK_BLUR_MAX_RADIUS = 40

const artworkDefaults = [
  { x: 1230, y: 510, scale: 116 },
  { x: 1540, y: 550, scale: 104 },
  { x: 920, y: 570, scale: 88 }
]

const artworkLayerDefaults = {
  blur: 0
}

const iconDefaults = [
  { x: 1690, y: 950, size: 130 },
  { x: 1840, y: 950, size: 130 }
]

const portraitArtworkDefaults = [
  { x: 360, y: 980, scale: 82 },
  { x: 760, y: 900, scale: 108 },
  { x: 1110, y: 1000, scale: 78 }
]

const portraitIconDefaults = [
  { x: 1110, y: 1780, size: 130 },
  { x: 1270, y: 1780, size: 130 }
]

const backgroundDefaults = {
  color: '#101318',
  accentColor: '#9cff20',
  showPattern: true,
  patternIntensity: 42,
  patternX: 0,
  patternY: 0,
  vignette: 76
}

const backgroundPresets = [
  { id: 'graphite-lime', name: '石墨青柠', color: '#101318', accentColor: '#9cff20' },
  { id: 'navy-coral', name: '深海珊瑚', color: '#111c2b', accentColor: '#ff6f61' },
  { id: 'forest-gold', name: '松林鎏金', color: '#12201b', accentColor: '#f1c75b' },
  { id: 'plum-cyan', name: '梅紫冰蓝', color: '#251725', accentColor: '#69d7e5' },
  { id: 'charcoal-orange', name: '炭黑暖橙', color: '#1b1a18', accentColor: '#ff9f43' },
  { id: 'cloud-blue', name: '云灰湖蓝', color: '#252b31', accentColor: '#75c5e7' },
  { id: 'wine-rose', name: '酒红浅粉', color: '#26151a', accentColor: '#ff91ad' },
  { id: 'indigo-yellow', name: '靛青明黄', color: '#171a2b', accentColor: '#f4df4e' }
]

const fontFamilyOptions = [
  { label: '阿里巴巴普惠体', value: 'Alibaba PuHuiTi' },
  { label: '阿里巴巴 Sans Black', value: 'Alibaba Sans Black' },
  { label: '微软雅黑', value: 'Microsoft YaHei' },
  { label: '苹方', value: 'PingFang SC' },
  { label: '黑体', value: 'SimHei' }
]

const fontWeightOptions = [
  { label: 'Light 300', value: 300 },
  { label: 'Regular 400', value: 400 },
  { label: 'Medium 500', value: 500 },
  { label: 'Bold 700', value: 700 },
  { label: 'Black 900', value: 900 }
]

const textDefaults = {
  eyebrow: '「主题名称」',
  titleOneFirst: '干员',
  titleOneSecond: '基建解析',
  titleTwoFirst: '一图流',
  titleTwoSecond: '排班表',
  showAmpersand: true,
  eyebrowFontFamily: 'Alibaba PuHuiTi',
  titleOneFontFamily: 'Alibaba PuHuiTi',
  titleTwoFontFamily: 'Alibaba PuHuiTi',
  eyebrowFontWeight: 500,
  titleOneFontWeight: 700,
  titleTwoFontWeight: 700,
  eyebrowSize: 62,
  titleOneSize: 154,
  titleTwoSize: 154,
  eyebrowLetterSpacing: -4,
  titleOneLetterSpacing: -4,
  titleTwoLetterSpacing: -4,
  x: 170,
  y: 535,
  scale: 100,
  titleOneFirstColor: '#f6f7f8',
  titleOneSecondColor: '#d9ff24',
  titleTwoFirstColor: '#ffd75e',
  titleTwoSecondColor: '#f6f7f8',
  ampersandColor: '#ff4e55'
}

const layoutDefaults = {
  landscape: {
    background: {
      patternX: backgroundDefaults.patternX,
      patternY: backgroundDefaults.patternY
    },
    artworks: artworkDefaults,
    text: {
      x: textDefaults.x,
      y: textDefaults.y,
      scale: textDefaults.scale,
      eyebrowSize: textDefaults.eyebrowSize,
      titleOneSize: textDefaults.titleOneSize,
      titleTwoSize: textDefaults.titleTwoSize
    },
    icons: iconDefaults
  },
  portrait: {
    background: {
      patternX: -380,
      patternY: 120
    },
    artworks: portraitArtworkDefaults,
    text: {
      x: 90,
      y: 1400,
      scale: 110,
      eyebrowSize: 54,
      titleOneSize: 118,
      titleTwoSize: 118
    },
    icons: portraitIconDefaults
  }
}

const textFontGroups = [
  {
    id: 'eyebrow',
    label: '小标题',
    fontFamilyKey: 'eyebrowFontFamily',
    fontWeightKey: 'eyebrowFontWeight',
    fontSizeKey: 'eyebrowSize',
    letterSpacingKey: 'eyebrowLetterSpacing',
    minSize: 28,
    maxSize: 100
  },
  {
    id: 'title-one',
    label: '主标题',
    fontFamilyKey: 'titleOneFontFamily',
    fontWeightKey: 'titleOneFontWeight',
    fontSizeKey: 'titleOneSize',
    letterSpacingKey: 'titleOneLetterSpacing',
    minSize: 80,
    maxSize: 220
  },
  {
    id: 'title-two',
    label: '第二行',
    fontFamilyKey: 'titleTwoFontFamily',
    fontWeightKey: 'titleTwoFontWeight',
    fontSizeKey: 'titleTwoSize',
    letterSpacingKey: 'titleTwoLetterSpacing',
    minSize: 80,
    maxSize: 220
  }
]

const DRAFT_ID = 'current-cover'
const coverDraftDb = new Dexie('LogicalByteCoverMaker')
coverDraftDb.version(1).stores({
  drafts: 'id, updatedAt'
})

function cloneLayoutProfile(profile) {
  return {
    background: { ...profile.background },
    artworks: profile.artworks.map((artwork) => ({ ...artwork })),
    text: { ...profile.text },
    icons: profile.icons.map((icon) => ({ ...icon }))
  }
}

const previewViewportRef = ref(null)
const coverCanvasRef = ref(null)
const previewScale = ref(0.5)
const canvasMode = ref('landscape')
const showReferenceGuides = ref(false)
const thumbnailPreviewUrl = ref('')
const isThumbnailRendering = ref(false)
const activeTab = ref('artwork')
const selectedItemId = ref('')
const isExporting = ref(false)
const exportFileName = ref('logical-byte-cover')
const saveStatus = ref('正在读取')
const isDraftReady = ref(false)
const isExtractingPalette = ref(false)

const backgroundSettings = reactive({ ...backgroundDefaults })

const monetSource = reactive({
  type: '',
  artworkId: '',
  fileName: '',
  src: '',
  sourceColor: ''
})

const monetSchemes = reactive([])

const artworks = reactive(
  artworkDefaults.map((defaults, index) => ({
    id: `artwork-${index + 1}`,
    name: `立绘 ${index + 1}`,
    fileName: '',
    src: '',
    visible: true,
    ...defaults
  }))
)

const artworkLayerSettings = reactive({ ...artworkLayerDefaults })

const icons = reactive(
  iconDefaults.map((defaults, index) => ({
    id: `icon-${index + 1}`,
    name: `Icon ${index + 1}`,
    fileName: '',
    src: '',
    visible: true,
    ...defaults
  }))
)

const textSettings = reactive({ ...textDefaults })

const layoutProfiles = reactive({
  landscape: cloneLayoutProfile(layoutDefaults.landscape),
  portrait: cloneLayoutProfile(layoutDefaults.portrait)
})

const activeCanvasPreset = computed(() => canvasPresets[canvasMode.value])
const activeLayoutDefaults = computed(() => layoutDefaults[canvasMode.value])
const canvasWidth = computed(() => activeCanvasPreset.value.width)
const canvasHeight = computed(() => activeCanvasPreset.value.height)
const isPortrait = computed(() => canvasMode.value === 'portrait')
const patternXMin = computed(() => -Math.round(canvasWidth.value * 0.5))
const patternXMax = computed(() => Math.round(canvasWidth.value * 0.5))
const patternYMin = computed(() => -Math.round(canvasHeight.value * 0.5))
const patternYMax = computed(() => Math.round(canvasHeight.value * 0.5))
const artworkXMin = computed(() => -Math.round(canvasWidth.value * 0.25))
const artworkXMax = computed(() => Math.round(canvasWidth.value * 1.2))
const artworkYMin = computed(() => -Math.round(canvasHeight.value * 0.2))
const artworkYMax = computed(() => Math.round(canvasHeight.value * 1.2))
const textXMax = computed(() => Math.max(0, canvasWidth.value - 120))
const textYMax = computed(() => Math.max(0, canvasHeight.value - 120))
const visibleArtworks = computed(() => artworks.filter((artwork) => artwork.src && artwork.visible))
const visibleIcons = computed(() => icons.filter((icon) => icon.src && icon.visible))
const hasArtwork = computed(() => visibleArtworks.value.length > 0)
const availableArtworkSources = computed(() => artworks.filter((artwork) => artwork.src))
const monetSourcePreview = computed(() => {
  if (monetSource.type === 'artwork') {
    return artworks.find((artwork) => artwork.id === monetSource.artworkId)?.src || ''
  }

  return monetSource.src
})

const canvasStyle = computed(() => ({
  '--background-color': backgroundSettings.color,
  '--accent-color': backgroundSettings.accentColor,
  '--vignette-opacity': backgroundSettings.vignette / 100,
  '--artwork-blur-radius': `${
    artworkLayerSettings.blur * ARTWORK_BLUR_MAX_RADIUS / 100
  }px`,
  '--pattern-opacity': backgroundSettings.showPattern
    ? backgroundSettings.patternIntensity / 100
    : 0,
  '--pattern-offset-x': `${backgroundSettings.patternX}px`,
  '--pattern-offset-y': `${backgroundSettings.patternY}px`,
  width: `${canvasWidth.value}px`,
  height: `${canvasHeight.value}px`,
  transform: `scale(${previewScale.value})`
}))

const referenceGuideStyle = computed(() => {
  if (isPortrait.value) {
    return {
      '--crop-guide-left': `${canvasWidth.value * 0.15}px`,
      '--crop-guide-right': `${canvasWidth.value * 0.85}px`,
      '--safe-guide-top': `${canvasHeight.value * 0.15}px`,
      '--safe-guide-bottom': `${canvasHeight.value * 0.85}px`
    }
  }

  const cropWidth = canvasHeight.value * 4 / 3
  const cropInset = (canvasWidth.value - cropWidth) / 2

  return {
    '--crop-guide-left': `${cropInset}px`,
    '--crop-guide-right': `${canvasWidth.value - cropInset}px`,
    '--safe-guide-top': `${canvasHeight.value * 0.15}px`,
    '--safe-guide-bottom': `${canvasHeight.value * 0.85}px`
  }
})

const textBlockStyle = computed(() => ({
  left: `${textSettings.x}px`,
  top: `${textSettings.y}px`,
  transform: `scale(${textSettings.scale / 100})`,
  '--eyebrow-font-family': textSettings.eyebrowFontFamily,
  '--title-one-font-family': textSettings.titleOneFontFamily,
  '--title-two-font-family': textSettings.titleTwoFontFamily,
  '--eyebrow-font-weight': textSettings.eyebrowFontWeight,
  '--title-one-font-weight': textSettings.titleOneFontWeight,
  '--title-two-font-weight': textSettings.titleTwoFontWeight,
  '--eyebrow-size': `${textSettings.eyebrowSize}px`,
  '--title-one-size': `${textSettings.titleOneSize}px`,
  '--title-two-size': `${textSettings.titleTwoSize}px`,
  '--eyebrow-letter-spacing': `${textSettings.eyebrowSize * textSettings.eyebrowLetterSpacing / 100}px`,
  '--title-one-letter-spacing': `${textSettings.titleOneSize * textSettings.titleOneLetterSpacing / 100}px`,
  '--title-two-letter-spacing': `${textSettings.titleTwoSize * textSettings.titleTwoLetterSpacing / 100}px`,
  '--title-one-first-color': textSettings.titleOneFirstColor,
  '--title-one-second-color': textSettings.titleOneSecondColor,
  '--title-two-first-color': textSettings.titleTwoFirstColor,
  '--title-two-second-color': textSettings.titleTwoSecondColor,
  '--ampersand-color': textSettings.ampersandColor
}))

function getArtworkStyle(artwork) {
  return {
    left: `${artwork.x}px`,
    top: `${artwork.y}px`,
    height: `${canvasHeight.value * artwork.scale / 100}px`,
    zIndex: artworks.indexOf(artwork) + 2
  }
}

function getIconStyle(icon) {
  return {
    left: `${icon.x}px`,
    top: `${icon.y}px`,
    width: `${icon.size}px`,
    height: `${icon.size}px`
  }
}

function updatePreviewScale() {
  const viewport = previewViewportRef.value
  if (!viewport) return

  const availableWidth = Math.max(280, viewport.clientWidth - 48)
  const availableHeight = Math.max(360, window.innerHeight - 260)
  previewScale.value = Math.min(
    1,
    availableWidth / canvasWidth.value,
    availableHeight / canvasHeight.value
  )
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('图片读取失败'))
    reader.readAsDataURL(file)
  })
}

function loadImage(src, errorMessage = '取色图片加载失败') {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error(errorMessage))
    image.src = src
  })
}

function applyColorScheme(scheme) {
  backgroundSettings.color = scheme.color
  backgroundSettings.accentColor = scheme.accentColor
}

function isColorSchemeActive(scheme) {
  return (
    backgroundSettings.color.toLowerCase() === scheme.color.toLowerCase() &&
    backgroundSettings.accentColor.toLowerCase() === scheme.accentColor.toLowerCase()
  )
}

async function handleMonetImageUpload(event) {
  const input = event.target
  const file = input.files?.[0]
  input.value = ''

  if (!file) return
  if (!file.type.startsWith('image/')) {
    ElMessage.warning('请选择图片文件')
    return
  }

  try {
    const src = await readFileAsDataUrl(file)
    await extractMonetColors(src, {
      type: 'upload',
      artworkId: '',
      fileName: file.name,
      src
    })
  } catch (error) {
    ElMessage.error(error.message || '取色图片读取失败')
  }
}

async function extractMonetColors(src, source) {
  if (!src || isExtractingPalette.value) return

  isExtractingPalette.value = true

  try {
    const image = await loadImage(src)
    const sampleSize = 128
    const scale = Math.min(1, sampleSize / Math.max(image.naturalWidth, image.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))

    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) {
      throw new Error('浏览器无法读取图片颜色')
    }

    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
    let opaquePixelCount = 0

    for (let index = 3; index < imageData.data.length; index += 4) {
      if (imageData.data[index] >= 48) {
        imageData.data[index] = 255
        opaquePixelCount += 1
      } else {
        imageData.data[index] = 0
      }
    }

    if (!opaquePixelCount) {
      throw new Error('图片中没有可用于取色的内容')
    }

    const {
      Hct,
      SchemeExpressive,
      SchemeNeutral,
      SchemeTonalSpot,
      SchemeVibrant,
      hexFromArgb,
      sourceColorFromImageBytes
    } = await import('@material/material-color-utilities')

    const sourceArgb = sourceColorFromImageBytes(imageData.data)
    const sourceHct = Hct.fromInt(sourceArgb)
    const variants = [
      { id: 'tonal', name: '柔和', Scheme: SchemeTonalSpot },
      { id: 'neutral', name: '中性', Scheme: SchemeNeutral },
      { id: 'vibrant', name: '鲜明', Scheme: SchemeVibrant },
      { id: 'expressive', name: '表现', Scheme: SchemeExpressive }
    ]

    const nextSchemes = variants.map(({ id, name, Scheme }) => {
      const scheme = new Scheme(sourceHct, true, 0)
      return {
        id: `monet-${id}`,
        name,
        color: hexFromArgb(scheme.neutralPalette.tone(8)),
        accentColor: hexFromArgb(scheme.primaryPalette.tone(80))
      }
    })

    Object.assign(monetSource, {
      type: source.type,
      artworkId: source.artworkId || '',
      fileName: source.fileName || '取色图片',
      src: source.type === 'upload' ? source.src : '',
      sourceColor: hexFromArgb(sourceArgb)
    })
    monetSchemes.splice(0, monetSchemes.length, ...nextSchemes)
    applyColorScheme(nextSchemes[0])
    ElMessage.success('已生成 4 组莫奈配色')
  } catch (error) {
    console.error('生成莫奈配色失败:', error)
    ElMessage.error(error.message || '莫奈取色失败')
  } finally {
    isExtractingPalette.value = false
  }
}

function clearMonetColors() {
  Object.assign(monetSource, {
    type: '',
    artworkId: '',
    fileName: '',
    src: '',
    sourceColor: ''
  })
  monetSchemes.splice(0)
}

async function handleArtworkUpload(event, artwork) {
  const input = event.target
  const file = input.files?.[0]
  input.value = ''

  if (!file) return
  if (!file.type.startsWith('image/')) {
    ElMessage.warning('请选择图片文件')
    return
  }

  try {
    artwork.src = await readFileAsDataUrl(file)
    artwork.fileName = file.name
    artwork.visible = true
    selectedItemId.value = artwork.id
  } catch (error) {
    ElMessage.error(error.message || '立绘读取失败')
  }
}

async function handleIconUpload(event, icon) {
  const input = event.target
  const file = input.files?.[0]
  input.value = ''

  if (!file) return
  if (!file.type.startsWith('image/')) {
    ElMessage.warning('请选择图片文件')
    return
  }

  try {
    icon.src = await readFileAsDataUrl(file)
    icon.fileName = file.name
    icon.visible = true
    selectedItemId.value = icon.id
  } catch (error) {
    ElMessage.error(error.message || 'Icon 读取失败')
  }
}

function removeArtwork(artwork) {
  artwork.src = ''
  artwork.fileName = ''
  artwork.visible = true
  if (selectedItemId.value === artwork.id) {
    selectedItemId.value = ''
  }
}

function removeIcon(icon) {
  icon.src = ''
  icon.fileName = ''
  icon.visible = true
  if (selectedItemId.value === icon.id) {
    selectedItemId.value = ''
  }
}

function getTextDefaultValue(key) {
  if (Object.prototype.hasOwnProperty.call(activeLayoutDefaults.value.text, key)) {
    return activeLayoutDefaults.value.text[key]
  }

  return textDefaults[key]
}

function captureLayoutProfile(mode = canvasMode.value) {
  const profile = layoutProfiles[mode]
  if (!profile) return

  Object.assign(profile.background, {
    patternX: backgroundSettings.patternX,
    patternY: backgroundSettings.patternY
  })

  artworks.forEach((artwork, index) => {
    if (!profile.artworks[index]) return
    Object.assign(profile.artworks[index], {
      x: artwork.x,
      y: artwork.y,
      scale: artwork.scale
    })
  })

  Object.assign(profile.text, {
    x: textSettings.x,
    y: textSettings.y,
    scale: textSettings.scale,
    eyebrowSize: textSettings.eyebrowSize,
    titleOneSize: textSettings.titleOneSize,
    titleTwoSize: textSettings.titleTwoSize
  })

  icons.forEach((icon, index) => {
    if (!profile.icons[index]) return
    Object.assign(profile.icons[index], {
      x: icon.x,
      y: icon.y,
      size: icon.size
    })
  })
}

function applyLayoutProfile(mode = canvasMode.value) {
  const profile = layoutProfiles[mode]
  if (!profile) return

  Object.assign(backgroundSettings, profile.background)
  artworks.forEach((artwork, index) => {
    if (profile.artworks[index]) {
      Object.assign(artwork, profile.artworks[index])
    }
  })
  Object.assign(textSettings, profile.text)
  icons.forEach((icon, index) => {
    if (profile.icons[index]) {
      Object.assign(icon, profile.icons[index])
    }
  })
}

function restoreLayoutProfile(mode, savedProfile) {
  const restoredProfile = cloneLayoutProfile(layoutDefaults[mode])
  if (!savedProfile) {
    layoutProfiles[mode] = restoredProfile
    return
  }

  Object.assign(restoredProfile.background, savedProfile.background)
  savedProfile.artworks?.forEach((savedArtwork, index) => {
    if (restoredProfile.artworks[index]) {
      Object.assign(restoredProfile.artworks[index], savedArtwork)
    }
  })
  Object.assign(restoredProfile.text, savedProfile.text)
  savedProfile.icons?.forEach((savedIcon, index) => {
    if (restoredProfile.icons[index]) {
      Object.assign(restoredProfile.icons[index], savedIcon)
    }
  })
  layoutProfiles[mode] = restoredProfile
}

async function switchCanvasMode(nextMode) {
  if (!canvasPresets[nextMode] || nextMode === canvasMode.value) return

  captureLayoutProfile()
  canvasMode.value = nextMode
  applyLayoutProfile()
  selectedItemId.value = ''

  await nextTick()
  updatePreviewScale()
  scheduleThumbnailRender(0)
}

function resetArtwork(artwork, index) {
  Object.assign(artwork, activeLayoutDefaults.value.artworks[index])
}

function resetIcon(icon, index) {
  Object.assign(icon, activeLayoutDefaults.value.icons[index])
}

function resetValue(target, key, value) {
  target[key] = value
}

let dragState = null

function startArtworkDrag(event, artwork) {
  selectedItemId.value = artwork.id
  dragState = {
    type: 'artwork',
    target: artwork,
    startClientX: event.clientX,
    startClientY: event.clientY,
    startX: artwork.x,
    startY: artwork.y
  }
  window.addEventListener('pointermove', handlePointerMove)
  window.addEventListener('pointerup', stopDrag, { once: true })
}

function startTextDrag(event) {
  selectedItemId.value = 'text'
  dragState = {
    type: 'text',
    startClientX: event.clientX,
    startClientY: event.clientY,
    startX: textSettings.x,
    startY: textSettings.y
  }
  window.addEventListener('pointermove', handlePointerMove)
  window.addEventListener('pointerup', stopDrag, { once: true })
}

function startIconDrag(event, icon) {
  selectedItemId.value = icon.id
  dragState = {
    type: 'icon',
    target: icon,
    startClientX: event.clientX,
    startClientY: event.clientY,
    startX: icon.x,
    startY: icon.y
  }
  window.addEventListener('pointermove', handlePointerMove)
  window.addEventListener('pointerup', stopDrag, { once: true })
}

function handlePointerMove(event) {
  if (!dragState || !previewScale.value) return

  const deltaX = (event.clientX - dragState.startClientX) / previewScale.value
  const deltaY = (event.clientY - dragState.startClientY) / previewScale.value
  const nextX = Math.round(dragState.startX + deltaX)
  const nextY = Math.round(dragState.startY + deltaY)

  if (dragState.type === 'artwork' || dragState.type === 'icon') {
    dragState.target.x = nextX
    dragState.target.y = nextY
  } else {
    textSettings.x = nextX
    textSettings.y = nextY
  }
}

function stopDrag() {
  dragState = null
  window.removeEventListener('pointermove', handlePointerMove)
}

function clearSelection(event) {
  if (event.target === coverCanvasRef.value) {
    selectedItemId.value = ''
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
        image.addEventListener('load', resolve, { once: true })
        image.addEventListener('error', () => reject(new Error('导出前有立绘加载失败')), {
          once: true
        })
      })
    })
  )
}

let html2canvasLoader = null

function loadHtml2Canvas() {
  if (!html2canvasLoader) {
    html2canvasLoader = import('html2canvas').then(({ default: html2canvas }) => html2canvas)
  }

  return html2canvasLoader
}

function prepareClonedCover(clonedDocument, mode) {
  const clonedCanvas = clonedDocument.querySelector('[data-cover-canvas="main"]')
  if (!clonedCanvas) return

  const nativeWidth = `${canvasWidth.value}px`
  const nativeHeight = `${canvasHeight.value}px`
  const clonedFrame = clonedCanvas.closest('.cover-frame')

  if (clonedFrame) {
    clonedFrame.style.width = nativeWidth
    clonedFrame.style.height = nativeHeight
  }

  clonedCanvas.style.width = nativeWidth
  clonedCanvas.style.height = nativeHeight
  clonedCanvas.style.transform = 'none'
  clonedCanvas.classList.add('is-exporting')

  const hiddenSelectors = mode === 'backdrop'
    ? ['.cover-copy', '.cover-icon-layer', '.artwork-blur-layer']
    : mode === 'foreground'
      ? ['.background-pattern', '.artwork-layer', '.artwork-blur-layer']
      : []

  hiddenSelectors.forEach((selector) => {
    clonedCanvas.querySelectorAll(selector).forEach((element) => {
      element.style.display = 'none'
    })
  })

  if (mode === 'foreground') {
    clonedCanvas.classList.add('is-foreground-render')
    clonedCanvas.style.background = 'transparent'
  }
}

function renderCoverLayer(html2canvas, scale, mode = 'full') {
  return html2canvas(coverCanvasRef.value, {
    backgroundColor: null,
    width: canvasWidth.value,
    height: canvasHeight.value,
    scale,
    useCORS: true,
    logging: false,
    onclone(clonedDocument) {
      prepareClonedCover(clonedDocument, mode)
    }
  })
}

function applyArtworkEdgeBlur(baseCanvas, scale) {
  const blurRadius = artworkLayerSettings.blur * ARTWORK_BLUR_MAX_RADIUS / 100 * scale
  if (blurRadius <= 0) return baseCanvas

  const width = baseCanvas.width
  const height = baseCanvas.height
  const blurCanvas = document.createElement('canvas')
  blurCanvas.width = width
  blurCanvas.height = height

  const blurContext = blurCanvas.getContext('2d')
  if (!blurContext) return baseCanvas

  const bleed = Math.ceil(blurRadius * 2)
  blurContext.filter = `blur(${blurRadius}px)`
  blurContext.drawImage(
    baseCanvas,
    -bleed,
    -bleed,
    width + bleed * 2,
    height + bleed * 2
  )
  blurContext.filter = 'none'
  blurContext.globalCompositeOperation = 'destination-in'
  blurContext.save()
  blurContext.translate(width / 2, height / 2)
  blurContext.scale(width / 2, height / 2)

  const edgeMask = blurContext.createRadialGradient(0, 0, 0, 0, 0, 1)
  edgeMask.addColorStop(0.38, 'rgba(0, 0, 0, 0)')
  edgeMask.addColorStop(0.68, 'rgba(0, 0, 0, 0.35)')
  edgeMask.addColorStop(1, 'rgba(0, 0, 0, 1)')

  blurContext.fillStyle = edgeMask
  blurContext.fillRect(-1, -1, 2, 2)
  blurContext.restore()

  const resultCanvas = document.createElement('canvas')
  resultCanvas.width = width
  resultCanvas.height = height

  const resultContext = resultCanvas.getContext('2d')
  if (!resultContext) return baseCanvas

  resultContext.drawImage(baseCanvas, 0, 0)
  resultContext.drawImage(blurCanvas, 0, 0)
  return resultCanvas
}

async function renderCoverSnapshot(scale) {
  const html2canvas = await loadHtml2Canvas()
  if (artworkLayerSettings.blur <= 0) {
    return renderCoverLayer(html2canvas, scale)
  }

  const backdropCanvas = await renderCoverLayer(html2canvas, scale, 'backdrop')
  const foregroundCanvas = await renderCoverLayer(html2canvas, scale, 'foreground')
  const processedBackdrop = applyArtworkEdgeBlur(backdropCanvas, scale)
  const resultCanvas = document.createElement('canvas')
  resultCanvas.width = backdropCanvas.width
  resultCanvas.height = backdropCanvas.height

  const resultContext = resultCanvas.getContext('2d')
  if (!resultContext) {
    throw new Error('浏览器无法合成立绘层虚化效果')
  }

  resultContext.drawImage(processedBackdrop, 0, 0)
  resultContext.drawImage(foregroundCanvas, 0, 0)
  return resultCanvas
}

let thumbnailRenderTimer = null
let thumbnailRenderRevision = 0

function scheduleThumbnailRender(delay = 220) {
  if (!isDraftReady.value) return

  thumbnailRenderRevision += 1
  const revision = thumbnailRenderRevision

  if (thumbnailRenderTimer) {
    window.clearTimeout(thumbnailRenderTimer)
  }

  thumbnailRenderTimer = window.setTimeout(() => {
    thumbnailRenderTimer = null
    renderThumbnailPreview(revision)
  }, delay)
}

async function renderThumbnailPreview(revision) {
  if (!coverCanvasRef.value || isThumbnailRendering.value || isExporting.value) return

  isThumbnailRendering.value = true

  try {
    await nextTick()
    await Promise.all([
      waitForImages(coverCanvasRef.value),
      document.fonts?.ready || Promise.resolve()
    ])

    const canvas = await renderCoverSnapshot(288 / canvasHeight.value)

    if (revision === thumbnailRenderRevision) {
      thumbnailPreviewUrl.value = canvas.toDataURL('image/png')
    }
  } catch (error) {
    console.error('生成小图预览失败:', error)
  } finally {
    isThumbnailRendering.value = false

    if (revision !== thumbnailRenderRevision) {
      const latestRevision = thumbnailRenderRevision
      thumbnailRenderTimer = window.setTimeout(() => {
        thumbnailRenderTimer = null
        renderThumbnailPreview(latestRevision)
      }, 0)
    }
  }
}

async function exportCover() {
  if (!coverCanvasRef.value || isExporting.value) return

  try {
    isExporting.value = true
    await nextTick()
    await Promise.all([
      waitForImages(coverCanvasRef.value),
      document.fonts?.ready || Promise.resolve()
    ])

    const canvas = await renderCoverSnapshot(1)

    const link = document.createElement('a')
    link.download = `${exportFileName.value.trim() || 'logical-byte-cover'}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
    ElMessage.success(`${canvasWidth.value} × ${canvasHeight.value} PNG 已导出`)
  } catch (error) {
    ElMessage.error(error.message || '封面导出失败')
  } finally {
    isExporting.value = false
  }
}

async function resetDraft() {
  try {
    await ElMessageBox.confirm('清空当前立绘并恢复默认文字与配色？', '重置封面草稿', {
      confirmButtonText: '重置',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    return
  }

  Object.assign(backgroundSettings, backgroundDefaults)
  Object.assign(artworkLayerSettings, artworkLayerDefaults)
  clearMonetColors()
  layoutProfiles.landscape = cloneLayoutProfile(layoutDefaults.landscape)
  layoutProfiles.portrait = cloneLayoutProfile(layoutDefaults.portrait)
  canvasMode.value = 'landscape'

  artworks.forEach((artwork, index) => {
    Object.assign(artwork, {
      fileName: '',
      src: '',
      visible: true,
      ...artworkDefaults[index]
    })
  })

  icons.forEach((icon, index) => {
    Object.assign(icon, {
      fileName: '',
      src: '',
      visible: true,
      ...iconDefaults[index]
    })
  })

  Object.assign(textSettings, textDefaults)
  applyLayoutProfile()

  selectedItemId.value = ''
  showReferenceGuides.value = false
  exportFileName.value = 'logical-byte-cover'

  await nextTick()
  updatePreviewScale()
}

function getDraftPayload() {
  captureLayoutProfile()

  return {
    id: DRAFT_ID,
    updatedAt: new Date().toISOString(),
    canvasMode: canvasMode.value,
    layoutProfiles: {
      landscape: cloneLayoutProfile(layoutProfiles.landscape),
      portrait: cloneLayoutProfile(layoutProfiles.portrait)
    },
    backgroundSettings: { ...backgroundSettings },
    monetSource: { ...monetSource },
    monetSchemes: monetSchemes.map((scheme) => ({ ...scheme })),
    artworkLayerSettings: { ...artworkLayerSettings },
    artworks: artworks.map((artwork) => ({ ...artwork })),
    textSettings: { ...textSettings },
    icons: icons.map((icon) => ({ ...icon })),
    showReferenceGuides: showReferenceGuides.value,
    exportFileName: exportFileName.value
  }
}

async function restoreDraft() {
  try {
    const draft = await coverDraftDb.table('drafts').get(DRAFT_ID)
    if (!draft) {
      saveStatus.value = '自动保存已开启'
      return
    }

    if (draft.backgroundSettings) {
      Object.assign(backgroundSettings, draft.backgroundSettings)
    }

    if (draft.monetSource) {
      Object.assign(monetSource, draft.monetSource)
    }

    if (Array.isArray(draft.monetSchemes)) {
      monetSchemes.splice(0, monetSchemes.length, ...draft.monetSchemes)
    }

    if (draft.artworkLayerSettings) {
      const restoredBlur = Number(
        draft.artworkLayerSettings.blur ??
        draft.artworkLayerSettings.vignette ??
        artworkLayerDefaults.blur
      )
      artworkLayerSettings.blur = Number.isFinite(restoredBlur)
        ? Math.min(100, Math.max(0, restoredBlur))
        : artworkLayerDefaults.blur
    } else if (Array.isArray(draft.artworks)) {
      artworkLayerSettings.blur = Math.min(
        100,
        Math.max(
          artworkLayerDefaults.blur,
          ...draft.artworks.map((artwork) => Number(artwork?.vignette) || 0)
        )
      )
    }

    draft.artworks?.forEach((savedArtwork, index) => {
      if (!artworks[index]) return
      const savedArtworkSettings = { ...savedArtwork }
      delete savedArtworkSettings.vignette
      Object.assign(artworks[index], savedArtworkSettings, {
        id: artworks[index].id,
        name: artworks[index].name
      })
    })

    if (draft.textSettings) {
      const {
        fontFamily: legacyFontFamily,
        titleFontWeight: legacyTitleFontWeight,
        titleSize: legacyTitleSize,
        ...savedTextSettings
      } = draft.textSettings

      Object.assign(textSettings, savedTextSettings, {
        eyebrowFontFamily:
          savedTextSettings.eyebrowFontFamily ??
          legacyFontFamily ??
          textDefaults.eyebrowFontFamily,
        titleOneFontFamily:
          savedTextSettings.titleOneFontFamily ??
          legacyFontFamily ??
          textDefaults.titleOneFontFamily,
        titleTwoFontFamily:
          savedTextSettings.titleTwoFontFamily ??
          legacyFontFamily ??
          textDefaults.titleTwoFontFamily,
        titleOneFontWeight:
          savedTextSettings.titleOneFontWeight ??
          legacyTitleFontWeight ??
          textDefaults.titleOneFontWeight,
        titleTwoFontWeight:
          savedTextSettings.titleTwoFontWeight ??
          legacyTitleFontWeight ??
          textDefaults.titleTwoFontWeight,
        titleOneSize:
          savedTextSettings.titleOneSize ??
          legacyTitleSize ??
          textDefaults.titleOneSize,
        titleTwoSize:
          savedTextSettings.titleTwoSize ??
          legacyTitleSize ??
          textDefaults.titleTwoSize
      })
    }

    draft.icons?.forEach((savedIcon, index) => {
      if (!icons[index]) return
      Object.assign(icons[index], savedIcon, {
        id: icons[index].id,
        name: icons[index].name
      })
    })

    captureLayoutProfile('landscape')
    if (draft.layoutProfiles) {
      restoreLayoutProfile('landscape', draft.layoutProfiles.landscape)
      restoreLayoutProfile('portrait', draft.layoutProfiles.portrait)
    }

    canvasMode.value = canvasPresets[draft.canvasMode]
      ? draft.canvasMode
      : 'landscape'
    applyLayoutProfile()

    if (typeof draft.exportFileName === 'string') {
      exportFileName.value = draft.exportFileName
    }

    if (typeof draft.showReferenceGuides === 'boolean') {
      showReferenceGuides.value = draft.showReferenceGuides
    }

    saveStatus.value = '草稿已恢复'
  } catch (error) {
    console.error('读取封面草稿失败:', error)
    saveStatus.value = '读取失败'
    ElMessage.error('本地草稿读取失败')
  }
}

let saveTimer = null

function scheduleDraftSave() {
  if (!isDraftReady.value) return

  saveStatus.value = '等待保存'
  if (saveTimer) {
    window.clearTimeout(saveTimer)
  }

  saveTimer = window.setTimeout(() => {
    saveDraft()
  }, 400)
}

async function saveDraft(showMessage = false) {
  if (!isDraftReady.value) return

  if (saveTimer) {
    window.clearTimeout(saveTimer)
    saveTimer = null
  }

  saveStatus.value = '保存中'

  try {
    await coverDraftDb.table('drafts').put(getDraftPayload())
    saveStatus.value = '已保存'
    if (showMessage) {
      ElMessage.success('封面草稿已保存到本机')
    }
  } catch (error) {
    console.error('保存封面草稿失败:', error)
    saveStatus.value = '保存失败'
    ElMessage.error('草稿保存失败，可能是浏览器存储空间不足')
  }
}

watch(
  [
    backgroundSettings,
    monetSource,
    monetSchemes,
    artworkLayerSettings,
    artworks,
    textSettings,
    icons,
    canvasMode,
    showReferenceGuides,
    exportFileName
  ],
  scheduleDraftSave,
  { deep: true }
)

watch(
  [backgroundSettings, artworkLayerSettings, artworks, textSettings, icons, canvasMode],
  () => scheduleThumbnailRender(),
  { deep: true }
)

let resizeObserver = null

onMounted(async () => {
  updatePreviewScale()
  window.addEventListener('resize', updatePreviewScale)
  resizeObserver = new ResizeObserver(updatePreviewScale)
  if (previewViewportRef.value) {
    resizeObserver.observe(previewViewportRef.value)
  }

  await restoreDraft()
  await nextTick()
  updatePreviewScale()
  isDraftReady.value = true
  scheduleThumbnailRender(0)
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  window.removeEventListener('resize', updatePreviewScale)
  stopDrag()
  window.removeEventListener('pointerup', stopDrag)

  if (saveTimer) {
    window.clearTimeout(saveTimer)
    saveTimer = null
    saveDraft()
  }

  if (thumbnailRenderTimer) {
    window.clearTimeout(thumbnailRenderTimer)
    thumbnailRenderTimer = null
  }
})
</script>

<style scoped>
@font-face {
  font-family: "Alibaba PuHuiTi";
  src: url("../../assets/fonts/alibaba-puhuiti/Alibaba-PuHuiTi-Light.otf") format("opentype");
  font-display: swap;
  font-style: normal;
  font-weight: 300;
}

@font-face {
  font-family: "Alibaba PuHuiTi";
  src: url("../../assets/fonts/alibaba-puhuiti/Alibaba-PuHuiTi-Regular.otf") format("opentype");
  font-display: swap;
  font-style: normal;
  font-weight: 400;
}

@font-face {
  font-family: "Alibaba PuHuiTi";
  src: url("../../assets/fonts/alibaba-puhuiti/Alibaba-PuHuiTi-Medium.otf") format("opentype");
  font-display: swap;
  font-style: normal;
  font-weight: 500;
}

@font-face {
  font-family: "Alibaba PuHuiTi";
  src: url("../../assets/fonts/alibaba-puhuiti/Alibaba-PuHuiTi-Bold.otf") format("opentype");
  font-display: swap;
  font-style: normal;
  font-weight: 700;
}

@font-face {
  font-family: "Alibaba Sans Black";
  src: url("../../assets/fonts/alibaba-sans/AlibabaSans-Black.otf") format("opentype");
  font-display: swap;
  font-style: normal;
  font-weight: 900;
}

.cover-maker-page {
  min-height: calc(100vh - 64px);
  padding: 18px;
  background: #15191f;
  color: #f5f7fa;
}

.cover-maker-header {
  display: flex;
  min-height: 72px;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 16px;
  padding: 0 4px;
}

.cover-maker-kicker,
.panel-kicker {
  display: block;
  margin: 0 0 5px;
  color: #8ba9c8;
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
  text-transform: uppercase;
}

.cover-maker-header h1,
.panel-header h2,
.control-section h3 {
  margin: 0;
  letter-spacing: 0;
}

.cover-maker-header h1 {
  font-size: 28px;
  line-height: 1.2;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.draft-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: rgba(255, 255, 255, 0.52);
  font-size: 12px;
  white-space: nowrap;
}

.draft-status .mdi {
  color: #a8cf48;
  font-size: 17px;
}

.draft-status.error,
.draft-status.error .mdi {
  color: #f18d8d;
}

.action-button,
.icon-button,
.small-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  color: #f5f7fa;
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
}

.action-button {
  height: 38px;
  padding: 0 14px;
}

.action-button.primary {
  border-color: #a8cf48;
  background: #a8cf48;
  color: #11160d;
}

.action-button.secondary,
.icon-button,
.small-button {
  background: #252b34;
}

.action-button:disabled {
  opacity: 0.56;
  cursor: wait;
}

.icon-button {
  width: 38px;
  height: 38px;
}

.cover-maker-workspace {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 400px;
  gap: 16px;
  align-items: start;
}

.workspace-panel {
  min-width: 0;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  background: #20262e;
}

.panel-header {
  display: flex;
  min-height: 58px;
  padding: 0 18px;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  background: #282f39;
}

.panel-header h2 {
  font-size: 17px;
  line-height: 1.2;
}

.preview-size {
  color: rgba(255, 255, 255, 0.56);
  font-family: Consolas, "Courier New", monospace;
  font-size: 13px;
}

.preview-header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.canvas-mode-switch {
  display: inline-flex;
  height: 32px;
  padding: 2px;
  align-items: stretch;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 6px;
  background: #1c222a;
}

.canvas-mode-switch button {
  display: inline-flex;
  min-width: 58px;
  padding: 0 8px;
  align-items: center;
  justify-content: center;
  gap: 5px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: rgba(255, 255, 255, 0.5);
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.canvas-mode-switch button.active {
  background: #a8cf48;
  color: #11160d;
}

.canvas-mode-switch button:disabled {
  opacity: 0.5;
  cursor: wait;
}

.canvas-mode-switch .mdi {
  font-size: 16px;
}

.preview-guide-button {
  display: inline-flex;
  height: 32px;
  padding: 0 10px;
  align-items: center;
  gap: 6px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  background: #252b34;
  color: rgba(255, 255, 255, 0.72);
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.preview-guide-button.active {
  border-color: #a8cf48;
  background: rgba(168, 207, 72, 0.16);
  color: #d9ff24;
}

.preview-guide-button .mdi {
  font-size: 17px;
}

.preview-stage {
  display: grid;
  min-height: 0;
  padding: 24px;
  place-items: center;
  overflow: auto;
  background:
    linear-gradient(135deg, rgba(34, 42, 52, 0.94), rgba(19, 24, 31, 0.98)),
    repeating-linear-gradient(135deg, rgba(255, 255, 255, 0.04) 0 1px, transparent 1px 8px);
}

.cover-frame {
  position: relative;
  flex: 0 0 auto;
  overflow: visible;
  box-shadow: 0 24px 56px rgba(0, 0, 0, 0.34);
}

.cover-canvas {
  position: absolute;
  top: 0;
  left: 0;
  overflow: hidden;
  transform-origin: top left;
  background: var(--background-color);
  isolation: isolate;
}

.cover-canvas::before {
  position: absolute;
  z-index: 8;
  inset: 0;
  background:
    linear-gradient(90deg, rgba(0, 0, 0, 0.34) 0%, transparent 52%, rgba(0, 0, 0, 0.06) 100%),
    radial-gradient(circle at center, transparent 42%, rgba(0, 0, 0, var(--vignette-opacity)) 135%);
  content: "";
  pointer-events: none;
}

.cover-canvas.is-foreground-render {
  background: transparent;
}

.cover-canvas.is-foreground-render::before {
  content: none;
}

.background-pattern {
  position: absolute;
  z-index: 1;
  inset: 0;
  overflow: hidden;
  opacity: var(--pattern-opacity);
  pointer-events: none;
}

.pattern-columns {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(90deg, transparent 0 71.8%, var(--accent-color) 71.8% 72%, transparent 72%),
    repeating-linear-gradient(
      0deg,
      transparent 0 41px,
      rgba(255, 255, 255, 0.055) 41px 42px
    ),
    repeating-linear-gradient(
      90deg,
      transparent 0 41px,
      rgba(255, 255, 255, 0.055) 41px 42px
    ),
    repeating-linear-gradient(
      0deg,
      transparent 0 167px,
      rgba(255, 255, 255, 0.08) 167px 168px
    ),
    repeating-linear-gradient(
      90deg,
      transparent 0 167px,
      rgba(255, 255, 255, 0.08) 167px 168px
    );
  opacity: 0.72;
}

.pattern-columns::before,
.pattern-columns::after {
  position: absolute;
  background: rgba(255, 255, 255, 0.52);
  content: "";
}

.pattern-columns::before {
  top: 88px;
  bottom: 74px;
  left: 58px;
  width: 2px;
  box-shadow:
    0 126px 0 rgba(255, 255, 255, 0.42),
    0 612px 0 rgba(255, 255, 255, 0.42);
}

.pattern-columns::after {
  right: 58px;
  bottom: 92px;
  left: 58px;
  height: 2px;
}

.pattern-position-layer {
  position: absolute;
  inset: 0;
  transform: translate3d(
    var(--pattern-offset-x),
    var(--pattern-offset-y),
    0
  );
}

.pattern-grid {
  position: absolute;
  top: 72px;
  right: 80px;
  width: 1080px;
  height: 500px;
  border-top: 2px solid rgba(255, 255, 255, 0.2);
  border-right: 2px solid rgba(255, 255, 255, 0.12);
  background:
    linear-gradient(90deg, var(--accent-color) 0 18%, transparent 18% 100%) top left / 100% 3px no-repeat,
    repeating-linear-gradient(
      90deg,
      rgba(255, 255, 255, 0.18) 0 2px,
      transparent 2px 64px
    ) top 18px left / 100% 10px no-repeat;
  opacity: 0.66;
}

.pattern-cards {
  position: absolute;
  inset: 0;
}

.pattern-cards span {
  position: absolute;
  height: 118px;
  border: 2px solid rgba(255, 255, 255, 0.34);
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.13) 0 12%, transparent 12%),
    repeating-linear-gradient(
      90deg,
      rgba(255, 255, 255, 0.08) 0 2px,
      transparent 2px 54px
    ),
    rgba(255, 255, 255, 0.045);
  box-shadow:
    inset 9px 0 0 var(--accent-color),
    inset 0 -14px 0 rgba(255, 255, 255, 0.045);
}

.pattern-cards span::before {
  position: absolute;
  top: 18px;
  right: 18px;
  width: 54px;
  height: 12px;
  background: repeating-linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.7) 0 8px,
    transparent 8px 12px
  );
  content: "";
}

.pattern-cards span::after {
  position: absolute;
  right: 18px;
  bottom: 12px;
  left: 28px;
  height: 5px;
  background: repeating-linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.54) 0 36px,
    transparent 36px 44px
  );
  content: "";
}

.pattern-cards span:nth-child(1) {
  top: 110px;
  left: 770px;
  width: 330px;
}

.pattern-cards span:nth-child(2) {
  top: 110px;
  left: 1124px;
  width: 276px;
}

.pattern-cards span:nth-child(3) {
  top: 110px;
  left: 1424px;
  width: 326px;
}

.pattern-cards span:nth-child(4) {
  top: 252px;
  left: 840px;
  width: 256px;
}

.pattern-cards span:nth-child(5) {
  top: 252px;
  left: 1120px;
  width: 360px;
}

.pattern-cards span:nth-child(6) {
  top: 252px;
  left: 1504px;
  width: 246px;
}

.pattern-cards span:nth-child(7) {
  top: 394px;
  left: 930px;
  width: 300px;
}

.pattern-cards span:nth-child(8) {
  top: 394px;
  left: 1254px;
  width: 234px;
}

.pattern-cards span:nth-child(9) {
  top: 394px;
  left: 1512px;
  width: 238px;
}

.pattern-nodes {
  position: absolute;
  inset: 0;
}

.pattern-nodes span {
  position: absolute;
  width: 34px;
  height: 34px;
}

.pattern-nodes span::before,
.pattern-nodes span::after {
  position: absolute;
  top: 50%;
  left: 50%;
  background: rgba(255, 255, 255, 0.72);
  content: "";
  transform: translate(-50%, -50%);
}

.pattern-nodes span::before {
  width: 34px;
  height: 2px;
}

.pattern-nodes span::after {
  width: 2px;
  height: 34px;
}

.pattern-nodes span:nth-child(1) {
  top: 150px;
  left: 730px;
}

.pattern-nodes span:nth-child(2) {
  top: 150px;
  left: 1384px;
}

.pattern-nodes span:nth-child(3) {
  top: 292px;
  left: 1080px;
}

.pattern-nodes span:nth-child(4) {
  top: 292px;
  left: 1470px;
}

.pattern-nodes span:nth-child(5) {
  top: 434px;
  left: 1214px;
}

.pattern-nodes span:nth-child(6) {
  top: 434px;
  left: 1734px;
}

.pattern-hatch {
  position: absolute;
  right: 94px;
  bottom: 118px;
  width: 210px;
  height: 146px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  background: repeating-linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.3) 0 3px,
    transparent 3px 12px
  );
  box-shadow:
    -280px 54px 0 -44px rgba(255, 255, 255, 0.14),
    -620px 26px 0 -60px var(--accent-color);
}

.pattern-caption {
  position: absolute;
  right: 70px;
  bottom: 46px;
  color: rgba(255, 255, 255, 0.48);
  font-family: Consolas, "Courier New", monospace;
  font-size: 14px;
  letter-spacing: 0;
}

.artwork-layer {
  position: absolute;
  max-width: none;
  transform: translate(-50%, -50%);
  transform-origin: center;
  user-select: none;
  cursor: grab;
  -webkit-user-drag: none;
}

.artwork-blur-layer {
  position: absolute;
  z-index: 9;
  inset: 0;
  background: rgba(0, 0, 0, 0.001);
  -webkit-backdrop-filter: blur(var(--artwork-blur-radius));
  backdrop-filter: blur(var(--artwork-blur-radius));
  -webkit-mask-image: radial-gradient(
    ellipse at center,
    transparent 38%,
    rgba(0, 0, 0, 0.35) 68%,
    #000 100%
  );
  mask-image: radial-gradient(
    ellipse at center,
    transparent 38%,
    rgba(0, 0, 0, 0.35) 68%,
    #000 100%
  );
  pointer-events: none;
}

.artwork-layer:active,
.cover-icon-layer:active,
.cover-copy:active {
  cursor: grabbing;
}

.artwork-layer.is-selected,
.cover-icon-layer.is-selected {
  outline: 4px solid rgba(217, 255, 36, 0.9);
  outline-offset: 8px;
}

.cover-icon-layer {
  position: absolute;
  z-index: 14;
  object-fit: contain;
  transform: translate(-50%, -50%);
  user-select: none;
  cursor: grab;
  -webkit-user-drag: none;
}

.cover-copy {
  position: absolute;
  z-index: 12;
  display: grid;
  justify-items: start;
  gap: 13px;
  transform-origin: top left;
  cursor: grab;
  user-select: none;
}

.cover-copy.is-selected {
  outline: 4px solid rgba(217, 255, 36, 0.9);
  outline-offset: 12px;
}

.copy-eyebrow {
  color: rgba(255, 255, 255, 0.9);
  font-family: var(--eyebrow-font-family), "Microsoft YaHei", sans-serif;
  font-size: var(--eyebrow-size);
  font-weight: var(--eyebrow-font-weight);
  letter-spacing: var(--eyebrow-letter-spacing);
  line-height: 1;
  text-shadow: 0 8px 18px rgba(0, 0, 0, 0.46);
}

.copy-line {
  position: relative;
  display: flex;
  padding: 0 36px 8px 42px;
  align-items: center;
  line-height: 0.9;
  white-space: nowrap;
  text-shadow: 0 8px 18px rgba(0, 0, 0, 0.36);
}

.copy-line-primary {
  min-height: calc(var(--title-one-size) * 0.96);
  font-family: var(--title-one-font-family), "Microsoft YaHei", "PingFang SC", sans-serif;
  font-size: var(--title-one-size);
  font-weight: var(--title-one-font-weight);
  letter-spacing: var(--title-one-letter-spacing);
}

.copy-line::before {
  position: absolute;
  z-index: -1;
  inset: 18% 0 0;
  background: rgba(10, 11, 13, 0.88);
  content: "";
}

.copy-line-secondary {
  margin-left: 95px;
  min-height: calc(var(--title-two-size) * 0.96);
  font-family: var(--title-two-font-family), "Microsoft YaHei", "PingFang SC", sans-serif;
  font-size: var(--title-two-size);
  font-weight: var(--title-two-font-weight);
  letter-spacing: var(--title-two-letter-spacing);
}

.copy-title-one-first {
  color: var(--title-one-first-color);
}

.copy-title-one-second {
  color: var(--title-one-second-color);
}

.copy-title-two-first {
  color: var(--title-two-first-color);
}

.copy-title-two-second {
  color: var(--title-two-second-color);
}

.copy-line strong {
  margin: 0 18px 0 -74px;
  color: var(--ampersand-color);
  font-size: calc(var(--title-two-size) * 1.34);
  line-height: 0.55;
}

.cover-canvas.is-portrait .copy-line {
  padding-right: 28px;
  padding-left: 32px;
}

.cover-canvas.is-portrait .copy-line-secondary {
  margin-left: 58px;
}

.cover-canvas.is-portrait .copy-line strong {
  margin-right: 14px;
  margin-left: -58px;
}

.empty-canvas-hint {
  position: absolute;
  z-index: 20;
  top: 50%;
  right: 260px;
  display: grid;
  justify-items: center;
  gap: 14px;
  transform: translateY(-50%);
  color: rgba(255, 255, 255, 0.4);
  text-align: center;
}

.empty-canvas-hint .mdi {
  font-size: 74px;
}

.empty-canvas-hint strong {
  font-size: 25px;
  letter-spacing: 0;
}

.cover-canvas.is-portrait .empty-canvas-hint {
  top: 42%;
  right: auto;
  left: 50%;
  transform: translate(-50%, -50%);
}

.cover-canvas.is-exporting .is-selected {
  outline: 0;
}

.reference-guides {
  position: absolute;
  z-index: 30;
  inset: 0;
  pointer-events: none;
}

.reference-guide {
  position: absolute;
  display: block;
  opacity: 0.92;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.72));
}

.reference-guide.vertical {
  top: 0;
  bottom: 0;
  border-left: 4px dashed rgba(217, 255, 36, 0.96);
}

.reference-guide.horizontal {
  right: 0;
  left: 0;
  border-top: 4px dashed rgba(105, 215, 229, 0.96);
}

.reference-guide.crop-left {
  left: var(--crop-guide-left);
}

.reference-guide.crop-right {
  left: var(--crop-guide-right);
}

.reference-guide.safe-top {
  top: var(--safe-guide-top);
}

.reference-guide.safe-bottom {
  top: var(--safe-guide-bottom);
}

.thumbnail-preview-section {
  padding: 14px 24px 18px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  background: #1b2027;
}

.thumbnail-preview-grid {
  display: grid;
  grid-template-columns: minmax(0, 4fr) minmax(0, 3fr);
  max-width: 912px;
  margin: 0 auto;
  gap: 16px;
  align-items: end;
}

.thumbnail-preview-grid.portrait {
  grid-template-columns: 216px;
  max-width: 216px;
}

.thumbnail-preview-item {
  min-width: 0;
  margin: 0;
}

.thumbnail-preview-item figcaption {
  display: flex;
  margin-bottom: 8px;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  color: rgba(255, 255, 255, 0.88);
  font-size: 13px;
}

.thumbnail-preview-item figcaption span {
  color: rgba(255, 255, 255, 0.42);
  font-family: Consolas, "Courier New", monospace;
  font-size: 11px;
}

.thumbnail-image-frame {
  position: relative;
  width: 100%;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: #11151a;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.22);
}

.thumbnail-image-frame.original {
  aspect-ratio: 16 / 9;
}

.thumbnail-image-frame.original.portrait {
  aspect-ratio: 3 / 4;
}

.thumbnail-image-frame.cropped {
  aspect-ratio: 4 / 3;
}

.thumbnail-image-frame img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
}

.thumbnail-placeholder {
  position: absolute;
  top: 50%;
  left: 50%;
  color: rgba(255, 255, 255, 0.2);
  font-size: 38px;
  transform: translate(-50%, -50%);
}

.control-panel {
  position: sticky;
  top: 78px;
  max-height: calc(100vh - 94px);
}

.control-tabs {
  height: calc(100vh - 153px);
}

.control-tabs :deep(.el-tabs__header) {
  margin: 0;
  padding: 0 14px;
  background: #242b34;
}

.control-tabs :deep(.el-tabs__item) {
  height: 48px;
  color: rgba(255, 255, 255, 0.58);
}

.control-tabs :deep(.el-tabs__item.is-active) {
  color: #d9ff24;
}

.control-tabs :deep(.el-tabs__active-bar) {
  background: #d9ff24;
}

.control-tabs :deep(.el-tabs__nav-wrap::after) {
  background: rgba(255, 255, 255, 0.08);
}

.control-tabs :deep(.el-tabs__content) {
  height: calc(100% - 48px);
  overflow-y: auto;
}

.control-content {
  display: grid;
}

.control-section {
  display: grid;
  gap: 15px;
  padding: 18px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.09);
}

.control-section h3 {
  color: #f5f7fa;
  font-size: 14px;
  line-height: 1.2;
}

.color-scheme-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.color-scheme-button {
  display: grid;
  min-width: 0;
  padding: 8px;
  grid-template-columns: 38px minmax(0, 1fr);
  align-items: center;
  gap: 9px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.025);
  color: rgba(255, 255, 255, 0.68);
  font: inherit;
  font-size: 12px;
  text-align: left;
  cursor: pointer;
}

.color-scheme-button:hover {
  border-color: rgba(217, 255, 36, 0.42);
}

.color-scheme-button.active {
  border-color: #d9ff24;
  box-shadow: 0 0 0 1px rgba(217, 255, 36, 0.14) inset;
  color: #f5f7fa;
}

.color-scheme-button > span:last-child {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.color-scheme-preview {
  position: relative;
  width: 38px;
  height: 28px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 4px;
}

.color-scheme-preview span {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 15px;
  height: 28px;
  clip-path: polygon(45% 0, 100% 0, 100% 100%, 0 100%);
}

.source-color-value {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #a7bdd3;
  font-family: Consolas, "Courier New", monospace;
  font-size: 11px;
}

.source-color-value i {
  width: 13px;
  height: 13px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 3px;
}

.artwork-color-source-list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 7px;
}

.artwork-color-source {
  min-width: 0;
  padding: 0 8px;
  font-size: 11px;
}

.artwork-color-source:disabled {
  opacity: 0.48;
  cursor: wait;
}

.monet-source-preview {
  display: grid;
  min-width: 0;
  padding: 8px;
  grid-template-columns: 44px minmax(0, 1fr) 28px;
  align-items: center;
  gap: 9px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.025);
}

.monet-source-preview img {
  width: 44px;
  height: 34px;
  border-radius: 4px;
  object-fit: cover;
}

.monet-source-preview > span {
  overflow: hidden;
  color: rgba(255, 255, 255, 0.62);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.icon-action-button {
  display: inline-grid;
  width: 28px;
  height: 28px;
  padding: 0;
  place-items: center;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: rgba(255, 255, 255, 0.56);
  font-size: 18px;
  cursor: pointer;
}

.icon-action-button:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #f5f7fa;
}

.monet-scheme-grid {
  padding-top: 2px;
}

.section-note {
  color: rgba(255, 255, 255, 0.4);
  font-size: 11px;
}

.control-row,
.field-label,
.section-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.control-row label,
.control-field label,
.field-label span {
  color: rgba(255, 255, 255, 0.7);
  font-size: 13px;
}

.control-field {
  display: grid;
  gap: 8px;
}

.field-label span {
  color: #a7bdd3;
  font-family: Consolas, "Courier New", monospace;
}

.field-value-actions {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 5px;
}

.field-reset-button {
  display: inline-grid;
  width: 24px;
  height: 24px;
  flex: 0 0 auto;
  padding: 0;
  place-items: center;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: rgba(255, 255, 255, 0.42);
  cursor: pointer;
}

.field-reset-button:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #d9ff24;
}

.field-label .field-reset-button .mdi {
  color: inherit;
  font-family: "Material Design Icons";
  font-size: 17px;
}

.artwork-section.active {
  box-shadow: inset 3px 0 #d9ff24;
  background: rgba(217, 255, 36, 0.025);
}

.icon-control-item {
  display: grid;
  gap: 13px;
  padding: 15px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.09);
}

.icon-control-item:first-of-type {
  border-top: 0;
}

.icon-control-item.active {
  box-shadow: inset 3px 0 #d9ff24;
  padding-left: 12px;
}

.icon-control-item .section-title-row > strong {
  color: rgba(255, 255, 255, 0.74);
  font-size: 13px;
}

.upload-button {
  display: flex;
  min-width: 0;
  padding: 12px;
  align-items: center;
  gap: 11px;
  border: 1px dashed rgba(255, 255, 255, 0.22);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.03);
  cursor: pointer;
}

.upload-button:hover {
  border-color: rgba(217, 255, 36, 0.6);
}

.upload-button.disabled {
  opacity: 0.52;
  cursor: wait;
}

.upload-button > .mdi {
  flex: 0 0 auto;
  color: #b8d06d;
  font-size: 25px;
}

.upload-text {
  display: grid;
  min-width: 0;
  gap: 3px;
}

.upload-text strong,
.upload-text small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.upload-text strong {
  color: #f5f7fa;
  font-size: 13px;
}

.upload-text small {
  color: rgba(255, 255, 255, 0.44);
  font-size: 11px;
}

.upload-button input {
  display: none;
}

.artwork-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.small-button {
  height: 34px;
  font-size: 12px;
}

.small-button.danger {
  border-color: rgba(241, 108, 108, 0.34);
  color: #f4a2a2;
}

.control-section :deep(.el-input__wrapper),
.control-section :deep(.el-select__wrapper),
.control-section :deep(.el-textarea__inner) {
  background: #171c22;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.12) inset;
}

.control-section :deep(.el-input__inner),
.control-section :deep(.el-select__selected-item) {
  color: #f5f7fa;
}

.control-section :deep(.el-slider__runway) {
  background: rgba(255, 255, 255, 0.12);
}

.control-section :deep(.el-slider__bar) {
  background: #a8cf48;
}

.control-section :deep(.el-slider__button) {
  width: 16px;
  height: 16px;
  border-color: #a8cf48;
}

@media (max-width: 1180px) {
  .cover-maker-workspace {
    grid-template-columns: minmax(0, 1fr) 360px;
  }
}

@media (max-width: 900px) {
  .cover-maker-workspace {
    grid-template-columns: 1fr;
  }

  .control-panel {
    position: static;
    max-height: none;
  }

  .control-tabs {
    height: auto;
    min-height: 520px;
  }

  .control-tabs :deep(.el-tabs__content) {
    height: auto;
    max-height: 720px;
  }

  .preview-stage {
    min-height: 0;
  }
}

@media (max-width: 640px) {
  .cover-maker-page {
    padding: 12px;
  }

  .cover-maker-header {
    min-height: auto;
    align-items: flex-start;
  }

  .cover-maker-header h1 {
    font-size: 22px;
  }

  .action-button {
    width: 38px;
    padding: 0;
    font-size: 0;
  }

  .action-button .mdi {
    font-size: 18px;
  }

  .draft-status {
    display: none;
  }

  .preview-stage {
    padding: 12px;
  }

  .thumbnail-preview-section {
    padding: 14px 12px 16px;
  }

  .thumbnail-preview-grid {
    grid-template-columns: 1fr;
  }

  .preview-header-actions {
    gap: 7px;
  }

  .canvas-mode-switch button {
    min-width: 32px;
    padding: 0;
    font-size: 0;
  }

  .canvas-mode-switch .mdi {
    font-size: 17px;
  }

  .preview-guide-button {
    width: 32px;
    padding: 0;
    justify-content: center;
    font-size: 0;
  }

  .preview-size {
    font-size: 11px;
  }
}
</style>
