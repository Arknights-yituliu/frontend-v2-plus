<!--卡池日期配置见 /src/utils/gachaScheduleOptions.js；活动排期见 HONEY_CAKE_TABLE 所引用的 JSON 文件。-->
<script setup>
import { watch, onMounted, onBeforeUnmount, ref, computed, nextTick } from "vue";
import Dexie from "dexie";
import { ElMessageBox } from "element-plus";
import { saveAs } from "file-saver";
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
import {
  createGachaScheduleOptions,
  formatActivityDateRange,
  getDailyRewardRemainingDays,
  getScheduleCalculationEndDate,
  isRewardAvailableOnSelectedDates,
} from "/src/utils/gachaScheduleOptions.js";
import { Delete, Download, Plus, RefreshLeft, Upload } from "@element-plus/icons-vue";
import { useRoute } from "vue-router";

const GACHA_VIDEO_DRAFT_ID = "current";
const GACHA_VIDEO_SETTINGS_STORAGE_KEY = "logicalByte_gachaCalculatorPerspective_settings_v1";
const GACHA_VIDEO_SETTINGS_FILE_FORMAT = "yituliu-gacha-perspective-settings";
const GACHA_VIDEO_SETTINGS_FILE_VERSION = 1;
const GACHA_VIDEO_SETTINGS_FILE_MAX_SIZE = 128 * 1024 * 1024;
const gachaVideoDraftDb = new Dexie("LogicalByteGachaCalculatorPerspective");
gachaVideoDraftDb.version(1).stores({
  drafts: "id, updatedAt",
});
gachaVideoDraftDb.version(2).stores({
  drafts: "id, updatedAt",
  poolImages: "id, updatedAt",
});
gachaVideoDraftDb.version(3).stores({
  drafts: "id, updatedAt",
  poolImages: "id, updatedAt",
  stageAssets: "id, updatedAt",
});

// 当前路由
const route = useRoute();
const eachOriginalDrawPrice = 648.0 / 185 / 0.3;
const videoGachaSettingsFileInput = ref(null);
const videoGachaSettingsTransferPending = ref(false);

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
  activityData.scheduleDateRange = formatActivityDateRange(activityData.start, activityData.end);
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
  activityData.scheduleDateRange = formatActivityDateRange(activityData.start, activityData.end);
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
const scheduleOptions = createGachaScheduleOptions();

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
  const videoPool = enabledVideoPoolOptions.value.find(
    (pool) => pool.scheduleIndex === index && !pool.disabled
  );
  if (videoPool && selectedVideoPool.value !== videoPool.id) {
    selectVideoPool(videoPool.id);
    return;
  }

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
  custom: "搓玉",
  recharge: "氪金方案",
  activity: "活动获得",
  other: "其他资源",
};
const activeCardName = ref("calculationResult");
const dataPanelCardName = ref("calculationResult");
const settingsTab = ref("canvas");
const previewScalePercent = ref(80);
const navigationNumberStyle = ref("industrial");
const navigationGroupHeadingLight = ref(false);
const stageFloatIntensity = ref(3);
const navigationFlashCardName = ref("");
let navigationFlashTimer = 0;
const videoPoolTransitionPhase = ref("");
const VIDEO_POOL_TRANSITION_EXIT_DURATION = 160;
const VIDEO_POOL_TRANSITION_ENTER_DURATION = 260;
let videoPoolTransitionTimer = 0;
const displayBackgroundColor = ref("#f5f7fa");
const stageBackgroundImage = ref("");
const stageBackgroundImageScale = ref(100);
const stageBackgroundImagePositionX = ref(50);
const stageBackgroundImagePositionY = ref(50);
const stageBackgroundImageOpacity = ref(72);
const stageBackgroundImageBlur = ref(8);
const stageBackgroundImageBrightness = ref(58);
const stageBackgroundImageSaturation = ref(42);
const stageBackgroundOverlayOpacity = ref(54);
const stageLogoImage = ref("");
const stageLogoWidth = ref(180);
const stageLogoLeft = ref(0);
const stageLogoBottom = ref(44);
const stageLogoOpacity = ref(88);
const stageReferenceGuidesVisible = ref(false);
const STAGE_CURSOR_COLOR_OPTIONS = [
  { label: "墨黑", value: "black", color: "rgb(0 0 0 / 80%)", pulseColor: "rgb(0 0 0 / 48%)" },
  { label: "暗金", value: "dark-gold", color: "rgb(143 108 35 / 92%)", pulseColor: "rgb(143 108 35 / 54%)" },
  { label: "琥珀", value: "amber", color: "rgb(218 154 31 / 94%)", pulseColor: "rgb(218 154 31 / 56%)" },
  { label: "暖黄", value: "warm-yellow", color: "rgb(232 179 38 / 95%)", pulseColor: "rgb(232 179 38 / 57%)" },
  { label: "明黄", value: "bright-yellow", color: "rgb(244 202 45 / 96%)", pulseColor: "rgb(244 202 45 / 58%)" },
  { label: "柠黄", value: "lemon-yellow", color: "rgb(225 220 58 / 96%)", pulseColor: "rgb(225 220 58 / 58%)" },
];
const customStageCursorEnabled = ref(false);
const stageCursorBorderWidth = ref(4);
const stageCursorColor = ref("black");
const selectedStageCursorColor = computed(
  () => STAGE_CURSOR_COLOR_OPTIONS.find((option) => option.value === stageCursorColor.value) || STAGE_CURSOR_COLOR_OPTIONS[0]
);
const stageCursorVisible = ref(false);
const stageCursorElement = ref(null);
let stageCursorAnimationFrame = 0;
let stageCursorClickTimer = 0;
let pendingStageCursorPosition = null;
const stageAssetUrls = {
  background: "",
  logo: "",
};
const stageAssetFiles = {
  background: null,
  logo: null,
};
const leftPerspective = ref(14);
const rightPerspective = ref(14);
const navigationOpacity = ref(100);
const detailCardOpacity = ref(100);
const detailCardBackgroundColor = ref("#ffffff");
const inactivePoolImageBlur = ref(1);
const inactivePoolImageContrastReduction = ref(0);
const stageTopMargin = ref(96);
const stageBottomMargin = ref(0);
const stageLeftMargin = ref(0);
const stageRightMargin = ref(0);
const cardGroupWidth = ref(420);
const VIDEO_DETAIL_MIN_HEIGHT = 420;
const VIDEO_STAGE_CONTENT_HEIGHT = 1080;
const rightCardHeight = ref(VIDEO_STAGE_CONTENT_HEIGHT - stageTopMargin.value - stageBottomMargin.value);
const maxRightCardHeight = computed(
  () => VIDEO_STAGE_CONTENT_HEIGHT - stageTopMargin.value - stageBottomMargin.value
);
const displayStageStyle = computed(() => ({
  "--gacha-stage-background-color": displayBackgroundColor.value,
  "--gacha-stage-background-image-opacity": `${stageBackgroundImageOpacity.value / 100}`,
  "--gacha-stage-background-image-blur": `${stageBackgroundImageBlur.value}px`,
  "--gacha-stage-background-image-brightness": `${stageBackgroundImageBrightness.value}%`,
  "--gacha-stage-background-image-saturation": `${stageBackgroundImageSaturation.value}%`,
  "--gacha-stage-background-overlay-opacity": `${stageBackgroundOverlayOpacity.value / 100}`,
  "--gacha-stage-logo-width": `${stageLogoWidth.value}px`,
  "--gacha-stage-logo-left": `${stageLogoLeft.value}px`,
  "--gacha-stage-logo-bottom": `${stageLogoBottom.value}px`,
  "--gacha-stage-logo-opacity": `${stageLogoOpacity.value / 100}`,
  "--gacha-stage-cursor-border-width": `${stageCursorBorderWidth.value}px`,
  "--gacha-stage-cursor-color": selectedStageCursorColor.value.color,
  "--gacha-stage-cursor-pulse-color": selectedStageCursorColor.value.pulseColor,
  "--gacha-left-perspective": `${leftPerspective.value}deg`,
  "--gacha-left-hover-perspective": `${leftPerspective.value * 0.28}deg`,
  "--gacha-left-active-perspective": `${leftPerspective.value * 0.1}deg`,
  "--gacha-right-perspective": `${-rightPerspective.value}deg`,
  "--gacha-right-perspective-space": `${rightPerspective.value * 20}px`,
  "--gacha-navigation-opacity": `${navigationOpacity.value / 100}`,
  "--gacha-detail-card-opacity": `${detailCardOpacity.value / 100}`,
  "--gacha-detail-card-background-color": detailCardBackgroundColor.value,
  "--gacha-inactive-pool-image-blur": `${inactivePoolImageBlur.value}px`,
  "--gacha-inactive-pool-image-contrast": `${100 - inactivePoolImageContrastReduction.value}%`,
  "--gacha-stage-float-positive": `${stageFloatIntensity.value}px`,
  "--gacha-stage-float-negative": `${-stageFloatIntensity.value}px`,
  "--gacha-stage-float-soft-positive": `${stageFloatIntensity.value * 0.6}px`,
  "--gacha-stage-float-soft-negative": `${-stageFloatIntensity.value * 0.6}px`,
  "--gacha-stage-top-margin": `${stageTopMargin.value}px`,
  "--gacha-stage-bottom-margin": `${stageBottomMargin.value}px`,
  "--gacha-stage-left-margin": `${stageLeftMargin.value}px`,
  "--gacha-stage-right-margin": `${stageRightMargin.value}px`,
  "--gacha-navigation-width": `${cardGroupWidth.value}px`,
  "--gacha-right-card-height": `${Math.min(rightCardHeight.value, maxRightCardHeight.value)}px`,
}));

const PREVIEW_STAGE_WIDTH = 1960;
const PREVIEW_STAGE_HEIGHT = 1120;
const PREVIEW_SCALE_OPTIONS = [20, 40, 60, 80, 100];
const previewWorkspaceStyle = computed(() => {
  const scale = previewScalePercent.value / 100;
  return {
    "--gacha-preview-stage-width": `${PREVIEW_STAGE_WIDTH * scale}px`,
    "--gacha-preview-stage-height": `${PREVIEW_STAGE_HEIGHT * scale}px`,
    "--gacha-preview-scale": scale.toFixed(4),
  };
});

const NAVIGATION_NUMBER_STYLE_OPTIONS = [
  { label: "工业黑", value: "industrial" },
  { label: "机读码", value: "terminal" },
  { label: "窄体编号", value: "condensed" },
];
const allVideoPoolOptions = scheduleOptions
  .map((schedule, scheduleIndex) => ({ schedule, scheduleIndex }))
  .map(({ schedule, scheduleIndex }) => ({
    id: schedule.id,
    scheduleIndex,
    label: `${schedule.name}图片`,
    title: schedule.name,
    endDate: schedule.dateString,
    disabled: false, // 卡片视图允许在数据面板手动开启全局锁定的活动
  }));
const DEFAULT_ENABLED_VIDEO_POOL_IDS = Object.freeze(["summer", "p3r"]);

function normalizeEnabledVideoPoolIds(poolIds) {
  const requestedPoolIds = new Set(Array.isArray(poolIds) ? poolIds : []);
  const enabledPoolIds = allVideoPoolOptions
    .filter((pool) => requestedPoolIds.has(pool.id) && !pool.disabled)
    .map((pool) => pool.id);

  if (enabledPoolIds.length) {
    return enabledPoolIds;
  }

  const defaultPoolIds = allVideoPoolOptions
    .filter((pool) => DEFAULT_ENABLED_VIDEO_POOL_IDS.includes(pool.id) && !pool.disabled)
    .map((pool) => pool.id);

  if (defaultPoolIds.length) {
    return defaultPoolIds;
  }

  const fallbackPool = allVideoPoolOptions.find((pool) => !pool.disabled) || allVideoPoolOptions[0];
  return fallbackPool ? [fallbackPool.id] : [];
}

const enabledVideoPoolIds = ref(normalizeEnabledVideoPoolIds(DEFAULT_ENABLED_VIDEO_POOL_IDS));
const enabledVideoPoolOptions = computed(() => {
  const enabledPoolIdSet = new Set(enabledVideoPoolIds.value);
  return allVideoPoolOptions.filter((pool) => enabledPoolIdSet.has(pool.id));
});

function isVideoPoolEnabled(poolId) {
  return enabledVideoPoolIds.value.includes(poolId);
}

function setVideoPoolEnabled(poolId, enabled) {
  const pool = allVideoPoolOptions.find((item) => item.id === poolId);
  if (!pool || pool.disabled || (!enabled && enabledVideoPoolIds.value.length <= 1)) {
    return;
  }

  const nextPoolIds = enabled
    ? [...enabledVideoPoolIds.value, poolId]
    : enabledVideoPoolIds.value.filter((enabledPoolId) => enabledPoolId !== poolId);
  enabledVideoPoolIds.value = normalizeEnabledVideoPoolIds(nextPoolIds);

  const fallbackPool = enabledVideoPoolOptions.value[0];
  if (!fallbackPool) {
    return;
  }

  if (!isVideoPoolEnabled(selectedVideoPool.value)) {
    cancelVideoPoolTransition();
    applyVideoPoolSelection(fallbackPool);
    return;
  }

  if (!isVideoPoolEnabled(editingVideoPoolId.value)) {
    editingVideoPoolId.value = fallbackPool.id;
  }
  if (!isVideoPoolEnabled(editingVideoRechargePoolId.value)) {
    editingVideoRechargePoolId.value = fallbackPool.id;
  }
}

const DEFAULT_VIDEO_POOL_IMAGE_LAYOUT = Object.freeze({
  scale: 100,
  positionX: 50,
  positionY: 50,
});
const VIDEO_POOL_IMAGE_SCALE_MIN = 100;
const VIDEO_POOL_IMAGE_SCALE_MAX = 250;
const selectedVideoPool = ref(enabledVideoPoolOptions.value[0].id);
const videoPoolImages = ref(Object.fromEntries(allVideoPoolOptions.map((pool) => [pool.id, ""])));
const editingVideoPoolId = ref(selectedVideoPool.value);
const editingVideoRechargePoolId = ref(selectedVideoPool.value);
const videoPoolImageLayouts = ref(createVideoPoolImageLayouts());
const videoCalculationStartDatesByPool = ref(createVideoCalculationStartDatesByPool());
const videoPoolImageUrls = {};
const videoPoolImageFiles = {};

function normalizeVideoPoolId(poolId) {
  return poolId;
}

function isVideoPoolId(poolId) {
  return allVideoPoolOptions.some((pool) => pool.id === poolId);
}

function normalizeVideoCalculationStartDate(value, fallback = currentTimestamp.value) {
  const timestamp = Number(value);
  return Number.isFinite(timestamp) ? timestamp : fallback;
}

function createVideoCalculationStartDatesByPool(fallback = currentTimestamp.value) {
  return Object.fromEntries(
    allVideoPoolOptions.map((pool) => [pool.id, normalizeVideoCalculationStartDate(fallback, Date.now())])
  );
}

function normalizeVideoCalculationStartDatesByPool(startDatesByPool, fallback = currentTimestamp.value) {
  const normalizedDates = createVideoCalculationStartDatesByPool(fallback);

  for (const pool of allVideoPoolOptions) {
    normalizedDates[pool.id] = normalizeVideoCalculationStartDate(startDatesByPool?.[pool.id], fallback);
  }

  return normalizedDates;
}

function activateVideoPoolCalculationStartDate(poolId) {
  const timestamp = normalizeVideoCalculationStartDate(
    videoCalculationStartDatesByPool.value[poolId],
    currentTimestamp.value
  );
  const hasChanged = currentTimestamp.value !== timestamp;

  currentTimestamp.value = timestamp;
  currentDate.value = new Date(timestamp);
  return hasChanged;
}

function setVideoPoolCalculationStartDate(poolId, date) {
  if (!isVideoPoolId(poolId)) {
    return false;
  }

  const timestamp = new Date(date).getTime();
  if (!Number.isFinite(timestamp)) {
    return false;
  }

  videoCalculationStartDatesByPool.value[poolId] = timestamp;
  currentTimestamp.value = timestamp;
  currentDate.value = new Date(timestamp);
  return true;
}

function clampVideoPoolImageLayoutValue(value, min, max, fallback) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, numericValue));
}

function normalizeVideoPoolImageLayout(layout) {
  return {
    scale: clampVideoPoolImageLayoutValue(
      layout?.scale,
      VIDEO_POOL_IMAGE_SCALE_MIN,
      VIDEO_POOL_IMAGE_SCALE_MAX,
      DEFAULT_VIDEO_POOL_IMAGE_LAYOUT.scale
    ),
    positionX: clampVideoPoolImageLayoutValue(layout?.positionX, 0, 100, DEFAULT_VIDEO_POOL_IMAGE_LAYOUT.positionX),
    positionY: clampVideoPoolImageLayoutValue(layout?.positionY, 0, 100, DEFAULT_VIDEO_POOL_IMAGE_LAYOUT.positionY),
  };
}

function createVideoPoolImageLayouts() {
  return Object.fromEntries(
    allVideoPoolOptions.map((pool) => [pool.id, { ...DEFAULT_VIDEO_POOL_IMAGE_LAYOUT }])
  );
}

function normalizeVideoPoolImageLayouts(layouts) {
  const normalizedLayouts = createVideoPoolImageLayouts();
  const restoredPoolIds = new Set();

  for (const [poolId, layout] of Object.entries(layouts || {})) {
    const normalizedPoolId = normalizeVideoPoolId(poolId);
    if (!isVideoPoolId(normalizedPoolId)) {
      continue;
    }

    if (!restoredPoolIds.has(normalizedPoolId) || normalizedPoolId === poolId) {
      normalizedLayouts[normalizedPoolId] = normalizeVideoPoolImageLayout(layout);
      restoredPoolIds.add(normalizedPoolId);
    }
  }

  return normalizedLayouts;
}

const editingVideoPoolImageLayout = computed(() => videoPoolImageLayouts.value[editingVideoPoolId.value]);

function getVideoPoolImageStyle(poolId) {
  const layout = videoPoolImageLayouts.value[poolId] || DEFAULT_VIDEO_POOL_IMAGE_LAYOUT;
  const scale = layout.scale / 100;
  // Keep 0% and 100% aligned with the two visible crop edges after zooming.
  const translateX = ((50 - layout.positionX) / 100) * (scale - 1) * 100;
  const translateY = ((50 - layout.positionY) / 100) * (scale - 1) * 100;
  return {
    objectPosition: `${layout.positionX}% ${layout.positionY}%`,
    transform: `translate(${translateX}%, ${translateY}%) scale(${scale})`,
  };
}

function resetVideoPoolImageLayout(poolId = editingVideoPoolId.value) {
  const normalizedPoolId = normalizeVideoPoolId(poolId);
  if (!isVideoPoolId(normalizedPoolId)) {
    return;
  }

  videoPoolImageLayouts.value[normalizedPoolId] = { ...DEFAULT_VIDEO_POOL_IMAGE_LAYOUT };
}

function normalizeVideoPoolImages(poolImages) {
  const normalizedImages = {};

  for (const [poolId, imageFile] of Object.entries(poolImages || {})) {
    const normalizedPoolId = normalizeVideoPoolId(poolId);
    if (!isVideoPoolId(normalizedPoolId) || !(imageFile instanceof Blob)) {
      continue;
    }

    if (!Object.hasOwn(normalizedImages, normalizedPoolId) || normalizedPoolId === poolId) {
      normalizedImages[normalizedPoolId] = imageFile;
    }
  }

  return normalizedImages;
}

function setVideoPoolImage(poolId, imageFile) {
  if (!Object.hasOwn(videoPoolImages.value, poolId)) {
    return;
  }

  if (videoPoolImageUrls[poolId]) {
    URL.revokeObjectURL(videoPoolImageUrls[poolId]);
  }

  videoPoolImageUrls[poolId] = "";
  videoPoolImages.value[poolId] = "";
  delete videoPoolImageFiles[poolId];

  if (!imageFile) {
    return;
  }

  videoPoolImageFiles[poolId] = imageFile;
  const imageUrl = URL.createObjectURL(imageFile);
  videoPoolImageUrls[poolId] = imageUrl;
  videoPoolImages.value[poolId] = imageUrl;
}

function resetStageBackgroundImageLayout() {
  stageBackgroundImageScale.value = 100;
  stageBackgroundImagePositionX.value = 50;
  stageBackgroundImagePositionY.value = 50;
  stageBackgroundImageOpacity.value = 72;
  stageBackgroundImageBlur.value = 8;
  stageBackgroundImageBrightness.value = 58;
  stageBackgroundImageSaturation.value = 42;
  stageBackgroundOverlayOpacity.value = 54;
}

function resetStageLogoLayout() {
  stageLogoWidth.value = 180;
  stageLogoLeft.value = 0;
  stageLogoBottom.value = 44;
  stageLogoOpacity.value = 88;
}

function getStageAssetRef(assetId) {
  return assetId === "background" ? stageBackgroundImage : stageLogoImage;
}

function setStageAssetImage(assetId, imageFile) {
  const imageRef = getStageAssetRef(assetId);
  if (stageAssetUrls[assetId]) {
    URL.revokeObjectURL(stageAssetUrls[assetId]);
  }

  stageAssetUrls[assetId] = "";
  imageRef.value = "";
  stageAssetFiles[assetId] = null;
  if (!imageFile) {
    return;
  }

  stageAssetFiles[assetId] = imageFile;
  const imageUrl = URL.createObjectURL(imageFile);
  stageAssetUrls[assetId] = imageUrl;
  imageRef.value = imageUrl;
}

function getStageBackgroundImageStyle() {
  const scale = stageBackgroundImageScale.value / 100;
  const translateX = ((50 - stageBackgroundImagePositionX.value) / 100) * (scale - 1) * 100;
  const translateY = ((50 - stageBackgroundImagePositionY.value) / 100) * (scale - 1) * 100;

  return {
    objectPosition: `${stageBackgroundImagePositionX.value}% ${stageBackgroundImagePositionY.value}%`,
    transform: `translate(${translateX}%, ${translateY}%) scale(${scale})`,
  };
}

function updateStageCursorPosition(event) {
  if (!customStageCursorEnabled.value || event.pointerType === "touch") {
    return;
  }

  const canvasElement = event.currentTarget;
  const canvasRect = canvasElement.getBoundingClientRect();
  if (!canvasRect.width || !canvasRect.height) {
    return;
  }

  pendingStageCursorPosition = {
    x: Math.min(
      PREVIEW_STAGE_WIDTH,
      Math.max(0, ((event.clientX - canvasRect.left) / canvasRect.width) * PREVIEW_STAGE_WIDTH)
    ),
    y: Math.min(
      PREVIEW_STAGE_HEIGHT,
      Math.max(0, ((event.clientY - canvasRect.top) / canvasRect.height) * PREVIEW_STAGE_HEIGHT)
    ),
  };

  if (stageCursorAnimationFrame) {
    return;
  }

  stageCursorAnimationFrame = window.requestAnimationFrame(() => {
    stageCursorAnimationFrame = 0;
    const cursorElement = stageCursorElement.value;
    const cursorPosition = pendingStageCursorPosition;
    pendingStageCursorPosition = null;
    if (!cursorElement || !cursorPosition) {
      return;
    }

    cursorElement.style.transform = `translate3d(${cursorPosition.x}px, ${cursorPosition.y}px, 0)`;
  });
}

function handleStageCursorEnter(event) {
  if (!customStageCursorEnabled.value || event.pointerType === "touch") {
    return;
  }

  stageCursorVisible.value = true;
  updateStageCursorPosition(event);
}

function handleStageCursorMove(event) {
  if (!customStageCursorEnabled.value || event.pointerType === "touch") {
    return;
  }

  stageCursorVisible.value = true;
  updateStageCursorPosition(event);
}

function handleStageCursorLeave() {
  stageCursorVisible.value = false;
}

function clearStageCursorClickEffect() {
  if (stageCursorClickTimer) {
    clearTimeout(stageCursorClickTimer);
    stageCursorClickTimer = 0;
  }
  stageCursorElement.value?.classList.remove("is-clicking");
}

function handleStageCursorClick(event) {
  if (!customStageCursorEnabled.value || event.pointerType === "touch") {
    return;
  }

  updateStageCursorPosition(event);
  const cursorElement = stageCursorElement.value;
  if (!cursorElement) {
    return;
  }

  clearStageCursorClickEffect();
  void cursorElement.offsetWidth;
  cursorElement.classList.add("is-clicking");
  stageCursorClickTimer = window.setTimeout(() => {
    cursorElement.classList.remove("is-clicking");
    stageCursorClickTimer = 0;
  }, 380);
}

watch(customStageCursorEnabled, (enabled) => {
  if (!enabled) {
    stageCursorVisible.value = false;
    clearStageCursorClickEffect();
  }
});

function updateStageAssetImage(assetId, uploadFile) {
  if (!uploadFile?.raw) {
    return;
  }

  if (assetId === "background") {
    resetStageBackgroundImageLayout();
  } else {
    resetStageLogoLayout();
  }
  setStageAssetImage(assetId, uploadFile.raw);
  if (gachaVideoDraftRestored) {
    saveStageAssetImage(assetId, uploadFile.raw);
  }
}

function clearStageAssetImage(assetId) {
  setStageAssetImage(assetId, null);
  if (gachaVideoDraftRestored) {
    saveStageAssetImage(assetId, null);
  }
}

function cancelVideoPoolTransition() {
  if (videoPoolTransitionTimer) {
    clearTimeout(videoPoolTransitionTimer);
    videoPoolTransitionTimer = 0;
  }
  videoPoolTransitionPhase.value = "";
}

function applyVideoPoolSelection(pool) {
  if (activeCardName.value !== "calculationResult") {
    selectVideoCard("calculationResult");
  }

  const poolId = pool.id;
  editingVideoPoolId.value = poolId;
  editingVideoRechargePoolId.value = poolId;
  selectedVideoPool.value = poolId;
  const startDateChanged = activateVideoPoolCalculationStartDate(poolId);
  if (startDateChanged) {
    batchGenerationServerMaintenanceRewards();
    batchGenerationMonthlyPack();
    getAndSortPackData();
  }
  calPoolEnd.value = true;
  updateScheduleOption(pool.scheduleIndex);
}

function selectVideoPool(poolId) {
  const pool = enabledVideoPoolOptions.value.find((item) => item.id === poolId);
  if (
    !pool ||
    pool.disabled ||
    poolId === selectedVideoPool.value ||
    videoPoolTransitionPhase.value
  ) {
    return;
  }

  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
    applyVideoPoolSelection(pool);
    return;
  }

  videoPoolTransitionPhase.value = "out";
  videoPoolTransitionTimer = window.setTimeout(() => {
    applyVideoPoolSelection(pool);
    videoPoolTransitionPhase.value = "in";
    videoPoolTransitionTimer = window.setTimeout(() => {
      videoPoolTransitionPhase.value = "";
      videoPoolTransitionTimer = 0;
    }, VIDEO_POOL_TRANSITION_ENTER_DURATION);
  }, VIDEO_POOL_TRANSITION_EXIT_DURATION);
}

function selectVideoCard(cardName) {
  const previousCardName = activeCardName.value;

  if (previousCardName !== cardName) {
    if (previousCardName === "custom" && videoOrundumStrategy.value !== "none") {
      videoOrundumStrategy.value = "none";
      gachaResourcesCalculation();
    }

    if (
      previousCardName === "recharge" &&
      videoRechargePlanSelectionsByPool.value[selectedVideoPool.value] !== "no-spend"
    ) {
      videoRechargePlanSelectionsByPool.value[selectedVideoPool.value] = "no-spend";
    }
  }

  activeCardName.value = cardName;
  dataPanelCardName.value = cardName;
  navigationFlashCardName.value = "";

  window.requestAnimationFrame(() => {
    navigationFlashCardName.value = cardName;
    if (navigationFlashTimer) {
      clearTimeout(navigationFlashTimer);
    }
    navigationFlashTimer = window.setTimeout(() => {
      navigationFlashCardName.value = "";
      navigationFlashTimer = 0;
    }, 460);
  });
}

function updateVideoPoolImage(poolId, uploadFile) {
  if (!uploadFile?.raw) {
    return;
  }

  editingVideoPoolId.value = poolId;
  resetVideoPoolImageLayout(poolId);
  setVideoPoolImage(poolId, uploadFile.raw);
  if (gachaVideoDraftRestored) {
    saveVideoPoolImage(poolId, uploadFile.raw);
  }
}

onBeforeUnmount(() => {
  window.removeEventListener("pagehide", persistVideoGachaSettings);
  if (stageCursorAnimationFrame) {
    window.cancelAnimationFrame(stageCursorAnimationFrame);
    stageCursorAnimationFrame = 0;
  }
  clearStageCursorClickEffect();
  if (navigationFlashTimer) {
    clearTimeout(navigationFlashTimer);
    navigationFlashTimer = 0;
  }
  if (videoPoolTransitionTimer) {
    clearTimeout(videoPoolTransitionTimer);
    videoPoolTransitionTimer = 0;
  }
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

  for (const imageUrl of Object.values(stageAssetUrls)) {
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
  { label: "活动获得", draws: numberFloor(calculationResult.value.activityTotalDraw, 0), tone: "activity" },
  { label: "其他资源", draws: numberFloor(calculationResult.value.otherTotalDraw, 0), tone: "other" },
]);

const videoMonthlyCardSummary = computed(() => {
  const remainingDays = Math.max(0, Number(dailyReward.value.daily) || 0);
  const purchaseCount = remainingDays ? Math.ceil(remainingDays / 30) : 0;
  const orundum = remainingDays * 200;
  const originium = purchaseCount * 6;
  const originiumDraws = userConfigV2.value.originiumIsUsed ? originium * 0.3 : 0;

  return {
    days: remainingDays,
    price: purchaseCount * 30,
    orundum,
    originium,
    draws: orundum / 600 + originiumDraws,
  };
});
const videoMonthlyCardBonusDraw = computed(() => numberFloor(videoMonthlyCardSummary.value.draws, 0));

const VIDEO_ORUNDUM_STRATEGIES = Object.freeze([
  {
    id: "none",
    label: "不搓玉",
    coefficient: 0,
  },
  {
    id: "event-stage",
    label: "活动关搓玉",
    coefficient: 0.7,
  },
  {
    id: "1-7",
    label: "1-7搓玉",
    coefficient: 1.09,
  },
]);
const videoOrundumStrategy = ref("none");
const videoOrundumAp = computed(() => Math.max(0, Number(dailyReward.value.daily) || 0) * 240);
const activeVideoOrundumStrategy = computed(
  () => VIDEO_ORUNDUM_STRATEGIES.find((strategy) => strategy.id === videoOrundumStrategy.value) || VIDEO_ORUNDUM_STRATEGIES[0]
);
const videoOrundumStrategyCards = computed(() => {
  const ap = videoOrundumAp.value;

  return VIDEO_ORUNDUM_STRATEGIES.map((strategy) => ({
    ...strategy,
    isSelected: strategy.id === videoOrundumStrategy.value,
    orundum: strategy.id === "none" ? 0 : Math.ceil(ap * strategy.coefficient),
  }));
});

function selectVideoOrundumStrategy(strategyId) {
  if (!VIDEO_ORUNDUM_STRATEGIES.some((strategy) => strategy.id === strategyId)) {
    return;
  }

  videoOrundumStrategy.value = strategyId;
  gachaResourcesCalculation();
}

const standardNavigationItems = computed(() => [
  {
    id: "calculationResult",
    serial: "01",
    label: "总览",
    tone: "overview",
    draws: numberFloor(calculationResult.value.totalDraw, 0) + videoRechargeNavigationOverviewDraws.value,
  },
  { id: "daily", serial: "02", label: "日常积累", tone: "daily", draws: numberFloor(calculationResult.value.dailyTotalDraw, 0) },
  { id: "activity", serial: "03", label: "活动获得", tone: "activity", draws: numberFloor(calculationResult.value.activityTotalDraw, 0) },
  { id: "other", serial: "04", label: "其他资源", tone: "other", draws: numberFloor(calculationResult.value.otherTotalDraw, 0) },
]);

const videoResourceImageSources = Object.freeze({
  合成玉: "/image/icon/gacha-calculator/orundum.png",
  源石: "/image/icon/gacha-calculator/originium.png",
  单抽: "/image/icon/gacha-calculator/single-permit.png",
  十连: "/image/icon/gacha-calculator/ten-permit.png",
  抽: "/image/icon/gacha-calculator/single-permit.png",
});

function getVideoResourceImageSrc(resourceName) {
  return videoResourceImageSources[resourceName] || videoResourceImageSources.抽;
}

function formatVideoAnchorDate(date, includeYear) {
  return dateFormat(date, includeYear ? "yyyy.MM.dd" : "MM.dd");
}

const videoOverviewTimeAnchor = computed(() => {
  const from = new Date(currentTimestamp.value);
  const to = new Date(endDate.value);
  const includeYear = from.getFullYear() !== to.getFullYear();

  return {
    from: formatVideoAnchorDate(from, includeYear),
    to: formatVideoAnchorDate(to, includeYear),
  };
});

const videoDailyRows = computed(() => [
  { label: `日常 ${dailyReward.value.daily} 天`, resources: [{ value: dailyReward.value.dailyOrundumReward, unit: "合成玉" }] },
  { label: `周常 ${dailyReward.value.weekly} 周`, resources: [{ value: dailyReward.value.weeklyOrundumReward, unit: "合成玉" }] },
  { label: `剿灭 ${dailyReward.value.annihilation} 周`, resources: [{ value: dailyReward.value.annihilationOrundumReward, unit: "合成玉" }] },
  { label: `绿票商店 ${dailyReward.value.certificateShoppingTimes} 月`, resources: [{ value: dailyReward.value.purchasedGachaTicketQuantity, unit: "单抽" }] },
  { label: `每月签到 ${dailyReward.value.checkIn} 次`, resources: [{ value: dailyReward.value.checkInGachaTicket, unit: "单抽" }] },
]);

const VIDEO_RESOURCE_OPTIONS = [
  { key: "originium", label: "源石", unit: "源石" },
  { key: "orundum", label: "合成玉", unit: "合成玉" },
  { key: "gachaTicket", label: "寻访凭证", unit: "单抽" },
  { key: "tenGachaTicket", label: "十连寻访凭证", unit: "十连" },
];

function summarizeVideoResources(rewards) {
  return VIDEO_RESOURCE_OPTIONS.map((option) => ({
    unit: option.unit,
    value: rewards.reduce((total, reward) => total + (Number(reward[option.key]) || 0), 0),
  })).filter((row) => row.value > 0);
}

function createVideoResourceRow(label, rewards) {
  const resources = summarizeVideoResources(rewards);
  return resources.length ? { label, resources } : null;
}

const videoActivityResourceRows = computed(() => {
  return Object.entries(activityScheduleList.value)
    .filter(([name, activity]) => {
      const isSelected = selectedActivityName.value.includes(name);
      return isSelected && ["act", "actRe"].includes(activity.rewardModule) && rewardIsExpired(activity);
    })
    .map(([name, activity]) => createVideoResourceRow(name, [activity]))
    .filter(Boolean);
});

const videoOtherResourceRows = computed(() => {
  const maintenanceGroups = new Map([
    ["停机更新", []],
    ["游戏维护", []],
  ]);
  const rows = [];

  for (const reward of otherRewardBySchedules.value.filter((item) => rewardIsExpired(item) && rewardIsEmpty(item))) {
    if (reward.name.includes("停机更新")) {
      maintenanceGroups.get("停机更新").push(reward);
      continue;
    }
    if (reward.name.includes("游戏维护")) {
      maintenanceGroups.get("游戏维护").push(reward);
      continue;
    }

    const row = createVideoResourceRow(reward.name, [reward]);
    if (row) {
      rows.push(row);
    }
  }

  const maintenanceRows = ["停机更新", "游戏维护"]
    .map((label) => createVideoResourceRow(label, maintenanceGroups.get(label)))
    .filter(Boolean);

  return selectedVideoPool.value === "p3r" ? [...rows, ...maintenanceRows] : [...maintenanceRows, ...rows];
});

function createVideoRechargePlansByPool() {
  return Object.fromEntries(allVideoPoolOptions.map((pool) => [pool.id, []]));
}

function createVideoRechargePlanSelectionsByPool() {
  return Object.fromEntries(allVideoPoolOptions.map((pool) => [pool.id, "no-spend"]));
}

function normalizeVideoRechargePlan(plan, usedIds) {
  const price = Number(plan?.price);
  const draws = Number.parseFloat(plan?.draws ?? plan?.description);
  let id = typeof plan?.id === "string" && plan.id ? plan.id : createId();

  while (usedIds.has(id)) {
    id = createId();
  }
  usedIds.add(id);

  return {
    id,
    price: Number.isFinite(price) ? Math.max(0, Math.round(price)) : 0,
    title: typeof plan?.title === "string" ? plan.title : "",
    draws: Number.isFinite(draws) ? Math.max(0, draws) : 0,
  };
}

function normalizeVideoRechargePlansByPool(plansByPool) {
  const normalizedPlans = createVideoRechargePlansByPool();

  for (const pool of allVideoPoolOptions) {
    const sourcePlans = Array.isArray(plansByPool?.[pool.id]) ? plansByPool[pool.id] : [];
    const usedIds = new Set();
    normalizedPlans[pool.id] = sourcePlans.map((plan) => normalizeVideoRechargePlan(plan, usedIds));
  }

  return normalizedPlans;
}

function normalizeVideoRechargePlanSelectionsByPool(selectionsByPool, plansByPool) {
  const normalizedSelections = createVideoRechargePlanSelectionsByPool();

  for (const pool of allVideoPoolOptions) {
    const selectedPlanId = selectionsByPool?.[pool.id];
    const customPlans = plansByPool?.[pool.id] || [];
    const isAvailablePlan =
      selectedPlanId === "no-spend" ||
      selectedPlanId === "monthly-card" ||
      customPlans.some((plan) => plan.id === selectedPlanId);

    if (isAvailablePlan) {
      normalizedSelections[pool.id] = selectedPlanId;
    }
  }

  return normalizedSelections;
}

const videoRechargePlansByPool = ref(createVideoRechargePlansByPool());
const videoRechargePlanSelectionsByPool = ref(createVideoRechargePlanSelectionsByPool());
const editingVideoRechargePlans = computed(() => videoRechargePlansByPool.value[editingVideoRechargePoolId.value] || []);
const currentVideoPool = computed(
  () =>
    enabledVideoPoolOptions.value.find((pool) => pool.id === selectedVideoPool.value) ||
    enabledVideoPoolOptions.value[0] ||
    allVideoPoolOptions[0]
);
const currentVideoRechargeCustomPlans = computed(() => videoRechargePlansByPool.value[selectedVideoPool.value] || []);
const videoMonthlyCardPlan = computed(() => {
  const monthlyCard = videoMonthlyCardSummary.value;

  return {
    id: "monthly-card",
    type: "monthly-card",
    price: monthlyCard.price,
    title: `月卡（${monthlyCard.days}天）`,
    draws: monthlyCard.draws,
    navDraws: numberFloor(monthlyCard.draws, 0),
  };
});
const videoRechargePlans = computed(() => [
  {
    id: "no-spend",
    type: "no-spend",
    price: 0,
    title: "无氪",
    draws: 0,
  },
  videoMonthlyCardPlan.value,
  ...currentVideoRechargeCustomPlans.value.map((plan) => ({
    ...plan,
    type: "custom",
    title: plan.title || "未命名方案",
    navDraws: numberFloor(plan.draws, 0),
  })),
]);
const selectedVideoRechargePlan = computed(() => {
  const selectedPlanId = videoRechargePlanSelectionsByPool.value[selectedVideoPool.value];
  return videoRechargePlans.value.find((plan) => plan.id === selectedPlanId) || videoRechargePlans.value[0];
});
const videoRechargeNavigationOverviewDraws = computed(() =>
  numberFloor(selectedVideoRechargePlan.value.draws, 0)
);
const selectedVideoRechargePlanMeta = computed(() => {
  const plan = selectedVideoRechargePlan.value;
  return plan.type === "no-spend" ? "¥ 0 无氪" : formatVideoRechargePrice(plan.price);
});
const personalNavigationItems = computed(() => [
  {
    id: "custom",
    marker: "CUSTOM",
    label: "搓玉",
    tone: "custom",
    draws:
      activeVideoOrundumStrategy.value.id === "none"
        ? undefined
        : numberFloor(calculationResult.value.produceOrundumTotalDraw, 0),
    meta: activeVideoOrundumStrategy.value.id === "none" ? "不搓玉" : undefined,
  },
  {
    id: "recharge",
    marker: "PLAN",
    label: "氪金",
    tone: "recharge",
    meta: selectedVideoRechargePlanMeta.value,
    navDraws: selectedVideoRechargePlan.value.navDraws,
  },
]);

function formatVideoRechargePrice(price) {
  return `¥ ${Math.max(0, Math.round(Number(price) || 0))}`;
}

function formatVideoRechargeDraws(draws) {
  return Math.max(0, Number(draws) || 0).toFixed(1);
}

function selectVideoRechargePlan(planId) {
  if (!videoRechargePlans.value.some((plan) => plan.id === planId)) {
    return;
  }

  videoRechargePlanSelectionsByPool.value[selectedVideoPool.value] = planId;
}

function addVideoRechargePlan() {
  const plans = videoRechargePlansByPool.value[editingVideoRechargePoolId.value];
  if (!plans) {
    return;
  }

  plans.push({
    id: createId(),
    price: 0,
    title: "新方案",
    draws: 0,
  });
}

function removeVideoRechargePlan(planId) {
  const plans = videoRechargePlansByPool.value[editingVideoRechargePoolId.value];
  if (!plans) {
    return;
  }

  const planIndex = plans.findIndex((plan) => plan.id === planId);
  if (planIndex >= 0) {
    plans.splice(planIndex, 1);
    if (videoRechargePlanSelectionsByPool.value[editingVideoRechargePoolId.value] === planId) {
      videoRechargePlanSelectionsByPool.value[editingVideoRechargePoolId.value] = "no-spend";
    }
  }
}

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
      stageBackgroundImageScale: stageBackgroundImageScale.value,
      stageBackgroundImagePositionX: stageBackgroundImagePositionX.value,
      stageBackgroundImagePositionY: stageBackgroundImagePositionY.value,
      stageBackgroundImageOpacity: stageBackgroundImageOpacity.value,
      stageBackgroundImageBlur: stageBackgroundImageBlur.value,
      stageBackgroundImageBrightness: stageBackgroundImageBrightness.value,
      stageBackgroundImageSaturation: stageBackgroundImageSaturation.value,
      stageBackgroundOverlayOpacity: stageBackgroundOverlayOpacity.value,
      stageLogoWidth: stageLogoWidth.value,
      stageLogoLeft: stageLogoLeft.value,
      stageLogoBottom: stageLogoBottom.value,
      stageLogoOpacity: stageLogoOpacity.value,
      stageReferenceGuidesVisible: stageReferenceGuidesVisible.value,
      customStageCursorEnabled: customStageCursorEnabled.value,
      stageCursorBorderWidth: stageCursorBorderWidth.value,
      stageCursorColor: stageCursorColor.value,
      leftPerspective: leftPerspective.value,
      rightPerspective: rightPerspective.value,
      navigationOpacity: navigationOpacity.value,
      detailCardOpacity: detailCardOpacity.value,
      detailCardBackgroundColor: detailCardBackgroundColor.value,
      inactivePoolImageBlur: inactivePoolImageBlur.value,
      inactivePoolImageContrastReduction: inactivePoolImageContrastReduction.value,
      navigationNumberStyle: navigationNumberStyle.value,
      navigationGroupHeadingLight: navigationGroupHeadingLight.value,
      stageFloatIntensity: stageFloatIntensity.value,
      stageTopMargin: stageTopMargin.value,
      stageBottomMargin: stageBottomMargin.value,
      stageLeftMargin: stageLeftMargin.value,
      stageRightMargin: stageRightMargin.value,
      cardGroupWidth: cardGroupWidth.value,
      rightCardHeight: rightCardHeight.value,
    },
    view: {
      previewScalePercent: previewScalePercent.value,
      settingsTab: settingsTab.value,
      activeCardName: activeCardName.value,
      dataPanelCardName: dataPanelCardName.value,
      enabledVideoPoolIds: [...enabledVideoPoolIds.value],
      selectedVideoPool: selectedVideoPool.value,
      editingVideoPoolId: editingVideoPoolId.value,
      editingVideoRechargePoolId: editingVideoRechargePoolId.value,
      poolImageLayouts: Object.fromEntries(
        Object.entries(videoPoolImageLayouts.value).map(([poolId, layout]) => [poolId, { ...layout }])
      ),
      calculationStartDatesByPool: { ...videoCalculationStartDatesByPool.value },
      rechargePlansByPool: Object.fromEntries(
        Object.entries(videoRechargePlansByPool.value).map(([poolId, plans]) => [
          poolId,
          plans.map((plan) => ({ ...plan })),
        ])
      ),
      rechargePlanSelectionsByPool: { ...videoRechargePlanSelectionsByPool.value },
    },
    calculation: {
      userConfig: { ...userConfigV2.value },
      calculationStartDate: currentTimestamp.value,
      currentTimestamp: currentTimestamp.value,
      calPoolEnd: calPoolEnd.value,
      orundumStrategy: videoOrundumStrategy.value,
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

async function saveStageAssetImage(assetId, imageFile) {
  try {
    if (imageFile) {
      await gachaVideoDraftDb.table("stageAssets").put({
        id: assetId,
        imageFile,
        updatedAt: Date.now(),
      });
      return;
    }

    await gachaVideoDraftDb.table("stageAssets").delete(assetId);
  } catch (error) {
    console.warn(`Failed to save ${assetId} stage asset.`, error);
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
    return normalizeVideoPoolImages(
      Object.fromEntries(records.filter((record) => record.imageFile instanceof Blob).map((record) => [record.id, record.imageFile]))
    );
  } catch (error) {
    console.warn("Failed to restore gacha video pool images.", error);
    return {};
  }
}

async function readStageAssets() {
  try {
    const records = await gachaVideoDraftDb.table("stageAssets").toArray();
    return Object.fromEntries(
      records
        .filter((record) => ["background", "logo"].includes(record.id) && record.imageFile instanceof Blob)
        .map((record) => [record.id, record.imageFile])
    );
  } catch (error) {
    console.warn("Failed to restore gacha video stage assets.", error);
    return {};
  }
}

async function readVideoGachaDraft() {
  const settings = readVideoGachaSettings();

  try {
    const [draft, poolImages, stageAssets] = await Promise.all([
      gachaVideoDraftDb.table("drafts").get(GACHA_VIDEO_DRAFT_ID),
      readVideoPoolImages(),
      readStageAssets(),
    ]);
    if (!settings) {
      return draft
        ? {
            ...draft,
            poolImages: Object.keys(poolImages).length ? poolImages : draft.poolImages || {},
            stageAssets: Object.keys(stageAssets).length ? stageAssets : draft.stageAssets || {},
          }
        : Object.keys(poolImages).length || Object.keys(stageAssets).length
          ? { poolImages, stageAssets }
          : null;
    }

    return {
      ...settings,
      poolImages: Object.keys(poolImages).length ? poolImages : draft?.poolImages || {},
      stageAssets: Object.keys(stageAssets).length ? stageAssets : draft?.stageAssets || {},
    };
  } catch (error) {
    console.warn("Failed to restore gacha video draft.", error);
    return settings;
  }
}

function isPlainRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readBlobAsDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result));
    reader.addEventListener("error", () => reject(reader.error || new Error("图片读取失败")));
    reader.readAsDataURL(blob);
  });
}

async function encodeImageAssetMap(imageAssets) {
  const entries = await Promise.all(
    Object.entries(imageAssets)
      .filter(([, imageFile]) => imageFile instanceof Blob)
      .map(async ([assetId, imageFile]) => [assetId, await readBlobAsDataUrl(imageFile)])
  );
  return Object.fromEntries(entries);
}

function decodeImageDataUrl(dataUrl, assetLabel) {
  if (typeof dataUrl !== "string") {
    throw new Error(`${assetLabel}的图片数据无效`);
  }

  const match = dataUrl.match(/^data:([^;,]+);base64,([\s\S]*)$/);
  if (!match || !match[1].startsWith("image/")) {
    throw new Error(`${assetLabel}不是有效的图片`);
  }

  let binaryString;
  try {
    binaryString = window.atob(match[2]);
  } catch {
    throw new Error(`${assetLabel}的图片编码损坏`);
  }

  const bytes = new Uint8Array(binaryString.length);
  for (let index = 0; index < binaryString.length; index++) {
    bytes[index] = binaryString.charCodeAt(index);
  }
  return new Blob([bytes], { type: match[1] });
}

function decodeImageAssetMap(encodedAssets, allowedAssetIds, assetGroupLabel) {
  if (encodedAssets === undefined || encodedAssets === null) {
    return {};
  }
  if (!isPlainRecord(encodedAssets)) {
    throw new Error(`${assetGroupLabel}格式无效`);
  }

  const decodedAssets = {};
  for (const assetId of allowedAssetIds) {
    if (Object.hasOwn(encodedAssets, assetId)) {
      decodedAssets[assetId] = decodeImageDataUrl(encodedAssets[assetId], `${assetGroupLabel}“${assetId}”`);
    }
  }
  return decodedAssets;
}

function getVideoGachaSettingsExportFileName() {
  const now = new Date();
  const date = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("");
  const time = [String(now.getHours()).padStart(2, "0"), String(now.getMinutes()).padStart(2, "0")].join("");
  return `攒抽制图设置-${date}-${time}.ytlgacha`;
}

async function exportVideoGachaSettings() {
  if (videoGachaSettingsTransferPending.value) {
    return;
  }

  videoGachaSettingsTransferPending.value = true;
  try {
    const poolImages = normalizeVideoPoolImages(videoPoolImageFiles);
    const stageAssets = Object.fromEntries(
      Object.entries(stageAssetFiles).filter(([, imageFile]) => imageFile instanceof Blob)
    );
    const [encodedPoolImages, encodedStageAssets] = await Promise.all([
      encodeImageAssetMap(poolImages),
      encodeImageAssetMap(stageAssets),
    ]);
    const payload = {
      format: GACHA_VIDEO_SETTINGS_FILE_FORMAT,
      schemaVersion: GACHA_VIDEO_SETTINGS_FILE_VERSION,
      exportedAt: new Date().toISOString(),
      draft: getVideoGachaDraft(),
      assets: {
        poolImages: encodedPoolImages,
        stageAssets: encodedStageAssets,
      },
    };
    const exportFile = new Blob([JSON.stringify(payload)], {
      type: "application/json;charset=utf-8",
    });

    saveAs(exportFile, getVideoGachaSettingsExportFileName());
    createMessage({ type: "success", text: "攒抽制图设置已导出" });
  } catch (error) {
    console.warn("Failed to export gacha video settings.", error);
    createMessage({ type: "error", text: `设置导出失败：${error.message || "未知错误"}` });
  } finally {
    videoGachaSettingsTransferPending.value = false;
  }
}

async function parseVideoGachaSettingsFile(settingsFile) {
  if (!(settingsFile instanceof File) || settingsFile.size === 0) {
    throw new Error("没有读取到有效的设置文件");
  }
  if (settingsFile.size > GACHA_VIDEO_SETTINGS_FILE_MAX_SIZE) {
    throw new Error("设置文件超过 128MB，无法导入");
  }

  let payload;
  try {
    payload = JSON.parse(await settingsFile.text());
  } catch {
    throw new Error("设置文件不是有效的 JSON");
  }

  if (!isPlainRecord(payload) || payload.format !== GACHA_VIDEO_SETTINGS_FILE_FORMAT) {
    throw new Error("这不是攒抽制图设置文件");
  }

  const schemaVersion = Number(payload.schemaVersion);
  if (!Number.isInteger(schemaVersion) || schemaVersion < 1) {
    throw new Error("设置文件版本无效");
  }
  if (schemaVersion > GACHA_VIDEO_SETTINGS_FILE_VERSION) {
    throw new Error("设置文件来自更高版本，请更新页面后再导入");
  }
  if (!isPlainRecord(payload.draft)) {
    throw new Error("设置文件缺少草稿数据");
  }

  const assets = isPlainRecord(payload.assets) ? payload.assets : {};
  return {
    exportedAt: payload.exportedAt,
    draft: payload.draft,
    poolImages: decodeImageAssetMap(
      assets.poolImages,
      allVideoPoolOptions.map((pool) => pool.id),
      "卡池头图"
    ),
    stageAssets: decodeImageAssetMap(assets.stageAssets, ["background", "logo"], "舞台图片"),
  };
}

async function replaceStoredVideoGachaSettings(draft, poolImages, stageAssets) {
  const { poolImages: ignoredPoolImages, stageAssets: ignoredStageAssets, ...draftWithoutAssets } = draft;
  const updatedAt = Date.now();
  const storedDraft = {
    ...draftWithoutAssets,
    id: GACHA_VIDEO_DRAFT_ID,
    updatedAt,
  };
  const draftTable = gachaVideoDraftDb.table("drafts");
  const poolImageTable = gachaVideoDraftDb.table("poolImages");
  const stageAssetTable = gachaVideoDraftDb.table("stageAssets");

  await gachaVideoDraftDb.transaction("rw", draftTable, poolImageTable, stageAssetTable, async () => {
    await draftTable.put(storedDraft);
    await poolImageTable.clear();
    await stageAssetTable.clear();

    const poolImageRecords = Object.entries(poolImages).map(([id, imageFile]) => ({
      id,
      imageFile,
      updatedAt,
    }));
    const stageAssetRecords = Object.entries(stageAssets).map(([id, imageFile]) => ({
      id,
      imageFile,
      updatedAt,
    }));
    if (poolImageRecords.length) {
      await poolImageTable.bulkPut(poolImageRecords);
    }
    if (stageAssetRecords.length) {
      await stageAssetTable.bulkPut(stageAssetRecords);
    }
  });

  localStorage.setItem(GACHA_VIDEO_SETTINGS_STORAGE_KEY, JSON.stringify(storedDraft));
}

function openVideoGachaSettingsImport() {
  if (!videoGachaSettingsTransferPending.value) {
    videoGachaSettingsFileInput.value?.click();
  }
}

async function handleVideoGachaSettingsImport(event) {
  const fileInput = event.target;
  const settingsFile = fileInput.files?.[0];
  fileInput.value = "";
  if (!settingsFile || videoGachaSettingsTransferPending.value) {
    return;
  }

  videoGachaSettingsTransferPending.value = true;
  let reloadScheduled = false;
  try {
    const importedSettings = await parseVideoGachaSettingsFile(settingsFile);
    const exportedAt = new Date(importedSettings.exportedAt);
    const exportedAtText = Number.isNaN(exportedAt.getTime())
      ? ""
      : `\n导出时间：${exportedAt.toLocaleString("zh-CN")}`;

    await ElMessageBox.confirm(
      `导入“${settingsFile.name}”将覆盖当前全部参数和图片。${exportedAtText}`,
      "导入攒抽制图设置",
      {
        confirmButtonText: "导入并覆盖",
        cancelButtonText: "取消",
        type: "warning",
      }
    );

    if (gachaVideoDraftSaveTimer) {
      clearTimeout(gachaVideoDraftSaveTimer);
      gachaVideoDraftSaveTimer = 0;
    }
    gachaVideoDraftRestored = false;
    await replaceStoredVideoGachaSettings(
      importedSettings.draft,
      importedSettings.poolImages,
      importedSettings.stageAssets
    );

    reloadScheduled = true;
    createMessage({ type: "success", text: "设置导入成功，正在重新加载" });
    window.setTimeout(() => window.location.reload(), 450);
  } catch (error) {
    if (error !== "cancel" && error !== "close") {
      console.warn("Failed to import gacha video settings.", error);
      createMessage({ type: "error", text: `设置导入失败：${error.message || "未知错误"}` });
    }
  } finally {
    if (!reloadScheduled) {
      gachaVideoDraftRestored = true;
      videoGachaSettingsTransferPending.value = false;
    }
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
  restoreNumberSetting(stageBackgroundImageScale, canvas.stageBackgroundImageScale);
  restoreNumberSetting(stageBackgroundImagePositionX, canvas.stageBackgroundImagePositionX);
  restoreNumberSetting(stageBackgroundImagePositionY, canvas.stageBackgroundImagePositionY);
  restoreNumberSetting(stageBackgroundImageOpacity, canvas.stageBackgroundImageOpacity);
  restoreNumberSetting(stageBackgroundImageBlur, canvas.stageBackgroundImageBlur);
  restoreNumberSetting(stageBackgroundImageBrightness, canvas.stageBackgroundImageBrightness);
  restoreNumberSetting(stageBackgroundImageSaturation, canvas.stageBackgroundImageSaturation);
  restoreNumberSetting(stageBackgroundOverlayOpacity, canvas.stageBackgroundOverlayOpacity);
  restoreNumberSetting(stageLogoWidth, canvas.stageLogoWidth);
  restoreNumberSetting(stageLogoLeft, canvas.stageLogoLeft);
  restoreNumberSetting(stageLogoBottom, canvas.stageLogoBottom);
  restoreNumberSetting(stageLogoOpacity, canvas.stageLogoOpacity);
  if (typeof canvas.stageReferenceGuidesVisible === "boolean") {
    stageReferenceGuidesVisible.value = canvas.stageReferenceGuidesVisible;
  }
  if (typeof canvas.customStageCursorEnabled === "boolean") {
    customStageCursorEnabled.value = canvas.customStageCursorEnabled;
  }
  restoreNumberSetting(stageCursorBorderWidth, canvas.stageCursorBorderWidth);
  stageCursorBorderWidth.value = Math.min(8, Math.max(1, stageCursorBorderWidth.value));
  if (STAGE_CURSOR_COLOR_OPTIONS.some((option) => option.value === canvas.stageCursorColor)) {
    stageCursorColor.value = canvas.stageCursorColor;
  }
  restoreNumberSetting(leftPerspective, canvas.leftPerspective);
  restoreNumberSetting(rightPerspective, canvas.rightPerspective);
  restoreNumberSetting(navigationOpacity, canvas.navigationOpacity);
  restoreNumberSetting(detailCardOpacity, canvas.detailCardOpacity);
  if (typeof canvas.detailCardBackgroundColor === "string") {
    detailCardBackgroundColor.value = canvas.detailCardBackgroundColor;
  }
  restoreNumberSetting(inactivePoolImageBlur, canvas.inactivePoolImageBlur);
  restoreNumberSetting(inactivePoolImageContrastReduction, canvas.inactivePoolImageContrastReduction);
  if (NAVIGATION_NUMBER_STYLE_OPTIONS.some((option) => option.value === canvas.navigationNumberStyle)) {
    navigationNumberStyle.value = canvas.navigationNumberStyle;
  }
  if (typeof canvas.navigationGroupHeadingLight === "boolean") {
    navigationGroupHeadingLight.value = canvas.navigationGroupHeadingLight;
  }
  restoreNumberSetting(stageFloatIntensity, canvas.stageFloatIntensity);
  restoreNumberSetting(stageTopMargin, canvas.stageTopMargin);
  restoreNumberSetting(stageBottomMargin, canvas.stageBottomMargin);
  restoreNumberSetting(stageLeftMargin, canvas.stageLeftMargin);
  restoreNumberSetting(stageRightMargin, canvas.stageRightMargin);
  restoreNumberSetting(cardGroupWidth, canvas.cardGroupWidth);
  restoreNumberSetting(rightCardHeight, canvas.rightCardHeight);
  rightCardHeight.value = Math.min(
    maxRightCardHeight.value,
    Math.max(VIDEO_DETAIL_MIN_HEIGHT, rightCardHeight.value)
  );

  const view = draft.view || {};
  const restoredPreviewScalePercent = Number(view.previewScalePercent);
  if (PREVIEW_SCALE_OPTIONS.includes(restoredPreviewScalePercent)) {
    previewScalePercent.value = restoredPreviewScalePercent;
  } else if (Number.isFinite(restoredPreviewScalePercent)) {
    previewScalePercent.value = PREVIEW_SCALE_OPTIONS.reduce((closestScale, scale) =>
      Math.abs(scale - restoredPreviewScalePercent) < Math.abs(closestScale - restoredPreviewScalePercent)
        ? scale
        : closestScale
    );
  } else if (view.workspaceMode === "edit") {
    previewScalePercent.value = 40;
  } else if (view.workspaceMode === "display") {
    previewScalePercent.value = 80;
  }
  if (view.settingsTab === "canvas" || view.settingsTab === "data") {
    settingsTab.value = view.settingsTab;
  }
  if (Object.hasOwn(cardTitles, view.activeCardName)) {
    activeCardName.value = view.activeCardName;
  }
  if (Object.hasOwn(cardTitles, view.dataPanelCardName)) {
    dataPanelCardName.value = view.dataPanelCardName;
  }
  enabledVideoPoolIds.value = normalizeEnabledVideoPoolIds(view.enabledVideoPoolIds);
  const restoredPoolId = normalizeVideoPoolId(view.selectedVideoPool);
  selectedVideoPool.value = isVideoPoolEnabled(restoredPoolId)
    ? restoredPoolId
    : enabledVideoPoolOptions.value[0].id;
  videoPoolImageLayouts.value = normalizeVideoPoolImageLayouts(view.poolImageLayouts);
  const restoredEditingPoolId = normalizeVideoPoolId(view.editingVideoPoolId);
  editingVideoPoolId.value = isVideoPoolEnabled(restoredEditingPoolId)
    ? restoredEditingPoolId
    : selectedVideoPool.value;
  const restoredEditingRechargePoolId = normalizeVideoPoolId(view.editingVideoRechargePoolId);
  editingVideoRechargePoolId.value = isVideoPoolEnabled(restoredEditingRechargePoolId)
    ? restoredEditingRechargePoolId
    : selectedVideoPool.value;
  videoRechargePlansByPool.value = normalizeVideoRechargePlansByPool(view.rechargePlansByPool);
  videoRechargePlanSelectionsByPool.value = normalizeVideoRechargePlanSelectionsByPool(
    view.rechargePlanSelectionsByPool,
    videoRechargePlansByPool.value
  );

  const calculation = draft.calculation || {};
  restoreObjectFields(userConfigV2.value, calculation.userConfig);
  const restoredCurrentTimestamp = Number(calculation.calculationStartDate ?? calculation.currentTimestamp);
  if (Number.isFinite(restoredCurrentTimestamp)) {
    currentTimestamp.value = restoredCurrentTimestamp;
    currentDate.value = new Date(restoredCurrentTimestamp);
  }
  videoCalculationStartDatesByPool.value = normalizeVideoCalculationStartDatesByPool(
    view.calculationStartDatesByPool,
    currentTimestamp.value
  );
  activateVideoPoolCalculationStartDate(selectedVideoPool.value);
  if (typeof calculation.calPoolEnd === "boolean") {
    calPoolEnd.value = calculation.calPoolEnd;
  }
  if (VIDEO_ORUNDUM_STRATEGIES.some((strategy) => strategy.id === calculation.orundumStrategy)) {
    videoOrundumStrategy.value = calculation.orundumStrategy;
  }
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

  const poolImages = normalizeVideoPoolImages(draft.poolImages);
  for (const pool of allVideoPoolOptions) {
    if (poolImages[pool.id] instanceof Blob) {
      setVideoPoolImage(pool.id, poolImages[pool.id]);
    }
  }

  const stageAssets = draft.stageAssets || {};
  for (const assetId of ["background", "logo"]) {
    if (stageAssets[assetId] instanceof Blob) {
      setStageAssetImage(assetId, stageAssets[assetId]);
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
    stageBackgroundImageScale,
    stageBackgroundImagePositionX,
    stageBackgroundImagePositionY,
    stageBackgroundImageOpacity,
    stageBackgroundImageBlur,
    stageBackgroundImageBrightness,
    stageBackgroundImageSaturation,
    stageBackgroundOverlayOpacity,
    stageLogoWidth,
    stageLogoLeft,
    stageLogoBottom,
    stageLogoOpacity,
    stageReferenceGuidesVisible,
    customStageCursorEnabled,
    stageCursorBorderWidth,
    stageCursorColor,
    leftPerspective,
    rightPerspective,
    navigationOpacity,
    detailCardOpacity,
    detailCardBackgroundColor,
    inactivePoolImageBlur,
    inactivePoolImageContrastReduction,
    navigationNumberStyle,
    navigationGroupHeadingLight,
    stageFloatIntensity,
    stageTopMargin,
    stageBottomMargin,
    stageLeftMargin,
    stageRightMargin,
    cardGroupWidth,
    rightCardHeight,
    previewScalePercent,
    settingsTab,
    activeCardName,
    dataPanelCardName,
    enabledVideoPoolIds,
    selectedVideoPool,
    editingVideoPoolId,
    editingVideoRechargePoolId,
    videoPoolImageLayouts,
    videoCalculationStartDatesByPool,
    videoRechargePlansByPool,
    videoRechargePlanSelectionsByPool,
    currentTimestamp,
    userConfigV2,
    calPoolEnd,
    videoOrundumStrategy,
    selectedPermanentZoneName,
    selectedActivityName,
    selectedPackCollect,
    selectedHistoryPackIndex,
    OriginiumTable,
  ],
  queueVideoGachaDraftSave,
  { deep: true }
);

watch([stageTopMargin, stageBottomMargin], () => {
  if (rightCardHeight.value > maxRightCardHeight.value) {
    rightCardHeight.value = maxRightCardHeight.value;
  }
});

/**
 * 计算抽卡资源
 */
function gachaResourcesCalculation() {
  logs = [];

  endDate.value = getScheduleCalculationEndDate(currentSchedule.value, calPoolEnd.value);

  //饼图数据暂存区
  let pieChartDataTmp = [];

  calculationResult.value.orundum = 0;
  calculationResult.value.originium = 0;
  calculationResult.value.gachaTicket = 0;
  calculationResult.value.tenGachaTicket = 0;
  calculationResult.value.existTotalDraw = 0;
  calculationResult.value.potentialTotalDraw = 0;
  calculationResult.value.rechargeTotalDraw = 0;
  calculationResult.value.totalAmountOfRecharge = 0;
  calculationResult.value.monthlyCardAmountOfRecharge = 0;

  clearLastYearOriginiumPackSelection();
  dailyRewardCalculate();
  produceOrundumCalculate();
  honeyCakeCalculate();
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
    const strategy = activeVideoOrundumStrategy.value;
    const orundum = strategy.id === "none" ? 0 : Math.ceil(videoOrundumAp.value * strategy.coefficient);

    calculationResult.value.orundum += orundum;
    calculationResult.value.produceOrundumTotalDraw = orundum / 600;

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
  return getDailyRewardRemainingDays(
    honeyCake,
    currentTimestamp.value,
    currentSchedule.value,
    calPoolEnd.value
  );
}

/**
 * 判断这个奖励或礼包是否可在当前用户选择的时间段内获取
 * @param reward 奖励的信息
 * @returns {boolean} 是否可计入
 */
function rewardIsExpired(reward) {
  if (!isRewardAvailableOnSelectedDates(reward, currentTimestamp.value, endDate.value)) {
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
  if (myChart) {
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
  const selectedPool =
    enabledVideoPoolOptions.value.find((pool) => pool.id === selectedVideoPool.value && !pool.disabled) ||
    enabledVideoPoolOptions.value.find((pool) => !pool.disabled) ||
    enabledVideoPoolOptions.value[0] ||
    allVideoPoolOptions[0];
  selectedVideoPool.value = selectedPool.id;
  activateVideoPoolCalculationStartDate(selectedPool.id);
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
  if (date && setVideoPoolCalculationStartDate(selectedVideoPool.value, date)) {
    // 重新生成基于时间的数据
    batchGenerationServerMaintenanceRewards();
    // 重新加载礼包数据和计算攒抽资源
    batchGenerationMonthlyPack();
    getAndSortPackData();
    gachaResourcesCalculation();
  }
}

function resetVideoStartTime() {
  const now = new Date();
  currentDate.value = now;
  handleDateChange(now);
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
  <div
    class="gacha-card-editor"
    :style="previewWorkspaceStyle"
  >
    <aside class="gacha-card-settings gacha-card-settings-video" aria-label="参数调整">
      <div class="gacha-card-settings-title">
        <div class="gacha-card-settings-title-heading">
          <span>参数调整</span>
          <div class="gacha-card-settings-transfer-actions">
            <el-tooltip content="导入设置" placement="bottom">
              <el-button
                :icon="Upload"
                circle
                plain
                :disabled="videoGachaSettingsTransferPending"
                aria-label="导入设置"
                @click="openVideoGachaSettingsImport"
              />
            </el-tooltip>
            <el-tooltip content="导出设置" placement="bottom">
              <el-button
                :icon="Download"
                circle
                plain
                :disabled="videoGachaSettingsTransferPending"
                aria-label="导出设置"
                @click="exportVideoGachaSettings"
              />
            </el-tooltip>
            <input
              ref="videoGachaSettingsFileInput"
              class="gacha-card-settings-file-input"
              type="file"
              accept=".ytlgacha,.json,application/json"
              @change="handleVideoGachaSettingsImport"
            />
          </div>
        </div>
        <el-radio-group
          v-model="previewScalePercent"
          size="small"
          class="gacha-card-preview-scale"
          aria-label="预览尺寸"
        >
          <el-radio-button v-for="scale in PREVIEW_SCALE_OPTIONS" :key="scale" :label="scale">
            {{ scale }}%
          </el-radio-button>
        </el-radio-group>
      </div>
      <el-tabs v-model="settingsTab" class="gacha-card-settings-tabs" stretch>
        <el-tab-pane label="画面" name="canvas">
          <div class="gacha-card-setting-section-title">舞台背景</div>
          <div class="gacha-card-setting-image-upload">
            <span>背景图片</span>
            <div class="gacha-card-setting-upload-actions">
              <el-upload
                accept="image/*"
                :auto-upload="false"
                :show-file-list="false"
                :on-change="(file) => updateStageAssetImage('background', file)"
              >
                <el-button>上传</el-button>
              </el-upload>
              <el-tooltip content="恢复默认背景参数" placement="top">
                <el-button
                  :icon="RefreshLeft"
                  circle
                  plain
                  :disabled="!stageBackgroundImage"
                  aria-label="恢复默认背景参数"
                  @click="resetStageBackgroundImageLayout"
                />
              </el-tooltip>
              <el-tooltip content="移除背景图片" placement="top">
                <el-button
                  :icon="Delete"
                  circle
                  plain
                  :disabled="!stageBackgroundImage"
                  aria-label="移除背景图片"
                  @click="clearStageAssetImage('background')"
                />
              </el-tooltip>
            </div>
          </div>
          <div class="gacha-card-setting-range">
            <span>背景缩放</span>
            <el-slider
              v-model="stageBackgroundImageScale"
              :min="100"
              :max="250"
              :step="1"
              show-input
              input-size="small"
              :disabled="!stageBackgroundImage"
            />
          </div>
          <div class="gacha-card-setting-range">
            <span>水平位置</span>
            <el-slider
              v-model="stageBackgroundImagePositionX"
              :min="0"
              :max="100"
              :step="1"
              show-input
              input-size="small"
              :disabled="!stageBackgroundImage"
            />
          </div>
          <div class="gacha-card-setting-range">
            <span>垂直位置</span>
            <el-slider
              v-model="stageBackgroundImagePositionY"
              :min="0"
              :max="100"
              :step="1"
              show-input
              input-size="small"
              :disabled="!stageBackgroundImage"
            />
          </div>
          <div class="gacha-card-setting-range">
            <span>背景透明</span>
            <el-slider v-model="stageBackgroundImageOpacity" :min="0" :max="100" :step="1" show-input input-size="small" />
          </div>
          <div class="gacha-card-setting-range">
            <span>背景模糊</span>
            <el-slider v-model="stageBackgroundImageBlur" :min="0" :max="40" :step="1" show-input input-size="small" />
          </div>
          <div class="gacha-card-setting-range">
            <span>背景亮度</span>
            <el-slider v-model="stageBackgroundImageBrightness" :min="20" :max="120" :step="1" show-input input-size="small" />
          </div>
          <div class="gacha-card-setting-range">
            <span>背景饱和</span>
            <el-slider v-model="stageBackgroundImageSaturation" :min="0" :max="100" :step="1" show-input input-size="small" />
          </div>
          <div class="gacha-card-setting-row">
            <span>遮罩颜色</span>
            <el-color-picker v-model="displayBackgroundColor" show-alpha />
          </div>
          <div class="gacha-card-setting-range">
            <span>遮罩强度</span>
            <el-slider v-model="stageBackgroundOverlayOpacity" :min="0" :max="100" :step="1" show-input input-size="small" />
          </div>
          <div class="gacha-card-setting-row">
            <span>1920 × 1080 参考线</span>
            <el-switch v-model="stageReferenceGuidesVisible" />
          </div>
          <div class="gacha-card-setting-row">
            <span>展示区鼠标</span>
            <el-switch
              v-model="customStageCursorEnabled"
              active-text="菱形"
              inactive-text="系统"
              aria-label="切换展示区域鼠标样式"
            />
          </div>
          <div class="gacha-card-setting-range">
            <span>菱形边框</span>
            <el-slider
              v-model="stageCursorBorderWidth"
              :min="1"
              :max="8"
              :step="1"
              show-input
              input-size="small"
              :disabled="!customStageCursorEnabled"
            />
          </div>
          <div class="gacha-card-setting-row is-stacked">
            <span>菱形颜色</span>
            <el-radio-group
              v-model="stageCursorColor"
              class="gacha-stage-cursor-color-options"
              size="small"
              aria-label="菱形鼠标颜色"
              :disabled="!customStageCursorEnabled"
            >
              <el-radio-button v-for="option in STAGE_CURSOR_COLOR_OPTIONS" :key="option.value" :label="option.value">
                <span class="gacha-stage-cursor-color-swatch" :style="{ backgroundColor: option.color }"></span>
                <span>{{ option.label }}</span>
              </el-radio-button>
            </el-radio-group>
          </div>

          <div class="gacha-card-setting-section-title">左下角 Logo</div>
          <div class="gacha-card-setting-image-upload">
            <span>Logo 图片</span>
            <div class="gacha-card-setting-upload-actions">
              <el-upload
                accept="image/*"
                :auto-upload="false"
                :show-file-list="false"
                :on-change="(file) => updateStageAssetImage('logo', file)"
              >
                <el-button>上传</el-button>
              </el-upload>
              <el-tooltip content="恢复默认 Logo 参数" placement="top">
                <el-button
                  :icon="RefreshLeft"
                  circle
                  plain
                  :disabled="!stageLogoImage"
                  aria-label="恢复默认 Logo 参数"
                  @click="resetStageLogoLayout"
                />
              </el-tooltip>
              <el-tooltip content="移除 Logo" placement="top">
                <el-button
                  :icon="Delete"
                  circle
                  plain
                  :disabled="!stageLogoImage"
                  aria-label="移除 Logo"
                  @click="clearStageAssetImage('logo')"
                />
              </el-tooltip>
            </div>
          </div>
          <div class="gacha-card-setting-range">
            <span>Logo 宽度</span>
            <el-slider v-model="stageLogoWidth" :min="60" :max="520" :step="1" show-input input-size="small" :disabled="!stageLogoImage" />
          </div>
          <div class="gacha-card-setting-range">
            <span>左侧偏移</span>
            <el-slider v-model="stageLogoLeft" :min="0" :max="320" :step="1" show-input input-size="small" :disabled="!stageLogoImage" />
          </div>
          <div class="gacha-card-setting-range">
            <span>底部距离</span>
            <el-slider v-model="stageLogoBottom" :min="0" :max="240" :step="1" show-input input-size="small" :disabled="!stageLogoImage" />
          </div>
          <div class="gacha-card-setting-range">
            <span>Logo 透明</span>
            <el-slider v-model="stageLogoOpacity" :min="0" :max="100" :step="1" show-input input-size="small" :disabled="!stageLogoImage" />
          </div>

          <div class="gacha-card-setting-section-title">卡池头图</div>
          <div v-for="pool in enabledVideoPoolOptions" :key="pool.id" class="gacha-card-setting-image-upload">
            <span>{{ pool.label }}</span>
            <el-upload
              accept="image/*"
              :auto-upload="false"
              :show-file-list="false"
              :on-change="(file) => updateVideoPoolImage(pool.id, file)"
            >
              <el-button>上传</el-button>
            </el-upload>
          </div>
          <div class="gacha-card-setting-row">
            <span>头图裁切</span>
            <div class="gacha-card-setting-crop-target">
              <el-select v-model="editingVideoPoolId" size="small" aria-label="正在编辑的头图">
                <el-option
                  v-for="pool in enabledVideoPoolOptions"
                  :key="pool.id"
                  :label="pool.disabled ? `${pool.title}（未开放）` : pool.title"
                  :value="pool.id"
                />
              </el-select>
              <el-tooltip content="恢复默认裁切" placement="top">
                <el-button
                  :icon="RefreshLeft"
                  circle
                  plain
                  :disabled="!videoPoolImages[editingVideoPoolId]"
                  aria-label="恢复默认裁切"
                  @click="resetVideoPoolImageLayout()"
                />
              </el-tooltip>
            </div>
          </div>
          <div class="gacha-card-setting-range">
            <span>缩放</span>
            <el-slider
              v-model="editingVideoPoolImageLayout.scale"
              :min="VIDEO_POOL_IMAGE_SCALE_MIN"
              :max="VIDEO_POOL_IMAGE_SCALE_MAX"
              :step="1"
              show-input
              input-size="small"
              :disabled="!videoPoolImages[editingVideoPoolId]"
            />
          </div>
          <div class="gacha-card-setting-range">
            <span>水平位置</span>
            <el-slider
              v-model="editingVideoPoolImageLayout.positionX"
              :min="0"
              :max="100"
              :step="1"
              show-input
              input-size="small"
              :disabled="!videoPoolImages[editingVideoPoolId]"
            />
          </div>
          <div class="gacha-card-setting-range">
            <span>垂直位置</span>
            <el-slider
              v-model="editingVideoPoolImageLayout.positionY"
              :min="0"
              :max="100"
              :step="1"
              show-input
              input-size="small"
              :disabled="!videoPoolImages[editingVideoPoolId]"
            />
          </div>
          <div class="gacha-card-setting-range">
            <span>未选中模糊</span>
            <el-slider v-model="inactivePoolImageBlur" :min="0" :max="12" :step="0.1" show-input input-size="small" />
          </div>
          <div class="gacha-card-setting-range">
            <span>未选中对比度降低</span>
            <el-slider v-model="inactivePoolImageContrastReduction" :min="0" :max="80" :step="1" show-input input-size="small" />
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
            <span>左侧透明</span>
            <el-slider v-model="navigationOpacity" :min="0" :max="100" :step="1" show-input input-size="small" />
          </div>
          <div class="gacha-card-setting-range">
            <span>右侧透明</span>
            <el-slider v-model="detailCardOpacity" :min="0" :max="100" :step="1" show-input input-size="small" />
          </div>
          <div class="gacha-card-setting-row">
            <span>右侧卡片颜色</span>
            <el-color-picker v-model="detailCardBackgroundColor" show-alpha />
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
            <span>右侧卡高</span>
            <el-slider
              v-model="rightCardHeight"
              :min="VIDEO_DETAIL_MIN_HEIGHT"
              :max="maxRightCardHeight"
              :step="1"
              show-input
              input-size="small"
            />
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
          <div class="gacha-card-setting-row is-stacked">
            <span>导航编号</span>
            <el-radio-group v-model="navigationNumberStyle" size="small" aria-label="导航编号样式">
              <el-radio-button v-for="option in NAVIGATION_NUMBER_STYLE_OPTIONS" :key="option.value" :label="option.value">
                {{ option.label }}
              </el-radio-button>
            </el-radio-group>
          </div>
          <div class="gacha-card-setting-row">
            <span>分组标题</span>
            <el-switch
              v-model="navigationGroupHeadingLight"
              active-text="浅色"
              inactive-text="默认"
              aria-label="切换固定资源和个人策略标题颜色"
            />
          </div>
          <div class="gacha-card-setting-range">
            <span>画面漂浮</span>
            <el-slider v-model="stageFloatIntensity" :min="0" :max="8" :step="0.1" show-input input-size="small" />
          </div>
        </el-tab-pane>
        <el-tab-pane label="数据" name="data">
          <div class="gacha-card-setting-section-title">目标池子</div>
          <div
            v-for="pool in allVideoPoolOptions"
            :key="pool.id"
            class="gacha-card-setting-row"
          >
            <span>{{ pool.title }}</span>
            <el-switch
              :model-value="isVideoPoolEnabled(pool.id)"
              :disabled="
                pool.disabled ||
                (isVideoPoolEnabled(pool.id) && enabledVideoPoolIds.length === 1)
              "
              active-text="开启"
              inactive-text="关闭"
              :aria-label="`${pool.title}目标池子`"
              @change="(enabled) => setVideoPoolEnabled(pool.id, enabled)"
            />
          </div>
          <div class="gacha-card-setting-datetime">
            <span>本池起始</span>
            <el-date-picker
              v-model="currentDate"
              type="datetime"
              placeholder="选择日期时间"
              format="YYYY-MM-DD HH:mm:ss"
              value-format="YYYY-MM-DD HH:mm:ss"
              @change="handleDateChange"
            />
            <el-tooltip content="重置为当前时间" placement="top">
              <el-button :icon="RefreshLeft" circle plain aria-label="重置为当前时间" @click="resetVideoStartTime" />
            </el-tooltip>
          </div>
          <div v-if="activeCardName === 'calculationResult'" class="gacha-video-data-empty">卡池由左上图片切换</div>
          <div id="gacha-video-data-controls" class="gacha-video-data-panel"></div>
        </el-tab-pane>
      </el-tabs>
    </aside>

    <section
      class="gacha-card-stage"
      :class="[
        {
          'is-data-controls': settingsTab === 'data',
          'has-stage-float': stageFloatIntensity > 0,
          'has-light-navigation-group-heading': navigationGroupHeadingLight,
          'has-custom-stage-cursor': customStageCursorEnabled,
          'is-pool-switching-out': videoPoolTransitionPhase === 'out',
          'is-pool-switching-in': videoPoolTransitionPhase === 'in',
        },
        `is-navigation-number-${navigationNumberStyle}`,
      ]"
      :style="displayStageStyle"
    >
      <div
        class="gacha-card-stage-canvas"
        @pointerenter="handleStageCursorEnter"
        @pointermove="handleStageCursorMove"
        @pointerleave="handleStageCursorLeave"
        @pointerdown="handleStageCursorClick"
      >
      <div v-if="stageBackgroundImage" class="gacha-card-stage-background" aria-hidden="true">
        <img :src="stageBackgroundImage" :style="getStageBackgroundImageStyle()" alt="" />
      </div>
      <div class="gacha-card-stage-overlay" aria-hidden="true"></div>
      <div
        class="gacha-calculation-page gacha-card-browser"
        :class="{ 'is-data-controls': settingsTab === 'data' }"
        id="gachaCalculate"
        data-video="pro"
      >
        <nav class="gacha-video-navigation" aria-label="视频页导航">
          <div class="gacha-video-pool-selector">
            <button
              v-for="pool in enabledVideoPoolOptions"
              :key="pool.id"
              type="button"
              class="gacha-video-pool-button"
              :class="{ 'is-active': selectedVideoPool === pool.id, 'is-disabled': pool.disabled }"
              :disabled="pool.disabled"
              :title="pool.label"
              @click="selectVideoPool(pool.id)"
            >
              <span class="gacha-video-pool-image">
                <img v-if="videoPoolImages[pool.id]" :src="videoPoolImages[pool.id]" :style="getVideoPoolImageStyle(pool.id)" alt="" />
                <span v-else class="gacha-video-pool-placeholder"></span>
              </span>
              <span class="gacha-video-pool-copy">
                <strong>{{ pool.title }}</strong>
                <small>{{ pool.endDate }}</small>
              </span>
            </button>
          </div>
          <div class="gacha-video-nav-group is-standard">
            <div class="gacha-video-nav-group-heading">
              <span>固定资源</span>
              <small>BASELINE</small>
            </div>
            <button
              v-for="item in standardNavigationItems"
              :key="item.id"
              type="button"
              class="gacha-video-nav-item"
              :class="[
                `is-${item.tone}`,
                { 'is-active': activeCardName === item.id, 'is-flashing': navigationFlashCardName === item.id },
              ]"
              @click="selectVideoCard(item.id)"
            >
              <span class="gacha-video-nav-index">{{ item.serial }}</span>
              <span class="gacha-video-nav-copy">{{ item.label }}</span>
              <strong class="gacha-video-nav-draw-value">
                {{ item.draws }}
                <span class="gacha-video-inline-icon"><img :src="getVideoResourceImageSrc('抽')" alt="" /></span>
              </strong>
            </button>
          </div>
          <div class="gacha-video-nav-group is-personal">
            <div class="gacha-video-nav-group-heading">
              <span>个人策略</span>
              <small>PERSONAL</small>
            </div>
            <button
              v-for="item in personalNavigationItems"
              :key="item.id"
              type="button"
              class="gacha-video-nav-item is-personal-item"
              :class="[
                `is-${item.tone}`,
                { 'is-active': activeCardName === item.id, 'is-flashing': navigationFlashCardName === item.id },
              ]"
              @click="selectVideoCard(item.id)"
            >
              <span class="gacha-video-nav-marker">{{ item.marker }}</span>
              <span class="gacha-video-nav-copy">{{ item.label }}</span>
              <strong v-if="item.draws !== undefined" class="gacha-video-nav-draw-value">
                {{ item.draws }}
                <span class="gacha-video-inline-icon"><img :src="getVideoResourceImageSrc('抽')" alt="" /></span>
              </strong>
              <strong v-else-if="item.meta" class="gacha-video-nav-status">
                <span>{{ item.meta }}</span>
                <span v-if="item.navDraws !== undefined" class="gacha-video-nav-status-draw">
                  {{ item.navDraws }}
                  <span class="gacha-video-inline-icon"><img :src="getVideoResourceImageSrc('抽')" alt="" /></span>
                </span>
              </strong>
            </button>
          </div>
        </nav>

        <section class="gacha-video-detail">
          <div :key="activeCardName" class="gacha-video-detail-content">
          <template v-if="activeCardName === 'calculationResult'">
            <div class="gacha-video-overview-hero">
              <div v-if="videoPoolImages[selectedVideoPool]" class="gacha-video-overview-backdrop" aria-hidden="true">
                <img :src="videoPoolImages[selectedVideoPool]" alt="" />
              </div>
              <span class="gacha-video-overview-kicker">可用抽数</span>
              <div class="gacha-video-overview-range" aria-label="计算时间范围">
                <span>FROM</span>
                <b>{{ videoOverviewTimeAnchor.from }}</b>
                <i aria-hidden="true">→</i>
                <span>TO</span>
                <b>{{ videoOverviewTimeAnchor.to }}</b>
              </div>
              <div class="gacha-video-overview-total-row">
                <div class="gacha-video-overview-total">
                  <strong>{{ numberFloor(calculationResult.totalDraw, 0) }}</strong>
                  <small>月卡党 <b>+{{ videoMonthlyCardBonusDraw }}</b> 抽</small>
                </div>
                <span class="gacha-video-hero-icon is-artwork" aria-label="寻访凭证">
                  <img src="/image/icon/gacha-calculator/single-permit.png" alt="" />
                </span>
              </div>
            </div>
            <div class="gacha-video-probability-list">
              <div v-for="metric in videoProbabilityMetrics" :key="metric.label" class="gacha-video-probability-item">
                <span>{{ metric.label }}</span>
                <strong>{{ formatProbability(metric.value) }}</strong>
              </div>
            </div>
            <div class="gacha-video-overview-grid">
              <div class="gacha-video-source-list">
                <div v-for="source in videoOverviewSources" :key="source.label" class="gacha-video-source-row">
                  <span :class="`gacha-video-source-dot is-${source.tone}`"></span>
                  <span>{{ source.label }}</span>
                  <strong class="gacha-video-draw-value gacha-video-source-draw">
                    {{ source.draws }}
                    <span class="gacha-video-inline-icon"><img :src="getVideoResourceImageSrc('抽')" alt="" /></span>
                  </strong>
                </div>
              </div>
              <div class="gacha-video-resource-list">
                <div class="gacha-video-resource-item is-artwork">
                  <span class="gacha-video-resource-icon" aria-label="源石">
                    <img src="/image/icon/gacha-calculator/originium.png" alt="" />
                  </span>
                  <strong>{{ calculationResult.originium }}</strong>
                </div>
                <div class="gacha-video-resource-item is-artwork">
                  <span class="gacha-video-resource-icon" aria-label="合成玉">
                    <img src="/image/icon/gacha-calculator/orundum.png" alt="" />
                  </span>
                  <strong>{{ calculationResult.orundum }}</strong>
                </div>
                <div class="gacha-video-resource-item is-artwork">
                  <span class="gacha-video-resource-icon" aria-label="寻访凭证">
                    <img src="/image/icon/gacha-calculator/single-permit.png" alt="" />
                  </span>
                  <strong>{{ calculationResult.gachaTicket }}</strong>
                </div>
                <div class="gacha-video-resource-item is-artwork">
                  <span class="gacha-video-resource-icon" aria-label="十连寻访凭证">
                    <img src="/image/icon/gacha-calculator/ten-permit.png" alt="" />
                  </span>
                  <strong>{{ calculationResult.tenGachaTicket }}</strong>
                </div>
              </div>
            </div>
          </template>

          <template v-else-if="activeCardName === 'daily'">
            <div class="gacha-video-section-hero">
              <span>日常积累</span>
              <strong>{{ numberFloor(calculationResult.dailyTotalDraw, 0) }}</strong>
              <span class="gacha-video-hero-icon" aria-label="寻访凭证"><img :src="getVideoResourceImageSrc('抽')" alt="" /></span>
              <small>从今天开始的稳定收入</small>
            </div>
            <div class="gacha-video-detail-rows">
              <div v-for="row in videoDailyRows" :key="row.label" class="gacha-video-detail-row">
                <span>{{ row.label }}</span>
                <div class="gacha-video-detail-resource-values">
                  <span v-for="resource in row.resources" :key="resource.unit" class="gacha-video-detail-resource-value">
                    <strong>{{ resource.value }}</strong>
                    <small class="gacha-video-unit-icon" :aria-label="resource.unit">
                      <img :src="getVideoResourceImageSrc(resource.unit)" alt="" />
                    </small>
                  </span>
                </div>
              </div>
            </div>
          </template>

          <template v-else-if="activeCardName === 'custom'">
            <div class="gacha-video-orundum-heading">
              <span>搓玉</span>
              <strong>共 {{ videoOrundumAp }} 理智</strong>
              <small>{{ videoOverviewTimeAnchor.from }} — {{ videoOverviewTimeAnchor.to }} · 每日 240 理智</small>
            </div>
            <div class="gacha-video-orundum-strategy-list">
              <button
                v-for="strategy in videoOrundumStrategyCards"
                :key="strategy.id"
                type="button"
                class="gacha-video-orundum-strategy"
                :class="{ 'is-selected': strategy.isSelected }"
                :aria-pressed="strategy.isSelected"
                @click="selectVideoOrundumStrategy(strategy.id)"
              >
                <h3>{{ strategy.label }}</h3>
                <p>
                  {{ strategy.coefficient }} 合成玉 / 理智
                  <span v-if="strategy.id === 'event-stage'">（估算）</span>
                </p>
                <div class="gacha-video-orundum-strategy-output">
                  <strong>{{ strategy.orundum }}</strong>
                  <span class="gacha-video-unit-icon" aria-label="合成玉">
                    <img :src="getVideoResourceImageSrc('合成玉')" alt="" />
                  </span>
                </div>
                <span class="gacha-video-orundum-strategy-check" aria-hidden="true">✓</span>
              </button>
            </div>
          </template>

          <template v-else-if="activeCardName === 'activity'">
            <div class="gacha-video-section-hero">
              <span>活动获得</span>
              <strong>{{ numberFloor(calculationResult.activityTotalDraw, 0) }}</strong>
              <span class="gacha-video-hero-icon" aria-label="寻访凭证"><img :src="getVideoResourceImageSrc('抽')" alt="" /></span>
              <small>已纳入的活动资源</small>
            </div>
            <div v-if="videoActivityResourceRows.length" class="gacha-video-detail-rows">
              <div v-for="row in videoActivityResourceRows" :key="row.label" class="gacha-video-detail-row">
                <span>{{ row.label }}</span>
                <div class="gacha-video-detail-resource-values">
                  <span v-for="resource in row.resources" :key="resource.unit" class="gacha-video-detail-resource-value">
                    <strong>{{ resource.value }}</strong>
                    <small class="gacha-video-unit-icon" :aria-label="resource.unit">
                      <img :src="getVideoResourceImageSrc(resource.unit)" alt="" />
                    </small>
                  </span>
                </div>
              </div>
            </div>
            <div v-else class="gacha-video-empty-state">当前没有纳入活动</div>
          </template>

          <template v-else-if="activeCardName === 'other'">
            <div class="gacha-video-section-hero">
              <span>其他资源</span>
              <strong>{{ numberFloor(calculationResult.otherTotalDraw, 0) }}</strong>
              <span class="gacha-video-hero-icon" aria-label="寻访凭证"><img :src="getVideoResourceImageSrc('抽')" alt="" /></span>
              <small>维护与其他奖励</small>
            </div>
            <div
              v-if="videoOtherResourceRows.length"
              class="gacha-video-detail-rows"
              :class="{ 'is-summer-compact-grid': selectedVideoPool === 'summer' }"
            >
              <div v-for="row in videoOtherResourceRows" :key="row.label" class="gacha-video-detail-row">
                <span>{{ row.label }}</span>
                <div class="gacha-video-detail-resource-values">
                  <span v-for="resource in row.resources" :key="resource.unit" class="gacha-video-detail-resource-value">
                    <strong>{{ resource.value }}</strong>
                    <small class="gacha-video-unit-icon" :aria-label="resource.unit">
                      <img :src="getVideoResourceImageSrc(resource.unit)" alt="" />
                    </small>
                  </span>
                </div>
              </div>
            </div>
            <div v-else class="gacha-video-empty-state">当前没有其他资源</div>
          </template>

          <template v-else-if="activeCardName === 'recharge'">
            <div class="gacha-video-plan-heading">
              <strong>高性价比氪金方案</strong>
              <small>理性消费，适度氪金</small>
            </div>
            <div class="gacha-video-recharge-plan-content">
              <div class="gacha-video-recharge-plan-list">
                <button
                  v-for="plan in videoRechargePlans"
                  :key="plan.id"
                  type="button"
                  class="gacha-video-recharge-plan"
                  :class="[`is-${plan.type}`, { 'is-selected': selectedVideoRechargePlan.id === plan.id }]"
                  :aria-pressed="selectedVideoRechargePlan.id === plan.id"
                  @click="selectVideoRechargePlan(plan.id)"
                >
                  <strong class="gacha-video-recharge-price">{{ formatVideoRechargePrice(plan.price) }}</strong>
                  <h3>{{ plan.title }}</h3>
                  <span class="gacha-video-recharge-plan-draw">
                    <strong>{{ formatVideoRechargeDraws(plan.draws) }}</strong>
                    <span class="gacha-video-unit-icon" aria-label="寻访凭证">
                      <img :src="getVideoResourceImageSrc('抽')" alt="" />
                    </span>
                  </span>
                  <span class="gacha-video-recharge-plan-check" aria-hidden="true">✓</span>
                </button>
              </div>
              <p class="gacha-video-recharge-plan-note">
                仅列出性价比高于每月寻访组合包的条目，其他礼包性价比可参阅一图流礼包性价比模块
              </p>
            </div>
          </template>
          </div>
        </section>

        <template v-if="settingsTab === 'data'">
        <teleport to="#gacha-video-data-controls">
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
                  <td>搓玉</td>
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
        </el-collapse-item>

        <!--搓玉-->
        <el-collapse-item name="custom" class="collapse-item">
          <template #title>
            <div class="flex align-center">
              <div class="collapse-title-icon" style="background: rgba(119, 118, 255, 0.8)"></div>
              <span class="collapse-title-font"> 搓玉 </span>
            </div>
          </template>
          <div class="collapse-content-subheading"><span></span>搓玉策略</div>
          <el-radio-group
            :model-value="videoOrundumStrategy"
            class="gacha-video-orundum-control"
            @change="selectVideoOrundumStrategy"
          >
            <el-radio-button v-for="strategy in VIDEO_ORUNDUM_STRATEGIES" :key="strategy.id" :value="strategy.id">
              {{ strategy.label }}
            </el-radio-button>
          </el-radio-group>
          <span class="tip">按起始日期至结束日期、每日 240 理智计算；选择后立即计入总览。</span>
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
        <el-collapse-item v-if="false" name="recharge" class="collapse-item">
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

        <el-collapse-item name="recharge" class="collapse-item">
          <template #title>
            <div class="flex align-center">
              <div class="collapse-title-icon" style="background: rgba(119, 118, 255, 0.8)"></div>
              <span class="collapse-title-font"> 氪金方案 </span>
            </div>
          </template>
          <div class="gacha-video-recharge-editor">
            <div class="gacha-video-recharge-editor-target">
              <span>编辑卡池</span>
              <el-select v-model="editingVideoRechargePoolId" size="small" aria-label="正在编辑的氪金方案卡池">
                <el-option
                  v-for="pool in enabledVideoPoolOptions"
                  :key="pool.id"
                  :label="pool.disabled ? `${pool.title}（未开放）` : pool.title"
                  :value="pool.id"
                />
              </el-select>
            </div>
            <div class="gacha-video-recharge-editor-fixed">
              <span>固定方案</span>
              <p>¥ 0　无氪　不额外购买资源</p>
              <p>月卡按自定义开始日期至当前卡池结束日期自动计算，与总览加抽一致。</p>
            </div>
            <div class="gacha-video-recharge-editor-labels">
              <span>价格</span>
              <span>方案名</span>
              <span>资源</span>
            </div>
            <div
              v-for="plan in editingVideoRechargePlans"
              :key="plan.id"
              class="gacha-video-recharge-editor-row"
            >
              <el-input-number v-model="plan.price" :min="0" :step="1" :precision="0" controls-position="right" />
              <el-input v-model="plan.title" placeholder="方案名" />
              <el-input-number v-model="plan.draws" :min="0" :step="0.1" :precision="1" controls-position="right" />
              <el-tooltip content="删除方案" placement="top">
                <el-button
                  :icon="Delete"
                  circle
                  plain
                  aria-label="删除方案"
                  @click="removeVideoRechargePlan(plan.id)"
                />
              </el-tooltip>
            </div>
            <div class="gacha-video-recharge-editor-actions">
              <el-tooltip content="新增方案" placement="top">
                <el-button :icon="Plus" circle plain aria-label="新增方案" @click="addVideoRechargePlan()" />
              </el-tooltip>
            </div>
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
        </teleport>
        </template>
      </div>
      <div v-if="stageReferenceGuidesVisible" class="gacha-card-stage-reference" aria-hidden="true"></div>
      <div v-if="stageLogoImage" class="gacha-card-stage-logo" aria-hidden="true">
        <img :src="stageLogoImage" alt="" />
      </div>
      <div
        v-show="customStageCursorEnabled && stageCursorVisible"
        ref="stageCursorElement"
        class="gacha-card-stage-cursor"
        aria-hidden="true"
      >
        <span class="gacha-card-stage-cursor-shape"></span>
      </div>
      </div>
    </section>

  </div>
</template>

<style scoped>
@font-face {
  font-family: "GachaVideoSerial";
  src: url("../../assets/fonts/alibaba-sans/AlibabaSans-Black.otf") format("opentype");
  font-display: swap;
  font-style: normal;
  font-weight: 900;
}

.gacha-card-editor {
  display: flex;
  width: 100%;
  min-width: 0;
  align-items: start;
  gap: 28px;
  padding: 12px;
  box-sizing: border-box;
  overflow: auto;
}

.gacha-card-stage {
  order: 1;
  width: var(--gacha-preview-stage-width);
  height: var(--gacha-preview-stage-height);
  flex: 0 0 var(--gacha-preview-stage-width);
  padding: 0;
  box-sizing: border-box;
  outline: 1px solid var(--c-border-color);
  overflow: hidden;
  box-shadow: 0 8px 24px var(--c-box-shadow-color);
}

.gacha-card-stage.has-custom-stage-cursor,
.gacha-card-stage.has-custom-stage-cursor * {
  cursor: none !important;
}

.gacha-card-stage-canvas {
  position: relative;
  width: 1960px;
  height: 1120px;
  overflow: hidden;
  padding: 20px;
  background-color: var(--gacha-stage-background-color);
  box-sizing: border-box;
  isolation: isolate;
  transform: scale(var(--gacha-preview-scale));
  transform-origin: top left;
}

.gacha-card-stage-background,
.gacha-card-stage-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.gacha-card-stage-background {
  z-index: 0;
  overflow: hidden;
}

.gacha-card-stage-background img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: blur(var(--gacha-stage-background-image-blur)) brightness(var(--gacha-stage-background-image-brightness))
    saturate(var(--gacha-stage-background-image-saturation));
  opacity: var(--gacha-stage-background-image-opacity);
  transform-origin: center;
}

.gacha-card-stage-overlay {
  z-index: 1;
  background-color: var(--gacha-stage-background-color);
  opacity: var(--gacha-stage-background-overlay-opacity);
}

.gacha-card-stage-reference {
  position: absolute;
  inset: 20px;
  z-index: 8;
  border: 2px solid rgb(255 74 74 / 86%);
  box-shadow:
    0 0 0 1px rgb(255 255 255 / 66%),
    inset 0 0 0 1px rgb(255 255 255 / 66%);
  box-sizing: border-box;
  pointer-events: none;
}

.gacha-card-stage-reference::before,
.gacha-card-stage-reference::after {
  position: absolute;
  content: "";
  background-color: rgb(255 74 74 / 68%);
  box-shadow: 0 0 0 1px rgb(255 255 255 / 42%);
}

.gacha-card-stage-reference::before {
  top: 0;
  bottom: 0;
  left: 50%;
  width: 1px;
}

.gacha-card-stage-reference::after {
  top: 50%;
  right: 0;
  left: 0;
  height: 1px;
}

.gacha-card-stage-logo {
  position: absolute;
  left: calc(20px + var(--gacha-stage-left-margin) + var(--gacha-stage-logo-left));
  bottom: var(--gacha-stage-logo-bottom);
  z-index: 7;
  width: var(--gacha-stage-logo-width);
  opacity: var(--gacha-stage-logo-opacity);
  pointer-events: none;
}

.gacha-card-stage-logo img {
  display: block;
  width: 100%;
  height: auto;
}

.gacha-card-stage-cursor {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 12;
  width: 0;
  height: 0;
  pointer-events: none;
  will-change: transform;
}

.gacha-card-stage-cursor-shape {
  position: absolute;
  top: -15px;
  left: -15px;
  display: block;
  width: 30px;
  height: 30px;
  border: var(--gacha-stage-cursor-border-width) solid var(--gacha-stage-cursor-color);
  border-radius: 0;
  box-shadow: 0 5px 12px rgb(12 18 26 / 42%);
  box-sizing: border-box;
  transform: rotate(45deg);
}

.gacha-card-stage-cursor-shape::after {
  position: absolute;
  inset: -3px;
  border-radius: 0;
  content: "";
  opacity: 0;
}

.gacha-card-stage-cursor.is-clicking .gacha-card-stage-cursor-shape::after {
  animation: gacha-stage-cursor-shadow-spread 380ms ease-out both;
}

.gacha-card-stage.is-data-controls {
  overflow: visible;
}

.gacha-card-browser {
  --gacha-column-gap: 64px;
  --gacha-left-surface-perspective: 760px;
  --gacha-right-surface-perspective: 1400px;
  --gacha-stage-accent-color: #356fae;
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
  z-index: 2;
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

.gacha-card-settings {
  min-width: 340px;
  flex: 1 1 340px;
  border: 1px solid var(--c-border-color);
  border-radius: 8px;
  background-color: var(--c-card-background-color);
  box-shadow: 0 8px 18px var(--c-box-shadow-color);
}

.gacha-card-settings-video {
  order: 2;
  height: 1120px;
  max-height: 1120px;
  overflow: auto;
}

.gacha-card-settings-legacy {
  display: none;
}

.gacha-card-settings-title {
  position: sticky;
  top: 0;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 10px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--c-border-color);
  background-color: var(--c-card-background-color);
  color: var(--c-text-color);
  font-size: 18px;
  font-weight: 600;
}

.gacha-card-settings-title-heading,
.gacha-card-settings-transfer-actions {
  display: flex;
  align-items: center;
}

.gacha-card-settings-title-heading {
  justify-content: space-between;
  gap: 12px;
}

.gacha-card-settings-transfer-actions {
  gap: 8px;
}

.gacha-card-settings-file-input {
  display: none;
}

.gacha-card-preview-scale {
  display: flex;
  width: 100%;
}

.gacha-card-preview-scale :deep(.el-radio-button) {
  min-width: 0;
  flex: 1 1 0;
}

.gacha-card-preview-scale :deep(.el-radio-button__inner) {
  width: 100%;
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

.gacha-card-setting-section-title {
  margin: 10px 16px 4px;
  padding: 10px 0 8px;
  border-bottom: 1px solid color-mix(in srgb, var(--c-border-color) 76%, transparent);
  color: color-mix(in srgb, var(--c-text-color) 66%, transparent);
  font-size: 13px;
  font-weight: 800;
}

.gacha-card-setting-upload-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.gacha-stage-cursor-color-options {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.gacha-stage-cursor-color-options :deep(.el-radio-button__inner) {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--c-border-color) !important;
  border-radius: 4px !important;
  box-shadow: none !important;
}

.gacha-stage-cursor-color-swatch {
  display: inline-block;
  width: 13px;
  height: 13px;
  border: 1px solid rgb(255 255 255 / 58%);
  border-radius: 2px;
  box-shadow: 0 0 0 1px rgb(0 0 0 / 18%);
  box-sizing: border-box;
}

.gacha-card-setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 56px;
  padding: 0 16px;
  color: var(--c-text-color);
}

.gacha-card-setting-row.is-stacked {
  align-items: flex-start;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
  padding-top: 10px;
  padding-bottom: 10px;
}

.gacha-card-setting-crop-target {
  display: flex;
  align-items: center;
  gap: 8px;
}

.gacha-card-setting-crop-target :deep(.el-select) {
  width: 158px;
}

.gacha-card-setting-datetime {
  display: grid;
  grid-template-columns: 80px minmax(0, 1fr) 32px;
  align-items: center;
  column-gap: 12px;
  min-height: 68px;
  padding: 0 16px;
  color: var(--c-text-color);
}

.gacha-card-setting-datetime :deep(.el-date-editor) {
  width: 100%;
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
  opacity: var(--gacha-navigation-opacity);
  transform: perspective(var(--gacha-left-surface-perspective)) rotateY(var(--gacha-left-perspective));
  transform-origin: right center;
  translate: 0 0;
  will-change: transform;
}

.gacha-video-pool-selector {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(132px, 1fr));
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

.gacha-video-pool-button:disabled {
  cursor: not-allowed;
  opacity: 0.58;
}

.gacha-video-pool-button:disabled:hover {
  box-shadow: none;
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

.gacha-video-pool-image img {
  transform-origin: center;
  transition:
    object-position 160ms ease,
    transform 160ms ease;
}

.gacha-video-pool-button:not(.is-active) .gacha-video-pool-image {
  filter: saturate(0.28) blur(var(--gacha-inactive-pool-image-blur)) brightness(0.72)
    contrast(var(--gacha-inactive-pool-image-contrast));
}

.gacha-video-pool-copy {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  display: grid;
  height: 69px;
  align-content: center;
  gap: 4px;
  padding: 8px 14px 7px;
  background-color: rgb(0 0 0 / 62%);
  box-sizing: border-box;
  color: #fff;
  pointer-events: none;
  text-align: left;
}

.gacha-video-pool-copy strong {
  font-size: 28px;
  line-height: 1.1;
}

.gacha-video-pool-copy small {
  color: rgb(255 255 255 / 78%);
  font-size: 14px;
  line-height: 1.1;
}

.gacha-video-pool-placeholder {
  background:
    linear-gradient(135deg, transparent 0 48%, color-mix(in srgb, var(--c-border-color) 72%, transparent) 48% 52%, transparent 52%),
    linear-gradient(45deg, transparent 0 48%, color-mix(in srgb, var(--c-border-color) 72%, transparent) 48% 52%, transparent 52%),
    color-mix(in srgb, var(--c-card-background-color) 76%, #c7d6e8);
}

.gacha-video-nav-group {
  display: grid;
  gap: 8px;
}

.gacha-video-nav-group.is-personal {
  gap: 10px;
  padding-top: 0;
  border-top: 0;
}

.gacha-video-nav-group-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  min-height: 18px;
  padding: 0 6px;
  color: color-mix(in srgb, var(--c-text-color) 66%, transparent);
  font-size: 13px;
  font-weight: 700;
}

.gacha-video-nav-group-heading small {
  color: color-mix(in srgb, var(--c-text-color) 46%, transparent);
  font-family: Consolas, "Courier New", monospace;
  font-size: 11px;
  font-weight: 700;
}

.gacha-video-nav-group.is-standard .gacha-video-nav-group-heading,
.gacha-video-nav-group.is-personal .gacha-video-nav-group-heading {
  align-items: center;
  justify-content: flex-start;
  gap: 10px;
  padding: 0 6px 0 0;
}

.gacha-video-nav-group.is-standard .gacha-video-nav-group-heading::after,
.gacha-video-nav-group.is-personal .gacha-video-nav-group-heading::after {
  height: 1px;
  flex: 1 1 auto;
  content: "";
  background-color: color-mix(in srgb, var(--c-border-color) 76%, transparent);
}

.gacha-card-stage.has-light-navigation-group-heading .gacha-video-nav-group-heading {
  color: rgb(255 255 255 / 92%);
  text-shadow: 0 2px 5px rgb(0 0 0 / 48%);
}

.gacha-card-stage.has-light-navigation-group-heading .gacha-video-nav-group-heading small {
  color: rgb(255 255 255 / 68%);
}

.gacha-card-stage.has-light-navigation-group-heading .gacha-video-nav-group-heading::after {
  background-color: rgb(255 255 255 / 44%);
  box-shadow: 0 1px 3px rgb(0 0 0 / 26%);
}

.gacha-video-nav-item {
  --gacha-nav-tone: #5e91d5;
  position: relative;
  display: grid;
  grid-template-columns: 58px minmax(0, 1fr) auto;
  align-items: center;
  min-height: 88px;
  padding: 0 22px 0 16px;
  border: 1px solid var(--c-border-color);
  border-left: 5px solid var(--gacha-nav-tone);
  border-radius: 6px;
  background-color: var(--c-card-background-color);
  box-shadow: 0 8px 18px var(--c-box-shadow-color);
  color: var(--c-text-color);
  cursor: pointer;
  overflow: hidden;
  text-align: left;
  transition:
    background-color 160ms ease,
    border-color 160ms ease,
    box-shadow 160ms ease;
  backface-visibility: hidden;
}

.gacha-video-nav-item.is-overview {
  --gacha-nav-tone: #7564bb;
}

.gacha-video-nav-item.is-daily {
  --gacha-nav-tone: #4f7fd0;
}

.gacha-video-nav-item.is-activity {
  --gacha-nav-tone: #c97946;
}

.gacha-video-nav-item.is-other {
  --gacha-nav-tone: #74818b;
}

.gacha-video-nav-item.is-custom {
  --gacha-nav-tone: #3e9976;
}

.gacha-video-nav-item.is-recharge {
  --gacha-nav-tone: #b16b8d;
}

.gacha-video-nav-item.is-personal-item {
  grid-template-columns: 78px minmax(0, 1fr) auto;
  min-height: 88px;
  background-color: color-mix(in srgb, var(--c-card-background-color) 92%, var(--gacha-nav-tone));
}

.gacha-video-nav-item:hover {
  box-shadow: 0 12px 24px var(--c-box-shadow-color);
}

.gacha-video-nav-item.is-active {
  border-color: color-mix(in srgb, var(--gacha-nav-tone) 82%, var(--c-border-color));
  border-left-color: var(--gacha-nav-tone);
  background-color: color-mix(in srgb, var(--c-card-background-color) 84%, var(--gacha-nav-tone));
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--gacha-nav-tone) 20%, transparent), 0 14px 26px var(--c-box-shadow-color);
}

.gacha-video-nav-index {
  color: var(--gacha-nav-tone);
  font-family: "GachaVideoSerial", "Microsoft YaHei", sans-serif;
  font-size: 44px;
  font-variant-numeric: tabular-nums;
  font-weight: 900;
  line-height: 1;
}

.gacha-card-stage.is-navigation-number-terminal .gacha-video-nav-index {
  font-family: Consolas, "Courier New", monospace;
  font-size: 36px;
}

.gacha-card-stage.is-navigation-number-condensed .gacha-video-nav-index {
  display: block;
  transform: scaleX(0.78);
  transform-origin: left center;
}

.gacha-video-nav-marker {
  color: var(--gacha-nav-tone);
  font-family: Consolas, "Courier New", monospace;
  font-size: 11px;
  font-weight: 700;
}

.gacha-video-nav-copy {
  min-width: 0;
  color: var(--c-text-color);
  font-size: 32px;
  line-height: 1.15;
  font-weight: 650;
}

.gacha-video-nav-draw-value,
.gacha-video-nav-status {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: var(--gacha-nav-tone);
  font-size: 32px;
  font-variant-numeric: tabular-nums;
  font-weight: 800;
  white-space: nowrap;
}

.gacha-video-nav-status {
  min-width: 0;
  max-width: 224px;
  gap: 18px;
  color: color-mix(in srgb, var(--gacha-nav-tone) 84%, var(--c-text-color));
  font-size: 21px;
}

.gacha-video-nav-status > span:first-child {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gacha-video-nav-status-draw {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 7px;
  color: var(--gacha-nav-tone);
  font-size: 32px;
  font-variant-numeric: tabular-nums;
  font-weight: 800;
}

.gacha-video-nav-status-draw .gacha-video-inline-icon {
  width: 36px;
  height: 36px;
}

.gacha-video-nav-draw-value .gacha-video-inline-icon {
  width: 36px;
  height: 36px;
}

.gacha-video-nav-item::after {
  position: absolute;
  inset: 0;
  content: "";
  background: linear-gradient(90deg, transparent 0 28%, color-mix(in srgb, #fff 68%, transparent) 48%, transparent 68% 100%);
  opacity: 0;
  pointer-events: none;
  transform: translateX(-120%);
}

.gacha-video-nav-item.is-flashing {
  animation: gacha-video-nav-flash 460ms ease-out both;
}

.gacha-video-nav-item.is-flashing::after {
  animation: gacha-video-nav-scan 460ms ease-out both;
}

.gacha-video-detail {
  position: absolute;
  top: var(--gacha-stage-top-margin);
  right: calc(var(--gacha-stage-right-margin) + var(--gacha-right-perspective-space));
  height: var(--gacha-right-card-height);
  left: calc(var(--gacha-stage-left-margin) + var(--gacha-navigation-width) + var(--gacha-column-gap));
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 54px 64px;
  border: 1px solid var(--c-border-color);
  border-radius: 6px;
  background-color: var(--gacha-detail-card-background-color);
  box-shadow: 0 20px 42px var(--c-box-shadow-color);
  box-sizing: border-box;
  color: var(--c-text-color);
  opacity: var(--gacha-detail-card-opacity);
  transform: perspective(var(--gacha-right-surface-perspective)) rotateY(var(--gacha-right-perspective));
  transform-origin: left center;
  transform-style: preserve-3d;
  translate: 0 0;
  will-change: transform;
}

.gacha-video-detail-content {
  display: flex;
  width: 100%;
  min-width: 0;
  min-height: 0;
  flex: 1 1 auto;
  flex-direction: column;
  animation: gacha-video-detail-content-enter 180ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

.gacha-card-stage.is-pool-switching-out .gacha-video-navigation,
.gacha-card-stage.is-pool-switching-out .gacha-video-detail,
.gacha-card-stage.is-pool-switching-in .gacha-video-navigation,
.gacha-card-stage.is-pool-switching-in .gacha-video-detail {
  pointer-events: none;
  will-change: transform, translate, opacity;
}

.gacha-card-stage.is-pool-switching-out .gacha-video-navigation {
  opacity: 0.3;
  translate: -48px 0;
  transition:
    translate 160ms cubic-bezier(0.4, 0, 1, 1),
    opacity 140ms ease-in;
}

.gacha-card-stage.is-pool-switching-out .gacha-video-detail {
  opacity: 0.3;
  translate: 64px 0;
  transition:
    translate 160ms cubic-bezier(0.4, 0, 1, 1),
    opacity 140ms ease-in;
}

.gacha-card-stage.is-pool-switching-in .gacha-video-navigation {
  opacity: var(--gacha-navigation-opacity);
  translate: 0 0;
  transition:
    translate 260ms cubic-bezier(0.16, 1, 0.3, 1),
    opacity 220ms ease-out;
}

.gacha-card-stage.is-pool-switching-in .gacha-video-detail {
  opacity: var(--gacha-detail-card-opacity);
  translate: 0 0;
  transition:
    translate 260ms cubic-bezier(0.16, 1, 0.3, 1),
    opacity 220ms ease-out;
}

.gacha-card-stage.has-stage-float .gacha-video-navigation {
  animation: gacha-video-navigation-float 6s ease-in-out infinite;
}

.gacha-card-stage.has-stage-float .gacha-video-detail {
  animation: gacha-video-detail-float 7s ease-in-out infinite;
}

.gacha-video-overview-hero,
.gacha-video-section-hero {
  display: grid;
  grid-template-columns: auto auto 1fr;
  align-items: end;
  column-gap: 22px;
  min-height: 194px;
  padding-bottom: 32px;
  border-bottom: 1px solid var(--c-border-color);
}

.gacha-video-overview-hero {
  display: flex;
  position: relative;
  min-height: 258px;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-end;
  gap: 12px;
  overflow: hidden;
  padding-bottom: 0;
  border-bottom: 0;
}

.gacha-video-overview-hero > :not(.gacha-video-overview-backdrop) {
  position: relative;
  z-index: 1;
}

.gacha-video-overview-backdrop {
  position: absolute;
  inset: -26px -38px -26px 26%;
  overflow: hidden;
  opacity: 0.7;
  pointer-events: none;
  mask-image: linear-gradient(90deg, transparent 0%, rgb(0 0 0 / 14%) 30%, rgb(0 0 0 / 86%) 100%);
  -webkit-mask-image: linear-gradient(90deg, transparent 0%, rgb(0 0 0 / 14%) 30%, rgb(0 0 0 / 86%) 100%);
}

.gacha-video-overview-backdrop img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: saturate(0.86) contrast(0.94) brightness(0.92);
  transform-origin: center;
}

.gacha-video-overview-hero > span:not(.gacha-video-hero-icon):not(.gacha-video-overview-kicker),
.gacha-video-section-hero > span:not(.gacha-video-hero-icon) {
  grid-column: 1 / -1;
  align-self: start;
  color: color-mix(in srgb, var(--c-text-color) 70%, transparent);
  font-size: 30px;
  font-weight: 600;
}

.gacha-video-overview-kicker {
  color: color-mix(in srgb, var(--c-text-color) 56%, transparent);
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 0;
}

.gacha-video-overview-total > strong,
.gacha-video-section-hero strong {
  color: var(--gacha-stage-accent-color);
  font-size: 132px;
  font-variant-numeric: tabular-nums;
  font-weight: 800;
  line-height: 0.88;
}

.gacha-video-overview-total {
  display: grid;
  gap: 14px;
}

.gacha-video-overview-total-row {
  display: flex;
  align-items: center;
  gap: 22px;
}

.gacha-video-overview-total-row .gacha-video-hero-icon.is-artwork {
  margin-bottom: 0;
}

.gacha-video-overview-total small {
  color: color-mix(in srgb, var(--c-text-color) 68%, transparent);
  font-size: 24px;
  font-weight: 600;
  line-height: 1;
}

.gacha-video-overview-total small b {
  color: #3e9976;
  font-size: 30px;
  font-variant-numeric: tabular-nums;
}

.gacha-video-overview-range {
  display: inline-flex;
  align-items: baseline;
  gap: 10px;
  color: color-mix(in srgb, var(--c-text-color) 62%, transparent);
  font-family: Consolas, "Courier New", monospace;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.gacha-video-overview-range span {
  font-size: 16px;
  font-weight: 700;
}

.gacha-video-overview-range b {
  color: var(--c-text-color);
  font-size: 32px;
  font-weight: 700;
}

.gacha-video-overview-range i {
  color: color-mix(in srgb, var(--el-color-primary) 68%, transparent);
  font-size: 26px;
  font-style: normal;
  font-weight: 700;
}

.gacha-video-overview-hero em,
.gacha-video-section-hero em {
  padding-bottom: 6px;
  color: var(--c-text-color);
  font-size: 36px;
  font-style: normal;
  font-weight: 600;
}

.gacha-video-hero-icon {
  display: inline-flex;
  width: 64px;
  height: 64px;
  align-items: center;
  justify-content: center;
  margin-bottom: 2px;
}

.gacha-video-hero-icon.is-artwork {
  width: 112px;
  height: 112px;
  margin-bottom: -10px;
}

.gacha-video-hero-icon img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 10px 12px color-mix(in srgb, #1b2430 35%, transparent));
}

.gacha-video-overview-hero > small,
.gacha-video-section-hero > small,
.gacha-video-orundum-heading > small {
  justify-self: end;
}

.gacha-video-overview-hero > small,
.gacha-video-section-hero > small,
.gacha-video-orundum-heading > small,
.gacha-video-plan-heading > small {
  padding-bottom: 6px;
  color: color-mix(in srgb, var(--c-text-color) 64%, transparent);
  font-size: 22px;
  font-weight: 600;
  line-height: 1.35;
  white-space: nowrap;
}

.gacha-video-overview-grid {
  display: grid;
  grid-template-columns: minmax(390px, 0.64fr) minmax(0, 1.36fr);
  gap: 38px;
  padding: 38px 0 0;
}

.gacha-video-source-list {
  display: grid;
  align-content: start;
  gap: 12px;
}

.gacha-video-source-row {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr) auto;
  align-items: center;
  column-gap: 18px;
  min-height: 62px;
  padding-bottom: 14px;
  border-bottom: 1px solid color-mix(in srgb, var(--c-border-color) 70%, transparent);
  font-size: 28px;
}

.gacha-video-source-row strong {
  color: var(--c-text-color);
  font-size: 36px;
  font-variant-numeric: tabular-nums;
}

.gacha-video-source-row .gacha-video-source-draw {
  gap: 10px;
  font-size: 40px;
}

.gacha-video-source-row .gacha-video-inline-icon {
  width: 34px;
  height: 34px;
}

.gacha-video-source-dot {
  width: 16px;
  height: 16px;
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

.gacha-video-resource-item {
  display: flex;
  min-width: 0;
  min-height: 126px;
  flex-direction: column;
  justify-content: center;
  padding: 20px 24px;
  border: 1px solid color-mix(in srgb, #d5843e 48%, transparent);
  border-left: 5px solid #d5843e;
  background-color: color-mix(in srgb, var(--gacha-detail-card-background-color) 72%, #dce7f3);
  box-shadow: 0 8px 18px rgb(31 49 72 / 12%);
  box-sizing: border-box;
}

.gacha-video-resource-item {
  min-height: 118px;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 16px 18px;
}

.gacha-video-resource-item:nth-child(2) {
  border-color: color-mix(in srgb, #4f7fd0 48%, transparent);
  border-left-color: #4f7fd0;
}

.gacha-video-resource-item:nth-child(3) {
  border-color: color-mix(in srgb, #41a77a 48%, transparent);
  border-left-color: #41a77a;
}

.gacha-video-resource-item:nth-child(4) {
  border-color: color-mix(in srgb, #b26d92 48%, transparent);
  border-left-color: #b26d92;
}

.gacha-video-resource-item span {
  color: color-mix(in srgb, var(--c-text-color) 68%, transparent);
  font-size: 20px;
}

.gacha-video-resource-item strong {
  margin-top: 4px;
  color: var(--c-text-color);
  font-size: 42px;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.gacha-video-resource-item strong {
  margin-top: 0;
  font-size: 52px;
  white-space: nowrap;
}

.gacha-video-resource-item small {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  color: color-mix(in srgb, var(--c-text-color) 60%, transparent);
  font-size: 18px;
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
  width: 76px;
  height: 76px;
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
  width: 30px;
  height: 30px;
}

.gacha-video-unit-icon {
  width: 40px;
  height: 40px;
}

.gacha-video-inline-icon > img,
.gacha-video-unit-icon > img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 3px 4px color-mix(in srgb, #1b2430 24%, transparent));
}

.gacha-video-draw-value {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  white-space: nowrap;
}

.gacha-video-probability-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 22px;
  margin-top: 30px;
}

.gacha-video-probability-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 96px;
  padding: 0 30px;
  border: 1px solid color-mix(in srgb, #4f7fd0 50%, transparent);
  border-left: 5px solid #4f7fd0;
  border-radius: 6px;
  background-color: color-mix(in srgb, var(--gacha-detail-card-background-color) 70%, #dce7f3);
  box-shadow: 0 8px 18px rgb(31 49 72 / 14%);
  box-sizing: border-box;
}

.gacha-video-probability-item span {
  color: color-mix(in srgb, var(--c-text-color) 90%, transparent);
  font-size: 28px;
  font-weight: 700;
}

.gacha-video-probability-item strong {
  color: var(--gacha-stage-accent-color);
  font-size: 44px;
  font-variant-numeric: tabular-nums;
}

.gacha-video-probability-item:nth-child(2) {
  border-color: color-mix(in srgb, #d5843e 50%, transparent);
  border-left-color: #d5843e;
  background-color: color-mix(in srgb, var(--gacha-detail-card-background-color) 70%, #f1e2d2);
}

.gacha-video-probability-item:nth-child(2) strong {
  color: #b06a36;
}

.gacha-video-detail-rows {
  display: grid;
  gap: 16px;
  margin-top: 42px;
  overflow: auto;
}

.gacha-video-detail-rows.is-summer-compact-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px 16px;
  margin-top: 30px;
}

.gacha-video-detail-row {
  position: relative;
  z-index: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  column-gap: 20px;
  min-height: 76px;
  padding: 0 26px;
  border: 1px solid color-mix(in srgb, #4f7fd0 44%, transparent);
  border-left: 5px solid #4f7fd0;
  background-color: color-mix(in srgb, var(--gacha-detail-card-background-color) 76%, #dce7f3);
  box-shadow: 0 7px 16px rgb(31 49 72 / 11%);
  box-sizing: border-box;
  transition:
    border-color 160ms ease,
    background-color 160ms ease,
    box-shadow 160ms ease;
}

.gacha-video-detail-rows.is-summer-compact-grid .gacha-video-detail-row {
  column-gap: 14px;
  padding: 0 20px;
}

.gacha-video-detail-row > span {
  min-width: 0;
  overflow: hidden;
  font-size: 26px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gacha-video-detail-rows.is-summer-compact-grid .gacha-video-detail-row > span {
  font-size: 22px;
}

.gacha-video-detail-resource-values {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 14px 18px;
}

.gacha-video-detail-resource-value {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}

.gacha-video-detail-resource-value strong {
  color: var(--gacha-stage-accent-color);
  font-size: 34px;
  font-variant-numeric: tabular-nums;
  transition: color 160ms ease;
}

.gacha-video-detail-rows.is-summer-compact-grid .gacha-video-detail-resource-value strong {
  font-size: 30px;
}

.gacha-video-detail-resource-value .gacha-video-unit-icon {
  margin: 0;
}

.gacha-video-detail-rows.is-summer-compact-grid .gacha-video-unit-icon {
  width: 36px;
  height: 36px;
}

@media (hover: hover) {
  .gacha-video-detail-row:hover {
    z-index: 1;
    border-color: color-mix(in srgb, #356fae 68%, transparent);
    border-left-color: #356fae;
    background-color: color-mix(in srgb, var(--gacha-detail-card-background-color) 68%, #d2e2f2);
    box-shadow: 0 11px 24px rgb(31 49 72 / 18%);
  }

  .gacha-video-detail-row:hover .gacha-video-detail-resource-value strong {
    color: color-mix(in srgb, var(--gacha-stage-accent-color) 84%, #183f6b);
  }
}

.gacha-video-orundum-heading {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  min-height: 194px;
  padding-bottom: 32px;
  border-bottom: 1px solid var(--c-border-color);
}

.gacha-video-orundum-heading > span {
  grid-column: 1 / -1;
  align-self: start;
  color: color-mix(in srgb, var(--c-text-color) 70%, transparent);
  font-size: 30px;
  font-weight: 600;
}

.gacha-video-orundum-heading strong {
  color: var(--gacha-stage-accent-color);
  font-size: 70px;
  font-variant-numeric: tabular-nums;
  line-height: 0.95;
}

.gacha-video-orundum-strategy-list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 24px;
  margin-top: 50px;
}

.gacha-video-orundum-strategy {
  position: relative;
  display: flex;
  min-width: 0;
  min-height: 300px;
  flex-direction: column;
  padding: 30px;
  overflow: hidden;
  border: 1px solid var(--c-border-color);
  border-top: 5px solid #87929f;
  border-radius: 6px;
  background-color: color-mix(in srgb, var(--c-card-background-color) 90%, #e2e7eb);
  color: var(--c-text-color);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    border-color 180ms ease,
    background-color 180ms ease,
    box-shadow 180ms ease,
    transform 180ms ease;
}

.gacha-video-orundum-strategy:nth-child(2) {
  border-top-color: #d5843e;
  background-color: color-mix(in srgb, var(--c-card-background-color) 90%, #f1e2d2);
}

.gacha-video-orundum-strategy:nth-child(3) {
  border-top-color: #4f7fd0;
  background-color: color-mix(in srgb, var(--c-card-background-color) 90%, #dce7f3);
}

.gacha-video-orundum-strategy:hover {
  transform: translateY(-3px);
}

.gacha-video-orundum-strategy.is-selected {
  border-color: var(--el-color-primary);
  border-top-color: var(--el-color-primary);
  background-color: color-mix(in srgb, var(--c-card-background-color) 76%, var(--el-color-primary));
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--el-color-primary) 22%, transparent);
}

.gacha-video-orundum-strategy h3 {
  margin: 0 0 10px;
  color: var(--c-text-color);
  font-size: 34px;
  font-weight: 700;
  line-height: 1.2;
}

.gacha-video-orundum-strategy p {
  min-height: 24px;
  margin: 0;
  color: color-mix(in srgb, var(--c-text-color) 64%, transparent);
  font-size: 20px;
  line-height: 1.35;
}

.gacha-video-orundum-strategy-output {
  display: inline-flex;
  min-height: 58px;
  align-items: center;
  gap: 12px;
  margin-top: auto;
}

.gacha-video-orundum-strategy-output strong {
  color: var(--gacha-stage-accent-color);
  font-size: 58px;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.gacha-video-orundum-strategy-output .gacha-video-unit-icon {
  width: 46px;
  height: 46px;
  margin: 0;
}

.gacha-video-orundum-strategy-check {
  position: absolute;
  top: 20px;
  right: 20px;
  display: inline-flex;
  width: 30px;
  height: 30px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background-color: var(--el-color-primary);
  color: #fff;
  font-size: 20px;
  font-weight: 800;
  line-height: 1;
  opacity: 0;
  transform: scale(0.75);
  transition:
    opacity 160ms ease,
    transform 160ms ease;
}

.gacha-video-orundum-strategy.is-selected .gacha-video-orundum-strategy-check {
  opacity: 1;
  transform: scale(1);
}

.gacha-video-plan-heading {
  display: flex;
  min-height: 80px;
  align-items: flex-end;
  justify-content: space-between;
  gap: 28px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--c-border-color);
}

.gacha-video-plan-heading strong {
  color: var(--gacha-stage-accent-color);
  font-size: 54px;
  line-height: 1;
}

.gacha-video-recharge-plan-content {
  min-height: 0;
  flex: 1 1 auto;
  margin-top: 18px;
  padding-right: 4px;
  overflow: auto;
}

.gacha-video-recharge-plan-list {
  display: grid;
  grid-auto-rows: 88px;
  align-content: start;
  gap: 10px;
}

.gacha-video-recharge-plan {
  position: relative;
  display: grid;
  min-width: 0;
  width: 100%;
  min-height: 88px;
  grid-template-columns: 142px minmax(260px, 1.48fr) minmax(170px, 0.52fr);
  align-items: center;
  column-gap: 30px;
  padding: 12px 30px;
  border: 1px solid var(--c-border-color);
  border-left: 5px solid #7f78c9;
  border-radius: 6px;
  background-color: color-mix(in srgb, var(--c-card-background-color) 88%, #e6e3f7);
  color: var(--c-text-color);
  cursor: pointer;
  font: inherit;
  text-align: left;
  transition:
    border-color 180ms ease,
    background-color 180ms ease,
    box-shadow 180ms ease,
    transform 180ms ease;
  box-sizing: border-box;
}

.gacha-video-recharge-plan.is-no-spend {
  border-left-color: #7d8792;
  background-color: color-mix(in srgb, var(--c-card-background-color) 90%, #e2e7eb);
}

.gacha-video-recharge-plan.is-monthly-card {
  border-left-color: #d5843e;
  background-color: color-mix(in srgb, var(--c-card-background-color) 88%, #f1e2d2);
}

.gacha-video-recharge-plan.is-custom {
  border-left-color: #4f7fd0;
  background-color: color-mix(in srgb, var(--c-card-background-color) 88%, #dce7f3);
}

.gacha-video-recharge-plan:hover {
  transform: translateY(-2px);
}

.gacha-video-recharge-plan:focus-visible {
  outline: 3px solid color-mix(in srgb, var(--el-color-primary) 54%, transparent);
  outline-offset: 3px;
}

.gacha-video-recharge-plan.is-selected {
  border-color: var(--el-color-primary);
  border-left-color: var(--el-color-primary);
  background-color: color-mix(in srgb, var(--c-card-background-color) 72%, var(--el-color-primary));
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--el-color-primary) 20%, transparent);
}

.gacha-video-recharge-price {
  color: var(--gacha-stage-accent-color);
  font-size: 36px;
  font-variant-numeric: tabular-nums;
  font-weight: 800;
  white-space: nowrap;
}

.gacha-video-recharge-plan h3 {
  min-width: 0;
  margin: 0;
  color: var(--c-text-color);
  font-size: 30px;
  font-weight: 700;
  line-height: 1.25;
  overflow-wrap: anywhere;
}

.gacha-video-recharge-plan-draw {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 14px;
  padding-right: 38px;
}

.gacha-video-recharge-plan-draw strong {
  color: var(--c-text-color);
  font-size: 42px;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.gacha-video-recharge-plan-draw .gacha-video-unit-icon {
  width: 42px;
  height: 42px;
  margin: 0;
}

.gacha-video-recharge-plan-check {
  position: absolute;
  top: 14px;
  right: 16px;
  display: inline-flex;
  width: 28px;
  height: 28px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background-color: var(--el-color-primary);
  color: #fff;
  font-size: 18px;
  font-weight: 800;
  line-height: 1;
  opacity: 0;
  transform: scale(0.75);
  transition:
    opacity 160ms ease,
    transform 160ms ease;
}

.gacha-video-recharge-plan.is-selected .gacha-video-recharge-plan-check {
  opacity: 1;
  transform: scale(1);
}

.gacha-video-recharge-plan-note {
  margin: 10px 4px 0;
  color: color-mix(in srgb, var(--c-text-color) 64%, transparent);
  font-size: 20px;
  line-height: 1.4;
}

.gacha-video-empty-state {
  display: flex;
  min-height: 230px;
  align-items: center;
  justify-content: center;
  margin-top: 38px;
  border: 1px dashed var(--c-border-color);
  color: color-mix(in srgb, var(--c-text-color) 58%, transparent);
  font-size: 26px;
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

.gacha-video-recharge-editor {
  display: grid;
  gap: 12px;
}

.gacha-video-recharge-editor-target {
  display: grid;
  grid-template-columns: 82px minmax(0, 1fr);
  align-items: center;
  gap: 12px;
}

.gacha-video-recharge-editor-target > span,
.gacha-video-recharge-editor-fixed > span {
  color: color-mix(in srgb, var(--c-text-color) 68%, transparent);
  font-size: 14px;
  font-weight: 700;
}

.gacha-video-recharge-editor-fixed {
  padding: 12px;
  border-left: 3px solid #d5843e;
  background-color: color-mix(in srgb, var(--c-card-background-color) 88%, #f1e2d2);
}

.gacha-video-recharge-editor-fixed p {
  margin: 6px 0 0;
  color: color-mix(in srgb, var(--c-text-color) 76%, transparent);
  font-size: 13px;
  line-height: 1.4;
}

.gacha-video-recharge-editor-labels,
.gacha-video-recharge-editor-row {
  display: grid;
  grid-template-columns: 112px minmax(104px, 0.8fr) minmax(150px, 1.35fr) 32px;
  align-items: center;
  gap: 8px;
}

.gacha-video-recharge-editor-labels {
  padding: 0 4px;
  color: color-mix(in srgb, var(--c-text-color) 58%, transparent);
  font-size: 12px;
  font-weight: 700;
}

.gacha-video-recharge-editor-row {
  padding: 8px;
  border: 1px solid color-mix(in srgb, var(--c-border-color) 84%, transparent);
  background-color: color-mix(in srgb, var(--c-card-background-color) 92%, #dce7f3);
}

.gacha-video-recharge-editor-row :deep(.el-input-number) {
  width: 100%;
}

.gacha-video-recharge-editor-actions {
  display: flex;
  justify-content: flex-start;
}

.gacha-video-orundum-control {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
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

@keyframes gacha-video-navigation-float {
  0%,
  100% {
    transform: perspective(var(--gacha-left-surface-perspective)) rotateY(var(--gacha-left-perspective))
      translate3d(0, var(--gacha-stage-float-negative), 0);
  }

  50% {
    transform: perspective(var(--gacha-left-surface-perspective)) rotateY(var(--gacha-left-perspective))
      translate3d(0, var(--gacha-stage-float-positive), 0);
  }
}

@keyframes gacha-video-detail-float {
  0%,
  100% {
    transform: perspective(var(--gacha-right-surface-perspective)) rotateY(var(--gacha-right-perspective))
      translate3d(0, var(--gacha-stage-float-soft-positive), 0);
  }

  50% {
    transform: perspective(var(--gacha-right-surface-perspective)) rotateY(var(--gacha-right-perspective))
      translate3d(0, var(--gacha-stage-float-soft-negative), 0);
  }
}

@keyframes gacha-video-detail-content-enter {
  from {
    opacity: 0.7;
    transform: translate3d(0, 6px, 0);
  }

  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
}

@keyframes gacha-stage-cursor-shadow-spread {
  0% {
    box-shadow: 0 0 0 0 var(--gacha-stage-cursor-pulse-color);
    opacity: 0.8;
  }

  100% {
    box-shadow: 0 0 0 20px rgb(12 18 26 / 0%);
    opacity: 0;
  }
}

@keyframes gacha-video-nav-flash {
  0% {
    filter: brightness(1);
  }

  35% {
    box-shadow: 0 0 0 5px color-mix(in srgb, var(--gacha-nav-tone) 34%, transparent), 0 16px 30px var(--c-box-shadow-color);
    filter: brightness(1.24);
  }

  100% {
    filter: brightness(1);
  }
}

@keyframes gacha-video-nav-scan {
  0% {
    opacity: 0;
    transform: translateX(-120%);
  }

  18% {
    opacity: 0.8;
  }

  100% {
    opacity: 0;
    transform: translateX(120%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .gacha-video-detail-content {
    animation: none;
  }
}
</style>
