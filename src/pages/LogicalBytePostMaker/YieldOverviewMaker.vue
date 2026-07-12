<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import ItemImage from '/src/components/sprite/ItemImage.vue'
import OperatorAvatar from '/src/components/sprite/OperatorAvatar.vue'
import SkillIcon from '/src/components/sprite/SkillIcon.vue'
import operatorItemCostTable from '/src/static/json/operator/operator_item_cost_table.json'
import operatorTable from '/src/static/json/operator/character_table_simple.json'
import operatorTableV2 from '/src/static/json/operator/character_table_simple.v2.json'
import fallbackItemInfo from '/src/static/json/material/item_info.json'
import itemCache from '/src/plugins/indexedDB/itemCache.js'
import { getStageConfig } from '/src/utils/user/userConfig.js'
import {
  loadLogicalByteCharacterData,
  normalizeLogicalByteCharacterData,
} from '/src/utils/logicalByte/characterData.js'

const T5_MATERIAL_ID_REGEX = /^\d{4}5$/
const T4_MATERIAL_ID_REGEX = /^\d{4}4$/
const ELITE_LMD_COST_BY_RARITY = {
  3: [10000],
  4: [15000, 60000],
  5: [20000, 120000],
  6: [30000, 180000],
}
const ELITE_LEVELING_COST_BY_RARITY = {
  4: { lmd: 146241, exp: 150200 },
  5: { lmd: 251947, exp: 239400 },
  6: { lmd: 409841, exp: 361400 },
}
const LMD_ITEM_ID = '4001'
const BASIC_BATTLE_RECORD_ITEM_ID = '2001'
const BASIC_BATTLE_RECORD_EXP = 200
const SETTINGS_STORAGE_KEY = 'logicalByte_yieldOverview_settings_v1'
const PORTRAIT_BASE_URL = 'https://torappu.prts.wiki/assets/char_portrait'
const PORTRAIT_DB_NAME = 'logicalByteYieldOverview'
const PORTRAIT_STORE_NAME = 'operatorPortraits'
const DEFAULT_LAYOUT_SETTINGS = Object.freeze({
  materialColumnWidth: 315,
  rowHeight: 96,
  materialGapX: 10,
  materialGapY: 8,
  portraitColumnWidth: 220,
  portraitScale: 100,
  portraitOffsetX: 0,
  portraitOffsetY: 0,
})
const layoutControls = [
  { key: 'materialColumnWidth', label: '主要材料栏宽', min: 180, max: 600, step: 5 },
  { key: 'rowHeight', label: '内容行高', min: 80, max: 160, step: 2 },
  { key: 'materialGapX', label: '图标横间距', min: 0, max: 30, step: 1 },
  { key: 'materialGapY', label: '图标纵间距', min: 0, max: 30, step: 1 },
]
const portraitLayoutControls = [
  { key: 'portraitColumnWidth', label: '立绘区域宽度', min: 150, max: 400, step: 5 },
  { key: 'portraitScale', label: '立绘大小', min: 50, max: 200, step: 5, unit: '%' },
  { key: 'portraitOffsetX', label: '水平位置', min: -150, max: 150, step: 5 },
  { key: 'portraitOffsetY', label: '垂直位置', min: -150, max: 150, step: 5 },
]

const savedSettings = loadYieldOverviewSettings()
const operatorName = ref(savedSettings.operatorName)
const selectedOperatorId = ref(savedSettings.selectedOperatorId)
const itemInfoMap = ref(createItemInfoMap(fallbackItemInfo))
const itemValueLoading = ref(false)
const showSkillT4Materials = ref(savedSettings.showSkillT4Materials)
const tableCaptureRef = ref(null)
const isExportingTable = ref(false)
const layoutSettings = ref(savedSettings.layoutSettings)
const manualPortraitUrl = ref('')
const manualPortraitFileName = ref('')
const autoPortraitFailed = ref(false)
const autoPortraitLoaded = ref(false)
const portraitLoading = ref(false)
let portraitObjectUrl = ''
let portraitLoadVersion = 0
let portraitDbPromise = null

watch(
  [operatorName, selectedOperatorId, showSkillT4Materials, layoutSettings],
  saveYieldOverviewSettings,
  { deep: true, immediate: true },
)

const uploadedCharacterData = loadUploadedCharacterData()
const activeOperatorTable = {
  ...operatorTableV2,
  ...uploadedCharacterData.operatorTable,
}
const activeOperatorCostTable = {
  ...operatorItemCostTable,
  ...uploadedCharacterData.operatorCostTable,
}

const operatorCandidates = computed(() => {
  const keyword = operatorName.value.trim()
  if (!keyword) {
    return []
  }

  return Object.entries(activeOperatorTable)
    .filter(([charId, operator]) => {
      if (!activeOperatorCostTable[charId]) {
        return false
      }

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
    ...(activeOperatorTable[charId] || {}),
    name: activeOperatorTable[charId]?.name || operatorTable[charId]?.name || charId,
    rarity: getDisplayRarity(charId),
  }
})

const autoPortraitUrl = computed(() => {
  if (!matchedOperatorId.value || autoPortraitFailed.value) {
    return ''
  }

  return `${PORTRAIT_BASE_URL}/${matchedOperatorId.value}_1.png`
})

const portraitSource = computed(() => manualPortraitUrl.value || autoPortraitUrl.value)

const portraitStatusText = computed(() => {
  if (!matchedOperator.value) {
    return '请先选择干员'
  }

  if (portraitLoading.value) {
    return '正在读取已保存的立绘'
  }

  if (manualPortraitUrl.value) {
    return `手动立绘：${manualPortraitFileName.value || '已上传图片'}`
  }

  if (autoPortraitFailed.value) {
    return '未匹配到自动立绘，请手动上传'
  }

  return autoPortraitLoaded.value ? '已自动匹配半身立绘' : '正在匹配半身立绘'
})

const rankingContext = computed(() => buildRankingContext(itemInfoMap.value))

const tableRows = computed(() => {
  if (!matchedOperator.value) {
    return []
  }

  return buildOperatorRows(matchedOperator.value, rankingContext.value, itemInfoMap.value)
})

const overviewStyle = computed(() => ({
  '--overview-card-width':
    `${layoutSettings.value.materialColumnWidth + 500 + layoutSettings.value.portraitColumnWidth}px`,
  '--overview-table-width': `${layoutSettings.value.materialColumnWidth + 500}px`,
  '--overview-material-width': `${layoutSettings.value.materialColumnWidth}px`,
  '--overview-row-height': `${layoutSettings.value.rowHeight}px`,
  '--overview-material-gap-x': `${layoutSettings.value.materialGapX}px`,
  '--overview-material-gap-y': `${layoutSettings.value.materialGapY}px`,
  '--overview-portrait-width': `${layoutSettings.value.portraitColumnWidth}px`,
  '--overview-portrait-scale': layoutSettings.value.portraitScale / 100,
  '--overview-portrait-offset-x': `${layoutSettings.value.portraitOffsetX}px`,
  '--overview-portrait-offset-y': `${layoutSettings.value.portraitOffsetY}px`,
}))

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

watch(matchedOperatorId, loadStoredPortrait, { immediate: true })

function getItemValue(item) {
  const value = Number(item?.itemValue ?? item?.itemValueAp ?? 0)
  return Number.isFinite(value) ? value : 0
}

function createItemInfoMap(list) {
  const map = new Map()

  for (const item of list) {
    map.set(item.itemId, {
      ...item,
      itemValue: getItemValue(item),
    })
  }

  return map
}

function loadYieldOverviewSettings() {
  const defaults = {
    operatorName: '斯卡蒂',
    selectedOperatorId: '',
    showSkillT4Materials: false,
    layoutSettings: { ...DEFAULT_LAYOUT_SETTINGS },
  }

  if (typeof window === 'undefined') {
    return defaults
  }

  try {
    const rawSettings = window.localStorage.getItem(SETTINGS_STORAGE_KEY)
    if (!rawSettings) {
      return defaults
    }

    const parsedSettings = JSON.parse(rawSettings)
    if (!parsedSettings || typeof parsedSettings !== 'object' || Array.isArray(parsedSettings)) {
      return defaults
    }

    const restoredLayoutSettings = { ...DEFAULT_LAYOUT_SETTINGS }
    for (const control of [...layoutControls, ...portraitLayoutControls]) {
      const value = parsedSettings.layoutSettings?.[control.key]
      if (typeof value === 'number' && Number.isFinite(value)) {
        restoredLayoutSettings[control.key] = Math.min(control.max, Math.max(control.min, value))
      }
    }

    return {
      operatorName: typeof parsedSettings.operatorName === 'string'
        ? parsedSettings.operatorName
        : defaults.operatorName,
      selectedOperatorId: typeof parsedSettings.selectedOperatorId === 'string'
        ? parsedSettings.selectedOperatorId
        : defaults.selectedOperatorId,
      showSkillT4Materials: typeof parsedSettings.showSkillT4Materials === 'boolean'
        ? parsedSettings.showSkillT4Materials
        : defaults.showSkillT4Materials,
      layoutSettings: restoredLayoutSettings,
    }
  } catch (error) {
    console.warn('收益速览页面参数读取失败，已使用默认值:', error)
    return defaults
  }
}

function saveYieldOverviewSettings() {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({
      operatorName: operatorName.value,
      selectedOperatorId: selectedOperatorId.value,
      showSkillT4Materials: showSkillT4Materials.value,
      layoutSettings: layoutSettings.value,
    }))
  } catch (error) {
    console.warn('收益速览页面参数保存失败:', error)
  }
}

function openPortraitDatabase() {
  if (portraitDbPromise) {
    return portraitDbPromise
  }

  portraitDbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('当前浏览器不支持 IndexedDB'))
      return
    }

    const request = window.indexedDB.open(PORTRAIT_DB_NAME, 1)
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(PORTRAIT_STORE_NAME)) {
        database.createObjectStore(PORTRAIT_STORE_NAME, { keyPath: 'charId' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error('立绘数据库打开失败'))
  })

  portraitDbPromise.catch(() => {
    portraitDbPromise = null
  })
  return portraitDbPromise
}

async function getStoredPortrait(charId) {
  const database = await openPortraitDatabase()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(PORTRAIT_STORE_NAME, 'readonly')
    const request = transaction.objectStore(PORTRAIT_STORE_NAME).get(charId)
    request.onsuccess = () => resolve(request.result || null)
    request.onerror = () => reject(request.error || new Error('立绘读取失败'))
  })
}

async function saveStoredPortrait(charId, file) {
  const database = await openPortraitDatabase()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(PORTRAIT_STORE_NAME, 'readwrite')
    transaction.objectStore(PORTRAIT_STORE_NAME).put({
      charId,
      file,
      fileName: file.name,
      updatedAt: Date.now(),
    })
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error || new Error('立绘保存失败'))
    transaction.onabort = () => reject(transaction.error || new Error('立绘保存失败'))
  })
}

async function deleteStoredPortrait(charId) {
  const database = await openPortraitDatabase()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(PORTRAIT_STORE_NAME, 'readwrite')
    transaction.objectStore(PORTRAIT_STORE_NAME).delete(charId)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error || new Error('立绘删除失败'))
    transaction.onabort = () => reject(transaction.error || new Error('立绘删除失败'))
  })
}

function clearManualPortraitPreview() {
  if (portraitObjectUrl) {
    URL.revokeObjectURL(portraitObjectUrl)
    portraitObjectUrl = ''
  }
  manualPortraitUrl.value = ''
  manualPortraitFileName.value = ''
}

function applyManualPortrait(file, fileName = '') {
  clearManualPortraitPreview()
  portraitObjectUrl = URL.createObjectURL(file)
  manualPortraitUrl.value = portraitObjectUrl
  manualPortraitFileName.value = fileName || file.name || ''
}

async function loadStoredPortrait(charId) {
  const loadVersion = ++portraitLoadVersion
  clearManualPortraitPreview()
  autoPortraitFailed.value = false
  autoPortraitLoaded.value = false

  if (!charId) {
    portraitLoading.value = false
    return
  }

  portraitLoading.value = true
  try {
    const storedPortrait = await getStoredPortrait(charId)
    if (loadVersion !== portraitLoadVersion || !storedPortrait?.file) {
      return
    }
    applyManualPortrait(storedPortrait.file, storedPortrait.fileName)
  } catch (error) {
    console.warn('已保存立绘读取失败:', error)
  } finally {
    if (loadVersion === portraitLoadVersion) {
      portraitLoading.value = false
    }
  }
}

async function handlePortraitUpload(event) {
  const input = event.target
  const file = input.files?.[0]
  input.value = ''

  if (!file) {
    return
  }
  if (!matchedOperatorId.value) {
    ElMessage.warning('请先选择干员')
    return
  }
  if (!file.type.startsWith('image/')) {
    ElMessage.warning('请选择图片文件')
    return
  }

  const charId = matchedOperatorId.value
  applyManualPortrait(file)
  autoPortraitFailed.value = false

  try {
    await saveStoredPortrait(charId, file)
    ElMessage.success('立绘已上传并保存')
  } catch (error) {
    console.warn('立绘保存失败:', error)
    ElMessage.warning('立绘已应用，但刷新后可能无法恢复')
  }
}

async function removeManualPortrait() {
  const charId = matchedOperatorId.value
  clearManualPortraitPreview()
  autoPortraitFailed.value = false
  autoPortraitLoaded.value = false

  if (!charId) {
    return
  }

  try {
    await deleteStoredPortrait(charId)
    ElMessage.success('已恢复自动立绘')
  } catch (error) {
    console.warn('手动立绘删除失败:', error)
    ElMessage.warning('已恢复自动立绘，但保存记录删除失败')
  }
}

function handlePortraitLoad() {
  if (!manualPortraitUrl.value) {
    autoPortraitLoaded.value = true
  }
}

function handlePortraitLoadError() {
  if (manualPortraitUrl.value) {
    clearManualPortraitPreview()
    autoPortraitLoaded.value = false
    return
  }

  autoPortraitFailed.value = true
  autoPortraitLoaded.value = false
}

function getDisplayRarity(charId) {
  const uploadedRarity = uploadedCharacterData.operatorTable[charId]?.displayRarity
  if (Number.isFinite(uploadedRarity) && uploadedRarity > 0) {
    return uploadedRarity
  }

  const rarity = operatorTable[charId]?.rarity
  if (Number.isFinite(rarity)) {
    return rarity
  }

  const zeroBasedRarity = activeOperatorTable[charId]?.rarity
  return Number.isFinite(zeroBasedRarity) ? zeroBasedRarity + 1 : 0
}

function loadUploadedCharacterData() {
  try {
    const saved = loadLogicalByteCharacterData()
    if (saved?.data) {
      return normalizeLogicalByteCharacterData(saved.data, operatorTableV2)
    }
  } catch (error) {
    console.error('Failed to load LogicalByte character data:', error)
  }

  return {
    operatorTable: {},
    operatorCostTable: {},
  }
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
    const itemValue = getItemValue(map.get(itemId))
    return total + itemValue * Number(count || 0)
  }, 0)
}

function addCostItem(costObject, itemId, count) {
  const numericCount = Number(count || 0)
  if (numericCount > 0) {
    costObject[itemId] = (costObject[itemId] || 0) + numericCount
  }
}

function getElite2MergedCost(operatorCost, rarity) {
  const mergedCost = mergeCostObjects([operatorCost.elite?.[1] || {}, operatorCost.elite?.[2] || {}])
  const lmdCost = ELITE_LMD_COST_BY_RARITY[rarity] || []
  if (lmdCost.length > 0) {
    addCostItem(mergedCost, LMD_ITEM_ID, lmdCost.reduce((total, count) => total + count, 0))
  }

  const levelingCost = ELITE_LEVELING_COST_BY_RARITY[rarity]
  if (levelingCost) {
    addCostItem(mergedCost, LMD_ITEM_ID, levelingCost.lmd)
    addCostItem(mergedCost, BASIC_BATTLE_RECORD_ITEM_ID, Math.ceil(levelingCost.exp / BASIC_BATTLE_RECORD_EXP))
  }

  return mergedCost
}

function getElite2RankingCost(operatorCost, rarity, map) {
  const mergedCost = getElite2MergedCost(operatorCost, rarity)
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

function getMaterialLines(materials = []) {
  const lines = [[]]
  let hasT5Material = false
  let splitBeforeT4 = false

  for (const material of materials) {
    if (!splitBeforeT4 && hasT5Material && isT4Material(material.itemId)) {
      lines.push([])
      splitBeforeT4 = true
    }

    lines.at(-1).push(material)
    hasT5Material ||= isT5Material(material.itemId)
  }

  return lines.filter(line => line.length > 0)
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

  for (const [charId, operatorCost] of Object.entries(activeOperatorCostTable)) {
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
      const mergedCost = mergeCostObjects(skillCostList)
      if (Object.keys(mergedCost).length > 0) {
        if (!skillCostsByRarity.has(rarity)) {
          skillCostsByRarity.set(rarity, [])
        }
        skillCostsByRarity.get(rarity).push(getMaterialCost(mergedCost, map))
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
  const operatorCost = activeOperatorCostTable[operator.charId]
  if (!operatorCost) {
    return []
  }

  const rows = []
  const elite2Cost = operatorCost.elite?.[2] || {}
  if (Object.keys(elite2Cost).length > 0) {
    const totalCost = getElite2RankingCost(operatorCost, operator.rarity, map)
    rows.push({
      key: 'elite2',
      title: '精二',
      skillIcon: '',
      materials: getNonChipMaterialEntries(elite2Cost),
      otherSummary: '',
      totalCost,
      rank: getRank(context.eliteCostsByRarity.get(operator.rarity) || [], totalCost),
    })
  }

  const skillNameList = activeOperatorTable[operator.charId]?.skills || []
  ;(operatorCost.skills || []).forEach((skillCostList, index) => {
    const mergedCost = mergeCostObjects(skillCostList)
    if (Object.keys(mergedCost).length === 0) {
      return
    }

    const totalCost = getMaterialCost(mergedCost, map)
    rows.push({
      key: `skill${index + 1}`,
      title: `${index + 1}技能专精`,
      subtitle: skillNameList[index]?.skillName || '',
      skillIcon: skillNameList[index]?.skillIcon || skillNameList[index]?.skillId || '',
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

function adjustLayoutSetting(control, direction) {
  const currentValue = layoutSettings.value[control.key]
  const nextValue = currentValue + control.step * direction
  layoutSettings.value[control.key] = Math.min(control.max, Math.max(control.min, nextValue))
}

function resetLayoutSettings() {
  for (const control of layoutControls) {
    layoutSettings.value[control.key] = DEFAULT_LAYOUT_SETTINGS[control.key]
  }
}

function resetPortraitLayoutSettings() {
  for (const control of portraitLayoutControls) {
    layoutSettings.value[control.key] = DEFAULT_LAYOUT_SETTINGS[control.key]
  }
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

onBeforeUnmount(() => {
  clearManualPortraitPreview()
})
</script>

<template>
  <div class="yield-overview-maker" :style="overviewStyle">
    <section class="maker-panel preview-panel">
      <div class="panel-header">
        <h2>制图区</h2>
      </div>

      <div class="preview-shell">
        <div
          v-if="matchedOperator && tableRows.length > 0"
          ref="tableCaptureRef"
          class="preview-card"
        >
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

          <div class="overview-body">
            <div class="portrait-column">
              <img
                v-if="portraitSource"
                :key="portraitSource"
                class="operator-portrait"
                :src="portraitSource"
                :alt="`${matchedOperator.name}半身立绘`"
                crossorigin="anonymous"
                @load="handlePortraitLoad"
                @error="handlePortraitLoadError"
              >
              <div v-else class="portrait-placeholder">
                <span>暂无立绘</span>
                <label class="portrait-placeholder-upload">
                  上传图片
                  <input
                    type="file"
                    accept="image/png,image/webp,image/jpeg"
                    @change="handlePortraitUpload"
                  >
                </label>
              </div>
              <div class="portrait-name">{{ matchedOperator.name }}</div>
            </div>

            <div class="table-capture-area">
              <table class="overview-table">
                <colgroup>
                  <col class="skill-icon-column">
                  <col class="row-title-column">
                  <col class="material-column">
                  <col class="cost-column">
                  <col class="rank-column">
                </colgroup>
                <thead>
                  <tr>
                    <th></th>
                    <th></th>
                    <th>主要材料</th>
                    <th>理智消耗</th>
                    <th>排名/总数</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in tableRows" :key="row.key">
                    <td class="skill-icon-cell">
                      <img
                        v-if="row.key === 'elite2'"
                        class="elite2-icon"
                        src="/image/survey/rank/elite2.png"
                        alt=""
                      >
                      <SkillIcon
                        v-else-if="row.skillIcon"
                        :icon="row.skillIcon"
                        :size="58"
                        border
                      />
                      <div v-else class="skill-icon-placeholder"></div>
                    </td>
                    <td class="row-title-cell">
                      <div class="row-title">{{ row.title }}</div>
                      <div v-if="row.subtitle" class="row-subtitle">{{ row.subtitle }}</div>
                    </td>
                    <td class="material-cell">
                      <div v-if="row.materials.length > 0" class="material-list">
                        <div
                          v-for="(materialLine, lineIndex) in getMaterialLines(row.materials)"
                          :key="row.key + '-line-' + lineIndex"
                          class="material-line"
                        >
                          <template
                            v-for="material in materialLine"
                            :key="row.key + '-' + material.itemId"
                          >
                            <div
                              v-for="index in material.count"
                              :key="row.key + '-' + material.itemId + '-' + index"
                              class="material-entry"
                              :title="material.itemName"
                            >
                              <ItemImage :item-id="material.itemId" :size="44" />
                            </div>
                          </template>
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

        <div class="portrait-control-section">
          <div class="portrait-control-header">
            <span>干员立绘</span>
            <button
              v-if="manualPortraitUrl"
              type="button"
              class="portrait-auto-button"
              @click="removeManualPortrait"
            >
              恢复自动匹配
            </button>
          </div>
          <label
            class="portrait-upload-button"
            :class="{ disabled: !matchedOperator }"
          >
            <span>{{ manualPortraitUrl ? '更换立绘' : '手动上传立绘' }}</span>
            <input
              type="file"
              accept="image/png,image/webp,image/jpeg"
              :disabled="!matchedOperator"
              @change="handlePortraitUpload"
            >
          </label>
          <div
            class="portrait-status"
            :class="{ warning: autoPortraitFailed && !manualPortraitUrl }"
          >
            {{ portraitStatusText }}
          </div>
        </div>

        <div class="layout-control-section">
          <div class="layout-control-header">
            <span>立绘布局</span>
            <button type="button" class="layout-reset-button" @click="resetPortraitLayoutSettings">
              重置
            </button>
          </div>

          <div
            v-for="control in portraitLayoutControls"
            :key="control.key"
            class="layout-control-row"
          >
            <span class="layout-control-label">{{ control.label }}</span>
            <div class="layout-stepper">
              <button
                type="button"
                :title="`减小${control.label}`"
                :aria-label="`减小${control.label}`"
                :disabled="layoutSettings[control.key] <= control.min"
                @click="adjustLayoutSetting(control, -1)"
              >
                −
              </button>
              <output>{{ layoutSettings[control.key] }} {{ control.unit || 'px' }}</output>
              <button
                type="button"
                :title="`增大${control.label}`"
                :aria-label="`增大${control.label}`"
                :disabled="layoutSettings[control.key] >= control.max"
                @click="adjustLayoutSetting(control, 1)"
              >
                +
              </button>
            </div>
          </div>
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

        <div class="layout-control-section">
          <div class="layout-control-header">
            <span>主要材料布局</span>
            <button type="button" class="layout-reset-button" @click="resetLayoutSettings">
              重置
            </button>
          </div>

          <div
            v-for="control in layoutControls"
            :key="control.key"
            class="layout-control-row"
          >
            <span class="layout-control-label">{{ control.label }}</span>
            <div class="layout-stepper">
              <button
                type="button"
                :title="`减小${control.label}`"
                :aria-label="`减小${control.label}`"
                :disabled="layoutSettings[control.key] <= control.min"
                @click="adjustLayoutSetting(control, -1)"
              >
                −
              </button>
              <output>{{ layoutSettings[control.key] }} {{ control.unit || 'px' }}</output>
              <button
                type="button"
                :title="`增大${control.label}`"
                :aria-label="`增大${control.label}`"
                :disabled="layoutSettings[control.key] >= control.max"
                @click="adjustLayoutSetting(control, 1)"
              >
                +
              </button>
            </div>
          </div>
        </div>

        <button
          type="button"
          class="screenshot-button"
          :disabled="isExportingTable || !matchedOperator || tableRows.length === 0"
          @click="downloadTablePng"
        >
          {{ isExportingTable ? '截图中...' : '截图整图' }}
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
  --overview-card-width: 1035px;
  --overview-table-width: 815px;
  --overview-portrait-width: 220px;
  --overview-skill-icon-width: 70px;
  --overview-row-title-width: 150px;
  --overview-material-width: 315px;
  --overview-cost-width: 140px;
  --overview-rank-width: 140px;
  --overview-row-height: 96px;
  --overview-material-gap-x: 10px;
  --overview-material-gap-y: 8px;
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
  justify-content: flex-start;
  overflow: auto;
  background:
    linear-gradient(135deg, rgba(35, 46, 52, 0.84), rgba(42, 42, 42, 0.88)),
    repeating-linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0 1px, transparent 1px 7px);
}

.preview-card {
  flex: 0 0 var(--overview-card-width);
  width: var(--overview-card-width);
  margin: 0 auto;
  overflow: hidden;
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

.overview-body {
  display: grid;
  grid-template-columns: var(--overview-portrait-width) var(--overview-table-width);
  align-items: stretch;
}

.portrait-column {
  position: relative;
  min-width: 0;
  overflow: hidden;
  border-right: 1px solid rgba(255, 255, 255, 0.12);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(0, 0, 0, 0.24)),
    repeating-linear-gradient(135deg, rgba(255, 255, 255, 0.035) 0 1px, transparent 1px 9px);
}

.operator-portrait {
  position: absolute;
  inset: 14px 4px 0;
  display: block;
  width: calc(100% - 8px);
  height: calc(100% - 14px);
  object-fit: contain;
  object-position: center bottom;
  transform:
    translate(
      var(--overview-portrait-offset-x),
      var(--overview-portrait-offset-y)
    )
    scale(var(--overview-portrait-scale));
  transform-origin: center bottom;
}

.portrait-name {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  padding: 30px 14px 13px;
  background: linear-gradient(transparent, rgba(13, 16, 20, 0.86));
  color: rgba(255, 255, 255, 0.94);
  font-size: 21px;
  line-height: 1.1;
  font-weight: 800;
  text-align: center;
}

.portrait-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 12px;
  color: rgba(255, 255, 255, 0.62);
  font-size: 16px;
}

.portrait-placeholder-upload {
  padding: 7px 11px;
  border: 1px solid rgba(127, 183, 255, 0.46);
  border-radius: 6px;
  background: rgba(31, 95, 153, 0.78);
  color: #ffffff;
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
}

.portrait-placeholder-upload input,
.portrait-upload-button input {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  opacity: 0;
  pointer-events: none;
}

.overview-table {
  width: var(--overview-table-width);
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
  text-align: center;
  background: rgba(0, 0, 0, 0.16);
}

.overview-table td {
  height: var(--overview-row-height);
  padding: 16px 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  text-align: center;
  vertical-align: middle;
}

.skill-icon-column {
  width: var(--overview-skill-icon-width);
}

.row-title-column {
  width: var(--overview-row-title-width);
}

.material-column {
  width: var(--overview-material-width);
}

.cost-column {
  width: var(--overview-cost-width);
}

.rank-column {
  width: var(--overview-rank-width);
}

.skill-icon-cell {
  padding-right: 6px;
  padding-left: 6px;
  text-align: center;
}

.skill-icon-cell > div {
  margin: 0 auto;
}

.skill-icon-placeholder {
  width: 58px;
  height: 58px;
}

.elite2-icon {
  display: block;
  width: 58px;
  height: 58px;
  object-fit: contain;
}

.row-title-cell {
  color: rgba(255, 255, 255, 0.9);
}

.row-title {
  font-size: 24px;
  font-weight: 800;
  line-height: 1.15;
}

.row-subtitle {
  margin-top: 8px;
  color: rgba(255, 255, 255, 0.66);
  font-size: 16px;
  line-height: 1.3;
}

.material-cell {
  padding-right: 14px;
  padding-left: 14px;
  overflow: visible;
  text-align: left;
}

.material-list {
  display: flex;
  flex-direction: column;
  gap: var(--overview-material-gap-y);
  overflow: visible;
}

.material-line {
  display: flex;
  flex-wrap: wrap;
  gap: var(--overview-material-gap-y) var(--overview-material-gap-x);
  align-items: center;
  justify-content: flex-start;
}

.material-entry {
  display: flex;
  width: 44px;
  min-width: 44px;
  height: 44px;
  min-height: 44px;
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

.portrait-control-section {
  display: grid;
  gap: 9px;
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.12);
}

.portrait-control-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: rgba(255, 255, 255, 0.88);
  font-size: 14px;
  font-weight: 800;
}

.portrait-auto-button {
  padding: 0;
  border: 0;
  background: transparent;
  color: #9ecbff;
  cursor: pointer;
  font-size: 13px;
}

.portrait-auto-button:hover {
  color: #ffffff;
}

.portrait-upload-button {
  display: flex;
  height: 38px;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(127, 183, 255, 0.34);
  border-radius: 6px;
  background: #1f5f99;
  color: #ffffff;
  cursor: pointer;
  font-size: 14px;
  font-weight: 700;
}

.portrait-upload-button:hover {
  background: #256da9;
}

.portrait-upload-button.disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.portrait-status {
  color: rgba(255, 255, 255, 0.58);
  font-size: 12px;
  line-height: 1.4;
  word-break: break-all;
}

.portrait-status.warning {
  color: #ffe7a3;
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

.layout-control-section {
  display: grid;
  gap: 10px;
  padding-top: 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.layout-control-header,
.layout-control-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.layout-control-header {
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
  font-weight: 800;
}

.layout-reset-button {
  padding: 4px 7px;
  border: 0;
  background: transparent;
  color: #9ecbff;
  cursor: pointer;
  font-size: 13px;
}

.layout-reset-button:hover {
  color: #ffffff;
}

.layout-control-label {
  color: rgba(255, 255, 255, 0.7);
  font-size: 13px;
}

.layout-stepper {
  display: grid;
  grid-template-columns: 30px 72px 30px;
  height: 30px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 6px;
  background: #14181e;
}

.layout-stepper button {
  display: flex;
  align-items: center;
  justify-content: center;
  border: 0;
  background: #313946;
  color: #ffffff;
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
}

.layout-stepper button:hover:not(:disabled) {
  background: #3c4757;
}

.layout-stepper button:disabled {
  cursor: not-allowed;
  opacity: 0.38;
}

.layout-stepper output {
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.9);
  font-variant-numeric: tabular-nums;
  font-size: 13px;
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
