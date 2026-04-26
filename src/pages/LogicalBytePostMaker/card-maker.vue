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
    borderWidthLeft: 4
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
    borderWidthLeft: 1
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
    borderWidthLeft: 6
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
    borderWidthLeft: 1
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
    borderWidthLeft: 2
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
    borderWidthLeft: 3
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
const cardFontSize = ref(14)
const cardFontWeight = ref('normal')
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

const createCard = () => ({
  text: '新卡片',
  textColor: '#182033',
  fontSize: 14,
  fontWeight: 'normal',
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
  grid-template-columns: repeat(3, 1fr);
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
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
