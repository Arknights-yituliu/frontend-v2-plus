<script setup>
import { computed, ref } from "vue";

import { operatorTableV2 } from "@/utils/gameData.js";
import { createDroneTargetBenefitSegment } from "@/utils/riic/l80-actual-settlement.js";

const droneCount = ref(100);
const roomFacility = ref("trading");
const roomLevel = ref(3);
const roomProductSelection = ref("lmd");
const operatorSlots = ref([
  { charId: "char_4032_provs", elite: 2, level: 1 },
  { charId: "char_486_takila", elite: 2, level: 1 },
  { charId: "", elite: 0, level: 1 },
]);

const facilityOptions = Object.freeze([
  { value: "trading", label: "贸易站" },
  { value: "manufacture", label: "制造站" },
]);
const productOptions = computed(() =>
  roomFacility.value === "trading"
    ? [
        { value: "lmd", product: "lmd", label: "龙门币" },
        { value: "orundum", product: "orundum", label: "搓玉" },
      ]
    : [
        { value: "experience", product: "experience", label: "经验书" },
        { value: "gold", product: "gold", label: "赤金" },
        {
          value: "orundum-orirock",
          product: "orundum",
          craftMaterial: "orirock",
          label: "源石碎片（固源岩）",
        },
        {
          value: "orundum-device",
          product: "orundum",
          craftMaterial: "device",
          label: "源石碎片（装置）",
        },
      ],
);
const selectedProduct = computed(
  () =>
    productOptions.value.find(
      (option) => option.value === roomProductSelection.value,
    ) || productOptions.value[0],
);
const operatorOptions = Object.freeze(
  Object.entries(operatorTableV2)
    .filter(([, operator]) => operator?.name)
    .map(([charId, operator]) => ({
      charId,
      name: operator.name,
    }))
    .sort((left, right) => left.name.localeCompare(right.name, "zh-CN")),
);
const roomOperators = computed(() =>
  operatorSlots.value
    .filter((operator) => operator.charId)
    .map((operator) => ({
      charId: operator.charId,
      elite: Number(operator.elite),
      level: Number(operator.level),
    })),
);
const calculation = computed(() => {
  const operators = roomOperators.value;

  return createDroneTargetBenefitSegment({
    room: {
      facility: roomFacility.value,
      stationLevel: Number(roomLevel.value),
      product: selectedProduct.value.product,
      operators,
    },
    droneOutput: Number(droneCount.value),
    tradingRosterById: new Map(
      operators.map((operator) => [operator.charId, operator]),
    ),
    orundumCraftMaterial: selectedProduct.value.craftMaterial || "orirock",
  });
});
const calculationText = computed(() =>
  JSON.stringify(calculation.value, null, 2),
);

function updateFacility(value) {
  roomFacility.value = value;
  if (
    !productOptions.value.some(
      (option) => option.value === roomProductSelection.value,
    )
  ) {
    roomProductSelection.value = productOptions.value[0].value;
  }
}
</script>

<template>
  <main class="riic-drone-test-page">
    <header class="riic-drone-test-heading">
      <RouterLink
        to="/riicdev"
        class="riic-drone-test-back"
        aria-label="返回 RIIC 测试入口"
      >
        <v-icon icon="mdi-arrow-left" size="22"></v-icon>
      </RouterLink>
      <h1>无人机测试</h1>
    </header>

    <div class="riic-drone-test-content">
      <section class="riic-drone-inputs" aria-label="无人机计算输入">
        <el-form label-position="top">
          <div class="riic-drone-field-grid">
            <el-form-item label="无人机数量">
              <el-input-number
                v-model="droneCount"
                :min="0"
                controls-position="right"
              ></el-input-number>
            </el-form-item>
            <el-form-item label="房间">
              <el-select :model-value="roomFacility" @update:model-value="updateFacility">
                <el-option
                  v-for="option in facilityOptions"
                  :key="option.value"
                  :label="option.label"
                  :value="option.value"
                ></el-option>
              </el-select>
            </el-form-item>
            <el-form-item label="房间等级">
              <el-input-number
                v-model="roomLevel"
                :min="1"
                :max="3"
                controls-position="right"
              ></el-input-number>
            </el-form-item>
            <el-form-item label="产物">
              <el-select v-model="roomProductSelection">
                <el-option
                  v-for="option in productOptions"
                  :key="option.value"
                  :label="option.label"
                  :value="option.value"
                ></el-option>
              </el-select>
            </el-form-item>
          </div>
        </el-form>

        <section class="riic-drone-operators">
          <h2>干员</h2>
          <div class="riic-drone-operator-list">
            <div
              v-for="(operator, index) in operatorSlots"
              :key="index"
              class="riic-drone-operator-row"
            >
              <el-select
                v-model="operator.charId"
                filterable
                clearable
                placeholder="选择干员"
              >
                <el-option
                  v-for="option in operatorOptions"
                  :key="option.charId"
                  :label="option.name"
                  :value="option.charId"
                ></el-option>
              </el-select>
              <el-radio-group v-model="operator.elite">
                <el-radio-button :label="0">E0</el-radio-button>
                <el-radio-button :label="1">E1</el-radio-button>
                <el-radio-button :label="2">E2</el-radio-button>
              </el-radio-group>
              <el-input-number
                v-model="operator.level"
                :min="1"
                controls-position="right"
              ></el-input-number>
            </div>
          </div>
        </section>
      </section>

      <section class="riic-drone-result" aria-label="无人机计算结果">
        <h2>计算结果</h2>
        <pre>{{ calculationText }}</pre>
      </section>
    </div>
  </main>
</template>

<style scoped>
.riic-drone-test-page {
  width: min(1080px, calc(100% - 32px));
  margin: 32px auto;
}

.riic-drone-test-heading {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 42px;
  border-bottom: 1px solid var(--c-border-color);
}

.riic-drone-test-heading h1,
.riic-drone-operators h2,
.riic-drone-result h2 {
  margin: 0;
  color: var(--c-text-color);
}

.riic-drone-test-heading h1 {
  font-size: 24px;
  line-height: 1.35;
}

.riic-drone-test-back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  color: var(--c-text-color);
  text-decoration: none;
}

.riic-drone-test-back:hover {
  color: var(--riic-blue, #2878c8);
}

.riic-drone-test-content {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(360px, 0.9fr);
  gap: 24px;
  padding-top: 24px;
}

.riic-drone-inputs,
.riic-drone-result {
  min-width: 0;
}

.riic-drone-field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 16px;
}

.riic-drone-field-grid :deep(.el-input-number),
.riic-drone-field-grid :deep(.el-select) {
  width: 100%;
}

.riic-drone-operators,
.riic-drone-result {
  padding-top: 18px;
  border-top: 1px solid var(--c-border-color);
}

.riic-drone-operators h2,
.riic-drone-result h2 {
  margin-bottom: 12px;
  font-size: 16px;
  line-height: 1.4;
}

.riic-drone-operator-list {
  display: grid;
  gap: 8px;
}

.riic-drone-operator-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto 116px;
  gap: 8px;
  align-items: center;
}

.riic-drone-operator-row :deep(.el-input-number) {
  width: 116px;
}

.riic-drone-result pre {
  min-height: 360px;
  margin: 0;
  padding: 14px;
  overflow: auto;
  border: 1px solid var(--c-border-color);
  border-radius: 4px;
  background: var(--c-page-background-color-secondary);
  color: var(--c-text-color);
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
}

@media (max-width: 820px) {
  .riic-drone-test-content {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  .riic-drone-test-page {
    width: min(100% - 24px, 1080px);
    margin: 20px auto;
  }

  .riic-drone-field-grid {
    grid-template-columns: 1fr;
  }

  .riic-drone-operator-row {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .riic-drone-operator-row :deep(.el-select) {
    grid-column: 1 / -1;
  }
}
</style>
