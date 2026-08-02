<script setup>
import '/src/assets/css/information/logistics.scss'
import '/src/assets/css/information/logistics.phone.scss'

import {operatorFilterConditionTable} from "/src/utils/buildingSkillFilter";
import building_table from '/src/static/json/build/building_table.json'
import logistics_skill_replace_groups from '/src/static/json/build/logistics_skill_replace_groups.json'
import {operatorTableV2} from "/src/utils/gameData.js"; // v2 干员信息与材料消耗数据
import item_info from '/src/static/json/material/item_info.json'
import level_cost_table from '/src/static/json/operator/level_cost_table.json'
import itemCache from "/src/plugins/indexedDB/itemCache.js";
import {getStageConfig} from "/src/utils/user/userConfig.js";
import {onMounted, ref} from "vue";
import {debounce} from "/src/utils/debounce";
import {translate} from "/src/utils/i18n";
import DescriptionExplain from "/src/components/tools/DescriptionExplain.vue";
import OperatorAvatar from "@/components/sprite/OperatorAvatar.vue";

let buildingTable = {}
for (const operator of building_table) {
  if (!buildingTable[operator.charId]) {
    buildingTable[operator.charId] = []
  }
  buildingTable[operator.charId].push(operator)
}

const DEFAULT_UNMATCHED_EFFICIENCY_SCORE = 100
const efficiencyScoreFiles = import.meta.glob('/src/static/json/build/logistics_efficiency_scores/*.json', {
  eager: true,
  import: 'default',
})
const efficiencyScoreTable = mergeEfficiencyScoreFiles(Object.values(efficiencyScoreFiles))

const COLOR = {BLUE: 'blue', ORANGE: 'orange'}
const LMD_ID = '4001'
const EXP_RECORD_ID = '2003'
const EXP_RECORD_ITEM_IDS = new Set(['2001', '2002', '2003', '2004'])
const skillRelationCache = new Map()
let itemValueTable = new Map(item_info.map(item => [item.itemId, item.itemValueAp ?? item.itemValue ?? 0]))
const operatorMaxLevelTable = {
  6: {elite0MaxLevel: 50, elite1MaxLevel: 80, elite2MaxLevel: 90},
  5: {elite0MaxLevel: 50, elite1MaxLevel: 70, elite2MaxLevel: 80},
  4: {elite0MaxLevel: 45, elite1MaxLevel: 60, elite2MaxLevel: 70},
  3: {elite0MaxLevel: 40, elite1MaxLevel: 55, elite2MaxLevel: 0},
  2: {elite0MaxLevel: 30, elite1MaxLevel: 0, elite2MaxLevel: 0},
  1: {elite0MaxLevel: 30, elite1MaxLevel: 0, elite2MaxLevel: 0}
}
const operatorEliteCostTable = {
  6: {elite1Cost: 30000, elite2Cost: 180000},
  5: {elite1Cost: 20000, elite2Cost: 120000},
  4: {elite1Cost: 15000, elite2Cost: 60000},
  3: {elite1Cost: 10000, elite2Cost: 0},
  2: {elite1Cost: 0, elite2Cost: 0},
  1: {elite1Cost: 0, elite2Cost: 0},
}
const unlockCostCache = new Map()

let selectBtnKey = ref('')
let filterOperatorList = ref([])
let sortMode = ref('implementation')
let detailMode = ref(false)

const sortModeOptions = [
  {label: '实装时间顺序', value: 'implementation'},
  {label: '名称排序', value: 'name'},
  {label: '效率排序（未必准确）', value: 'efficiency-desc'},
]


function filterBtnStatus(key, label) {
  return selectBtnKey.value === `${key}+${label}`
}

let filterCondition = ref({
  func: () => {
  }
})

function btnAction(key, label) {
  if (selectBtnKey.value !== `${key}+${label}`) {
    return "tonal"
  }
}


/**
 * 筛选干员
 * @param condition 筛选条件
 * @param key 筛选条件的按钮文本
 */
function filterOperatorByTag(condition, key) {
  //清空干员列表
  filterOperatorList.value = []
  const btnKey = `${key}+${condition.label}`
  //判断按钮是否已经选中，已经选中则清空暂存的筛选函数和按钮key，撤销选中状态
  if (selectBtnKey.value === btnKey) {
    selectBtnKey.value = ''
    filterCondition.value = ''
  } else {
    //暂存筛选函数和按钮key
    selectBtnKey.value = btnKey
    filterCondition.value = condition;
  }

  //筛选干员
  commonFilterOperator()
}


//干员搜索输入框
let searchInputText = ref('')
/**
 * 根据输入的名称和技能描述搜索干员
 */
const searchOperatorDebounce = debounce(() => {
  //清空干员列表
  filterOperatorList.value = []
  //筛选干员
  commonFilterOperator()
}, 500)


let hideIrrelevantSkillsFlag = ref(true)

let skillRowCount = ref({})

function hideIrrelevantSkills() {
  hideIrrelevantSkillsFlag.value = !hideIrrelevantSkillsFlag.value
  searchOperatorDebounce()
}

function changeSortMode(value) {
  sortMode.value = value
  commonFilterOperator()
}

/**
 * 通用的筛选干员逻辑
 */
function commonFilterOperator() {

  const operatorGroups = []

  for (const charId in buildingTable) {
    const skills = buildingTable[charId]
    const matchedSkills = []

    for (const skill of skills) {


      // 当按钮key有值时通过暂存的筛选函数进行筛选
      if (selectBtnKey.value && !filterCondition.value.func(skill)) {

        continue;
      }
      //通过输入关键词筛选
      if (searchInputText.value && !operatorHasKeyword(skill)) {

        continue;
      }

      matchedSkills.push(skill)
    }

    if (matchedSkills.length === 0) {
      continue
    }

    const displaySkills = hideIrrelevantSkillsFlag.value ? matchedSkills : skills
    operatorGroups.push({
      charId,
      name: skills[0].name,
      displaySkills: sortSkillsByEfficiency(displaySkills),
      score: getGroupEfficiencyScore(matchedSkills),
      index: operatorGroups.length,
    })
  }

  sortOperatorGroups(operatorGroups)

  let list = []
  const rowCountMap = {}
  for (const group of operatorGroups) {
    const rowIndex = list.length
    for (const skill of group.displaySkills) {
      list.push(skill)
    }
    rowCountMap[group.charId] = {index: rowIndex, rowCount: group.displaySkills.length}
  }

  skillRowCount.value = rowCountMap
  filterOperatorList.value = list
}

function sortOperatorGroups(groups) {
  if (sortMode.value === 'name') {
    groups.sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN') || a.index - b.index)
    return
  }

  if (sortMode.value !== 'efficiency-desc') {
    return
  }

  groups.sort((a, b) => b.score - a.score || a.index - b.index)
}

function sortSkillsByEfficiency(skills) {
  if (sortMode.value !== 'efficiency-desc') {
    return skills
  }

  return [...skills].sort((a, b) => getSkillEfficiencyScore(b) - getSkillEfficiencyScore(a))
}

function getGroupEfficiencyScore(skills) {
  return Math.max(...skills.map(skill => getSkillEfficiencyScore(skill)))
}

function getSkillEfficiencyScore(skill) {
  return efficiencyScoreTable[getSkillEfficiencyKey(skill)] ?? DEFAULT_UNMATCHED_EFFICIENCY_SCORE
}

function getSkillEfficiencyKey(skill) {
  return [skill.name, skill.roomType, skill.buffName, skill.phase, skill.level].join('|')
}

function mergeEfficiencyScoreFiles(scoreFiles) {
  const scoreMap = {}

  for (const file of scoreFiles) {
    for (const key in file) {
      const score = Number(file[key])
      if (!Number.isFinite(score)) {
        continue
      }

      if (!scoreMap[key]) {
        scoreMap[key] = {sum: 0, count: 0}
      }
      scoreMap[key].sum += score
      scoreMap[key].count++
    }
  }

  const mergedScores = {}
  for (const key in scoreMap) {
    mergedScores[key] = scoreMap[key].sum / scoreMap[key].count
  }

  return mergedScores
}

function mergeRow(id, index) {

  return skillRowCount.value[id] ? skillRowCount.value[id] : {index: index, rowCount: 1}
}


/**
 * 判断干员的干员名称、技能名称、技能描述是否包含输入的搜索关键词
 * @param operator 干员信息
 * @return {boolean} 是否包含关键词
 */
function operatorHasKeyword(operator) {
  return operator.name.indexOf(searchInputText.value) > -1 ||
      operator.description.indexOf(searchInputText.value) > -1 ||
      operator.buffName.indexOf(searchInputText.value) > -1
}

function getUnlock(phase, level) {
  if (phase > 0) {
    return `精${phase}`
  }

  if (level > 1) {
    return `30级`
  }

  return '无'
}

function getSkillRelation(skill) {
  const cacheKey = getSkillRelationCacheKey(skill)
  if (!skillRelationCache.has(cacheKey)) {
    skillRelationCache.set(cacheKey, calculateSkillRelation(skill))
  }

  return skillRelationCache.get(cacheKey)
}

function calculateSkillRelation(skill) {
  const operatorSkills = buildingTable[skill.charId] || []
  const lowerSkills = operatorSkills.filter(operatorSkill =>
      getSkillUnlockRank(operatorSkill) < getSkillUnlockRank(skill) &&
      isSameLogisticsSkillType(skill, operatorSkill)
  )
  return {lowerSkills}
}

function getStackedLowerSkills(skill) {
  const lowerSkills = getSkillRelation(skill).lowerSkills
  if (lowerSkills.length === 0) {
    return []
  }

  const replacedLowerSkills = lowerSkills
      .filter(lowerSkill => isReplacedSkillForHigherSkill(skill, lowerSkill))
      .sort((a, b) => getSkillUnlockRank(b) - getSkillUnlockRank(a))
  if (replacedLowerSkills.length > 0) {
    return [replacedLowerSkills[0]]
  }

  return [[...lowerSkills].sort((a, b) => getSkillUnlockRank(b) - getSkillUnlockRank(a))[0]]
}

function isReplacedSkillForHigherSkill(skill, lowerSkill) {
  const skillGroup = logistics_skill_replace_groups[getSkillRelationCacheKey(skill)]
  return Boolean(skillGroup && skillGroup === logistics_skill_replace_groups[getSkillRelationCacheKey(lowerSkill)])
}

function getSkillTagStyle(skill) {
  return `background:${skill.buffColor};color:${skill.textColor}`
}

function getStackedSkillTagStyle(skill, lowerSkill) {
  if (isReplacedSkillForHigherSkill(skill, lowerSkill)) {
    return 'background:var(--c-border-color);border-color:var(--c-border-color);color:var(--c-secondary-text-color)'
  }

  return `border-color:${lowerSkill.buffColor};color:${lowerSkill.buffColor}`
}

function getStackedSkillTagClass(skill, lowerSkill) {
  const isReplaced = isReplacedSkillForHigherSkill(skill, lowerSkill)

  return {
    'logistics-skill-name--outline': !isReplaced,
    'logistics-skill-name--muted': isReplaced,
  }
}

function getStackedSkillTagTitle(skill, lowerSkill) {
  return `${isReplacedSkillForHigherSkill(skill, lowerSkill) ? '替代' : '叠加'}：${lowerSkill.buffName}`
}

function getSkillRelationCacheKey(skill) {
  return [skill.charId, skill.roomType, skill.buffName, skill.phase, skill.level].join('|')
}

function getSkillUnlockRank(skill) {
  return Number(skill.phase || 0) * 1000 + Number(skill.level || 1)
}

function isSameLogisticsSkillType(skill, targetSkill) {
  return skill.charId === targetSkill.charId && skill.roomType === targetSkill.roomType
}

function getUnlockCost(skill) {
  const cacheKey = `${skill.charId}|${skill.phase}|${skill.level}`
  if (!unlockCostCache.has(cacheKey)) {
    unlockCostCache.set(cacheKey, calculateUnlockCost(skill))
  }

  return unlockCostCache.get(cacheKey)
}

function calculateUnlockCost(skill) {
  const operatorInfo = operatorTableV2[skill.charId]
  const rarity = operatorInfo?.rarity == null ? undefined : operatorInfo.rarity + 1 // v2的rarity为0-5, 转成1-6
  const targetPhase = Number(skill.phase) || 0
  const targetLevel = Number(skill.level) || 1

  if (!rarity) {
    return createEmptyCost()
  }

  if (!hasEliteMaterialData(skill.charId, targetPhase, rarity)) {
    return createEmptyCost()
  }

  const levelCost = getLevelCostByRarity({
    rarity,
    currentElite: 0,
    currentLevel: 1,
    targetElite: targetPhase,
    targetLevel,
  })
  const eliteCost = getEliteCost(skill.charId, targetPhase)
  const lmdQuantity = levelCost.lmdQuantity + eliteCost.lmdQuantity
  const expRecordQuantity = levelCost.expRecordQuantity

  return {
    levelAndLmd: lmdQuantity * getItemValue(LMD_ID) + expRecordQuantity * getItemValue(EXP_RECORD_ID),
    materials: eliteCost.materials,
    lmdQuantity,
    expRecordQuantity,
  }
}

function createEmptyCost() {
  return {
    levelAndLmd: 0,
    materials: 0,
    lmdQuantity: 0,
    expRecordQuantity: 0,
  }
}

function getEliteCost(charId, targetPhase) {
  const elite = getOperatorEliteCostList(charId)
  const operatorInfo = operatorTableV2[charId]
  const rarity = operatorInfo?.rarity == null ? undefined : operatorInfo.rarity + 1 // v2的rarity为0-5, 转成1-6
  let lmdQuantity = 0
  let materials = 0

  if (!elite || !rarity || targetPhase <= 0) {
    return {lmdQuantity, materials}
  }

  for (let phase = 1; phase <= targetPhase; phase++) {
    const phaseCost = elite[phase] || {}
    lmdQuantity += operatorEliteCostTable[rarity]?.[`elite${phase}Cost`] || 0

    for (const itemId in phaseCost) {
      if (itemId === LMD_ID || EXP_RECORD_ITEM_IDS.has(itemId)) {
        continue
      }
      materials += getItemValue(itemId) * Number(phaseCost[itemId])
    }
  }

  return {lmdQuantity, materials}
}

function hasEliteMaterialData(charId, targetPhase, rarity) {
  if (targetPhase <= 0 || rarity <= 3) {
    return true
  }

  const elite = getOperatorEliteCostList(charId)
  return Boolean(elite?.slice(1, targetPhase + 1).some(phaseCost => Object.keys(phaseCost || {}).length > 0))
}

function getOperatorEliteCostList(charId) {
  if (charId.includes('amiya')) {
    return operatorTableV2.char_002_amiya?.elite
  }

  return operatorTableV2[charId]?.elite
}

function getLevelCostByRarity({rarity, currentElite, currentLevel, targetElite, targetLevel}) {
  const maxLevelTable = operatorMaxLevelTable[rarity]
  if (!maxLevelTable) {
    return {lmdQuantity: 0, expRecordQuantity: 0}
  }

  let lmdQuantity = 0
  let expQuantity = 0

  function getMaxLevel(eliteLevel) {
    if (eliteLevel === 0) {
      return maxLevelTable.elite0MaxLevel
    }
    if (eliteLevel === 1) {
      return maxLevelTable.elite1MaxLevel
    }
    return maxLevelTable.elite2MaxLevel
  }

  function addCostBetween(eliteLevel, fromLevel, toLevel) {
    const levelCostTable = level_cost_table[`elite${eliteLevel}`]
    const startLevel = Math.max(fromLevel, 1)
    for (let level = startLevel; level < toLevel; level++) {
      const levelCost = levelCostTable?.[level]
      if (!levelCost) {
        continue
      }
      lmdQuantity += levelCost.gold
      expQuantity += levelCost.exp
    }
  }

  for (let elite = currentElite; elite <= targetElite; elite++) {
    const maxLevel = getMaxLevel(elite)
    if (!maxLevel) {
      continue
    }

    const startLevel = elite === currentElite ? currentLevel : 1
    const endLevel = elite === targetElite ? Math.min(targetLevel, maxLevel) : maxLevel
    if (endLevel > startLevel) {
      addCostBetween(elite, startLevel, endLevel)
    }
  }

  return {
    lmdQuantity,
    expRecordQuantity: expQuantity / 1000,
  }
}

function getItemValue(itemId) {
  return itemValueTable.get(itemId) || 0
}

async function refreshItemValueTable() {
  try {
    itemValueTable = await itemCache.getItemValueMapCacheByConfig(getStageConfig())
    unlockCostCache.clear()
    commonFilterOperator()
  } catch (error) {
    console.error('加载基建技能成本材料价值失败:', error)
  }
}

function formatCost(value) {
  if (!value) {
    return '-'
  }

  return value.toFixed(1)
}

function getLevelCostTitle(skill) {
  const cost = getUnlockCost(skill)
  if (!cost.levelAndLmd) {
    return '无需作战记录或龙门币'
  }

  return `折合 ${formatCost(cost.levelAndLmd)} 理智；龙门币 ${formatInteger(cost.lmdQuantity)}，中级作战记录 ${formatCost(cost.expRecordQuantity)}`
}

function getMaterialCostTitle(skill) {
  const cost = getUnlockCost(skill)
  if (!cost.materials) {
    return '无需额外养成材料'
  }

  return `折合 ${formatCost(cost.materials)} 理智，不含作战记录与龙门币`
}

function formatInteger(value) {
  return Math.round(value).toLocaleString('zh-Hans-CN')
}

const roomTypeMenu = [
  {label: "贸易站", value: "trading"},
  {label: "制造站", value: "manufacture"},
  {label: "办公室", value: "hire"},
  {label: "加工站", value: "workshop"},
  {label: "宿舍", value: "dormitory"},
  {label: "控制中枢", value: "control"},
  {label: "发电站", value: "power"},
  {label: "会客室", value: "meeting"},
  {label: "训练室", value: "training"}
]

let roomTypeDict = {}
for (const roomType of roomTypeMenu) {
  roomTypeDict[roomType.value] = roomType.label
}

/**
 * 获得房间名称
 * @param type 设施类型
 * @return {string} 房间名称
 */
function getRoomLabel(type) {
  return roomTypeDict[type]
}

function getAvatar(id) {
  return `bg-${id}`
}


onMounted(() => {
  searchOperatorDebounce()
  refreshItemValueTable()
})

</script>

<template>

  <div class="logistics-page">
    <div class="logistics-filter-checkbox">
      <div class="flex flex-wrap" v-for="(conditionType,key) in operatorFilterConditionTable"
           v-show="conditionType.display" :key="key">

        <v-btn :color="conditionType.color" variant="text" :text="translate('schedule',conditionType.name)"></v-btn>
        <v-btn v-for="(condition,index) in conditionType.conditions" :key="index"
               class="m-2" color="primary" :variant="btnAction(key,condition.label)"
               @click="filterOperatorByTag(condition,key)" :text="translate('schedule',condition.label)"></v-btn>

      </div>
    </div>

    <div class="m-0-8">
      <div class="logistics-search-toolbar">
        <v-text-field density="compact"
                      variant="outlined"
                      hide-details
                      class="logistics-search-input"
                      @input="searchOperatorDebounce()"
                      v-model="searchInputText">
          <template v-slot:append>
            <v-btn color="primary" :variant="hideIrrelevantSkillsFlag?void 0:'tonal'"
                   class="m-4" @click="hideIrrelevantSkills">隐藏无关技能
            </v-btn>
          </template>
        </v-text-field>
      </div>
      <div class="logistics-sort-row">
        <v-btn-toggle
            :model-value="sortMode"
            color="primary"
            density="compact"
            mandatory
            divided
            class="logistics-sort-toggle"
            @update:modelValue="changeSortMode"
        >
          <v-btn
              v-for="option in sortModeOptions"
              :key="option.value"
              :value="option.value"
          >
            {{ option.label }}
          </v-btn>
        </v-btn-toggle>
        <v-switch
            v-model="detailMode"
            color="primary"
            density="compact"
            hide-details
            inset
            label="详细模式"
            class="logistics-detail-switch"
        />
      </div>
      <span
          class="logistics-search-tip">输入干员名、技能名称、技能描述搜索&emsp;&emsp;*开发精力加水平有限，如有遗漏，请反馈或直接GitHub提交修改</span>
    </div>

    <div class="logistics-table-wrap">
      <table class="logistics-table" :class="{'logistics-table--detail': detailMode}">
        <tbody>
        <tr class="logistics-table-title">
          <td class="logistics-table-title-1">干员</td>
          <td class="logistics-table-title-2">解锁</td>
          <td class="logistics-table-title-3">设施</td>
          <td class="logistics-table-title-4">技能</td>
          <td v-if="detailMode" class="logistics-table-title-5">作战记录+龙门币</td>
          <td v-if="detailMode" class="logistics-table-title-6">其他养成材料</td>
          <td class="logistics-table-title-7">描述</td>
        </tr>

        <tr v-for="(operator,index) in filterOperatorList" :key="index">
          <td :rowspan="mergeRow(operator.charId,index).rowCount"
              v-if="mergeRow(operator.charId,index).index===index">
            <div class="flex flex-col align-center ">
              <OperatorAvatar :char-id="operator.charId" :size="50">
              </OperatorAvatar>
              <div>{{ operator.name }}</div>
            </div>
          </td>
          <td>{{ getUnlock(operator.phase, operator.level) }}</td>
          <td>{{ getRoomLabel(operator.roomType) }}</td>
          <td>
            <div class="logistics-skill-name-list">
              <span :style="getSkillTagStyle(operator)"
                    class="logistics-skill-name">
                {{ operator.buffName }}
              </span>
              <span v-for="lowerSkill in detailMode ? getStackedLowerSkills(operator) : []"
                    :key="getSkillRelationCacheKey(lowerSkill)"
                    :style="getStackedSkillTagStyle(operator, lowerSkill)"
                    class="logistics-skill-name"
                    :class="getStackedSkillTagClass(operator, lowerSkill)"
                    :title="getStackedSkillTagTitle(operator, lowerSkill)">
                {{ lowerSkill.buffName }}
              </span>
            </div>
          </td>
          <td v-if="detailMode" class="logistics-cost-cell" :title="getLevelCostTitle(operator)">
            {{ formatCost(getUnlockCost(operator).levelAndLmd) }}
          </td>
          <td v-if="detailMode" class="logistics-cost-cell" :title="getMaterialCostTitle(operator)">
            {{ formatCost(getUnlockCost(operator).materials) }}
          </td>
          <td>
            <span v-html="operator.description"></span>
          </td>
        </tr>
        </tbody>
      </table>
    </div>
  </div>
  <!--启用术语解释插件，绑定监听数组filterOperatorList-->
  <description-explain :operatorList="filterOperatorList"/>
</template>
