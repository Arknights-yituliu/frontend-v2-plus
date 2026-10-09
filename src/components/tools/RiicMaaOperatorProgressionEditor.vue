<script setup>
import { computed, reactive, ref, watch } from "vue";
import { ElMessage } from "element-plus";
import OperatorAvatar from "/src/components/sprite/OperatorAvatar.vue";
import { operatorTableV2 } from "/src/utils/gameData.js";
import BUILDING_TABLE from "/src/static/json/build/building_table.json";
import PROFESSION_DICT from "/src/static/json/operator/profession_dict.json";
import {
  getRiicSetAssessmentSource,
  readRiicSetAssessmentWorkspace,
  RIIC_SET_ASSESSMENT_STORAGE_KEYS,
} from "/src/utils/riicSetAssessmentWorkspace.js";
import {
  RIIC_MANUAL_OPERATOR_SOURCE_KEY,
  readRiicManualOperatorSnapshot,
} from "/src/utils/riicManualOperatorData.js";
import { parseRiicMaaOperatorBox } from "/src/utils/riicMaaOperatorData.js";

const emit = defineEmits(["profiles-change", "update:treatSkillsAsUnlocked"]);
const props = defineProps({
  treatSkillsAsUnlocked: { type: Boolean, default: true },
});

const MAX_LEVEL_BY_RARITY_AND_ELITE = Object.freeze({
  1: [30, 30, 30],
  2: [30, 30, 30],
  3: [40, 55, 55],
  4: [45, 60, 70],
  5: [50, 70, 80],
  6: [50, 80, 90],
});

const professionLabelByValue = new Map();
const branchLabelByValue = new Map();
for (const profession of PROFESSION_DICT) {
  professionLabelByValue.set(profession.value, profession.label);
  for (const branch of profession.children || []) {
    branchLabelByValue.set(branch.value, branch.label);
  }
}

const skillOrderById = new Map();
BUILDING_TABLE.forEach((skill, index) => {
  if (skill?.charId && !skillOrderById.has(skill.charId)) {
    skillOrderById.set(skill.charId, index);
  }
});

const allOperators = Object.entries(operatorTableV2)
  .map(([charId, operator], tableIndex) => ({
    charId,
    name: operator?.name || charId,
    rarity: Number(operator?.rarity) || 1,
    profession: operator?.profession || "",
    branch: operator?.subProfessionId || "",
    implementationTime: Number(operator?.updateTime || operator?.date || 0),
    tableIndex,
  }))
  .filter((operator) => operator.name)
  .sort((left, right) => {
    const leftDay = Math.floor(left.implementationTime / 86_400_000);
    const rightDay = Math.floor(right.implementationTime / 86_400_000);
    const dateOrder = rightDay - leftDay;
    if (dateOrder !== 0) {
      return dateOrder;
    }
    const leftSkillOrder = skillOrderById.get(left.charId);
    const rightSkillOrder = skillOrderById.get(right.charId);
    if (leftSkillOrder !== undefined && rightSkillOrder !== undefined) {
      return leftSkillOrder - rightSkillOrder;
    }
    if (leftSkillOrder !== undefined) {
      return -1;
    }
    if (rightSkillOrder !== undefined) {
      return 1;
    }
    return left.tableIndex - right.tableIndex;
  });

function readSelectedWebsiteSource() {
  let storedSourceId = "";
  try {
    storedSourceId =
      localStorage.getItem(RIIC_SET_ASSESSMENT_STORAGE_KEYS.activeSource) || "";
  } catch {
    // Use the workspace's default source when browser storage is unavailable.
  }

  if (storedSourceId === RIIC_MANUAL_OPERATOR_SOURCE_KEY) {
    const snapshot = readRiicManualOperatorSnapshot();
    return {
      id: storedSourceId,
      label: "手动编辑",
      operators: snapshot?.operators || [],
    };
  }

  const workspace = readRiicSetAssessmentWorkspace();
  const sourceId = storedSourceId === "maa"
    ? storedSourceId
    : workspace.activeSourceId;
  const lookupId = sourceId === "maa" ? "custom-maa-legacy" : sourceId;
  const source =
    getRiicSetAssessmentSource(workspace, lookupId) ||
    (sourceId === "maa"
      ? workspace.sources.find((item) => item.type === "maa")
      : null);

  return source
    ? {
        id: source.id,
        label: source.label || source.fileName || source.id,
        operators: source.operators || [],
      }
    : {
        id: lookupId,
        label: "当前选中的网页干员数据源不可用",
        operators: [],
      };
}

const sourceMode = ref("website");
const websiteSource = ref(readSelectedWebsiteSource());
const websiteOverridesBySource = reactive({});
const maaOverrides = ref({});
const maaRecords = ref([]);
const maaOwnedIds = ref(new Set());
const maaFileName = ref("");
const maaWarnings = ref([]);
const maaImportError = ref("");
const searchText = ref("");
const hasExpandedProgression = ref(false);
const progressionOpen = ref(false);

const currentSourceRecords = computed(() => {
  if (sourceMode.value === "maa") {
    return maaRecords.value;
  }
  return (websiteSource.value.operators || []).map((operator) => ({
    ...operator,
    own: true,
  }));
});
const currentRecordsById = computed(
  () => new Map(currentSourceRecords.value.map((operator) => [operator.charId, operator])),
);
const currentOverrides = computed(() => {
  if (sourceMode.value === "maa") {
    return maaOverrides.value;
  }
  const sourceId = websiteSource.value.id || "__no-selected-source__";
  return websiteOverridesBySource[sourceId] || {};
});
const currentSourceLabel = computed(() =>
  sourceMode.value === "maa"
    ? `MAA JSON · ${maaFileName.value}`
    : `网页存储 · ${websiteSource.value.label}`,
);
const profiles = computed(() => {
  const output = new Map();
  for (const operator of allOperators) {
    const baseline = currentRecordsById.value.get(operator.charId);
    const override = currentOverrides.value[operator.charId];
    const isOwned =
      sourceMode.value === "website" ||
      maaOwnedIds.value.has(operator.charId);
    if (!isOwned && !override) {
      continue;
    }

    const progression = resolveProgression(operator, baseline, override);
    if (!progression) {
      continue;
    }
    output.set(operator.charId, {
      charId: operator.charId,
      name: operator.name,
      rarity: operator.rarity,
      elite: progression.elite,
      level: progression.level,
    });
  }

  for (const [charId, override] of Object.entries(currentOverrides.value)) {
    if (output.has(charId)) {
      continue;
    }
    const operator = operatorTableV2[charId];
    if (!operator) {
      continue;
    }
    const metadata = allOperators.find((entry) => entry.charId === charId);
    const progression = resolveProgression(metadata, null, override);
    if (progression) {
      output.set(charId, {
        charId,
        name: operator.name || charId,
        rarity: Number(operator.rarity) || 1,
        elite: progression.elite,
        level: progression.level,
      });
    }
  }
  return [...output.values()];
});
const filteredOperators = computed(() => {
  const query = searchText.value.trim().toLocaleLowerCase();
  return query
    ? allOperators.filter(
        (operator) =>
          operator.name.toLocaleLowerCase().includes(query) ||
          operator.charId.toLocaleLowerCase().includes(query),
      )
    : allOperators;
});

function getCurrentProgression(operator) {
  if (!operator) {
    return null;
  }
  return resolveProgression(
    operator,
    currentRecordsById.value.get(operator.charId),
    currentOverrides.value[operator.charId],
  );
}

function resolveProgression(operator, baseline, override) {
  if (!baseline && !override) {
    return null;
  }
  const rarity = Number(operator?.rarity || baseline?.rarity || 1);
  const elite = Number(override?.elite ?? baseline?.elite ?? 0);
  const caps = MAX_LEVEL_BY_RARITY_AND_ELITE[rarity] || [1, 1, 1];
  const rawLevel = override?.level ?? baseline?.level;
  const levelNumber = Number(rawLevel);
  const level = Number.isFinite(levelNumber)
    ? Math.min(levelNumber, caps[elite] ?? levelNumber)
    : caps[elite] ?? caps[0];
  return { elite, level };
}

function getProgressionOptions(operator) {
  if (operator.rarity <= 2) {
    return [
      { value: 1, label: "Lv.1" },
      { value: 30, label: "Lv.30" },
    ];
  }
  const eliteLevels = operator.rarity === 3 ? [0, 1] : [0, 1, 2];
  return eliteLevels.map((value) => ({ value, label: `精 ${value}` }));
}

function getProgressionValue(operator) {
  const progression = getCurrentProgression(operator);
  if (!progression) {
    return null;
  }
  return operator.rarity <= 2 ? progression.level : progression.elite;
}

function hasProgressionOverride(charId) {
  return Boolean(currentOverrides.value[charId]);
}

function setProgression(operator, value) {
  const baseline = currentRecordsById.value.get(operator.charId);
  const previous = currentOverrides.value[operator.charId] || {};
  const next = { ...previous };
  if (operator.rarity <= 2) {
    next.level = Number(value);
  } else {
    next.elite = Number(value);
    if (!baseline && next.level === undefined) {
      const caps = MAX_LEVEL_BY_RARITY_AND_ELITE[operator.rarity] || [1, 1, 1];
      next.level = caps[next.elite] ?? caps[0];
    }
  }

  if (sourceMode.value === "maa") {
    maaOverrides.value = { ...maaOverrides.value, [operator.charId]: next };
  } else {
    const sourceId = websiteSource.value.id || "__no-selected-source__";
    const sourceOverrides = websiteOverridesBySource[sourceId] || {};
    websiteOverridesBySource[sourceId] = {
      ...sourceOverrides,
      [operator.charId]: next,
    };
  }
}

function resetProgression(charId) {
  if (sourceMode.value === "maa") {
    const next = { ...maaOverrides.value };
    delete next[charId];
    maaOverrides.value = next;
    return;
  }
  const sourceId = websiteSource.value.id || "__no-selected-source__";
  const next = { ...(websiteOverridesBySource[sourceId] || {}) };
  delete next[charId];
  websiteOverridesBySource[sourceId] = next;
}

function getSourceStatus(operator) {
  const record = currentRecordsById.value.get(operator.charId);
  if (!record) {
    return "当前来源未记录";
  }
  if (sourceMode.value === "maa" && !maaOwnedIds.value.has(operator.charId)) {
    return "MAA 标记未持有";
  }
  return "来源练度";
}

function getProfessionLabel(operator) {
  return professionLabelByValue.get(operator.profession) || operator.profession;
}

function getBranchLabel(operator) {
  return branchLabelByValue.get(operator.branch) || operator.branch;
}

function refreshWebsiteSource() {
  websiteSource.value = readSelectedWebsiteSource();
}

function handleProgressionToggle(event) {
  progressionOpen.value = event.target.open;
  if (progressionOpen.value) {
    hasExpandedProgression.value = true;
  }
}

function updateTreatSkillsAsUnlocked(value) {
  emit("update:treatSkillsAsUnlocked", value);
}

async function handleMaaFile(event) {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) {
    return;
  }

  maaImportError.value = "";
  try {
    const payload = JSON.parse((await file.text()).replace(/^\uFEFF/, ""));
    const parsed = parseRiicMaaOperatorBox(payload, operatorTableV2);
    if (payload.length === 0) {
      throw new Error("MAA Box 文件没有干员记录");
    }
    const ownedIds = new Set(parsed.operators.map((operator) => operator.charId));
    const records = new Map();
    for (const row of payload) {
      const charId = String(row?.id || "").trim();
      const tableOperator = operatorTableV2[charId];
      if (!charId || !tableOperator) {
        continue;
      }
      const record = {
        charId,
        name: tableOperator.name || row.name || charId,
        rarity: Number(tableOperator.rarity) || Number(row.rarity) || 1,
        elite: row.elite,
        level: row.level,
        own: ownedIds.has(charId),
      };
      const existing = records.get(charId);
      if (!existing || record.own) {
        records.set(charId, record);
      }
    }
    if (records.size === 0) {
      throw new Error("MAA Box 中没有可识别的干员");
    }
    maaRecords.value = [...records.values()];
    maaOwnedIds.value = ownedIds;
    maaFileName.value = file.name;
    maaWarnings.value = parsed.warnings;
    maaOverrides.value = {};
    sourceMode.value = "maa";
    ElMessage.success(`MAA JSON 已导入，共 ${records.size} 条干员数据`);
  } catch (error) {
    maaImportError.value = error?.message || "干员数据 JSON 读取失败";
  }
}

watch(
  profiles,
  (value) => emit("profiles-change", value),
  { immediate: true, deep: true },
);
</script>

<template>
  <section class="tool-section operator-progression-module">
    <div class="operator-progression-heading">
      <details class="operator-progression-disclosure" @toggle="handleProgressionToggle">
        <summary>
          <div>
            <h2>
              <span class="disclosure-chevron" aria-hidden="true">
                <v-icon class="disclosure-chevron-down" icon="mdi-chevron-down" size="18" />
                <v-icon class="disclosure-chevron-up" icon="mdi-chevron-up" size="18" />
              </span>
              干员练度
            </h2>
            <p>{{ allOperators.length }} 名干员 · {{ profiles.length }} 名已用于计算</p>
          </div>
        </summary>
      </details>
      <label class="switch-control operator-progression-skill-setting">
        <el-switch
          :model-value="props.treatSkillsAsUnlocked"
          @update:model-value="updateTreatSkillsAsUnlocked"
        />
        <span>强制按全技能已解锁计算</span>
      </label>
    </div>
    <div v-if="hasExpandedProgression" v-show="progressionOpen" class="operator-progression-content">
      <div class="operator-progression-toolbar">
        <el-radio-group v-model="sourceMode" size="small" aria-label="干员练度来源">
          <el-radio-button label="website">网页已选来源</el-radio-button>
          <el-radio-button label="maa" :disabled="maaRecords.length === 0">MAA JSON</el-radio-button>
        </el-radio-group>
        <label class="operator-file-control">
          <input type="file" accept=".json,application/json" @change="handleMaaFile" />
          <span>导入 MAA JSON</span>
        </label>
        <button type="button" class="secondary-button" @click="refreshWebsiteSource">
          <v-icon icon="mdi-refresh" size="17" />
          重新读取已选来源
        </button>
        <span class="operator-progression-source">{{ currentSourceLabel }}</span>
      </div>

      <ul v-if="maaWarnings.length" class="warning-list">
        <li v-for="(warning, index) in maaWarnings" :key="`maa:${index}`">{{ warning }}</li>
      </ul>
      <p v-if="maaImportError" class="error-message">{{ maaImportError }}</p>

      <el-input
        v-model="searchText"
        class="operator-progression-search"
        clearable
        placeholder="搜索干员名称或 ID"
        aria-label="搜索干员"
      >
        <template #prefix><v-icon icon="mdi-magnify" size="18" /></template>
      </el-input>

      <div class="operator-progression-list">
        <article v-for="operator in filteredOperators" :key="operator.charId" class="operator-progression-row">
          <div class="operator-progression-card-main">
            <OperatorAvatar :char-id="operator.charId" :rarity="operator.rarity" :size="42" :mobile-size="42" />
            <div class="operator-progression-identity">
              <strong>{{ operator.name }}</strong>
              <span class="operator-progression-metadata">
                {{ operator.rarity }} 星 · {{ getProfessionLabel(operator) }} · {{ getBranchLabel(operator) }}
              </span>
              <span class="operator-progression-source-level">
                {{ getSourceStatus(operator) }}
                <template v-if="getCurrentProgression(operator)">
                  · {{ operator.rarity <= 2 ? `Lv.${getCurrentProgression(operator).level}` : `精 ${getCurrentProgression(operator).elite} / Lv.${getCurrentProgression(operator).level}` }}
                </template>
              </span>
            </div>
          </div>
          <div class="operator-progression-controls">
            <el-radio-group
              :model-value="getProgressionValue(operator)"
              size="small"
              :aria-label="`${operator.name}练度`"
              @update:model-value="setProgression(operator, $event)"
            >
              <el-radio-button v-for="option in getProgressionOptions(operator)" :key="option.value" :label="option.value">
                {{ option.label }}
              </el-radio-button>
            </el-radio-group>
            <button
              type="button"
              class="icon-button operator-progression-reset"
              :disabled="!hasProgressionOverride(operator.charId)"
              :title="`重置${operator.name}练度`"
              :aria-label="`重置${operator.name}练度`"
              @click="resetProgression(operator.charId)"
            >
              <v-icon icon="mdi-backup-restore" size="18" />
            </button>
          </div>
        </article>
        <p v-if="filteredOperators.length === 0" class="empty-hint">没有匹配的干员。</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.operator-progression-module {
  margin-top: 14px;
  padding: 16px;
  border: 1px solid var(--maa-border, var(--c-border-color));
  border-radius: var(--maa-radius, 4px);
  background: var(--maa-panel, var(--c-card-background-color));
}

.operator-progression-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.operator-progression-skill-setting {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}
.operator-progression-skill-setting span {
  font-weight: 600;
}

.operator-progression-disclosure {
  flex: 1 1 auto;
  min-width: 0;
}

.operator-progression-disclosure > summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  list-style: none;
  cursor: pointer;
}

.operator-progression-disclosure > summary::-webkit-details-marker {
  display: none;
}

.operator-progression-disclosure h2,
.operator-progression-disclosure p {
  margin: 0;
}

.operator-progression-disclosure h2 {
  margin-bottom: 2px;
  font-size: 18px;
  line-height: 1.45;
}

.operator-progression-disclosure p {
  color: var(--c-text-color-secondary, #6b7280);
  line-height: 1.5;
}

.operator-progression-content {
  display: grid;
  gap: 12px;
  margin-top: 12px;
}

.operator-progression-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.operator-progression-source {
  color: var(--c-text-color-secondary, #6b7280);
  font-size: 13px;
}

.operator-file-control {
  position: relative;
  display: inline-flex;
  align-items: center;
  box-sizing: border-box;
  height: var(--maa-control-height, 36px);
  min-height: var(--maa-control-height, 36px);
  padding: 0 12px;
  border: 1px solid var(--maa-border, var(--c-border-color));
  border-radius: 3px;
  background: var(--maa-soft-panel, var(--c-page-background-color-secondary));
  color: var(--riic-blue, #2878c8);
  cursor: pointer;
  font-size: 13px;
}

.operator-file-control input {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
}
.operator-file-control:hover {
  border-color: var(--riic-blue, #2878c8);
  background: color-mix(in srgb, var(--riic-blue, #2878c8) 6%, var(--maa-panel, var(--c-card-background-color)));
}
.operator-file-control:focus-within {
  outline: 2px solid var(--riic-blue, #2878c8);
  outline-offset: 2px;
}
.operator-progression-search :deep(.el-input__wrapper) {
  min-height: var(--maa-compact-control-height, 32px);
  border-radius: 3px;
}
.secondary-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-sizing: border-box;
  height: var(--maa-control-height, 36px);
  min-height: var(--maa-control-height, 36px);
  padding: 0 12px;
  border: 1px solid color-mix(in srgb, var(--riic-blue, #2878c8) 42%, var(--maa-border, var(--c-border-color)));
  border-radius: 3px;
  background: color-mix(in srgb, var(--riic-blue, #2878c8) 8%, transparent);
  color: var(--riic-blue, #2878c8);
  font: inherit;
  cursor: pointer;
  transition: border-color 120ms ease, background-color 120ms ease;
}
.secondary-button:hover:not(:disabled) {
  border-color: var(--riic-blue, #2878c8);
  background: color-mix(in srgb, var(--riic-blue, #2878c8) 14%, transparent);
}
.secondary-button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.operator-progression-search {
  max-width: 420px;
}

.operator-progression-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 320px), 1fr));
  align-content: start;
  gap: 12px;
}

.operator-progression-row {
  display: grid;
  grid-template-rows: minmax(42px, auto) auto;
  gap: 8px;
  min-width: 0;
  padding: 12px;
  border: 1px solid var(--maa-border, var(--c-border-color));
  border-radius: 3px;
  background: var(--maa-soft-panel, var(--c-page-background-color-secondary));
}

.operator-progression-card-main {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
}

.operator-progression-identity {
  display: grid;
  min-width: 0;
  gap: 4px;
}

.operator-progression-identity strong {
  min-width: 0;
  white-space: nowrap;
}

.operator-progression-metadata,
.operator-progression-source-level {
  color: var(--c-text-color-secondary, #6b7280);
  font-size: 12px;
  line-height: 1.4;
  overflow-wrap: anywhere;
}

.operator-progression-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding-left: 52px;
}

.operator-progression-controls .el-radio-group {
  flex: 1 1 auto;
  flex-wrap: wrap;
}

.operator-progression-toolbar :deep(.el-radio-button__inner) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  height: var(--maa-control-height, 36px);
  min-height: var(--maa-control-height, 36px);
  padding: 0 12px;
  line-height: 1.4;
}

:deep(.operator-progression-controls .el-radio-button__inner) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  height: var(--maa-compact-control-height, 32px);
  min-height: var(--maa-compact-control-height, 32px);
  padding: 0 8px;
  border-radius: 0;
  line-height: 1.4;
}

.operator-progression-toolbar :deep(.el-radio-button:first-child .el-radio-button__inner),
:deep(.operator-progression-controls .el-radio-button:first-child .el-radio-button__inner) {
  border-radius: 3px 0 0 3px;
}

.operator-progression-toolbar :deep(.el-radio-button:last-child .el-radio-button__inner),
:deep(.operator-progression-controls .el-radio-button:last-child .el-radio-button__inner) {
  border-radius: 0 3px 3px 0;
}

:deep(.operator-progression-controls .el-radio-button:first-child:last-child .el-radio-button__inner) {
  border-radius: 3px;
}

.operator-progression-reset {
  width: 32px;
  height: 32px;
  flex: 0 0 32px;
}

.operator-progression-reset:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

@media (max-width: 480px) {
  .operator-progression-heading {
    align-items: flex-start;
    flex-direction: column;
  }
  .operator-progression-disclosure {
    width: 100%;
  }
  .operator-progression-list {
    grid-template-columns: minmax(0, 1fr);
  }
  .operator-progression-controls {
    padding-left: 0;
  }
}
</style>
