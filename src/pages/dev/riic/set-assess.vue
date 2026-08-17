<script setup>
import { computed, onMounted, ref, watch } from "vue";
import buildingTable from "/src/static/json/build/building_table.json";
import OperatorAvatar from "/src/components/sprite/OperatorAvatar.vue";
import { operatorTableV2 } from "/src/utils/gameData.js";
import {
  evaluateRiicCrossRoomGroupAvailability,
} from "/src/utils/riic/l15-cross-room-availability.js";
import {
  getRiicSystemPercentRuleCount,
  planRiicSystemPercentAssessment,
} from "/src/utils/riic/P15-set-assessment.js";
import RIIC_BASELINE_SKILL_RULES from "/src/static/json/tools/R00-baseline.json";
import {
  calculateRiicRoomEfficiency,
  resolveRiicBaselineSkills,
} from "/src/utils/riic/l00-baseline-resolver.js";
import {
  calculateRiicDirectProductionOutput,
  getRiicRoomYieldMeta,
} from "/src/utils/riic/P03-riic-production.js";
import {
  getRiicSetAssessmentLayout,
  getRiicSetAssessmentManualSource,
  getRiicSetAssessmentOperatorNameMap,
  getRiicSetAssessmentSchedule,
  getRiicSetAssessmentSource,
  readRiicSetAssessmentWorkspace,
} from "/src/utils/riicSetAssessmentWorkspace.js";

const ROOM_LABELS = Object.freeze({
  control: "控制中枢",
  trading: "贸易站",
  manufacture: "制造站",
  power: "发电站",
  meeting: "会客室",
  hire: "办公室",
  dormitory: "宿舍",
  workshop: "加工站",
  training: "训练室",
});

const PRODUCT_LABELS = Object.freeze({
  lmd: "龙门币",
  gold: "赤金",
  exp: "经验书",
  experience: "经验书",
  orundum: "合成玉",
  all: "不限产物",
});

const PRODUCTION_METRIC_BY_ROOM = Object.freeze({
  manufacture: "生产力",
  trading: "订单效率",
  hire: "联络速度",
});

const PRODUCTION_RESOURCE_LABELS = Object.freeze({
  exp: "经验书",
  gold: "赤金",
  originiumShard: "源石碎片",
  lmd: "龙门币",
  orundum: "合成玉",
  recruitmentRefresh: "公招净刷新",
});

const BASELINE_SUPPORTED_ROOM_TYPES = new Set([
  "manufacture",
  "trading",
  "power",
  "control",
  "meeting",
  "hire",
]);

// 与明日方舟工具箱描述内可点击术语保持一致，仅供本评估页展示固定成员。
const TERM_OPERATOR_GROUPS = Object.freeze({
  rhine: {
    label: "莱茵生命",
    members: [
      "赫默",
      "伊芙利特",
      "塞雷娅",
      "白面鸮",
      "梅尔",
      "麦哲伦",
      "多萝西",
      "星源",
      "缪尔赛思",
      "娜斯提",
    ],
  },
  ussg: {
    label: "乌萨斯学生自治团",
    members: ["早露", "凛冬", "真理", "古米", "烈夏", "苦艾"],
  },
  karlan: {
    label: "谢拉格",
    members: [
      "银灰",
      "灵知",
      "初雪",
      "崖心",
      "角峰",
      "讯使",
      "耶拉",
      "极光",
      "锏",
      "雪猎",
    ],
  },
  siracusa: {
    label: "叙拉古",
    members: [
      "安洁莉娜",
      "拉普兰德",
      "普罗旺斯",
      "红云",
      "布洛卡",
      "巫恋",
      "铃兰",
      "贾维",
      "奥斯塔",
      "斥罪",
      "子月",
      "伺夜",
      "阿罗玛",
      "忍冬",
      "裁度",
      "荒芜拉普兰德",
      "贝洛内",
      "复奏",
    ],
  },
  blacksteel: {
    label: "黑钢国际",
    members: ["雷蛇", "芙兰卡", "杰西卡", "香草", "杏仁", "寻澜"],
  },
  knight: {
    label: "骑士",
    members: [
      "耀骑士临光",
      "临光",
      "瑕光",
      "鞭刃",
      "焰尾",
      "远牙",
      "灰毫",
      "野鬃",
      "正义骑士号",
      "砾",
      "薇薇安娜",
    ],
  },
  glasgow: {
    label: "格拉斯哥帮",
    members: ["推进之王", "摩根", "达格达", "因陀罗"],
  },
  redpine: {
    label: "红松骑士团",
    members: ["焰尾", "远牙", "灰毫", "野鬃", "正义骑士号"],
  },
  durin: {
    label: "杜林族",
    members: ["至简", "桃金娘", "褐果", "杜林", "特克诺"],
  },
  monsterHunter: {
    label: "怪物猎人小队",
    members: ["火龙S黑角", "麒麟R夜刀", "泰拉大陆调查团"],
  },
  monsterHunterShadow: {
    label: "泡影国狩猎小队",
    members: ["焰狐龙梓兰", "雷狼龙S空爆", "罗德岛隐秘队"],
  },
  workPlatform: {
    label: "作业平台",
    members: [
      "Lancet-2",
      "Castle-3",
      "THRM-EX",
      "正义骑士号",
      "Friston-3",
      "PhonoR-0",
      "CONFESS-47",
      "GALLUS²",
    ],
  },
  sui: {
    label: "岁",
    members: ["年", "夕", "令", "重岳", "黍", "余", "望"],
  },
  elite: {
    label: "精英干员",
    members: ["迷迭香", "煌", "逻各斯", "烛煌", "电弧", "真言", "机械师"],
  },
});

const TERM_OPERATOR_MEMBERS = Object.freeze(
  Object.fromEntries(
    Object.entries(TERM_OPERATOR_GROUPS).map(([key, group]) => [
      key,
      group.members,
    ]),
  ),
);

function getTermMembers(groupKeys, excludedNames = []) {
  const excluded = new Set(excludedNames);
  return [
    ...new Set(
      groupKeys.flatMap(
        (groupKey) => TERM_OPERATOR_GROUPS[groupKey]?.members || [],
      ),
    ),
  ].filter((name) => !excluded.has(name));
}

const ASSESSMENT_SYSTEMS = Object.freeze([
  {
    id: "wisadel",
    ruleSourceId: "control-cross-room",
    ruleIds: ["w-island-meeting", "w-island-control"],
    category: "中枢联动",
    title: "维什戴尔体系",
    summary:
      "维什戴尔、伊内丝、赫德雷与魔王的控制中枢、会客室和贸易站联动。",
    facilities: ["control", "meeting", "trading"],
    coreOperators: ["维什戴尔"],
    participantOperators: ["伊内丝", "赫德雷", "魔王"],
    skillRooms: ["control", "meeting", "trading"],
    relatedOperators: ["伊内丝", "赫德雷", "魔王"],
    engineStatus: "P15 公式目录待接入",
    engineNote:
      "当前只展示成员、位置和体系效果事实，不把标签计数或目标站加成伪装成最终结果。",
  },
  {
    id: "karlan-control",
    ruleSourceId: "control-cross-room",
    ruleIds: ["silverash-karlan", "gnosis-karlan", "saint-snow-silverash"],
    category: "中枢联动",
    title: "谢拉格体系",
    summary:
      "凛御银灰、灵知、圣聆初雪与谢拉格干员围绕控制中枢、贸易站和办公室形成的联动。",
    facilities: ["control", "trading", "hire"],
    coreOperators: ["凛御银灰", "灵知", "圣聆初雪"],
    participantOperators: ["谢拉格干员（按贸易站人数）"],
    skillRooms: ["control", "trading", "hire"],
    relatedOperators: getTermMembers(
      ["karlan"],
      ["凛御银灰", "灵知", "圣聆初雪"],
    ),
    engineStatus: "P15 公式目录待接入",
    engineNote:
      "同一套规则同时读取控制中枢、贸易站和办公室，不与其他阵营混合。",
  },
  {
    id: "siracusa-trade",
    ruleSourceId: "control-cross-room",
    ruleIds: ["ave-maria-siracusa", "bellone-sileach"],
    category: "贸易联动",
    title: "叙拉古贸易体系",
    summary:
      "八幡海铃、贝洛内、伺夜和叙拉古干员在贸易站内的订单联动。",
    facilities: ["trading"],
    coreOperators: ["八幡海铃", "贝洛内"],
    participantOperators: ["伺夜", "叙拉古干员（按贸易站人数）"],
    skillRooms: ["trading"],
    relatedOperators: getTermMembers(["siracusa"], ["八幡海铃", "贝洛内"]),
    engineStatus: "P15 公式目录待接入",
    engineNote:
      "只处理叙拉古成员与贸易站内位置关系，不和其他贸易组合混算。",
  },
  {
    id: "blacksteel-control",
    ruleSourceId: "control-cross-room",
    ruleIds: ["jessica-blacksteel"],
    category: "中枢联动",
    title: "黑钢国际体系",
    summary: "涤火杰西卡进驻控制中枢后，读取制造站内黑钢国际干员数量。",
    facilities: ["control", "manufacture"],
    coreOperators: ["涤火杰西卡"],
    participantOperators: ["黑钢国际干员（按制造站人数）"],
    skillRooms: ["control", "manufacture"],
    relatedOperators: getTermMembers(["blacksteel"], ["涤火杰西卡"]),
    engineStatus: "P15 公式目录待接入",
    engineNote: "只处理涤火杰西卡与黑钢国际成员的制造站联动。",
  },
  {
    id: "knight-control",
    ruleSourceId: "control-cross-room",
    ruleIds: ["viviana-knight", "flametail-redpine", "justice-wildmane"],
    category: "骑士联动",
    title: "骑士体系",
    summary:
      "薇薇安娜、焰尾、正义骑士号与骑士、红松骑士团、野鬃围绕制造站和发电站形成的联动。",
    facilities: ["control", "manufacture", "power"],
    coreOperators: ["薇薇安娜", "焰尾", "正义骑士号"],
    participantOperators: [
      "骑士干员（按制造站人数）",
      "红松骑士团干员（按制造站人数）",
      "野鬃",
    ],
    skillRooms: ["control", "manufacture", "power"],
    relatedOperators: getTermMembers(
      ["knight", "redpine"],
      ["薇薇安娜", "焰尾", "正义骑士号"],
    ),
    engineStatus: "P15 公式目录待接入",
    engineNote: "骑士和红松骑士团成员存在重叠，统一在此处评估位置占用。",
  },
  {
    id: "glasgow-control",
    ruleSourceId: "control-cross-room",
    ruleIds: ["dafine-glasgow"],
    category: "中枢联动",
    title: "格拉斯哥帮体系",
    summary: "戴菲恩进驻控制中枢后，读取同一贸易站内的格拉斯哥帮干员。",
    facilities: ["control", "trading"],
    coreOperators: ["戴菲恩"],
    participantOperators: ["格拉斯哥帮干员（按同一贸易站人数）"],
    skillRooms: ["control", "trading"],
    relatedOperators: getTermMembers(["glasgow"], ["戴菲恩"]),
    engineStatus: "P15 公式目录待接入",
    engineNote: "只处理戴菲恩与格拉斯哥帮成员的同站联动。",
  },
  {
    id: "deep-scout-ulpian",
    ruleSourceId: "control-cross-room",
    ruleIds: ["deep-scout-ulpian"],
    category: "贸易联动",
    title: "深巡与乌尔比安",
    summary: "深巡在贸易站内读取乌尔比安是否已进驻基建。",
    facilities: ["trading"],
    coreOperators: ["深巡"],
    participantOperators: ["乌尔比安"],
    skillRooms: ["trading"],
    relatedOperators: ["乌尔比安"],
    engineStatus: "P15 公式目录待接入",
    engineNote: "乌尔比安只作为这套贸易站规则的触发条件展示。",
  },
  {
    id: "rushu-gummy",
    ruleSourceId: "control-cross-room",
    ruleIds: ["rushu-gummy"],
    category: "跨设施联动",
    title: "烈夏与古米",
    summary: "烈夏进驻经验书制造站时，读取贸易站内的古米。",
    facilities: ["manufacture", "trading"],
    coreOperators: ["烈夏"],
    participantOperators: ["古米"],
    skillRooms: ["manufacture", "trading"],
    relatedOperators: ["古米"],
    engineStatus: "P15 公式目录待接入",
    engineNote: "这是一套独立的经验书制造联动，不与乌萨斯学生自治团的其他规则混在一起。",
  },
  {
    id: "friston-kaltsit",
    ruleSourceId: "control-cross-room",
    ruleIds: ["friston-kaltsit"],
    category: "跨设施联动",
    title: "Friston-3 与凯尔希",
    summary: "Friston-3 进驻发电站时，读取凯尔希是否进驻控制中枢。",
    facilities: ["power", "control"],
    coreOperators: ["Friston-3"],
    participantOperators: ["凯尔希"],
    skillRooms: ["power", "control"],
    relatedOperators: ["凯尔希"],
    engineStatus: "P15 公式目录待接入",
    engineNote: "只计算这套无人机充能联动，不与其他作业平台规则混在一起。",
  },
  {
    id: "phonor-logos",
    ruleSourceId: "control-cross-room",
    ruleIds: ["phonor-logos"],
    category: "跨设施联动",
    title: "PhonoR-0 与逻各斯",
    summary: "PhonoR-0 进驻发电站时，读取逻各斯是否进入训练室协助位。",
    facilities: ["power", "training"],
    coreOperators: ["PhonoR-0"],
    participantOperators: ["逻各斯"],
    skillRooms: ["power", "training"],
    relatedOperators: ["逻各斯"],
    engineStatus: "P15 公式目录待接入",
    engineNote: "只计算这套无人机充能联动，不与 Friston-3 或其他平台规则混在一起。",
  },
  {
    id: "faith-mixer-fiammetta",
    ruleSourceId: "control-cross-room",
    ruleIds: ["faith-mixer-fiammetta"],
    category: "跨设施联动",
    title: "信仰搅拌机与菲亚梅塔",
    summary: "信仰搅拌机进驻会客室时，读取菲亚梅塔是否进驻宿舍。",
    facilities: ["meeting", "dormitory"],
    coreOperators: ["信仰搅拌机"],
    participantOperators: ["菲亚梅塔"],
    skillRooms: ["meeting", "dormitory"],
    relatedOperators: ["菲亚梅塔"],
    engineStatus: "P15 公式目录待接入",
    engineNote: "只处理会客室和宿舍之间的这一套恢复联动。",
  },
  {
    id: "elite-facilities",
    category: "全局计数",
    title: "精英设施体系",
    summary:
      "凯尔希·思衡托和真言按“有精英干员进驻的设施数”计算，不按精英干员人数计算。",
    facilities: ["hire", "trading", "manufacture", "meeting", "power"],
    coreOperators: ["凯尔希·思衡托", "真言", "电弧"],
    participantOperators: ["精英干员（按设施数）"],
    skillRooms: ["hire", "trading", "control"],
    relatedOperators: getTermMembers(["elite"], ["电弧", "真言"]),
    engineStatus: "P15 公式目录待接入",
    engineNote:
      "一间设施内有多名精英干员仍只算一间；副手和活动室不计入当前排班事实。",
  },
  {
    id: "rhine",
    category: "全局计数",
    title: "莱茵生命体系",
    summary:
      "娜斯提读取全基建莱茵生命干员数量，缪尔赛思读取除自身外的莱茵生命干员数量。",
    facilities: ["manufacture", "power", "meeting"],
    coreOperators: ["娜斯提", "缪尔赛思"],
    participantOperators: ["莱茵生命干员（按全基建人数）"],
    skillRooms: ["manufacture", "power", "meeting"],
    relatedOperators: getTermMembers(["rhine"], ["娜斯提", "缪尔赛思"]),
    engineStatus: "P15 公式目录待接入",
    engineNote:
      "莱茵生命线索倾向只作为原文事实展示，不计入当前产能数值。",
  },
  {
    id: "ussg",
    category: "全局计数",
    title: "乌萨斯学生自治团",
    summary:
      "区分会客室人数、中枢人数和同制造站人数，分别对应怒潮凛冬、战车和相关制造技能。",
    facilities: ["control", "meeting", "manufacture", "hire"],
    coreOperators: ["怒潮凛冬", "战车", "早露", "苦艾", "真理"],
    participantOperators: [
      "乌萨斯学生自治团干员（按会客室人数）",
      "乌萨斯学生自治团干员（按中枢人数）",
    ],
    skillRooms: ["control", "meeting", "manufacture", "hire"],
    relatedOperators: getTermMembers(
      ["ussg"],
      ["怒潮凛冬", "战车", "早露", "苦艾", "真理"],
    ),
    engineStatus: "P15 公式目录待接入",
    engineNote:
      "乌萨斯特饮是独立状态资源，不和会客室线索速度直接合并。",
  },
  {
    id: "work-platform",
    category: "作业平台",
    title: "作业平台",
    summary:
      "查看发电站内作业平台数量，以及阿兰娜、GALLUS²、布丁、承曦格雷伊的触发条件。",
    facilities: ["power", "manufacture", "control"],
    coreOperators: ["GALLUS²", "阿兰娜", "承曦格雷伊", "布丁"],
    participantOperators: ["作业平台干员（按发电站数量）"],
    skillRooms: ["power", "manufacture", "control"],
    relatedOperators: [
      ...getTermMembers(["workPlatform"], ["GALLUS²"]),
      "温米",
    ],
    engineStatus: "P15 公式目录待接入",
    engineNote:
      "页面先展示实际在岗平台；正式计算前仍需要统一平台成员名单和虚拟设施顺序。",
  },
  {
    id: "virtual-facility",
    category: "设施级联",
    title: "虚拟设施",
    summary:
      "查看承曦格雷伊、森蚺与 Lancet-2 产生的有效发电站数量，以及下游读取位置。",
    facilities: ["control", "power", "manufacture"],
    coreOperators: ["承曦格雷伊", "森蚺"],
    participantOperators: ["Lancet-2", "发电站（虚拟设施数量）"],
    skillRooms: ["control", "power", "manufacture"],
    relatedOperators: ["Lancet-2", "温蒂", "异客", "掠风"],
    engineStatus: "P15 公式目录待接入",
    engineNote:
      "虚拟设施只影响设施数量；页面不会把它直接当成额外产能。",
  },
  {
    id: "monster-hunter",
    category: "状态资源",
    title: "怪猎与木天蓼",
    summary:
      "分开显示怪猎中枢加成、木天蓼来源、泰拉大陆调查团的贸易和制造读取。",
    facilities: ["control", "manufacture", "trading", "meeting", "dormitory"],
    coreOperators: [
      "火龙S黑角",
      "麒麟R夜刀",
      "泰拉大陆调查团",
      "焰狐龙梓兰",
      "罗德岛隐秘队",
    ],
    participantOperators: [
      "怪物猎人小队干员（按中枢人数）",
      "泡影国狩猎小队干员（按贸易站人数）",
      "木天蓼（状态资源）",
    ],
    skillRooms: ["control", "manufacture", "trading", "meeting", "dormitory"],
    relatedOperators: getTermMembers(
      ["monsterHunter", "monsterHunterShadow"],
      [
        "火龙S黑角",
        "麒麟R夜刀",
        "泰拉大陆调查团",
        "焰狐龙梓兰",
        "罗德岛隐秘队",
      ],
    ),
    engineStatus: "P15 公式目录待接入",
    engineNote:
      "木天蓼的状态结算顺序没有在本页面猜测；缺少规则时只显示未完成原因。",
  },
  {
    id: "human-fireworks",
    category: "状态资源",
    title: "岁与人间烟火",
    summary:
      "查看人间烟火的来源、转化和各设施消费者，并保留班段心情阈值的未确定状态。",
    facilities: ["control", "trading", "manufacture", "meeting", "training", "hire"],
    coreOperators: [
      "重岳",
      "令",
      "夕",
      "黍",
      "余",
      "乌有",
      "桑葚",
      "铎铃",
      "风絮",
      "截云",
    ],
    participantOperators: [
      "岁干员（按设施人数）",
      "人间烟火（状态资源）",
      "心情阈值（令 / 夕）",
    ],
    skillRooms: ["control", "trading", "manufacture", "meeting", "training", "hire"],
    relatedOperators: getTermMembers(
      ["sui"],
      ["重岳", "令", "夕", "黍", "余"],
    ),
    engineStatus: "P15 公式目录待接入",
    engineNote:
      "令和夕的效果依赖心情是否高于 12，页面不把缺少的班段心情当成满足。",
  },
  {
    id: "perception",
    category: "状态资源",
    title: "感知信息链",
    summary:
      "查看感知信息、无声共鸣、思维链环、小节、梦境和记忆碎片的跨设施来源。",
    facilities: ["manufacture", "trading", "dormitory", "hire", "control"],
    coreOperators: [
      "迷迭香",
      "黑键",
      "车尔尼",
      "爱丽丝",
      "絮雨",
      "令",
      "夕",
      "塑心",
      "深律",
    ],
    participantOperators: [
      "宿舍干员（按人数或等级）",
      "招募位（按办公室额外招募位）",
      "感知信息（状态资源）",
      "无声共鸣（状态资源）",
    ],
    skillRooms: ["manufacture", "trading", "dormitory", "hire", "control"],
    relatedOperators: [],
    engineStatus: "已有 L42 结算，P15 不重复猜算",
    engineNote:
      "本页展示班段和资源来源事实；已有结算结果仍以主页面的 L42/L79 输出为准。",
  },
  {
    id: "gold-lines",
    category: "资源链",
    title: "赤金生产线",
    summary:
      "查看鸿雪、绮良、图耶和杜林族对赤金生产线的来源与读取关系。",
    facilities: ["trading", "manufacture"],
    coreOperators: ["鸿雪", "绮良", "图耶"],
    participantOperators: [
      "杜林族干员（按全基建人数）",
      "赤金生产线（状态资源）",
    ],
    skillRooms: ["trading", "manufacture"],
    relatedOperators: getTermMembers(["durin"]),
    engineStatus: "P15 公式目录待接入",
    engineNote:
      "生产线的递归结算顺序未确认，页面不会把基础生产线和额外生产线相加冒充最终值。",
  },
]);

const SYSTEM_CORE_RULES = Object.freeze({
  "control-cross-room": [
    {
      id: "w-island-meeting",
      core: "维什戴尔",
      requirement: "伊内丝进驻会客室；赫德雷进驻贸易站",
      effect: "会客室线索搜集速度 +5%；赫德雷所在贸易站订单上限 +2",
      relatedTags: [
        { operator: "伊内丝", label: "维什戴尔：会客室" },
        { operator: "赫德雷", label: "维什戴尔：贸易站" },
      ],
    },
    {
      id: "w-island-control",
      core: "维什戴尔",
      requirement: "魔王进驻控制中枢",
      effect:
        "其他设施内工作干员心情每小时恢复基础 +0.1；满足条件时额外 +0.1",
      relatedTags: [{ operator: "魔王", label: "维什戴尔：控制中枢" }],
    },
    {
      id: "silverash-karlan",
      core: "凛御银灰",
      requirement: "贸易站内存在 3 名谢拉格干员",
      effect: "该贸易站订单获取效率 +10%",
      relatedGroups: ["karlan"],
    },
    {
      id: "gnosis-karlan",
      core: "灵知",
      requirement: "灵知进驻控制中枢；贸易站内有谢拉格干员",
      effect: "每名谢拉格干员使订单获取效率 -15%",
      relatedGroups: ["karlan"],
    },
    {
      id: "ave-maria-siracusa",
      core: "八幡海铃",
      requirement: "贸易站内有叙拉古干员",
      effect: "每名叙拉古干员使订单获取效率 +5%",
      relatedGroups: ["siracusa"],
    },
    {
      id: "jessica-blacksteel",
      core: "涤火杰西卡",
      requirement: "制造站内有黑钢国际干员",
      effect: "每名黑钢国际干员使生产力 +5%",
      relatedGroups: ["blacksteel"],
    },
    {
      id: "viviana-knight",
      core: "薇薇安娜",
      requirement: "制造站内有骑士干员",
      effect: "每名骑士干员使生产力 +7%",
      relatedGroups: ["knight"],
    },
    {
      id: "dafine-glasgow",
      core: "戴菲恩",
      requirement: "同一贸易站内有格拉斯哥帮干员",
      effect: "每名格拉斯哥帮干员使订单获取效率 +10%",
      relatedGroups: ["glasgow"],
    },
    {
      id: "flametail-redpine",
      core: "焰尾",
      requirement: "制造站内有红松骑士团干员",
      effect: "每名干员使作战记录生产力 +10%，贵金属生产力 -10%",
      relatedGroups: ["redpine"],
    },
    {
      id: "bellone-sileach",
      core: "贝洛内",
      requirement: "伺夜在基建内；同站时与伺夜同驻贸易站",
      effect: "订单获取效率额外 +10%；同站订单上限 +2",
      relatedTags: [{ operator: "伺夜", label: "贝洛内：贸易站" }],
    },
    {
      id: "deep-scout-ulpian",
      core: "深巡",
      requirement: "乌尔比安在基建内",
      effect: "订单获取效率额外 +10%",
      relatedTags: [{ operator: "乌尔比安", label: "深巡：基建内" }],
    },
    {
      id: "rushu-gummy",
      core: "烈夏",
      requirement: "古米进驻贸易站",
      effect: "作战记录类配方生产力 +35%",
      relatedTags: [{ operator: "古米", label: "烈夏：贸易站" }],
    },
    {
      id: "justice-wildmane",
      core: "正义骑士号",
      requirement: "野鬃进驻制造站",
      effect: "野鬃所在制造站生产力 +5%",
      relatedTags: [{ operator: "野鬃", label: "正义骑士号：制造站" }],
    },
    {
      id: "friston-kaltsit",
      core: "Friston-3",
      requirement: "Friston-3 进驻发电站；凯尔希进驻控制中枢",
      effect: "无人机充能速度 +5%",
      relatedTags: [{ operator: "凯尔希", label: "Friston-3：控制中枢" }],
    },
    {
      id: "phonor-logos",
      core: "PhonoR-0",
      requirement: "PhonoR-0 进驻发电站；逻各斯进驻训练室协助位",
      effect: "无人机充能速度 +5%",
      relatedTags: [{ operator: "逻各斯", label: "PhonoR-0：训练室" }],
    },
    {
      id: "secret-team-firefox",
      core: "罗德岛隐秘队",
      requirement: "焰狐龙梓兰进驻控制中枢",
      effect: "会客室线索搜集速度 +10%",
      relatedTags: [
        { operator: "焰狐龙梓兰", label: "罗德岛隐秘队：控制中枢" },
      ],
    },
    {
      id: "faith-mixer-fiammetta",
      core: "信仰搅拌机",
      requirement: "菲亚梅塔进驻宿舍",
      effect: "会客室线索搜集速度额外 +10%",
      relatedTags: [
        { operator: "菲亚梅塔", label: "信仰搅拌机：宿舍" },
      ],
    },
    {
      id: "saint-snow-silverash",
      core: "圣聆初雪",
      requirement: "凛御银灰进驻控制中枢",
      effect: "办公室联络速度额外 +10%",
      relatedTags: [{ operator: "凛御银灰", label: "圣聆初雪：控制中枢" }],
    },
  ],
  "elite-facilities": [
    {
      core: "凯尔希·思衡托",
      requirement: "凯尔希·思衡托进驻办公室；基建内有精英干员进驻的设施",
      effect: "每间设施使办公室联络速度额外 +4%，最多 5 间",
      relatedGroups: ["elite"],
    },
    {
      core: "真言",
      requirement: "真言进驻贸易站；基建内有精英干员进驻的设施",
      effect: "每间设施使订单获取效率额外 +2%，最多 10 间",
      relatedGroups: ["elite"],
    },
    {
      core: "电弧",
      requirement: "电弧进驻控制中枢；宿舍内有精英干员",
      effect: "所有宿舍内精英干员心情每小时恢复 +0.1",
      relatedGroups: ["elite"],
    },
  ],
  rhine: [
    {
      core: "娜斯提",
      requirement: "娜斯提进驻制造站；基建内有莱茵生命干员",
      effect: "每名干员使贵金属类配方生产力 +3%，最多 5 名",
      relatedGroups: ["rhine"],
    },
    {
      core: "缪尔赛思",
      requirement: "缪尔赛思进驻发电站；基建内有除自身外的莱茵生命干员",
      effect: "每名干员使无人机充能速度额外 +3%，最多 5 名",
      relatedGroups: ["rhine"],
    },
  ],
  ussg: [
    {
      core: "怒潮凛冬",
      requirement:
        "进驻控制中枢时，会客室内有乌萨斯学生自治团干员；或进驻制造站时与其同站",
      effect:
        "会客室每名干员使线索速度 +10%；同站作战记录生产力额外 +10%",
      relatedGroups: ["ussg"],
    },
    {
      core: "战车",
      requirement: "战车进驻控制中枢；中枢内有乌萨斯学生自治团干员",
      effect: "每名干员使乌萨斯特饮 +1",
      relatedGroups: ["ussg"],
    },
    {
      core: "早露",
      requirement: "早露进驻办公室",
      effect: "联络时提高乌萨斯学生自治团线索出现概率",
    },
    {
      core: "苦艾",
      requirement: "苦艾进驻会客室并搜集到非自治团线索",
      effect: "额外提高乌萨斯学生自治团线索出现概率",
    },
    {
      core: "真理",
      requirement: "真理进驻会客室",
      effect: "线索搜集速度 +10%，并提高自治团线索出现概率",
    },
  ],
  "work-platform": [
    {
      core: "GALLUS²",
      requirement: "GALLUS² 与其他作业平台进驻发电站",
      effect: "无人机充能速度 +5%",
      relatedGroups: ["workPlatform"],
    },
    {
      core: "阿兰娜",
      requirement: "阿兰娜进驻制造站；发电站内有作业平台",
      effect: "每台作业平台使贵金属类配方生产力 +10%",
      relatedGroups: ["workPlatform"],
    },
    {
      core: "阿兰娜",
      requirement: "阿兰娜与温米进驻同一制造站",
      effect: "贵金属类配方生产力 +15%",
      relatedTags: [{ operator: "温米", label: "阿兰娜：同站制造" }],
    },
    {
      core: "承曦格雷伊",
      requirement: "承曦格雷伊进驻发电站；其他发电站没有作业平台",
      effect: "发电站额外 +1，仅影响设施数量",
    },
    {
      core: "布丁",
      requirement: "布丁进驻控制中枢；至少 2 台作业平台进驻发电站",
      effect: "所有制造站生产力 +2%",
      relatedGroups: ["workPlatform"],
    },
  ],
  "virtual-facility": [
    {
      core: "承曦格雷伊",
      requirement: "其他发电站没有作业平台",
      effect: "发电站额外 +1，仅影响设施数量",
    },
    {
      core: "森蚺",
      requirement: "森蚺进驻控制中枢；Lancet-2 进驻发电站",
      effect: "发电站额外 +2，仅影响设施数量",
      relatedTags: [{ operator: "Lancet-2", label: "森蚺：发电站" }],
    },
    {
      core: "森蚺",
      requirement: "森蚺进驻制造站；按当前有效发电站数量结算",
      effect:
        "其他干员提供的常规生产力归零；每个发电站为当前制造站提供 +10% 生产力",
    },
  ],
  "monster-hunter": [
    {
      core: "火龙S黑角",
      requirement: "火龙S黑角与怪物猎人小队干员共同进驻控制中枢",
      effect: "所有贸易站订单效率 +7%",
      relatedGroups: ["monsterHunter"],
    },
    {
      core: "麒麟R夜刀",
      requirement: "麒麟R夜刀与怪物猎人小队干员共同进驻控制中枢",
      effect: "所有制造站生产力 +2%",
      relatedGroups: ["monsterHunter"],
    },
    {
      core: "泰拉大陆调查团",
      requirement: "进驻贸易站或制造站；当前拥有木天蓼",
      effect:
        "贸易站基础订单效率 +5%、订单上限 +2，每个木天蓼订单效率 +3%；制造站基础生产力 +5%，每个木天蓼生产力 +1%",
    },
    {
      core: "焰狐龙梓兰",
      requirement: "焰狐龙梓兰与泡影国狩猎小队干员进驻同一贸易站",
      effect: "订单上限 +3；每名相关干员使订单获取效率 +20%",
      relatedGroups: ["monsterHunterShadow"],
    },
    {
      core: "罗德岛隐秘队",
      requirement: "焰狐龙梓兰进驻控制中枢",
      effect: "会客室线索搜集速度 +10%",
    },
  ],
  "human-fireworks": [
    {
      core: "重岳",
      requirement: "岁干员进驻宿舍与活动室以外的设施",
      effect: "每名干员产生 5 点人间烟火，最多 5 名",
      relatedGroups: ["sui"],
    },
    {
      core: "令",
      requirement: "进驻控制中枢且心情高于或不高于 12",
      effect: "高于 12 时人间烟火 +15；否则感知信息 +10",
    },
    {
      core: "夕",
      requirement: "进驻控制中枢且心情高于或不高于 12",
      effect: "高于 12 时感知信息 +10；否则人间烟火 +15",
    },
    {
      core: "黍",
      requirement: "制造站内已获得人间烟火",
      effect: "每 3 点人间烟火使生产力 +1%",
    },
    {
      core: "余",
      requirement: "训练室内已获得人间烟火",
      effect: "每 1 点人间烟火使专精训练速度 +1%",
    },
    {
      core: "乌有",
      requirement: "宿舍内有干员；贸易站已获得人间烟火",
      effect: "宿舍每名干员使人间烟火 +1；每点人间烟火使订单效率 +1%",
    },
    {
      core: "桑葚",
      requirement: "办公室存在额外招募位",
      effect: "每个额外招募位产生 10 点人间烟火",
    },
    {
      core: "铎铃",
      requirement: "贸易站已获得人间烟火",
      effect: "每 10 点人间烟火使全员心情消耗额外 -0.02",
    },
    {
      core: "风絮",
      requirement: "有岁干员进驻的设施",
      effect: "每间设施使订单获取效率 +4%，最多 5 间",
      relatedGroups: ["sui"],
    },
    {
      core: "截云",
      requirement: "制造站已获得人间烟火",
      effect:
        "每 5 点人间烟火转化为 1 点巫术结晶；每点巫术结晶使生产力 +2%",
    },
  ],
  perception: [
    {
      core: "迷迭香",
      requirement: "宿舍内有干员",
      effect: "每名干员产生感知信息，并转化为思维链环",
    },
    {
      core: "黑键",
      requirement: "宿舍内有干员",
      effect: "每名干员产生感知信息，并转化为无声共鸣",
    },
    {
      core: "车尔尼",
      requirement: "进驻宿舍",
      effect: "宿舍每级提供 1 个小节，并转化为感知信息",
    },
    {
      core: "爱丽丝",
      requirement: "进驻宿舍",
      effect: "宿舍每级提供 1 层梦境，并转化为感知信息",
    },
    {
      core: "絮雨",
      requirement: "办公室存在额外招募位",
      effect: "每个额外招募位产生 10 点记忆碎片，并转化为感知信息",
    },
    {
      core: "令",
      requirement: "进驻控制中枢且心情不高于 12",
      effect: "感知信息 +10",
    },
    {
      core: "夕",
      requirement: "进驻控制中枢且心情高于 12",
      effect: "感知信息 +10",
    },
    {
      core: "塑心",
      requirement: "宿舍内有干员",
      effect: "每名干员使无声共鸣 +1",
    },
    {
      core: "深律",
      requirement: "办公室存在额外招募位",
      effect: "每个额外招募位使无声共鸣 +15",
    },
  ],
  "gold-lines": [
    {
      core: "鸿雪",
      requirement: "基建内有杜林族干员",
      effect: "每名杜林族干员为当前贸易站提供 1 条赤金生产线，最多 4 名",
      relatedGroups: ["durin"],
    },
    {
      core: "绮良",
      requirement: "当前贸易站已有赤金生产线",
      effect: "每 2 条生产线额外提供 2 条赤金生产线",
    },
    {
      core: "图耶",
      requirement: "当前贸易站已有赤金生产线",
      effect: "每 2 条生产线使订单获取效率额外 +15%",
    },
  ],
});

const snapshot = ref({
  activeSourceId: "skland",
  sources: [],
  workspaces: {},
});
const selectedSourceId = ref("");
const selectedSystemId = ref(ASSESSMENT_SYSTEMS[0].id);
const trainingMode = ref("current");
const idealTrainingRaritySelection = ref({
  six: true,
  five: true,
  fourOrBelow: true,
});
const definitionText = ref("[]");
const definitionError = ref("");
const rawResult = ref(null);
const rawPanelOpen = ref(false);
const systemPlacementChoices = ref({});

const selectedSource = computed(() =>
  getRiicSetAssessmentSource(snapshot.value, selectedSourceId.value),
);
const selectedLayout = computed(() =>
  getRiicSetAssessmentLayout(snapshot.value, selectedSourceId.value),
);
const selectedSchedule = computed(() =>
  getRiicSetAssessmentSchedule(snapshot.value, selectedSourceId.value),
);
const selectedSystem = computed(
  () =>
    ASSESSMENT_SYSTEMS.find((system) => system.id === selectedSystemId.value) ||
    ASSESSMENT_SYSTEMS[0],
);
const selectedSystemCoreRules = computed(() =>
  getSystemCoreRules(selectedSystem.value),
);
const availableSources = computed(() => {
  const sources = [...(snapshot.value.sources || [])];
  const manualSource = getRiicSetAssessmentManualSource();
  if (manualSource && !sources.some((source) => source.id === manualSource.id)) {
    sources.push(manualSource);
  }
  return sources;
});
const sourceNameMap = computed(() =>
  getRiicSetAssessmentOperatorNameMap(selectedSource.value),
);
const operatorMetaByName = Object.freeze(
  Object.fromEntries(
    Object.entries(operatorTableV2 || {}).map(([charId, operator]) => [
      operator?.name,
      {
        charId,
        rarity: Number(operator?.rarity || 1),
      },
    ]),
  ),
);

const layoutLabel = computed(() => {
  const plan = selectedLayout.value.plan;
  if (!plan) {
    return "尚未保存布局";
  }

  return `${plan.cardKey || plan.layoutId || "未知布局"} / ${
    plan.shiftMode || "未知换班"
  }`;
});

const scheduleStateCount = computed(
  () => selectedSchedule.value?.states?.length || 0,
);

function refreshSnapshot() {
  const nextSnapshot = readRiicSetAssessmentWorkspace();
  const manualSource = getRiicSetAssessmentManualSource();
  if (
    manualSource &&
    !nextSnapshot.sources.some((source) => source.id === manualSource.id)
  ) {
    nextSnapshot.sources.push(manualSource);
  }

  snapshot.value = nextSnapshot;
  const selectedSourceStillExists = nextSnapshot.sources.some(
    (source) => source.id === selectedSourceId.value,
  );
  selectedSourceId.value = selectedSourceStillExists
    ? selectedSourceId.value
    : nextSnapshot.activeSourceId || nextSnapshot.sources[0]?.id || "";
}

function parseDefinitions() {
  try {
    const parsed = JSON.parse(definitionText.value || "[]");
    if (!Array.isArray(parsed)) {
      throw new Error("组合定义必须是数组");
    }
    definitionError.value = "";
    return parsed;
  } catch (error) {
    definitionError.value = error?.message || "组合定义 JSON 无法解析";
    return null;
  }
}

function runRawAssessment() {
  const groups = parseDefinitions();
  if (!groups) {
    rawResult.value = null;
    return;
  }

  const source = selectedSource.value;
  rawResult.value = evaluateRiicCrossRoomGroupAvailability({
    groups,
    ownedOperators: source?.operators || [],
    currentOwnedOperators: source?.operators || [],
    operatorNameToCharId: sourceNameMap.value,
    layoutFacts: selectedLayout.value.facts || {},
    trainingMode: trainingMode.value,
    idealTrainingRaritySelection: idealTrainingRaritySelection.value,
  });
}

function toggleRarity(key) {
  idealTrainingRaritySelection.value = {
    ...idealTrainingRaritySelection.value,
    [key]: !idealTrainingRaritySelection.value[key],
  };
}

function getSourceOperator(name) {
  const charId = sourceNameMap.value?.[name];
  return (selectedSource.value?.operators || []).find(
    (operator) =>
      operator.charId === charId || operator.name === name,
  );
}

function getScheduledStateIndexes(name) {
  const charId = sourceNameMap.value?.[name];
  return (selectedSchedule.value?.states || [])
    .filter((state) =>
      (state.rooms || []).some((room) =>
        (room.operators || []).some(
          (operator) =>
            operator.charId === charId || operator.name === name,
        ),
      ),
    )
    .map((state) => state.index);
}

function getSystemCoreRules(system) {
  const rules = SYSTEM_CORE_RULES[system?.ruleSourceId || system?.id] || [];
  if (!Array.isArray(system?.ruleIds)) {
    return rules;
  }

  const allowedIds = new Set(system.ruleIds);
  return rules.filter((rule) => allowedIds.has(rule.id));
}

function getOperatorStaticMeta(name) {
  return operatorMetaByName[name] || null;
}

function getCoreSkillRequirement(system, name) {
  const relevantSkills = (buildingTable || []).filter(
    (skill) =>
      skill?.name === name &&
      (system?.skillRooms || []).includes(skill?.roomType),
  );
  if (relevantSkills.length === 0) {
    return null;
  }

  const elite = Math.max(
    ...relevantSkills.map((skill) => Number(skill?.phase || 0)),
  );
  const level = Math.max(
    ...relevantSkills
      .filter((skill) => Number(skill?.phase || 0) === elite)
      .map((skill) => Number(skill?.level || 1)),
  );

  return { elite, level };
}

function getCoreSkillRequirementForRoom(name, roomType) {
  const relevantSkills = (buildingTable || []).filter(
    (skill) => skill?.name === name && skill?.roomType === roomType,
  );
  if (relevantSkills.length === 0) {
    return null;
  }

  const elite = Math.max(
    ...relevantSkills.map((skill) => Number(skill?.phase || 0)),
  );
  const level = Math.max(
    ...relevantSkills
      .filter((skill) => Number(skill?.phase || 0) === elite)
      .map((skill) => Number(skill?.level || 1)),
  );
  return { elite, level };
}

function getRelatedTags(system, name) {
  const tags = getSystemCoreRules(system).flatMap((rule) => [
    ...(rule.relatedTags || [])
      .filter((tag) => tag.operator === name)
      .map((tag) => ({
        label: String(tag.label || "").includes("：")
          ? tag.label
          : `${rule.core}：${tag.label}`,
      })),
    ...(rule.relatedGroups || [])
      .filter((groupKey) =>
        (TERM_OPERATOR_GROUPS[groupKey]?.members || []).includes(name),
      )
      .map((groupKey) => ({
        label: `${rule.core}：${TERM_OPERATOR_GROUPS[groupKey].label}`,
      })),
  ]);
  return [...new Map(tags.map((tag) => [tag.label, tag])).values()];
}

function meetsTrainingRequirement(operator, requirement) {
  if (!operator || !requirement) {
    return Boolean(operator);
  }

  const elite = Number(operator.elite || 0);
  const level = Number(operator.level || 1);
  if (elite !== Number(requirement.elite || 0)) {
    return elite > Number(requirement.elite || 0);
  }
  return level >= Number(requirement.level || 1);
}

function getOperatorTrainingStatus(operator, requirement) {
  if (!operator) {
    return "not-owned";
  }
  if (!requirement) {
    return "owned";
  }
  return meetsTrainingRequirement(operator, requirement)
    ? "ready"
    : "needs-training";
}

function formatRequirement(requirement) {
  return requirement
    ? `E${requirement.elite} Lv.${requirement.level}`
    : "";
}

function formatOperatorFactStatus(operator) {
  if (!operator.owned) {
    return "当前数据源未持有";
  }
  if (!operator.requirement) {
    return `当前 E${operator.elite} Lv.${operator.level}`;
  }
  if (operator.trainingStatus === "ready") {
    return `已满足 ${formatRequirement(operator.requirement)}`;
  }
  return `当前 E${operator.elite} Lv.${operator.level}；需 ${formatRequirement(
    operator.requirement,
  )}`;
}

function getSystemOperatorSummary(system, role) {
  const names =
    role === "core"
      ? system.coreOperators || []
      : system.relatedOperators || [];
  return [...new Set(names)].map((name) => {
    const operator = getSourceOperator(name);
    const staticMeta = getOperatorStaticMeta(name);
    const stateIndexes = getScheduledStateIndexes(name);
    const requirement =
      role === "core" ? getCoreSkillRequirement(system, name) : null;
    return {
      name,
      owned: Boolean(operator),
      elite: operator?.elite ?? null,
      level: operator?.level ?? null,
      stateIndexes,
      role,
      charId: operator?.charId || staticMeta?.charId || "",
      rarity: Number(operator?.rarity || staticMeta?.rarity || 1),
      requirement,
      trainingStatus: getOperatorTrainingStatus(operator, requirement),
      tags: getRelatedTags(system, name),
    };
  });
}

function getSystemMemberSummary(system) {
  return [
    ...getSystemOperatorSummary(system, "core"),
    ...getSystemOperatorSummary(system, "related"),
  ];
}

function getSystemStatus(system) {
  if (!selectedSource.value) {
    return "missing-source";
  }
  if (!selectedLayout.value.facts) {
    return "missing-layout";
  }
  if (!selectedSchedule.value) {
    return "missing-schedule";
  }

  const tracked = getSystemMemberSummary(system);
  if (tracked.length > 0 && tracked.every((item) => !item.owned)) {
    return "no-members";
  }
  return "ready";
}

function getSystemStatusLabel(status) {
  return {
    ready: "已读取成员与布局",
    "missing-source": "缺少数据源",
    "missing-layout": "缺少布局",
    "missing-schedule": "尚未保存排班",
    "no-members": "当前数据源无相关成员",
  }[status] || status;
}

function getSystemStatusClass(status) {
  return {
    ready: "success",
    "missing-source": "warning",
    "missing-layout": "warning",
    "missing-schedule": "warning",
    "no-members": "muted",
  }[status] || "muted";
}

const selectedResolvedBaselineSkills = computed(() =>
  resolveRiicBaselineSkills(
    selectedSource.value?.operators || [],
    RIIC_BASELINE_SKILL_RULES,
    {
      trainingMode: trainingMode.value,
      idealTrainingRaritySelection: idealTrainingRaritySelection.value,
    },
  ),
);
const selectedSystemPercentAssessment = computed(() =>
  planRiicSystemPercentAssessment({
    systemId: selectedSystem.value.ruleSourceId || selectedSystem.value.id,
    ruleIds: selectedSystem.value.ruleIds,
    operators: selectedResolvedBaselineSkills.value.ownedOperators,
    layoutFacts: selectedLayout.value.facts || {},
    groupMembers: TERM_OPERATOR_MEMBERS,
    choices: systemPlacementChoices.value[selectedSystem.value.id] || {},
    getCoreRequirement: getCoreSkillRequirementForRoom,
  }),
);
const selectedSystemProductionAssessment = computed(() =>
  calculateSystemProductionAssessment({
    assessment: selectedSystemPercentAssessment.value,
    resolvedSkills: selectedResolvedBaselineSkills.value,
  }),
);
const selectedSystemCoreOperators = computed(() =>
  getSystemOperatorSummary(selectedSystem.value, "core"),
);
const selectedSystemRelatedOperators = computed(() =>
  getSystemOperatorSummary(selectedSystem.value, "related"),
);
const selectedSystemAssessmentRooms = computed(() =>
  selectedSystemProductionAssessment.value.rooms.filter(
    (room) => room.assigned.length > 0 || room.bonusByMetric.length > 0,
  ),
);
const selectedSystemDailyOutputs = computed(
  () => selectedSystemProductionAssessment.value.dailyOutputs,
);
const selectedSystemUnregisteredPercentRuleCount = computed(() =>
  Math.max(
    0,
    selectedSystemCoreRules.value.length -
      getRiicSystemPercentRuleCount(
        selectedSystem.value.ruleSourceId || selectedSystem.value.id,
        selectedSystem.value.ruleIds,
      ),
  ),
);

function stripSkillMarkup(value) {
  return String(value || "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function isConcreteOperatorName(name) {
  return (buildingTable || []).some((skill) => skill?.name === name);
}

function getSystemSkillEntries(system) {
  const operatorRoles = new Map();
  for (const name of system.coreOperators || []) {
    if (isConcreteOperatorName(name)) {
      operatorRoles.set(name, "核心");
    }
  }
  for (const name of system.participantOperators || []) {
    if (isConcreteOperatorName(name) && !operatorRoles.has(name)) {
      operatorRoles.set(name, "参与");
    }
  }
  for (const name of system.relatedOperators || []) {
    if (isConcreteOperatorName(name) && !operatorRoles.has(name)) {
      operatorRoles.set(name, "相关");
    }
  }

  const nameSet = new Set(operatorRoles.keys());
  const roomSet = new Set(system.skillRooms || []);
  const seen = new Set();

  return (buildingTable || []).flatMap((skill) => {
    if (!nameSet.has(skill?.name) || !roomSet.has(skill?.roomType)) {
      return [];
    }

    const description = stripSkillMarkup(skill.description);
    const key = [
      skill.name,
      skill.buffName,
      skill.roomType,
      skill.phase,
      skill.level,
      description,
    ].join("|");
    if (!description || seen.has(key)) {
      return [];
    }

    seen.add(key);
    return [
      {
        name: skill.name,
        buffName: String(skill.buffName || "").trim(),
        roomType: skill.roomType,
        phase: Number(skill.phase || 0),
        level: Number(skill.level || 0),
        description,
        role: operatorRoles.get(skill.name) || "相关",
      },
    ];
  });
}

const selectedSystemSkillEntries = computed(() =>
  getSystemSkillEntries(selectedSystem.value),
);

function formatRawStatus(status) {
  return {
    ready: "可直接使用",
    requiresTraining: "解锁基建技能后可用",
    skillLocked: "基建技能未解锁",
    missingOperators: "缺少干员",
    layoutMismatch: "布局条件不满足",
    requiresTagResolution: "等待标签匹配",
    invalidDefinition: "组合定义无效",
  }[status] || status;
}

function formatFacilityCheck(check) {
  const product = check.product ? ` / ${check.product}` : "";
  const level =
    check.minStationLevel === null ? "" : ` / Lv.${check.minStationLevel}`;
  return `${ROOM_LABELS[check.facilityType] || check.facilityType}${product}${level}：${check.actualCount}/${check.minCount}`;
}

function formatMemberCheck(check) {
  const requirement = check.requirement
    ? ` / 需要 E${check.requirement.elite} Lv.${check.requirement.level}`
    : "";
  const status = {
    matched: "已匹配",
    requiresTraining: "需要培养",
    skillLocked: "基建技能未解锁",
    notOwned: "未持有",
    maxEliteMismatch: "超过允许练度",
    duplicateMember: "重复干员",
    unknownOperator: "无法识别干员",
  }[check.status] || check.status;
  return `${check.name || check.charId || "未命名成员"}：${status}${requirement}`;
}

function formatUpgradeRequirement(requirement) {
  const current = requirement?.current || {};
  const required = requirement?.required || {};
  return `${requirement?.name || requirement?.charId || "未知干员"}：当前 E${
    current.elite ?? 0
  } Lv.${current.level ?? 1}，需要 E${required.elite ?? 0} Lv.${
    required.level ?? 1
  }`;
}

function formatAssessmentRoom(room) {
  const facility = ROOM_LABELS[room?.facilityType] || room?.facilityType;
  const product =
    room?.facilityType === "trading" || room?.facilityType === "manufacture"
      ? PRODUCT_LABELS[room?.product]
      : "";
  return `${product || facility} ${facility}${room?.index || ""}`;
}

function formatSignedPercent(value) {
  const percent = Number(value || 0);
  return `${percent >= 0 ? "+" : ""}${percent}%`;
}

function getAssessmentOperator(name) {
  const operator = getSourceOperator(name);
  const staticMeta = getOperatorStaticMeta(name);
  return {
    charId: operator?.charId || staticMeta?.charId || "",
    rarity: Number(operator?.rarity || staticMeta?.rarity || 1),
  };
}

function getAssessmentOperatorIds(room) {
  return (room?.assigned || [])
    .map((assignment) => getSourceOperator(assignment.name)?.charId)
    .filter(Boolean);
}

function getProductionProduct(room) {
  return room?.product === "exp" ? "experience" : room?.product || "all";
}

function getProductionMetric(room) {
  return PRODUCTION_METRIC_BY_ROOM[room?.facilityType] || "";
}

function getSystemRoomBonus(room) {
  const metric = getProductionMetric(room);
  if (!metric) {
    return 0;
  }

  return (room?.bonusByMetric || [])
    .filter((bonus) => bonus.metric === metric)
    .reduce((total, bonus) => total + Number(bonus.percent || 0), 0);
}

function calculateSystemProductionAssessment({ assessment, resolvedSkills }) {
  const rooms = Array.isArray(assessment?.rooms) ? assessment.rooms : [];
  const baselineByRoomId = new Map();
  const downstreamByRoomType = new Map();

  for (const room of rooms) {
    if (!BASELINE_SUPPORTED_ROOM_TYPES.has(room.facilityType)) {
      continue;
    }

    const operatorIds = getAssessmentOperatorIds(room);
    const fallbackSlotCount = Math.max(
      0,
      Number(room.slotCount || 0) - operatorIds.length,
    );
    let calculation;

    try {
      calculation = calculateRiicRoomEfficiency({
        resolvedSkills,
        roomType: room.facilityType,
        product: getProductionProduct(room),
        operatorIds,
        expectedSlots: Number(room.slotCount),
        fallbackSlotCount,
      });
    } catch {
      calculation = null;
    }

    baselineByRoomId.set(room.id, calculation);
    for (const [roomType, percent] of Object.entries(
      calculation?.downstreamBonusPercentByRoom || {},
    )) {
      downstreamByRoomType.set(
        roomType,
        Number(downstreamByRoomType.get(roomType) || 0) + Number(percent || 0),
      );
    }
  }

  const productionRooms = rooms.map((room) => {
    const baseline = baselineByRoomId.get(room.id);
    const facility = room.facilityType;
    const metric = getProductionMetric(room);
    const roomBonus = getSystemRoomBonus(room);
    const downstreamBonus = Number(
      downstreamByRoomType.get(facility) || 0,
    );
    const efficiency =
      baseline?.valid === true
        ? Number(baseline.localTotalPercent || 100) +
          roomBonus +
          downstreamBonus
        : null;
    const outputRoom = {
      facility,
      product: getProductionProduct(room),
      stationLevel: room.stationLevel,
    };
    const meta = getRiicRoomYieldMeta(outputRoom);
    const output =
      efficiency === null
        ? null
        : calculateRiicDirectProductionOutput({
            room: outputRoom,
            efficiency,
            durationHours: 24,
            meta,
          });

    let status = "notApplicable";
    let reason = "";
    if (meta && output !== null) {
      status = "calculated";
    } else if (facility === "meeting") {
      status = "unsupported";
      reason = "会客室暂未建立绝对产出公式";
    } else if (facility === "control" || facility === "power") {
      status = "notApplicable";
      reason = "该设施没有直接资源产出";
    } else if (!meta) {
      status = "unsupported";
      reason = "当前产物暂未建立绝对产出公式";
    } else if (!baseline?.valid) {
      status = "unavailable";
      reason = "基础效率无法结算";
    } else {
      status = "unsupported";
      reason = "当前设施等级暂未建立绝对产出公式";
    }

    return {
      ...room,
      finalProduction: {
        status,
        reason,
        resource: meta?.resource || "",
        label: PRODUCTION_RESOURCE_LABELS[meta?.resource] || meta?.label || "",
        output,
        efficiency,
        roomBonus,
        downstreamBonus,
      },
    };
  });

  const dailyOutputs = new Map();
  for (const room of productionRooms) {
    const finalProduction = room.finalProduction;
    if (finalProduction.status !== "calculated") {
      continue;
    }

    const current = dailyOutputs.get(finalProduction.resource) || {
      resource: finalProduction.resource,
      label: finalProduction.label,
      output: 0,
    };
    current.output += Number(finalProduction.output || 0);
    dailyOutputs.set(finalProduction.resource, current);
  }

  return {
    rooms: productionRooms,
    dailyOutputs: [...dailyOutputs.values()],
  };
}

function formatProductionValue(value) {
  const number = Number(value);
  return Number.isFinite(number)
    ? new Intl.NumberFormat("zh-CN", {
        maximumFractionDigits: 2,
      }).format(number)
    : "--";
}

function updateSystemPlacementChoice(choice, name) {
  const systemChoices = {
    ...(systemPlacementChoices.value[selectedSystem.value.id] || {}),
  };
  const current = Array.isArray(systemChoices[choice.id])
    ? systemChoices[choice.id]
    : [...choice.selectedNames];
  const next = current.includes(name)
    ? current.filter((item) => item !== name)
    : current.length < choice.limit
      ? [...current, name]
      : current;

  systemPlacementChoices.value = {
    ...systemPlacementChoices.value,
    [selectedSystem.value.id]: {
      ...systemChoices,
      [choice.id]: next,
    },
  };
}

function handleRawPanelToggle(event) {
  rawPanelOpen.value = event.currentTarget.open;
  if (rawPanelOpen.value) {
    runRawAssessment();
  }
}

watch(
  [snapshot, selectedSourceId, trainingMode, idealTrainingRaritySelection],
  () => {
    if (rawPanelOpen.value) {
      runRawAssessment();
    }
  },
  { deep: true },
);

onMounted(() => {
  refreshSnapshot();
});
</script>

<template>
  <main class="assessment-page">
    <header class="page-header">
      <div>
        <p class="eyebrow">RIIC / L15 + P15</p>
        <h1>基建体系评估</h1>
        <p class="page-subtitle">
          读取当前数据源、布局和已保存的排班班段，分别查看各类基建体系的触发事实。
          未登记的 P15 公式会明确显示，不会用估算值填充。
        </p>
      </div>
      <button class="button button-secondary" type="button" @click="refreshSnapshot">
        重读缓存
      </button>
    </header>

    <section class="context-bar">
      <div class="context-item">
        <span>数据源</span>
        <strong>{{ selectedSource?.label || "未选择" }}</strong>
        <small>
          {{
            selectedSource
              ? `${selectedSource.operators.length} 名干员`
              : "没有可用干员数据"
          }}
        </small>
      </div>
      <div class="context-item">
        <span>布局</span>
        <strong>{{ layoutLabel }}</strong>
        <small>
          {{
            selectedLayout.facts
              ? `${selectedLayout.facts.facilities.length} 个设施`
              : "尚未读取布局事实"
          }}
        </small>
      </div>
      <div class="context-item">
        <span>排班事实</span>
        <strong>
          {{
            selectedSchedule
              ? `${scheduleStateCount} 个班段`
              : "尚未保存"
          }}
        </strong>
        <small>
          {{
            selectedSchedule
              ? "只读快照，不会反向修改主排班"
              : "回主排班页生成一次排班后再读取"
          }}
        </small>
      </div>
    </section>

    <section class="toolbar-panel">
      <div class="source-switch">
        <span class="toolbar-label">当前数据源</span>
        <button
          v-for="source in availableSources"
          :key="source.id"
          type="button"
          class="source-chip"
          :class="{ active: source.id === selectedSourceId }"
          @click="selectedSourceId = source.id"
        >
          {{ source.label }}
        </button>
        <span v-if="availableSources.length === 0" class="empty-inline">
          没有可用数据源
        </span>
      </div>
      <div class="training-switch">
        <span class="toolbar-label">L15 练度口径</span>
        <button
          type="button"
          class="mode-button"
          :class="{ active: trainingMode === 'current' }"
          @click="trainingMode = 'current'"
        >
          使用当前练度
        </button>
        <button
          type="button"
          class="mode-button"
          :class="{ active: trainingMode === 'ideal' }"
          @click="trainingMode = 'ideal'"
        >
          基建技能视为已解锁
        </button>
        <template v-if="trainingMode === 'ideal'">
          <button
            v-for="item in [
              { key: 'six', label: '6星' },
              { key: 'five', label: '5星' },
              { key: 'fourOrBelow', label: '4星以下' },
            ]"
            :key="item.key"
            type="button"
            class="mode-button compact"
            :class="{ active: idealTrainingRaritySelection[item.key] }"
            @click="toggleRarity(item.key)"
          >
            解锁{{ item.label }}
          </button>
        </template>
      </div>
    </section>

    <section class="assessment-layout">
      <aside class="system-sidebar">
        <div class="section-heading">
          <span class="section-kicker">体系</span>
          <strong>{{ ASSESSMENT_SYSTEMS.length }} 个评估入口</strong>
        </div>
        <button
          v-for="system in ASSESSMENT_SYSTEMS"
          :key="system.id"
          type="button"
          class="system-nav-item"
          :class="{ active: selectedSystem.id === system.id }"
          @click="selectedSystemId = system.id"
        >
          <span>
            <small>{{ system.category }}</small>
            <strong>{{ system.title }}</strong>
          </span>
          <em :class="getSystemStatusClass(getSystemStatus(system))">
            {{ getSystemStatusLabel(getSystemStatus(system)) }}
          </em>
        </button>
      </aside>

      <div class="system-content">
        <header class="system-header">
          <div>
            <p class="section-kicker">{{ selectedSystem.category }}</p>
            <h2>{{ selectedSystem.title }}</h2>
            <p>{{ selectedSystem.summary }}</p>
          </div>
          <div class="system-header-side">
            <div class="system-header-status">
              <span
                class="status-badge"
                :class="getSystemStatusClass(getSystemStatus(selectedSystem))"
              >
                {{ getSystemStatusLabel(getSystemStatus(selectedSystem)) }}
              </span>
              <span class="engine-badge">{{ selectedSystem.engineStatus }}</span>
            </div>
            <div class="system-explanation">
              <div class="core-rule-list">
                <strong>核心规则</strong>
                <div
                  v-for="rule in selectedSystemCoreRules"
                  :key="`${selectedSystem.id}:${rule.core}:${rule.requirement}`"
                  class="core-rule-item"
                >
                  <div class="core-rule-heading">
                    <b>{{ rule.core }}</b>
                    <small>
                      {{
                        formatRequirement(
                          getCoreSkillRequirement(selectedSystem, rule.core),
                        )
                      }}
                    </small>
                  </div>
                  <strong class="core-rule-value">
                    需求：{{ rule.requirement }}
                  </strong>
                  <strong class="core-rule-value">
                    效果：{{ rule.effect }}
                  </strong>
                </div>
                <span v-if="selectedSystemCoreRules.length === 0">
                  当前体系尚未登记可展示的核心规则
                </span>
              </div>
              <div class="skill-source-list">
                <strong>技能原文</strong>
                <div
                  v-for="skill in selectedSystemSkillEntries"
                  :key="`${skill.name}:${skill.buffName}:${skill.phase}:${skill.level}`"
                  class="skill-source-item"
                >
                  <div>
                    <b>{{ skill.name }}</b>
                    <small>
                      {{ skill.role }} · {{ skill.buffName || "未命名技能" }} ·
                      {{ ROOM_LABELS[skill.roomType] || skill.roomType }} ·
                      E{{ skill.phase }} Lv.{{ skill.level }}
                    </small>
                  </div>
                  <p>{{ skill.description }}</p>
                </div>
                <span v-if="selectedSystemSkillEntries.length === 0">
                  当前体系尚未读取到具体干员技能原文
                </span>
              </div>
            </div>
          </div>
        </header>

        <div class="system-note">
          <strong>当前口径</strong>
          <span>{{ selectedSystem.engineNote }}</span>
        </div>

        <section class="fact-section">
          <div class="section-heading">
            <div>
              <span class="section-kicker">成员事实</span>
              <strong>固定核心与相关干员</strong>
            </div>
            <span class="section-count">
              {{
                selectedSystemCoreOperators.filter((operator) => operator.owned)
                  .length
              }}
              / {{ selectedSystemCoreOperators.length }} 核心已持有
              <template v-if="selectedSystemRelatedOperators.length">
                ；{{
                  selectedSystemRelatedOperators.filter(
                    (operator) => operator.owned,
                  ).length
                }}
                / {{ selectedSystemRelatedOperators.length }} 相关已持有
              </template>
            </span>
          </div>
          <div class="member-fact-group">
            <div class="member-group-heading">
              <strong>核心干员</strong>
              <span>{{ selectedSystemCoreOperators.length }} 名</span>
            </div>
            <div class="operator-fact-grid">
              <article
                v-for="operator in selectedSystemCoreOperators"
                :key="`core:${operator.name}`"
                class="operator-fact"
                :class="{
                  owned: operator.owned,
                  'needs-training': operator.trainingStatus === 'needs-training',
                }"
              >
                <OperatorAvatar
                  v-if="operator.charId"
                  :char-id="operator.charId"
                  :rarity="operator.rarity"
                  :size="42"
                  :border="true"
                />
                <div class="operator-fact-content">
                  <strong>{{ operator.name }}</strong>
                  <span
                    class="operator-fact-status"
                    :class="operator.trainingStatus"
                  >
                    {{ formatOperatorFactStatus(operator) }}
                  </span>
                  <span v-if="operator.stateIndexes.length" class="operator-state">
                    {{
                      `班段 ${operator.stateIndexes
                        .map((index) => index + 1)
                        .join("、")}`
                    }}
                  </span>
                  <div v-if="operator.tags.length" class="operator-tag-list">
                    <span
                      v-for="tag in operator.tags"
                      :key="`${operator.name}:${tag.label}`"
                      class="operator-tag"
                    >
                      {{ tag.label }}
                    </span>
                  </div>
                </div>
              </article>
            </div>
          </div>

          <div
            v-if="selectedSystemRelatedOperators.length"
            class="member-fact-group related-member-group"
          >
            <div class="member-group-heading">
              <strong>相关干员</strong>
              <span>{{ selectedSystemRelatedOperators.length }} 名</span>
            </div>
            <div class="operator-fact-grid">
              <article
                v-for="operator in selectedSystemRelatedOperators"
                :key="`related:${operator.name}`"
                class="operator-fact"
                :class="{ owned: operator.owned }"
              >
                <OperatorAvatar
                  v-if="operator.charId"
                  :char-id="operator.charId"
                  :rarity="operator.rarity"
                  :size="42"
                  :border="true"
                />
                <div class="operator-fact-content">
                  <strong>{{ operator.name }}</strong>
                  <span
                    class="operator-fact-status"
                    :class="operator.trainingStatus"
                  >
                    {{ formatOperatorFactStatus(operator) }}
                  </span>
                  <span v-if="operator.stateIndexes.length" class="operator-state">
                    {{
                      `班段 ${operator.stateIndexes
                        .map((index) => index + 1)
                        .join("、")}`
                    }}
                  </span>
                  <div v-if="operator.tags.length" class="operator-tag-list">
                    <span
                      v-for="tag in operator.tags"
                      :key="`${operator.name}:${tag.label}`"
                      class="operator-tag"
                    >
                      {{ tag.label }}
                    </span>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section class="fact-section">
          <div class="section-heading">
            <div>
              <span class="section-kicker">体系站位</span>
              <strong>自动分配与最终产出</strong>
            </div>
            <span class="section-count">
              {{ selectedSystemPercentAssessment.activeRuleCount }} 条规则已生效
            </span>
          </div>

          <p class="system-plan-note">
            最终产出按当前数据源、当前练度和当前布局计算，默认按本体系自动分配的成员连续驻守 24
            小时换算；未占用的位置按无额外技能处理，不自动补入体系外干员。
          </p>

          <div
            v-if="selectedSystemDailyOutputs.length"
            class="system-daily-output-summary"
          >
            <strong>最终日产出</strong>
            <span
              v-for="output in selectedSystemDailyOutputs"
              :key="output.resource"
            >
              {{ output.label }} {{ formatProductionValue(output.output) }} / 天
            </span>
          </div>

          <div
            v-if="selectedSystemPercentAssessment.registeredRuleCount"
            class="system-plan-grid"
          >
            <article
              v-for="room in selectedSystemAssessmentRooms"
              :key="room.id"
              class="system-plan-room"
            >
              <div class="system-plan-room-heading">
                <div>
                  <strong>{{ formatAssessmentRoom(room) }}</strong>
                  <small>
                    {{ room.assigned.length }} / {{ room.slotCount }} 个位置已占用
                  </small>
                </div>
                <span v-if="room.stationLevel">Lv.{{ room.stationLevel }}</span>
              </div>

              <div v-if="room.assigned.length" class="system-plan-operators">
                <div
                  v-for="assignment in room.assigned"
                  :key="`${room.id}:${assignment.name}`"
                  class="system-plan-operator"
                >
                  <OperatorAvatar
                    v-if="getAssessmentOperator(assignment.name).charId"
                    :char-id="getAssessmentOperator(assignment.name).charId"
                    :rarity="getAssessmentOperator(assignment.name).rarity"
                    :size="34"
                    :border="true"
                  />
                  <span>{{ assignment.name }}</span>
                </div>
              </div>
              <span v-else class="system-plan-empty">本体系未占用该房间</span>

              <div
                v-if="room.bonusByMetric.length"
                class="system-plan-bonus-list"
              >
                <span
                  v-for="bonus in room.bonusByMetric"
                  :key="`${room.id}:${bonus.metric}`"
                >
                  {{ bonus.metric }} {{ formatSignedPercent(bonus.percent) }}
                </span>
              </div>

              <div class="system-plan-production">
                <span>最终产出</span>
                <strong
                  v-if="room.finalProduction.status === 'calculated'"
                >
                  {{ room.finalProduction.label }}
                  {{ formatProductionValue(room.finalProduction.output) }} / 天
                </strong>
                <small v-else>
                  {{ room.finalProduction.reason || "暂无绝对产出结果" }}
                </small>
              </div>
            </article>
          </div>
          <div v-else class="empty-block">
            当前体系尚未登记可直接结算的百分比规则
          </div>

          <div
            v-if="selectedSystemPercentAssessment.metricBonuses.length"
            class="system-plan-metric-list"
          >
            <span
              v-for="bonus in selectedSystemPercentAssessment.metricBonuses"
              :key="bonus.metric"
            >
              {{ bonus.metric }} {{ formatSignedPercent(bonus.percent) }}
            </span>
          </div>

          <div
            v-if="selectedSystemPercentAssessment.manualChoices.length"
            class="system-placement-choice-list"
          >
            <div
              v-for="choice in selectedSystemPercentAssessment.manualChoices"
              :key="choice.id"
              class="system-placement-choice"
            >
              <div class="system-placement-choice-heading">
                <strong>{{ choice.label }}</strong>
                <span>请选择 {{ choice.limit }} 名</span>
              </div>
              <small
                v-if="choice.requiredNames?.length"
                class="system-placement-choice-fixed"
              >
                已固定：{{ choice.requiredNames.join("、") }}
              </small>
              <div class="system-placement-choice-options">
                <button
                  v-for="name in choice.candidateNames"
                  :key="`${choice.id}:${name}`"
                  type="button"
                  :class="{ active: choice.selectedNames.includes(name) }"
                  @click="updateSystemPlacementChoice(choice, name)"
                >
                  <OperatorAvatar
                    v-if="getAssessmentOperator(name).charId"
                    :char-id="getAssessmentOperator(name).charId"
                    :rarity="getAssessmentOperator(name).rarity"
                    :size="28"
                    :border="true"
                  />
                  <span>{{ name }}</span>
                </button>
              </div>
            </div>
          </div>

          <div
            v-if="
              selectedSystemUnregisteredPercentRuleCount ||
              selectedSystemPercentAssessment.unavailableRuleCount
            "
            class="system-plan-footnote"
          >
            <span v-if="selectedSystemUnregisteredPercentRuleCount">
              {{ selectedSystemUnregisteredPercentRuleCount }} 条规则依赖状态资源、概率或未登记公式，暂不计入。
            </span>
            <span v-if="selectedSystemPercentAssessment.unavailableRuleCount">
              {{ selectedSystemPercentAssessment.unavailableRuleCount }} 条已登记规则因未持有、练度或位置不足未生效。
            </span>
          </div>
        </section>

        <section class="engine-section">
          <div class="section-heading">
            <div>
              <span class="section-kicker">计算状态</span>
              <strong>P15 公式接入情况</strong>
            </div>
          </div>
          <div class="engine-placeholder">
            <span class="engine-dot"></span>
            <div>
              <strong>{{ selectedSystem.engineStatus }}</strong>
              <p>
                当前页面只展示真实数据源和排班快照。公式未登记、输入不完整或结算顺序未确认时，
                结果保持为空。
              </p>
            </div>
          </div>
        </section>
      </div>
    </section>

    <details
      :open="rawPanelOpen"
      class="raw-debug-panel"
      @toggle="handleRawPanelToggle"
    >
      <summary>
        <span>开发调试：直接检查 L15 组合定义</span>
        <small>保留原始 JSON 入口，不作为主评估流程</small>
      </summary>
      <div class="raw-debug-body">
        <div class="raw-debug-heading">
          <div>
            <span class="section-kicker">L15 输入</span>
            <strong>显式组合定义</strong>
          </div>
          <button class="button button-primary" type="button" @click="runRawAssessment">
            运行 L15
          </button>
        </div>
        <textarea
          v-model="definitionText"
          class="definition-input"
          spellcheck="false"
          placeholder='[{"id":"example","variants":[{"id":"v1","members":[{"name":"干员名","elite":2}],"facilityRequirements":[{"facilityType":"trading","minCount":1,"minStationLevel":3}]}]}]'
        ></textarea>
        <p v-if="definitionError" class="error-text">{{ definitionError }}</p>
        <div v-if="rawResult" class="raw-result">
          <strong>
            {{ rawResult.availableGroupCount || 0 }} /
            {{ rawResult.groups?.length || 0 }} 个组合可用
          </strong>
          <div
            v-for="group in rawResult.groups"
            :key="group.id"
            class="raw-group"
          >
            <div class="raw-group-heading">
              <strong>{{ group.name }}</strong>
              <span
                class="status-badge"
                :class="group.status === 'ready' ? 'success' : 'warning'"
              >
                {{ formatRawStatus(group.status) }}
              </span>
            </div>
            <div
              v-for="variant in group.variants"
              :key="variant.id"
              class="raw-variant"
            >
              <div class="raw-variant-heading">
                <span>{{ variant.name || variant.id }}</span>
                <small>{{ formatRawStatus(variant.status) }}</small>
              </div>
              <div
                v-if="variant.memberChecks?.length"
                class="raw-check-list"
              >
                <span
                  v-for="(check, checkIndex) in variant.memberChecks"
                  :key="`${variant.id}:member:${checkIndex}:${check.charId || check.name}`"
                >
                  {{ formatMemberCheck(check) }}
                </span>
              </div>
              <div
                v-if="variant.unresolvedTags?.length"
                class="raw-check-list warning"
              >
                <span
                  v-for="(item, tagIndex) in variant.unresolvedTags"
                  :key="`${variant.id}:tags:${tagIndex}`"
                >
                  未解析标签：{{ item.tags.join("、") }}
                </span>
              </div>
              <div
                v-if="variant.facilityChecks?.length"
                class="raw-check-list"
              >
                <span
                  v-for="(check, checkIndex) in variant.facilityChecks"
                  :key="`${variant.id}:facility:${checkIndex}`"
                >
                  {{ formatFacilityCheck(check) }}
                </span>
              </div>
              <div
                v-if="variant.upgradeRequirements?.length"
                class="raw-check-list training"
              >
                <span
                  v-for="requirement in variant.upgradeRequirements"
                  :key="`${variant.id}:upgrade:${requirement.charId}`"
                >
                  {{ formatUpgradeRequirement(requirement) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </details>
  </main>
</template>

<style scoped>
.assessment-page {
  width: min(1440px, calc(100% - 48px));
  margin: 28px auto 72px;
  color: var(--c-text-color, #26313d);
}

.page-header,
.context-bar,
.toolbar-panel,
.assessment-layout,
.system-header,
.section-heading,
.state-row,
.raw-debug-heading {
  display: flex;
}

.page-header {
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 20px;
}

.eyebrow,
.section-kicker,
.toolbar-label {
  margin: 0;
  color: #66809b;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

h1,
h2,
p {
  margin-top: 0;
}

h1 {
  margin: 5px 0 8px;
  font-size: clamp(26px, 3vw, 38px);
  line-height: 1.1;
}

h2 {
  margin: 4px 0 8px;
  font-size: 24px;
}

.page-subtitle {
  max-width: 760px;
  margin-bottom: 0;
  color: #647386;
  line-height: 1.65;
}

.button,
.source-chip,
.mode-button,
.system-nav-item {
  border: 0;
  font: inherit;
  cursor: pointer;
}

.button {
  min-height: 38px;
  padding: 0 16px;
  border-radius: 7px;
  font-size: 14px;
  font-weight: 700;
}

.button-primary {
  color: #fff;
  background: #2f6f9f;
}

.button-secondary {
  color: #2f6f9f;
  background: #e8f1f7;
}

.context-bar {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin-bottom: 14px;
  border: 1px solid #dce4ea;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}

.context-item {
  min-height: 82px;
  padding: 15px 18px;
  border-right: 1px solid #e5ebef;
}

.context-item:last-child {
  border-right: 0;
}

.context-item span,
.context-item small {
  display: block;
  color: #778595;
  font-size: 12px;
}

.context-item strong {
  display: block;
  margin: 6px 0 3px;
  overflow: hidden;
  color: #243545;
  font-size: 17px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.toolbar-panel {
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 14px 24px;
  margin-bottom: 16px;
  padding: 12px 14px;
  border: 1px solid #dce4ea;
  border-radius: 8px;
  background: #f5f7f8;
}

.source-switch,
.training-switch {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 7px;
}

.toolbar-label {
  margin-right: 3px;
  color: #687988;
  letter-spacing: 0.04em;
}

.source-chip,
.mode-button {
  min-height: 30px;
  padding: 0 11px;
  border: 1px solid #cbd7df;
  border-radius: 6px;
  color: #536777;
  background: #fff;
  font-size: 13px;
}

.source-chip.active,
.mode-button.active {
  border-color: #2f6f9f;
  color: #fff;
  background: #2f6f9f;
}

.mode-button.compact {
  padding: 0 8px;
  font-size: 12px;
}

.empty-inline,
.empty-state,
.empty-block {
  color: #8694a1;
  font-size: 13px;
}

.assessment-layout {
  align-items: stretch;
  gap: 16px;
}

.system-sidebar {
  flex: 0 0 245px;
  align-self: flex-start;
  border: 1px solid #dce4ea;
  border-radius: 8px;
  background: #fff;
  overflow: hidden;
}

.section-heading {
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.system-sidebar > .section-heading {
  padding: 15px 15px 12px;
  border-bottom: 1px solid #e6ecef;
}

.system-sidebar > .section-heading strong {
  font-size: 13px;
}

.system-nav-item {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 14px;
  border-bottom: 1px solid #edf1f3;
  color: #374b5b;
  background: #fff;
  text-align: left;
}

.system-nav-item:last-child {
  border-bottom: 0;
}

.system-nav-item:hover,
.system-nav-item.active {
  background: #f1f6f9;
}

.system-nav-item.active {
  box-shadow: inset 4px 0 0 #2f6f9f;
}

.system-nav-item span {
  min-width: 0;
}

.system-nav-item small,
.system-nav-item strong {
  display: block;
}

.system-nav-item small {
  margin-bottom: 3px;
  color: #8795a1;
  font-size: 11px;
}

.system-nav-item strong {
  overflow: hidden;
  font-size: 14px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.system-nav-item em {
  flex: 0 0 auto;
  font-size: 11px;
  font-style: normal;
  white-space: nowrap;
}

.success {
  color: #21834b;
}

.warning {
  color: #bf7721;
}

.muted {
  color: #8896a2;
}

.system-content {
  min-width: 0;
  flex: 1;
  border: 1px solid #dce4ea;
  border-radius: 8px;
  background: #fff;
}

.system-header {
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  padding: 20px 22px 16px;
  border-bottom: 1px solid #e5ebef;
}

.system-header p {
  max-width: 760px;
  margin-bottom: 0;
  color: #687988;
  line-height: 1.55;
}

.system-header-side {
  display: flex;
  min-width: 320px;
  max-width: 480px;
  flex: 0 1 440px;
  flex-direction: column;
  gap: 9px;
}

.system-header-status {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.system-explanation {
  max-height: 245px;
  padding: 10px 11px;
  border: 1px solid #dfe7eb;
  border-radius: 6px;
  overflow: auto;
  background: #f8fafb;
}

.core-rule-list > strong,
.skill-source-list > strong {
  color: #3f5666;
  font-size: 11px;
}

.core-rule-list {
  padding-bottom: 7px;
}

.core-rule-list > strong {
  display: block;
  margin-bottom: 6px;
}

.core-rule-item {
  padding: 7px 0;
  border-top: 1px dashed #dfe7eb;
}

.core-rule-item:first-of-type {
  border-top: 0;
}

.core-rule-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.core-rule-heading b {
  min-width: 0;
  color: #405665;
  font-size: 11px;
}

.core-rule-heading small {
  flex: 0 0 auto;
  color: #8b6a43;
  font-size: 10px;
}

.core-rule-value {
  display: block;
  margin-top: 3px;
  color: #b66e20;
  font-size: 11px;
  font-weight: 700;
  line-height: 1.5;
}

.skill-source-list {
  padding-top: 7px;
  border-top: 1px solid #e5ebef;
}

.skill-source-list > strong {
  display: block;
  margin-bottom: 6px;
}

.skill-source-item {
  padding: 7px 0;
  border-top: 1px dashed #dfe7eb;
}

.skill-source-item:first-of-type {
  border-top: 0;
}

.skill-source-item b,
.skill-source-item small {
  display: block;
}

.skill-source-item b {
  color: #405665;
  font-size: 11px;
}

.skill-source-item small {
  margin-top: 2px;
  color: #85939e;
  font-size: 10px;
}

.skill-source-item p {
  margin: 4px 0 0;
  color: #637783;
  font-size: 11px;
  line-height: 1.5;
}

.status-badge,
.engine-badge {
  display: inline-flex;
  min-height: 25px;
  align-items: center;
  padding: 0 8px;
  border-radius: 999px;
  font-size: 12px;
  white-space: nowrap;
}

.status-badge {
  background: #edf2f4;
}

.status-badge.success {
  background: #e7f5ec;
}

.status-badge.warning {
  background: #fff3e2;
}

.engine-badge {
  color: #5b7182;
  background: #eef2f5;
}

.system-note {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin: 16px 22px 0;
  padding: 11px 13px;
  border-left: 3px solid #9bb4c6;
  color: #61717f;
  background: #f5f7f8;
  font-size: 13px;
  line-height: 1.55;
}

.system-note strong {
  flex: 0 0 auto;
  color: #354b5c;
}

.fact-section,
.engine-section {
  margin: 18px 22px 0;
  padding-top: 18px;
  border-top: 1px solid #e5ebef;
}

.fact-section .section-heading strong,
.engine-section .section-heading strong {
  display: block;
  margin-top: 4px;
  font-size: 15px;
}

.section-count {
  color: #7a8995;
  font-size: 12px;
}

.system-plan-note {
  margin: 10px 0 0;
  color: #71818e;
  font-size: 12px;
  line-height: 1.6;
}

.system-daily-output-summary {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 7px;
  margin-top: 12px;
  padding: 10px 11px;
  border-left: 3px solid #d69536;
  background: #fff8ed;
}

.system-daily-output-summary strong {
  color: #8d5e1d;
  font-size: 12px;
}

.system-daily-output-summary span {
  color: #664d2e;
  font-size: 12px;
  font-weight: 700;
}

.system-plan-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 10px;
  margin-top: 12px;
}

.system-plan-room {
  min-width: 0;
  padding: 11px;
  border: 1px solid #dfe7eb;
  border-radius: 6px;
  background: #fafcfc;
}

.system-plan-room-heading,
.system-placement-choice-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.system-plan-room-heading strong,
.system-plan-room-heading small {
  display: block;
}

.system-plan-room-heading strong {
  color: #3b5262;
  font-size: 13px;
}

.system-plan-room-heading small {
  margin-top: 3px;
  color: #81909b;
  font-size: 11px;
}

.system-plan-room-heading > span {
  flex: 0 0 auto;
  color: #9a6a2d;
  font-size: 11px;
}

.system-plan-operators {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 8px;
  margin-top: 10px;
}

.system-plan-operator {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 5px;
  color: #526977;
  font-size: 11px;
}

.system-plan-operator span {
  max-width: 74px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.system-plan-empty {
  display: block;
  margin-top: 11px;
  color: #a0abb2;
  font-size: 11px;
}

.system-plan-bonus-list,
.system-plan-metric-list,
.system-plan-footnote {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.system-plan-bonus-list {
  margin-top: 11px;
  padding-top: 9px;
  border-top: 1px dashed #dce5e9;
}

.system-plan-bonus-list span,
.system-plan-metric-list span {
  display: inline-flex;
  min-height: 22px;
  align-items: center;
  padding: 0 7px;
  border-radius: 4px;
  color: #9b5e1e;
  background: #fff2df;
  font-size: 11px;
  font-weight: 700;
}

.system-plan-metric-list {
  margin-top: 10px;
}

.system-plan-metric-list span {
  color: #2f657d;
  background: #e9f3f7;
}

.system-plan-production {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin-top: 10px;
  padding-top: 9px;
  border-top: 1px solid #e5ebef;
}

.system-plan-production > span {
  flex: 0 0 auto;
  color: #788895;
  font-size: 11px;
}

.system-plan-production strong {
  color: #2f6f4e;
  font-size: 13px;
  text-align: right;
}

.system-plan-production small {
  color: #89959c;
  font-size: 11px;
  line-height: 1.45;
  text-align: right;
}

.system-placement-choice-list {
  display: grid;
  gap: 9px;
  margin-top: 14px;
}

.system-placement-choice {
  padding: 11px;
  border: 1px solid #ead29f;
  border-radius: 6px;
  background: #fffaf1;
}

.system-placement-choice-heading strong {
  color: #7d5425;
  font-size: 12px;
}

.system-placement-choice-heading span {
  color: #aa7e42;
  font-size: 11px;
}

.system-placement-choice-fixed {
  display: block;
  margin-top: 5px;
  color: #927344;
  font-size: 11px;
}

.system-placement-choice-options {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 9px;
}

.system-placement-choice-options button {
  display: inline-flex;
  min-height: 34px;
  align-items: center;
  gap: 5px;
  padding: 3px 7px 3px 4px;
  border: 1px solid #d8e0e4;
  border-radius: 5px;
  color: #607482;
  background: #fff;
  cursor: pointer;
  font: inherit;
  font-size: 11px;
}

.system-placement-choice-options button.active {
  border-color: #c98731;
  color: #8e581d;
  background: #fff0d9;
}

.system-plan-footnote {
  margin-top: 12px;
  color: #8a98a2;
  font-size: 11px;
  line-height: 1.55;
}

.operator-fact-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 8px;
  margin-top: 12px;
}

.member-fact-group + .member-fact-group {
  margin-top: 18px;
}

.member-group-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}

.member-group-heading strong {
  color: #3d5362;
  font-size: 13px;
}

.member-group-heading span {
  color: #83919d;
  font-size: 11px;
}

.operator-fact {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  min-width: 0;
  padding: 10px 11px;
  border: 1px solid #e1e8ec;
  border-radius: 6px;
  background: #f8fafb;
}

.operator-fact.owned {
  border-color: #b9ddc5;
  background: #f2faf4;
}

.operator-fact.needs-training {
  border-color: #edcf9b;
  background: #fff9ef;
}

.operator-fact-content {
  min-width: 0;
  flex: 1;
}

.operator-fact-content > strong,
.operator-fact-content > span {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.operator-fact-content > strong {
  color: #304757;
  font-size: 13px;
}

.operator-fact-status,
.operator-state {
  margin-top: 5px;
  color: #7b8994;
  font-size: 12px;
}

.operator-fact-status.ready {
  color: #21834b;
}

.operator-fact-status.needs-training {
  color: #b16e1f;
}

.operator-fact-status.not-owned {
  color: #8a97a1;
}

.operator-state {
  color: #7890a2;
}

.operator-tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 7px;
}

.operator-tag {
  max-width: 100%;
  overflow: hidden;
  padding: 2px 5px;
  border-radius: 3px;
  color: #9f651f;
  background: #fff0d9;
  font-size: 10px;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.state-table {
  margin-top: 12px;
  border: 1px solid #e1e8ec;
  border-radius: 6px;
  overflow: hidden;
}

.state-row {
  min-width: 0;
  align-items: stretch;
  border-bottom: 1px solid #e7edef;
}

.state-row:last-child {
  border-bottom: 0;
}

.state-label {
  flex: 0 0 150px;
  padding: 12px;
  background: #f6f8f9;
}

.state-label strong,
.state-label small {
  display: block;
}

.state-label strong {
  color: #304757;
  font-size: 13px;
}

.state-label small {
  margin-top: 5px;
  color: #82909b;
  font-size: 11px;
}

.state-rooms {
  display: grid;
  min-width: 0;
  flex: 1;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}

.room-fact {
  min-width: 0;
  padding: 11px 12px;
  border-left: 1px solid #e7edef;
}

.room-fact strong,
.room-fact span {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.room-fact strong {
  color: #3d5362;
  font-size: 12px;
}

.room-fact span {
  margin-top: 5px;
  color: #71818e;
  font-size: 12px;
}

.empty-block {
  margin-top: 12px;
  padding: 22px 14px;
  border: 1px dashed #ccd7de;
  border-radius: 6px;
  background: #fafbfb;
  text-align: center;
}

.engine-section {
  padding-bottom: 22px;
}

.engine-placeholder {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-top: 12px;
  padding: 13px;
  border: 1px solid #e2e9ed;
  border-radius: 6px;
  background: #f8fafb;
}

.engine-dot {
  width: 9px;
  height: 9px;
  margin-top: 5px;
  flex: 0 0 auto;
  border-radius: 50%;
  background: #c78b39;
}

.engine-placeholder strong {
  color: #405665;
  font-size: 13px;
}

.engine-placeholder p {
  margin: 5px 0 0;
  color: #778793;
  font-size: 12px;
  line-height: 1.55;
}

.raw-debug-panel {
  margin-top: 16px;
  border: 1px solid #dce4ea;
  border-radius: 8px;
  background: #fff;
}

.raw-debug-panel summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 13px 16px;
  cursor: pointer;
  color: #465c6c;
  font-size: 13px;
  font-weight: 700;
}

.raw-debug-panel summary small {
  color: #8795a0;
  font-size: 11px;
  font-weight: 400;
}

.raw-debug-body {
  padding: 0 16px 16px;
  border-top: 1px solid #e5ebef;
}

.raw-debug-heading {
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 0 10px;
}

.definition-input {
  display: block;
  width: 100%;
  min-height: 150px;
  box-sizing: border-box;
  padding: 12px;
  border: 1px solid #d6e0e6;
  border-radius: 6px;
  resize: vertical;
  color: #344a5a;
  background: #fbfcfc;
  font: 12px/1.55 ui-monospace, SFMono-Regular, Consolas, monospace;
}

.error-text {
  margin: 8px 0 0;
  color: #bd4d42;
  font-size: 12px;
}

.raw-result {
  margin-top: 12px;
  padding: 12px;
  border: 1px solid #e1e8ec;
  border-radius: 6px;
  background: #f8fafb;
}

.raw-group {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #e3e9ed;
}

.raw-group-heading,
.raw-variant {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.raw-group-heading strong,
.raw-variant-heading > span {
  color: #405564;
  font-size: 13px;
}

.raw-variant {
  display: block;
  padding: 7px 0 0 12px;
}

.raw-variant-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.raw-variant-heading small {
  color: #7a8995;
  font-size: 11px;
  text-align: right;
}

.raw-check-list {
  display: grid;
  gap: 3px;
  margin-top: 5px;
  color: #7a8995;
  font-size: 11px;
  line-height: 1.45;
}

.raw-check-list.warning {
  color: #bf7721;
}

.raw-check-list.training {
  color: #2f6f9f;
}

@media (max-width: 900px) {
  .assessment-page {
    width: min(100% - 24px, 720px);
  }

  .assessment-layout {
    display: block;
  }

  .system-sidebar {
    margin-bottom: 14px;
  }

  .system-nav-item {
    display: inline-flex;
    width: auto;
    min-width: 150px;
    border-right: 1px solid #edf1f3;
  }

  .system-sidebar {
    display: flex;
    flex-wrap: wrap;
  }

  .system-sidebar > .section-heading {
    width: 100%;
  }
}

@media (max-width: 620px) {
  .page-header,
  .system-header,
  .state-row {
    display: block;
  }

  .page-header .button {
    margin-top: 12px;
  }

  .context-bar {
    display: block;
  }

  .context-item {
    border-right: 0;
    border-bottom: 1px solid #e5ebef;
  }

  .context-item:last-child {
    border-bottom: 0;
  }

  .system-header-status {
    align-items: flex-start;
    margin-top: 12px;
  }

  .system-header-side {
    min-width: 0;
    max-width: none;
    margin-top: 12px;
  }

  .state-label {
    width: auto;
  }

  .room-fact {
    border-top: 1px solid #e7edef;
    border-left: 0;
  }

  .raw-debug-panel summary {
    display: block;
  }

  .raw-debug-panel summary small {
    display: block;
    margin-top: 5px;
  }
}
</style>
