<script setup>
import {onMounted, ref} from "vue"
import schedule_template_json from '/src/static/json/build/plans_template.json'
import '/src/assets/css/tool/schedule.css'
import '/src/assets/css/sprite/sprite_avatar_6.css'
import '/src/assets/css/sprite/sprite_avatar_5.css'
import '/src/assets/css/sprite/sprite_avatar_4.css'
import building_data from '/src/static/json/build/buildingData.json'
import {cMessage} from '/src/custom/message.js'
import schedule_menu from '/src/static/json/build/schedule_menu.json'
// import plan from '/src/pages/tools/plans_template.js'

let plansTemplate = ref(schedule_template_json)

let executionTimeList = ref([])
for (let i = 0; i < 7; i++) {
  executionTimeList.value.push({start: new Date(), end: new Date()})
}

let isPeriod = ref(false)

let indexList = [0, 1, 2, 3, 4, 5, 6];

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

function getRoomLabel(type) {
  for (const room of roomTypeMenu) {
    if (room.value === type) {
      return room.label
    }
  }
}


let characterIdAndName = {}
for (const key in building_data) {
  const obj = building_data[key]
  for (const id in obj) {
    characterIdAndName[obj[id]] = id
  }
}

let selectedScheduleType = ref(schedule_menu[0])


let scheduleTypeV2 = ref({
  planTimes: 3,
  trading: 2,
  manufacture: 4,
  power: 3,
  dormitory: 4,
})

function getRoomOperators(room, index) {
  if (!plansTemplate.value[selectedPlanIndex.value]) {
    cMessage(index + '-班次索引越界', 'error')
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


function choosePlanTimes(num) {
  scheduleTypeV2.value.planTimes = num
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

function getAvatar(name) {
  name = characterIdAndName[name]
  return `bg-${name} room-avatar-sprite`
}

function getItemSprite(name) {
  return `bg-${name} product-image`
}

//控制选择房间内干员的弹窗展开的属性
let room_visible = ref(false)
let popup_room_type = ref('trading')
//第几次换班
let selectedPlanIndex = ref(0)
//房间类型
let selected_room_type = ref('trading')
//房间序号
let selected_room_index = ref(0)

/**
 * 选择当前班次
 * @param index 班次（班次1为0,以此类推)
 */
function currentPlan(index) {
  selectedPlanIndex.value = index
}


console.log(plansTemplate.value[selectedPlanIndex.value].name)


/**
 * 打开入驻干员的弹窗
 * @param type 房间类型
 * @param index 房间编号
 */
function openPopup(type, index) {
  selected_room_type.value = type
  selected_room_index.value = index
  room_visible.value = true

  if ('trading' === type || 'manufacture' === type) {
    selected_product.value = getItemIdByProductName(plansTemplate.value[selectedPlanIndex.value]
        .rooms[selected_room_type.value][selected_room_index.value].product)
  }

}


const roomPopupStyle = "width:1000px"

/**
 * 选择该房间入驻干员
 * @param operator_id 干员id
 */
function chooseOperator(operator_id) {
  if (plansTemplate.value[selectedPlanIndex.value]
      .rooms[selected_room_type.value][selected_room_index.value]
      .operators.includes(operator_id)) {
    cMessage('不要选择同一干员')
    return;
  }

  if (plansTemplate.value[selectedPlanIndex.value]
      .rooms[selected_room_type.value][selected_room_index.value]
      .operators.length >= roomSettlementOperatorMaxQuantity[selected_room_type.value]) {
    cMessage('当前房间干员数量已达上限')
    return;
  }

  plansTemplate.value[selectedPlanIndex.value].rooms[selected_room_type.value][selected_room_index.value].operators.push(operator_id)

  localStorage.setItem("ScheduleCache", JSON.stringify(plansTemplate.value))
}

/**
 * 删除该房间中选中的干员
 * @param operator_id 干员id
 */
function deleteOperator(operator_id) {

  plansTemplate.value[selectedPlanIndex.value].rooms[selected_room_type.value][selected_room_index.value].operators =
      plansTemplate.value[selectedPlanIndex.value].rooms[selected_room_type.value][selected_room_index.value].operators.filter(e => {
        return e !== operator_id
      })

  localStorage.setItem("ScheduleCache", JSON.stringify(plansTemplate.value))
}

let selected_product = ref("")

function setProduct(product) {
  plansTemplate.value[selectedPlanIndex.value].rooms[selected_room_type.value][selected_room_index.value].product = product
  selected_product.value = getItemIdByProductName(plansTemplate.value[selectedPlanIndex.value]
      .rooms[selected_room_type.value][selected_room_index.value].product)
}

function getItemIdByProductName(label) {
  if (label === "LMD") return "4001";
  if (label === "Orundum") return "4003";
  if (label === "Battle Record") return "2003";
  if (label === "Pure Gold") return "3003";
  if (label === "Originium Shard") return "3141";
}

/**
 * 写入无人机使用设置
 * @param property 无人机设置参数 如enable等
 * @param value 参数值
 */
function setDrones(property, value) {
  plansTemplate.value[selectedPlanIndex.value].drones[property] = value
  localStorage.setItem("ScheduleCache", JSON.stringify(plansTemplate.value))
}


let Fiammetta_target_visible = ref(false)

/**
 * 写入菲亚梅塔使用设置
 * @param property 无人机设置参数 如enable等
 * @param value 参数值
 */
function setFiammetta(property, value) {
  plansTemplate.value[selectedPlanIndex.value].Fiammetta[property] = value
  localStorage.setItem("ScheduleCache", JSON.stringify(plansTemplate.value))
}

let scheduleInfo = ref({
  "author": "一图流",
  "description": "这是个顶配243排班协议演示",
  "id": 1702203342688921,
  "title": "243极限",
  "buildingType": selectedScheduleType.value.label,
  "planTimes": `${scheduleTypeV2.value.planTimes}班`,
  "plans": [],
  "scheduleType": scheduleTypeV2.value,

})

function getPeriod(index) {
  const executionTime = executionTimeList.value[index]
  const start = executionTime.start.getHours().toString().padStart(2, '0') + ':' + executionTime.start.getMinutes().toString().padStart(2, '0')
  const end = executionTime.end.getHours().toString().padStart(2, '0') + ':' + executionTime.end.getMinutes().toString().padStart(2, '0')
  if (executionTime.start > executionTime.end) {
    return [[start, '23:59'], ['00:00', end]]
  }

  return [[start, end]]
}

/**
 * 创建排班文件
 */
function createScheduleJsonFile() {

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
      }
    }
    if (isPeriod.value) {
      plan.period = getPeriod(i)
    }
    plans.push(plan)
  }

  scheduleInfo.value.plans = plans

  console.log(JSON.stringify(scheduleInfo.value))

  localStorage.setItem("ScheduleCache", JSON.stringify(plansTemplate.value))

  let link = document.createElement('a')
  link.download = `测试排班.json`
  link.href = 'data:text/plain,' + JSON.stringify(scheduleInfo.value)
  link.click()
}

let importFileId = ref('')

function importScheduleById() {

}

let importFileContent = ref('')

function importScheduleByFile() {
  console.log(importFileContent.value)
  let schedule = ''
  try {
    schedule = JSON.parse(importFileContent.value)
  } catch (e) {
    return  cMessage(e.toString(),'error')
  }
  console.log(schedule)
  importSchedule(schedule)
}

function importSchedule(schedule) {
  const {
    author,
    description,
    id,
    title,
    buildingType,
    planTimes,
    plans,
    scheduleType
  } = schedule


  scheduleInfo.value = {
    "author": author,
    "description": description,
    "id": id,
    "title": title,
    "buildingType": buildingType,
    "planTimes": planTimes,
    "plans": [],
  }

  for (const property in scheduleType) {
    scheduleTypeV2.value[property] = scheduleType[property]
  }


  for (const index in plans) {
    const plan = plans[index]
    const {name, description, Fiammetta, drones, rooms} = plan
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
              plansTemplate.value[index].rooms[roomType][roomIndex][property] = room[property]
          }
        }
      }
    }

  }

}

// const ScheduleCache = localStorage.getItem("ScheduleCache");
// if (ScheduleCache) plans_template.value = JSON.parse(ScheduleCache)


onMounted(() => {

})

</script>


<template>
  <div class="schedule-header">
    <div class="schedule-header-left">
      <!--      <span class="schedule-header-title">排班生成器</span>-->
    </div>
    <div class="schedule-header-right">
      <span class="btn-desc">通过id导入排班文件</span>
      <input class="input-base" v-model="importFileId" placeholder="id为文件名，文件内也可找到id"/>
      <c-button :color="'blue'" @click="importScheduleById()">导入排班</c-button>
      <span class="btn-desc">通过排班文件导入排班</span>
      <input class="input-base" v-model="importFileContent" placeholder="将排班文件内容复制输入"/>
      <c-button :color="'blue'" @click="importScheduleByFile()">导入排班</c-button>
      <c-button :color="'blue'">保存排班文件</c-button>
      <c-button :color="'blue'" @click="createScheduleJsonFile()">导出排班文件</c-button>
    </div>

  </div>
  <div class="maa-schedule-v2">
    <div class="schedule-set-wrap">
      <div class="schedule-set-card">
        <div class="schedule-set-card-header">基建类型</div>
        <div class="schedule-set-card-body">
          <div class="schedule-set-option">
            <span>基建模式</span>
            <c-button :color="'blue'" :status="menu.label===selectedScheduleType.label"
                      @click="chooseScheduleType(menu)"
                      v-for="(menu,index) in schedule_menu" :key="index">
              {{ menu.label }}
            </c-button>
          </div>
          <div class="schedule-set-option">
            <span>换班次数</span>
            <c-button :color="'blue'" :status="num===scheduleTypeV2.planTimes"
                      v-for="(num,index) in 7" :key="index"
                      @click="choosePlanTimes(num)">
              {{ num }}
            </c-button>
          </div>
          <div class="schedule-set-option">
            <span>当前班次</span>
            <c-button :color="'blue'" :status="index === selectedPlanIndex"
                      v-for="(num,index) in scheduleTypeV2.planTimes" :key="index"
                      @click="currentPlan(index)" class="room_times">
              {{ num }}
            </c-button>
          </div>
          <div class="schedule-set-option">
            <span>是否启用定时换班</span>
            <c-switch v-model="isPeriod"></c-switch>
            &emsp;*不启用则按班次顺序执行
          </div>
          <div class="schedule-set-option">
            <span>班次名称</span>
            <input class="input-base" v-model="plansTemplate[selectedPlanIndex].name"/>
          </div>
          <div class="schedule-set-option">
            <span>班次描述</span>
            <input class="input-base" v-model="plansTemplate[selectedPlanIndex].description"/>
          </div>
        </div>
      </div>

      <div class="schedule-set-card" v-show="isPeriod">
        <div class="schedule-set-card-header">换班时间</div>
        <div class="schedule-set-card-body">
          <div class="execution-time-wrap">
            <div class="execution-time" v-for="(num,index) in scheduleTypeV2.planTimes" :key="index">
              <span>第&nbsp;{{ num }}&nbsp;班</span>
              <c-time-picker v-model="executionTimeList[index]">
              </c-time-picker>
            </div>
          </div>
        </div>
      </div>

      <div class="schedule-set-card">
        <div class="schedule-set-card-header">无人机使用设置</div>
        <div class="schedule-set-card-body">
          <div class="schedule-set-option">
            <span>第{{ selectedPlanIndex + 1 }}班是否使用无人机</span>
            <c-switch v-model="plansTemplate[selectedPlanIndex].drones.enable"></c-switch>
          </div>

          <div class="schedule-set-option">
            <span>目标房间</span>
            <c-button :color="'blue'"
                      :status="'trading' === plansTemplate[selectedPlanIndex].drones.room"
                      @click="setDrones('room','trading')">
              贸易站
            </c-button>
            <c-button :color="'blue'"
                      :status="'manufacture' === plansTemplate[selectedPlanIndex].drones.room"
                      @click="setDrones('room','manufacture')">
              制造站
            </c-button>
          </div>
          <div class="schedule-set-option">
            <span>房间编号</span>
            <c-button :color="'blue'"
                      :status="(index+1) === plansTemplate[selectedPlanIndex].drones.index"
                      @click="setDrones('index',(index+1))"
                      v-for="index in indexList.slice(0,5)" :key="index">
              {{ index + 1 }}
            </c-button>
          </div>

          <div class="schedule-set-option">
            <span>换班前后</span>
            <c-button :color="'blue'"
                      :status="'pre' === plansTemplate[selectedPlanIndex].drones.order"
                      @click="setDrones('order','pre')">
              换班前
            </c-button>
            <c-button :color="'blue'"
                      :status="'post' === plansTemplate[selectedPlanIndex].drones.order"
                      @click="setDrones('order','post')">
              换班后
            </c-button>
          </div>
        </div>
      </div>

      <div class="schedule-set-card">
        <div class="schedule-set-card-header">菲亚梅塔设置</div>
        <div class="schedule-set-card-body">
          <div class="schedule-set-option">
            <span>第{{ selectedPlanIndex + 1 }}班是否使用菲亚梅塔</span>
            <c-switch v-model="plansTemplate[selectedPlanIndex].Fiammetta.enable"></c-switch>
          </div>

          <div class="schedule-set-option">
            <span>恢复目标</span>
            <div class="room-avatar-sprite-wrap" @click="Fiammetta_target_visible=true">
              <div :class="getAvatar(plansTemplate[selectedPlanIndex].Fiammetta.target)"></div>
            </div>
          </div>

          <div class="schedule-set-option">
            <span>换班前后</span>
            <c-button :color="'blue'"
                      :status="'pre' === plansTemplate[selectedPlanIndex].Fiammetta.order"
                      @click="setFiammetta('order','pre')">
              换班前
            </c-button>
            <c-button :color="'blue'"
                      :status="'post' === plansTemplate[selectedPlanIndex].Fiammetta.order"
                      @click="setFiammetta('order','post')">
              换班后
            </c-button>
          </div>
        </div>
      </div>

      <div class="schedule-set-card">
        <div class="schedule-set-card-header">排班表信息</div>
        <div class="schedule-set-card-body">
          <div class="schedule-set-option">
            <span>作业名称&emsp;&emsp;</span>
            <input class="input-base" v-model="scheduleInfo.title"/>
          </div>
          <div class="schedule-set-option">
            <span>描述（选填）</span>
            <input class="input-base" v-model="scheduleInfo.description"/>
          </div>
          <div class="schedule-set-option">
            <span>作者（选填）</span>
            <input class="input-base" v-model="scheduleInfo.author"/>
          </div>
        </div>
      </div>
    </div>


    <c-popup v-model:visible="Fiammetta_target_visible" :style="roomPopupStyle">
      <c-button v-for="(menu,index) in roomTypeMenu" :key="index"
                :color="'blue'" :status="menu.value === popup_room_type"
                @click="popup_room_type=menu.value">
        {{ menu.label }}
      </c-button>
      <div class="operator-check-box">
        <div class="room-avatar-sprite-wrap"
             v-for="(name,charId) in building_data[popup_room_type]"
             :key="charId" @click="setFiammetta('target',name)">
          <div :class="getAvatar(name)"></div>
        </div>
      </div>
    </c-popup>

    <div class="room-wrap">
      <!--  左边站点-->
      <div class="room-wrap-left">
        <div class="room-template blank" style="width: 180px;" v-for="index in 3" :key="index"></div>
        <!--    贸易站-->
        <div class="room-template trading"
             v-for="(num,tradingIndex) in scheduleTypeV2.trading" :key="tradingIndex"
             @click="openPopup('trading',tradingIndex)">
          <div class="room-name">
            <span>贸易站#{{ num }}</span>
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
        <div class="room-template manufacture"
             v-for="(num,manufactureIndex) in scheduleTypeV2.manufacture"
             :key="manufactureIndex"
             @click="openPopup('manufacture',manufactureIndex)">
          <div class="room-name">
            <span>制造站#{{ num }}</span>
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
        <div class="room-template power"
             v-for="(num,powerIndex) in scheduleTypeV2.power" :key="powerIndex"
             @click="openPopup('power',powerIndex)">
          <div class="room-name"> 发电站#{{ num }}</div>
          <div class="room-avatar-sprite-wrap"
               v-for="(charName,index) in getRoomOperators('power',powerIndex)"
               :key="index">
            <div :class="getAvatar(charName)"></div>
          </div>
        </div>

        <div class="room-template blank" style="width: 180px;" v-for="index in 3" :key="index"></div>
      </div>

      <div class="room-wrap-center">
        <!--     控制中枢-->
        <div class="room-template control" @click="openPopup('control',0)">
          <div class="room-name"> 控制中枢</div>
          <div class="room-avatar-sprite-wrap"
               v-for="(charName,index) in getRoomOperators('control',0)"
               :key="index">
            <div :class="getAvatar(charName)"></div>

          </div>
        </div>
        <!--     宿舍-->
        <div class="room-template dormitory"
             v-for="(num,dormitoryIndex) in scheduleTypeV2.dormitory" :key="dormitoryIndex"
             @click="openPopup('dormitory',dormitoryIndex)">
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
        <div class="room-template meeting" @click="openPopup('meeting',0)">
          <div class="room-name">会客室</div>
          <div class="room-avatar-sprite-wrap"
               v-for="(charName,index) in getRoomOperators('meeting',0)" :key="index">
            <div :class="getAvatar(charName)"></div>

          </div>
        </div>
        <!--      加工站-->
        <div class="room-template hire" @click="openPopup('processing',0)">
          <div class="room-name">加工站</div>
          <div class="room-avatar-sprite-wrap"
               v-for="(charName,index) in getRoomOperators('processing',0)"
               :key="index">
            <div :class="getAvatar(charName)"></div>
          </div>
        </div>

        <!--     办公室 -->
        <div class="room-template hire" @click="openPopup('hire',0)">
          <div class="room-name">办公室</div>
          <div class="room-avatar-sprite-wrap"
               v-for="(charName,index) in getRoomOperators('hire',0)" :key="index">
            <div :class="getAvatar(charName)"></div>
          </div>
        </div>

        <div class="room-template blank" style="width: 100px;"></div>
      </div>
    </div>


    <c-popup v-model:visible="room_visible" :style="roomPopupStyle">

      <div class="room-popup-wrap">
        <div class="room-popup-title">
          第{{ selectedPlanIndex + 1 }}班 —
          {{ getRoomLabel(selected_room_type) }}#{{ selected_room_index + 1 }}的房间入驻设置
        </div>

        <div class="room-set" v-show="selected_room_type === 'trading'">
          <div>选择产物</div>
          <div class="product-image-wrap" @click="setProduct('LMD')">
            <div :class="getItemSprite(4001)"></div>
          </div>
          <div class="product-image-wrap" @click="setProduct('Orundum')">
            <div :class="getItemSprite(4003)"></div>
          </div>

          <div>已选择产物</div>
          <div class="product-image-wrap">
            <div :class="getItemSprite(selected_product)"></div>
          </div>
        </div>

        <div class="room-set" v-show="selected_room_type === 'manufacture'">
          <span>选择产物</span>
          <div class="product-image-wrap" @click="setProduct('Battle Record')">
            <div :class="getItemSprite(2003)"></div>
          </div>
          <div class="product-image-wrap" @click="setProduct('Pure Gold')">
            <div :class="getItemSprite(3003)"></div>
          </div>
          <div class="product-image-wrap" @click="setProduct('Originium Shard')">
            <div :class="getItemSprite(3141)"></div>
          </div>

          <span>已选择产物</span>
          <div class="product-image-wrap">
            <div :class="getItemSprite(selected_product)"></div>
          </div>
        </div>


        <div class="room-set">
          <span>是否按顺序入驻</span>
          <c-switch v-model="plansTemplate[selectedPlanIndex].rooms[selected_room_type][selected_room_index].sort">
          </c-switch>
          <span>是否补满空位</span>
          <c-switch
              v-model="plansTemplate[selectedPlanIndex].rooms[selected_room_type][selected_room_index].autofill">
          </c-switch>
          <span> 是否跳过房间</span>
          <c-switch v-model="plansTemplate[selectedPlanIndex].rooms[selected_room_type][selected_room_index].skip">
          </c-switch>
        </div>
        <div class="room-set">
          <span>房间内入驻的干员：</span>
          <div class="selected-operator-wrap">
            <div class="room-avatar-sprite-wrap" style="margin: 0 4px"
                 v-for="(charId,index) in getRoomOperators(selected_room_type,selected_room_index)"
                 :key="index"
                 @click="deleteOperator(charId)">
              <div :class="getAvatar(charId)"></div>
            </div>
          </div>
        </div>
        <div class="room-set">
          <span>干员工作场所</span>
          <c-button v-for="(menu,index) in roomTypeMenu" :key="index"
                    :color="'blue'" :status="menu.value === popup_room_type"
                    @click="popup_room_type=menu.value">
            {{ menu.label }}
          </c-button>
        </div>
        <div class="operator-check-box">
          <div class="room-avatar-sprite-wrap"
               v-for="(name,charId) in building_data[popup_room_type]"
               :key="charId" @click="chooseOperator(name)">
            <div :class="getAvatar(name)"></div>
          </div>
        </div>
      </div>
    </c-popup>

  </div>
</template>


<style scoped>
.btn {
  margin: 2px;
  min-width: 0;
}
</style>