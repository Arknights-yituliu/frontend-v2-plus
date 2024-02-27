<script setup>
import '/src/assets/css/tool/building_skill.css'
import {operatorFilterConditionTable} from "/src/utils/buildingSkillFilter";
import building_table from '/src/static/json/build/building_table.json'
import {onMounted, ref} from "vue";
import {debounce} from "../../utils/debounce";
import {translate} from "/src/utils/i18n";

let buildingTable = {}
for (const operator of building_table) {
  if (!buildingTable[operator.charId]) {
    buildingTable[operator.charId] = []
  }
  buildingTable[operator.charId].push(operator)
}

const COLOR = {BLUE: 'blue', ORANGE: 'orange'}

let selectBtnKey = ref('')
let filterOperatorList = ref([])


function filterBtnStatus(key, label) {
  return selectBtnKey.value === `${key}+${label}`
}

let filterCondition = ref({
  func: () => {
  }
})

/**
 * 筛选干员
 * @param condition
 * @param key 选项的分类名
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

/**
 * 通用的筛选干员逻辑
 */
function commonFilterOperator() {

  let list = []

  for (const charId in buildingTable) {
    const skills = buildingTable[charId]
    let rowCount = 0;
    let rowIndex = list.length
    if (!skillRowCount.value[charId]) {
      skillRowCount.value[charId] = {}
    }
    for (const skill of skills) {

      // 当按钮key有值时通过暂存的筛选函数进行筛选
      if (selectBtnKey.value && !filterCondition.value.func(skill)) {
        continue;
      }
      //通过输入关键词筛选
      if (searchInputText.value && !operatorHasKeyword(skill)) {
        continue;
      }

      if (!hideIrrelevantSkillsFlag.value) {
        for (const operator1 of skills) {
          list.push(operator1)
          rowCount++
        }
        break
      }

      list.push(skill)
      rowCount++
    }

    skillRowCount.value[charId] = {index: rowIndex, rowCount: rowCount}
  }

  filterOperatorList.value = list
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
  return `bg-${id} building-operator-avatar`
}

onMounted(() => {
  searchOperatorDebounce()
})

</script>

<template>
  <div class="building-skill-page">
    <div class="b-filter-condition-box">
      <div class="b-condition-bar" v-for="(conditionType,key) in operatorFilterConditionTable" v-show="conditionType.display" :key="key">
        <span class="b-room-type-text" :style="`color:${conditionType.color}`">{{ translate('schedule', conditionType.name) }}</span>
        <c-button v-for="(condition,index) in conditionType.conditions" :key="index" style="margin: 2px"
                  :color="COLOR.BLUE" :status="filterBtnStatus(key,condition.label)"
                  @click="filterOperatorByTag(condition,key)">
          {{ translate('schedule', condition.label) }}
        </c-button>
      </div>
    </div>

    <div class="b-building-search-wrap">

      <input class="input-base" @input="searchOperatorDebounce()" v-model="searchInputText">
      <c-button :status="hideIrrelevantSkillsFlag" :color="COLOR.ORANGE"
                style="margin-left: 12px" @click="hideIrrelevantSkills">隐藏无关技能
      </c-button>
      <span class="b-building-search-tip">输入干员名、技能名称、技能描述搜索&emsp;&emsp;*开发精力加水平有限，如有遗漏，请反馈或直接GitHub提交修改</span>
      <!--  <span-->
      <!--      style="font-style: italic;font-size: 14px">（搜索栏可，可与上面的预设TAG按钮共同生效筛选,再次点击按钮可取消按钮)</span>-->

    </div>

    <table class="building-skill-table">
      <tbody>
      <tr style="line-height: 42px;">
        <td>干员</td>
        <td style="width:50px">解锁</td>
        <td style="width:70px">设施</td>
        <td style="width:100px">技能</td>
        <td>描述</td>
      </tr>

      <tr v-for="(operator,index) in filterOperatorList" :key="index">
        <td :rowspan="mergeRow(operator.charId,index).rowCount"
            v-if="mergeRow(operator.charId,index).index===index">
          <div class="building-operator-avatar-wrap">
            <div class="building-operator-avatar-">
              <div :class="getAvatar(operator.charId)"></div>
              <span>{{ operator.name }}</span>
            </div>
          </div>
        </td>
        <td>{{ getUnlock(operator.phase, operator.level) }}</td>
        <td>{{ getRoomLabel(operator.roomType) }}</td>
        <td style="width: 140px">
        <span :style="`background:${operator.buffColor};color:${operator.textColor}`"
              class="b-building-skill-name">
          {{ operator.buffName }}
        </span>
        </td>
        <td style="height: 36px;padding-inline: 20px">
          <span style="line-height: 24px;" v-html="operator.description"></span>
        </td>
      </tr>

      </tbody>
    </table>
  </div>
</template>