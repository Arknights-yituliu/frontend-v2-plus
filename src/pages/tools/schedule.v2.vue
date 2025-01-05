<script setup>
import {onMounted, ref, watch} from "vue"

import '/src/assets/css/tool/schedule.v2.css'
import '/src/assets/css/information/building_skill_font_color.css'

import SCHEDULE_TEMPLATE from '/src/static/json/build/plans_template.json'
import character_table from '/src/static/json/survey/character_table_simple.json'
import SCHEDULE_MENU from '/src/static/json/build/schedule_menu.json'
import BUILDING_TABLE from '/src/static/json/build/building_table.json'

import buildingApi from '/src/api/building.js'
import operatorDataAPI from '/src/api/operatorData.js'
import {operatorFilterConditionTable} from '/src/utils/buildingSkillFilter.js'
import {translate} from '/src/utils/i18n.js'
import {getText} from '/src/utils/fileConversion.js'
import {debounce} from "/src/utils/debounce.js";
import {cMessage} from '/src/utils/message.js'
import {createPopover, popoverOnOpen} from "/src/utils/popover.js";

import OperatorAvatar from "/src/components/sprite/OperatorAvatar.vue";
import {downloadJsonFile} from "/src/utils/download.js";
import {getUserInfo} from "/src/utils/user/userInfo.js";
import {useDisplay} from 'vuetify'

const useDisplay1 = useDisplay()

console.log('设备尺寸{}', useDisplay1.xs.value)

import ItemImage from "@/components/sprite/ItemImage.vue";

let operatorOwnMap = new Map()

function buttonSize() {
  if (useDisplay1.xs.value) {
    return 'small'
  }


}

let filterMainCondition = []
let filterSecCondition = []

for (const type in operatorFilterConditionTable) {
  filterMainCondition.push(type)
  const element = operatorFilterConditionTable[type];
  const conditions = element.conditions
  for (const condition of conditions) {
    filterSecCondition.push(condition.label)
  }
}

async function getOperatorDataByAccount() {

  const userInfo = await getUserInfo()

  const data = {
    token: userInfo.token
  }

  if (userInfo.status < 0) {
    return
  }

  operatorDataAPI.getOperatorData(data).then(response => {
    for (const operator of response.data) {
      operatorOwnMap.set(operator.charId, operator.own)
    }
  })

}

let plansTemplate = ref('')
plansTemplate.value = SCHEDULE_TEMPLATE

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

let selectedScheduleType = ref(SCHEDULE_MENU[0])


let scheduleTypeV2 = ref({
  planTimes: 3,
  trading: 2,
  manufacture: 4,
  power: 3,
  dormitory: 4,
})

/**
 * 获得获得房间内的干员
 * @param scheduleIndex 当前班次索引
 * @param {string} room 设施类型
 * @param {number} index 房间编号
 * @return {*[string]} 干员组
 */
function getRoomOperators(scheduleIndex, room, index) {
  // console.log("排班#",scheduleIndex," {} ",room,"#",index)
  if (!plansTemplate.value[scheduleIndex]) {
    // cMessage(index + '-班次索引越界', 'error')
    return []
  }
  if (!plansTemplate.value[scheduleIndex].rooms[room]) {
    cMessage('Facility#' + room + '-' + translate('schedule', 'schedule.FacilityNotExist'), 'error')
    return []
  }

  if (!plansTemplate.value[scheduleIndex].rooms[room][index]) {
    cMessage('Operator#' + index + '-' + translate('schedule', 'schedule.OperatorIndexOutOfBounds'), 'error')
    return []
  }

  return plansTemplate.value[scheduleIndex].rooms[room][index].operators
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


function scheduleTypeButtonAction() {

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
    selectedScheduleIndex.value = scheduleTypeV2.value.planTimes - 1
  else if (index >= scheduleTypeV2.value.planTimes)
    selectedScheduleIndex.value = 0
  else
    selectedScheduleIndex.value = index

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
 * 获得干员id
 * @param name 干员名称
 * @return {string} 干员id
 */
function getCharId(name) {
  name = characterIdAndName[name]
  return name
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
let selectedScheduleIndex = ref(0)
//房间类型
let selectedRoomType = ref('trading')
//房间序号
let selectedRoomIndex = ref(0)

/**
 * 选择当前班次
 * @param {number} index 班次（班次1为0,以此类推)
 */
function currentPlan(index) {
  selectedScheduleIndex.value = index
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
    selectedProduct.value = getItemIdByProductName(plansTemplate.value[selectedScheduleIndex.value]
        .rooms[selectedRoomType.value][selectedRoomIndex.value].product)
  }

  popoverOnOpen(`${roomType}#${index}`, 'room-set')
}

let selectBtnKey = ref({})
let filterOperatorList = ref({})
let filterNotOwnOperator = ref(false)


function filterBtnStatus(key, label) {
  if (selectBtnKey.value !== `${key}+${label}`) {
    return 'tonal'
  }
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
  for (const operator of BUILDING_TABLE) {
    // 当按钮key有值时通过暂存的筛选函数进行筛选
    if (selectBtnKey.value && !filterCondition.value.func(operator)) {
      continue;
    }
    //判断输入了关键词和干员符合关键词
    if (searchInputText.value && !operatorHasKeyword(operator)) {
      continue;
    }
    //如果未选中某个按钮和未输入关键词跳过
    if (!selectBtnKey.value && !searchInputText.value) {
      continue
    }

    //是否需要过滤未持有的干员
    if (filterNotOwnOperator.value) {
      if (!operatorOwnMap.get(operator.charId)) {
        continue
      }
    }

    if (filterOperatorList.value[operator.charId]) {
      let result = filterOperatorList.value[operator.charId]
      result.description += '<br><br>' + operator.description
      filterOperatorList.value[operator.charId] = result
    } else {
      filterOperatorList.value[operator.charId] = JSON.parse(JSON.stringify(operator))
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


const filterOperatorByOwn = debounce(() => {
  filterNotOwnOperator.value = !filterNotOwnOperator.value
  if (operatorOwnMap.size < 10) {
    cMessage('未登录或未导入', 'error')
    return
  }

  commonFilterOperator()
}, 200)


let operatorCheckBoxDialog = ref(false)

function openOperatorCheckBoxDialog(scheduleIndex, roomType, roomIndex) {
  selectedScheduleIndex.value = scheduleIndex
  selectedRoomType.value = roomType
  selectedRoomIndex.value = roomIndex
  operatorCheckBoxDialog.value = true

}

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

  checkPlanDuplicateOperator(selectedScheduleIndex.value, charName, true)


  plansTemplate.value[selectedScheduleIndex.value].rooms[selectedRoomType.value][selectedRoomIndex.value].operators.push(charName)

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
  if (plansTemplate.value[selectedScheduleIndex.value]
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
  if (plansTemplate.value[selectedScheduleIndex.value]
      .rooms[selectedRoomType.value][selectedRoomIndex.value]
      .operators.length >= roomSettlementOperatorMaxQuantity[selectedRoomType.value]) {
    cMessage(translate('schedule', 'schedule.FacilityFull'), 'error')
    return false;
  }

  return true;
}

/**
 * 删除该房间中选中的干员
 * @param scheduleIndex 当前选择的排班表
 * @param roomType  房间类型
 * @param roomIndex 房间编号
 * @param {string} charName 干员名称
 */
function deleteOperator(scheduleIndex, roomType, roomIndex, charName) {

  plansTemplate.value[selectedScheduleIndex.value].rooms[selectedRoomType.value][selectedRoomIndex.value].operators =
      plansTemplate.value[selectedScheduleIndex.value].rooms[selectedRoomType.value][selectedRoomIndex.value].operators.filter(e => {
        return e !== charName
      })

  checkPlanDuplicateOperator(selectedScheduleIndex.value, charName, false)

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
      plansTemplate.value[selectedScheduleIndex.value].rooms[selectedRoomType.value][selectedRoomIndex.value].operators
}

/**
 * 粘贴干员组
 */
function pasteOperatorList() {
  for (const charName of plansTemplate.value[selectedScheduleIndex.value].rooms[selectedRoomType.value][selectedRoomIndex.value].operators) {
    deleteOperator(charName)
  }

  for (const charId of tmpOperatorList.value) {


    if (!checkRoomMaximum()) {
      return;
    }
    plansTemplate.value[selectedScheduleIndex.value].rooms[selectedRoomType.value][selectedRoomIndex.value].operators.push(charId)

    checkPlanDuplicateOperator(selectedScheduleIndex.value, charId, true)
  }
}

let tmpPlanData = ref({index: 0, plan: ''})

function copyPlan() {
  tmpPlanData.value.plan = JSON.stringify(plansTemplate.value[selectedScheduleIndex.value])
  tmpPlanData.value.index = selectedScheduleIndex.value + 1
}

function pastePlan() {
  plansTemplate.value[selectedScheduleIndex.value] = JSON.parse(tmpPlanData.value.plan)
  duplicateOperatorTable.value[selectedScheduleIndex.value] = {}
}

let selectedProduct = ref("")

/**
 * 设置房间产物
 * @param {string} product 产物类型
 */
function setProduct(product) {
  plansTemplate.value[selectedScheduleIndex.value].rooms[selectedRoomType.value][selectedRoomIndex.value].product = product
  selectedProduct.value = getItemIdByProductName(plansTemplate.value[selectedScheduleIndex.value]
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

function getRoomProduct(scheduleIndex, roomType, index) {
  // console.log("产物 {} 排班#",scheduleIndex," {} ",roomType,"#",index)
  const product = plansTemplate.value[scheduleIndex].rooms[roomType][index].product
  // console.log(`bg-${itemId} room-product`)
  return getItemIdByProductName(product)
}

function fillOperatorConflict(index) {
  if (plansTemplate.value[selectedScheduleIndex.value].rooms['dormitory'][index].autofill) {
    if (plansTemplate.value[selectedScheduleIndex.value].rooms['dormitory'][index].operators) {
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
  plansTemplate.value[selectedScheduleIndex.value].drones[property] = value

}


let FiammettaTargetVisible = ref(false)

/**
 * 写入菲亚梅塔使用设置
 * @param {string} property 无人机设置参数 如enable等
 * @param {*} value 参数值
 */
function setFiammetta(property, value) {
  plansTemplate.value[selectedScheduleIndex.value].Fiammetta[property] = value
}

watch(() => plansTemplate.value[selectedScheduleIndex.value].rooms[selectedRoomType.value][selectedRoomIndex.value].autofill,
    (newVal) => {

      if (newVal && selectedRoomType.value === 'dormitory') {
        if (plansTemplate.value[selectedScheduleIndex.value].rooms
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
  "author": "文件作者",
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
    downloadJsonFile(scheduleInfo.value, scheduleId.value)
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
  for (const menu of SCHEDULE_MENU) {
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

  <div class="schedule-v2-page">

    <div class="flex flex-wrap">
      <!--选择基建布局和换班次数-->
      <v-btn color="orange" variant="outlined" class="m-2"
             @click="scheduleTypePopupVisible = !scheduleTypePopupVisible">
        {{ translate('schedule', 'schedule.InfrastructureLayout') }}
      </v-btn>
      <!--输入排班id-->
      <v-text-field density="compact" variant="outlined" hide-details width="200"
                    :label="translate('schedule', 'schedule.IdPlaceholder')"
                    v-model="scheduleImportId">
      </v-text-field>
      <!--根据id导入排班-->
      <v-btn color="primary" variant="outlined" class="m-2" @click="importScheduleById()">
        {{ translate('schedule', 'schedule.ImportScheduleById') }}
      </v-btn>

      <input type="file" id="scheduleFile" hidden @change="importScheduleByFile()">
      <!--根据文件导入排版-->
      <v-btn color="primary" variant="outlined" class="m-2" @click="chooseFile()">{{
          translate('schedule', 'schedule.ImportScheduleFile')
        }}
      </v-btn>
      <!--下载排版文件-->
      <v-btn color="primary" variant="outlined" class="m-2" @click="saveAndDownloadScheduleFile()">
        {{ translate('schedule', 'schedule.DownloadScheduleFile') }}
      </v-btn>

      <!--操作指引-->
      <v-btn color="primary" variant="outlined" class="m-2" @click="guidePopup = true">
        {{ translate('schedule', 'schedule.GuidePopup') }}
      </v-btn>
    </div>

    <v-dialog v-model="guidePopup" max-width="800">
      <v-card>
        <v-card-text>
          <div class="guide-box">
            <h1 style="text-align: center">排班生成器使用说明</h1>
            <h2>修改贸易站、制造站数量及换班次数</h2>
            <p>点击顶栏的<span class="guide-keynote">“选择基建类型”</span>按钮</p>
            <h2>通过Id导入排班</h2>
            <p>打开排班文件内，查看文件内的<span class="guide-keynote">id属性</span>，复制id，填入输入框，点击根据id导入排班
            </p>
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
        </v-card-text>
      </v-card>
    </v-dialog>

    <!--    填写文件描述和选择基建类型、换班次数-->
    <v-dialog v-model="scheduleTypePopupVisible" max-width="800">
      <v-card>
        <v-card-text>
          <div class="schedule-set-wrap">
            <!--换班表名称-->
            <div class="schedule-set-bar">
              <span>{{ translate('schedule', 'schedule.ScheduleTitle') }}</span>
              <v-text-field density="compact" hide-details variant="outlined" v-model="scheduleInfo.title">
              </v-text-field>
            </div>
            <!--换班表描述-->
            <div class="schedule-set-bar">
              <span>{{ translate('schedule', 'schedule.ScheduleDescription') }}</span>
              <v-text-field density="compact" hide-details variant="outlined" v-model="scheduleInfo.description">
              </v-text-field>
            </div>
            <!--文件作者-->
            <div class="schedule-set-bar">
              <span>{{ translate('schedule', 'schedule.Author') }}</span>
              <v-text-field density="compact" hide-details variant="outlined" v-model="scheduleInfo.author">
              </v-text-field>
            </div>

            <!--基建布局-->
            <div class="schedule-set-bar">
              <span>{{ translate('schedule', 'schedule.BaseLayout') }}</span>
              <div>
                <v-btn color="primary" class="m-2" :variant="menu.label === selectedScheduleType.label?void 0:`tonal`"
                       @click="chooseScheduleType(menu)" v-for="(menu, index) in SCHEDULE_MENU" :key="index">
                  {{ menu.label }}
                </v-btn>
              </div>
            </div>

            <!--换班次数-->
            <div class="schedule-set-bar">
              <span>{{ translate('schedule', 'schedule.ShiftNumber') }}</span>
              <div>
                <v-btn color="primary" class="m-2" :variant="num === scheduleTypeV2.planTimes?void 0:`tonal`"
                       v-for="(num, index) in 6" :key="index" @click="choosePlanTimes(num)">
                  {{ num }}
                </v-btn>
              </div>
            </div>
          </div>
        </v-card-text>
      </v-card>
    </v-dialog>

    <div class="schedule-box-container">
      <div class="flex schedule-box">
        <v-card class="schedule-item-card" v-for="(i,scheduleIndex) in scheduleTypeV2.planTimes">
          <v-list density="compact">
            <!--当前换班表名称-->
            <v-list-item>
              <v-list-item-title>
                <span class="font-bold">{{ translate('schedule', 'schedule.ShiftName') }}</span>
              </v-list-item-title>
              <v-text-field variant="outlined" hide-details density="compact"
                            v-model="plansTemplate[scheduleIndex].name">
              </v-text-field>
            </v-list-item>
            <!--排班表描述-->
            <v-list-item>
              <v-list-item-title>
                <span class="font-bold">{{ translate('schedule', 'schedule.ShiftDescription') }}</span>
              </v-list-item-title>
              <v-text-field density="compact" hide-details variant="outlined"
                            v-model="plansTemplate[scheduleIndex].description">
              </v-text-field>
            </v-list-item>
            <!--换班表完成后的描述-->
            <v-list-item>
              <v-list-item-title>
                <span class="font-bold">{{ translate('schedule', 'schedule.ShiftDescriptionPost') }}</span>
              </v-list-item-title>
              <v-text-field density="compact" hide-details variant="outlined"
                            v-model="plansTemplate[scheduleIndex].description_post">
              </v-text-field>
            </v-list-item>
            <!--是否使用无人机-->
            <v-list-item>
              <v-list-item-title>
                <span class="font-bold">{{ translate('schedule', 'schedule.DronesSet') }}</span>
              </v-list-item-title>
              <div class="flex justify-space-between align-center">
                <span class="opacity-70">{{ translate('schedule', 'schedule.UseDrones') }}</span>

                <v-switch color="success" density="compact" hide-details
                          v-model="plansTemplate[scheduleIndex].drones.enable"></v-switch>
              </div>
              <!--无人机用在换班前或后-->
              <div class="opacity-70">{{ translate('schedule', 'schedule.UseDronesBeforeOrAfterAShift') }}</div>
              <v-btn color="primary" :variant="'pre' === plansTemplate[scheduleIndex].drones.order?void 0:`tonal`"
                     @click="setDrones('order', 'pre')" class="m-4"
                     :text=" translate('schedule', 'schedule.PreShift')">
              </v-btn>
              <v-btn color="primary" :variant="'post' === plansTemplate[scheduleIndex].drones.order?void 0:`tonal`"
                     :text="translate('schedule', 'schedule.PostShift')" class="m-4"
                     @click="setDrones('order', 'post')">
              </v-btn>
              <!--目标房间-->
              <div class="opacity-70">{{ translate('schedule', 'schedule.TargetRoom') }}</div>
              <v-btn color="primary"
                     :variant="'trading' === plansTemplate[scheduleIndex].drones.room?void 0:`tonal`"
                     :text="translate('schedule', 'schedule.TradingPost')" class="m-4"
                     @click="setDrones('room', 'trading')">
              </v-btn>
              <v-btn color="primary"
                     :variant="'manufacture' === plansTemplate[scheduleIndex].drones.room?void 0:`tonal`"
                     :text="translate('schedule', 'schedule.Factory')" class="m-4"
                     @click="setDrones('room', 'manufacture')">

              </v-btn>
              <!--房间编号-->
              <div class="opacity-70">{{ translate('schedule', 'schedule.RoomNumber') }}</div>
              <v-btn color="primary" :variant="(index) === plansTemplate[scheduleIndex].drones.index?void 0:`tonal`"
                     :text="index" class="m-4"
                     @click="setDrones('index', (index))" v-for="index in 5" :key="index">
              </v-btn>
            </v-list-item>
            <!--菲亚梅塔设置-->
            <v-list-item>
              <v-list-item-title>
                <span class="font-bold">{{ translate('schedule', 'schedule.FiammettaSet') }}</span>
              </v-list-item-title>
              <div class="flex align-center justify-space-between">
                <div class="opacity-70">{{ translate('schedule', 'schedule.UseFiammetta') }}</div>
                <v-switch color="success" density="compact" hide-details
                          v-model="plansTemplate[scheduleIndex].Fiammetta.enable"></v-switch>

              </div>

              <div class="opacity-70">{{ translate('schedule', 'schedule.Usage') }}</div>

              <v-btn color="primary"
                     :variant="'pre' === plansTemplate[scheduleIndex].Fiammetta.order?void 0:`tonal`"
                     :text="translate('schedule', 'schedule.PreShift')" class="m-4"
                     @click="setFiammetta('order', 'pre')">
              </v-btn>
              <v-btn color="primary"
                     :variant="'post' === plansTemplate[scheduleIndex].Fiammetta.order?void 0:`tonal`"
                     :text="translate('schedule', 'schedule.PostShift')" class="m-4"
                     @click="setFiammetta('order', 'post')">
              </v-btn>

              <div class="flex align-center ">
                <div class="opacity-70">{{ translate('schedule', 'schedule.RecoveryTarget') }}</div>
                <div class="spacer-12"></div>
                <OperatorAvatar size="50" class="shadow-md" @click="FiammettaTargetVisible=true"
                                :char-id="getCharId(plansTemplate[scheduleIndex].Fiammetta.target)"></OperatorAvatar>
              </div>


            </v-list-item>
            <!--            时间选择器-->
            <v-list-item>
              <v-list-item-title>
                <span class="font-bold">{{ translate('schedule', 'schedule.ShiftRunTime') }}</span>
              </v-list-item-title>
              <el-time-picker v-model="executionTimeList[scheduleIndex][0]" placeholder="Arbitrary time"
                              style="width: 120px"/>
              to
              <el-time-picker v-model="executionTimeList[scheduleIndex][1]" placeholder="Arbitrary time"
                              style="width: 120px"/>
            </v-list-item>

            <v-list-item>
              <!--     控制中枢-->
              <div class="room-template control" :id="`control#0`"
                   @click="openOperatorCheckBoxDialog(scheduleIndex,'control',0)">
                <div class="room-title">{{ translate('schedule', 'schedule.ControlCenter') }}</div>
                <div class="flex justify-center">
                  <OperatorAvatar v-for="(charName, operator) in getRoomOperators(scheduleIndex,'control', 0)"
                                  :key="operator"
                                  :char-id="getCharId(charName)" class="m-4"></OperatorAvatar>
                </div>
              </div>
              <!--    贸易站-->
              <div v-for="(num, tradingIndex) in scheduleTypeV2.trading" :key="tradingIndex"
                   class="room-template trading" :id="`trading#${tradingIndex}`"
                   @click="openOperatorCheckBoxDialog(scheduleIndex,'trading',tradingIndex)">
                <div class="flex flex-wrap align-center justify-center">
                  <div>{{ translate('schedule', 'schedule.TradingPost') }}#{{ num }}</div>
                  <div class="spacer-12"></div>
                  <ItemImage size="36" mobile-size="36"
                             :item-id="getRoomProduct(scheduleIndex,'trading', tradingIndex)"></ItemImage>
                </div>
                <div class="flex justify-center">
                  <OperatorAvatar
                      v-for="(charName, operatorIndex) in getRoomOperators(scheduleIndex,'trading', tradingIndex)"
                      :key="operatorIndex"
                      :char-id="getCharId(charName)" class="m-4"></OperatorAvatar>
                </div>
              </div>

              <!--  制造站-->
              <div v-for="(num, manufactureIndex) in scheduleTypeV2.manufacture" :key="manufactureIndex"
                   class="room-template manufacture" :id="`manufacture#${manufactureIndex}`"
                   @click="openOperatorCheckBoxDialog(scheduleIndex,'manufacture',manufactureIndex)">
                <div class="flex flex-wrap align-center justify-center">
                  <div>{{ translate('schedule', 'schedule.Factory') }}#{{ num }}</div>
                  <div class="spacer-12"></div>
                  <ItemImage :item-id="getRoomProduct(scheduleIndex,'manufacture', manufactureIndex)"></ItemImage>
                </div>
                <div class="flex justify-center">
                  <OperatorAvatar
                      v-for="(charName, operatorIndex) in getRoomOperators(scheduleIndex,'manufacture', manufactureIndex)"
                      :key="operatorIndex"
                      :char-id="getCharId(charName)" class="m-4">
                  </OperatorAvatar>
                </div>
              </div>

            </v-list-item>

            <v-list-item>

            </v-list-item>

            <v-list-item>

            </v-list-item>

          </v-list>
        </v-card>
      </div>
    </div>


    <v-dialog v-model="operatorCheckBoxDialog" max-width="800" class="schedule-dialog">
      <v-card class="m-a">
        <v-card-text>

          <div class="flex flex-wrap" v-for="(conditionType, key) in operatorFilterConditionTable"
               v-show="conditionType.display" :key="key">

            <v-btn :color="conditionType.color" variant="text" class="m-2" :size="buttonSize()">
              {{ translate('schedule', conditionType.name) }}
            </v-btn>
            <v-btn v-for="(condition, index) in conditionType.conditions" :key="index"
                   color="primary" :variant="filterBtnStatus(key, condition.label)" :size="buttonSize()"
                   @click="filterOperatorByTag(condition, key)" class="m-2">
              {{ translate('schedule', condition.label) }}
            </v-btn>
          </div>

          <div class="flex flex-wrap align-center">
            <div>{{ translate('schedule', 'schedule.OperatorsStationed') }}</div>
            <div class="flex m-0-8">
              <OperatorAvatar size="48"
                              v-for="(charId, index) in getRoomOperators(selectedScheduleIndex,selectedRoomType, selectedRoomIndex)"
                              :key="index" :char-id="getCharId(charId)" class="m-4"></OperatorAvatar>
            </div>
          </div>

          <div class="flex flex-wrap">
            <div v-for="(operator, charId) in filterOperatorList" :key="charId"
                 @click="chooseOperator(operator.name)" class="operator-option shadow-md m-4">
              <OperatorAvatar size="48" mobile-size="36" :char-id="charId"></OperatorAvatar>
              <div class="operator-name">{{ operator.name }}</div>
            </div>
          </div>
        </v-card-text>

      </v-card>
    </v-dialog>


    <!--肥鸭的选择弹窗-->
    <v-dialog v-model="FiammettaTargetVisible" max-width="800">
      <v-card  class="m-a">
        <div class="filter-condition-box">
          <div class="condition-bar" v-for="(room, key) in operatorFilterConditionTable"
               v-show="room.display"
               :key="key">
            <v-btn :color="room.color" variant="text" class="m-4"
                   :text="translate('schedule', room.name)">
            </v-btn>
            <v-btn v-for="(condition, index) in room.conditions" :key="index"
                   color="primary" :variant="filterBtnStatus(key, condition.label)"
                   :text="translate('schedule', condition.label)"
                   class="m-4"
                   @click="filterOperatorByTag(condition, key)">
            </v-btn>
          </div>
        </div>

        <div class="operator-check-box-group">
          <div class="operator-check-box-option" v-for="(operator, charId) in filterOperatorList"
               :key="charId"
               @click="setFiammetta('target', operator.name); FiammettaTargetVisible = false">
            <div :class="getOptionAvatar(operator.charId)"></div>
            <div class="operator-check-label">{{ operator.name }}</div>
          </div>
        </div>

      </v-card>
    </v-dialog>
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
  background-color: var(--c-page-background-color);
  box-shadow: 1px 1px 10px var(--c-box-shadow-color);;
}

.schedule-question:hover {
  .schedule-tip {
    display: block;
  }
}
</style>