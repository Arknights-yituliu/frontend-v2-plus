<template>
  <div class="card-maker-page">
    <header class="card-maker-header">
      <p class="card-maker-kicker">LogicalByte</p>
      <h1>卡片生成器</h1>
      <p class="card-maker-description">创建由多个可配置卡片组成的组件</p>
    </header>

    <div class="card-maker-content">
      <!-- 左侧：样式调整区域 -->
      <aside class="card-maker-controls">
        <!-- 预设样式 -->
        <div class="control-section">
          <h3>预设样式</h3>
          <div class="preset-styles">
            <div
              v-for="preset in presets"
              :key="preset.name"
              class="preset-item"
              @click="applyPreset(preset)"
            >
              <div class="preset-preview">
                <div
                  class="preset-card"
                  :style="{
                    background: preset.useGradient ? `linear-gradient(${preset.gradientDirection}, ${preset.bgColor}, ${preset.bgColor2})` : preset.bgColor,
                    borderColor: preset.borderColor,
                    color: preset.textColor,
                    opacity: preset.bgOpacity
                  }"
                >
                  <span>{{ preset.name.slice(0, 2) }}</span>
                </div>
              </div>
              <span class="preset-name">{{ preset.name }}</span>
            </div>
          </div>
        </div>

        <!-- 分组尺寸设置 -->
        <div class="control-section">
          <h3>分组尺寸</h3>
          <div class="size-inputs">
            <el-input-number v-model="groupWidth" :min="50" :max="800" size="small" />
            <span>×</span>
            <el-input-number v-model="groupHeight" :min="20" :max="200" size="small" />
          </div>
          <div class="size-presets">
            <button class="size-preset-btn" @click="applySizePreset(320, 60)">视频标题 320×60</button>
            <button class="size-preset-btn" @click="applySizePreset(400, 80)">介绍卡片 400×80</button>
            <button class="size-preset-btn" @click="applySizePreset(500, 100)">详情卡片 500×100</button>
            <button class="size-preset-btn" @click="applySizePreset(600, 120)">大号卡片 600×120</button>
            <button class="size-preset-btn" @click="applySizePreset(280, 50)">紧凑型 280×50</button>
            <button class="size-preset-btn" @click="applySizePreset(350, 70)">中型 350×70</button>
          </div>
        </div>

        <div class="control-section">
          <h3>分组样式</h3>
          <div class="control-row">
            <div class="control-group inline">
              <label>背景色</label>
              <el-color-picker v-model="groupBgColor" size="small" />
            </div>
            <div class="control-group inline">
              <label>边框色</label>
              <el-color-picker v-model="groupBorderColor" size="small" />
            </div>
            <div class="control-group inline">
              <label>文字色</label>
              <el-color-picker v-model="groupTextColor" size="small" />
            </div>
          </div>
          <div class="control-row">
            <div class="control-group inline">
              <label>边框宽</label>
              <el-input-number v-model="groupBorderWidth" :min="0" :max="10" size="small" />
            </div>
            <div class="control-group inline">
              <label>圆角</label>
              <el-input-number v-model="groupBorderRadius" :min="0" :max="50" size="small" />
            </div>
          </div>
          <div class="control-row">
            <div class="control-group inline">
              <label>背景α</label>
              <el-input-number v-model="groupBgOpacity" :min="0" :max="1" :step="0.1" size="small" />
            </div>
            <div class="control-group inline">
              <label>文字α</label>
              <el-input-number v-model="groupTextOpacity" :min="0" :max="1" :step="0.1" size="small" />
            </div>
            <div class="control-group inline">
              <label>边框α</label>
              <el-input-number v-model="groupBorderOpacity" :min="0" :max="1" :step="0.1" size="small" />
            </div>
          </div>
          <div class="control-row">
            <div class="control-group inline">
              <label>渐变</label>
              <el-switch v-model="useGradient" size="small" />
            </div>
            <template v-if="useGradient">
              <div class="control-group inline">
                <label>渐变色2</label>
                <el-color-picker v-model="groupBgColor2" size="small" />
              </div>
              <div class="control-group inline">
                <label>方向</label>
                <el-select v-model="gradientDirection" size="small">
                  <el-option label="→" value="to right" />
                  <el-option label="←" value="to left" />
                  <el-option label="↓" value="to bottom" />
                  <el-option label="↘" value="to bottom right" />
                </el-select>
              </div>
            </template>
          </div>
          <div class="control-row">
            <div class="control-group inline">
              <label>左侧边框</label>
              <el-switch v-model="separateLeftBorder" size="small" />
            </div>
            <template v-if="separateLeftBorder">
              <div class="control-group inline">
                <label>左侧色</label>
                <el-color-picker v-model="groupBorderColorLeft" size="small" />
              </div>
              <div class="control-group inline">
                <label>左侧宽</label>
                <el-input-number v-model="groupBorderWidthLeft" :min="0" :max="10" size="small" />
              </div>
            </template>
          </div>
        </div>

        <!-- 单卡片设置 -->
        <div class="control-section">
          <h3>卡片设置</h3>
          <div class="control-group">
            <label>文本内容</label>
            <el-input v-model="cardText" placeholder="输入文本" />
          </div>
          <div class="control-group">
            <label>字体颜色</label>
            <el-color-picker v-model="cardTextColor" />
          </div>
          <div class="control-group">
            <label>字体大小 (px)</label>
            <el-input-number v-model="cardFontSize" :min="10" :max="72" />
          </div>
          <div class="control-group">
            <label>字体粗细</label>
            <el-select v-model="cardFontWeight">
              <el-option label="正常" value="normal" />
              <el-option label="中等" value="500" />
              <el-option label="粗体" value="bold" />
              <el-option label="更粗" value="800" />
            </el-select>
          </div>
          <div class="control-group">
            <label>文本对齐</label>
            <el-select v-model="cardTextAlign">
              <el-option label="左对齐" value="left" />
              <el-option label="居中" value="center" />
              <el-option label="右对齐" value="right" />
            </el-select>
          </div>
        </div>

        <div class="control-section">
          <h3>图标设置</h3>
          <div class="control-group">
            <label>启用图标</label>
            <el-switch v-model="cardShowIcon" />
          </div>
          <template v-if="cardShowIcon">
            <div class="control-group">
              <label>图标类型</label>
              <el-select v-model="cardIconType">
                <el-option label="无" value="none" />
                <el-option label="图片 URL" value="image" />
                <el-option label="Emoji" value="emoji" />
                <el-option label="文字图标" value="text" />
              </el-select>
            </div>
            <template v-if="cardIconType === 'image'">
              <div class="control-group">
                <label>图片 URL</label>
                <el-input v-model="cardIconImage" placeholder="https://..." />
              </div>
            </template>
            <template v-else-if="cardIconType === 'emoji'">
              <div class="control-group">
                <label>Emoji</label>
                <el-input v-model="cardIconEmoji" placeholder="🌟" maxlength="2" />
              </div>
            </template>
            <template v-else-if="cardIconType === 'text'">
              <div class="control-group">
                <label>文字图标</label>
                <el-input v-model="cardIconText" placeholder="★" />
              </div>
            </template>
            <div class="control-group">
              <label>图标大小 (px)</label>
              <el-input-number v-model="cardIconSize" :min="16" :max="128" />
            </div>
            <div class="control-group">
              <label>图标位置</label>
              <el-select v-model="cardIconPosition">
                <el-option label="顶部" value="top" />
                <el-option label="左侧" value="left" />
                <el-option label="右侧" value="right" />
              </el-select>
            </div>
          </template>
        </div>
      </aside>

      <!-- 右侧：绘图区域 -->
      <main class="card-maker-preview">
        <div class="preview-actions">
          <el-button type="primary" @click="exportAllCards">导出所有卡片</el-button>
          <el-button type="success" @click="exportSingleCardPng">导出选中卡片</el-button>
          <el-button @click="exportConfig">导出配置</el-button>
          <el-button @click="resetAll">重置</el-button>
        </div>

        <div class="preview-canvas">
          <div
            v-for="(group, gIndex) in groups"
            :key="gIndex"
            class="group-container"
            :class="{ selected: selectedGroupIndex === gIndex }"
          >
            <div class="group-header">
              <span class="group-name">{{ group.name }}</span>
              <div class="group-actions">
                <el-button type="primary" size="small" link @click="addCardToGroup(gIndex)">
                  +卡片
                </el-button>
                <el-button type="danger" size="small" link @click="removeGroup(gIndex)">
                  删除分组
                </el-button>
              </div>
            </div>
            <div class="group-cards">
              <div
                v-for="(card, cIndex) in group.cards"
                :key="cIndex"
                class="preview-card-wrapper"
                :class="{ 'has-selection': selectedGroupIndex === gIndex && selectedCardIndex === cIndex }"
              >
                <div
                  class="preview-card"
                  :style="getCardStyle(card, group)"
                  @click="selectCard(gIndex, cIndex)"
                >
                  <div v-if="card.showIcon" class="card-icon">
                    <img v-if="card.iconType === 'image'" :src="card.iconImage" alt="icon" />
                    <span v-else-if="card.iconType === 'emoji'" class="emoji-icon">{{ card.iconEmoji }}</span>
                    <span v-else-if="card.iconType === 'text'" class="text-icon">{{ card.iconText }}</span>
                  </div>
                  <div v-if="card.text" class="card-text" :style="getTextStyle(card)">
                    {{ card.text }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 添加分组按钮 -->
          <div class="add-group-btn" @click="addGroup">
            <span>+ 添加分组</span>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'

// 预设样式
const presets = [
  {
    name: '霓虹赛博',
    bgColor: '#0a0a0f',
    bgColor2: '#1a1a2e',
    bgOpacity: 1,
    borderColor: '#00ff88',
    borderWidth: 2,
    borderRadius: 4,
    textColor: '#00ff88',
    useGradient: true,
    gradientDirection: 'to bottom right',
    separateLeftBorder: true,
    borderColorLeft: '#00ff88',
    borderWidthLeft: 4,
    glowColor: '#00ff88',
    hasGlow: true
  },
  {
    name: '奶油蛋糕',
    bgColor: '#fff5e6',
    bgColor2: '#ffe4c4',
    bgOpacity: 1,
    borderColor: '#d4a574',
    borderWidth: 1,
    borderRadius: 12,
    textColor: '#8b4513',
    useGradient: true,
    gradientDirection: 'to bottom',
    separateLeftBorder: false,
    borderColorLeft: '#d4a574',
    borderWidthLeft: 1,
    glowColor: 'transparent',
    hasGlow: false
  },
  {
    name: '蒸汽朋克',
    bgColor: '#2c1810',
    bgColor2: '#4a3728',
    bgOpacity: 1,
    borderColor: '#cd7f32',
    borderWidth: 3,
    borderRadius: 2,
    textColor: '#ffd700',
    useGradient: true,
    gradientDirection: 'to right',
    separateLeftBorder: true,
    borderColorLeft: '#cd7f32',
    borderWidthLeft: 6,
    glowColor: 'transparent',
    hasGlow: false
  },
  {
    name: '极光幻影',
    bgColor: '#0f2027',
    bgColor2: '#2c5364',
    bgOpacity: 0.95,
    borderColor: '#4facfe',
    borderWidth: 1,
    borderRadius: 8,
    textColor: '#ffffff',
    useGradient: true,
    gradientDirection: 'to bottom',
    separateLeftBorder: false,
    borderColorLeft: '#4facfe',
    borderWidthLeft: 1,
    glowColor: 'transparent',
    hasGlow: false
  },
  {
    name: '糖果梦幻',
    bgColor: '#ffeef8',
    bgColor2: '#fff0f5',
    bgOpacity: 0.9,
    borderColor: '#ff69b4',
    borderWidth: 2,
    borderRadius: 20,
    textColor: '#c71585',
    useGradient: true,
    gradientDirection: 'to right',
    separateLeftBorder: false,
    borderColorLeft: '#ff69b4',
    borderWidthLeft: 2,
    glowColor: 'transparent',
    hasGlow: false
  },
  {
    name: '钢铁战士',
    bgColor: '#434343',
    bgColor2: '#1c1c1c',
    bgOpacity: 1,
    borderColor: '#717171',
    borderWidth: 2,
    borderRadius: 0,
    textColor: '#e0e0e0',
    useGradient: true,
    gradientDirection: 'to bottom',
    separateLeftBorder: true,
    borderColorLeft: '#e0e0e0',
    borderWidthLeft: 3,
    glowColor: 'transparent',
    hasGlow: false
  },
  {
    name: '故障艺术',
    bgColor: '#0d0221',
    bgColor2: '#1a0533',
    bgOpacity: 1,
    borderColor: '#ff00ff',
    borderWidth: 1,
    borderRadius: 0,
    textColor: '#00ffff',
    useGradient: true,
    gradientDirection: 'to right',
    separateLeftBorder: true,
    borderColorLeft: '#ff00ff',
    borderWidthLeft: 3,
    glowColor: '#ff00ff',
    hasGlow: true,
    glitchEffect: true
  },
  {
    name: '光晕玻璃',
    bgColor: 'rgba(255, 255, 255, 0.15)',
    bgColor2: 'rgba(255, 255, 255, 0.05)',
    bgOpacity: 0.8,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderWidth: 1,
    borderRadius: 16,
    textColor: '#ffffff',
    useGradient: false,
    gradientDirection: 'to bottom',
    separateLeftBorder: false,
    borderColorLeft: 'rgba(255, 255, 255, 0.3)',
    borderWidthLeft: 1,
    glowColor: 'rgba(255, 255, 255, 0.5)',
    hasGlow: true,
    glassEffect: true
  },
  {
    name: '日落余晖',
    bgColor: '#2d1b69',
    bgColor2: '#ff6b35',
    bgOpacity: 1,
    borderColor: '#ffd700',
    borderWidth: 2,
    borderRadius: 12,
    textColor: '#ffffff',
    useGradient: true,
    gradientDirection: '135deg',
    separateLeftBorder: true,
    borderColorLeft: '#ff6b35',
    borderWidthLeft: 4,
    glowColor: 'transparent',
    hasGlow: false
  },
  {
    name: '科技蓝光',
    bgColor: '#0a1628',
    bgColor2: '#1e3a5f',
    bgOpacity: 1,
    borderColor: '#00d4ff',
    borderWidth: 2,
    borderRadius: 6,
    textColor: '#e0f7ff',
    useGradient: true,
    gradientDirection: 'to bottom right',
    separateLeftBorder: true,
    borderColorLeft: '#00d4ff',
    borderWidthLeft: 3,
    glowColor: '#00d4ff',
    hasGlow: true,
    circuitPattern: true
  },
  {
    name: '极光流动',
    bgColor: '#0f0c29',
    bgColor2: '#302b63',
    bgOpacity: 1,
    borderColor: '#00ff88',
    borderWidth: 1,
    borderRadius: 20,
    textColor: '#ffffff',
    useGradient: true,
    gradientDirection: '45deg',
    separateLeftBorder: true,
    borderColorLeft: '#00ff88',
    borderWidthLeft: 3,
    glowColor: '#00ff88',
    hasGlow: true,
    auroraEffect: true
  },
  {
    name: '暗夜极光',
    bgColor: '#0f0c29',
    bgColor2: '#24243e',
    bgOpacity: 1,
    borderColor: '#8b5cf6',
    borderWidth: 2,
    borderRadius: 12,
    textColor: '#f0f0ff',
    useGradient: true,
    gradientDirection: 'to bottom',
    separateLeftBorder: true,
    borderColorLeft: '#a855f7',
    borderWidthLeft: 4,
    glowColor: '#8b5cf6',
    hasGlow: true
  },
  {
    name: '金属质感',
    bgColor: '#2c3e50',
    bgColor2: '#4a6572',
    bgOpacity: 1,
    borderColor: '#95a5a6',
    borderWidth: 2,
    borderRadius: 4,
    textColor: '#ecf0f1',
    useGradient: true,
    gradientDirection: 'to bottom',
    separateLeftBorder: true,
    borderColorLeft: '#bdc3c7',
    borderWidthLeft: 4,
    glowColor: 'transparent',
    hasGlow: false,
    metallicEffect: true
  },
  {
    name: '可爱粉嫩',
    bgColor: '#ffecd2',
    bgColor2: '#fcb69f',
    bgOpacity: 1,
    borderColor: '#ff9a9e',
    borderWidth: 2,
    borderRadius: 25,
    textColor: '#c44569',
    useGradient: true,
    gradientDirection: 'to right',
    separateLeftBorder: false,
    borderColorLeft: '#ff9a9e',
    borderWidthLeft: 2,
    glowColor: 'transparent',
    hasGlow: false
  },
  {
    name: '像素复古',
    bgColor: '#1a1a2e',
    bgColor2: '#16213e',
    bgOpacity: 1,
    borderColor: '#e94560',
    borderWidth: 4,
    borderRadius: 0,
    textColor: '#e94560',
    useGradient: true,
    gradientDirection: 'to bottom',
    separateLeftBorder: true,
    borderColorLeft: '#0f3460',
    borderWidthLeft: 8,
    glowColor: 'transparent',
    hasGlow: false,
    pixelEffect: true
  },
  {
    name: '浮雕质感',
    bgColor: '#f5f5f5',
    bgColor2: '#e0e0e0',
    bgOpacity: 1,
    borderColor: '#999999',
    borderWidth: 1,
    borderRadius: 8,
    textColor: '#333333',
    useGradient: true,
    gradientDirection: 'to bottom right',
    separateLeftBorder: false,
    borderColorLeft: '#999999',
    borderWidthLeft: 1,
    glowColor: 'transparent',
    hasGlow: false,
    embossEffect: true
  },
  {
    name: '热血火焰',
    bgColor: '#1a0000',
    bgColor2: '#4a0000',
    bgOpacity: 1,
    borderColor: '#ff4500',
    borderWidth: 2,
    borderRadius: 8,
    textColor: '#ffdd00',
    useGradient: true,
    gradientDirection: 'to top',
    separateLeftBorder: true,
    borderColorLeft: '#ff6600',
    borderWidthLeft: 5,
    glowColor: '#ff4500',
    hasGlow: true
  },
  {
    name: '清新薄荷',
    bgColor: '#a8edea',
    bgColor2: '#fed6e3',
    bgOpacity: 0.9,
    borderColor: '#00b894',
    borderWidth: 2,
    borderRadius: 18,
    textColor: '#2d3436',
    useGradient: true,
    gradientDirection: '135deg',
    separateLeftBorder: true,
    borderColorLeft: '#00cec9',
    borderWidthLeft: 4,
    glowColor: 'transparent',
    hasGlow: false
  },
  {
    name: '全息幻彩',
    bgColor: '#1a1a2e',
    bgColor2: '#16213e',
    bgOpacity: 1,
    borderColor: '#a855f7',
    borderWidth: 2,
    borderRadius: 12,
    textColor: '#ffffff',
    useGradient: true,
    gradientDirection: '45deg',
    separateLeftBorder: true,
    borderColorLeft: '#ec4899',
    borderWidthLeft: 4,
    glowColor: '#a855f7',
    hasGlow: true,
    holographicEffect: true
  },
  {
    name: '暗黑优雅',
    bgColor: '#0d0d0d',
    bgColor2: '#1a1a1a',
    bgOpacity: 1,
    borderColor: '#404040',
    borderWidth: 1,
    borderRadius: 4,
    textColor: '#cccccc',
    useGradient: true,
    gradientDirection: 'to bottom',
    separateLeftBorder: true,
    borderColorLeft: '#666666',
    borderWidthLeft: 2,
    glowColor: 'transparent',
    hasGlow: false
  }
]

// 响应式变量
const useGradient = ref(false)
const groupBgColor2 = ref('#ffffff')
const gradientDirection = ref('to right')
const groupBorderWidth = ref(2)
const groupBorderRadius = ref(8)
const groupBgOpacity = ref(1)
const groupTextOpacity = ref(1)
const groupBorderOpacity = ref(1)
const separateLeftBorder = ref(false)
const groupBorderColorLeft = ref('#4f67c6')
const groupBorderWidthLeft = ref(4)

const groupWidth = ref(300)
const groupHeight = ref(40)
const groupBgColor = ref('#f0f4ff')
const groupBorderColor = ref('#4f67c6')
const groupTextColor = ref('#182033')

const cardText = ref('新卡片')
const cardTextColor = ref('#182033')
const cardFontSize = ref(21)
const cardFontWeight = ref('bold')
const cardTextAlign = ref('center')
const cardShowIcon = ref(false)
const cardIconType = ref('none')
const cardIconImage = ref('')
const cardIconEmoji = ref('')
const cardIconText = ref('')
const cardIconSize = ref(24)
const cardIconPosition = ref('left')

// 应用预设样式
const applyPreset = (preset) => {
  groupBgColor.value = preset.bgColor
  groupBgColor2.value = preset.bgColor2 || preset.bgColor
  groupBgOpacity.value = preset.bgOpacity
  groupBorderColor.value = preset.borderColor
  groupBorderWidth.value = preset.borderWidth
  groupBorderRadius.value = preset.borderRadius
  groupTextColor.value = preset.textColor
  useGradient.value = preset.useGradient
  gradientDirection.value = preset.gradientDirection
  separateLeftBorder.value = preset.separateLeftBorder
  groupBorderColorLeft.value = preset.borderColorLeft
  groupBorderWidthLeft.value = preset.borderWidthLeft
  ElMessage.success(`已应用「${preset.name}」预设`)
}

// 应用尺寸预设
const applySizePreset = (width, height) => {
  groupWidth.value = width
  groupHeight.value = height
  ElMessage.success(`已调整为 ${width}×${height}`)
}

const createCard = () => ({
  text: '新卡片',
  textColor: '#182033',
  fontSize: 21,
  fontWeight: 'bold',
  textAlign: 'center',
  showIcon: false,
  iconType: 'none',
  iconImage: '',
  iconEmoji: '',
  iconText: '',
  iconSize: 24,
  iconPosition: 'left'
})

const createGroup = (name = '分组', preset = null) => {
  const config = preset || {
    bgColor: '#f0f4ff',
    bgColor2: '#f0f4ff',
    bgOpacity: 1,
    borderColor: '#4f67c6',
    borderWidth: 2,
    borderRadius: 8,
    textColor: '#182033',
    useGradient: false,
    gradientDirection: 'to right',
    separateLeftBorder: false,
    borderColorLeft: '#4f67c6',
    borderWidthLeft: 4
  }
  return {
    name,
    width: 300,
    height: 40,
    backgroundColor: config.bgColor,
    backgroundColor2: config.bgColor2 || config.bgColor,
    bgOpacity: config.bgOpacity,
    useGradient: config.useGradient,
    gradientDirection: config.gradientDirection,
    borderColor: config.borderColor,
    borderWidth: config.borderWidth,
    borderRadius: config.borderRadius,
    textColor: config.textColor,
    separateLeftBorder: config.separateLeftBorder,
    borderColorLeft: config.borderColorLeft,
    borderWidthLeft: config.borderWidthLeft,
    cards: [createCard()]
  }
}

const defaultPresets = presets.map((p, i) => createGroup(`预设 ${i + 1}`, p))

const groups = ref(defaultPresets)
const selectedGroupIndex = ref(0)
const selectedCardIndex = ref(0)

const syncGroupStyleToCards = () => {
  const gIdx = selectedGroupIndex.value
  if (gIdx < 0 || gIdx >= groups.value.length) return
  const group = groups.value[gIdx]
  group.width = groupWidth.value
  group.height = groupHeight.value
  group.backgroundColor = groupBgColor.value
  group.backgroundColor2 = groupBgColor2.value
  group.bgOpacity = groupBgOpacity.value
  group.textOpacity = groupTextOpacity.value
  group.borderOpacity = groupBorderOpacity.value
  group.useGradient = useGradient.value
  group.gradientDirection = gradientDirection.value
  group.borderColor = groupBorderColor.value
  group.borderWidth = groupBorderWidth.value
  group.borderRadius = groupBorderRadius.value
  group.textColor = groupTextColor.value
  group.separateLeftBorder = separateLeftBorder.value
  group.borderColorLeft = groupBorderColorLeft.value
  group.borderWidthLeft = groupBorderWidthLeft.value
  
  group.cards.forEach(card => {
    card.backgroundColor = groupBgColor.value
    card.backgroundColor2 = groupBgColor2.value
    card.bgOpacity = groupBgOpacity.value
    card.textOpacity = groupTextOpacity.value
    card.borderOpacity = groupBorderOpacity.value
    card.useGradient = useGradient.value
    card.gradientDirection = gradientDirection.value
    card.borderColor = groupBorderColor.value
    card.borderWidth = groupBorderWidth.value
    card.borderRadius = groupBorderRadius.value
    card.textColor = groupTextColor.value
    card.separateLeftBorder = separateLeftBorder.value
    card.borderColorLeft = groupBorderColorLeft.value
    card.borderWidthLeft = groupBorderWidthLeft.value
  })
}

const syncCardStyle = () => {
  const gIdx = selectedGroupIndex.value
  const cIdx = selectedCardIndex.value
  if (gIdx < 0 || gIdx >= groups.value.length) return
  const group = groups.value[gIdx]
  if (cIdx < 0 || cIdx >= group.cards.length) return
  const card = group.cards[cIdx]
  card.text = cardText.value
  card.textColor = cardTextColor.value
  card.fontSize = cardFontSize.value
  card.fontWeight = cardFontWeight.value
  card.textAlign = cardTextAlign.value
  card.showIcon = cardShowIcon.value
  card.iconType = cardIconType.value
  card.iconImage = cardIconImage.value
  card.iconEmoji = cardIconEmoji.value
  card.iconText = cardIconText.value
  card.iconSize = cardIconSize.value
  card.iconPosition = cardIconPosition.value
}

watch([groupWidth, groupHeight, groupBgColor, groupBgColor2, groupBgOpacity, useGradient, gradientDirection, groupBorderColor, groupBorderWidth, groupBorderRadius, groupTextColor, separateLeftBorder, groupBorderColorLeft, groupBorderWidthLeft], syncGroupStyleToCards)
watch([cardText, cardTextColor, cardFontSize, cardFontWeight, cardTextAlign, cardShowIcon, cardIconType, cardIconImage, cardIconEmoji, cardIconText, cardIconSize, cardIconPosition], syncCardStyle)

const selectCard = (gIndex, cIndex) => {
  selectedGroupIndex.value = gIndex
  selectedCardIndex.value = cIndex
}

const addGroup = () => {
  groups.value.push(createGroup(`分组 ${groups.value.length + 1}`))
  selectedGroupIndex.value = groups.value.length - 1
  selectedCardIndex.value = 0
}

const removeGroup = (gIndex) => {
  groups.value.splice(gIndex, 1)
  if (groups.value.length === 0) {
    groups.value.push(createGroup('分组 1'))
  }
  if (selectedGroupIndex.value >= groups.value.length) {
    selectedGroupIndex.value = groups.value.length - 1
  }
  if (selectedCardIndex.value >= groups.value[selectedGroupIndex.value].cards.length) {
    selectedCardIndex.value = groups.value[selectedGroupIndex.value].cards.length - 1
  }
}

const addCardToGroup = (gIndex) => {
  const group = groups.value[gIndex]
  const newCard = createCard()
  newCard.backgroundColor = group.backgroundColor
  newCard.backgroundColor2 = group.backgroundColor2
  newCard.bgOpacity = group.bgOpacity
  newCard.textOpacity = group.textOpacity
  newCard.borderOpacity = group.borderOpacity
  newCard.useGradient = group.useGradient
  newCard.gradientDirection = group.gradientDirection
  newCard.borderColor = group.borderColor
  newCard.borderWidth = group.borderWidth
  newCard.borderRadius = group.borderRadius
  newCard.textColor = group.textColor
  newCard.separateLeftBorder = group.separateLeftBorder
  newCard.borderColorLeft = group.borderColorLeft
  newCard.borderWidthLeft = group.borderWidthLeft
  group.cards.push(newCard)
  selectedGroupIndex.value = gIndex
  selectedCardIndex.value = group.cards.length - 1
}

const getCardStyle = (card, group) => {
  const bgStyle = card.useGradient
    ? `linear-gradient(${card.gradientDirection}, ${card.backgroundColor}, ${card.backgroundColor2})`
    : card.backgroundColor

  const baseStyle = {
    width: group.width + 'px',
    height: group.height + 'px',
    background: bgStyle,
    opacity: card.bgOpacity,
    border: `${card.borderWidth}px solid ${card.borderColor}`,
    borderRadius: card.borderRadius + 'px',
    padding: '0 16px',
    display: 'flex',
    flexDirection: card.iconPosition === 'left' || card.iconPosition === 'right' ? 'row' : 'column',
    alignItems: 'center',
    justifyContent: card.textAlign === 'left' ? 'flex-start' : card.textAlign === 'right' ? 'flex-end' : 'center',
    gap: '8px',
    boxSizing: 'border-box',
    position: 'relative'
  }

  if (card.separateLeftBorder) {
    baseStyle.borderLeft = `${card.borderWidthLeft}px solid ${card.borderColorLeft}`
  }

  return baseStyle
}

const getTextStyle = (card) => ({
  color: card.textColor,
  opacity: card.textOpacity,
  fontSize: card.fontSize + 'px',
  fontWeight: card.fontWeight,
  textAlign: card.textAlign,
  whiteSpace: 'nowrap'
})

const exportConfig = () => {
  const config = { groups: groups.value }
  const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'card-config.json'
  a.click()
  ElMessage.success('配置已导出')
}

const exportAllCards = async () => {
  const { default: html2canvas } = await import('html2canvas')
  try {
    const cards = document.querySelectorAll('.preview-card')
    for (let i = 0; i < cards.length; i++) {
      const result = await html2canvas(cards[i], { backgroundColor: null, scale: 2 })
      const a = document.createElement('a')
      a.href = result.toDataURL('image/png')
      a.download = `card-${i + 1}.png`
      a.click()
      await new Promise((r) => setTimeout(r, 200))
    }
    ElMessage.success('所有卡片已导出')
  } catch (e) {
    ElMessage.error('导出失败: ' + e.message)
  }
}

const exportSingleCardPng = async () => {
  const { default: html2canvas } = await import('html2canvas')
  const elements = document.querySelectorAll('.preview-card')
  let index = 0
  for (let g = 0; g < selectedGroupIndex.value; g++) {
    index += groups.value[g].cards.length
  }
  index += selectedCardIndex.value
  try {
    const result = await html2canvas(elements[index], { backgroundColor: null, scale: 2 })
    const a = document.createElement('a')
    a.href = result.toDataURL('image/png')
    a.download = `card-${index + 1}.png`
    a.click()
    ElMessage.success('透明PNG已导出')
  } catch (e) {
    ElMessage.error('导出失败: ' + e.message)
  }
}

const resetAll = () => {
  groups.value = defaultPresets.map((p, i) => createGroup(`预设 ${i + 1}`, p))
  selectedGroupIndex.value = 0
  selectedCardIndex.value = 0
  groupWidth.value = 300
  groupHeight.value = 40
  groupBgColor.value = '#f0f4ff'
  groupBgColor2.value = '#ffffff'
  groupBgOpacity.value = 1
  useGradient.value = false
  gradientDirection.value = 'to right'
  groupBorderColor.value = '#4f67c6'
  groupBorderWidth.value = 2
  groupBorderRadius.value = 8
  groupTextColor.value = '#182033'
  separateLeftBorder.value = false
  groupBorderColorLeft.value = '#4f67c6'
  groupBorderWidthLeft.value = 4
  cardText.value = '新卡片'
  cardTextColor.value = '#182033'
  cardFontSize.value = 14
  cardFontWeight.value = 'normal'
  cardTextAlign.value = 'center'
  cardShowIcon.value = false
  ElMessage.success('已重置')
}
</script>

<style scoped>
.card-maker-page {
  min-height: 100vh;
  padding: 24px;
  background: linear-gradient(180deg, #f6f8fc 0%, #eef2f9 100%);
}

.card-maker-header {
  max-width: 960px;
  margin: 0 auto 24px;
}

.card-maker-kicker {
  margin: 0 0 8px;
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #4f67c6;
}

.card-maker-header h1 {
  margin: 0 0 8px;
  font-size: clamp(1.5rem, 4vw, 2.5rem);
  color: #182033;
}

.card-maker-description {
  margin: 0;
  color: #55607a;
}

.card-maker-content {
  max-width: 1600px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 400px 1fr;
  gap: 24px;
}

.card-maker-controls {
  background: rgba(255, 255, 255, 0.92);
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 18px 40px rgba(24, 32, 51, 0.08);
  max-height: calc(100vh - 120px);
  overflow-y: auto;
}

.control-section {
  margin-bottom: 24px;
}

.control-section:last-child {
  margin-bottom: 0;
}

.control-section h3 {
  margin: 0 0 12px;
  font-size: 0.95rem;
  color: #182033;
  font-weight: 600;
}

.control-group {
  margin-bottom: 12px;
}

.control-group.inline {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  margin-right: 12px;
  margin-bottom: 8px;
}

.control-group.inline label {
  margin-bottom: 2px;
  font-size: 0.7rem;
}

.control-group label {
  display: block;
  margin-bottom: 6px;
  font-size: 0.85rem;
  color: #55607a;
}

.control-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  margin-bottom: 8px;
}

.size-inputs {
  display: flex;
  align-items: center;
  gap: 8px;
}

.preset-styles {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
}

.preset-item {
  padding: 6px;
  border-radius: 8px;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.18s ease;
}

.preset-item:hover {
  border-color: #4f67c6;
  transform: scale(1.05);
}

.preset-preview {
  margin-bottom: 4px;
}

.preset-card {
  width: 100%;
  height: 32px;
  border-radius: 4px;
  border: 2px solid;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: bold;
}

.preset-name {
  font-size: 0.65rem;
  color: #55607a;
  display: block;
  text-align: center;
}

.card-maker-preview {
  background: rgba(255, 255, 255, 0.92);
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 18px 40px rgba(24, 32, 51, 0.08);
}

.preview-actions {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.preview-canvas {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 400px;
  background: #f8f9fa;
  border-radius: 8px;
  padding: 16px;
}

.group-container {
  padding: 16px;
  background: rgba(79, 103, 198, 0.05);
  border-radius: 12px;
  border: 2px solid transparent;
  transition: all 0.18s ease;
}

.group-container.selected {
  border-color: #4f67c6;
  background: rgba(79, 103, 198, 0.1);
}

.group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.group-name {
  font-weight: 600;
  color: #182033;
}

.group-actions {
  display: flex;
  gap: 8px;
}

.group-cards {
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  gap: 16px;
}

.preview-card-wrapper {
  position: relative;
}

.preview-card-wrapper.has-selection::after {
  content: '';
  position: absolute;
  top: 0;
  right: -8px;
  width: 4px;
  height: 100%;
  background: #4f67c6;
  border-radius: 2px;
}

.preview-card {
  cursor: pointer;
  transition: all 0.18s ease;
}

.preview-card:hover {
  filter: brightness(1.1);
}

.card-icon {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-shrink: 0;
}

.card-icon img {
  max-width: 100%;
  max-height: 100%;
}

.emoji-icon, .text-icon {
  font-size: inherit;
}

.card-text {
  overflow: hidden;
  text-overflow: ellipsis;
}

.add-group-btn {
  padding: 20px;
  border: 2px dashed #ccc;
  border-radius: 12px;
  text-align: center;
  cursor: pointer;
  color: #888;
  transition: all 0.18s ease;
}

.add-group-btn:hover {
  border-color: #4f67c6;
  color: #4f67c6;
  background: rgba(79, 103, 198, 0.05);
}

@media (max-width: 1024px) {
  .card-maker-content {
    grid-template-columns: 1fr;
  }
  .card-maker-controls {
    max-height: none;
  }
}

@media (max-width: 768px) {
  .card-maker-page {
    padding: 16px;
  }
  .preset-styles {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* 预设卡片效果样式 */
.preset-card.neon-glow {
  box-shadow: 0 0 10px var(--glow-color, #00ff88), 0 0 20px var(--glow-color, #00ff88);
}

.preset-card.glass-effect {
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.preset-card.metallic-effect {
  background: linear-gradient(135deg, #2c3e50 0%, #4a6572 50%, #2c3e50 100%);
  background-size: 200% 200%;
}

.preset-card.pixel-effect {
  image-rendering: pixelated;
  border-width: 4px;
  box-shadow: 
    inset -2px -2px 0 rgba(0,0,0,0.3),
    inset 2px 2px 0 rgba(255,255,255,0.1);
}

.preset-card.emboss-effect {
  box-shadow: 
    inset 2px 2px 4px rgba(255,255,255,0.8),
    inset -2px -2px 4px rgba(0,0,0,0.2);
  border: 1px solid #cccccc;
}

.preset-card.aurora-effect {
  position: relative;
  overflow: hidden;
}

.preset-card.aurora-effect::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: linear-gradient(
    45deg,
    transparent 40%,
    rgba(0, 255, 136, 0.1) 50%,
    transparent 60%
  );
  animation: aurora-shine 3s ease-in-out infinite;
}

.preset-card.holographic-effect {
  background: linear-gradient(
    135deg,
    #1a1a2e 0%,
    #16213e 25%,
    #0f3460 50%,
    #16213e 75%,
    #1a1a2e 100%
  );
  background-size: 400% 400%;
  animation: holo-shift 4s ease infinite;
}

.preset-card.circuit-pattern {
  background-image: 
    linear-gradient(90deg, rgba(0, 212, 255, 0.05) 1px, transparent 1px),
    linear-gradient(rgba(0, 212, 255, 0.05) 1px, transparent 1px);
  background-size: 20px 20px;
}

.preset-card.glitch-effect {
  position: relative;
  animation: glitch-skew 1s infinite linear alternate-reverse;
}

.preset-card.glitch-effect::before,
.preset-card.glitch-effect::after {
  content: attr(data-text);
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preset-card.glitch-effect::before {
  color: #ff00ff;
  animation: glitch-1 0.3s infinite linear alternate-reverse;
  clip-path: polygon(0 0, 100% 0, 100% 45%, 0 45%);
}

.preset-card.glitch-effect::after {
  color: #00ffff;
  animation: glitch-2 0.3s infinite linear alternate-reverse;
  clip-path: polygon(0 55%, 100% 55%, 100% 100%, 0 100%);
}

/* 关键帧动画 */
@keyframes aurora-shine {
  0% { transform: translateX(-30%) translateY(-30%) rotate(0deg); }
  100% { transform: translateX(30%) translateY(30%) rotate(360deg); }
}

@keyframes holo-shift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

@keyframes glitch-1 {
  0% { transform: translateX(0); }
  20% { transform: translateX(-3px); }
  40% { transform: translateX(3px); }
  60% { transform: translateX(-1px); }
  80% { transform: translateX(2px); }
  100% { transform: translateX(0); }
}

@keyframes glitch-2 {
  0% { transform: translateX(0); }
  20% { transform: translateX(3px); }
  40% { transform: translateX(-3px); }
  60% { transform: translateX(1px); }
  80% { transform: translateX(-2px); }
  100% { transform: translateX(0); }
}

@keyframes glitch-skew {
  0% { transform: skew(0deg); }
  10% { transform: skew(1deg); }
  20% { transform: skew(-1deg); }
  30% { transform: skew(0.5deg); }
  40% { transform: skew(-0.5deg); }
  50% { transform: skew(0deg); }
  100% { transform: skew(0deg); }
}

/* 预览卡片动画效果 */
.preview-card.neon-glow {
  box-shadow: 0 0 15px var(--glow-color, #00ff88), 0 0 30px var(--glow-color, #00ff88);
}

.preview-card.glass-effect {
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.25);
  background: rgba(255, 255, 255, 0.1) !important;
}

.preview-card.metallic-effect {
  background: linear-gradient(135deg, #2c3e50 0%, #4a6572 50%, #2c3e50 100%) !important;
  background-size: 200% 200% !important;
  animation: metallic-shine 3s ease infinite;
}

.preview-card.pixel-effect {
  image-rendering: pixelated !important;
  border-width: 4px !important;
  box-shadow: 
    inset -3px -3px 0 rgba(0,0,0,0.4),
    inset 3px 3px 0 rgba(255,255,255,0.15) !important;
}

.preview-card.emboss-effect {
  box-shadow: 
    inset 3px 3px 6px rgba(255,255,255,0.9),
    inset -3px -3px 6px rgba(0,0,0,0.25) !important;
  border: 1px solid #bbbbbb !important;
}

.preview-card.aurora-effect::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: linear-gradient(
    45deg,
    transparent 40%,
    rgba(0, 255, 136, 0.15) 50%,
    transparent 60%
  );
  animation: aurora-shine 3s ease-in-out infinite;
  pointer-events: none;
}

.preview-card.holographic-effect {
  background: linear-gradient(
    135deg,
    #1a1a2e 0%,
    #16213e 25%,
    #0f3460 50%,
    #16213e 75%,
    #1a1a2e 100%
  ) !important;
  background-size: 400% 400% !important;
  animation: holo-shift 4s ease infinite !important;
}

.preview-card.circuit-pattern {
  background-image: 
    linear-gradient(90deg, rgba(0, 212, 255, 0.08) 1px, transparent 1px),
    linear-gradient(rgba(0, 212, 255, 0.08) 1px, transparent 1px) !important;
  background-size: 20px 20px !important;
}

.preview-card.glitch-effect {
  animation: glitch-skew 1s infinite linear alternate-reverse !important;
}

.preview-card.fire-glow {
  box-shadow: 
    0 0 10px rgba(255, 69, 0, 0.5),
    0 0 20px rgba(255, 69, 0, 0.3),
    0 0 30px rgba(255, 102, 0, 0.2);
}

@keyframes metallic-shine {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

/* 卡片尺寸调整按钮 */
.size-presets {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 8px;
}

.size-preset-btn {
  padding: 4px 12px;
  font-size: 0.75rem;
  border: 1px solid #d0d7de;
  border-radius: 12px;
  background: #f6f8fa;
  cursor: pointer;
  transition: all 0.15s ease;
}

.size-preset-btn:hover {
  background: #e8ecf0;
  border-color: #4f67c6;
}

/* 导出设置面板 */
.export-options {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.export-options label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.85rem;
  color: #55607a;
  cursor: pointer;
}

.export-options input[type="number"] {
  width: 60px;
  padding: 4px 8px;
  border: 1px solid #d0d7de;
  border-radius: 4px;
}
</style>
