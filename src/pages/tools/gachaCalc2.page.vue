<script setup>
import {onMounted, ref} from "vue";
import '/src/assets/css/tool/gacha_calc.scss'
import '/src/assets/css/sprite/sprite_plane_icon.css'
import '/src/assets/css/tool/gacha_calc.phone.scss'

import * as echarts from "echarts";

import potentialTable from '/src/static/json/tools/potentialGachaResources.json'
import HONEY_CAKE_TABLE from '/src/static/json/tools/activityScheduleByHoneycake.json'
import storeAPI from '/src/api/store'


// 罗德岛蜜饼工坊预测的其他奖励排期
let honeyCakeTable = ref([])
// 罗德岛蜜饼工坊预测的活动排期
let activitySchedules = ref({})

for (const name in HONEY_CAKE_TABLE) {
  let honeyCake = HONEY_CAKE_TABLE[name]
  honeyCake.start = new Date(honeyCake.start).getTime()
  honeyCake.end = new Date(honeyCake.end).getTime()
  honeyCake.name = name
  if (honeyCake.module === 'honeyCake') {
    honeyCakeTable.value.push(honeyCake)
  } else {
    activitySchedules.value[name] = honeyCake
  }
}


let selectedScheduleName = ref('彩六二期联动(3.21)') //用户选择的活动
let endDate = ref(new Date(1711008000000)) //用户选择的活动的结束时间
let selectedSchedule = ref({})
let activityType = ref('联动限定') //活动类型

//活动列表，包含活动的名称，开启和结束时间
let scheduleOptions = [
  {
    name: '彩六二期联动(3.21)',
    start: new Date('2024/03/07 16:00:00'),
    end: new Date('2024/03/21 04:01:00'),
    activityType: '联动限定'
  },
  {
    name: '周年限定(5.15)',
    start: new Date('2024/05/01 16:00:00'),
    end: new Date('2024/05/15 04:01:00'),
    activityType: '周年限定'
  },
  {
    name: '敬请期待',
    start: new Date('2024/05/01 16:00:00'),
    end: new Date('2024/05/15 04:01:00'),
    activityType: '周年限定'
  }
]

let packGroupByOnce = ref([])
let packGroupByYear = ref([])
let packGroupByMonthly = ref([])
let packGroupByLimited = ref([])
let packData = ref([])
let monthlyCertificateExchangeList = ref([])

function getPackData() {

  const date = new Date();
  let month = date.getMonth() + 1
  let year = date.getFullYear();

  let index = 0;

  for (let i = 0; i < 8; i++) {

    const lastDay = new Date(year, month, 0).getDate().toString().padStart(2, '');
    const pack = {
      "displayName": `${month}月寻访组合包`,
      "gachaTicket": 0,
      "tenGachaTicket": 1,
      "originium": 42,
      "orundum": 0,
      "price": 168,
      "parentIndex": index,
      "drawPrice": 7.43362831858407,
      "drawEfficiency": 1.570656370656371,
      "start": new Date(`${year}/${month.toString().padStart(2, "0")}/01 00:00:00`),
      "end": new Date(`${year}/${month.toString().padStart(2, "0")}/${lastDay} 23:59:59`)
    }

    const monthlyCertificateExchange = {
      "displayName": `${month}月黄票兑换寻访凭证`,
      "gachaTicket": 8,
      "tenGachaTicket": 3,
      "originium": 0,
      "orundum": 0,
      "start": new Date(`${year}/${month.toString().padStart(2, "0")}/01 00:00:00`),
      "end": new Date(`${year}/${month.toString().padStart(2, "0")}/${lastDay} 23:59:59`)
    }

    monthlyCertificateExchangeList.value.push(monthlyCertificateExchange)

    packGroupByMonthly.value.push(pack)
    packData.value.push(pack)
    if (month > 12) {
      month = 1
      year++
    } else {
      month++
    }
    index++
  }


  storeAPI.getPackStore().then(response => {

    for (let pack of response.data) {
      if (!(pack.drawPrice > 0)) {
        continue;
      }

      if (pack.officialName === '每月寻访组合包' || pack.officialName.indexOf('普通源石') > -1) {
        continue
      }

      pack.parentIndex = index

      if (pack.saleType === 'once') {
        packGroupByOnce.value.push(pack)
      }

      if (pack.saleType === 'year') {
        packGroupByYear.value.push(pack)
      }

      if (pack.saleType === 'monthly') {
        packGroupByMonthly.value.push(pack)
      }

      if (pack.saleType === 'limited') {
        packGroupByLimited.value.push(pack)
      }

      packData.value.push(pack)
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


/**
 * 用户点击单选框选择排期
 * @param index
 */
function updateScheduleOption(index) {

  const schedule = scheduleOptions[index]

  selectedScheduleName.value = schedule.name
  selectedSchedule.value = schedule
  endDate.value = schedule.end
  activityType.value = schedule.activityType
  gachaResourcesCalculation()
}


//折叠面板绑定的集合，如果集合中有折叠面板的name，面板会默认展开，当点击展开面板时，
//面板组件也会将面板组件的name赋值给这个集合
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


let potentialResources = ref({
  paradox: 0,
  annihilation: 0,
})

let produceOrundum = ref({
  ap: 0,
  coefficient: 0,
  outputByAp: 0,
  'itemId30012': 0,
  'itemId30062': 0,
  'itemId4001': 0,
  outputByItem: 0,
})

let certificateStoreF3 = ref({
  certificates: 0,
  remainingCertificates: 0,
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


let rechargeCalculationResult = ref({
  monthlyCardPurchasedThisMonth: false,
  additionalMonthlyCardPurchase: 0,
})

//攒抽计算结果
let calculationResult = ref({
  totalDraw: 0,  //总抽数
  totalAmountOfRecharge: 0,  //充值总额
  existTotalDraw: 0,
  dailyTotalDraw: 0,
  potentialTotalDraw: 0,
  rechargeTotalDraw: 0,
  activityTotalDraw: 0,
  otherTotalDraw: 0,
  produceOrundumTotalDraw: 0,
  originium: 0,
  orundum: 0,
  gachaTicket: 0,
  tenGachaTicket: 0,
})

//当前时间
const currentTimestamp = new Date().getTime();

let selectedThirtyEightGachaTicket = ref([])
let selectedPermanentZoneName = ref([])
let selectedActivityName = ref([])
let selectedPack = ref([])

function gachaResourcesCalculation() {

  calculationResult.value.orundum = 0
  calculationResult.value.originium = 0
  calculationResult.value.gachaTicket = 0
  calculationResult.value.tenGachaTicket = 0

  dailyRewardCalculate()
  existCalculate()
  produceOrundumCalculate()
  potentialResourcesCalculation()
  honeyCakeCalculate()
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
    //结束时间
    //如果今天不是周一，星期一总数加1，因为有可能不在周一打剿
    if (startDate.getDay() !== 1) {
      mondayCount++
    }
    //如果今天不是1号，商店购买次数加1，因为有可能1号买不完商店
    if (startDate.getDate() !== 1) {
      shopTimes++
    }
    //循环计算当前时间到活动结束时间

    while (startDate <= endDate.value) {
      //如果是星期一，星期一总数加1
      if (startDate.getDay() === 1) {
        mondayCount++
      }
      //如果是21号，签到次数加1
      if (startDate.getDate() === 17) {
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
    dailyReward.value.dailyTask = days //离目标卡池结束还有多少天
    dailyReward.value.dailyTaskOrundum = days * 100 //日常奖励
    dailyReward.value.weeklyTask = weeks; //离目标卡池结束还有多少周
    dailyReward.value.weeklyTaskOrundum = weeks * 500 //周常奖励
    dailyReward.value.checkIn = checkInTimes  //离目标卡池结束还有多少次签到
    dailyReward.value.checkInGachaTicket = checkInTimes //签到奖励
    dailyReward.value.certificateStoreF2 = shopTimes  //距离卡池结束还能兑换多少次绿票商店前两层
    dailyReward.value.certificateStoreF2Orundum = shopTimes * 600 //绿票商店前两层的抽卡资源
    dailyReward.value.certificateStoreF2GachaTicket = shopTimes * 4 //绿票商店前两层的抽卡资源
    dailyReward.value.annihilation = annihilationTimes //距离目标卡池结束还能打几次剿
    dailyReward.value.annihilationOrundum = annihilationTimes * 1800 //剿灭奖励

    let orundum = days * 100 + weeks * 500 + shopTimes * 600 + annihilationTimes * 1800
    let originium = 0
    let gachaTicket = checkInTimes + shopTimes * 4
    let tenGachaTicket = 0

    //计算用户选择兑换几次黄票商店的38抽
    for (const i of selectedThirtyEightGachaTicket.value) {
      const item = monthlyCertificateExchangeList.value[i]
      gachaTicket += item.gachaTicket
      tenGachaTicket += item.tenGachaTicket
    }

    calculationResult.value.orundum += orundum
    calculationResult.value.originium += originium
    calculationResult.value.gachaTicket += gachaTicket
    calculationResult.value.tenGachaTicket += tenGachaTicket

    calculationResult.value.dailyTotalDraw = orundum / 600 + gachaTicket + tenGachaTicket * 10

    return {}
  }


  /**
   * 计算用户库存抽卡次数
   */
  function existCalculate() {
    let orundum = parseInt(existResources.value.orundum.toString())
    let originium = parseInt(existResources.value.originium.toString())
    const gachaTicket = parseInt(existResources.value.gachaTicket.toString())
    const tenGachaTicket = parseInt(existResources.value.tenGachaTicket.toString())

    //计算用户自定义修正的合成玉
    orundum += parseInt(existResources.value.correctOrundum.toString())
    //计算用户预留给皮肤的源石
    originium -= parseInt(existResources.value.skinBudget.toString()) * 18


    calculationResult.value.orundum += orundum
    calculationResult.value.originium += originium
    calculationResult.value.gachaTicket += gachaTicket
    calculationResult.value.tenGachaTicket += tenGachaTicket

    calculationResult.value.existTotalDraw = orundum / 600 + originium * 0.3
        + gachaTicket + tenGachaTicket * 10

  }


  function produceOrundumCalculate() {
    //计算用理智产出的合成玉数量
    produceOrundum.value.outputByAp = parseInt(produceOrundum.value.ap.toString()) * parseInt(produceOrundum.value.coefficient.toString())
    //计算用材料产出的合成玉数量
    produceOrundum.value.outputByItem = parseInt(produceOrundum.value.itemId30012.toString()) * 5 +
        parseInt(produceOrundum.value.itemId30062.toString()) * 10
    //计算用材料产出合成玉时的龙门币消耗
    produceOrundum.value.itemId4001 = parseInt(produceOrundum.value.itemId30012.toString()) * 800 +
        parseInt(produceOrundum.value.itemId30062.toString()) * 1000

    //可用于兑换商店第三层的凭证数量
    let certificates = parseInt(certificateStoreF3.value.certificates.toString())
    //如果凭证数量大于11590(搬空前两层的凭证消耗量),曾可以兑换合成玉
    if (certificates > 11590) {
      //扣除11590凭证之后剩余的凭证数量
      certificateStoreF3.value.remainingCertificates = certificates - 11590
      //可兑换多少合成玉
      certificateStoreF3.value.orundum = Math.floor((certificateStoreF3.value.remainingCertificates / 50) * 30)
    }

    const orundum = produceOrundum.value.outputByAp + produceOrundum.value.outputByItem + certificateStoreF3.value.orundum

    calculationResult.value.orundum += orundum

    calculationResult.value.produceOrundumTotalDraw = orundum / 600

  }


  function potentialResourcesCalculation() {

    let orundum = 0;
    let originium = 0;
    //计算悖论模拟的合成玉
    orundum += potentialResources.value.paradox * 200
    //计算剿灭模拟的合成玉
    orundum += potentialResources.value.annihilation * 1500

    //计算选中的常驻章节或活动的资源
    if (selectedPermanentZoneName.value) {
      for (const potential of potentialTable) {
        //当前活动不在选中的活动集合中，跳过
        if (!selectedPermanentZoneName.value.includes(potential.packName)) {
          continue
        }
        originium += parseInt(potential.gachaOriginium)
      }
    }

    calculationResult.value.orundum += orundum
    calculationResult.value.originium += originium

    calculationResult.value.potentialTotalDraw = orundum / 600 + originium * 0.3
  }

  /**
   * 计算用户选择的礼包总计多少抽
   */
  function packCalculate() {


    let orundum = 0
    let originium = 0
    let gachaTicket = 0
    let tenGachaTicket = 0
    let totalAmountOfRecharge = 0

    for (const i of selectedPack.value) {
      const pack = packData.value[i]

      //月卡单独处理
      if (pack.displayName === '月卡') {
        //计算卡池结束前月卡可以拿到多少合成玉
        packData.value[i].orundum = dailyReward.value.dailyTask * 200
        //卡池结束前可以购买月卡的数量
        let purchaseQuantity = Math.ceil(dailyReward.value.dailyTask / 30)
        //加上额外购买的月卡数量
        purchaseQuantity += rechargeCalculationResult.value.additionalMonthlyCardPurchase
        packData.value[i].originium = purchaseQuantity * 6
        //月卡的价格=购买月卡的数量*30
        packData.value[i].price = purchaseQuantity * 30
        //当月月卡已购买源石-6
        if (rechargeCalculationResult.value.monthlyCardPurchasedThisMonth) {
          packData.value[i].originium -= 6
        }
      }

      orundum += pack.orundum
      originium += pack.originium
      gachaTicket += pack.gachaTicket
      tenGachaTicket += pack.tenGachaTicket
      totalAmountOfRecharge += pack.price
      console.log(totalAmountOfRecharge)

    }

    calculationResult.value.orundum += orundum
    calculationResult.value.originium += originium
    calculationResult.value.gachaTicket += gachaTicket
    calculationResult.value.tenGachaTicket += tenGachaTicket
    calculationResult.value.totalAmountOfRecharge = totalAmountOfRecharge

    calculationResult.value.rechargeTotalDraw = orundum / 600 + originium * 0.3 +
        gachaTicket + tenGachaTicket * 10
  }

  /**
   * 计算用户选中活动的抽卡资源
   */
  function activityCalculate() {


    let orundum = 0
    let originium = 0
    let gachaTicket = 0
    let tenGachaTicket = 0

    for (const activityName in activitySchedules.value) {
      const activity = activitySchedules.value[activityName]
      if (!itemIsExpired(activity)) {
        continue
      }

      if (activity.module === 'actRe') {
        if (!selectedActivityName.value.includes(activityName)) {
          continue
        }
      }

      orundum += activity.orundum
      originium += activity.originium
      gachaTicket += activity.gachaTicket
      tenGachaTicket += activity.tenGachaTicket

    }

    calculationResult.value.orundum += orundum
    calculationResult.value.originium += originium
    calculationResult.value.gachaTicket += gachaTicket
    calculationResult.value.tenGachaTicket += tenGachaTicket
    calculationResult.value.activityTotalDraw = orundum / 600 + originium * 0.3 +
        gachaTicket + tenGachaTicket * 10
  }


  /**
   * 计算预测奖励结果
   */
  function honeyCakeCalculate() {
    let totalDraw = 0
    for (const honeyCake of honeyCakeTable.value) {
      if (!itemIsExpired(honeyCake)) {
        continue
      }
      totalDraw += (honeyCake.orundum / 600 + honeyCake.originium * 0.3 +
          honeyCake.gachaTicket + honeyCake.tenGachaTicket * 10)
    }


    calculationResult.value.otherTotalDraw = Math.floor(totalDraw)
  }

  calculationResult.value.totalDraw = Math.floor(calculationResult.value.existTotalDraw +
      calculationResult.value.dailyTotalDraw + calculationResult.value.potentialTotalDraw +
      calculationResult.value.rechargeTotalDraw + calculationResult.value.activityTotalDraw +
      calculationResult.value.otherTotalDraw)

  // console.log(calculationResult.value)
}


/**
 * 判断这个奖励或礼包是否过期
 * @param reward 奖励的信息
 * @returns {boolean} 是否可计入
 */
function itemIsExpired(reward) {

  //活动结束时间在当前时间之前，活动已结束
  if (reward.end < currentTimestamp) {
    return false
  }
  //活动开始时间在选择的结束时间节点之后，活动未开启
  if (reward.start > endDate.value.getTime()) {
    return false
  }
  //判断是否当前奖励的类型是否可以被计入
  //公共类型都可以计入，特殊类型需要符合当前活动类型，例如联动的专属十连不能被计入新春的攒抽结果中
  if (reward.rewardType) {
    return reward.rewardType === '公共' || reward.rewardType === activityType.value;
  }

  return true
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

  myChart.setOption(option);
}


onMounted(() => {
  getPackData()
  myChart = echarts.init(document.getElementById("calculationResultPieChart"));
  setPieChart(pieChartData.value)
  updateScheduleOption(0)

})

function keepTheDecimalPoint(num, decimalPlaces) {
  if (typeof num !== "number") {
    return '非数字'
  }

  decimalPlaces = decimalPlaces || decimalPlaces === 0 ? decimalPlaces : 2
  return num.toFixed(decimalPlaces)
}

function getIconByItemId(id) {
  return `bg-${id}icon `
}

const handleChange = (val) => {

}

</script>

<template>
  <div class="gc-page" id="gachaCalculate">
    <!--计算结果-->
    <div class="collapse-wrap result-box" id="result-box" >
      <el-collapse v-model="resultCollapseActiveNames" @change="handleChange" style="border: none">
        <el-collapse-item name="calculationResult" class="collapse-item">
          <template #title>
            <div class="collapse-title-icon" style="background: #ec8338"></div>
            <span class="collapse-title-font">
                共计{{ calculationResult.totalDraw }}抽，
              氪金{{ keepTheDecimalPoint(calculationResult.totalAmountOfRecharge, 0) }}元
              </span>
          </template>

          <!--选择攒到某个活动的单选框-->
          <div class="radio-group-wrap">
            <el-radio-group v-model="selectedScheduleName" size="large">
              <el-radio-button v-for="(activity,index) in scheduleOptions" :key="index" :value="activity.name"
                               :label="activity.name"
                               @change="updateScheduleOption(index)"/>
            </el-radio-group>
          </div>

          <div class="result-content">
            <div class="gachaResourcesChartPie" id="calculationResultPieChart">
            </div>
            <table class="gacha-resources-table">
              <tbody>
              <tr>
                <td class="gacha-resources-table-title">现有</td>
                <td class="gacha-resources-table-quantity">{{ keepTheDecimalPoint(calculationResult.existTotalDraw, 0) }}</td>
                <td>抽</td>
              </tr>
              <tr>
                <td>日常</td>
                <td>{{ keepTheDecimalPoint(calculationResult.dailyTotalDraw, 0) }}</td>
                <td>抽</td>
              </tr>
              <tr>
                <td>潜在</td>
                <td>{{ keepTheDecimalPoint(calculationResult.potentialTotalDraw, 0) }}</td>
                <td>抽
                </td>
              </tr>
              <tr>
                <td>氪金</td>
                <td>{{ keepTheDecimalPoint(calculationResult.rechargeTotalDraw, 0) }}</td>
                <td>抽</td>
              </tr>
              <tr>
                <td>活动(估算)</td>
                <td>{{ keepTheDecimalPoint(calculationResult.activityTotalDraw, 0) }}</td>
                <td>抽</td>
              </tr>
              <tr>
                <td>其它(估算)</td>
                <td>{{ keepTheDecimalPoint(calculationResult.otherTotalDraw, 0) }}</td>
                <td>抽</td>
              </tr>
              </tbody>
            </table>
          </div>
          <div class="resources-result-bar">
            <div class="image-sprite">
              <div class="bg-icon_4002"></div>
            </div>
            <span>{{ calculationResult.originium }}</span>
            <div class="image-sprite">
              <div class="bg-icon_4003"></div>
            </div>
            <span>{{ calculationResult.orundum }}</span>
            <div class="image-sprite">
              <div class="bg-icon_7003"></div>
            </div>
            <span>{{ calculationResult.gachaTicket }}</span>
            <div class="image-sprite">
              <div class="bg-icon_7004"></div>
            </div>
            <span>{{ calculationResult.tenGachaTicket }}</span>
          </div>


        </el-collapse-item>
      </el-collapse>
    </div>

    <div class="collapse-wrap" id="resources-box">
      <el-collapse v-model="optionsCollapseActiveNames" @change="handleChange" style="border: none">
        <el-collapse-item name="exist" class="collapse-item">
          <template #title>
            <div class="collapse-title-icon" style="background: rgba(119,118,255,0.8)"></div>
            <span class="collapse-title-font">
               库存/预留&emsp;{{ keepTheDecimalPoint(calculationResult.existTotalDraw, 0) }}抽
              </span>
          </template>
          <div class="collapse-content-subheading">
            <span></span> 当前库存
          </div>

          <div class="resources-bar">
            <div class="image-sprite">
              <div class="bg-icon_4002"></div>
            </div>
            <input @change="gachaResourcesCalculation" v-model.number="existResources.originium">
            <div class="image-sprite">
              <div class="bg-icon_4003"></div>
            </div>
            <input @change="gachaResourcesCalculation" v-model.number="existResources.orundum">

            <div class="image-sprite">
              <div class="bg-icon_7003"></div>
            </div>
            <input @change="gachaResourcesCalculation" v-model.number="existResources.gachaTicket">
            <div class="image-sprite">
              <div class="bg-icon_7004"></div>
            </div>
            <input @change="gachaResourcesCalculation" v-model.number="existResources.tenGachaTicket">
          </div>

          <div class="switch-wrap">
            <span>是否使用源石抽卡</span>
            <el-switch v-model="originiumIsUsed"></el-switch>
          </div>

          <div class="collapse-content-subheading">
            <span></span> 预留，自定义修正
          </div>
          <div class="resources-bar">
            <input v-model.number="existResources.correctOrundum" @input="gachaResourcesCalculation">
            <span>合成玉自定义修正</span>
            <div class="bg-icon_4003"></div>
            <span>{{ existResources.correctOrundum }}</span>
          </div>
          <span class="gc-tip"> 例如给轮换池预留、其它来源等，可填负数</span>
          <el-slider v-model.number="existResources.skinBudget" :step="1" :min="0" :max="10"
                     show-stops show-input @change="gachaResourcesCalculation()" style="width: 90%;margin: 0 5%">
          </el-slider>
          <span class="gc-tip">预留皮肤（18石/件）</span>

        </el-collapse-item>
        <el-collapse-item name="custom" class="collapse-item">
          <template #title>
            <div class="collapse-title-icon" style="background: rgba(119,118,255,0.8)"></div>
            <span class="collapse-title-font">
               搓玉/绿票商店&emsp;{{ keepTheDecimalPoint(calculationResult.produceOrundumTotalDraw, 0) }}抽
              </span>
          </template>
          <div class="collapse-content-subheading">
            <span></span>搓玉计算
          </div>

          <div class="resources-bar">
            <input v-model.number="produceOrundum.ap" @input="gachaResourcesCalculation">
            <span>用于搓玉的理智 x </span>
            <input v-model.number="produceOrundum.coefficient" @input="gachaResourcesCalculation">
            <span>搓玉系数 = </span>
            <div class="bg-icon_4003"></div>
            <span>{{ produceOrundum.outputByAp }}</span>
          </div>
          <span class="gc-tip">搓玉系数：1理智可搓多少玉，1-7搓玉系数1.09</span>

          <div class="collapse-content-subheading">
            <span></span> 绿票商店第三层
          </div>

          <div class="resources-bar">
            <span>现有绿票</span>
            <input v-model.number="certificateStoreF3.certificates" @input="gachaResourcesCalculation">
            <span>
              ，有{{ certificateStoreF3.disposableCertificate }}绿票可换
            </span>
            <div class="bg-icon_4003"></div>
            <span>{{ certificateStoreF3.orundum }}</span>
          </div>
          <span class="gc-tip">现有绿票数 - 第一层共需1490绿票 - 第二层共需10100绿票 = 可用于换玉的绿票数</span>
          <span class="gc-tip">鉴于第二层有不少性价比较低的物品，建议囤够2w以上绿票再考虑绿票换玉</span>
        </el-collapse-item>

        <el-collapse-item name="daily" class="collapse-item">
          <template #title>
            <div class="collapse-title-icon" style="background: rgba(119,118,255,0.8)"></div>
            <span class="collapse-title-font">
               日常积累&emsp;{{ keepTheDecimalPoint(calculationResult.dailyTotalDraw, 0) }}抽
              </span>
          </template>

          <div class="resources-bar">
              <span class="resources-bar-title">
                日常{{ dailyReward.dailyTask }}天
              </span>
            <div class="resources-bar-content">
              <div class="image-sprite">
                <div class="bg-icon_4003"></div>
              </div>
              <span>{{ dailyReward.dailyTaskOrundum }}</span>
            </div>
          </div>
          <!--          <el-divider></el-divider>-->
          <div class="divider"></div>
          <div class="resources-bar">
              <span class="resources-bar-title">
                周常{{ dailyReward.weeklyTask }}周
              </span>
            <div class="resources-bar-content">
              <div class="image-sprite">
                <div class="bg-icon_4003"></div>
              </div>
              <span>{{ dailyReward.weeklyTaskOrundum }}</span>
            </div>
            <div class="gc-resources-bar-btn">
              <el-switch v-model="dailyReward.weeklyTaskCompleted" @change="gachaResourcesCalculation"></el-switch>
              本周已完成
            </div>
          </div>

          <div class="resources-bar">
              <span class="resources-bar-title">
                剿灭{{ dailyReward.annihilation }}周
              </span>
            <div class="resources-bar-content">
              <div class="image-sprite">
                <div class="bg-icon_4003"></div>
              </div>
              <span>{{ dailyReward.annihilationOrundum }}</span>
            </div>
            <div class="gc-resources-bar-btn">
              <el-switch v-model="dailyReward.annihilationCompleted" @change="gachaResourcesCalculation"></el-switch>
              本周已完成
            </div>
          </div>
          <div class="divider"></div>
          <div class="resources-bar">
              <span class="resources-bar-title">
                绿票商店{{ dailyReward.certificateStoreF2 }}月
              </span>
            <div class="resources-bar-content">
              <div class="image-sprite">
                <div class="bg-icon_4003"></div>
              </div>
              <span>{{ dailyReward.certificateStoreF2Orundum }}</span>
              <div class="image-sprite">
                <div class="bg-icon_7003"></div>
              </div>
              <span>{{ dailyReward.certificateStoreF2GachaTicket }}</span>
            </div>
            <div class="gc-resources-bar-btn">
              <el-switch v-model="dailyReward.certificateStoreF2Completed"
                         @change="gachaResourcesCalculation"></el-switch>
              本月已兑换
            </div>
          </div>

          <div class="resources-bar">
              <span class="resources-bar-title">
                每月签到{{ dailyReward.checkIn }}月
              </span>
            <div class="resources-bar-content">
              <div class="image-sprite">
                <div class="bg-icon_7003"></div>
              </div>
              <span>{{ dailyReward.checkInGachaTicket }}</span>
            </div>
          </div>
          <div class="divider"></div>
          <el-checkbox-group v-model="selectedThirtyEightGachaTicket" style="margin: 4px"
                             @change="gachaResourcesCalculation">
            <el-checkbox-button v-for="(pack,name) in monthlyCertificateExchangeList"
                                :key="name" :value="name" style="margin: 4px"
                                v-show="itemIsExpired(pack)">
              <div class="checkbox-button-bar">
                <span class="checkbox-button-bar-label" style="width: 200px">{{ pack.displayName }}</span>
                <div class="checkbox-button-bar-content">
                  <div class="image-sprite">
                    <div class="bg-icon_7003"></div>
                  </div>
                  <span>{{ pack.gachaTicket }}</span>
                  <div class="image-sprite">
                    <div class="bg-icon_7004"></div>
                  </div>
                  <span>{{ pack.tenGachaTicket }}</span>
                </div>
              </div>
            </el-checkbox-button>
          </el-checkbox-group>

        </el-collapse-item>

        <!--        潜在资源-->
        <el-collapse-item name="potential" class="collapse-item">
          <template #title>
            <div class="collapse-title-icon" style="background: rgba(119,118,255,0.8)"></div>
            <span class="collapse-title-font">
               潜在资源&emsp;{{ keepTheDecimalPoint(calculationResult.potentialTotalDraw, 0) }}抽
              </span>
          </template>
          <div class="collapse-content-subheading">
            <span></span> 悖论模拟/剿灭作战模拟
          </div>
          <div class="resources-bar">
            <input v-model="potentialResources.paradox" @input="gachaResourcesCalculation">
            <span>个悖论模拟</span>
            <div class="image-sprite">
              <div class="bg-icon_4003"></div>
            </div>
            <span>{{ potentialResources.paradox * 200 }}</span>
          </div>
          <div class="resources-bar">
            <input v-model="potentialResources.annihilation" @input="gachaResourcesCalculation">
            <span>个剿灭作战模拟</span>
            <div class="image-sprite">
              <div class="bg-icon_4003"></div>
            </div>
            <span>{{ potentialResources.annihilation * 1500 }}</span>
          </div>
          <div class="collapse-content-subheading">
            <span></span> 主线、突袭、绝境
          </div>

          <el-checkbox-group v-model="selectedPermanentZoneName" style="margin: 4px"
                             @change="gachaResourcesCalculation">
            <el-checkbox-button v-for="(potential,index) in potentialTable"
                                :key="index" :value="potential.packName" v-show="potential.packType==='main'"
                                class="el-checkbox-button" :border="true">
              <div class="checkbox-button-bar">
                <span class="checkbox-button-bar-label"
                      :style="potential.packName.length<4?'width:60px':'width:170px'">
                  {{ potential.packName }}
                </span>
                <div class="checkbox-button-bar-content">
                  <div class="image-sprite">
                    <div class="bg-icon_4002"></div>
                  </div>
                  <span>{{ potential.gachaOriginium }}</span>
                </div>
              </div>
            </el-checkbox-button>
          </el-checkbox-group>

          <div class="collapse-content-subheading">
            <span></span> 插曲/别传
          </div>
          <el-checkbox-group v-model="selectedPermanentZoneName" style="margin: 4px"
                             @change="gachaResourcesCalculation">
            <el-checkbox-button v-for="(potential,index) in potentialTable" :border="true"
                                :key="index" :value="potential.packName" v-show="potential.packType==='activity'"
                                class="el-checkbox-button">
              <div class="checkbox-button-bar">
                <span class="checkbox-button-bar-label" style="width: 140px">{{ potential.packName }}</span>
                <div class="checkbox-button-bar-content">
                  <div class="image-sprite">
                    <div class="bg-icon_4002"></div>
                  </div>
                  <span>{{ potential.gachaOriginium }}</span>
                </div>
              </div>
            </el-checkbox-button>
          </el-checkbox-group>
        </el-collapse-item>

        <!--氪金资源-->
        <el-collapse-item name="recharge" class="collapse-item">
          <template #title>
            <div class="collapse-title-icon" style="background: rgba(119,118,255,0.8)"></div>
            <span class="collapse-title-font">
               氪金资源&emsp;{{ keepTheDecimalPoint(calculationResult.rechargeTotalDraw, 0) }}抽
              </span>
          </template>

          <span class="gc-tip">标签内为每抽价格(元)，颜色用于区分性价比</span>
          <span class="gc-tip">仅计入礼包内抽卡资源，紫色高于648，橙色高于大月卡</span>
          <span class="gc-tip"><a href="/material/pack">点击跳转礼包完整性价比</a></span>
          <!--月常礼包-->
          <div class="collapse-content-subheading">
            <span></span> 月常礼包
          </div>
          <div class="switch-wrap">
            <el-switch v-model="rechargeCalculationResult.monthlyCardPurchasedThisMonth"
                       @change="gachaResourcesCalculation"></el-switch>
            <span>本月月卡已购买(选中则扣除6源石)</span>
          </div>
          <span>额外购买</span>
          <el-input-number v-model="rechargeCalculationResult.additionalMonthlyCardPurchase"
                           @input="gachaResourcesCalculation">
          </el-input-number>
          <span>张月卡（每张月卡可预支6石）</span>
          <el-checkbox-group v-model="selectedPack" style="margin: 4px" @change="gachaResourcesCalculation">
            <el-checkbox-button v-for="(pack,index) in packGroupByMonthly"
                                :key="index" :value="pack.parentIndex"
                                class="el-checkbox-button"
                                v-show="itemIsExpired(pack)">
              <div class="checkbox-button-bar">
               <span class="draw-efficiency"
                     :style="getPackPriority(pack.drawEfficiency)">
                  {{ keepTheDecimalPoint(pack.drawPrice) }}
                </span>
                <span class="checkbox-button-bar-label">{{ pack.displayName }}</span>
                <div class="checkbox-button-bar-content" style="width:200px">
                  <!--源石-->
                  <div class="image-sprite" v-show="pack.originium>0">
                    <div class="bg-icon_4002"></div>
                  </div>
                  <span v-show="pack.originium>0">{{ pack.originium }}</span>
                  <!--合成玉-->
                  <div class="image-sprite" v-show="pack.orundum>0">
                    <div class="bg-icon_4003"></div>
                  </div>
                  <span v-show="pack.orundum>0">{{ pack.orundum }}</span>
                  <!--抽卡券-->
                  <div class="image-sprite" v-show="pack.gachaTicket>0">
                    <div class="bg-icon_7003"></div>
                  </div>
                  <span v-show="pack.gachaTicket>0">{{ pack.gachaTicket }}</span>
                  <!--十连券-->
                  <div class="image-sprite" v-show="pack.tenGachaTicket>0">
                    <div class="bg-icon_7004"></div>
                  </div>
                  <span v-show="pack.tenGachaTicket>0">{{ pack.tenGachaTicket }}</span>
                </div>
              </div>
            </el-checkbox-button>
          </el-checkbox-group>

          <!--限时礼包-->
          <div class="collapse-content-subheading">
            <span></span> 限时礼包
          </div>
          <el-checkbox-group v-model="selectedPack" style="margin: 4px" @change="gachaResourcesCalculation">
            <el-checkbox-button v-for="(pack,index) in packGroupByLimited"
                                :key="index" :value="pack.parentIndex"
                                class="el-checkbox-button">
              <div class="checkbox-button-bar">
                 <span class="draw-efficiency"
                       :style="getPackPriority(pack.drawEfficiency)">
                  {{ keepTheDecimalPoint(pack.drawPrice) }}
                </span>
                <span class="checkbox-button-bar-label">{{ pack.displayName }}</span>
                <div class="checkbox-button-bar-content" style="width:200px">
                  <!--源石-->
                  <div class="image-sprite" v-show="pack.originium>0">
                    <div class="bg-icon_4002"></div>
                  </div>
                  <span v-show="pack.originium>0">{{ pack.originium }}</span>
                  <!--合成玉-->
                  <div class="image-sprite" v-show="pack.orundum>0">
                    <div class="bg-icon_4003"></div>
                  </div>
                  <span v-show="pack.orundum>0">{{ pack.orundum }}</span>
                  <!--抽卡券-->
                  <div class="image-sprite" v-show="pack.gachaTicket>0">
                    <div class="bg-icon_7003"></div>
                  </div>
                  <span v-show="pack.gachaTicket>0">{{ pack.gachaTicket }}</span>
                  <!--十连券-->
                  <div class="image-sprite" v-show="pack.tenGachaTicket>0">
                    <div class="bg-icon_7004"></div>
                  </div>
                  <span v-show="pack.tenGachaTicket>0">{{ pack.tenGachaTicket }}</span>
                </div>
              </div>
            </el-checkbox-button>
          </el-checkbox-group>

          <!--新人礼包-->
          <div class="collapse-content-subheading">
            <span></span> 新人礼包
          </div>
          <el-checkbox-group v-model="selectedPack" style="margin: 4px" @change="gachaResourcesCalculation">
            <el-checkbox-button v-for="(pack,index) in packGroupByOnce"
                                :key="index" :value="pack.parentIndex"
                                class="el-checkbox-button">
              <div class="checkbox-button-bar">
                 <span class="draw-efficiency"
                       :style="getPackPriority(pack.drawEfficiency)">
                  {{ keepTheDecimalPoint(pack.drawPrice) }}
                </span>
                <span class="checkbox-button-bar-label">{{ pack.displayName }}</span>
                <div class="checkbox-button-bar-content" style="width:200px">
                  <!--源石-->
                  <div class="image-sprite" v-show="pack.originium>0">
                    <div class="bg-icon_4002"></div>
                  </div>
                  <span v-show="pack.originium>0">{{ pack.originium }}</span>
                  <!--合成玉-->
                  <div class="image-sprite" v-show="pack.orundum>0">
                    <div class="bg-icon_4003"></div>
                  </div>
                  <span v-show="pack.orundum>0">{{ pack.orundum }}</span>
                  <!--抽卡券-->
                  <div class="image-sprite" v-show="pack.gachaTicket>0">
                    <div class="bg-icon_7003"></div>
                  </div>
                  <span v-show="pack.gachaTicket>0">{{ pack.gachaTicket }}</span>
                  <!--十连券-->
                  <div class="image-sprite" v-show="pack.tenGachaTicket>0">
                    <div class="bg-icon_7004"></div>
                  </div>
                  <span v-show="pack.tenGachaTicket>0">{{ pack.tenGachaTicket }}</span>
                </div>
              </div>
            </el-checkbox-button>
          </el-checkbox-group>

          <!--首次充值源石-->
          <div class="collapse-content-subheading">
            <span></span> 首次充值源石
          </div>
          <el-checkbox-group v-model="selectedPack" style="margin: 4px" @change="gachaResourcesCalculation">
            <el-checkbox-button v-for="(pack,index) in packGroupByYear"
                                :key="index" :value="pack.parentIndex"
                                class="el-checkbox-button">
              <div class="checkbox-button-bar">
                 <span class="draw-efficiency"
                       :style="getPackPriority(pack.drawEfficiency)">
                  {{ keepTheDecimalPoint(pack.drawPrice) }}
                </span>
                <span class="checkbox-button-bar-label">{{ pack.displayName }}</span>
                <div class="checkbox-button-bar-content" style="width:200px">
                  <!--源石-->
                  <div class="image-sprite" v-show="pack.originium>0">
                    <div class="bg-icon_4002"></div>
                  </div>
                  <span v-show="pack.originium>0">{{ pack.originium }}</span>
                  <!--合成玉-->
                  <div class="image-sprite" v-show="pack.orundum>0">
                    <div class="bg-icon_4003"></div>
                  </div>
                  <span v-show="pack.orundum>0">{{ pack.orundum }}</span>
                  <!--抽卡券-->
                  <div class="image-sprite" v-show="pack.gachaTicket>0">
                    <div class="bg-icon_7003"></div>
                  </div>
                  <span v-show="pack.gachaTicket>0">{{ pack.gachaTicket }}</span>
                  <!--十连券-->
                  <div class="image-sprite" v-show="pack.tenGachaTicket>0">
                    <div class="bg-icon_7004"></div>
                  </div>
                  <span v-show="pack.tenGachaTicket>0">{{ pack.tenGachaTicket }}</span>
                </div>
              </div>
            </el-checkbox-button>
          </el-checkbox-group>

        </el-collapse-item>

        <!--活动获得(估算)-->
        <el-collapse-item name="activity" class="collapse-item">
          <template #title>
            <div class="collapse-title-icon" style="background: rgba(119,118,255,0.8)"></div>
            <span class="collapse-title-font">
               活动获得（估算）&emsp;{{ keepTheDecimalPoint(calculationResult.activityTotalDraw, 0) }}抽
              </span>
          </template>
          <!--复刻活动-->
          <div class="collapse-content-subheading">
            <span></span> 复刻活动
          </div>
          <el-checkbox-group v-model="selectedActivityName" style="margin: 4px" @change="gachaResourcesCalculation">
            <el-checkbox-button v-for="(activity,name) in activitySchedules"
                                :key="name" :value="name" v-show="activity.module==='actRe'"
                                class="el-checkbox-button">
              <div class="checkbox-button-bar">
                <span class="checkbox-button-bar-label">{{ activity.name }}</span>
                <div class="checkbox-button-bar-content" style="width:200px">
                  <!--源石-->
                  <div class="image-sprite" v-show="activity.originium>0">
                    <div class="bg-icon_4002"></div>
                  </div>
                  <span v-show="activity.originium>0">{{ activity.originium }}</span>
                  <!--合成玉-->
                  <div class="image-sprite" v-show="activity.orundum>0">
                    <div class="bg-icon_4003"></div>
                  </div>
                  <span v-show="activity.orundum>0">{{ activity.orundum }}</span>
                  <!--抽卡券-->
                  <div class="image-sprite" v-show="activity.gachaTicket>0">
                    <div class="bg-icon_7003"></div>
                  </div>
                  <span v-show="activity.gachaTicket>0">{{ activity.gachaTicket }}</span>
                  <!--十连券-->
                  <div class="image-sprite" v-show="activity.tenGachaTicket>0">
                    <div class="bg-icon_7004"></div>
                  </div>
                  <span v-show="activity.tenGachaTicket>0">{{ activity.tenGachaTicket }}</span>
                </div>
              </div>
            </el-checkbox-button>
          </el-checkbox-group>

          <!-- 未来活动 -->
          <div class="collapse-content-subheading">
            <span></span> 未来活动
          </div>
          <el-checkbox-group v-model="selectedActivityName" style="margin: 4px" @change="gachaResourcesCalculation">
            <el-checkbox-button v-for="(activity,name) in activitySchedules"
                                :key="name" :value="name" v-show="activity.module==='act'"
                                class="el-checkbox-button">
              <div class="checkbox-button-bar">
                <span class="checkbox-button-bar-label">{{ activity.name }}</span>
                <div class="checkbox-button-bar-content" style="width:200px">
                  <!--源石-->
                  <div class="image-sprite" v-show="activity.originium>0">
                    <div class="bg-icon_4002"></div>
                  </div>
                  <span v-show="activity.originium>0">{{ activity.originium }}</span>
                  <!--合成玉-->
                  <div class="image-sprite" v-show="activity.orundum>0">
                    <div class="bg-icon_4003"></div>
                  </div>
                  <span v-show="activity.orundum>0">{{ activity.orundum }}</span>
                  <!--抽卡券-->
                  <div class="image-sprite" v-show="activity.gachaTicket>0">
                    <div class="bg-icon_7003"></div>
                  </div>
                  <span v-show="activity.gachaTicket>0">{{ activity.gachaTicket }}</span>
                  <!--十连券-->
                  <div class="image-sprite" v-show="activity.tenGachaTicket>0">
                    <div class="bg-icon_7004"></div>
                  </div>
                  <span v-show="activity.tenGachaTicket>0">{{ activity.tenGachaTicket }}</span>
                </div>
              </div>
            </el-checkbox-button>
          </el-checkbox-group>

        </el-collapse-item>

        <el-collapse-item name="other" class="collapse-item">
          <template #title>
            <div class="collapse-title-icon" style="background: rgba(119,118,255,0.8)"></div>
            <span class="collapse-title-font">
               其他资源（估算）&emsp;{{ keepTheDecimalPoint(calculationResult.otherTotalDraw, 0) }}抽
              </span>
          </template>

          <div class="resources-bar" v-for="(honeyCake,label) in honeyCakeTable" :key="label"
               v-show="itemIsExpired(honeyCake)">
            <span class="resources-bar-title" style="width: 240px">{{ honeyCake.name }}</span>
            <div class="resources-bar-content">
              <div class="image-sprite" v-show="honeyCake.originium>0">
                <div class="bg-icon_4002"></div>
              </div>
              <span v-show="honeyCake.originium>0">{{ honeyCake.originium }}</span>
              <div class="image-sprite" v-show="honeyCake.orundum>0">
                <div class="bg-icon_4003"></div>
              </div>
              <span v-show="honeyCake.orundum>0">{{ honeyCake.orundum }}</span>
              <div class="image-sprite" v-show="honeyCake.gachaTicket>0">
                <div class="bg-icon_7003"></div>
              </div>
              <span v-show="honeyCake.gachaTicket>0">{{ honeyCake.gachaTicket }}</span>
              <div class="image-sprite" v-show="honeyCake.tenGachaTicket>0">
                <div class="bg-icon_7004"></div>
              </div>
              <span v-show="honeyCake.tenGachaTicket>0">{{ honeyCake.tenGachaTicket }}</span>
            </div>
          </div>
        </el-collapse-item>
      </el-collapse>
    </div>
  </div>
</template>


<style scoped>

.gc-page {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;

  :deep(.el-radio-button__inner) {
    width: 160px;
  }

  :deep(.el-collapse-item__content) {
    padding-bottom: 8px;

  }

  :deep(.el-collapse-item) {
    border-radius: 8px;
    overflow: hidden;
  }

  :deep(.el-collapse-item__header) {
    border-bottom: 1px solid #f0f0f0;
  }

  :deep(.el-checkbox-button__inner) {
    padding: 2px;
    border: var(--el-border);
    border-radius: 6px;
  }
}

@media screen and (max-width: 600px){
  .gc-page {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;

    :deep(.el-radio-button__inner) {
      width: 110px;
      font-size: 10px;
      padding: 8px;
    }

    :deep(.el-collapse-item__content) {
      padding-bottom: 4px;
    }

    :deep(.el-collapse-item) {
      border-radius: 6px;
      overflow: hidden;
    }

    :deep(.el-collapse-item__header) {
      border-bottom: 1px solid #f0f0f0;
    }

    :deep(.el-checkbox-button__inner) {
      padding: 2px;
      border: var(--el-border);
      border-radius: 6px;
    }
  }
}


</style>