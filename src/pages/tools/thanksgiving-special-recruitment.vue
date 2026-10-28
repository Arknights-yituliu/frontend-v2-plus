<script setup>
import { computed, onMounted, ref } from "vue";
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

const hasLoginToken = computed(() => Boolean(localStorage.getItem("USER_TOKEN")));

const operatorByName = new Map(Object.values(operatorTableV2).map((operator) => [operator.name, operator]));

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
    };
  });

  const ranking = [...results].sort((a, b) => b.expected - a.expected);
  const rankById = new Map(ranking.map((group, index) => [group.id, index + 1]));
  return results.map((group) => ({ ...group, rank: rankById.get(group.id) }));
});

const bestGroup = computed(() => [...groupResults.value].sort((a, b) => b.expected - a.expected)[0]);

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

onMounted(loadPage);
</script>

<template>
  <main class="thanksgiving-page">
    <header class="thanksgiving-header">
      <div>
        <p class="thanksgiving-kicker">感谢庆典 / 四选一辅助</p>
        <h1>感谢庆典特别招募</h1>
        <p class="thanksgiving-description">每个队列包含 12 名干员，组内等概率获得 1 名。本页把作战、基建和账号收益放在同一张表里，辅助选择队列。</p>
      </div>
      <div class="thanksgiving-header-meta">
        <strong>当前建议</strong>
        <span v-if="bestGroup">优先查看 {{ bestGroup.name }}</span>
        <small>结果会随模式、账号持有情况和潜能变化</small>
      </div>
    </header>

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

    <section class="summary-grid" aria-label="队列比较">
      <article v-for="group in groupResults" :key="group.id" class="summary-item" :class="{ 'is-best': group.rank === 1 }">
        <div class="summary-topline">
          <span class="summary-name">{{ group.name }}</span>
          <v-chip v-if="group.rank === 1" size="x-small" color="primary" variant="flat">当前最高</v-chip>
        </div>
        <div class="summary-score">{{ formatScore(group.expected) }}</div>
        <div class="summary-caption">期望分 · 风险 {{ formatScore(group.standardDeviation) }}</div>
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
        <span>未登录时所有干员均按未持有处理，开关只会统一移除或增加未持有加权，不改变四组相对排序；已持有干员仍保留潜能收益，满潜仍保留重复黄票收益。</span>
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

    <section v-else class="group-list" aria-label="干员详情">
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

    <footer class="thanksgiving-footer">
      <span>公开统计样本：{{ sampleSize ? `${sampleSize.toLocaleString()} 位玩家` : "加载中" }}</span>
      <span>当前账号收益参数为试算值，后续可根据实际结果调整。</span>
    </footer>
  </main>
</template>

<style scoped>
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
    padding: 14px 10px 32px;
  }

  .thanksgiving-header,
  .method-note {
    display: block;
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
