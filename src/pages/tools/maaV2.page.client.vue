<template>


  <div class="room_times_wrap">
    <div v-for="index in buildingType.planTimes" :key="index"
         @click="currentPlan(index)" class="room_times">
      第{{ index+1 }}班
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
             v-for="(charName,index) in operator_selected[`${plan_index}_control_0`]"
             :key="index">
          <div :class="getAvatar(charName)"></div>

        </div>
      </div>
      <!--    贸易站-->
      <div class="room_bg trading" v-for="trading_index of buildingType.trading" :key="trading_index"
           @click="openPopup('trading',trading_index)">
        <div class="room_name"> 贸易站</div>
        <div class="operator_image_wrap"
             v-for="(charName,index) in operator_selected[`${plan_index}_trading_${trading_index}`]"
             :key="index">
          <div :class="getAvatar(charName)"></div>

        </div>
      </div>

      <!--  制造站-->
      <div class="room_bg manufacture" v-for="manufacture_index of buildingType.manufacture" :key="manufacture_index"
           @click="openPopup('manufacture',manufacture_index)">
        <div class="room_name"> 制造站</div>
        <div class="operator_image_wrap"
             v-for="(charName,index) in operator_selected[`${plan_index}_manufacture_${manufacture_index}`]"
             :key="index">
          <div :class="getAvatar(charName)"></div>

        </div>
      </div>

      <!--  发电站-->
      <div class="room_bg power" v-for="power_index of buildingType.power" :key="power_index"
           @click="openPopup('power',power_index)">
        <div class="room_name"> 发电站</div>
        <div class="operator_image_wrap"
             v-for="(charName,index) in operator_selected[`${plan_index}_power_${power_index}`]"
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
             v-for="(charName,index) in operator_selected[`${plan_index}_dormitory_${dormitory_index}`]"
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
             v-for="(charName,index) in operator_selected[`${plan_index}_dormitory_0`]" :key="index">
          <div :class="getAvatar(charName)"></div>

        </div>
      </div>
      <!--     办公室 -->
      <div class="room_bg hire" @click="openPopup('hire',0)">
        <div class="room_name"> 办公室</div>
        <div class="operator_image_wrap"
             v-for="(charName,index) in operator_selected[`${plan_index}_hire_0`]" :key="index">
          <div :class="getAvatar(charName)"></div>
        </div>
      </div>
    </div>
  </div>


  <c-popup v-model:visible="room_visible">

    <div class="selected_room_title">第{{ plan_index + 1 }}班—第{{ room_index + 1 }}个{{ room_type }}选中的干员</div>

    <div class="selected_operator_wrap">
      <div class="operator_image_wrap"
           v-for="(charId,index) in operator_selected[`${plan_index}_${room_type}_${room_index}`]" :key="index"
           @click="deleteOperator(charId)">
        <div :class="getAvatar(charId)"></div>

      </div>
    </div>

    <div class="operator_check_box">
      <div class="operator_image_wrap"
           v-for="(info,charId) in operator_table_sample" :key="charId"
           @click="chooseOperator(charId)">
        <div :class="getAvatar(charId)"></div>
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
import operator_table_sample from '/src/static/json/survey/character_table_simple.json'

let buildingType = ref({
  trading: 2,
  manufacture: 4,
  power: 3,
  planTimes: [0,1,2,3]
})

let max_operator_num = {
  control:5,
  dormitory:5,
  trading:3,
  manufacture:3,
  power:1,
  meeting:2,
  hire:1
}

let index_list = [0,1,2,3,4,5,6];

function getAvatar(charName) {
  return `operator_image bg-${charName}`
}

//控制选择房间内干员的弹窗展开的属性
let room_visible = ref(false)
//已选中干员的暂存对象
let operator_selected = ref({})
//当前选中房间在暂存对面里面的key
//第几次换班
let plan_index = ref(0)
//房间类型
let room_type = ref('')
//房间序号
let room_index = ref(0)

function currentPlan(index) {
  plan_index.value = index
}

function openPopup(type, index) {
  room_type.value = type
  room_index.value = index
  room_visible.value = true
}

function chooseOperator(operator_id) {
  let key = `${plan_index.value}_${room_type.value}_${room_index.value}`
  console.log('添加的干员位置是', key, '干员是', operator_id)
  if (operator_selected.value[key]) {
    if (!operator_selected.value[key].includes(operator_id)) {
      operator_selected.value[key].push(operator_id)
    }
  } else {
    operator_selected.value[key] = [operator_id]
  }
  console.log(operator_selected.value)
}

function deleteOperator(operator_id) {
  let key = `${plan_index.value}_${room_type.value}_${room_index.value}`
  console.log('删除的干员位置是', key)
  if (operator_selected.value[key]) {
    operator_selected.value[key] = operator_selected.value[key].filter(e => {
      return e !== operator_id
    })
  }
  console.log(operator_selected.value)
}


let schedule_init = {
  title: "排班文件标题",
  description: "排班文件描述",
  author: "yituliu",
  buildingType: "243",
  id: 1697606525017292,
  planTimes: "3班",
  plans: []
}

function createScheduleJson(){
  console.log('开始创建')
  let plans = []
  for(let key in operator_selected.value){
        console.log(key.split('_'))
        plans[0]
  }


}



</script>