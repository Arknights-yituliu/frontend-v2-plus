<script setup>
import {onMounted, ref, watch} from "vue"

import '/src/assets/css/tool/schedule.css'
import '/src/assets/css/tool/building_skill_font_color.css'

import schedule_template_json from '/src/static/json/build/plans_template.json'
import character_table from '/src/static/json/survey/character_table_simple.json'
import schedule_menu from '/src/static/json/build/schedule_menu.json'
import building_table from '/src/static/json/build/building_table.json'

import buildingApi from '/src/api/building.js'
import operatorDataAPI from '/src/api/operator-data.js'
import {operatorFilterConditionTable} from '/src/utils/BuildingSkillFilter.js'
import {translate} from '/src/utils/I18n.js'
import {getText} from '/src/utils/FileRead.js'
import {debounce} from "/src/utils/Debounce.js";
import {cMessage} from '/src/utils/Message.js'
import {popoverOnOpen, createPopover} from "/src/utils/Popover.js";
import userAPI from "/src/api/user.js";

import MyButton from '/src/components/Button.vue'

let operatorOwnMap = new Map()



async function getOperatorDataByAccount() {

  const userInfo = await userAPI.getUserInfo()
   const data = {
    token:userInfo.token
   }
  operatorDataAPI.getOperatorData(data).then(response=>{
    for(const operator of response.data){
      operatorOwnMap.set(operator.charId,operator.own)
    }
  })
}

let plansTemplate = ref('')
plansTemplate.value = schedule_template_json

let executionTimeList = ref([])
for (let i = 0; i < 7; i++) {
  // executionTimeList.value.push({start: new Date(), end: new Date()})
  executionTimeList.value.push([new Date(), new Date()])
}

let isPeriod = ref(false)


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

/**
 * 获得房间名称
 * @param type 设施类型
 * @return {string} 房间名称
 */
function getRoomLabel(type) {
  for (const room of roomTypeMenu) {
    if (room.value === type) {
      return room.label
    }
  }
}

//maa的产物id和游戏内物品id的对照表
const productTable = {
  manufacture: [
    {id: '2003', value: 'Battle Record'},
    {id: '3003', value: 'Pure Gold'},
    {id: '3141', value: 'Originium Shard'}
  ],
  trading: [
    {id: '4001', value: 'LMD'},
    {id: '4003', value: 'Orundum'}
  ]
}

let characterIdAndName = {}

for (const key in character_table) {
  characterIdAndName[character_table[key].name] = replaceCharId(key)
}

function replaceCharId(string) {
  if (string === 'char_1001_amiya2') {
    return 'char_002_amiya'
  }
  return string
}

let selectedScheduleType = ref(schedule_menu[0])


let scheduleTypeV2 = ref({
  planTimes: 3,
  trading: 2,
  manufacture: 4,
  power: 3,
  dormitory: 4,
})

/**
 * 获得获得房间内的干员
 * @param {string} room 设施类型
 * @param {number} index 房间编号
 * @return {*[string]} 干员组
 */
function getRoomOperators(room, index) {
  if (!plansTemplate.value[selectedPlanIndex.value]) {
    // cMessage(index + '-班次索引越界', 'error')
    return []
  }
  if (!plansTemplate.value[selectedPlanIndex.value].rooms[room]) {
    cMessage(room + '-' + translate('schedule', 'FacilityNotExist'), 'error')
    return []
  }
  if (!plansTemplate.value[selectedPlanIndex.value].rooms[room][index]) {
    cMessage(index + '-' + translate('schedule', 'OperatorIndexOutOfBounds'), 'error')
    return []
  }

  return plansTemplate.value[selectedPlanIndex.value].rooms[room][index].operators
}


let scheduleTypePopupVisible = ref(false)
let scheduleTypePopupStyle = 'width:600px;padding:12px'

/**
 * 选择基建类型
 * @param {{}} type
 */
function chooseScheduleType(type) {
  const {
    room: {
      trading, manufacture, power
    }
  } = type
  selectedScheduleType.value = type
  scheduleTypeV2.value.trading = trading
  scheduleTypeV2.value.manufacture = manufacture
  scheduleTypeV2.value.power = power
}

/**
 * 选择换班次数
 * @param {number} num
 */
function choosePlanTimes(num) {
  scheduleTypeV2.value.planTimes = num
}

/**
 * 点击切换上一班或者下一班
 * @param index 班次的索引
 */
function toNextPlan(index) {
  if (index < 0)
    selectedPlanIndex.value = scheduleTypeV2.value.planTimes - 1
  else if (index >= scheduleTypeV2.value.planTimes)
    selectedPlanIndex.value = 0
  else
    selectedPlanIndex.value = index

  /**
   * ! not used anymore as there is no way this will ever be triggered
   * cMessage(translate('schedule', 'schedule.IncorrectShiftIndex') + (index + 1), 'error')
   */
}

let roomSettlementOperatorMaxQuantity = {
  control: 5,
  dormitory: 5,
  trading: 3,
  manufacture: 3,
  power: 1,
  meeting: 2,
  hire: 1,
  processing: 1
}

/**
 * 获得干员头像雪碧图样式
 * @param name 干员名称
 * @return {string} 雪碧图样式
 */
function getAvatar(name) {
  name = characterIdAndName[name]
  return `bg-${name} room-avatar-sprite`
}

/**
 * 获得干员头像雪碧图样式
 * @param name 干员名称
 * @return {string} 雪碧图样式
 */
function getOptionAvatar(name) {
  if (characterIdAndName[name]) {
    name = characterIdAndName[name]
  }
  return `bg-${name} option-avatar-sprite`
}


/**
 * 获得材料雪碧图样式
 * @param name 材料名称
 * @return {string} 雪碧图样式
 */
function getItemSprite(name) {
  return `bg-${name} product-image`
}

//控制选择房间内干员的弹窗展开的属性

//第几次换班
let selectedPlanIndex = ref(0)
//房间类型
let selectedRoomType = ref('trading')
//房间序号
let selectedRoomIndex = ref(0)

/**
 * 选择当前班次
 * @param {number} index 班次（班次1为0,以此类推)
 */
function currentPlan(index) {
  selectedPlanIndex.value = index
}

/**
 *
 * @param roomType
 * @param roomIndex
 * @returns {string}
 */
function roomSelectedClass(roomType, roomIndex) {
  if (selectedRoomType.value === roomType && selectedRoomIndex.value === roomIndex) {
    return `${roomType}-selected`
  }

  return 'roomType'
}

/**
 * 打开入驻干员的弹窗
 * @param {string} roomType 房间类型
 * @param {number} index 房间编号
 */
function chooseRoom(roomType, index) {
  selectedRoomType.value = roomType
  selectedRoomIndex.value = index

  if ('trading' === roomType || 'manufacture' === roomType) {
    selectedProduct.value = getItemIdByProductName(plansTemplate.value[selectedPlanIndex.value]
        .rooms[selectedRoomType.value][selectedRoomIndex.value].product)
  }

  popoverOnOpen(`${roomType}#${index}`, 'room-set')
}

let selectBtnKey = ref({})
let filterOperatorList = ref({})
let filterNotOwnOperator = ref(false)

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
const filterOperatorByTag = debounce((condition, key) => {
  //清空干员列表

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
}, 500)


//干员搜索输入框输入内容
let searchInputText = ref('')

/**
 * 根据输入的名称和技能描述搜索干员
 */
const searchOperatorDebounce = debounce(() => {

  //筛选干员
  commonFilterOperator()
}, 500)

/**
 * 通用的筛选干员逻辑
 */
function commonFilterOperator() {
  //清空干员列表
  filterOperatorList.value = {}
  for (const operator of building_table) {
    // 当按钮key有值时通过暂存的筛选函数进行筛选
    if (selectBtnKey.value && !filterCondition.value.func(operator)) {

      continue;
    }

    //通过输入关键词筛选
    if (searchInputText.value && !operatorHasKeyword(operator)) {

      continue;
    }

    if (!selectBtnKey.value && !searchInputText.value) {

      continue
    }

    if(filterNotOwnOperator.value){
      if(!operatorOwnMap.get(operator.charId)){
        continue
      }
    }



    if (filterOperatorList.value[operator.charId]) {
      operator.description = filterOperatorList.value[operator.charId].description + '<br><br>' + operator.description
      filterOperatorList.value[operator.charId] = operator
    } else {
      filterOperatorList.value[operator.charId] = operator
    }
  }
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

const roomPopupStyle = "width:550px;"


const filterOperatorByOwn = debounce( ()=>{
  filterNotOwnOperator.value = !filterNotOwnOperator.value
  if(operatorOwnMap.size<10){
    cMessage('未登录或未导入','error')
    return
  }

  commonFilterOperator()
},200)

/**
 * 选择该房间入驻干员
 * @param {string} charName 干员id
 */
function chooseOperator(charName) {


  if (!checkRoomDuplicateOperator(charName)) {
    return;
  }

  if (!checkRoomMaximum()) {
    return;
  }

  checkPlanDuplicateOperator(selectedPlanIndex.value, charName, true)


  plansTemplate.value[selectedPlanIndex.value].rooms[selectedRoomType.value][selectedRoomIndex.value].operators.push(charName)

  if (selectedRoomType.value === 'dormitory') {
    fillOperatorConflict(selectedRoomIndex.value)
  }
}

let selectedOperator = ref({})


function displayOperatorDescription(id) {
  const element = document.getElementById('')

}

/**
 * 检查房间内是否有同一干员
 * @param charName 干员名称
 * @returns {boolean}
 */
function checkRoomDuplicateOperator(charName) {
  if (plansTemplate.value[selectedPlanIndex.value]
      .rooms[selectedRoomType.value][selectedRoomIndex.value]
      .operators.includes(charName)) {
    cMessage(translate('schedule', 'schedule.OperatorAlreadyStationed'), 'error')
    return false;
  }

  return true;

}

/**
 * 检查房间入驻人数是否达到上限
 * @returns {boolean}
 */
function checkRoomMaximum() {
  if (plansTemplate.value[selectedPlanIndex.value]
      .rooms[selectedRoomType.value][selectedRoomIndex.value]
      .operators.length >= roomSettlementOperatorMaxQuantity[selectedRoomType.value]) {
    cMessage(translate('schedule', 'schedule.FacilityFull'), 'error')
    return false;
  }

  return true;
}

/**
 * 删除该房间中选中的干员
 * @param {string} charName 干员id
 */
function deleteOperator(charName) {

  plansTemplate.value[selectedPlanIndex.value].rooms[selectedRoomType.value][selectedRoomIndex.value].operators =
      plansTemplate.value[selectedPlanIndex.value].rooms[selectedRoomType.value][selectedRoomIndex.value].operators.filter(e => {
        return e !== charName
      })

  checkPlanDuplicateOperator(selectedPlanIndex.value, charName, false)

}

let duplicateOperatorTable = ref([])

/**
 * 检查当前班次是否有同名干员
 * @param index 班次
 * @param charName 干员id
 * @param status 干员入驻true或删除false
 */
function checkPlanDuplicateOperator(index, charName, status) {

  //当前班次非空判断
  if (!duplicateOperatorTable.value[index]) {
    duplicateOperatorTable.value[index] = {}
  }
  //如果是入驻干员并且检查表里干员状态是已经入驻，弹出警告
  if (duplicateOperatorTable.value[index][charName] && status) {

    cMessage(translate('schedule', 'schedule.OperatorStationedDifferent'), 'error')
    return false;
  }
  // 更新检查表里干员状态
  duplicateOperatorTable.value[index][charName] = status
  return true;
}

let tmpOperatorList = ref([])

/**
 * 复制干员组
 */
function copyOperatorList() {
  tmpOperatorList.value =
      plansTemplate.value[selectedPlanIndex.value].rooms[selectedRoomType.value][selectedRoomIndex.value].operators
}

/**
 * 粘贴干员组
 */
function pasteOperatorList() {
  for (const charName of plansTemplate.value[selectedPlanIndex.value].rooms[selectedRoomType.value][selectedRoomIndex.value].operators) {
    deleteOperator(charName)
  }

  for (const charId of tmpOperatorList.value) {


    if (!checkRoomMaximum()) {
      return;
    }
    plansTemplate.value[selectedPlanIndex.value].rooms[selectedRoomType.value][selectedRoomIndex.value].operators.push(charId)

    checkPlanDuplicateOperator(selectedPlanIndex.value, charId, true)
  }
}

let tmpPlanData = ref({index: 0, plan: ''})

function copyPlan() {
  tmpPlanData.value.plan = JSON.stringify(plansTemplate.value[selectedPlanIndex.value])
  tmpPlanData.value.index = selectedPlanIndex.value + 1
}

function pastePlan() {
  plansTemplate.value[selectedPlanIndex.value] = JSON.parse(tmpPlanData.value.plan)
  duplicateOperatorTable.value[selectedPlanIndex.value] = {}
}

let selectedProduct = ref("")

/**
 * 设置房间产物
 * @param {string} product 产物类型
 */
function setProduct(product) {
  plansTemplate.value[selectedPlanIndex.value].rooms[selectedRoomType.value][selectedRoomIndex.value].product = product
  selectedProduct.value = getItemIdByProductName(plansTemplate.value[selectedPlanIndex.value]
      .rooms[selectedRoomType.value][selectedRoomIndex.value].product)
}

/**
 * 获得产物的物品id
 * @param {string} product 产物
 * @return {string} 物品id
 */
function getItemIdByProductName(product) {
  if (product === "LMD") return "4001";
  if (product === "Orundum") return "4003";
  if (product === "Battle Record") return "2003";
  if (product === "Pure Gold") return "3003";
  if (product === "Originium Shard") return "3141";
}

function getRoomProduct(roomType, index) {
  const product = plansTemplate.value[selectedPlanIndex.value].rooms[roomType][index].product

  const itemId = getItemIdByProductName(product)
  return `bg-${itemId} room-product`
}

function fillOperatorConflict(index) {
  if (plansTemplate.value[selectedPlanIndex.value].rooms['dormitory'][index].autofill) {
    if (plansTemplate.value[selectedPlanIndex.value].rooms['dormitory'][index].operators) {
      cMessage(translate('schedule', 'schedule.AutofillDormTip'), 'warn')
    }
  }
}

/**
 * 写入无人机使用设置
 * @param {string} property 无人机设置参数 如enable等
 * @param {*} value 参数值
 */
function setDrones(property, value) {
  plansTemplate.value[selectedPlanIndex.value].drones[property] = value

}


let FiammettaTargetVisible = ref(false)

/**
 * 写入菲亚梅塔使用设置
 * @param {string} property 无人机设置参数 如enable等
 * @param {*} value 参数值
 */
function setFiammetta(property, value) {
  plansTemplate.value[selectedPlanIndex.value].Fiammetta[property] = value
}

watch(() => plansTemplate.value[selectedPlanIndex.value].rooms[selectedRoomType.value][selectedRoomIndex.value].autofill,
    (newVal) => {

      if (newVal && selectedRoomType.value === 'dormitory') {
        if (plansTemplate.value[selectedPlanIndex.value].rooms
            [selectedRoomType.value][selectedRoomIndex.value].operators.length > 0) {
          cMessage(translate('schedule', 'schedule.AutofillDormTip'), 'warn')
        }
      }
    })


/**
 * 获得排班执行时间间隔
 * @param {number} index 班次
 * @return {string[][]} 返回一个时间格式为hh:mm的二维数组
 */
function getPeriod(index) {
  const executionTime = executionTimeList.value[index]
  // const start = executionTime.start.getHours().toString().padStart(2, '0') + ':' + executionTime.start.getMinutes().toString().padStart(2, '0')
  // const end = executionTime.end.getHours().toString().padStart(2, '0') + ':' + executionTime.end.getMinutes().toString().padStart(2, '0')
  const start = executionTime[0].getHours().toString().padStart(2, '0') + ':' + executionTime[0].getMinutes().toString().padStart(2, '0')
  const end = executionTime[1].getHours().toString().padStart(2, '0') + ':' + executionTime[1].getMinutes().toString().padStart(2, '0')

  if (executionTime[0].getHours() > executionTime[1].getHours()) {
    return [[start, '23:59'], ['00:00', end]]
  }

  return [[start, end]]
}

let scheduleInfo = ref({
  "author": "文字作者",
  "description": "文件描述",
  "id": 1702203342688921,
  "title": "文件标题",
  "buildingType": selectedScheduleType.value.label,
  "planTimes": `${scheduleTypeV2.value.planTimes}班`,
  "plans": [],
  "scheduleType": {},
})

/**
 * 创建排班文件
 */
function createSchedule() {

  console.log('开始创建')
  let plans = []
  for (let i = 0; i < scheduleTypeV2.value.planTimes; i++) {
    let plan = {
      name: plansTemplate.value[i].name,
      description: plansTemplate.value[i].description,
      description_post: plansTemplate.value[i].description_post,
      Fiammetta: plansTemplate.value[i].Fiammetta,
      drones: plansTemplate.value[i].drones,
      rooms: {
        trading: plansTemplate.value[i].rooms.trading.slice(0, scheduleTypeV2.value.trading),
        manufacture: plansTemplate.value[i].rooms.manufacture.slice(0, scheduleTypeV2.value.manufacture),
        power: plansTemplate.value[i].rooms.power.slice(0, scheduleTypeV2.value.power),
        dormitory: plansTemplate.value[i].rooms.dormitory.slice(0, scheduleTypeV2.value.dormitory),
        control: plansTemplate.value[i].rooms.control,
        meeting: plansTemplate.value[i].rooms.meeting,
        hire: plansTemplate.value[i].rooms.hire,
        processing: plansTemplate.value[i].rooms.processing,
      }
    }
    if (isPeriod.value) {
      plan.period = getPeriod(i)
    }
    plans.push(plan)
  }

  scheduleInfo.value.plans = plans
  scheduleInfo.value.scheduleType = scheduleTypeV2.value


}

function saveAndDownloadScheduleFile() {
  createSchedule()
  buildingApi.saveSchedule(scheduleInfo.value, 1111).then(response => {
    scheduleId.value = response.data.scheduleId
    scheduleInfo.value.id = scheduleId.value
    const link = document.createElement('a')
    link.download = `${scheduleId.value}.json`
    link.href = 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(scheduleInfo.value, null, 2))
    link.click()
    link.remove()
    cMessage(translate('schedule', 'schedule.SavedScheduleIDMessage') + scheduleId.value)
  })
}

function downloadScheduleFile() {
  createSchedule()
  let link = document.createElement('a')
  link.download = `自定义排班.json`
  link.href = 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(scheduleInfo.value, null, 2))
  link.click()
  link.remove()
}

let scheduleId = ref('')


let scheduleImportId = ref('')

function importScheduleById() {
  buildingApi.retrieveSchedule(scheduleImportId.value).then(response => {

    importSchedule(response.data.schedule)
  })
}

function chooseFile() {
  document.getElementById('scheduleFile').click()
}

/**
 * 通过文件导入排班
 * @return {Promise<void>}
 */
async function importScheduleByFile() {

  const inputElement = document.getElementById('scheduleFile')
  let fileContent = ')'
  if (inputElement.files) {
    fileContent = await getText(inputElement.files[0])
  }

  let schedule = ''
  try {
    schedule = JSON.parse(fileContent)
  } catch (e) {
    return cMessage(e.toString(), 'error')
  }
  importSchedule(schedule)
}

/**
 * 导入排班内容
 * @param schedule 排班内容
 */
function importSchedule(schedule) {

  scheduleInfo.value.author = schedule.author
  scheduleInfo.value.description = schedule.description;
  scheduleInfo.value.title = schedule.title

  // 判断基建类型
  const buildingType = schedule.buildingType
  for (const menu of schedule_menu) {
    if (menu.label === buildingType) {
      chooseScheduleType(menu)
    }
  }

  //排班生成器V2的新字段，记录了基建的类型
  if (schedule.scheduleType) {
    const scheduleType = schedule.scheduleType
    for (const property in scheduleType) {
      scheduleTypeV2.value[property] = scheduleType[property]
    }
  } else {  //兼容旧版排班生成器的基建类型和排班次数
    const planTimes = schedule.planTimes
    if (planTimes) {
      scheduleTypeV2.value.planTimes = parseInt(planTimes.replace('班', ''))
    }
  }

  const plans = schedule.plans

  for (const index in plans) {
    const plan = plans[index]
    const {name, description, description_post, Fiammetta, drones, rooms, period} = plan
    plansTemplate.value[index].name = name
    plansTemplate.value[index].description = description
    plansTemplate.value[index].description_post = description_post

    if (Fiammetta) {
      for (const property in Fiammetta) {
        plansTemplate.value[index].Fiammetta[property] = Fiammetta[property]
      }
    }

    if (drones) {
      for (const property in drones) {
        plansTemplate.value[index].drones[property] = drones[property]
      }
    }

    if (rooms) {
      for (const roomType in rooms) {
        const roomList = rooms[roomType]
        for (const roomIndex in roomList) {
          const room = roomList[roomIndex]
          for (const property in roomList[roomIndex]) {
            // console.log(plansTemplate.value[index].rooms[roomType][roomIndex][property])
            plansTemplate.value[index].rooms[roomType][roomIndex][property] = room[property]
          }
        }
      }
    }

    if (period) {
      isPeriod.value = true
      let executionTime = [new Date(), new Date()]
      if (period.length === 1) {
        if (period[0].length === 2) {
          const start = getHourAndMinute(period[0][0])
          executionTime[0].setHours(start.hour)
          executionTime[0].setMinutes(start.minute)

          const end = getHourAndMinute(period[0][1])
          executionTime[1].setHours(end.hour)
          executionTime[1].setMinutes(end.minute)
        }
      }

      if (period.length === 2) {
        if (period[0].length === 2 && period[1].length === 2) {
          const start = getHourAndMinute(period[0][0])
          executionTime[0].setHours(start.hour)
          executionTime[0].setMinutes(start.minute)

          const end = getHourAndMinute(period[1][1])
          executionTime[1].setHours(end.hour)
          executionTime[1].setMinutes(end.minute)
        }
      }

      executionTimeList.value[index] = executionTime
    }
  }

  function getHourAndMinute(str) {
    if (str.indexOf(":") < 0) {
      cMessage(translate('schedule', 'schedule.ShiftTimesError'), 'error')
    }
    const strSplit = str.split(":")
    return {
      hour: parseInt(strSplit[0]),
      minute: parseInt(strSplit[1])
    }
  }

}

let guidePopup = ref(false)

function setPosition() {
  for (const charId in filterOperatorList.value) {
    const parentElement = document.getElementById(charId)
    if (!parentElement) {
      continue
    }
    const childElement = document.getElementById(`${charId}-description`)
    const parentTop = parentElement.offsetTop;
    const parentLeft = parentElement.offsetLeft;
    childElement.style.top = `${parentTop}px`;
    if (parentLeft > 700) {
      childElement.style.left = `100px`
    } else {
      childElement.style.left = `700px`
    }
  }
}

onMounted(() => {
  filterOperatorByTag(operatorFilterConditionTable.room.conditions[0], 'room')
  createPopover('room-set', `auto`)
  getOperatorDataByAccount()
})

</script>


<template>
  <div class="schedule-page">
    <div class="schedule-header">
      <div class="schedule-header-left">
        <!--      <span class="schedule-header-title">排班生成器</span>-->
      </div>
      <div class="schedule-header-right">
        <my-button data-color="orange" @click="scheduleTypePopupVisible = !scheduleTypePopupVisible">
          {{ translate('schedule', 'schedule.InfrastructureLayout') }}
        </my-button>
        <div>
          <input class="input-base" style="width: 200px" v-model="scheduleImportId"
                 :placeholder="[[translate('schedule', 'schedule.IdPlaceholder')]]"/>
          <span class="input-desc"></span>
        </div>
        <my-button data-color="blue" @click="importScheduleById()">
          {{ translate('schedule', 'schedule.ImportScheduleById') }}
        </my-button>

        <input type="file" id="scheduleFile" hidden @change="importScheduleByFile()">
        <my-button data-color="blue" @click="chooseFile()">{{
            translate('schedule', 'schedule.ImportScheduleFile')
          }}
        </my-button>
        <my-button data-color="blue" @click="saveAndDownloadScheduleFile()">
          {{ translate('schedule', 'schedule.DownloadScheduleFile') }}
        </my-button>
        <!--      <my-button data-color='blue' :active="true" @click="downloadScheduleFile()">-->
        <!--        {{ translate('schedule', 'schedule.DownloadScheduleFile') }}-->
        <!--      </my-button>-->

        <my-button data-color="orange" @click="guidePopup = true">
          {{ translate('schedule', 'schedule.GuidePopup') }}
        </my-button>
      </div>
    </div>
    <!-- TODO separate various paragraphs and translate them -->
    <c-popup v-model:visible="guidePopup">
      <div class="guide-box">
        <h1 style="text-align: center">排班生成器使用说明</h1>
        <h2>修改贸易站、制造站数量及换班次数</h2>
        <p>点击顶栏的<span class="guide-keynote">“选择基建类型”</span>按钮</p>
        <h2>通过Id导入排班</h2>
        <p>打开排班文件内，查看文件内的<span class="guide-keynote">id属性</span>，复制id，填入输入框，点击根据id导入排班</p>
        <h2>通过文件导入排班</h2>
        <p>点击<span class="guide-keynote">“导入排班文件”</span>按钮，选择你要导入的文件，即可导入</p>
        <h2>使用无人机的房间编号</h2>
        <p>房间编号为下图中的编号</p>
        <img src="/image/schedule/房间编号.jpg" alt="" class="guide-image">
        <h2>定时换班</h2>
        <p>不打开定时换班设置，MAA将默认按照排班的顺序执行排班，打开后将按照时间段执行排班</p>
        <h2>基建布局上的房间编号</h2>
        <img src="/image/schedule/基建布局.jpg" alt="" class="guide-image">
        <p>布局的房间位置不影响换班，MAA执行排班时会根据房间编号进行换班，制造站#1对应下图的01房间</p>
        <img src="/image/schedule/房间编号.jpg" alt="" class="guide-image">
      </div>
    </c-popup>

    <span class="schedule-version">V1.3.1</span>

    <c-popup v-model:visible="scheduleTypePopupVisible" :style="scheduleTypePopupStyle">
      <div class="schedule-set-wrap">

        <div class="schedule-set-bar">
          <span>{{ translate('schedule', 'schedule.ScheduleTitle') }}</span>
          <div><input class="input-base" v-model="scheduleInfo.title"/></div>
        </div>

        <div class="schedule-set-bar">
          <span>{{ translate('schedule', 'schedule.ScheduleDescription') }}</span>
          <div><input class="input-base" v-model="scheduleInfo.description"/></div>
        </div>

        <div class="schedule-set-bar">
          <span>{{ translate('schedule', 'schedule.Author') }}</span>
          <div><input class="input-base" v-model="scheduleInfo.author"/></div>
        </div>

        <div class="schedule-set-bar">
          <span>{{ translate('schedule', 'schedule.BaseLayout') }}</span>
          <div>
            <my-button data-color='blue' :active="menu.label === selectedScheduleType.label"
                       @click="chooseScheduleType(menu)" v-for="(menu, index) in schedule_menu" :key="index">
              {{ menu.label }}
            </my-button>
          </div>
        </div>

        <div class="schedule-set-bar">
          <span>{{ translate('schedule', 'schedule.ShiftNumber') }}</span>
          <div>
            <my-button data-color='blue' :active="num === scheduleTypeV2.planTimes" style="min-width: 40px"
                       v-for="(num, index) in 6" :key="index"
                       @click="choosePlanTimes(num)">
              {{ num }}
            </my-button>
          </div>
        </div>
      </div>
    </c-popup>

    <div class="maa-schedule-wrap-v2">
      <div class="maa-schedule-v2">
        <div class="schedule-set-wrap">
          <div class="schedule-set-bar">

            <span>{{ translate('schedule', 'schedule.ShiftName') }}</span>
            <div><input class="input-base" v-model="plansTemplate[selectedPlanIndex].name"/></div>
            <span>{{ translate('schedule', 'schedule.ShiftDescription') }}</span>
            <div><input class="input-base" v-model="plansTemplate[selectedPlanIndex].description"/></div>
            <span>{{ translate('schedule', 'schedule.ShiftDescriptionPost') }}</span>
            <div><input class="input-base" v-model="plansTemplate[selectedPlanIndex].description_post"/></div>
          </div>

          <div class="schedule-set-bar-short">
            <span style="width: 140px">{{ translate('schedule', 'schedule.UseDrones') }}</span>
            <div style="width: 70px">
              <c-switch v-model="plansTemplate[selectedPlanIndex].drones.enable"></c-switch>
            </div>
            <span style="width: 70px">{{ translate('schedule', 'schedule.Usage') }}</span>
            <div style="width: 200px">
              <my-button data-color='blue' :active="'pre' === plansTemplate[selectedPlanIndex].drones.order"
                         @click="setDrones('order', 'pre')">
                {{ translate('schedule', 'schedule.PreShift') }}
              </my-button>
              <my-button data-color='blue' :active="'post' === plansTemplate[selectedPlanIndex].drones.order"
                         @click="setDrones('order', 'post')">
                {{ translate('schedule', 'schedule.PostShift') }}
              </my-button>
            </div>
            <span>{{ translate('schedule', 'schedule.TargetRoom') }}</span>
            <div style="width: 220px">
              <my-button data-color='blue' :active="'trading' === plansTemplate[selectedPlanIndex].drones.room"
                         @click="setDrones('room', 'trading')">
                {{ translate('schedule', 'schedule.TradingPost') }}
              </my-button>
              <my-button data-color='blue' :active="'manufacture' === plansTemplate[selectedPlanIndex].drones.room"
                         @click="setDrones('room', 'manufacture')">
                {{ translate('schedule', 'schedule.Factory') }}
              </my-button>
            </div>
            <span>{{ translate('schedule', 'schedule.RoomNumber') }}</span>
            <div>
              <my-button data-width-auto data-color='blue'
                         :active="(index) === plansTemplate[selectedPlanIndex].drones.index"
                         @click="setDrones('index', (index))" v-for="index in 5" :key="index">
                {{ index }}
              </my-button>
            </div>
          </div>

          <div class="schedule-set-bar-short">
            <span style="width: 140px">{{ translate('schedule', 'schedule.UseFiammetta') }}</span>
            <div style="width: 70px">
              <c-switch v-model="plansTemplate[selectedPlanIndex].Fiammetta.enable"></c-switch>
            </div>
            <span style="width: 70px">{{ translate('schedule', 'schedule.Usage') }}</span>
            <div style="width: 200px">
              <my-button data-color='blue' :active="'pre' === plansTemplate[selectedPlanIndex].Fiammetta.order"
                         @click="setFiammetta('order', 'pre')">
                {{ translate('schedule', 'schedule.PreShift') }}
              </my-button>
              <my-button data-color='blue' :active="'post' === plansTemplate[selectedPlanIndex].Fiammetta.order"
                         @click="setFiammetta('order', 'post')">
                {{ translate('schedule', 'schedule.PostShift') }}
              </my-button>
            </div>
            <span>{{ translate('schedule', 'schedule.RecoveryTarget') }}</span>
            <div style="height: 65px">
              <!--        <div class="room-avatar-sprite-wrap" @click="Fiammetta_target_visible=true">-->
              <!--          <div :class="getAvatar(plansTemplate[selectedPlanIndex].Fiammetta.target)"></div>-->
              <!--        </div>-->

              <div class="option-avatar-sprite-wrap" @click="FiammettaTargetVisible = true">
                <div :class="getOptionAvatar(plansTemplate[selectedPlanIndex].Fiammetta.target)"></div>
              </div>
            </div>
          </div>

          <div class="schedule-set-bar-short">
            <!--            <span class="room-set-description">{{ translate('schedule', 'schedule.OrderedStationing') }}</span>-->
            <!--            <c-switch v-model="plansTemplate[selectedPlanIndex].rooms[selectedRoomType][selectedRoomIndex].sort">-->
            <!--            </c-switch>-->

            <!--            <span class="room-set-description">{{ translate('schedule', 'schedule.Autofill') }}</span>-->
            <!--            <c-switch v-model="plansTemplate[selectedPlanIndex].rooms[selectedRoomType][selectedRoomIndex].autofill">-->
            <!--            </c-switch>-->
            <!--            <i class="iconfont icon-question schedule-question">-->
            <!--              <span class="schedule-tip">{{ translate('schedule', 'schedule.SkipRoomTip') }}</span>-->
            <!--            </i>-->

            <!--            <span class="room-set-description">{{ translate('schedule', 'schedule.SkipRoom') }}</span>-->
            <!--            <c-switch v-model="plansTemplate[selectedPlanIndex].rooms[selectedRoomType][selectedRoomIndex].skip">-->
            <!--            </c-switch>-->
            <!--            <span class="room-set-description">{{ translate('schedule', 'schedule.ProductSelection') }}</span>-->
            <!--            <div class="product-image-wrap" @click="setProduct(product.value)"-->
            <!--                 v-for="(product, index) in productTable[selectedRoomType]" :key="index">-->
            <!--              <div :class="getItemSprite(product.id)"></div>-->
            <!--            </div>-->

            <span class="room-set-description">{{ translate('schedule', 'schedule.TimedShiftChange') }}</span>
            <c-switch v-model="isPeriod"></c-switch>
            <div class="schedule-set-tip">&emsp;{{ translate('schedule', 'schedule.TimedShiftChangeTip') }}</div>
          </div>

          <div class="schedule-set-bar-short" style="flex-wrap:wrap;padding-bottom: 20px">
            <div class="execution-time" v-for="(num, index) in scheduleTypeV2.planTimes" :key="index">
              <span>{{ translate('schedule', 'schedule.Shift') }}{{ num }}</span>
              <!--          <c-time-checkbox v-model="executionTimeList[index]"></c-time-checkbox>-->
              <el-time-picker v-model="executionTimeList[index][0]" placeholder="Arbitrary time" style="width: 180px"/>
              <span>to</span>
              <el-time-picker v-model="executionTimeList[index][1]" placeholder="Arbitrary time" style="width: 180px"/>
            </div>
          </div>
        </div>

        <c-popup v-model:visible="FiammettaTargetVisible" :style="roomPopupStyle">
          <div class="filter-condition-box">
            <div class="condition-bar" v-for="(room, key) in operatorFilterConditionTable" v-show="room.display"
                 :key="key">
              <span :style="`color:${room.color}`">{{ translate('schedule', room.name) }}</span>
              <my-button v-for="(condition, index) in room.conditions" :key="index" data-color='blue'
                         :active="filterBtnStatus(key, condition.label)" @click="filterOperatorByTag(condition, key)">
                {{ translate('schedule', condition.label) }}
              </my-button>
            </div>
          </div>

          <div class="operator-check-box-group" style="width: 550px">
            <div class="operator-check-box-option" v-for="(operator, charId) in filterOperatorList" :key="charId"
                 @click="setFiammetta('target', operator.name); FiammettaTargetVisible = false">
              <div :class="getOptionAvatar(operator.charId)"></div>
              <div class="operator-check-label">{{ operator.name }}</div>
            </div>
          </div>
        </c-popup>


        <div id="room-set">

          <div class="schedule-set-bar-short">
            <span class="room-set-description">{{ translate('schedule', 'schedule.OrderedStationing') }}</span>
            <c-switch v-model="plansTemplate[selectedPlanIndex].rooms[selectedRoomType][selectedRoomIndex].sort">
            </c-switch>
            <span class="room-set-description">{{ translate('schedule', 'schedule.Autofill') }}</span>
            <c-switch v-model="plansTemplate[selectedPlanIndex].rooms[selectedRoomType][selectedRoomIndex].autofill">
            </c-switch>
            <i class="iconfont icon-question schedule-question">
              <span class="schedule-tip">{{ translate('schedule', 'schedule.SkipRoomTip') }}</span>
            </i>
          </div>
          <div class="schedule-set-bar-short">
            <span class="room-set-description">{{ translate('schedule', 'schedule.SkipRoom') }}</span>
            <c-switch v-model="plansTemplate[selectedPlanIndex].rooms[selectedRoomType][selectedRoomIndex].skip">
            </c-switch>
            <span class="room-set-description">{{ translate('schedule', 'schedule.ProductSelection') }}</span>
            <div class="product-image-wrap" @click="setProduct(product.value)"
                 v-for="(product, index) in productTable[selectedRoomType]" :key="index">
              <div :class="getItemSprite(product.id)"></div>
            </div>
          </div>
        </div>

        <div class="room-wrap">
          <div class="room-arrow-wrap" @click="toNextPlan(selectedPlanIndex - 1)">
            <i class="iconfont icon-arrow-left" style="font-size: 48px">
            </i>
          </div>
          <!--  左边站点-->
          <div class="room-wrap-left">
            <!--        <div class="room-template blank" style="width: 180px;" -->
            <!--             v-for="index in 3" :key="index">-->
            <!--        </div>-->
            <div class="copy-btn-wrap">
            </div>
            <!--    贸易站-->
            <div class="room-template trading" :id="`trading#${index}`"
                 :class="roomSelectedClass('trading', index)"
                 v-for="(num, index) in scheduleTypeV2.trading" :key="index"
                 @click="chooseRoom('trading', index)">
              <div class="room-name">
                <span>{{ translate('schedule', 'schedule.TradingPost') }}#{{ num }}</span>
                <div :class="getRoomProduct('trading', index)"></div>
              </div>
              <div class="settlement_operator">
                <div class="room-avatar-sprite-wrap"
                     v-for="(charName, index) in getRoomOperators('trading', index)"
                     :key="index">
                  <div :class="getAvatar(charName)"></div>
                </div>
              </div>
            </div>

            <!--  制造站-->
            <div class="room-template manufacture" :id="`manufacture#${index}`"
                 :class="roomSelectedClass('manufacture', index)"
                 v-for="(num, index) in scheduleTypeV2.manufacture" :key="index"
                 @click="chooseRoom('manufacture', index)">
              <div class="room-name">
                <span>{{ translate('schedule', 'schedule.Factory') }}#{{ num }}</span>
                <div :class="getRoomProduct('manufacture', index)"></div>
              </div>
              <div class="settlement_operator">
                <div class="room-avatar-sprite-wrap"
                     v-for="(charName, index) in getRoomOperators('manufacture', index)" :key="index">
                  <div :class="getAvatar(charName)"></div>
                </div>
              </div>

              <!--        <div class="room-set-wrap">-->
              <!--          <c-status v-model="plans_template[selected_plan_index].room.trading[tradingIndex].skip"-->
              <!--                    :label="'跳过房间'"></c-status>-->
              <!--          <c-status v-model="plans_template[selected_plan_index].room.trading[tradingIndex].sort"-->
              <!--                    :label="'顺序入驻'"></c-status>-->
              <!--          <c-status v-model="plans_template[selected_plan_index].room.trading[tradingIndex].autofill"-->
              <!--                    :label="'补满空位'"></c-status>-->
              <!--        </div>-->
            </div>

            <!--  发电站-->
            <div class="room-template power" :id="`power#${index}`"
                 :class="roomSelectedClass('power', index)"
                 v-for="(num, index) in scheduleTypeV2.power" :key="index"
                 @click="chooseRoom('power', index)"
            >
              <div class="room-name">{{ translate('schedule', 'schedule.PowerPlant') }}#{{ num }}</div>
              <div class="room-avatar-sprite-wrap" v-for="(charName, index) in getRoomOperators('power', index)"
                   :key="index">
                <div :class="getAvatar(charName)"></div>
              </div>
            </div>

            <div class="copy-btn-wrap">
            <span>{{ translate('schedule', 'schedule.TempPlan') }}&nbsp;{{ translate('schedule', 'schedule.Shift') }}{{
                tmpPlanData.index
              }} </span>
              <my-button data-color='blue' :active="true" @click="copyPlan()">
                {{ translate('schedule', 'schedule.CopyPlan') }}
              </my-button>
              <my-button data-color='blue' :active="true" @click="pastePlan()">
                {{ translate('schedule', 'schedule.PastePlan') }}
              </my-button>
            </div>
          </div>

          <div class="room-wrap-center">
            <!--     控制中枢-->
            <div class="room-template control" :id="`control#0`"
                 :class="roomSelectedClass('control', 0)"
                 @click="chooseRoom('control', 0)"
            >
              <div class="room-name">{{ translate('schedule', 'schedule.ControlCenter') }}</div>
              <div class="room-avatar-sprite-wrap" v-for="(charName, index) in getRoomOperators('control', 0)"
                   :key="index">
                <div :class="getAvatar(charName)"></div>
              </div>
            </div>
            <!--     宿舍-->
            <div class="room-template dormitory" :id="`dormitory#${index}`"
                 :class="roomSelectedClass('dormitory', index)"
                 v-for="(num, index) in scheduleTypeV2.dormitory" :key="index"
                 @click="chooseRoom('dormitory', index)">
              <div class="room-name">{{ translate('schedule', 'schedule.Dormitory') }}#{{ num }}</div>
              <div class="room-avatar-sprite-wrap"
                   v-for="(charName, index) in getRoomOperators('dormitory', index)" :key="index">
                <div :class="getAvatar(charName)"></div>
              </div>
            </div>
          </div>

          <div class="room-wrap-right">
            <div class="room-template blank" style="width: 100px;"></div>
            <!--     会客室-->
            <div class="room-template meeting" :id="`meeting#0`"
                 :class="roomSelectedClass('meeting', 0)"
                 @click="chooseRoom('meeting', 0)"
            >
              <div class="room-name">{{ translate('schedule', 'schedule.ReceptionRoom') }}</div>
              <div class="room-avatar-sprite-wrap" v-for="(charName, index) in getRoomOperators('meeting', 0)"
                   :key="index">
                <div :class="getAvatar(charName)"></div>

              </div>
            </div>
            <!--      加工站-->
            <div class="room-template processing" :id="`processing#0`"
                 :class="roomSelectedClass('processing', 0)"
                 @click="chooseRoom('processing', 0)">
              <div class="room-name">{{ translate('schedule', 'schedule.Workshop') }}</div>
              <div class="room-avatar-sprite-wrap" v-for="(charName, index) in getRoomOperators('processing', 0)"
                   :key="index">
                <div :class="getAvatar(charName)"></div>
              </div>
            </div>

            <!--     办公室 -->
            <div class="room-template hire" :id="`hire#0`"
                 :class="roomSelectedClass('hire', 0)" @click="chooseRoom('hire', 0)">
              <div class="room-name">{{ translate('schedule', 'schedule.Office') }}</div>
              <div class="room-avatar-sprite-wrap" v-for="(charName, index) in getRoomOperators('hire', 0)"
                   :key="index">
                <div :class="getAvatar(charName)"></div>
              </div>
            </div>
            <div class="room-template blank" style="width: 100px;"></div>
          </div>

          <div class="room-arrow-wrap" @click="toNextPlan(selectedPlanIndex + 1)"><i class="iconfont icon-arrow-right"
                                                                                     style="font-size: 48px"></i></div>
        </div>

        <div class="schedule-set-bar" style="justify-content: center">
          <span>{{ translate('schedule', 'schedule.CurrentShift') }}</span>
          <my-button data-color='blue' :active="index === selectedPlanIndex"
                     v-for="(num, index) in scheduleTypeV2.planTimes" :key="index" @click="currentPlan(index)"
                     class="room_times"
                     style="margin: 0 8px">
            {{ translate('schedule', 'schedule.Shift') }}{{ num }}
          </my-button>
        </div>


        <div class="room-set-wrap">
          <div class="room-set">
            <span class="room-set-description">{{ translate('schedule', 'schedule.OperatorsStationed') }}</span>
            <div class="selected-operator-wrap">
              <div class="room-avatar-sprite-wrap"
                   v-for="(charId, index) in getRoomOperators(selectedRoomType, selectedRoomIndex)" :key="index">
                <div :class="getAvatar(charId)"></div>
                <i class="iconfont icon-error operator-delete-icon" @click="deleteOperator(charId)">
                </i>
              </div>
            </div>
            <my-button data-color='blue' :active="true" @click="copyOperatorList()">
              {{ translate('schedule', 'schedule.Copy') }}
            </my-button>
            <my-button data-color='blue' :active="true" @click="pasteOperatorList()">
              {{ translate('schedule', 'schedule.Paste') }}
            </my-button>
            <span class="room-set-description">{{ translate('schedule', 'schedule.OperatorsClipboard') }}</span>
            <div class="selected-operator-wrap">
              <div class="room-avatar-sprite-wrap" v-for="(charId, index) in tmpOperatorList" :key="index">
                <div :class="getAvatar(charId)"></div>
              </div>
            </div>
          </div>

          <!--        筛选干员-->
          <div class="filter-condition-box">
            <div class="condition-bar" v-for="(conditionType, key) in operatorFilterConditionTable"
                 v-show="conditionType.display" :key="key">
              <span :style="`color:${conditionType.color}`">{{ translate('schedule', conditionType.name) }}</span>
              <my-button v-for="(condition, index) in conditionType.conditions" :key="index"
                         :data-color='conditionType.buttonColor'
                         :active="filterBtnStatus(key, condition.label)" @click="filterOperatorByTag(condition, key)">
                {{ translate('schedule', condition.label) }}
              </my-button>
            </div>
            <span class="condition-tip">{{ translate('schedule', 'schedule.developerTip') }}</span>
          </div>

          <div class="schedule-operator-search-input-box">
            <div class="input-group">
              <input class="input-base" id="input-id" style="width:500px" @input="searchOperatorDebounce()"
                     v-model="searchInputText">
              <span class="input-group-text">{{ translate('schedule', 'schedule.searchInputTip') }}</span>
            </div>
            <my-button data-color="blue" :active="filterNotOwnOperator" @click="filterOperatorByOwn">隐藏未招募干员</my-button>
          </div>
          <div class="operator-check-box-group">
            <div v-for="(operator, charId) in filterOperatorList" :key="charId" @click="chooseOperator(operator.name)"
                 :id="operator.charId" class="operator-check-box-option">
              <div :class="getOptionAvatar(operator.charId)" class="option-avatar-sprite"></div>
              <div class="operator-check-label">{{ operator.name }}</div>
              <span class="operator-building-skill-description" :id="`${operator.charId}-description`"
                    v-html="operator.description"></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>


.schedule-question {
  font-size: 20px;
  padding: 0 4px;
  position: relative;
}

.schedule-tip {
  position: absolute;
  z-index: 3000;
  top: 20px;
  left: 20px;
  display: none;
  width: 100px;
  font-size: 14px;
  padding: 8px;
  line-height: 24px;
  font-weight: 600;
  background-color: var(--c-background-color);
  box-shadow: 1px 1px 10px var(--c-box-shadow-color);;
}

.schedule-question:hover {
  .schedule-tip {
    display: block;
  }
}
</style>