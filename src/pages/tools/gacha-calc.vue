<!--修改活动日期按钮请在变量"scheduleOptions"中修改，修改活动排期请在变量"HONEY_CAKE_TABLE"所引入的json文件中修改-->
<script setup>
import { watch, onMounted, ref } from "vue";
import "/src/assets/css/tool/gacha_calc.scss";
import "/src/assets/css/sprite/sprite_plane_icon.css";
import "/src/assets/css/tool/gacha_calc.phone.scss";

import POTENTIAL_TABLE from "/src/static/json/tools/potential_gacha_resources.json";
import HONEY_CAKE_TABLE from "/src/static/json/tools/schedule_by_honeycake.json";
import FIXED_TABLE from "/src/static/json/tools/schedule_fixed.json";
import probabilityTableData from "/src/static/json/tools/limited_probability_table.json";
import { createMessage } from "/src/utils/message.js";

import PackButtonContent from "/src/components/tools/PackButtonContent.vue";
import ActivityGachaResources from "/src/components/tools/ActivityGachaResources.vue";
import deepClone from "/src/utils/deepClone.js";
import { dateDiff, dateFormat } from "/src/utils/dateUtil.js";
import packInfoCache from "/src/plugins/indexedDB/packInfoCache.js";
import { stringToNumber } from "/src/utils/stringUtils.js";
import { numberFloor } from "/src/utils/format.js";
import { useRoute } from "vue-router";

// 当前路由
const route = useRoute();

//源石充值
const OriginiumTable = ref([
  {
    packName: "6元源石",
    price: 6.0,
    originium: 1,
    quantity: 0,
  },
  {
    packName: "30元源石",
    price: 30.0,
    originium: 7,
    quantity: 0,
  },
  {
    packName: "98元源石",
    price: 98.0,
    originium: 24,
    quantity: 0,
  },
  {
    packName: "198元源石",
    price: 198.0,
    originium: 50,
    quantity: 0,
  },
  {
    packName: "328元源石",
    price: 328.0,
    originium: 90,
    quantity: 0,
  },
  {
    packName: "648元源石",
    price: 648.0,
    originium: 185,
    quantity: 0,
  },
]);

// 罗德岛蜜饼工坊预测的其他奖励排期
let otherRewardBySchedules = ref([]);

// 罗德岛蜜饼工坊预测的活动排期
let activityScheduleList = ref({});

//当前时间戳（可自定义用于模拟未来时间）
const currentTimestamp = ref(new Date().getTime());

//当前日期（用于日期选择器绑定）
const currentDate = ref(new Date());

//选中的黄票兑换抽卡券
let selectedCertificatePack = ref([]);

//选中的潜在章节
let selectedPermanentZoneName = ref([]);

//选中的活动名称
let selectedActivityName = ref([]);

//选择的礼包索引
let selectedPackIndex = ref([]);

//选择的历史礼包索引
let selectedHistoryPackIndex = ref([]);

//活动排期临时集合，用于将两个json文件内的排期合并排序
let tempActivityScheduleList = [];

//将预测活动排期分类
for (const name in FIXED_TABLE) {
  let activityData = FIXED_TABLE[name];
  //将活动排期的日期统一转为时间戳
  activityData.start = new Date(activityData.start).getTime();
  activityData.end = new Date(activityData.end).getTime();
  activityData.name = name;
  //分为其他和活动两组数据
  if (activityData.rewardModule === "otherResources") {
    otherRewardBySchedules.value.push(activityData);
  } else {
    //先将活动排期写入临时集合
    activityData.name = name;
    tempActivityScheduleList.push(activityData);
    // activitySchedule.value[name] = activityData
    if (activityData.defaultStatus) {
      selectedActivityName.value.push(activityData.name);
    }
  }
}

for (const name in HONEY_CAKE_TABLE) {
  let activityData = HONEY_CAKE_TABLE[name];
  //将活动排期的日期统一转为时间戳
  activityData.start = new Date(activityData.start).getTime();
  activityData.end = new Date(activityData.end).getTime();
  activityData.name = name;
  //分为其他和活动两组数据
  if (activityData.rewardModule === "otherResources") {
    otherRewardBySchedules.value.push(activityData);
  } else {
    //先将活动排期写入临时集合
    activityData.name = name;
    tempActivityScheduleList.push(activityData);
    // activitySchedule.value[name] = activityData
    if (activityData.defaultStatus) {
      selectedActivityName.value.push(activityData.name);
    }
  }
}

//将活动排期先排序一下
tempActivityScheduleList.sort((a, b) => a.start - b.start);

//再将这个集合转为一个对象
for (const item of tempActivityScheduleList) {
  activityScheduleList.value[item.name] = item;
}

/**
 * 批量生成服务器维护奖励列表，以5天为一个时间段生成，每个时间段有200合成玉
 */
function batchGenerationServerMaintenanceRewards() {
  // 使用全局时间戳，支持用户自定义时间
  const date = new Date(currentTimestamp.value);
  let month = date.getMonth() + 1;
  let year = date.getFullYear();

  // 清空之前的维护奖励数据
  otherRewardBySchedules.value = otherRewardBySchedules.value.filter((item) => !item.name.includes("游戏维护"));

  for (let m = 0; m < 12; m++) {
    let currentDay = 1;
    if (m === 0) {
      currentDay = date.getDate();
    }

    for (let d = currentDay; d < 29; d += 5) {
      let reward = {
        name: `游戏维护(${month}月)`,
        originium: 0,
        orundum: 200,
        gachaTicket: 0,
        tenGachaTicket: 0,
        start: new Date(`${year}/${_padZero(month, 2)}/${_padZero(d, 2)} 00:00:00`).getTime(),
        end: new Date(`${year}/${_padZero(month, 2)}/${_padZero(d, 2)} 23:00:00`).getTime(),
        rewardType: "公共",
        rewardModule: "otherResources",
        probability: "",
      };
      otherRewardBySchedules.value.push(reward);
    }

    month++;
    if (month > 12) {
      month = 1;
      year++;
    }
  }

  /**
   * 传入一个数字和长度进行补零
   * @param num 数字
   * @param size 长度
   * @returns {string} 返回补零后的字符
   * @private
   */
  function _padZero(num, size) {
    let s = num.toString();
    while (s.length < size) {
      s = "0" + s;
    }
    return s;
  }
}

batchGenerationServerMaintenanceRewards();

//用户选择的活动
let currentScheduleName = ref("Ave Mujica联动");

//用户选择的活动的结束时间
let endDate = ref(new Date(1711008000000));

//用户选择的活动
let currentSchedule = ref({
  name: "Ave Mujica联动",
  dateString: "(0904-0917)",
  start: new Date("2025/09/04 16:00:00"),
  end: new Date("2025/09/18 04:01:00"),
  activityType: "联动限定",
  disabled: false,
  dailyGiftResources: true,
  accuracyFlag: true,
});

//用户选择的活动的类型
let activityType = ref("联动限定");

//可活动列表，包含活动的名称，开启和结束时间
// name: string 活动名称
// start: Date 起始时间
// end: Date 结束时间
// disabled: boolean 是否禁用选项
// accuracyFlag: boolean 是否是准确排期
// activityType: string 活动类型
// dailyGiftResources: boolean 活动是否每日赠送抽卡资源
// 注：历史礼包时间范围已改为动态计算，不再需要 historicalPackTimeRange 配置
const scheduleOptions = [
  {
    name: "周年庆典",
    dateString: "(0501-0515)",
    start: new Date("2026/05/01 12:00:00"),
    end: new Date("2026/05/15 04:01:00"),
    activityType: "周年限定",
    disabled: false,
    dailyGiftResources: true,
    accuracyFlag: true,
  },
  {
    name: "夏活",
    dateString: "待定",
    start: new Date("2026/08/01 12:00:00"),
    end: new Date("2026/08/15 04:01:00"),
    activityType: "夏活限定",
    disabled: true,
    dailyGiftResources: true,
    accuracyFlag: true,
  },
  {
    name: "感谢庆典",
    dateString: "敬请期待",
    start: new Date("2026/08/01 12:00:00"),
    end: new Date("2026/08/15 04:01:00"),
    activityType: "周年限定",
    disabled: true,
    dailyGiftResources: true,
    accuracyFlag: true,
  },
];

//新人礼包集合
let listNewBiePackInfo = ref([]);

//每年重置的首充源石
let listOriginiumPack = ref([]);

//上一年年重置的首充源石
let listLastYearOriginiumPack = ref([]);

//每月重置的礼包集合
let listMonthlyPackInfo = ref([]);

//限时礼包集合
let listActivityPackInfo = ref([]);

//历史礼包集合
let packListGroupByHistory = ref([]);

//全部礼包集合
let listDisplayPackInfo = ref([]);

//每月黄票兑换抽卡券(视为礼包)集合
let certificatePackList = ref([]);

//礼包缓存数据
let listPackInfoCache = ref([]);

/**
 * 获取和分类礼包数据
 */
async function getAndSortPackData() {
  //礼包唯一索引
  let index = 0;

  // 清空之前的数据，避免重复
  listPackInfoCache.value = [];
  listNewBiePackInfo.value = [];
  listOriginiumPack.value = [];
  listLastYearOriginiumPack.value = [];
  listMonthlyPackInfo.value = [];
  listActivityPackInfo.value = [];
  listDisplayPackInfo.value = [];
  certificatePackList.value = []; // 清空黄票兑换列表

  // 使用全局时间戳，支持用户自定义时间
  // const currentTimeStamp = new Date().getTime()

  // 等待获取接口返回的全部礼包信息
  const data = await packInfoCache.listPackInfo();
  //先计算礼包的性价比
  for (const item of data) {
    const officialName = item.officialName;
    if ("每月寻访组合包" === officialName) {
      continue;
    }
    let packInfoVO = _packPromotionRatioCalc(item);

    // 所有礼包都加入缓存，包括过期的礼包（供 getHistoryPackInfo 筛选往年礼包使用）
    listPackInfoCache.value.push(packInfoVO);

    if (packInfoVO.drawPrice === 0) {
      continue;
    }

    // 只有未过期的礼包才进入后续分类和显示逻辑
    if (packInfoVO.end < currentTimestamp.value) {
      continue;
    }

    //给每个礼包都绑定一个索引
    packInfoVO.parentIndex = index;
    //将礼包写入全部礼包集合
    listDisplayPackInfo.value.push(packInfoVO);
    //礼包索引递增
    index++;

    //根据礼包类型进行分类
    if (packInfoVO.saleType === "newbie") {
      listNewBiePackInfo.value.push(packInfoVO);
    }

    if (packInfoVO.saleType === "originium2") {
      listOriginiumPack.value.push(packInfoVO);
      let packClone = deepClone(packInfoVO);
      packClone.parentIndex = index;
      //将礼包写入全部礼包集合
      listDisplayPackInfo.value.push(packInfoVO);
      //礼包索引递增
      index++;

      listLastYearOriginiumPack.value.push(packClone);
    }

    if (packInfoVO.saleType === "monthly") {
      listMonthlyPackInfo.value.push(packInfoVO);
    }

    if (packInfoVO.saleType === "activity") {
      listActivityPackInfo.value.push(packInfoVO);
    }
  }

  /**
   * 根据传入的礼包算出性价比
   * @param packInfoVO 礼包基本信息
   * @returns {*}  礼包各种性价比
   * @private
   */
  function _packPromotionRatioCalc(packInfoVO) {
    // 抽卡性价比基准
    const eachOriginalDrawPrice = 648.0 / 185 / 0.3;
    let draws = 0.0; // 抽数
    let drawPrice = 0.0; // 每一抽价格
    let drawEfficiency = 0.0; // 仅抽卡性价比
    // 直接计算抽数
    draws = (packInfoVO.orundum || 0) / 600 + (packInfoVO.originium || 0) * 0.3 + (packInfoVO.gachaTicket || 0) + (packInfoVO.tenGachaTicket || 0) * 10;

    // 抽卡性价比计算
    drawPrice = draws > 0 ? packInfoVO.price / draws : 0;
    drawEfficiency = drawPrice > 0 ? eachOriginalDrawPrice / drawPrice : 0;

    // 设置返回值
    packInfoVO.draws = draws;
    packInfoVO.drawPrice = drawPrice;
    packInfoVO.drawEfficiency = drawEfficiency;

    return packInfoVO;
  }

  getHistoryPackInfo();
  batchGenerationMonthlyPack(index);
}

function getHistoryPackInfo() {
  const scheduleStart = currentSchedule.value.start;
  const scheduleEnd = currentSchedule.value.end;

  // 动态计算历史礼包时间范围：从当前时刻（或设定的时刻）到卡池结束日期，向前推一年
  const oneYearInMs = 365 * 24 * 60 * 60 * 1000;
  const historicalPackStart = currentTimestamp.value - oneYearInMs; // 当前时刻向前推一年
  const historicalPackEnd = scheduleEnd.getTime() - oneYearInMs; // 卡池结束日期向前推一年

  let list = [];

  console.log("=== 往年礼包筛选（动态时间范围）===");
  console.log("当前活动:", currentSchedule.value.name);
  console.log("当前时刻:", new Date(currentTimestamp.value));
  console.log("卡池结束:", new Date(scheduleEnd));
  console.log("历史礼包时间范围（去年同期）:", new Date(historicalPackStart), "到", new Date(historicalPackEnd));
  console.log("缓存中的礼包总数:", listPackInfoCache.value.length);

  for (let pack of listPackInfoCache.value) {
    const { officialName, drawEfficiency, start, end, saleType } = pack;

    if ("activity" !== saleType || drawEfficiency < 0.1) {
      continue;
    }

    // 打印符合基本条件的礼包信息
    // console.log('检查礼包:', officialName, '售卖时间:', new Date(start), '到', new Date(end), 'saleType:', saleType, 'drawEfficiency:', drawEfficiency)

    // 判断礼包售卖时间与历史时间范围是否有重叠
    // 重叠条件：礼包开始时间 < 历史范围结束时间 AND 礼包结束时间 > 历史范围开始时间
    if (start < historicalPackEnd && end > historicalPackStart) {
      let item = JSON.parse(JSON.stringify(pack));
      item.start = scheduleStart.getTime();
      item.end = scheduleEnd.getTime();
      list.push(item);
      // console.log('✅ 加入往年礼包:', officialName, '原售卖时间:', new Date(start), '到', new Date(end))
    }
  }

  // console.log('最终筛选出的往年礼包数量:', list.length)
  packListGroupByHistory.value = list;
}

/**
 * 批量生成月常礼包
 * @param index 礼包唯一索引
 */
function batchGenerationMonthlyPack(index) {
  // 使用全局时间戳，支持用户自定义时间
  const date = new Date(currentTimestamp.value);
  //获取当前月份
  let month = date.getMonth() + 1;
  //获取当前年份
  let year = date.getFullYear();

  // 预生成8个月的每月寻访组合包和每月黄票兑换单抽
  for (let i = 0; i < 8; i++) {
    //获取每月的最后一天，用于写入礼包的起始日期（每月1号）和结束日期（每月最后一天）
    const lastDay = new Date(year, month, 0).getDate().toString().padStart(2, "");
    const pack = {
      officialName: `${month}月寻访组合包`,
      gachaTicket: 0,
      tenGachaTicket: 1,
      originium: 42,
      orundum: 0,
      price: 168,
      parentIndex: index,
      drawPrice: 7.43362831858407,
      drawEfficiency: 1.570656370656371,
      start: new Date(`${year}/${month.toString().padStart(2, "0")}/01 00:00:00`),
      end: new Date(`${year}/${month.toString().padStart(2, "0")}/${lastDay} 23:59:59`),
    };

    const certificatePack = {
      officialName: `${month}月黄票兑换单抽`,
      gachaTicket: 8,
      tenGachaTicket: 3,
      originium: 0,
      orundum: 0,
      start: new Date(`${year}/${month.toString().padStart(2, "0")}/01 00:00:00`),
      end: new Date(`${year}/${month.toString().padStart(2, "0")}/${lastDay} 23:59:59`),
    };

    //写入预生成的每月黄票兑换单抽
    certificatePackList.value.push(certificatePack);

    //写入每月寻访组合包
    listMonthlyPackInfo.value.push(pack);

    //写入全部礼包
    listDisplayPackInfo.value.push(pack);

    //月份大于12，年数加1
    if (month >= 12) {
      month = 1;
      year++;
    } else {
      month++;
    }
    //礼包索引递增
    index++;
  }
}

/**
 * 用户点击单选框选择排期
 * @param index 选择的活动索引
 */
function updateScheduleOption(index) {
  const schedule = scheduleOptions[index];
  currentScheduleName.value = schedule.name;
  currentSchedule.value = schedule;
  endDate.value = schedule.end;
  activityType.value = schedule.activityType;
  gachaResourcesCalculation();
  getHistoryPackInfo();
}

//折叠面板绑定的集合，如果集合中有折叠面板的name，面板会默认展开，当点击展开面板时，面板组件也会将面板组件的name赋值给这个集合
// 值有 'exist', 'custom', 'daily', 'potential','recharge', 'activity', 'other'
let resultCollapseActiveNames = ref(["calculationResult", "developer"]);
let optionsCollapseActiveNames = ref(["exist", "daily", "activity", "other"]);

//库存资源
let existResources = ref({
  originium: 0,
  orundum: 0,
  gachaTicket: 0,
  tenGachaTicket: 0,
  correctOrundum: 0, //用于修正的合成玉数量
  skinBudget: 0, //要购买多少皮肤
  skinBudgetPlus: 0, // 要购买多少高级皮肤
  skinBudgetPro: 0, // 要购买多少顶级皮肤
});

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
});

//潜在资源
let potentialResources = ref({
  //悖论模拟数量
  paradox: 0,
  //剿灭模拟数量
  annihilation: 0,
});

//搓玉
let produceOrundum = ref({
  // 理智
  ap: 0,
  //1理智可转化合成玉倍率
  coEfficient: 1.09,
  //理智产出合成玉的数量
  outputByAp: 0,
  itemId30012: 0,
  itemId30062: 0,
  itemId4001: 0,
  //材料产出合成玉数量
  outputByItem: 0,
});

const updateApWithoutPass = () => {
  produceOrundum.value.ap = dailyReward.value.daily * 240;
  gachaResourcesCalculation();
};

const updateApWithPass = () => {
  produceOrundum.value.ap = dailyReward.value.daily * 320;
  gachaResourcesCalculation();
};

const updateCoEfficient = (value) => {
  produceOrundum.value.coEfficient = value;
  gachaResourcesCalculation();
};

const coEfficientList = [
  {
    stage: "1-7",
    coEfficient: 1.09,
  },
  {
    stage: "活动关",
    coEfficient: 0.7,
  },
  {
    stage: "活动关",
    coEfficient: 0.56,
  },
  {
    stage: "活动关",
    coEfficient: 0.35,
  },
];

//黄票商店换不完
let selectedCertificateT2Group = ref([]);
const certificateT2Group = [
  {
    text: "10黄票",
    draw: 1,
  },
  {
    text: "18黄票",
    draw: 2,
  },
  {
    text: "40黄票",
    draw: 5,
  },
  {
    text: "70黄票",
    draw: 10,
  },
  {
    text: "120黄票",
    draw: 20,
  },
];

//绿票商店三层
let certificateStoreF3 = ref({
  //绿票凭证
  certificates: 0,
  //剩余绿票凭证
  remainingCertificates: 0,
  //可兑换合成玉
  orundum: 0,
});

//是否改用卡池开放当天的数据进行计算
let calPoolEnd = ref(true);

//判断源石是否用于抽卡
let originiumIsUsed = ref(true);

//饼图的数据
let pieChartData = ref([
  { value: 22, name: "现有" },
  { value: 33, name: "潜在" },
  { value: 44, name: "日常" },
  { value: 22, name: "氪金" },
  { value: 33, name: "活动" },
  { value: 44, name: "其它" },
]);

//氪金选项
let rechargeOption = ref({
  monthlyCardPurchasedThisMonth: false,
  additionalMonthlyCardPurchase: 0,
});

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
});

let singleResourceDraws = ref({
  originium: 0,
  //合成玉
  orundum: 0,
  //抽卡券
  gachaTicket: 0,
  //十连券
  tenGachaTicket: 0,
});

let logs = [];

let officialMonthlyCardReward = ref(0);
const officialMonthlyCardEndDate = new Date("2025/05/27 03:58:00");
let officialMonthlyCardRemainingDays = ref(0);

/**
 * 计算抽卡资源
 */
function gachaResourcesCalculation() {
  logs = [];

  if (calPoolEnd.value) {
    endDate.value = currentSchedule.value.end;
  } else {
    const startTimeStamp = currentSchedule.value.start.getTime();
    
    endDate.value = new Date(startTimeStamp+12*60*60*1000);
  }

  //饼图数据暂存区
  let pieChartDataTmp = [];

  calculationResult.value.orundum = 0;
  calculationResult.value.originium = 0;
  calculationResult.value.gachaTicket = 0;
  calculationResult.value.tenGachaTicket = 0;

  dailyRewardCalculate();
  existCalculate();
  produceOrundumCalculate();
  potentialResourcesCalculation();
  honeyCakeCalculate();
  packCalculate();
  activityCalculate();

  /**
   * 计算从当前到活动结束时间的日常奖励
   * @returns {{}}
   */
  function dailyRewardCalculate() {
    //共计有多少个星期一
    let mondayCount = 0;
    //共计有多少天
    let days = 0;
    //多少次签到
    let checkInTimes = 0;
    //可以在绿票商店购买几个月的前两层抽卡道具
    let shoppingTimes = 0;
    //使用全局时间戳，支持用户自定义时间
    let startDate = new Date(currentTimestamp.value);

    //如果今天不是周一，星期一总数加1，因为有可能不在周一打剿
    if (startDate.getDay() !== 1) {
      mondayCount++;
    }

    //如果今天不是1号，商店购买次数加1，因为有可能1号买不完商店
    if (startDate.getDate() !== 1) {
      shoppingTimes++;
    }

    // //如果结束日期是1号，商店购买次数加1，因为下面计算时可能越过1号
    // if (endDate.value.getDate() === 1) {
    //   shoppingTimes++
    // }

    //循环计算当前时间到活动结束时间
    while (startDate <= endDate.value) {
      //如果是星期一，星期一总数加1
      if (startDate.getDay() === 1) {
        mondayCount++;
      }
      //如果是21号，签到次数加1
      if (startDate.getDate() === 17) {
        checkInTimes++;
      }
      //如果是1号，商店购买次数加1
      if (startDate.getDate() === 1) {
        shoppingTimes++;
      }
      //天数加1
      days++;
      //将当前日期加1天
      startDate.setDate(startDate.getDate() + 1);
    }

    //总周数
    let weeks = mondayCount;

    //打剿次数
    let annihilationTimes = mondayCount;

    //如果本周周常已经做完则周数减1
    if (dailyReward.value.weeklyTaskCompleted) {
      weeks = mondayCount > 0 ? mondayCount - 1 : mondayCount;
    }

    //如果本周已经打剿了则打剿次数减1
    if (dailyReward.value.annihilationCompleted) {
      annihilationTimes = mondayCount > 0 ? mondayCount - 1 : mondayCount;
    }

    //如果本月已清空绿票商店则购买商店次数减1
    if (dailyReward.value.certificateStoreCompleted) {
      shoppingTimes = shoppingTimes > 0 ? shoppingTimes - 1 : shoppingTimes;
    }

    //对日常资源计算结果对象进行赋值
    dailyReward.value.daily = days;
    dailyReward.value.dailyOrundumReward = days * 100;
    dailyReward.value.weekly = weeks;
    dailyReward.value.weeklyOrundumReward = weeks * 500;
    dailyReward.value.checkIn = checkInTimes;
    dailyReward.value.checkInGachaTicket = checkInTimes;
    dailyReward.value.certificateShoppingTimes = shoppingTimes;
    dailyReward.value.purchasedOrundumQuantity = shoppingTimes * 600;
    dailyReward.value.purchasedGachaTicketQuantity = shoppingTimes * 4;
    dailyReward.value.annihilation = annihilationTimes;
    dailyReward.value.annihilationOrundumReward = annihilationTimes * 1800;

    let orundum = days * 100 + weeks * 500 + shoppingTimes * 600 + annihilationTimes * 1800;
    let originium = 0;
    let gachaTicket = checkInTimes + shoppingTimes * 4;
    let tenGachaTicket = 0;

    //计算用户选择兑换几次黄票商店的38抽
    // for (const i of selectedCertificatePack.value) {
    //   const item = certificatePackList.value[i]
    //   if (!rewardIsExpired(item)) {
    //     continue
    //   }
    //   gachaTicket += item.gachaTicket
    //   tenGachaTicket += item.tenGachaTicket
    // }

    // 计算官方月卡
    if (endDate.value < officialMonthlyCardEndDate) {
      officialMonthlyCardRemainingDays.value = dateDiff(new Date(), endDate.value);
    } else {
      officialMonthlyCardRemainingDays.value = dateDiff(new Date(), officialMonthlyCardEndDate);
    }

    officialMonthlyCardReward.value = officialMonthlyCardRemainingDays.value * 200;
    orundum += officialMonthlyCardReward.value;

    //判断源石是否用于抽卡
    if (!originiumIsUsed.value) {
      originium = 0;
    }

    calculationResult.value.orundum += orundum;
    calculationResult.value.originium += originium;
    calculationResult.value.gachaTicket += gachaTicket;
    calculationResult.value.tenGachaTicket += tenGachaTicket;

    //计算日常总抽数
    calculationResult.value.dailyTotalDraw = orundum / 600 + gachaTicket + tenGachaTicket * 10;

    logs.push({ key: "日常-合成玉", value: orundum });
    logs.push({ key: "日常-源石", value: originium });
    logs.push({ key: "日常-单抽", value: gachaTicket });
    logs.push({ key: "日常-十连", value: tenGachaTicket });

    //向饼图数据中写入日常的抽卡次数
    if (calculationResult.value.dailyTotalDraw > 0) {
      pieChartDataTmp.push({ value: Math.floor(calculationResult.value.dailyTotalDraw), name: "日常" });
    }
  }

  /**
   * 计算用户库存抽卡次数
   */
  function existCalculate() {
    let orundum = stringToNumber(existResources.value.orundum);
    let originium = stringToNumber(existResources.value.originium);
    const gachaTicket = stringToNumber(existResources.value.gachaTicket);
    const tenGachaTicket = stringToNumber(existResources.value.tenGachaTicket);

    //计算用户自定义修正的合成玉
    orundum += stringToNumber(existResources.value.correctOrundum.toString());
    //计算用户预留给皮肤的源石
    originium -= stringToNumber(existResources.value.skinBudget.toString()) * 18;
    //计算用户预留给高级皮肤的源石
    originium -= stringToNumber(existResources.value.skinBudgetPlus.toString()) * 21;
    //计算用户预留给顶级皮肤的源石
    originium -= stringToNumber(existResources.value.skinBudgetPro.toString()) * 24;

    if (!originiumIsUsed.value) {
      originium = 0;
    }

    calculationResult.value.orundum += orundum;
    calculationResult.value.originium += originium;
    calculationResult.value.gachaTicket += gachaTicket;
    calculationResult.value.tenGachaTicket += tenGachaTicket;

    calculationResult.value.existTotalDraw = orundum / 600 + originium * 0.3 + gachaTicket + tenGachaTicket * 10;

    logs.push({ key: "库存-合成玉", value: orundum });
    logs.push({ key: "库存-源石", value: originium });
    logs.push({ key: "库存-单抽", value: gachaTicket });
    logs.push({ key: "库存-十连", value: tenGachaTicket });

    if (calculationResult.value.existTotalDraw > 0) {
      pieChartDataTmp.push({ value: Math.floor(calculationResult.value.existTotalDraw), name: "库存" });
    }
  }

  function produceOrundumCalculate() {
    let gachaTicket = 0;
    let tenGachaTicket = 0;

    for (const i of selectedCertificateT2Group.value) {
      gachaTicket += i.draw;
    }

    //计算用户选择兑换几次黄票商店的38抽
    for (const i of selectedCertificatePack.value) {
      const item = certificatePackList.value[i];
      if (!rewardIsExpired(item)) {
        continue;
      }
      gachaTicket += item.gachaTicket;
      tenGachaTicket += item.tenGachaTicket;
    }

    //计算用理智产出的合成玉数量
    if (produceOrundum.value.ap && produceOrundum.value.coEfficient) {
      produceOrundum.value.outputByAp = Math.ceil(stringToNumber(produceOrundum.value.ap) * stringToNumber(produceOrundum.value.coEfficient));
    }
    //计算用材料产出的合成玉数量
    produceOrundum.value.outputByItem = Math.ceil(stringToNumber(produceOrundum.value.itemId30012) * 5 + stringToNumber(produceOrundum.value.itemId30062) * 10);
    //计算用材料产出合成玉时的龙门币消耗
    produceOrundum.value.itemId4001 = stringToNumber(produceOrundum.value.itemId30012) * 800 + stringToNumber(produceOrundum.value.itemId30062) * 1000;
    //可用于兑换商店第三层的凭证数量
    let certificates = stringToNumber(certificateStoreF3.value.certificates);
    //如果凭证数量大于11590(搬空前两层的凭证消耗量),曾可以兑换合成玉
    if (certificates > 11590) {
      //扣除11590凭证之后剩余的凭证数量
      certificateStoreF3.value.remainingCertificates = certificates - 11590;
      //可兑换多少合成玉
      certificateStoreF3.value.orundum = Math.floor((certificateStoreF3.value.remainingCertificates / 50) * 30);
    } else {
      certificateStoreF3.value.remainingCertificates = 0;
      certificateStoreF3.value.orundum = 0;
    }
    //计算两种方式可以产出多少合成玉
    const orundum = produceOrundum.value.outputByAp + produceOrundum.value.outputByItem + certificateStoreF3.value.orundum;

    calculationResult.value.orundum += orundum;
    calculationResult.value.gachaTicket += gachaTicket;
    calculationResult.value.tenGachaTicket += tenGachaTicket;

    calculationResult.value.produceOrundumTotalDraw = orundum / 600 + gachaTicket + tenGachaTicket * 10;

    if (calculationResult.value.produceOrundumTotalDraw > 0) {
      pieChartDataTmp.push({ value: Math.floor(calculationResult.value.produceOrundumTotalDraw), name: "搓玉" });
    }
  }

  /**
   * 计算潜在抽卡资源
   */
  function potentialResourcesCalculation() {
    let orundum = 0;
    let originium = 0;
    //计算悖论模拟的合成玉
    orundum += potentialResources.value.paradox * 200;
    //计算剿灭模拟的合成玉
    orundum += potentialResources.value.annihilation * 1500;

    //计算选中的常驻章节或活动的资源
    if (selectedPermanentZoneName.value) {
      //循环选中的章节按钮的索引，获得对应的章节奖励
      for (const index of selectedPermanentZoneName.value) {
        const potential = POTENTIAL_TABLE[index];
        originium += parseInt(potential.gachaOriginium);
        orundum += parseInt(potential.gachaOrundum);
      }
    }

    if (!originiumIsUsed.value) {
      originium = 0;
    }

    calculationResult.value.orundum += orundum;
    calculationResult.value.originium += originium;

    calculationResult.value.potentialTotalDraw = orundum / 600 + originium * 0.3;

    logs.push({ key: "潜在-合成玉", value: orundum });
    logs.push({ key: "潜在-源石", value: originium });

    if (calculationResult.value.potentialTotalDraw > 0) {
      pieChartDataTmp.push({ value: Math.floor(calculationResult.value.potentialTotalDraw), name: "潜在" });
    }
  }

  /**
   * 计算用户选择的礼包总计多少抽
   */
  function packCalculate() {
    let orundum = 0;
    let originium = 0;
    let gachaTicket = 0;
    let tenGachaTicket = 0;
    let totalAmountOfRecharge = 0;

    for (const index of selectedHistoryPackIndex.value) {
      const pack = packListGroupByHistory.value[index];

      if (!pack) {
        continue;
      }

      if (!rewardIsExpired(pack)) {
        continue;
      }

      orundum += pack.orundum;
      originium += pack.originium;
      gachaTicket += pack.gachaTicket;
      tenGachaTicket += pack.tenGachaTicket;
      totalAmountOfRecharge += pack.price;
    }

    //循环选中的礼包索引，获得对应的礼包
    for (const i of selectedPackIndex.value) {
      const pack = listDisplayPackInfo.value[i];
      if (!pack) {
        continue;
      }

      if (!rewardIsExpired(pack)) {
        continue;
      }

      //月卡单独处理
      if (pack.officialName === "月卡") {
        //计算卡池结束前月卡可以拿到多少合成玉
        listDisplayPackInfo.value[i].orundum = dailyReward.value.daily * 200;
        //卡池结束前可以购买月卡的数量
        let purchaseQuantity = Math.ceil(dailyReward.value.daily / 30);

        //加上额外购买的月卡数量,判断是否额外购买了超过3个月
        if (rechargeOption.value.additionalMonthlyCardPurchase > 3) {
          createMessage({ type: "error", text: "月卡只能提前购买90天" });
          rechargeOption.value.additionalMonthlyCardPurchase -= 1;
          return;
        }

        // console.log(rechargeOption.value.additionalMonthlyCardPurchase)
        // if (rechargeOption.value.additionalMonthlyCardPurchase < purchaseQuantity) {
        //   createMessage({ type: 'error', text: '已经降到0了，不能再低了！' })
        //   return
        // }

        //加上额外购买的月卡数量
        purchaseQuantity += rechargeOption.value.additionalMonthlyCardPurchase;
        //计算通过月卡总计获得多少源石
        listDisplayPackInfo.value[i].originium = purchaseQuantity * 6;
        if (listDisplayPackInfo.value[i].originium < 0) {
          createMessage({ type: "error", text: "已经降到0了，不能再低了！" });
          listDisplayPackInfo.value[i].originium = 0;
          rechargeOption.value.additionalMonthlyCardPurchase += 1;
          return;
        }

        //月卡的价格=购买月卡的数量*30
        listDisplayPackInfo.value[i].price = purchaseQuantity * 30;
        //当月月卡已购买源石-6
        // if (rechargeOption.value.monthlyCardPurchasedThisMonth) {
        //   listDisplayPackInfo.value[i].originium -= 6
        //   totalAmountOfRecharge -= 30
        // }
      }

      orundum += pack.orundum;
      originium += pack.originium;
      gachaTicket += pack.gachaTicket;
      tenGachaTicket += pack.tenGachaTicket;
      totalAmountOfRecharge += pack.price;
    }

    for (const item of OriginiumTable.value) {
      if (item.quantity > 0) {
        originium += item.originium * item.quantity;
        totalAmountOfRecharge += item.price * item.quantity;
      }
    }

    if (!originiumIsUsed.value) {
      originium = 0;
    }

    calculationResult.value.orundum += orundum;
    calculationResult.value.originium += originium;
    calculationResult.value.gachaTicket += gachaTicket;
    calculationResult.value.tenGachaTicket += tenGachaTicket;
    calculationResult.value.totalAmountOfRecharge = totalAmountOfRecharge;
    calculationResult.value.rechargeTotalDraw = orundum / 600 + originium * 0.3 + gachaTicket + tenGachaTicket * 10;

    logs.push({ key: "氪金-合成玉", value: orundum });
    logs.push({ key: "氪金-源石", value: originium });
    logs.push({ key: "氪金-单抽", value: gachaTicket });
    logs.push({ key: "氪金-十连", value: tenGachaTicket });

    if (calculationResult.value.rechargeTotalDraw > 0) {
      pieChartDataTmp.push({ value: Math.floor(calculationResult.value.rechargeTotalDraw), name: "氪金" });
    }
  }

  /**
   * 计算用户选中活动的抽卡资源
   */
  function activityCalculate() {
    let orundum = 0;
    let originium = 0;
    let gachaTicket = 0;
    let tenGachaTicket = 0;

    //循环活动排期，计算活动可获得的奖励
    for (const activityName in activityScheduleList.value) {
      const activity = activityScheduleList.value[activityName];
      //判断这个活动是否在当前选择的时间段内
      if (!rewardIsExpired(activity)) {
        continue;
      }

      //是复刻活动的话额外判断是否选中，选中的是老玩家还是新玩家的奖励
      if (activity.rewardModule === "actRe") {
        if (!selectedActivityName.value.includes(activityName)) {
          continue;
        }
      }

      if (activity.rewardModule === "act") {
        if (!selectedActivityName.value.includes(activityName)) {
          continue;
        }
      }

      orundum += activity.orundum;
      originium += activity.originium;
      gachaTicket += activity.gachaTicket;
      tenGachaTicket += activity.tenGachaTicket;
    }

    if (!originiumIsUsed.value) {
      originium = 0;
    }

    calculationResult.value.orundum += orundum;
    calculationResult.value.originium += originium;
    calculationResult.value.gachaTicket += gachaTicket;
    calculationResult.value.tenGachaTicket += tenGachaTicket;

    calculationResult.value.activityTotalDraw = orundum / 600 + originium * 0.3 + gachaTicket + tenGachaTicket * 10;

    logs.push({ key: "活动-合成玉", value: orundum });
    logs.push({ key: "活动-源石", value: originium });
    logs.push({ key: "活动-单抽", value: gachaTicket });
    logs.push({ key: "活动-十连", value: tenGachaTicket });

    if (calculationResult.value.activityTotalDraw > 0) {
      pieChartDataTmp.push({ value: Math.floor(calculationResult.value.activityTotalDraw), name: "活动" });
    }
  }

  /**
   * 计算预测奖励结果
   */
  function honeyCakeCalculate() {
    let orundum = 0;
    let originium = 0;
    let gachaTicket = 0;
    let tenGachaTicket = 0;

    //循环预测奖励排期
    for (const honeyCake of otherRewardBySchedules.value) {
      // 判断奖励是否在当前选择的时间段内
      if (!rewardIsExpired(honeyCake)) {
        continue;
      }

      //判断当前卡池是否有每日赠送奖励
      if (currentSchedule.value.dailyGiftResources) {
        //自动计算每日赠送单抽和每日合成玉的奖励
        if (honeyCake.dailyRewards) {
          const remainingDays = getRewardRemainingDays(honeyCake);
          if (honeyCake.name.indexOf("单抽") > -1) {
            honeyCake.gachaTicket = remainingDays;
          } else {
            honeyCake.orundum = remainingDays * 600;
          }
        }
      }

      originium += honeyCake.originium;
      orundum += honeyCake.orundum;
      gachaTicket += honeyCake.gachaTicket;
      tenGachaTicket += honeyCake.tenGachaTicket;
    }

    if (!originiumIsUsed.value) {
      originium = 0;
    }

    calculationResult.value.orundum += orundum;
    calculationResult.value.originium += originium;
    calculationResult.value.gachaTicket += gachaTicket;
    calculationResult.value.tenGachaTicket += tenGachaTicket;

    calculationResult.value.otherTotalDraw = orundum / 600 + originium * 0.3 + gachaTicket + tenGachaTicket * 10;

    logs.push({ key: "预测-合成玉", value: orundum });
    logs.push({ key: "预测-源石", value: originium });
    logs.push({ key: "预测-单抽", value: gachaTicket });
    logs.push({ key: "预测-十连", value: tenGachaTicket });

    if (calculationResult.value.otherTotalDraw > 0) {
      pieChartDataTmp.push({ value: Math.floor(calculationResult.value.otherTotalDraw), name: "其他" });
    }
  }

  calculationResult.value.totalDraw = Math.floor(
    calculationResult.value.orundum / 600 + calculationResult.value.gachaTicket + calculationResult.value.tenGachaTicket * 10
  );

  singleResourceDraws.value.orundum = Math.floor(calculationResult.value.orundum / 600);
  singleResourceDraws.value.gachaTicket = calculationResult.value.gachaTicket;
  singleResourceDraws.value.tenGachaTicket = calculationResult.value.tenGachaTicket * 10;
  singleResourceDraws.value.originium = 0;

  pieChartData.value = pieChartDataTmp;

  logs.push({ key: "计算源石前", value: calculationResult.value.totalDraw });

  if (originiumIsUsed.value) {
    calculationResult.value.totalDraw = calculationResult.value.totalDraw + Math.floor(calculationResult.value.originium * 0.3);
    singleResourceDraws.value.originium = Math.floor(calculationResult.value.originium * 0.3);
  }

  logs.push({ key: "计算源石后", value: calculationResult.value.totalDraw });

  // console.table(logs)

  const lastSettings = {
    //存储到本地的数据
    //现有资源
    existOrundum: existResources.value.orundum,
    existOriginium: existResources.value.originium,
    existGachaTicket: existResources.value.gachaTicket,
    existTenGachaTicket: existResources.value.tenGachaTicket,
    //是否使用源石抽卡
    originiumIsUsed: originiumIsUsed.value,
    //周常是否完成
    weeklyTaskCompleted: dailyReward.value.weeklyTaskCompleted,
    //绿票商店是否换过
    certificateStoreCompleted: dailyReward.value.certificateStoreCompleted,
    //剿灭是否完成
    annihilationCompleted: dailyReward.value.annihilationCompleted,
    // 悖论模拟、剿灭模拟战
    paradox: potentialResources.value.paradox,
    annihilation: potentialResources.value.annihilation,
  };

  localStorage.setItem("LastSettings", JSON.stringify(lastSettings));

  setPieChart(pieChartData.value);

  // console.log(calculationResult.value)
}

/**
 * 获取卡池剩余天数
 * @param honeyCake 开始时间

 * @return {number}  剩余天数
 */
function getRewardRemainingDays(honeyCake) {
  //活动开启时间
  const rewardStart = honeyCake.start;
  const scheduleStart = currentSchedule.value.start.getTime();

  //活动结束时间
  let rewardEnd = honeyCake.end;
  //使用全局时间戳，支持用户自定义时间
  const nowTimeStamp = currentTimestamp.value;
  //如果选择的是计算到活动开启当日,判断活动开启日期是否在奖励结束日之前，true则代表这是个新活动，将活动结束日期设为活动开启日的次日凌晨4点
  if (!calPoolEnd.value && scheduleStart < rewardEnd) {
    rewardEnd = rewardStart + 60 * 60 * 12 * 1000;
  }

  console.log(rewardStart, rewardEnd);

  //活动剩余时间
  let remainingDays;

  //如果活动已经开始，用实际时间计算，否则用活动开启日期计算
  if (rewardStart < nowTimeStamp) {
    remainingDays = Math.round((rewardEnd - nowTimeStamp) / 86400000);
    // console.log(honeyCake.name,'剩余天数:', remainingDays)
  } else {
    remainingDays = Math.round((rewardEnd - rewardStart) / 86400000);
    // console.log(honeyCake.name,'剩余天数:', remainingDays)
  }

  //大于14天强制为14天
  if (remainingDays > 14) {
    remainingDays = 14;
  }

  // 防止出现负数
  if (remainingDays < 0) {
    remainingDays = 0;
  }

  // console.log(honeyCake.name, " 类型：", rewardType, activityType.value, dateFormat(rewardEnd), dateFormat(rewardStart), dateFormat(scheduleStart), remainingDays)

  // //小于1天强制为1天
  // if (endTime - startTime < 8640000) {
  //   remainingDays = 1
  // }

  console.log("离限定池结束还有" + remainingDays + "天");
  return remainingDays;
}

/**
 * 判断这个奖励或礼包是否可在当前用户选择的时间段内获取
 * @param reward 奖励的信息
 * @returns {boolean} 是否可计入
 */
function rewardIsExpired(reward) {
  //活动结束时间在当前时间之前，活动已结束
  if (reward.end <= currentTimestamp.value) {
    // console.log(reward.name, '活动结束')
    return false;
  }

  //活动开始时间在选择的结束时间节点之后，活动未开启
  if (reward.start > endDate.value.getTime()) {
    // console.log(reward.name, '活动未开始')
    return false;
  }

  //判断是否当前奖励的类型是否可以被计入，公共类型都可以计入，特殊类型需要符合当前活动类型，例如联动的专属十连不能被计入新春的攒抽结果中
  if (reward.rewardType) {
    return reward.rewardType === "公共" || reward.rewardType === activityType.value;
  }

  return true;
}

function rewardIsEmpty(reward) {
  return reward.orundum + reward.originium + reward.gachaTicket + reward.tenGachaTicket >= 1;
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
  let lastSettings = localStorage.getItem("LastSettings");
  if (!lastSettings) {
    return;
  }

  try {
    lastSettings = JSON.parse(lastSettings);
  } catch (error) {
    console.log(error);
    return;
  }

  existResources.value.orundum = stringToNumber(lastSettings.existOrundum);
  existResources.value.originium = stringToNumber(lastSettings.existOriginium);
  existResources.value.gachaTicket = stringToNumber(lastSettings.existGachaTicket);
  existResources.value.tenGachaTicket = stringToNumber(lastSettings.existTenGachaTicket);
  originiumIsUsed.value = lastSettings.originiumIsUsed;
  dailyReward.value.weeklyTaskCompleted = lastSettings.weeklyTaskCompleted;
  dailyReward.value.certificateStoreCompleted = lastSettings.certificateStoreCompleted;
  dailyReward.value.annihilationCompleted = lastSettings.annihilationCompleted;
  potentialResources.value.paradox = stringToNumber(lastSettings.paradox);
  potentialResources.value.annihilation = stringToNumber(lastSettings.annihilation);
}

// 创建一个窗口尺寸变化的监听器
window.addEventListener("resize", handleResize);

// 定义尺寸变化处理函数
function handleResize() {
  //判断是否是移动设备或PC端将窗口缩小，如果是就对chart画布进行尺寸重设
  if (window.innerWidth < 590) {
    myChart.resize();
  } else {
    myChart.resize();
  }
}

//概率计算
/**
 * 达成各目标的概率（乘 100，例如 11.4514% 概率达成，则值为 11.45）
 * @property {number} limited300
 * @property {number} all300
 * @property {number} limited120
 * @property {number} all120
 * @property {number} 联动卡池全满潜
 */
const currentProb = ref({});
updateProb();

watch(() => calculationResult.value.totalDraw, updateProb);

function updateProb() {
  const pulls = calculationResult.value.totalDraw || 0;

  for (const key of Object.keys(probabilityTableData)) {
    if (probabilityTableData[key][pulls] !== undefined) {
      currentProb.value[key] = probabilityTableData[key][pulls] * 100;
    } else {
      currentProb.value[key] = 100;
    }
  }
}

function getColor(p) {
  if (p >= 90) return "#ff4949"; // 橙色
  if (p >= 60) return "#7776FF"; // 紫色
  if (p >= 30) return "#33b5e5"; // 蓝色
  if (p >= 10) return "#00C851"; // 绿色
  return "#bdbdbd"; // 灰色
}

/**
 * 根据抽数显示不同的颜色
 * @param limited
 * @param all
 * @return {{color: string, background: string}|{border: string, borderRadius: string, background: string, width: string, height: string}}
 */
function getProbabilityBoxStyle(limited, all) {
  const leftColor = getColor(limited);
  const rightColor = getColor(all);

  if (all >= 100) {
    return {
      background: "linear-gradient(45deg, #FF6B6B, #FFA94D, #FFD43B, #69DB7C, #4DABF7, #A685E2)",
      color: "white",
    };
  }
  return {
    background: `linear-gradient(to right, ${leftColor} 50%, ${rightColor} 50%)`,
    border: "1px solid #ccc",
    borderRadius: "4px",
    width: "20px",
    height: "20px",
  };
}

const developerMode = ref("");

onMounted(() => {
  readLastSettings();
  myChart = echarts.init(document.getElementById("calculationResultPieChart"));
  updateScheduleOption(0);
  getAndSortPackData();
  developerMode.value = route.query.mode;

  // ElNotification({
  //   title: '2024.08.16',
  //   dangerouslyUseHTMLString: true,
  //   message: '<strong>1.更新了春节卡池排期（非准确排期）<br>2.修复了部分奖励计算错误的问题</strong>',
  // })
});

//处理时间选择器变化
function handleDateChange(date) {
  if (date) {
    currentTimestamp.value = new Date(date).getTime();
    // 重新生成基于时间的数据
    batchGenerationServerMaintenanceRewards();
    // 重新加载礼包数据和计算攒抽资源
    getAndSortPackData();
    gachaResourcesCalculation();
  }
}

//截图模式
function handleBackground() {
  // 1. 所有 .collapse-item 阴影设为 0
  const items = document.querySelectorAll(".collapse-item");
  items.forEach((el) => {
    el.style.boxShadow = "none";
  });

  // 2. gachaCalculate 背景色设为绿色
  const gacha = document.getElementById("gachaCalculate");
  if (gacha) {
    gacha.style.backgroundColor = "lime";
  }
}

const wideScreenStatus = ref("pro");
function wideScreenMode() {
  if ("pro" === wideScreenStatus.value) {
    document.getElementById("gachaCalculate").setAttribute("data-video", "developer");
    document.getElementById("resources-box").setAttribute("data-video", "developer");
    document.getElementById("result-box").setAttribute("data-video", "developer");
    wideScreenStatus.value = "developer";
  } else {
    document.getElementById("gachaCalculate").setAttribute("data-video", "pro");
    document.getElementById("resources-box").setAttribute("data-video", "pro");
    document.getElementById("result-box").setAttribute("data-video", "pro");
    wideScreenStatus.value = "pro";
  }
}

let clickCount = 0;

function triggerDEVmode() {
  clickCount++;

  if (clickCount >= 8) {
    const timeSelector = document.getElementById("timeSelector");
    if (timeSelector) {
      timeSelector.style.display = "flex";
    }
    clickCount = 0;
  }

  clearTimeout(clickCount.timeout);
  clickCount.timeout = setTimeout(() => {
    clickCount = 0;
  }, 10000);
}

//分享
function sharePage() {
  const url = "https://ark.yituliu.cn/tools/gachaCalc";
  const title = "明日方舟攒抽计算器";

  // 优先调用原生分享 API
  if (navigator.share) {
    navigator
      .share({ title, url })
      .then(() => console.log("分享成功"))
      .catch(() => fallbackCopy());
  } else {
    fallbackCopy();
  }

  // 回退逻辑：复制到剪贴板并提示
  function fallbackCopy() {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(url)
        .then(() => alert("链接已复制到剪贴板"))
        .catch(() => prompt("请手动复制链接:", url));
    } else {
      prompt("请手动复制链接:", url);
    }
  }
}
</script>

<template>
  <!--  <img src="/public/顶部.jpg" alt="" style="width: 600px;position: absolute;top: 50px;left: 360px;z-index:3000;opacity: 0.3" >-->
  <!-- <div style="background-color: #13ce66;width: 600px;height: 114px;">114</div> -->
  <div class="gacha-calculation-page" id="gachaCalculate" data-video="pro">
    <!--计算结果-->
    <div class="collapse-group1" id="result-box" data-video="pro">
      <!-- <div class="collapse-group-content"> -->
      <el-collapse v-model="resultCollapseActiveNames" class="" style="border: none">
        <el-collapse-item name="calculationResult" class="collapse-item">
          <template #title>
            <div class="flex align-center">
              <div
                class="collapse-title-icon"
                v-if="activityType !== '联动限定'"
                :style="getProbabilityBoxStyle(currentProb.limited300, currentProb.all300)"
              ></div>
              <div
                class="collapse-title-icon"
                v-if="activityType === '联动限定'"
                :style="getProbabilityBoxStyle(currentProb.limited120, currentProb.all120)"
              ></div>
              <span class="collapse-title-font">
                共计{{ calculationResult.totalDraw }}抽， 氪金{{ numberFloor(calculationResult.totalAmountOfRecharge, 0) }}元
              </span>
            </div>
          </template>
          <!--选择攒到某个活动的单选框-->
          <div class="radio-group-wrap" style="padding-top: 4px">
            <el-radio-group v-model="currentScheduleName" size="large" class="custom-radio-group">
              <el-radio-button
                v-for="(activity, index) in scheduleOptions"
                :key="`schedule-${index}`"
                :label="activity.name"
                :disabled="activity.disabled"
                style="min-width: 108px"
                @change="updateScheduleOption(index)"
              >
                <div class="radio-content">
                  <div class="radio-title">{{ activity.name }}</div>
                  <div class="radio-subtitle">{{ activity.dateString }}</div>
                </div>
              </el-radio-button>
            </el-radio-group>
          </div>

          <!-- <span class="tip" style="text-align: center">日期为卡池结束日期</span> -->
          <div class="resources-line" style="padding-left: 20px; margin: 0">
            <el-switch
              v-model="calPoolEnd"
              @click="gachaResourcesCalculation"
              style="--el-switch-on-color: #13ce66; --el-switch-off-color: #ff4949"
              active-text="计算到卡池结束当天"
              inactive-text="计算到卡池开放当天"
            />
          </div>
          <!-- <div class="result-content"> -->
          <div class="resources-line" style="padding-top: 0; margin: 0; display: flex">
            <!--饼状图-->
            <div class="gacha-resources-chart-pie" id="calculationResultPieChart"></div>
            <!--抽卡次数总览-->
            <table class="gacha-resources-table">
              <tbody>
                <tr>
                  <td class="gacha-resources-table-title">现有</td>
                  <td class="gacha-resources-table-quantity">{{ numberFloor(calculationResult.existTotalDraw, 0) }}</td>
                  <td>抽</td>
                </tr>
                <tr>
                  <td>日常</td>
                  <td>{{ numberFloor(calculationResult.dailyTotalDraw, 0) }}</td>
                  <td>抽</td>
                </tr>
                <tr>
                  <td>搓玉/黄绿票</td>
                  <td>{{ numberFloor(calculationResult.produceOrundumTotalDraw, 0) }}</td>
                  <td>抽</td>
                </tr>
                <tr>
                  <td>潜在</td>
                  <td>{{ numberFloor(calculationResult.potentialTotalDraw, 0) }}</td>
                  <td>抽</td>
                </tr>
                <tr>
                  <td>氪金</td>
                  <td>{{ numberFloor(calculationResult.rechargeTotalDraw, 0) }}</td>
                  <td>抽</td>
                </tr>
                <tr>
                  <td>活动(估算)</td>
                  <td>{{ numberFloor(calculationResult.activityTotalDraw, 0) }}</td>
                  <td>抽</td>
                </tr>
                <tr>
                  <td>其它(估算)</td>
                  <td>{{ numberFloor(calculationResult.otherTotalDraw, 0) }}</td>
                  <td>抽</td>
                </tr>
              </tbody>
            </table>
          </div>
          <!--抽卡资源总览-->
          <div class="resources-result-bar">
            <!-- <div class="resources-line"> -->
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
          <!-- 抽卡概率总览 -->
          <div class="resources-result-bar" style="border: none; padding-top: 0px">
            <div v-if="currentProb" style="display: flex; gap: 16px">
              <div v-if="activityType !== '联动限定'">
                <p>拿到限定的概率：{{ currentProb.limited300.toFixed(2) }}%</p>
              </div>
              <div v-if="activityType !== '联动限定'">
                <p>拿到限定+陪跑的概率：{{ currentProb.all300.toFixed(2) }}%</p>
              </div>
              <div v-if="activityType === '联动限定'">
                <p>拿到限定六星的概率：{{ currentProb.limited120.toFixed(2) }}%</p>
              </div>
              <div v-if="activityType === '联动限定'">
                <p>拿到所有联动的概率：{{ currentProb.all120.toFixed(2) }}%</p>
              </div>
              <div v-if="activityType === '联动限定'">
                <p>全满潜的概率：{{ currentProb.联动卡池全满潜.toFixed(2) }}%</p>
              </div>
            </div>
            <div v-else>
              <p>未找到对应抽数概率</p>
            </div>
          </div>

          <div
            class="resources-result-bar"
            style="
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-size: 15px;
              font-weight: 500;
              background-color: antiquewhite;
              border: none;
              padding: 8px 12px;
              border-radius: 4px;
              margin: 0px 4px;
            "
          >
            <span style="line-height: 20px">明日方舟一图流 ark.yituliu.cn</span>
            <div style="display: flex; gap: 12px">
              <!-- GitHub -->
              <a
                href="https://github.com/Arknights-yituliu"
                target="_blank"
                style="width: 40px; height: 40px; display: flex; align-items: center; justify-content: center"
              >
                <svg width="40" height="40" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
                  <!-- 白底 -->
                  <circle cx="512" cy="512" r="512" fill="white" />
                  <!-- GitHub黑LOGO -->
                  <path
                    d="M511.6 76.3C264.3 76.2 64 276.4 64 523.7c0 197.5 128 365.1 305.9 424.6 22.4 4.1 30.6-9.7 30.6-21.5 0-10.6-.4-45.6-.6-82.8-124.5 27-150.9-52.9-150.9-52.9-20.4-51.9-49.8-65.7-49.8-65.7-40.7-27.9 3.1-27.3 3.1-27.3 45 3.2 68.7 46.2 68.7 46.2 40 68.6 104.9 48.8 130.5 37.3 4-29 15.6-48.8 28.4-60-99.5-11.3-204-49.7-204-221.4 0-48.9 17.5-88.9 46.2-120.2-4.6-11.3-20-56.9 4.4-118.7 0 0 37.6-12 123.1 45.9 35.7-9.9 73.9-14.8 112-15 38.1.2 76.3 5.1 112 15 85.4-57.9 123-45.9 123-45.9 24.4 61.8 9 107.4 4.4 118.7 28.7 31.3 46.2 71.3 46.2 120.2 0 171.9-104.6 210-204.4 221.1 16 13.8 30.3 41 30.3 82.6 0 59.7-.6 107.7-.6 122.3 0 11.9 8 25.9 30.9 21.5C832 888.7 960 721.1 960 523.7c0-247.3-200.3-447.5-448.4-447.4z"
                    fill="#181717"
                  />
                </svg>
              </a>

              <!-- Bilibili -->
              <a
                href="https://space.bilibili.com/688411531"
                target="_blank"
                style="width: 40px; height: 40px; display: flex; align-items: center; justify-content: center"
              >
                <svg width="40" height="40" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <!-- 白底 -->
                  <circle cx="12" cy="12" r="12" fill="white" />
                  <!-- B站蓝色LOGO -->
                  <path
                    d="M18.223 3.086a1.25 1.25 0 0 1 0 1.768L17.08 5.996h1.17A3.75 3.75 0 0 1 22 9.747v7.5a3.75 3.75 0 0 1-3.75 3.75H5.75A3.75 3.75 0 0 1 2 17.247v-7.5a3.75 3.75 0 0 1 3.75-3.75h1.166L5.775 4.855a1.25 1.25 0 1 1 1.767-1.768l2.652 2.652c.079.079.145.165.198.257h3.213c.053-.092.12-.18.199-.258l2.651-2.652a1.25 1.25 0 0 1 1.768 0zm.027 5.42H5.75a1.25 1.25 0 0 0-1.247 1.157l-.003.094v7.5c0 .659.51 1.199 1.157 1.246l.093.004h12.5a1.25 1.25 0 0 0 1.247-1.157l.003-.093v-7.5c0-.69-.56-1.25-1.25-1.25zm-10 2.5c.69 0 1.25.56 1.25 1.25v1.25a1.25 1.25 0 1 1-2.5 0v-1.25c0-.69.56-1.25 1.25-1.25zm7.5 0c.69 0 1.25.56 1.25 1.25v1.25a1.25 1.25 0 1 1-2.5 0v-1.25c0-.69.56-1.25 1.25-1.25z"
                    fill="#00aeec"
                  />
                </svg>
              </a>

              <!-- 分享 -->
              <a
                href="javascript:void(0)"
                @click="sharePage()"
                style="
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  width: 40px;
                  height: 40px;
                  border-radius: 50%;
                  background-color: #f39c12;
                  color: white;
                "
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="24" height="24" fill="currentColor">
                  <path
                    d="m679.872 348.8-301.76 188.608a127.808 127.808 0 0 1 5.12 52.16l279.936 104.96a128 128 0 1 1-22.464 59.904l-279.872-104.96a128 128 0 1 1-16.64-166.272l301.696-188.608a128 128 0 1 1 33.92 54.272z"
                  ></path>
                </svg>
              </a>
            </div>
          </div>
        </el-collapse-item>

        <el-collapse-item name="developer" class="collapse-item" v-show="developerMode === 'dev'">
          <template #title>
            <div class="flex align-center">
              <div class="collapse-title-icon" style="background: rgba(119, 118, 255, 0.8)"></div>
              <span class="collapse-title-font"> 开发者模式 </span>
            </div>
          </template>
          <!-- 时间选择器 -->
          <div
            class="resources-result-bar"
            id="timeSelector"
            style="border: none; padding: 12px; margin: 8px 4px; background-color: #f5f7fa; border-radius: 4px"
          >
            <div style="display: flex; align-items: center; gap: 12px">
              <span style="font-weight: 500; color: #606266">当前时间：</span>
              <el-date-picker
                v-model="currentDate"
                type="datetime"
                placeholder="选择日期时间"
                format="YYYY-MM-DD HH:mm:ss"
                value-format="YYYY-MM-DD HH:mm:ss"
                @change="handleDateChange"
                style="flex: 1"
              />
            </div>

            <el-button
              @click="
                currentDate = new Date();
                handleDateChange(currentDate);
              "
            >
              重置为当前
            </el-button>
            <el-button @click="handleBackground()"> 截图模式 </el-button>
            <el-button @click="wideScreenMode()"> 宽屏模式 </el-button>
          </div>
        </el-collapse-item>
      </el-collapse>
      <!-- </div> -->
    </div>

    <div class="collapse-group2" id="resources-box" data-video="pro">
      <el-collapse v-model="optionsCollapseActiveNames" style="border: none">
        <!--库存资源-->
        <el-collapse-item name="exist" class="collapse-item">
          <template #title>
            <div class="flex align-center">
              <div class="collapse-title-icon" style="background: rgba(119, 118, 255, 0.8)"></div>
              <span class="collapse-title-font"> 库存/预留&emsp;{{ numberFloor(calculationResult.existTotalDraw, 0) }}抽 </span>
            </div>
          </template>
          <div class="collapse-content-subheading"><span></span> 当前库存</div>

          <div class="resources-line" style="flex-wrap: wrap">
            <!-- <div class="exist-resources-input-wrap"> -->
            <div class="exist-resources-input">
              <div class="image-sprite">
                <div class="bg-icon_4002"></div>
              </div>
              <input @change="gachaResourcesCalculation" v-model="existResources.originium" />
              <div class="image-sprite">
                <div class="bg-icon_4003"></div>
              </div>
              <input @change="gachaResourcesCalculation" v-model="existResources.orundum" />
            </div>
            <div class="exist-resources-input">
              <div class="image-sprite">
                <div class="bg-icon_7003"></div>
              </div>
              <input @change="gachaResourcesCalculation" v-model="existResources.gachaTicket" />
              <div class="image-sprite">
                <div class="bg-icon_7004"></div>
              </div>
              <input @change="gachaResourcesCalculation" v-model="existResources.tenGachaTicket" />
            </div>
          </div>

          <div class="resources-line">
            <!-- <div class="switch-wrap"> -->
            <span>是否使用源石抽卡</span>
            <el-switch v-model="originiumIsUsed" @click="gachaResourcesCalculation"></el-switch>
          </div>

          <div class="collapse-content-subheading"><span></span> 时装预留源石</div>
          <div class="resources-line" style="overflow-x: scroll">
            <el-space>
              <el-input-number v-model="existResources.skinBudget" :step="1" :min="0" :max="10" @change="gachaResourcesCalculation()">
                <template #prefix>
                  <span>18石</span>
                </template>
              </el-input-number>
              <el-input-number v-model="existResources.skinBudgetPlus" :step="1" :min="0" :max="10" @change="gachaResourcesCalculation()">
                <template #prefix>
                  <span>21石</span>
                </template>
              </el-input-number>
              <el-input-number v-model="existResources.skinBudgetPro" :step="1" :min="0" :max="10" @change="gachaResourcesCalculation()">
                <template #prefix>
                  <span>24石</span>
                </template>
              </el-input-number>
            </el-space>
          </div>

          <div class="collapse-content-subheading"><span></span> 自定义修正</div>
          <div class="resources-line">
            <input v-model="existResources.correctOrundum" @input="gachaResourcesCalculation" />
            <span>合成玉自定义修正</span>
            <div class="image-sprite">
              <div class="bg-icon_4003"></div>
            </div>
            <span>{{ existResources.correctOrundum }}</span>
          </div>
          <span class="tip"> 例如给轮换池预留、其它合成玉来源等，可填负数</span>
        </el-collapse-item>

        <!--日常积累-->
        <el-collapse-item name="daily" class="collapse-item">
          <template #title>
            <div class="flex align-center">
              <div class="collapse-title-icon" style="background: rgba(119, 118, 255, 0.8)"></div>
              <span class="collapse-title-font"> 日常积累&emsp;{{ numberFloor(calculationResult.dailyTotalDraw, 0) }}抽 </span>
            </div>
          </template>

          <div class="resources-line">
            <span class="resources-line-label" @click="triggerDEVmode"> 日常{{ dailyReward.daily }}天 </span>
            <div class="resources-line-content">
              <div class="image-sprite">
                <div class="bg-icon_4003"></div>
              </div>
              <span>{{ dailyReward.dailyOrundumReward }}</span>
            </div>
          </div>
          <!--          <div class="resources-line">-->
          <!--            <span class="resources-line-label">官方月卡{{ officialMonthlyCardRemainingDays }}次</span>-->
          <!--            <div class="resources-line-content">-->
          <!--              <div class="image-sprite">-->
          <!--                <div class="bg-icon_4003"></div>-->
          <!--              </div>-->
          <!--              <span>{{ officialMonthlyCardReward }}</span>-->
          <!--            </div>-->
          <!--          </div>-->

          <v-divider></v-divider>
          <div class="resources-line">
            <span class="resources-line-label"> 周常{{ dailyReward.weekly }}周 </span>
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
            <span class="resources-line-label"> 剿灭{{ dailyReward.annihilation }}周 </span>
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
          <v-divider></v-divider>
          <div class="resources-line">
            <span class="resources-line-label"> 绿票商店{{ dailyReward.certificateShoppingTimes }}月 </span>
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
              <el-switch v-model="dailyReward.certificateStoreCompleted" @change="gachaResourcesCalculation"></el-switch>
              本月已兑换
            </div>
          </div>

          <div class="resources-line">
            <span class="resources-line-label"> 每月签到{{ dailyReward.checkIn }}月 </span>
            <div class="resources-line-content">
              <div class="image-sprite">
                <div class="bg-icon_7003"></div>
              </div>
              <span>{{ dailyReward.checkInGachaTicket }}</span>
            </div>
          </div>
          <span class="tip"> 黄票换抽计算整合在下面</span>
        </el-collapse-item>

        <!--搓玉/黄票资源-->
        <el-collapse-item name="custom" class="collapse-item">
          <template #title>
            <div class="flex align-center">
              <div class="collapse-title-icon" style="background: rgba(119, 118, 255, 0.8)"></div>
              <span class="collapse-title-font"> 搓玉/绿票/黄票换抽&emsp;{{ numberFloor(calculationResult.produceOrundumTotalDraw, 0) }}抽 </span>
            </div>
          </template>
          <!-- 黄票换抽 -->
          <div class="collapse-content-subheading"><span></span>黄票换抽</div>
          <el-checkbox-button
            v-for="(pack, name) in certificatePackList"
            :key="name"
            :value="name"
            size="small"
            v-show="rewardIsExpired(pack)"
            v-model="selectedCertificatePack"
            @change="gachaResourcesCalculation"
          >
            <div class="checkbox-button">
              <span class="checkbox-button-pack-label">{{ pack.officialName }}</span>
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
          <v-divider></v-divider>
          <!-- 换不完38抽 -->
          <el-checkbox-group style="margin: 4px" @change="gachaResourcesCalculation" v-model="selectedCertificateT2Group" size="small">
            <el-checkbox-button v-for="(price, index) in certificateT2Group" :key="price" :value="price">
              <div class="checkbox-button">
                <span>{{ price.text }}</span>
                <div class="checkbox-button-gacha-resources">
                  <div class="image-sprite">
                    <div class="bg-icon_7003"></div>
                  </div>
                  <span>{{ certificateT2Group[index].draw }}</span>
                </div>
              </div>
            </el-checkbox-button>
          </el-checkbox-group>
          <span class="tip">越换越便宜，咱尽量还是一次换完吧</span>
          <div class="collapse-content-subheading"><span></span>搓玉计算</div>

          <div class="resources-line">
            <input v-model="produceOrundum.ap" @input="gachaResourcesCalculation" />
            <span>用于搓玉的理智 x </span>
            <input v-model="produceOrundum.coEfficient" @input="gachaResourcesCalculation" />
            <span>搓玉系数 = </span>
            <div class="image-sprite">
              <div class="bg-icon_4003"></div>
            </div>
            <span>{{ produceOrundum.outputByAp }}</span>
          </div>

          <el-checkbox-group>
            <el-checkbox-button @click="updateApWithoutPass">
              <div style="padding: 4px">{{ dailyReward.daily }}天x240={{ dailyReward.daily * 240 }}理智</div>
            </el-checkbox-button>
            <el-checkbox-button @click="updateApWithPass">
              <div style="padding: 4px">{{ dailyReward.daily }}天x320={{ dailyReward.daily * 320 }}理智</div>
            </el-checkbox-button>
          </el-checkbox-group>
          <span class="tip">请根据自身情况填入合适的理智数</span>
          <el-checkbox-group>
            <el-checkbox-button v-for="stage in coEfficientList" :key="coEfficient" :value="coEfficient" @click="updateCoEfficient(stage.coEfficient)">
              <div style="padding: 4px">{{ stage.stage }}({{ stage.coEfficient }})</div>
            </el-checkbox-button>
          </el-checkbox-group>
          <span class="tip">搓玉系数：1理智可搓多少玉，1-7为1.09，活动关请去主页查询</span>

          <div class="resources-line">
            <input v-model="produceOrundum.itemId30012" @input="gachaResourcesCalculation" />
            <span>个固源岩 + </span>
            <input v-model="produceOrundum.itemId30062" @input="gachaResourcesCalculation" />
            <span>个装置 + </span>
            <span> {{ produceOrundum.itemId4001 }}龙门币 = </span>
            <div class="image-sprite">
              <div class="bg-icon_4003"></div>
            </div>
            <span>{{ produceOrundum.outputByItem }}</span>
          </div>

          <div class="collapse-content-subheading"><span></span> 绿票商店第三层</div>

          <div class="resources-line">
            <span>现有绿票</span>
            <input v-model="certificateStoreF3.certificates" @input="gachaResourcesCalculation" />
            <span> ，有{{ certificateStoreF3.disposableCertificate }}绿票可换 </span>
            <div class="image-sprite">
              <div class="bg-icon_4003"></div>
            </div>
            <span>{{ certificateStoreF3.orundum }}</span>
          </div>
          <span class="tip">现有绿票数 - 第一层共需1490绿票 - 第二层共需10100绿票 = 可用于换玉的绿票数</span>
          <span class="tip">鉴于第二层有不少性价比较低的物品，建议囤够2w以上绿票再考虑绿票换玉</span>
        </el-collapse-item>

        <!--潜在资源-->
        <el-collapse-item name="potential" class="collapse-item">
          <template #title>
            <div class="flex align-center">
              <div class="collapse-title-icon" style="background: rgba(119, 118, 255, 0.8)"></div>
              <span class="collapse-title-font"> 潜在资源&emsp;{{ numberFloor(calculationResult.potentialTotalDraw, 0) }}抽 </span>
            </div>
          </template>
          <div class="collapse-content-subheading"><span></span> 悖论模拟/剿灭作战模拟</div>
          <div class="resources-line">
            <input v-model="potentialResources.paradox" @input="gachaResourcesCalculation" />
            <span>个悖论模拟</span>
            <div class="image-sprite">
              <div class="bg-icon_4003"></div>
            </div>
            <span>{{ potentialResources.paradox * 200 }}</span>
          </div>
          <div class="resources-line">
            <input v-model="potentialResources.annihilation" @input="gachaResourcesCalculation" />
            <span>个剿灭作战模拟</span>
            <div class="image-sprite">
              <div class="bg-icon_4003"></div>
            </div>
            <span>{{ potentialResources.annihilation * 1500 }}</span>
          </div>

          <div class="collapse-content-subheading"><span></span> 训练场</div>

          <el-checkbox-group v-model="selectedPermanentZoneName" style="margin: 4px" @change="gachaResourcesCalculation" size="small">
            <el-checkbox-button
              v-for="(potential, index) in POTENTIAL_TABLE"
              :key="index"
              :value="index"
              v-show="potential.packType === 'train'"
              class="el-checkbox-button"
              :border="true"
            >
              <div class="checkbox-button">
                <span class="checkbox-button-zone-label">{{ potential.packName }}</span>
                <div class="checkbox-button-gacha-resources">
                  <div class="image-sprite">
                    <div class="bg-icon_4003"></div>
                  </div>
                  <span>{{ potential.gachaOrundum }}</span>
                </div>
              </div>
            </el-checkbox-button>
          </el-checkbox-group>
          <div class="collapse-content-subheading"><span></span> 主线、突袭、绝境</div>

          <el-checkbox-group v-model="selectedPermanentZoneName" style="margin: 4px" @change="gachaResourcesCalculation" size="small">
            <el-checkbox-button
              v-for="(potential, index) in POTENTIAL_TABLE"
              :key="index"
              :value="index"
              v-show="potential.packType === 'main'"
              class="el-checkbox-button"
              :border="true"
            >
              <div class="checkbox-button">
                <span :class="potential.packName.length < 4 ? 'checkbox-button-zone-label-short' : 'checkbox-button-zone-label-long'">
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

          <div class="collapse-content-subheading"><span></span> 插曲</div>
          <el-checkbox-group v-model="selectedPermanentZoneName" style="margin: 4px" @change="gachaResourcesCalculation">
            <el-checkbox-button
              v-for="(potential, index) in POTENTIAL_TABLE"
              :border="true"
              :key="index"
              :value="index"
              v-show="potential.packType === 'activity-main'"
              class="el-checkbox-button"
            >
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

          <div class="collapse-content-subheading"><span></span> 别传</div>
          <el-checkbox-group v-model="selectedPermanentZoneName" style="margin: 4px" @change="gachaResourcesCalculation">
            <el-checkbox-button
              v-for="(potential, index) in POTENTIAL_TABLE"
              :border="true"
              :key="index"
              :value="index"
              v-show="potential.packType === 'activity'"
              class="el-checkbox-button"
            >
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

          <div class="collapse-content-subheading"><span></span> 未确定开放日期的活动</div>
          <el-checkbox-group v-model="selectedPermanentZoneName" style="margin: 4px" @change="gachaResourcesCalculation">
            <el-checkbox-button
              v-for="(potential, index) in POTENTIAL_TABLE"
              :border="true"
              :key="index"
              :value="index"
              v-show="potential.packType === 'to-be-open'"
              class="el-checkbox-button"
            >
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
          <span class="tip">这些活动的复刻/记录修复日期尚不明确，请根据实际情况选取</span>
        </el-collapse-item>

        <!--氪金资源-->
        <el-collapse-item name="recharge" class="collapse-item">
          <template #title>
            <div class="flex align-center">
              <div class="collapse-title-icon" style="background: rgba(119, 118, 255, 0.8)"></div>
              <span class="collapse-title-font"> 氪金资源&emsp;{{ numberFloor(calculationResult.rechargeTotalDraw, 0) }}抽 </span>
            </div>
          </template>

          <span class="tip">标签内为每抽价格(元)，颜色用于区分性价比</span>
          <span class="tip">仅计入礼包内抽卡资源，紫色高于648，橙色高于大月卡</span>
          <span class="tip"><a href="/material/pack">点击跳转礼包完整性价比</a></span>
          <!--月常礼包-->
          <div class="collapse-content-subheading"><span></span> 月常礼包</div>
          <!-- <div class="switch-wrap"> -->
          <!-- <div class="resources-line">
            <el-switch v-model="rechargeOption.monthlyCardPurchasedThisMonth"
              @change="gachaResourcesCalculation"></el-switch>
            <span>本月月卡已购买(选中则扣除6源石)</span>
          </div> -->
          <div class="resources-line">
            <span>额外购买</span>
            <el-input-number v-model="rechargeOption.additionalMonthlyCardPurchase" @input="gachaResourcesCalculation"> </el-input-number>
            <span>张月卡(负数代表已提前购买)</span>
          </div>
          <span class="tip">额外购买一张月卡可提前拿到6石，已提前购买则只能拿到每日200玉</span>
          <el-checkbox-group v-model="selectedPackIndex" style="margin: 4px" @change="gachaResourcesCalculation">
            <el-checkbox-button
              v-for="(pack, index) in listMonthlyPackInfo"
              :key="index"
              :value="pack.parentIndex"
              class="el-checkbox-button"
              v-show="rewardIsExpired(pack)"
            >
              <PackButtonContent :data="pack"> </PackButtonContent>
            </el-checkbox-button>
          </el-checkbox-group>

          <!--限时礼包-->
          <div class="collapse-content-subheading"><span></span> 限时礼包</div>
          <!-- <span class="tip">"指令重构"寻访包仅能用于4月M3池，不能用于任何限定池</span> -->
          <el-checkbox-group v-model="selectedPackIndex" style="margin: 4px" @change="gachaResourcesCalculation">
            <el-checkbox-button v-for="(pack, index) in listActivityPackInfo" :key="index" :value="pack.parentIndex" class="el-checkbox-button">
              <PackButtonContent :data="pack"> </PackButtonContent>
            </el-checkbox-button>
          </el-checkbox-group>

          <!--新人礼包-->
          <div class="collapse-content-subheading"><span></span> 新人礼包</div>
          <el-checkbox-group v-model="selectedPackIndex" style="margin: 4px" @change="gachaResourcesCalculation">
            <el-checkbox-button v-for="(pack, index) in listNewBiePackInfo" :key="index" :value="pack.parentIndex" class="el-checkbox-button">
              <PackButtonContent :data="pack"> </PackButtonContent>
            </el-checkbox-button>
          </el-checkbox-group>

          <!--首次充值源石-->
          <div class="collapse-content-subheading"><span></span> 首次充值源石（周年刷新前）</div>
          <el-checkbox-group v-model="selectedPackIndex" style="margin: 4px" @change="gachaResourcesCalculation">
            <el-checkbox-button v-for="(pack, index) in listLastYearOriginiumPack" :key="index" :value="pack.parentIndex" class="el-checkbox-button">
              <PackButtonContent :data="pack"> </PackButtonContent>
            </el-checkbox-button>
          </el-checkbox-group>

          <!--首次充值源石-->
          <div class="collapse-content-subheading"><span></span> 首次充值源石（周年刷新后）</div>
          <el-checkbox-group v-model="selectedPackIndex" style="margin: 4px" @change="gachaResourcesCalculation">
            <el-checkbox-button v-for="(pack, index) in listOriginiumPack" :key="index" :value="pack.parentIndex" class="el-checkbox-button">
              <PackButtonContent :data="pack"> </PackButtonContent>
            </el-checkbox-button>
          </el-checkbox-group>

          <div class="collapse-content-subheading"><span></span> 往年礼包（用于估算氪金）</div>
          <el-checkbox-group v-model="selectedHistoryPackIndex" style="margin: 4px" @change="gachaResourcesCalculation">
            <el-checkbox-button v-for="(pack, index) in packListGroupByHistory" :key="index" :value="index" class="el-checkbox-button">
              <PackButtonContent :data="pack"> </PackButtonContent>
            </el-checkbox-button>
          </el-checkbox-group>

          <div class="collapse-content-subheading"><span></span> 额外购买非首充源石</div>

          <div class="resources-line" v-for="item in OriginiumTable">
            <span class="resources-line-label">{{ item.packName }}</span>
            <div class="resources-line-content">
              <div class="image-sprite">
                <div class="bg-icon_4002"></div>
              </div>
              <span>{{ item.originium }}</span>
            </div>
            <el-input-number v-model="item.quantity" @change="gachaResourcesCalculation">
              <template #suffix>
                <span>次</span>
              </template>
            </el-input-number>
          </div>
        </el-collapse-item>

        <!--活动获得(估算)-->
        <el-collapse-item name="activity" class="collapse-item">
          <template #title>
            <div class="flex align-center">
              <div class="collapse-title-icon" style="background: rgba(119, 118, 255, 0.8)"></div>
              <span class="collapse-title-font"> 活动获得（估算）&emsp;{{ numberFloor(calculationResult.activityTotalDraw, 0) }}抽 </span>
            </div>
          </template>
          <!--复刻活动-->
          <div class="collapse-content-subheading"><span></span> 复刻活动</div>
          <el-checkbox-group v-model="selectedActivityName" style="margin: 4px" @change="gachaResourcesCalculation">
            <el-checkbox-button
              v-for="(activity, name) in activityScheduleList"
              :key="name"
              :value="name"
              v-show="activity.rewardModule === 'actRe' && rewardIsExpired(activity)"
              class="el-checkbox-button"
            >
              <PackButtonContent :data="activity"> </PackButtonContent>
            </el-checkbox-button>
          </el-checkbox-group>

          <!-- 未来活动 -->
          <div class="collapse-content-subheading"><span></span> 未来活动</div>
          <v-alert type="warning" density="compact" class="collapse-alert" v-show="!currentSchedule.accuracyFlag">
            无准确排期，默认给出可能性最大的排期，可自行增减
          </v-alert>
          <el-checkbox-group v-model="selectedActivityName" style="margin: 4px" @change="gachaResourcesCalculation">
            <el-checkbox-button
              v-for="(activity, name) in activityScheduleList"
              :key="name"
              :value="name"
              v-show="activity.rewardModule === 'act' && rewardIsExpired(activity)"
              class="el-checkbox-button"
            >
              <PackButtonContent :data="activity"> </PackButtonContent>
            </el-checkbox-button>
          </el-checkbox-group>
        </el-collapse-item>

        <!-- 其他资源 -->
        <el-collapse-item name="other" class="collapse-item">
          <template #title>
            <div class="flex align-center">
              <div class="collapse-title-icon" style="background: rgba(119, 118, 255, 0.8)"></div>
              <span class="collapse-title-font"> 其他资源（估算）&emsp;{{ numberFloor(calculationResult.otherTotalDraw, 0) }}抽 </span>
            </div>
          </template>
          <activity-gacha-resources
            v-for="(honeyCake, label) in otherRewardBySchedules"
            :key="label"
            :info="honeyCake"
            v-show="rewardIsExpired(honeyCake) && rewardIsEmpty(honeyCake)"
          >
          </activity-gacha-resources>
        </el-collapse-item>

        <el-collapse-item name="links" class="collapse-item" style="display: none">
          <template #title>
            <div class="collapse-title-icon" style="background: rgba(119, 118, 255, 0.8)"></div>
            <span class="collapse-title-font"> 相关链接 </span>
          </template>
        </el-collapse-item>
      </el-collapse>
    </div>
  </div>
</template>

<style scoped>
.test {
  background: linear-gradient(45deg, #ff6b6b, #ffa94d, #ffd43b, #69db7c, #4dabf7, #a685e2);
}
</style>
