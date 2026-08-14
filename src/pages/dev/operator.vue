<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";

import operatorDataAPI from "/src/api/operatorData.js";
import OperatorAvatar from "/src/components/sprite/OperatorAvatar.vue";
import { operatorTableV2 } from "/src/utils/gameData.js";
import { createMessage } from "/src/utils/message.js";
import {
  RIIC_MANUAL_OPERATOR_SOURCE_KEY,
  readRiicManualOperatorSnapshot,
  saveRiicManualOperatorSnapshot,
} from "/src/utils/riicManualOperatorData.js";

const RIIC_ACTIVE_OPERATOR_SOURCE_STORAGE_KEY = "riic_operator_source_v1";
const router = useRouter();

const searchKeyword = ref("");
const selectedRarity = ref("all");
const ownedOnly = ref(false);
const operatorStates = ref({});
const loadingInitialData = ref(false);
const saving = ref(false);

const maxLevelByRarityAndElite = {
  6: [50, 80, 90],
  5: [50, 70, 80],
  4: [45, 60, 70],
  3: [40, 55, 55],
  2: [30, 30, 30],
  1: [30, 30, 30],
};

const rarityOptions = [
  { value: "all", label: "全部" },
  { value: "6", label: "6 星" },
  { value: "5", label: "5 星" },
  { value: "4", label: "4 星" },
  { value: "3", label: "3 星" },
];

const operatorRows = Object.entries(operatorTableV2)
  .filter(([, operator]) => operator?.name)
  .map(([charId, operator]) => ({
    charId,
    name: operator.name,
    rarity: Number(operator.rarity) || 1,
    profession: operator.profession || "",
  }))
  .sort(
    (left, right) =>
      right.rarity - left.rarity || left.name.localeCompare(right.name, "zh-CN"),
  );

const ownedCount = computed(
  () =>
    Object.values(operatorStates.value).filter((operator) => operator.own)
      .length,
);
const elite2Count = computed(
  () =>
    Object.values(operatorStates.value).filter(
      (operator) => operator.own && operator.elite === 2,
    ).length,
);
const filteredOperators = computed(() => {
  const keyword = searchKeyword.value.trim().toLocaleLowerCase();

  return operatorRows.filter((operator) => {
    const state = operatorStates.value[operator.charId];

    if (selectedRarity.value !== "all") {
      return (
        operator.rarity === Number(selectedRarity.value) &&
        (!ownedOnly.value || state?.own) &&
        (!keyword ||
          operator.name.toLocaleLowerCase().includes(keyword) ||
          operator.charId.toLocaleLowerCase().includes(keyword))
      );
    }

    return (
      (!ownedOnly.value || state?.own) &&
      (!keyword ||
        operator.name.toLocaleLowerCase().includes(keyword) ||
        operator.charId.toLocaleLowerCase().includes(keyword))
    );
  });
});

function createEmptyStates() {
  return Object.fromEntries(
    operatorRows.map((operator) => [
      operator.charId,
      {
        own: false,
        elite: 0,
      },
    ]),
  );
}

function applyOperatorData(records = []) {
  const nextStates = createEmptyStates();
  const recordMap = new Map(
    records
      .filter((record) => record?.charId)
      .map((record) => [record.charId, record]),
  );

  for (const operator of operatorRows) {
    const record = recordMap.get(operator.charId);
    if (!record) {
      continue;
    }

    const own = record.own !== false;
    nextStates[operator.charId] = {
      own,
      elite: own
        ? Math.min(2, Math.max(0, Number(record.elite) || 0))
        : 0,
    };
  }

  operatorStates.value = nextStates;
}

function getStageLevel(rarity, elite) {
  return maxLevelByRarityAndElite[rarity]?.[elite] || 1;
}

function updateOwned(operator, own) {
  const state = operatorStates.value[operator.charId];
  state.own = own === true;
  if (!state.own) {
    state.elite = 0;
  }
}

function updateElite(operator, elite) {
  const state = operatorStates.value[operator.charId];
  state.elite = Number(elite) || 0;
}

function createManualRoster() {
  return operatorRows.flatMap((operator) => {
    const state = operatorStates.value[operator.charId];
    if (!state?.own) {
      return [];
    }

    const elite = Math.min(2, Math.max(0, Number(state.elite) || 0));
    return [
      {
        charId: operator.charId,
        name: operator.name,
        rarity: operator.rarity,
        own: true,
        potential: 1,
        elite,
        level: getStageLevel(operator.rarity, elite),
      },
    ];
  });
}

async function saveRoster({ notify = true } = {}) {
  saving.value = true;

  try {
    const snapshot = saveRiicManualOperatorSnapshot(createManualRoster());
    localStorage.setItem(
      RIIC_ACTIVE_OPERATOR_SOURCE_STORAGE_KEY,
      RIIC_MANUAL_OPERATOR_SOURCE_KEY,
    );

    if (notify) {
      createMessage({
        type: "success",
        text: `已保存 ${snapshot.operators.length} 名干员，并设为排班表数据源`,
      });
    }
  } catch (error) {
    console.error("save manual RIIC roster failed", error);
    createMessage({ type: "error", text: "保存干员数据失败" });
  } finally {
    saving.value = false;
  }
}

async function openScheduleGenerator() {
  await saveRoster({ notify: false });
  router.push("/tools/scheduleV3");
}

function clearOwnedOperators() {
  if (!window.confirm("确认将全部干员设为未持有吗？")) {
    return;
  }

  operatorStates.value = createEmptyStates();
}

function readSklandSessionOperators() {
  try {
    const raw = sessionStorage.getItem("skland_account_data");
    if (!raw) {
      return [];
    }

    const accountData = JSON.parse(raw);
    return Array.isArray(accountData?.operatorDataList)
      ? accountData.operatorDataList
      : [];
  } catch (error) {
    console.error("read Skland account data failed", error);
    return [];
  }
}

async function loadInitialData() {
  const manualSnapshot = readRiicManualOperatorSnapshot();
  if (manualSnapshot) {
    applyOperatorData(manualSnapshot.operators);
    return;
  }

  const sklandOperators = readSklandSessionOperators();
  if (sklandOperators.length > 0) {
    applyOperatorData(sklandOperators);
    return;
  }

  if (!localStorage.getItem("USER_TOKEN")) {
    return;
  }

  loadingInitialData.value = true;
  try {
    const response = await operatorDataAPI.getOperatorData();
    applyOperatorData(response?.data || []);
  } catch (error) {
    console.error("load account operator data failed", error);
    createMessage({ type: "warning", text: "未能读取账号干员数据，请手动编辑" });
  } finally {
    loadingInitialData.value = false;
  }
}

onMounted(() => {
  operatorStates.value = createEmptyStates();
  void loadInitialData();
});
</script>

<template>
  <main class="operator-roster-editor">
    <header class="operator-roster-header">
      <div>
        <p class="operator-roster-kicker">开发工具</p>
        <h1>排班干员编辑</h1>
      </div>
      <div class="operator-roster-actions">
        <v-btn
          icon
          variant="text"
          aria-label="返回开发页面"
          @click="router.push('/dev')"
        >
          <v-icon>mdi-arrow-left</v-icon>
        </v-btn>
        <v-btn
          variant="outlined"
          color="error"
          :disabled="loadingInitialData"
          @click="clearOwnedOperators"
        >
          全部设为未持有
        </v-btn>
        <v-btn
          color="primary"
          :loading="saving"
          :disabled="loadingInitialData"
          @click="saveRoster()"
        >
          <v-icon start>mdi-content-save-outline</v-icon>
          保存为排班数据源
        </v-btn>
      </div>
    </header>

    <section class="operator-roster-summary">
      <span>持有 {{ ownedCount }} / {{ operatorRows.length }}</span>
      <span>精二 {{ elite2Count }}</span>
      <v-btn
        color="secondary"
        variant="tonal"
        :loading="saving"
        :disabled="loadingInitialData"
        @click="openScheduleGenerator"
      >
        前往排班生成
        <v-icon end>mdi-arrow-right</v-icon>
      </v-btn>
    </section>

    <section class="operator-roster-toolbar">
      <v-text-field
        v-model="searchKeyword"
        label="搜索干员"
        density="compact"
        variant="outlined"
        hide-details
        clearable
        prepend-inner-icon="mdi-magnify"
      ></v-text-field>
      <v-btn-toggle
        v-model="selectedRarity"
        color="primary"
        density="compact"
        mandatory
        class="operator-rarity-toggle"
      >
        <v-btn
          v-for="option in rarityOptions"
          :key="option.value"
          :value="option.value"
          variant="text"
        >
          {{ option.label }}
        </v-btn>
      </v-btn-toggle>
      <v-switch
        v-model="ownedOnly"
        label="仅看持有"
        color="primary"
        hide-details
        inset
        density="compact"
      ></v-switch>
    </section>

    <div v-if="loadingInitialData" class="operator-roster-loading">
      <v-progress-circular indeterminate color="primary"></v-progress-circular>
    </div>

    <section v-else class="operator-roster-grid">
      <article
        v-for="operator in filteredOperators"
        :key="operator.charId"
        class="operator-roster-row"
        :class="{
          'is-owned': operatorStates[operator.charId]?.own,
          'is-unowned': !operatorStates[operator.charId]?.own,
        }"
      >
        <OperatorAvatar
          :char-id="operator.charId"
          :size="42"
          :mobile-size="38"
        ></OperatorAvatar>
        <div class="operator-roster-name">
          <strong>{{ operator.name }}</strong>
          <span>{{ operator.rarity }} 星</span>
        </div>
        <v-switch
          :model-value="operatorStates[operator.charId]?.own"
          color="primary"
          hide-details
          inset
          density="compact"
          aria-label="是否持有"
          @update:model-value="updateOwned(operator, $event)"
        ></v-switch>
        <v-btn-toggle
          :model-value="operatorStates[operator.charId]?.elite"
          color="primary"
          density="compact"
          mandatory
          :disabled="!operatorStates[operator.charId]?.own"
          class="operator-elite-toggle"
          @update:model-value="updateElite(operator, $event)"
        >
          <v-btn :value="0" variant="text">精0</v-btn>
          <v-btn :value="1" variant="text">精1</v-btn>
          <v-btn :value="2" variant="text">精2</v-btn>
        </v-btn-toggle>
      </article>
    </section>

    <p v-if="!loadingInitialData && filteredOperators.length === 0" class="operator-roster-empty">
      没有符合条件的干员
    </p>
  </main>
</template>

<style scoped>
.operator-roster-editor {
  --operator-page-background: #f3f5f8;
  --operator-panel-background: #ffffff;
  --operator-border-color: #dfe3eb;
  --operator-heading-color: #172033;
  --operator-text-color: #596276;
  --operator-muted-color: #7b8496;

  min-height: 100vh;
  padding: 28px 24px 48px;
  background: var(--operator-page-background);
}

.operator-roster-header,
.operator-roster-summary,
.operator-roster-toolbar,
.operator-roster-grid,
.operator-roster-loading,
.operator-roster-empty {
  max-width: 1180px;
  margin-right: auto;
  margin-left: auto;
}

.operator-roster-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 18px;
}

.operator-roster-kicker {
  margin: 0 0 5px;
  color: #18866b;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
}

.operator-roster-header h1 {
  margin: 0;
  color: var(--operator-heading-color);
  font-size: 28px;
  line-height: 1.2;
}

.operator-roster-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
}

.operator-roster-summary {
  display: flex;
  align-items: center;
  gap: 16px;
  min-height: 48px;
  margin-bottom: 14px;
  padding: 8px 12px;
  border: 1px solid var(--operator-border-color);
  border-radius: 6px;
  background: var(--operator-panel-background);
  color: var(--operator-text-color);
  font-size: 14px;
  font-weight: 700;
}

.operator-roster-summary .v-btn {
  margin-left: auto;
}

.operator-roster-toolbar {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) auto auto;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--operator-border-color);
}

.operator-rarity-toggle {
  max-width: 100%;
  overflow-x: auto;
}

.operator-roster-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.operator-roster-row {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) 52px auto;
  align-items: center;
  gap: 8px;
  min-height: 64px;
  padding: 8px 10px;
  border: 1px solid var(--operator-border-color);
  border-radius: 6px;
  background: var(--operator-panel-background);
}

.operator-roster-row.is-unowned {
  opacity: 0.64;
}

.operator-roster-row.is-owned {
  border-left: 3px solid #18866b;
  padding-left: 8px;
}

.operator-roster-name {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.operator-roster-name strong,
.operator-roster-name span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.operator-roster-name strong {
  color: var(--operator-heading-color);
  font-size: 14px;
  line-height: 1.25;
}

.operator-roster-name span {
  color: var(--operator-muted-color);
  font-size: 12px;
  line-height: 1.2;
}

.operator-elite-toggle {
  white-space: nowrap;
}

.operator-roster-loading,
.operator-roster-empty {
  display: flex;
  justify-content: center;
  padding: 48px 0;
  color: var(--operator-muted-color);
}

@media (max-width: 900px) {
  .operator-roster-toolbar {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .operator-roster-toolbar > .v-input {
    grid-column: span 2;
  }
}

@media (max-width: 700px) {
  .operator-roster-editor {
    padding: 20px 12px 36px;
  }

  .operator-roster-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .operator-roster-actions {
    justify-content: flex-start;
  }

  .operator-roster-summary {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .operator-roster-summary .v-btn {
    margin-left: 0;
  }

  .operator-roster-toolbar {
    grid-template-columns: 1fr;
  }

  .operator-roster-toolbar > .v-input {
    grid-column: auto;
  }

  .operator-roster-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 430px) {
  .operator-roster-actions .v-btn:not(:first-child) {
    flex: 1 1 100%;
  }

  .operator-roster-row {
    grid-template-columns: 42px minmax(0, 1fr) 46px;
  }

  .operator-elite-toggle {
    grid-column: 2 / 4;
  }
}
</style>
