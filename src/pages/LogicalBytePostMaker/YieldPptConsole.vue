<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import Dexie from 'dexie'
import { ElMessage } from 'element-plus'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import YieldPptMaterialDetailTable from './YieldPptMaterialDetailTable.vue'
import YieldOverviewChart from '/src/components/logicalByte/YieldOverviewChart.vue'
import YieldPptMaterialDemandChart from '/src/components/logicalByte/YieldPptMaterialDemandChart.vue'
import PackCardGroup from '/src/components/material/PackCardGroup.vue'
import itemSeries from '/src/static/json/material/item_series.json'
import TMP_STAGE_RESULT from '/src/static/json/material/tmp_stage_result.json'
import fallbackItemInfo from '/src/static/json/material/item_info.json'
import { getStageData } from '/src/utils/item/stageEfficiencyCal.js'
import { getStageConfig } from '/src/utils/user/userConfig.js'
import packInfoCache from '/src/plugins/indexedDB/packInfoCache.js'
import itemCache from '/src/plugins/indexedDB/itemCache.js'
import itemAPI from '/src/api/materialV5.js'
import { calculatePackEfficiency } from '/src/utils/item/packEfficiency.js'
import {
  getRecentR3MaterialDemandByMonth,
  getTotalR3MaterialDemand,
} from '/src/utils/material/materialDemandStatistics.js'
import {
  createItemInfoMap,
  createYieldOverviewPptCalculator,
} from '/src/utils/logicalByte/yieldOverviewPptData.js'
import {
  getYieldOverviewAutoPortraitUrl,
  getYieldOverviewStoredPortrait,
} from '/src/utils/logicalByte/yieldOverviewPortraits.js'
import '/src/assets/css/material/pack.scss'
import '/src/assets/css/material/store.scss'
import '/src/assets/css/sprite/sprite_plane_icon.css'

const MANIFEST_FILE_NAME = 'yield-overview-manifest.json'
const ASSET_FOLDER_NAME = 'yield-ppt-assets'
const DRAFT_STORAGE_KEY = 'logicalByte_yieldPptConsole_draft_v1'
const DRAFT_DB_NAME = 'LogicalByteYieldPptConsole'
const DRAFT_ASSET_STORE = 'assets'

const draftDatabase = new Dexie(DRAFT_DB_NAME)
draftDatabase.version(1).stores({
  [DRAFT_ASSET_STORE]: 'key',
})

const issueDirectoryHandle = ref(null)
const issueDirectoryName = ref('')
const isSaving = ref(false)
const isLoadingManifest = ref(false)
const materials = ref([
  createMaterial(1),
  createMaterial(2),
])
const activityStore = ref(createActivityStore())
const packPages = ref([createPackPage(1)])
const cultivationPages = ref([createCultivationPage(1)])
const materialStageGroups = ref(getInitialMaterialStageGroups())
const materialDataLoading = ref(true)
const materialDetailCaptureRefs = ref([])
const exportingMaterialDetailIndex = ref(-1)
const materialPreviewIndex = ref(-1)
const materialCurveCaptureRefs = ref([])
const exportingMaterialCurveIndex = ref(-1)
const materialCurvePreviewIndex = ref(-1)
const packs = ref([])
const packDataLoading = ref(false)
const packDataLoadedAt = ref(Date.now())
const packCaptureRefs = ref(new Map())
const exportingPackPageId = ref('')
const packPreviewPageId = ref('')
const imagePreviewTitle = ref('')
const imagePreviewUrl = ref('')
const isDraftReady = ref(false)
const isExportingArchive = ref(false)
const isImportingDraft = ref(false)
const draftFileInputRef = ref(null)
const cultivationItemInfoMap = ref(createItemInfoMap(fallbackItemInfo))
const cultivationDataLoading = ref(false)
const cultivationCalculator = ref(createYieldOverviewPptCalculator(cultivationItemInfoMap.value))
const cultivationCaptureRefs = ref(new Map())
const cultivationPortraitUrls = ref(new Map())
const exportingCultivationPageId = ref('')
const cultivationPreviewPageId = ref('')
const activityStoreList = ref([])
const activityStoreLoading = ref(false)
const activityStoreCaptureRefs = ref(new Map())
const exportingActivityStoreIndex = ref(-1)
const activityStorePreviewOpen = ref(false)
let imagePreviewObjectUrl = ''
let draftSaveTimer = null
const cultivationPortraitLoadPromises = new Map()
const cultivationPortraitObjectUrls = new Map()

const isDirectoryApiAvailable = computed(() => typeof window !== 'undefined' && 'showDirectoryPicker' in window)
const materialLimitReached = computed(() => materials.value.length >= 3)
const materialOptions = computed(() => {
  return Object.values(itemSeries).map(series => ({
    id: String(series.id),
    name: String(series.name),
  }))
})
const materialPreviewOpen = computed({
  get: () => materialPreviewIndex.value >= 0,
  set: value => {
    if (!value) {
      materialPreviewIndex.value = -1
    }
  },
})
const materialPreview = computed(() => materials.value[materialPreviewIndex.value] || null)
const materialCurvePreviewOpen = computed({
  get: () => materialCurvePreviewIndex.value >= 0,
  set: value => {
    if (!value) {
      materialCurvePreviewIndex.value = -1
    }
  },
})
const materialCurvePreview = computed(() => materials.value[materialCurvePreviewIndex.value] || null)
const materialDemandSummaries = computed(() => {
  return materials.value.map(material => {
    const itemId = getMaterialDemandItemId(material)
    if (!itemId) {
      return null
    }

    const monthlyDemand = getRecentR3MaterialDemandByMonth(itemId)
    return {
      itemId,
      totalDemand: getTotalR3MaterialDemand(itemId),
      recentDemand: monthlyDemand.reduce((sum, item) => sum + item.count, 0),
      monthlyDemand,
    }
  })
})
const packPreviewPage = computed(() => {
  return packPages.value.find(page => page.id === packPreviewPageId.value) || null
})
const cultivationPreviewPage = computed(() => {
  return cultivationPages.value.find(page => page.id === cultivationPreviewPageId.value) || null
})
const packPreviewOpen = computed({
  get: () => Boolean(packPreviewPage.value),
  set: value => {
    if (!value) {
      packPreviewPageId.value = ''
    }
  },
})
const cultivationPreviewOpen = computed({
  get: () => Boolean(cultivationPreviewPage.value),
  set: value => {
    if (!value) {
      cultivationPreviewPageId.value = ''
    }
  },
})
const imagePreviewOpen = computed({
  get: () => Boolean(imagePreviewUrl.value),
  set: value => {
    if (!value) {
      closeImagePreview()
    }
  },
})
const cultivationOperatorOptions = computed(() => cultivationCalculator.value.getOperatorOptions())
const selectedActivityStore = computed(() => {
  return activityStoreList.value.find(item => item.id === activityStore.value.sourceId) || null
})
const activityStoreExportWidth = computed(() => activityStore.value.columnLimit * 186)
const activityStoreExportStyle = computed(() => ({
  width: `${activityStoreExportWidth.value}px`,
  maxWidth: `${activityStoreExportWidth.value}px`,
}))
const materialPackageStatusItems = computed(() => {
  const createStatusItem = (key, label, assets) => {
    const missing = assets
      .filter(item => !hasAsset(item.asset))
      .map(item => item.label)

    return {
      key,
      label,
      ready: missing.length === 0,
      text: missing.length === 0
        ? `${label}：素材已就绪`
        : `${label}：待补 ${missing.join('、')}`,
    }
  }

  return [
    ...materials.value.map((material, index) => createStatusItem(
      `material-${index}`,
      material.title || `材料 ${index + 1}`,
      [
        { label: '详情图', asset: material.detail },
        { label: '需求曲线', asset: material.curve },
      ],
    )),
    createStatusItem('activity-store', '活动商店', [{ label: '商店图', asset: activityStore.value.image }]),
    ...packPages.value.map((page, index) => createStatusItem(
      `pack-${page.id || index}`,
      page.title || `礼包第 ${index + 1} 页`,
      [{ label: '分页图', asset: page.image }],
    )),
    ...cultivationPages.value.map((page, index) => createStatusItem(
      `cultivation-${page.id || index}`,
      `培养成本第 ${index + 1} 页`,
      [{ label: '分页图', asset: page.image }],
    )),
  ]
})
const canExportMaterialPackage = computed(() => !isExportingArchive.value)
const canSave = computed(() => {
  return Boolean(issueDirectoryHandle.value)
    && !isSaving.value
})

watch(
  [materials, activityStore, packPages, cultivationPages],
  () => {
    if (isDraftReady.value) {
      scheduleDraftSave()
    }
  },
  { deep: true },
)

function createDraftKey(prefix) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function createImageAsset({ title = '', path = '', storageKey = createDraftKey('asset') } = {}) {
  return {
    title,
    path,
    storageKey,
    file: null,
    saved: false,
  }
}

function createActivityStore() {
  const activityStore = {
    title: '活动商店',
    sourceId: '',
    columnLimit: 7,
    image: createImageAsset({
      path: `${ASSET_FOLDER_NAME}/activity-store.png`,
    }),
  }
  activityStore.image.storageKey = 'activity-store'
  return activityStore
}

function normalizeActivityStoreColumnLimit(value) {
  const columnLimit = Number(value)
  return [5, 6, 7, 8].includes(columnLimit) ? columnLimit : 7
}

function createMaterial(index) {
  const material = {
    title: '',
    seriesId: '',
    detail: createImageAsset({
      path: `${ASSET_FOLDER_NAME}/material-${index}-detail.png`,
    }),
    curve: createImageAsset({
      path: `${ASSET_FOLDER_NAME}/material-${index}-curve.png`,
    }),
  }
  material.detail.storageKey = createDraftKey('material-detail')
  material.curve.storageKey = createDraftKey('material-curve')
  return material
}

function createPackPage(index) {
  const page = {
    title: '礼包性价比 - 活动礼包',
    caption: '',
    image: createImageAsset({
      path: `${ASSET_FOLDER_NAME}/pack-page-${index}.png`,
    }),
  }
  page.id = createDraftKey('pack-page')
  page.selectedPackIds = []
  page.image.storageKey = createDraftKey('pack-image')
  return page
}

function createCultivationPage(index) {
  const page = {
    operatorId: '',
    operatorNames: '',
    caption: '',
    image: createImageAsset({
      path: `${ASSET_FOLDER_NAME}/cultivation-${index}.png`,
    }),
  }
  page.id = createDraftKey('cultivation-page')
  page.image.storageKey = createDraftKey('cultivation-image')
  return page
}

function getInitialMaterialStageGroups() {
  const recommendedStage = Array.isArray(TMP_STAGE_RESULT?.recommendedStage)
    ? TMP_STAGE_RESULT.recommendedStage
    : []

  return [...recommendedStage].sort((a, b) => String(a.itemSeriesId).localeCompare(String(b.itemSeriesId)))
}

function getMaterialOption(seriesId) {
  return materialOptions.value.find(option => option.id === String(seriesId)) || null
}

function resolveMaterialSeriesId(seriesId, title) {
  if (getMaterialOption(seriesId)) {
    return String(seriesId)
  }

  return materialOptions.value.find(option => option.name === String(title || '').trim())?.id || ''
}

function selectMaterialSeries(material) {
  const option = getMaterialOption(material.seriesId)
  if (!option) {
    return
  }

  material.title = option.name
}

function getMaterialStageRows(material) {
  if (!material?.seriesId) {
    return []
  }

  const group = materialStageGroups.value.find(item => String(item.itemSeriesId) === material.seriesId)
  if (!group?.stageResultList) {
    return []
  }

  return [...group.stageResultList]
    .sort((a, b) => Number(b.stageEfficiency || 0) - Number(a.stageEfficiency || 0))
    .slice(0, 6)
}

function getMaterialDemandItemId(material) {
  const series = itemSeries[String(material?.seriesId || '')]
  return typeof series?.series?.r3 === 'string' ? series.series.r3 : ''
}

function getMaterialDemandSummary(index) {
  return materialDemandSummaries.value[index] || null
}

function formatMaterialDemandCount(value) {
  return Number.isFinite(Number(value))
    ? Math.round(Number(value)).toLocaleString('zh-CN')
    : '-'
}

async function copyMaterialDemandSummary(summary) {
  if (!summary) {
    return
  }

  const text = `总需求量：${Math.round(summary.totalDemand)}\n近两年需求量：${Math.round(summary.recentDemand)}`
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
    } else {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
    ElMessage.success('材料需求文本已复制')
  } catch (error) {
    console.error('复制材料需求文本失败', error)
    ElMessage.error('复制材料需求文本失败')
  }
}

function setMaterialDetailCaptureRef(index, element) {
  materialDetailCaptureRefs.value[index] = element
}

function setMaterialCurveCaptureRef(index, element) {
  materialCurveCaptureRefs.value[index] = element
}

function openMaterialPreview(index) {
  const material = materials.value[index]
  if (!material?.seriesId) {
    ElMessage.warning('请先选择材料')
    return
  }

  materialPreviewIndex.value = index
}

function openMaterialCurvePreview(index) {
  if (!getMaterialDemandSummary(index)) {
    ElMessage.warning('请先选择材料')
    return
  }

  materialCurvePreviewIndex.value = index
}

async function refreshMaterialStageData() {
  try {
    materialDataLoading.value = true
    const result = await getStageData(getStageConfig())
    if (Array.isArray(result?.recommendedStage) && result.recommendedStage.length > 0) {
      materialStageGroups.value = [...result.recommendedStage]
        .sort((a, b) => String(a.itemSeriesId).localeCompare(String(b.itemSeriesId)))
    }
  } catch (error) {
    console.warn('读取材料关卡数据失败，已保留内置快照', error)
  } finally {
    materialDataLoading.value = false
  }
}

async function generateMaterialDetailImage(material, index) {
  if (exportingMaterialDetailIndex.value !== -1) {
    return
  }

  if (!material.seriesId) {
    ElMessage.warning('请先选择材料')
    return
  }

  if (getMaterialStageRows(material).length === 0) {
    ElMessage.warning('该材料暂无可用关卡数据')
    return
  }

  const target = materialDetailCaptureRefs.value[index]
  if (!target) {
    ElMessage.error('材料详情图尚未准备完成')
    return
  }

  try {
    exportingMaterialDetailIndex.value = index
    await nextTick()
    await document.fonts?.ready

    const { default: html2canvas } = await import('html2canvas')
    const canvas = await html2canvas(target, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
    })
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
    if (!blob) {
      throw new Error('无法生成 PNG 图片')
    }

    const fileName = `material-${index + 1}-detail.png`
    material.detail.file = new File([blob], fileName, { type: 'image/png' })
    material.detail.path = `${ASSET_FOLDER_NAME}/${fileName}`
    material.detail.saved = false
    ElMessage.success(`${material.title || '材料'}详情图已生成`)
  } catch (error) {
    console.error('生成材料详情图失败:', error)
    ElMessage.error(error?.message || '生成材料详情图失败')
  } finally {
    exportingMaterialDetailIndex.value = -1
  }
}

async function generateMaterialCurveImage(material, index) {
  if (exportingMaterialCurveIndex.value !== -1) {
    return
  }

  const summary = getMaterialDemandSummary(index)
  if (!summary) {
    ElMessage.warning('请先选择材料')
    return
  }

  const target = materialCurveCaptureRefs.value[index]
  if (!target) {
    ElMessage.error('材料需求曲线尚未准备完成')
    return
  }

  try {
    exportingMaterialCurveIndex.value = index
    await nextTick()
    await document.fonts?.ready

    const { default: html2canvas } = await import('html2canvas')
    const canvas = await html2canvas(target, {
      backgroundColor: '#ffffff',
      scale: 2,
      logging: false,
    })
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
    if (!blob) {
      throw new Error('无法生成 PNG 图片')
    }

    const fileName = `material-${index + 1}-curve.png`
    material.curve.file = new File([blob], fileName, { type: 'image/png' })
    material.curve.path = `${ASSET_FOLDER_NAME}/${fileName}`
    material.curve.saved = false
    ElMessage.success(`${material.title || '材料'}需求曲线已生成`)
  } catch (error) {
    console.error('生成材料需求曲线失败', error)
    ElMessage.error(error?.message || '生成材料需求曲线失败')
  } finally {
    exportingMaterialCurveIndex.value = -1
  }
}

async function loadPacks({ notify = false } = {}) {
  if (packDataLoading.value) {
    return
  }

  try {
    packDataLoading.value = true
    const itemValueMap = await itemCache.getItemValueMapCacheByConfig(getStageConfig())
    const packInfoList = await packInfoCache.listPackInfo(true)
    packs.value = packInfoList
      .map(pack => buildPackPresentation(pack, itemValueMap))
      .sort((left, right) => getTimestamp(right.start) - getTimestamp(left.start))
    packDataLoadedAt.value = Date.now()

    const validPackIds = new Set(packs.value.map(pack => getPackId(pack.id)))
    for (const page of packPages.value) {
      page.selectedPackIds = page.selectedPackIds.filter(packId => validPackIds.has(packId))
    }

    if (notify) {
      ElMessage.success('礼包数据已刷新')
    }
  } catch (error) {
    console.error('加载礼包数据失败:', error)
    ElMessage.error(error?.message || '礼包数据加载失败')
  } finally {
    packDataLoading.value = false
  }
}

async function loadActivityStores({ notify = false } = {}) {
  if (activityStoreLoading.value) {
    return
  }

  try {
    activityStoreLoading.value = true
    const itemValueMap = await itemCache.getItemValueMapCacheByConfig(getStageConfig())
    itemValueMap.set('itempack_main', 20.7)
    const response = await itemAPI.listActivityStore()
    activityStoreList.value = (response.data || []).map((activity, index) => ({
      ...activity,
      id: String(index),
      actStoreFormat: formatActivityStore(activity.actStore, itemValueMap),
    }))

    if (notify) {
      ElMessage.success('活动商店数据已刷新')
    }
  } catch (error) {
    console.error('加载活动商店数据失败:', error)
    ElMessage.error(error?.message || '活动商店数据加载失败')
  } finally {
    activityStoreLoading.value = false
  }
}

function formatActivityStore(data, itemValueMap) {
  const areas = [[], [], [], [], []]
  for (const item of data || []) {
    const itemValue = itemValueMap.get(item.itemId) || 0
    const itemPPR = itemValue * item.itemQuantity / item.itemPrice
    areas[Math.max(0, Number(item.itemArea) - 1)]?.push({
      itemPrice: item.itemPrice,
      itemId: item.itemId,
      itemName: item.itemName,
      itemPPR,
    })
  }

  for (const area of areas) {
    area.sort((left, right) => right.itemPPR - left.itemPPR)
  }
  return areas
}

function getActivityStoreColor(value, base = 4, stair = 1) {
  if (value < 0) return 'color_t6'
  if (value < base - 3 * stair) return 'color_t1'
  if (value < base - 2 * stair) return 'color_t2'
  if (value < base - stair) return 'color_t3'
  if (value < base) return 'color_t4'
  return 'color_t5'
}

function formatActivityStoreEfficiency(value) {
  return Number(value || 0).toFixed(2)
}

function setActivityStoreCaptureRef(sourceId, element) {
  if (element) {
    activityStoreCaptureRefs.value.set(sourceId, element)
  } else {
    activityStoreCaptureRefs.value.delete(sourceId)
  }
}

function selectActivityStoreSource() {
  if (!selectedActivityStore.value) {
    return
  }

  if (!activityStore.value.title.trim() || activityStore.value.title === '活动商店') {
    activityStore.value.title = selectedActivityStore.value.actName || '活动商店'
  }
}

function openActivityStorePreview() {
  if (!selectedActivityStore.value) {
    ElMessage.warning('请先选择活动商店')
    return
  }
  activityStorePreviewOpen.value = true
}

async function generateActivityStoreImage() {
  const activity = selectedActivityStore.value
  if (!activity || exportingActivityStoreIndex.value !== -1) {
    if (!activity) {
      ElMessage.warning('请先选择活动商店')
    }
    return
  }

  const target = activityStoreCaptureRefs.value.get(activity.id)
  if (!target) {
    ElMessage.error('活动商店预览尚未准备完成')
    return
  }

  try {
    exportingActivityStoreIndex.value = Number(activity.id)
    await nextTick()
    await document.fonts?.ready
    await waitForImages(target)

    const { default: html2canvas } = await import('html2canvas')
    const canvas = await html2canvas(target, {
      backgroundColor: null,
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      onclone: (_, clonedTarget) => {
        clonedTarget.style.setProperty('background', 'transparent', 'important')
      },
    })
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
    if (!blob) {
      throw new Error('无法生成 PNG 图片')
    }

    activityStore.value.image.file = new File([blob], 'activity-store.png', { type: 'image/png' })
    activityStore.value.image.path = `${ASSET_FOLDER_NAME}/activity-store.png`
    activityStore.value.image.saved = false
    ElMessage.success('活动商店图已生成')
  } catch (error) {
    console.error('生成活动商店图失败:', error)
    ElMessage.error(error?.message || '生成活动商店图失败')
  } finally {
    exportingActivityStoreIndex.value = -1
  }
}

async function refreshCultivationData() {
  if (cultivationDataLoading.value) {
    return
  }

  try {
    cultivationDataLoading.value = true
    const itemList = await itemCache.getItemValueCacheByConfig(getStageConfig())
    cultivationItemInfoMap.value = createItemInfoMap(itemList)
  } catch (error) {
    console.warn('读取培养成本数据失败，已使用内置材料价值:', error)
    cultivationItemInfoMap.value = createItemInfoMap(fallbackItemInfo)
  } finally {
    cultivationCalculator.value = createYieldOverviewPptCalculator(cultivationItemInfoMap.value)
    cultivationPages.value.forEach(page => {
      syncCultivationOperatorName(page)
    })
    cultivationDataLoading.value = false
  }
}

function getCultivationOperator(page) {
  if (!page?.operatorId) {
    return null
  }

  return cultivationCalculator.value.buildOperators([page.operatorId])[0] || null
}

function getCultivationRows(page) {
  return getCultivationOperator(page)?.rows || []
}

function getCultivationPortraitSource(page) {
  const charId = getCultivationOperator(page)?.charId
  if (!charId) {
    return ''
  }

  return cultivationPortraitUrls.value.get(charId) || getYieldOverviewAutoPortraitUrl(charId)
}

async function loadCultivationPortrait(charId) {
  if (!charId || cultivationPortraitUrls.value.has(charId)) {
    return
  }

  const pendingLoad = cultivationPortraitLoadPromises.get(charId)
  if (pendingLoad) {
    return pendingLoad
  }

  const loadPromise = (async () => {
    try {
      const portrait = await getYieldOverviewStoredPortrait(charId)
      if (!portrait?.file) {
        return
      }

      const previousUrl = cultivationPortraitObjectUrls.get(charId)
      if (previousUrl) {
        URL.revokeObjectURL(previousUrl)
      }

      const objectUrl = URL.createObjectURL(portrait.file)
      cultivationPortraitObjectUrls.set(charId, objectUrl)
      cultivationPortraitUrls.value = new Map(cultivationPortraitUrls.value).set(charId, objectUrl)
    } catch (error) {
      console.warn('读取已保存立绘失败，已使用自动立绘', error)
    } finally {
      cultivationPortraitLoadPromises.delete(charId)
    }
  })()

  cultivationPortraitLoadPromises.set(charId, loadPromise)
  return loadPromise
}

function releaseCultivationPortraits() {
  for (const objectUrl of cultivationPortraitObjectUrls.values()) {
    URL.revokeObjectURL(objectUrl)
  }
  cultivationPortraitObjectUrls.clear()
  cultivationPortraitUrls.value = new Map()
}

function syncCultivationOperatorName(page) {
  const operator = getCultivationOperator(page)
  page.operatorNames = operator?.name || ''
  if (operator) {
    void loadCultivationPortrait(operator.charId)
  }
}

function setCultivationCaptureRef(pageId, element) {
  const captureElement = element?.getElement?.() || element
  if (captureElement) {
    cultivationCaptureRefs.value.set(pageId, captureElement)
  } else {
    cultivationCaptureRefs.value.delete(pageId)
  }
}

function openCultivationPreview(page) {
  if (!getCultivationOperator(page)) {
    ElMessage.warning('请先选择干员')
    return
  }
  cultivationPreviewPageId.value = page.id
}

async function generateCultivationPageImage(page, index) {
  const operator = getCultivationOperator(page)
  if (exportingCultivationPageId.value || !operator) {
    if (!operator) {
      ElMessage.warning('请先选择干员')
    }
    return
  }

  const target = cultivationCaptureRefs.value.get(page.id)
  if (!target) {
    ElMessage.error('培养成本预览尚未准备完成')
    return
  }

  try {
    exportingCultivationPageId.value = page.id
    await loadCultivationPortrait(operator.charId)
    await nextTick()
    await document.fonts?.ready
    await waitForImages(target)

    const { default: html2canvas } = await import('html2canvas')
    const canvas = await html2canvas(target, {
      backgroundColor: null,
      scale: 1,
      useCORS: true,
      allowTaint: false,
      logging: false,
    })
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
    if (!blob) {
      throw new Error('无法生成 PNG 图片')
    }

    const fileName = `cultivation-${index + 1}.png`
    page.image.file = new File([blob], fileName, { type: 'image/png' })
    page.image.path = `${ASSET_FOLDER_NAME}/${fileName}`
    page.image.saved = false
    syncCultivationOperatorName(page)
    ElMessage.success('培养成本分页图已生成')
  } catch (error) {
    console.error('生成培养成本分页图失败:', error)
    ElMessage.error(error?.message || '生成培养成本分页图失败')
  } finally {
    exportingCultivationPageId.value = ''
  }
}

function buildPackPresentation(pack, itemValueMap) {
  const presentation = calculatePackEfficiency(pack, itemValueMap, false, false)
  presentation.lineChartData = [
    { label: '大月卡', value: 1.57, color: 'rgb(65,147,220)', display: true },
    { label: '648源石', value: 1, color: 'rgb(65,147,220)', display: true },
    { label: '仅抽卡', value: presentation.drawEfficiency, color: '#F88C20', display: true },
    { label: '全物品', value: presentation.packEfficiency, color: 'rgb(250, 83, 83)', display: true },
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

function getPackLabel(pack) {
  const name = pack?.officialName || pack?.name || pack?.id || '未命名礼包'
  return `${name}  ￥${pack?.price ?? '-'}`
}

function getSelectedPacks(page) {
  const packMap = new Map(packs.value.map(pack => [getPackId(pack.id), pack]))
  return (page?.selectedPackIds || [])
    .map(packId => packMap.get(getPackId(packId)))
    .filter(Boolean)
}

function movePackInPage(page, index, direction) {
  const destination = index + direction
  if (destination < 0 || destination >= page.selectedPackIds.length) {
    return
  }

  const next = [...page.selectedPackIds]
  ;[next[index], next[destination]] = [next[destination], next[index]]
  page.selectedPackIds = next
}

function removePackFromPage(page, packId) {
  page.selectedPackIds = page.selectedPackIds.filter(id => id !== getPackId(packId))
}

function setPackCaptureRef(pageId, element) {
  if (element) {
    packCaptureRefs.value.set(pageId, element)
  } else {
    packCaptureRefs.value.delete(pageId)
  }
}

function openPackPreview(page) {
  if (getSelectedPacks(page).length === 0) {
    ElMessage.warning('请先选择礼包')
    return
  }

  packPreviewPageId.value = page.id
}

async function generatePackPageImage(page, index) {
  if (exportingPackPageId.value || getSelectedPacks(page).length === 0) {
    if (getSelectedPacks(page).length === 0) {
      ElMessage.warning('请先选择礼包')
    }
    return
  }

  const target = packCaptureRefs.value.get(page.id)
  if (!target) {
    ElMessage.error('礼包分页图尚未准备完成')
    return
  }

  try {
    exportingPackPageId.value = page.id
    await nextTick()
    await document.fonts?.ready
    await waitForImages(target)

    const { default: html2canvas } = await import('html2canvas')
    const canvas = await html2canvas(target, {
      backgroundColor: null,
      scale: 1,
      useCORS: true,
      allowTaint: false,
      logging: false,
    })
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
    if (!blob) {
      throw new Error('无法生成 PNG 图片')
    }

    const fileName = `pack-page-${index + 1}.png`
    page.image.file = new File([blob], fileName, { type: 'image/png' })
    page.image.path = `${ASSET_FOLDER_NAME}/${fileName}`
    page.image.saved = false
    ElMessage.success('礼包分页图已生成')
  } catch (error) {
    console.error('生成礼包分页图失败:', error)
    ElMessage.error(error?.message || '生成礼包分页图失败')
  } finally {
    exportingPackPageId.value = ''
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

function getConfiguredPackPages() {
  return packPages.value.filter(page => page.selectedPackIds.length > 0 || hasAsset(page.image))
}

function getConfiguredCultivationPages() {
  return cultivationPages.value.filter(page => {
    return Boolean(page.operatorId) || parseOperators(page.operatorNames).length > 0 || hasAsset(page.image)
  })
}

function getCultivationPageOperatorNames(page) {
  const operator = getCultivationOperator(page)
  const names = operator ? [operator.name] : []

  return names.length > 0 ? names : parseOperators(page?.operatorNames)
}

function resolveCultivationOperatorId(page, fallbackNames = page?.operatorNames) {
  if (typeof page?.operatorId === 'string' && page.operatorId) {
    return page.operatorId
  }

  if (Array.isArray(page?.operatorIds)) {
    const legacyOperatorId = page.operatorIds.find(charId => typeof charId === 'string' && charId)
    if (legacyOperatorId) {
      return legacyOperatorId
    }
  }

  return cultivationCalculator.value.findOperatorIds(fallbackNames)[0] || ''
}

function parseOperators(value) {
  return String(value || '')
    .split(/[，,\n]/)
    .map(name => name.trim())
    .filter(Boolean)
}

function hasAsset(asset) {
  return Boolean(asset?.file || asset?.saved)
}

function getAssetExtension(file) {
  const extension = file?.name?.match(/\.[a-z0-9]+$/i)?.[0]
  return extension ? extension.toLowerCase() : '.png'
}

function updateAssetPath(asset, filename) {
  const extension = getAssetExtension(filename)
  asset.path = asset.path.replace(/\.[a-z0-9]+$/i, extension)
}

function selectAsset(asset, event) {
  const file = event.target.files?.[0]
  if (!file) {
    return
  }

  if (!['image/png', 'image/jpeg'].includes(file.type)) {
    ElMessage.warning('请选择 PNG 或 JPG 图片')
    event.target.value = ''
    return
  }

  updateAssetPath(asset, file)
  asset.file = file
  asset.saved = false
}

function resetAsset(asset) {
  asset.file = null
  asset.saved = false
}

async function openImagePreview(title, asset) {
  const file = await getAssetFile(asset)
  if (!file) {
    ElMessage.warning('请先生成或上传图片')
    return
  }

  closeImagePreview()
  imagePreviewTitle.value = title
  imagePreviewObjectUrl = URL.createObjectURL(file)
  imagePreviewUrl.value = imagePreviewObjectUrl
}

function closeImagePreview() {
  if (imagePreviewObjectUrl) {
    URL.revokeObjectURL(imagePreviewObjectUrl)
    imagePreviewObjectUrl = ''
  }
  imagePreviewUrl.value = ''
  imagePreviewTitle.value = ''
}

async function getAssetFile(asset) {
  if (asset?.file) {
    return asset.file
  }

  if (!asset?.saved || !issueDirectoryHandle.value) {
    return null
  }

  try {
    const file = await readIssueFile(asset.path)
    asset.file = file
    return file
  } catch (error) {
    console.warn(`读取预览图片失败: ${asset.path}`, error)
    return null
  }
}

async function readIssueFile(path) {
  const pathParts = String(path || '').split('/').filter(Boolean)
  const filename = pathParts.pop()
  if (!filename) {
    throw new Error('图片路径为空')
  }

  let directory = issueDirectoryHandle.value
  for (const part of pathParts) {
    directory = await directory.getDirectoryHandle(part)
  }

  const fileHandle = await directory.getFileHandle(filename)
  return fileHandle.getFile()
}

function getAllAssets() {
  return [
    ...materials.value.flatMap(material => [material.detail, material.curve]),
    activityStore.value.image,
    ...packPages.value.map(page => page.image),
    ...cultivationPages.value.map(page => page.image),
  ]
}

function createDraftAssetSnapshot(asset) {
  return {
    path: asset.path,
    storageKey: asset.storageKey,
    saved: asset.saved,
  }
}

function createDraftSnapshot() {
  return {
    version: 1,
    materials: materials.value.map(material => ({
      title: material.title,
      seriesId: material.seriesId,
      detail: createDraftAssetSnapshot(material.detail),
      curve: createDraftAssetSnapshot(material.curve),
    })),
    activityStore: {
      title: activityStore.value.title,
      sourceId: activityStore.value.sourceId,
      columnLimit: activityStore.value.columnLimit,
      image: createDraftAssetSnapshot(activityStore.value.image),
    },
    packPages: packPages.value.map(page => ({
      id: page.id,
      title: page.title,
      caption: page.caption,
      selectedPackIds: page.selectedPackIds,
      image: createDraftAssetSnapshot(page.image),
    })),
    cultivationPages: cultivationPages.value.map(page => ({
      id: page.id,
      operatorId: page.operatorId,
      operatorNames: page.operatorNames,
      caption: page.caption,
      image: createDraftAssetSnapshot(page.image),
    })),
  }
}

function restoreDraftAsset(rawAsset, fallbackPath) {
  const asset = createImageAsset({
    path: typeof rawAsset?.path === 'string' && rawAsset.path ? rawAsset.path : fallbackPath,
    storageKey: typeof rawAsset?.storageKey === 'string' && rawAsset.storageKey
      ? rawAsset.storageKey
      : createDraftKey('asset'),
  })
  asset.saved = rawAsset?.saved === true
  return asset
}

function parseJsonOrFallback(text, fallback) {
  try {
    return JSON.parse(text)
  } catch (error) {
    console.warn('本地草稿 JSON 无法解析，已使用默认值:', error)
    return fallback
  }
}

async function restoreDraft() {
  if (typeof window === 'undefined') {
    return
  }

  try {
    const rawDraft = window.localStorage.getItem(DRAFT_STORAGE_KEY)
    if (!rawDraft) {
      return
    }

    const draft = parseJsonOrFallback(rawDraft, null)
    if (!draft || draft.version !== 1 || Array.isArray(draft)) {
      return
    }

    const restoredMaterials = Array.isArray(draft.materials)
      ? draft.materials.slice(0, 3).map((material, index) => ({
        title: typeof material?.title === 'string' ? material.title : '',
        seriesId: resolveMaterialSeriesId(material?.seriesId, material?.title),
        detail: restoreDraftAsset(material?.detail, `${ASSET_FOLDER_NAME}/material-${index + 1}-detail.png`),
        curve: restoreDraftAsset(material?.curve, `${ASSET_FOLDER_NAME}/material-${index + 1}-curve.png`),
      }))
      : []
    materials.value = restoredMaterials.length >= 2 ? restoredMaterials : [createMaterial(1), createMaterial(2)]

    activityStore.value = {
      title: typeof draft.activityStore?.title === 'string' ? draft.activityStore.title : createActivityStore().title,
      sourceId: typeof draft.activityStore?.sourceId === 'string' ? draft.activityStore.sourceId : '',
      columnLimit: normalizeActivityStoreColumnLimit(draft.activityStore?.columnLimit),
      image: restoreDraftAsset(draft.activityStore?.image, `${ASSET_FOLDER_NAME}/activity-store.png`),
    }
    activityStore.value.image.storageKey = 'activity-store'

    const restoredPackPages = Array.isArray(draft.packPages)
      ? draft.packPages.map((page, index) => ({
        id: typeof page?.id === 'string' && page.id ? page.id : createDraftKey('pack-page'),
        title: typeof page?.title === 'string' ? page.title : createPackPage(index + 1).title,
        caption: typeof page?.caption === 'string' ? page.caption : '',
        selectedPackIds: Array.isArray(page?.selectedPackIds) ? page.selectedPackIds.map(getPackId) : [],
        image: restoreDraftAsset(page?.image, `${ASSET_FOLDER_NAME}/pack-page-${index + 1}.png`),
      }))
      : []
    packPages.value = restoredPackPages.length > 0 ? restoredPackPages : [createPackPage(1)]

    const restoredCultivationPages = Array.isArray(draft.cultivationPages)
      ? draft.cultivationPages.map((page, index) => ({
        id: typeof page?.id === 'string' && page.id ? page.id : createDraftKey('cultivation-page'),
        operatorId: resolveCultivationOperatorId(page),
        operatorNames: typeof page?.operatorNames === 'string' ? page.operatorNames : '',
        caption: typeof page?.caption === 'string' ? page.caption : '',
        image: restoreDraftAsset(page?.image, `${ASSET_FOLDER_NAME}/cultivation-${index + 1}.png`),
      }))
      : []
    cultivationPages.value = restoredCultivationPages.length > 0 ? restoredCultivationPages : [createCultivationPage(1)]

    await restoreDraftAssetFiles()
  } catch (error) {
    console.warn('恢复本地草稿失败，已保留当前默认值:', error)
  }
}

async function restoreDraftAssetFiles() {
  for (const asset of getAllAssets()) {
    try {
      const record = await draftDatabase.table(DRAFT_ASSET_STORE).get(asset.storageKey)
      if (!record?.blob) {
        continue
      }

      asset.file = new File([record.blob], record.name || 'image.png', {
        type: record.type || record.blob.type || 'image/png',
      })
      asset.saved = true
    } catch (error) {
      console.warn(`恢复图片草稿失败: ${asset.path}`, error)
    }
  }
}

function scheduleDraftSave() {
  if (draftSaveTimer) {
    clearTimeout(draftSaveTimer)
  }
  draftSaveTimer = window.setTimeout(() => {
    draftSaveTimer = null
    void saveDraft()
  }, 250)
}

async function saveDraft() {
  if (!isDraftReady.value || typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(createDraftSnapshot()))
    for (const asset of getAllAssets()) {
      if (asset.file) {
        await draftDatabase.table(DRAFT_ASSET_STORE).put({
          key: asset.storageKey,
          blob: asset.file,
          name: asset.file.name,
          type: asset.file.type,
        })
      } else if (!asset.saved) {
        await draftDatabase.table(DRAFT_ASSET_STORE).delete(asset.storageKey)
      }
    }
  } catch (error) {
    console.warn('保存本地草稿失败:', error)
  }
}

function getMaterialPackageAssets() {
  return [
    ...materials.value.flatMap(material => [material.detail, material.curve]),
    ...(hasAsset(activityStore.value.image) ? [activityStore.value.image] : []),
    ...getConfiguredPackPages().map(page => page.image),
    ...getConfiguredCultivationPages().map(page => page.image),
  ].filter(hasAsset)
}

function getArchiveFileName(prefix) {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${prefix}-${year}${month}${day}.zip`
}

function buildMaterialPackageReadme() {
  return [
    '收益速览素材包',
    '',
    '此压缩包只包含公开素材、分页配置和 manifest。',
    'PPT 模板与 PowerPoint 生成步骤由本地私有工具独立处理。',
    '缺少的素材可以在 PowerPoint 中手动补齐。',
    '',
    `导出时间: ${new Date().toLocaleString('zh-CN')}`,
  ].join('\n')
}

async function exportMaterialPackage() {
  if (isExportingArchive.value) {
    return
  }

  try {
    isExportingArchive.value = true
    await saveDraft()
    const zip = new JSZip()
    zip.file(MANIFEST_FILE_NAME, `${JSON.stringify(buildManifest(), null, 2)}\n`)
    zip.file('README.txt', buildMaterialPackageReadme())

    for (const asset of getMaterialPackageAssets()) {
      const file = await getAssetFile(asset)
      if (!file) {
        continue
      }
      zip.file(asset.path, file)
    }

    const archive = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' })
    saveAs(archive, getArchiveFileName('收益速览素材包'))
    ElMessage.success('素材包已导出')
  } catch (error) {
    console.error('导出素材包失败:', error)
    ElMessage.error(error?.message || '导出素材包失败')
  } finally {
    isExportingArchive.value = false
  }
}

function openDraftImport() {
  draftFileInputRef.value?.click()
}

async function exportDraftArchive() {
  try {
    await saveDraft()
    const zip = new JSZip()
    const assets = []

    for (const asset of getAllAssets()) {
      const file = await getAssetFile(asset)
      if (!file) {
        continue
      }
      const extension = getAssetExtension(file)
      const archivePath = `draft-assets/${asset.storageKey}${extension}`
      zip.file(archivePath, file)
      assets.push({
        storageKey: asset.storageKey,
        archivePath,
        name: file.name,
        type: file.type,
      })
    }

    zip.file('yield-overview-draft.json', JSON.stringify({
      version: 1,
      draft: createDraftSnapshot(),
      assets,
    }, null, 2))
    const archive = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' })
    saveAs(archive, getArchiveFileName('收益速览草稿'))
    ElMessage.success('草稿备份已导出')
  } catch (error) {
    console.error('导出草稿备份失败:', error)
    ElMessage.error(error?.message || '导出草稿备份失败')
  }
}

async function importDraftArchive(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file || isImportingDraft.value) {
    return
  }

  try {
    isImportingDraft.value = true
    let draft = null
    let assets = []
    let zip = null

    if (/\.zip$/i.test(file.name)) {
      zip = await JSZip.loadAsync(file)
      const draftEntry = zip.file('yield-overview-draft.json')
      if (!draftEntry) {
        throw new Error('压缩包中没有收益速览草稿')
      }
      const archive = JSON.parse(await draftEntry.async('text'))
      draft = archive?.draft
      assets = Array.isArray(archive?.assets) ? archive.assets : []
    } else {
      draft = JSON.parse(await file.text())
    }

    if (!draft || typeof draft !== 'object' || Array.isArray(draft)) {
      throw new Error('草稿格式无效')
    }

    if (zip) {
      for (const asset of assets) {
        const entry = zip.file(asset.archivePath)
        if (!entry || typeof asset.storageKey !== 'string') {
          continue
        }
        const blob = await entry.async('blob')
        await draftDatabase.table(DRAFT_ASSET_STORE).put({
          key: asset.storageKey,
          blob,
          name: asset.name || 'image.png',
          type: asset.type || blob.type || 'image/png',
        })
      }
    }

    window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft))
    await restoreDraft()
    ElMessage.success('草稿已恢复')
  } catch (error) {
    console.error('导入草稿失败:', error)
    ElMessage.error(error?.message || '导入草稿失败')
  } finally {
    isImportingDraft.value = false
  }
}

function addMaterial() {
  if (materialLimitReached.value) {
    return
  }
  materials.value.push(createMaterial(materials.value.length + 1))
}

function removeMaterial(index) {
  if (materials.value.length <= 2) {
    return
  }
  materials.value.splice(index, 1)
  materials.value.forEach((material, materialIndex) => {
    renameAssetIndex(material.detail, `material-${materialIndex + 1}-detail`)
    renameAssetIndex(material.curve, `material-${materialIndex + 1}-curve`)
  })
}

function addPackPage() {
  packPages.value.push(createPackPage(packPages.value.length + 1))
}

function copyPackPage(index) {
  const source = packPages.value[index]
  if (!source) {
    return
  }

  const copy = createPackPage(index + 2)
  copy.title = source.title
  copy.caption = source.caption
  copy.selectedPackIds = [...source.selectedPackIds]
  copy.image.file = source.image.file
  copy.image.saved = source.image.saved
  packPages.value.splice(index + 1, 0, copy)
  packPages.value.forEach((page, pageIndex) => renameAssetIndex(page.image, `pack-page-${pageIndex + 1}`))
}

function movePackPage(index, direction) {
  const destination = index + direction
  if (destination < 0 || destination >= packPages.value.length) {
    return
  }

  const next = [...packPages.value]
  ;[next[index], next[destination]] = [next[destination], next[index]]
  packPages.value = next
  packPages.value.forEach((page, pageIndex) => renameAssetIndex(page.image, `pack-page-${pageIndex + 1}`))
}

async function regenerateAllPackPages() {
  const pages = packPages.value
    .map((page, index) => ({ page, index }))
    .filter(({ page }) => page.selectedPackIds.length > 0)

  if (pages.length === 0) {
    ElMessage.warning('没有可重新生成的礼包分页')
    return
  }

  for (const { page, index } of pages) {
    await generatePackPageImage(page, index)
  }
}

function removePackPage(index) {
  if (packPages.value.length <= 1) {
    packPages.value = [createPackPage(1)]
    return
  }

  packPages.value.splice(index, 1)
  packPages.value.forEach((page, pageIndex) => {
    renameAssetIndex(page.image, `pack-page-${pageIndex + 1}`)
  })
}

function addCultivationPage() {
  cultivationPages.value.push(createCultivationPage(cultivationPages.value.length + 1))
}

function copyCultivationPage(index) {
  const source = cultivationPages.value[index]
  if (!source) {
    return
  }

  const copy = createCultivationPage(index + 2)
  copy.operatorId = source.operatorId
  copy.operatorNames = source.operatorNames
  copy.caption = source.caption
  copy.image.file = source.image.file
  copy.image.saved = source.image.saved
  cultivationPages.value.splice(index + 1, 0, copy)
  cultivationPages.value.forEach((page, pageIndex) => renameAssetIndex(page.image, `cultivation-${pageIndex + 1}`))
}

function moveCultivationPage(index, direction) {
  const destination = index + direction
  if (destination < 0 || destination >= cultivationPages.value.length) {
    return
  }

  const next = [...cultivationPages.value]
  ;[next[index], next[destination]] = [next[destination], next[index]]
  cultivationPages.value = next
  cultivationPages.value.forEach((page, pageIndex) => renameAssetIndex(page.image, `cultivation-${pageIndex + 1}`))
}

function removeCultivationPage(index) {
  if (cultivationPages.value.length <= 1) {
    cultivationPages.value = [createCultivationPage(1)]
    return
  }

  cultivationPages.value.splice(index, 1)
  cultivationPages.value.forEach((page, pageIndex) => {
    renameAssetIndex(page.image, `cultivation-${pageIndex + 1}`)
  })
}

function renameAssetIndex(asset, stem) {
  const extension = asset.path.match(/\.[a-z0-9]+$/i)?.[0] || '.png'
  asset.path = `${ASSET_FOLDER_NAME}/${stem}${extension}`
}

async function chooseIssueDirectory() {
  if (!isDirectoryApiAvailable.value) {
    ElMessage.error('请在 Chrome 或 Edge 中打开本页以选择期号目录')
    return
  }

  try {
    const directory = await window.showDirectoryPicker({ mode: 'readwrite' })
    issueDirectoryHandle.value = directory
    issueDirectoryName.value = directory.name
    ElMessage.success(`已选择 ${directory.name}`)
  } catch (error) {
    if (error?.name !== 'AbortError') {
      console.error('选择期号目录失败:', error)
      ElMessage.error(error?.message || '选择期号目录失败')
    }
  }
}

async function loadManifest() {
  if (!issueDirectoryHandle.value || isLoadingManifest.value) {
    return
  }

  try {
    isLoadingManifest.value = true
    const fileHandle = await issueDirectoryHandle.value.getFileHandle(MANIFEST_FILE_NAME)
    const file = await fileHandle.getFile()
    const manifest = JSON.parse(await file.text())
    await hydrateManifest(manifest)
    ElMessage.success('已读取本期清单')
  } catch (error) {
    if (error?.name === 'NotFoundError') {
      ElMessage.warning(`目录中没有 ${MANIFEST_FILE_NAME}`)
    } else {
      console.error('读取本期清单失败:', error)
      ElMessage.error(error?.message || '读取本期清单失败')
    }
  } finally {
    isLoadingManifest.value = false
  }
}

async function hydrateManifest(manifest) {
  const restoredMaterials = Array.isArray(manifest?.materials)
    ? manifest.materials.slice(0, 3).map((material, index) => ({
      title: String(material?.title || ''),
      seriesId: resolveMaterialSeriesId(material?.seriesId, material?.title),
      detail: createSavedAsset(material?.detailImage, `${ASSET_FOLDER_NAME}/material-${index + 1}-detail.png`),
      curve: createSavedAsset(material?.curveImage, `${ASSET_FOLDER_NAME}/material-${index + 1}-curve.png`),
    }))
    : []
  materials.value = restoredMaterials.length >= 2 ? restoredMaterials : [createMaterial(1), createMaterial(2)]

  activityStore.value = {
    title: String(manifest?.activityStore?.title || '活动商店'),
    sourceId: String(manifest?.activityStore?.sourceId || ''),
    columnLimit: normalizeActivityStoreColumnLimit(manifest?.activityStore?.columnLimit),
    image: createSavedAsset(manifest?.activityStore?.image, `${ASSET_FOLDER_NAME}/activity-store.png`),
  }

  packPages.value = Array.isArray(manifest?.packPages)
    ? manifest.packPages.map((page, index) => ({
      title: String(page?.title || '礼包性价比 - 活动礼包'),
      caption: String(page?.caption || ''),
      selectedPackIds: Array.isArray(page?.selectedPackIds) ? page.selectedPackIds.map(getPackId) : [],
      image: createSavedAsset(page?.image, `${ASSET_FOLDER_NAME}/pack-page-${index + 1}.png`),
    }))
    : []

  cultivationPages.value = Array.isArray(manifest?.cultivationPages)
    ? manifest.cultivationPages.map((page, index) => ({
      operatorId: resolveCultivationOperatorId(
        page,
        Array.isArray(page?.operators) ? page.operators[0] : '',
      ),
      operatorNames: Array.isArray(page?.operators) ? page.operators.join('、') : '',
      caption: String(page?.caption || ''),
      image: createSavedAsset(page?.image, `${ASSET_FOLDER_NAME}/cultivation-${index + 1}.png`),
    }))
    : []

  activityStore.value.image.storageKey = 'activity-store'
  materials.value.forEach((material, index) => {
    material.detail.storageKey ||= `material-${index + 1}-detail`
    material.curve.storageKey ||= `material-${index + 1}-curve`
  })
  packPages.value.forEach(page => {
    page.id ||= createDraftKey('pack-page')
    page.selectedPackIds = Array.isArray(page.selectedPackIds) ? page.selectedPackIds.map(getPackId) : []
    page.image.storageKey ||= createDraftKey('pack-image')
  })
  cultivationPages.value.forEach(page => {
    page.id ||= createDraftKey('cultivation-page')
    page.image.storageKey ||= createDraftKey('cultivation-image')
  })

  if (packPages.value.length === 0) {
    packPages.value = [createPackPage(1)]
  }
  if (cultivationPages.value.length === 0) {
    cultivationPages.value = [createCultivationPage(1)]
  }

  await restoreManifestAssetFiles()
}

function createSavedAsset(path, fallbackPath) {
  const asset = createImageAsset({
    path: typeof path === 'string' && path ? path : fallbackPath,
  })
  asset.saved = typeof path === 'string' && Boolean(path)
  return asset
}

async function restoreManifestAssetFiles() {
  if (!issueDirectoryHandle.value) {
    return
  }

  for (const asset of getAllAssets()) {
    if (!asset.saved || asset.file) {
      continue
    }

    try {
      asset.file = await readIssueFile(asset.path)
    } catch (error) {
      asset.saved = false
      console.warn(`读取期号图片失败: ${asset.path}`, error)
    }
  }
}

async function saveManifest() {
  if (!canSave.value || isSaving.value) {
    ElMessage.warning('请先选择本地目录')
    return
  }

  try {
    isSaving.value = true
    await writeAllAssets()
    const manifest = buildManifest()
    await writeTextFile(MANIFEST_FILE_NAME, `${JSON.stringify(manifest, null, 2)}\n`)
    await saveDraft()
    ElMessage.success(`已写入 ${MANIFEST_FILE_NAME}`)
  } catch (error) {
    console.error('写入本期清单失败:', error)
    ElMessage.error(error?.message || '写入本期清单失败')
  } finally {
    isSaving.value = false
  }
}

function buildManifest() {
  return {
    version: 2,
    kind: 'yield-overview-material-package',
    materials: materials.value.map(material => ({
      title: material.title.trim(),
      seriesId: material.seriesId,
      detailImage: hasAsset(material.detail) ? material.detail.path : '',
      curveImage: hasAsset(material.curve) ? material.curve.path : '',
    })),
    activityStore: {
      title: activityStore.value.title.trim(),
      sourceId: activityStore.value.sourceId,
      columnLimit: activityStore.value.columnLimit,
      image: hasAsset(activityStore.value.image) ? activityStore.value.image.path : '',
    },
    packPages: getConfiguredPackPages().map(page => ({
      title: page.title.trim(),
      caption: page.caption.trim(),
      image: hasAsset(page.image) ? page.image.path : '',
      selectedPackIds: page.selectedPackIds,
    })),
    cultivationPages: getConfiguredCultivationPages().map(page => ({
      operatorId: page.operatorId,
      operators: getCultivationPageOperatorNames(page),
      caption: page.caption.trim(),
      image: hasAsset(page.image) ? page.image.path : '',
    })),
  }
}

async function writeAllAssets() {
  for (const asset of getMaterialPackageAssets()) {
    await writeAsset(asset)
  }
}

async function writeAsset(asset) {
  if (!asset.file) {
    if (!asset.saved) {
      throw new Error(`缺少素材：${asset.path}`)
    }
    return
  }

  const pathParts = asset.path.split('/').filter(Boolean)
  const filename = pathParts.pop()
  let directory = issueDirectoryHandle.value
  for (const part of pathParts) {
    directory = await directory.getDirectoryHandle(part, { create: true })
  }

  const fileHandle = await directory.getFileHandle(filename, { create: true })
  const stream = await fileHandle.createWritable()
  await stream.write(asset.file)
  await stream.close()
  asset.saved = true
}

async function writeTextFile(filename, text) {
  const fileHandle = await issueDirectoryHandle.value.getFileHandle(filename, { create: true })
  const stream = await fileHandle.createWritable()
  await stream.write(text)
  await stream.close()
}

onMounted(async () => {
  await restoreDraft()
  isDraftReady.value = true
  refreshMaterialStageData()
  loadPacks()
  loadActivityStores()
  refreshCultivationData()
})

onBeforeUnmount(() => {
  if (draftSaveTimer) {
    clearTimeout(draftSaveTimer)
  }
  closeImagePreview()
  releaseCultivationPortraits()
})
</script>

<template>
  <main class="yield-ppt-console">
    <header class="yield-ppt-header">
      <div>
        <p>LogicalByte</p>
        <h1>收益速览素材工作台</h1>
      </div>
      <div class="yield-ppt-directory">
        <strong>{{ issueDirectoryName || '素材包下载或选择本地目录' }}</strong>
        <v-btn color="primary" :disabled="!isDirectoryApiAvailable" @click="chooseIssueDirectory">
          选择导出目录
        </v-btn>
      </div>
    </header>

    <section class="yield-ppt-section yield-ppt-material-package">
      <div class="yield-ppt-section-heading">
        <div>
          <h2>素材包</h2>
        </div>
        <div>
          <v-btn
            icon="mdi-file-import-outline"
            size="small"
            variant="text"
            :loading="isImportingDraft"
            title="导入草稿备份"
            @click="openDraftImport"
          />
          <v-btn
            icon="mdi-content-save-outline"
            size="small"
            variant="text"
            title="导出草稿备份"
            @click="exportDraftArchive"
          />
          <v-btn
            color="primary"
            :loading="isExportingArchive"
            :disabled="!canExportMaterialPackage"
            @click="exportMaterialPackage"
          >
            下载素材包
          </v-btn>
        </div>
      </div>
      <div class="yield-ppt-package-summary">
        <ul class="yield-ppt-package-status-list">
          <li
            v-for="item in materialPackageStatusItems"
            :key="item.key"
            :class="{ 'yield-ppt-package-status-ready': item.ready }"
          >
            {{ item.text }}
          </li>
        </ul>
        <div class="yield-ppt-directory-export">
          <span>{{ issueDirectoryName ? `将素材写入：${issueDirectoryName}` : '也可选择本地目录，直接写入 manifest 与图片' }}</span>
          <v-btn
            icon="mdi-folder-open-outline"
            size="small"
            variant="text"
            :disabled="!issueDirectoryHandle || isLoadingManifest"
            title="读取本地素材清单"
            @click="loadManifest"
          />
          <v-btn
            size="small"
            variant="tonal"
            :loading="isSaving"
            :disabled="!canSave"
            @click="saveManifest"
          >
            写入目录
          </v-btn>
        </div>
      </div>
    </section>

    <input
      ref="draftFileInputRef"
      class="yield-ppt-hidden-input"
      type="file"
      accept=".zip,.json,application/zip,application/json"
      @change="importDraftArchive"
    >

    <section class="yield-ppt-section">
      <div class="yield-ppt-section-heading">
        <h2>材料</h2>
        <v-btn
          icon="mdi-plus"
          size="small"
          variant="text"
          :disabled="materialLimitReached"
          title="增加第 3 组材料"
          @click="addMaterial"
        />
      </div>
      <div class="yield-ppt-rows">
        <div v-for="(material, index) in materials" :key="index" class="yield-ppt-row yield-ppt-material-row">
          <label>
            <span>材料</span>
            <select v-model="material.seriesId" @change="selectMaterialSeries(material)">
              <option value="">选择材料</option>
              <option v-for="option in materialOptions" :key="option.id" :value="option.id">
                {{ option.name }}
              </option>
            </select>
          </label>
          <label>
            <span>标题</span>
            <input v-model.trim="material.title" type="text" :placeholder="`材料 ${index + 1}`">
          </label>
          <label :class="{ 'yield-ppt-asset-ready': hasAsset(material.detail) }">
            <span>详情图</span>
            <div class="yield-ppt-file-control">
              <input type="file" accept="image/png,image/jpeg" @change="selectAsset(material.detail, $event)">
              <v-btn
                icon="mdi-eye-outline"
                size="small"
                variant="text"
                :disabled="materialDataLoading || !material.seriesId"
                title="预览详情图"
                @click="openMaterialPreview(index)"
              />
              <v-btn
                icon="mdi-image-sync-outline"
                size="small"
                variant="text"
                :loading="exportingMaterialDetailIndex === index"
                :disabled="materialDataLoading || !material.seriesId || getMaterialStageRows(material).length === 0"
                :title="materialDataLoading ? '正在刷新材料数据' : '按当前关卡数据生成详情图'"
                @click="generateMaterialDetailImage(material, index)"
              />
            </div>
          </label>
          <label :class="{ 'yield-ppt-asset-ready': hasAsset(material.curve) }">
            <span>需求曲线</span>
            <div class="yield-ppt-file-control">
              <input type="file" accept="image/png,image/jpeg" @change="selectAsset(material.curve, $event)">
              <v-btn
                icon="mdi-eye-outline"
                size="small"
                variant="text"
                :disabled="!getMaterialDemandSummary(index)"
                title="预览近两年月度需求曲线"
                @click.stop="openMaterialCurvePreview(index)"
              />
              <v-btn
                icon="mdi-chart-line"
                size="small"
                variant="text"
                :loading="exportingMaterialCurveIndex === index"
                :disabled="!getMaterialDemandSummary(index)"
                title="生成近两年月度需求曲线"
                @click.stop="generateMaterialCurveImage(material, index)"
              />
            </div>
            <div v-if="getMaterialDemandSummary(index)" class="yield-ppt-material-demand-summary">
              <span>总需求 <strong>{{ formatMaterialDemandCount(getMaterialDemandSummary(index).totalDemand) }}</strong></span>
              <span>近两年 <strong>{{ formatMaterialDemandCount(getMaterialDemandSummary(index).recentDemand) }}</strong></span>
              <v-btn
                icon="mdi-content-copy"
                size="x-small"
                variant="text"
                title="复制需求文本"
                @click.stop="copyMaterialDemandSummary(getMaterialDemandSummary(index))"
              />
            </div>
          </label>
          <div class="yield-ppt-row-actions">
            <v-btn
              v-if="materials.length > 2"
              icon="mdi-close"
              size="small"
              variant="text"
              title="移除材料"
              @click="removeMaterial(index)"
            />
          </div>
          <small>{{ material.detail.path }} · {{ material.curve.path }}</small>
        </div>
      </div>
    </section>

    <section class="yield-ppt-section">
      <div class="yield-ppt-section-heading">
        <h2>活动商店</h2>
      </div>
      <div class="yield-ppt-rows">
        <div class="yield-ppt-row yield-ppt-store-row">
          <label>
            <span>标题</span>
            <input v-model.trim="activityStore.title" type="text">
          </label>
          <label class="yield-ppt-activity-source">
            <span>公开数据源</span>
            <div class="yield-ppt-file-control">
              <el-select
                v-model="activityStore.sourceId"
                clearable
                filterable
                :loading="activityStoreLoading"
                placeholder="选择一图流活动商店"
                @change="selectActivityStoreSource"
              >
                <el-option
                  v-for="activity in activityStoreList"
                  :key="activity.id"
                  :label="activity.actName || `活动商店 ${Number(activity.id) + 1}`"
                  :value="activity.id"
                />
              </el-select>
              <v-btn
                icon="mdi-refresh"
                size="small"
                variant="text"
                :loading="activityStoreLoading"
                title="刷新活动商店数据"
                @click="loadActivityStores({ notify: true })"
              />
              <v-btn
                icon="mdi-eye-outline"
                size="small"
                variant="text"
                :disabled="!selectedActivityStore"
                title="预览活动商店图"
                @click="openActivityStorePreview"
              />
              <v-btn
                icon="mdi-image-sync-outline"
                size="small"
                variant="text"
                :loading="exportingActivityStoreIndex !== -1"
                :disabled="!selectedActivityStore || activityStoreLoading"
                title="生成活动商店图"
                @click="generateActivityStoreImage"
              />
            </div>
          </label>
          <label class="yield-ppt-store-columns">
            <span>每行列数</span>
            <v-btn-toggle v-model="activityStore.columnLimit" mandatory color="primary" density="compact">
              <v-btn :value="5">5 列</v-btn>
              <v-btn :value="6">6 列</v-btn>
              <v-btn :value="7">7 列</v-btn>
              <v-btn :value="8">8 列</v-btn>
            </v-btn-toggle>
          </label>
          <label :class="{ 'yield-ppt-asset-ready': hasAsset(activityStore.image) }">
            <span>商店图</span>
            <div class="yield-ppt-file-control">
              <input type="file" accept="image/png,image/jpeg" @change="selectAsset(activityStore.image, $event)">
              <v-btn
                icon="mdi-image-outline"
                size="small"
                variant="text"
                :disabled="!hasAsset(activityStore.image)"
                title="预览活动商店图"
                @click="openImagePreview('活动商店图', activityStore.image)"
              />
            </div>
          </label>
          <small>{{ activityStore.image.path }}</small>
        </div>
      </div>
    </section>

    <section class="yield-ppt-section">
      <div class="yield-ppt-section-heading">
        <h2>礼包分页</h2>
        <div>
          <v-btn
            icon="mdi-refresh"
            size="small"
            variant="text"
            :loading="packDataLoading"
            title="刷新礼包数据"
            @click="loadPacks({ notify: true })"
          />
          <v-btn
            icon="mdi-image-sync-outline"
            size="small"
            variant="text"
            :disabled="packDataLoading"
            title="重新生成全部礼包分页"
            @click="regenerateAllPackPages"
          />
          <v-btn icon="mdi-plus" size="small" variant="text" title="增加礼包页" @click="addPackPage" />
        </div>
      </div>
      <div v-if="packPages.length === 0" class="yield-ppt-empty">未添加礼包页</div>
      <div v-else class="yield-ppt-rows">
        <div v-for="(page, index) in packPages" :key="page.id" class="yield-ppt-row yield-ppt-pack-row">
          <label class="yield-ppt-pack-select">
            <span>礼包</span>
            <el-select
              v-model="page.selectedPackIds"
              multiple
              filterable
              clearable
              :loading="packDataLoading"
              placeholder="从礼包性价比数据中选择"
            >
              <el-option
                v-for="pack in packs"
                :key="pack.id"
                :label="getPackLabel(pack)"
                :value="getPackId(pack.id)"
              />
            </el-select>
          </label>
          <label>
            <span>标题</span>
            <input v-model.trim="page.title" type="text">
          </label>
          <label>
            <span>说明</span>
            <input v-model.trim="page.caption" type="text">
          </label>
          <label :class="{ 'yield-ppt-asset-ready': hasAsset(page.image) }">
            <span>分页图</span>
            <div class="yield-ppt-file-control">
              <input type="file" accept="image/png,image/jpeg" @change="selectAsset(page.image, $event)">
              <v-btn
                icon="mdi-image-outline"
                size="small"
                variant="text"
                :disabled="!hasAsset(page.image)"
                title="预览当前礼包分页图"
                @click="openImagePreview('礼包分页图', page.image)"
              />
            </div>
          </label>
          <div class="yield-ppt-pack-page-tools">
            <v-btn
              icon="mdi-eye-outline"
              size="small"
              variant="text"
              :disabled="getSelectedPacks(page).length === 0"
              title="预览礼包分页"
              @click="openPackPreview(page)"
            />
            <v-btn
              icon="mdi-image-sync-outline"
              size="small"
              variant="text"
              :loading="exportingPackPageId === page.id"
              :disabled="packDataLoading || getSelectedPacks(page).length === 0"
              title="生成礼包分页图"
              @click="generatePackPageImage(page, index)"
            />
          </div>
          <ol v-if="page.selectedPackIds.length > 0" class="yield-ppt-selected-pack-list">
            <li v-for="(pack, packIndex) in getSelectedPacks(page)" :key="pack.id">
              <span>{{ packIndex + 1 }}</span>
              <strong>{{ pack.officialName || pack.name }}</strong>
              <div>
                <v-btn
                  icon="mdi-chevron-up"
                  size="x-small"
                  variant="text"
                  :disabled="packIndex === 0"
                  title="上移礼包"
                  @click="movePackInPage(page, packIndex, -1)"
                />
                <v-btn
                  icon="mdi-chevron-down"
                  size="x-small"
                  variant="text"
                  :disabled="packIndex === getSelectedPacks(page).length - 1"
                  title="下移礼包"
                  @click="movePackInPage(page, packIndex, 1)"
                />
                <v-btn
                  icon="mdi-close"
                  size="x-small"
                  variant="text"
                  title="移除礼包"
                  @click="removePackFromPage(page, pack.id)"
                />
              </div>
            </li>
          </ol>
          <div class="yield-ppt-row-actions">
            <v-btn
              icon="mdi-content-copy"
              size="small"
              variant="text"
              title="复制礼包分页"
              @click="copyPackPage(index)"
            />
            <v-btn
              icon="mdi-chevron-up"
              size="small"
              variant="text"
              :disabled="index === 0"
              title="上移礼包分页"
              @click="movePackPage(index, -1)"
            />
            <v-btn
              icon="mdi-chevron-down"
              size="small"
              variant="text"
              :disabled="index === packPages.length - 1"
              title="下移礼包分页"
              @click="movePackPage(index, 1)"
            />
            <v-btn icon="mdi-close" size="small" variant="text" title="移除礼包页" @click="removePackPage(index)" />
          </div>
          <small>{{ page.image.path }}</small>
        </div>
      </div>
    </section>

    <section class="yield-ppt-section">
      <div class="yield-ppt-section-heading">
        <h2>培养成本分页</h2>
        <v-btn icon="mdi-plus" size="small" variant="text" title="增加培养成本页" @click="addCultivationPage" />
      </div>
      <div v-if="cultivationPages.length === 0" class="yield-ppt-empty">未添加培养成本页</div>
      <div v-else class="yield-ppt-rows">
        <div v-for="(page, index) in cultivationPages" :key="page.id" class="yield-ppt-row yield-ppt-cultivation-row">
          <label>
            <span>干员</span>
            <el-select
              v-model="page.operatorId"
              filterable
              :loading="cultivationDataLoading"
              placeholder="选择干员"
              @change="syncCultivationOperatorName(page)"
            >
              <el-option
                v-for="operator in cultivationOperatorOptions"
                :key="operator.charId"
                :label="`${operator.name} · ${operator.rarity} 星`"
                :value="operator.charId"
              />
            </el-select>
          </label>
          <label>
            <span>说明</span>
            <input v-model.trim="page.caption" type="text">
          </label>
          <label :class="{ 'yield-ppt-asset-ready': hasAsset(page.image) }">
            <span>分页图</span>
            <div class="yield-ppt-file-control">
              <input type="file" accept="image/png,image/jpeg" @change="selectAsset(page.image, $event)">
              <v-btn
                icon="mdi-image-outline"
                size="small"
                variant="text"
                :disabled="!hasAsset(page.image)"
                title="预览当前培养成本图"
                @click="openImagePreview('培养成本分页图', page.image)"
              />
            </div>
          </label>
          <div class="yield-ppt-cultivation-page-tools">
            <v-btn
              icon="mdi-eye-outline"
              size="small"
              variant="text"
              :disabled="!getCultivationOperator(page)"
              title="预览培养成本分页"
              @click="openCultivationPreview(page)"
            />
            <v-btn
              icon="mdi-image-sync-outline"
              size="small"
              variant="text"
              :loading="exportingCultivationPageId === page.id"
              :disabled="cultivationDataLoading || !getCultivationOperator(page)"
              title="生成培养成本分页图"
              @click="generateCultivationPageImage(page, index)"
            />
          </div>
          <div class="yield-ppt-row-actions">
            <v-btn
              icon="mdi-content-copy"
              size="small"
              variant="text"
              title="复制培养成本分页"
              @click="copyCultivationPage(index)"
            />
            <v-btn
              icon="mdi-chevron-up"
              size="small"
              variant="text"
              :disabled="index === 0"
              title="上移培养成本分页"
              @click="moveCultivationPage(index, -1)"
            />
            <v-btn
              icon="mdi-chevron-down"
              size="small"
              variant="text"
              :disabled="index === cultivationPages.length - 1"
              title="下移培养成本分页"
              @click="moveCultivationPage(index, 1)"
            />
            <v-btn icon="mdi-close" size="small" variant="text" title="移除培养成本页" @click="removeCultivationPage(index)" />
          </div>
          <small>{{ page.image.path }}</small>
        </div>
      </div>
    </section>

    <div class="material-detail-capture-layer" aria-hidden="true">
      <div
        v-for="(material, index) in materials"
        :key="`material-detail-${index}`"
        :ref="element => setMaterialDetailCaptureRef(index, element)"
        class="material-detail-capture"
      >
        <YieldPptMaterialDetailTable :rows="getMaterialStageRows(material)" />
      </div>
    </div>

    <div class="material-curve-capture-layer" aria-hidden="true">
      <div
        v-for="(material, index) in materials"
        :key="`material-curve-${index}`"
        :ref="element => setMaterialCurveCaptureRef(index, element)"
        class="material-curve-capture"
      >
        <YieldPptMaterialDemandChart :points="getMaterialDemandSummary(index)?.monthlyDemand || []" />
      </div>
    </div>

    <div class="yield-ppt-activity-capture-layer" :style="activityStoreExportStyle" aria-hidden="true">
      <div
        class="store-page yield-ppt-activity-capture-root activity-store-dev-mode activity-store-background-transparent"
        :class="`activity-store-layout-${activityStore.columnLimit}`"
        :style="activityStoreExportStyle"
      >
        <div
          v-for="activity in activityStoreList"
          :key="`activity-capture-${activity.id}`"
          :ref="element => setActivityStoreCaptureRef(activity.id, element)"
          class="act_store_block"
          :data-activity-store-index="activity.id"
        >
          <div
            v-for="(area, areaIndex) in activity.actStoreFormat"
            :key="areaIndex"
            class="activity-store-content"
          >
            <div
              v-for="item in area"
              :key="item.itemId"
              class="activity-store-good"
              :class="`activity-store-good-area-${areaIndex + 1}`"
            >
              <div class="activity-store-good-sprite">
                <div :class="`bg-${item.itemId}`"></div>
              </div>
              <div class="activity-store-good-info">
                <span class="activity-store-good-name">{{ item.itemName }}</span>
                <span
                  class="activity-store-good-efficiency"
                  :class="getActivityStoreColor(item.itemPPR, activity.actPPRBase, activity.actPPRStair)"
                >
                  {{ formatActivityStoreEfficiency(item.itemPPR) }}
                </span>
                <span class="activity-store-good-price">{{ item.itemPrice }}代币</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="yield-ppt-cultivation-capture-layer" aria-hidden="true">
      <div
        v-for="page in cultivationPages"
        :key="`cultivation-capture-${page.id}`"
        :ref="element => setCultivationCaptureRef(page.id, element)"
        class="yield-ppt-cultivation-capture"
      >
        <YieldOverviewChart
          :operator="getCultivationOperator(page)"
          :rows="getCultivationRows(page)"
          :portrait-src="getCultivationPortraitSource(page)"
        />
      </div>
    </div>

    <div class="yield-ppt-pack-capture-layer" aria-hidden="true">
      <div
        v-for="page in packPages"
        :key="`pack-capture-${page.id}`"
        :ref="element => setPackCaptureRef(page.id, element)"
        class="yield-ppt-pack-capture pack-efficiency-page pack-hide-countdown"
      >
        <PackCardGroup :model-value="getSelectedPacks(page)" force-expanded />
      </div>
    </div>

    <v-dialog v-model="materialPreviewOpen" max-width="960">
      <v-card v-if="materialPreview" class="material-detail-preview-dialog">
        <v-card-title>{{ materialPreview.title || '材料' }}详情图预览</v-card-title>
        <v-card-text>
          <YieldPptMaterialDetailTable :rows="getMaterialStageRows(materialPreview)" />
        </v-card-text>
      </v-card>
    </v-dialog>

    <v-dialog v-model="materialCurvePreviewOpen" max-width="1240">
      <v-card v-if="materialCurvePreview" class="material-curve-preview-dialog">
        <v-card-title>{{ materialCurvePreview.title || '材料' }}需求曲线预览</v-card-title>
        <v-card-text>
          <YieldPptMaterialDemandChart
            :points="getMaterialDemandSummary(materialCurvePreviewIndex)?.monthlyDemand || []"
          />
        </v-card-text>
      </v-card>
    </v-dialog>

    <v-dialog v-model="activityStorePreviewOpen" max-width="1100">
      <v-card v-if="selectedActivityStore" class="yield-ppt-activity-preview-dialog">
        <v-card-title>{{ selectedActivityStore.actName || '活动商店' }}</v-card-title>
        <v-card-text>
          <div
            class="store-page yield-ppt-activity-preview-root activity-store-dev-mode activity-store-background-transparent"
            :class="`activity-store-layout-${activityStore.columnLimit}`"
            :style="activityStoreExportStyle"
          >
            <div class="act_store_block">
              <div
                v-for="(area, areaIndex) in selectedActivityStore.actStoreFormat"
                :key="areaIndex"
                class="activity-store-content"
              >
                <div
                  v-for="item in area"
                  :key="item.itemId"
                  class="activity-store-good"
                  :class="`activity-store-good-area-${areaIndex + 1}`"
                >
                  <div class="activity-store-good-sprite">
                    <div :class="`bg-${item.itemId}`"></div>
                  </div>
                  <div class="activity-store-good-info">
                    <span class="activity-store-good-name">{{ item.itemName }}</span>
                    <span
                      class="activity-store-good-efficiency"
                      :class="getActivityStoreColor(item.itemPPR, selectedActivityStore.actPPRBase, selectedActivityStore.actPPRStair)"
                    >
                      {{ formatActivityStoreEfficiency(item.itemPPR) }}
                    </span>
                    <span class="activity-store-good-price">{{ item.itemPrice }}代币</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </v-card-text>
      </v-card>
    </v-dialog>

    <v-dialog v-model="cultivationPreviewOpen" max-width="1200">
      <v-card v-if="cultivationPreviewPage" class="yield-ppt-cultivation-preview-dialog">
        <v-card-title>培养成本分页预览</v-card-title>
        <v-card-text>
          <div class="yield-ppt-cultivation-preview">
            <YieldOverviewChart
              :operator="getCultivationOperator(cultivationPreviewPage)"
              :rows="getCultivationRows(cultivationPreviewPage)"
              :portrait-src="getCultivationPortraitSource(cultivationPreviewPage)"
            />
          </div>
        </v-card-text>
      </v-card>
    </v-dialog>

    <v-dialog v-model="packPreviewOpen" max-width="1100">
      <v-card v-if="packPreviewPage" class="yield-ppt-pack-preview-dialog">
        <v-card-title>{{ packPreviewPage.title || '礼包分页' }}</v-card-title>
        <v-card-text>
          <div class="yield-ppt-pack-preview pack-efficiency-page pack-hide-countdown">
            <PackCardGroup :model-value="getSelectedPacks(packPreviewPage)" force-expanded />
          </div>
        </v-card-text>
      </v-card>
    </v-dialog>

    <v-dialog v-model="imagePreviewOpen" max-width="1180">
      <v-card v-if="imagePreviewUrl" class="yield-ppt-image-preview-dialog">
        <v-card-title>{{ imagePreviewTitle }}</v-card-title>
        <v-card-text>
          <img :src="imagePreviewUrl" :alt="imagePreviewTitle">
        </v-card-text>
      </v-card>
    </v-dialog>
  </main>
</template>

<style scoped>
.yield-ppt-console {
  --console-bg: #f3f5f8;
  --panel-bg: #ffffff;
  --border: #dbe1e8;
  --heading: #172033;
  --text: #556477;
  --muted: #7f8b9b;

  min-height: calc(100vh - 64px);
  padding: 28px 24px 52px;
  background: var(--console-bg);
}

.yield-ppt-header,
.yield-ppt-section {
  max-width: 1180px;
  margin: 0 auto;
}

.yield-ppt-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 22px;
}

.yield-ppt-header p {
  margin: 0 0 5px;
  color: #3867d6;
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
}

.yield-ppt-header h1,
.yield-ppt-section h2 {
  margin: 0;
  color: var(--heading);
}

.yield-ppt-header h1 {
  font-size: 2rem;
  line-height: 1.2;
}

.yield-ppt-directory,
.yield-ppt-section-heading,
.yield-ppt-section-heading > div {
  display: flex;
  align-items: center;
}

.yield-ppt-directory {
  gap: 12px;
}

.yield-ppt-directory strong {
  max-width: 420px;
  overflow: hidden;
  color: var(--text);
  font-size: 0.86rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.yield-ppt-section {
  margin-top: 16px;
  border-top: 1px solid var(--border);
  background: var(--panel-bg);
}

.yield-ppt-section-heading {
  min-height: 58px;
  justify-content: space-between;
  gap: 16px;
  padding: 0 18px;
  border-bottom: 1px solid var(--border);
}

.yield-ppt-section-heading > div {
  gap: 6px;
}

.yield-ppt-section h2 {
  font-size: 1rem;
  line-height: 1.3;
}

.yield-ppt-package-status-list {
  display: grid;
  gap: 5px;
  margin: 0;
  padding: 0 0 14px;
  color: var(--muted);
  font-size: 0.76rem;
  font-weight: 400;
  line-height: 1.35;
  list-style: none;
}

.yield-ppt-package-status-ready {
  color: #20823a;
}

.yield-ppt-section-heading > div:first-child {
  gap: 10px;
}

.yield-ppt-package-summary {
  display: grid;
  padding: 16px 18px;
}

.yield-ppt-directory-export {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  color: var(--muted);
  font-size: 0.76rem;
}

.yield-ppt-hidden-input {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  opacity: 0;
  pointer-events: none;
}

.yield-ppt-rows {
  display: grid;
}

.yield-ppt-row {
  display: grid;
  position: relative;
  gap: 12px;
  padding: 16px 18px 32px;
  border-bottom: 1px solid var(--border);
}

.yield-ppt-row:last-child {
  border-bottom: 0;
}

.yield-ppt-material-row {
  grid-template-columns: minmax(140px, 0.75fr) minmax(140px, 0.75fr) minmax(250px, 1.25fr) minmax(250px, 1.25fr) auto;
}

.yield-ppt-store-row {
  grid-template-columns:
    minmax(150px, 0.75fr)
    minmax(230px, 1.15fr)
    minmax(120px, 0.55fr)
    minmax(240px, 1.35fr);
}

.yield-ppt-pack-row {
  grid-template-columns:
    minmax(240px, 1.35fr)
    minmax(160px, 0.9fr)
    minmax(160px, 0.9fr)
    minmax(260px, 1.3fr)
    auto
    auto;
}

.yield-ppt-cultivation-row {
  grid-template-columns:
    minmax(260px, 1.3fr)
    minmax(160px, 0.8fr)
    minmax(240px, 1.15fr)
    auto
    auto;
}

.yield-ppt-row label {
  display: grid;
  min-width: 0;
  gap: 6px;
}

.yield-ppt-row label > span {
  color: var(--muted);
  font-size: 0.76rem;
  font-weight: 700;
}

.yield-ppt-row input,
.yield-ppt-row select {
  min-width: 0;
  border: 1px solid #cbd4df;
  border-radius: 4px;
  outline: none;
  background: #ffffff;
  color: var(--heading);
  font: inherit;
}

.yield-ppt-row input:not([type="file"]),
.yield-ppt-row select {
  height: 36px;
  padding: 0 10px;
}

.yield-ppt-row input[type="file"] {
  width: 100%;
  min-height: 36px;
  padding: 6px 8px;
  font-size: 0.78rem;
}

.yield-ppt-file-control {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 4px;
}

.yield-ppt-file-control input {
  min-width: 0;
  flex: 1 1 auto;
}

.yield-ppt-material-demand-summary {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto;
  align-items: center;
  gap: 4px 8px;
  min-height: 24px;
  color: var(--muted);
  font-size: 0.74rem;
}

.yield-ppt-material-demand-summary span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.yield-ppt-material-demand-summary strong {
  color: var(--text);
  font-family: Consolas, "Courier New", monospace;
  font-weight: 700;
}

.yield-ppt-pack-select :deep(.el-select) {
  width: 100%;
}

.yield-ppt-pack-page-tools {
  display: flex;
  align-items: end;
  gap: 2px;
}

.yield-ppt-cultivation-page-tools {
  display: flex;
  align-items: end;
  gap: 2px;
}

.yield-ppt-activity-source :deep(.el-select) {
  min-width: 0;
  flex: 1 1 auto;
}

.yield-ppt-selected-pack-list {
  display: grid;
  grid-column: 1 / -2;
  gap: 4px;
  margin: 0;
  padding: 8px 10px;
  list-style: none;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: #f7f9fc;
}

.yield-ppt-selected-pack-list li {
  display: grid;
  grid-template-columns: 22px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  min-height: 28px;
}

.yield-ppt-selected-pack-list li > span {
  color: var(--muted);
  font-family: Consolas, "Courier New", monospace;
  font-size: 0.72rem;
  text-align: center;
}

.yield-ppt-selected-pack-list strong {
  overflow: hidden;
  color: var(--text);
  font-size: 0.78rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.yield-ppt-selected-pack-list li > div {
  display: flex;
}

.yield-ppt-row input:focus,
.yield-ppt-row select:focus {
  border-color: #3867d6;
  box-shadow: 0 0 0 3px rgba(56, 103, 214, 0.13);
}

.yield-ppt-row-actions {
  display: flex;
  align-items: end;
  padding-bottom: 1px;
}

.yield-ppt-row small {
  position: absolute;
  right: 18px;
  bottom: 10px;
  left: 18px;
  overflow: hidden;
  color: var(--muted);
  font-family: Consolas, "Courier New", monospace;
  font-size: 0.72rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.yield-ppt-row label.yield-ppt-asset-ready > span {
  color: #20823a;
}

.yield-ppt-empty {
  padding: 18px;
  color: var(--muted);
  font-size: 0.84rem;
}

.material-detail-capture-layer {
  position: fixed;
  top: 0;
  left: -10000px;
  width: 850px;
  pointer-events: none;
}

.material-detail-capture {
  width: 850px;
}

.material-curve-capture-layer {
  position: fixed;
  top: 0;
  left: -14000px;
  width: 1200px;
  pointer-events: none;
}

.material-curve-capture {
  width: 1200px;
}

.material-detail-preview-dialog :deep(.v-card-text) {
  overflow-x: auto;
  padding: 18px;
}

.material-curve-preview-dialog :deep(.v-card-text) {
  overflow: auto;
  padding: 18px;
  background: #ffffff;
}

.yield-ppt-activity-capture-layer,
.yield-ppt-cultivation-capture-layer {
  position: fixed;
  top: 0;
  left: -12000px;
  pointer-events: none;
}

.yield-ppt-activity-capture-layer {
}

.yield-ppt-activity-preview-dialog :deep(.v-card-text) {
  overflow: auto;
  padding: 18px;
  background: #e8ebf0;
}

.yield-ppt-activity-capture-root.activity-store-dev-mode .activity-store-good,
.yield-ppt-activity-preview-root.activity-store-dev-mode .activity-store-good {
  box-sizing: border-box;
  background: #ffffff;
  box-shadow: none;
}

.yield-ppt-cultivation-capture-layer {
  width: 1035px;
}

.yield-ppt-cultivation-capture {
  width: 1035px;
}

.yield-ppt-cultivation-preview-dialog :deep(.v-card-text) {
  overflow: auto;
  padding: 18px;
  background: #e8ebf0;
}

.yield-ppt-cultivation-preview {
  width: 1035px;
}

.yield-ppt-pack-capture-layer {
  position: fixed;
  top: 0;
  left: -12000px;
  width: 1040px;
  pointer-events: none;
}

.yield-ppt-pack-capture {
  width: 1040px;
  padding: 12px;
}

.yield-ppt-pack-capture :deep(.pack-card-container),
.yield-ppt-pack-preview :deep(.pack-card-container) {
  width: 1024px;
  max-width: none;
}

.yield-ppt-pack-capture :deep(.pack-card),
.yield-ppt-pack-preview :deep(.pack-card) {
  width: 500px;
  max-width: none;
}

.yield-ppt-pack-preview-dialog :deep(.v-card-text) {
  overflow: auto;
  padding: 18px;
  background: #e8ebf0;
}

.yield-ppt-pack-preview {
  width: 1040px;
  padding: 12px;
}

.yield-ppt-image-preview-dialog :deep(.v-card-text) {
  display: grid;
  max-height: calc(100vh - 170px);
  place-items: center;
  overflow: auto;
  padding: 18px;
  background: #e8ebf0;
}

.yield-ppt-image-preview-dialog img {
  display: block;
  max-width: 100%;
  max-height: calc(100vh - 210px);
  object-fit: contain;
}

:global(html.dark) .yield-ppt-console {
  --console-bg: #17191e;
  --panel-bg: #22252c;
  --border: #353a45;
  --heading: #f0f2f6;
  --text: #c5ccd6;
  --muted: #919aaa;
}

:global(html.dark) .yield-ppt-row input,
:global(html.dark) .yield-ppt-row select {
  border-color: #49515e;
  background: #181b21;
  color: #edf1f6;
}

:global(html.dark) .yield-ppt-selected-pack-list {
  background: #1b1e24;
}

@media (max-width: 980px) {
  .yield-ppt-material-row,
  .yield-ppt-pack-row,
  .yield-ppt-cultivation-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .yield-ppt-row-actions {
    position: absolute;
    right: 12px;
    top: 9px;
  }

  .yield-ppt-selected-pack-list {
    grid-column: 1 / -1;
  }
}

@media (max-width: 640px) {
  .yield-ppt-console {
    padding: 20px 12px 36px;
  }

  .yield-ppt-header {
    display: grid;
    align-items: start;
  }

  .yield-ppt-directory {
    align-items: start;
    flex-direction: column;
  }

  .yield-ppt-directory strong {
    max-width: 100%;
  }

  .yield-ppt-material-row,
  .yield-ppt-store-row,
  .yield-ppt-pack-row,
  .yield-ppt-cultivation-row {
    grid-template-columns: 1fr;
  }
}
</style>
