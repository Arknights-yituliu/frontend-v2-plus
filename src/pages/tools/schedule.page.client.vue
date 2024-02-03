<script setup>
import {onMounted, ref, watch} from "vue"
import buildingApi from '/src/api/building'
import schedule_template_json from '/src/static/json/build/plans_template.json'
import '/src/assets/css/tool/schedule.css'
import '/src/assets/css/sprite/sprite_avatar_6.css'
import '/src/assets/css/sprite/sprite_avatar_5.css'
import '/src/assets/css/sprite/sprite_avatar_4.css'
import character_table from '/src/static/json/survey/character_table_simple.json'
import {cMessage} from '/src/custom/message.js'
import schedule_menu from '/src/static/json/build/schedule_menu.json'
import {getText} from '/src/utils/fileRead'
import {debounce} from "/src/utils/debounce";
import building_table from '/src/static/json/build/building_table.json'
import feedBack from '/src/components/feedBack.vue';
import {operatorFilterConditionTable} from '/src/utils/buildingSkillFilter.js'

const COLOR = {BLUE: 'blue', ORANGE: 'orange', GREEN: 'green'}


let plansTemplate = ref('')
plansTemplate.value = schedule_template_json

let executionTimeList = ref([])
for (let i = 0; i < 7; i++) {
  executionTimeList.value.push({start: new Date(), end: new Date()})
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
    cMessage(room + '-设施类型不存在', 'error')
    return []
  }
  if (!plansTemplate.value[selectedPlanIndex.value].rooms[room][index]) {
    cMessage(index + '-设施内的干员索引越界', 'error')
    return []
  }

  return plansTemplate.value[selectedPlanIndex.value].rooms[room][index].operators
}


let scheduleTypePopupVisible = ref(false)
let scheduleTypePopupStyle = 'width:500px;padding:24px'

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
  if (index < 0 || index >= scheduleTypeV2.value.planTimes) {
    cMessage(`错误的班次索引：第${index + 1}班`, 'error')
  } else {
    selectedPlanIndex.value = index
  }
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
}

let selectBtnKey = ref({})
let filterOperatorList = ref({})


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
  filterOperatorList.value = {}

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
  filterOperatorList.value = {}
  //筛选干员
  commonFilterOperator()
}, 500)

/**
 * 通用的筛选干员逻辑
 */
function commonFilterOperator() {
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
    filterOperatorList.value[operator.charId] = operator
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

const roomPopupStyle = "width:75%"


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

/**
 * 检查房间内是否有同一干员
 * @param charName 干员名称
 * @returns {boolean}
 */
function checkRoomDuplicateOperator(charName) {
  if (plansTemplate.value[selectedPlanIndex.value]
      .rooms[selectedRoomType.value][selectedRoomIndex.value]
      .operators.includes(charName)) {
    cMessage('不要选择同一干员', 'error')
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
    cMessage('当前房间干员数量已达上限', 'error')
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

    cMessage('请勿在同一班次入驻两个同名干员', 'error')
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
      cMessage('当前宿舍使用 “自动补满干员” 和 “指定干员入驻” ,可能会导致后续宿舍指定干预入驻功能异常!', 'warn')
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
      console.log(newVal)
      if (newVal && selectedRoomType.value === 'dormitory') {
        if (plansTemplate.value[selectedPlanIndex.value].rooms
            [selectedRoomType.value][selectedRoomIndex.value].operators.length > 0) {
          cMessage('当前宿舍使用 “自动补满干员” 和 “指定干员入驻” ,可能会导致后续宿舍指定干员入驻功能异常!', 'warn')
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
  const start = executionTime.start.getHours().toString().padStart(2, '0') + ':' + executionTime.start.getMinutes().toString().padStart(2, '0')
  const end = executionTime.end.getHours().toString().padStart(2, '0') + ':' + executionTime.end.getMinutes().toString().padStart(2, '0')


  if (executionTime.start.getHours() > executionTime.end.getHours()) {
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
    scheduleInfo.value.scheduleId = scheduleId.value
    let link = document.createElement('a')
    link.download = `${scheduleId.value}.json`
    link.href = 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(scheduleInfo.value, null, 2))
    link.click()
    link.remove()
    cMessage(`生成的排班文件ID为：${scheduleId.value}`)
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
    const {name, description, Fiammetta, drones, rooms, period} = plan
    plansTemplate.value[index].name = name
    plansTemplate.value[index].description = description

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
      let executionTime = {start: new Date(), end: new Date()}
      if (period.length === 1) {
        if (period[0].length === 2) {
          const start = getHourAndMinute(period[0][0])
          executionTime.start.setHours(start.hour)
          executionTime.start.setMinutes(start.minute)

          const end = getHourAndMinute(period[0][1])
          executionTime.end.setHours(end.hour)
          executionTime.end.setMinutes(end.minute)
        }
      }

      if (period.length === 2) {
        if (period[0].length === 2 && period[1].length === 2) {
          const start = getHourAndMinute(period[0][0])
          executionTime.start.setHours(start.hour)
          executionTime.start.setMinutes(start.minute)

          const end = getHourAndMinute(period[1][1])
          executionTime.end.setHours(end.hour)
          executionTime.end.setMinutes(end.minute)
        }
      }

      executionTimeList.value[index] = executionTime
    }
  }

  function getHourAndMinute(str) {
    if (str.indexOf(":") < 0) {
      cMessage('自动换班时间格式不正确', 'error')
    }
    const strSplit = str.split(":")
    return {
      hour: parseInt(strSplit[0]),
      minute: parseInt(strSplit[1])
    }
  }

}


onMounted(() => {
  filterOperatorByTag(operatorFilterConditionTable.room.conditions[0], 'room')
})

</script>


<template>
  <div class="schedule-header">
    <div class="schedule-header-left">
      <!--      <span class="schedule-header-title">排班生成器</span>-->
    </div>
    <div class="schedule-header-right">
      <c-button @click="scheduleTypePopupVisible = !scheduleTypePopupVisible">选择基建类型</c-button>
      <div>
        <input class="input-base" v-model="scheduleImportId" placeholder=""/>
        <span class="input-desc"></span>
      </div>
      <c-button :color="COLOR.BLUE" @click="importScheduleById()">通过id导入排班</c-button>

      <div class="input-wrap">
        <input class="input-type-file" type="file"
               id="scheduleFile"
               @change="importScheduleByFile()">
        <c-button :color="COLOR.BLUE" :status="true">选择文件导入排班</c-button>
      </div>
      <c-button :color="COLOR.BLUE" :status="true" @click="saveAndDownloadScheduleFile()">保存和导出排班文件</c-button>
      <c-button :color="COLOR.BLUE" :status="true" @click="downloadScheduleFile()">仅导出排班文件</c-button>
      <feed-back/>
    </div>
  </div>

  <span class="schedule-version">V1.2.1</span>

  <c-popup v-model:visible="scheduleTypePopupVisible" :style="scheduleTypePopupStyle">
    <div class="schedule-set-wrap">
      <div class="schedule-set-bar">
        <span>作业名称</span>
        <div><input class="input-base" v-model="scheduleInfo.title"/></div>
      </div>

      <div class="schedule-set-bar">
        <span>描述</span>
        <div><input class="input-base" v-model="scheduleInfo.description"/></div>
      </div>

      <div class="schedule-set-bar">
        <span>作者</span>
        <div><input class="input-base" v-model="scheduleInfo.author"/></div>
      </div>

      <div class="schedule-set-bar">
        <span>基建模式</span>
        <div>
          <c-button :color="COLOR.BLUE" :status="menu.label===selectedScheduleType.label"
                    @click="chooseScheduleType(menu)"
                    v-for="(menu,index) in schedule_menu" :key="index">
            {{ menu.label }}
          </c-button>
        </div>
      </div>

      <div class="schedule-set-bar">
        <span>换班次数</span>
        <div>
          <c-button :color="COLOR.BLUE" :status="num===scheduleTypeV2.planTimes"
                    v-for="(num,index) in 6" :key="index"
                    @click="choosePlanTimes(num)">
            {{ num }}
          </c-button>
        </div>
      </div>
    </div>
  </c-popup>

  <div class="maa-schedule-v2">
    <div class="schedule-set-wrap">
      <div class="schedule-set-bar">
        <span>当前班次</span>
        <div>
          <c-button :color="COLOR.BLUE" :status="index === selectedPlanIndex"
                    v-for="(num,index) in scheduleTypeV2.planTimes" :key="index"
                    @click="currentPlan(index)" class="room_times">
            {{ num }}
          </c-button>
        </div>
        <span>班次名称</span>
        <div><input class="input-base" v-model="plansTemplate[selectedPlanIndex].name"/></div>
        <span>班次描述</span>
        <div><input class="input-base" v-model="plansTemplate[selectedPlanIndex].description"/></div>
      </div>

      <div class="schedule-set-bar-short">

        <span style="width: 140px">是否使用无人机</span>
        <div style="width: 70px">
          <c-switch v-model="plansTemplate[selectedPlanIndex].drones.enable"></c-switch>
        </div>
        <span style="width: 70px">换班前后</span>
        <div style="width: 180px">
          <c-button :color="COLOR.BLUE"
                    :status="'pre' === plansTemplate[selectedPlanIndex].drones.order"
                    @click="setDrones('order','pre')">
            换班前
          </c-button>
          <c-button :color="COLOR.BLUE"
                    :status="'post' === plansTemplate[selectedPlanIndex].drones.order"
                    @click="setDrones('order','post')">
            换班后
          </c-button>
        </div>
        <span>目标房间</span>
        <div style="width: 166px">
          <c-button :color="COLOR.BLUE"
                    :status="'trading' === plansTemplate[selectedPlanIndex].drones.room"
                    @click="setDrones('room','trading')">
            贸易站
          </c-button>
          <c-button :color="COLOR.BLUE"
                    :status="'manufacture' === plansTemplate[selectedPlanIndex].drones.room"
                    @click="setDrones('room','manufacture')">
            制造站
          </c-button>
        </div>
        <span>房间编号</span>
        <div>
          <c-button :color="COLOR.BLUE"
                    :status="(index) === plansTemplate[selectedPlanIndex].drones.index"
                    @click="setDrones('index',(index))"
                    v-for="index in 5" :key="index">
            {{ index }}
          </c-button>
        </div>

      </div>

      <div class="schedule-set-bar-short">
        <span style="width: 140px">是否使用菲亚梅塔</span>
        <div style="width: 70px">
          <c-switch v-model="plansTemplate[selectedPlanIndex].Fiammetta.enable"></c-switch>
        </div>
        <span style="width: 70px">换班前后</span>
        <div style="width: 180px">
          <c-button :color="COLOR.BLUE"
                    :status="'pre' === plansTemplate[selectedPlanIndex].Fiammetta.order"
                    @click="setFiammetta('order','pre')">
            换班前
          </c-button>
          <c-button :color="COLOR.BLUE"
                    :status="'post' === plansTemplate[selectedPlanIndex].Fiammetta.order"
                    @click="setFiammetta('order','post')">
            换班后
          </c-button>
        </div>
        <span>恢复目标</span>
        <div style="width: 180px">
          <!--        <div class="room-avatar-sprite-wrap" @click="Fiammetta_target_visible=true">-->
          <!--          <div :class="getAvatar(plansTemplate[selectedPlanIndex].Fiammetta.target)"></div>-->
          <!--        </div>-->

          <div class="option-avatar-sprite-wrap" @click="FiammettaTargetVisible=true">
            <div :class="getOptionAvatar(plansTemplate[selectedPlanIndex].Fiammetta.target)"></div>
          </div>
        </div>
      </div>

      <div class="schedule-set-bar-short" style="height: 60px;">
        <span class="room-set-description">按顺序入驻</span>
        <c-switch v-model="plansTemplate[selectedPlanIndex].rooms[selectedRoomType][selectedRoomIndex].sort">
        </c-switch>

        <span class="room-set-description">补满空位</span>
        <c-switch
            v-model="plansTemplate[selectedPlanIndex].rooms[selectedRoomType][selectedRoomIndex].autofill">
        </c-switch>
        <i class="iconfont icon-question schedule-question">
          <span class="schedule-tip">使用补满空位功能后，后续的宿舍可能无法使用指定干员功能</span>
        </i>

        <span class="room-set-description">跳过房间</span>
        <c-switch v-model="plansTemplate[selectedPlanIndex].rooms[selectedRoomType][selectedRoomIndex].skip">
        </c-switch>
        <span class="room-set-description">选择产物</span>
        <div class="product-image-wrap" @click="setProduct(product.value)"
             v-for="(product,index) in productTable[selectedRoomType]" :key="index">
          <div :class="getItemSprite(product.id)"></div>
        </div>

        <span class="room-set-description">定时换班</span>
        <c-switch v-model="isPeriod"></c-switch>
        &emsp;*不选择则按班次顺序执行
      </div>

      <div class="schedule-set-bar-short" v-show="isPeriod">
        <div class="execution-time" v-for="(num,index) in scheduleTypeV2.planTimes" :key="index">
          <span>第&nbsp;{{ num }}&nbsp;班</span>
          <c-time-picker v-model="executionTimeList[index]">
          </c-time-picker>
        </div>
      </div>
    </div>

    <c-popup v-model:visible="FiammettaTargetVisible" :style="roomPopupStyle">
      <div class="filter-condition-box">
        <div class="condition-bar" v-for="(room,key) in operatorFilterConditionTable" v-show="room.display" :key="key">
          <span :style="`color:${room.color}`">{{ room.name }}</span>
          <c-button v-for="(condition,index) in room.conditions" :key="index"
                    :color="COLOR.BLUE" :status="filterBtnStatus(key,condition.label)"
                    @click="filterOperatorByTag(condition,key)">
            {{ condition.label }}
          </c-button>
        </div>
      </div>

      <div class="operator-check-box">
        <div class="option-avatar-sprite-wrap"
             v-for="(operator,charId) in filterOperatorList"
             :key="charId" @click="setFiammetta('target',operator.name)">
          <div :class="getOptionAvatar(operator.charId)"></div>
        </div>
      </div>
    </c-popup>


    <div class="room-wrap">
      <div class="room-arrow-wrap"
           @click="toNextPlan(selectedPlanIndex-1)">
        <i class="iconfont icon-arrow-left"
           style="font-size: 48px">
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
        <div class="room-template trading"
             :class="roomSelectedClass('trading',tradingIndex)"
             v-for="(num,tradingIndex) in scheduleTypeV2.trading" :key="tradingIndex"
             @click="chooseRoom('trading',tradingIndex)">
          <div class="room-name">
            <span>贸易站#{{ num }}</span>
            <div :class="getRoomProduct('trading',tradingIndex)"></div>
          </div>
          <div class="settlement_operator">
            <div class="room-avatar-sprite-wrap"
                 v-for="(charName,index) in getRoomOperators('trading',tradingIndex)"
                 :key="index">
              <div :class="getAvatar(charName)"></div>
            </div>
          </div>
        </div>

        <!--  制造站-->
        <div class="room-template manufacture" :class="roomSelectedClass('manufacture',manufactureIndex)"
             v-for="(num,manufactureIndex) in scheduleTypeV2.manufacture"
             :key="manufactureIndex"
             @click="chooseRoom('manufacture',manufactureIndex)">
          <div class="room-name">
            <span>制造站#{{ num }}</span>
            <div :class="getRoomProduct('manufacture',manufactureIndex)"></div>
          </div>
          <div class="settlement_operator">
            <div class="room-avatar-sprite-wrap"
                 v-for="(charName,index) in getRoomOperators('manufacture',manufactureIndex)"
                 :key="index">
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
        <div class="room-template power" :class="roomSelectedClass('power',powerIndex)"
             v-for="(num,powerIndex) in scheduleTypeV2.power" :key="powerIndex"
             @click="chooseRoom('power',powerIndex)">
          <div class="room-name"> 发电站#{{ num }}</div>
          <div class="room-avatar-sprite-wrap"
               v-for="(charName,index) in getRoomOperators('power',powerIndex)"
               :key="index">
            <div :class="getAvatar(charName)"></div>
          </div>
        </div>

        <div class="copy-btn-wrap">
          <span>被复制的班次：#{{ tmpPlanData.index }} 班</span>
          <c-button :color="COLOR.BLUE" :status="true" @click="copyPlan()">复制班次</c-button>
          <c-button :color="COLOR.BLUE" :status="true" @click="pastePlan()">粘贴班次</c-button>
        </div>
      </div>

      <div class="room-wrap-center">
        <!--     控制中枢-->
        <div class="room-template control" :class="roomSelectedClass('control',0)"
             @click="chooseRoom('control',0)">
          <div class="room-name"> 控制中枢</div>
          <div class="room-avatar-sprite-wrap"
               v-for="(charName,index) in getRoomOperators('control',0)"
               :key="index">
            <div :class="getAvatar(charName)"></div>

          </div>
        </div>
        <!--     宿舍-->
        <div class="room-template dormitory" :class="roomSelectedClass('dormitory',dormitoryIndex)"
             v-for="(num,dormitoryIndex) in scheduleTypeV2.dormitory" :key="dormitoryIndex"
             @click="chooseRoom('dormitory',dormitoryIndex)">
          <div class="room-name"> 宿舍#{{ num }}</div>
          <div class="room-avatar-sprite-wrap"
               v-for="(charName,index) in getRoomOperators('dormitory',dormitoryIndex)"
               :key="index">
            <div :class="getAvatar(charName)"></div>
          </div>
        </div>
      </div>


      <div class="room-wrap-right">
        <div class="room-template blank" style="width: 100px;"></div>
        <!--     会客室-->
        <div class="room-template meeting" :class="roomSelectedClass('meeting',0)"
             @click="chooseRoom('meeting',0)">
          <div class="room-name">会客室</div>
          <div class="room-avatar-sprite-wrap"
               v-for="(charName,index) in getRoomOperators('meeting',0)" :key="index">
            <div :class="getAvatar(charName)"></div>

          </div>
        </div>
        <!--      加工站-->
        <div class="room-template processing" :class="roomSelectedClass('processing',0)"
             @click="chooseRoom('processing',0)">
          <div class="room-name">加工站</div>
          <div class="room-avatar-sprite-wrap"
               v-for="(charName,index) in getRoomOperators('processing',0)"
               :key="index">
            <div :class="getAvatar(charName)"></div>
          </div>
        </div>

        <!--     办公室 -->
        <div class="room-template hire" :class="roomSelectedClass('hire',0)"
             @click="chooseRoom('hire',0)">
          <div class="room-name">办公室</div>
          <div class="room-avatar-sprite-wrap"
               v-for="(charName,index) in getRoomOperators('hire',0)" :key="index">
            <div :class="getAvatar(charName)"></div>
          </div>
        </div>

        <div class="room-template blank" style="width: 100px;"></div>
      </div>

      <div class="room-arrow-wrap" @click="toNextPlan(selectedPlanIndex+1)"><i
          class="iconfont icon-arrow-right" style="font-size: 48px"></i></div>
    </div>


    <div></div>


    <div class="room-set-wrap">
      <!--      <div class="room-set">-->
      <!--        <span style="font-size: 18px;font-weight: 600;">-->
      <!--          第{{ selectedPlanIndex + 1 }}班 —-->
      <!--        {{ getRoomLabel(selectedRoomType) }}#{{ selectedRoomIndex + 1 }}的房间入驻设置-->
      <!--        </span>-->
      <!--      </div>-->


      <div class="room-set">
        <span class="room-set-description">入驻的干员</span>
        <div class="selected-operator-wrap">
          <div class="room-avatar-sprite-wrap"
               v-for="(charId,index) in getRoomOperators(selectedRoomType,selectedRoomIndex)" :key="index">
            <div :class="getAvatar(charId)"></div>
            <i class="iconfont icon-error operator-delete-icon" @click="deleteOperator(charId)">
            </i>
          </div>
        </div>
        <c-button :color="COLOR.BLUE" :status="true" @click="pasteOperatorList()">粘贴</c-button>
        <c-button :color="COLOR.BLUE" :status="true" @click="copyOperatorList()">复制</c-button>
        <span class="room-set-description">复制的干员</span>
        <div class="selected-operator-wrap">
          <div class="room-avatar-sprite-wrap"
               v-for="(charId,index) in tmpOperatorList"
               :key="index">
            <div :class="getAvatar(charId)"></div>
          </div>
        </div>
      </div>

      <div class="filter-condition-box">
        <div class="condition-bar" v-for="(condition,key) in operatorFilterConditionTable" v-show="condition.display"
             :key="key">
          <span :style="`color:${condition.color}`">{{ condition.name }}</span>
          <c-button v-for="(condition,index) in condition.conditions" :key="index"
                    :color="COLOR.BLUE" :status="filterBtnStatus(key,condition.label)"
                    @click="filterOperatorByTag(condition,key)">
            {{ condition.label }}
          </c-button>
        </div>
        <span class="condition-tip">*开发精力加水平有限，如有遗漏，请反馈或直接GitHub提交修改</span>
      </div>

      <div class="schedule-operator-search-input-box">
        <div class="input-group">
          <input class="input-base" id="input-id" style="width:500px" @input="searchOperatorDebounce()"
                 v-model="searchInputText">
          <span class="input-group-text">输入干员名、技能名称、技能描述搜索</span>
        </div>
      </div>
      <div class="operator-check-box">
        <div class="option-avatar-sprite-wrap"
             v-for="(operator,charId) in filterOperatorList"
             :key="charId" @click="chooseOperator(operator.name)">
          <div :class="getOptionAvatar(operator.charId)" class="option-avatar-sprite"></div>
          <div class="option-operator-name">{{ operator.name }}</div>
        </div>
      </div>
    </div>
  </div>

</template>


<style scoped>
.btn {
  margin: 2px;
  min-width: 0;
}

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
  box-shadow: var(--c-box-shadow);
}

.schedule-question:hover {
  .schedule-tip {
    display: block;
  }
}

</style>