<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import OperatorAvatar from "/src/components/sprite/OperatorAvatar.vue";
import { operatorTableV2 } from "/src/utils/gameData.js";
import operatorDataAPI from "/src/api/user-center/operatorData.js";
import operatorProgressionStatisticsDataCache from "/src/plugins/indexedDB/operatorProgressionStatisticsData.js";
import RECRUITMENT_CONFIG from "/src/static/json/tools/48-12-1.json";
import COMBAT_DESCRIPTIONS from "/src/static/json/tools/48-12-1-combat-descriptions.json";
import COMBAT_DATA from "/src/static/json/combat/operator-tags.json";
import BUILDING_TABLE from "/src/static/json/build/building_table.json";
import BUILDING_SCORES from "/src/static/json/build/logistics_efficiency_scores/auto.json";

const SCORE_MAP = RECRUITMENT_CONFIG.scoreMap;
const DIMENSION_OPTIONS = [
  { label: "作战优先", value: "combat" },
  { label: "通用", value: "general" },
  { label: "基建优先", value: "base" },
];
const UNOWNED_BONUS_OPTIONS = [
  { label: "0分", value: 0 },
  { label: "5分", value: 5 },
  { label: "99分", value: 99 },
];
const DIMENSION_WEIGHTS = {
  combat: { combat: 0.85, base: 0.15 },
  general: { combat: 0.5, base: 0.5 },
  base: { combat: 0.15, base: 0.85 },
};
const ACCOUNT_SCORING = {
  potentialStep: 0.1,
};
const TOTAL_GRADE_THRESHOLDS = {
  S: (SCORE_MAP.S + SCORE_MAP.A) / 2,
  A: (SCORE_MAP.A + SCORE_MAP.B) / 2,
  B: (SCORE_MAP.B + SCORE_MAP.C) / 2,
};
const GRADE_ORDER = ["X", "S", "A", "B", "C"];
const gradeScaleText = computed(() => {
  const grades = GRADE_ORDER.filter((grade) => Number.isFinite(SCORE_MAP[grade]));
  const thresholds = [TOTAL_GRADE_THRESHOLDS.S, TOTAL_GRADE_THRESHOLDS.A, TOTAL_GRADE_THRESHOLDS.B]
    .map((value) => Number(value.toFixed(2)))
    .join("/");
  return `${grades.join("/")} 对应 ${grades.map((grade) => SCORE_MAP[grade]).join("/")} 分；总分评级按 ${thresholds} 分作为档位分界`;
});
const ROOM_LABELS = {
  trading: "贸易站",
  manufacture: "制造站",
  hire: "人力办公室",
  workshop: "加工站",
  dormitory: "宿舍",
  control: "控制中枢",
  power: "发电站",
  meeting: "会客室",
  training: "训练室",
  recycle: "回收站",
};
const BUILDING_SUBJECTIVE_DESCRIPTIONS = Object.freeze({
  能天使: "精2后与蕾缪安Ⅱ搭配有双人80%贸易",
  推进之王: "无需练度与摩根Ⅱ+中枢戴菲恩Ⅱ搭配双人95%贸易（摩根和戴菲恩均为主线赠送干员）",
  伊芙利特: "娜斯提Ⅱ、缪尔赛思Ⅱ挂件",
  闪灵: "精2后是除冰酿Ⅱ外最高单回宿管，但是通常情况下宿管作用不大",
  艾雅法拉: "无需练度是35%源石碎片特化之一（褐果外最高源石碎片特化），精2后是第二档办公室效率（第一档为斥罪和凯尔希·思衡托）",
  塞雷娅: "较低的会客室效率，但可以在不损失大量会客室效率的同时作为娜斯提Ⅱ、缪尔赛思Ⅱ挂件，节约宿舍位",
  斯卡蒂: "歌蕾蒂娅组件之一，在深海猎人齐全且定闹钟或使用工具换班是有较高效率",
  陈: "精2后是第二档会客室效率",
  银灰: "精2后有较高订单上限，与孑+中枢灵知Ⅱ搭配有很高订单上限和较高效率，可用于搓玉防爆仓",
  夜莺: "精2后是第二档群回宿管，但是通常情况下宿管作用不大",
  刻俄柏: "精2后是红云组最高效率干员之一（稀音Ⅱ更高，与帕拉斯Ⅱ效率接近）",
  风笛: "精2后最高芯片特化",
  铃兰: "精2后与忍冬Ⅱ搭配有第二档会客室效率（忍冬Ⅱ不需要精2铃兰才能触发技能，但是精英化等级也会提供会客室效率）",
  麦哲伦: "娜斯提Ⅱ、缪尔赛思Ⅱ挂件",
  温蒂: "自动化组核心（最高制造组合）",
  煌: "凯尔希·思衡托Ⅱ挂件，精1后最高基建材料特化",
  赫拉格: "无需练度最高技能书特化",
  凯尔希: "精2后与Mon3trⅡ等干员同类技能，可用于中枢补位（斩业星熊Ⅱ下位）",
  泥岩: "精2后源岩类最高特化（还是低于年等干员）",
  空弦: "精2后是3发电站布局40%贸易",
  帕拉斯: "精2后是红云组最高经验特化之一（稀音Ⅱ更高，与刻俄柏Ⅱ效率接近）",
  森蚺: "精2后自动化组核心之一（最高制造组合），备注：0心情Lancet-2既可以触发森蚺Ⅱ技能也不影响承曦格雷伊Ⅱ技能，二者可叠加",
  瑕光: "唯一的精英材料免费加工，精2后合成绿/蓝材料时收益尚可，合成紫/金材料时不如年等干员",
  艾丽妮: "精2后专精幻神，与精2逻各斯技能相同",
  黑键: "感知信息组核心之一，精2和精0提供的感知信息点数相同，精2后提高贸易效率，组合效率较高，但需要组件很多",
  菲亚梅塔: "无需练度帮但书、可露希尔等高效率干员永续工作",
  澄闪: "精2后是承曦格雷伊、缪尔赛思Ⅱ之下最高发电效率之一",
  琴柳: "无需练度是闪灵之下最强单回宿管，精2后可以补充感知信息组絮雨或人间烟火组桑葚的办公室效率",
  老鲤: "精2后最高中枢会客室效率，但会客室效率收益很低作用不大",
  多萝西: "精2后莱茵科技组核心之一，与淬羽赫默Ⅱ搭配双人65%制造，也可提高娜斯提Ⅱ效率",
  远牙: "精2后红松林组成员之一（最高经验特化组合）",
  灵知: "与贸易站孑+银灰Ⅱ搭配有很高订单上限和较高贸易效率，可用于搓玉防爆仓",
  号角: "精2后最高炽合金块特化",
  焰尾: "精2后红松林组核心之一（最高经验特化组合）",
  水月: "标准化组核心，但组合效率较低",
});
const BUILDING_GRADE_OVERRIDES = Object.freeze({
  能天使: "S",
  推进之王: "S",
  伊芙利特: "B",
  闪灵: "B",
  艾雅法拉: "A",
  塞雷娅: "B",
  斯卡蒂: "B",
  陈: "A",
  银灰: "A",
  夜莺: "B",
  刻俄柏: "S",
  风笛: "A",
  铃兰: "A",
  麦哲伦: "B",
  温蒂: "S",
  煌: "A",
  赫拉格: "A",
  凯尔希: "B",
  泥岩: "A",
  空弦: "A",
  帕拉斯: "A",
  森蚺: "S",
  瑕光: "A",
  艾丽妮: "A",
  黑键: "S",
  菲亚梅塔: "S",
  澄闪: "A",
  琴柳: "B",
  老鲤: "B",
  多萝西: "S",
  远牙: "A",
  灵知: "A",
  号角: "A",
  焰尾: "S",
  水月: "A",
});
const OPERATOR_ENGLISH_NAMES = Object.freeze({
  能天使: "Exusiai",
  推进之王: "Siege",
  伊芙利特: "Ifrit",
  艾雅法拉: "Eyjafjalla",
  安洁莉娜: "Angelina",
  闪灵: "Shining",
  夜莺: "Nightingale",
  星熊: "Hoshiguma",
  塞雷娅: "Saria",
  银灰: "SilverAsh",
  斯卡蒂: "Skadi",
  陈: "Ch'en",
  黑: "Schwarz",
  赫拉格: "Hellagur",
  麦哲伦: "Magallan",
  莫斯提马: "Mostima",
  煌: "Blaze",
  阿: "Aak",
  刻俄柏: "Ceobe",
  风笛: "Bagpipe",
  傀影: "Phantom",
  温蒂: "Weedy",
  早露: "Роса",
  铃兰: "Suzuran",
  棘刺: "Thorns",
  森蚺: "Eunectes",
  史尔特尔: "Surtr",
  瑕光: "Blemishine",
  泥岩: "Mudrock",
  山: "Mountain",
  空弦: "Archetto",
  嵯峨: "Saga",
  异客: "Passenger",
  凯尔希: "Kal'tsit",
  卡涅利安: "Carnelian",
  帕拉斯: "Pallas",
  水月: "Mizuki",
  琴柳: "Saileach",
  远牙: "Fartooth",
  焰尾: "Flametail",
  灵知: "Gnosis",
  老鲤: "Lee",
  澄闪: "Goldenglow",
  菲亚梅塔: "Fiammetta",
  号角: "Horn",
  艾丽妮: "Irene",
  黑键: "Ebenholz",
  多萝西: "Dorothy",
});
const OFFICIAL_ACTIVITY_URL = "https://ak.hypergryph.com/news/0787";
const HERO_RIBBON_THEMES = [
  { color: "#7d3b32", accent: "#ffd18b", ink: "#fff8ec", duration: "34s" },
  { color: "#914731", accent: "#ffe1a6", ink: "#fff8ec", duration: "28s" },
  { color: "#71362e", accent: "#ffc777", ink: "#fff8ec", duration: "32s" },
  { color: "#9a4c35", accent: "#ffe5b2", ink: "#fff8ec", duration: "26s" },
];

const dimension = ref("general");
const unownedBonus = ref(5);
const loading = ref(true);
const accountLoading = ref(false);
const statsLoading = ref(false);
const loadError = ref("");
const accountStatus = ref("public");
const accountOperators = ref(new Map());
const progressionStatistics = ref(new Map());
const sampleSize = ref(0);
const drawPreviewGroup = ref(null);
const isDrawing = ref(false);
const pageStage = ref("welcome");
const activeDetailGroupId = ref(RECRUITMENT_CONFIG.groups[0]?.id || "");
const operatorExpansionOverrides = ref(new Map());
const isDevMode = ref(new URLSearchParams(window.location.search).get("mode") === "dev");
let drawInterval = null;
let drawTimeout = null;

const hasLoginToken = computed(() => Boolean(localStorage.getItem("USER_TOKEN")));

const operatorByName = new Map(Object.values(operatorTableV2).map((operator) => [operator.name, operator]));

const heroRibbons = computed(() => RECRUITMENT_CONFIG.groups.map((group, index) => {
  const theme = HERO_RIBBON_THEMES[index % HERO_RIBBON_THEMES.length];
  return {
    ...group,
    direction: index % 2 === 1 ? "reverse" : "forward",
    style: {
      "--ribbon-color": theme.color,
      "--ribbon-accent": theme.accent,
      "--ribbon-ink": theme.ink,
      "--ribbon-duration": theme.duration,
    },
    operators: group.operators
      .map((configOperator) => {
        const operator = operatorByName.get(configOperator.name);
        if (!operator?.charId) {
          return null;
        }
        return {
          name: configOperator.name,
          charId: operator.charId,
          rarity: operator.rarity || 6,
        };
      })
      .filter(Boolean),
  };
}));

const operatorMetaByName = new Map((COMBAT_DATA.operators || []).map((operator) => [operator.name, operator]));

// 特限模组（集成战略 ISW / 生息演算 RA）在干员表里以 typeName1 区分
const LIMITED_EQUIP_TYPES = new Set(["ISW", "RA"]);
const hasLimitedEquipByName = new Map(
  Object.values(operatorTableV2).map((operator) => [operator.name, (operator.equip || []).some((equip) => LIMITED_EQUIP_TYPES.has(equip.typeName1))])
);

const combatTagsByName = buildCombatTagsByName();
const buildingSkillsByName = buildBuildingSkillsByName();

function buildCombatTagsByName() {
  const result = new Map();
  for (const tag of COMBAT_DATA.tags || []) {
    for (const member of tag.members || []) {
      if (!member.operator) {
        continue;
      }
      if (!result.has(member.operator)) {
        result.set(member.operator, { official: [], player: [] });
      }
      const list = result.get(member.operator)[tag.source === "player" ? "player" : "official"];
      if (!list.some((item) => item.id === tag.id)) {
        list.push({ id: tag.id, name: tag.name });
      }
    }
  }
  return result;
}

function buildBuildingSkillsByName() {
  const result = new Map();
  for (const skill of BUILDING_TABLE) {
    if (!result.has(skill.name)) {
      result.set(skill.name, []);
    }
    result.get(skill.name).push(skill);
  }
  return result;
}

function cleanHtml(value) {
  return String(value || "")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreForGrade(grade) {
  return SCORE_MAP[grade] || 0;
}

function gradeForTotalScore(score) {
  if (score >= TOTAL_GRADE_THRESHOLDS.S) return "S";
  if (score >= TOTAL_GRADE_THRESHOLDS.A) return "A";
  if (score >= TOTAL_GRADE_THRESHOLDS.B) return "B";
  return "C";
}

function getBuildingSkillScore(skill) {
  const key = [skill.name, skill.roomType, skill.buffName, skill.phase, skill.level].join("|");
  return Number(BUILDING_SCORES[key] ?? 100);
}

function getPublicStats(name) {
  const operator = operatorByName.get(name);
  return operator ? progressionStatistics.value.get(operator.charId) || null : null;
}

function getAccountOperator(name) {
  const operator = operatorByName.get(name);
  if (!operator || accountStatus.value !== "loaded") {
    return null;
  }
  return accountOperators.value.get(operator.charId) || null;
}

function getAccountLabel(name) {
  if (accountStatus.value === "public") {
    return "未登录，按未持有";
  }
  if (accountStatus.value === "loading") {
    return "账号读取中";
  }
  if (accountStatus.value === "error") {
    return "账号读取失败，按未持有";
  }
  return getAccountOperator(name) ? "已持有" : "未持有";
}

function getAccountBonus(name) {
  if (accountStatus.value !== "loaded") {
    return 0;
  }

  const accountOperator = getAccountOperator(name);
  if (!accountOperator) {
    return unownedBonus.value;
  }

  const potential = Math.max(1, Math.min(6, Number(accountOperator.potential) || 1));
  const remainingPotential = Math.max(0, 6 - potential);
  return remainingPotential * ACCOUNT_SCORING.potentialStep;
}

function getOperatorView(configOperator) {
  const operator = operatorByName.get(configOperator.name) || {};
  const combatScore = scoreForGrade(configOperator.combatGrade);
  const buildingSubjectiveDescription = BUILDING_SUBJECTIVE_DESCRIPTIONS[configOperator.name] || "";
  const baseGrade = BUILDING_GRADE_OVERRIDES[configOperator.name] || "C";
  const baseScore = scoreForGrade(baseGrade);
  const weights = DIMENSION_WEIGHTS[dimension.value];
  const dimensionScore = combatScore * weights.combat + baseScore * weights.base;
  const accountBonus = getAccountBonus(configOperator.name);
  const tags = combatTagsByName.get(configOperator.name) || { official: [], player: [] };
  const buildingSkills = [...(buildingSkillsByName.get(configOperator.name) || [])]
    .sort((a, b) => getBuildingSkillScore(b) - getBuildingSkillScore(a))
    .slice(0, 2)
    .map((skill) => ({
      room: ROOM_LABELS[skill.roomType] || skill.roomType,
      description: cleanHtml(skill.description),
    }));
  const stats = getPublicStats(configOperator.name);
  const prtsUrl = operatorMetaByName.get(configOperator.name)?.prtsUrl || "";
  const finalScore = dimensionScore + accountBonus;
  const hasLimitedEquip = hasLimitedEquipByName.get(configOperator.name) === true;

  return {
    ...configOperator,
    charId: operator.charId,
    rarity: operator.rarity || 6,
    profession: operator.profession,
    appellation: OPERATOR_ENGLISH_NAMES[configOperator.name] || "",
    baseGrade,
    combatScore,
    baseScore,
    dimensionScore,
    accountBonus,
    finalScore,
    finalGrade: gradeForTotalScore(finalScore),
    accountLabel: getAccountLabel(configOperator.name),
    accountOperator: getAccountOperator(configOperator.name),
    combatDescriptions: buildCombatDescriptions(configOperator.name, tags),
    prtsUrl,
    hasLimitedEquip,
    gradeNote: buildGradeNote(configOperator.combatGrade, hasLimitedEquip),
    buildingSkills,
    buildingSubjectiveDescription,
    stats,
  };
}

function isOwnedOperator(operator) {
  return accountStatus.value === "loaded" && Boolean(operator.accountOperator);
}

function isOperatorExpanded(operator) {
  const operatorKey = operator.charId || operator.name;
  const override = operatorExpansionOverrides.value.get(operatorKey);
  return override === undefined ? !isOwnedOperator(operator) : override;
}

function toggleOperatorExpanded(operator) {
  const operatorKey = operator.charId || operator.name;
  const next = new Map(operatorExpansionOverrides.value);
  next.set(operatorKey, !isOperatorExpanded(operator));
  operatorExpansionOverrides.value = next;
}

function buildCombatDescriptions(name, tags) {
  const descriptionMap = COMBAT_DESCRIPTIONS.descriptions[name] || {};
  const playerTagNames = tags.player.map((tag) => tag.name);
  const entries = playerTagNames.map((tagName) => ({
    name: tagName,
    description: descriptionMap[tagName] || "",
  }));
  // 没有玩家标签的干员可直接在描述文件里补条目，按补充项追加显示
  for (const [tagName, description] of Object.entries(descriptionMap)) {
    if (!playerTagNames.includes(tagName)) {
      entries.push({ name: tagName, description });
    }
  }
  return entries;
}

// 作战评分脚的说明：有特限模组 → 提示该评分可借特限模组达成；无特限模组且为 S/X → 提示是纯常规模组打出的成绩
const TOP_COMBAT_GRADES = new Set(["X", "S"]);

function buildGradeNote(combatGrade, hasLimitedEquip) {
  if (hasLimitedEquip) {
    return {
      tone: "is-limited",
      text: "考虑特限模组达到此评分",
      title: "该干员拥有集成战略 / 生息演算特限模组，该评分需考虑特限模组才能达成",
    };
  }
  if (!TOP_COMBAT_GRADES.has(combatGrade)) {
    return null;
  }
  return {
    tone: combatGrade === "X" ? "is-x-without-limited" : "",
    text: "无特限模组达到此评分",
    title: "该干员没有集成战略 / 生息演算特限模组，该评分由常规模组达成",
  };
}

const groupResults = computed(() => {
  const results = RECRUITMENT_CONFIG.groups.map((group) => {
    const operators = group.operators.map(getOperatorView);
    const scores = operators.map((operator) => operator.finalScore);
    const expected = average(scores);
    const variance = average(scores.map((score) => (score - expected) ** 2));
    const accountStatsAvailable = accountStatus.value === "loaded";
    const ownedCount = accountStatsAvailable
      ? operators.filter((operator) => Boolean(operator.accountOperator)).length
      : null;
    const potentialUpgradeCount = accountStatsAvailable
      ? operators.filter((operator) => Number(operator.accountOperator?.potential) < 6).length
      : null;
    const potentialTotal = accountStatsAvailable
      ? operators.reduce((total, operator) => {
          if (!operator.accountOperator) {
            return total;
          }
          const potential = Math.max(1, Math.min(6, Number(operator.accountOperator.potential) || 1));
          return total + potential;
        }, 0)
      : null;
    return {
      ...group,
      operators,
      expected,
      standardDeviation: Math.sqrt(variance),
      minScore: Math.min(...scores),
      maxScore: Math.max(...scores),
      accountStatsAvailable,
      ownedCount,
      potentialUpgradeCount,
      potentialTotal,
    };
  });

  const ranking = [...results].sort((a, b) => b.expected - a.expected);
  const rankById = new Map(ranking.map((group, index) => [group.id, index + 1]));
  return results.map((group) => ({
    ...group,
    rank: rankById.get(group.id),
  }));
});

const drawReady = computed(() => !loading.value && !accountLoading.value && !statsLoading.value && groupResults.value.length > 0);

const accountCompletion = computed(() => {
  const operators = groupResults.value.flatMap((group) => group.operators);
  if (accountStatus.value !== "loaded" || !operators.length) {
    return { allOwned: false, allMax: false };
  }

  const allOwned = operators.every((operator) => Boolean(operator.accountOperator));
  const allMax = allOwned && operators.every((operator) => Number(operator.accountOperator?.potential) >= 6);
  return { allOwned, allMax };
});

const decisionGroups = computed(() => {
  const groups = groupResults.value.map((group) => {
    const potentialUpgradeCount = group.operators.filter(
      (operator) => Number(operator.accountOperator?.potential) < 6
    ).length;
    const unownedOperators = group.operators.filter((operator) => !operator.accountOperator);
    const previewCount = unownedOperators.length > 4 ? 3 : unownedOperators.length;
    return {
      ...group,
      potentialUpgradeCount,
      potentialUpgradeProbability: potentialUpgradeCount / Math.max(group.operators.length, 1),
      unownedOperators,
      unownedPreview: unownedOperators.slice(0, previewCount),
      unownedOverflow: Math.max(0, unownedOperators.length - previewCount),
    };
  });

  const usePotentialRanking = accountCompletion.value.allOwned && !accountCompletion.value.allMax;
  const ranking = [...groups].sort((a, b) => {
    if (usePotentialRanking) {
      return b.potentialUpgradeProbability - a.potentialUpgradeProbability || b.expected - a.expected;
    }
    return b.expected - a.expected;
  });
  const rankById = new Map(ranking.map((group, index) => [group.id, index + 1]));

  return groups.map((group) => ({
    ...group,
    decisionRank: rankById.get(group.id),
  })).sort((a, b) => a.decisionRank - b.decisionRank);
});

const decisionBestGroup = computed(() => decisionGroups.value[0] || null);

const decisionScoreMax = computed(() => Math.max(...decisionGroups.value.map((group) => Number(group.expected) || 0), 1));

function average(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function formatScore(value) {
  return Number(value || 0).toFixed(2);
}

function formatPercent(value) {
  const number = Number(value);
  return Number.isFinite(number) ? `${number.toFixed(1)}%` : "暂无";
}

function formatStatPercent(value) {
  const number = Number(value);
  return Number.isFinite(number) ? `${number.toFixed(1)}%` : "-";
}

function getDecisionScoreWidth(group) {
  const score = Number(group.expected) || 0;
  return `${Math.max(0, Math.min(100, (score / decisionScoreMax.value) * 100))}%`;
}

function clearDrawTimers() {
  if (drawInterval) {
    clearInterval(drawInterval);
    drawInterval = null;
  }
  if (drawTimeout) {
    clearTimeout(drawTimeout);
    drawTimeout = null;
  }
}

function drawGroup() {
  if (!drawReady.value || isDrawing.value) return;

  clearDrawTimers();
  pageStage.value = "result";
  isDrawing.value = true;

  const groups = decisionGroups.value;
  let previewIndex = 0;
  drawPreviewGroup.value = groups[previewIndex];
  drawInterval = setInterval(() => {
    previewIndex = (previewIndex + 1) % groups.length;
    drawPreviewGroup.value = groups[previewIndex];
  }, 110);

  drawTimeout = setTimeout(() => {
    clearDrawTimers();
    drawPreviewGroup.value = decisionBestGroup.value;
    isDrawing.value = false;
  }, 1200);
}

function getMasteryRate(stats) {
  if (!stats) return null;
  const values = [stats.skill1Rank3, stats.skill2Rank3, stats.skill3Rank3]
    .map(Number)
    .filter(Number.isFinite);
  return values.length ? Math.max(...values) : null;
}

function getModuleRate(stats) {
  if (!stats) return null;
  const values = [stats.modXRank3, stats.modYRank3, stats.modDRank3, stats.modARank3, stats.modBRank3]
    .map(Number)
    .filter(Number.isFinite);
  return values.length ? Math.max(...values) : null;
}

async function loadPublicStatistics() {
  statsLoading.value = true;
  try {
    const response = await operatorProgressionStatisticsDataCache.getData();
    const list = response?.result || [];
    progressionStatistics.value = new Map(list.map((item) => [item.charId, item]));
    sampleSize.value = Number(list[0]?.sampleSize) || 0;
  } catch (error) {
    console.error("load operator progression statistics failed", error);
    loadError.value = "干员大数据暂时加载失败，其他评分仍可使用。";
  } finally {
    statsLoading.value = false;
  }
}

async function loadAccountOperators() {
  if (!hasLoginToken.value) {
    accountStatus.value = "public";
    return;
  }

  accountLoading.value = true;
  accountStatus.value = "loading";
  try {
    const response = await operatorDataAPI.getOperatorData();
    accountOperators.value = new Map((response?.data || []).map((item) => [item.charId, item]));
    accountStatus.value = "loaded";
  } catch (error) {
    console.error("load account operator data failed", error);
    accountStatus.value = "error";
    loadError.value = "账号干员数据读取失败，已退回公开数据模式。";
  } finally {
    accountLoading.value = false;
  }
}

async function loadPage() {
  loading.value = true;
  await Promise.all([loadPublicStatistics(), loadAccountOperators()]);
  loading.value = false;
}

watch([dimension, unownedBonus, accountStatus], () => {
  clearDrawTimers();
  isDrawing.value = false;
  drawPreviewGroup.value = null;
});

watch(accountStatus, () => {
  operatorExpansionOverrides.value = new Map();
});

onBeforeUnmount(() => {
  clearDrawTimers();
  document.documentElement.classList.remove("page-48-12-1-active");
});
onMounted(() => {
  document.documentElement.classList.add("page-48-12-1-active");
  loadPage();
});
</script>

<template>
  <main class="page-48-12-1">
    <section v-if="pageStage === 'welcome'" class="hero-panel" aria-labelledby="page-48-12-1-title">
      <div class="hero-ribbons" aria-hidden="true">
        <div
          v-for="ribbon in heroRibbons"
          :key="ribbon.id"
          class="hero-ribbon"
          :style="ribbon.style"
        >
          <div class="hero-ribbon-label">{{ ribbon.id }}</div>
          <div class="hero-ribbon-viewport">
            <div class="hero-ribbon-track" :class="{ 'is-reverse': ribbon.direction === 'reverse' }">
              <div v-for="copy in 2" :key="copy" class="hero-ribbon-copy">
                <div v-for="operator in ribbon.operators" :key="`${copy}-${operator.charId}`" class="hero-ribbon-operator">
                  <OperatorAvatar :char-id="operator.charId" :rarity="operator.rarity" :size="88" :mobile-size="64" :border="true" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="hero-action-fade" aria-hidden="true"></div>
      <div class="hero-tint" aria-hidden="true"></div>
      <div class="hero-copy">
        <h1 id="page-48-12-1-title">特别招募怎么选？</h1>
        <div class="hero-actions">
          <v-btn class="draw-button" size="x-large" variant="flat" :loading="isDrawing" :disabled="!drawReady" @click="drawGroup">
            帮我决定！
          </v-btn>
        </div>
        <div class="hero-secondary-actions">
          <v-btn
            class="hero-secondary-button"
            variant="outlined"
            prepend-icon="mdi-bullhorn-outline"
            :href="OFFICIAL_ACTIVITY_URL"
            target="_blank"
            rel="noopener noreferrer"
          >
            查看官网活动说明
          </v-btn>
          <template v-if="hasLoginToken">
            <div class="hero-account-status" :class="{ 'is-ready': accountStatus === 'loaded' }">
              <v-icon size="18">
                {{ accountStatus === "loaded" ? "mdi-account-check" : accountStatus === "loading" ? "mdi-loading" : "mdi-alert-circle-outline" }}
              </v-icon>
              <span>{{ accountStatus === "loaded" ? "已载入干员数据" : accountStatus === "loading" ? "正在载入干员数据" : "干员数据读取失败" }}</span>
            </div>
          </template>
          <v-btn
            v-else
            class="hero-secondary-button"
            variant="outlined"
            prepend-icon="mdi-database-import-outline"
            to="/survey/account/importbyskland"
          >
            前往同步干员数据
          </v-btn>
        </div>
      </div>
    </section>

    <section
      v-else-if="pageStage === 'result'"
      class="result-page"
      :class="{ 'is-drawing': isDrawing, 'has-inline-detail': !isDrawing }"
      aria-label="推荐结果"
    >
      <div v-if="isDrawing" class="result-page-loading" aria-live="polite">
        <strong>队列·{{ drawPreviewGroup?.id || "·" }}</strong>
      </div>

      <template v-else>
        <div class="result-modules">
          <section class="result-score-module" aria-label="各组评分">
            <div class="result-score-grid">
              <article
                v-for="group in decisionGroups"
                :key="group.id"
                class="result-score-row"
                :class="{ 'is-best': !accountCompletion.allMax && group.decisionRank === 1 }"
              >
                <div class="result-score-track" :style="{ '--score-width': getDecisionScoreWidth(group) }">
                  <div class="result-score-bar-content">
                    <div class="result-score-row-label">
                      <strong>队列·{{ group.id }}</strong>
                      <span v-if="!accountCompletion.allMax && group.decisionRank === 1">推荐</span>
                      <div v-if="group.unownedPreview.length" class="result-score-row-unowned">
                        <span
                          v-for="operator in group.unownedPreview"
                          :key="operator.charId"
                          class="result-score-row-avatar"
                          :title="operator.name"
                          :aria-label="operator.name"
                        >
                          <OperatorAvatar :char-id="operator.charId" :rarity="operator.rarity" :size="26" :mobile-size="20" :border="true" />
                        </span>
                        <span v-if="group.unownedOverflow" class="result-score-row-unowned-more">
                          以及另外{{ group.unownedOverflow }}个干员
                        </span>
                      </div>
                    </div>
                    <div class="result-score-row-value">
                      <strong>{{ formatScore(group.expected) }}</strong>
                      <span v-if="accountCompletion.allOwned && !accountCompletion.allMax">
                        提升 {{ formatPercent(group.potentialUpgradeProbability * 100) }}
                      </span>
                    </div>
                  </div>
                </div>
              </article>
            </div>

            <div v-if="accountCompletion.allMax" class="result-recommendation-line is-neutral">
              您已满潜所有干员，请关闭本页面并随便抽一个
            </div>
            <div v-else-if="accountCompletion.allOwned" class="result-recommendation-line is-owned">
              您已拥有所有干员
            </div>

          </section>

          <section class="result-settings-module" aria-label="评分参数">
            <div class="result-score-settings-panel">
              <div class="result-score-settings-dimension">
                <span class="result-score-settings-label">评价维度</span>
                <v-btn-toggle class="dimension-toggle result-settings-toggle" v-model="dimension" mandatory divided density="comfortable">
                  <v-btn v-for="option in DIMENSION_OPTIONS" :key="option.value" :value="option.value">
                    {{ option.label }}
                  </v-btn>
                </v-btn-toggle>
              </div>
              <div class="result-score-settings-dimension">
                <span class="result-score-settings-label">
                  未持有加分
                  <router-link
                    v-if="accountStatus !== 'loaded'"
                    class="result-score-settings-sync"
                    to="/survey/account/importbyskland"
                  >
                    尚未同步干员，点击前往同步
                  </router-link>
                </span>
                <v-btn-toggle
                  class="dimension-toggle result-settings-toggle"
                  v-model="unownedBonus"
                  mandatory
                  divided
                  density="comfortable"
                  :disabled="accountStatus !== 'loaded'"
                >
                  <v-btn
                    v-for="option in UNOWNED_BONUS_OPTIONS"
                    :key="option.value"
                    :value="option.value"
                    :disabled="accountStatus !== 'loaded'"
                  >
                    {{ option.label }}
                  </v-btn>
                </v-btn-toggle>
              </div>
            </div>
          </section>
        </div>

      </template>
    </section>

    <section
      v-if="pageStage === 'detail' || (pageStage === 'result' && !isDrawing)"
      class="detail-page"
      :class="{ 'is-inline-result': pageStage === 'result' }"
      aria-label="队列详情"
    >
      <nav class="detail-tabs" aria-label="选择详情队列">
        <button
          v-for="group in groupResults"
          :key="group.id"
          type="button"
          class="detail-tab"
          :class="{ 'is-active': group.id === activeDetailGroupId }"
          :aria-label="`队列·${group.id}`"
          @click="activeDetailGroupId = group.id"
        >
          <span>{{ group.id }}</span>
        </button>
      </nav>

    <template v-if="!loading">
      <section class="group-list" aria-label="干员详情">
        <article
          v-for="group in groupResults"
          :key="group.id"
          class="group-section"
          :class="{ 'is-active': group.id === activeDetailGroupId }"
        >
          <header class="group-header">
            <div class="group-header-main">
              <h2>{{ group.id }}</h2>
              <div class="group-header-stats">
                <div class="group-header-stat">
                  <span>未持有</span>
                  <strong>{{ group.accountStatsAvailable ? group.operators.length - group.ownedCount + "/" + group.operators.length : "-" }}</strong>
                </div>
                <div class="group-header-stat">
                  <span>已持有未满潜</span>
                  <strong>{{ group.accountStatsAvailable ? group.potentialUpgradeCount + "/" + group.operators.length : "-" }}</strong>
                </div>
                <div class="group-header-stat">
                  <span>总潜能数</span>
                  <strong>{{ group.accountStatsAvailable ? group.potentialTotal + "/" + group.operators.length * 6 : "-" }}</strong>
                </div>
                <div class="group-header-stat">
                  <span>风险评分</span>
                  <strong>{{ formatScore(group.standardDeviation) }}</strong>
                </div>
              </div>
              <div class="group-header-score">
                <span>队列评分</span>
                <strong>{{ formatScore(group.expected) }}</strong>
              </div>
            </div>
          </header>

          <div class="operator-grid">

            <article
              v-for="operator in group.operators"
              :key="operator.charId"
              class="operator-item"
              :class="{ 'is-expanded': isOperatorExpanded(operator) }"
            >
            <div
              class="operator-main"
              role="button"
              tabindex="0"
              :aria-expanded="isOperatorExpanded(operator)"
              :aria-label="isOperatorExpanded(operator) ? `收起${operator.name}详细信息` : `展开${operator.name}详细信息`"
              @click="toggleOperatorExpanded(operator)"
              @keydown.enter.prevent.self="toggleOperatorExpanded(operator)"
              @keydown.space.prevent.self="toggleOperatorExpanded(operator)"
            >
              <OperatorAvatar :char-id="operator.charId" :rarity="operator.rarity" :size="58" :mobile-size="46" :border="true" />
              <div class="operator-title">
                <div class="operator-name-row">
                  <strong>{{ operator.name }}</strong>
                </div>
                <small v-if="operator.appellation" class="operator-english-name">{{ operator.appellation }}</small>
              </div>
              <div class="operator-total-score">
                <strong class="grade-badge" :class="`grade-${operator.finalGrade.toLowerCase()}`">{{ operator.finalGrade }}</strong>
              </div>
              <span
                class="operator-toggle"
                aria-hidden="true"
              >
                <v-icon size="18">{{ isOperatorExpanded(operator) ? "mdi-chevron-up" : "mdi-chevron-down" }}</v-icon>
              </span>
            </div>

            <div v-if="isOperatorExpanded(operator)" class="operator-details">
              <div class="operator-info-row">
                <div class="operator-info-heading operator-rating-line is-combat">
                  <span>作战评分</span>
                  <b class="grade-badge" :class="`grade-${operator.combatGrade.toLowerCase()}`">{{ operator.combatGrade }}</b>
                  <span
                    v-if="operator.gradeNote"
                    class="operator-grade-note"
                    :class="operator.gradeNote.tone"
                    :title="operator.gradeNote.title"
                  >{{ operator.gradeNote.text }}</span>
                </div>
                <span v-if="operator.combatDescriptions.length" class="info-value">
                  <span v-for="entry in operator.combatDescriptions" :key="entry.name" class="combat-entry">
                    <b>{{ entry.name }}</b>
                    <template v-if="entry.description">：{{ entry.description }}</template>
                  </span>
                </span>
                <span v-else class="info-value info-value-empty">暂无作战描述</span>
              </div>
              <div class="operator-info-row">
                <div class="operator-info-heading operator-rating-line">
                  <span>基建评分</span>
                  <b class="grade-badge" :class="`grade-${operator.baseGrade.toLowerCase()}`">{{ operator.baseGrade }}</b>
                </div>
                <div v-if="operator.buildingSkills.length || operator.buildingSubjectiveDescription" class="info-value">
                  <span v-if="operator.buildingSkills.length">
                    {{ operator.buildingSkills.map((skill) => `${skill.room}：${skill.description}`).join("；") }}
                  </span>
                  <span v-if="operator.buildingSubjectiveDescription" class="operator-subjective-description">
                    {{ operator.buildingSubjectiveDescription }}
                  </span>
                </div>
                <span v-else class="info-value info-value-empty">暂无基建记录</span>
              </div>
              <div v-if="isDevMode" class="dev-score-breakdown">
                <span>作战分 {{ formatScore(operator.combatScore) }}</span>
                <span>基建分 {{ formatScore(operator.baseScore) }}</span>
                <span>维度分 {{ formatScore(operator.dimensionScore) }}</span>
                <span>通用加成 {{ formatScore(operator.accountBonus) }}</span>
                <strong>总分 {{ operator.finalGrade }}（{{ formatScore(operator.finalScore) }}）</strong>
              </div>
            </div>
            <div v-if="isOperatorExpanded(operator)" class="operator-card-footer">
              <div class="operator-stats">
                <span>持有率 {{ formatStatPercent(operator.stats?.ownRate) }}</span>
                <span>精二率 {{ formatStatPercent(operator.stats?.eliteRank2) }}</span>
                <span>专三率 {{ formatStatPercent(getMasteryRate(operator.stats)) }}</span>
                <span>模组率 {{ formatStatPercent(getModuleRate(operator.stats)) }}</span>
              </div>
              <a
                v-if="operator.prtsUrl"
                class="operator-prts-link"
                :href="operator.prtsUrl"
                target="_blank"
                rel="noopener noreferrer"
                :title="`在 PRTS 查看${operator.name}`"
                :aria-label="`在 PRTS 查看${operator.name}`"
              >
                <v-icon size="13">mdi-open-in-new</v-icon>
                <span>PRTS</span>
              </a>
            </div>
          </article>
        </div>
          </article>
        </section>
    </template>

    <section v-if="loading" class="loading-state">
      <v-progress-circular indeterminate color="primary" />
      <span>正在整理干员数据...</span>
    </section>

    <section class="method-note">
      <div>
        <strong>计算口径</strong>
        <span>{{ gradeScaleText }}；作战优先为作战 85% 与基建 15%，通用为各 50%，基建优先为作战 15% 与基建 85%；四组均按 1/12 等概率计算；作战评分旁的「考虑特限模组达到此评分」表示该评分需借助特限模组达成，「无特限模组达到此评分」表示该评分由常规模组达成；风险评分为该组 12 名干员最终总分的总体标准差，即先计算总分与队列评分（平均分）的偏差平方平均值，再开平方，数值越高表示抽取结果的分数差异越大。</span>
      </div>
      <div>
        <strong>账号收益</strong>
        <span>未同步干员数据时，所有干员均不计入账号通用加成；同步后，未持有干员按“未持有加分”选项增加 0、5 或 99 分，已持有干员按缺少的潜能数每个加 0.1 分。</span>
      </div>
      <div>
        <strong>统计说明</strong>
        <span>持有率、精二率、专三率和模组率仅作为干员背景信息展示，不参与推荐分。</span>
      </div>
    </section>

    <footer class="page-48-12-1-footer">
      <span>公开统计样本：{{ sampleSize ? `${sampleSize.toLocaleString()} 位玩家` : "加载中" }}</span>
      <span>当前账号收益参数为试算值，后续可根据实际结果调整。</span>
    </footer>
    </section>

  </main>
</template>

<style scoped>
:global(html.page-48-12-1-active),
:global(html.page-48-12-1-active body),
:global(html.page-48-12-1-active body #app),
:global(html.dark.page-48-12-1-active),
:global(html.dark.page-48-12-1-active body),
:global(html.dark.page-48-12-1-active body #app) {
  background-color: #f2e3cf;
}

.hero-panel {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  min-height: min(900px, max(760px, calc(100svh - 64px)));
  min-height: min(900px, max(760px, calc(100dvh - 64px)));
  margin: -24px clamp(-36px, -2.5vw, -12px) 0;
  overflow: hidden;
  padding: clamp(28px, 6vw, 64px) clamp(18px, 5vw, 72px) calc(clamp(28px, 6vw, 64px) + env(safe-area-inset-bottom, 0px));
  border-radius: 0;
  isolation: isolate;
  background: #4f2928;
  color: #fff;
}

.result-page,
.detail-page {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  margin: -24px clamp(-36px, -2.5vw, -12px) 0;
  padding: clamp(28px, 6vw, 64px) clamp(18px, 5vw, 72px) calc(clamp(28px, 6vw, 64px) + env(safe-area-inset-bottom, 0px));
  background: var(--page-bg, #f4f6f8);
  color: var(--text, #1f2937);
}

.result-page {
  min-height: 0;
  align-items: stretch;
  justify-content: flex-start;
  gap: 28px;
  text-align: left;
}

.result-modules {
  display: grid;
  width: min(100%, 1120px);
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin: 0 auto;
}

.result-score-module,
.result-settings-module {
  min-width: 0;
  padding: clamp(18px, 3vw, 28px);
  border: 1px solid var(--border, #dce1e8);
  border-radius: 6px;
  background: var(--surface, #fff);
  box-shadow: 0 2px 8px rgba(62, 42, 36, 0.08);
}

.detail-page-eyebrow,
.decision-eyebrow {
  display: block;
  color: #c66c1b;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.08em;
}

.result-score-grid {
  display: grid;
  gap: 8px;
}

.result-score-row {
  min-width: 0;
}

.result-score-track {
  position: relative;
  min-width: 0;
  min-height: 52px;
  width: max(var(--score-width), 68%);
  overflow: hidden;
  border: 1px solid rgba(201, 159, 99, 0.52);
  border-radius: 10px;
  background: #c66c1b;
  transition: width 180ms ease;
}

.result-score-row.is-best .result-score-track {
  border-color: #e0a62a;
  box-shadow: 0 0 0 2px rgba(224, 166, 42, 0.22);
}

.result-score-bar-content {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 52px;
  padding: 8px 12px;
  color: #2f2419;
}

.result-score-row-label {
  display: flex;
  align-items: center;
  gap: 7px;
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
}

.result-score-row-label strong {
  white-space: nowrap;
  font-size: 18px;
}

.result-score-row-label > span {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  padding: 2px 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
  color: #7c4218;
  font-size: 10px;
  font-weight: 800;
  white-space: nowrap;
}

.result-score-row-unowned {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
}

.result-score-row-avatar {
  display: inline-flex;
  flex: 0 0 auto;
  line-height: 0;
}

.result-score-row-unowned-more {
  min-width: 0;
  overflow: hidden;
  color: rgba(47, 36, 25, 0.72);
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.result-score-row.is-best .result-score-track {
  background: #e0a62a;
}

.result-score-row-value {
  display: flex;
  min-width: 86px;
  margin-left: auto;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  text-align: right;
  white-space: nowrap;
}

.result-score-row-value strong {
  color: inherit;
  font-size: 20px;
  line-height: 1;
}

.result-score-row-value span {
  color: rgba(47, 36, 25, 0.72);
  font-size: 10px;
}

.result-recommendation-line {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px 16px;
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
  color: var(--muted);
  font-size: 14px;
  font-weight: 700;
}

.result-recommendation-line strong {
  color: var(--text);
  font-size: clamp(24px, 4vw, 38px);
  font-weight: 900;
}

.result-recommendation-line.is-neutral {
  color: var(--text);
  font-size: clamp(18px, 2.5vw, 26px);
  line-height: 1.35;
}

.result-recommendation-line.is-owned {
  color: var(--text);
  font-size: 16px;
}

.result-score-settings-panel {
  display: flex;
  align-items: stretch;
  flex-direction: column;
  gap: 14px;
  margin-top: 8px;
}

.result-settings-module .result-score-settings-panel {
  margin-top: 0;
}

.result-score-settings-dimension {
  display: flex;
  align-items: stretch;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.result-score-settings-label {
  display: block;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.4;
}

.result-score-settings-sync {
  margin-left: 6px;
  color: #9a4c35;
  font-size: 11px;
  font-weight: 700;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.result-score-settings-sync:hover {
  color: #7d3b32;
}

.result-score-settings-panel .dimension-toggle {
  width: 100%;
  min-width: 0;
}

.result-settings-toggle {
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 5px;
  background: rgba(255, 249, 237, 0.72);
}

.result-settings-toggle :deep(.v-btn) {
  flex: 1 1 0;
  min-width: 0;
  min-height: 36px;
  border-radius: 0;
  color: var(--muted);
  background: transparent;
  font-weight: 700;
}

.result-settings-toggle :deep(.v-btn + .v-btn) {
  border-left: 1px solid var(--border);
}

.result-settings-toggle :deep(.v-btn.v-btn--active) {
  background: #7d3b32;
  color: #fff8ec;
}

.result-page-loading {
  display: flex;
  min-height: 240px;
  width: min(100%, 620px);
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px;
  border-left: 5px solid #e0a62a;
  background: var(--surface, #fff);
}

.result-page-loading strong {
  font-size: clamp(34px, 7vw, 64px);
}

.detail-page {
  min-height: 100%;
  gap: 16px;
}

.detail-page.is-inline-result {
  margin-top: 0;
}

@media (min-width: 761px) {
  .result-page.has-inline-detail {
    padding-bottom: 16px;
  }

  .detail-page.is-inline-result {
    padding-top: 0;
  }
}

.detail-tabs {
  display: none;
}

.detail-tab {
  min-width: 0;
  padding: 8px 6px;
  border: 1px solid var(--border, #dce1e8);
  border-radius: 4px;
  background: var(--surface, #fff);
  color: var(--muted, #6b7280);
  box-shadow: 0 2px 6px rgba(62, 42, 36, 0.1);
  cursor: pointer;
  font: inherit;
  font-size: 14px;
  font-weight: 800;
  line-height: 1.1;
}

.detail-tab.is-active {
  border-color: #2878c8;
  background: #2878c8;
  color: #fff;
}

.hero-ribbons {
  position: absolute;
  top: 13%;
  right: 0;
  left: 0;
  display: grid;
  height: 68%;
  grid-template-rows: repeat(4, minmax(0, 1fr));
  overflow: hidden;
  pointer-events: none;
}

.hero-ribbon {
  position: relative;
  min-width: 0;
  overflow: hidden;
  border-top: 1px solid rgba(255, 255, 255, 0.28);
  border-bottom: 1px solid rgba(0, 0, 0, 0.28);
  background: var(--ribbon-color);
}

.hero-ribbon::after {
  position: absolute;
  top: 0;
  right: -2%;
  bottom: 0;
  z-index: 2;
  width: 11%;
  background: rgba(55, 24, 21, 0.3);
  clip-path: polygon(45% 0, 100% 0, 55% 100%, 0 100%);
  content: "";
}

.hero-ribbon-label {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 3;
  display: flex;
  height: 24px;
  align-items: center;
  justify-content: center;
  background: rgba(57, 24, 21, 0.34);
  color: var(--ribbon-accent);
  font-size: 16px;
  font-style: italic;
  font-weight: 950;
  line-height: 1;
  letter-spacing: 0.08em;
}

.hero-ribbon-viewport {
  position: relative;
  z-index: 1;
  height: calc(100% - 24px);
  overflow: hidden;
}

.hero-ribbon-track {
  display: flex;
  width: max-content;
  height: 100%;
  animation: hero-ribbon-scroll var(--ribbon-duration) linear infinite;
  will-change: transform;
}

.hero-ribbon-track.is-reverse {
  animation-name: hero-ribbon-scroll-reverse;
}

.hero-ribbon-copy {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: clamp(6px, 1vw, 12px);
  padding: 0 clamp(6px, 1vw, 12px) 0 0;
}

.hero-ribbon-operator {
  position: relative;
  display: flex;
  width: clamp(72px, 8vw, 116px);
  height: 100%;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
}

.hero-ribbon-operator::before {
  position: absolute;
  top: 10%;
  bottom: 10%;
  left: 50%;
  width: 74%;
  background: rgba(255, 255, 255, 0.12);
  clip-path: polygon(22% 0, 100% 0, 78% 100%, 0 100%);
  content: "";
  transform: translateX(-50%);
}

.hero-ribbon-operator :deep(.operator-avatar) {
  position: relative;
  z-index: 1;
  filter: drop-shadow(0 8px 8px rgba(0, 0, 0, 0.28));
}

.hero-tint {
  position: absolute;
  inset: 0;
  z-index: 3;
  background: rgba(58, 25, 21, 0.12);
  pointer-events: none;
}

.hero-action-fade {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 4;
  height: 42%;
  background: linear-gradient(to top, rgba(54, 24, 22, 0.94), rgba(54, 24, 22, 0.64) 34%, rgba(54, 24, 22, 0));
  pointer-events: none;
}

.hero-copy {
  position: relative;
  z-index: 5;
  width: min(100%, 620px);
  margin-top: clamp(120px, 15vh, 210px);
  text-align: center;
}

.hero-panel h1 {
  margin: 0;
  color: #fff;
  font-size: clamp(48px, 6.5vw, 76px);
  font-weight: 900;
  line-height: 1.1;
  letter-spacing: 0;
  text-align: left;
  text-shadow: 0 3px 0 #11181a, 0 7px 18px rgba(0, 0, 0, 0.5);
  white-space: nowrap;
}

.hero-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: clamp(42px, 7vh, 72px);
}

.draw-button {
  width: min(100%, 330px);
  min-height: 70px;
  border: 1px solid #ff9aa6 !important;
  border-radius: 4px !important;
  background: #e52b46 !important;
  box-shadow: 0 10px 20px rgba(45, 5, 14, 0.3);
  color: #fff !important;
  font-size: 23px !important;
  font-weight: 800 !important;
}

.draw-button:hover {
  background: #f13b56 !important;
}

.hero-secondary-actions {
  display: grid;
  width: min(100%, 480px);
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin: 16px auto 0;
}

.hero-secondary-button {
  min-width: 0;
  min-height: 44px;
  border-color: rgba(255, 190, 111, 0.76) !important;
  border-radius: 4px !important;
  background: rgba(62, 29, 25, 0.52) !important;
  color: #fff4dc !important;
  font-size: 13px !important;
  font-weight: 700 !important;
}

.hero-secondary-button:hover {
  background: rgba(198, 91, 32, 0.72) !important;
}

.hero-account-status {
  display: flex;
  min-width: 0;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 10px;
  border: 1px solid rgba(255, 190, 111, 0.52);
  border-radius: 4px;
  background: rgba(62, 29, 25, 0.52);
  color: rgba(255, 244, 220, 0.84);
  font-size: 13px;
  font-weight: 700;
  line-height: 1.25;
  text-align: center;
}

.hero-account-status.is-ready {
  border-color: rgba(123, 224, 170, 0.58);
  color: #d8ffe8;
}

@keyframes hero-ribbon-scroll {
  0% {
    transform: translateX(0);
  }

  100% {
    transform: translateX(-50%);
  }
}

@keyframes hero-ribbon-scroll-reverse {
  0% {
    transform: translateX(-50%);
  }

  100% {
    transform: translateX(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .hero-ribbon-track {
    animation: none;
  }
}

.page-48-12-1 {
  --page-bg: #f2e3cf;
  --surface: #fff9ed;
  --surface-soft: #f8edda;
  --text: #3e2a24;
  --muted: #80685b;
  --border: #d9bc91;
  max-width: 1480px;
  min-height: 100%;
  margin: 0 auto;
  padding: 24px clamp(12px, 2.5vw, 36px) calc(48px + env(safe-area-inset-bottom, 0px));
  color: var(--text);
  background: var(--page-bg);
}

.page-48-12-1-header,
.method-note,
.group-header,
.page-48-12-1-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.page-48-12-1-header {
  align-items: flex-end;
  padding: 8px 0 24px;
}

.page-48-12-1-kicker {
  margin: 0 0 8px;
  color: #2878c8;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0;
}

h1,
h2,
p {
  margin-top: 0;
}

h1 {
  margin-bottom: 8px;
  font-size: clamp(26px, 4vw, 42px);
  line-height: 1.15;
}

.page-48-12-1-description {
  max-width: 760px;
  margin-bottom: 0;
  color: var(--muted);
  line-height: 1.7;
}

.page-48-12-1-header-meta {
  min-width: 190px;
  padding: 14px 16px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--surface);
}

.page-48-12-1-header-meta strong,
.page-48-12-1-header-meta span,
.page-48-12-1-header-meta small {
  display: block;
}

.page-48-12-1-header-meta strong {
  color: #2878c8;
  font-size: 12px;
}

.page-48-12-1-header-meta span {
  margin-top: 6px;
  font-weight: 700;
}

.page-48-12-1-header-meta small {
  margin-top: 4px;
  color: var(--muted);
  line-height: 1.5;
}

.method-note,
.summary-item,
.group-section,
.page-48-12-1-footer {
  border: 1px solid var(--border);
  background: var(--surface);
}

.toolbar-block {
  display: flex;
  align-items: center;
  gap: 12px;
}

.toolbar-label {
  color: var(--muted);
  font-size: 13px;
  white-space: nowrap;
}

.toolbar-account {
  gap: 8px;
}

.toolbar-note {
  color: var(--muted);
  font-size: 12px;
  white-space: nowrap;
}

.draw-result {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 20px;
  margin-top: 16px;
  padding: 22px 24px;
  border: 1px solid #e0a62a;
  border-radius: 8px;
  background: var(--surface);
  box-shadow: inset 4px 0 0 #e0a62a;
}

.draw-result.is-drawing {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 190px;
  background: #fff9e8;
  text-align: center;
}

.draw-state,
.result-heading {
  display: flex;
  flex-direction: column;
}

.draw-state {
  align-items: center;
  gap: 8px;
}

.draw-state strong {
  color: #a56d00;
  font-size: 28px;
}

.draw-state span:last-child,
.result-heading p,
.result-reason p {
  color: var(--muted);
  font-size: 13px;
  line-height: 1.6;
}

.result-eyebrow,
.result-label {
  color: #b77900;
  font-size: 12px;
  font-weight: 800;
}

.result-heading h2 {
  margin: 5px 0 0;
  font-size: clamp(24px, 4vw, 34px);
  line-height: 1.2;
}

.result-heading p {
  margin: 8px 0 0;
}

.result-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(82px, 1fr));
  gap: 8px;
  align-self: start;
  min-width: min(360px, 100%);
}

.result-metrics > div {
  min-width: 0;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 5px;
  background: var(--surface-soft);
  text-align: center;
}

.result-metrics strong,
.result-metrics span {
  display: block;
}

.result-metrics strong {
  color: #b77900;
  font-size: 20px;
}

.result-metrics span {
  margin-top: 3px;
  color: var(--muted);
  font-size: 11px;
}

.result-details,
.result-footer {
  grid-column: 1 / -1;
}

.result-details {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(220px, 0.9fr);
  gap: 20px;
  padding-top: 18px;
  border-top: 1px solid var(--border);
}

.result-operators {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-top: 10px;
}

.result-operator {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  grid-template-rows: auto auto;
  column-gap: 8px;
  align-items: center;
  min-width: 120px;
}

.result-operator :deep(.operator-avatar) {
  grid-row: 1 / span 2;
}

.result-operator span {
  font-size: 13px;
  font-weight: 700;
}

.result-operator small {
  color: var(--muted);
  font-size: 11px;
}

.result-reason {
  padding-left: 20px;
  border-left: 1px solid var(--border);
}

.result-reason p {
  margin: 8px 0 0;
}

.result-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-top: 14px;
  border-top: 1px solid var(--border);
  color: var(--muted);
  font-size: 12px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-top: 16px;
}

.summary-item {
  min-width: 0;
  padding: 16px;
  border-radius: 6px;
}

.summary-item.is-best {
  border-color: #2878c8;
  box-shadow: inset 3px 0 0 #2878c8;
}

.summary-topline,
.summary-details,
.operator-stats {
  display: flex;
  align-items: center;
  gap: 8px;
}

.summary-topline {
  justify-content: space-between;
  gap: 6px;
}

.summary-name {
  overflow: hidden;
  font-size: 14px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.summary-score {
  margin-top: 12px;
  color: #2878c8;
  font-size: 32px;
  font-weight: 800;
  line-height: 1;
}

.summary-caption,
.summary-details {
  color: var(--muted);
  font-size: 12px;
}

.summary-caption {
  margin-top: 7px;
}

.summary-probability {
  margin-top: 4px;
  color: #b77900;
  font-size: 12px;
  font-weight: 700;
}

.summary-details {
  flex-wrap: wrap;
  margin-top: 14px;
  line-height: 1.5;
}

.method-note {
  align-items: stretch;
  margin-top: 12px;
  padding: 12px 16px;
  border-radius: 6px;
}

.method-note > div {
  flex: 1;
  min-width: 0;
}

.method-note strong,
.method-note span {
  display: block;
}

.method-note strong {
  margin-bottom: 4px;
  font-size: 13px;
}

.method-note span {
  color: var(--muted);
  font-size: 12px;
  line-height: 1.6;
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 260px;
  color: var(--muted);
}

.group-list {
  display: grid;
  gap: 16px;
  margin-top: 16px;
}

.detail-page .group-list {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: start;
}

.group-section {
  overflow: hidden;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(62, 42, 36, 0.08);
}

.detail-page .group-section {
  min-width: 0;
}

.detail-page .operator-grid {
  grid-template-columns: 1fr;
  align-items: start;
}

.detail-page .operator-item {
  border-right: 0;
}

.group-header {
  align-items: flex-start;
  padding: 16px 18px;
  border-bottom: 1px solid var(--border);
  background: var(--surface-soft);
}

.group-header-main {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  min-width: 0;
  align-items: center;
  gap: 16px;
}

.group-header h2 {
  display: block;
  margin: 0;
  color: #7d3b32;
  font-size: 34px;
  font-weight: 900;
  line-height: 1;
}

.group-header-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px 12px;
  min-width: 0;
}

.group-header-stat {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
}

.group-header-stat span {
  color: var(--muted);
  font-size: 11px;
  line-height: 1.2;
}

.group-header-stat strong {
  color: var(--text);
  font-size: 15px;
  line-height: 1.1;
}

.group-header-score {
  display: flex;
  align-items: flex-end;
  flex-direction: column;
  gap: 4px;
  min-width: 88px;
  text-align: right;
}

.group-header-score span {
  color: var(--muted);
  font-size: 12px;
}

.group-header-score strong {
  color: #e52b46;
  font-size: clamp(42px, 5vw, 68px);
  font-weight: 950;
  letter-spacing: 0;
  line-height: 0.85;
}

.operator-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.operator-item {
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 14px;
  border-right: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
}

.operator-item:not(.is-expanded) {
  padding-bottom: 0;
}

.operator-item:nth-child(3n) {
  border-right: 0;
}

.operator-main {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) minmax(62px, auto) auto;
  align-items: center;
  gap: 10px;
  padding-bottom: 12px;
  border-bottom: 1px dashed var(--border);
  cursor: pointer;
}

.operator-title {
  display: flex;
  align-items: flex-start;
  flex-direction: column;
  min-width: 0;
  gap: 2px;
}

.operator-name-row {
  display: flex;
  flex: 0 1 auto;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.operator-name-row strong {
  overflow: hidden;
  font-size: 18px;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.operator-english-name {
  overflow: hidden;
  max-width: 100%;
  color: var(--muted);
  font-size: 16px;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.operator-rating-line {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 5px;
  min-width: 0;
  color: var(--muted);
  font-size: 11px;
  line-height: 1.2;
  white-space: nowrap;
}

.operator-rating-line.is-combat {
  flex-wrap: wrap;
  row-gap: 1px;
}

.operator-grade-note {
  max-width: 100%;
  padding: 3px 4px;
  border-radius: 3px;
  background: rgba(217, 119, 6, 0.13);
  color: #92400e;
  font-size: 12px;
  font-weight: 600;
  line-height: 15px;
  white-space: nowrap;
  cursor: help;
}

.operator-grade-note.is-limited {
  background: rgba(40, 120, 200, 0.13);
  color: #1f5fa8;
}

.operator-grade-note.is-x-without-limited {
  background: rgba(168, 85, 247, 0.13);
  color: #7e22ce;
}

.operator-total-score {
  display: inline-flex;
  min-width: 45px;
  align-items: center;
  justify-content: center;
  color: var(--muted);
  font-size: 11px;
  line-height: 1.2;
}

.operator-total-score span {
  white-space: nowrap;
}

.operator-total-score .grade-badge {
  min-width: 45px;
  height: 42px;
  padding-right: 9px;
  padding-left: 9px;
  font-size: 26px;
}

.operator-toggle {
  display: inline-flex;
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  border-radius: 3px;
  background: transparent;
  color: var(--muted);
}

.operator-toggle:hover {
  color: #2878c8;
}

.operator-details {
  min-width: 0;
}

.grade-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 20px;
  padding: 0 4px;
  border-radius: 3px;
  color: #fff;
  font-size: 12px;
  font-weight: 800;
}

.grade-x {
  background: #a855f7;
}
.grade-s {
  background: #d97706;
}
.grade-a {
  background: #2878c8;
}
.grade-b {
  background: #64748b;
}
.grade-c {
  background: #94a3b8;
}

.grade-text-x {
  color: #a855f7;
}
.grade-text-s {
  color: #b45309;
}
.grade-text-a {
  color: #2878c8;
}
.grade-text-b {
  color: #64748b;
}
.grade-text-c {
  color: #94a3b8;
}

.operator-info-row {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-top: 12px;
  font-size: 12px;
  line-height: 1.5;
}

.operator-info-heading {
  width: fit-content;
  font-weight: 700;
}

.info-value {
  overflow-wrap: anywhere;
  color: var(--text);
  line-height: 1.6;
}

.info-value-empty {
  color: var(--muted);
}

.operator-subjective-description {
  display: block;
  margin-top: 6px;
  color: #7d3b32;
}

.combat-entry {
  display: block;
}

.combat-entry + .combat-entry {
  margin-top: 4px;
}

.combat-entry b {
  color: #2878c8;
  font-weight: 700;
}

.operator-prts-link {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: 2px;
  padding: 2px 5px;
  border: 1px solid var(--border);
  border-radius: 3px;
  color: var(--muted);
  font-size: 11px;
  line-height: 16px;
  text-decoration: none;
  transition:
    color 0.15s,
    border-color 0.15s;
}

.operator-prts-link:hover {
  border-color: #2878c8;
  color: #2878c8;
}

.operator-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px dashed var(--border);
}

.operator-stats {
  flex: 1 1 auto;
  min-width: 0;
  flex-wrap: wrap;
  margin-top: 0;
  padding-top: 0;
  color: var(--muted);
  font-size: 11px;
}

.operator-stats span {
  padding-right: 7px;
  border-right: 1px dashed var(--border);
}

.operator-stats span:last-child {
  border-right: 0;
}

.dev-score-breakdown {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 10px;
  margin-top: 8px;
  padding: 6px 8px;
  border: 1px dashed #b45309;
  background: rgba(217, 119, 6, 0.08);
  color: #92400e;
  font-size: 11px;
  line-height: 1.4;
}

.dev-score-breakdown strong {
  color: #7c2d12;
}

.page-48-12-1-footer {
  flex-wrap: wrap;
  margin-top: 16px;
  padding: 12px 16px;
  border-radius: 6px;
  color: var(--muted);
  font-size: 12px;
}

@media (max-width: 1050px) {
  .detail-page .group-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .detail-page .operator-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .operator-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .operator-item:nth-child(3n) {
    border-right: 1px solid var(--border);
  }

  .operator-item:nth-child(2n) {
    border-right: 0;
  }
}

@media (max-width: 760px) {
  .page-48-12-1 {
    padding: 0 10px;
  }

  .page-48-12-1-header,
  .method-note {
    display: block;
  }

  .hero-panel {
    align-items: flex-end;
    min-height: max(calc(100svh - 40px), 0px);
    min-height: max(calc(100svh - 40px), calc(100dvh - 40px));
    margin-right: -10px;
    margin-left: -10px;
    padding: 28px 18px calc(16px + env(safe-area-inset-bottom, 0px));
  }

  .result-page,
  .detail-page {
    margin-right: -10px;
    margin-left: -10px;
    padding: 28px 18px calc(24px + env(safe-area-inset-bottom, 0px));
  }

  .detail-page {
    min-height: 0;
  }

  .detail-page .detail-tabs {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 6px;
  }

  .detail-page .detail-tabs {
    position: sticky;
    top: calc(64px + 8px);
    z-index: 10;
    background: transparent;
  }

  .detail-page .detail-tab {
    min-height: 42px;
    padding: 10px 6px;
    font-size: 15px;
  }

  .detail-page .operator-main {
    gap: 6px;
  }

  .detail-page .operator-main {
    gap: 4px;
  }

  .detail-page .operator-prts-link {
    padding-right: 3px;
    padding-left: 3px;
    font-size: 10px;
  }

  .detail-page .operator-total-score {
    min-width: 62px;
  }

  .detail-page .operator-toggle {
    width: 26px;
    height: 26px;
  }

  .detail-page .group-list {
    grid-template-columns: 1fr;
  }

  .detail-page .operator-grid {
    grid-template-columns: 1fr;
  }

  .detail-page .group-list .group-section:not(.is-active) {
    display: none;
  }

  .detail-page.is-inline-result {
    min-height: 0;
    padding-top: 0;
  }

  .result-page {
    justify-content: flex-start;
  }

  .result-page.is-drawing {
    min-height: max(calc(100svh - 40px), 0px);
    min-height: max(calc(100svh - 40px), calc(100dvh - 40px));
    justify-content: center;
  }

  .result-page.is-drawing .result-page-loading {
    min-height: 0;
    width: 100%;
    flex: 1 1 auto;
  }

  .result-modules {
    grid-template-columns: 1fr;
  }

  .result-score-bar-content {
    gap: 8px;
    padding-right: 10px;
    padding-left: 10px;
  }

  .result-score-row-label {
    gap: 5px;
  }

  .result-score-row-label strong {
    font-size: 16px;
  }

  .result-score-row-unowned {
    gap: 3px;
  }

  .result-score-row-value {
    min-width: 72px;
  }

  .result-score-row-value strong {
    font-size: 18px;
  }

  .result-page {
    padding-bottom: calc(24px + env(safe-area-inset-bottom, 0px));
  }

  .result-page:not(.is-drawing) {
    padding-bottom: 0;
  }

  .detail-page {
    justify-content: flex-start;
  }

  .detail-page.is-inline-result {
    padding-top: 24px;
  }

  .hero-ribbons {
    top: 8%;
    height: 70%;
  }

  .hero-ribbon-label {
    height: 20px;
    font-size: 13px;
  }

  .hero-ribbon-viewport {
    height: calc(100% - 20px);
  }

  .hero-ribbon-copy {
    gap: 4px;
    padding-right: 4px;
  }

  .hero-ribbon-operator {
    width: 72px;
  }

  .hero-panel h1 {
    font-size: min(11vw, calc((100vw - 36px) / 8), 52px);
  }

  .hero-action-fade {
    height: 46%;
  }

  .hero-copy {
    align-self: flex-end;
    margin-top: 0;
  }

  .hero-actions {
    margin-top: clamp(48px, 9vh, 82px);
  }

  .hero-secondary-actions {
    gap: 8px;
    margin-top: 14px;
  }

  .hero-secondary-button,
  .hero-account-status {
    min-height: 42px;
    padding-right: 6px;
    padding-left: 6px;
    font-size: 12px !important;
  }

  .draw-button {
    min-height: 66px;
    font-size: 21px !important;
  }

  .page-48-12-1-header-meta {
    margin-top: 16px;
  }

  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .method-note > div + div {
    margin-top: 12px;
  }

  .draw-result {
    grid-template-columns: 1fr;
  }

  .result-metrics {
    min-width: 0;
  }

  .result-details {
    grid-template-columns: 1fr;
  }

  .result-reason {
    padding-top: 16px;
    padding-left: 0;
    border-top: 1px solid var(--border);
    border-left: 0;
  }
}

@media (max-width: 560px) {
  .result-score-settings-panel {
    align-items: stretch;
    flex-direction: column;
    gap: 6px;
  }

  .result-score-settings-dimension {
    align-items: flex-start;
    flex-direction: column;
    gap: 6px;
  }

  .result-score-settings-dimension .dimension-toggle {
    width: 100%;
  }

  .toolbar-block {
    width: 100%;
    justify-content: space-between;
  }

  .toolbar-dimension {
    align-items: flex-start;
    flex-direction: column;
    gap: 8px;
  }

  .toolbar-dimension .toolbar-label {
    width: 100%;
  }

  .dimension-toggle {
    width: 100%;
  }

  .dimension-toggle :deep(.v-btn) {
    flex: 1 1 0;
    min-width: 0;
  }

  .toolbar-account {
    justify-content: flex-start;
  }

  .summary-grid,
  .operator-grid {
    grid-template-columns: 1fr;
  }

  .hero-panel {
    padding: 24px 18px calc(16px + env(safe-area-inset-bottom, 0px));
  }

  .hero-actions,
  .draw-button {
    width: 100%;
  }

  .result-metrics {
    grid-template-columns: 1fr;
  }

  .result-footer {
    align-items: flex-start;
    flex-direction: column;
  }

  .operator-item,
  .operator-item:nth-child(2n),
  .operator-item:nth-child(3n) {
    border-right: 0;
  }

  .operator-item:last-child {
    border-bottom: 0;
  }

  .group-header {
    padding: 12px 14px;
  }

  .group-header-main {
    grid-template-columns: auto minmax(0, 1fr) auto;
    gap: 8px;
  }

  .group-header h2 {
    font-size: 28px;
  }

  .group-header-stats {
    gap: 4px 8px;
  }

  .group-header-stat span {
    font-size: 10px;
  }

  .group-header-stat strong {
    font-size: 12px;
  }

  .group-header-score {
    min-width: 62px;
  }

  .group-header-score strong {
    font-size: 34px;
  }

}
</style>
