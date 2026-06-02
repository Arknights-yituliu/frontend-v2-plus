<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import ItemImage from '/src/components/sprite/ItemImage.vue'
import OperatorAvatar from '/src/components/sprite/OperatorAvatar.vue'
import operatorItemCostTable from '/src/static/json/operator/operator_item_cost_table.json'
import operatorTable from '/src/static/json/operator/character_table_simple.json'
import operatorTableV2 from '/src/static/json/operator/character_table_simple.v2.json'
import fallbackItemInfo from '/src/static/json/material/item_info.json'
import itemCache from '/src/plugins/indexedDB/itemCache.js'
import { getStageConfig } from '/src/utils/user/userConfig.js'

const T5_MATERIAL_ID_REGEX = /^\d{4}5$/
const T4_MATERIAL_ID_REGEX = /^\d{4}4$/
const ELITE_LMD_COST_BY_RARITY = {
  3: [10000],
  4: [15000, 60000],
  5: [20000, 120000],
  6: [30000, 180000],
}

const operatorName = ref('斯卡蒂')
const selectedOperatorId = ref('')
const itemInfoMap = ref(createItemInfoMap(fallbackItemInfo))
const itemValueLoading = ref(false)
const showSkillT4Materials = ref(false)
const tableCaptureRef = ref(null)
const isExportingTable = ref(false)

const operatorCandidates = computed(() => {
  const keyword = operatorName.value.trim()
  if (!keyword) {
    return []
  }

  return Object.entries(operatorTableV2)
    .filter(([charId, operator]) => {
      const name = operator.name || operatorTable[charId]?.name || ''
      return name.includes(keyword) || charId.includes(keyword)
    })
    .map(([charId, operator]) => ({
      charId,
      name: operator.name || operatorTable[charId]?.name || charId,
      rarity: getDisplayRarity(charId),
    }))
    .sort((a, b) => {
      const aExact = a.name === keyword || a.charId === keyword ? 0 : 1
      const bExact = b.name === keyword || b.charId === keyword ? 0 : 1
      return aExact - bExact || a.name.length - b.name.length
    })
})

const matchedOperatorId = computed(() => {
  if (selectedOperatorId.value) {
    const selected = operatorCandidates.value.find(item => item.charId === selectedOperatorId.value)
    if (selected) {
      return selectedOperatorId.value
    }
  }

  const keyword = operatorName.value.trim()
  if (!keyword) {
    return ''
  }

  const exactMatch = operatorCandidates.value.find(item => item.name === keyword || item.charId === keyword)
  return exactMatch?.charId || operatorCandidates.value[0]?.charId || ''
})

const matchedOperator = computed(() => {
  const charId = matchedOperatorId.value
  if (!charId) {
    return null
  }

  return {
    charId,
    ...(operatorTableV2[charId] || {}),
    name: operatorTableV2[charId]?.name || operatorTable[charId]?.name || charId,
    rarity: getDisplayRarity(charId),
  }
})

const rankingContext = computed(() => buildRankingContext(itemInfoMap.value))

const tableRows = computed(() => {
  if (!matchedOperator.value) {
    return []
  }

  return buildOperatorRows(matchedOperator.value, rankingContext.value, itemInfoMap.value)
})

const hasAmbiguousMatches = computed(() => {
  if (!operatorName.value.trim()) {
    return false
  }

  return operatorCandidates.value.length > 1
})

const matchStatusText = computed(() => {
  if (!operatorName.value.trim()) {
    return '请输入干员名称'
  }

  if (!matchedOperator.value) {
    return '未找到干员'
  }

  return `当前干员：${matchedOperator.value.name}（${matchedOperator.value.rarity}星）`
})

function createItemInfoMap(list) {
  const map = new Map()

  for (const item of list) {
    map.set(item.itemId, {
      ...item,
      itemValueAp: Number(item.itemValueAp ?? item.itemValue ?? 0),
    })
  }

  return map
}

function getDisplayRarity(charId) {
  const rarity = operatorTable[charId]?.rarity
  if (Number.isFinite(rarity)) {
    return rarity
  }

  const zeroBasedRarity = operatorTableV2[charId]?.rarity
  return Number.isFinite(zeroBasedRarity) ? zeroBasedRarity + 1 : 0
}

function isT5Material(itemId) {
  const item = itemInfoMap.value.get(itemId)
  return T5_MATERIAL_ID_REGEX.test(itemId) && item?.type === '精英材料'
}

function isT4Material(itemId) {
  const item = itemInfoMap.value.get(itemId)
  return T4_MATERIAL_ID_REGEX.test(itemId) && item?.type === '精英材料'
}

function toCostEntries(costObject = {}) {
  return Object.entries(costObject)
    .filter(([_, count]) => Number(count) > 0)
    .map(([itemId, count]) => ({
      itemId,
      count: Number(count),
      itemName: itemInfoMap.value.get(itemId)?.itemName || itemId,
      rarity: itemInfoMap.value.get(itemId)?.rarity || 0,
    }))
    .sort((a, b) => {
      const aT5 = isT5Material(a.itemId) ? 1 : 0
      const bT5 = isT5Material(b.itemId) ? 1 : 0
      return bT5 - aT5 || b.rarity - a.rarity || Number(b.itemId) - Number(a.itemId)
    })
}

function getMaterialCost(costObject = {}, map = itemInfoMap.value) {
  return Object.entries(costObject).reduce((total, [itemId, count]) => {
    const itemValue = Number(map.get(itemId)?.itemValueAp ?? map.get(itemId)?.itemValue ?? 0)
    return total + itemValue * Number(count || 0)
  }, 0)
}

function getElite2RankingCost(operatorCost, rarity, map) {
  const mergedCost = mergeCostObjects([operatorCost.elite?.[1] || {}, operatorCost.elite?.[2] || {}])
  const lmdCost = ELITE_LMD_COST_BY_RARITY[rarity] || []
  if (lmdCost.length > 0) {
    mergedCost['4001'] = (mergedCost['4001'] || 0) + lmdCost.reduce((total, count) => total + count, 0)
  }

  return getMaterialCost(mergedCost, map)
}

function getT5MaterialEntries(costObject = {}) {
  return toCostEntries(costObject).filter(item => isT5Material(item.itemId))
}

function getSkillVisibleMaterialEntries(costObject = {}) {
  return toCostEntries(costObject).filter(item => {
    if (isT5Material(item.itemId)) {
      return true
    }

    return showSkillT4Materials.value && isT4Material(item.itemId)
  })
}

function getNonChipMaterialEntries(costObject = {}) {
  return toCostEntries(costObject).filter(item => itemInfoMap.value.get(item.itemId)?.type !== '芯片')
}

function getSkillOtherMaterialSummary(costObject = {}) {
  const otherEntries = toCostEntries(costObject).filter(item => {
    if (isT5Material(item.itemId)) {
      return false
    }

    if (showSkillT4Materials.value && isT4Material(item.itemId)) {
      return false
    }

    return true
  })

  if (otherEntries.length === 0) {
    return ''
  }

  return showSkillT4Materials.value ? '+若干蓝材料' : '+若干蓝紫材料'
}

function getRank(list, cost) {
  const index = list.findIndex(item => item === cost)
  if (index === -1) {
    return '-'
  }

  return `${index + 1}/${list.length}`
}

function buildRankingContext(map) {
  const eliteCostsByRarity = new Map()
  const skillCostsByRarity = new Map()

  for (const [charId, operatorCost] of Object.entries(operatorItemCostTable)) {
    const rarity = getDisplayRarity(charId)
    if (!rarity) {
      continue
    }

    const elite2Cost = operatorCost.elite?.[2]
    if (elite2Cost && Object.keys(elite2Cost).length > 0) {
      if (!eliteCostsByRarity.has(rarity)) {
        eliteCostsByRarity.set(rarity, [])
      }
      eliteCostsByRarity.get(rarity).push(getElite2RankingCost(operatorCost, rarity, map))
    }

    for (const skillCostList of operatorCost.skills || []) {
      if (Array.isArray(skillCostList) && skillCostList.length > 0) {
        if (!skillCostsByRarity.has(rarity)) {
          skillCostsByRarity.set(rarity, [])
        }
        skillCostsByRarity.get(rarity).push(getMaterialCost(mergeCostObjects(skillCostList), map))
      }
    }
  }

  sortCostMap(eliteCostsByRarity)
  sortCostMap(skillCostsByRarity)

  return {
    eliteCostsByRarity,
    skillCostsByRarity,
  }
}

function sortCostMap(map) {
  for (const costs of map.values()) {
    costs.sort((a, b) => b - a)
  }
}

function mergeCostObjects(list = []) {
  return list.reduce((merged, item) => {
    for (const [itemId, count] of Object.entries(item || {})) {
      merged[itemId] = (merged[itemId] || 0) + Number(count || 0)
    }
    return merged
  }, {})
}

function buildOperatorRows(operator, context, map) {
  const operatorCost = operatorItemCostTable[operator.charId]
  if (!operatorCost) {
    return []
  }

  const rows = []
  const elite2Cost = operatorCost.elite?.[2] || {}
  if (Object.keys(elite2Cost).length > 0) {
    const totalCost = getElite2RankingCost(operatorCost, operator.rarity, map)
    rows.push({
      key: 'elite2',
      title: '精英化二',
      materials: getNonChipMaterialEntries(elite2Cost),
      otherSummary: '',
      totalCost,
      rank: getRank(context.eliteCostsByRarity.get(operator.rarity) || [], totalCost),
    })
  }

  const skillNameList = operatorTableV2[operator.charId]?.skills || []
  ;(operatorCost.skills || []).forEach((skillCostList, index) => {
    if (!Array.isArray(skillCostList) || skillCostList.length === 0) {
      return
    }

    const mergedCost = mergeCostObjects(skillCostList)
    const totalCost = getMaterialCost(mergedCost, map)
    rows.push({
      key: `skill${index + 1}`,
      title: `${index + 1}技能专精`,
      subtitle: skillNameList[index]?.skillName || '',
      materials: getSkillVisibleMaterialEntries(mergedCost),
      otherSummary: getSkillOtherMaterialSummary(mergedCost),
      totalCost,
      rank: getRank(context.skillCostsByRarity.get(operator.rarity) || [], totalCost),
    })
  })

  return rows
}

function formatCost(value) {
  return Number.isFinite(value) ? value.toFixed(1) : '-'
}

function selectCandidate(charId) {
  selectedOperatorId.value = charId
}

function getExportFileName() {
  const name = matchedOperator.value?.name || '收益速览'
  const safeName = name.replace(/[\\/:*?"<>|]/g, '_')
  return `收益速览制图-${safeName}-${Date.now()}.png`
}

async function downloadTablePng() {
  if (!tableCaptureRef.value || isExportingTable.value) {
    return
  }

  try {
    isExportingTable.value = true
    await nextTick()
    await document.fonts?.ready

    const { default: html2canvas } = await import('html2canvas')
    const canvas = await html2canvas(tableCaptureRef.value, {
      backgroundColor: null,
      scale: 2,
      useCORS: true,
      allowTaint: false,
      logging: false,
    })

    const link = document.createElement('a')
    link.download = getExportFileName()
    link.href = canvas.toDataURL('image/png')
    link.click()
    ElMessage.success('表格截图已下载')
  } catch (error) {
    console.error('下载收益速览表格截图失败:', error)
    ElMessage.error(error?.message || '表格截图失败')
  } finally {
    isExportingTable.value = false
  }
}

async function refreshItemValues() {
  itemValueLoading.value = true
  try {
    const itemList = await itemCache.getItemValueCacheByConfig(getStageConfig())
    itemInfoMap.value = createItemInfoMap(itemList)
  } catch (error) {
    console.error(error)
    ElMessage.warning('材料价值读取失败，已使用本地静态数据')
    itemInfoMap.value = createItemInfoMap(fallbackItemInfo)
  } finally {
    itemValueLoading.value = false
  }
}

onMounted(() => {
  refreshItemValues()
})
</script>

<template>
  <div class="yield-overview-maker">
    <section class="maker-panel preview-panel">
      <div class="panel-header">
        <h2>制图区</h2>
      </div>

      <div class="preview-shell">
        <div v-if="matchedOperator && tableRows.length > 0" class="preview-card">
          <header class="preview-header">
            <div class="operator-identity">
              <OperatorAvatar
                :char-id="matchedOperator.charId"
                :rarity="matchedOperator.rarity"
                :size="68"
                border
              />
              <div>
                <div class="operator-name">{{ matchedOperator.name }}</div>
                <div class="operator-meta">{{ matchedOperator.rarity }}星养成材料收益速览</div>
              </div>
            </div>
            <div class="brand-mark">明日方舟一图流</div>
          </header>

          <div ref="tableCaptureRef" class="table-capture-area">
            <table class="overview-table">
              <colgroup>
                <col class="row-title-column">
                <col class="material-column">
                <col class="cost-column">
                <col class="rank-column">
              </colgroup>
              <thead>
                <tr>
                  <th></th>
                  <th>主要材料</th>
                  <th>理智消耗</th>
                  <th>排名/总数</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in tableRows" :key="row.key">
                  <td class="row-title-cell">
                    <div class="row-title">{{ row.title }}</div>
                    <div v-if="row.subtitle" class="row-subtitle">{{ row.subtitle }}</div>
                  </td>
                  <td class="material-cell">
                    <div v-if="row.materials.length > 0" class="material-list">
                      <div
                        v-for="material in row.materials"
                        :key="row.key + '-' + material.itemId"
                        class="material-row"
                      >
                        <div
                          v-for="index in material.count"
                          :key="row.key + '-' + material.itemId + '-' + index"
                          class="material-entry"
                          :title="material.itemName"
                        >
                          <ItemImage :item-id="material.itemId" :size="44" />
                        </div>
                      </div>
                    </div>
                    <div v-else class="no-t5-text">无 T5 精英材料</div>
                    <div v-if="row.otherSummary" class="other-materials">{{ row.otherSummary }}</div>
                  </td>
                  <td class="number-cell">{{ formatCost(row.totalCost) }}</td>
                  <td class="number-cell">{{ row.rank }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div v-else class="empty-preview">
          输入干员名称后生成表格
        </div>
      </div>
    </section>

    <aside class="maker-panel control-panel">
      <div class="panel-header">
        <h2>控制区</h2>
      </div>

      <div class="control-content">
        <label class="control-label" for="yield-operator-name">干员名称</label>
        <input
          id="yield-operator-name"
          v-model.trim="operatorName"
          class="operator-input"
          type="text"
          placeholder="输入干员名称"
          @input="selectedOperatorId = ''"
        >

        <div class="status-line" :class="{ warning: !matchedOperator }">
          {{ matchStatusText }}
        </div>

        <div v-if="hasAmbiguousMatches" class="candidate-list">
          <button
            v-for="candidate in operatorCandidates.slice(0, 8)"
            :key="candidate.charId"
            type="button"
            class="candidate-button"
            :class="{ active: candidate.charId === matchedOperatorId }"
            @click="selectCandidate(candidate.charId)"
          >
            {{ candidate.name }} · {{ candidate.rarity }}星
          </button>
        </div>

        <label class="switch-row">
          <input v-model="showSkillT4Materials" type="checkbox">
          <span class="switch-track">
            <span class="switch-thumb"></span>
          </span>
          <span>显示技能紫材料</span>
        </label>

        <div class="control-note">
          专精行默认只展开 T5 精英材料；打开开关后追加显示 id 为 xxxx4 的紫色精英材料。理智消耗和排名始终按该行全部材料计算。
        </div>

        <button
          type="button"
          class="screenshot-button"
          :disabled="isExportingTable || !matchedOperator || tableRows.length === 0"
          @click="downloadTablePng"
        >
          {{ isExportingTable ? '截图中...' : '截图表格' }}
        </button>

        <button
          type="button"
          class="refresh-button"
          :disabled="itemValueLoading"
          @click="refreshItemValues"
        >
          {{ itemValueLoading ? '读取中...' : '刷新材料价值' }}
        </button>
      </div>
    </aside>
  </div>
</template>

<style scoped>
.yield-overview-maker {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 16px;
  min-height: calc(100vh - 72px);
  padding: 16px;
  background: #171b20;
  color: #f4f7fb;
}

.maker-panel {
  min-width: 0;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  background: #222831;
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 52px;
  padding: 0 18px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  background: #2b323d;
}

.panel-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0;
}

.preview-shell {
  display: flex;
  min-height: calc(100vh - 164px);
  padding: 24px;
  align-items: flex-start;
  justify-content: center;
  background:
    linear-gradient(135deg, rgba(35, 46, 52, 0.84), rgba(42, 42, 42, 0.88)),
    repeating-linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0 1px, transparent 1px 7px);
}

.preview-card {
  width: 100%;
  background:
    radial-gradient(circle at 80% 8%, rgba(157, 178, 191, 0.2), transparent 34%),
    linear-gradient(145deg, #3d4247, #2c3035);
  border: 1px solid rgba(255, 255, 255, 0.16);
  box-shadow: 0 22px 52px rgba(0, 0, 0, 0.32);
}

.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  min-height: 98px;
  padding: 18px 22px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}

.operator-identity {
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
}

.operator-name {
  font-size: 28px;
  line-height: 1.1;
  font-weight: 800;
}

.operator-meta {
  margin-top: 6px;
  color: rgba(255, 255, 255, 0.68);
  font-size: 14px;
}

.brand-mark {
  color: rgba(255, 255, 255, 0.72);
  font-size: 15px;
  font-weight: 700;
  white-space: nowrap;
}

.overview-table {
  width: 100%;
  table-layout: fixed;
  border-collapse: collapse;
}

.table-capture-area {
  background:
    radial-gradient(circle at 80% 8%, rgba(157, 178, 191, 0.16), transparent 34%),
    linear-gradient(145deg, #3d4247, #2c3035);
}

.overview-table th {
  height: 60px;
  padding: 0 14px;
  color: #ffffff;
  font-size: 24px;
  line-height: 1.1;
  font-weight: 900;
  text-align: left;
  background: rgba(0, 0, 0, 0.16);
}

.overview-table td {
  min-height: 96px;
  padding: 16px 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  vertical-align: middle;
}

.row-title-column {
  width: 150px;
}

.material-column {
  width: auto;
}

.cost-column {
  width: 140px;
}

.rank-column {
  width: 140px;
}

.row-title-cell {
  color: rgba(255, 255, 255, 0.9);
}

.row-title {
  font-size: 20px;
  font-weight: 800;
  line-height: 1.15;
}

.row-subtitle {
  margin-top: 8px;
  color: rgba(255, 255, 255, 0.66);
  font-size: 13px;
  line-height: 1.3;
}

.material-list {
  display: grid;
  gap: 8px;
}

.material-row {
  display: grid;
  grid-template-columns: repeat(6, 44px);
  gap: 0 10px;
  align-items: center;
}

.material-entry {
  display: flex;
  width: 44px;
  height: 44px;
  align-items: center;
  justify-content: center;
}

.other-materials,
.no-t5-text {
  margin-top: 8px;
  color: #ffffff;
  font-size: 16px;
  line-height: 1.2;
  font-weight: 800;
}

.no-t5-text {
  margin-top: 0;
  color: rgba(255, 255, 255, 0.72);
}

.number-cell {
  color: #ffffff;
  font-size: 28px;
  line-height: 1;
  font-weight: 500;
  text-align: center;
}

.empty-preview {
  display: flex;
  width: min(920px, 100%);
  min-height: 360px;
  align-items: center;
  justify-content: center;
  border: 1px dashed rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.18);
  color: rgba(255, 255, 255, 0.72);
  font-size: 20px;
}

.control-panel {
  align-self: start;
}

.control-content {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px;
}

.control-label {
  color: rgba(255, 255, 255, 0.78);
  font-size: 14px;
  font-weight: 700;
}

.operator-input {
  width: 100%;
  height: 42px;
  padding: 0 12px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 6px;
  outline: none;
  background: #14181e;
  color: #ffffff;
  font-size: 16px;
}

.operator-input:focus {
  border-color: #7fb7ff;
  box-shadow: 0 0 0 3px rgba(127, 183, 255, 0.18);
}

.status-line {
  padding: 10px 12px;
  border-radius: 6px;
  background: rgba(114, 178, 255, 0.12);
  color: #dbeafe;
  font-size: 14px;
  line-height: 1.4;
}

.status-line.warning {
  background: rgba(255, 193, 7, 0.14);
  color: #ffe7a3;
}

.candidate-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.candidate-button,
.refresh-button,
.screenshot-button {
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 6px;
  background: #313946;
  color: #ffffff;
  cursor: pointer;
  font-size: 14px;
}

.candidate-button {
  padding: 7px 10px;
}

.candidate-button.active {
  border-color: #7fb7ff;
  background: #1f5f99;
}

.switch-row {
  display: flex;
  align-items: center;
  gap: 10px;
  color: rgba(255, 255, 255, 0.82);
  cursor: pointer;
  font-size: 14px;
  font-weight: 700;
  user-select: none;
}

.switch-row input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.switch-track {
  display: inline-flex;
  width: 42px;
  height: 24px;
  padding: 3px;
  align-items: center;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 999px;
  background: #14181e;
  transition: background-color 0.18s ease, border-color 0.18s ease;
}

.switch-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.74);
  transition: transform 0.18s ease, background-color 0.18s ease;
}

.switch-row input:checked + .switch-track {
  border-color: #7fb7ff;
  background: #1f5f99;
}

.switch-row input:checked + .switch-track .switch-thumb {
  transform: translateX(18px);
  background: #ffffff;
}

.control-note {
  color: rgba(255, 255, 255, 0.58);
  font-size: 13px;
  line-height: 1.5;
}

.refresh-button,
.screenshot-button {
  height: 38px;
  font-weight: 700;
}

.screenshot-button {
  border-color: rgba(127, 183, 255, 0.34);
  background: #1f5f99;
}

.screenshot-button:hover:not(:disabled) {
  background: #256da9;
}

.refresh-button:disabled,
.screenshot-button:disabled {
  cursor: not-allowed;
  opacity: 0.66;
}

@media (max-width: 1100px) {
  .yield-overview-maker {
    grid-template-columns: 1fr;
  }

  .control-panel {
    order: -1;
  }
}
</style>
