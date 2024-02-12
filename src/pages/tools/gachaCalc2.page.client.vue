<script setup>
import {onMounted, ref} from "vue";
import '/src/assets/css/tool/gacha_calc.css'
import * as echarts from "echarts";
import '/src/assets/css/sprite_gacha.css'
import potentialTable from '/src/static/json/tools/potentialGachaResources.json'
import HONEY_CAKE_TABLE from '/src/static/json/tools/activityScheduleByHoneycake.json'
import storeAPI from '/src/api/store'

// 罗德岛蜜饼工坊预测的其他奖励排期
let honeyCakeTable = ref([])
// 罗德岛蜜饼工坊预测的活动排期
let activityList = ref({})

for (const name in HONEY_CAKE_TABLE) {
  let honeyCake = HONEY_CAKE_TABLE[name]
  honeyCake.start = new Date(honeyCake.start).getTime()
  honeyCake.end = new Date(honeyCake.end).getTime()
  honeyCake.name = name
  if (honeyCake.module === 'honeyCake') {
    honeyCakeTable.value.push(honeyCake)
  } else {
    activityList.value[name] = honeyCake
  }
}

let packGroupByOnce = ref([])
let packGroupByYear = ref([])
let packGroupByMonthly = ref([])
let packGroupByLimited = ref([])

function getPackData() {
  storeAPI.findPackStore().then(response => {
    let index = 0;
    for (let pack of response.data) {
      if (!(pack.eachDrawPrice > 0)) {
        continue;
      }

      if (pack.name === '每月寻访组合包' || pack.name.indexOf('普通源石') > -1) {
        continue
      }

      pack.parentIndex = index

      if (pack.type === 'once') {
        packGroupByOnce.value.push(pack)
      }

      if (pack.type === 'year') {
        packGroupByYear.value.push(pack)
      }

      if (pack.type === 'monthly') {
        packGroupByMonthly.value.push(pack)
      }

      if (pack.type === 'limited') {
        packGroupByLimited.value.push(pack)
      }

      index++
    }
  })
}


function getPackPriority(drawEfficiency) {
  if (drawEfficiency > 1.57) {
    return `background-color:${'#ff6400'};color:white`
  }

  if (drawEfficiency > 1) {
    return `background-color:${'#a16fff'};color:white`
  }

  return `background-color:${'#4380ff'};color:white`
}

//活动列表，包含活动的名称，开启和结束时间
let schedules = ref([
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
let selectedSchedule = ref('春节(2.15)')

//通过name控制折叠面板的展开，如果集合中有面板的name，面板会默认展开，当点击展开面板时，
//面板组件也会将面板组件的name赋予这个集合
let resultCollapseActiveNames = ref(['calculationResult'])
let optionsCollapseActiveNames = ref(['exist', 'custom', 'daily', 'potential',
  'recharge', 'activity', 'other'])


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


let pieChartData = ref([
  {value: 22, name: "现有"},
  {value: 33, name: "潜在"},
  {value: 44, name: "日常"},
  {value: 22, name: "氪金"},
  {value: 33, name: "活动"},
  {value: 44, name: "其它"}
])


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

//当前时间
const currentTimestamp = new Date().getTime();
//用户选择的活动的结束时间
let endTimestamp = ref(1711008000000)

let selectedStore258Name = ref([])
let selectedPotentialName = ref([])
let selectedOncePack = ref([])
let selectedMonthlyPack = ref([])
let selectedLimitedPack = ref([])
let selectedYearPack = ref([])
let selectedActivityName = ref([])

function compute() {

  existCalculate()
  honeyCakeCalculate()
  dailyRewardCalculate()
  packCalculate()
  activityCalculate()

  /**
   * 计算从当前到活动结束时间的日常奖励
   * @returns {{}}
   */
  function dailyRewardCalculate() {
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

    const orundum = days * 100 + weeks * 500 + shopTimes * 600 + annihilationTimes * 1800
    const originium = 0
    const gachaTicket = checkInTimes + shopTimes * 4
    const tenGachaTicket = 0

    calculationResult.value.orundum = orundum
    calculationResult.value.originium = originium
    calculationResult.value.gachaTicket = gachaTicket
    calculationResult.value.tenGachaTicket = tenGachaTicket

    calculationResult.value.dailyTotalDraw = Math.floor(orundum / 600 + gachaTicket)


    return {}
  }

  /**
   * 计算用户库存抽卡次数
   */
  function existCalculate() {
    const orundum = parseInt(existResources.value.orundum)
    const originium = parseInt(existResources.value.originium)
    const gachaTicket = parseInt(existResources.value.gachaTicket)
    const tenGachaTicket = parseInt(existResources.value.tenGachaTicket)

    calculationResult.value.orundum = orundum
    calculationResult.value.originium = originium
    calculationResult.value.gachaTicket = gachaTicket
    calculationResult.value.tenGachaTicket = tenGachaTicket

    calculationResult.value.existTotalDraw =
        Math.floor(orundum / 600 + originium * 0.3 + gachaTicket + tenGachaTicket * 10)

  }


  /**
   * 计算用户选择的礼包总计多少抽
   */
  function packCalculate() {
    let totalDraw = 0

    packCalculateSeparately(selectedMonthlyPack.value, packGroupByMonthly.value)
    packCalculateSeparately(selectedOncePack.value, packGroupByOnce.value)
    packCalculateSeparately(selectedLimitedPack.value, packGroupByLimited.value)
    packCalculateSeparately(selectedYearPack.value, packGroupByYear.value)

    let orundum = 0
    let originium = 0
    let gachaTicket = 0
    let tenGachaTicket = 0

    /**
     * 分别计算不同类型的礼包
     * @param selectedPack 用户选中的礼包
     * @param packs 对应类型的所有礼包
     */
    function packCalculateSeparately(selectedPack, packs) {
      for (const m of selectedPack) {
        const pack = packs[m]
        orundum += pack.orundum
        originium += pack.originium
        gachaTicket += pack.ticketGacha
        tenGachaTicket += pack.ticketGacha10
        totalDraw += (pack.orundum / 600 + pack.originium * 0.3 + pack.ticketGacha + pack.ticketGacha10 * 10)
      }
    }

    calculationResult.value.orundum = orundum
    calculationResult.value.originium = originium
    calculationResult.value.gachaTicket = gachaTicket
    calculationResult.value.tenGachaTicket = tenGachaTicket

    calculationResult.value.rechargeTotalDraw = Math.floor(totalDraw)
  }

  /**
   * 计算用户选中活动的抽卡资源
   */
  function activityCalculate() {
    let totalDraw = 0
    for (const name of selectedActivityName.value) {
      const acitvity = activityList.value[name]
      totalDraw += (acitvity.orundum / 600 + acitvity.originium * 0.3 + acitvity.permit + acitvity.permit10 * 10)
    }
    calculationResult.value.activityTotalDraw = Math.floor(totalDraw)
  }


  /**
   * 计算预测奖励结果
   */
  function honeyCakeCalculate() {
    let totalDraw = 0
    for (const honeyCake of honeyCakeTable.value) {
      if (!checkRewardStatus(honeyCake)) {
        continue
      }
      totalDraw += (honeyCake.orundum / 600 + honeyCake.originium * 0.3 + honeyCake.permit + honeyCake.permit10 * 10)
    }
    console.log(totalDraw)
    calculationResult.value.otherTotalDraw = Math.floor(totalDraw)
  }

  calculationResult.value.totalDraw = calculationResult.value.existTotalDraw + calculationResult.value.dailyTotalDraw +
      calculationResult.value.potentialTotalDraw + calculationResult.value.rechargeTotalDraw +
      calculationResult.value.activityTotalDraw + calculationResult.value.otherTotalDraw

  console.log(calculationResult.value)
}

let activityType = ref('春节限定') //活动类型

/**
 * 检查奖励是否可以被计入攒抽结果中
 * @param reward 奖励的信息
 * @returns {boolean} 是否可计入
 */
function checkRewardStatus(reward) {

  //活动结束时间在当前时间之前，活动已结束
  if (reward.end < currentTimestamp) {
    return false
  }
  //活动开始时间在选择的结束时间节点之后，活动未开启
  if (reward.start > endTimestamp.value) {
    return false
  }
  //判断是否当前奖励的类型是否可以被计入
  //公共类型都可以计入，特殊类型需要符合当前活动类型，例如联动的专属十连不能被计入新春的攒抽结果中
  if (reward.rewardType) {
    return reward.rewardType === '公共' || reward.rewardType === activityType.value;
  }
}

let myChart = void 0;

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


onMounted(() => {
  getPackData()
  myChart = echarts.init(document.getElementById("calculationResultPieChart"));
  setPieChart(pieChartData.value)
  compute()
})

function keepTheDecimalPoint(num, decimalPlaces) {
  if (typeof num !== "number") {
    return '非数字'
  }
  decimalPlaces = decimalPlaces ? decimalPlaces : 2
  return num.toFixed(decimalPlaces)
}

function getIconByItemId(id) {
  return `bg-${id}icon `
}

const handleChange = (val) => {

}

</script>

<template>
  <div class="gc-container">
    <!--计算结果-->
    <div class="gc-collapse-wrap" id="result-box">
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
            <el-radio-group v-model="selectedSchedule" size="large">
              <el-radio-button v-for="(activity,index) in schedules" :key="index" :label="activity.name"/>
            </el-radio-group>
          </div>

          <div class="gc-calc-result-content">
            <div style="width: 260px;height: 220px" id="calculationResultPieChart">
            </div>
            <table class="gc-calc-result-table">
              <tbody>
              <tr>
                <td>现有</td>
                <td style="width: 80px">{{ calculationResult.existTotalDraw }}</td>
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
          <div class="gc-calc-result-resources-bar">
            <div class="gc-image-sprite">
              <div :class="getIconByItemId('4002')"></div>
            </div>
            <span>{{ calculationResult.originium }}</span>
            <div class="gc-image-sprite">
              <div :class="getIconByItemId('4003')"></div>
            </div>
            <span>{{ calculationResult.orundum }}</span>
            <div class="gc-image-sprite">
              <div :class="getIconByItemId('7003')"></div>
            </div>
            <span>{{ calculationResult.gachaTicket }}</span>
            <div class="gc-image-sprite">
              <div :class="getIconByItemId('7004')"></div>
            </div>
            <span>{{ calculationResult.tenGachaTicket }}</span>
          </div>

        </el-collapse-item>
      </el-collapse>
    </div>

    <div class="gc-collapse-wrap" id="resources-box">
      <el-collapse v-model="optionsCollapseActiveNames" @change="handleChange" style="border: none">
        <el-collapse-item name="exist" class="gc-collapse-item">
          <template #title>
            <div class="gc-collapse-title-icon" style="background: rgba(119,118,255,0.8)"></div>
            <span class="gc-collapse-title-font">
               库存/预留&emsp;{{ calculationResult.existTotalDraw }}抽
              </span>
          </template>
          <div class="gc-collapse-content-subheading">
            <span></span> 当前库存
          </div>

          <div class="gc-resources-bar">
            <div class="gc-image-sprite">
              <div :class="getIconByItemId('4002')"></div>
            </div>
            <input @change="compute" v-model.number="existResources.originium">
            <div class="gc-image-sprite">
              <div :class="getIconByItemId('4003')"></div>
            </div>
            <input @change="compute" v-model.number="existResources.orundum">

            <div class="gc-image-sprite">
              <div :class="getIconByItemId('7003')"></div>
            </div>
            <input @change="compute" v-model.number="existResources.gachaTicket">
            <div class="gc-image-sprite">
              <div :class="getIconByItemId('7004')"></div>
            </div>
            <input @change="compute" v-model.number="existResources.tenGachaTicket">
          </div>

          <div class="gc-switch-wrap">
            <span>是否使用源石抽卡</span>
            <el-switch v-model="originiumIsUsed"></el-switch>
          </div>

          <div class="gc-collapse-content-subheading">
            <span></span> 预留，自定义修正
          </div>
          <div class="gc-resources-bar">
            <input v-model.number="existResources.correctOrundum">
            <span>合成玉自定义修正</span>
            <div :class="getIconByItemId('4003')"></div>
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
          <div class="gc-collapse-content-subheading">
            <span></span>搓玉计算
          </div>

          <div class="gc-resources-bar">
            <input v-model.number="produceOrundum.ap">
            <span>用于搓玉的理智 x </span>
            <input v-model.number="produceOrundum.coefficient">
            <span>搓玉系数 = </span>
            <div :class="getIconByItemId('4003')"></div>
            <span>{{ produceOrundum.output }}</span>
          </div>
          <span class="gc-tip">搓玉系数：1理智可搓多少玉，1-7搓玉系数1.09</span>

          <div class="gc-collapse-content-subheading">
            <span></span> 绿票商店第三层
          </div>

          <div class="gc-resources-bar">
            <span>现有绿票</span>
            <input v-model.number="certificateStoreF3.certificate">
            <span>
              ，有{{ certificateStoreF3.disposableCertificate }}绿票可换
            </span>
            <div :class="getIconByItemId('4003')"></div>
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
              <span class="gc-resources-bar-title">
                日常{{ dailyReward.dailyTask }}天
              </span>
            <div class="gc-resources-bar-content">
              <div class="gc-image-sprite">
                <div :class="getIconByItemId('4003')"></div>
              </div>
              <span>{{ dailyReward.dailyTaskOrundum }}</span>
            </div>
          </div>
          <!--          <el-divider></el-divider>-->
          <div class="gc-divider"></div>
          <div class="gc-resources-bar">
              <span class="gc-resources-bar-title">
                周常{{ dailyReward.weeklyTask }}周
              </span>
            <div class="gc-resources-bar-content">
              <div class="gc-image-sprite">
                <div :class="getIconByItemId('4003')"></div>
              </div>
              <span>{{ dailyReward.weeklyTaskOrundum }}</span>
            </div>
            <div class="gc-resources-bar-btn">
              <el-switch v-model="dailyReward.weeklyTaskCompleted"></el-switch>
              本周已完成
            </div>
          </div>

          <div class="gc-resources-bar">
              <span class="gc-resources-bar-title">
                剿灭{{ dailyReward.annihilation }}周
              </span>
            <div class="gc-resources-bar-content">
              <div class="gc-image-sprite">
                <div :class="getIconByItemId('4003')"></div>
              </div>
              <span>{{ dailyReward.annihilationOrundum }}</span>
            </div>
            <div class="gc-resources-bar-btn">
              <el-switch v-model="dailyReward.annihilationCompleted"></el-switch>
              本周已完成
            </div>
          </div>
          <div class="gc-divider"></div>
          <div class="gc-resources-bar">
              <span class="gc-resources-bar-title">
                绿票商店{{ dailyReward.certificateStoreF2 }}月
              </span>
            <div class="gc-resources-bar-content">
              <div class="gc-image-sprite">
                <div :class="getIconByItemId('4003')"></div>
              </div>
              <span>{{ dailyReward.certificateStoreF2Orundum }}</span>
              <div class="gc-image-sprite">
                <div :class="getIconByItemId('7003')"></div>
              </div>
              <span>{{ dailyReward.certificateStoreF2GachaTicket }}</span>
            </div>
            <div class="gc-resources-bar-btn">
              <el-switch v-model="dailyReward.certificateStoreF2Completed"></el-switch>
              本周已完成
            </div>
          </div>

          <div class="gc-resources-bar">
              <span class="gc-resources-bar-title">
                每月签到{{ dailyReward.checkIn }}月
              </span>
            <div class="gc-resources-bar-content">
              <div class="gc-image-sprite">
                <div :class="getIconByItemId('7003')"></div>
              </div>
              <span>{{ dailyReward.checkInGachaTicket }}</span>
            </div>
          </div>
          <div class="gc-divider"></div>
          <el-checkbox-group v-model="selectedStore258Name" style="margin: 4px">
            <el-checkbox-button v-for="(pack,name) in monthlyShopExchangeGachaTicket"
                                :key="name" :label="name">
              <div class="gc-pack-bar">
                <span class="gc-pack-bar-title">{{ name }}</span>
                <div class="gc-pack-bar-content">
                  <div class="gc-image-sprite">
                    <div :class="getIconByItemId('7003')"></div>
                  </div>
                  <span>{{ pack.gachaTicket }}</span>
                  <div class="gc-image-sprite">
                    <div :class="getIconByItemId('7004')"></div>
                  </div>
                  <span>{{ pack.tenGachaTicket }}</span>
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
          <div class="gc-collapse-content-subheading">
            <span></span> 悖论模拟/剿灭作战模拟
          </div>
          <div class="gc-resources-bar">
            <input>
            <span>个悖论模拟</span>
            <div class="gc-image-sprite">
              <div :class="getIconByItemId('4003')"></div>
            </div>
            <span>{{ 3 }}</span>
          </div>
          <div class="gc-resources-bar">
            <input>
            <span>个剿灭作战模拟</span>
            <div class="gc-image-sprite">
              <div :class="getIconByItemId('4003')"></div>
            </div>
            <span>{{ 3 }}</span>
          </div>
          <div class="gc-collapse-content-subheading">
            <span></span> 主线、突袭、绝境
          </div>

          <el-checkbox-group v-model="selectedPotentialName" style="margin: 4px" @change="compute">
            <el-checkbox-button v-for="(potential,index) in potentialTable"
                                :key="index" :label="index" v-show="potential.packType==='main'"
                                class="gc-el-checkbox-button" :border="true">
              <div class="gc-pack-bar">
                <span class="gc-pack-bar-title"
                      :style="potential.packName.length<4?'width:60px':'width:170px'">
                  {{ potential.packName }}
                </span>
                <div class="gc-pack-bar-content">
                  <div class="gc-image-sprite">
                    <div :class="getIconByItemId('4002')"></div>
                  </div>
                  <span>{{ potential.gachaOriginium }}</span>
                </div>
              </div>
            </el-checkbox-button>
          </el-checkbox-group>

          <div class="gc-collapse-content-subheading">
            <span></span> 插曲/别传
          </div>

          <el-checkbox-group v-model="selectedPotentialName" style="margin: 4px" @change="compute">
            <el-checkbox-button v-for="(potential,index) in potentialTable" :border="true"
                                :key="index" :label="index" v-show="potential.packType==='activity'"
                                class="gc-el-checkbox-button">
              <div class="gc-pack-bar">
                <span class="gc-pack-bar-title" style="width: 140px">{{ potential.packName }}</span>
                <div class="gc-pack-bar-content">
                  <div class="gc-image-sprite">
                    <div :class="getIconByItemId('4002')"></div>
                  </div>
                  <span>{{ potential.gachaOriginium }}</span>
                </div>
              </div>
            </el-checkbox-button>
          </el-checkbox-group>
        </el-collapse-item>

        <el-collapse-item name="recharge" class="gc-collapse-item">
          <template #title>
            <div class="gc-collapse-title-icon" style="background: rgba(119,118,255,0.8)"></div>
            <span class="gc-collapse-title-font">
               氪金资源&emsp;{{ calculationResult.rechargeTotalDraw }}抽
              </span>
          </template>

          <span class="gc-tip">标签内为每抽价格(元)，颜色用于区分性价比</span>
          <span class="gc-tip">仅计入礼包内抽卡资源，紫色高于648，橙色高于大月卡</span>
          <span class="gc-tip"><a href="/material/pack">点击跳转礼包完整性价比</a></span>

          <div class="gc-collapse-content-subheading">
            <span></span> 月常礼包
          </div>
          <div class="gc-switch-wrap">
            <el-switch></el-switch>
            <span> 本月月卡已购买(选中则扣除6源石)</span>
          </div>
          <span>额外购买</span>
          <el-input-number></el-input-number>
          <span>张月卡（每张月卡可预支6石）</span>
          <el-checkbox-group v-model="selectedMonthlyPack" style="margin: 4px" @change="compute">
            <el-checkbox-button v-for="(pack,index) in packGroupByMonthly"
                                :key="index" :label="index"
                                class="gc-el-checkbox-button">
              <div class="gc-pack-bar">
                <span class="gc-pack-bar-draw-efficiency"
                      :style="getPackPriority(pack.promotionRatioForMoney)">
                  {{ keepTheDecimalPoint(pack.eachDrawPrice) }}
                </span>
                <span class="gc-pack-bar-title">{{ pack.name }}</span>
                <div class="gc-pack-bar-content" style="width:200px">
                  <!--源石-->
                  <div class="gc-image-sprite" v-show="pack.originium>0">
                    <div :class="getIconByItemId('4002')"></div>
                  </div>
                  <span v-show="pack.originium>0">{{ pack.originium }}</span>
                  <!--合成玉-->
                  <div class="gc-image-sprite" v-show="pack.orundum>0">
                    <div :class="getIconByItemId('4003')"></div>
                  </div>
                  <span v-show="pack.orundum>0">{{ pack.orundum }}</span>
                  <!--抽卡券-->
                  <div class="gc-image-sprite" v-show="pack.ticketGacha>0">
                    <div :class="getIconByItemId('7003')"></div>
                  </div>
                  <span v-show="pack.ticketGacha>0">{{ pack.ticketGacha }}</span>
                  <!--十连券-->
                  <div class="gc-image-sprite" v-show="pack.ticketGacha10>0">
                    <div :class="getIconByItemId('7004')"></div>
                  </div>
                  <span v-show="pack.ticketGacha10>0">{{ pack.ticketGacha10 }}</span>
                </div>
              </div>
            </el-checkbox-button>
          </el-checkbox-group>


          <div class="gc-collapse-content-subheading">
            <span></span> 限时礼包
          </div>
          <el-checkbox-group v-model="selectedLimitedPack" style="margin: 4px" @change="compute">
            <el-checkbox-button v-for="(pack,index) in packGroupByLimited"
                                :key="index" :label="index"
                                class="gc-el-checkbox-button">
              <div class="gc-pack-bar">
                 <span class="gc-pack-bar-draw-efficiency"
                       :style="getPackPriority(pack.promotionRatioForMoney)">
                  {{ keepTheDecimalPoint(pack.eachDrawPrice) }}
                </span>
                <span class="gc-pack-bar-title">{{ pack.name }}</span>
                <div class="gc-pack-bar-content" style="width:200px">
                  <!--源石-->
                  <div class="gc-image-sprite" v-show="pack.originium>0">
                    <div :class="getIconByItemId('4002')"></div>
                  </div>
                  <span v-show="pack.originium>0">{{ pack.originium }}</span>
                  <!--合成玉-->
                  <div class="gc-image-sprite" v-show="pack.orundum>0">
                    <div :class="getIconByItemId('4003')"></div>
                  </div>
                  <span v-show="pack.orundum>0">{{ pack.orundum }}</span>
                  <!--抽卡券-->
                  <div class="gc-image-sprite" v-show="pack.ticketGacha>0">
                    <div :class="getIconByItemId('7003')"></div>
                  </div>
                  <span v-show="pack.ticketGacha>0">{{ pack.ticketGacha }}</span>
                  <!--十连券-->
                  <div class="gc-image-sprite" v-show="pack.ticketGacha10>0">
                    <div :class="getIconByItemId('7004')"></div>
                  </div>
                  <span v-show="pack.ticketGacha10>0">{{ pack.ticketGacha10 }}</span>
                </div>
              </div>
            </el-checkbox-button>
          </el-checkbox-group>

          <div class="gc-collapse-content-subheading">
            <span></span> 新人礼包
          </div>
          <el-checkbox-group v-model="selectedOncePack" style="margin: 4px" @change="compute">
            <el-checkbox-button v-for="(pack,index) in packGroupByOnce"
                                :key="index" :label="index"
                                class="gc-el-checkbox-button">
              <div class="gc-pack-bar">
                 <span class="gc-pack-bar-draw-efficiency"
                       :style="getPackPriority(pack.promotionRatioForMoney)">
                  {{ keepTheDecimalPoint(pack.eachDrawPrice) }}
                </span>
                <span class="gc-pack-bar-title">{{ pack.name }}</span>
                <div class="gc-pack-bar-content" style="width:200px">
                  <!--源石-->
                  <div class="gc-image-sprite" v-show="pack.originium>0">
                    <div :class="getIconByItemId('4002')"></div>
                  </div>
                  <span v-show="pack.originium>0">{{ pack.originium }}</span>
                  <!--合成玉-->
                  <div class="gc-image-sprite" v-show="pack.orundum>0">
                    <div :class="getIconByItemId('4003')"></div>
                  </div>
                  <span v-show="pack.orundum>0">{{ pack.orundum }}</span>
                  <!--抽卡券-->
                  <div class="gc-image-sprite" v-show="pack.ticketGacha>0">
                    <div :class="getIconByItemId('7003')"></div>
                  </div>
                  <span v-show="pack.ticketGacha>0">{{ pack.ticketGacha }}</span>
                  <!--十连券-->
                  <div class="gc-image-sprite" v-show="pack.ticketGacha10>0">
                    <div :class="getIconByItemId('7004')"></div>
                  </div>
                  <span v-show="pack.ticketGacha10>0">{{ pack.ticketGacha10 }}</span>
                </div>
              </div>
            </el-checkbox-button>
          </el-checkbox-group>


          <div class="gc-collapse-content-subheading">
            <span></span> 首次充值源石
          </div>
          <el-checkbox-group v-model="selectedYearPack" style="margin: 4px" @change="compute">
            <el-checkbox-button v-for="(pack,index) in packGroupByYear"
                                :key="index" :label="index"
                                class="gc-el-checkbox-button">
              <div class="gc-pack-bar">
                 <span class="gc-pack-bar-draw-efficiency"
                       :style="getPackPriority(pack.promotionRatioForMoney)">
                  {{ keepTheDecimalPoint(pack.eachDrawPrice) }}
                </span>
                <span class="gc-pack-bar-title">{{ pack.name }}</span>
                <div class="gc-pack-bar-content" style="width:200px">
                  <!--源石-->
                  <div class="gc-image-sprite" v-show="pack.originium>0">
                    <div :class="getIconByItemId('4002')"></div>
                  </div>
                  <span v-show="pack.originium>0">{{ pack.originium }}</span>
                  <!--合成玉-->
                  <div class="gc-image-sprite" v-show="pack.orundum>0">
                    <div :class="getIconByItemId('4003')"></div>
                  </div>
                  <span v-show="pack.orundum>0">{{ pack.orundum }}</span>
                  <!--抽卡券-->
                  <div class="gc-image-sprite" v-show="pack.ticketGacha>0">
                    <div :class="getIconByItemId('7003')"></div>
                  </div>
                  <span v-show="pack.ticketGacha>0">{{ pack.ticketGacha }}</span>
                  <!--十连券-->
                  <div class="gc-image-sprite" v-show="pack.ticketGacha10>0">
                    <div :class="getIconByItemId('7004')"></div>
                  </div>
                  <span v-show="pack.ticketGacha10>0">{{ pack.ticketGacha10 }}</span>
                </div>
              </div>
            </el-checkbox-button>
          </el-checkbox-group>

        </el-collapse-item>

        <el-collapse-item name="activity" class="gc-collapse-item">
          <template #title>
            <div class="gc-collapse-title-icon" style="background: rgba(119,118,255,0.8)"></div>
            <span class="gc-collapse-title-font">
               活动获得（估算）&emsp;{{ calculationResult.activityTotalDraw }}抽
              </span>
          </template>

          <div class="gc-collapse-content-subheading">
            <span></span> 复刻活动
          </div>
          <el-checkbox-group v-model="selectedActivityName" style="margin: 4px" @change="compute">
            <el-checkbox-button v-for="(activity,name) in activityList"
                                :key="name" :label="name" v-show="activity.module==='actRe'"
                                class="gc-el-checkbox-button">
              <div class="gc-pack-bar">
                <span class="gc-pack-bar-title">{{ activity.name }}</span>
                <div class="gc-pack-bar-content" style="width:200px">
                  <!--源石-->
                  <div class="gc-image-sprite" v-show="activity.originium>0">
                    <div :class="getIconByItemId('4002')"></div>
                  </div>
                  <span v-show="activity.originium>0">{{ activity.originium }}</span>
                  <!--合成玉-->
                  <div class="gc-image-sprite" v-show="activity.orundum>0">
                    <div :class="getIconByItemId('4003')"></div>
                  </div>
                  <span v-show="activity.orundum>0">{{ activity.orundum }}</span>
                  <!--抽卡券-->
                  <div class="gc-image-sprite" v-show="activity.permit>0">
                    <div :class="getIconByItemId('7003')"></div>
                  </div>
                  <span v-show="activity.permit>0">{{ activity.permit }}</span>
                  <!--十连券-->
                  <div class="gc-image-sprite" v-show="activity.permit10>0">
                    <div :class="getIconByItemId('7004')"></div>
                  </div>
                  <span v-show="activity.permit10>0">{{ activity.permit10 }}</span>
                </div>
              </div>
            </el-checkbox-button>
          </el-checkbox-group>

          <div class="gc-collapse-content-subheading">
            <span></span> 未来活动
          </div>
          <el-checkbox-group v-model="selectedActivityName" style="margin: 4px" @change="compute">
            <el-checkbox-button v-for="(activity,name) in activityList"
                                :key="name" :label="name" v-show="activity.module==='act'"
                                class="gc-el-checkbox-button">
              <div class="gc-pack-bar">
                <span class="gc-pack-bar-title">{{ activity.name }}</span>
                <div class="gc-pack-bar-content" style="width:200px">
                  <!--源石-->
                  <div class="gc-image-sprite" v-show="activity.originium>0">
                    <div :class="getIconByItemId('4002')"></div>
                  </div>
                  <span v-show="activity.originium>0">{{ activity.originium }}</span>
                  <!--合成玉-->
                  <div class="gc-image-sprite" v-show="activity.orundum>0">
                    <div :class="getIconByItemId('4003')"></div>
                  </div>
                  <span v-show="activity.orundum>0">{{ activity.orundum }}</span>
                  <!--抽卡券-->
                  <div class="gc-image-sprite" v-show="activity.permit>0">
                    <div :class="getIconByItemId('7003')"></div>
                  </div>
                  <span v-show="activity.permit>0">{{ activity.permit }}</span>
                  <!--十连券-->
                  <div class="gc-image-sprite" v-show="activity.permit10>0">
                    <div :class="getIconByItemId('7004')"></div>
                  </div>
                  <span v-show="activity.permit10>0">{{ activity.permit10 }}</span>
                </div>
              </div>
            </el-checkbox-button>
          </el-checkbox-group>

        </el-collapse-item>

        <el-collapse-item name="other" class="gc-collapse-item">
          <template #title>
            <div class="gc-collapse-title-icon" style="background: rgba(119,118,255,0.8)"></div>
            <span class="gc-collapse-title-font">
               其他资源（估算）&emsp;{{ calculationResult.otherTotalDraw }}抽
              </span>
          </template>

          <div class="gc-resources-bar" v-for="(honeyCake,label) in honeyCakeTable" :key="label"
               v-show="checkRewardStatus(honeyCake)">
            <span class="gc-resources-bar-title" style="width: 240px">{{ honeyCake.name }}</span>
            <div class="gc-resources-bar-content">
              <div class="gc-image-sprite" v-show="honeyCake.originium>0">
                <div :class="getIconByItemId('4002')"></div>
              </div>
              <span v-show="honeyCake.originium>0">{{ honeyCake.originium }}</span>
              <div class="gc-image-sprite" v-show="honeyCake.orundum>0">
                <div :class="getIconByItemId('4003')"></div>
              </div>
              <span v-show="honeyCake.orundum>0">{{ honeyCake.orundum }}</span>
              <div class="gc-image-sprite" v-show="honeyCake.permit>0">
                <div :class="getIconByItemId('7003')"></div>
              </div>
              <span v-show="honeyCake.permit>0">{{ honeyCake.permit }}</span>
              <div class="gc-image-sprite" v-show="honeyCake.permit10>0">
                <div :class="getIconByItemId('7004')"></div>
              </div>
              <span v-show="honeyCake.permit10>0">{{ honeyCake.permit10 }}</span>
            </div>
          </div>
        </el-collapse-item>
      </el-collapse>
    </div>
  </div>
</template>


<style scoped>


</style>