<template>
    <div style="background-color: aliceblue;">
    <button @click="cal()">计算</button><br>
    贷款零件<input type="text" v-model.number="furniturePartsLoan"><br>
    碳 <input type="text" v-model.number="carbonStick"><br>
    碳素 <input type="text" v-model.number="carbonBrick"><br>
    碳素组 <input type="text" v-model.number="carbonPack"><br>
    是否拆解碳<el-switch v-model="cabronFlag"></el-switch>
    是否刷SK5<el-switch v-model="apFlag"></el-switch>
    <div>需要{{ calResult.days.toFixed(0) }}天</div>
    <div>需要{{ calResult.apCost.toFixed(0) }}理智</div>
    <div>每日任务获得{{   }}天</div>
    <div>每周任务获得{{ calResult.apCost.toFixed(0) }}理智</div>
    <div>每月签到大约{{ calResult.days.toFixed(0) }}天</div>
    <div>{{ calResult.apCost.toFixed(0) }}理智</div>
   </div>

</template>

<script setup>

import { onMounted, ref } from 'vue';


let calResult = ref({
    days:0,
    apCost:0,
    lmdCost:0,
});  //计算结果对象

let furniturePartsLoan  = ref(-10000)  //家具币的贷款
let  carbonStick = ref(1000)  //库存碳  -家具币4
let  carbonBrick = ref(0)  //库存碳素  -家具币8
let  carbonPack = ref(0)  //库存碳素组  -家具币12

let  DailyTasksRewards = ref(72);  //每日获取的家具零件
let  WeeklyTaskRewards  = ref(35.7);  //每周平均每天获取的零件
let  check_in_monthlyRewards = ref(72);  //每月签到平均每天获取的家具零件

let  CertStore = ref(16.7);   //凭证商店平均每天获取的零件
let  SK5Rewards = ref(457.1);   //体力全刷SK5平均每天获取的零件

let apFlag = ref(true);  //判断是否刷SK5
let cabronFlag = ref(false);  //判断是否拆碳

function cal(){
       
    let difference =  furniturePartsLoan.value ;  //计算真实需要去还的贷款
    if(!cabronFlag.value) {
        difference +=  (carbonStick.value ) * 4 + carbonBrick.value * 8  + carbonPack.value * 12; //如果选择不拆碳就不计算
        DailyTasksRewards.value -= 12; //每日奖励有一部分是碳 
    }  
    if(!apFlag.value) SK5Rewards = 0;  //如果选择不刷SK5，奖励归零
      

       difference = difference>0?difference:-difference;
       calResult.value.days = difference / (DailyTasksRewards + WeeklyTaskRewards + CertStore + SK5Rewards); //计算需要多少天上岸
       calResult.value.apCost = calResult.value.days * SK5Rewards / 1.667;   //计算花费体力
       console.log(calResult.value.days);

}


onMounted(()=>{
   
    cal()
})

</script>