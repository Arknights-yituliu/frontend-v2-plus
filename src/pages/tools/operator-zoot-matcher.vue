<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import operatorDataAPI from '/src/api/operatorData.js'
import { listOperatorZootMatcherStageInfo, searchOperatorZootMatcherJobs } from '/src/api/operatorZootMatcher.js'
import OperatorAvatar from '/src/components/sprite/OperatorAvatar.vue'
import { operatorTableV2 } from '/src/utils/gameData.js'
import { createMessage } from '/src/utils/message.js'
import { buildOwnedOperatorLookup, normalizeOperatorName, resolveOperatorZootMatcherJobs } from '/src/utils/operatorZootMatcher.js'

const OPERATOR_ZOOT_MATCHER_MANUAL_OPERATOR_STORAGE_KEY = 'operator_zoot_matcher_manual_owned_operators_v1'
const LEGACY_MANUAL_OPERATOR_STORAGE_KEY = 'zoot_manual_owned_operators_v1'
const OPERATOR_ZOOT_MATCHER_OWNED_OPERATOR_META_STORAGE_KEY = 'operator_zoot_matcher_owned_operator_meta_v1'
const LEGACY_OWNED_OPERATOR_META_STORAGE_KEY = 'zoot_owned_operator_meta_v1'
const SKLAND_ACCOUNT_SESSION_STORAGE_KEY = 'skland_account_data'
const JOB_SEARCH_BATCH_PAGE_COUNT = 6
const DOCUMENT_SEARCH_BATCH_PAGE_COUNT = 1
const OPERATOR_ZOOT_MATCHER_JOB_PAGE_BASE_URL = 'https://prts.plus/'
const BILIBILI_LINK_REGEXP = /https?:\/\/(?:www\.)?(?:bilibili\.com|b23\.tv)\/[^\s]+/i
const MAX_LEVELS_BY_RARITY = {
  1: [30, 0, 0],
  2: [30, 0, 0],
  3: [40, 55, 0],
  4: [45, 60, 70],
  5: [50, 70, 80],
  6: [50, 80, 90],
}
const OWNED_OPERATOR_DIALOG_TAB_OPTIONS = [
  { label: '已持有', value: 'owned' },
  { label: '未持有', value: 'unowned' },
]
const OPERATOR_PROFESSION_OPTIONS = [
  { label: '先锋', value: 'PIONEER' },
  { label: '近卫', value: 'WARRIOR' },
  { label: '重装', value: 'TANK' },
  { label: '狙击', value: 'SNIPER' },
  { label: '术师', value: 'CASTER' },
  { label: '医疗', value: 'MEDIC' },
  { label: '辅助', value: 'SUPPORT' },
  { label: '特种', value: 'SPECIAL' },
]
const OPERATOR_RARITY_FILTER_OPTIONS = [
  { label: '6★', value: 6 },
  { label: '5★', value: 5 },
  { label: '4★', value: 4 },
  { label: '3★', value: 3 },
  { label: '2★', value: 2 },
  { label: '1★', value: 1 },
]
const OPERATOR_PROFESSION_LABEL_MAP = Object.freeze(
  OPERATOR_PROFESSION_OPTIONS
    .reduce((result, option) => {
      result[option.value] = option.label
      return result
    }, {}),
)
const OPERATOR_PROFESSION_ORDER = OPERATOR_PROFESSION_OPTIONS
  .map((option) => option.value)

const route = useRoute()
const router = useRouter()

const knownOperatorLookup = new Map()
const knownOperatorList = []
for (const [charId, operator] of Object.entries(operatorTableV2)) {
  const normalizedName = normalizeOperatorName(operator?.name)
  const rarity = sanitizeInteger(operator?.rarity) ?? 0
  const profession = String(operator?.profession || '').trim()

  if (!normalizedName) {
    continue
  }

  const knownOperator = {
    charId,
    name: operator.name,
    normalizedName,
    rarity,
    displayRarity: getDisplayRarityFromStoredRarity(rarity),
    profession,
  }

  knownOperatorLookup.set(normalizedName, knownOperator)
  knownOperatorList.push(knownOperator)
}

const resultSortOptions = [
  { label: '默认排序', value: 'default' },
  { label: '热度排序', value: 'hot' },
  { label: '评分排序', value: 'rating' },
  { label: '时间排序', value: 'time' },
]

const resultFilterOptions = [
  { label: '可以直接打', value: 'ready', maxLevel: 1, color: 'success' },
  { label: '需要借干员', value: 'borrow', maxLevel: 2, color: 'warning' },
  { label: '需要提升练度', value: 'train', maxLevel: 3, color: 'warning' },
  { label: '干员不满足要求', value: 'blocked', maxLevel: 4, color: 'error' },
]

const resultRatingFilterOptions = [
  { label: '⭐⭐⭐', value: 3 },
  { label: '⭐⭐⭐⭐', value: 4 },
  { label: '⭐⭐⭐⭐⭐', value: 5 },
]

const stageKeyword = ref('')
const loadingOwnedOperators = ref(false)
const searching = ref(false)
const ownedOperators = ref([])
const ownedOperatorSource = ref('empty')
const ownedOperatorMessage = ref('尚未读取到已持有干员')
const ownedOperatorError = ref('')
const manualOperatorText = ref('')
const manualOperatorInfo = ref('')
const ownedOperatorDialogVisible = ref(false)
const ownedOperatorDialogTab = ref('owned')
const ownedOperatorRarityFilters = ref([])
const ownedOperatorProfessionFilters = ref([])
const ownedOperatorUpdatedAt = ref('')
const operatorSettingsExpanded = ref(false)
const stageQueryNote = ref('')
const searchError = ref('')
const resolvedJobs = ref([])
const searchSession = ref(null)
const searchMeta = ref({
  searched: false,
  fetched: 0,
  total: 0,
  fetchedPages: 0,
  truncated: false,
  invalidCount: 0,
})

const exactStageMatchEnabled = ref(true)
const activeSearchAction = ref('')
const resultSortMode = ref('default')
const resultFilterMode = ref('train')
const resultRatingFilterMode = ref(4)

let searchTicket = 0
let stageInfoListPromise

const ownedOperatorLookup = computed(() => buildOwnedOperatorLookup(ownedOperators.value))
const ownedOperatorCount = computed(() => ownedOperators.value.length)
const hasOwnedOperators = computed(() => ownedOperatorCount.value > 0)
const canSearch = computed(() => hasOwnedOperators.value && stageKeyword.value.trim().length > 0 && !loadingOwnedOperators.value)
const canLoadMoreJobs = computed(() => {
  const session = searchSession.value

  return canSearch.value
    && Boolean(session)
    && session.keyword === stageKeyword.value.trim()
    && session.queryStates.some((state) => state.hasNext)
})
const ownedOperatorInfoSummaryText = computed(() => {
  return `${ownedOperatorCount.value} 位`
})
const ownedOperatorImportTimeSummaryText = computed(() => {
  if (!hasOwnedOperators.value) {
    return '--'
  }

  return formatOwnedOperatorImportTime(ownedOperatorUpdatedAt.value)
})
const ownedOperatorDialogSourceItems = computed(() => {
  if (ownedOperatorDialogTab.value === 'unowned') {
    const ownedIdentifiers = buildOwnedOperatorIdentifierSet()

    return [...knownOperatorList]
      .filter((operator) => !ownedIdentifiers.has(operator.charId) && !ownedIdentifiers.has(operator.normalizedName))
      .sort(sortOperatorDialogItems)
  }

  return [...ownedOperators.value].sort(sortOwnedOperatorDialogItems)
})
const ownedOperatorDialogCounts = computed(() => ({
  owned: ownedOperators.value.length,
  unowned: getUnownedKnownOperatorCount(),
}))
const ownedOperatorDialogSubtitle = computed(() => {
  return ownedOperatorDialogTab.value === 'unowned' ? '未持有' : '已持有'
})

const ownedOperatorSourceLabel = computed(() => {
  if (ownedOperatorSource.value === 'skland') {
    return '森空岛导入缓存'
  }

  if (ownedOperatorSource.value === 'survey') {
    return '练度调查已持有干员'
  }

  if (ownedOperatorSource.value === 'manual') {
    return '手动输入'
  }

  if (ownedOperatorSource.value === 'error') {
    return '读取失败'
  }

  return '未发现可用数据'
})

const ownedOperatorSourceTone = computed(() => {
  if (ownedOperatorSource.value === 'error') {
    return 'error'
  }

  if (hasOwnedOperators.value) {
    return 'success'
  }

  return 'warning'
})

const ownedOperatorSourceDescription = computed(() => {
  if (ownedOperatorSource.value === 'manual') {
    return '当前使用本地手动输入的干员名单进行匹配。'
  }

  if (ownedOperatorSource.value === 'skland') {
    return '当前优先使用浏览器中的森空岛导入缓存。'
  }

  if (ownedOperatorSource.value === 'survey') {
    return '当前使用已登录账号的练度调查持有干员数据。'
  }

  return '当前没有可用的持有干员数据，请先导入或手动填写后再搜索。'
})

const filteredOwnedOperators = computed(() => {
  const rarityFilters = Array.isArray(ownedOperatorRarityFilters.value) ? ownedOperatorRarityFilters.value : []
  const professionFilters = Array.isArray(ownedOperatorProfessionFilters.value) ? ownedOperatorProfessionFilters.value : []

  return ownedOperatorDialogSourceItems.value.filter((operator) => {
    if (rarityFilters.length > 0 && !rarityFilters.includes(getOperatorDisplayRarity(operator))) {
      return false
    }

    if (professionFilters.length > 0 && !professionFilters.includes(String(operator?.profession || '').trim())) {
      return false
    }

    return true
  })
})
const ownedOperatorDialogEmptyText = computed(() => {
  if (filteredOwnedOperators.value.length > 0) {
    return ''
  }

  if (ownedOperatorDialogTab.value === 'owned' && !hasOwnedOperators.value) {
    return '还没有已导入的干员数据。'
  }

  return '没有匹配到符合筛选条件的干员。'
})

function buildOwnedOperatorIdentifierSet() {
  const ownedIdentifiers = new Set()

  for (const operator of ownedOperators.value) {
    if (operator?.charId) {
      ownedIdentifiers.add(operator.charId)
    }

    const normalizedName = normalizeOperatorName(operator?.name)

    if (normalizedName) {
      ownedIdentifiers.add(normalizedName)
    }
  }

  return ownedIdentifiers
}

function getUnownedKnownOperatorCount() {
  const ownedIdentifiers = buildOwnedOperatorIdentifierSet()

  return knownOperatorList.filter((operator) => {
    return !ownedIdentifiers.has(operator.charId) && !ownedIdentifiers.has(operator.normalizedName)
  }).length
}

const filteredJobs = computed(() => {
  const maxFilterLevel = getResultFilterMaxLevel(resultFilterMode.value)
  const minimumRatingStars = getResultRatingFilterMinStars(resultRatingFilterMode.value)
  const jobs = resolvedJobs.value.filter((job) => {
    return Number(job.playabilityState?.filterLevel || 0) <= maxFilterLevel
      && getRatingStarValue(job.ratingRatio) >= minimumRatingStars
  })
  const sortedJobs = [...jobs]

  if (resultSortMode.value === 'hot') {
    return sortedJobs.sort(sortJobsByHot)
  }

  if (resultSortMode.value === 'rating') {
    return sortedJobs.sort(sortJobsByRating)
  }

  if (resultSortMode.value === 'time') {
    return sortedJobs.sort(sortJobsByTime)
  }

  return sortedJobs.sort(sortMatchedJobs)
})

const activeResultFilterModes = computed(() => {
  const maxFilterLevel = getResultFilterMaxLevel(resultFilterMode.value)
  return resultFilterOptions
    .filter((option) => option.maxLevel <= maxFilterLevel)
    .map((option) => option.value)
})

function getResultFilterMaxLevel(value) {
  return resultFilterOptions.find((option) => option.value === value)?.maxLevel || resultFilterOptions[resultFilterOptions.length - 1].maxLevel
}

function setResultFilterMode(value) {
  resultFilterMode.value = value
}

function getResultRatingFilterMinStars(value) {
  const normalizedValue = Number(value)

  if (!Number.isFinite(normalizedValue) || normalizedValue <= 0) {
    return 0
  }

  return normalizedValue
}

function triggerSearch() {
  return searchJobs()
}

function loadMoreJobs() {
  return searchJobs({
    append: true,
  })
}

function sanitizeInteger(value) {
  const number = Number(value)

  if (!Number.isFinite(number)) {
    return undefined
  }

  return Math.max(0, Math.floor(number))
}

function getMaxLevelsByRarity(rarity) {
  return MAX_LEVELS_BY_RARITY[rarity] || MAX_LEVELS_BY_RARITY[1]
}

function getDisplayRarityFromStoredRarity(rarity) {
  const normalizedRarity = sanitizeInteger(rarity)

  if (normalizedRarity === undefined) {
    return 1
  }

  return Math.min(6, Math.max(1, normalizedRarity + 1))
}

function getOperatorDisplayRarity(operator = {}) {
  if (sanitizeInteger(operator?.displayRarity) !== undefined) {
    return sanitizeInteger(operator.displayRarity)
  }

  return getDisplayRarityFromStoredRarity(operator?.rarity)
}

function getOperatorProfessionLabel(profession = '') {
  return OPERATOR_PROFESSION_LABEL_MAP[String(profession || '').trim()] || ''
}

function getOperatorProfessionOrder(profession = '') {
  const professionIndex = OPERATOR_PROFESSION_ORDER.indexOf(String(profession || '').trim())
  return professionIndex === -1 ? OPERATOR_PROFESSION_ORDER.length : professionIndex
}

function compareOperatorDialogItemNames(a = {}, b = {}) {
  return String(a?.name || '').localeCompare(String(b?.name || ''), 'zh-Hans-CN')
}

function sortOperatorDialogItems(a = {}, b = {}) {
  const rarityDiff = getOperatorDisplayRarity(b) - getOperatorDisplayRarity(a)

  if (rarityDiff !== 0) {
    return rarityDiff
  }

  const professionDiff = getOperatorProfessionOrder(a?.profession) - getOperatorProfessionOrder(b?.profession)

  if (professionDiff !== 0) {
    return professionDiff
  }

  return compareOperatorDialogItemNames(a, b)
}

function sortOwnedOperatorDialogItems(a = {}, b = {}) {
  const rarityDiff = getOperatorDisplayRarity(b) - getOperatorDisplayRarity(a)

  if (rarityDiff !== 0) {
    return rarityDiff
  }

  const progressDiff = getOperatorProgressScore(b) - getOperatorProgressScore(a)

  if (progressDiff !== 0) {
    return progressDiff
  }

  const professionDiff = getOperatorProfessionOrder(a?.profession) - getOperatorProfessionOrder(b?.profession)

  if (professionDiff !== 0) {
    return professionDiff
  }

  return compareOperatorDialogItemNames(a, b)
}

function getOperatorDialogMeta(operator = {}) {
  if (ownedOperatorDialogTab.value === 'unowned') {
    return '未持有'
  }

  return formatEliteLevelText(sanitizeInteger(operator?.elite), sanitizeInteger(operator?.level)) || '未录入等级'
}

function getOwnedOperatorDialogTabLabel(option = {}) {
  const count = ownedOperatorDialogCounts.value[option.value] ?? 0
  return `${option.label}-${count}`
}

function getOperatorProgressScore(operator = {}) {
  const rarity = sanitizeInteger(operator?.rarity) || 1
  const elite = sanitizeInteger(operator?.elite) || 0
  const level = sanitizeInteger(operator?.level) || 0
  const maxLevels = getMaxLevelsByRarity(rarity)
  let score = 0

  for (let index = 0; index < elite; index += 1) {
    score += maxLevels[index] || 0
  }

  return score + level
}

function normalizeOwnedOperatorRecord(operator = {}) {
  const normalizedName = normalizeOperatorName(operator?.name)
  const knownOperator = normalizedName ? knownOperatorLookup.get(normalizedName) : undefined
  const rarity = sanitizeInteger(operator?.rarity) ?? knownOperator?.rarity

  return {
    charId: operator?.charId || knownOperator?.charId,
    name: String(operator?.name || knownOperator?.name || '').trim(),
    rarity,
    displayRarity: getDisplayRarityFromStoredRarity(rarity),
    profession: String(operator?.profession || knownOperator?.profession || '').trim(),
    elite: sanitizeInteger(operator?.elite),
    level: sanitizeInteger(operator?.level),
    mainSkill: sanitizeInteger(operator?.mainSkill),
    skill1: sanitizeInteger(operator?.skill1),
    skill2: sanitizeInteger(operator?.skill2),
    skill3: sanitizeInteger(operator?.skill3),
    modX: sanitizeInteger(operator?.modX),
    modY: sanitizeInteger(operator?.modY),
    modD: sanitizeInteger(operator?.modD),
    modA: sanitizeInteger(operator?.modA),
    modB: sanitizeInteger(operator?.modB),
  }
}

function pickMaxDefinedValue(...values) {
  const definedValues = values.filter((value) => value !== undefined)

  if (definedValues.length === 0) {
    return undefined
  }

  return Math.max(...definedValues)
}

function mergeOwnedOperatorRecord(current = {}, incoming = {}) {
  const currentProgressScore = getOperatorProgressScore(current)
  const incomingProgressScore = getOperatorProgressScore(incoming)
  const progressSource = incomingProgressScore >= currentProgressScore ? incoming : current

  return {
    charId: incoming.charId || current.charId,
    name: incoming.name || current.name,
    rarity: incoming.rarity ?? current.rarity,
    elite: progressSource.elite ?? current.elite ?? incoming.elite,
    level: progressSource.level ?? current.level ?? incoming.level,
    mainSkill: pickMaxDefinedValue(current.mainSkill, incoming.mainSkill),
    skill1: pickMaxDefinedValue(current.skill1, incoming.skill1),
    skill2: pickMaxDefinedValue(current.skill2, incoming.skill2),
    skill3: pickMaxDefinedValue(current.skill3, incoming.skill3),
    modX: pickMaxDefinedValue(current.modX, incoming.modX),
    modY: pickMaxDefinedValue(current.modY, incoming.modY),
    modD: pickMaxDefinedValue(current.modD, incoming.modD),
    modA: pickMaxDefinedValue(current.modA, incoming.modA),
    modB: pickMaxDefinedValue(current.modB, incoming.modB),
  }
}

function deduplicateOperators(operators = []) {
  const operatorMap = new Map()

  for (const operator of operators) {
    const normalizedOperator = normalizeOwnedOperatorRecord(operator)
    const name = normalizedOperator.name

    if (!name) {
      continue
    }

    const key = normalizedOperator.charId || normalizeOperatorName(name)
    const currentOperator = operatorMap.get(key)

    operatorMap.set(
      key,
      currentOperator
        ? mergeOwnedOperatorRecord(currentOperator, normalizedOperator)
        : normalizedOperator,
    )
  }

  return [...operatorMap.values()].sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
}

function splitManualOperatorText(text = '') {
  return String(text)
    .split(/[\n\r,，、/／;；\t ]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function markOwnedOperatorUpdatedAt(value = new Date()) {
  const normalizedValue = normalizeTimestamp(value)
  ownedOperatorUpdatedAt.value = normalizedValue
}

function normalizeTimestamp(value) {
  if (!value) {
    return ''
  }

  const date = value instanceof Date ? value : new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return date.toISOString()
}

function readMigratedLocalStorageItem(storageKey, legacyStorageKey) {
  const currentValue = localStorage.getItem(storageKey)

  if (currentValue !== null) {
    return currentValue
  }

  const legacyValue = localStorage.getItem(legacyStorageKey)

  if (legacyValue !== null) {
    localStorage.setItem(storageKey, legacyValue)
  }

  return legacyValue
}

function readOwnedOperatorMeta() {
  try {
    const rawValue = readMigratedLocalStorageItem(
      OPERATOR_ZOOT_MATCHER_OWNED_OPERATOR_META_STORAGE_KEY,
      LEGACY_OWNED_OPERATOR_META_STORAGE_KEY,
    )

    if (!rawValue) {
      return {}
    }

    const parsedValue = JSON.parse(rawValue)
    return parsedValue && typeof parsedValue === 'object' ? parsedValue : {}
  } catch (error) {
    console.error('readOwnedOperatorMeta failed', error)
    return {}
  }
}

function getStoredOwnedOperatorUpdatedAt(source = '') {
  if (!source) {
    return ''
  }

  const meta = readOwnedOperatorMeta()
  return normalizeTimestamp(meta?.[source]?.updatedAt)
}

function setStoredOwnedOperatorUpdatedAt(source = '', value = '') {
  if (!source) {
    return
  }

  const normalizedValue = normalizeTimestamp(value)

  if (!normalizedValue) {
    return
  }

  const meta = readOwnedOperatorMeta()
  meta[source] = {
    updatedAt: normalizedValue,
  }
  localStorage.setItem(OPERATOR_ZOOT_MATCHER_OWNED_OPERATOR_META_STORAGE_KEY, JSON.stringify(meta))
}

function removeStoredOwnedOperatorUpdatedAt(source = '') {
  if (!source) {
    return
  }

  const meta = readOwnedOperatorMeta()

  if (!meta[source]) {
    return
  }

  delete meta[source]

  if (Object.keys(meta).length === 0) {
    localStorage.removeItem(OPERATOR_ZOOT_MATCHER_OWNED_OPERATOR_META_STORAGE_KEY)
    localStorage.removeItem(LEGACY_OWNED_OPERATOR_META_STORAGE_KEY)
    return
  }

  localStorage.setItem(OPERATOR_ZOOT_MATCHER_OWNED_OPERATOR_META_STORAGE_KEY, JSON.stringify(meta))
}

function resolveOwnedOperatorUpdatedAt(...values) {
  for (const value of values) {
    const normalizedValue = normalizeTimestamp(value)

    if (normalizedValue) {
      return normalizedValue
    }
  }

  return ''
}

function parseManualOperators(text = '') {
  const operatorMap = new Map()
  const unverifiedOperators = []

  for (const rawName of splitManualOperatorText(text)) {
    const normalizedName = normalizeOperatorName(rawName)

    if (!normalizedName || operatorMap.has(normalizedName)) {
      continue
    }

    const knownOperator = knownOperatorLookup.get(normalizedName)

    if (knownOperator) {
      operatorMap.set(normalizedName, {
        charId: knownOperator.charId,
        name: knownOperator.name,
        rarity: knownOperator.rarity,
      })
      continue
    }

    operatorMap.set(normalizedName, {
      charId: undefined,
      name: rawName,
    })
    unverifiedOperators.push(rawName)
  }

  return {
    operators: deduplicateOperators([...operatorMap.values()]),
    unverifiedOperators,
  }
}

function saveManualOperatorText(text = '') {
  const trimmedText = text.trim()

  if (!trimmedText) {
    localStorage.removeItem(OPERATOR_ZOOT_MATCHER_MANUAL_OPERATOR_STORAGE_KEY)
    localStorage.removeItem(LEGACY_MANUAL_OPERATOR_STORAGE_KEY)
    removeStoredOwnedOperatorUpdatedAt('manual')
    return
  }

  localStorage.setItem(OPERATOR_ZOOT_MATCHER_MANUAL_OPERATOR_STORAGE_KEY, trimmedText)
}

function readSklandOperatorsFromSession() {
  try {
    const savedAccountData = sessionStorage.getItem(SKLAND_ACCOUNT_SESSION_STORAGE_KEY)

    if (!savedAccountData) {
      return {
        operators: [],
        updatedAt: '',
      }
    }

    const parsedAccountData = JSON.parse(savedAccountData)
    const operatorDataList = Array.isArray(parsedAccountData?.operatorDataList) ? parsedAccountData.operatorDataList : []

    return {
      operators: deduplicateOperators(
        operatorDataList.map((operator) => ({
          charId: operator?.charId,
          name: operatorTableV2?.[operator?.charId]?.name || operator?.name,
          rarity: operatorTableV2?.[operator?.charId]?.rarity,
          elite: operator?.elite,
          level: operator?.level,
          mainSkill: operator?.mainSkill,
          skill1: operator?.skill1,
          skill2: operator?.skill2,
          skill3: operator?.skill3,
          modX: operator?.modX,
          modY: operator?.modY,
          modD: operator?.modD,
          modA: operator?.modA,
          modB: operator?.modB,
        })),
      ),
      updatedAt: resolveOwnedOperatorUpdatedAt(
        parsedAccountData?.importedAt,
        parsedAccountData?.updatedAt,
        parsedAccountData?.lastUpdatedAt,
        getStoredOwnedOperatorUpdatedAt('skland'),
      ),
    }
  } catch (error) {
    console.error('readSklandOperatorsFromSession failed', error)
    return {
      operators: [],
      updatedAt: '',
    }
  }
}

function mapSurveyOperators(list = []) {
  return deduplicateOperators(
    list
      .filter((operator) => operator?.own)
      .map((operator) => ({
        charId: operator?.charId,
        name: operatorTableV2?.[operator?.charId]?.name || operator?.name,
        rarity: operatorTableV2?.[operator?.charId]?.rarity,
        elite: operator?.elite,
        level: operator?.level,
        mainSkill: operator?.mainSkill,
        skill1: operator?.skill1,
        skill2: operator?.skill2,
        skill3: operator?.skill3,
        modX: operator?.modX,
        modY: operator?.modY,
        modD: operator?.modD,
        modA: operator?.modA,
        modB: operator?.modB,
      })),
  )
}

function applyManualOperators(options = {}) {
  const silent = options.silent === true
  const persist = options.persist !== false
  const restoredUpdatedAt = resolveOwnedOperatorUpdatedAt(
    options.updatedAt,
    persist ? new Date() : getStoredOwnedOperatorUpdatedAt('manual'),
  )
  const { operators, unverifiedOperators } = parseManualOperators(manualOperatorText.value)

  if (operators.length === 0) {
    manualOperatorInfo.value = ''

    if (persist) {
      saveManualOperatorText('')
    }

    if (!silent) {
      createMessage({
        type: 'warn',
        text: '请先输入至少 1 个干员名称再导入',
      })
    }

    return false
  }

  ownedOperators.value = operators
  ownedOperatorSource.value = 'manual'
  ownedOperatorError.value = ''
  markOwnedOperatorUpdatedAt(restoredUpdatedAt)
  manualOperatorInfo.value = unverifiedOperators.length > 0
    ? `有 ${unverifiedOperators.length} 个名称未在本站本地干员资料中校验，已按原名参与匹配。`
    : ''
  ownedOperatorMessage.value = manualOperatorInfo.value
    ? `已手动导入 ${operators.length} 名干员。${manualOperatorInfo.value}`
    : `已手动导入 ${operators.length} 名干员。`

  if (persist) {
    saveManualOperatorText(manualOperatorText.value)
    setStoredOwnedOperatorUpdatedAt('manual', restoredUpdatedAt)
  }

  if (!silent) {
    createMessage({
      type: 'success',
      text: `已手动导入 ${operators.length} 名干员`,
    })
  }

  return true
}

function loadManualOperatorsFromStorage() {
  const savedText = readMigratedLocalStorageItem(
    OPERATOR_ZOOT_MATCHER_MANUAL_OPERATOR_STORAGE_KEY,
    LEGACY_MANUAL_OPERATOR_STORAGE_KEY,
  )

  if (!savedText) {
    return false
  }

  manualOperatorText.value = savedText
  return applyManualOperators({
    silent: true,
    persist: false,
    updatedAt: getStoredOwnedOperatorUpdatedAt('manual'),
  })
}

async function loadOwnedOperators(options = {}) {
  const silent = options.silent === true
  const allowTimestampFallbackToNow = options.allowTimestampFallbackToNow === true

  loadingOwnedOperators.value = true
  ownedOperatorError.value = ''
  manualOperatorInfo.value = ''

  try {
    const sklandSessionData = readSklandOperatorsFromSession()
    const sklandOperators = sklandSessionData.operators

    if (sklandOperators.length > 0) {
      ownedOperators.value = sklandOperators
      ownedOperatorSource.value = 'skland'
      ownedOperatorMessage.value = `读取到 ${sklandOperators.length} 名已持有干员，优先使用当前浏览器内的森空岛导入缓存。`
      const updatedAt = resolveOwnedOperatorUpdatedAt(
        sklandSessionData.updatedAt,
        getStoredOwnedOperatorUpdatedAt('skland'),
        allowTimestampFallbackToNow ? new Date() : '',
      )
      markOwnedOperatorUpdatedAt(updatedAt)

      if (updatedAt) {
        setStoredOwnedOperatorUpdatedAt('skland', updatedAt)
      }

      if (!silent) {
        createMessage({
          type: 'success',
          text: `已读取森空岛导入缓存，共 ${sklandOperators.length} 名干员`,
        })
      }

      return
    }

    if (localStorage.getItem('USER_TOKEN')) {
      const response = await operatorDataAPI.getOperatorData()
      const surveyOperators = mapSurveyOperators(response?.data || [])

      if (surveyOperators.length > 0) {
        ownedOperators.value = surveyOperators
        ownedOperatorSource.value = 'survey'
        ownedOperatorMessage.value = `读取到 ${surveyOperators.length} 名已持有干员，来源为当前账号的练度调查数据。`
        const updatedAt = resolveOwnedOperatorUpdatedAt(
          response?.updateTime,
          response?.updatedAt,
          response?.data?.updateTime,
          response?.data?.updatedAt,
          getStoredOwnedOperatorUpdatedAt('survey'),
          allowTimestampFallbackToNow ? new Date() : '',
        )
        markOwnedOperatorUpdatedAt(updatedAt)

        if (updatedAt) {
          setStoredOwnedOperatorUpdatedAt('survey', updatedAt)
        }

        if (!silent) {
          createMessage({
            type: 'success',
            text: `已读取练度调查数据，共 ${surveyOperators.length} 名已持有干员`,
          })
        }

        return
      }
    }

    ownedOperators.value = []
    ownedOperatorSource.value = 'empty'
    ownedOperatorMessage.value = '没有读到可用的已持有干员数据，请先到练度调查页导入森空岛数据，或登录后填写练度调查。'
    markOwnedOperatorUpdatedAt('')

    if (!silent) {
      createMessage({
        type: 'warn',
        text: '未读取到已持有干员数据，请先导入森空岛或填写练度调查',
      })
    }
  } catch (error) {
    console.error('loadOwnedOperators failed', error)
    ownedOperators.value = []
    ownedOperatorSource.value = 'error'
    ownedOperatorError.value = error?.message || '读取已持有干员失败'
    ownedOperatorMessage.value = '读取已持有干员失败，请稍后重试。'
    markOwnedOperatorUpdatedAt('')

    if (!silent) {
      createMessage({
        type: 'error',
        text: ownedOperatorError.value,
      })
    }
  } finally {
    loadingOwnedOperators.value = false
  }
}

async function clearManualOperators() {
  manualOperatorText.value = ''
  manualOperatorInfo.value = ''
  saveManualOperatorText('')
  await loadOwnedOperators()
}

function syncStageQuery(keyword) {
  const nextQuery = {
    ...route.query,
  }

  if (keyword) {
    nextQuery.stage = keyword
  } else {
    delete nextQuery.stage
  }

  router.replace({
    query: nextQuery,
  })
}

async function loadStageInfoList() {
  if (!stageInfoListPromise) {
    stageInfoListPromise = listOperatorZootMatcherStageInfo()
      .then((response) => (Array.isArray(response) ? response : []))
      .catch((error) => {
        stageInfoListPromise = undefined
        throw error
      })
  }

  return stageInfoListPromise
}

function normalizeStageKeyword(text = '') {
  return String(text)
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/[（(](?:标准|磨难|简单|普通|突袭)[）)]$/u, '')
}

function isInternalStageIdKeyword(text = '') {
  return /^[a-z0-9_/-]+$/i.test(text) && text.includes('_')
}

function getStageInfoField(stage, camelKey, snakeKey) {
  return String(stage?.[camelKey] ?? stage?.[snakeKey] ?? '').trim()
}

function getStageInfoStageId(stage) {
  return getStageInfoField(stage, 'stageId', 'stage_id')
}

function getStageInfoLevelId(stage) {
  return getStageInfoField(stage, 'levelId', 'level_id')
}

function getStageInfoCatThree(stage) {
  return getStageInfoField(stage, 'catThree', 'cat_three')
}

function getStageInfoMatchValues(stage) {
  const levelId = getStageInfoLevelId(stage)
  const levelIdTail = levelId.split('/').filter(Boolean).pop() || ''

  return [
    getStageInfoStageId(stage),
    levelId,
    levelIdTail,
    getStageInfoCatThree(stage),
    getStageInfoField(stage, 'name', 'name'),
  ].filter(Boolean)
}

function matchesStageKeyword(stage, normalizedKeyword) {
  return getStageInfoMatchValues(stage).some((value) => normalizeStageKeyword(value) === normalizedKeyword)
}

function isToughStageInfo(stage) {
  const stageId = getStageInfoStageId(stage).toLowerCase()
  const levelId = getStageInfoLevelId(stage).toLowerCase()

  return stageId.includes('tough') || stageId.includes('#f#') || stageId.startsWith('hard_') || levelId.includes('/hard/')
}

function collectExactStageNames(stage) {
  const stageId = getStageInfoStageId(stage)
  const levelId = getStageInfoLevelId(stage)
  const levelIdTail = levelId.split('/').filter(Boolean).pop() || ''

  return [
    stageId,
    stageId.replace('#f#', ''),
    levelId,
    levelIdTail,
    getStageInfoCatThree(stage),
    getStageInfoField(stage, 'name', 'name'),
  ].filter(Boolean)
}

function createDocumentSearchPlan(keyword, note) {
  return {
    queryMode: 'document',
    queryKeywords: [keyword],
    exactStageIds: [],
    note,
  }
}

async function resolveStageSearchPlan(keyword) {
  const trimmedKeyword = keyword.trim()
  const normalizedKeyword = normalizeStageKeyword(trimmedKeyword)

  if (!exactStageMatchEnabled.value) {
    return createDocumentSearchPlan(
      trimmedKeyword,
      '当前已关闭关卡精确匹配，使用作业站原生关键词搜索。',
    )
  }

  if (isInternalStageIdKeyword(trimmedKeyword)) {
    const stageId = trimmedKeyword.toLowerCase()

    return {
      queryMode: 'level',
      queryKeywords: [stageId],
      exactStageIds: [stageId],
      note: `已按内部关卡 ID 精确搜索：${stageId}`,
    }
  }

  try {
    const stageInfoList = await loadStageInfoList()
    const wantsToughStage = normalizedKeyword.startsWith('H') && /\d/.test(normalizedKeyword[1] || '')
    const stageCodeKeyword = wantsToughStage ? normalizedKeyword.slice(1) : normalizedKeyword

    let matchedStages = stageInfoList.filter((stage) => matchesStageKeyword(stage, normalizedKeyword))

    if (matchedStages.length === 0 && wantsToughStage) {
      matchedStages = stageInfoList.filter((stage) => matchesStageKeyword(stage, stageCodeKeyword))
    }

    if (wantsToughStage) {
      matchedStages = matchedStages.filter(isToughStageInfo)
    }

    if (matchedStages.length > 0) {
      const queryKeywords = [...new Set(matchedStages.map(getStageInfoStageId).filter(Boolean))]
      const exactStageIds = [...new Set(matchedStages.flatMap(collectExactStageNames))]

      if (queryKeywords.length > 0 && exactStageIds.length > 0) {
        return {
          queryMode: 'level',
          queryKeywords,
          exactStageIds,
          note: `已按关卡精确匹配：${trimmedKeyword} -> ${exactStageIds.join(' / ')}`,
        }
      }
    }
  } catch (error) {
    console.error('resolveStageSearchPlan failed', error)
  }

  return createDocumentSearchPlan(
    trimmedKeyword,
    '未找到本站关卡映射，已回退为作业站原生关键词搜索。',
  )
}

function mergeStageQueryResults(results = []) {
  const jobMap = new Map()
  let total = 0
  let fetchedPages = 0
  let truncated = false

  for (const result of results) {
    total += Number(result?.total || 0)
    fetchedPages += Number(result?.fetchedPages || 0)
    truncated = truncated || Boolean(result?.truncated)

    for (const job of result?.jobs || []) {
      jobMap.set(job.id, job)
    }
  }

  return {
    jobs: [...jobMap.values()],
    total,
    fetchedPages,
    truncated,
  }
}

function createSearchSession(keyword, searchPlan) {
  return {
    keyword,
    searchPlan,
    jobs: [],
    nextQueryIndex: 0,
    queryStates: searchPlan.queryKeywords.map((queryKeyword) => ({
      queryMode: searchPlan.queryMode,
      queryKeyword,
      nextPage: 1,
      hasNext: true,
      total: 0,
      fetchedPages: 0,
    })),
  }
}

function mergeJobList(existingJobs = [], nextJobs = []) {
  const jobMap = new Map()

  for (const job of existingJobs) {
    jobMap.set(job.id, job)
  }

  for (const job of nextJobs) {
    jobMap.set(job.id, job)
  }

  return [...jobMap.values()]
}

function getNextSearchQueryState(session) {
  const queryStates = session.queryStates
  const queryCount = queryStates.length

  for (let offset = 0; offset < queryCount; offset += 1) {
    const stateIndex = (session.nextQueryIndex + offset) % queryCount
    const state = queryStates[stateIndex]

    if (state?.hasNext) {
      session.nextQueryIndex = (stateIndex + 1) % queryCount

      return state
    }
  }

  return null
}

async function fetchSearchSessionBatch(session) {
  const activeQueryStates = session.queryStates.filter((state) => state.hasNext)

  if (activeQueryStates.length === 0) {
    return {
      jobs: session.jobs,
      total: session.queryStates.reduce((sum, state) => sum + Number(state.total || 0), 0),
      fetchedPages: session.queryStates.reduce((sum, state) => sum + Number(state.fetchedPages || 0), 0),
      truncated: false,
    }
  }

  const stageQueryResults = []
  let remainingPageCount = session.searchPlan.queryMode === 'document'
    ? DOCUMENT_SEARCH_BATCH_PAGE_COUNT
    : JOB_SEARCH_BATCH_PAGE_COUNT

  while (remainingPageCount > 0) {
    const state = getNextSearchQueryState(session)

    if (!state) {
      break
    }

    const result = await searchOperatorZootMatcherJobs(state.queryKeyword, {
      queryMode: state.queryMode,
      startPage: state.nextPage,
      pageCount: 1,
    })

    state.nextPage = result.nextPage
    state.hasNext = Boolean(result.truncated)
    state.total = Number(result.total || 0)
    state.fetchedPages += Number(result.fetchedPages || 0)
    stageQueryResults.push(result)
    remainingPageCount -= Number(result.fetchedPages || 1)
  }

  const { jobs } = mergeStageQueryResults(stageQueryResults)

  session.jobs = mergeJobList(session.jobs, jobs)

  return {
    jobs: session.jobs,
    total: session.queryStates.reduce((sum, state) => sum + Number(state.total || 0), 0),
    fetchedPages: session.queryStates.reduce((sum, state) => sum + Number(state.fetchedPages || 0), 0),
    truncated: session.queryStates.some((state) => state.hasNext),
  }
}

function applyResolvedSearchJobs(jobs, searchPlan) {
  const { resolvedJobs: nextResolvedJobs, invalidJobs } = resolveOperatorZootMatcherJobs(jobs, ownedOperatorLookup.value)
  const exactStageResolvedJobs = nextResolvedJobs.filter((job) => {
    if (searchPlan.exactStageIds.length === 0) {
      return true
    }

    const normalizedJobStageName = normalizeStageKeyword(job.stageName)

    return searchPlan.exactStageIds.some((stageName) => normalizeStageKeyword(stageName) === normalizedJobStageName)
  })

  resolvedJobs.value = exactStageResolvedJobs.map((job) => {
    const playabilityState = getJobPlayabilityState(job)

    return {
      ...job,
      bilibiliUrl: extractBilibiliLink(job.details),
      operatorZootMatcherJobUrl: buildOperatorZootMatcherJobPageUrl(job.id),
      playabilityState,
      operatorComparisonItems: buildJobOperatorComparisonItems(job),
    }
  })

  return invalidJobs.length
}

function sortMatchedJobs(a, b) {
  return a.totalMissing - b.totalMissing
    || b.matchedRequirementCount - a.matchedRequirementCount
    || b.hotScore - a.hotScore
    || b.id - a.id
}

function sortJobsByHot(a, b) {
  return b.hotScore - a.hotScore
    || a.totalMissing - b.totalMissing
    || b.matchedRequirementCount - a.matchedRequirementCount
    || b.id - a.id
}

function sortJobsByRating(a, b) {
  return b.ratingRatio - a.ratingRatio
    || b.hotScore - a.hotScore
    || a.totalMissing - b.totalMissing
    || b.id - a.id
}

function getUploadTimestamp(value) {
  const timestamp = Date.parse(value || '')
  return Number.isNaN(timestamp) ? 0 : timestamp
}

function sortJobsByTime(a, b) {
  return getUploadTimestamp(b.uploadTime) - getUploadTimestamp(a.uploadTime)
    || b.hotScore - a.hotScore
    || a.totalMissing - b.totalMissing
    || b.id - a.id
}

function trimUrlTrailingPunctuation(url = '') {
  return String(url).replace(/[)）\]】}>》"'“”’'，。；！？,.!?]+$/g, '')
}

function extractBilibiliLink(text = '') {
  const matchedLink = String(text).match(BILIBILI_LINK_REGEXP)

  if (!matchedLink) {
    return ''
  }

  return trimUrlTrailingPunctuation(matchedLink[0])
}

function buildOperatorZootMatcherJobPageUrl(jobId) {
  const url = new URL(OPERATOR_ZOOT_MATCHER_JOB_PAGE_BASE_URL)
  url.searchParams.set('op', String(jobId))
  return url.toString()
}

function formatNameList(names = []) {
  const uniqueNames = [...new Set(
    names
      .map((name) => String(name || '').trim())
      .filter(Boolean),
  )]

  return uniqueNames.join('、')
}

function getGroupSlotLabel(group = {}) {
  const candidateNames = [...new Set(
    (group.candidates || [])
      .map((candidate) => candidate?.name)
      .filter(Boolean),
  )]

  if (candidateNames.length === 0) {
    return group.label || '某个分组'
  }

  if (candidateNames.length === 1) {
    return candidateNames[0]
  }

  const previewNames = candidateNames.slice(0, 3).join(' / ')
  return candidateNames.length <= 3 ? `${previewNames} 其一` : `${previewNames} 等其一`
}

function getMissingSlotLabels(job) {
  return [
    ...(job.missingOperators || []).map((operator) => operator.name),
    ...(job.missingGroups || []).map((group) => getGroupSlotLabel(group)),
  ]
}

function getTrainingGapLabels(job) {
  return [
    ...(job.trainingGapOperators || []).map((operator) => operator.name),
    ...(job.trainingGapGroups || []).map((group) => getGroupSlotLabel(group)),
  ]
}

function getUnknownGapLabels(job) {
  return [
    ...(job.readinessUnknownOperators || []).map((operator) => operator.name),
    ...(job.readinessUnknownGroups || []).map((group) => getGroupSlotLabel(group)),
  ]
}

function getJobPlayabilityState(job) {
  const totalSlots = Number(job.totalRequiredSlots || 0)
  const missingLabels = getMissingSlotLabels(job)
  const trainingLabels = getTrainingGapLabels(job)
  const unknownLabels = getUnknownGapLabels(job)
  const missingCount = missingLabels.length
  const trainingCount = trainingLabels.length
  const unknownCount = unknownLabels.length
  const issueCount = missingCount + trainingCount + unknownCount
  const trainingText = formatNameList(trainingLabels)
  const unknownText = formatNameList(unknownLabels)
  const hasTrainingRequirement = trainingCount > 0 || unknownCount > 0

  if (totalSlots > 13) {
    return {
      key: 'over_limit',
      isSatisfied: false,
      filterLevel: 4,
      color: 'error',
      label: '干员不满足要求',
      summary: '13 人装不下',
      detail: `需求 ${totalSlots} 人，超过 13 人上阵上限。`,
    }
  }

  if (missingCount >= 2) {
    return {
      key: 'missing_many',
      isSatisfied: false,
      filterLevel: 4,
      color: 'error',
      label: '干员不满足要求',
      summary: '缺人过多',
      detail: `缺少 ${missingCount} 个槽位（${formatNameList(missingLabels)}），助战只能补 1 个。`,
    }
  }

  if (missingCount === 1) {
    const supportLabel = missingLabels[0] || '1 名干员'
    const detailParts = [`需要借 ${supportLabel}`]

    if (trainingLabels.length > 0) {
      detailParts.push(`还需提升 ${trainingText} 的练度`)
    }

    if (unknownLabels.length > 0) {
      detailParts.push(`另有条件待确认：${unknownText}`)
    }

    return {
      key: trainingLabels.length > 0 ? 'borrow_and_train' : unknownLabels.length > 0 ? 'borrow_and_unknown' : 'borrow_only',
      isSatisfied: false,
      filterLevel: hasTrainingRequirement ? 3 : 2,
      color: 'warning',
      label: hasTrainingRequirement ? '需要提升练度' : '需要借干员',
      summary: hasTrainingRequirement
        ? trainingLabels.length > 0
          ? `需要借 ${supportLabel}，并提升练度`
          : `需要借 ${supportLabel}，并确认条件`
        : `需要借 ${supportLabel}`,
      detail: detailParts.join('；'),
    }
  }

  if (trainingLabels.length === 0 && unknownLabels.length === 0) {
    if (totalSlots === 13) {
      return {
        key: 'fill_support',
        isSatisfied: false,
        filterLevel: 2,
        color: 'warning',
        label: '需要借干员',
        summary: '需借 1 人填位',
        detail: '该作业需要 13 人，自己最多上 12 人，需借任意 1 名上场干员填位。',
      }
    }

    return {
      key: 'ready',
      isSatisfied: true,
      filterLevel: 1,
      color: 'success',
      label: '可以直接打',
      summary: '干员全部满足要求',
      detail: '',
    }
  }

  if (issueCount === 1) {
    const supportLabel = trainingLabels[0] || unknownLabels[0] || missingLabels[0] || '1 名干员'
    const detailParts = [`需要借 ${supportLabel}`]

    if (trainingCount === 1) {
      detailParts.push(`或提升 ${supportLabel} 的练度`)
    }

    if (unknownCount === 1) {
      detailParts.push(`或确认 ${supportLabel} 的条件`)
    }

    return {
      key: trainingCount === 1 ? 'borrow_or_train' : unknownCount === 1 ? 'borrow_or_confirm' : 'borrow_only',
      isSatisfied: false,
      filterLevel: 2,
      color: 'warning',
      label: '需要借干员',
      summary: `需要借 ${supportLabel}`,
      detail: detailParts.join('，'),
    }
  }

  const detailParts = []

  if (totalSlots === 13) {
    detailParts.push('该作业需要 13 人，自己最多上 12 人')
  }

  if (trainingLabels.length > 0) {
    if (trainingLabels.length === 1) {
      detailParts.push(`可借 ${trainingLabels[0]}，或提升其练度`)
    } else {
      detailParts.push(`练度不足：${trainingText}；可借其中 1 名，其余仍需提升练度`)
    }
  }

  if (unknownLabels.length > 0) {
    detailParts.push(`条件待确认：${unknownText}`)
  }

  return {
    key: trainingLabels.length > 0 ? 'train_or_borrow' : 'unknown',
    isSatisfied: false,
    filterLevel: 3,
    color: 'warning',
    label: '需要提升练度',
    summary: trainingLabels.length > 0 ? '需要提升练度' : '条件待确认',
    detail: detailParts.join('；'),
  }
}

async function searchJobs(options = {}) {
  const append = options.append === true
  const silent = options.silent === true
  const skipQuerySync = options.skipQuerySync === true
  const keyword = stageKeyword.value.trim()

  searchMeta.value.searched = true
  searchError.value = ''

  if (!append) {
    stageQueryNote.value = ''
  }

  if (!keyword) {
    resolvedJobs.value = []
    searchSession.value = null

    if (!silent) {
      createMessage({
        type: 'warn',
        text: '请输入要检索的关卡关键词',
      })
    }

    return
  }

  if (!hasOwnedOperators.value) {
    resolvedJobs.value = []
    searchSession.value = null

    if (!silent) {
      createMessage({
        type: 'warn',
        text: '请先准备你的持有干员数据，再进行作业匹配',
      })
    }

    return
  }

  if (append && (!searchSession.value || searchSession.value.keyword !== keyword)) {
    if (!silent) {
      createMessage({
        type: 'info',
        text: '请先搜索作业，再加载更多作业',
      })
    }

    return
  }

  const currentTicket = ++searchTicket
  searching.value = true
  activeSearchAction.value = append ? 'more' : 'search'

  if (!append) {
    resolvedJobs.value = []
  }

  try {
    let session = append ? searchSession.value : null

    if (!session) {
      const searchPlan = await resolveStageSearchPlan(keyword)

      if (currentTicket !== searchTicket) {
        return
      }

      stageQueryNote.value = searchPlan.note
      session = createSearchSession(keyword, searchPlan)
      searchSession.value = session
    } else {
      stageQueryNote.value = session.searchPlan.note
    }

    let batchResult = await fetchSearchSessionBatch(session)

    if (currentTicket !== searchTicket) {
      return
    }

    let invalidCount = applyResolvedSearchJobs(batchResult.jobs, session.searchPlan)

    if (!append && session.searchPlan.queryMode === 'level' && resolvedJobs.value.length === 0) {
      const fallbackPlan = createDocumentSearchPlan(
        keyword,
        '精确关卡搜索未找到作业，已回退为作业站原生关键词搜索。',
      )

      session = createSearchSession(keyword, fallbackPlan)
      searchSession.value = session
      stageQueryNote.value = fallbackPlan.note
      batchResult = await fetchSearchSessionBatch(session)

      if (currentTicket !== searchTicket) {
        return
      }

      invalidCount = applyResolvedSearchJobs(batchResult.jobs, fallbackPlan)
    }

    searchSession.value = {
      ...session,
      jobs: [...session.jobs],
      queryStates: session.queryStates.map((state) => ({ ...state })),
    }

    searchMeta.value = {
      searched: true,
      fetched: batchResult.jobs.length,
      total: batchResult.total,
      fetchedPages: batchResult.fetchedPages,
      truncated: batchResult.truncated,
      invalidCount,
    }

    if (!append && !skipQuerySync) {
      syncStageQuery(keyword)
    }

    if (!silent) {
      createMessage({
        type: filteredJobs.value.length > 0 ? 'success' : 'info',
        text: append
          ? (
              filteredJobs.value.length > 0
                ? `已加载更多作业，当前共找到 ${filteredJobs.value.length} 份符合条件的作业`
                : '已加载更多作业，暂无符合当前条件的作业'
            )
          : (
              filteredJobs.value.length > 0
                ? `共找到 ${filteredJobs.value.length} 份符合条件的作业`
                : '没有找到符合当前条件的作业'
            ),
      })
    }
  } catch (error) {
    if (currentTicket !== searchTicket) {
      return
    }

    console.error('searchJobs failed', error)
    if (!append) {
      resolvedJobs.value = []
      searchSession.value = null
    }

    searchError.value = error?.message || (append ? '加载更多作业失败' : '检索作业失败')

    if (!silent) {
      createMessage({
        type: 'error',
        text: searchError.value,
      })
    }
  } finally {
    if (currentTicket === searchTicket) {
      searching.value = false
      activeSearchAction.value = ''
    }
  }
}

function formatDateTime(value) {
  if (!value) {
    return '--'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString('zh-CN', {
    hour12: false,
  })
}

function formatDateOnly(value) {
  if (!value) {
    return '--'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '--'
  }

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatOwnedOperatorImportTime(value) {
  if (!value) {
    return '--'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '--'
  }

  const now = new Date()
  const diffMs = now.getTime() - date.getTime()

  if (diffMs < 86400000) {
    return `${Math.max(1, Math.floor(diffMs / 60000))}分钟前`
  }

  const dayDiff = Math.floor(diffMs / 86400000)

  if (dayDiff < 30) {
    return `${dayDiff}天前`
  }

  if (dayDiff < 365) {
    return `${Math.max(1, Math.floor(dayDiff / 30))}个月前`
  }

  return formatDateOnly(date)
}

function formatHotScore(value) {
  if (!Number.isFinite(value)) {
    return '0.0'
  }

  return value.toFixed(1)
}

function formatRatingRatio(value) {
  if (!Number.isFinite(value) || value <= 0) {
    return '--'
  }

  const normalizedValue = value <= 1 ? value * 100 : value
  return `${normalizedValue.toFixed(0)}%`
}

function getRatingStarStates(value) {
  const normalizedStars = getRatingStarValue(value)

  if (normalizedStars <= 0) {
    return []
  }
  const states = []

  for (let index = 0; index < 5; index += 1) {
    const starPosition = index + 1

    if (normalizedStars >= starPosition) {
      states.push('full')
      continue
    }

    if (normalizedStars >= starPosition - 0.5) {
      states.push('half')
      continue
    }

    states.push('empty')
  }

  return states
}

function getRatingStarValue(value) {
  if (!Number.isFinite(value) || value <= 0) {
    return 0
  }

  const normalizedValue = value <= 1 ? value * 100 : value
  return Math.max(0, Math.min(5, Math.round((normalizedValue / 20) * 2) / 2))
}

function getProgressReadinessMeta(readiness) {
  const metaMap = {
    ready: {
      label: '已达标',
      color: 'success',
    },
    unknown: {
      label: '待确认',
      color: 'info',
    },
    not_ready: {
      label: '',
      color: 'warning',
    },
    missing: {
      label: '未持有',
      color: 'error',
    },
  }

  return metaMap[readiness] || metaMap.unknown
}

function formatEliteLevelText(elite, level) {
  const parts = []

  if (Number.isFinite(elite) && elite > 0) {
    parts.push(`精${elite}`)
  }

  if (Number.isFinite(level) && level > 0) {
    parts.push(`${level}级`)
  }

  return parts.join(' ')
}

function formatSkillLevelText(skillLevel, skillMode = 'main') {
  if (!Number.isFinite(skillLevel) || skillLevel <= 0) {
    return ''
  }

  if (skillMode === 'mastery') {
    return `专${skillLevel}`
  }

  return `技能 ${skillLevel}级`
}

function formatSkillRequirementText(skillIndex, skillLevel, skillMode = 'main') {
  const skillLevelText = formatSkillLevelText(skillLevel, skillMode)

  if (!skillLevelText) {
    return ''
  }

  if (Number.isFinite(skillIndex) && skillIndex >= 1 && skillIndex <= 3) {
    return skillMode === 'mastery'
      ? `技能${skillIndex} ${skillLevelText}`
      : `技能${skillIndex} ${skillLevelText.replace(/^技能\s/, '')}`
  }

  return skillMode === 'mastery' ? `技能 ${skillLevelText}` : skillLevelText
}

function legacyFormatModuleText(moduleLevel) {
  if (!Number.isFinite(moduleLevel) || moduleLevel <= 0) {
    return ''
  }

  return `模组 ${moduleLevel}级`
}

function formatModuleTypeLabel(moduleType) {
  return moduleType ? `${moduleType}模组` : '模组'
}

function formatModuleText(moduleLevel, moduleType) {
  if (!Number.isFinite(moduleLevel) || moduleLevel <= 0) {
    return formatModuleTypeLabel(moduleType)
  }

  return `${formatModuleTypeLabel(moduleType)} ${moduleLevel}级`
}

function formatRequirementModuleText(requirementProfile = {}) {
  if (!requirementProfile.requiresModule) {
    return ''
  }

  const moduleTypes = [...new Set(
    (Array.isArray(requirementProfile.moduleCandidateTypes) ? requirementProfile.moduleCandidateTypes : [])
      .filter(Boolean),
  )]

  if (!requirementProfile.moduleType && Number.isFinite(requirementProfile.moduleNumber) && requirementProfile.moduleNumber > 0) {
    return `模组编号 ${requirementProfile.moduleNumber}`
  }

  if (requirementProfile.moduleType || moduleTypes.length === 1) {
    return formatModuleText(requirementProfile.moduleLevel, requirementProfile.moduleType || moduleTypes[0])
  }

  if (moduleTypes.length > 1) {
    return `${formatModuleText(requirementProfile.moduleLevel)}（${moduleTypes.join(' / ')}）`
  }

  return formatModuleText(requirementProfile.moduleLevel)
}

function formatRequirementProfileText(requirementProfile = {}) {
  const pieces = []
  const elite = Number.isFinite(requirementProfile.elite) ? requirementProfile.elite : requirementProfile.inferredElite
  const eliteLevelText = formatEliteLevelText(elite, requirementProfile.level)

  if (eliteLevelText) {
    pieces.push(eliteLevelText)
  }

  const skillText = formatSkillRequirementText(
    requirementProfile.skillIndex,
    requirementProfile.skillLevel,
    requirementProfile.skillMode,
  )

  if (skillText) {
    pieces.push(skillText)
  }

  const moduleText = formatRequirementModuleText(requirementProfile)

  if (moduleText) {
    pieces.push(moduleText)
  }

  return pieces.join(' / ') || '未标注额外练度要求'
}

function formatOwnedSkillText(ownedProfile = {}, requirementProfile = {}) {
  const skillIndex = requirementProfile.skillIndex

  if (requirementProfile.skillMode === 'mastery') {
    const ownedMasteryLevel = Number.isFinite(skillIndex) ? ownedProfile[`skill${skillIndex}`] : undefined

    if (Number.isFinite(ownedMasteryLevel) && ownedMasteryLevel > 0) {
      return formatSkillRequirementText(skillIndex, ownedMasteryLevel, 'mastery')
    }

    return formatSkillRequirementText(skillIndex, ownedProfile.mainSkill, 'main')
  }

  return formatSkillRequirementText(skillIndex, ownedProfile.mainSkill, 'main')
}

function legacyFormatOwnedModuleText(moduleLevel, requirementProfile = {}) {
  if (Number.isFinite(moduleLevel) && moduleLevel > 0) {
    return formatModuleText(moduleLevel)
  }

  if (Number.isFinite(moduleLevel) && moduleLevel === 0 && requirementProfile.requiresModule) {
    return '模组 未解锁'
  }

  return ''
}

function formatOwnedModuleText(moduleLevel, moduleType, requirementProfile = {}) {
  if (Number.isFinite(moduleLevel) && moduleLevel > 0) {
    return formatModuleText(moduleLevel, moduleType)
  }

  if (Number.isFinite(moduleLevel) && moduleLevel === 0 && requirementProfile.requiresModule) {
    return `${formatModuleTypeLabel(moduleType)} 未解锁`
  }

  if (!Number.isFinite(moduleLevel) && requirementProfile.requiresModule) {
    return `${formatModuleTypeLabel(moduleType)} 待确认`
  }

  return ''
}

function buildOwnedModuleSegments(ownedProfile = {}, requirementProfile = {}, missingChecks = [], unknownChecks = []) {
  const missingCheckSet = new Set(Array.isArray(missingChecks) ? missingChecks : [])
  const unknownCheckSet = new Set(Array.isArray(unknownChecks) ? unknownChecks : [])
  const moduleTypes = [...new Set(
    (Array.isArray(ownedProfile.moduleCandidateTypes) ? ownedProfile.moduleCandidateTypes : [])
      .filter(Boolean),
  )]

  if (moduleTypes.length === 0) {
    const fallbackText = formatOwnedModuleText(ownedProfile.module, requirementProfile.moduleType, requirementProfile)

    if (!fallbackText) {
      return []
    }

    return [{
      text: fallbackText,
      isUnmet: missingCheckSet.has('module'),
    }]
  }

  const branchReadinessMap = new Map(
    (Array.isArray(ownedProfile.moduleBranchReadiness) ? ownedProfile.moduleBranchReadiness : [])
      .map((branch) => [branch.type, branch]),
  )
  const segments = moduleTypes
    .map((type) => {
      const branchInfo = branchReadinessMap.get(type)
      const moduleLevel = branchInfo?.level ?? ownedProfile.moduleLevelsByType?.[type]
      const text = formatOwnedModuleText(moduleLevel, type, requirementProfile)

      if (!text) {
        return null
      }

      return {
        text,
        isUnmet: missingCheckSet.has('module')
          ? Boolean(branchInfo ? !branchInfo.meetsRequirement : true)
          : unknownCheckSet.has('module_branch') && branchInfo
            ? !branchInfo.meetsRequirement
            : false,
      }
    })
    .filter(Boolean)

  if (unknownCheckSet.has('module_branch')) {
    segments.push({
      text: '模组信息待确认',
      isUnmet: false,
    })
  }

  return segments
}

function buildOwnedProgressSegments(ownedProfile = {}, requirementProfile = {}, missingChecks = [], unknownChecks = []) {
  const missingCheckSet = new Set(Array.isArray(missingChecks) ? missingChecks : [])
  const segments = []
  const eliteLevelText = formatEliteLevelText(ownedProfile.elite, ownedProfile.level)

  if (eliteLevelText) {
    segments.push({
      text: eliteLevelText,
      isUnmet: missingCheckSet.has('level'),
    })
  }

  const skillText = formatOwnedSkillText(ownedProfile, requirementProfile)

  if (skillText) {
    segments.push({
      text: skillText,
      isUnmet: missingCheckSet.has('skill'),
    })
  }

  segments.push(...buildOwnedModuleSegments(ownedProfile, requirementProfile, missingChecks, unknownChecks))

  return segments
}

function getUniqueNames(names = []) {
  return [...new Set(
    names
      .map((name) => String(name || '').trim())
      .filter(Boolean),
  )]
}

function getGroupCandidateNames(group = {}) {
  return getUniqueNames((group.candidates || []).map((candidate) => candidate?.name))
}

function pickBestGroupCandidateEvaluation(group = {}) {
  const candidateEvaluations = Array.isArray(group.candidateEvaluations) ? group.candidateEvaluations : []
  const readinessRank = {
    ready: 4,
    unknown: 3,
    not_ready: 2,
    missing: 1,
  }

  return candidateEvaluations.reduce((bestCandidate, candidate) => {
    if (!candidate?.ownedOperator) {
      return bestCandidate
    }

    if (!bestCandidate) {
      return candidate
    }

    const currentRank = readinessRank[candidate.progress?.readiness] || 0
    const bestRank = readinessRank[bestCandidate.progress?.readiness] || 0

    if (currentRank !== bestRank) {
      return currentRank > bestRank ? candidate : bestCandidate
    }

    const currentScore = getOperatorProgressScore(candidate.ownedOperator)
    const bestScore = getOperatorProgressScore(bestCandidate.ownedOperator)

    if (currentScore !== bestScore) {
      return currentScore > bestScore ? candidate : bestCandidate
    }

    return candidate.name.localeCompare(bestCandidate.name, 'zh-CN') < 0 ? candidate : bestCandidate
  }, null)
}

function buildOwnedComparisonDetail(progress = {}, fallbackText = '') {
  const readiness = progress.readiness
  const requirementProfile = progress.requirementProfile || {}
  const ownedProfile = progress.ownedProfile || {}
  const detailSegments = buildOwnedProgressSegments(ownedProfile, requirementProfile, progress.missingChecks, progress.unknownChecks)

  if (readiness === 'missing') {
    return {
      segments: [{
        text: fallbackText || '未持有',
        isUnmet: true,
      }],
    }
  }

  if (readiness === 'ready') {
    return {
      segments: detailSegments.length > 0
        ? detailSegments
        : [{
          text: '已满足当前作业要求',
          isUnmet: false,
        }],
    }
  }

  if (readiness === 'unknown') {
    return {
      segments: detailSegments.length > 0
        ? detailSegments
        : [{
          text: '已持有',
          isUnmet: false,
        }],
    }
  }

  return {
    segments: detailSegments.length > 0
      ? detailSegments
      : [{
        text: '当前练度未录入',
        isUnmet: true,
      }],
  }
}

function buildOperatorComparisonItem(evaluation, index) {
  const readiness = evaluation.progress?.readiness
  const readinessMeta = getProgressReadinessMeta(evaluation.progress?.readiness)
  const ownedDetail = buildOwnedComparisonDetail(evaluation.progress, '未持有该干员')

  return {
    key: `operator-${evaluation.normalizedName || evaluation.name || index}`,
    readiness,
    isReady: readiness === 'ready',
    requirementTitle: evaluation.name,
    requirementCaption: '',
    requirementDetail: formatRequirementProfileText(evaluation.progress?.requirementProfile),
    ownedTitle: evaluation.ownedOperator?.name || '未持有',
    ownedCaption: '',
    ownedDetailSegments: ownedDetail.segments || [],
    ownedLabel: readinessMeta.label,
    ownedColor: readinessMeta.color,
  }
}

function buildGroupRequirementDetail(group = {}) {
  const requirementTexts = getUniqueNames(
    (group.candidateEvaluations || [])
      .map((candidate) => formatRequirementProfileText(candidate.progress?.requirementProfile))
      .filter((text) => text && text !== '未标注额外练度要求'),
  )

  if (requirementTexts.length === 1) {
    return `候选均需 ${requirementTexts[0]}`
  }

  if (requirementTexts.length > 1) {
    return '候选练度要求可能不同，请以作业详情为准'
  }

  return '至少满足其中 1 名即可'
}

function buildGroupComparisonItem(group, index) {
  const candidateNames = getGroupCandidateNames(group)
  const matchedCandidateNames = getUniqueNames((group.matchedCandidates || []).map((candidate) => candidate?.name))
  const bestCandidate = pickBestGroupCandidateEvaluation(group)
  const readiness = group.groupReadiness
  const readinessMeta = getProgressReadinessMeta(group.groupReadiness)
  let ownedDetailSegments = [{
    text: `未持有可用候选：${candidateNames.join(' / ')}`,
    isUnmet: true,
  }]

  if (bestCandidate) {
    const bestCandidateDetail = buildOwnedComparisonDetail(bestCandidate.progress, '已持有')
    ownedDetailSegments = bestCandidateDetail.segments || []
  }

  return {
    key: `group-${group.label || index}`,
    readiness,
    isReady: readiness === 'ready',
    requirementTitle: group.label || '分组位',
    requirementCaption: candidateNames.length > 0 ? `可选：${candidateNames.join(' / ')}` : '',
    requirementDetail: buildGroupRequirementDetail(group),
    ownedTitle: bestCandidate?.ownedOperator?.name || '未持有对应候选',
    ownedCaption: matchedCandidateNames.length > 1 ? `已持有：${matchedCandidateNames.join(' / ')}` : '',
    ownedDetailSegments,
    ownedLabel: readinessMeta.label,
    ownedColor: readinessMeta.color,
  }
}

function buildJobOperatorComparisonItems(job = {}) {
  const operatorItems = (job.requiredOperatorEvaluations || []).map((evaluation, index) => buildOperatorComparisonItem(evaluation, index))
  const groupItems = (job.groupEvaluations || []).map((group, index) => buildGroupComparisonItem(group, index))
  return [...operatorItems, ...groupItems].filter((item) => !item.isReady)
}

function openOperatorSurvey() {
  router.push({
    name: 'OperatorSurvey',
  })
}

function openOwnedOperatorDialog() {
  ownedOperatorDialogTab.value = 'owned'
  ownedOperatorRarityFilters.value = []
  ownedOperatorProfessionFilters.value = []
  ownedOperatorDialogVisible.value = true
}

onMounted(async () => {
  if (typeof route.query.stage === 'string') {
    stageKeyword.value = route.query.stage
  }

  const hasManualOperators = loadManualOperatorsFromStorage()

  if (!hasManualOperators) {
    await loadOwnedOperators({
      silent: true,
    })
  }

  if (stageKeyword.value.trim() && hasOwnedOperators.value) {
    await searchJobs({
      silent: true,
      skipQuerySync: true,
    })
  }
})
</script>

<template>
  <div class="operator-zoot-matcher-page">
    <div class="page-shell">
      <div class="matcher-layout">
        <main class="matcher-main">
          <v-card class="toolbox-card">
          <div class="search-panel">
            <div class="search-inline">
              <v-text-field
                v-model="stageKeyword"
                label="搜索关键词"
                placeholder="例如 7-18、H12-4、BD、全息"
                variant="outlined"
                density="comfortable"
                hide-details
                @keydown.enter="triggerSearch"
              ></v-text-field>

              <div class="search-actions">
                <div class="search-action-group">
                  <v-btn
                    class="search-mode-btn"
                    color="primary"
                    variant="flat"
                    :loading="searching && activeSearchAction === 'search'"
                    :disabled="!canSearch || searching"
                    @click="triggerSearch"
                  >
                    搜索作业
                  </v-btn>
                  <v-btn
                    class="search-mode-btn"
                    color="secondary"
                    variant="outlined"
                    :loading="searching && activeSearchAction === 'more'"
                    :disabled="!canLoadMoreJobs || searching"
                    @click="loadMoreJobs"
                  >
                    加载更多作业
                  </v-btn>
                </div>
              </div>
            </div>

            <div class="search-option-groups">
              <div class="search-option-block">
                <span class="search-option-label">排序</span>
                <v-btn-toggle
                  v-model="resultSortMode"
                  color="primary"
                  mandatory
                  density="compact"
                  class="control-toggle"
                >
                  <v-btn
                    v-for="option in resultSortOptions"
                    :key="option.value"
                    :value="option.value"
                    variant="text"
                  >
                    {{ option.label }}
                  </v-btn>
                </v-btn-toggle>
              </div>

              <div class="search-option-block search-option-block-wide">
                <span class="search-option-label">Box筛选</span>
                <v-btn-toggle
                  :model-value="activeResultFilterModes"
                  color="primary"
                  multiple
                  density="compact"
                  class="control-toggle filter-toggle"
                >
                  <v-btn
                    v-for="option in resultFilterOptions"
                    :key="option.value"
                    :value="option.value"
                    variant="text"
                    @click="setResultFilterMode(option.value)"
                  >
                    {{ option.label }}
                  </v-btn>
                </v-btn-toggle>
              </div>

              <div class="search-option-block">
                <span class="search-option-label">评分筛选</span>
                <v-btn-toggle
                  v-model="resultRatingFilterMode"
                  color="primary"
                  density="compact"
                  class="control-toggle rating-filter-toggle"
                >
                  <v-btn
                    v-for="option in resultRatingFilterOptions"
                    :key="option.value"
                    :value="option.value"
                    variant="text"
                  >
                    {{ option.label }}
                  </v-btn>
                </v-btn-toggle>
              </div>
            </div>

            <div class="operator-import-row">
              <v-btn
                class="operator-import-toggle"
                variant="text"
                color="secondary"
                density="comfortable"
                @click="operatorSettingsExpanded = !operatorSettingsExpanded"
              >
                <v-icon icon="mdi-cog-outline" size="18"></v-icon>
                <span>干员导入设置</span>
              </v-btn>

              <span class="operator-inline-stat">当前干员 {{ ownedOperatorInfoSummaryText }}</span>
              <span class="operator-inline-stat">上次导入时间 {{ ownedOperatorImportTimeSummaryText }}</span>
            </div>

            <v-expand-transition>
              <div v-if="operatorSettingsExpanded" class="operator-settings-panel">
                <v-btn class="operator-action-btn" color="primary" variant="outlined" @click="openOwnedOperatorDialog">
                  查看干员列表
                </v-btn>
                <v-btn class="operator-action-btn" color="secondary" variant="outlined" @click="openOperatorSurvey">
                  前往导入设置
                </v-btn>
                <v-btn class="operator-action-btn" color="primary" variant="tonal" :loading="loadingOwnedOperators" @click="loadOwnedOperators({ allowTimestampFallbackToNow: true })">
                  重新导入干员
                </v-btn>
              </div>
            </v-expand-transition>
          </div>
        </v-card>

        <section class="result-section">
          <v-alert v-if="searchError" type="error" variant="tonal" class="result-alert">
            {{ searchError }}
          </v-alert>

          <div v-if="searching" class="loading-wrap">
            <v-progress-circular indeterminate color="primary"></v-progress-circular>
            <span>搜索中...</span>
          </div>

          <div v-else-if="filteredJobs.length > 0" class="result-list-wrap">
            <div class="result-item-list">
              <article
                v-for="job in filteredJobs"
                :key="job.id"
                class="result-item-card"
              >
                <div class="result-item-top">
                  <div class="result-item-main">
                    <div class="result-item-head">
                      <div class="result-item-title">{{ job.displayTitle }}</div>
                    </div>

                    <div class="result-item-meta">
                      <span>{{ job.stageName || '未知' }}</span>
                      <span>热度 {{ formatHotScore(job.hotScore) }}</span>
                      <span class="rating-inline">
                        <span>评分</span>
                        <span v-if="getRatingStarStates(job.ratingRatio).length > 0" class="rating-stars" :aria-label="formatRatingRatio(job.ratingRatio)">
                          <span
                            v-for="(state, index) in getRatingStarStates(job.ratingRatio)"
                            :key="`${job.id}-rating-${index}`"
                            class="rating-star"
                            :class="`is-${state}`"
                          >
                            <span class="rating-star-empty">☆</span>
                            <span v-if="state !== 'empty'" class="rating-star-fill">★</span>
                          </span>
                        </span>
                        <span v-else>--</span>
                      </span>
                      <span>{{ formatDateTime(job.uploadTime) }}</span>
                    </div>
                  </div>

                  <div class="result-item-links">
                    <v-btn
                      class="result-link-btn"
                      size="small"
                      variant="outlined"
                      color="primary"
                      :href="job.bilibiliUrl || undefined"
                      target="_blank"
                      rel="noreferrer"
                      :disabled="!job.bilibiliUrl"
                    >
                      {{ job.bilibiliUrl ? '视频链接' : '未检索到视频链接' }}
                    </v-btn>
                    <v-btn
                      class="result-link-btn"
                      size="small"
                      variant="outlined"
                      color="primary"
                      :href="job.operatorZootMatcherJobUrl"
                      target="_blank"
                      rel="noreferrer"
                    >
                      作业站链接
                    </v-btn>
                  </div>
                </div>

                <div class="result-item-bottom">
                  <div
                    v-if="job.playabilityState.isSatisfied || job.operatorComparisonItems.length === 0"
                    class="result-item-status"
                    :class="[`tone-${job.playabilityState.color}`, { 'is-ready-status': job.playabilityState.key === 'ready' }]"
                  >
                    <div class="result-item-status-title">
                      <v-icon v-if="job.playabilityState.key === 'ready'" color="success" size="18" icon="mdi-check-circle"></v-icon>
                      <span>{{ job.playabilityState.summary }}</span>
                    </div>
                    <div v-if="job.playabilityState.detail" class="result-item-status-detail">{{ job.playabilityState.detail }}</div>
                  </div>

                  <div v-else class="result-item-compare">
                    <div class="result-compare-head">
                      <div class="result-compare-title">作业要求</div>
                      <div class="result-compare-title">我的干员</div>
                    </div>

                    <div class="result-compare-rows">
                      <div
                        v-for="item in job.operatorComparisonItems"
                        :key="item.key"
                        class="result-compare-row"
                      >
                        <div class="result-compare-item">
                          <div class="result-compare-item-title">{{ item.requirementTitle }}</div>
                          <div v-if="item.requirementCaption" class="result-compare-item-caption">{{ item.requirementCaption }}</div>
                          <div class="result-compare-item-detail">{{ item.requirementDetail }}</div>
                        </div>

                        <div
                          class="result-compare-item"
                          :class="{ 'is-unmet': !item.isReady }"
                        >
                          <div class="result-compare-item-head">
                            <div class="result-compare-item-title">{{ item.ownedTitle }}</div>
                            <v-chip v-if="item.ownedLabel" size="x-small" variant="tonal" :color="item.ownedColor">
                              {{ item.ownedLabel }}
                            </v-chip>
                          </div>
                          <div v-if="item.ownedCaption" class="result-compare-item-caption">{{ item.ownedCaption }}</div>
                          <div v-if="item.ownedDetailSegments?.length" class="result-compare-item-detail">
                            <template v-for="(segment, segmentIndex) in item.ownedDetailSegments" :key="`${item.key}-segment-${segmentIndex}`">
                              <span v-if="segmentIndex > 0"> / </span>
                              <span :class="{ 'text-unmet': segment.isUnmet }">{{ segment.text }}</span>
                            </template>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            </div>
          </div>

          <div v-else class="empty-state">
            <div class="empty-title">
              {{ searchMeta.searched ? '没有符合条件的作业' : '暂无结果' }}
            </div>
          </div>
      </section>
        </main>

      </div>

    </div>

    <v-dialog v-model="ownedOperatorDialogVisible" max-width="980">
      <v-card class="owned-operator-dialog-card">
        <div class="owned-operator-dialog-head">
          <div>
            <h3 class="owned-operator-dialog-title">持有干员</h3>
            <p class="owned-operator-dialog-subtitle">{{ ownedOperatorDialogSubtitle }}</p>
          </div>
          <v-btn variant="text" @click="ownedOperatorDialogVisible = false">
            关闭
          </v-btn>
        </div>

        <div class="operator-dialog-toolbar">
          <div class="search-option-block operator-dialog-filter-block">
            <span class="search-option-label">列表</span>
            <v-btn-toggle
              v-model="ownedOperatorDialogTab"
              class="control-toggle operator-dialog-toggle"
              color="primary"
              mandatory
              density="compact"
            >
              <v-btn
                v-for="option in OWNED_OPERATOR_DIALOG_TAB_OPTIONS"
                :key="option.value"
                :value="option.value"
                size="small"
              >
                {{ getOwnedOperatorDialogTabLabel(option) }}
              </v-btn>
            </v-btn-toggle>
          </div>

          <div class="search-option-block operator-dialog-filter-block">
            <span class="search-option-label">稀有度筛选</span>
            <v-btn-toggle
              v-model="ownedOperatorRarityFilters"
              class="control-toggle operator-dialog-toggle"
              color="primary"
              density="compact"
              multiple
            >
              <v-btn
                v-for="option in OPERATOR_RARITY_FILTER_OPTIONS"
                :key="option.value"
                :value="option.value"
                size="small"
              >
                {{ option.label }}
              </v-btn>
            </v-btn-toggle>
          </div>

          <div class="search-option-block operator-dialog-filter-block">
            <span class="search-option-label">职业筛选</span>
            <v-btn-toggle
              v-model="ownedOperatorProfessionFilters"
              class="control-toggle operator-dialog-toggle"
              color="primary"
              density="compact"
              multiple
            >
              <v-btn
                v-for="option in OPERATOR_PROFESSION_OPTIONS"
                :key="option.value"
                :value="option.value"
                size="small"
              >
                {{ option.label }}
              </v-btn>
            </v-btn-toggle>
          </div>
        </div>

        <div v-if="filteredOwnedOperators.length > 0" class="operator-dialog-grid">
          <div
            v-for="operator in filteredOwnedOperators"
            :key="operator.charId || operator.name"
            class="operator-dialog-item"
          >
            <OperatorAvatar :char-id="operator.charId" :rarity="getOperatorDisplayRarity(operator)" :border="true" :size="44" :mobile-size="40"></OperatorAvatar>
            <div class="operator-dialog-copy">
              <span class="operator-dialog-name">{{ operator.name }}</span>
              <span class="operator-dialog-meta">{{ getOperatorDialogMeta(operator) }}</span>
            </div>
          </div>
        </div>

        <div v-else class="operator-empty dialog">
          {{ ownedOperatorDialogEmptyText }}
        </div>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.operator-zoot-matcher-page {
  max-width: 1400px;
  margin: 0 auto;
  padding: 16px;
}

.operator-zoot-matcher-page,
.owned-operator-dialog-card {
  --ozm-text-title: rgba(0, 0, 0, 0.82);
  --ozm-text-main: rgba(0, 0, 0, 0.72);
  --ozm-text-muted: rgba(0, 0, 0, 0.62);
  --ozm-text-soft: rgba(0, 0, 0, 0.48);
  --ozm-text-faint: rgba(0, 0, 0, 0.45);
  --ozm-control-text: rgba(0, 0, 0, 0.72);
  --ozm-control-border: rgba(15, 23, 42, 0.12);
  --ozm-control-bg: rgba(248, 250, 252, 0.92);
  --ozm-control-hover-bg: rgba(15, 23, 42, 0.04);
  --ozm-control-inset: rgba(255, 255, 255, 0.65);
  --ozm-card-bg: rgba(255, 255, 255, 0.92);
  --ozm-card-border: rgba(15, 23, 42, 0.12);
  --ozm-card-subtle-bg: rgba(248, 250, 252, 0.72);
  --ozm-card-soft-bg: rgba(255, 255, 255, 0.9);
  --ozm-card-soft-border: rgba(15, 23, 42, 0.08);
  --ozm-star-empty: rgba(0, 0, 0, 0.22);
  --ozm-star-fill: #f59e0b;
  --ozm-status-bg: rgba(15, 23, 42, 0.03);
  --ozm-status-border: rgba(15, 23, 42, 0.08);
  --ozm-success-bg: rgba(56, 142, 60, 0.08);
  --ozm-success-border: rgba(56, 142, 60, 0.18);
  --ozm-warning-bg: rgba(251, 140, 0, 0.08);
  --ozm-warning-border: rgba(251, 140, 0, 0.2);
  --ozm-error-bg: rgba(211, 47, 47, 0.08);
  --ozm-error-border: rgba(211, 47, 47, 0.18);
  --ozm-info-bg: rgba(30, 136, 229, 0.08);
  --ozm-info-border: rgba(30, 136, 229, 0.16);
  --ozm-unmet-text: #c62828;
}

:global(.theme-dark .operator-zoot-matcher-page),
:global(.theme-dark .owned-operator-dialog-card),
:global(html.dark .operator-zoot-matcher-page),
:global(html.dark .owned-operator-dialog-card) {
  --ozm-text-title: rgba(255, 255, 255, 0.92);
  --ozm-text-main: rgba(255, 255, 255, 0.82);
  --ozm-text-muted: rgba(255, 255, 255, 0.68);
  --ozm-text-soft: rgba(255, 255, 255, 0.56);
  --ozm-text-faint: rgba(255, 255, 255, 0.48);
  --ozm-control-text: rgba(255, 255, 255, 0.82);
  --ozm-control-border: rgba(255, 255, 255, 0.14);
  --ozm-control-bg: rgba(255, 255, 255, 0.08);
  --ozm-control-hover-bg: rgba(255, 255, 255, 0.13);
  --ozm-control-inset: rgba(255, 255, 255, 0.08);
  --ozm-card-bg: rgba(34, 38, 44, 0.96);
  --ozm-card-border: rgba(255, 255, 255, 0.12);
  --ozm-card-subtle-bg: rgba(255, 255, 255, 0.045);
  --ozm-card-soft-bg: rgba(255, 255, 255, 0.06);
  --ozm-card-soft-border: rgba(255, 255, 255, 0.1);
  --ozm-star-empty: rgba(255, 255, 255, 0.28);
  --ozm-star-fill: #fbbf24;
  --ozm-status-bg: rgba(255, 255, 255, 0.045);
  --ozm-status-border: rgba(255, 255, 255, 0.1);
  --ozm-success-bg: rgba(102, 187, 106, 0.16);
  --ozm-success-border: rgba(102, 187, 106, 0.36);
  --ozm-warning-bg: rgba(255, 183, 77, 0.16);
  --ozm-warning-border: rgba(255, 183, 77, 0.36);
  --ozm-error-bg: rgba(239, 83, 80, 0.16);
  --ozm-error-border: rgba(239, 83, 80, 0.36);
  --ozm-info-bg: rgba(100, 181, 246, 0.16);
  --ozm-info-border: rgba(100, 181, 246, 0.34);
  --ozm-unmet-text: #ff8a80;
}

:global(.theme-dark .operator-zoot-matcher-page .toolbox-card),
:global(.theme-dark .operator-zoot-matcher-page .owned-operator-dialog-card),
:global(.theme-dark .owned-operator-dialog-card),
:global(html.dark .operator-zoot-matcher-page .toolbox-card),
:global(html.dark .operator-zoot-matcher-page .owned-operator-dialog-card),
:global(html.dark .owned-operator-dialog-card) {
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(31, 31, 31, 0.98);
}

.page-shell {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.matcher-layout {
  display: block;
}

.matcher-main {
  min-width: 0;
}

.toolbox-card {
  padding: 20px;
  border-radius: 18px;
}

.card-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.card-head.compact {
  justify-content: flex-start;
}

.card-eyebrow {
  color: var(--ozm-text-faint);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 8px;
}

.card-title {
  line-height: 1.2;
  margin-bottom: 8px;
}

.card-title {
  font-size: 22px;
}

.card-subtitle {
  color: var(--ozm-text-muted);
  line-height: 1.6;
  margin-bottom: 0;
}

.search-panel {
  margin-top: 0;
  display: grid;
  gap: 10px;
}

.search-inline {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  align-items: start;
}

.search-actions {
  display: flex;
  margin-top: 0;
  align-items: stretch;
}

.search-action-group {
  display: flex;
  flex-wrap: nowrap;
  gap: 8px;
}

.search-mode-btn {
  min-height: 48px;
  padding-inline: 14px;
  white-space: nowrap;
}

.search-option-groups {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 14px;
  align-items: flex-start;
}

.search-option-block {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 10px;
  align-items: center;
  min-width: 0;
}

.search-option-block-wide {
  flex: 1 1 440px;
}

.search-option-label {
  font-size: 12px;
  line-height: 1.5;
  color: var(--ozm-text-soft);
  white-space: nowrap;
}

.control-toggle {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  max-width: 100%;
  min-height: 0 !important;
  height: auto !important;
  padding: 0;
  border: none;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  overflow: visible;
}

.control-toggle:deep(.v-btn) {
  min-height: 34px;
  padding-inline: 12px;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.3;
  color: var(--ozm-control-text);
  text-transform: none;
  border: 1px solid var(--ozm-control-border);
  border-radius: 10px !important;
  background: var(--ozm-control-bg);
  box-shadow: inset 0 1px 0 var(--ozm-control-inset);
}

.control-toggle:deep(.v-btn:not(:first-child)) {
  border-inline-start-width: 1px !important;
}

.control-toggle:deep(.v-btn:not(:last-child)) {
  border-inline-end-width: 1px !important;
}

.control-toggle:deep(.v-btn:hover) {
  background: var(--ozm-control-hover-bg);
}

.control-toggle:deep(.v-btn--active) {
  background: rgba(var(--v-theme-primary), 0.12);
  color: rgb(var(--v-theme-primary));
}

.filter-toggle {
  max-width: 100%;
  flex-wrap: wrap;
}

.rating-filter-toggle {
  max-width: 100%;
  flex-wrap: wrap;
}

.operator-import-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 12px;
  padding-top: 2px;
}

.operator-import-toggle {
  min-height: 32px;
  padding-inline: 8px;
}

.operator-import-toggle:deep(.v-btn__content) {
  gap: 6px;
}

.operator-inline-stat {
  font-size: 12px;
  line-height: 1.5;
  color: var(--ozm-text-soft);
  white-space: nowrap;
}

.operator-settings-panel {
  display: flex;
  flex-wrap: wrap;
  align-items: stretch;
  gap: 10px;
  padding-top: 2px;
}

.operator-action-btn {
  min-width: 132px;
  min-height: 40px;
}

.operator-action-btn:deep(.v-btn__content) {
  white-space: normal;
  text-align: center;
  line-height: 1.35;
}

.result-alert {
  margin-top: 12px;
}

.result-section {
  margin-top: 18px;
}

.loading-wrap {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 0 4px;
}

.result-list-wrap {
  margin-top: 0;
}

.result-item-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 360px), 1fr));
  gap: 12px;
  align-items: start;
}

.result-item-card {
  container-type: inline-size;
  border-radius: 16px;
  border: 1px solid var(--ozm-card-border);
  background: var(--ozm-card-bg);
  overflow: hidden;
}

.result-item-top {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 16px;
  align-items: start;
  padding: 14px 16px 12px;
}

.result-item-bottom {
  padding: 12px 16px 14px;
  border-top: 1px solid var(--ozm-card-soft-border);
  background: var(--ozm-card-subtle-bg);
}

.result-item-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.result-item-head {
  min-width: 0;
}

.result-item-title {
  min-width: 0;
  font-weight: 700;
  line-height: 1.5;
}

.result-item-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--ozm-text-muted);
}

.rating-inline {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.rating-stars {
  display: inline-flex;
  align-items: center;
  gap: 1px;
}

.rating-star {
  position: relative;
  display: inline-flex;
  width: 14px;
  height: 14px;
  color: var(--ozm-star-empty);
  line-height: 1;
}

.rating-star-empty,
.rating-star-fill {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}

.rating-star-fill {
  color: var(--ozm-star-fill);
  overflow: hidden;
  justify-content: flex-start;
}

.rating-star.is-half .rating-star-fill {
  width: 50%;
}

.result-item-status {
  border-radius: 12px;
  padding: 10px 12px;
  border: 1px solid var(--ozm-status-border);
  background: var(--ozm-status-bg);
}

.result-item-status.is-ready-status {
  display: flex;
  justify-content: center;
  align-items: center;
  text-align: center;
  min-height: 64px;
}

.result-item-status.tone-success {
  background: var(--ozm-success-bg);
  border-color: var(--ozm-success-border);
}

.result-item-status.tone-warning {
  background: var(--ozm-warning-bg);
  border-color: var(--ozm-warning-border);
}

.result-item-status.tone-error {
  background: var(--ozm-error-bg);
  border-color: var(--ozm-error-border);
}

.result-item-status.tone-info,
.result-item-status.tone-secondary {
  background: var(--ozm-info-bg);
  border-color: var(--ozm-info-border);
}

.result-item-status-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.5;
}

.result-item-status-detail {
  margin-top: 4px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--ozm-text-main);
}

.result-item-compare {
  display: grid;
  gap: 8px;
}

.result-compare-head,
.result-compare-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  align-items: stretch;
}

.result-compare-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--ozm-text-muted);
}

.result-compare-rows {
  display: grid;
  gap: 8px;
}

.result-compare-item {
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  padding: 10px 12px;
  border: 1px solid var(--ozm-card-soft-border);
  background: var(--ozm-card-soft-bg);
}

.result-compare-item.is-unmet {
  border-color: var(--ozm-error-border);
}

.result-compare-item-head {
  display: flex;
  gap: 8px;
  justify-content: space-between;
  align-items: center;
}

.result-compare-item-title {
  min-width: 0;
  font-weight: 700;
  line-height: 1.5;
}

.result-compare-item-caption {
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--ozm-text-soft);
}

.result-compare-item-detail {
  margin-top: 4px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--ozm-text-main);
}

.text-unmet {
  color: var(--ozm-unmet-text);
  font-weight: 700;
}

.result-item-links {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: stretch;
}

.result-link-btn {
  min-width: 142px;
  white-space: normal;
  line-height: 1.35;
}

@container (max-width: 440px) {
  .result-item-top {
    grid-template-columns: 1fr;
  }

  .result-item-links {
    flex-direction: row;
    align-items: stretch;
  }

  .result-link-btn {
    flex: 1 1 0;
    min-width: 0;
  }

  .result-compare-head,
  .result-compare-row {
    gap: 8px;
  }
}

.empty-state,
.operator-empty {
  color: var(--ozm-text-muted);
  padding: 18px 4px 4px;
}

.empty-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--ozm-text-title);
  margin-bottom: 0;
}

.owned-operator-dialog-card {
  padding: 20px;
  border-radius: 18px;
}

.owned-operator-dialog-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  margin-bottom: 16px;
}

.owned-operator-dialog-title {
  font-size: 22px;
  line-height: 1.2;
  margin-bottom: 6px;
}

.owned-operator-dialog-subtitle {
  margin-bottom: 0;
  color: var(--ozm-text-muted);
}

.operator-dialog-toolbar {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.operator-dialog-filter-block {
  width: 100%;
}

.operator-dialog-toggle {
  flex: 1 1 auto;
}

.operator-dialog-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 16px;
}

.operator-dialog-item {
  display: flex;
  align-items: center;
  gap: 10px;
  border-radius: 14px;
  padding: 10px 12px;
  background: var(--ozm-card-soft-bg);
  border: 1px solid var(--ozm-card-soft-border);
}

.operator-dialog-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.operator-dialog-name {
  min-width: 0;
  font-weight: 700;
  line-height: 1.5;
}

.operator-dialog-meta {
  font-size: 12px;
  line-height: 1.4;
  color: var(--ozm-text-soft);
}

@media screen and (max-width: 900px) {
  .card-head {
    flex-direction: column;
  }

  .search-inline {
    grid-template-columns: 1fr;
  }

  .search-actions {
    width: auto;
  }

  .search-option-block,
  .search-option-block-wide {
    width: 100%;
  }

  .operator-dialog-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media screen and (max-width: 640px) {
  .operator-settings-panel {
    flex-direction: column;
  }

  .operator-dialog-grid {
    grid-template-columns: 1fr;
  }
}
</style>
