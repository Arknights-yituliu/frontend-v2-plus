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
        <!-- 配色方案 -->
        <div class="control-section">
          <h3>配色方案</h3>
          <div class="color-schemes">
            <div
              v-for="scheme in colorSchemes"
              :key="scheme.name"
              class="scheme-item"
              :class="{ active: activeScheme === scheme.name }"
              @click="applyColorScheme(scheme)"
            >
              <div class="scheme-preview">
                <div class="scheme-color" :style="{ backgroundColor: scheme.bgColor }"></div>
                <div class="scheme-color" :style="{ backgroundColor: scheme.borderColor }"></div>
                <div class="scheme-color" :style="{ backgroundColor: scheme.textColor }"></div>
              </div>
              <span class="scheme-name">{{ scheme.name }}</span>
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
          <div class="control-group">
            <label>背景色</label>
            <el-color-picker v-model="groupBgColor" />
          </div>
          <div class="control-group">
            <label>边框颜色</label>
            <el-color-picker v-model="groupBorderColor" />
          </div>
          <div class="control-group">
            <label>文本颜色</label>
            <el-color-picker v-model="groupTextColor" />
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
                    <span v-else-if="card.iconType === 'emoji'">{{ card.iconEmoji }}</span>
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

const gap = ref(8)

// 分组默认值
const groupWidth = ref(300)
const groupHeight = ref(40)
const groupBgColor = ref('#f0f4ff')
const groupBorderColor = ref('#4f67c6')
const groupTextColor = ref('#182033')

// 卡片默认值
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

// 配色方案
const colorSchemes = [
  { name: '科技蓝', bgColor: '#f0f4ff', borderColor: '#4f67c6', textColor: '#182033' },
  { name: '深空灰', bgColor: '#2d3748', borderColor: '#4a5568', textColor: '#ffffff' },
  { name: '极简白', bgColor: '#ffffff', borderColor: '#e2e8f0', textColor: '#1a202c' },
  { name: '活力橙', bgColor: '#fff7ed', borderColor: '#f97316', textColor: '#7c2d12' },
  { name: '清新绿', bgColor: '#f0fdf4', borderColor: '#22c55e', textColor: '#14532d' },
  { name: '优雅紫', bgColor: '#faf5ff', borderColor: '#a855f7', textColor: '#3b0764' },
  { name: '少女粉', bgColor: '#fdf2f8', borderColor: '#ec4899', textColor: '#831843' },
  { name: '商务金', bgColor: '#fefce8', borderColor: '#ca8a04', textColor: '#422006' }
]

const activeScheme = ref(null)

const applyColorScheme = (scheme) => {
  activeScheme.value = scheme.name
  groupBgColor.value = scheme.bgColor
  groupBorderColor.value = scheme.borderColor
  groupTextColor.value = scheme.textColor
  ElMessage.success(`已应用「${scheme.name}」配色`)
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

const createGroup = (name = '分组') => ({
  name,
  width: 300,
  height: 40,
  backgroundColor: '#f0f4ff',
  borderColor: '#4f67c6',
  textColor: '#182033',
  cards: [createCard()]
})

const groups = ref([createGroup('分组 1')])
const selectedGroupIndex = ref(0)
const selectedCardIndex = ref(0)

// 同步分组设置到所有卡片
const syncGroupStyleToCards = () => {
  const gIdx = selectedGroupIndex.value
  if (gIdx < 0 || gIdx >= groups.value.length) return
  const group = groups.value[gIdx]
  group.width = groupWidth.value
  group.height = groupHeight.value
  group.backgroundColor = groupBgColor.value
  group.borderColor = groupBorderColor.value
  group.textColor = groupTextColor.value
  // 同时更新组内所有卡片
  group.cards.forEach(card => {
    card.backgroundColor = groupBgColor.value
    card.borderColor = groupBorderColor.value
    card.textColor = groupTextColor.value
  })
}

// 同步卡片设置
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

// 监听设置变化
watch([groupWidth, groupHeight, groupBgColor, groupBorderColor, groupTextColor], syncGroupStyleToCards)
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
  newCard.borderColor = group.borderColor
  newCard.textColor = group.textColor
  group.cards.push(newCard)
  selectedGroupIndex.value = gIndex
  selectedCardIndex.value = group.cards.length - 1
}

const getCardStyle = (card, group) => ({
  width: group.width + 'px',
  height: group.height + 'px',
  backgroundColor: card.backgroundColor,
  borderColor: card.borderColor,
  borderWidth: '2px',
  borderRadius: '8px',
  padding: '0 16px',
  display: 'flex',
  flexDirection: card.iconPosition === 'left' || card.iconPosition === 'right' ? 'row' : 'column',
  alignItems: 'center',
  justifyContent: card.textAlign === 'left' ? 'flex-start' : card.textAlign === 'right' ? 'flex-end' : 'center',
  gap: '8px',
  boxSizing: 'border-box',
  position: 'relative'
})

const getTextStyle = (card) => ({
  color: card.textColor,
  fontSize: card.fontSize + 'px',
  fontWeight: card.fontWeight,
  textAlign: card.textAlign,
  whiteSpace: 'nowrap'
})

const exportConfig = () => {
  const config = {
    gap: gap.value,
    groups: groups.value
  }
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
  groups.value = [createGroup('分组 1')]
  selectedGroupIndex.value = 0
  selectedCardIndex.value = 0
  gap.value = 8
  groupWidth.value = 300
  groupHeight.value = 40
  groupBgColor.value = '#f0f4ff'
  groupBorderColor.value = '#4f67c6'
  groupTextColor.value = '#182033'
  cardText.value = '新卡片'
  cardTextColor.value = '#182033'
  cardFontSize.value = 14
  cardFontWeight.value = 'normal'
  cardTextAlign.value = 'center'
  cardShowIcon.value = false
  activeScheme.value = null
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
  max-width: 1400px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 24px;
}

.card-maker-controls {
  background: rgba(255, 255, 255, 0.92);
  border-radius: 16px;
  padding: 20px;
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

.control-group label {
  display: block;
  margin-bottom: 6px;
  font-size: 0.85rem;
  color: #55607a;
}

.size-inputs {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 配色方案 */
.color-schemes {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.scheme-item {
  padding: 8px;
  border-radius: 8px;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.18s ease;
}

.scheme-item:hover {
  border-color: #4f67c6;
}

.scheme-item.active {
  border-color: #4f67c6;
  background: #e0e7ff;
}

.scheme-preview {
  display: flex;
  gap: 4px;
  margin-bottom: 4px;
}

.scheme-color {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.scheme-name {
  font-size: 0.7rem;
  color: #55607a;
}

/* 绘图区域 */
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
  opacity: 0.9;
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

.card-text {
  overflow: hidden;
  text-overflow: ellipsis;
}

.selected-indicator {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: #4f67c6;
  border-radius: 0 0 6px 6px;
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
}
</style>
