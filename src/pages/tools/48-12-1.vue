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
const activeDetailGroupId = ref(RECRUITMENT_CONFIG.groups[0]?.id || "");

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
  return operator.hasLimitedEquip ? "该干员拥有集成战略 / 生息演算特限模组，该评分需考虑特限模组才能达成" : "该干员没有集成战略 / 生息演算特限模组";
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
    return {
      ...group,
      potentialUpgradeCount,
      potentialUpgradeProbability: potentialUpgradeCount / Math.max(group.operators.length, 1),
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
const decisionRecommendationGroup = computed(() => {
  if (accountCompletion.value.allMax) {
    return null;
  }
  return decisionBestGroup.value;
});

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

watch([dimension, preferUnowned, accountStatus, decisionRecommendationGroup, decisionBestGroup], () => {
  activeDetailGroupId.value =
    decisionRecommendationGroup.value?.id || decisionBestGroup.value?.id || groupResults.value[0]?.id || "";
}, { immediate: true });

onBeforeUnmount(() => {
  document.documentElement.classList.remove("page-48-12-1-active");
});
onMounted(() => {
  document.documentElement.classList.add("page-48-12-1-active");
  loadPage();
});
</script>

<template>
  <main class="page-48-12-1">
    <section class="detail-page" aria-labelledby="detail-title">
      <nav class="detail-tabs" aria-label="选择详情队列">
        <button
          v-for="group in groupResults"
          :key="group.id"
          type="button"
          class="detail-tab"
          :class="{ 'is-active': group.id === activeDetailGroupId }"
          @click="activeDetailGroupId = group.id"
        >
          <span>{{ group.id }}</span>
          <small>组</small>
        </button>
      </nav>

      <header class="detail-page-header">
        <div>
          <span class="detail-page-eyebrow">感谢庆典特别招募</span>
          <h1 id="detail-title">详细分析</h1>
          <p>查看各组情况和完整干员资料。</p>
        </div>
      </header>

    <section class="page-48-12-1-toolbar" aria-label="推荐设置">
      <div class="data-status" :class="{ 'is-account': accountStatus === 'loaded' }">
        <v-icon size="18">
          {{ accountStatus === "loaded" ? "mdi-account-check" : accountStatus === "error" ? "mdi-alert-circle-outline" : "mdi-database-eye" }}
        </v-icon>
        <span>{{ dataModeLabel }}</span>
        <v-progress-circular v-if="accountLoading || statsLoading" indeterminate size="16" width="2" />
      </div>
    </section>

    <v-alert v-if="loadError" type="warning" variant="tonal" class="page-48-12-1-alert">
      {{ loadError }}
    </v-alert>

    <template v-if="!loading">
      <section class="group-list" aria-label="干员详情">
        <article
          v-for="group in groupResults"
          :key="group.id"
          class="group-section"
          :class="{ 'is-active': group.id === activeDetailGroupId }"
        >
          <header class="group-header">
            <div>
              <span class="group-rank">{{ group.id }}</span>
              <h2>{{ group.name }}</h2>
              <p>12 名干员等概率 · 期望 {{ formatScore(group.expected) }} · 风险 {{ formatScore(group.standardDeviation) }}</p>
            </div>
            <div class="group-header-score">
              <span>{{ !accountCompletion.allMax && group.decisionRank === 1 ? "当前推荐" : "期望分" }}</span>
              <strong>{{ formatScore(group.expected) }}</strong>
              <small>抽取权重 {{ formatPercent(group.probability * 100) }}</small>
            </div>
          </header>

          <div class="group-overview">
            <span>最佳候选 <b>{{ group.bestOperator?.name || "暂无" }}</b></span>
            <span v-if="accountCompletion.allOwned && !accountCompletion.allMax">
              可提升潜能 <b>{{ formatPercent(group.potentialUpgradeProbability * 100) }}（{{ group.potentialUpgradeCount }}/12）</b>
            </span>
            <span v-else>当前排序 <b>第 {{ group.decisionRank }} 位</b></span>
          </div>

          <section class="group-focus" aria-label="本组评分靠前的候选">
            <div class="group-focus-heading">
              <span>本组评分靠前的候选</span>
            </div>
            <div class="group-focus-operators">
              <article v-for="operator in group.topOperators" :key="operator.charId" class="group-focus-operator">
                <OperatorAvatar :char-id="operator.charId" :rarity="operator.rarity" :size="50" :mobile-size="46" :border="true" />
                <div>
                  <strong>{{ operator.name }}</strong>
                  <span>{{ formatScore(operator.finalScore) }} 分</span>
                </div>
              </article>
            </div>
          </section>

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
                    <span
                      v-if="getGradeNote(operator)"
                      class="grade-note"
                      :class="{ 'is-limited': operator.hasLimitedEquip, 'is-x-without-limited': !operator.hasLimitedEquip && operator.combatGrade === 'X' }"
                      :title="getGradeNoteTitle(operator)"
                      >{{ getGradeNote(operator) }}</span
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
    </template>

    <section v-if="loading" class="loading-state">
      <v-progress-circular indeterminate color="primary" />
      <span>正在整理干员数据...</span>
    </section>

    <section class="method-note">
      <div>
        <strong>计算口径</strong>
        <span>X/S/A/B/C 对应 5/4/3/2/1 分；通用维度为作战与基建平均值；四组均按 1/12 等概率计算。</span>
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

.detail-page {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  margin: -24px clamp(-36px, -2.5vw, -12px) 0;
  padding: clamp(28px, 6vw, 64px) clamp(18px, 5vw, 72px) calc(clamp(28px, 6vw, 64px) + env(safe-area-inset-bottom, 0px));
  background: var(--page-bg, #f4f6f8);
  color: var(--text, #1f2937);
  min-height: 100%;
  gap: 16px;
}

.detail-page-eyebrow {
  display: block;
  color: #c66c1b;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.08em;
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
  cursor: pointer;
  font: inherit;
  font-size: 14px;
  font-weight: 800;
  line-height: 1.1;
}

.detail-tab small {
  margin-left: 2px;
  font-size: 11px;
  font-weight: 600;
}

.detail-tab.is-active {
  border-color: #2878c8;
  background: #2878c8;
  color: #fff;
}

.detail-page-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  padding: 8px 0;
}

.detail-page-header h1 {
  margin: 6px 0 0;
  font-size: clamp(28px, 4vw, 44px);
  line-height: 1.15;
}

.detail-page-header p {
  margin: 8px 0 0;
  color: var(--muted, #6b7280);
  font-size: 13px;
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

.page-48-12-1-toolbar,
.method-note,
.group-header,
.page-48-12-1-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
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

.page-48-12-1-toolbar,
.method-note,
.group-section,
.page-48-12-1-footer {
  border: 1px solid var(--border);
  background: var(--surface);
}

.page-48-12-1-toolbar {
  flex-wrap: wrap;
  margin-top: 16px;
  padding: 12px 16px;
  border-radius: 6px;
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

.page-48-12-1-alert {
  margin-top: 12px;
}

.operator-dimensions,
.operator-stats {
  display: flex;
  align-items: center;
  gap: 8px;
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
}

.detail-page .group-section {
  min-width: 0;
}

.detail-page .operator-grid {
  grid-template-columns: 1fr;
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

.group-header-score small {
  display: block;
  margin-top: 4px;
  color: var(--muted);
  font-size: 11px;
}

.group-overview {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  padding: 12px 18px;
  border-bottom: 1px solid var(--border);
  color: var(--muted);
  font-size: 12px;
}

.group-overview b {
  color: var(--text);
}

.group-focus {
  padding: 14px 18px 16px;
  border-bottom: 1px solid var(--border);
  background: var(--surface-soft);
}

.group-focus-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.group-focus-heading h3 {
  margin: 0;
  font-size: 14px;
}

.group-focus-heading span {
  color: var(--muted);
  font-size: 11px;
}

.group-focus-operators {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-top: 10px;
}

.group-focus-operator {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 7px;
  padding: 7px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--surface);
}

.group-focus-operator > div {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
}

.group-focus-operator strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
}

.group-focus-operator span {
  color: var(--muted);
  font-size: 10px;
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

.grade-note.is-x-without-limited {
  background: rgba(168, 85, 247, 0.12);
  color: #9427fa;
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

  .method-note {
    display: block;
  }

  .detail-page {
    margin-right: -10px;
    margin-left: -10px;
    padding: 28px 18px calc(24px + env(safe-area-inset-bottom, 0px));
  }

  .detail-page {
    min-height: max(calc(100svh - 64px), 0px);
    min-height: max(calc(100svh - 64px), calc(100dvh - 64px));
  }

  .detail-page .detail-tabs {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 6px;
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

  .detail-page {
    justify-content: flex-start;
  }

  .detail-page-header {
    align-items: flex-start;
    flex-direction: column;
    gap: 14px;
  }

  .group-focus-operators {
    grid-template-columns: repeat(3, minmax(0, 1fr));
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
  .page-48-12-1-toolbar {
    align-items: flex-start;
  }

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

  .group-focus-operator {
    flex-direction: column;
    justify-content: center;
    text-align: center;
  }

  .group-focus-operator > div {
    align-items: center;
  }
}
</style>
