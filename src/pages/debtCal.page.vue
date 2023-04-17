<template>
  <div class="debt-collapse">
    <el-collapse v-model="activeNames" @change="handleChange">
      <el-collapse-item name="1">
        <template #title>
          <div class="gacha_title_icon"></div>
          <span class="collapse-item_title"> 上岸需要{{ calResult.days.toFixed(0) }}天 </span>
          <span class="collapse-item_title_url">yituliu.site</span>
        </template>
        <hr />
        <div class="universal_module">
          <div>当前零件剩余<input type="text" class="input_style" v-model.number="furniturePartsLoan" /></div>
          <div v-show="calResult.days < 0">已还清</div>
        </div>
        <div class="universal_module">
          <div>还清需要{{ calResult.days.toFixed(0) }}天</div>
          <div>需要{{ calResult.apCost.toFixed(0) }}理智</div>
          <div>拆解需要{{ calResult.lmdCost.toFixed(0) }}龙门币</div>
        </div>
      </el-collapse-item>
      <el-collapse-item name="2">
        <template #title>
          <div class="gacha_title_icon"></div>
          <span class="collapse-item_title"> 库存 </span>
        </template>
        <hr />
        <div class="universal_module">
          <div class="input_group">
            <div class="input_group_item">
              <div style="width: 70px">碳</div>
              <input type="text" class="input_style" v-model.number="carbonStick" @change="cal()" />
            </div>
            <div class="input_group_item">
              <div style="width: 70px">碳素</div>
              <input type="text" class="input_style" v-model.number="carbonBrick" @change="cal()" />
            </div>
            <div class="input_group_item">
              <div style="width: 70px">碳素组</div>
              <input type="text" class="input_style" v-model.number="carbonPack" @change="cal()" />
            </div>
          </div>

          <div>是否拆解碳<el-switch v-model="cabronFlag" @change="cal()"></el-switch></div>
          扣除库存后需要还{{ loansRepaid }} 个零件
        </div>
      </el-collapse-item>
      <el-collapse-item name="3">
        <template #title>
          <div class="gacha_title_icon"></div>
          <span class="collapse-item_title"> 日常任务 </span>
        </template>
        <hr />
        <div class="universal_module">
          <div>每日任务总计获得{{ calResult.daysParts.toFixed(0) }}零件</div>
          <div>每周任务总计获得{{ calResult.weeklyParts.toFixed(0) }}零件</div>
          <div>每月签到总计获得大约{{ calResult.monthlyParts.toFixed(0) }}零件</div>
        </div>
      </el-collapse-item>
      <el-collapse-item name="4">
        <template #title>
          <div class="gacha_title_icon"></div>
          <span class="collapse-item_title"> SK5额外刷取零件 </span>
        </template>
        <hr />
        <div class="universal_module">
          每天刷 <input type="text" class="input_style" v-model.number="SK5Times" @change="cal()" />次SK5<br />
        </div>
      </el-collapse-item>
    </el-collapse>
  </div>
</template>

<script setup>
import { onMounted, ref, watch } from "vue";

let calResult = ref({
  days: 0,
  apCost: 0,
  lmdCost: 0,
  daysParts: 0,
  weeklyParts: 0,
  monthlyParts: 0,
}); //计算结果对象

let furniturePartsLoan = ref(0); //家具币的贷款
let carbonStick = ref(0); //库存碳  -家具币4
let carbonBrick = ref(0); //库存碳素  -家具币8
let carbonPack = ref(0); //库存碳素组  -家具币12
let loansRepaid = ref(0); //待偿还贷款

let DailyTasksRewards = 72; //每日获取的家具零件
let WeeklyTaskRewards = 35.7; //每周平均每天获取的零件
let check_in_monthlyRewards = 6.93; //每月签到平均每天获取的家具零件

let CertStore = 16.7; //凭证商店平均每天获取的零件
let SK5Times = ref(1); //刷碳本次数

let cabronFlag = ref(true); //判断是否拆碳

function cal() {
  calResult.value = {
    days: 0,
    apCost: 0,
    lmdCost: 0,
    daysParts: 0,
    weeklyParts: 0,
    monthlyParts: 0,
  }; //计算结果对象
  
  
  loansRepaid.value = furniturePartsLoan.value > 0 ? furniturePartsLoan.value : -furniturePartsLoan.value; //计算真实需要去还的贷款

  if (cabronFlag.value) {
    //拆解碳
    loansRepaid.value -= carbonStick.value * 4 + carbonBrick.value * 8 + carbonPack.value * 12; //计算碳可拆解多少零件
    calResult.value.lmdCost = (carbonStick.value + carbonBrick.value + carbonPack.value) * 100; //拆解碳的龙门币消耗
  } else {
    //不拆解碳
    DailyTasksRewards = 60; //每日奖励扣除碳之后的奖励
    check_in_monthlyRewards = 4.67; //每月奖励扣除碳之后的奖励
  }

  let SK5Rewards = 50 * SK5Times.value; //SK5每局50个零件

  console.log(loansRepaid.value);

  

  calResult.value.days =
    loansRepaid.value / (DailyTasksRewards + WeeklyTaskRewards + check_in_monthlyRewards + CertStore + SK5Rewards); //计算需要多少天上岸

  calResult.value.apCost = (calResult.value.days * SK5Rewards) / 1.667; //计算花费体力
  calResult.value.daysParts = calResult.value.days * DailyTasksRewards; //计算每日获得多少零件
  calResult.value.weeklyParts = calResult.value.days * WeeklyTaskRewards; //计算每周获得多少零件
  calResult.value.monthlyParts = calResult.value.days * check_in_monthlyRewards; //计算每月获得多少零件

  if (cabronFlag.value) {
    calResult.value.lmdCost += parseInt(calResult.value.days) * 3 * 100; //如果选择拆解零件则需计算每日赠送的碳的龙门币消耗
  }

  console.log(calResult.value.days);
}

const activeNames = ref(["1", "2", "3", "4", "5"]);
const handleChange = (val) => {
  console.log(val);
};

onMounted(() => {
  furniturePartsLoan.value = parseInt(localStorage.getItem("furniturePartsLoan")) || 0;
  carbonStick.value = parseInt(localStorage.getItem("carbonStick")) || 0;
  carbonBrick.value = parseInt(localStorage.getItem("carbonBrick")) || 0;
  carbonPack.value = parseInt(localStorage.getItem("carbonPack")) || 0;
  cabronFlag.value = (localStorage.getItem("cabronFlag") || false) == "true";
  SK5Times.value = parseInt(localStorage.getItem("SK5Times")) || 0;
  cal();
});

watch(furniturePartsLoan, (new_value) => {
  localStorage.setItem("furniturePartsLoan", new_value);
  cal();
});

watch(carbonStick, (new_value) => {
  localStorage.setItem("carbonStick", new_value);
  cal();
});

watch(carbonBrick, (new_value) => {
  localStorage.setItem("carbonBrick", new_value);
  cal();
});

watch(carbonPack, (new_value) => {
  localStorage.setItem("carbonPack", new_value);
  cal();
});

watch(cabronFlag, (new_value) => {
  localStorage.setItem("cabronFlag", new_value);
  cal();
});

watch(SK5Times, (new_value) => {
  localStorage.setItem("SK5Times", new_value);
  cal();
});
</script>

<style scoped>
.el-collapse {
  padding: 8px 16px 16px;
}

.el-collapse-item {
  margin-top: 8px;
}

hr {
  margin-top: 0;
}

:global(.el-collapse-item__content) {
  padding-bottom: 6px;
}
</style>
