<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import OperatorAvatar from "/src/components/sprite/OperatorAvatar.vue";
import { operatorTableV2 } from "/src/utils/gameData.js";
import operatorDataAPI from "/src/api/user-center/operatorData.js";
import operatorProgressionStatisticsDataCache from "/src/plugins/indexedDB/operatorProgressionStatisticsData.js";
import RECRUITMENT_CONFIG from "/src/static/json/tools/thanksgiving-special-recruitment.json";
import COMBAT_DESCRIPTIONS from "/src/static/json/tools/thanksgiving-combat-descriptions.json";
import COMBAT_DATA from "/src/static/json/combat/operator-tags.json";
import BUILDING_TABLE from "/src/static/json/build/building_table.json";
import BUILDING_SCORES from "/src/static/json/build/logistics_efficiency_scores/auto.json";

const SCORE_MAP = RECRUITMENT_CONFIG.scoreMap;
const DIMENSION_OPTIONS = [
  { label: "作战优先", value: "combat" },
  { label: "通用", value: "general" },
  { label: "基建优先", value: "base" },
];
const DIMENSION_WEIGHTS = {
  combat: { combat: 0.7, base: 0.3 },
  general: { combat: 0.5, base: 0.5 },
  base: { combat: 0.3, base: 0.7 },
};
const ACCOUNT_SCORING = {
  unownedBonus: 5,
  potentialStep: 0.35,
  maxPotentialDuplicateBonus: 0.8,
};
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
const HERO_RIBBON_THEMES = [
  { color: "#253532", accent: "#ff9f3f", ink: "#f7fbf7", duration: "34s" },
  { color: "#293834", accent: "#ffb04d", ink: "#f7fbf7", duration: "28s" },
  { color: "#263a36", accent: "#ffad46", ink: "#f7fbf7", duration: "32s" },
  { color: "#2b3733", accent: "#ffc05b", ink: "#f7fbf7", duration: "26s" },
];

const dimension = ref("general");
const preferUnowned = ref(true);
const loading = ref(true);
const accountLoading = ref(false);
const statsLoading = ref(false);
const loadError = ref("");
const accountStatus = ref("public");
const accountOperators = ref(new Map());
const progressionStatistics = ref(new Map());
const sampleSize = ref(0);
const drawResult = ref(null);
const drawPreviewGroup = ref(null);
const isDrawing = ref(false);
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
    return preferUnowned.value ? ACCOUNT_SCORING.unownedBonus : 0;
  }

  const accountOperator = getAccountOperator(name);
  if (!accountOperator) {
    return preferUnowned.value ? ACCOUNT_SCORING.unownedBonus : 0;
  }

  const potential = Math.max(1, Math.min(6, Number(accountOperator.potential) || 1));
  const remainingPotential = Math.max(0, 6 - potential);
  const maxPotentialBonus = potential >= 6 ? ACCOUNT_SCORING.maxPotentialDuplicateBonus : 0;
  return remainingPotential * ACCOUNT_SCORING.potentialStep + maxPotentialBonus;
}

function getOperatorView(configOperator) {
  const operator = operatorByName.get(configOperator.name) || {};
  const combatScore = scoreForGrade(configOperator.combatGrade);
  const baseScore = scoreForGrade(configOperator.baseGrade);
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

  return {
    ...configOperator,
    charId: operator.charId,
    rarity: operator.rarity || 6,
    profession: operator.profession,
    combatScore,
    baseScore,
    dimensionScore,
    accountBonus,
    finalScore: dimensionScore + accountBonus,
    accountLabel: getAccountLabel(configOperator.name),
    accountOperator: getAccountOperator(configOperator.name),
    combatDescriptions: buildCombatDescriptions(configOperator.name, tags),
    prtsUrl,
    hasLimitedEquip: hasLimitedEquipByName.get(configOperator.name) === true,
    buildingSkills,
    stats,
  };
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

function getGradeNote(operator) {
  if (operator.hasLimitedEquip) {
    return "考虑特限模组达到此评分";
  }
  return TOP_COMBAT_GRADES.has(operator.combatGrade) ? "无特限模组达到此评分" : "";
}

function getGradeNoteTitle(operator) {
  return operator.hasLimitedEquip
    ? "该干员拥有集成战略 / 生息演算特限模组，该评分需考虑特限模组才能达成"
    : "该干员没有集成战略 / 生息演算特限模组";
}

const groupResults = computed(() => {
  const results = RECRUITMENT_CONFIG.groups.map((group) => {
    const operators = group.operators.map(getOperatorView);
    const scores = operators.map((operator) => operator.finalScore);
    const expected = average(scores);
    const variance = average(scores.map((score) => (score - expected) ** 2));
    const sorted = [...operators].sort((a, b) => b.finalScore - a.finalScore);
    return {
      ...group,
      operators,
      expected,
      standardDeviation: Math.sqrt(variance),
      minScore: Math.min(...scores),
      maxScore: Math.max(...scores),
      bestOperator: sorted[0],
      topOperators: sorted.slice(0, 3),
    };
  });

  const ranking = [...results].sort((a, b) => b.expected - a.expected);
  const rankById = new Map(ranking.map((group, index) => [group.id, index + 1]));
  const totalExpected = results.reduce((sum, group) => sum + Math.max(group.expected, 0), 0);
  return results.map((group) => ({
    ...group,
    rank: rankById.get(group.id),
    probability: totalExpected > 0 ? group.expected / totalExpected : 1 / Math.max(results.length, 1),
  }));
});

const bestGroup = computed(() => [...groupResults.value].sort((a, b) => b.expected - a.expected)[0]);
const drawReady = computed(() => !loading.value && !accountLoading.value && !statsLoading.value && groupResults.value.length > 0);
const dimensionLabel = computed(() => DIMENSION_OPTIONS.find((option) => option.value === dimension.value)?.label || "通用");

const dataModeLabel = computed(() => {
  if (accountStatus.value === "loaded") {
    return "已使用账号干员数据";
  }
  if (accountStatus.value === "loading") {
    return "正在读取账号干员数据";
  }
  if (accountStatus.value === "error") {
    return "账号读取失败：按未持有";
  }
  return "公开数据模式：全部按未持有";
});

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

function getWeightedGroup() {
  const groups = groupResults.value;
  if (!groups.length) return null;

  const totalWeight = groups.reduce((sum, group) => sum + Math.max(group.expected, 0), 0);
  if (totalWeight <= 0) {
    return groups[Math.floor(Math.random() * groups.length)];
  }

  let target = Math.random() * totalWeight;
  for (const group of groups) {
    target -= Math.max(group.expected, 0);
    if (target <= 0) return group;
  }
  return groups[groups.length - 1];
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
  drawResult.value = null;
  isDrawing.value = true;

  const groups = groupResults.value;
  let previewIndex = 0;
  drawPreviewGroup.value = groups[previewIndex];
  drawInterval = setInterval(() => {
    previewIndex = (previewIndex + 1) % groups.length;
    drawPreviewGroup.value = groups[previewIndex];
  }, 110);

  drawTimeout = setTimeout(() => {
    clearDrawTimers();
    drawResult.value = getWeightedGroup();
    drawPreviewGroup.value = drawResult.value;
    isDrawing.value = false;
  }, 1200);
}

function getDrawReason(group) {
  const leaders = group.topOperators.slice(0, 3).map((operator) => operator.name).join("、");
  return `当前采用${dimensionLabel.value}，${preferUnowned.value ? "已启用未持有优先" : "未额外偏向未持有"}；该队列的期望分为 ${formatScore(group.expected)}，组内高分干员包括 ${leaders}。`;
}

function getMasteryRate(stats) {
  if (!stats) return null;
  return Math.max(Number(stats.skill1Rank3) || 0, Number(stats.skill2Rank3) || 0, Number(stats.skill3Rank3) || 0);
}

function getModuleRate(stats) {
  if (!stats) return null;
  return Math.max(
    Number(stats.modXRank3) || 0,
    Number(stats.modYRank3) || 0,
    Number(stats.modDRank3) || 0,
    Number(stats.modARank3) || 0,
    Number(stats.modBRank3) || 0
  );
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

watch([dimension, preferUnowned, accountStatus], () => {
  clearDrawTimers();
  isDrawing.value = false;
  drawResult.value = null;
  drawPreviewGroup.value = null;
});

onBeforeUnmount(clearDrawTimers);
onMounted(() => {
  loadPage();
});
</script>

<template>
  <main class="thanksgiving-page">
    <section class="hero-panel" aria-labelledby="thanksgiving-title">
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
      <div class="hero-tint" aria-hidden="true"></div>
      <div class="hero-copy">
        <h1 id="thanksgiving-title">特别招募活动<br />怎么选？</h1>
        <div class="hero-actions">
          <v-btn class="draw-button" size="x-large" variant="flat" :loading="isDrawing" :disabled="!drawReady" @click="drawGroup">
            帮我决定！
          </v-btn>
        </div>
      </div>
    </section>

    <section class="thanksgiving-toolbar" aria-label="推荐设置">
      <div class="toolbar-block">
        <span class="toolbar-label">评价维度</span>
        <v-btn-toggle v-model="dimension" mandatory divided color="primary" density="comfortable">
          <v-btn v-for="option in DIMENSION_OPTIONS" :key="option.value" :value="option.value">
            {{ option.label }}
          </v-btn>
        </v-btn-toggle>
      </div>
      <div class="toolbar-block toolbar-account">
        <v-switch v-model="preferUnowned" color="primary" hide-details density="compact" label="未持有优先" />
        <span class="toolbar-note">未持有试算加权 +{{ ACCOUNT_SCORING.unownedBonus }}</span>
      </div>
      <div class="data-status" :class="{ 'is-account': accountStatus === 'loaded' }">
        <v-icon size="18">
          {{ accountStatus === "loaded" ? "mdi-account-check" : accountStatus === "error" ? "mdi-alert-circle-outline" : "mdi-database-eye" }}
        </v-icon>
        <span>{{ dataModeLabel }}</span>
        <v-progress-circular v-if="accountLoading || statsLoading" indeterminate size="16" width="2" />
      </div>
    </section>

    <v-alert v-if="loadError" type="warning" variant="tonal" class="thanksgiving-alert">
      {{ loadError }}
    </v-alert>

    <section v-if="drawResult || isDrawing" class="draw-result" :class="{ 'is-drawing': isDrawing }" aria-live="polite">
      <div v-if="isDrawing" class="draw-state">
        <span class="result-eyebrow">正在抽签</span>
        <strong>{{ drawPreviewGroup?.name || "正在准备队列" }}</strong>
        <span>根据当前四组评分权重滚动中...</span>
      </div>
      <template v-else-if="drawResult">
        <div class="result-heading">
          <span class="result-eyebrow">本次推荐队列</span>
          <h2>{{ drawResult.name }}</h2>
          <p>这是基于当前设置的辅助决策结果，可以继续抽签比较其他可能性。</p>
        </div>
        <div class="result-metrics">
          <div>
            <strong>{{ formatPercent(drawResult.probability * 100) }}</strong>
            <span>抽签权重</span>
          </div>
          <div>
            <strong>{{ formatScore(drawResult.expected) }}</strong>
            <span>期望分</span>
          </div>
          <div>
            <strong>{{ formatScore(drawResult.standardDeviation) }}</strong>
            <span>风险值</span>
          </div>
        </div>
        <div class="result-details">
          <div class="result-highlight-block">
            <span class="result-label">组内值得期待</span>
            <div class="result-operators">
              <div v-for="operator in drawResult.topOperators" :key="operator.charId" class="result-operator">
                <OperatorAvatar :char-id="operator.charId" :rarity="operator.rarity" :size="42" :mobile-size="36" :border="true" />
                <span>{{ operator.name }}</span>
                <small>{{ formatScore(operator.finalScore) }} 分</small>
              </div>
            </div>
          </div>
          <div class="result-reason">
            <span class="result-label">为什么是这一组</span>
            <p>{{ getDrawReason(drawResult) }}</p>
          </div>
        </div>
        <div class="result-footer">
          <span>辅助抽签结果不会改变游戏内的实际抽取结果。</span>
          <v-btn variant="outlined" color="primary" size="small" @click="drawGroup">
            <v-icon start size="16">mdi-refresh</v-icon>
            再抽一次
          </v-btn>
        </div>
      </template>
    </section>

    <section class="summary-grid" aria-label="队列比较">
      <article v-for="group in groupResults" :key="group.id" class="summary-item" :class="{ 'is-best': group.rank === 1 }">
        <div class="summary-topline">
          <span class="summary-name">{{ group.name }}</span>
          <v-chip v-if="group.rank === 1" size="x-small" color="primary" variant="flat">当前最高</v-chip>
        </div>
        <div class="summary-score">{{ formatScore(group.expected) }}</div>
        <div class="summary-caption">期望分 · 风险 {{ formatScore(group.standardDeviation) }}</div>
        <div class="summary-probability">{{ formatPercent(group.probability * 100) }} 抽签权重</div>
        <div class="summary-details">
          <span>最低 {{ formatScore(group.minScore) }}</span>
          <span>最高 {{ formatScore(group.maxScore) }}</span>
          <span>最佳：{{ group.bestOperator?.name }}</span>
        </div>
      </article>
    </section>

    <section class="method-note">
      <div>
        <strong>计算口径</strong>
        <span>S/A/B/C 对应 5/3/2/1 分；通用维度为作战与基建平均值；四组均按 1/12 等概率计算。</span>
      </div>
      <div>
        <strong>账号收益</strong>
        <span>未登录时所有干员均按未持有处理；登录后未持有优先会根据各组持有与潜能情况影响分数，已持有干员仍保留潜能收益，满潜仍保留重复黄票收益。</span>
      </div>
      <div>
        <strong>统计说明</strong>
        <span>持有率、精二率、专三率和模组率仅作为干员背景信息展示，不参与推荐分。</span>
      </div>
    </section>

    <section v-if="loading" class="loading-state">
      <v-progress-circular indeterminate color="primary" />
      <span>正在整理干员数据...</span>
    </section>

    <details v-else class="detail-disclosure">
      <summary>
        <span>
          <v-icon size="18">mdi-format-list-bulleted-square</v-icon>
          查看完整评分与干员详情
        </span>
        <small>包含持有状态、作战与基建评分、公开统计</small>
      </summary>
      <div class="detail-disclosure-body">
        <section class="group-list" aria-label="干员详情">
          <article v-for="group in groupResults" :key="group.id" class="group-section">
        <header class="group-header">
          <div>
            <span class="group-rank">#{{ group.rank }}</span>
            <h2>{{ group.name }}</h2>
            <p>12 名干员等概率 · 期望 {{ formatScore(group.expected) }} · 标准差 {{ formatScore(group.standardDeviation) }}</p>
          </div>
          <div class="group-header-score">
            <span>最佳候选</span>
            <strong>{{ group.bestOperator?.name }}</strong>
          </div>
        </header>

        <div class="operator-grid">
          <article v-for="operator in group.operators" :key="operator.charId" class="operator-item">
            <div class="operator-main">
              <OperatorAvatar :char-id="operator.charId" :rarity="operator.rarity" :size="58" :mobile-size="52" :border="true" />
              <div class="operator-title">
                <div class="operator-name-row">
                  <strong>{{ operator.name }}</strong>
                  <span class="grade-badge" :class="`grade-${operator.combatGrade.toLowerCase()}`">{{ operator.combatGrade }}</span>
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
                <span class="operator-status" :class="{ owned: operator.accountLabel === '已持有' }">
                  {{ operator.accountLabel }}
                  <template v-if="operator.accountOperator?.potential"> · 潜能{{ operator.accountOperator.potential }}</template>
                </span>
              </div>
              <div class="operator-score">
                <strong>{{ formatScore(operator.finalScore) }}</strong>
                <span>当前分</span>
              </div>
            </div>

            <div class="operator-dimensions">
              <span
                >作战 <b :class="`grade-text-${operator.combatGrade.toLowerCase()}`">{{ operator.combatGrade }} {{ operator.combatScore }}</b>
                <span v-if="getGradeNote(operator)" class="grade-note" :class="{ 'is-limited': operator.hasLimitedEquip }"
                  :title="getGradeNoteTitle(operator)">{{ getGradeNote(operator) }}</span
                >
              </span>
              <span
                >基建 <b :class="`grade-text-${operator.baseGrade.toLowerCase()}`">{{ operator.baseGrade }} {{ operator.baseScore }}</b></span
              >
              <span v-if="operator.accountBonus > 0">账号 +{{ formatScore(operator.accountBonus) }}</span>
            </div>

            <div class="operator-info-row">
              <span class="info-label">作战描述</span>
              <span v-if="operator.combatDescriptions.length" class="info-value">
                <span v-for="entry in operator.combatDescriptions" :key="entry.name" class="combat-entry">
                  <b>{{ entry.name }}</b>
                  <template v-if="entry.description">：{{ entry.description }}</template>
                </span>
              </span>
              <span v-else class="info-value info-value-empty">暂无作战描述</span>
            </div>
            <div class="operator-info-row">
              <span class="info-label">基建技能</span>
              <span class="info-value">
                {{ operator.buildingSkills.map((skill) => `${skill.room}：${skill.description}`).join("；") || "暂无基建记录" }}
              </span>
            </div>
            <div class="operator-stats" v-if="operator.stats">
              <span>持有 {{ formatPercent(operator.stats.ownRate) }}</span>
              <span>精二 {{ formatPercent(operator.stats.eliteRank2) }}</span>
              <span>专三 {{ formatPercent(getMasteryRate(operator.stats)) }}</span>
              <span>模组 {{ formatPercent(getModuleRate(operator.stats)) }}</span>
            </div>
            <div v-else class="operator-stats operator-stats-empty">公开统计暂无</div>
          </article>
        </div>
          </article>
        </section>
      </div>
    </details>

    <footer class="thanksgiving-footer">
      <span>公开统计样本：{{ sampleSize ? `${sampleSize.toLocaleString()} 位玩家` : "加载中" }}</span>
      <span>当前账号收益参数为试算值，后续可根据实际结果调整。</span>
    </footer>
  </main>
</template>

<style scoped>
.hero-panel {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: min(760px, calc(100svh - 64px));
  margin: -24px clamp(-36px, -2.5vw, -12px) 0;
  overflow: hidden;
  padding: clamp(28px, 6vw, 64px) clamp(18px, 5vw, 72px);
  border-radius: 0;
  isolation: isolate;
  background: #171b1d;
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
  background: rgba(10, 14, 16, 0.34);
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
  background: rgba(12, 24, 22, 0.38);
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
  z-index: 4;
  background: rgba(9, 13, 15, 0.16);
  pointer-events: none;
}

.hero-copy {
  position: relative;
  z-index: 5;
  width: min(100%, 430px);
  margin-top: 9%;
  text-align: center;
}

.hero-panel h1 {
  margin: 0;
  color: #fff;
  font-size: clamp(38px, 7vw, 66px);
  font-weight: 900;
  line-height: 1.18;
  letter-spacing: 0;
  text-shadow: 0 3px 0 #11181a, 0 7px 18px rgba(0, 0, 0, 0.5);
}

.hero-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 24px;
}

.draw-button {
  width: min(100%, 330px);
  min-height: 62px;
  border: 1px solid #ff9aa6 !important;
  border-radius: 4px !important;
  background: #e52b46 !important;
  box-shadow: 0 10px 20px rgba(45, 5, 14, 0.3);
  color: #fff !important;
  font-size: 19px !important;
  font-weight: 800 !important;
}

.draw-button:hover {
  background: #f13b56 !important;
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

.thanksgiving-page {
  --page-bg: var(--c-page-background-color, #f4f6f8);
  --surface: var(--c-background-color, #ffffff);
  --surface-soft: var(--c-page-background-color-secondary, #f8fafc);
  --text: var(--c-text-color, #1f2937);
  --muted: var(--c-secondary-text-color, #6b7280);
  --border: var(--c-border-color, #dce1e8);
  max-width: 1480px;
  min-height: 100%;
  margin: 0 auto;
  padding: 24px clamp(12px, 2.5vw, 36px) 48px;
  color: var(--text);
  background: var(--page-bg);
}

.thanksgiving-header,
.thanksgiving-toolbar,
.method-note,
.group-header,
.thanksgiving-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.thanksgiving-header {
  align-items: flex-end;
  padding: 8px 0 24px;
}

.thanksgiving-kicker {
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

.thanksgiving-description {
  max-width: 760px;
  margin-bottom: 0;
  color: var(--muted);
  line-height: 1.7;
}

.thanksgiving-header-meta {
  min-width: 190px;
  padding: 14px 16px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--surface);
}

.thanksgiving-header-meta strong,
.thanksgiving-header-meta span,
.thanksgiving-header-meta small {
  display: block;
}

.thanksgiving-header-meta strong {
  color: #2878c8;
  font-size: 12px;
}

.thanksgiving-header-meta span {
  margin-top: 6px;
  font-weight: 700;
}

.thanksgiving-header-meta small {
  margin-top: 4px;
  color: var(--muted);
  line-height: 1.5;
}

.thanksgiving-toolbar,
.method-note,
.summary-item,
.group-section,
.thanksgiving-footer {
  border: 1px solid var(--border);
  background: var(--surface);
}

.thanksgiving-toolbar {
  flex-wrap: wrap;
  margin-top: 16px;
  padding: 12px 16px;
  border-radius: 6px;
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

.data-status {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
  color: var(--muted);
  font-size: 13px;
}

.data-status.is-account {
  color: #26764d;
}

.thanksgiving-alert {
  margin-top: 12px;
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
.operator-dimensions,
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

.detail-disclosure {
  margin-top: 16px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
}

.detail-disclosure summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: 58px;
  padding: 0 18px;
  cursor: pointer;
  list-style: none;
}

.detail-disclosure summary::-webkit-details-marker {
  display: none;
}

.detail-disclosure summary > span {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 800;
}

.detail-disclosure summary > small {
  color: var(--muted);
  font-size: 12px;
}

.detail-disclosure summary::after {
  flex-shrink: 0;
  color: #2878c8;
  content: "展开";
  font-size: 12px;
  font-weight: 700;
}

.detail-disclosure[open] summary::after {
  content: "收起";
}

.detail-disclosure-body {
  padding: 0 16px 16px;
  border-top: 1px solid var(--border);
}

.group-list {
  display: grid;
  gap: 16px;
  margin-top: 16px;
}

.group-section {
  overflow: hidden;
  border-radius: 6px;
}

.group-header {
  align-items: flex-start;
  padding: 16px 18px;
  border-bottom: 1px solid var(--border);
  background: var(--surface-soft);
}

.group-header h2 {
  display: inline;
  margin: 0;
  font-size: 20px;
}

.group-header p {
  margin: 6px 0 0;
  color: var(--muted);
  font-size: 12px;
}

.group-rank {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 24px;
  margin-right: 8px;
  border-radius: 4px;
  background: #2878c8;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  vertical-align: 2px;
}

.group-header-score {
  text-align: right;
}

.group-header-score span,
.group-header-score strong {
  display: block;
}

.group-header-score span {
  color: var(--muted);
  font-size: 12px;
}

.group-header-score strong {
  margin-top: 4px;
  font-size: 18px;
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

.operator-item:nth-child(3n) {
  border-right: 0;
}

.operator-main {
  display: flex;
  align-items: center;
  gap: 10px;
}

.operator-title {
  min-width: 0;
  flex: 1;
}

.operator-name-row {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.operator-name-row strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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

.operator-status {
  display: block;
  margin-top: 4px;
  color: var(--muted);
  font-size: 12px;
}

.operator-status.owned {
  color: #26764d;
}

.operator-score {
  min-width: 48px;
  text-align: right;
}

.operator-score strong,
.operator-score span {
  display: block;
}

.operator-score strong {
  color: #2878c8;
  font-size: 18px;
}

.operator-score span {
  color: var(--muted);
  font-size: 11px;
}

.operator-dimensions {
  flex-wrap: wrap;
  margin-top: 11px;
  color: var(--muted);
  font-size: 12px;
}

.operator-dimensions span {
  padding-right: 8px;
  border-right: 1px solid var(--border);
}

.operator-dimensions span:last-child {
  border-right: 0;
}

.grade-note {
  padding: 0 6px !important;
  margin-left: 6px !important;
  border-right: 0 !important;
  border-radius: 3px;
  background: rgba(217, 119, 6, 0.12);
  color: #b45309;
  line-height: 18px;
}

.grade-note.is-limited {
  background: rgba(40, 120, 200, 0.12);
  color: #2878c8;
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
  display: grid;
  grid-template-columns: 58px minmax(0, 1fr);
  gap: 8px;
  margin-top: 8px;
  font-size: 12px;
  line-height: 1.5;
}

.info-label {
  color: var(--muted);
}

.info-value {
  overflow-wrap: anywhere;
  color: var(--text);
  line-height: 1.6;
}

.info-value-empty {
  color: var(--muted);
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

.operator-stats {
  flex-wrap: wrap;
  margin-top: auto;
  padding-top: 10px;
  color: var(--muted);
  font-size: 11px;
}

.operator-stats span {
  padding-right: 7px;
  border-right: 1px solid var(--border);
}

.operator-stats span:last-child {
  border-right: 0;
}

.operator-stats-empty {
  min-height: 17px;
}

.thanksgiving-footer {
  flex-wrap: wrap;
  margin-top: 16px;
  padding: 12px 16px;
  border-radius: 6px;
  color: var(--muted);
  font-size: 12px;
}

@media (max-width: 1050px) {
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
  .thanksgiving-page {
    padding: 0 10px 32px;
  }

  .thanksgiving-header,
  .method-note {
    display: block;
  }

  .hero-panel {
    min-height: calc(100svh - 64px);
    margin-right: -10px;
    margin-left: -10px;
    padding: 28px 18px 42px;
  }

  .hero-ribbons {
    top: 11%;
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
    font-size: clamp(36px, 10vw, 50px);
  }

  .thanksgiving-header-meta {
    margin-top: 16px;
  }

  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .method-note > div + div {
    margin-top: 12px;
  }

  .data-status {
    width: 100%;
    margin-left: 0;
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
  .thanksgiving-toolbar {
    align-items: flex-start;
  }

  .toolbar-block {
    width: 100%;
    justify-content: space-between;
  }

  .toolbar-account {
    justify-content: flex-start;
  }

  .summary-grid,
  .operator-grid {
    grid-template-columns: 1fr;
  }

  .hero-panel {
    padding: 24px 18px;
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

  .detail-disclosure summary {
    align-items: flex-start;
    flex-direction: column;
    justify-content: center;
    gap: 5px;
    padding: 12px 14px;
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
    display: block;
  }

  .group-header-score {
    margin-top: 12px;
    text-align: left;
  }
}
</style>
