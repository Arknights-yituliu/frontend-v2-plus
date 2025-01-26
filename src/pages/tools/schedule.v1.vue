<script setup>
import {onMounted, ref, watch} from "vue"
import '/src/assets/css/tool/schedule.v2.css'
import '/src/assets/css/information/building_skill_font_color.css'
import SCHEDULE_TEMPLATE from '/src/static/json/build/plans_template.json'
import {operatorTable} from "/src/utils/gameData.js";
import SCHEDULE_MENU from '/src/static/json/build/schedule_menu.json'
import BUILDING_TABLE from '/src/static/json/build/building_table.json'
import buildingApi from '/src/api/building.js'
import operatorDataAPI from '/src/api/operatorData.js'
import {operatorFilterConditionTable} from '/src/utils/buildingSkillFilter.js'
import {translate} from '/src/utils/i18n.js'
import {getText} from '/src/utils/fileConversion.js'
import {debounce} from "/src/utils/debounce.js";
import {cMessage} from '/src/utils/message.js'
import OperatorAvatar from "/src/components/sprite/OperatorAvatar.vue";
import {downloadJsonFile} from "/src/utils/download.js";
import {useDisplay} from 'vuetify'
import { useRouter } from 'vue-router';


const router = useRouter();

const {mobile} = useDisplay()

let operatorFilterConditionList = []

for (const label in operatorFilterConditionTable) {
  let {conditions,name} = operatorFilterConditionTable[label]

  for (const condition of conditions) {
    condition.type = name
    operatorFilterConditionList.push(condition)
  }


}

import ItemImage from "@/components/sprite/ItemImage.vue";
import BuildingFactory from "@/components/tools/BuildingFactory.vue";
import deepClone from "@/utils/deepClone.js";

let operatorOwnMap = new Map()

function buttonSize() {
  if (mobile.value) {
    return 'small'
  }
}



async function getOperatorDataByAccount() {
  operatorDataAPI.getOperatorData().then(response => {
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

for (const key in operatorTable) {
  characterIdAndName[operatorTable[key].name] = replaceCharId(key)
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


}

let selectBtnKey = ref({})
let displayOperatorList = ref([])
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

// const intervalId = setInterval(() => {
//   console.log(filterCondition.value);
// }, 1000); // 1000毫秒=1秒

/**
 * 筛选干员
 * @param condition
 * @param key 选项的分类名
 */
function filterOperatorByTag(condition, key) {
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
}


//干员搜索输入框输入内容
let searchInputText = ref('')

/**
 * 根据输入的名称和技能描述搜索干员
 */
const searchOperatorDebounce = debounce(() => {
  //筛选干员
  commonFilterOperator()
}, 500)

watch(()=>commonFilterOperator(),()=>{
  commonFilterOperator()
})

/**
 * 通用的筛选干员逻辑
 */
function commonFilterOperator() {
  //清空干员列表
  displayOperatorList.value = []
  let charIdObj = {}
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


    const {charId,name} = operator
    if(!charIdObj[charId]) {
      displayOperatorList.value.push({charId:charId,name:name})
      charIdObj[charId] = charId
    }



  }
  console.log(displayOperatorList.value)
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


  if (!checkPlanDuplicateOperator(selectedScheduleIndex.value, charName, true)) {
    return;
  }


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
 * @param {string} charName 干员名称
 */
function deleteOperator(charName) {

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
  FiammettaTargetVisible.value = false
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



onMounted(() => {
  filterOperatorByTag(operatorFilterConditionTable.room.conditions[0], 'room')

  getOperatorDataByAccount()
})

function useNewUI(){
  router.push({name:'ScheduleV2'})
}

</script>


<template>

  <div class="schedule-v2-page">

    <div>
      <!--选择基建布局和换班次数-->
      <v-btn color="red"  class="m-2"
             @click="scheduleTypePopupVisible = !scheduleTypePopupVisible">
        {{ translate('schedule', 'schedule.InfrastructureLayout') }}
      </v-btn>
      <v-btn color="orange"  class="m-2"
             @click="useNewUI()" text="切换到新版UI">
      </v-btn>
      <input type="file" id="scheduleFile" hidden @change="importScheduleByFile()">
      <!--根据文件导入排版-->
      <v-btn color="primary"  class="m-2" @click="chooseFile()">{{
          translate('schedule', 'schedule.ImportScheduleFile')
        }}
      </v-btn>
      <!--下载排版文件-->
      <v-btn color="primary"  class="m-2" @click="saveAndDownloadScheduleFile()">
        {{ translate('schedule', 'schedule.DownloadScheduleFile') }}
      </v-btn>

      <!--操作指引-->
      <v-btn color="primary"  class="m-2" @click="guidePopup = true">
        {{ translate('schedule', 'schedule.GuidePopup') }}
      </v-btn>
    </div>



    <!--输入排班id-->
    <v-text-field density="compact" variant="outlined" hide-details
                  :label="translate('schedule', 'schedule.IdPlaceholder')"
                  v-model="scheduleImportId">
      <template v-slot:append>
        <!--根据id导入排班-->
        <v-btn color="primary"  class="m-2" @click="importScheduleById()">
          {{ translate('schedule', 'schedule.ImportScheduleById') }}
        </v-btn>
      </template>
    </v-text-field>



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
            <!--  时间选择器-->
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
              <!--中枢-->
              <BuildingFactory :room-index="0"
                               room-type="control"
                               :operators="getRoomOperators(scheduleIndex,'control', 0)"
                               :product="getRoomProduct(scheduleIndex,'control', 0)"
                               @click="openOperatorCheckBoxDialog(scheduleIndex,'control',0)">
              </BuildingFactory>
              <!--贸易站-->
              <BuildingFactory v-for="(num, tradingIndex) in scheduleTypeV2.trading" :key="tradingIndex"
                               :room-index="num"
                               room-type="trading"
                               :operators="getRoomOperators(scheduleIndex,'trading', tradingIndex)"
                               :product="getRoomProduct(scheduleIndex,'trading', tradingIndex)"
                               @click="openOperatorCheckBoxDialog(scheduleIndex,'trading',tradingIndex)">
              </BuildingFactory>
              <!--制造站-->
              <BuildingFactory v-for="(num, manufactureIndex) in scheduleTypeV2.manufacture" :key="manufactureIndex"
                               :room-index="num"
                               room-type="manufacture"
                               :operators="getRoomOperators(scheduleIndex,'manufacture', manufactureIndex)"
                               :product="getRoomProduct(scheduleIndex,'manufacture', manufactureIndex)"
                               @click="openOperatorCheckBoxDialog(scheduleIndex,'manufacture',manufactureIndex)">
              </BuildingFactory>
              <!--发电站-->
              <BuildingFactory v-for="(num, powerIndex) in scheduleTypeV2.power" :key="powerIndex"
                               :room-index="num"
                               room-type="power"
                               :operators="getRoomOperators(scheduleIndex,'power', powerIndex)"
                               :product="getRoomProduct(scheduleIndex,'power', powerIndex)"
                               @click="openOperatorCheckBoxDialog(scheduleIndex,'power',powerIndex)">
              </BuildingFactory>
              <!--会客室-->
              <BuildingFactory :room-index="0"
                               room-type="meeting"
                               :operators="getRoomOperators(scheduleIndex,'meeting', 0)"
                               :product="getRoomProduct(scheduleIndex,'meeting', 0)"
                               @click="openOperatorCheckBoxDialog(scheduleIndex,'meeting',0)">
              </BuildingFactory>
              <!--加工站-->
              <BuildingFactory :room-index="0"
                               room-type="processing"
                               :operators="getRoomOperators(scheduleIndex,'processing', 0)"
                               :product="getRoomProduct(scheduleIndex,'processing', 0)"
                               @click="openOperatorCheckBoxDialog(scheduleIndex,'processing',0)">
              </BuildingFactory>
              <!--办公室-->
              <BuildingFactory :room-index="0"
                               room-type="hire"
                               :operators="getRoomOperators(scheduleIndex,'hire', 0)"
                               :product="getRoomProduct(scheduleIndex,'hire', 0)"
                               @click="openOperatorCheckBoxDialog(scheduleIndex,'hire',0)">
              </BuildingFactory>
              <!--宿舍-->
              <BuildingFactory v-for="(num, dormitoryIndex) in scheduleTypeV2.dormitory" :key="dormitoryIndex"
                               :room-index="num"
                               room-type="dormitory"
                               :operators="getRoomOperators(scheduleIndex,'dormitory', dormitoryIndex)"
                               :product="getRoomProduct(scheduleIndex,'dormitory', dormitoryIndex)"
                               @click="openOperatorCheckBoxDialog(scheduleIndex,'dormitory',dormitoryIndex)">
              </BuildingFactory>
            </v-list-item>
          </v-list>
        </v-card>
      </div>
    </div>

    <!--    点击房间后弹出的房间设置弹窗-->
    <v-dialog v-model="operatorCheckBoxDialog" max-width="800" class="schedule-dialog">
      <v-card class="m-a">
        <v-card-text>
          <div class="flex align-center justify-space-between" style="width: 300px">
            <!--按顺序入驻-->
            <span class="room-set-label">{{ translate('schedule', 'schedule.OrderedStationing') }}</span>
            <v-switch color="success" density="compact" hide-details
                      v-model="plansTemplate[selectedScheduleIndex].rooms[selectedRoomType][selectedRoomIndex].sort">
            </v-switch>

            <!--补满空位-->
            <span class="room-set-label">{{ translate('schedule', 'schedule.Autofill') }}</span>
            <v-switch color="success" density="compact" hide-details
                      v-model="plansTemplate[selectedScheduleIndex].rooms[selectedRoomType][selectedRoomIndex].autofill">
            </v-switch>

            <!--跳过房间-->
            <span class="room-set-label">{{ translate('schedule', 'schedule.SkipRoom') }}</span>
            <v-switch color="success" density="compact" hide-details
                      v-model="plansTemplate[selectedScheduleIndex].rooms[selectedRoomType][selectedRoomIndex].skip">
            </v-switch>
          </div>

          <span class="room-set-label"
                v-show="productTable[selectedRoomType]">{{ translate('schedule', 'schedule.ProductSelection') }}</span>
          <div class="flex align-center">
            <ItemImage v-for="(product, index) in productTable[selectedRoomType]" :key="index"
                       :item-id="product.id"
                       @click="setProduct(product.value)"></ItemImage>
          </div>

          <!--房间入驻干员-->
          <span class="room-set-label">{{ translate('schedule', 'schedule.OperatorsStationed') }}</span>
          <div class="flex m-0-8">
            <div class="selected-operator"
                 v-for="(charName, index) in getRoomOperators(selectedScheduleIndex,selectedRoomType, selectedRoomIndex)"
                 :key="index">
              <OperatorAvatar size="60" mobile-size="32" @click="deleteOperator(charName)"
                              :char-id="getCharId(charName)" class="m-4"></OperatorAvatar>
              <v-icon icon="mdi-close" class="selected-operator-icon-close" @click="deleteOperator(charName)"></v-icon>
            </div>
          </div>




          <!--筛选条件-->
          <span class="room-set-label">{{ translate('schedule', 'schedule.FilterCondition') }}</span>
          <v-select :items="operatorFilterConditionList"
                    v-model="filterCondition"
                    variant="outlined"
                    color="primary">
            <template v-slot:selection="{ item, index }">
              <!--              {{item}}-->
              <span>{{`${translate('schedule', item.raw.type)}—${translate('schedule', item.raw.label)}`}}</span>
            </template>
            <template v-slot:item="{ props, item }">
              <v-list-item v-bind="props"
                           :title="`${translate('schedule', item.raw.type)}—${translate('schedule', item.raw.label)}`">
              </v-list-item>
            </template>
          </v-select>

<!--          <div class="flex flex-wrap" v-for="(conditionType, key) in operatorFilterConditionTable"-->
<!--               v-show="conditionType.display" :key="key">-->
<!--            <v-btn :color="conditionType.color" variant="text" class="m-2" :size="buttonSize()">-->
<!--              {{ translate('schedule', conditionType.name) }}-->
<!--            </v-btn>-->
<!--            <v-btn v-for="(condition, index) in conditionType.conditions" :key="index"-->
<!--                   color="primary" :variant="filterBtnStatus(key, condition.label)" :size="buttonSize()"-->
<!--                   @click="filterOperatorByTag(condition, key)" class="m-2">-->
<!--              {{ translate('schedule', condition.label) }}-->
<!--            </v-btn>-->
<!--          </div>-->

          <!--待选干员-->
          <span class="room-set-label">{{ translate('schedule', 'schedule.AvailableCharacter') }}</span>
<!--          <v-select :label="translate('schedule', 'schedule.FilterCondition')"-->
<!--                    :items="displayOperatorList" chips multiple>-->
<!--            <template v-slot:chip>-->
<!--              <v-chip v-for="(charName, index) in getRoomOperators(selectedScheduleIndex,selectedRoomType, selectedRoomIndex)">-->
<!--                <template v-slot:prepend>-->
<!--                  <OperatorAvatar size="28" mobile-size="28" rounded :char-id="getCharId(charName)"></OperatorAvatar>-->
<!--                </template>-->
<!--              </v-chip>-->
<!--            </template>-->
<!--            <template v-slot:item="{ props, item }" >-->
<!--              <v-list-item v-bind="props" :title=" item.raw.name" @click="chooseOperator(item.raw.name)">-->
<!--                <template v-slot:prepend>-->
<!--                  <OperatorAvatar size="28" mobile-size="28" rounded :char-id="item.raw.charId"></OperatorAvatar>-->
<!--                </template>-->
<!--              </v-list-item>-->
<!--            </template>-->
<!--          </v-select>-->
          <div class="flex flex-wrap">
            <v-btn v-for="(operator, charId) in displayOperatorList" :key="charId"
                   @click="chooseOperator(operator.name)"
                   :text="operator.name" variant="tonal" color="primary" class="m-2">
              <template v-slot:prepend>
                <OperatorAvatar size="28" mobile-size="30" rounded :char-id="operator.charId"></OperatorAvatar>
              </template>
            </v-btn>
          </div>
        </v-card-text>

      </v-card>
    </v-dialog>


    <!--肥鸭的选择弹窗-->
    <v-dialog v-model="FiammettaTargetVisible" max-width="800">
      <v-card class="m-a">
        <!--筛选条件-->
        <span class="room-set-label">{{ translate('schedule', 'schedule.FilterCondition') }}</span>
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

        <!--待选干员-->
        <span class="room-set-label">{{ translate('schedule', 'schedule.AvailableCharacter') }}</span>
        <div class="flex flex-wrap">
          <v-btn v-for="(operator, charId) in displayOperatorList" :key="charId"
                 @click="setFiammetta('target', operator.name)"
                 :text="operator.name" variant="tonal" color="primary" class="m-2">
            <template v-slot:prepend>
              <OperatorAvatar size="28" mobile-size="30" rounded :char-id="charId"></OperatorAvatar>
            </template>
          </v-btn>
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