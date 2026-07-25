<!--修改活动日期按钮请在变量"scheduleOptions"中修改，修改活动排期请在变量"HONEY_CAKE_TABLE"所引入的json文件中修改-->
<script setup>
import { watch, onMounted, onBeforeUnmount, ref, computed, nextTick } from "vue";
import Dexie from "dexie";
import "/src/assets/css/tool/gacha_calc.scss";
import "/src/assets/css/sprite/sprite_plane_icon.css";

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

const GACHA_VIDEO_DRAFT_ID = "current";
const GACHA_VIDEO_SETTINGS_STORAGE_KEY = "logicalByte_gachaCalculatorPerspective_settings_v1";
const gachaVideoDraftDb = new Dexie("LogicalByteGachaCalculatorPerspective");
gachaVideoDraftDb.version(1).stores({
  drafts: "id, updatedAt",
});
gachaVideoDraftDb.version(2).stores({
  drafts: "id, updatedAt",
  poolImages: "id, updatedAt",
});

// 当前路由
const route = useRoute();
const eachOriginalDrawPrice = 648.0 / 185 / 0.3;

function getDrawEfficiencyStyle(drawEfficiency) {
  if (drawEfficiency > 1.57) {
    return `background-color:${"#ff6400"};color:white`;
  }

  if (drawEfficiency > 1) {
    return `background-color:${"#a16fff"};color:white`;
  }

  return `background-color:${"#4380ff"};color:white`;
}

function formatDrawPrice(num) {
  if (typeof num !== "number") {
    return "非数字";
  }

  return num.toFixed(2);
}

function withOriginiumDrawInfo(pack) {
  const draws = (pack.originium || 0) * 0.3;
  const drawPrice = draws > 0 ? pack.price / draws : 0;
  return {
    ...pack,
    draws,
    drawPrice,
    drawEfficiency: drawPrice > 0 ? eachOriginalDrawPrice / drawPrice : 0,
  };
}

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
].map(withOriginiumDrawInfo));

// 罗德岛蜜饼工坊预测的其他奖励排期
let otherRewardBySchedules = ref([]);

// 罗德岛蜜饼工坊预测的活动排期
let activityScheduleList = ref({});

//当前时间戳（可自定义用于模拟未来时间）
const currentTimestamp = ref(new Date().getTime());

//当前日期（用于日期选择器绑定）
const currentDate = ref(new Date());

//选中的黄票兑换抽卡券
let selectedCertificatePackList = ref([]);

//选中的潜在章节
let selectedPermanentZoneName = ref([]);

//选中的活动名称
let selectedActivityName = ref([]);

//选择的礼包索引
let selectedPackCollect = ref([]);

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
  const oneDayTimeStamp = 60 * 60 * 24 * 1000;
  // 清空之前的维护奖励数据
  otherRewardBySchedules.value = otherRewardBySchedules.value.filter((item) => !item.name.includes("游戏维护"));

  for (const activity in activityScheduleList.value) {
    let activityData = activityScheduleList.value[activity];


    if (activityData.defaultStatus) {
      console.log(activityData.name);
      selectedActivityName.value.push(activityData.name);
      otherRewardBySchedules.value.push(_createServerMaintenanceRewards(activityData.start));

    }
  }

  function _createServerMaintenanceRewards(timeStamp) {
    let month = new Date(timeStamp).getMonth() + 1;

    let reward = {
      name: `游戏维护(${month}月)`,
      originium: 0,
      orundum: 200,
      gachaTicket: 0,
      tenGachaTicket: 0,
      start: timeStamp + oneDayTimeStamp,
      end: timeStamp + oneDayTimeStamp * 2,
      rewardType: "公共",
      rewardModule: "otherResources",
      probability: "",
    };

    return reward;
  }


}

//用户选择的活动
let currentScheduleName = ref("Ave Mujica联动");

//用户选择的活动的结束时间
let endDate = ref(new Date(1711008000000));

batchGenerationServerMaintenanceRewards();

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
const isLinkedLimitedActivity = computed(() => ["联动限定", "联动限定复刻"].includes(activityType.value));
const isDoubleLinkedLimitedActivity = computed(() => activityType.value === "双联动限定");
const isNormalLimitedActivity = computed(() => !isLinkedLimitedActivity.value && !isDoubleLinkedLimitedActivity.value);
const canUseLinkedLimitedRewards = computed(() => activityType.value === "联动限定" || isDoubleLinkedLimitedActivity.value);

/**
 * 联动限定活动对应的概率键名
 * 根据当前选中的活动名称返回正确的概率表键名
 */
const linkedProbKeys = computed(() => {
  if (currentScheduleName.value === "怪猎联动二期") {
    return {
      limited6: "怪猎二期获得UP6星干员",
      all: "怪猎二期获得UP6星干员和UP5星干员",
      fullPotential: "怪猎二期全满潜",
    };
  }
  // 默认：怪猎一期复刻或其他联动限定活动
  return {
    limited6: "怪猎一期获得UP6星干员",
    all: "怪猎一期获得UP6星干员和全部2名UP5星干员",
    fullPotential: "怪猎一期全满潜",
  };
});

function rewardTypeMatchesCurrentActivity(rewardType) {
  if (rewardType === "公共" || rewardType === activityType.value) {
    return true;
  }

  return rewardType === "联动限定" && canUseLinkedLimitedRewards.value;
}

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
    name: "夏活",
    dateString: "2026.08.14",
    start: new Date("2026/08/01 12:00:00"),
    end: new Date("2026/08/14 04:00:00"),
    activityType: "夏活限定",
    disabled: false,
    dailyGiftResources: true,
    accuracyFlag: true,
    historyStartTime: new Date("2025/08/01 12:00:00"),
    historyEndTime: new Date("2025/08/14 04:00:00"),
  },
  {
    name: "半周年",
    dateString: "2026.11.14",
    start: new Date("2026/11/01 12:00:00"),
    end: new Date("2026/11/14 04:00:00"),
    activityType: "周年限定",
    disabled: false,
    dailyGiftResources: true,
    accuracyFlag: true,
    historyStartTime: new Date("2025/11/01 12:00:00"),
    historyEndTime: new Date("2025/11/14 04:00:00"),
  },
];

currentScheduleName.value = scheduleOptions[0].name;
currentSchedule.value = scheduleOptions[0];
endDate.value = scheduleOptions[0].end;
activityType.value = scheduleOptions[0].activityType;

const packDataLoadingStatus = ref(false);

//新人礼包集合
let listNewBiePackInfo = ref([]);

//每年重置的首充源石
let originiumPackList = ref([]);

//上一年年重置的首充源石
let listLastYearOriginiumPack = ref([]);
const shouldShowLastYearOriginiumPack = computed(() => dateRangeIncludesMayFirst(currentTimestamp.value, currentSchedule.value.end));

//每月重置的礼包集合
let monthlyPackList = ref([]);

//限时礼包集合
let activityPackInfoList = ref([]);

//历史礼包集合
let packListGroupByHistory = ref([]);

function dateRangeIncludesMayFirst(startTimestamp, endDate) {
  const start = new Date(startTimestamp);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return false;
  }

  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999).getTime();

  if (startDay > endDay) {
    return false;
  }

  for (let year = start.getFullYear(); year <= end.getFullYear(); year++) {
    const mayFirst = new Date(year, 4, 1).getTime();
    if (mayFirst >= startDay && mayFirst <= endDay) {
      return true;
    }
  }

  return false;
}

function clearLastYearOriginiumPackSelection() {
  if (shouldShowLastYearOriginiumPack.value || listLastYearOriginiumPack.value.length === 0) {
    return;
  }

  const hiddenPackIds = new Set(listLastYearOriginiumPack.value.map((pack) => pack.id));
  selectedPackCollect.value = selectedPackCollect.value.filter((packId) => !hiddenPackIds.has(packId));
}

//全部礼包集合
let displayPackList = ref([]);

//每月黄票兑换抽卡券(视为礼包)集合
let certificatePackList = ref([]);

//礼包缓存数据
let packCacheList = ref([]);

/**
 * 生成一个较短的随机 ID，含时间戳防碰撞
 * @returns {string}
 */
function createId() {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  for (let i = 0; i < 6; i++) {
    id += chars[(Math.random() * chars.length) | 0];
  }
  return id + Date.now().toString(36);
}
// 输出示例: "k7m3x9lkd4n5ab"（约18位）

/**
 * 获取和分类礼包数据
 */
async function getAndSortPackData() {
  // 清空之前的数据，避免重复
  packCacheList.value = [];
  listNewBiePackInfo.value = [];
  originiumPackList.value = [];
  listLastYearOriginiumPack.value = [];

  activityPackInfoList.value = [];

  packDataLoadingStatus.value = true;
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

    if ("月卡" === officialName) {
      continue;
    }

    let packInfoVO = _packPromotionRatioCalc(item);

    // 所有礼包都加入缓存，包括过期的礼包（供 getHistoryPackInfo 筛选往年礼包使用）
    packCacheList.value.push(packInfoVO);

    if (packInfoVO.drawPrice === 0) {
      continue;
    }

    // 只有未过期的礼包才进入后续分类和显示逻辑
    if (packInfoVO.end < currentTimestamp.value) {
      continue;
    }

    //给每个礼包都绑定一个索引
    packInfoVO.id = createId();
    //将礼包写入全部礼包集合
    displayPackList.value.push(packInfoVO);
    //礼包索引递增

    //根据礼包类型进行分类
    if (packInfoVO.saleType === "newbie") {
      listNewBiePackInfo.value.push(packInfoVO);
    }

    if (packInfoVO.saleType === "originium2") {
      originiumPackList.value.push(packInfoVO);
      let packClone = deepClone(packInfoVO);
      packClone.id = createId();
      //将礼包写入全部礼包集合
      displayPackList.value.push(packClone);
      //礼包索引递增

      listLastYearOriginiumPack.value.push(packClone);
    }

    // if (packInfoVO.saleType === "monthly") {
    //    console.log(packInfoVO);

    //   monthlyPackList.value.push(packInfoVO);
    //   console.log("读取是否买月卡配置", userConfigV2.value.monthlyCardSelected);
    //   if (userConfigV2.value.monthlyCardSelected) {
    //     [selectedPackCollect.value.push(packInfoVO.id)];
    //   }
    // }

    if (packInfoVO.saleType === "activity") {
      activityPackInfoList.value.push(packInfoVO);
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
}

function getHistoryPackInfo() {
  const scheduleStart = currentSchedule.value.start;
  const scheduleEnd = currentSchedule.value.end;
  const historicalPackStart = currentSchedule.value.historyStartTime;
  const historicalPackEnd = currentSchedule.value.historyEndTime;

  let list = [];

  for (let pack of packCacheList.value) {
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
 * 批量生成每月寻访组合包
 */
function batchGenerationMonthlyPack() {
  monthlyPackList.value = [];
  certificatePackList.value = []; // 清空黄票兑换列表
  displayPackList.value = [];
  const date = new Date(currentTimestamp.value);
  let month = date.getMonth() + 1;
  let year = date.getFullYear();

  const monthlyCardPack = {
    id: createId(),
    officialName: "月卡",
    originium: 6,
    orundum: 6000,
    gachaTicket: 0,
    tenGachaTicket: 0,
    price: 30,
    drawEfficiency: 4.5924324324324335,
    drawPrice: 2.542372881355932,
    start: new Date().getTime(),
    end: new Date("2099/12/31 00:01:00").getTime(),
  };

  monthlyPackList.value.push(monthlyCardPack);
  displayPackList.value.push(monthlyCardPack);
  if (userConfigV2.value.monthlyCardSelected) {
    selectedPackCollect.value.push(monthlyCardPack.id);
  }

  for (let i = 0; i < 8; i++) {
    const lastDay = new Date(year, month, 0).getDate().toString().padStart(2, "");
    const monthlyPack = {
      id: createId(),
      officialName: `${month}月寻访组合包`,
      gachaTicket: 0,
      tenGachaTicket: 1,
      originium: 42,
      orundum: 0,
      price: 168,
      drawPrice: 7.43362831858407,
      drawEfficiency: 1.570656370656371,
      start: new Date(`${year}/${month.toString().padStart(2, "0")}/01 00:00:00`),
      end: new Date(`${year}/${month.toString().padStart(2, "0")}/${lastDay} 23:59:59`),
    };

    const certificatePack = {
      id: `${year}-${month}月黄票兑换单抽`,
      officialName: `${month}月黄票兑换单抽`,
      gachaTicket: 8,
      tenGachaTicket: 3,
      originium: 0,
      orundum: 0,
      start: new Date(`${year}/${month.toString().padStart(2, "0")}/01 00:00:00`),
      end: new Date(`${year}/${month.toString().padStart(2, "0")}/${lastDay} 23:59:59`),
    };
    certificatePackList.value.push(certificatePack);

    monthlyPackList.value.push(monthlyPack);
    displayPackList.value.push(monthlyPack);

    if (month >= 12) {
      month = 1;
      year++;
    } else {
      month++;
    }
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

const cardTitles = {
  calculationResult: "总览",
  daily: "日常积累",
  custom: "搓玉/绿票/黄票换抽",
  recharge: "氪金方案",
  activity: "活动获得",
  other: "其他资源",
};
const activeCardName = ref("calculationResult");
const dataPanelCardName = ref("calculationResult");
const activeCardTitle = computed(() => cardTitles[activeCardName.value] ?? "");
const settingsTab = ref("canvas");
const displayBackgroundColor = ref("#f5f7fa");
const leftPerspective = ref(14);
const rightPerspective = ref(14);
const stageTopMargin = ref(96);
const stageBottomMargin = ref(0);
const stageLeftMargin = ref(0);
const stageRightMargin = ref(0);
const cardGroupWidth = ref(420);
const displayStageStyle = computed(() => ({
  backgroundColor: displayBackgroundColor.value,
  "--gacha-left-perspective": `${leftPerspective.value}deg`,
  "--gacha-left-hover-perspective": `${leftPerspective.value * 0.28}deg`,
  "--gacha-left-active-perspective": `${leftPerspective.value * 0.1}deg`,
  "--gacha-right-perspective": `${-rightPerspective.value}deg`,
  "--gacha-right-perspective-space": `${rightPerspective.value * 20}px`,
  "--gacha-stage-top-margin": `${stageTopMargin.value}px`,
  "--gacha-stage-bottom-margin": `${stageBottomMargin.value}px`,
  "--gacha-stage-left-margin": `${stageLeftMargin.value}px`,
  "--gacha-stage-right-margin": `${stageRightMargin.value}px`,
  "--gacha-navigation-width": `${cardGroupWidth.value}px`,
}));

const videoPoolOptions = [
  { id: "summer", scheduleIndex: 0, label: "夏活图片", title: "夏活", endDate: "8.14 结束" },
  { id: "halfAnniversary", scheduleIndex: 1, label: "半周年图片", title: "半周年", endDate: "11.14 结束" },
];
const selectedVideoPool = ref("summer");
const videoPoolImages = ref({
  summer: "",
  halfAnniversary: "",
});
const videoPoolImageUrls = {};

function setVideoPoolImage(poolId, imageFile) {
  if (!Object.hasOwn(videoPoolImages.value, poolId)) {
    return;
  }

  if (videoPoolImageUrls[poolId]) {
    URL.revokeObjectURL(videoPoolImageUrls[poolId]);
  }

  videoPoolImageUrls[poolId] = "";
  videoPoolImages.value[poolId] = "";

  if (!imageFile) {
    return;
  }

  const imageUrl = URL.createObjectURL(imageFile);
  videoPoolImageUrls[poolId] = imageUrl;
  videoPoolImages.value[poolId] = imageUrl;
}

function selectVideoPool(poolId) {
  const pool = videoPoolOptions.find((item) => item.id === poolId);
  if (!pool) {
    return;
  }

  selectedVideoPool.value = poolId;
  calPoolEnd.value = true;
  updateScheduleOption(pool.scheduleIndex);
}

function selectVideoCard(cardName) {
  activeCardName.value = cardName;
  dataPanelCardName.value = cardName;
}

function updateVideoPoolImage(poolId, uploadFile) {
  if (!uploadFile?.raw) {
    return;
  }

  setVideoPoolImage(poolId, uploadFile.raw);
  if (gachaVideoDraftRestored) {
    saveVideoPoolImage(poolId, uploadFile.raw);
  }
}

onBeforeUnmount(() => {
  window.removeEventListener("pagehide", persistVideoGachaSettings);
  if (gachaVideoDraftRestored) {
    saveVideoGachaSettings();
  }

  if (gachaVideoDraftSaveTimer) {
    clearTimeout(gachaVideoDraftSaveTimer);
    gachaVideoDraftSaveTimer = 0;
    saveVideoGachaDraft();
  }

  for (const imageUrl of Object.values(videoPoolImageUrls)) {
    if (imageUrl) {
      URL.revokeObjectURL(imageUrl);
    }
  }
});

function rewardDraws(reward) {
  return numberFloor(
    (reward.orundum || 0) / 600 + (reward.originium || 0) * 0.3 + (reward.gachaTicket || 0) + (reward.tenGachaTicket || 0) * 10,
    1
  );
}

const videoOverviewSources = computed(() => [
  { label: "日常积累", draws: numberFloor(calculationResult.value.dailyTotalDraw, 0), tone: "daily" },
  { label: "兑换与搓玉", draws: numberFloor(calculationResult.value.produceOrundumTotalDraw, 0), tone: "custom" },
  { label: "活动获得", draws: numberFloor(calculationResult.value.activityTotalDraw, 0), tone: "activity" },
  { label: "其他资源", draws: numberFloor(calculationResult.value.otherTotalDraw, 0), tone: "other" },
  { label: "氪金方案", draws: null, tone: "recharge" },
]);

const videoResourceIconClasses = {
  合成玉: "bg-icon_4003",
  源石: "bg-icon_4002",
  单抽: "bg-icon_7003",
  十连: "bg-icon_7004",
  抽: "bg-icon_7003",
};

function getVideoResourceIconClass(resourceName) {
  return videoResourceIconClasses[resourceName] || videoResourceIconClasses.抽;
}

const videoDailyRows = computed(() => [
  { label: `日常 ${dailyReward.value.daily} 天`, value: dailyReward.value.dailyOrundumReward, unit: "合成玉" },
  { label: `周常 ${dailyReward.value.weekly} 周`, value: dailyReward.value.weeklyOrundumReward, unit: "合成玉" },
  { label: `剿灭 ${dailyReward.value.annihilation} 周`, value: dailyReward.value.annihilationOrundumReward, unit: "合成玉" },
  { label: `绿票商店 ${dailyReward.value.certificateShoppingTimes} 月`, value: dailyReward.value.purchasedGachaTicketQuantity, unit: "单抽" },
  { label: `每月签到 ${dailyReward.value.checkIn} 次`, value: dailyReward.value.checkInGachaTicket, unit: "单抽" },
]);

const videoCustomRows = computed(() => {
  const yellowTicketDraws =
    selectedCertificateT2Group.value.reduce((total, item) => total + item.draw, 0) +
    certificatePackList.value
      .filter((pack) => selectedCertificatePackList.value.includes(pack.id) && rewardIsExpired(pack))
      .reduce((total, pack) => total + pack.gachaTicket + pack.tenGachaTicket * 10, 0);

  return [
    { label: "黄票换抽", value: yellowTicketDraws, unit: "抽" },
    { label: "绿票兑换", value: numberFloor(certificateStoreF3.value.orundum / 600, 1), unit: "抽" },
    {
      label: "搓玉",
      value: numberFloor((produceOrundum.value.outputByAp + produceOrundum.value.outputByItem) / 600, 1),
      unit: "抽",
    },
  ];
});

const videoActivityRows = computed(() =>
  Object.entries(activityScheduleList.value)
    .filter(([name, activity]) => {
      const isSelected = selectedActivityName.value.includes(name);
      return isSelected && ["act", "actRe"].includes(activity.rewardModule) && rewardIsExpired(activity);
    })
    .map(([name, activity]) => ({
      label: name,
      category: activity.rewardModule === "actRe" ? "复刻活动" : "后续活动",
      draws: rewardDraws(activity),
    }))
);

const videoOtherRows = computed(() =>
  otherRewardBySchedules.value
    .filter((reward) => rewardIsExpired(reward) && rewardIsEmpty(reward))
    .map((reward) => ({
      label: reward.name,
      draws: rewardDraws(reward),
    }))
);

const videoRechargePlans = [
  { id: "monthly-card", title: "仅月卡", items: ["月卡"] },
  { id: "monthly-card-plus-198", title: "月卡 + 198 礼包", items: ["月卡", "198 礼包"] },
  { id: "monthly-card-plus-two-large", title: "月卡 + 2 个大月卡", items: ["月卡", "大月卡 x 2"] },
];

const videoProbabilityMetrics = computed(() => {
  if (isNormalLimitedActivity.value) {
    return [
      { label: "拿到限定", value: currentProb.value.limited300 },
      { label: "限定加陪跑", value: currentProb.value.all300 },
    ];
  }

  if (isLinkedLimitedActivity.value) {
    return [
      { label: "拿到限定六星", value: currentProb.value[linkedProbKeys.value.limited6] },
      { label: "拿到全部 UP", value: currentProb.value[linkedProbKeys.value.all] },
    ];
  }

  return [
    { label: "拿到限定六星", value: currentProb.value.怪猎一期和二期都获得UP6星干员 },
    { label: "拿到全部 UP", value: currentProb.value.怪猎一期和二期都获得全部干员 },
  ];
});

function formatProbability(value) {
  return typeof value === "number" ? `${value.toFixed(1)}%` : "--";
}

watch(activeCardName, async (name) => {
  if (name !== "calculationResult" || !myChart) {
    return;
  }

  await nextTick();
  myChart.resize();
});

//日常资源
let dailyReward = ref({
  //距离卡池结束有多少天
  daily: 4,
  //日常奖励数量
  dailyOrundumReward: 0,
  //距离卡池结束有多少周
  weekly: 2,

  //周常奖励
  weeklyOrundumReward: 0,
  //可以在绿票商店购买几个月的前两层抽卡道具
  certificateShoppingTimes: 2,

  //绿票商店购买的合成玉数量
  purchasedOrundumQuantity: 0,
  //绿票商店购买的单抽数量
  purchasedGachaTicketQuantity: 0,
  //剿灭次数
  annihilation: 3,

  //剿灭合成玉奖励
  annihilationOrundumReward: 0,
  //签到次数
  checkIn: 3,
  //签到次数
  checkInGachaTicket: 0,
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
  //可用于兑换的绿票凭证
  disposableCertificate: 0,
  //可兑换合成玉
  orundum: 0,
});

const certificateStoreF3Options = [
  {
    id: 0,
    text: "还未兑换",
    cost: 0,
  },
  {
    id: 1,
    text: "已换一层",
    cost: 1490,
  },
  {
    id: 2,
    text: "已换二层单抽公招",
    cost: 1200,
  },
  {
    id: 3,
    text: "已换二层",
    cost: 9300,
  },
];

let selectedCertificateStoreF3Group = ref([0]);
let previousSelectedCertificateStoreF3Group = [0];

function handleCertificateStoreF3GroupChange(selectedOptions) {
  const clickedOption = certificateStoreF3Options.find((option) => {
    const isSelected = selectedOptions.includes(option.id);
    const wasSelected = previousSelectedCertificateStoreF3Group.includes(option.id);
    return isSelected !== wasSelected;
  });

  if (!clickedOption) {
    gachaResourcesCalculation();
    return;
  }

  if (clickedOption.id > 0) {
    selectedCertificateStoreF3Group.value = certificateStoreF3Options.filter((option) => option.id > 0 && option.id <= clickedOption.id).map((option) => option.id);
    previousSelectedCertificateStoreF3Group = selectedCertificateStoreF3Group.value;
    gachaResourcesCalculation();
    return;
  }

  const hasClearOption = selectedOptions.includes(0);
  const wasClearOptionSelected = previousSelectedCertificateStoreF3Group.includes(0);

  if (hasClearOption && !wasClearOptionSelected) {
    selectedCertificateStoreF3Group.value = [0];
    previousSelectedCertificateStoreF3Group = selectedCertificateStoreF3Group.value;
    gachaResourcesCalculation();
    return;
  }

  const maxSelectedOption = Math.max(0, ...selectedOptions.filter((option) => option > 0));
  selectedCertificateStoreF3Group.value = certificateStoreF3Options.filter((option) => option.id > 0 && option.id <= maxSelectedOption).map((option) => option.id);
  if (selectedCertificateStoreF3Group.value.length === 0) {
    selectedCertificateStoreF3Group.value = [0];
  }
  previousSelectedCertificateStoreF3Group = selectedCertificateStoreF3Group.value;
  gachaResourcesCalculation();
}

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

//攒抽计算结果
let calculationResult = ref({
  //总抽数
  totalDraw: 0,
  //充值总额
  totalAmountOfRecharge: 0,
  //月均氪金
  monthlyAverageRecharge: 0,
  //月卡氪金总额
  monthlyCardAmountOfRecharge: 0,
  //是否选中月卡
  monthlyCardSelected: false,
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
//官方月卡结束时间
const officialMonthlyCardEndDate = new Date("2026/05/25 04:00:00");
let officialMonthlyCardRemainingDays = ref(0);

const userConfigV2 = ref({
  existOrundum: 0,
  existOriginium: 0,
  existGachaTicket: 0,
  existTenGachaTicket: 0,
  correctOrundum: 0, //用于修正的合成玉数量
  skinBudget: 0, //要购买多少皮肤
  skinBudgetPlus: 0, // 要购买多少高级皮肤
  skinBudgetPro: 0, // 要购买多少顶级皮肤
  //是否使用源石抽卡
  originiumIsUsed: true,
  //周常是否完成
  weeklyTaskCompleted: true,
  //绿票商店是否换过
  certificateStoreCompleted: true,
  //剿灭是否完成
  annihilationCompleted: true,
  // 悖论模拟、剿灭模拟战
  paradox: 0,
  annihilation: 0,
  //黄票换抽
  selectedCertificatePackList: selectedCertificatePackList.value,
  //是否购买月卡
  monthlyCardSelected: true,
  //额外购买月卡数量
  monthlyCardExtraCount: 0,
});

let gachaVideoDraftRestored = false;
let gachaVideoDraftSaveTimer = 0;

function getPackPersistenceKey(pack) {
  return [pack.saleType || "", pack.officialName || "", pack.price || ""].join("\u0001");
}

function getSelectedPackPersistenceKeys(packList, selectedPackIds) {
  const selectedIds = new Set(selectedPackIds);
  return packList.filter((pack) => selectedIds.has(pack.id)).map(getPackPersistenceKey);
}

function restoreNumberSetting(target, value) {
  const numericValue = Number(value);
  if (Number.isFinite(numericValue)) {
    target.value = numericValue;
  }
}

function restoreArraySetting(value, fallback = []) {
  return Array.isArray(value) ? value : fallback;
}

function restoreObjectFields(target, source, ignoredKeys = []) {
  if (!source || typeof source !== "object") {
    return;
  }

  for (const key of Object.keys(target)) {
    if (!ignoredKeys.includes(key) && Object.hasOwn(source, key)) {
      target[key] = source[key];
    }
  }
}

function getVideoGachaDraft() {
  return {
    id: GACHA_VIDEO_DRAFT_ID,
    updatedAt: Date.now(),
    canvas: {
      displayBackgroundColor: displayBackgroundColor.value,
      leftPerspective: leftPerspective.value,
      rightPerspective: rightPerspective.value,
      stageTopMargin: stageTopMargin.value,
      stageBottomMargin: stageBottomMargin.value,
      stageLeftMargin: stageLeftMargin.value,
      stageRightMargin: stageRightMargin.value,
      cardGroupWidth: cardGroupWidth.value,
    },
    view: {
      settingsTab: settingsTab.value,
      activeCardName: activeCardName.value,
      dataPanelCardName: dataPanelCardName.value,
      selectedVideoPool: selectedVideoPool.value,
    },
    calculation: {
      userConfig: { ...userConfigV2.value },
      calPoolEnd: calPoolEnd.value,
      selectedCertificatePackList: [...selectedCertificatePackList.value],
      selectedCertificateT2Texts: selectedCertificateT2Group.value.map((item) => item.text),
      produceOrundum: {
        ap: produceOrundum.value.ap,
        coEfficient: produceOrundum.value.coEfficient,
        itemId30012: produceOrundum.value.itemId30012,
        itemId30062: produceOrundum.value.itemId30062,
      },
      certificateStoreF3: {
        certificates: certificateStoreF3.value.certificates,
      },
      selectedCertificateStoreF3Group: [...selectedCertificateStoreF3Group.value],
      selectedPermanentZoneName: [...selectedPermanentZoneName.value],
      selectedActivityName: [...selectedActivityName.value],
      selectedPackKeys: getSelectedPackPersistenceKeys(displayPackList.value, selectedPackCollect.value),
      selectedHistoryPackKeys: getSelectedPackPersistenceKeys(packListGroupByHistory.value, selectedHistoryPackIndex.value),
      originiumQuantities: Object.fromEntries(OriginiumTable.value.map((item) => [item.packName, item.quantity])),
    },
  };
}

function saveVideoGachaSettings() {
  try {
    localStorage.setItem(GACHA_VIDEO_SETTINGS_STORAGE_KEY, JSON.stringify(getVideoGachaDraft()));
  } catch (error) {
    console.warn("Failed to save gacha video settings.", error);
  }
}

async function saveVideoPoolImage(poolId, imageFile) {
  try {
    if (imageFile) {
      await gachaVideoDraftDb.table("poolImages").put({
        id: poolId,
        imageFile,
        updatedAt: Date.now(),
      });
      return;
    }

    await gachaVideoDraftDb.table("poolImages").delete(poolId);
  } catch (error) {
    console.warn(`Failed to save ${poolId} pool image.`, error);
  }
}

async function saveVideoGachaDraft() {
  saveVideoGachaSettings();

  try {
    await gachaVideoDraftDb.table("drafts").put(getVideoGachaDraft());
  } catch (error) {
    console.warn("Failed to save gacha video draft.", error);
  }
}

function queueVideoGachaDraftSave() {
  if (!gachaVideoDraftRestored) {
    return;
  }

  saveVideoGachaSettings();

  if (gachaVideoDraftSaveTimer) {
    clearTimeout(gachaVideoDraftSaveTimer);
  }

  gachaVideoDraftSaveTimer = window.setTimeout(() => {
    gachaVideoDraftSaveTimer = 0;
    saveVideoGachaDraft();
  }, 180);
}

function readVideoGachaSettings() {
  try {
    const rawSettings = localStorage.getItem(GACHA_VIDEO_SETTINGS_STORAGE_KEY);
    return rawSettings ? JSON.parse(rawSettings) : null;
  } catch (error) {
    console.warn("Failed to restore gacha video settings.", error);
    return null;
  }
}

async function readVideoPoolImages() {
  try {
    const records = await gachaVideoDraftDb.table("poolImages").toArray();
    return Object.fromEntries(
      records
        .filter((record) => videoPoolOptions.some((pool) => pool.id === record.id) && record.imageFile instanceof Blob)
        .map((record) => [record.id, record.imageFile])
    );
  } catch (error) {
    console.warn("Failed to restore gacha video pool images.", error);
    return {};
  }
}

async function readVideoGachaDraft() {
  const settings = readVideoGachaSettings();

  try {
    const [draft, poolImages] = await Promise.all([
      gachaVideoDraftDb.table("drafts").get(GACHA_VIDEO_DRAFT_ID),
      readVideoPoolImages(),
    ]);
    if (!settings) {
      return draft
        ? {
            ...draft,
            poolImages: Object.keys(poolImages).length ? poolImages : draft.poolImages || {},
          }
        : Object.keys(poolImages).length
          ? { poolImages }
          : null;
    }

    return {
      ...settings,
      poolImages: Object.keys(poolImages).length ? poolImages : draft?.poolImages || {},
    };
  } catch (error) {
    console.warn("Failed to restore gacha video draft.", error);
    return settings;
  }
}

function persistVideoGachaSettings() {
  if (gachaVideoDraftRestored) {
    saveVideoGachaSettings();
  }
}

function restoreVideoGachaDraft(draft) {
  if (!draft || typeof draft !== "object") {
    return;
  }

  const canvas = draft.canvas || {};
  if (typeof canvas.displayBackgroundColor === "string") {
    displayBackgroundColor.value = canvas.displayBackgroundColor;
  }
  restoreNumberSetting(leftPerspective, canvas.leftPerspective);
  restoreNumberSetting(rightPerspective, canvas.rightPerspective);
  restoreNumberSetting(stageTopMargin, canvas.stageTopMargin);
  restoreNumberSetting(stageBottomMargin, canvas.stageBottomMargin);
  restoreNumberSetting(stageLeftMargin, canvas.stageLeftMargin);
  restoreNumberSetting(stageRightMargin, canvas.stageRightMargin);
  restoreNumberSetting(cardGroupWidth, canvas.cardGroupWidth);

  const view = draft.view || {};
  if (view.settingsTab === "canvas" || view.settingsTab === "data") {
    settingsTab.value = view.settingsTab;
  }
  if (Object.hasOwn(cardTitles, view.activeCardName)) {
    activeCardName.value = view.activeCardName;
  }
  if (Object.hasOwn(cardTitles, view.dataPanelCardName)) {
    dataPanelCardName.value = view.dataPanelCardName;
  }
  if (videoPoolOptions.some((pool) => pool.id === view.selectedVideoPool)) {
    selectedVideoPool.value = view.selectedVideoPool;
  }

  const calculation = draft.calculation || {};
  restoreObjectFields(userConfigV2.value, calculation.userConfig, ["selectedCertificatePackList"]);
  if (typeof calculation.calPoolEnd === "boolean") {
    calPoolEnd.value = calculation.calPoolEnd;
  }
  selectedCertificatePackList.value = restoreArraySetting(calculation.selectedCertificatePackList);
  selectedCertificateT2Group.value = certificateT2Group.filter((item) =>
    restoreArraySetting(calculation.selectedCertificateT2Texts).includes(item.text)
  );
  restoreObjectFields(produceOrundum.value, calculation.produceOrundum, ["outputByAp", "outputByItem", "itemId4001"]);
  restoreObjectFields(certificateStoreF3.value, calculation.certificateStoreF3, [
    "remainingCertificates",
    "disposableCertificate",
    "orundum",
  ]);

  const selectedStoreGroups = restoreArraySetting(calculation.selectedCertificateStoreF3Group).filter((item) =>
    Number.isInteger(item)
  );
  selectedCertificateStoreF3Group.value = selectedStoreGroups.length ? selectedStoreGroups : [0];
  previousSelectedCertificateStoreF3Group = [...selectedCertificateStoreF3Group.value];
  selectedPermanentZoneName.value = restoreArraySetting(calculation.selectedPermanentZoneName);
  selectedActivityName.value = restoreArraySetting(calculation.selectedActivityName);

  if (calculation.originiumQuantities && typeof calculation.originiumQuantities === "object") {
    for (const item of OriginiumTable.value) {
      const savedQuantity = Number(calculation.originiumQuantities[item.packName]);
      if (Number.isFinite(savedQuantity)) {
        item.quantity = savedQuantity;
      }
    }
  }

  const poolImages = draft.poolImages || {};
  for (const pool of videoPoolOptions) {
    if (poolImages[pool.id] instanceof Blob) {
      setVideoPoolImage(pool.id, poolImages[pool.id]);
    }
  }
}

function restoreVideoGachaPackSelections(calculation) {
  if (!calculation || typeof calculation !== "object") {
    return;
  }

  if (Array.isArray(calculation.selectedPackKeys)) {
    const selectedKeys = new Set(calculation.selectedPackKeys);
    selectedPackCollect.value = displayPackList.value
      .filter((pack) => selectedKeys.has(getPackPersistenceKey(pack)))
      .map((pack) => pack.id);
  }

  if (Array.isArray(calculation.selectedHistoryPackKeys)) {
    const selectedKeys = new Set(calculation.selectedHistoryPackKeys);
    selectedHistoryPackIndex.value = packListGroupByHistory.value
      .filter((pack) => selectedKeys.has(getPackPersistenceKey(pack)))
      .map((pack) => pack.id);
  }
}

watch(
  [
    displayBackgroundColor,
    leftPerspective,
    rightPerspective,
    stageTopMargin,
    stageBottomMargin,
    stageLeftMargin,
    stageRightMargin,
    cardGroupWidth,
    settingsTab,
    activeCardName,
    dataPanelCardName,
    selectedVideoPool,
    userConfigV2,
    calPoolEnd,
    selectedCertificatePackList,
    selectedCertificateT2Group,
    produceOrundum,
    certificateStoreF3,
    selectedCertificateStoreF3Group,
    selectedPermanentZoneName,
    selectedActivityName,
    selectedPackCollect,
    selectedHistoryPackIndex,
    OriginiumTable,
  ],
  queueVideoGachaDraftSave,
  { deep: true }
);

/**
 * 计算抽卡资源
 */
function gachaResourcesCalculation() {
  logs = [];

  if (calPoolEnd.value) {
    endDate.value = currentSchedule.value.end;
  } else {
    const startTimeStamp = currentSchedule.value.start.getTime();

    endDate.value = new Date(startTimeStamp + 12 * 60 * 60 * 1000);
  }

  //饼图数据暂存区
  let pieChartDataTmp = [];

  calculationResult.value.orundum = 0;
  calculationResult.value.originium = 0;
  calculationResult.value.gachaTicket = 0;
  calculationResult.value.tenGachaTicket = 0;
  calculationResult.value.existTotalDraw = 0;
  calculationResult.value.potentialTotalDraw = 0;

  clearLastYearOriginiumPackSelection();
  dailyRewardCalculate();
  produceOrundumCalculate();
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
    if (userConfigV2.value.weeklyTaskCompleted) {
      weeks = mondayCount > 0 ? mondayCount - 1 : mondayCount;
    }

    //如果本周已经打剿了则打剿次数减1
    if (userConfigV2.value.annihilationCompleted) {
      annihilationTimes = mondayCount > 0 ? mondayCount - 1 : mondayCount;
    }

    //如果本月已清空绿票商店则购买商店次数减1
    if (userConfigV2.value.certificateStoreCompleted) {
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

    // 计算官方月卡
    if (endDate.value < officialMonthlyCardEndDate) {
      officialMonthlyCardRemainingDays.value = dateDiff(new Date(), endDate.value);
    } else {
      officialMonthlyCardRemainingDays.value = dateDiff(new Date(), officialMonthlyCardEndDate);
    }

    officialMonthlyCardReward.value = officialMonthlyCardRemainingDays.value * 200;
    orundum += officialMonthlyCardReward.value;

    //判断源石是否用于抽卡
    if (!userConfigV2.value.originiumIsUsed) {
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
    let orundum = stringToNumber(userConfigV2.value.existOrundum);
    let originium = stringToNumber(userConfigV2.value.existOriginium);
    const gachaTicket = stringToNumber(userConfigV2.value.existGachaTicket);
    const tenGachaTicket = stringToNumber(userConfigV2.value.existTenGachaTicket);

    //计算用户自定义修正的合成玉
    orundum += stringToNumber(userConfigV2.value.correctOrundum.toString());
    //计算用户预留给皮肤的源石
    originium -= stringToNumber(userConfigV2.value.skinBudget.toString()) * 18;
    //计算用户预留给高级皮肤的源石
    originium -= stringToNumber(userConfigV2.value.skinBudgetPlus.toString()) * 21;
    //计算用户预留给顶级皮肤的源石
    originium -= stringToNumber(userConfigV2.value.skinBudgetPro.toString()) * 24;

    if (!userConfigV2.value.originiumIsUsed) {
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
    for (const item of certificatePackList.value) {
      if (!selectedCertificatePackList.value.includes(item.id)) {
        continue;
      }
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
    const remainingCost = certificateStoreF3Options
      .filter((option) => !selectedCertificateStoreF3Group.value.includes(option.id))
      .reduce((total, option) => total + option.cost, 0);
    certificateStoreF3.value.remainingCertificates = Math.max(0, certificates - remainingCost);
    certificateStoreF3.value.disposableCertificate = certificateStoreF3.value.remainingCertificates;
    certificateStoreF3.value.orundum = Math.floor((certificateStoreF3.value.disposableCertificate / 50) * 30);
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
    orundum += userConfigV2.value.paradox * 200;
    //计算剿灭模拟的合成玉
    orundum += userConfigV2.value.annihilation * 1500;

    //计算选中的常驻章节或活动的资源
    if (selectedPermanentZoneName.value) {
      //循环选中的章节按钮的索引，获得对应的章节奖励
      for (const index of selectedPermanentZoneName.value) {
        const potential = POTENTIAL_TABLE[index];
        originium += parseInt(potential.gachaOriginium);
        orundum += parseInt(potential.gachaOrundum);
      }
    }

    if (!userConfigV2.value.originiumIsUsed) {
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
    let monthlyCardAmountOfRecharge = 0;

    for (const pack of packListGroupByHistory.value) {
      if (!selectedHistoryPackIndex.value.includes(pack.id)) {
        continue;
      }

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
    if (packDataLoadingStatus.value) {
      userConfigV2.value.monthlyCardSelected = false;
    }

    for (const pack of displayPackList.value) {
      if (!selectedPackCollect.value.includes(pack.id)) {
        continue;
      }
      if (!pack) {
        continue;
      }

      if (!rewardIsExpired(pack)) {
        continue;
      }

      //月卡单独处理
      if (pack.officialName === "月卡") {
        userConfigV2.value.monthlyCardSelected = true;
        //计算卡池结束前月卡可以拿到多少合成玉
        pack.orundum = dailyReward.value.daily * 200;
        //卡池结束前可以购买月卡的数量
        let purchaseQuantity = Math.ceil(dailyReward.value.daily / 30);

        //加上额外购买的月卡数量,判断是否额外购买了超过3个月
        if (userConfigV2.value.monthlyCardExtraCount > 3) {
          createMessage({ type: "error", text: "月卡只能提前购买90天" });
          userConfigV2.value.monthlyCardExtraCount -= 1;
          return;
        }

        // console.log(rechargeOption.value.additionalMonthlyCardPurchase)
        // if (rechargeOption.value.additionalMonthlyCardPurchase < purchaseQuantity) {
        //   createMessage({ type: 'error', text: '已经降到0了，不能再低了！' })
        //   return
        // }

        //加上额外购买的月卡数量
        purchaseQuantity += userConfigV2.value.monthlyCardExtraCount;
        //计算通过月卡总计获得多少源石
        pack.originium = purchaseQuantity * 6;
        if (pack.originium < 0) {
          createMessage({ type: "error", text: "已经降到0了，不能再低了！" });
          pack.originium = 0;
          userConfigV2.value.monthlyCardExtraCount += 1;
          return;
        }

        //月卡的价格=购买月卡的数量*30
        pack.price = purchaseQuantity * 30;
        monthlyCardAmountOfRecharge += pack.price;
        //当月月卡已购买源石-6
        // if (rechargeOption.value.monthlyCardPurchasedThisMonth) {
        //   pack.originium -= 6
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

    if (!userConfigV2.value.originiumIsUsed) {
      originium = 0;
    }

    calculationResult.value.orundum += orundum;
    calculationResult.value.originium += originium;
    calculationResult.value.gachaTicket += gachaTicket;
    calculationResult.value.tenGachaTicket += tenGachaTicket;
    calculationResult.value.totalAmountOfRecharge = totalAmountOfRecharge;
    calculationResult.value.monthlyCardAmountOfRecharge = monthlyCardAmountOfRecharge;

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

    if (!userConfigV2.value.originiumIsUsed) {
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

    if (!userConfigV2.value.originiumIsUsed) {
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

  if (userConfigV2.value.originiumIsUsed) {
    calculationResult.value.totalDraw = calculationResult.value.totalDraw + Math.floor(calculationResult.value.originium * 0.3);
    singleResourceDraws.value.originium = Math.floor(calculationResult.value.originium * 0.3);
  }

  logs.push({ key: "计算源石后", value: calculationResult.value.totalDraw });

  const calculationDays = dailyReward.value.daily;
  const monthlyAverageBaseRecharge = calculationResult.value.totalAmountOfRecharge - calculationResult.value.monthlyCardAmountOfRecharge;
  calculationResult.value.monthlyAverageRecharge = calculationDays > 0 ? (monthlyAverageBaseRecharge / calculationDays) * 30 : 0;

  if (userConfigV2.value.monthlyCardSelected) {
    calculationResult.value.monthlyAverageRecharge += 30;
  }

  // console.table(logs)

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
    return rewardTypeMatchesCurrentActivity(reward.rewardType);
  }

  return true;
}

function rewardIsEmpty(reward) {
  return reward.orundum + reward.originium + reward.gachaTicket + reward.tenGachaTicket >= 1;
}

let myChart = void 0;

function setPieChart(data) {
  if (!myChart) {
    return;
  }

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
 * @property {number} 怪猎一期获得UP6星干员
 * @property {number} 怪猎一期获得UP6星干员和全部2名UP5星干员
 * @property {number} 怪猎一期全满潜
 * @property {number} 怪猎二期获得UP6星干员
 * @property {number} 怪猎二期获得UP5星干员
 * @property {number} 怪猎二期获得UP6星干员和UP5星干员
 * @property {number} 怪猎二期全满潜
 * @property {number} 怪猎一期和二期都获得UP6星干员
 * @property {number} 怪猎一期和二期都获得全部干员
 * @property {number} 怪猎一期和二期都全满潜
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

const developerMode = ref(route.query.mode === "dev" ? "dev" : "");

watch(
  () => route.query.mode,
  (mode) => {
    developerMode.value = mode === "dev" ? "dev" : "";
  }
);

onMounted(async () => {
  const draft = await readVideoGachaDraft();
  restoreVideoGachaDraft(draft);
  await nextTick();

  const chartElement = document.getElementById("calculationResultPieChart");
  if (chartElement) {
    myChart = echarts.init(chartElement);
  }

  batchGenerationMonthlyPack();
  const selectedPool = videoPoolOptions.find((pool) => pool.id === selectedVideoPool.value) || videoPoolOptions[0];
  updateScheduleOption(selectedPool.scheduleIndex);
  await getAndSortPackData();
  restoreVideoGachaPackSelections(draft?.calculation);
  gachaResourcesCalculation();
  gachaVideoDraftRestored = true;
  window.addEventListener("pagehide", persistVideoGachaSettings);

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
    batchGenerationMonthlyPack();
    getAndSortPackData();
    gachaResourcesCalculation();
  }
}

const screenshotModeEnabled = ref(false);
const wideScreenModeEnabled = ref(false);

//截图模式
function handleBackground(enabled = screenshotModeEnabled.value) {
  screenshotModeEnabled.value = enabled;

  // 1. 所有 .collapse-item 阴影设为 0
  const items = document.querySelectorAll(".collapse-item");
  items.forEach((el) => {
    el.style.boxShadow = enabled ? "none" : "";
  });

  // 2. gachaCalculate 背景色设为绿色
  const gacha = document.getElementById("gachaCalculate");
  if (gacha) {
    gacha.style.backgroundColor = enabled ? "lime" : "";
  }
}

function wideScreenMode(enabled = wideScreenModeEnabled.value) {
  wideScreenModeEnabled.value = enabled;
  const videoMode = enabled ? "developer" : "pro";
  document.getElementById("gachaCalculate")?.setAttribute("data-video", videoMode);
  document.getElementById("resources-box")?.setAttribute("data-video", videoMode);
  document.getElementById("result-box")?.setAttribute("data-video", videoMode);
}

let clickCount = 0;
let clickCountTimer = null;

function triggerDEVmode() {
  clickCount++;

  if (clickCount >= 8) {
    developerMode.value = "dev";
    clickCount = 0;
  }

  clearTimeout(clickCountTimer);
  clickCountTimer = setTimeout(() => {
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
  <div class="gacha-card-editor">
    <aside class="gacha-card-settings gacha-card-settings-video" aria-label="参数调整">
      <div class="gacha-card-settings-title">参数调整</div>
      <el-tabs v-model="settingsTab" class="gacha-card-settings-tabs" stretch>
        <el-tab-pane label="画面" name="canvas">
          <div class="gacha-card-setting-image-upload">
            <span>夏活图片</span>
            <el-upload
              accept="image/*"
              :auto-upload="false"
              :show-file-list="false"
              :on-change="(file) => updateVideoPoolImage('summer', file)"
            >
              <el-button>上传</el-button>
            </el-upload>
          </div>
          <div class="gacha-card-setting-image-upload">
            <span>半周年图片</span>
            <el-upload
              accept="image/*"
              :auto-upload="false"
              :show-file-list="false"
              :on-change="(file) => updateVideoPoolImage('halfAnniversary', file)"
            >
              <el-button>上传</el-button>
            </el-upload>
          </div>
          <div class="gacha-card-setting-row">
            <span>背景</span>
            <el-color-picker v-model="displayBackgroundColor" show-alpha />
          </div>
          <div class="gacha-card-setting-range">
            <span>左侧透视</span>
            <el-slider v-model="leftPerspective" :min="0" :max="30" :step="0.1" show-input input-size="small" />
          </div>
          <div class="gacha-card-setting-range">
            <span>右侧透视</span>
            <el-slider v-model="rightPerspective" :min="0" :max="30" :step="0.1" show-input input-size="small" />
          </div>
          <div class="gacha-card-setting-range">
            <span>顶部边距</span>
            <el-slider v-model="stageTopMargin" :min="96" :max="280" :step="1" show-input input-size="small" />
          </div>
          <div class="gacha-card-setting-range">
            <span>底部边距</span>
            <el-slider v-model="stageBottomMargin" :min="0" :max="280" :step="1" show-input input-size="small" />
          </div>
          <div class="gacha-card-setting-range">
            <span>左侧边距</span>
            <el-slider v-model="stageLeftMargin" :min="0" :max="320" :step="1" show-input input-size="small" />
          </div>
          <div class="gacha-card-setting-range">
            <span>右侧边距</span>
            <el-slider v-model="stageRightMargin" :min="0" :max="320" :step="1" show-input input-size="small" />
          </div>
          <div class="gacha-card-setting-range">
            <span>卡片组宽度</span>
            <el-slider v-model="cardGroupWidth" :min="320" :max="640" :step="1" show-input input-size="small" />
          </div>
        </el-tab-pane>
        <el-tab-pane label="数据" name="data">
          <div v-if="activeCardName === 'calculationResult'" class="gacha-video-data-empty">卡池由左上图片切换</div>
          <div id="gacha-video-data-controls" class="gacha-video-data-panel"></div>
        </el-tab-pane>
      </el-tabs>
    </aside>

    <section class="gacha-card-stage" :class="{ 'is-data-controls': settingsTab === 'data' }" :style="displayStageStyle">
      <div
        class="gacha-calculation-page gacha-card-browser"
        :class="{ 'is-data-controls': settingsTab === 'data' }"
        id="gachaCalculate"
        data-video="pro"
      >
        <div class="gacha-card-stage-heading">攒抽计算器</div>
        <div v-if="activeCardTitle" class="gacha-card-detail-title">{{ activeCardTitle }}</div>
        <nav class="gacha-video-navigation" aria-label="视频页导航">
          <div class="gacha-video-pool-selector">
            <button
              v-for="pool in videoPoolOptions"
              :key="pool.id"
              type="button"
              class="gacha-video-pool-button"
              :class="{ 'is-active': selectedVideoPool === pool.id }"
            :title="pool.label"
            @click="selectVideoPool(pool.id)"
          >
              <span class="gacha-video-pool-image">
                <img v-if="videoPoolImages[pool.id]" :src="videoPoolImages[pool.id]" alt="" />
                <span v-else class="gacha-video-pool-placeholder"></span>
              </span>
              <span class="gacha-video-pool-copy">
                <strong>{{ pool.title }}</strong>
                <small>{{ pool.endDate }}</small>
              </span>
            </button>
          </div>
          <button
            type="button"
            class="gacha-video-nav-item"
            :class="{ 'is-active': activeCardName === 'calculationResult' }"
            @click="selectVideoCard('calculationResult')"
          >
            <span>总览</span>
            <strong>{{ numberFloor(calculationResult.totalDraw, 0) }} 抽</strong>
          </button>
          <button
            type="button"
            class="gacha-video-nav-item"
            :class="{ 'is-active': activeCardName === 'daily' }"
            @click="selectVideoCard('daily')"
          >
            <span>日常积累</span>
            <strong>{{ numberFloor(calculationResult.dailyTotalDraw, 0) }} 抽</strong>
          </button>
          <button
            type="button"
            class="gacha-video-nav-item"
            :class="{ 'is-active': activeCardName === 'custom' }"
            @click="selectVideoCard('custom')"
          >
            <span>搓玉 / 凭证</span>
            <strong>{{ numberFloor(calculationResult.produceOrundumTotalDraw, 0) }} 抽</strong>
          </button>
          <button
            type="button"
            class="gacha-video-nav-item"
            :class="{ 'is-active': activeCardName === 'activity' }"
            @click="selectVideoCard('activity')"
          >
            <span>活动获得</span>
            <strong>{{ numberFloor(calculationResult.activityTotalDraw, 0) }} 抽</strong>
          </button>
          <button
            type="button"
            class="gacha-video-nav-item"
            :class="{ 'is-active': activeCardName === 'other' }"
            @click="selectVideoCard('other')"
          >
            <span>其他资源</span>
            <strong>{{ numberFloor(calculationResult.otherTotalDraw, 0) }} 抽</strong>
          </button>
          <button
            type="button"
            class="gacha-video-nav-item"
            :class="{ 'is-active': activeCardName === 'recharge' }"
            @click="selectVideoCard('recharge')"
          >
            <span>氪金方案</span>
          </button>
        </nav>

        <section class="gacha-video-detail">
          <template v-if="activeCardName === 'calculationResult'">
            <div class="gacha-video-overview-hero">
              <span>可用抽数</span>
              <strong>{{ numberFloor(calculationResult.totalDraw, 0) }}</strong>
              <span class="gacha-video-hero-icon is-artwork" aria-label="寻访凭证">
                <img src="/image/temp/permit.webp" alt="" />
              </span>
            </div>
            <div class="gacha-video-overview-grid">
              <div class="gacha-video-source-list">
                <div v-for="source in videoOverviewSources" :key="source.label" class="gacha-video-source-row">
                  <span :class="`gacha-video-source-dot is-${source.tone}`"></span>
                  <span>{{ source.label }}</span>
                  <strong v-if="source.draws !== null" class="gacha-video-draw-value">
                    <span class="gacha-video-inline-icon"><span class="bg-icon_7003"></span></span>
                    {{ source.draws }}
                  </strong>
                </div>
              </div>
              <div class="gacha-video-resource-list">
                <div class="gacha-video-resource-item is-artwork">
                  <span class="gacha-video-resource-icon" aria-label="源石">
                    <img src="/image/icon/至纯源石.png" alt="" />
                  </span>
                  <strong>{{ calculationResult.originium }}</strong>
                  <small><span class="gacha-video-inline-icon"><span class="bg-icon_7003"></span></span>{{ singleResourceDraws.originium }}</small>
                </div>
                <div class="gacha-video-resource-item">
                  <span class="gacha-video-resource-icon" aria-label="合成玉"><span class="bg-icon_4003"></span></span>
                  <strong>{{ calculationResult.orundum }}</strong>
                  <small><span class="gacha-video-inline-icon"><span class="bg-icon_7003"></span></span>{{ singleResourceDraws.orundum }}</small>
                </div>
                <div class="gacha-video-resource-item">
                  <span class="gacha-video-resource-icon" aria-label="寻访凭证"><span class="bg-icon_7003"></span></span>
                  <strong>{{ calculationResult.gachaTicket }}</strong>
                  <small><span class="gacha-video-inline-icon"><span class="bg-icon_7003"></span></span>{{ singleResourceDraws.gachaTicket }}</small>
                </div>
                <div class="gacha-video-resource-item is-artwork">
                  <span class="gacha-video-resource-icon" aria-label="十连寻访凭证">
                    <img src="/image/icon/道具_十连寻访凭证.png" alt="" />
                  </span>
                  <strong>{{ calculationResult.tenGachaTicket }}</strong>
                  <small><span class="gacha-video-inline-icon"><span class="bg-icon_7003"></span></span>{{ singleResourceDraws.tenGachaTicket }}</small>
                </div>
              </div>
            </div>
            <div class="gacha-video-probability-list">
              <div v-for="metric in videoProbabilityMetrics" :key="metric.label" class="gacha-video-probability-item">
                <span>{{ metric.label }}</span>
                <strong>{{ formatProbability(metric.value) }}</strong>
              </div>
            </div>
          </template>

          <template v-else-if="activeCardName === 'daily'">
            <div class="gacha-video-section-hero">
              <span>日常积累</span>
              <strong>{{ numberFloor(calculationResult.dailyTotalDraw, 0) }}</strong>
              <span class="gacha-video-hero-icon" aria-label="寻访凭证"><span class="bg-icon_7003"></span></span>
              <small>从今天开始的稳定收入</small>
            </div>
            <div class="gacha-video-detail-rows">
              <div v-for="row in videoDailyRows" :key="row.label" class="gacha-video-detail-row">
                <span>{{ row.label }}</span>
                <strong>{{ row.value }}</strong>
                <small class="gacha-video-unit-icon" :aria-label="row.unit">
                  <span :class="getVideoResourceIconClass(row.unit)"></span>
                </small>
              </div>
            </div>
          </template>

          <template v-else-if="activeCardName === 'custom'">
            <div class="gacha-video-section-hero">
              <span>兑换与搓玉</span>
              <strong>{{ numberFloor(calculationResult.produceOrundumTotalDraw, 0) }}</strong>
              <span class="gacha-video-hero-icon" aria-label="寻访凭证"><span class="bg-icon_7003"></span></span>
              <small>按当前选择折算</small>
            </div>
            <div class="gacha-video-three-columns">
              <div v-for="row in videoCustomRows" :key="row.label" class="gacha-video-stat-column">
                <span>{{ row.label }}</span>
                <strong>{{ row.value }}</strong>
                <small class="gacha-video-unit-icon" :aria-label="row.unit">
                  <span :class="getVideoResourceIconClass(row.unit)"></span>
                </small>
              </div>
            </div>
          </template>

          <template v-else-if="activeCardName === 'activity'">
            <div class="gacha-video-section-hero">
              <span>活动获得</span>
              <strong>{{ numberFloor(calculationResult.activityTotalDraw, 0) }}</strong>
              <span class="gacha-video-hero-icon" aria-label="寻访凭证"><span class="bg-icon_7003"></span></span>
              <small>当前已纳入的活动</small>
            </div>
            <div v-if="videoActivityRows.length" class="gacha-video-event-list">
              <div v-for="activity in videoActivityRows" :key="activity.label" class="gacha-video-event-row">
                <span>{{ activity.category }}</span>
                <strong>{{ activity.label }}</strong>
                <em class="gacha-video-draw-value">
                  <span class="gacha-video-inline-icon"><span class="bg-icon_7003"></span></span>
                  +{{ activity.draws }}
                </em>
              </div>
            </div>
            <div v-else class="gacha-video-empty-state">当前没有纳入活动</div>
          </template>

          <template v-else-if="activeCardName === 'other'">
            <div class="gacha-video-section-hero">
              <span>其他资源</span>
              <strong>{{ numberFloor(calculationResult.otherTotalDraw, 0) }}</strong>
              <span class="gacha-video-hero-icon" aria-label="寻访凭证"><span class="bg-icon_7003"></span></span>
              <small>维护、邮件与其他奖励</small>
            </div>
            <div v-if="videoOtherRows.length" class="gacha-video-event-list">
              <div v-for="reward in videoOtherRows" :key="reward.label" class="gacha-video-event-row">
                <span>资源</span>
                <strong>{{ reward.label }}</strong>
                <em class="gacha-video-draw-value">
                  <span class="gacha-video-inline-icon"><span class="bg-icon_7003"></span></span>
                  +{{ reward.draws }}
                </em>
              </div>
            </div>
            <div v-else class="gacha-video-empty-state">当前没有其他资源</div>
          </template>

          <template v-else-if="activeCardName === 'recharge'">
            <div class="gacha-video-plan-heading">
              <span>氪金方案</span>
              <strong>预设组合</strong>
              <small>月卡与礼包组合</small>
            </div>
            <div class="gacha-video-recharge-plan-list">
              <article v-for="(plan, index) in videoRechargePlans" :key="plan.id" class="gacha-video-recharge-plan">
                <span class="gacha-video-plan-index">0{{ index + 1 }}</span>
                <h3>{{ plan.title }}</h3>
                <div class="gacha-video-plan-tokens">
                  <span v-for="item in plan.items" :key="item" class="gacha-video-plan-token">
                    <i></i>
                    {{ item }}
                  </span>
                </div>
              </article>
            </div>
          </template>
        </section>

        <template v-if="settingsTab === 'data'">
        <!--计算结果-->
        <div class="collapse-group1" id="result-box" data-video="pro">
      <!-- <div class="collapse-group-content"> -->
      <el-collapse v-model="dataPanelCardName" accordion class="" style="border: none">
        <el-collapse-item name="calculationResult" class="collapse-item">
          <template #title>
            <div class="flex align-center">
              <div
                class="collapse-title-icon"
                v-if="isNormalLimitedActivity"
                :style="getProbabilityBoxStyle(currentProb.limited300, currentProb.all300)"
              ></div>
              <div
                class="collapse-title-icon"
                v-if="isLinkedLimitedActivity"
                :style="getProbabilityBoxStyle(currentProb[linkedProbKeys.limited6], currentProb[linkedProbKeys.all])"
              ></div>
              <div
                class="collapse-title-icon"
                v-if="isDoubleLinkedLimitedActivity"
                :style="getProbabilityBoxStyle(currentProb.怪猎一期和二期都获得UP6星干员, currentProb.怪猎一期和二期都获得全部干员)"
              ></div>
              <span class="collapse-title-font">
                共计{{ calculationResult.totalDraw }}抽<span v-if="calculationResult.totalAmountOfRecharge > 0"
                  >， 氪金{{ numberFloor(calculationResult.totalAmountOfRecharge, 0) }}元<span v-if="dailyReward.daily >= 45"
                    >，月均氪金约{{ calculationResult.monthlyAverageRecharge.toFixed(1) }}元</span
                  ></span
                >
              </span>
            </div>
          </template>
          <div v-if="false">
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
                  <td>活动获得</td>
                  <td>{{ numberFloor(calculationResult.activityTotalDraw, 0) }}</td>
                  <td>抽</td>
                </tr>
                <tr>
                  <td>其他资源</td>
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
              <div v-if="isNormalLimitedActivity">
                <p>拿到限定的概率：{{ currentProb.limited300.toFixed(2) }}%</p>
              </div>
              <div v-if="isNormalLimitedActivity">
                <p>拿到限定+陪跑的概率：{{ currentProb.all300.toFixed(2) }}%</p>
              </div>
              <div v-if="isLinkedLimitedActivity">
                <p>拿到限定六星的概率：{{ currentProb[linkedProbKeys.limited6].toFixed(2) }}%</p>
              </div>
              <div v-if="isLinkedLimitedActivity">
                <p>拿到所有联动的概率：{{ currentProb[linkedProbKeys.all].toFixed(2) }}%</p>
              </div>
              <div v-if="isLinkedLimitedActivity">
                <p>全满潜的概率：{{ currentProb[linkedProbKeys.fullPotential].toFixed(2) }}%</p>
              </div>
              <div v-if="isDoubleLinkedLimitedActivity">
                <p>拿到限定六星的概率：{{ currentProb.怪猎一期和二期都获得UP6星干员.toFixed(2) }}%</p>
              </div>
              <div v-if="isDoubleLinkedLimitedActivity">
                <p>拿到所有联动的概率：{{ currentProb.怪猎一期和二期都获得全部干员.toFixed(2) }}%</p>
              </div>
              <div v-if="isDoubleLinkedLimitedActivity">
                <p>全满潜的概率：{{ currentProb.怪猎一期和二期都全满潜.toFixed(2) }}%</p>
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
          </div>
        </el-collapse-item>

        <el-collapse-item v-if="false" name="developer" class="collapse-item">
          <template #title>
            <div class="flex align-center">
              <div class="collapse-title-icon" style="background: rgba(119, 118, 255, 0.8)"></div>
              <span class="collapse-title-font"> 开发者模式 </span>
            </div>
          </template>
          <!-- 时间选择器 -->
          <div>{{ selectedCertificatePackList }}</div>

          <div>{{ selectedPackCollect }}</div>

          <div>{{ userConfigV2 }}</div>
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
            <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 12px">
              <div style="display: flex; align-items: center; gap: 12px">
                <span style="font-weight: 500; color: #606266">截图模式：</span>
                <el-switch v-model="screenshotModeEnabled" @change="handleBackground"></el-switch>
              </div>
              <div style="display: flex; align-items: center; gap: 12px">
                <span style="font-weight: 500; color: #606266">宽屏模式：</span>
                <el-switch v-model="wideScreenModeEnabled" @change="wideScreenMode"></el-switch>
              </div>
            </div>
          </div>
        </el-collapse-item>
      </el-collapse>
      <!-- </div> -->
    </div>

        <div class="collapse-group2" id="resources-box" data-video="pro">
      <el-collapse v-model="dataPanelCardName" accordion style="border: none">
        <!--库存资源-->
        <el-collapse-item v-if="false" name="exist" class="collapse-item">
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
              <input @change="gachaResourcesCalculation" v-model="userConfigV2.existOriginium" />
              <div class="image-sprite">
                <div class="bg-icon_4003"></div>
              </div>
              <input @change="gachaResourcesCalculation" v-model="userConfigV2.existOrundum" />
            </div>
            <div class="exist-resources-input">
              <div class="image-sprite">
                <div class="bg-icon_7003"></div>
              </div>
              <input @change="gachaResourcesCalculation" v-model="userConfigV2.existGachaTicket" />
              <div class="image-sprite">
                <div class="bg-icon_7004"></div>
              </div>
              <input @change="gachaResourcesCalculation" v-model="userConfigV2.existTenGachaTicket" />
            </div>
          </div>

          <div class="resources-line">
            <!-- <div class="switch-wrap"> -->
            <span>是否使用源石抽卡</span>
            <el-switch v-model="userConfigV2.originiumIsUsed" @click="gachaResourcesCalculation"></el-switch>
          </div>

          <div class="collapse-content-subheading"><span></span> 时装预留源石</div>
          <div class="resources-line" style="overflow-x: scroll">
            <el-space>
              <el-input-number v-model="userConfigV2.skinBudget" :step="1" :min="0" :max="10" @change="gachaResourcesCalculation()">
                <template #prefix>
                  <span>18石</span>
                </template>
              </el-input-number>
              <el-input-number v-model="userConfigV2.skinBudgetPlus" :step="1" :min="0" :max="10" @change="gachaResourcesCalculation()">
                <template #prefix>
                  <span>21石</span>
                </template>
              </el-input-number>
              <el-input-number v-model="userConfigV2.skinBudgetPro" :step="1" :min="0" :max="10" @change="gachaResourcesCalculation()">
                <template #prefix>
                  <span>24石</span>
                </template>
              </el-input-number>
            </el-space>
          </div>

          <div class="collapse-content-subheading"><span></span> 自定义修正</div>
          <div class="resources-line">
            <input v-model="userConfigV2.correctOrundum" @input="gachaResourcesCalculation" />
            <span>合成玉自定义修正</span>
            <div class="image-sprite">
              <div class="bg-icon_4003"></div>
            </div>
            <span>{{ userConfigV2.correctOrundum }}</span>
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
          <div class="resources-line">
            <span class="resources-line-label">官方月卡{{ officialMonthlyCardRemainingDays }}次</span>
            <div class="resources-line-content">
              <div class="image-sprite">
                <div class="bg-icon_4003"></div>
              </div>
              <span>{{ officialMonthlyCardReward }}</span>
            </div>
          </div>

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
              <el-switch v-model="userConfigV2.weeklyTaskCompleted" @change="gachaResourcesCalculation"></el-switch>
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
              <el-switch v-model="userConfigV2.annihilationCompleted" @change="gachaResourcesCalculation"></el-switch>
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
              <el-switch v-model="userConfigV2.certificateStoreCompleted" @change="gachaResourcesCalculation"></el-switch>
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
            v-for="(pack, index) in certificatePackList"
            :key="index"
            :value="pack.id"
            size="small"
            v-show="rewardIsExpired(pack)"
            v-model="selectedCertificatePackList"
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

          <el-checkbox-group
            class="certificate-store-f3-group"
            v-model="selectedCertificateStoreF3Group"
            size="small"
            @change="handleCertificateStoreF3GroupChange"
          >
            <el-checkbox-button v-for="option in certificateStoreF3Options" :key="option.id" :value="option.id">
              <div class="certificate-store-f3-button">
                <span>{{ option.text }}</span>
              </div>
            </el-checkbox-button>
          </el-checkbox-group>

          <span class="tip">未换完的项目会从现有绿票中扣除：第一层1490，二层单抽和公招1200，二层其余9300</span>
          <span class="tip">鉴于第二层有不少性价比较低的物品，建议囤够2w以上绿票再考虑绿票换玉</span>
        </el-collapse-item>

        <!--潜在资源-->
        <el-collapse-item v-if="false" name="potential" class="collapse-item">
          <template #title>
            <div class="flex align-center">
              <div class="collapse-title-icon" style="background: rgba(119, 118, 255, 0.8)"></div>
              <span class="collapse-title-font"> 潜在资源&emsp;{{ numberFloor(calculationResult.potentialTotalDraw, 0) }}抽 </span>
            </div>
          </template>
          <div class="collapse-content-subheading"><span></span> 悖论模拟/剿灭作战模拟</div>
          <div class="resources-line">
            <input v-model="userConfigV2.paradox" @input="gachaResourcesCalculation" />
            <span>个悖论模拟</span>
            <div class="image-sprite">
              <div class="bg-icon_4003"></div>
            </div>
            <span>{{ userConfigV2.paradox * 200 }}</span>
          </div>
          <div class="resources-line">
            <input v-model="userConfigV2.annihilation" @input="gachaResourcesCalculation" />
            <span>个剿灭作战模拟</span>
            <div class="image-sprite">
              <div class="bg-icon_4003"></div>
            </div>
            <span>{{ userConfigV2.annihilation * 1500 }}</span>
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

        <!--氪金方案-->
        <el-collapse-item name="recharge" class="collapse-item">
          <template #title>
            <div class="flex align-center">
              <div class="collapse-title-icon" style="background: rgba(119, 118, 255, 0.8)"></div>
              <span class="collapse-title-font"> 氪金方案 </span>
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
            <el-input-number v-model="userConfigV2.monthlyCardExtraCount" @input="gachaResourcesCalculation"> </el-input-number>
            <span>张月卡(负数代表已提前购买)</span>
          </div>
          <span class="tip">额外购买一张月卡可提前拿到6石，已提前购买则只能拿到每日200玉</span>
          <el-checkbox-group v-model="selectedPackCollect" style="margin: 4px" @change="gachaResourcesCalculation">
            <el-checkbox-button
              v-for="(pack, index) in monthlyPackList"
              :key="index"
              :value="pack.id"
              class="el-checkbox-button"
              v-show="rewardIsExpired(pack)"
            >
              <PackButtonContent :data="pack"> </PackButtonContent>
            </el-checkbox-button>
          </el-checkbox-group>

          <!--限时礼包-->
          <div class="collapse-content-subheading"><span></span> 限时礼包</div>
          <!-- <span class="tip">"指令重构"寻访包仅能用于4月M3池，不能用于任何限定池</span> -->
          <el-checkbox-group v-model="selectedPackCollect" style="margin: 4px" @change="gachaResourcesCalculation">
            <el-checkbox-button v-for="(pack, index) in activityPackInfoList" :key="index" :value="pack.id" class="el-checkbox-button">
              <PackButtonContent :data="pack"> </PackButtonContent>
            </el-checkbox-button>
          </el-checkbox-group>

          <!--新人礼包-->
          <div class="collapse-content-subheading"><span></span> 新人礼包</div>
          <el-checkbox-group v-model="selectedPackCollect" style="margin: 4px" @change="gachaResourcesCalculation">
            <el-checkbox-button v-for="(pack, index) in listNewBiePackInfo" :key="index" :value="pack.id" class="el-checkbox-button">
              <PackButtonContent :data="pack"> </PackButtonContent>
            </el-checkbox-button>
          </el-checkbox-group>

          <template v-if="shouldShowLastYearOriginiumPack">
            <!--首次充值源石-->
            <div class="collapse-content-subheading"><span></span> 首次充值源石（周年刷新前）</div>
            <el-checkbox-group v-model="selectedPackCollect" style="margin: 4px" @change="gachaResourcesCalculation">
              <el-checkbox-button v-for="(pack, index) in listLastYearOriginiumPack" :key="index" :value="pack.id" class="el-checkbox-button">
                <PackButtonContent :data="pack"> </PackButtonContent>
              </el-checkbox-button>
            </el-checkbox-group>
          </template>

          <!--首次充值源石-->
          <div class="collapse-content-subheading"><span></span> 首次充值源石（周年刷新后）</div>
          <el-checkbox-group v-model="selectedPackCollect" style="margin: 4px" @change="gachaResourcesCalculation">
            <el-checkbox-button v-for="(pack, index) in originiumPackList" :key="index" :value="pack.id" class="el-checkbox-button">
              <PackButtonContent :data="pack"> </PackButtonContent>
            </el-checkbox-button>
          </el-checkbox-group>

          <div class="collapse-content-subheading"><span></span> 往年礼包</div>
          <el-checkbox-group v-model="selectedHistoryPackIndex" style="margin: 4px" @change="gachaResourcesCalculation">
            <el-checkbox-button v-for="(pack, index) in packListGroupByHistory" :key="index" :value="pack.id" class="el-checkbox-button">
              <PackButtonContent :data="pack"> </PackButtonContent>
            </el-checkbox-button>
          </el-checkbox-group>

          <div class="collapse-content-subheading"><span></span> 额外购买非首充源石</div>

          <div class="resources-line" v-for="item in OriginiumTable">
            <span class="draw-efficiency" :style="getDrawEfficiencyStyle(item.drawEfficiency)">
              {{ formatDrawPrice(item.drawPrice) }}
            </span>
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

        <!--活动获得-->
        <el-collapse-item name="activity" class="collapse-item">
          <template #title>
            <div class="flex align-center">
              <div class="collapse-title-icon" style="background: rgba(119, 118, 255, 0.8)"></div>
              <span class="collapse-title-font"> 活动获得&emsp;{{ numberFloor(calculationResult.activityTotalDraw, 0) }}抽 </span>
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
              <span class="collapse-title-font"> 其他资源&emsp;{{ numberFloor(calculationResult.otherTotalDraw, 0) }}抽 </span>
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
        </template>
      </div>
    </section>

  </div>
</template>

<style scoped>
.gacha-card-editor {
  display: flex;
  width: max-content;
  min-width: 100%;
  align-items: start;
  gap: 28px;
  padding: 12px;
  box-sizing: border-box;
  overflow: auto;
}

.gacha-card-stage {
  order: 1;
  width: 1960px;
  height: 1120px;
  padding: 20px;
  box-sizing: border-box;
  outline: 1px solid var(--c-border-color);
  overflow: hidden;
  box-shadow: 0 8px 24px var(--c-box-shadow-color);
}

.gacha-card-stage.is-data-controls {
  overflow: visible;
}

.gacha-card-browser {
  --gacha-column-gap: 64px;
  --gacha-left-surface-perspective: 760px;
  --gacha-right-surface-perspective: 1400px;
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
  padding: var(--gacha-stage-top-margin) var(--gacha-stage-right-margin) var(--gacha-stage-bottom-margin)
    var(--gacha-stage-left-margin);
  box-sizing: border-box;
}

.gacha-card-browser:not(.is-data-controls) .collapse-group1,
.gacha-card-browser:not(.is-data-controls) .collapse-group2 {
  display: none;
}

#gachaCalculate.gacha-card-browser.is-data-controls .collapse-group1,
#gachaCalculate.gacha-card-browser.is-data-controls .collapse-group2 {
  position: absolute;
  top: 96px;
  left: calc(100% + 48px);
  display: block;
  width: 340px;
  min-width: 0;
  max-width: none;
  max-height: calc(100% - 96px);
  overflow: auto;
  z-index: 4;
}

#gachaCalculate.gacha-card-browser.is-data-controls .collapse-group1 {
  pointer-events: none;
}

.gacha-card-browser.is-data-controls .collapse-group1 :deep(.el-collapse-item__header) {
  display: none;
}

.gacha-card-browser.is-data-controls .collapse-group2 :deep(.el-collapse-item__header) {
  display: none;
}

.gacha-card-browser.is-data-controls :deep(.el-collapse) {
  border-top: 0;
  border-bottom: 0;
}

.gacha-card-browser.is-data-controls :deep(.collapse-item) {
  margin: 0;
  border-radius: 0;
  box-shadow: none;
}

.gacha-card-browser.is-data-controls :deep(.el-collapse-item__wrap) {
  border-bottom: 0;
}

.gacha-card-browser.is-data-controls :deep(.el-collapse-item__content) {
  padding: 14px 0 20px;
}

.gacha-card-stage-heading {
  position: absolute;
  top: calc(var(--gacha-stage-top-margin) - 96px);
  left: var(--gacha-stage-left-margin);
  display: flex;
  align-items: center;
  height: 72px;
  color: var(--c-text-color);
  font-size: 36px;
  font-weight: 700;
}

.gacha-card-browser .gacha-card-detail-title {
  position: absolute;
  top: calc(var(--gacha-stage-top-margin) - 84px);
  right: var(--gacha-stage-right-margin);
  left: calc(var(--gacha-stage-left-margin) + var(--gacha-navigation-width) + var(--gacha-column-gap));
  display: flex;
  align-items: center;
  height: 60px;
  padding: 0 8px;
  color: var(--c-text-color);
  font-size: 30px;
  font-weight: 600;
}

.gacha-card-settings {
  width: 340px;
  flex: 0 0 340px;
  border: 1px solid var(--c-border-color);
  border-radius: 8px;
  background-color: var(--c-card-background-color);
  box-shadow: 0 8px 18px var(--c-box-shadow-color);
}

.gacha-card-settings-video {
  order: 2;
  max-height: 1120px;
  overflow: auto;
}

.gacha-card-settings-legacy {
  display: none;
}

.gacha-card-settings-title {
  padding: 14px 16px;
  border-bottom: 1px solid var(--c-border-color);
  color: var(--c-text-color);
  font-size: 18px;
  font-weight: 600;
}

.gacha-card-settings-tabs :deep(.el-tabs__header) {
  margin: 0;
}

.gacha-card-settings-tabs :deep(.el-tabs__content) {
  overflow: visible;
}

.gacha-card-settings-tabs :deep(.el-tab-pane) {
  min-height: 0;
}

.gacha-card-setting-image-upload {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 56px;
  padding: 0 16px;
  color: var(--c-text-color);
}

.gacha-card-setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 56px;
  padding: 0 16px;
  color: var(--c-text-color);
}

.gacha-card-setting-range {
  display: grid;
  grid-template-columns: 80px minmax(0, 1fr);
  align-items: center;
  column-gap: 12px;
  min-height: 68px;
  padding: 0 16px;
  color: var(--c-text-color);
}

.gacha-card-setting-range :deep(.el-slider) {
  min-width: 0;
}

.gacha-video-navigation {
  position: absolute;
  top: var(--gacha-stage-top-margin);
  bottom: var(--gacha-stage-bottom-margin);
  left: var(--gacha-stage-left-margin);
  display: flex;
  width: var(--gacha-navigation-width);
  flex-direction: column;
  gap: 14px;
  transform: perspective(var(--gacha-left-surface-perspective)) rotateY(var(--gacha-left-perspective));
  transform-origin: right center;
}

.gacha-video-pool-selector {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 6px;
}

.gacha-video-pool-button {
  position: relative;
  display: block;
  min-width: 0;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  border: 1px solid var(--c-border-color);
  border-radius: 6px;
  background-color: color-mix(in srgb, var(--c-card-background-color) 86%, #7ea6dc);
  box-shadow: 0 8px 16px var(--c-box-shadow-color);
  cursor: pointer;
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease;
  backface-visibility: hidden;
}

.gacha-video-pool-button:hover {
  box-shadow: 0 12px 22px var(--c-box-shadow-color);
}

.gacha-video-pool-button.is-active {
  border-color: var(--el-color-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--el-color-primary) 24%, transparent), 0 12px 22px var(--c-box-shadow-color);
}

.gacha-video-pool-image,
.gacha-video-pool-image img,
.gacha-video-pool-placeholder {
  display: block;
  width: 100%;
  height: 100%;
}

.gacha-video-pool-image {
  overflow: hidden;
  transition: filter 180ms ease;
}

.gacha-video-pool-image img,
.gacha-video-pool-placeholder {
  object-fit: cover;
}

.gacha-video-pool-button:not(.is-active) .gacha-video-pool-image {
  filter: saturate(0.28) blur(1px) brightness(0.72);
}

.gacha-video-pool-copy {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  display: grid;
  gap: 2px;
  padding: 10px 11px 9px;
  background-color: rgb(0 0 0 / 62%);
  color: #fff;
  pointer-events: none;
  text-align: left;
}

.gacha-video-pool-copy strong {
  font-size: 18px;
  line-height: 1.1;
}

.gacha-video-pool-copy small {
  color: rgb(255 255 255 / 78%);
  font-size: 13px;
  line-height: 1.1;
}

.gacha-video-pool-placeholder {
  background:
    linear-gradient(135deg, transparent 0 48%, color-mix(in srgb, var(--c-border-color) 72%, transparent) 48% 52%, transparent 52%),
    linear-gradient(45deg, transparent 0 48%, color-mix(in srgb, var(--c-border-color) 72%, transparent) 48% 52%, transparent 52%),
    color-mix(in srgb, var(--c-card-background-color) 76%, #c7d6e8);
}

.gacha-video-nav-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  min-height: 76px;
  padding: 0 20px;
  border: 1px solid var(--c-border-color);
  border-left: 5px solid #5e91d5;
  border-radius: 6px;
  background-color: var(--c-card-background-color);
  box-shadow: 0 8px 18px var(--c-box-shadow-color);
  color: var(--c-text-color);
  cursor: pointer;
  text-align: left;
  transition:
    background-color 160ms ease,
    border-color 160ms ease,
    box-shadow 160ms ease;
  backface-visibility: hidden;
}

.gacha-video-nav-item:hover {
  box-shadow: 0 12px 24px var(--c-box-shadow-color);
}

.gacha-video-nav-item.is-active {
  border-color: var(--el-color-primary);
  border-left-color: var(--el-color-primary);
  background-color: color-mix(in srgb, var(--c-card-background-color) 90%, #7ea6dc);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--el-color-primary) 18%, transparent), 0 14px 26px var(--c-box-shadow-color);
}

.gacha-video-nav-item span {
  font-size: 21px;
  font-weight: 600;
}

.gacha-video-nav-item strong {
  color: var(--el-color-primary);
  font-size: 20px;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
}

.gacha-video-detail {
  position: absolute;
  top: var(--gacha-stage-top-margin);
  right: calc(var(--gacha-stage-right-margin) + var(--gacha-right-perspective-space));
  bottom: var(--gacha-stage-bottom-margin);
  left: calc(var(--gacha-stage-left-margin) + var(--gacha-navigation-width) + var(--gacha-column-gap));
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 54px 64px;
  border: 1px solid var(--c-border-color);
  border-radius: 6px;
  background-color: var(--c-card-background-color);
  box-shadow: 0 20px 42px var(--c-box-shadow-color);
  box-sizing: border-box;
  color: var(--c-text-color);
  transform: perspective(var(--gacha-right-surface-perspective)) rotateY(var(--gacha-right-perspective));
  transform-origin: left center;
  transform-style: preserve-3d;
}

.gacha-video-overview-hero,
.gacha-video-section-hero {
  display: grid;
  grid-template-columns: auto auto 1fr;
  align-items: end;
  column-gap: 18px;
  min-height: 184px;
  padding-bottom: 32px;
  border-bottom: 1px solid var(--c-border-color);
}

.gacha-video-overview-hero > span:not(.gacha-video-hero-icon),
.gacha-video-section-hero > span:not(.gacha-video-hero-icon) {
  grid-column: 1 / -1;
  align-self: start;
  color: color-mix(in srgb, var(--c-text-color) 70%, transparent);
  font-size: 24px;
  font-weight: 600;
}

.gacha-video-overview-hero strong,
.gacha-video-section-hero strong {
  color: var(--el-color-primary);
  font-size: 120px;
  font-variant-numeric: tabular-nums;
  font-weight: 800;
  line-height: 0.88;
}

.gacha-video-overview-hero em,
.gacha-video-section-hero em {
  padding-bottom: 6px;
  color: var(--c-text-color);
  font-size: 30px;
  font-style: normal;
  font-weight: 600;
}

.gacha-video-hero-icon {
  display: inline-flex;
  width: 54px;
  height: 54px;
  align-items: center;
  justify-content: center;
  margin-bottom: 2px;
}

.gacha-video-hero-icon > span {
  display: block;
}

.gacha-video-hero-icon.is-artwork {
  width: 96px;
  height: 96px;
  margin-bottom: -10px;
}

.gacha-video-hero-icon.is-artwork img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 10px 12px color-mix(in srgb, #1b2430 35%, transparent));
}

.gacha-video-overview-hero small,
.gacha-video-section-hero small {
  justify-self: end;
  padding-bottom: 8px;
  color: color-mix(in srgb, var(--c-text-color) 68%, transparent);
  font-size: 20px;
}

.gacha-video-overview-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
  gap: 56px;
  padding: 42px 0;
}

.gacha-video-source-list {
  display: grid;
  align-content: start;
  gap: 12px;
}

.gacha-video-source-row {
  display: grid;
  grid-template-columns: 14px minmax(0, 1fr) auto;
  align-items: center;
  column-gap: 14px;
  min-height: 48px;
  padding-bottom: 10px;
  border-bottom: 1px solid color-mix(in srgb, var(--c-border-color) 70%, transparent);
  font-size: 21px;
}

.gacha-video-source-row strong {
  color: var(--c-text-color);
  font-size: 24px;
  font-variant-numeric: tabular-nums;
}

.gacha-video-source-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.gacha-video-source-dot.is-daily {
  background-color: #4f7fd0;
}

.gacha-video-source-dot.is-custom {
  background-color: #d5843e;
}

.gacha-video-source-dot.is-activity {
  background-color: #41a77a;
}

.gacha-video-source-dot.is-other {
  background-color: #b26d92;
}

.gacha-video-source-dot.is-recharge {
  background-color: #7f78c9;
}

.gacha-video-resource-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.gacha-video-resource-item,
.gacha-video-stat-column {
  display: flex;
  min-width: 0;
  min-height: 116px;
  flex-direction: column;
  justify-content: center;
  padding: 18px 22px;
  border-left: 4px solid #d5843e;
  background-color: color-mix(in srgb, var(--c-card-background-color) 84%, #dce7f3);
}

.gacha-video-resource-item:nth-child(2),
.gacha-video-stat-column:nth-child(2) {
  border-left-color: #4f7fd0;
}

.gacha-video-resource-item:nth-child(3),
.gacha-video-stat-column:nth-child(3) {
  border-left-color: #41a77a;
}

.gacha-video-resource-item:nth-child(4) {
  border-left-color: #b26d92;
}

.gacha-video-resource-item span,
.gacha-video-stat-column span {
  color: color-mix(in srgb, var(--c-text-color) 68%, transparent);
  font-size: 17px;
}

.gacha-video-resource-item strong,
.gacha-video-stat-column strong {
  margin-top: 4px;
  color: var(--c-text-color);
  font-size: 32px;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.gacha-video-resource-item small,
.gacha-video-stat-column small {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  color: color-mix(in srgb, var(--c-text-color) 60%, transparent);
  font-size: 16px;
}

.gacha-video-resource-icon {
  display: inline-flex;
  width: 44px;
  height: 44px;
  align-items: center;
  justify-content: center;
}

.gacha-video-resource-icon > span {
  display: block;
}

.gacha-video-resource-item.is-artwork .gacha-video-resource-icon {
  width: 72px;
  height: 72px;
}

.gacha-video-resource-icon img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 7px 8px color-mix(in srgb, #1b2430 28%, transparent));
}

.gacha-video-inline-icon,
.gacha-video-unit-icon {
  display: inline-flex;
  flex: 0 0 auto;
  overflow: hidden;
  align-items: center;
  justify-content: center;
}

.gacha-video-inline-icon {
  width: 24px;
  height: 24px;
}

.gacha-video-unit-icon {
  width: 32px;
  height: 32px;
}

.gacha-video-inline-icon > span,
.gacha-video-unit-icon > span {
  display: block;
  transform: scale(0.55);
}

.gacha-video-unit-icon > span {
  transform: scale(0.72);
}

.gacha-video-draw-value {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  white-space: nowrap;
}

.gacha-video-probability-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 22px;
  margin-top: auto;
}

.gacha-video-probability-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 76px;
  padding: 0 24px;
  border-top: 2px solid #7f78c9;
  background-color: color-mix(in srgb, var(--c-card-background-color) 90%, #e6e3f7);
}

.gacha-video-probability-item span {
  color: color-mix(in srgb, var(--c-text-color) 72%, transparent);
  font-size: 19px;
  font-weight: 600;
}

.gacha-video-probability-item strong {
  color: #6e67b5;
  font-size: 30px;
  font-variant-numeric: tabular-nums;
}

.gacha-video-detail-rows,
.gacha-video-event-list {
  display: grid;
  gap: 14px;
  margin-top: 38px;
  overflow: auto;
}

.gacha-video-detail-row,
.gacha-video-event-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: baseline;
  column-gap: 16px;
  min-height: 62px;
  padding: 0 20px;
  border-left: 4px solid #4f7fd0;
  background-color: color-mix(in srgb, var(--c-card-background-color) 90%, #dce7f3);
}

.gacha-video-detail-row span,
.gacha-video-event-row strong {
  min-width: 0;
  overflow: hidden;
  font-size: 21px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gacha-video-detail-row strong,
.gacha-video-event-row em {
  color: var(--el-color-primary);
  font-size: 25px;
  font-style: normal;
  font-variant-numeric: tabular-nums;
}

.gacha-video-detail-row small,
.gacha-video-event-row span {
  color: color-mix(in srgb, var(--c-text-color) 60%, transparent);
  font-size: 17px;
}

.gacha-video-three-columns {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
  margin-top: 46px;
}

.gacha-video-plan-heading {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  min-height: 184px;
  padding-bottom: 32px;
  border-bottom: 1px solid var(--c-border-color);
}

.gacha-video-plan-heading span {
  grid-column: 1 / -1;
  align-self: start;
  color: color-mix(in srgb, var(--c-text-color) 70%, transparent);
  font-size: 24px;
  font-weight: 600;
}

.gacha-video-plan-heading strong {
  color: var(--el-color-primary);
  font-size: 72px;
  line-height: 0.95;
}

.gacha-video-plan-heading small {
  padding-bottom: 6px;
  color: color-mix(in srgb, var(--c-text-color) 64%, transparent);
  font-size: 20px;
}

.gacha-video-recharge-plan-list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
  margin-top: 46px;
}

.gacha-video-recharge-plan {
  display: flex;
  min-width: 0;
  min-height: 258px;
  flex-direction: column;
  padding: 26px;
  border: 1px solid var(--c-border-color);
  border-top: 5px solid #7f78c9;
  border-radius: 6px;
  background-color: color-mix(in srgb, var(--c-card-background-color) 88%, #e6e3f7);
  box-sizing: border-box;
}

.gacha-video-recharge-plan:nth-child(2) {
  border-top-color: #d5843e;
  background-color: color-mix(in srgb, var(--c-card-background-color) 88%, #f1e2d2);
}

.gacha-video-recharge-plan:nth-child(3) {
  border-top-color: #4f7fd0;
  background-color: color-mix(in srgb, var(--c-card-background-color) 88%, #dce7f3);
}

.gacha-video-plan-index {
  color: color-mix(in srgb, var(--c-text-color) 45%, transparent);
  font-size: 17px;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
}

.gacha-video-recharge-plan h3 {
  margin: auto 0 22px;
  color: var(--c-text-color);
  font-size: 29px;
  font-weight: 700;
  line-height: 1.25;
}

.gacha-video-plan-tokens {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.gacha-video-plan-token {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border: 1px solid color-mix(in srgb, var(--c-border-color) 82%, transparent);
  background-color: color-mix(in srgb, var(--c-card-background-color) 72%, transparent);
  color: color-mix(in srgb, var(--c-text-color) 78%, transparent);
  font-size: 16px;
  line-height: 1;
  white-space: nowrap;
}

.gacha-video-plan-token i {
  width: 12px;
  height: 12px;
  border: 1px dashed color-mix(in srgb, var(--c-text-color) 48%, transparent);
  border-radius: 2px;
}

.gacha-video-stat-column {
  min-height: 210px;
}

.gacha-video-event-row {
  border-left-color: #41a77a;
}

.gacha-video-empty-state {
  display: flex;
  min-height: 220px;
  align-items: center;
  justify-content: center;
  margin-top: 38px;
  border: 1px dashed var(--c-border-color);
  color: color-mix(in srgb, var(--c-text-color) 58%, transparent);
  font-size: 21px;
}

.gacha-video-data-empty {
  padding: 24px 16px 10px;
  color: color-mix(in srgb, var(--c-text-color) 62%, transparent);
  font-size: 14px;
}

.gacha-video-data-panel {
  min-height: 860px;
  padding: 0 16px 20px;
  box-sizing: border-box;
}

#gacha-video-data-controls :deep(.collapse-group1),
#gacha-video-data-controls :deep(.collapse-group2) {
  display: block;
  width: 100%;
  min-width: 0;
  max-width: none;
  max-height: none;
}

#gacha-video-data-controls :deep(.el-collapse) {
  border-top: 0;
  border-bottom: 0;
}

#gacha-video-data-controls :deep(.collapse-item) {
  margin: 0;
  border-radius: 0;
  box-shadow: none;
}

#gacha-video-data-controls :deep(.el-collapse-item__header) {
  display: none;
}

#gacha-video-data-controls :deep(.el-collapse-item__wrap) {
  border-bottom: 0;
}

#gacha-video-data-controls :deep(.el-collapse-item__content) {
  padding: 14px 0 20px;
}
</style>
