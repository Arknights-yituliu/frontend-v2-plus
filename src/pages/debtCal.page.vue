<template>
  <div class="debt-collapse">
    <el-collapse v-model="activeNames" @change="handleChange">
      <el-collapse-item name="1">
        <template #title>
          <div class="gacha_title_icon"></div>
          <span class="collapse-item_title"> 仅需{{ calResult.weeks.toFixed(0) }}周即可还清欠款！ </span>
          <span class="collapse-item_title_url">yituliu.site</span>
        </template>
        <hr />
        <div class="universal_module">
          <div>当前负债总额<input type="text" class="input_style" v-model.number="furniturePartsLoan" /></div>
          <div v-show="calResult.weeks < 0">已还清</div>
        </div>
        <div class="universal_module">
          <div>{{ calResult.weeks.toFixed(0) }}周后可还清</div>
          <div>拆碳还债<el-switch v-model="cabronFlag" @change="cal()"></el-switch></div>
          <div>{{ calResult.lmdCost.toFixed(0) }}龙门币可拆{{furniturePartsByCarbon}}零件，尚欠{{ loansRepaid }}个零件</div>
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
          <div class="universal_module">
            打工还债，刷 <input type="text" class="input_style" v-model.number="SK5Times" @change="cal()" />次SK5，需要{{ calResult.apCost.toFixed(0) }}理智<br />
        </div>
        </div>
        </div>
      </el-collapse-item>

      <el-collapse-item name="3">
        <template #title>
          <div class="gacha_title_icon"></div>
          <span class="collapse-item_title"> 详情 </span>
        </template>
        <hr />
        <div class="universal_module">
          <div>每日任务总计获得{{ calResult.dailyParts.toFixed(0) }}零件</div>
          <div>每周任务总计获得{{ calResult.weeklyParts.toFixed(0) }}零件</div>
          <div>每月签到总计获得大约{{ calResult.monthlyParts.toFixed(0) }}零件</div>
          <div>绿票商店总计获得大约{{ calResult.CertStoreParts.toFixed(0) }}零件</div>
          <div>每日任务获得{{ calResult.dailyCarbon }}个碳，消耗{{ calResult.lmdCost_daily }}龙门币获得{{ calResult.dailyPartsByCarbon }}零件，</div>
          
        </div>
      </el-collapse-item>

    </el-collapse>
  </div>
</template>

<script setup>
import { onMounted, ref, watch } from "vue";

let calResult = ref({
    weeks: 0,
    apCost: 0,
    dailyCarbon:0,
    dailyParts: 0,
    dailyPartsByCarbon:0,
    weeklyParts: 0,
    monthlyParts: 0,
    CertStoreParts:0,
    lmdCost: 0,
    lmdCost_daily:0,
}); //计算结果对象

let furniturePartsLoan = ref(0); //家具币的贷款
let carbonStick = ref(0); //库存碳  -家具币4
let carbonBrick = ref(0); //库存碳素  -家具币8
let carbonPack = ref(0); //库存碳素组  -家具币12
let loansRepaid = ref(0); //待偿还贷款
let furniturePartsByCarbon = ref(0);

let DailyTasksRewards = 504; //每日获取的家具零件
let WeeklyTaskRewards = 250; //每周平均每天获取的零件
let check_in_monthlyRewards = 52; //每月签到平均每天获取的家具零件

let CertStore = 125; //凭证商店平均每天获取的零件
let SK5Times = ref(1); //刷碳本次数

let cabronFlag = ref(true); //判断是否拆碳

function cal() {
  calResult.value = {
    weeks: 0,
    apCost: 0,
    dailyCarbon:0,
    dailyParts: 0,
    dailyPartsByCarbon:0,
    weeklyParts: 0,
    monthlyParts: 0,
    CertStoreParts:0,
    lmdCost: 0,
    lmdCost_daily:0,
  }; //计算结果对象
  
  
  loansRepaid.value = furniturePartsLoan.value > 0 ? furniturePartsLoan.value : -furniturePartsLoan.value; //计算真实需要去还的贷款

  if (cabronFlag.value) {
    //拆解碳
    furniturePartsByCarbon.value = carbonStick.value * 4 + carbonBrick.value * 8 + carbonPack.value * 12
    loansRepaid.value -=furniturePartsByCarbon.value ; //计算碳可拆解多少零件
    calResult.value.lmdCost = (carbonStick.value + carbonBrick.value + carbonPack.value) * 100; //拆解碳的龙门币消耗
    DailyTasksRewards = 504; //每日奖励扣除碳之后的奖励
    check_in_monthlyRewards = 52; //每月奖励扣除碳之后的奖励
  } else {
    //不拆解碳
    furniturePartsByCarbon.value = 0;
    DailyTasksRewards = 420; //每日奖励扣除碳之后的奖励
    check_in_monthlyRewards = 20; //每月奖励扣除碳之后的奖励
  }

  let SK5Rewards = 50 * SK5Times.value; //SK5每局50个零件

 

  

  calResult.value.weeks = loansRepaid.value / (DailyTasksRewards + WeeklyTaskRewards + check_in_monthlyRewards 
  + CertStore + SK5Rewards); //计算需要多少天上岸
  console.log('每日获得:',DailyTasksRewards + WeeklyTaskRewards + check_in_monthlyRewards 
  + CertStore + SK5Rewards);
        let  weeksOfRepayment  = parseInt(calResult.value.weeks)
  calResult.value.apCost = (weeksOfRepayment * SK5Rewards) / 1.667; //计算花费体力
  calResult.value.dailyParts = weeksOfRepayment * DailyTasksRewards; //计算每日获得多少零件
  calResult.value.weeklyParts = weeksOfRepayment * WeeklyTaskRewards; //计算每周获得多少零件
  calResult.value.monthlyParts = weeksOfRepayment * check_in_monthlyRewards; //计算每月获得多少零件
  calResult.value.CertStoreParts = weeksOfRepayment * CertStore; //计算绿票商店获得多少零件

  if (cabronFlag.value) {
    calResult.value.dailyCarbon = weeksOfRepayment * 21
    calResult.value.dailyPartsByCarbon = weeksOfRepayment * 84;
    calResult.value.lmdCost_daily = weeksOfRepayment * 21 * 100; //如果选择拆解零件则需计算每日赠送的碳的龙门币消耗
  }

}

const activeNames = ref(["1", "2", "3", "4", "5"]);
const handleChange = (val) => {
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
