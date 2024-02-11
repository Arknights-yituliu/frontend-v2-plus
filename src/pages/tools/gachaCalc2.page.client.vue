<script setup>
import {onMounted, ref} from "vue";
import '/src/assets/css/tool/gacha_calc.css'
import * as echarts from "echarts";
import '/src/assets/css/sprite_gacha.css'
import potentialTable from '/src/static/json/tools/potentialGachaResources.json'
import HONEY_CAKE_TABLE from '/src/static/json/tools/activityScheduleByHoneycake.json'

let honeyCakeTable = ref([])
for (const name in HONEY_CAKE_TABLE) {
  let honeyCake = HONEY_CAKE_TABLE[name]
  honeyCake.start = new Date(honeyCake.start).getTime()
  honeyCake.end = new Date(honeyCake.end).getTime()
  honeyCake.name = name
  honeyCakeTable.value.push(honeyCake)
}

//活动列表，包含活动的名称，开启和结束时间
let activityList = ref([
  {
    name: '春节(2.15)'
  },
  {
    name: '彩六二期联动(3.21)'
  },
  {
    name: '敬请期待'
  }
])

//选中的活动名称
let selectedActivity = ref('春节(2.15)')

//通过name控制折叠面板的展开，如果集合中有面板的name，面板会默认展开，当点击展开面板时，
//面板组件也会将面板组件的name赋予这个集合
let resultCollapseActiveNames = ref(['calculationResult'])
let optionsCollapseActiveNames = ref(['exist', 'custom', 'daily', 'potential',
  'recharge', 'activity', 'other'])


let existResources = ref({
  originium: 0,
  orundum: 0,
  gachaTicket: 0,
  tenGachaTicket: 0,
  correctOrundum: 0,
  skinBudget: 0,
})

let dailyReward = ref({
  dailyTask: 4,
  dailyTaskOrundum: 0,
  weeklyTask: 2,
  weeklyTaskCompleted: true,
  weeklyTaskOrundum: 0,
  certificateStoreF2: 2,
  certificateStoreF2Completed: true,
  certificateStoreF2Orundum: 0,
  certificateStoreF2GachaTicket: 0,
  annihilation: 3,
  annihilationCompleted: true,
  annihilationOrundum: 0,
  checkIn: 3,
  checkInGachaTicket: 0,

})

let produceOrundum = ref({
  ap: 0,
  coefficient: 0,
  output: 0,
})

let certificateStoreF3 = ref({
  certificate: 0,
  disposableCertificate: 0,
  orundum: 0
})

let originiumIsUsed = ref(true)


let monthlyShopExchangeGachaTicket = ref({
  '2月黄票兑换': {
    name: '2月黄票兑换',
    display: '2月黄票兑换',
    originium: 0,
    orundum: 0,
    gachaTicket: 8,
    tenGachaTicket: 3,
    start: 1000,
    end: 1000,
  }
})

let selectedPackName = ref([])
let selectedPotentialName = ref([])

function setPieChart(data) {
  let option = {
    tooltip: {
      formatter: "{a} {b} : {c}抽,占 ({d}%)",
      position: "inner",
    },

    series: [
      {
        name: "攒抽占比",
        type: "pie",
        radius: "70%",
        center: ["50%", "50%"],
        data: data,
        itemStyle: {},
        label: {
          show: true,
          textStyle: {color: "rgb(255,69,0)", fontSize: "16"},
        },
        labelLine: {
          length: 6,
          length2: 6,
        },

        emphasis: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: "rgba(0, 0, 0, 0.5)",
        },
      },
    ],
  };
  // console.log(option);
  myChart.setOption(option);
}

let myChart = void 0;

let pieChartData = ref([
  {value: 22, name: "现有"},
  {value: 33, name: "潜在"},
  {value: 44, name: "日常"},
  {value: 22, name: "氪金"},
  {value: 33, name: "活动"},
  {value: 44, name: "其它"}
])


function getDrawResourcesIcon(id) {
  return `bg-${id}icon `
}

//攒抽计算结果
let calculationResult = ref({
  totalDraw: 0,  //总抽数
  totalAmountOfRecharge: 0,  //选择的礼包总价格
  existTotalDraw: 0,
  dailyTotalDraw: 0,
  potentialTotalDraw: 0,
  rechargeTotalDraw: 0,
  activityTotalDraw: 0,
  otherTotalDraw: 0,
  originium: 0,
  orundum: 0,
  gachaTicket: 0,
  tenGachaTicket: 0,
})

const currentTimestamp = new Date().getTime();

let endTimestamp = ref(1711008000000)


function compute() {

  existCalc()
  honeyCakeCalc()
  dailyRewardCalc()

  /**
   * 计算从当前到活动结束时间的日常奖励
   * @returns {{}}
   */
  function dailyRewardCalc() {
    let mondayCount = 0 //共计有多少个星期一
    let days = 0 //共计有多少天
    let checkInTimes = 0 //多少次签到
    let shopTimes = 0 //可以买几次绿票商店
    let startDate = new Date() //当前时间
    let endDate = new Date(endTimestamp.value) //结束时间
    //如果今天不是周一，星期一总数加1，因为有可能不在周一打剿
    if (startDate.getDay() !== 1) {
      mondayCount++
    }
    //如果今天不是1号，商店购买次数加1，因为有可能1号买不完商店
    if (startDate.getDate() !== 1) {
      shopTimes++
    }
    //循环计算当前时间到活动结束时间
    while (startDate <= endDate) {
      //如果是星期一，星期一总数加1
      if (startDate.getDay() === 1) {
        mondayCount++
      }
      //如果是21号，签到次数加1
      if (startDate.getDate() === 21) {
        checkInTimes++
      }
      //如果是1号，商店购买次数加1
      if (startDate.getDate() === 1) {
        shopTimes++
      }
      //天数加1
      days++
      //将当前日期加1天
      startDate.setDate(startDate.getDate() + 1)
    }
    let weeks = mondayCount  //总周数
    let annihilationTimes = mondayCount //打剿次数
    //如果本周周常已经做完则周数减1
    if (dailyReward.value.weeklyTaskCompleted) {
      weeks = mondayCount > 0 ? mondayCount - 1 : mondayCount
    }
    //如果本周已经打剿了则打剿次数减1
    if (dailyReward.value.annihilationCompleted) {
      annihilationTimes = mondayCount > 0 ? mondayCount - 1 : mondayCount
    }
    //如果本月已清空绿票商店则购买商店次数减1
    if (dailyReward.value.certificateStoreF2Completed) {
      shopTimes = shopTimes > 0 ? shopTimes - 1 : shopTimes
    }
    //对日常资源计算结果对象进行赋值
    dailyReward.value.dailyTask = days
    dailyReward.value.dailyTaskOrundum = days * 100
    dailyReward.value.weeklyTask = weeks;
    dailyReward.value.weeklyTaskOrundum = weeks * 500
    dailyReward.value.checkIn = checkInTimes
    dailyReward.value.checkInGachaTicket = checkInTimes
    dailyReward.value.certificateStoreF2 = shopTimes
    dailyReward.value.certificateStoreF2Orundum = shopTimes * 600
    dailyReward.value.certificateStoreF2GachaTicket = shopTimes * 4
    dailyReward.value.annihilation = annihilationTimes
    dailyReward.value.annihilationOrundum = annihilationTimes * 1800

    calculationResult.value.dailyTotalDraw = Math.floor((days * 100 + weeks * 500 + shopTimes * 600 + annihilationTimes * 1800) / 600 +
        checkInTimes + shopTimes * 4)
    console.log(calculationResult.value)

    return {}
  }

  /**
   * 计算用户库存抽卡次数
   */
  function existCalc() {
    const orundum = parseInt(existResources.value.orundum)
    const originium = parseInt(existResources.value.originium)
    const gachaTicket = parseInt(existResources.value.gachaTicket)
    const tenGachaTicket = parseInt(existResources.value.tenGachaTicket)

    calculationResult.value.existTotalDraw =
        Math.floor(orundum / 600 + originium * 0.3 + gachaTicket + tenGachaTicket * 10)
  }



  /**
   * 计算预测奖励结果
   */
  function honeyCakeCalc() {
    let totalDraw = 0
    for (const honeyCake of honeyCakeTable.value) {
      if(!checkRewardStatus(honeyCake)){
               continue
      }
      totalDraw += (honeyCake.orundum / 600 + honeyCake.originium * 0.3 + honeyCake.permit + honeyCake.permit10 * 10)
    }
    calculationResult.value.otherTotalDraw = Math.floor(totalDraw)
  }

}

let activityType = ref('新年限定') //活动类型

/**
 * 检查奖励是否可以被计入攒抽结果中
 * @param reward 奖励的信息
 * @returns {boolean} 是否可计入
 */
function checkRewardStatus(reward){

  //活动结束时间在当前时间之前，活动已结束
  if(reward.end<currentTimestamp){
    return false
  }
  //活动开始时间在选择的结束时间节点之后，活动未开启
  if(reward.start>endTimestamp.value){
    return false
  }
  //判断是否当前奖励的类型是否可以被计入
  //公共类型都可以计入，特殊类型需要符合当前活动类型，例如联动的专属十连不能被计入新春的攒抽结果中
  if(reward.rewardType){
    return reward.rewardType === '公共' || reward.rewardType === activityType.value;
  }
}

onMounted(() => {
  myChart = echarts.init(document.getElementById("calculationResultPieChart"));
  setPieChart(pieChartData.value)
  compute()
})

const handleChange = (val) => {
  console.log(val)
}

</script>

<template>
  <div class="gc-container">
    <!--计算结果-->
    <div class="gc-result-wrap" id="total-table">
      <el-collapse v-model="resultCollapseActiveNames" @change="handleChange" style="border: none">
        <el-collapse-item name="calculationResult" class="gc-collapse-item">
          <template #title>
            <div class="gc-collapse-title-icon" style="background: #ec8338"></div>
            <span class="gc-collapse-title-font">
                共计{{ calculationResult.totalDraw }}抽，氪金{{ calculationResult.totalAmountOfRecharge }}元
              </span>
          </template>

          <!--选择攒到某个活动的单选框-->
          <div class="gc-radio-group-wrap">
            <el-radio-group v-model="selectedActivity" size="large">
              <el-radio-button v-for="(activity,index) in activityList" :key="index" :label="activity.name"
                               class="custom-radio-button-style"/>
            </el-radio-group>
          </div>

          <div class="gc-draw-result">
            <div style="width: 290px;height: 220px" id="calculationResultPieChart">
            </div>
            <table class="gc-total-table">
              <tbody>
              <tr>
                <td>现有</td>
                <td>{{ calculationResult.existTotalDraw }}</td>
                <td>抽</td>
              </tr>
              <tr>
                <td>日常</td>
                <td>{{ calculationResult.dailyTotalDraw }}</td>
                <td>抽</td>
              </tr>
              <tr>
                <td>潜在</td>
                <td>{{ calculationResult.potentialTotalDraw }}</td>
                <td>抽
                </td>
              </tr>
              <tr>
                <td>氪金</td>
                <td>{{ calculationResult.rechargeTotalDraw }}</td>
                <td>抽</td>
              </tr>
              <tr>
                <td>活动(估算)</td>
                <td>{{ calculationResult.activityTotalDraw }}</td>
                <td>抽</td>
              </tr>
              <tr>
                <td>其它(估算)</td>
                <td>{{ calculationResult.otherTotalDraw }}</td>
                <td>抽</td>
              </tr>
              </tbody>
            </table>
          </div>
          <div class="gc-resources-result">
            <div class="gc-sprite-wrap">
              <div :class="getDrawResourcesIcon('4002')"></div>
              <span>{{ calculationResult.originium }}</span>
            </div>
            <div class="gc-sprite-wrap">
              <div :class="getDrawResourcesIcon('4003')"></div>
              <span>{{ calculationResult.orundum }}</span>
            </div>
            <div class="gc-sprite-wrap">
              <div :class="getDrawResourcesIcon('7003')"></div>
              <span>{{ calculationResult.gachaTicket }}</span>
            </div>
            <div class="gc-sprite-wrap">
              <div :class="getDrawResourcesIcon('7004')"></div>
              <span>{{ calculationResult.tenGachaTicket }}</span>
            </div>
          </div>

        </el-collapse-item>
      </el-collapse>
    </div>

    <div class="gc-result-wrap">
      <el-collapse v-model="optionsCollapseActiveNames" @change="handleChange" style="border: none">
        <el-collapse-item name="exist" class="gc-collapse-item">
          <template #title>
            <div class="gc-collapse-title-icon" style="background: rgba(119,118,255,0.8)"></div>
            <span class="gc-collapse-title-font">
               库存/预留&emsp;{{ calculationResult.existTotalDraw }}抽
              </span>
          </template>
          <div class="gc-title">
            <span></span> 当前库存
          </div>

          <div class="gc-input-bar">
            <div class="gc-sprite-wrap">
              <div :class="getDrawResourcesIcon('4002')"></div>
            </div>
            <input @change="compute" v-model.number="existResources.originium">
            <div class="gc-sprite-wrap">
              <div :class="getDrawResourcesIcon('4003')"></div>
            </div>
            <input @change="compute" v-model.number="existResources.orundum">

            <div class="gc-sprite-wrap">
              <div :class="getDrawResourcesIcon('7003')"></div>
            </div>
            <input @change="compute" v-model.number="existResources.gachaTicket">
            <div class="gc-sprite-wrap">
              <div :class="getDrawResourcesIcon('7004')"></div>
            </div>
            <input @change="compute" v-model.number="existResources.tenGachaTicket">
          </div>

          <!--          <div class="gc-resources-result">-->
          <!--            <div class="gc-sprite-wrap">-->
          <!--              <div :class="getDrawResourcesIcon('4002')"></div>-->
          <!--            </div>-->
          <!--            <input v-model.number="existResources.originium">-->
          <!--            <div class="gc-sprite-wrap">-->
          <!--              <div :class="getDrawResourcesIcon('4003')"></div>-->
          <!--              <input v-model.number="existResources.orundum">-->
          <!--            </div>-->
          <!--            <div class="gc-sprite-wrap">-->
          <!--              <div :class="getDrawResourcesIcon('7003')"></div>-->
          <!--              <input v-model.number="existResources.gachaTicket">-->
          <!--            </div>-->
          <!--            <div class="gc-sprite-wrap">-->
          <!--              <div :class="getDrawResourcesIcon('7004')"></div>-->
          <!--              <input v-model.number="existResources.tenGachaTicket">-->
          <!--            </div>-->
          <!--          </div>-->
          <div class="gc-switch-wrap">
            <span>是否使用源石抽卡</span>
            <el-switch v-model="originiumIsUsed"></el-switch>
          </div>

          <div class="gc-title">
            <span></span> 预留，自定义修正
          </div>
          <div class="gc-input-bar">
            <input v-model.number="existResources.correctOrundum">
            <span>合成玉自定义修正</span>
            <div :class="getDrawResourcesIcon('4003')"></div>
            <span>{{ existResources.correctOrundum }}</span>
          </div>
          <span class="gc-tip"> 例如给轮换池预留、其它来源等，可填负数</span>
          <el-slider v-model.number="existResources.skinBudget" :step="1" :min="0" :max="10"
                     show-stops show-input @change="compute()" style="width: 90%;margin: 0 5%">
          </el-slider>
          <span class="gc-tip">预留皮肤（18石/件）</span>

        </el-collapse-item>
        <el-collapse-item name="custom" class="gc-collapse-item">
          <template #title>
            <div class="gc-collapse-title-icon" style="background: rgba(119,118,255,0.8)"></div>
            <span class="gc-collapse-title-font">
               搓玉/绿票商店&emsp;{{ calculationResult.existTotalDraw }}抽
              </span>
          </template>
          <div class="gc-title">
            <span></span>搓玉计算
          </div>

          <div class="gc-input-bar">
            <input v-model.number="produceOrundum.ap">
            <span>用于搓玉的理智 x </span>
            <input v-model.number="produceOrundum.coefficient">
            <span>搓玉系数 = </span>
            <div :class="getDrawResourcesIcon('4003')"></div>
            <span>{{ produceOrundum.output }}</span>
          </div>
          <span class="gc-tip">搓玉系数：1理智可搓多少玉，1-7搓玉系数1.09</span>

          <div class="gc-title">
            <span></span> 绿票商店第三层
          </div>

          <div class="gc-input-bar">
            <span>现有绿票</span>
            <input v-model.number="certificateStoreF3.certificate">
            <span>
              ，有{{ certificateStoreF3.disposableCertificate }}绿票可换
            </span>
            <div :class="getDrawResourcesIcon('4003')"></div>
            <span>{{ certificateStoreF3.orundum }}</span>
          </div>
          <span class="gc-tip">现有绿票数 - 第一层共需1490绿票 - 第二层共需10100绿票 = 可用于换玉的绿票数</span>
          <span class="gc-tip">鉴于第二层有不少性价比较低的物品，建议囤够2w以上绿票再考虑绿票换玉</span>
        </el-collapse-item>

        <el-collapse-item name="daily" class="gc-collapse-item">
          <template #title>
            <div class="gc-collapse-title-icon" style="background: rgba(119,118,255,0.8)"></div>
            <span class="gc-collapse-title-font">
               日常积累&emsp;{{ calculationResult.dailyTotalDraw }}抽
              </span>
          </template>

          <div class="gc-resources-bar">
              <span class="gc-resources-bar-label">
                日常{{ dailyReward.dailyTask }}天
              </span>
            <div class="gc-resources-bar-content">
              <div class="gc-sprite-wrap">
                <div :class="getDrawResourcesIcon('4003')"></div>
                <span>{{ dailyReward.dailyTaskOrundum }}</span>
              </div>
            </div>
          </div>
          <!--          <el-divider></el-divider>-->
          <div class="divider"></div>
          <div class="gc-resources-bar">
              <span class="gc-resources-bar-label">
                周常{{ dailyReward.weeklyTask }}周
              </span>
            <div class="gc-resources-bar-content">
              <div class="gc-sprite-wrap">
                <div :class="getDrawResourcesIcon('4003')"></div>
                <span>{{ dailyReward.weeklyTaskOrundum }}</span>
              </div>
            </div>
            <div class="gc-resources-bar-btn">
              <el-switch v-model="dailyReward.weeklyTaskCompleted"></el-switch>
              本周已完成
            </div>
          </div>

          <div class="gc-resources-bar">
              <span class="gc-resources-bar-label">
                剿灭{{ dailyReward.annihilation }}周
              </span>
            <div class="gc-resources-bar-content">
              <div class="gc-sprite-wrap">
                <div :class="getDrawResourcesIcon('4003')"></div>
                <span>{{ dailyReward.annihilationOrundum }}</span>
              </div>
            </div>
            <div class="gc-resources-bar-btn">
              <el-switch v-model="dailyReward.annihilationCompleted"></el-switch>
              本周已完成
            </div>
          </div>
          <div class="divider"></div>
          <div class="gc-resources-bar">
              <span class="gc-resources-bar-label">
                绿票商店{{ dailyReward.certificateStoreF2 }}月
              </span>
            <div class="gc-resources-bar-content">
              <div class="gc-sprite-wrap">
                <div :class="getDrawResourcesIcon('4003')"></div>
                <span>{{ dailyReward.certificateStoreF2Orundum }}</span>
              </div>
              <div class="gc-sprite-wrap">
                <div :class="getDrawResourcesIcon('7003')"></div>
                <span>{{ dailyReward.certificateStoreF2GachaTicket }}</span>
              </div>
            </div>
            <div class="gc-resources-bar-btn">
              <el-switch v-model="dailyReward.certificateStoreF2Completed"></el-switch>
              本周已完成
            </div>
          </div>

          <div class="gc-resources-bar">
              <span class="gc-resources-bar-label">
                每月签到{{ dailyReward.checkIn }}月
              </span>
            <div class="gc-resources-bar-content">
              <div class="gc-sprite-wrap">
                <div :class="getDrawResourcesIcon('7003')"></div>
                <span>{{ dailyReward.checkInGachaTicket }}</span>
              </div>
            </div>
          </div>
          <div class="divider"></div>


          <el-checkbox-group v-model="selectedPackName" style="margin: 4px">
            <el-checkbox-button v-for="(pack,name) in monthlyShopExchangeGachaTicket"
                                :key="name" :label="name">
              <div class="gc-pack-bar">
                <span class="gc-pack-bar-title">{{ name }}</span>
                <div class="gc-pack-bar-content">
                  <div class="gc-sprite-wrap">
                    <div :class="getDrawResourcesIcon('7003')"></div>
                    <span>{{ pack.gachaTicket }}</span>
                  </div>
                  <div class="gc-sprite-wrap">
                    <div :class="getDrawResourcesIcon('7004')"></div>
                    <span>{{ pack.tenGachaTicket }}</span>
                  </div>
                </div>
              </div>
            </el-checkbox-button>
          </el-checkbox-group>

        </el-collapse-item>

        <el-collapse-item name="potential" class="gc-collapse-item">
          <template #title>
            <div class="gc-collapse-title-icon" style="background: rgba(119,118,255,0.8)"></div>
            <span class="gc-collapse-title-font">
               潜在资源&emsp;{{ calculationResult.potentialTotalDraw }}抽
              </span>
          </template>
          <div class="gc-title">
            <span></span> 悖论模拟/剿灭作战模拟
          </div>
          <div class="gc-input-bar">
            <input>
            <span>个悖论模拟</span>
            <div class="gc-sprite-wrap">
              <div :class="getDrawResourcesIcon('4003')"></div>
              <span>{{ 3 }}</span>
            </div>
          </div>
          <div class="gc-input-bar">
            <input>
            <span>个剿灭作战模拟</span>
            <div class="gc-sprite-wrap">
              <div :class="getDrawResourcesIcon('4003')"></div>
              <span>{{ 3 }}</span>
            </div>
          </div>
          <div class="gc-title">
            <span></span> 主线、突袭、绝境
          </div>

          <el-checkbox-group v-model="selectedPotentialName" style="margin: 4px">
            <el-checkbox-button v-for="(potential,index) in potentialTable"
                                :key="index" :label="index" v-show="potential.packType==='main'"
                                class="gc-el-checkbox-button">
              <div class="gc-pack-bar" style="width: 220px;">
                <span class="gc-pack-bar-title">{{ potential.packName }}</span>
                <div class="gc-pack-bar-content">
                  <div class="gc-sprite-wrap">
                    <div :class="getDrawResourcesIcon('4002')"></div>
                    <span>{{ potential.gachaOriginium }}</span>
                  </div>
                </div>
              </div>
            </el-checkbox-button>
          </el-checkbox-group>

          <div class="gc-title">
            <span></span> 插曲/别传
          </div>

          <el-checkbox-group v-model="selectedPotentialName" style="margin: 4px">
            <el-checkbox-button v-for="(potential,index) in potentialTable" :border="true"
                                :key="index" :label="index" v-show="potential.packType==='activity'"
                                class="gc-el-checkbox-button">
              <div class="gc-pack-bar" style="width: 218px;">
                <span class="gc-pack-bar-title" style="width: 150px">{{ potential.packName }}</span>
                <div class="gc-pack-bar-content" style="width: 70px">
                  <div class="gc-sprite-wrap">
                    <div :class="getDrawResourcesIcon('4002')"></div>
                    <span>{{ potential.gachaOriginium }}</span>
                  </div>
                </div>
              </div>
            </el-checkbox-button>
          </el-checkbox-group>

        </el-collapse-item>

        <el-collapse-item name="recharge" class="gc-collapse-item">
          <template #title>
            <div class="gc-collapse-title-icon" style="background: rgba(119,118,255,0.8)"></div>
            <span class="gc-collapse-title-font">
               氪金资源&emsp;{{ calculationResult.dailyTotalDraw }}抽
              </span>
          </template>

          <div class="gc-tip">标签内为每抽价格(元)，颜色用于区分性价比</div>
          <div class="gc-tip">仅计入礼包内抽卡资源，紫色高于648，橙色高于大月卡</div>
          <div class="gc-switch-wrap">
            <el-switch></el-switch>
            <span> 本月月卡已购买(选中则扣除6源石)</span>
          </div>
        </el-collapse-item>

        <el-collapse-item name="activity" class="gc-collapse-item">
          <template #title>
            <div class="gc-collapse-title-icon" style="background: rgba(119,118,255,0.8)"></div>
            <span class="gc-collapse-title-font">
               活动获得（估算）&emsp;{{ calculationResult.dailyTotalDraw }}抽
              </span>
          </template>
        </el-collapse-item>

        <el-collapse-item name="other" class="gc-collapse-item">
          <template #title>
            <div class="gc-collapse-title-icon" style="background: rgba(119,118,255,0.8)"></div>
            <span class="gc-collapse-title-font">
               其他资源（估算）&emsp;{{ calculationResult.dailyTotalDraw }}抽
              </span>
          </template>

          <div class="gc-resources-bar" v-for="(honeyCake,label) in honeyCakeTable" :key="label"
          v-show="checkRewardStatus(honeyCake)">
            <span class="gc-resources-bar-label" style="width: 240px">{{ honeyCake.name }}</span>
            <div class="gc-sprite-wrap" v-show="honeyCake.originium>0">
              <div :class="getDrawResourcesIcon('4002')"></div>
              <span>{{ honeyCake.originium }}</span>
            </div>
            <div class="gc-sprite-wrap" v-show="honeyCake.orundum>0">
              <div :class="getDrawResourcesIcon('4003')"></div>
              <span>{{ honeyCake.orundum }}</span>
            </div>
            <div class="gc-sprite-wrap" v-show="honeyCake.permit>0">
              <div :class="getDrawResourcesIcon('7003')"></div>
              <span>{{ honeyCake.permit }}</span>
            </div>
            <div class="gc-sprite-wrap" v-show="honeyCake.permit10>0">
              <div :class="getDrawResourcesIcon('7004')"></div>
              <span>{{ honeyCake.permit10 }}</span>
            </div>
          </div>
        </el-collapse-item>
      </el-collapse>
    </div>
  </div>
</template>


<!--因css命名过长，将下面的gacha-calc简写为gc-->
<style scoped>
.gc-container {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
}

#total-table {

}

.gc-result-wrap {
  margin: 8px;
  width: 550px;
}

.gc-collapse-title-icon {
  padding: 12px;
  margin: 12px;
  border-radius: 4px;
}

.gc-collapse-title-font {
  font-size: 24px;
  font-weight: 600;
}

.gc-radio-group-wrap {
  width: 482px;
  margin: auto;
}

.divider {
  width: 100%;
  border-bottom: 1px solid #ffffff;
  height: 1px;
}

.gc-draw-result {
  display: flex;
  padding: 8px;
  justify-content: space-around;
}

.gc-total-table {
  width: 200px;
  font-size: 18px;
  font-weight: bolder;
}

.gc-resources-result {
  display: flex;
  justify-content: flex-end;
}

.gc-sprite-wrap {
  width: 100px;
  height: 36px;
  position: relative;
}

.gc-sprite-wrap div {
  position: absolute;
  left: 0;
}

.gc-sprite-wrap span {
  position: absolute;
  left: 44px;
  line-height: 36px;
  font-weight: bolder;
  font-size: 20px;
}


.gc-switch-wrap {
  margin: 8px 0;
  display: flex;
  align-items: center;
}

.gc-switch-wrap span {
  font-size: 18px;
  padding: 0 12px;
}

.gc-title {
  background-color: rgba(196, 196, 196, 0.5);
  height: 32px;
  width: 100%;
  line-height: 32px;
  font-size: 18px;
  padding: 0 32px;
  position: relative;
}

.gc-title span {
  border-left: 12px solid transparent;
  border-top: 16px solid rgb(255, 255, 255);
  border-bottom: 4px solid transparent;
  border-right: 12px solid transparent;
  position: absolute;
  top: 8px;
  left: 4px;
}

.gc-input-bar {
  display: flex;
  align-items: center;
  font-size: 18px;
  padding: 4px;
}

.gc-input-bar input {
  width: 70px;
  margin: 0 2px;
}

.gc-input-bar span {
  padding: 0 2px;
}

.gc-tip {
  font-style: italic;
  display: block;
  color: #599dff;
  margin: 4px;
  font-size: 16px;
  line-height: 22px;
}

.gc-resources-bar {
  display: flex;
  font-size: 18px;
  margin: 8px 4px;
  align-items: center;
}

.gc-resources-bar-label {
  width: 110px;

}

.gc-resources-bar-content {
  display: flex;
  width: 250px;
}

.gc-resources-bar-btn {

}

.gc-pack-bar {
  width: 480px;
  display: flex;
  font-size: 18px;
  align-items: center;
}

.gc-pack-bar-title {
  width: 150px;
  text-align: left;
}

.gc-pack-bar-content {
  display: flex;
  width: 250px;
}

</style>