<template>

  <div class="room_wrap">
    <!--  左边站点-->
    <div class="room_wrap_left">
      <!--     控制中枢-->
      <div class="room_name" style="color: #1b5e20"> 控制中枢</div>
      <div class="room_bg control">
        <div class="operator_image_wrap"
             v-for="(charName,index) in operators5" :key="index">
          <div :class="getAvatar(charName)">
          </div>
        </div>
      </div>
      <!--    贸易站-->
      <div class="room_name" style="color: #0288d1"> 贸易站</div>
      <div class="room_bg trading" v-for="index of buildingType.trading" :key="index">

        <div class="operator_image_wrap"
             v-for="(charName,index) in operators" :key="index">
          <div :class="getAvatar(charName)">
          </div>
        </div>
      </div>

      <!--  制造站-->
      <div class="room_name" style="color: #ffbe00"> 制造站</div>
      <div class="room_bg manufacture" v-for="index of buildingType.manufacture" :key="index">
        <div class="operator_image_wrap"
             v-for="(charName,index) in operators" :key="index">
          <div :class="getAvatar(charName)">
          </div>
        </div>
      </div>

      <!--  发电站-->
      <div class="room_name" style="color: #d39d03"> 发电站</div>
      <div class="room_bg power" v-for="index of buildingType.power" :key="index">
        <div class="operator_image_wrap"
             v-for="(charName,index) in operators1" :key="index">
          <div :class="getAvatar(charName)">
          </div>
        </div>
      </div>

    </div>

    <div class="room_wrap_center">
      <!--     宿舍-->
      <div class="room_name" style="color: #00cde8"> 宿舍</div>
      <div class="room_bg dormitory" v-for="index of 5" :key="index">
        <div class="operator_image_wrap"
             v-for="(charName,index) in operators5" :key="index">
          <div :class="getAvatar(charName)">
          </div>
        </div>
      </div>
    </div>


    <div class="room_wrap_right">
      <!--     会客室-->
      <div class="room_name" style="color: #ff8800"> 会客室</div>
      <div class="room_bg meeting">
        <div class="operator_image_wrap"
             v-for="(charName,index) in operators2" :key="index">
          <div :class="getAvatar(charName)">
          </div>
        </div>
      </div>
      <!--     办公室 -->
      <div class="room_name" style="color: #606060"> 会客室</div>
      <div class="room_bg hire" >
        <div class="operator_image_wrap"
             v-for="(charName,index) in operators1" :key="index">
          <div :class="getAvatar(charName)">
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import {ref} from "vue"
import '/src/assets/css/tool/schedule.css'
import '/src/assets/css/sprite/sprite_avatar_6.css'
import '/src/assets/css/sprite/sprite_avatar_5.css'
import '/src/assets/css/sprite/sprite_avatar_4.css'

let buildingType = ref({
  trading: 2,
  manufacture: 4,
  power: 3
})

function getAvatar(charName) {
  return `operator_image bg-${charName}`
}

let operators = ['char_010_chen', 'char_010_chen', 'char_010_chen']

let operators1 = ['char_010_chen']
let operators2 = ['char_010_chen','char_010_chen']
let operators5 = ['char_010_chen', 'char_010_chen', 'char_010_chen', 'char_010_chen', 'char_010_chen']

let schedule_init = {
  title: "排班文件标题",
  description: "排班文件描述",
  author: "yituliu",
  buildingType: "243",
  id: 1697606525017292,
  planTimes: "3班",
  plans: []
}
let schedule = ref({})
for (const i in [1, 2, 3, 4, 5]) {
  const drones = {
    room: "trading",
    index: 1,
    enable: true,
    order: "pre"
  }
  const period = [['00:00', '00:00'], ['00:00', '00:00'], ['00:00', '00:00'], ['00:00', '00:00']]
  let control = [
    {
      operators: ["阿米娅", "凯尔希", "琴柳", "令", "夕"]
    }
  ]

  let trading = [
    {
      operators: ['null', 'null', 'null'],
      "sort": false,
      "autofill": false,
      "product": "LMD"
    },
    {
      "operators": ['null', 'null', 'null'],
      "sort": false,
      "autofill": false,
      "product": "LMD"
    },
    {
      "operators": ['null', 'null', 'null'],
      "sort": false,
      "autofill": false,
      "product": "LMD"
    },
    {
      "operators": ['null', 'null', 'null'],
      "sort": false,
      "autofill": false,
      "product": "LMD"
    },
    {
      "operators": ['null', 'null', 'null'],
      "sort": false,
      "autofill": false,
      "product": "LMD"
    },
    {
      "operators": ['null', 'null', 'null'],
      "sort": false,
      "autofill": false,
      "product": "LMD"
    }
  ]
  let manufacture = [
    {
      operators: ['null', 'null', 'null'],
      "sort": false,
      "autofill": false,
      "product": "Battle Record"
    },
    {
      "operators": ['null', 'null', 'null'],
      "sort": false,
      "autofill": false,
      "product": "Battle Record"
    },
    {
      "operators": ['null', 'null', 'null'],
      "sort": false,
      "autofill": false,
      "product": "Battle Record"
    },
    {
      "operators": ['null', 'null', 'null'],
      "sort": false,
      "autofill": false,
      "product": "Battle Record"
    },
    {
      "operators": ['null', 'null', 'null'],
      "sort": false,
      "autofill": false,
      "product": "Battle Record"
    },
    {
      "operators": ['null', 'null', 'null'],
      "sort": false,
      "autofill": false,
      "product": "Battle Record"
    }
  ]

  let power = [
    {
      "operators": ['null'],
      "autofill": false
    },
    {
      "operators": ['null'],
      "autofill": false
    },
    {
      "operators": ['null'],
      "autofill": false
    }
  ]

  let hire = [
    {
      "operators": ['null'],
      "autofill": false
    }
  ]
  let meeting = [
    {
      "operators": ['null', 'null'],
      "autofill": false
    }
  ]
  let dormitory = [
    {
      "operators": ['null', 'null', 'null', 'null', 'null'],
      "sort": false,
      "autofill": false
    },
    {
      "operators": ['null', 'null', 'null', 'null', 'null'],
      "sort": false,
      "autofill": false
    },
    {
      "operators": ['null', 'null', 'null', 'null', 'null'],
      "sort": false,
      "autofill": false
    },
    {
      "operators": ['null', 'null', 'null', 'null', 'null'],
      "sort": false,
      "autofill": false
    }
  ]
  let room = {
    control: control,
    trading: trading,
    manufacture: manufacture,
    power: power,
    hire: hire,
    meeting: meeting,
    dormitory: dormitory
  }

  let plan = {
    drones: drones,
    period: period,
    room: room,
    name: `第${i}组`,
    description: `描述${i}`
  }
  schedule_init.plans.push(plan)
}

// console.log(JSON.stringify(schedule_init))
</script>