<script setup>
import {createMessage} from "/src/utils/message.js";
import operatorDataAPI from "/src/api/user-center/operatorData.js"
import sklandCredentialAPI from "/src/api/backend/sklandCredential.js"
import {saveAkAccountOperators} from "/src/api/user-center/userCenterApi.js"
import {buildUcOperatorSavePayload} from "/src/utils/survey/ucOperatorData.js"
import {onBeforeUnmount, onMounted, ref, computed, watch} from "vue";
import {operatorTableV2} from "/src/utils/gameData.js";
import PROFESSION_DICT from "/src/static/json/operator/profession_dict.json";
import {exportExcel} from '/src/utils/exportExcel.js'
import {dateFormat} from "/src/utils/dateUtil.js";

import "/src/assets/css/survey/operator.scss";
import "/src/assets/css/survey/operator.phone.scss";
import {operatorFilterCondition, filterOperatorList} from "/src/utils/survey/operatorFilter.js";

import OperatorStatisticalTable from "/src/components/survey/OperatorStatisticalTable.vue";
import deepClone from "/src/utils/deepClone.js";
import EquipIcon from "/src/components/sprite/EquipIcon.vue";
import OperatorBar from "/src/components/survey/OperatorBar.vue";
import ImportCommonQuestions from "/src/components/survey/ImportCommonQuestions.vue";
import OperatorAvatar from "/src/components/sprite/OperatorAvatar.vue";
import {formatNumber} from "/src/utils/format.js";
import SkillIcon from "@/components/sprite/SkillIcon.vue";
import operatorProgressionStatisticsDataCache from "@/plugins/indexedDB/operatorProgressionStatisticsData.js";
import SklandAPI from '/src/utils/survey/skland.js';
import { copyTextToClipboard } from "/src/utils/copyText.js";
import { userInfo } from "/src/api/backend/userSession.js";
import { useRoute, useRouter } from "vue-router";
import Login from "/src/pages/account/login.vue";
import QRCode from 'qrcode';

const operatorClassLabelMap = new Map()
for (const profession of PROFESSION_DICT || []) {
  operatorClassLabelMap.set(profession.value, profession.label)
  for (const branch of profession.children || []) {
    operatorClassLabelMap.set(branch.value, branch.label)
  }
}

const sectionPanels = ref([])
const route = useRoute()
const router = useRouter()

// 森空岛导入相关
const SKLAND_LINK = 'https://www.skland.com/index'
const CONSOLE_CODE = "copy(localStorage.getItem('SK_OAUTH_CRED_KEY')+','+localStorage.getItem('SK_TOKEN_CACHE_KEY')),console.log('已复制到粘贴板')"
const SKLAND_ACCOUNT_SESSION_STORAGE_KEY = 'skland_account_data'

// 官网导入相关
const OFFICIAL_SITE_LINK = 'https://ak.hypergryph.com/user/home'
const HG_ACCOUNT_INFO_URL = 'https://web-api.hypergryph.com/account/info/hg'

const sklandImportDialog = ref(false)
const loginDialog = ref(false)
const sklandInputText = ref('')
const sklandLoading = ref(false)
const sklandImportStep = ref(1) // 当前导入步骤
const sklandCred = ref('')
const sklandToken = ref('')
const playBindingList = ref([])
// 导入方式：先选择并查看说明，再进入正式流程
const selectedImportMethod = ref('')
const importFlowStarted = ref(false)
const sklandImportTab = ref('skland')
const importViewHeight = ref('auto')
let importViewAnimationFrame = 0
// 官网导入：用户粘贴的 account/info/hg 返回内容
const officialTokenText = ref('')
// 官网导入步骤：1-登录官网 / 2-获取 Token / 3-输入凭证
const officialImportStep = ref(1)

// 森空岛扫码登录：二维码、扫码状态与轮询
const sklandQrScanId = ref('') // 扫码会话 ID
const sklandQrImage = ref('') // 渲染出的二维码 data URL
const sklandQrStatusText = ref('') // 扫码状态提示文案
let sklandQrPollTimer = null // 轮询定时器

const importMethods = [
  {
    key: 'skland',
    title: '使用森空岛凭证',
    avatar: '/avatar/skland-credential.webp',
    subtitle: '直接使用森空岛凭证，获取绑定账号的干员数据。',
    subtitleNote: 'PC端操作方便，移动端略为艰难，安全性较高',
    purpose: [
      '可以获取森空岛账号绑定的明日方舟账号列表',
      '可以获取账号 UID、昵称、区服等信息',
      '可以获取干员持有情况、等级、精英化、潜能、技能等级、模组等级',
      '可以获取仓库物资数量',
    ],
    purposeNote: '这里明日方舟一图流仅一次性使用该token，以获取干员相关数据。',
    warning: [
      '凭证属于敏感信息，泄露后可能被用于读取上述数据。请勿分享给他人或粘贴到无关页面。',
    ],
  },
  {
    key: 'official',
    title: '使用官网 Token',
    avatar: '/avatar/official-token.png',
    subtitle: '通过官网 Token 获取森空岛凭证，再获取绑定账号的干员数据。',
    subtitleNote: 'PC端/移动端都比较方便，务必注意Token安全',
    purpose: [
      '森空岛Token已经够厉害了，但这玩意可以生成森空岛Token。',
    ],
    warning: [
      '官网Token 属于极度敏感信息，泄露后可能被用于生成包括但不限于森空岛凭证在内的很多信息，分享官网Token给他人的危险程度不亚于公开你的账号密码！',
      '无论何时何地，使用官网Token前，请务必确认您已1000%信任该工具，使用该途径则视为您已知晓相关风险。',
      '使用时请确保环境安全，尤其小心会读取剪贴板的程序/APP，复制Token后请尽快使用！',
    ],
  },
  {
    key: 'qr',
    title: '森空岛扫码登录',
    avatar: '/avatar/skland-credential.webp',
    subtitle: '使用森空岛 APP 扫码登录，自动获取凭证并导入干员数据。',
    subtitleNote: 'PC端/移动端都方便，无需复制粘贴凭证，推荐使用',
    purpose: [
      '可以获取森空岛账号绑定的明日方舟账号列表',
      '可以获取账号 UID、昵称、区服等信息',
      '可以获取干员持有情况、等级、精英化、潜能、技能等级、模组等级',
      '可以获取仓库物资数量',
    ],
    purposeNote: '这里明日方舟一图流仅一次性使用该token，以获取干员相关数据。',
    warning: [
      '请使用手机上的森空岛 APP 扫描二维码并在 APP 内确认授权。',
      '二维码约 2 分钟有效，过期后点击"重新生成"即可刷新。',
    ],
  },
]

// 检查用户是否登录
const isUserLoggedIn = computed(() => {
  return !!userInfo.value.token || hasStoredUserToken()
})

function openLinkOnNewPage(url) {
  window.open(url)
}

function copyText(text) {
  copyTextToClipboard(text)
}

function getCredAndSecret(text) {
  text = text.replace(/\s+/g, '').replace(/["']/g, '')
  const textArr = text.split(',')
  const cred = textArr[0]
  const token = textArr[1]
  return { cred, token }
}

function openSklandImportDialog() {
  sklandImportDialog.value = true
  playBindingList.value = []
  sklandInputText.value = ''
  sklandImportStep.value = 1 // 重置步骤
  sklandImportTab.value = 'skland'
  selectedImportMethod.value = ''
  importFlowStarted.value = false
  officialTokenText.value = ''
  officialImportStep.value = 1 // 重置官网导入步骤
  // 重置扫码登录状态并停止轮询
  stopSklandQrPolling()
  sklandQrScanId.value = ''
  sklandQrImage.value = ''
  sklandQrStatusText.value = ''
}

function selectImportMethod(method) {
  selectedImportMethod.value = selectedImportMethod.value === method ? '' : method
}

function startImportFlow(method) {
  selectedImportMethod.value = method
  importFlowStarted.value = true
  sklandImportTab.value = method
  // 扫码方式：进入流程后自动申请二维码
  if (method === 'qr') {
    createSklandQrCode()
  }
}

function returnToImportMethodSelection() {
  importFlowStarted.value = false
  playBindingList.value = []
}

function cancelImportViewAnimationFrame() {
  if (!importViewAnimationFrame) {
    return
  }

  cancelAnimationFrame(importViewAnimationFrame)
  importViewAnimationFrame = 0
}

function beforeImportViewLeave(element) {
  cancelImportViewAnimationFrame()
  importViewHeight.value = `${element.offsetHeight}px`
}

function enterImportView(element) {
  cancelImportViewAnimationFrame()
  importViewAnimationFrame = requestAnimationFrame(() => {
    importViewHeight.value = `${element.offsetHeight}px`
    importViewAnimationFrame = 0
  })
}

function afterImportViewEnter() {
  importViewHeight.value = 'auto'
}

function requestCloseImportDialog() {
  if (!sklandImportDialog.value) {
    return
  }

  if (window.confirm('确认关闭导入窗口吗？')) {
    sklandImportDialog.value = false
    stopSklandQrPolling()
  }
}

function openImportFlowFromRoute() {
  if (route.query.openImport !== '1') {
    return
  }

  if (!sectionPanels.value.includes('importExport')) {
    sectionPanels.value = [...sectionPanels.value, 'importExport']
  }

  openSklandImportDialog()

  const nextQuery = {...route.query}
  delete nextQuery.openImport
  router.replace({query: nextQuery})
}

function ensureSklandSyncLogin() {
  if (!hasStoredUserToken()) {
    loginDialog.value = true
    return false
  }

  return true
}

function handleLoginSuccess() {
  loginDialog.value = false
}

function handleLoginNavigate(routeName) {
  loginDialog.value = false
  router.push({name: routeName})
}

async function getPlayerBindingBySkland() {
  if (!ensureSklandSyncLogin()) {
    return
  }

  if (!sklandInputText.value) {
    createMessage({ type: 'error', text: '请输入森空岛凭证' })
    return
  }
  
  sklandLoading.value = true
  try {
    const { cred, token } = getCredAndSecret(sklandInputText.value)
    sklandCred.value = cred
    sklandToken.value = token
    
    const playBinding = await SklandAPI.getPlayBindingV2('', '', cred, token)
    playBindingList.value = playBinding.bindingList
    
    if (playBinding.bindingList.length === 0) {
      createMessage({ type: 'warn', text: '未找到绑定的明日方舟账号' })
    }
  } catch (error) {
    console.error(error)
    createMessage({ type: 'error', text: '获取账号信息失败' })
  } finally {
    sklandLoading.value = false
  }
}

/**
 * 官网导入：解析第三步粘贴的 JSON（account/info/hg 返回内容）提取 token，
 * 调用后端 /survey/hg/player-binding 换取森空岛 cred/secret，
 * 再自动拉取绑定的明日方舟账号列表
 */
async function getPlayerBindingByOfficialToken() {
  if (!ensureSklandSyncLogin()) {
    return
  }

  if (!officialTokenText.value.trim()) {
    createMessage({ type: 'error', text: '请输入 account/info/hg 返回的内容' })
    return
  }

  // 解析粘贴的 JSON，token 位于 data.content 字段
  let hgToken = ''
  try {
    const parsed = JSON.parse(officialTokenText.value)
    hgToken = parsed?.data?.content || ''
  } catch (e) {
    createMessage({ type: 'error', text: '内容格式不正确，请复制 account/info/hg 返回的完整 JSON' })
    return
  }

  if (!hgToken) {
    createMessage({ type: 'error', text: '未找到 token 字段，请检查复制的内容' })
    return
  }

  copyText('已清除剪贴板内的hgtoken')
  sklandLoading.value = true
  try {
    // 后端用官网 token 换取森空岛凭证，返回 { cred, secret }
    const result = await sklandCredentialAPI.getCredByHgToken({ token: hgToken })
    const { cred, token } = result.data
    sklandCred.value = cred
    sklandToken.value = token
    console.log(result.data)
    // 用换取的凭证自动拉取账号列表
    console.log(cred, token)
    const playBinding = await SklandAPI.getPlayBindingV2('', '', cred, token)
    playBindingList.value = playBinding.bindingList

    if (playBinding.bindingList.length === 0) {
      createMessage({ type: 'warn', text: '未找到绑定的明日方舟账号' })
    }
  } catch (error) {
    console.error(error)
    createMessage({ type: 'error', text: '获取账号信息失败' })
  } finally {
    sklandLoading.value = false
  }
}

/**
 * 森空岛扫码登录：申请二维码并渲染，随后开始轮询扫码状态
 */
async function createSklandQrCode() {
  sklandLoading.value = true
  sklandQrStatusText.value = '正在生成二维码…'
  playBindingList.value = []
  try {
    const res = await sklandCredentialAPI.createSklandQrCode()
    const { scanId, qrContent } = res.data
    sklandQrScanId.value = scanId
    // 用 qrContent（deep link）渲染二维码图片
    sklandQrImage.value = await QRCode.toDataURL(qrContent, {width: 220, margin: 1})
    sklandQrStatusText.value = '请使用森空岛 APP 扫描二维码'
    startSklandQrPolling()
  } catch (error) {
    console.error(error)
    sklandQrStatusText.value = ''
    createMessage({type: 'error', text: '生成二维码失败，请稍后重试'})
  } finally {
    sklandLoading.value = false
  }
}

/**
 * 重新生成二维码：停止旧轮询后重新申请
 */
function refreshSklandQrCode() {
  stopSklandQrPolling()
  sklandQrImage.value = ''
  createSklandQrCode()
}

/**
 * 停止扫码状态轮询
 */
function stopSklandQrPolling() {
  if (sklandQrPollTimer) {
    clearInterval(sklandQrPollTimer)
    sklandQrPollTimer = null
  }
}

/**
 * 开始轮询扫码状态（约 2 秒一次，二维码约 2 分钟有效）
 */
function startSklandQrPolling() {
  stopSklandQrPolling()
  sklandQrPollTimer = setInterval(async () => {
    try {
      const res = await sklandCredentialAPI.checkSklandQrStatus(sklandQrScanId.value)
      const data = res.data
      if (data.status === 0) {
        // 用户已确认：停止轮询，用凭证拉取账号列表
        stopSklandQrPolling()
        sklandCred.value = data.cred
        sklandToken.value = data.token
        sklandQrStatusText.value = '扫码成功，正在获取账号列表…'
        const playBinding = await SklandAPI.getPlayBindingV2('', '', data.cred, data.token)
        playBindingList.value = playBinding.bindingList
        sklandQrStatusText.value = playBinding.bindingList.length > 0
            ? '请选择要导入的账号：'
            : '未找到绑定的明日方舟账号'
        if (playBinding.bindingList.length === 0) {
          createMessage({type: 'warn', text: '未找到绑定的明日方舟账号'})
        }
      } else if (data.status === 102) {
        // 二维码过期：停止轮询，提示重新生成
        stopSklandQrPolling()
        sklandQrStatusText.value = '二维码已过期，请点击"重新生成"'
        createMessage({type: 'warn', text: '二维码已过期，请重新生成'})
      }
      // status 100/101：未扫码/已扫码待确认，继续轮询
    } catch (error) {
      console.error(error)
      // 单次轮询失败不中断，等待下次；如请求已过期则停止
      if (!sklandQrScanId.value) {
        stopSklandQrPolling()
      }
    }
  }, 2000)
}

/**
 * 根据选中的绑定账号同步干员数据到一图流
 * @param {Object} binding 森空岛绑定账号信息（uid/nickName/channelName 等）
 */
async function getPlayerDataAndSync(binding) {
  const { uid, nickName, channelName, channelMasterId } = binding

  if (!ensureSklandSyncLogin()) {
    return
  }
  
  sklandLoading.value = true
  createMessage({ type: 'info', text: '正在同步干员数据，请稍候...' })
  
  try {
    const warehouseData = await SklandAPI.getWarehouseInfo(uid, sklandCred.value, sklandToken.value)
    warehouseData.channelName = channelName
    warehouseData.channelMasterId = channelMasterId
    warehouseData.nickName = nickName
    sessionStorage.setItem(SKLAND_ACCOUNT_SESSION_STORAGE_KEY, JSON.stringify({
      ...warehouseData,
      nickName,
      channelName,
      channelMasterId,
      importedAt: new Date().toISOString(),
    }))

    const payload = buildUcOperatorSavePayload(warehouseData)
    if (payload.operators.length === 0) {
      createMessage({ type: 'warn', text: '未获取到干员数据，无法同步' })
      return
    }

    await saveAkAccountOperators(payload)
    createMessage({ type: 'success', text: '干员数据已同步到我的干员！' })
    getOperatorData()
    sklandImportDialog.value = false
    
  } catch (error) {
    console.error(error)
    createMessage({ type: 'error', text: '同步干员数据失败' })
  } finally {
    sklandLoading.value = false
  }
}



//后端返回的用户干员信息
let operatorList = ref([])  //干员列表
//前端筛选后的干员信息
let displayOperatorList = ref([])  //干员列表

let operatorProgressionStatisticsMap = new Map()

const recommendThreshold = ref(null)
const recommendEquipThreshold = ref(null)
const recommendElite1Threshold = ref(null)
const recommendEliteThreshold = ref(null)
const recommendThresholdOptions = [90, 80, 70, 60, 50, 40, 30, 20, 10, 0.325]
const recommendEliteThresholdOptions = [90, 80, 70, 60, 50, 40, 30, 20, 10, 0.325]
const hideCompletedRecommendedOperators = ref(false)
const displayOperatorFilterModules = ['profession', 'rarity', 'date', 'itemObtainApproach', 'own']
const hasAutoAppliedGuestOwnFilter = ref(false)

function hasStoredUserToken() {
  const token = localStorage.getItem("USER_TOKEN")
  return Boolean(token && token !== 'null' && token !== 'undefined')
}

function refreshDisplayOperatorList() {
  displayOperatorList.value = filterOperatorList(operatorList.value)
}

function resetOperatorFilterActions() {
  for (const filterGroup of Object.values(operatorFilterCondition.value)) {
    filterGroup.conditions.forEach((condition) => {
      condition.action = false
    })
  }
}

function clearOwnFilterActions() {
  const ownConditions = operatorFilterCondition.value.own?.conditions || []
  ownConditions.forEach((condition) => {
    condition.action = false
  })
}

function applyGuestOwnFilterDefault() {
  resetOperatorFilterActions()

  const unownedCondition = operatorFilterCondition.value.own?.conditions?.find((condition) => condition.value === false)
  if (unownedCondition) {
    unownedCondition.action = true
  }

  hasAutoAppliedGuestOwnFilter.value = true
}

function clearGuestOwnFilterDefault() {
  if (!hasAutoAppliedGuestOwnFilter.value) {
    return
  }

  clearOwnFilterActions()
  hasAutoAppliedGuestOwnFilter.value = false
}

function syncGuestOwnFilterDefault(hasData) {
  if (!hasData && !hasStoredUserToken()) {
    applyGuestOwnFilterDefault()
  } else {
    clearGuestOwnFilterDefault()
  }

  refreshDisplayOperatorList()
}

function createOperatorList(list = []) {
  const operatorMap = {}
  for (const item of list) {
    operatorMap[item.charId] = item
  }

  const tmpList = []
  for (const charId in operatorTableV2) {
    const sourceOperator = operatorTableV2[charId]
    let formatData = deepClone(sourceOperator)

    let item = {}
    if (operatorMap[charId]) {
      item = operatorMap[charId]
    } else {
      item = {
        elite: 0,
        level: 0,
        mainSkill: 0,
        skill1: 0,
        skill2: 0,
        skill3: 0,
        modX: 0,
        modY: 0,
        modD: 0,
        modA: 0,
        modB: 0,
        own: false
      }
    }

    formatData.elite = item.elite
    formatData.level = item.level
    formatData.potential = item.potential
    formatData.mainSkill = item.mainSkill
    formatData.skill1 = item.skill1
    formatData.skill2 = item.skill2
    formatData.skill3 = item.skill3
    formatData.modX = item.modX ?? 0
    formatData.modY = item.modY ?? 0
    formatData.modD = item.modD ?? 0
    formatData.own = item.own
    formatData.modA = item.modA ?? 0
    formatData.modB = item.modB ?? 0

    tmpList.push(formatData)
  }

  return tmpList
}

const displayOperatorFilterCondition = computed(() => {
  return displayOperatorFilterModules
      .map((module) => ({module, conditions: operatorFilterCondition.value[module]}))
      .filter((item) => item.conditions)
})

async function getCharStatisticsResult() {
  const data = await operatorProgressionStatisticsDataCache.getData();
  let {result} = data

  for (const item of result) {
      operatorProgressionStatisticsMap.set(item.charId,item)
  }
}

getCharStatisticsResult()

const operatorRecommendedSkillSourceMap = computed(() => {
  const recommendedMap = new Map()
  const threshold = recommendThreshold.value

  if (!threshold) {
    return recommendedMap
  }

  for (const operator of displayOperatorList.value) {
    const result = operatorProgressionStatisticsMap.get(operator.charId)

    if (!result || !Array.isArray(operator.skills)) {
      continue
    }

    const recommendedSkillIndexes = operator.skills.reduce((indexes, _, index) => {
      const ranks = result[`skill${index + 1}`]
      if (!ranks) {
        return indexes
      }

      const masteryRank3Rate = (ranks.rank3 || 0) * 100
      if (masteryRank3Rate >= threshold) {
        indexes.push(index)
      }

      return indexes
    }, [])

    if (recommendedSkillIndexes.length > 0) {
      recommendedMap.set(operator.charId, recommendedSkillIndexes)
    }
  }

  return recommendedMap
})

const operatorRecommendedEquipSourceMap = computed(() => {
  const recommendedMap = new Map()
  const threshold = recommendEquipThreshold.value

  if (!threshold) {
    return recommendedMap
  }

  for (const operator of displayOperatorList.value) {
    const result = operatorProgressionStatisticsMap.get(operator.charId)

    if (!result || !Array.isArray(operator.equip)) {
      continue
    }

    const recommendedEquipIndexes = operator.equip.reduce((indexes, equip, index) => {
      const ranks = result[`mod${equip.typeName2}`]
      if (!ranks) {
        return indexes
      }

      const unlockRate = ((ranks.rank1 || 0) + (ranks.rank2 || 0) + (ranks.rank3 || 0)) * 100
      if (unlockRate >= threshold) {
        indexes.push(index)
      }

      return indexes
    }, [])

    if (recommendedEquipIndexes.length > 0) {
      recommendedMap.set(operator.charId, recommendedEquipIndexes)
    }
  }

  return recommendedMap
})
const operatorRecommendedEliteSourceSet = computed(() => {
  const recommendedSet = new Set()
  const threshold = recommendEliteThreshold.value

  if (!threshold) {
    return recommendedSet
  }

  for (const operator of displayOperatorList.value) {
    const result = operatorProgressionStatisticsMap.get(operator.charId)
    const eliteRate = (result?.elite?.rank2 || 0) * 100

    if (eliteRate >= threshold) {
      recommendedSet.add(operator.charId)
    }
  }

  return recommendedSet
})

const operatorRecommendedElite1SourceSet = computed(() => {
  const recommendedSet = new Set()
  const threshold = recommendElite1Threshold.value

  if (!threshold) {
    return recommendedSet
  }

  for (const operator of displayOperatorList.value) {
    const result = operatorProgressionStatisticsMap.get(operator.charId)
    const eliteRate = ((result?.elite?.rank1 || 0) + (result?.elite?.rank2 || 0)) * 100

    if (eliteRate >= threshold) {
      recommendedSet.add(operator.charId)
    }
  }

  return recommendedSet
})

const hasActiveRecommendFilter = computed(() => {
  return Boolean(
      recommendThreshold.value ||
      recommendEquipThreshold.value ||
      recommendElite1Threshold.value ||
      recommendEliteThreshold.value
  )
})

function hasCompletedSkillRecommendation(operator) {
  const recommendedSkillIndexes = operatorRecommendedSkillSourceMap.value.get(operator.charId) || []
  if (recommendedSkillIndexes.length > 0) {
    return recommendedSkillIndexes.every((index) => operator[`skill${index + 1}`] === 3)
  }

  return true
}

function hasCompletedEquipRecommendation(operator) {
  const recommendedEquipIndexes = operatorRecommendedEquipSourceMap.value.get(operator.charId) || []

  if (recommendedEquipIndexes.length > 0) {
    return recommendedEquipIndexes.every((index) => {
      const equip = operator.equip?.[index]
      if (!equip) {
        return false
      }

      return (operator[`mod${equip.typeName2}`] || 0) > 0
    })
  }

  return true
}

function hasCompletedElite1Recommendation(operator) {
  if (!operatorRecommendedElite1SourceSet.value.has(operator.charId)) {
    return true
  }

  return operator.elite >= 1
}

function hasCompletedEliteRecommendation(operator) {
  if (!operatorRecommendedEliteSourceSet.value.has(operator.charId)) {
    return true
  }

  return operator.elite === 2
}

function isOperatorRecommendationCompleted(operator) {
  const activeConditions = []

  if (recommendThreshold.value) {
    activeConditions.push(hasCompletedSkillRecommendation(operator))
  }

  if (recommendEquipThreshold.value) {
    activeConditions.push(hasCompletedEquipRecommendation(operator))
  }

  if (recommendElite1Threshold.value) {
    activeConditions.push(hasCompletedElite1Recommendation(operator))
  }

  if (recommendEliteThreshold.value) {
    activeConditions.push(hasCompletedEliteRecommendation(operator))
  }

  return activeConditions.length > 0 && activeConditions.every(Boolean)
}

// MAA Operator Progression (OperProgress) does not support any of Amiya's three forms
const MAA_UNSUPPORTED_CHAR_IDS = new Set(['char_002_amiya', 'char_1001_amiya2', 'char_1037_amiya3'])

/**
 * Converts the unmet highlighted targets of owned operators in the current filter into MAA Operator Progression plans.
 * Mastery targets carry their Elite 2 and skill level 7 prerequisites; modules are outside MAA's scope and only counted.
 */
function buildMaaOperProgressPlans() {
  const plans = []
  let ignoredEquipCount = 0
  let ignoredAmiyaCount = 0

  for (const operator of visibleOperatorList.value) {
    if (!operator.own) {
      continue
    }

    const skillMastery = [0, 0, 0]
    for (const index of operatorRecommendedSkillSourceMap.value.get(operator.charId) || []) {
      if ((operator[`skill${index + 1}`] || 0) < 3) {
        skillMastery[index] = 3
      }
    }
    const needMastery = skillMastery.some((level) => level > 0)

    let eliteTarget = needMastery ? 2 : 0
    if (operatorRecommendedEliteSourceSet.value.has(operator.charId)) {
      eliteTarget = 2
    } else if (operatorRecommendedElite1SourceSet.value.has(operator.charId)) {
      eliteTarget = Math.max(eliteTarget, 1)
    }

    for (const index of operatorRecommendedEquipSourceMap.value.get(operator.charId) || []) {
      if (!(operator[`mod${operator.equip[index].typeName2}`] > 0)) {
        ignoredEquipCount++
      }
    }

    const plan = {role: operator.profession.charAt(0) + operator.profession.slice(1).toLowerCase(), name: operator.name}
    if (eliteTarget > operator.elite) {
      plan.elite = eliteTarget
    }
    if (needMastery && (operator.mainSkill || 0) < 7) {
      plan.skill_level = 7
    }
    if (needMastery) {
      plan.skill_mastery = skillMastery
    }
    if (Object.keys(plan).length === 2) {
      continue
    }

    if (MAA_UNSUPPORTED_CHAR_IDS.has(operator.charId)) {
      ignoredAmiyaCount++
      continue
    }
    plans.push(plan)
  }

  return {plans, ignoredEquipCount, ignoredAmiyaCount}
}

function copyMaaOperProgressPlans() {
  const {plans, ignoredEquipCount, ignoredAmiyaCount} = buildMaaOperProgressPlans()
  const ignored = [
    ignoredEquipCount > 0 ? `${ignoredEquipCount} 条干员模组培养条目` : '',
    ignoredAmiyaCount > 0 ? `${ignoredAmiyaCount} 条阿米娅培养条目` : '',
  ].filter(Boolean).join('、')
  const ignoredText = ignored ? `（因 MAA 暂不支持，已忽略 ${ignored}）` : ''

  if (plans.length === 0) {
    createMessage({type: 'warn', text: `当前筛选中没有需要培养的已招募干员${ignoredText}`})
    return
  }

  const text = `[\n${plans.map((plan) => `  ${JSON.stringify(plan)}`).join(',\n')}\n]`
  copyTextToClipboard(text, (success) => {
    createMessage(success
      ? {type: 'success', text: `已复制 ${plans.length} 名干员的培养计划，请在 MAA「干员培养」中点击「从剪贴板读取」${ignoredText}`}
      : {type: 'error', text: '复制失败，请检查浏览器剪贴板权限'})
  })
}

const visibleOperatorList = computed(() => {
  let operatorList = displayOperatorList.value

  if (hideCompletedRecommendedOperators.value && hasActiveRecommendFilter.value) {
    operatorList = operatorList.filter((operator) => !isOperatorRecommendationCompleted(operator))
  }

  return operatorList
})

let operatorsStatisticsDetail = ref({})

let operatorsStatisticsDetailDialog = ref(false)

let operatorsStatisticsDetailOperator = ref({})

const detailHeader = [
  {title: '', sortable: false, align: 'center'},
  {title: '等级一', sortable: false, align: 'center'},
  {title: '等级二', sortable: false, align: 'center'},
  {title: '等级三', sortable: false, align: 'center'}
]



function openOperatorsStatisticsDetail(operator) {

  const {charId,elite,skill1,skill2,skill3,modX,modY,modD,modA} = operator

  if(!operatorProgressionStatisticsMap.get(charId)){
    return
  }

  operatorsStatisticsDetailOperator.value = operator

  const result = operatorProgressionStatisticsMap.get(charId)
  const skillList = Array.isArray(result.skills) ? result.skills : []
  const equipList = Array.isArray(result.equip) ? result.equip : []
  const data = []

  const playerSkillRankList = [skill1,skill2,skill3]

  for (let index = 0; index < skillList.length; index++) {
    const info = skillList[index]
    const playerSkillRank = playerSkillRankList[index]

    const ranks = result[`skill${index + 1}`]
    if(!info || !ranks){
      continue
    }
    const item = {
      //v2 数据中技能字段为 skills(元素含 skillName/skillIcon)
      label: info.skillName,
      type: 'skill',
      iconId: info.skillIcon,
      ranks: [
        {
          highlight: playerSkillRank === 1,
          rate:formatNumber(ranks.rank1 * 100)
        },
        {
          highlight: playerSkillRank === 2,
          rate:formatNumber(ranks.rank2 * 100)
        },
        {
          highlight: playerSkillRank === 3,
          rate:formatNumber(ranks.rank3 * 100)
        }
      ]
    }
    data.push(item)
  }



  for (const info of equipList) {
    const playerEquipRank = operator[`mod${info.typeName2}`]
    const ranks = result[`mod${info.typeName2}`]
    if(!info || !ranks){
      continue
    }
    const item = {
      label: info.uniEquipName,
      type: 'equip',
      iconId: info.typeIcon,
      ranks: [
        {
          highlight: playerEquipRank === 1,
          rate:formatNumber(ranks.rank1 * 100)
        },
        {
          highlight: playerEquipRank === 2,
          rate:formatNumber(ranks.rank2 * 100)
        },
        {
          highlight: playerEquipRank === 3,
          rate:formatNumber(ranks.rank3 * 100)
        }
      ]
    }
    data.push(item)
  }

  operatorsStatisticsDetail.value = data
  operatorsStatisticsDetailDialog.value = true

}


function playProgressionHighlight(highlight){
  if(highlight){
    return 'highlight'
  }
}

/**
 * 找回填写过的角色信息
 */
function getOperatorData() {
  if (!hasStoredUserToken()) {
    sectionPanels.value = ['importExport']
    operatorList.value = createOperatorList()
    syncGuestOwnFilterDefault(false)
    return
  }

  //根据一图流的token查询用户填写的干员数据
  operatorDataAPI.getOperatorData().then((response) => {
    let list = response.data || []; //后端返回的数据
    sectionPanels.value = list.length > 0 ? [] : ['importExport']
    operatorList.value = createOperatorList(list)
    syncGuestOwnFilterDefault(list.length > 0)
    createMessage({type:'success',text:"导入了 " + list.length + " 条数据"});

  }).catch(() => {
    sectionPanels.value = ['importExport']
  });
}

/**
 * 筛选干员
 * @param func 筛选函数
 * @param index 传入筛选条件索引
 */
function addFilterConditionAndFilterOperator (func, index){
  func(index)
  refreshDisplayOperatorList()
}

/**
 * 根据按钮点击状态返回按钮样式
 * @param action 状态
 * @returns {string} 按钮样式
 */
function btnAction(action) {
  if (!action) {
    return "tonal"
  }
}

function toggleRecommendThreshold(threshold) {
  recommendThreshold.value = recommendThreshold.value === threshold ? null : threshold
}

function toggleRecommendEquipThreshold(threshold) {
  recommendEquipThreshold.value = recommendEquipThreshold.value === threshold ? null : threshold
}

function toggleRecommendElite1Threshold(threshold) {
  const nextThreshold = recommendElite1Threshold.value === threshold ? null : threshold
  recommendElite1Threshold.value = nextThreshold
  if (nextThreshold !== null) {
    recommendEliteThreshold.value = null
  }
}

function toggleRecommendEliteThreshold(threshold) {
  const nextThreshold = recommendEliteThreshold.value === threshold ? null : threshold
  recommendEliteThreshold.value = nextThreshold
  if (nextThreshold !== null) {
    recommendElite1Threshold.value = null
  }
}


const operatorExportSettingsDialog = ref(false)
const operatorExportScope = ref('all')
const operatorExportScopeOptions = [
  {title: '导出所有干员', value: 'all'},
  {title: '导出已持有干员', value: 'owned'},
  {title: '导出当前筛选的干员', value: 'filtered'},
]
const operatorExportModules = [
  {type: 'X', field: 'modX', label: 'χ'},
  {type: 'Y', field: 'modY', label: 'γ'},
  {type: 'D', field: 'modD', label: 'Δ'},
  {type: 'A', field: 'modA', label: 'α'},
  {type: 'B', field: 'modB', label: 'β'},
]
const operatorExportColumnGroups = [
  {
    key: 'profile',
    fields: [
      {key: 'name', title: '干员名称', value: (operator) => operator.name},
      {key: 'rarity', title: '星级', value: (operator) => operator.rarity},
      {key: 'profession', title: '职业', value: (operator) => operatorClassLabelMap.get(operator.profession) || operator.profession || ''},
    ],
    optionalOptions: [
      {key: 'charId', title: '干员 ID', fields: [{key: 'charId', title: '干员 ID', value: (operator) => operator.charId}]},
      {key: 'subProfessionId', title: '分支', fields: [{key: 'subProfessionId', title: '分支', value: (operator) => operatorClassLabelMap.get(operator.subProfessionId) || operator.subProfessionId || ''}]},
      {key: 'date', title: '实装日期', fields: [{key: 'date', title: '实装日期', value: (operator) => operator.date ? dateFormat(operator.date) : ''}]},
      {key: 'itemObtainApproach', title: '获得方式', fields: [{key: 'itemObtainApproach', title: '获得方式', value: (operator) => operator.itemObtainApproach || ''}]},
    ],
  },
  {
    key: 'progress',
    fields: [
      {key: 'own', title: '是否已招募', value: (operator) => operator.own ? '是' : '否'},
      {key: 'level', title: '等级', value: (operator) => operator.level},
      {key: 'elite', title: '精英化等级', value: (operator) => operator.elite},
      {key: 'potential', title: '潜能等级', value: (operator) => operator.potential ?? 0},
      {key: 'mainSkill', title: '通用技能等级', value: (operator) => operator.mainSkill ?? 0},
    ],
    optionalOptions: [],
  },
  {
    key: 'skills',
    fields: [],
    optionalOptions: [{
      key: 'skills',
      title: '技能信息',
      fields: [1, 2, 3].flatMap((skillIndex) => [
        {
          key: `skill${skillIndex}Name`,
          title: `${skillIndex}技能名称`,
          value: (operator) => operator.skills?.[skillIndex - 1]?.skillName || '',
        },
        {
          key: `skill${skillIndex}Level`,
          title: `${skillIndex}技能专精等级`,
          value: (operator) => operator[`skill${skillIndex}`] ?? 0,
        },
      ]),
    }],
  },
  {
    key: 'modules',
    fields: [],
    optionalOptions: [{
      key: 'modules',
      title: '模组信息',
      fields: operatorExportModules.flatMap(({type, field, label}) => [
        {
          key: `${field}Name`,
          title: `${label}模组名称`,
          value: (operator) => operator.equip?.find((item) => item.typeName2 === type)?.uniEquipName || '',
        },
        {
          key: field,
          title: `${label}模组等级`,
          value: (operator) => operator[field] ?? 0,
        },
      ]),
    }],
  },
]
const operatorExportOptionalOptions = operatorExportColumnGroups.flatMap((group) => group.optionalOptions)
const selectedOperatorExportOptions = ref([])
const draftOperatorExportScope = ref(operatorExportScope.value)
const draftOperatorExportOptions = ref([])

function openOperatorExportSettings() {
  draftOperatorExportScope.value = operatorExportScope.value
  draftOperatorExportOptions.value = [...selectedOperatorExportOptions.value]
  operatorExportSettingsDialog.value = true
}

function toggleOperatorExportOption(key) {
  draftOperatorExportOptions.value = draftOperatorExportOptions.value.includes(key)
    ? draftOperatorExportOptions.value.filter((option) => option !== key)
    : [...draftOperatorExportOptions.value, key]
}

function resetOperatorExportSettings() {
  draftOperatorExportScope.value = 'all'
  draftOperatorExportOptions.value = []
}

function saveOperatorExportSettings() {
  operatorExportScope.value = draftOperatorExportScope.value
  selectedOperatorExportOptions.value = [...draftOperatorExportOptions.value]
  operatorExportSettingsDialog.value = false
}

function getSelectedOperatorExportFields(selectedOptions) {
  const selectedKeys = new Set(selectedOptions)
  return operatorExportColumnGroups.flatMap((group) => [
    ...group.fields,
    ...group.optionalOptions
      .filter((option) => selectedKeys.has(option.key))
      .flatMap((option) => option.fields),
  ])
}

/**
 * 导出干员信息与练度表
 */
function exportOperatorExcel() {
  let sourceList = operatorList.value
  if (operatorExportScope.value === 'owned') {
    sourceList = sourceList.filter((operator) => operator.own)
  } else if (operatorExportScope.value === 'filtered') {
    sourceList = visibleOperatorList.value
  }

  if (sourceList.length === 0) {
    createMessage({type: 'warn', text: '当前范围没有可导出的干员'})
    return
  }

  //按实装倒序排序，时间相同时按星级降序排序
  const selectedFields = getSelectedOperatorExportFields(selectedOperatorExportOptions.value)
  const sortedOperatorList = [...sourceList].sort((a, b) =>
    b.updateTime - a.updateTime || b.rarity - a.rarity
  )
  const list = [selectedFields.map((field) => field.title)]
  for (const operator of sortedOperatorList) {
    list.push(selectedFields.map((field) => field.value(operator)))
  }

  exportExcel('干员练度表', list)
}


let sortProperty = ref({})

/**
 * 干员数组operator_list根据干员属性排序
 * @param {string} property 干员属性
 */
function sortOperatorList(property) {

  sortProperty.value[property] = !sortProperty.value[property]
  displayOperatorList.value.sort((a, b) => {
    if (sortProperty.value[property]) {
      return b[property] - a[property];
    } else {
      return a[property] - b[property];
    }
  });
}

function sortOperatorListByLevel() {
  sortProperty.value.progressionLevel = !sortProperty.value.progressionLevel
  const direction = sortProperty.value.progressionLevel ? -1 : 1
  displayOperatorList.value.sort((a, b) => compareOperatorLevel(a, b) * direction)
}

function compareOperatorLevel(a, b) {
  const eliteDiff = getSortNumber(a.elite) - getSortNumber(b.elite)
  if (eliteDiff !== 0) return eliteDiff

  const levelDiff = getSortNumber(a.level) - getSortNumber(b.level)
  if (levelDiff !== 0) return levelDiff

  const rarityDiff = getSortNumber(a.rarity) - getSortNumber(b.rarity)
  if (rarityDiff !== 0) return rarityDiff

  return getSortNumber(a.updateTime) - getSortNumber(b.updateTime)
}

function getSortNumber(value) {
  return Number(value) || 0
}


onMounted(() => {
  getOperatorData()
  openImportFlowFromRoute()
});

watch(isUserLoggedIn, (loggedIn) => {
  if (!loggedIn) {
    return
  }

  clearGuestOwnFilterDefault()
  refreshDisplayOperatorList()
})

watch(() => route.query.openImport, () => {
  openImportFlowFromRoute()
})

onBeforeUnmount(() => {
  cancelImportViewAnimationFrame()
  clearGuestOwnFilterDefault()
  stopSklandQrPolling()
})
</script>


<template>
  <div class="survey-operator-page">
    <v-expansion-panels v-model="sectionPanels" multiple class="operator-page-sections">
      <v-expansion-panel class="operator-section-card" value="importExport">
        <v-expansion-panel-title>
          <span class="operator-section-title">
            <v-icon class="operator-section-title-icon">mdi-cloud-sync</v-icon>
            干员导入/导出
          </span>
        </v-expansion-panel-title>
        <v-expansion-panel-text>
          <div class="operator-import-actions">
            <v-btn class="operator-import-action" color="primary" @click="openSklandImportDialog()">
              <v-icon class="operator-import-action-icon">mdi-cloud-download</v-icon>
              <span class="operator-import-action-copy">
                <span class="operator-import-action-title">导入干员数据</span>
                <span class="operator-import-action-desc">支持官网 Token（桌面端/移动端）和森空岛凭证</span>
              </span>
            </v-btn>
            <div class="operator-export-button-group">
              <v-btn
                class="operator-import-action operator-export-main-button"
                color="primary"
                variant="outlined"
                @click="exportOperatorExcel()"
              >
                <v-icon class="operator-import-action-icon">mdi-file-excel</v-icon>
                <span class="operator-import-action-copy">
                  <span class="operator-import-action-title">导出为 Excel</span>
                  <span class="operator-import-action-desc">下载当前干员数据表格</span>
                </span>
              </v-btn>
              <v-btn
                class="operator-export-settings-button"
                icon="mdi-tune-variant"
                color="primary"
                variant="outlined"
                aria-label="导出设置"
                @click="openOperatorExportSettings()"
              />
            </div>
          </div>
        </v-expansion-panel-text>
      </v-expansion-panel>

      <v-expansion-panel class="operator-section-card operator-statistics-section" value="statistics">
        <v-expansion-panel-title>
          <span class="operator-section-title">
            <v-icon class="operator-section-title-icon">mdi-chart-box-outline</v-icon>
            干员数据统计
          </span>
        </v-expansion-panel-title>
        <v-expansion-panel-text>
          <OperatorStatisticalTable v-model="operatorList"></OperatorStatisticalTable>
        </v-expansion-panel-text>
      </v-expansion-panel>

      <v-expansion-panel class="operator-section-card" value="filter">
        <v-expansion-panel-title>
          <span class="operator-section-title">
            <v-icon class="operator-section-title-icon">mdi-filter-variant</v-icon>
            大数据养成推荐/干员筛选
          </span>
        </v-expansion-panel-title>
        <v-expansion-panel-text>
          <div class="operator-filter-card-content">
            <div class="operator-recommend-panel">
              <div class="operator-recommend-header">
                <div class="operator-recommend-label">
                  高亮专三率高于{{ recommendThreshold ? `${recommendThreshold}%` : "x%" }}的技能
                </div>
                <div class="operator-recommend-threshold-group" role="group" aria-label="高亮专三率筛选">
                  <v-btn
                      v-for="threshold in recommendThresholdOptions"
                      :key="threshold"
                      color="primary"
                      :variant="recommendThreshold === threshold ? 'flat' : 'text'"
                      :class="['operator-recommend-threshold-btn', { 'is-active': recommendThreshold === threshold }]"
                      @click="toggleRecommendThreshold(threshold)"
                  >
                    {{ threshold }}%
                  </v-btn>
                </div>
              </div>
              <div class="operator-recommend-header">
                <div class="operator-recommend-label">
                  高亮模组解锁率高于{{ recommendEquipThreshold ? `${recommendEquipThreshold}%` : "x%" }}的模组
                </div>
                <div class="operator-recommend-threshold-group operator-recommend-threshold-group-warning" role="group" aria-label="高亮模组解锁率筛选">
                  <v-btn
                      v-for="threshold in recommendThresholdOptions"
                      :key="`equip-${threshold}`"
                      color="warning"
                      :variant="recommendEquipThreshold === threshold ? 'flat' : 'text'"
                      :class="[
                        'operator-recommend-threshold-btn',
                        'operator-recommend-threshold-btn-warning',
                        { 'is-active': recommendEquipThreshold === threshold }
                      ]"
                      @click="toggleRecommendEquipThreshold(threshold)"
                  >
                    {{ threshold }}%
                  </v-btn>
                </div>
              </div>
              <div class="operator-recommend-header">
                <div class="operator-recommend-label">
                  高亮精一率高于{{ recommendElite1Threshold ? `${recommendElite1Threshold}%` : "x%" }}的干员
                </div>
                <div class="operator-recommend-threshold-group operator-recommend-threshold-group-elite" role="group" aria-label="高亮精一率筛选">
                  <v-btn
                      v-for="threshold in recommendEliteThresholdOptions"
                      :key="`elite1-${threshold}`"
                      color="#c99516"
                      :variant="recommendElite1Threshold === threshold ? 'flat' : 'text'"
                      :class="[
                        'operator-recommend-threshold-btn',
                        'operator-recommend-threshold-btn-elite',
                        { 'is-active': recommendElite1Threshold === threshold }
                      ]"
                      @click="toggleRecommendElite1Threshold(threshold)"
                  >
                    {{ threshold }}%
                  </v-btn>
                </div>
              </div>
              <div class="operator-recommend-header">
                <div class="operator-recommend-label">
                  高亮精二率高于{{ recommendEliteThreshold ? `${recommendEliteThreshold}%` : "x%" }}的干员
                </div>
                <div class="operator-recommend-threshold-group operator-recommend-threshold-group-elite" role="group" aria-label="高亮精二率筛选">
                  <v-btn
                      v-for="threshold in recommendEliteThresholdOptions"
                      :key="`elite-${threshold}`"
                      color="#c99516"
                      :variant="recommendEliteThreshold === threshold ? 'flat' : 'text'"
                      :class="[
                        'operator-recommend-threshold-btn',
                        'operator-recommend-threshold-btn-elite',
                        { 'is-active': recommendEliteThreshold === threshold }
                      ]"
                      @click="toggleRecommendEliteThreshold(threshold)"
                  >
                    {{ threshold }}%
                  </v-btn>
                </div>
              </div>
              <div class="operator-recommend-actions">
                <v-switch
                    v-model="hideCompletedRecommendedOperators"
                    class="operator-recommend-toggle"
                    color="primary"
                    density="compact"
                    hide-details
                    inset
                    label="隐藏已满足条件的干员"
                ></v-switch>
                <v-btn
                    color="primary"
                    variant="tonal"
                    prepend-icon="mdi-content-copy"
                    :disabled="!hasActiveRecommendFilter"
                    title="将当前筛选中已招募干员未达标的精英化与专精高亮复制为 MAA「干员培养」计划"
                    @click="copyMaaOperProgressPlans()"
                >
                  复制 MAA 培养计划
                </v-btn>
              </div>
            </div>
            <v-divider class="operator-filter-divider"></v-divider>
            <div class="operator-filter-panel">
              <div class="operator-filter-group" v-for="filterGroup in displayOperatorFilterCondition" :key="filterGroup.module">
                <v-btn variant="text" class="operator-filter-label">{{ filterGroup.conditions.label }}</v-btn>
                <v-btn color="primary" :variant="btnAction(condition.action)"
                       class="m-4" rounded="x-large"
                       v-for="(condition,index) in filterGroup.conditions.conditions" :key="index"
                       @click="addFilterConditionAndFilterOperator(filterGroup.conditions.actionFunc,index)">
                  {{ condition.label }}
                </v-btn>
              </div>
              <div class="operator-filter-group">
                <v-btn variant="text" class="operator-filter-label">排序</v-btn>
                <v-btn color="primary" variant="tonal"
                       @click="sortOperatorList('updateTime')"
                       class="m-4">
                  按实装顺序
                </v-btn>
                <v-btn color="primary" variant="tonal"
                       @click="sortOperatorListByLevel()"
                       class="m-4">
                  按等级排序
                </v-btn>
              </div>
            </div>
          </div>
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>

    <p>点击干员卡片可查看当前干员的练度统计结果</p>
    <!--   干员表单-->
    <div class="operator-form">
      <OperatorBar
          v-for="(operator, charId) in visibleOperatorList"
          :operator-info="operator"
          :recommended-skill-indexes="operatorRecommendedSkillSourceMap.get(operator.charId) || []"
          :recommended-equip-indexes="operatorRecommendedEquipSourceMap.get(operator.charId) || []"
          :is-elite-recommended="operatorRecommendedElite1SourceSet.has(operator.charId) || operatorRecommendedEliteSourceSet.has(operator.charId)"
          @click="openOperatorsStatisticsDetail(operator)"
      ></OperatorBar>
    </div>



    <v-dialog v-model="operatorExportSettingsDialog" max-width="600">
      <v-card>
        <v-card-text>
          <div class="text-subtitle-2 mb-3">导出范围</div>
          <v-btn-toggle
            v-model="draftOperatorExportScope"
            class="w-100 operator-export-scope"
            color="primary"
            mandatory
            border
            divided
            role="group"
            aria-label="导出范围"
          >
            <v-btn
              v-for="option in operatorExportScopeOptions"
              :key="option.value"
              :value="option.value"
              class="flex-grow-1 px-1"
            >
              <span class="text-wrap">{{ option.title }}</span>
            </v-btn>
          </v-btn-toggle>
        </v-card-text>
        <v-divider />
        <v-card-text>
          <div class="text-subtitle-2 mb-3">可选附加导出内容</div>
          <v-row dense role="group" aria-label="可选附加导出内容">
            <v-col
              v-for="option in operatorExportOptionalOptions"
              :key="option.key"
              cols="6"
              sm="4"
            >
              <v-btn
                block
                class="operator-export-option"
                :class="{'operator-export-option--selected': draftOperatorExportOptions.includes(option.key)}"
                :color="draftOperatorExportOptions.includes(option.key) ? 'primary' : undefined"
                variant="outlined"
                :aria-pressed="draftOperatorExportOptions.includes(option.key)"
                @click="toggleOperatorExportOption(option.key)"
              >
                <span class="operator-export-option-content">
                  <v-icon size="16" aria-hidden="true">
                    {{ draftOperatorExportOptions.includes(option.key) ? 'mdi-circle' : 'mdi-circle-outline' }}
                  </v-icon>
                  <span>{{ option.title }}</span>
                </span>
              </v-btn>
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions class="justify-end">
          <v-btn variant="text" @click="resetOperatorExportSettings()">恢复默认设置</v-btn>
          <v-btn variant="text" @click="operatorExportSettingsDialog = false">取消</v-btn>
          <v-btn color="primary" variant="flat" @click="saveOperatorExportSettings()">保存</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="operatorsStatisticsDetailDialog" max-width="500">
      <v-card>
        <div class="operator-detail-dialog-title">
          <OperatorAvatar
              :char-id="operatorsStatisticsDetailOperator.charId"
              :size="40"
              :mobile-size="36"
              :border="true"
          ></OperatorAvatar>
          <div class="operator-detail-dialog-copy">
            <div class="operator-detail-dialog-name">{{ operatorsStatisticsDetailOperator.name }}</div>
            <div class="operator-detail-dialog-desc">表中数值为全服平均练度，蓝色高亮为博士当前练度</div>
          </div>
        </div>
        <v-card-text class="operator-detail-dialog-content">
          <v-data-table
              :headers="detailHeader"
              :items="operatorsStatisticsDetail"
              class="operator-detail-table"
              density="compact"
              hide-default-footer
              items-per-page="-1">
            <template v-slot:item="{ item }">
              <tr>
                <td class="operator-detail-item-cell">
                  <div class="operator-detail-item">
                    <div class="operator-detail-item-icon">
                      <EquipIcon :icon="item.iconId" :size="34" v-show="item.type==='equip'"></EquipIcon>
                      <SkillIcon size="36" :mobile-size="32" :border="true" :icon="`${item.iconId}`" v-show="item.type==='skill'"></SkillIcon>
                    </div>
                    <div class="operator-detail-item-label">{{ item.label }}</div>
                  </div>
                </td>
                <td v-for="rank in item.ranks" class="operator-detail-rank-cell">
                  <div :class="playProgressionHighlight(rank.highlight)" class="operator-detail-rank-value">
                    {{rank.rate}}%
                  </div>
                </td>
              </tr>
            </template>
          </v-data-table>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- 干员数据导入对话框（官网 Token / 森空岛凭证） -->
    <v-dialog v-model="sklandImportDialog" max-width="720" persistent>
      <v-card
          class="operator-import-dialog-card"
          elevation="0"
          @keydown.esc.stop.prevent="requestCloseImportDialog"
      >
        <div class="operator-import-dialog-header" role="heading" aria-level="2">
          <v-btn
              v-if="importFlowStarted"
              class="operator-import-dialog-back"
              icon
              variant="text"
              density="comfortable"
              aria-label="返回选择导入方式"
              title="返回选择导入方式"
              @click="returnToImportMethodSelection"
          >
            <v-icon>mdi-arrow-left</v-icon>
          </v-btn>
          <span class="operator-import-dialog-title">
            {{ importFlowStarted
                ? (importMethods.find((method) => method.key === selectedImportMethod)?.title || '导入干员数据')
                : '选择一个导入方式' }}
          </span>
          <v-btn
              class="operator-import-dialog-close"
              icon
              variant="text"
              density="comfortable"
              aria-label="关闭导入窗口"
              title="关闭导入窗口"
              @click="requestCloseImportDialog"
          >
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </div>
        <v-card-text class="operator-import-dialog-content">
          <div
              class="operator-import-view-shell"
              :style="{ height: importViewHeight }"
          >
          <Transition
              name="operator-import-view"
              mode="out-in"
              @before-leave="beforeImportViewLeave"
              @enter="enterImportView"
              @after-enter="afterImportViewEnter"
          >
            <div v-if="!importFlowStarted" key="method-selection" class="operator-import-method-list">
              <div
                  v-for="method in importMethods"
                  :key="method.key"
                  class="operator-import-method-card"
                  :class="{ 'operator-import-method-card--selected': selectedImportMethod === method.key }"
              >
                <button
                    class="operator-import-method-header"
                    type="button"
                    :aria-expanded="selectedImportMethod === method.key"
                    :aria-controls="`operator-import-${method.key}-details`"
                    @click="selectImportMethod(method.key)"
                >
                  <span class="operator-import-method-copy">
                    <img
                        class="operator-import-method-avatar"
                        :class="{ 'operator-import-method-avatar--official': method.key === 'official' }"
                        :src="method.avatar"
                        :alt="method.title"
                    >
                    <span class="operator-import-method-text">
                      <span class="operator-import-method-title">{{ method.title }}</span>
                      <span class="operator-import-method-subtitle">{{ method.subtitle }}</span>
                      <span class="operator-import-method-subtitle-note">{{ method.subtitleNote }}</span>
                    </span>
                  </span>
                </button>

                <div
                    :id="`operator-import-${method.key}-details`"
                    class="operator-import-method-expansion"
                    :aria-hidden="selectedImportMethod !== method.key"
                >
                  <div class="operator-import-method-expansion-inner">
                    <div class="operator-import-method-notice operator-import-method-notice--purpose" role="note">
                      <strong>凭证用途</strong>
                      <ul class="operator-import-method-purpose-list">
                        <li v-for="item in method.purpose" :key="item">{{ item }}</li>
                      </ul>
                      <p v-if="method.purposeNote" class="operator-import-method-purpose-note">{{ method.purposeNote }}</p>
                    </div>

                    <div
                        class="operator-import-method-notice"
                        :class="{
                          'operator-import-method-notice--warning': method.key === 'skland',
                          'operator-import-method-notice--danger': method.key === 'official',
                        }"
                        role="note"
                    >
                      <strong>安全提示</strong>
                      <p v-for="paragraph in method.warning" :key="paragraph">{{ paragraph }}</p>
                    </div>

                    <div class="operator-import-method-actions">
                      <button
                          class="operator-import-method-action"
                          type="button"
                          @click="startImportFlow(method.key)"
                      >
                        <span>开始导入</span>
                        <v-icon size="16" aria-hidden="true">mdi-arrow-right</v-icon>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div v-else key="import-flow" class="operator-import-flow">
              <v-alert
                  v-if="!isUserLoggedIn"
                  :icon="false"
                  color="warning"
                  variant="tonal"
                  density="compact"
                  class="text-left"
              >
                <div class="d-flex align-center justify-space-between ga-3">
                  <span>当前未登录一图流账号，登录后才能获取账号列表，并将导入数据保存到“我的干员”。</span>
                  <v-btn
                      color="warning"
                      variant="flat"
                      size="small"
                      @click="loginDialog = true"
                  >
                    登录
                  </v-btn>
                </div>
              </v-alert>
              <v-window v-model="sklandImportTab">
              <v-window-item value="skland">
            <div class="operator-import-progress-comparison">
              <div class="operator-import-progress-variant">
                <v-stepper
                    v-model="sklandImportStep"
                    class="operator-import-progress-vuetify"
                    flat
                    editable
                    hide-actions
                >
                  <v-stepper-header>
                    <v-stepper-item title="登录森空岛" :value="1" :complete="sklandImportStep > 1"></v-stepper-item>
                    <v-divider></v-divider>
                    <v-stepper-item title="获取凭证" :value="2" :complete="sklandImportStep > 2"></v-stepper-item>
                    <v-divider></v-divider>
                    <v-stepper-item title="选择账号" :value="3" :complete="sklandImportStep > 3"></v-stepper-item>
                  </v-stepper-header>
                </v-stepper>
              </div>
            </div>
            <v-stepper
                v-model="sklandImportStep"
                class="operator-import-progress-content"
                :items="['登录森空岛', '获取凭证', '选择账号']"
                alt-labels
            >
              <template v-slot:item.1>
                  <v-card flat>
                    <v-card-text class="text-center">
                  <v-alert :icon="false" color="primary" variant="tonal" class="mb-4 text-left">
                    此导入方式仅适合电脑，Windows系统建议使用Microsoft Edge浏览器，macOS系统建议使用Safari浏览器
                  </v-alert>
                  <p class="mb-4">首先登录森空岛网页版</p>
                  <v-btn color="primary" @click="openLinkOnNewPage(SKLAND_LINK)">
                    <v-icon>mdi-open-in-new</v-icon>
                    打开森空岛官网
                  </v-btn>
                </v-card-text>
              </v-card>
            </template>
            
            <template v-slot:item.2>
              <v-card flat>
                <v-card-text>

                  <img src="/image/skland/step1.jpg" alt="步骤1" style="max-width: 100%; border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.15); margin-bottom: 12px;" />
                  <p>登录森空岛后，在森空岛首页按键盘F12调出开发者工具，在下方选择控制台(console)，输入以下命令：</p>
                  <v-alert :icon="false" color="primary" variant="tonal" class="my-4">
                    <code style="word-break: break-all;">{{ CONSOLE_CODE }}</code>
                  </v-alert>
                  <div class="text-center">
                    <v-btn color="primary" @click="copyText(CONSOLE_CODE)">
                      <v-icon>mdi-content-copy</v-icon>
                      点击复制命令
                    </v-btn>
                  </div>
                  <p class="mt-4 mb-4">输入后按Enter键执行，会自动复制凭证字符串到剪贴板</p>
                  <p class="mb-0 orange">如果遇到了无法粘贴的情况，可以输入“allow pasting”或者“允许粘贴”，然后回车即可</p>
                
                </v-card-text>
              </v-card>
            </template>
            
            <template v-slot:item.3>
              <v-card flat>
                <v-card-text>
                  <div class="operator-import-credential-row">
                    <v-text-field
                      v-model="sklandInputText"
                      label="粘贴凭证字符串"
                      variant="outlined"
                      density="compact"
                      hide-details
                      class="operator-import-credential-input"
                    ></v-text-field>
                    <v-btn
                      color="primary"
                      @click="getPlayerBindingBySkland"
                      :loading="sklandLoading"
                      class="operator-import-credential-action"
                    >
                      {{ sklandInputText.trim()
                          ? '粘贴好了，获取账号列表并导入！'
                          : '请把获取到的字符串粘贴在左侧' }}
                    </v-btn>
                  </div>
                  
                  <div v-if="playBindingList.length > 0" class="mt-4">
                    <p class="mb-2">选择要导入的账号：</p>
                    <v-btn 
                      v-for="(binding, index) in playBindingList" 
                      :key="index"
                      color="success"
                      variant="tonal"
                      block
                      class="mb-2 text-left"
                      style="height: auto; padding: 12px;"
                      @click="getPlayerDataAndSync(binding)"
                      :loading="sklandLoading"
                    >
                      <div style="width: 100%;">
                        <div class="font-weight-bold">{{ binding.nickName }}</div>
                        <div class="text-caption">区服：{{ binding.channelName }} | UID: {{ binding.uid }}</div>
                      </div>
                    </v-btn>
                  </div>
                </v-card-text>
              </v-card>
            </template>
            </v-stepper>
              </v-window-item>

              <!-- 官网导入：登录官网 -> 获取 Token -> 输入凭证 -->
              <v-window-item value="official">
              <div class="operator-import-progress-comparison">
                <div class="operator-import-progress-variant">
                  <v-stepper
                      v-model="officialImportStep"
                      class="operator-import-progress-vuetify"
                      flat
                      editable
                      hide-actions
                  >
                    <v-stepper-header>
                      <v-stepper-item title="登录官网" :value="1" :complete="officialImportStep > 1"></v-stepper-item>
                      <v-divider></v-divider>
                      <v-stepper-item title="获取 Token" :value="2" :complete="officialImportStep > 2"></v-stepper-item>
                      <v-divider></v-divider>
                      <v-stepper-item title="输入凭证" :value="3" :complete="officialImportStep > 3"></v-stepper-item>
                    </v-stepper-header>
                  </v-stepper>
                </div>
              </div>
              <v-stepper
                  v-model="officialImportStep"
                  class="operator-import-progress-content"
                  :items="['登录官网', '获取 Token', '输入凭证']"
                  alt-labels
              >
                <template v-slot:item.1>
                  <v-card flat>
                    <v-card-text class="text-center">
                      <p class="mb-4">首先打开并登录明日方舟官网</p>
                      <v-btn color="primary" @click="openLinkOnNewPage(OFFICIAL_SITE_LINK)">
                        <v-icon>mdi-open-in-new</v-icon>
                        打开明日方舟官网
                      </v-btn>
                    </v-card-text>
                  </v-card>
                </template>

                <template v-slot:item.2>
                  <v-card flat>
                    <v-card-text class="text-center">
                      <p class="mb-4">登录后访问以下地址，复制全部内容：</p>
                      <v-alert :icon="false" color="primary" variant="tonal" class="my-4">
                        <code style="word-break: break-all;">{{ HG_ACCOUNT_INFO_URL }}</code>
                      </v-alert>
                      <div class="text-center">
                        <v-btn color="primary" variant="outlined" @click="copyText(HG_ACCOUNT_INFO_URL)" class="mx-2">
                          <v-icon>mdi-content-copy</v-icon>
                          复制地址
                        </v-btn>
                        <v-btn color="primary" @click="openLinkOnNewPage(HG_ACCOUNT_INFO_URL)" class="mx-2">
                          <v-icon>mdi-open-in-new</v-icon>
                          直接访问
                        </v-btn>
                      </div>
                    </v-card-text>
                  </v-card>
                </template>

                <template v-slot:item.3>
                  <v-card flat>
                    <v-card-text>
                      <p class="mb-4">将获取到的凭证粘贴到下面的输入框中</p>
                      <div class="operator-import-credential-row operator-import-credential-row--column">
                        <v-text-field
                            v-model="officialTokenText"
                            label="粘贴返回内容"
                            type="password"
                            variant="outlined"
                            density="compact"
                            hide-details
                            class="operator-import-credential-input"
                        ></v-text-field>
                        <v-btn
                            color="primary"
                            @click="getPlayerBindingByOfficialToken"
                            :loading="sklandLoading"
                            class="operator-import-credential-action"
                        >
                          {{ officialTokenText.trim()
                              ? '粘贴好了，获取账号列表并导入！'
                              : '请先在上方输入框粘贴返回内容' }}
                        </v-btn>
                      </div>

                      <div v-if="playBindingList.length > 0" class="mt-4">
                        <p class="mb-2">选择要导入的账号：</p>
                        <v-btn
                            v-for="(binding, index) in playBindingList"
                            :key="index"
                            color="success"
                            variant="tonal"
                            block
                            class="mb-2 text-left"
                            style="height: auto; padding: 12px;"
                            @click="getPlayerDataAndSync(binding)"
                            :loading="sklandLoading"
                        >
                          <div style="width: 100%;">
                            <div class="font-weight-bold">{{ binding.nickName }}</div>
                            <div class="text-caption">区服：{{ binding.channelName }} | UID: {{ binding.uid }}</div>
                          </div>
                        </v-btn>
                      </div>
                    </v-card-text>
                  </v-card>
                </template>
              </v-stepper>
              </v-window-item>

              <!-- 森空岛扫码登录：申请二维码 -> 扫码确认 -> 选择账号 -->
              <v-window-item value="qr">
                <div class="operator-import-qr">
                  <template v-if="sklandQrImage">
                    <div class="text-center">
                      <img
                          :src="sklandQrImage"
                          alt="森空岛扫码登录二维码"
                          class="operator-import-qr-image"
                      >
                      <p class="operator-import-qr-status">{{ sklandQrStatusText }}</p>
                      <v-btn
                          color="primary"
                          variant="tonal"
                          :loading="sklandLoading"
                          @click="refreshSklandQrCode"
                      >
                        <v-icon>mdi-refresh</v-icon>
                        重新生成
                      </v-btn>
                    </div>
                  </template>
                  <template v-else>
                    <div class="text-center">
                      <v-icon size="56" color="primary" class="mb-2">mdi-qrcode-scan</v-icon>
                      <p class="mb-4">请使用森空岛 APP 扫描二维码完成登录</p>
                      <v-btn color="primary" :loading="sklandLoading" @click="createSklandQrCode">
                        <v-icon>mdi-qrcode</v-icon>
                        生成二维码
                      </v-btn>
                    </div>
                  </template>

                  <div v-if="playBindingList.length > 0" class="mt-4">
                    <p class="mb-2">选择要导入的账号：</p>
                    <v-btn
                        v-for="(binding, index) in playBindingList"
                        :key="index"
                        color="success"
                        variant="tonal"
                        block
                        class="mb-2 text-left"
                        style="height: auto; padding: 12px;"
                        @click="getPlayerDataAndSync(binding)"
                        :loading="sklandLoading"
                    >
                      <div style="width: 100%;">
                        <div class="font-weight-bold">{{ binding.nickName }}</div>
                        <div class="text-caption">区服：{{ binding.channelName }} | UID: {{ binding.uid }}</div>
                      </div>
                    </v-btn>
                  </div>
                </div>
              </v-window-item>
              </v-window>
              <!-- 常见问题：三种导入方式共用，置于最后一步下方 -->
              <ImportCommonQuestions class="mt-4" />
            </div>
          </Transition>
          </div>
        </v-card-text>
      </v-card>
    </v-dialog>

    <v-dialog v-model="loginDialog" max-width="400">
      <Login
          dialog
          @success="handleLoginSuccess"
          @navigate="handleLoginNavigate"
      ></Login>
    </v-dialog>

  </div>
</template>


