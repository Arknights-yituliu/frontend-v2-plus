<script setup>
import {onMounted, ref} from "vue"
import schedule_template_json from '/src/static/json/build/plans_template.json'
import '/src/assets/css/tool/schedule.css'
import '/src/assets/css/sprite/sprite_avatar_6.css'
import '/src/assets/css/sprite/sprite_avatar_5.css'
import '/src/assets/css/sprite/sprite_avatar_4.css'
import building_data from '/src/static/json/build/buildingData.json'
import {cMessage} from '/src/custom/message.js'
// import plan from '/src/pages/tools/plans_templte'
let index_list = [0, 1, 2, 3, 4, 5];


const room_type_menu = [
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

let characterIdAndName = {}

for (const key in building_data) {
  const obj = building_data[key]
  for (const id in obj) {
    characterIdAndName[obj[id]] = id
  }
}

console.log(characterIdAndName)

let selected_schedule_type = ref('243')

let schedule_type = ref({
  planTimes: [0, 1, 2],
  trading: [0, 1],
  manufacture: [0, 1, 2, 3],
  power: [0, 1, 2],
  dormitory: [0],
  control: [0],
  meeting: [0],
  hire: [0],
})

function chooseScheduleType(type) {
  selected_schedule_type.value = type
  schedule_type.value.trading = index_list.slice(0, parseInt(type.substring(0, 1)))
  schedule_type.value.manufacture = index_list.slice(0, parseInt(type.substring(1, 2)))
  schedule_type.value.power = index_list.slice(0, parseInt(type.substring(2, 3)))
}


function choosePlanTimes(num) {
  schedule_type.value.planTimes = index_list.slice(0, num)
}

let room_max_operator_num = {
  control: 5,
  dormitory: 5,
  trading: 3,
  manufacture: 3,
  power: 1,
  meeting: 2,
  hire: 1
}

function getAvatar(name) {
  name = characterIdAndName[name]
  return `bg-${name} operator_image`
}

function getItem(name) {
  return `bg-${name} product_image`
}

//控制选择房间内干员的弹窗展开的属性
let room_visible = ref(false)
let popup_room_type = ref('trading')
//第几次换班
let selected_plan_index = ref(0)
//房间类型
let selected_room_type = ref('trading')
//房间序号
let selected_room_index = ref(0)

/**
 * 选择当前班次
 * @param index 班次（班次1为0,以此类推)
 */
function currentPlan(index) {
  selected_plan_index.value = index
}

let plans_template = ref(schedule_template_json)

console.log(plans_template.value[selected_plan_index.value].name)


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
    selected_product.value = getProductId(plans_template.value[selected_plan_index.value]
        .room[selected_room_type.value][selected_room_index.value].product)
  }

}

/**
 * 选择该房间入驻干员
 * @param operator_id 干员id
 */
function chooseOperator(operator_id) {
  if (plans_template.value[selected_plan_index.value]
      .room[selected_room_type.value][selected_room_index.value]
      .operators.includes(operator_id)) {
    cMessage('不要选择同一干员')
    return;
  }

  if (plans_template.value[selected_plan_index.value]
      .room[selected_room_type.value][selected_room_index.value]
      .operators.length >= room_max_operator_num[selected_room_type.value]) {
    cMessage('当前房间干员数量已达上限')
    return;
  }

  plans_template.value[selected_plan_index.value].room[selected_room_type.value][selected_room_index.value].operators.push(operator_id)

  localStorage.setItem("ScheduleCache", JSON.stringify(plans_template.value))
}

/**
 * 删除该房间中选中的干员
 * @param operator_id 干员id
 */
function deleteOperator(operator_id) {

  plans_template.value[selected_plan_index.value].room[selected_room_type.value][selected_room_index.value].operators =
      plans_template.value[selected_plan_index.value].room[selected_room_type.value][selected_room_index.value].operators.filter(e => {
        return e !== operator_id
      })

  localStorage.setItem("ScheduleCache", JSON.stringify(plans_template.value))
}

let selected_product = ref("")

function setProduct(product) {
  plans_template.value[selected_plan_index.value].room[selected_room_type.value][selected_room_index.value].product = product
  selected_product.value = getProductId(plans_template.value[selected_plan_index.value]
      .room[selected_room_type.value][selected_room_index.value].product)
}

function getProductId(label) {
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
  plans_template.value[selected_plan_index.value].drones[property] = value
  localStorage.setItem("ScheduleCache", JSON.stringify(plans_template.value))
}


let Fiammetta_target_visible = ref(false)

/**
 * 写入菲亚梅塔使用设置
 * @param property 无人机设置参数 如enable等
 * @param value 参数值
 */
function setFiammetta(property, value) {
  plans_template.value[selected_plan_index.value].Fiammetta[property] = value
  localStorage.setItem("ScheduleCache", JSON.stringify(plans_template.value))
}

// let schedule_init = {
//   title: "排班文件标题",
//   description: "排班文件描述",
//   author: "一图流",
//   schedule_type: "243",
//   id: 1697606525017292,
//   planTimes: "3班",
//   plans: []
// }

/**
 * 创建排班文件
 */
function createScheduleJsonFile() {

  console.log('开始创建')


  let plans = []

  for (let index in schedule_type.value.planTimes) {
    plans.push({
      name:plans_template.value[index].name,
      description:plans_template.value[index].description,
      Fiammetta: plans_template.value[index].Fiammetta,
      drones: plans_template.value[index].drones,
      room: {
        trading: plans_template.value[index].room.trading.slice(0, schedule_type.value.trading.length),
        manufacture: plans_template.value[index].room.manufacture.slice(0, schedule_type.value.manufacture.length),
        power: plans_template.value[index].room.power.slice(0, schedule_type.value.power.length),
        dormitory: plans_template.value[index].room.dormitory.slice(0, schedule_type.value.dormitory.length),
        control: plans_template.value[index].room.control,
        meeting: plans_template.value[index].room.meeting,
        hire: plans_template.value[index].room.hire,
      }
    })
  }

  let schedule_json = {
    plans: plans
  }

  console.log(JSON.stringify(schedule_json))

  localStorage.setItem("ScheduleCache", JSON.stringify(plans_template.value))

  let link = document.createElement('a')
  link.download = `测试排班.json`
  link.href = 'data:text/plain,' + JSON.stringify(schedule_json)
  link.click()
}


const ScheduleCache = localStorage.getItem("ScheduleCache");
if(ScheduleCache)  plans_template.value =  JSON.parse(ScheduleCache)



onMounted(() => {

})

</script>


<template>

  <div class="schedule_control_wrap">
    <div class="schedule_control">
      <div class="schedule_control_option">
        <div> 基建模式</div>
        <c-button :color="'blue'" :status="'243'===selected_schedule_type" @click="chooseScheduleType('243')">243
        </c-button>
        <c-button :color="'blue'" :status="'153'===selected_schedule_type" @click="chooseScheduleType('153')">153
        </c-button>
        <c-button :color="'blue'" :status="'333'===selected_schedule_type" @click="chooseScheduleType('333')">333
        </c-button>
        <c-button :color="'blue'" :status="'252'===selected_schedule_type" @click="chooseScheduleType('252')">252
        </c-button>
      </div>

      <div class="schedule_control_option">
        <div> 换班次数</div>
        <c-button :color="'blue'" :status="2===schedule_type.planTimes.length" @click="choosePlanTimes(2)">2
        </c-button>
        <c-button :color="'blue'" :status="3===schedule_type.planTimes.length" @click="choosePlanTimes(3)">3
        </c-button>
        <c-button :color="'blue'" :status="4===schedule_type.planTimes.length" @click="choosePlanTimes(4)">4
        </c-button>
        <c-button :color="'blue'" :status="5===schedule_type.planTimes.length" @click="choosePlanTimes(5)">5
        </c-button>
      </div>

      <div class="schedule_control_option">
        <div> 当前班次</div>
        <c-button :color="'blue'" :status="index === selected_plan_index"
                  v-for="index in schedule_type.planTimes" :key="index"
                  @click="currentPlan(index)" class="room_times">
          第{{ index + 1 }}班
        </c-button>
      </div>

      <div class="schedule_control_option">
        <div> 班次名称</div>
        <input v-model="plans_template[selected_plan_index].name" />
      </div>

      <div class="schedule_control_option">
        <div> 班次描述</div>
        <input v-model="plans_template[selected_plan_index].description" />
      </div>
    </div>

    <div class="schedule_control">
      <div class="schedule_control_option">
        <div> 第{{ selected_plan_index + 1 }}班是否使用无人机</div>
        <c-switch v-model="plans_template[selected_plan_index].drones.enable"></c-switch>
      </div>

      <div class="schedule_control_option">
        <div>目标房间</div>
        <c-button :color="'blue'"
                  :status="'trading' === plans_template[selected_plan_index].drones.room"
                  @click="setDrones('room','trading')">
          贸易站
        </c-button>
        <c-button :color="'blue'"
                  :status="'manufacture' === plans_template[selected_plan_index].drones.room"
                  @click="setDrones('room','manufacture')">
          制造站
        </c-button>

      </div>
      <div class="schedule_control_option">
        <div> 目标房间编号</div>
        <c-button :color="'blue'"
                  :status="index === plans_template[selected_plan_index].drones.index"
                  @click="setDrones('index',index)"
                  v-for="index in index_list.slice(0,5)" :key="index">
          {{ index + 1 }}
        </c-button>
      </div>

      <div class="schedule_control_option">
        <div> 换班前后</div>
        <c-button :color="'blue'"
                  :status="'pre' === plans_template[selected_plan_index].drones.order"
                  @click="setDrones('order','pre')">
          换班前
        </c-button>
        <c-button :color="'blue'"
                  :status="'post' === plans_template[selected_plan_index].drones.order"
                  @click="setDrones('order','post')">
          换班后
        </c-button>
      </div>
    </div>

    <div class="schedule_control">
      <div class="schedule_control_option">
        <div> 第{{ selected_plan_index + 1 }}班是否使用菲亚梅塔</div>
        <c-switch v-model="plans_template[selected_plan_index].Fiammetta.enable"></c-switch>
      </div>

      <div class="schedule_control_option">
        <div> 恢复目标</div>
        <div class="operator_image_wrap" @click="Fiammetta_target_visible=true">
          <div :class="getAvatar(plans_template[selected_plan_index].Fiammetta.target)"></div>
        </div>
      </div>

      <c-popup v-model:visible="Fiammetta_target_visible">
        <c-button v-for="(menu,index) in room_type_menu" :key="index"
                  :color="'blue'" :status="menu.value === popup_room_type"
                  @click="popup_room_type=menu.value">
          {{ menu.label }}
        </c-button>
        <div class="operator_check_box">
          <div class="operator_image_wrap"
               v-for="(name,charId) in building_data[popup_room_type]"
               :key="charId" @click="setFiammetta('target',name)">
            <div :class="getAvatar(name)"></div>
          </div>
        </div>
      </c-popup>

      <div class="schedule_control_option">
        <div> 换班前后</div>
        <c-button :color="'blue'"
                  :status="'pre' === plans_template[selected_plan_index].Fiammetta.order"
                  @click="setFiammetta('order','pre')">
          换班前
        </c-button>
        <c-button :color="'blue'"
                  :status="'post' === plans_template[selected_plan_index].Fiammetta.order"
                  @click="setFiammetta('order','post')">
          换班后
        </c-button>
      </div>
    </div>
  </div>
  <c-button :color="'blue'" @click="createScheduleJsonFile()">创建排班文件</c-button>

  <div class="room_wrap">
    <!--  左边站点-->
    <div class="room_wrap_left">
      <!--     控制中枢-->
      <div class="room_bg control" @click="openPopup('control',0)">
        <div class="room_name"> 控制中枢</div>
        <div class="operator_image_wrap"
             v-for="(charName,index) in plans_template[selected_plan_index].room.control[0].operators"
             :key="index">
          <div :class="getAvatar(charName)"></div>

        </div>
      </div>
      <!--    贸易站-->
      <div class="room_bg trading" v-for="trading_index in schedule_type.trading" :key="trading_index"
           @click="openPopup('trading',trading_index)">
        <div class="room_name"> 贸易站</div>
        <div class="operator_image_wrap"
             v-for="(charName,index) in plans_template[selected_plan_index].room.trading[trading_index].operators"
             :key="index">
          <div :class="getAvatar(charName)"></div>

        </div>
      </div>

      <!--  制造站-->
      <div class="room_bg manufacture" v-for="manufacture_index in schedule_type.manufacture" :key="manufacture_index"
           @click="openPopup('manufacture',manufacture_index)">
        <div class="room_name"> 制造站</div>
        <div class="operator_image_wrap"
             v-for="(charName,index) in plans_template[selected_plan_index].room.manufacture[manufacture_index].operators"
             :key="index">
          <div :class="getAvatar(charName)"></div>

        </div>
      </div>

      <!--  发电站-->
      <div class="room_bg power" v-for="power_index in schedule_type.power" :key="power_index"
           @click="openPopup('power',power_index)">
        <div class="room_name"> 发电站</div>
        <div class="operator_image_wrap"
             v-for="(charName,index) in plans_template[selected_plan_index].room.power[power_index].operators"
             :key="index">
          <div :class="getAvatar(charName)"></div>

        </div>
      </div>

    </div>

    <div class="room_wrap_center">

      <!--     宿舍-->
      <div class="room_bg dormitory" v-for="dormitory_index in index_list.slice(0,5)" :key="dormitory_index"
           @click="openPopup('dormitory',dormitory_index)">
        <div class="room_name"> 宿舍</div>
        <div class="operator_image_wrap"
             v-for="(charName,index) in plans_template[selected_plan_index].room.dormitory[dormitory_index].operators"
             :key="index">
          <div :class="getAvatar(charName)"></div>
        </div>
      </div>
    </div>


    <div class="room_wrap_right">
      <!--     会客室-->
      <div class="room_bg meeting" @click="openPopup('meeting',0)">
        <div class="room_name"> 会客室</div>
        <div class="operator_image_wrap"
             v-for="(charName,index) in plans_template[selected_plan_index].room.meeting[0].operators" :key="index">
          <div :class="getAvatar(charName)"></div>

        </div>
      </div>
      <!--     办公室 -->
      <div class="room_bg hire" @click="openPopup('hire',0)">
        <div class="room_name"> 办公室</div>
        <div class="operator_image_wrap"
             v-for="(charName,index) in plans_template[selected_plan_index].room.hire[0].operators" :key="index">
          <div :class="getAvatar(charName)"></div>
        </div>
      </div>
    </div>
  </div>


  <c-popup v-model:visible="room_visible">

    <div class="room_popup_wrap">
      <div class="room_popup_title">第{{ selected_plan_index + 1 }}班—第{{
          selected_room_index + 1
        }}个{{ selected_room_type }}选中的干员
      </div>

      <div class="room_control" v-show="selected_room_type === 'trading'">
        <div>选择产物</div>
        <div class="product_image_wrap" @click="setProduct('LMD')">
          <div :class="getItem(4001)"></div>
        </div>
        <div class="product_image_wrap" @click="setProduct('Orundum')">
          <div :class="getItem(4003)"></div>
        </div>

        <div>已选择产物</div>
        <div class="product_image_wrap">
          <div :class="getItem(selected_product)"></div>
        </div>
      </div>

      <div class="room_control" v-show="selected_room_type === 'manufacture'">
        选择产物
        <div class="product_image_wrap" @click="setProduct('Battle Record')">
          <div :class="getItem(2003)"></div>
        </div>
        <div class="product_image_wrap" @click="setProduct('Pure Gold')">
          <div :class="getItem(3003)"></div>
        </div>
        <div class="product_image_wrap" @click="setProduct('Originium Shard')">
          <div :class="getItem(3141)"></div>
        </div>

        <div>已选择产物</div>
        <div class="product_image_wrap">
          <div :class="getItem(selected_product)"></div>
        </div>
      </div>


      <div class="room_control">
        <div>是否按顺序入驻</div>
        <c-switch
            v-model="plans_template[selected_plan_index].room[selected_room_type][selected_room_index].sort"></c-switch>
        <div>是否补满空位</div>
        <c-switch
            v-model="plans_template[selected_plan_index].room[selected_room_type][selected_room_index].autofill"></c-switch>
        <div> 是否跳过房间</div>
        <c-switch
            v-model="plans_template[selected_plan_index].room[selected_room_type][selected_room_index].skip"></c-switch>
      </div>

      <div class="selected_operator_wrap">
        <div class="operator_image_wrap"
             v-for="(charId,index) in plans_template[selected_plan_index].room[selected_room_type][selected_room_index].operators"
             :key="index"
             @click="deleteOperator(charId)">
          <div :class="getAvatar(charId)"></div>
        </div>
      </div>

      <c-button v-for="(menu,index) in room_type_menu" :key="index"
                :color="'blue'" :status="menu.value === popup_room_type"
                @click="popup_room_type=menu.value">
        {{ menu.label }}
      </c-button>
      <div class="operator_check_box">
        <div class="operator_image_wrap show_name"
             v-for="(name,charId) in building_data[popup_room_type]"
             :key="charId" @click="chooseOperator(name)">
          <div :class="getAvatar(name)"></div>
          <div class="operator_name">{{ name }}</div>
        </div>
      </div>
    </div>
  </c-popup>
</template>


<style scoped>
.btn {
  margin: 4px;
  min-width: 50px;
}
</style>