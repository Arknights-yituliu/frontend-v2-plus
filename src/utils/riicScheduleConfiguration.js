export const ROOM_PRODUCT_OPTIONS = Object.freeze({
  trading: [
    { value: "lmd", label: "龙门币" },
    { value: "orundum", label: "合成玉" },
  ],
  manufacture: [
    { value: "experience", label: "作战记录" },
    { value: "gold", label: "赤金" },
    { value: "orundum", label: "源石碎片" },
  ],
});

export const SCHEDULE_ROOM_GROUP_META = {
  control: {
    facilityLabel: "控制中枢",
    icon: "mdi-home-variant-outline",
    tone: "control",
  },
  meeting: {
    facilityLabel: "会客室",
    icon: "mdi-account-group-outline",
    tone: "meeting",
  },
  trading: {
    facilityLabel: "贸易站",
    icon: "mdi-handshake-outline",
    tone: "trading",
  },
  manufacture: {
    facilityLabel: "制造站",
    icon: "mdi-factory",
    tone: "manufacture",
  },
  power: {
    facilityLabel: "发电站",
    icon: "mdi-lightning-bolt",
    tone: "power",
  },
  dormitory: {
    facilityLabel: "宿舍",
    icon: "mdi-bed-outline",
    tone: "dormitory",
  },
  processing: {
    facilityLabel: "加工站",
    icon: "mdi-hammer-wrench",
    tone: "processing",
  },
  office: {
    facilityLabel: "办公室",
    icon: "mdi-briefcase-outline",
    tone: "office",
  },
  training: {
    facilityLabel: "训练室",
    icon: "mdi-school-outline",
    tone: "training",
  },
};
export const SCHEDULE_ROOM_GROUP_ICONS = {
  "lmd-trading": "mdi-cash-multiple",
  "experience-manufacture": "mdi-book-open-page-variant-outline",
  "gold-manufacture": "mdi-gold",
  "orundum-trading": "mdi-star-four-points-outline",
  "orundum-manufacture": "mdi-star-four-points-outline",
  power: "mdi-lightning-bolt",
};
export const ROOM_CANDIDATE_PRODUCTS = Object.freeze({
  "lmd-trading": "lmd",
  "experience-manufacture": "experience",
  "gold-manufacture": "gold",
  "orundum-trading": "orundum",
  "orundum-manufacture": "orundum",
  power: "all",
  control: "all",
  meeting: "all",
  office: "all",
});
export const ROOM_CANDIDATE_EFFECT_META = Object.freeze([
  {
    facility: "trading",
    field: "tradingPercent",
    label: "贸易",
  },
  {
    facility: "manufacture",
    field: "manufacturePercent",
    label: "制造",
  },
  {
    facility: "power",
    field: "powerPercent",
    label: "发电",
  },
  {
    facility: "meeting",
    field: "meetingPercent",
    label: "会客",
  },
  {
    facility: "office",
    field: "officePercent",
    label: "办公室",
  },
]);
export const STATIC_SCHEDULE_ROOM_GROUPS = Object.freeze([
  {
    id: "support:control",
    key: "control",
    label: "控制中枢",
    facilityLabel: "控制中枢",
    icon: "mdi-home-variant-outline",
    tone: "control",
    count: 1,
    row: "core",
    width: 1,
    rotationRequired: true,
    manualControl: true,
  },
  {
    id: "support:meeting",
    key: "meeting",
    label: "会客室",
    facilityLabel: "会客室",
    icon: "mdi-account-group-outline",
    tone: "meeting",
    count: 1,
    row: "core",
    width: 1,
    rotationRequired: true,
    fallbackOnly: true,
  },
  {
    id: "support:dormitory",
    key: "dormitory",
    label: "宿舍区",
    facilityLabel: "宿舍",
    icon: "mdi-bed-outline",
    tone: "dormitory",
    count: 4,
    row: "support",
    width: 1,
    rotationRequired: false,
  },
  {
    id: "support:processing",
    key: "processing",
    label: "加工站",
    facilityLabel: "加工站",
    icon: "mdi-hammer-wrench",
    tone: "processing",
    count: 1,
    row: "support",
    width: 1,
    rotationRequired: false,
  },
  {
    id: "support:office",
    key: "office",
    label: "办公室",
    facilityLabel: "办公室",
    icon: "mdi-briefcase-outline",
    tone: "office",
    count: 1,
    row: "support",
    width: 1,
    rotationRequired: true,
    fallbackOnly: true,
  },
  {
    id: "support:training",
    key: "training",
    label: "训练室",
    facilityLabel: "训练室",
    icon: "mdi-school-outline",
    tone: "training",
    count: 1,
    row: "support",
    width: 1,
    rotationRequired: false,
  },
]);

const NEED_OPTIONS = [
  {
    value: "high",
    label: "非常缺",
    icon: "mdi-alert-circle-outline",
    tone: "red",
  },
  {
    value: "medium",
    label: "勉强够用",
    icon: "mdi-minus-circle-outline",
    tone: "orange",
  },
  {
    value: "low",
    label: "暂时不缺",
    icon: "mdi-check-circle-outline",
    tone: "green",
  },
];

export const RIIC_SCHEDULE_STEPS = [
  {
    key: "resources",
    label: "养成需求",
    fields: [
      {
        key: "lmdNeed",
        layout: "need",
        label: "在养成干员时，你有多缺龙门币？",
        options: NEED_OPTIONS,
      },
      {
        key: "experienceNeed",
        layout: "need",
        label: "在养成干员时，你有多缺经验书？",
        options: NEED_OPTIONS,
      },
      {
        key: "farmingHabit",
        layout: "farming",
        label: "平时会额外刷取龙门币或经验书吗？",
        options: [
          {
            value: "rarely",
            label: "基本不刷",
            icon: "mdi-battery-10",
            tone: "gray",
          },
          {
            value: "sometimes",
            label: "偶尔会刷",
            icon: "mdi-battery-50",
            tone: "blue",
          },
          {
            value: "frequently",
            label: "每天 100 理智以上",
            icon: "mdi-battery-90",
            tone: "orange",
          },
        ],
      },
    ],
  },
  {
    key: "operation",
    label: "换班频率",
    fields: [
      {
        key: "shiftMode",
        layout: "frequency",
        label: "你每天通常能安排几次换班？",
        options: [
          {
            value: "threeTimes",
            label: "一天三换",
            icon: "mdi-clock-fast",
            tone: "orange",
          },
          {
            value: "twice",
            label: "一天两换",
            icon: "mdi-weather-sunset-up",
            tone: "blue",
          },
          {
            value: "once",
            label: "一天一换",
            icon: "mdi-calendar-clock",
            tone: "gray",
          },
        ],
      },
      {
        key: "executionReliability",
        layout: "reliability",
        label: "在这个频率下，你能否稳定收菜和换班？",
        options: [
          {
            value: "reliable",
            label: "基本能按时完成",
            icon: "mdi-check-circle-outline",
            tone: "green",
          },
          {
            value: "mostlyReliable",
            label: "偶尔延后，但通常能完成",
            icon: "mdi-clock-outline",
            tone: "blue",
          },
          {
            value: "unreliable",
            label: "经常无法按时完成",
            icon: "mdi-clock-alert-outline",
            tone: "orange",
          },
        ],
      },
    ],
  },
  {
    key: "tradeoffs",
    label: "长期选择",
    fields: [
      {
        key: "orundumPreference",
        layout: "binary",
        label: "愿意以约 30% 养成产出换取每月约 10 抽吗？",
        options: [
          {
            value: "decline",
            label: "不愿意",
            icon: "mdi-factory",
            tone: "blue",
          },
          {
            value: "accept",
            label: "愿意",
            icon: "mdi-star-four-points-outline",
            tone: "purple",
          },
        ],
      },
      {
        key: "carbonNeed",
        layout: "binary",
        label: "你是否缺升级基建所用的碳？",
        options: [
          {
            value: "notNeeded",
            label: "暂时不缺",
            icon: "mdi-check-circle-outline",
            tone: "green",
          },
          {
            value: "needed",
            label: "需要",
            icon: "mdi-cube-outline",
            tone: "orange",
          },
        ],
      },
    ],
  },
];

export const DEFAULT_ANSWERS = Object.freeze({
  lmdNeed: null,
  experienceNeed: null,
  farmingHabit: null,
  shiftMode: null,
  executionReliability: null,
  orundumPreference: null,
  carbonNeed: null,
});
export const RIIC_SCHEDULE_ANSWER_FIELDS = RIIC_SCHEDULE_STEPS.flatMap((step) => step.fields);
export const LAYOUT_CARD_META = [
  {
    key: "153",
    layoutId: "153",
    label: "153",
    description: "经验书优先",
    icon: "mdi-book-open-page-variant-outline",
    tone: "blue",
    compatibleShiftModes: ["twice", "threeTimes"],
    rooms: [
      {
        key: "lmd-trading",
        count: 1,
        label: "龙门币",
        facility: "trading",
      },
      {
        key: "experience-manufacture",
        count: 4,
        label: "经验书",
        facility: "manufacture",
      },
      {
        key: "gold-manufacture",
        count: 1,
        label: "赤金",
        facility: "manufacture",
      },
      { key: "power", count: 3, label: "发电站", facility: "power" },
    ],
  },
  {
    key: "243",
    layoutId: "243",
    label: "243",
    description: "钱书均衡/龙门币优先",
    icon: "mdi-scale-balance",
    secondaryIcon: "mdi-cash-multiple",
    tone: "green",
    compatibleShiftModes: ["once", "twice", "threeTimes"],
    rooms: [
      {
        key: "lmd-trading",
        count: 2,
        label: "龙门币",
        facility: "trading",
      },
      {
        key: "experience-manufacture",
        count: 2,
        label: "经验书",
        facility: "manufacture",
      },
      {
        key: "gold-manufacture",
        count: 2,
        label: "赤金",
        facility: "manufacture",
      },
      { key: "power", count: 3, label: "发电站", facility: "power" },
    ],
  },
  {
    key: "243-orundum",
    layoutId: "243",
    label: "243（搓玉）",
    description: "合成玉",
    icon: "mdi-star-four-points-outline",
    tone: "red",
    compatibleShiftModes: ["twice", "threeTimes"],
    rooms: [
      {
        key: "lmd-trading",
        count: 1,
        label: "龙门币",
        facility: "trading",
      },
      {
        key: "orundum-trading",
        count: 1,
        label: "合成玉",
        facility: "trading",
      },
      {
        key: "experience-manufacture",
        count: 1,
        label: "经验书",
        facility: "manufacture",
      },
      {
        key: "orundum-manufacture",
        count: 1,
        label: "源石碎片",
        facility: "manufacture",
      },
      {
        key: "gold-manufacture",
        count: 2,
        label: "赤金",
        facility: "manufacture",
      },
      { key: "power", count: 3, label: "发电站", facility: "power" },
    ],
  },
  {
    key: "252-2-gold",
    layoutId: "252",
    label: "252（2 赤金）",
    description: "钱书均衡",
    icon: "mdi-scale-balance",
    tone: "green",
    compatibleShiftModes: ["twice", "threeTimes"],
    rooms: [
      {
        key: "lmd-trading",
        count: 2,
        label: "龙门币",
        facility: "trading",
      },
      {
        key: "experience-manufacture",
        count: 3,
        label: "经验书",
        facility: "manufacture",
      },
      {
        key: "gold-manufacture",
        count: 2,
        label: "赤金",
        facility: "manufacture",
      },
      { key: "power", count: 2, label: "发电站", facility: "power" },
    ],
  },
  {
    key: "252-3-gold",
    layoutId: "252",
    label: "252（3 赤金）",
    description: "龙门币优先",
    icon: "mdi-cash-multiple",
    tone: "blue",
    compatibleShiftModes: ["twice", "threeTimes"],
    rooms: [
      {
        key: "lmd-trading",
        count: 2,
        label: "龙门币",
        facility: "trading",
      },
      {
        key: "experience-manufacture",
        count: 2,
        label: "经验书",
        facility: "manufacture",
      },
      {
        key: "gold-manufacture",
        count: 3,
        label: "赤金",
        facility: "manufacture",
      },
      { key: "power", count: 2, label: "发电站", facility: "power" },
    ],
  },
  {
    key: "333",
    layoutId: "333",
    label: "333",
    description: "龙门币优先",
    icon: "mdi-cash-multiple",
    tone: "blue",
    compatibleShiftModes: ["twice", "threeTimes"],
    rooms: [
      {
        key: "lmd-trading",
        count: 3,
        label: "龙门币",
        facility: "trading",
      },
      {
        key: "gold-manufacture",
        count: 3,
        label: "赤金",
        facility: "manufacture",
      },
      { key: "power", count: 3, label: "发电站", facility: "power" },
    ],
  },
  {
    key: "333-orundum",
    layoutId: "333",
    label: "333（搓玉）",
    description: "合成玉",
    icon: "mdi-star-four-points-outline",
    tone: "red",
    compatibleShiftModes: ["twice", "threeTimes"],
    rooms: [
      {
        key: "lmd-trading",
        count: 2,
        label: "龙门币",
        facility: "trading",
      },
      {
        key: "orundum-trading",
        count: 1,
        label: "合成玉",
        facility: "trading",
      },
      {
        key: "gold-manufacture",
        count: 2,
        label: "赤金",
        facility: "manufacture",
      },
      {
        key: "orundum-manufacture",
        count: 1,
        label: "源石碎片",
        facility: "manufacture",
      },
      { key: "power", count: 3, label: "发电站", facility: "power" },
    ],
  },
  {
    key: "342",
    layoutId: "342",
    label: "342",
    description: "龙门币 / 赤金",
    icon: "mdi-cash-multiple",
    tone: "blue",
    compatibleShiftModes: ["twice", "threeTimes"],
    rooms: [
      {
        key: "lmd-trading",
        count: 3,
        label: "龙门币",
        facility: "trading",
      },
      {
        key: "gold-manufacture",
        count: 4,
        label: "赤金",
        facility: "manufacture",
      },
      { key: "power", count: 2, label: "发电站", facility: "power" },
    ],
  },
  {
    key: "342-orundum",
    layoutId: "342",
    label: "342（搓玉）",
    description: "合成玉",
    icon: "mdi-star-four-points-outline",
    tone: "red",
    compatibleShiftModes: ["twice", "threeTimes"],
    rooms: [
      {
        key: "lmd-trading",
        count: 2,
        label: "龙门币",
        facility: "trading",
      },
      {
        key: "orundum-trading",
        count: 1,
        label: "合成玉",
        facility: "trading",
      },
      {
        key: "orundum-manufacture",
        count: 1,
        label: "源石碎片",
        facility: "manufacture",
      },
      {
        key: "experience-manufacture",
        count: 1,
        label: "经验书",
        facility: "manufacture",
      },
      {
        key: "gold-manufacture",
        count: 2,
        label: "赤金",
        facility: "manufacture",
      },
      { key: "power", count: 2, label: "发电站", facility: "power" },
    ],
  },
];
export const LAYOUT_SHIFT_OPTIONS = [
  {
    value: "threeTimes",
    label: "一天三换",
    icon: "mdi-clock-fast",
    tone: "orange",
  },
  {
    value: "twice",
    label: "一天两换",
    icon: "mdi-weather-sunset-up",
    tone: "blue",
  },
  {
    value: "once",
    label: "一天一换",
    icon: "mdi-calendar-clock",
    tone: "gray",
  },
];
export const DEFAULT_LAYOUT_SELECTION = Object.freeze({
  cardKey: "243",
  layoutId: "243",
  shiftMode: "twice",
});

export function isLayoutCardCompatible(card, shiftMode) {
  return Boolean(
    card &&
      (!shiftMode || card.compatibleShiftModes.includes(shiftMode)),
  );
}

export function getLayoutRoomFacility(room) {
  if (room.facility) {
    return room.facility;
  }

  if (room.key === "lmd-trading") {
    return "trading";
  }

  if (room.key === "power") {
    return "power";
  }

  return "manufacture";
}

export function getLayoutFacilitySummary(card) {
  return [
    ["trading", "贸易站"],
    ["manufacture", "制造站"],
    ["power", "发电站"],
  ]
    .map(([facility, label]) => {
      const count = (card?.rooms || []).reduce(
        (total, room) =>
          getLayoutRoomFacility(room) === facility
            ? total + Number(room?.count || 0)
            : total,
        0,
      );

      return count > 0 ? `${count}${label}` : "";
    })
    .filter(Boolean)
    .join(" · ");
}
