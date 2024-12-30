<script setup>
import '/src/assets/css/information/logistics.scss'
import '/src/assets/css/information/logistics.phone.scss'

import {operatorFilterConditionTable} from "/src/utils/buildingSkillFilter";
import building_table from '/src/static/json/build/building_table.json'
import {onMounted, ref} from "vue";
import {debounce} from "/src/utils/debounce";
import {translate} from "/src/utils/i18n";
import DescriptionExplain from "/src/components/DescriptionExplain.vue";

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
function filterOperatorByTag(condition, key){
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
        break;
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
  return `bg-${id}`
}


onMounted(() => {
  searchOperatorDebounce()
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
               @click="filterOperatorByTag(condition,key)" :text="translate('schedule',condition.label)"> </v-btn>

      </div>
    </div>

    <div class="m-0-8">
      <v-text-field density="compact"
                    variant="outlined"
                    @input="searchOperatorDebounce()"
                    v-model="searchInputText" >
        <template v-slot:append>
          <v-btn color="primary" :variant="hideIrrelevantSkillsFlag?void 0:'tonal'"
                 class="m-4" @click="hideIrrelevantSkills">隐藏无关技能
          </v-btn>
        </template>
      </v-text-field>
      <span class="logistics-search-tip">输入干员名、技能名称、技能描述搜索&emsp;&emsp;*开发精力加水平有限，如有遗漏，请反馈或直接GitHub提交修改</span>
    </div>

    <table class="logistics-table">
      <tbody>
      <tr class="logistics-table-title">
        <td class="logistics-table-title-1">干员</td>
        <td class="logistics-table-title-2">解锁</td>
        <td class="logistics-table-title-3">设施</td>
        <td class="logistics-table-title-4">技能</td>
        <td class="logistics-table-title-5">描述</td>
      </tr>

      <tr v-for="(operator,index) in filterOperatorList" :key="index">
        <td :rowspan="mergeRow(operator.charId,index).rowCount"
            v-if="mergeRow(operator.charId,index).index===index">
          <div class="operator-avatar-wrap">
            <div class="operator-avatar-sprite">
              <div :class="getAvatar(operator.charId)"></div>
              <span>{{ operator.name }}</span>
            </div>
          </div>
        </td>
        <td>{{ getUnlock(operator.phase, operator.level) }}</td>
        <td>{{ getRoomLabel(operator.roomType) }}</td>
        <td>
        <span :style="`background:${operator.buffColor};color:${operator.textColor}`"
              class="logistics-skill-name">
          {{ operator.buffName }}
        </span>
        </td>
        <td>
          <span v-html="operator.description"></span>
        </td>
      </tr>
      </tbody>
    </table>
  </div>
  <!--启用术语解释插件，绑定监听数组filterOperatorList-->
  <description-explain :operatorList="filterOperatorList"/>
</template>