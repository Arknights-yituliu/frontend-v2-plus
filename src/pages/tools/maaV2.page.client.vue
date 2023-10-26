<template>

  <div class="schedule_control_wrap">
  <div class="schedule_control">
    <div class="schedule_control_option">
      <div> 基建模式</div>
      <c-button :color="'blue'" :isSelected="'243'===selected_schedule_type" @click="chooseScheduleType('243')">243
      </c-button>
      <c-button :color="'blue'" :isSelected="'153'===selected_schedule_type" @click="chooseScheduleType('153')">153
      </c-button>
      <c-button :color="'blue'" :isSelected="'333'===selected_schedule_type" @click="chooseScheduleType('333')">333
      </c-button>
      <c-button :color="'blue'" :isSelected="'252'===selected_schedule_type" @click="chooseScheduleType('252')">252
      </c-button>
    </div>

    <div class="schedule_control_option">
      <div> 换班次数</div>
      <c-button :color="'blue'" :isSelected="2===schedule_type.planTimes.length" @click="choosePlanTimes(2)">2
      </c-button>
      <c-button :color="'blue'" :isSelected="3===schedule_type.planTimes.length" @click="choosePlanTimes(3)">3
      </c-button>
      <c-button :color="'blue'" :isSelected="4===schedule_type.planTimes.length" @click="choosePlanTimes(4)">4
      </c-button>
      <c-button :color="'blue'" :isSelected="5===schedule_type.planTimes.length" @click="choosePlanTimes(5)">5
      </c-button>
    </div>

    <div class="schedule_control_option">
      <div> 当前班次</div>
      <c-button :color="'blue'" :isSelected="index === selected_plan_index"
                v-for="index in schedule_type.planTimes" :key="index"
                @click="currentPlan(index)" class="room_times">
        第{{ index + 1 }}班
      </c-button>
    </div>

    <div class="schedule_control_option">
      <div> 班次名称</div>
      <input>
    </div>

    <div class="schedule_control_option">
      <div> 班次描述</div>
      <input>
    </div>
  </div>

  <div class="schedule_control">
  <div class="schedule_control_option">
    <div> 第{{selected_plan_index}}班是否使用无人机</div>
    <c-switch v-model="drones_set_obj[`${selected_plan_index}_enable`]"></c-switch>
  </div>

  <div class="schedule_control_option">
    <div>目标房间</div>
    <c-button :color="'blue'"
              :isSelected="'trading' === drones_set_obj[`${selected_plan_index}_room`]"
              @click="setDrone('room','trading')">
      贸易站
    </c-button>
    <c-button :color="'blue'"
              :isSelected="'manufacture' === drones_set_obj[`${selected_plan_index}_room`]"
              @click="setDrone('room','manufacture')">
      制造站
    </c-button>

  </div>
  <div class="schedule_control_option">
    <div> 目标房间编号</div>
    <c-button :color="'blue'" style="width: 10px"
              :isSelected="index === drones_set_obj[`${selected_plan_index}_index`]"
              @click="setDrone('index',index)"
              v-for="index in index_list.slice(0,5)" :key="index">
      {{ index + 1 }}
    </c-button>
  </div>

  <div class="schedule_control_option">
    <div> 换班前后</div>
    <c-button :color="'blue'"
              :isSelected="'pre' === drones_set_obj[`${selected_plan_index}_order`]"
              @click="setDrone('order','pre')">
      换班前
    </c-button>
    <c-button :color="'blue'"
              :isSelected="'post' === drones_set_obj[`${selected_plan_index}_order`]"
              @click="setDrone('order','post')">
      换班后
    </c-button>
  </div>
  </div>

    <div class="schedule_control">
  <div class="schedule_control_option">
    <div> 第{{selected_plan_index}}班是否使用菲亚梅塔</div>
    <c-switch v-model="Fiammetta_set_obj[`${selected_plan_index}_enable`]"></c-switch>
  </div>

  <div class="schedule_control_option">
    <div> 恢复目标</div>
    <div class="operator_image_wrap" @click="Fiammetta_target_visible=true">
      <div :class="getAvatar(Fiammetta_set_obj[`${selected_plan_index}_target`])"></div>
    </div>
  </div>

  <c-popup v-model:visible="Fiammetta_target_visible">
    <c-button v-for="(character,type) in building_data" :key="type"
              :color="'blue'" :isSelected="type === popup_room_type"
              @click="popup_room_type=type">
      {{ type }}
    </c-button>
    <div class="operator_check_box">
      <div class="operator_image_wrap"
           v-for="(character,index) in building_data[popup_room_type]"
           :key="index" @click="setFiammetta('target',character.charId)">
        <div :class="getAvatar(character.charId)"></div>
      </div>
    </div>
  </c-popup>

  <div class="schedule_control_option">
    <div> 换班前后</div>
    <c-button :color="'blue'"
              :isSelected="'pre' === Fiammetta_set_obj[`${selected_plan_index}_order`]"
              @click="setFiammetta('order','pre')">
      换班前
    </c-button>
    <c-button :color="'blue'"
              :isSelected="'post' === Fiammetta_set_obj[`${selected_plan_index}_order`]"
              @click="setFiammetta('order','post')">
      换班后
    </c-button>
  </div>
    </div>
  </div>
  <c-button :color="'blue'" @click="createScheduleJson()">创建排班文件</c-button>

  <div class="room_wrap">
    <!--  左边站点-->
    <div class="room_wrap_left">
      <!--     控制中枢-->
      <div class="room_bg control" @click="openPopup('control',0)">
        <div class="room_name"> 控制中枢</div>
        <div class="operator_image_wrap"
             v-for="(charName,index) in operator_selected[`${selected_plan_index}_control_0`]"
             :key="index">
          <div :class="getAvatar(charName)"></div>

        </div>
      </div>
      <!--    贸易站-->
      <div class="room_bg trading" v-for="trading_index of schedule_type.trading" :key="trading_index"
           @click="openPopup('trading',trading_index)">
        <div class="room_name"> 贸易站</div>
        <div class="operator_image_wrap"
             v-for="(charName,index) in operator_selected[`${selected_plan_index}_trading_${trading_index}`]"
             :key="index">
          <div :class="getAvatar(charName)"></div>

        </div>
      </div>

      <!--  制造站-->
      <div class="room_bg manufacture" v-for="manufacture_index of schedule_type.manufacture" :key="manufacture_index"
           @click="openPopup('manufacture',manufacture_index)">
        <div class="room_name"> 制造站</div>
        <div class="operator_image_wrap"
             v-for="(charName,index) in operator_selected[`${selected_plan_index}_manufacture_${manufacture_index}`]"
             :key="index">
          <div :class="getAvatar(charName)"></div>

        </div>
      </div>

      <!--  发电站-->
      <div class="room_bg power" v-for="power_index of schedule_type.power" :key="power_index"
           @click="openPopup('power',power_index)">
        <div class="room_name"> 发电站</div>
        <div class="operator_image_wrap"
             v-for="(charName,index) in operator_selected[`${selected_plan_index}_power_${power_index}`]"
             :key="index">
          <div :class="getAvatar(charName)"></div>

        </div>
      </div>

    </div>

    <div class="room_wrap_center">

      <!--     宿舍-->
      <div class="room_bg dormitory" v-for="dormitory_index of 5" :key="dormitory_index"
           @click="openPopup('dormitory',dormitory_index)">
        <div class="room_name"> 宿舍</div>
        <div class="operator_image_wrap"
             v-for="(charName,index) in operator_selected[`${selected_plan_index}_dormitory_${dormitory_index}`]"
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
             v-for="(charName,index) in operator_selected[`${selected_plan_index}_meeting_0`]" :key="index">
          <div :class="getAvatar(charName)"></div>

        </div>
      </div>
      <!--     办公室 -->
      <div class="room_bg hire" @click="openPopup('hire',0)">
        <div class="room_name"> 办公室</div>
        <div class="operator_image_wrap"
             v-for="(charName,index) in operator_selected[`${selected_plan_index}_hire_0`]" :key="index">
          <div :class="getAvatar(charName)"></div>
        </div>
      </div>
    </div>
  </div>


  <c-popup v-model:visible="room_visible">

    <div class="selected_room_title">第{{ selected_plan_index + 1 }}班—第{{
        selected_room_index + 1
      }}个{{ selected_room_type }}选中的干员
    </div>

    <div class="selected_operator_wrap">
      <div class="operator_image_wrap"
           v-for="(charId,index) in operator_selected[`${selected_plan_index}_${selected_room_type}_${selected_room_index}`]"
           :key="index"
           @click="deleteOperator(charId)">
        <div :class="getAvatar(charId)"></div>

      </div>
    </div>

    <c-button v-for="(character,type) in building_data" :key="type"
              :color="'blue'" :isSelected="type === popup_room_type"
              @click="popup_room_type=type">
      {{ type }}
    </c-button>
    <div class="operator_check_box">
      <div class="operator_image_wrap"
           v-for="(character,index) in building_data[popup_room_type]"
           :key="index" @click="chooseOperator(character.charId)">
        <div :class="getAvatar(character.charId)"></div>
      </div>
    </div>
  </c-popup>
</template>

<script setup>
import {ref} from "vue"
import '/src/assets/css/tool/schedule.css'
import '/src/assets/css/sprite/sprite_avatar_6.css'
import '/src/assets/css/sprite/sprite_avatar_5.css'
import '/src/assets/css/sprite/sprite_avatar_4.css'
import building_data from '/src/static/json/build/buildingData.json'
import {cMessage} from '/src/custom/message.js'

let selected_schedule_type = ref('243')

let schedule_type = ref({
  trading: 2,
  manufacture: 4,
  power: 3,
  planTimes: [0, 1, 2, 3]
})

function chooseScheduleType(type) {
  selected_schedule_type.value = type
  schedule_type.value.trading = parseInt(type.substring(0, 1))
  schedule_type.value.manufacture = parseInt(type.substring(1, 2))
  schedule_type.value.power = parseInt(type.substring(2, 3))
}

let index_list = [0, 1, 2, 3, 4, 5, 6];


function choosePlanTimes(num) {
  schedule_type.value.planTimes = index_list.slice(0, num)
}

let max_operator_num = {
  control: 5,
  dormitory: 5,
  trading: 3,
  manufacture: 3,
  power: 1,
  meeting: 2,
  hire: 1
}

function getAvatar(charName, type) {
  if ('check' === type) return `bg-${charName} check_image`
  return `bg-${charName} operator_image`
}

//控制选择房间内干员的弹窗展开的属性
let room_visible = ref(false)
let popup_room_type = ref('trading')
//已选中干员的暂存对象
let operator_selected = ref({})
//当前选中房间在暂存对面里面的key
//第几次换班
let selected_plan_index = ref(0)
//房间类型
let selected_room_type = ref('')
//房间序号
let selected_room_index = ref(0)

function currentPlan(index) {
  selected_plan_index.value = index
}

const inputCache = localStorage.getItem("inputCache");
operator_selected.value = inputCache ? JSON.parse(inputCache) : {}

function openPopup(type, index) {
  selected_room_type.value = type
  selected_room_index.value = index
  room_visible.value = true
}

function chooseOperator(operator_id) {
  let key = `${selected_plan_index.value}_${selected_room_type.value}_${selected_room_index.value}`
  console.log('添加的干员位置是', key, '干员是', operator_id)
  if (!operator_selected.value[key]) {
    operator_selected.value[key] = [operator_id]
    return;
  }

  if (operator_selected.value[key].includes(operator_id)) {
    cMessage('不要选择同一干员')
    return;
  }

  if (operator_selected.value[key].length === max_operator_num[selected_room_type.value]) {
    cMessage('当前房间干员数量已达上限')
    return;
  }

  operator_selected.value[key].push(operator_id)

  localStorage.setItem("inputCache", JSON.stringify(operator_selected.value))
}

function deleteOperator(operator_id) {
  let key = `${selected_plan_index.value}_${selected_room_type.value}_${selected_room_index.value}`
  console.log('删除的干员位置是', key)
  if (operator_selected.value[key]) {
    operator_selected.value[key] = operator_selected.value[key].filter(e => {
      return e !== operator_id
    })
  }
  localStorage.setItem("inputCache", JSON.stringify(operator_selected.value))
}

let drones_set_obj = ref({})

function setDrone(property, value) {
  const key = `${selected_plan_index.value}_${property}`
  drones_set_obj.value[key] = value
}

let Fiammetta_set_obj = ref({})
let Fiammetta_target_visible = ref(true)

function setFiammetta(property, value) {
  const key = `${selected_plan_index.value}_${property}`
  Fiammetta_set_obj.value[key] = value
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

function createScheduleJson() {
  console.log('开始创建')
  let plans = []
  for (let key in operator_selected.value) {
    const text_list = key.split('_')
    const plan_index = text_list[0]
    const room_type = text_list[1]
    const room_index = text_list[2]
    if (!plans[plan_index]) {
      plans[plan_index] = {}
    }
    if (!plans[plan_index][room_type]) {
      plans[plan_index][room_type] = []
    }
    if (!plans[plan_index][room_type][room_index]) {
      plans[plan_index][room_type][room_index] = {
        product: 'TEST',
        operators: operator_selected.value[key],
        sort: false,
        autofill: false
      }
    }

  }

  console.log(JSON.stringify(plans))


}


</script>


<style scoped>
.btn {
  margin: 4px;
  min-width: 50px;
}
</style>