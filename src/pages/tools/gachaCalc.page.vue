<!--修改活动日期按钮请在变量"scheduleOptions"中修改，修改活动排期请在变量"HONEY_CAKE_TABLE"所引入的json文件中修改-->
<script setup>
import { h, onMounted, ref } from "vue";
import '/src/assets/css/tool/gacha_calc.scss'
import '/src/assets/css/sprite/sprite_plane_icon.css'
import '/src/assets/css/tool/gacha_calc.phone.scss'
import * as echarts from "echarts";

import potentialTable from '/src/static/json/tools/potentialGachaResources.json'
import HONEY_CAKE_TABLE from '/src/static/json/tools/scheduleByHoneycake.json'
import storeAPI from '/src/api/store'
import { cMessage } from "../../custom/message.js";
import { dateDiff } from '/src/utils/dateUtil.js'
import { ElNotification } from "element-plus";

import { useNotification } from "naive-ui";



// 罗德岛蜜饼工坊预测的其他奖励排期
let honeyCakeTable = ref([])
// 罗德岛蜜饼工坊预测的活动排期
let activitySchedules = ref({})

//将预测活动排期分类
for (const name in HONEY_CAKE_TABLE) {
  let honeyCake = HONEY_CAKE_TABLE[name]
  //将活动排期的日期统一转为时间戳
  honeyCake.start = new Date(honeyCake.start).getTime()
  honeyCake.end = new Date(honeyCake.end).getTime()
  honeyCake.name = name
  //分为其他和活动两组数据
  if (honeyCake.module === 'honeyCake') {
    honeyCakeTable.value.push(honeyCake)
  } else {
    activitySchedules.value[name] = honeyCake
  }
}

/**
 * 批量生成服务器维护奖励列表，以10天为一个时间段生成，每个时间段有400合成玉
 */
function batchGenerationServerMaintenanceRewards() {
  const date = new Date();
  let month = date.getMonth() + 1
  let year = date.getFullYear()
  for (let i = 0; i < 12; i++) {
    let reward = {
      name: `游戏维护(${month}月)`,
      originium: 0,
      orundum: 1200,
      gachaTicket: 0,
      tenGachaTicket: 0,
      start: new Date(`${year}/0${month}/01 00:00:00`).getTime(),
      end: month === 2 ? new Date(`${year}/0${month}/27 23:00:00`).getTime() : new Date(`${year}/0${month}/30 23:00:00`).getTime(),
      rewardType: "公共",
      module: "honeyCake",
      probability: ""
    }

    if (i === 0) {
      const day = date.getDate();
      reward.orundum = Math.floor((30 - day) / 5) * 200
    }

    if (reward.orundum > 200) {
      honeyCakeTable.value.push(reward)
    }

    month++
    if (month > 12) {
      month = 1
      year++
    }
  }
}

batchGenerationServerMaintenanceRewards()

//用户选择的活动
let selectedScheduleName = ref('周年限定(5.15)')
//用户选择的活动的结束时间
let endDate = ref(new Date(1711008000000))
//用户选择的活动
let selectedSchedule = ref({})
//用户选择的活动的类型
let activityType = ref('联动限定')

//可活动列表，包含活动的名称，开启和结束时间
// name: string 活动名称
// start: Date 起始时间
// end: Date 结束时间
// disabled: boolean 是否禁用选项
// activityType: string 活动类型
// dailyGiftResources: boolean 活动是否每日赠送抽卡资源
let scheduleOptions = [
  {
    name: '夏活(8.15)',
    start: new Date('2024/08/01 16:00:00'),
    end: new Date('2024/08/15 04:01:00'),
    activityType: '夏活限定',
    disabled: false,
    dailyGiftResources: true
  },
  {
    name: '周年(11.1)',
    start: new Date('2024/11/01 16:00:00'),
    end: new Date('2024/11/15 04:01:00'),
    activityType: '夏活限定',
    disabled: true,
    dailyGiftResources: true
  },
  {
    name: '新春',
    start: new Date('2024/08/27 16:00:00'),
    end: new Date('2024/08/27 04:01:00'),
    activityType: '夏活限定',
    disabled: true,
    dailyGiftResources: true
  }
]


//新人礼包集合
let packListGroupByOnce = ref([])
//每年重置的礼包集合
let packListGroupByrOiginium = ref([])
//每月重置的礼包集合
let packListGroupByMonthly = ref([])
//限时礼包集合
let packListGroupByActivity = ref([])

let packListGroupByHistorical = ref([])

//全部礼包集合
let packList = ref([])
//每月黄票兑换抽卡券(视为礼包)集合
let certificatePackList = ref([])

/**
 * 获取和分类礼包数据
 */
function getAndSortPackData() {
  //礼包唯一索引
  let index = 0;

  const currentTimeStamp = new Date().getTime()

  //从服务器获取礼包数据，将其进行分类
  storeAPI.getPackStore().then(response => {
    for (let pack of response.data) {

      if (pack.officialName.indexOf('如死亦终') > -1) {
        continue
      }

      //没有抽卡资源不写入
      if (!(pack.drawPrice > 0)) {
        continue;
      }
      //如果是每月寻访礼包或者源石不写入
      if (pack.officialName === '每月寻访组合包' || pack.officialName.indexOf('普通源石') > -1) {
        continue
      }

      pack.parentIndex = index
      //将礼包写入全部礼包集合
      packList.value.push(pack)
      //礼包索引递增
      index++

      if (pack.end < currentTimeStamp) {
        continue
      }

      //根据礼包类型进行分类
      if (pack.saleType === 'newbie') {
        packListGroupByOnce.value.push(pack)
      }

      if (pack.saleType === 'originium2') {
        packListGroupByrOiginium.value.push(pack)
      }

      if (pack.saleType === 'monthly') {
        packListGroupByMonthly.value.push(pack)
      }

      if (pack.saleType === 'activity') {
        packListGroupByActivity.value.push(pack)
      }
    }

    batchGenerationMonthlyPack(index)

  })
}

/**
 * 批量生成月常礼包
 * @param index 礼包唯一索引
 */
function batchGenerationMonthlyPack(index) {
  //获取当前时间
  const date = new Date();
  //获取当前月份
  let month = date.getMonth() + 1
  //获取当前年份
  let year = date.getFullYear();

  // 预生成8个月的每月寻访组合包和每月黄票兑换单抽
  for (let i = 0; i < 8; i++) {
    //获取每月的最后一天，用于写入礼包的起始日期（每月1号）和结束日期（每月最后一天）
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

    const certificatePack = {
      "displayName": `${month}月黄票兑换单抽`,
      "gachaTicket": 8,
      "tenGachaTicket": 3,
      "originium": 0,
      "orundum": 0,
      "start": new Date(`${year}/${month.toString().padStart(2, "0")}/01 00:00:00`),
      "end": new Date(`${year}/${month.toString().padStart(2, "0")}/${lastDay} 23:59:59`)
    }

    //写入预生成的每月黄票兑换单抽
    certificatePackList.value.push(certificatePack)
    //写入每月寻访组合包
    packListGroupByMonthly.value.push(pack)
    //写入全部礼包
    packList.value.push(pack)

    //月份大于12，年数加1
    if (month >= 12) {
      month = 1
      year++
    } else {
      month++
    }
    //礼包索引递增
    index++
  }

  console.log(packList.value)
}


/**
 * 根据礼包抽卡性价比获取背景色
 * @param drawEfficiency 抽卡性价比
 * @return {string} 角标背景色
 */
function getPackPriorityColor(drawEfficiency) {
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
 * @param index 选择的活动索引
 */
function updateScheduleOption(index) {
  const schedule = scheduleOptions[index]
  selectedScheduleName.value = schedule.name
  selectedSchedule.value = schedule
  endDate.value = schedule.end
  if (calPoolStart.value) {
    endDate.value = schedule.start
    }
  activityType.value = schedule.activityType
  gachaResourcesCalculation()
}


//折叠面板绑定的集合，如果集合中有折叠面板的name，面板会默认展开，当点击展开面板时，面板组件也会将面板组件的name赋值给这个集合
// 值有'exist', 'custom', 'daily', 'potential','recharge', 'activity', 'other'
let resultCollapseActiveNames = ref(['calculationResult'])
let optionsCollapseActiveNames = ref(['exist', 'daily',
  'activity', 'other'])

//库存资源
let existResources = ref({
  originium: 0,
  orundum: 0,
  gachaTicket: 0,
  tenGachaTicket: 0,
  correctOrundum: 0, //用于修正的合成玉数量
  skinBudget: 0, //要购买多少皮肤
})

//日常资源
let dailyReward = ref({
  //距离卡池结束有多少天
  daily: 4,
  //日常奖励数量
  dailyOrundumReward: 0,
  //距离卡池结束有多少周
  weekly: 2,
  //周常任务是否完成
  weeklyTaskCompleted: true,
  //周常奖励
  weeklyOrundumReward: 0,
  //可以在绿票商店购买几个月的前两层抽卡道具
  certificateShoppingTimes: 2,
  //本月绿票商店是否兑换完毕
  certificateStoreCompleted: true,
  //绿票商店购买的合成玉数量
  purchasedOrundumQuantity: 0,
  //绿票商店购买的单抽数量
  purchasedGachaTicketQuantity: 0,
  //剿灭次数
  annihilation: 3,
  //本周剿灭是否完成
  annihilationCompleted: true,
  //剿灭合成玉奖励
  annihilationOrundumReward: 0,
  //签到次数
  checkIn: 3,
  //签到次数
  checkInGachaTicket: 0,
})

//潜在资源
let potentialResources = ref({
  //悖论模拟数量
  paradox: 0,
  //剿灭模拟数量
  annihilation: 0,
})

//搓玉
let produceOrundum = ref({
  // 理智
  ap: 0,
  //1理智可转化合成玉倍率
  coefficient: 1.09,
  //理智产出合成玉的数量
  outputByAp: 0,
  'itemId30012': 0,
  'itemId30062': 0,
  'itemId4001': 0,
  //材料产出合成玉数量
  outputByItem: 0,
})

//绿票商店三层
let certificateStoreF3 = ref({
  //绿票凭证
  certificates: 0,
  //剩余绿票凭证
  remainingCertificates: 0,
  //可兑换合成玉
  orundum: 0
})

//是否改用卡池开放当天的数据进行计算
let calPoolStart = ref(false)

//判断源石是否用于抽卡
let originiumIsUsed = ref(true)

//饼图的数据
let pieChartData = ref([
  { value: 22, name: "现有" },
  { value: 33, name: "潜在" },
  { value: 44, name: "日常" },
  { value: 22, name: "氪金" },
  { value: 33, name: "活动" },
  { value: 44, name: "其它" }
])

//氪金选项
let rechargeOption = ref({
  monthlyCardPurchasedThisMonth: false,
  additionalMonthlyCardPurchase: 0,
})

//攒抽计算结果
let calculationResult = ref({
  //总抽数
  totalDraw: 0,
  //充值总额
  totalAmountOfRecharge: 0,
  //库存总抽数
  existTotalDraw: 0,
  //日常总抽数
  dailyTotalDraw: 0,
  //潜在总抽数
  potentialTotalDraw: 0,
  //氪金总抽数
  rechargeTotalDraw: 0,
  //活动总抽数
  activityTotalDraw: 0,
  //其他资源总抽数
  otherTotalDraw: 0,
  //搓玉总抽数
  produceOrundumTotalDraw: 0,
  //源石
  originium: 0,
  //合成玉
  orundum: 0,
  //抽卡券
  gachaTicket: 0,
  //十连券
  tenGachaTicket: 0,
})

let singleResourceDraws = ref({
  originium: 0,
  //合成玉
  orundum: 0,
  //抽卡券
  gachaTicket: 0,
  //十连券
  tenGachaTicket: 0,
})

//当前时间戳
const currentTimestamp = new Date().getTime();
//选中的黄票兑换抽卡券
let selectedCertificatePack = ref([])
//选中的潜在章节
let selectedPermanentZoneName = ref([])
//选中的活动名称
let selectedActivityName = ref([])
//选择的礼包索引
let selectedPackIndex = ref([])

let logs = []

// let officialMonthlyCardReward = ref(0)
// const officialMonthlyCardEndDate = new Date('2024/05/27 03:58:00')
// let officialMonthlyCardRemainingDays = ref(0)

/**
 * 计算抽卡资源
 */
function gachaResourcesCalculation() {
  logs = []

  //饼图数据暂存区
  let pieChartDataTmp = []

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
    //共计有多少个星期一
    let mondayCount = 0
    //共计有多少天
    let days = 0
    //多少次签到
    let checkInTimes = 0
    //可以在绿票商店购买几个月的前两层抽卡道具
    let ShoppingTimes = 0
    //当前时间
    let startDate = new Date()

    //如果今天不是周一，星期一总数加1，因为有可能不在周一打剿
    if (startDate.getDay() !== 1) {
      mondayCount++
    }
    //如果今天不是1号，商店购买次数加1，因为有可能1号买不完商店
    if (startDate.getDate() !== 1) {
      ShoppingTimes++
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
        ShoppingTimes++
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
    if (dailyReward.value.certificateStoreCompleted) {
      ShoppingTimes = ShoppingTimes > 0 ? ShoppingTimes - 1 : ShoppingTimes
    }
    //对日常资源计算结果对象进行赋值
    dailyReward.value.daily = days
    dailyReward.value.dailyOrundumReward = days * 100
    dailyReward.value.weekly = weeks;
    dailyReward.value.weeklyOrundumReward = weeks * 500
    dailyReward.value.checkIn = checkInTimes
    dailyReward.value.checkInGachaTicket = checkInTimes
    dailyReward.value.certificateShoppingTimes = ShoppingTimes
    dailyReward.value.purchasedOrundumQuantity = ShoppingTimes * 600
    dailyReward.value.purchasedGachaTicketQuantity = ShoppingTimes * 4
    dailyReward.value.annihilation = annihilationTimes
    dailyReward.value.annihilationOrundumReward = annihilationTimes * 1800

    let orundum = days * 100 + weeks * 500 + ShoppingTimes * 600 + annihilationTimes * 1800
    let originium = 0
    let gachaTicket = checkInTimes + ShoppingTimes * 4
    let tenGachaTicket = 0

    //计算用户选择兑换几次黄票商店的38抽
    for (const i of selectedCertificatePack.value) {
      const item = certificatePackList.value[i]
      gachaTicket += item.gachaTicket
      tenGachaTicket += item.tenGachaTicket
    }

    //计算官方月卡
    // if (endDate.value < officialMonthlyCardEndDate) {
    //   officialMonthlyCardRemainingDays.value = dateDiff(new Date(), endDate.value) - 1
    // } else {
    //   officialMonthlyCardRemainingDays.value = dateDiff(new Date(), officialMonthlyCardEndDate) - 1
    // }


    // officialMonthlyCardReward.value = officialMonthlyCardRemainingDays.value * 200
    // orundum += officialMonthlyCardReward.value

    //判断源石是否用于抽卡
    if (!originiumIsUsed.value) {
      originium = 0
    }

    calculationResult.value.orundum += orundum
    calculationResult.value.originium += originium
    calculationResult.value.gachaTicket += gachaTicket
    calculationResult.value.tenGachaTicket += tenGachaTicket

    //计算日常总抽数
    calculationResult.value.dailyTotalDraw = orundum / 600 + gachaTicket + tenGachaTicket * 10

    logs.push({ key: "日常-合成玉", value: orundum })
    logs.push({ key: "日常-源石", value: originium })
    logs.push({ key: "日常-单抽", value: gachaTicket })
    logs.push({ key: "日常-十连", value: tenGachaTicket })

    //向饼图数据中写入日常的抽卡次数
    if (calculationResult.value.dailyTotalDraw > 0) {
      pieChartDataTmp.push({ value: Math.floor(calculationResult.value.dailyTotalDraw), name: "日常" })
    }

  }

  /**
   * 将传入字符串转为数字类型
   * @param value 数字的字符串
   * @return {number} 转换后的数字
   */
  function stringToNumber(value) {

    const regex = /^[-+]?\d*\.?\d+$/
    //判断传入值是否是整数或浮点数
    if (!regex.test(value)) {
      return 0
    }

    //判断是空字符串，返回0，虽然0也是false，但是因为返回的是0，无视这个问题
    if (!value) {
      return 0
    }


    // 判断输入的字符串是否含有小数点
    if (value.toString().indexOf('.') > -1) {

      return parseFloat(value)
    }

    return Math.ceil(value)


  }


  /**
   * 计算用户库存抽卡次数
   */
  function existCalculate() {

    let orundum = stringToNumber(existResources.value.orundum)
    let originium = stringToNumber(existResources.value.originium)
    const gachaTicket = stringToNumber(existResources.value.gachaTicket)
    const tenGachaTicket = stringToNumber(existResources.value.tenGachaTicket)

    //计算用户自定义修正的合成玉
    orundum += stringToNumber(existResources.value.correctOrundum.toString())
    //计算用户预留给皮肤的源石
    originium -= stringToNumber(existResources.value.skinBudget.toString()) * 18

    if (!originiumIsUsed.value) {
      originium = 0
    }

    calculationResult.value.orundum += orundum
    calculationResult.value.originium += originium
    calculationResult.value.gachaTicket += gachaTicket
    calculationResult.value.tenGachaTicket += tenGachaTicket

    calculationResult.value.existTotalDraw = orundum / 600 + originium * 0.3
      + gachaTicket + tenGachaTicket * 10

    logs.push({ key: "库存-合成玉", value: orundum })
    logs.push({ key: "库存-源石", value: originium })
    logs.push({ key: "库存-单抽", value: gachaTicket })
    logs.push({ key: "库存-十连", value: tenGachaTicket })

    if (calculationResult.value.existTotalDraw > 0) {
      pieChartDataTmp.push({ value: Math.floor(calculationResult.value.existTotalDraw), name: "库存" })
    }

  }


  function produceOrundumCalculate() {
    //计算用理智产出的合成玉数量
    if (produceOrundum.value.ap && produceOrundum.value.coefficient) {
      produceOrundum.value.outputByAp = Math.ceil(stringToNumber(produceOrundum.value.ap) * stringToNumber(produceOrundum.value.coefficient))
    }
    //计算用材料产出的合成玉数量
    produceOrundum.value.outputByItem = Math.ceil(stringToNumber(produceOrundum.value.itemId30012) * 5 +
      stringToNumber(produceOrundum.value.itemId30062) * 10)
    //计算用材料产出合成玉时的龙门币消耗
    produceOrundum.value.itemId4001 = stringToNumber(produceOrundum.value.itemId30012) * 800 +
      stringToNumber(produceOrundum.value.itemId30062) * 1000
    //可用于兑换商店第三层的凭证数量
    let certificates = stringToNumber(certificateStoreF3.value.certificates)
    //如果凭证数量大于11590(搬空前两层的凭证消耗量),曾可以兑换合成玉
    if (certificates > 11590) {
      //扣除11590凭证之后剩余的凭证数量
      certificateStoreF3.value.remainingCertificates = certificates - 11590
      //可兑换多少合成玉
      certificateStoreF3.value.orundum = Math.floor((certificateStoreF3.value.remainingCertificates / 50) * 30)
    } else {
      certificateStoreF3.value.remainingCertificates = 0
      certificateStoreF3.value.orundum = 0
    }
    //计算两种方式可以产出多少合成玉
    const orundum = produceOrundum.value.outputByAp + produceOrundum.value.outputByItem + certificateStoreF3.value.orundum

    calculationResult.value.orundum += orundum

    calculationResult.value.produceOrundumTotalDraw = orundum / 600

    if (calculationResult.value.produceOrundumTotalDraw > 0) {
      pieChartDataTmp.push({ value: Math.floor(calculationResult.value.produceOrundumTotalDraw), name: "搓玉" })
    }

  }

  /**
   * 计算潜在抽卡资源
   */
  function potentialResourcesCalculation() {

    let orundum = 0;
    let originium = 0;
    //计算悖论模拟的合成玉
    orundum += potentialResources.value.paradox * 200
    //计算剿灭模拟的合成玉
    orundum += potentialResources.value.annihilation * 1500

    //计算选中的常驻章节或活动的资源
    if (selectedPermanentZoneName.value) {
      //循环选中的章节按钮的索引，获得对应的章节奖励
      for (const index of selectedPermanentZoneName.value) {
        const potential = potentialTable[index]
        originium += parseInt(potential.gachaOriginium)
      }
    }

    if (!originiumIsUsed.value) {
      originium = 0
    }

    calculationResult.value.orundum += orundum
    calculationResult.value.originium += originium

    calculationResult.value.potentialTotalDraw = orundum / 600 + originium * 0.3

    logs.push({ key: "潜在-合成玉", value: orundum })
    logs.push({ key: "潜在-源石", value: originium })

    if (calculationResult.value.potentialTotalDraw > 0) {
      pieChartDataTmp.push({ value: Math.floor(calculationResult.value.potentialTotalDraw), name: "潜在" })
    }
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

    //循环选中的礼包索引，获得对应的礼包
    for (const i of selectedPackIndex.value) {
      const pack = packList.value[i]


      //月卡单独处理
      if (pack.displayName === '月卡') {
        //计算卡池结束前月卡可以拿到多少合成玉
        packList.value[i].orundum = dailyReward.value.daily * 200
        //卡池结束前可以购买月卡的数量
        let purchaseQuantity = Math.ceil(dailyReward.value.daily / 30)
        //加上额外购买的月卡数量,判断是否额外购买了超过3个月
        if (rechargeOption.value.additionalMonthlyCardPurchase > 3) {
          cMessage('月卡一次性只能最大购买90天', 'error')
        } else {
          //加上额外购买的月卡数量
          purchaseQuantity += rechargeOption.value.additionalMonthlyCardPurchase
          //计算通过月卡总计获得多少源石
          packList.value[i].originium = purchaseQuantity * 6
        }

        //月卡的价格=购买月卡的数量*30
        packList.value[i].price = purchaseQuantity * 30
        //当月月卡已购买源石-6
        if (rechargeOption.value.monthlyCardPurchasedThisMonth) {
          packList.value[i].originium -= 6
          totalAmountOfRecharge -= 30
        }
      }

      orundum += pack.orundum
      originium += pack.originium
      gachaTicket += pack.gachaTicket
      tenGachaTicket += pack.tenGachaTicket
      totalAmountOfRecharge += pack.price
    }

    if (!originiumIsUsed.value) {
      originium = 0
    }

    calculationResult.value.orundum += orundum
    calculationResult.value.originium += originium
    calculationResult.value.gachaTicket += gachaTicket
    calculationResult.value.tenGachaTicket += tenGachaTicket
    calculationResult.value.totalAmountOfRecharge = totalAmountOfRecharge

    calculationResult.value.rechargeTotalDraw = orundum / 600 + originium * 0.3 +
      gachaTicket + tenGachaTicket * 10

    logs.push({ key: "氪金-合成玉", value: orundum })
    logs.push({ key: "氪金-源石", value: originium })
    logs.push({ key: "氪金-单抽", value: gachaTicket })
    logs.push({ key: "氪金-十连", value: tenGachaTicket })


    if (calculationResult.value.rechargeTotalDraw > 0) {
      pieChartDataTmp.push({ value: Math.floor(calculationResult.value.rechargeTotalDraw), name: "氪金" })
    }

  }

  /**
   * 计算用户选中活动的抽卡资源
   */
  function activityCalculate() {


    let orundum = 0
    let originium = 0
    let gachaTicket = 0
    let tenGachaTicket = 0

    //循环活动排期，计算活动可获得的奖励
    for (const activityName in activitySchedules.value) {
      const activity = activitySchedules.value[activityName]
      //判断这个活动是否在当前选择的时间段内
      if (!rewardIsExpired(activity)) {
        continue
      }

      //是复刻活动的话额外判断是否选中，选中的是老玩家还是新玩家的奖励
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

    if (!originiumIsUsed.value) {
      originium = 0
    }

    calculationResult.value.orundum += orundum
    calculationResult.value.originium += originium
    calculationResult.value.gachaTicket += gachaTicket
    calculationResult.value.tenGachaTicket += tenGachaTicket

    calculationResult.value.activityTotalDraw = orundum / 600 + originium * 0.3 +
      gachaTicket + tenGachaTicket * 10

    logs.push({ key: "活动-合成玉", value: orundum })
    logs.push({ key: "活动-源石", value: originium })
    logs.push({ key: "活动-单抽", value: gachaTicket })
    logs.push({ key: "活动-十连", value: tenGachaTicket })

    if (calculationResult.value.activityTotalDraw > 0) {
      pieChartDataTmp.push({ value: Math.floor(calculationResult.value.activityTotalDraw), name: "活动" })
    }
  }


  /**
   * 计算预测奖励结果
   */
  function honeyCakeCalculate() {
    let totalDraw = 0
    let orundum = 0
    let originium = 0
    let gachaTicket = 0
    let tenGachaTicket = 0


    const currentMonth = endDate.value.getMonth() + 1
    const MaintenanceTimes = endDate.value.getDate() - new Date().getDate()
    //循环预测奖励排期
    for (const honeyCake of honeyCakeTable.value) {
      // 判断奖励是否在当前选择的时间段内
      if (!rewardIsExpired(honeyCake)) {
        continue
      }

      if (selectedSchedule.value.dailyGiftResources) {
        if (honeyCake.name.indexOf("每日赠送") > -1) {
          honeyCake.gachaTicket = getPoolRemainingDays(honeyCake.end)
        }
        if (honeyCake.name.indexOf("矿区") > -1 || honeyCake.name.indexOf("红包墙") > -1) {
          const remainingDays = getPoolRemainingDays(honeyCake.end)
          honeyCake.orundum = remainingDays * 600
        }
      }

      // if(honeyCake.name.indexOf(`游戏维护(${currentMonth}月)`)>-1){
      //       honeyCake.orundum = Math.floor(MaintenanceTimes/5)*200
      // }

      originium += honeyCake.originium
      orundum += honeyCake.orundum
      gachaTicket += honeyCake.gachaTicket
      tenGachaTicket += honeyCake.tenGachaTicket
    }


    if (!originiumIsUsed.value) {
      originium = 0
    }

    calculationResult.value.orundum += orundum
    calculationResult.value.originium += originium
    calculationResult.value.gachaTicket += gachaTicket
    calculationResult.value.tenGachaTicket += tenGachaTicket


    calculationResult.value.otherTotalDraw = orundum / 600 + originium * 0.3 +
      gachaTicket + tenGachaTicket * 10

    logs.push({ key: "预测-合成玉", value: orundum })
    logs.push({ key: "预测-源石", value: originium })
    logs.push({ key: "预测-单抽", value: gachaTicket })
    logs.push({ key: "预测-十连", value: tenGachaTicket })

    if (calculationResult.value.otherTotalDraw > 0) {
      pieChartDataTmp.push({ value: Math.floor(calculationResult.value.otherTotalDraw), name: "其他" })
    }
  }

  function getPoolRemainingDays(endDate) {

    let remainingDays = Math.floor((endDate - new Date().getTime()) / 86400000)
    if (remainingDays > 14) {
      remainingDays = 14
    }
    // console.log("离限定池结束还有" + remainingDays + "天")
    return remainingDays
  }


  calculationResult.value.totalDraw = Math.floor(calculationResult.value.orundum / 600 +
    calculationResult.value.gachaTicket + calculationResult.value.tenGachaTicket * 10)

  singleResourceDraws.value.orundum = Math.floor(calculationResult.value.orundum / 600)
  singleResourceDraws.value.gachaTicket = calculationResult.value.gachaTicket
  singleResourceDraws.value.tenGachaTicket = calculationResult.value.tenGachaTicket * 10
  singleResourceDraws.value.originium = 0

  pieChartData.value = pieChartDataTmp

  logs.push({ key: "计算源石前", value: calculationResult.value.totalDraw })

  if (originiumIsUsed.value) {
    calculationResult.value.totalDraw = calculationResult.value.totalDraw + Math.floor(
      calculationResult.value.originium * 0.3)
    singleResourceDraws.value.originium = Math.floor(calculationResult.value.originium * 0.3)
  }


  logs.push({ key: "计算源石后", value: calculationResult.value.totalDraw })

  // console.table(logs)

  const lastSettings = {
    existOrundum: existResources.value.orundum,
    existOriginium: existResources.value.originium,
    existGachaTicket: existResources.value.gachaTicket,
    existTenGachaTicket: existResources.value.tenGachaTicket,
    originiumIsUsed: originiumIsUsed.value,
    weeklyTaskCompleted: dailyReward.value.weeklyTaskCompleted,
    certificateStoreCompleted: dailyReward.value.certificateStoreCompleted,
    annihilationCompleted: dailyReward.value.annihilationCompleted,
    paradox: potentialResources.value.paradox,
    annihilation: potentialResources.value.annihilation
  }

  localStorage.setItem('LastSettings', JSON.stringify(lastSettings))

  setPieChart(pieChartData.value)

  // console.log(calculationResult.value)
}


/**
 * 判断这个奖励或礼包是否可在当前用户选择的时间段内获取
 * @param reward 奖励的信息
 * @returns {boolean} 是否可计入
 */
function rewardIsExpired(reward) {
  //活动结束时间在当前时间之前，活动已结束
  if (reward.end < currentTimestamp) {
    return false
  }
  //活动开始时间在选择的结束时间节点之后，活动未开启
  if (reward.start > endDate.value.getTime()) {
    return false
  }
  //判断是否当前奖励的类型是否可以被计入，公共类型都可以计入，特殊类型需要符合当前活动类型，例如联动的专属十连不能被计入新春的攒抽结果中
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
          textStyle: { color: "rgb(255,69,0)", fontSize: "12" },
        },
        labelLine: {
          length: 4,
          length2: 4,
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

//从本地存储读取上次用户的攒抽设置
function readLastSettings() {
  let lastSettings = localStorage.getItem('LastSettings');
  if (!lastSettings) {
    return
  }

  try {
    lastSettings = JSON.parse(lastSettings)
  } catch (error) {
    console.log(error)
    return;
  }


  existResources.value.orundum = lastSettings.existOrundum ? lastSettings.existOrundum : 0
  existResources.value.originium = lastSettings.existOriginium ? lastSettings.existOriginium : 0
  existResources.value.gachaTicket = lastSettings.existGachaTicket ? lastSettings.existGachaTicket : 0
  existResources.value.tenGachaTicket = lastSettings.existTenGachaTicket ? lastSettings.existTenGachaTicket : 0
  originiumIsUsed.value = lastSettings.originiumIsUsed
  dailyReward.value.weeklyTaskCompleted = lastSettings.weeklyTaskCompleted
  dailyReward.value.certificateStoreCompleted = lastSettings.certificateStoreCompleted
  dailyReward.value.annihilationCompleted = lastSettings.annihilationCompleted
  potentialResources.value.paradox = lastSettings.paradox ? lastSettings.paradox : 0
  potentialResources.value.annihilation = lastSettings.annihilation ? lastSettings.annihilation : 0

}

onMounted(() => {
  readLastSettings()
  myChart = echarts.init(document.getElementById("calculationResultPieChart"));
  updateScheduleOption(0)
  getAndSortPackData()

  ElNotification({
    title: '2024.5.15',
    message: h('i', { style: 'color: teal' }, '更新了夏活攒抽排期 @罗德岛蜜饼工坊'),
  })


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


// 创建一个窗口尺寸变化的监听器
window.addEventListener('resize', handleResize);


// 定义尺寸变化处理函数
function handleResize() {

  //判断是否是移动设备或PC端将窗口缩小，如果是就对chart画布进行尺寸重设
  if (window.innerWidth < 590) {
    myChart.resize()
  } else {
    myChart.resize()
  }
}

</script>

<template>

  <!--  <img src="/public/顶部.jpg" alt="" style="width: 600px;position: absolute;top: 50px;left: 360px;z-index:3000;opacity: 0.3" >-->
  <div class="gacha-calculation-page" id="gachaCalculate">
    <!--计算结果-->
    <div class="collapse-group1" id="result-box">
      <div class="collapse-group-content">
        <el-collapse v-model="resultCollapseActiveNames" class="" style="border: none">
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
              <el-radio-group v-model="selectedScheduleName" size="large" style="margin: auto">
                <el-radio-button v-for="(activity, index) in scheduleOptions" :key="index" :value="activity.name"
                  :label="activity.name" :disabled="activity.disabled" @change="updateScheduleOption(index)" />
              </el-radio-group>
            </div>

            <span class="tip" style="text-align: center">日期为卡池结束日期，夏活日期待定，仅参考</span>
            <div class="switch-wrap">
              <span>计算开卡池开放当天的抽数</span>
              <el-switch v-model="calPoolStart" @click="gachaResourcesCalculation"></el-switch>
            </div>
            <div class="result-content">
              <!--饼状图-->
              <div class="gacha-resources-chart-pie" id="calculationResultPieChart">
              </div>
              <!--抽卡次数总览-->
              <table class="gacha-resources-table">
                <tbody>
                  <tr>
                    <td class="gacha-resources-table-title">现有</td>
                    <td class="gacha-resources-table-quantity">{{
          keepTheDecimalPoint(calculationResult.existTotalDraw, 0)
        }}
                    </td>
                    <td>抽</td>
                  </tr>
                  <tr>
                    <td>日常</td>
                    <td>{{ keepTheDecimalPoint(calculationResult.dailyTotalDraw, 0) }}</td>
                    <td>抽</td>
                  </tr>
                  <tr>
                    <td>搓玉</td>
                    <td>{{ keepTheDecimalPoint(calculationResult.produceOrundumTotalDraw, 0) }}</td>
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
            <!--抽卡资源总览-->
            <div class="resources-result-bar">
              <div class="resources-result-single">
                <div class="image-sprite">
                  <div class="bg-icon_4002"></div>
                </div>
                <span class="resources-quantity">{{ calculationResult.originium }}</span>
                <span class="resources-quantity-small">({{ singleResourceDraws.originium }})</span>
              </div>
              <div class="resources-result-single">
                <div class="image-sprite">
                  <div class="bg-icon_4003"></div>
                </div>
                <span class="resources-quantity">{{ calculationResult.orundum }}</span>
                <span class="resources-quantity-small">({{ singleResourceDraws.orundum }})</span>
              </div>
              <div class="resources-result-single">
                <div class="image-sprite">
                  <div class="bg-icon_7003"></div>
                </div>
                <span class="resources-quantity">{{ calculationResult.gachaTicket }}</span>
                <span class="resources-quantity-small">({{ singleResourceDraws.gachaTicket }})</span>
              </div>
              <div class="resources-result-single">
                <div class="image-sprite">
                  <div class="bg-icon_7004"></div>
                </div>
                <span class="resources-quantity">{{ calculationResult.tenGachaTicket }}</span>
                <span class="resources-quantity-small">({{ singleResourceDraws.tenGachaTicket }})</span>
              </div>
            </div>
          </el-collapse-item>
        </el-collapse>
      </div>
    </div>

    <div class="collapse-group2" id="resources-box">
      <el-collapse v-model="optionsCollapseActiveNames" style="border: none">
        <!--库存资源-->
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

          <div class="exist-resources-input-wrap">
            <div class="exist-resources-input">
              <div class="image-sprite">
                <div class="bg-icon_4002"></div>
              </div>
              <input @change="gachaResourcesCalculation" v-model="existResources.originium">
              <div class="image-sprite">
                <div class="bg-icon_4003"></div>
              </div>
              <input @change="gachaResourcesCalculation" v-model="existResources.orundum">
            </div>
            <div class="exist-resources-input">
              <div class="image-sprite">
                <div class="bg-icon_7003"></div>
              </div>
              <input @change="gachaResourcesCalculation" v-model="existResources.gachaTicket">
              <div class="image-sprite">
                <div class="bg-icon_7004"></div>
              </div>
              <input @change="gachaResourcesCalculation" v-model="existResources.tenGachaTicket">
            </div>
          </div>

          <div class="switch-wrap">
            <span>是否使用源石抽卡</span>
            <el-switch v-model="originiumIsUsed" @click="gachaResourcesCalculation"></el-switch>
          </div>

          <div class="collapse-content-subheading">
            <span></span> 预留，自定义修正
          </div>
          <div class="resources-line">
            <input v-model="existResources.correctOrundum" @input="gachaResourcesCalculation">
            <span>合成玉自定义修正</span>
            <div class="image-sprite">
              <div class="bg-icon_4003"></div>
            </div>
            <span>{{ existResources.correctOrundum }}</span>
          </div>
          <span class="tip"> 例如给轮换池预留、其它来源等，可填负数</span>
          <el-slider v-model="existResources.skinBudget" :step="1" :min="0" :max="10" show-stops show-input
            @change="gachaResourcesCalculation()" style="width: 90%;margin: 0 5%">
          </el-slider>
          <span class="tip">预留皮肤（18石/件）</span>
        </el-collapse-item>


        <el-collapse-item name="daily" class="collapse-item">
          <template #title>
            <div class="collapse-title-icon" style="background: rgba(119,118,255,0.8)"></div>
            <span class="collapse-title-font">
              日常积累&emsp;{{ keepTheDecimalPoint(calculationResult.dailyTotalDraw, 0) }}抽
            </span>
          </template>

          <div class="resources-line">
            <span class="resources-line-label">
              日常{{ dailyReward.daily }}天
            </span>
            <div class="resources-line-content">
              <div class="image-sprite">
                <div class="bg-icon_4003"></div>
              </div>
              <span>{{ dailyReward.dailyOrundumReward }}</span>
            </div>
          </div>
          <!--          <div class="resources-line">-->
          <!--              <span class="resources-line-label">-->
          <!--                官方月卡{{ officialMonthlyCardRemainingDays }}次-->
          <!--              </span>-->
          <!--            <div class="resources-line-content">-->
          <!--              <div class="image-sprite">-->
          <!--                <div class="bg-icon_4003"></div>-->
          <!--              </div>-->
          <!--              <span>{{ officialMonthlyCardReward }}</span>-->
          <!--            </div>-->
          <!--          </div>-->
          <!--          <el-divider></el-divider>-->
          <div class="divider"></div>
          <div class="resources-line">
            <span class="resources-line-label">
              周常{{ dailyReward.weekly }}周
            </span>
            <div class="resources-line-content">
              <div class="image-sprite">
                <div class="bg-icon_4003"></div>
              </div>
              <span>{{ dailyReward.weeklyOrundumReward }}</span>
            </div>
            <div class="gc-resources-bar-btn">
              <el-switch v-model="dailyReward.weeklyTaskCompleted" @change="gachaResourcesCalculation"></el-switch>
              本周已完成
            </div>
          </div>

          <div class="resources-line">
            <span class="resources-line-label">
              剿灭{{ dailyReward.annihilation }}周
            </span>
            <div class="resources-line-content">
              <div class="image-sprite">
                <div class="bg-icon_4003"></div>
              </div>
              <span>{{ dailyReward.annihilationOrundumReward }}</span>
            </div>
            <div class="gc-resources-bar-btn">
              <el-switch v-model="dailyReward.annihilationCompleted" @change="gachaResourcesCalculation"></el-switch>
              本周已完成
            </div>
          </div>
          <div class="divider"></div>
          <div class="resources-line">
            <span class="resources-line-label">
              绿票商店{{ dailyReward.certificateShoppingTimes }}月
            </span>
            <div class="resources-line-content">
              <div class="image-sprite">
                <div class="bg-icon_4003"></div>
              </div>
              <span>{{ dailyReward.purchasedOrundumQuantity }}</span>
              <div class="image-sprite">
                <div class="bg-icon_7003"></div>
              </div>
              <span>{{ dailyReward.purchasedGachaTicketQuantity }}</span>
            </div>
            <div class="gc-resources-bar-btn">
              <el-switch v-model="dailyReward.certificateStoreCompleted"
                @change="gachaResourcesCalculation"></el-switch>
              本月已兑换
            </div>
          </div>

          <div class="resources-line">
            <span class="resources-line-label">
              每月签到{{ dailyReward.checkIn }}月
            </span>
            <div class="resources-line-content">
              <div class="image-sprite">
                <div class="bg-icon_7003"></div>
              </div>
              <span>{{ dailyReward.checkInGachaTicket }}</span>
            </div>
          </div>
          <div class="divider"></div>
          <el-checkbox-group v-model="selectedCertificatePack" style="margin: 4px" @change="gachaResourcesCalculation">
            <el-checkbox-button v-for="(pack, name) in certificatePackList" :key="name" :value="name" style="margin: 4px"
              v-show="rewardIsExpired(pack)">
              <div class="checkbox-button">
                <span class="checkbox-button-pack-label">{{ pack.displayName }}</span>
                <div class="checkbox-button-pack-gacha-resources">
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


        <!--搓玉资源-->
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

          <div class="resources-line">
            <input v-model="produceOrundum.ap" @input="gachaResourcesCalculation">
            <span>用于搓玉的理智 x </span>
            <input v-model="produceOrundum.coefficient" @input="gachaResourcesCalculation">
            <span>搓玉系数 = </span>
            <div class="image-sprite">
              <div class="bg-icon_4003"></div>
            </div>
            <span>{{ produceOrundum.outputByAp }}</span>
          </div>

          <span class="tip">搓玉系数：1理智可搓多少玉，1-7搓玉系数1.09</span>

          <div class="resources-line">
            <input v-model="produceOrundum.itemId30012" @input="gachaResourcesCalculation">
            <span>个固源岩 + </span>
            <input v-model="produceOrundum.itemId30062" @input="gachaResourcesCalculation">
            <span>个装置 + </span>
            <span> {{ produceOrundum.itemId4001 }}龙门币 = </span>
            <div class="image-sprite">
              <div class="bg-icon_4003"></div>
            </div>
            <span>{{ produceOrundum.outputByItem }}</span>
          </div>

          <div class="collapse-content-subheading">
            <span></span> 绿票商店第三层
          </div>

          <div class="resources-line">
            <span>现有绿票</span>
            <input v-model="certificateStoreF3.certificates" @input="gachaResourcesCalculation">
            <span>
              ，有{{ certificateStoreF3.disposableCertificate }}绿票可换
            </span>
            <div class="image-sprite">
              <div class="bg-icon_4003"></div>
            </div>
            <span>{{ certificateStoreF3.orundum }}</span>
          </div>
          <span class="tip">现有绿票数 - 第一层共需1490绿票 - 第二层共需10100绿票 = 可用于换玉的绿票数</span>
          <span class="tip">鉴于第二层有不少性价比较低的物品，建议囤够2w以上绿票再考虑绿票换玉</span>
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
          <div class="resources-line">
            <input v-model="potentialResources.paradox" @input="gachaResourcesCalculation">
            <span>个悖论模拟</span>
            <div class="image-sprite">
              <div class="bg-icon_4003"></div>
            </div>
            <span>{{ potentialResources.paradox * 200 }}</span>
          </div>
          <div class="resources-line">
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

          <el-checkbox-group v-model="selectedPermanentZoneName" style="margin: 4px" @change="gachaResourcesCalculation"
            size="small">
            <el-checkbox-button v-for="(potential, index) in potentialTable" :key="index" :value="index"
              v-show="potential.packType === 'main'" class="el-checkbox-button" :border="true">
              <div class="checkbox-button">
                <span
                  :class="potential.packName.length < 4 ? 'checkbox-button-zone-label-short' : 'checkbox-button-zone-label-long'">
                  {{ potential.packName }}
                </span>
                <div class="checkbox-button-gacha-resources">
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
            <el-checkbox-button v-for="(potential, index) in potentialTable" :border="true" :key="index" :value="index"
              v-show="potential.packType === 'activity'" class="el-checkbox-button">
              <div class="checkbox-button">
                <span class="checkbox-button-zone-label">{{ potential.packName }}</span>
                <div class="checkbox-button-gacha-resources">
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

          <span class="tip">标签内为每抽价格(元)，颜色用于区分性价比</span>
          <span class="tip">仅计入礼包内抽卡资源，紫色高于648，橙色高于大月卡</span>
          <span class="tip"><a href="/material/pack">点击跳转礼包完整性价比</a></span>
          <!--月常礼包-->
          <div class="collapse-content-subheading">
            <span></span> 月常礼包
          </div>
          <div class="switch-wrap">
            <el-switch v-model="rechargeOption.monthlyCardPurchasedThisMonth"
              @change="gachaResourcesCalculation"></el-switch>
            <span>本月月卡已购买(选中则扣除6源石)</span>
          </div>
          <span>额外购买</span>
          <el-input-number v-model="rechargeOption.additionalMonthlyCardPurchase" @input="gachaResourcesCalculation">
          </el-input-number>
          <span>张月卡（每张月卡可预支6石）</span>
          <el-checkbox-group v-model="selectedPackIndex" style="margin: 4px" @change="gachaResourcesCalculation">
            <el-checkbox-button v-for="(pack, index) in packListGroupByMonthly" :key="index" :value="pack.parentIndex"
              class="el-checkbox-button" v-show="rewardIsExpired(pack)">
              <div class="checkbox-button">
                <span class="draw-efficiency" :style="getPackPriorityColor(pack.drawEfficiency)">
                  {{ keepTheDecimalPoint(pack.drawPrice) }}
                </span>
                <span class="checkbox-button-pack-label">{{ pack.displayName }}</span>
                <div class="checkbox-button-pack-gacha-resources">
                  <!--源石-->
                  <div class="image-sprite" v-show="pack.originium > 0">
                    <div class="bg-icon_4002"></div>
                  </div>
                  <span v-show="pack.originium > 0">{{ pack.originium }}</span>
                  <!--合成玉-->
                  <div class="image-sprite" v-show="pack.orundum > 0">
                    <div class="bg-icon_4003"></div>
                  </div>
                  <span v-show="pack.orundum > 0">{{ pack.orundum }}</span>
                  <!--抽卡券-->
                  <div class="image-sprite" v-show="pack.gachaTicket > 0">
                    <div class="bg-icon_7003"></div>
                  </div>
                  <span v-show="pack.gachaTicket > 0">{{ pack.gachaTicket }}</span>
                  <!--十连券-->
                  <div class="image-sprite" v-show="pack.tenGachaTicket > 0">
                    <div class="bg-icon_7004"></div>
                  </div>
                  <span v-show="pack.tenGachaTicket > 0">{{ pack.tenGachaTicket }}</span>
                </div>
              </div>
            </el-checkbox-button>
          </el-checkbox-group>

          <!--限时礼包-->
          <div class="collapse-content-subheading">
            <span></span> 限时礼包
          </div>
          <el-checkbox-group v-model="selectedPackIndex" style="margin: 4px" @change="gachaResourcesCalculation">
            <el-checkbox-button v-for="(pack, index) in packListGroupByActivity" :key="index" :value="pack.parentIndex"
              class="el-checkbox-button">
              <div class="checkbox-button">
                <span class="draw-efficiency" :style="getPackPriorityColor(pack.drawEfficiency)">
                  {{ keepTheDecimalPoint(pack.drawPrice) }}
                </span>
                <span class="checkbox-button-pack-label">{{ pack.displayName }}</span>
                <div class="checkbox-button-pack-gacha-resources">
                  <!--源石-->
                  <div class="image-sprite" v-show="pack.originium > 0">
                    <div class="bg-icon_4002"></div>
                  </div>
                  <span v-show="pack.originium > 0">{{ pack.originium }}</span>
                  <!--合成玉-->
                  <div class="image-sprite" v-show="pack.orundum > 0">
                    <div class="bg-icon_4003"></div>
                  </div>
                  <span v-show="pack.orundum > 0">{{ pack.orundum }}</span>
                  <!--抽卡券-->
                  <div class="image-sprite" v-show="pack.gachaTicket > 0">
                    <div class="bg-icon_7003"></div>
                  </div>
                  <span v-show="pack.gachaTicket > 0">{{ pack.gachaTicket }}</span>
                  <!--十连券-->
                  <div class="image-sprite" v-show="pack.tenGachaTicket > 0">
                    <div class="bg-icon_7004"></div>
                  </div>
                  <span v-show="pack.tenGachaTicket > 0">{{ pack.tenGachaTicket }}</span>
                </div>
              </div>
            </el-checkbox-button>
          </el-checkbox-group>

          <!--新人礼包-->
          <div class="collapse-content-subheading">
            <span></span> 新人礼包
          </div>
          <el-checkbox-group v-model="selectedPackIndex" style="margin: 4px" @change="gachaResourcesCalculation">
            <el-checkbox-button v-for="(pack, index) in packListGroupByOnce" :key="index" :value="pack.parentIndex"
              class="el-checkbox-button">
              <div class="checkbox-button">
                <span class="draw-efficiency" :style="getPackPriorityColor(pack.drawEfficiency)">
                  {{ keepTheDecimalPoint(pack.drawPrice) }}
                </span>
                <span class="checkbox-button-pack-label">{{ pack.displayName }}</span>
                <div class="checkbox-button-pack-gacha-resources">
                  <!--源石-->
                  <div class="image-sprite" v-show="pack.originium > 0">
                    <div class="bg-icon_4002"></div>
                  </div>
                  <span v-show="pack.originium > 0">{{ pack.originium }}</span>
                  <!--合成玉-->
                  <div class="image-sprite" v-show="pack.orundum > 0">
                    <div class="bg-icon_4003"></div>
                  </div>
                  <span v-show="pack.orundum > 0">{{ pack.orundum }}</span>
                  <!--抽卡券-->
                  <div class="image-sprite" v-show="pack.gachaTicket > 0">
                    <div class="bg-icon_7003"></div>
                  </div>
                  <span v-show="pack.gachaTicket > 0">{{ pack.gachaTicket }}</span>
                  <!--十连券-->
                  <div class="image-sprite" v-show="pack.tenGachaTicket > 0">
                    <div class="bg-icon_7004"></div>
                  </div>
                  <span v-show="pack.tenGachaTicket > 0">{{ pack.tenGachaTicket }}</span>
                </div>
              </div>
            </el-checkbox-button>
          </el-checkbox-group>

          <!--首次充值源石-->
          <div class="collapse-content-subheading">
            <span></span> 首次充值源石
          </div>
          <el-checkbox-group v-model="selectedPackIndex" style="margin: 4px" @change="gachaResourcesCalculation">
            <el-checkbox-button v-for="(pack, index) in packListGroupByrOiginium" :key="index" :value="pack.parentIndex"
              class="el-checkbox-button">
              <div class="checkbox-button">
                <span class="draw-efficiency" :style="getPackPriorityColor(pack.drawEfficiency)">
                  {{ keepTheDecimalPoint(pack.drawPrice) }}
                </span>
                <span class="checkbox-button-pack-label">{{ pack.displayName }}</span>
                <div class="checkbox-button-pack-gacha-resources">
                  <!--源石-->
                  <div class="image-sprite" v-show="pack.originium > 0">
                    <div class="bg-icon_4002"></div>
                  </div>
                  <span v-show="pack.originium > 0">{{ pack.originium }}</span>
                  <!--合成玉-->
                  <div class="image-sprite" v-show="pack.orundum > 0">
                    <div class="bg-icon_4003"></div>
                  </div>
                  <span v-show="pack.orundum > 0">{{ pack.orundum }}</span>
                  <!--抽卡券-->
                  <div class="image-sprite" v-show="pack.gachaTicket > 0">
                    <div class="bg-icon_7003"></div>
                  </div>
                  <span v-show="pack.gachaTicket > 0">{{ pack.gachaTicket }}</span>
                  <!--十连券-->
                  <div class="image-sprite" v-show="pack.tenGachaTicket > 0">
                    <div class="bg-icon_7004"></div>
                  </div>
                  <span v-show="pack.tenGachaTicket > 0">{{ pack.tenGachaTicket }}</span>
                </div>
              </div>
            </el-checkbox-button>
          </el-checkbox-group>


          <div class="collapse-content-subheading">
            <span></span> 往年礼包
          </div>
          <el-checkbox-group v-model="selectedPackIndex" style="margin: 4px" @change="gachaResourcesCalculation">
            <el-checkbox-button v-for="(pack, index) in packListGroupByHistorical" :key="index" :value="pack.parentIndex"
              v-show="rewardIsExpired(pack)" class="el-checkbox-button">
              <div class="checkbox-button">
                <span class="draw-efficiency" :style="getPackPriorityColor(pack.drawEfficiency)">
                  {{ keepTheDecimalPoint(pack.drawPrice) }}
                </span>
                <span class="checkbox-button-pack-label">{{ pack.displayName }}</span>
                <div class="checkbox-button-pack-gacha-resources">
                  <!--源石-->
                  <div class="image-sprite" v-show="pack.originium > 0">
                    <div class="bg-icon_4002"></div>
                  </div>
                  <span v-show="pack.originium > 0">{{ pack.originium }}</span>
                  <!--合成玉-->
                  <div class="image-sprite" v-show="pack.orundum > 0">
                    <div class="bg-icon_4003"></div>
                  </div>
                  <span v-show="pack.orundum > 0">{{ pack.orundum }}</span>
                  <!--抽卡券-->
                  <div class="image-sprite" v-show="pack.gachaTicket > 0">
                    <div class="bg-icon_7003"></div>
                  </div>
                  <span v-show="pack.gachaTicket > 0">{{ pack.gachaTicket }}</span>
                  <!--十连券-->
                  <div class="image-sprite" v-show="pack.tenGachaTicket > 0">
                    <div class="bg-icon_7004"></div>
                  </div>
                  <span v-show="pack.tenGachaTicket > 0">{{ pack.tenGachaTicket }}</span>
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
            <el-checkbox-button v-for="(activity, name) in activitySchedules" :key="name" :value="name"
              v-show="activity.module === 'actRe' && rewardIsExpired(activity)" class="el-checkbox-button">
              <div class="checkbox-button">
                <span class="checkbox-button-pack-label">{{ activity.name }}</span>
                <div class="checkbox-button-pack-gacha-resources">
                  <!--源石-->
                  <div class="image-sprite" v-show="activity.originium > 0">
                    <div class="bg-icon_4002"></div>
                  </div>
                  <span v-show="activity.originium > 0">{{ activity.originium }}</span>
                  <!--合成玉-->
                  <div class="image-sprite" v-show="activity.orundum > 0">
                    <div class="bg-icon_4003"></div>
                  </div>
                  <span v-show="activity.orundum > 0">{{ activity.orundum }}</span>
                  <!--抽卡券-->
                  <div class="image-sprite" v-show="activity.gachaTicket > 0">
                    <div class="bg-icon_7003"></div>
                  </div>
                  <span v-show="activity.gachaTicket > 0">{{ activity.gachaTicket }}</span>
                  <!--十连券-->
                  <div class="image-sprite" v-show="activity.tenGachaTicket > 0">
                    <div class="bg-icon_7004"></div>
                  </div>
                  <span v-show="activity.tenGachaTicket > 0">{{ activity.tenGachaTicket }}</span>
                </div>
              </div>
            </el-checkbox-button>
          </el-checkbox-group>

          <!-- 未来活动 -->
          <div class="collapse-content-subheading">
            <span></span> 未来活动
          </div>
          <div class="resources-line" v-for="(activity, name) in activitySchedules" :key="name"
            v-show="activity.module === 'act' && rewardIsExpired(activity)">
            <span class="resources-line-label">{{ activity.name }}</span>
            <div class="resources-line-content">
              <div class="image-sprite" v-show="activity.originium > 0">
                <div class="bg-icon_4002"></div>
              </div>
              <span v-show="activity.originium > 0">{{ activity.originium }}</span>
              <div class="image-sprite" v-show="activity.orundum > 0">
                <div class="bg-icon_4003"></div>
              </div>
              <span v-show="activity.orundum > 0">{{ activity.orundum }}</span>
              <div class="image-sprite" v-show="activity.gachaTicket > 0">
                <div class="bg-icon_7003"></div>
              </div>
              <span v-show="activity.gachaTicket > 0">{{ activity.gachaTicket }}</span>
              <div class="image-sprite" v-show="activity.tenGachaTicket > 0">
                <div class="bg-icon_7004"></div>
              </div>
              <span v-show="activity.tenGachaTicket > 0">{{ activity.tenGachaTicket }}</span>
            </div>
          </div>
        </el-collapse-item>

        <el-collapse-item name="other" class="collapse-item">
          <template #title>
            <div class="collapse-title-icon" style="background: rgba(119,118,255,0.8)"></div>
            <span class="collapse-title-font">
              其他资源（估算）&emsp;{{ keepTheDecimalPoint(calculationResult.otherTotalDraw, 0) }}抽
            </span>
          </template>

          <div class="resources-line" v-for="(honeyCake, label) in honeyCakeTable" :key="label"
            v-show="rewardIsExpired(honeyCake)">
            <span class="resources-line-label" style="width: 240px">{{ honeyCake.name }}</span>
            <div class="resources-line-content">
              <div class="image-sprite" v-show="honeyCake.originium > 0">
                <div class="bg-icon_4002"></div>
              </div>
              <span v-show="honeyCake.originium > 0">{{ honeyCake.originium }}</span>
              <div class="image-sprite" v-show="honeyCake.orundum > 0">
                <div class="bg-icon_4003"></div>
              </div>
              <span v-show="honeyCake.orundum > 0">{{ honeyCake.orundum }}</span>
              <div class="image-sprite" v-show="honeyCake.gachaTicket > 0">
                <div class="bg-icon_7003"></div>
              </div>
              <span v-show="honeyCake.gachaTicket > 0">{{ honeyCake.gachaTicket }}</span>
              <div class="image-sprite" v-show="honeyCake.tenGachaTicket > 0">
                <div class="bg-icon_7004"></div>
              </div>
              <span v-show="honeyCake.tenGachaTicket > 0">{{ honeyCake.tenGachaTicket }}</span>
            </div>
          </div>
        </el-collapse-item>
      </el-collapse>
    </div>
  </div>

</template>


<style scoped></style>