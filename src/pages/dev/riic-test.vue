<template>
  <main class="riic-test-page">
    <h1>RIIC 计算模块测试</h1>

    <el-tabs v-model="activeModule">
      <el-tab-pane label="P01 贸易站" name="p01">
        <section class="trading-workbench">
          <section class="trading-workspace-panel">
            <header class="trading-workspace-header">
              <div class="panel-heading">
                <img :src="lmdImage" alt="" class="panel-heading-icon" />
                <div>
                  <h2>贸易站收益</h2>
                  <p>按小时计算贸易站产出与资源消耗</p>
                </div>
              </div>
              <div class="station-settings">
                <div class="setting-group">
                  <span class="setting-label">订单类型</span>
                  <el-radio-group
                    :model-value="p01Product"
                    class="product-toggle"
                    @change="setP01Product"
                  >
                    <el-radio-button label="lmd">龙门币</el-radio-button>
                    <el-radio-button label="orundum">合成玉</el-radio-button>
                  </el-radio-group>
                </div>
                <div class="setting-group">
                  <span class="setting-label">等级</span>
                  <el-radio-group v-model="p01StationLevel" class="level-toggle">
                    <el-radio-button
                      v-for="level in [1, 2, 3]"
                      :key="level"
                      :label="level"
                      :disabled="p01Product === 'orundum' && level !== 3"
                    >
                      {{ level }}
                    </el-radio-button>
                  </el-radio-group>
                </div>
              </div>
            </header>

            <div class="trading-workspace-body">
              <section class="trading-input-panel">
                <div class="operator-heading">
                  <div>
                    <h2>入驻干员</h2>
                    <p class="section-hint">点击卡片启用，最多选择 3 名</p>
                  </div>
                  <span>{{ p01ActiveOperatorCount }}/3</span>
                </div>

                <div class="operator-row-list">
                  <div
                    v-for="operator in p01OperatorOptions"
                    :key="operator.charId"
                    class="drone-operator-row"
                    :class="{ active: p01OperatorStates[operator.charId].enabled }"
                    role="button"
                    tabindex="0"
                    @click="toggleP01Operator(operator.charId)"
                    @keydown.enter.prevent="toggleP01Operator(operator.charId)"
                    @keydown.space.prevent="toggleP01Operator(operator.charId)"
                  >
                    <OperatorAvatar
                      :char-id="operator.charId"
                      :rarity="operator.rarity"
                      :size="44"
                      :mobile-size="40"
                      border
                    />
                    <div class="operator-card-main">
                      <strong>{{ operator.name }}</strong>
                      <span>{{ operator.description }}</span>
                    </div>
                    <div
                      class="operator-elite-control"
                      :class="{ inactive: !p01OperatorStates[operator.charId].enabled }"
                      @click.stop
                    >
                      <el-radio-group
                        v-model="p01OperatorStates[operator.charId].elite"
                        size="small"
                        :disabled="!p01OperatorStates[operator.charId].enabled"
                      >
                        <el-radio-button :label="0">E0</el-radio-button>
                        <el-radio-button :label="1">E1</el-radio-button>
                        <el-radio-button :label="2">E2</el-radio-button>
                      </el-radio-group>
                    </div>
                    <el-input-number
                      v-model="p01OperatorStates[operator.charId].level"
                      class="operator-level-control"
                      :min="1"
                      :max="90"
                      :step="1"
                      controls-position="right"
                      :disabled="!p01OperatorStates[operator.charId].enabled"
                      @click.stop
                    />
                    <el-switch
                      :model-value="p01OperatorStates[operator.charId].enabled"
                      @click.stop
                      @update:model-value="setP01OperatorEnabled(operator.charId, $event)"
                    />
                  </div>
                </div>

                <div class="bonus-controls">
                  <label>
                    <span>设施额外加成</span>
                    <el-input-number
                      v-model="p01RoomBonus"
                      :min="-100"
                      :max="200"
                      :step="1"
                      controls-position="right"
                    />
                    <em>%</em>
                  </label>
                  <label>
                    <span>其他干员加成</span>
                    <el-input-number
                      v-model="p01OperatorBonus"
                      :min="-100"
                      :max="200"
                      :step="1"
                      controls-position="right"
                    />
                    <em>%</em>
                  </label>
                </div>
              </section>

              <section
                class="trading-result-panel"
                :class="{ 'has-error': !p01Result.ok }"
              >
                <div class="result-heading">
                  <div>
                    <span class="eyebrow">每小时结算</span>
                    <strong class="result-rate">
                      {{ p01Result.ok ? formatPercent(p01Result.rate) : "--" }}
                    </strong>
                  </div>
                  <el-tag :type="p01Result.ok ? 'success' : 'danger'" effect="plain">
                    {{ p01ResultStatus }}
                  </el-tag>
                </div>

                <div v-if="p01Result.ok" class="resource-result-list">
                  <div
                    v-for="resource in p01ResourceResults"
                    :key="resource.key"
                    class="resource-result"
                  >
                    <img :src="resource.image" :alt="resource.name" />
                    <span>{{ resource.name }}</span>
                    <strong :class="{ consumption: resource.value < 0 }">
                      {{ formatResultValue(resource.value) }}
                    </strong>
                  </div>
                </div>
                <p v-else class="result-error">{{ p01ResultStatus }}</p>
              </section>
            </div>

            <el-collapse class="raw-result-collapse">
              <el-collapse-item title="原始计算结果">
                <pre class="result-json">{{ p01ResultText }}</pre>
              </el-collapse-item>
            </el-collapse>
          </section>
        </section>
      </el-tab-pane>

      <el-tab-pane label="P02 无人机贸易站" name="p02">
        <section class="trading-drone-workbench">
          <section class="drone-workspace-panel">
            <header class="drone-workspace-header">
              <div class="panel-heading">
                <img :src="droneImage" alt="" class="panel-heading-icon" />
                <div>
                  <h2>无人机贸易站</h2>
                  <p>按单次无人机结算</p>
                </div>
              </div>
              <div class="station-settings">
                <div class="setting-group">
                  <span class="setting-label">订单类型</span>
                  <el-radio-group
                    :model-value="p02Product"
                    class="product-toggle"
                    @change="setP02Product"
                  >
                    <el-radio-button label="lmd">龙门币</el-radio-button>
                    <el-radio-button label="orundum">合成玉</el-radio-button>
                  </el-radio-group>
                </div>
                <div class="setting-group">
                  <span class="setting-label">等级</span>
                  <el-radio-group v-model="p02StationLevel" class="level-toggle">
                    <el-radio-button :label="1" :disabled="p02Product === 'orundum'">
                      1
                    </el-radio-button>
                    <el-radio-button :label="2" :disabled="p02Product === 'orundum'">
                      2
                    </el-radio-button>
                    <el-radio-button :label="3">3</el-radio-button>
                  </el-radio-group>
                </div>
              </div>
            </header>

            <div class="drone-workspace-body">
              <section class="drone-operators-panel">
                <div class="operator-heading">
                  <h2>入驻干员</h2>
                  <span>{{ p02ActiveOperatorCount }}/3</span>
                </div>

                <div class="operator-row-list">
                  <div
                    v-for="operator in p02OperatorOptions"
                    :key="operator.charId"
                    class="drone-operator-row"
                    :class="{ active: p02OperatorStates[operator.charId].enabled }"
                    role="button"
                    tabindex="0"
                    @click="toggleP02Operator(operator.charId)"
                    @keydown.enter.prevent="toggleP02Operator(operator.charId)"
                    @keydown.space.prevent="toggleP02Operator(operator.charId)"
                  >
                    <OperatorAvatar
                      :char-id="operator.charId"
                      :rarity="operator.rarity"
                      :size="44"
                      :mobile-size="40"
                      border
                    />
                    <div class="operator-card-main">
                      <strong>{{ operator.name }}</strong>
                      <span>{{ operator.description }}</span>
                    </div>
                    <div
                      class="operator-elite-control"
                      :class="{ inactive: !p02OperatorStates[operator.charId].enabled }"
                      @click.stop
                    >
                      <el-radio-group
                        v-model="p02OperatorStates[operator.charId].elite"
                        size="small"
                        :disabled="!p02OperatorStates[operator.charId].enabled"
                      >
                        <el-radio-button :label="0">E0</el-radio-button>
                        <el-radio-button :label="1">E1</el-radio-button>
                        <el-radio-button :label="2">E2</el-radio-button>
                      </el-radio-group>
                    </div>
                    <el-switch
                      :model-value="p02OperatorStates[operator.charId].enabled"
                      @click.stop
                      @update:model-value="setP02OperatorEnabled(operator.charId, $event)"
                    />
                  </div>
                </div>
              </section>

              <section
                class="drone-result-panel"
                :class="{ 'has-error': !p02Result.ok }"
              >
                <div class="result-heading">
                  <div>
                    <span class="eyebrow">单次无人机</span>
                    <div class="drone-cost">
                      <img :src="droneImage" alt="无人机" />
                      <strong>1</strong>
                    </div>
                  </div>
                  <el-tag :type="p02Result.ok ? 'success' : 'danger'" effect="plain">
                    {{ p02ResultStatus }}
                  </el-tag>
                </div>

                <div v-if="p02Result.ok" class="resource-result-list">
                  <div
                    v-for="resource in p02ResourceResults"
                    :key="resource.key"
                    class="resource-result"
                  >
                    <img :src="resource.image" :alt="resource.name" />
                    <span>{{ resource.name }}</span>
                    <strong :class="{ consumption: resource.value < 0 }">
                      {{ formatResultValue(resource.value) }}
                    </strong>
                  </div>
                </div>
                <p v-else class="result-error">{{ p02ResultStatus }}</p>
              </section>
            </div>

            <el-collapse class="raw-result-collapse">
              <el-collapse-item title="原始计算结果">
                <pre class="result-json">{{ p02ResultText }}</pre>
              </el-collapse-item>
            </el-collapse>
          </section>
        </section>
      </el-tab-pane>
    </el-tabs>
  </main>
</template>

<script setup>
import { computed, reactive, ref } from "vue";
import { ElMessage } from "element-plus";
import OperatorAvatar from "@/components/sprite/OperatorAvatar.vue";
import droneImage from "@/assets/images/riic-schedule-preview/drone.png";
import goldImage from "@/assets/images/riic-schedule-preview/gold.png";
import lmdImage from "@/assets/images/riic-schedule-preview/lmd.png";
import orundumImage from "@/assets/images/riic-schedule-preview/orundum.png";
import shardImage from "@/assets/images/riic-schedule-preview/originium-shard.png";
import { calculateRiicTrading } from "@/utils/riic/P01-riic-trading.js";
import { calculateRiicTradingDrone } from "@/utils/riic/P02-riic-trading-drone.js";

const activeModule = ref("p01");

const p01Product = ref("lmd");
const p01StationLevel = ref(3);
const p01RoomBonus = ref(0);
const p01OperatorBonus = ref(0);
const p01OperatorOptions = Object.freeze([
  {
    charId: "char_4228_closur",
    name: "可露希尔",
    rarity: 6,
    description: "精二固定获取特别订单",
  },
  {
    charId: "char_4032_provs",
    name: "但书",
    rarity: 5,
    description: "改变黄金订单交付数",
  },
  {
    charId: "char_486_takila",
    name: "龙舌兰",
    rarity: 5,
    description: "高品质订单额外龙门币",
  },
  {
    charId: "char_252_bibeak",
    name: "裁缝",
    rarity: 5,
    description: "三级站改变订单概率",
  },
  {
    charId: "char_502_nblade",
    name: "夜刀",
    rarity: 2,
    description: "订单获取效率 +30%",
  },
  {
    charId: "char_123_fang",
    name: "芬",
    rarity: 3,
    description: "订单获取效率 +30%",
  },
  {
    charId: "char_282_catap",
    name: "空爆",
    rarity: 3,
    description: "订单获取效率 +30%",
  },
  {
    charId: "char_103_angel",
    name: "能天使",
    rarity: 6,
    description: "订单获取效率 +30%",
  },
]);
const p01OperatorStates = reactive({
  char_4228_closur: { enabled: false, elite: 2, level: 1 },
  char_4032_provs: { enabled: false, elite: 2, level: 1 },
  char_486_takila: { enabled: false, elite: 2, level: 1 },
  char_252_bibeak: { enabled: false, elite: 2, level: 1 },
  char_502_nblade: { enabled: true, elite: 0, level: 30 },
  char_123_fang: { enabled: true, elite: 1, level: 1 },
  char_282_catap: { enabled: true, elite: 0, level: 1 },
  char_103_angel: { enabled: false, elite: 2, level: 1 },
});
const p01ActiveOperators = computed(() =>
  p01OperatorOptions
    .filter((operator) => p01OperatorStates[operator.charId].enabled)
    .map((operator) => ({
      charId: operator.charId,
      elite: p01OperatorStates[operator.charId].elite,
      level: p01OperatorStates[operator.charId].level,
    })),
);
const p01ActiveOperatorCount = computed(() => p01ActiveOperators.value.length);
const p01Result = computed(() =>
  calculateRiicTrading(
    {
      type: "trading",
      product: p01Product.value,
      level: p01StationLevel.value,
    },
    p01ActiveOperators.value,
    {
      room: p01RoomBonus.value,
      operators: p01OperatorBonus.value
        ? { extra: p01OperatorBonus.value }
        : {},
    },
  ),
);
const p01ResultText = computed(() =>
  JSON.stringify(p01Result.value, null, 2),
);
const p01ResultStatus = computed(() => {
  if (p01Result.value.ok) {
    return "计算完成";
  }

  const errorLabels = {
    invalidFacility: "设施配置无效",
    invalidOperators: "干员配置无效",
    invalidBonus: "加成配置无效",
    notSupported: "当前组合暂不支持计算",
    timeDependentOrderProbability: "订单概率随时间变化，暂不支持计算",
  };
  return errorLabels[p01Result.value.error] || p01Result.value.error || "计算失败";
});
const p01ResourceResults = computed(() => {
  const result = p01Result.value;
  if (!result.ok) {
    return [];
  }

  return [
    {
      key: "lmd",
      name: "龙门币",
      image: lmdImage,
      value: result.lmd,
    },
    {
      key: "gold",
      name: "赤金",
      image: goldImage,
      value: result.gold,
    },
    {
      key: "virtual-gold",
      name: "虚拟赤金",
      image: goldImage,
      value: result.virtualGold,
    },
    {
      key: "orundum",
      name: "合成玉产能",
      image: orundumImage,
      value: result.orundumCapacity,
    },
    {
      key: "shard",
      name: "源石碎片",
      image: shardImage,
      value: result.shardConsumption,
    },
  ].filter((resource) => resource.value !== null && resource.value !== 0);
});

const p02Product = ref("lmd");
const p02StationLevel = ref(3);
const p02OperatorOptions = Object.freeze([
  {
    charId: "char_4228_closur",
    name: "可露希尔",
    rarity: 6,
    description: "精二启用特殊订单",
  },
  {
    charId: "char_4032_provs",
    name: "但书",
    rarity: 5,
    description: "改变黄金订单消耗",
  },
  {
    charId: "char_486_takila",
    name: "龙舌兰",
    rarity: 5,
    description: "高品质订单额外龙门币",
  },
  {
    charId: "char_252_bibeak",
    name: "裁缝",
    rarity: 5,
    description: "三级站改变订单概率",
  },
]);
const p02OperatorStates = reactive({
  char_4228_closur: { enabled: false, elite: 2 },
  char_4032_provs: { enabled: true, elite: 2 },
  char_486_takila: { enabled: true, elite: 2 },
  char_252_bibeak: { enabled: false, elite: 2 },
});

const p02ActiveOperators = computed(() =>
  p02OperatorOptions
    .filter((operator) => p02OperatorStates[operator.charId].enabled)
    .map((operator) => ({
      charId: operator.charId,
      elite: p02OperatorStates[operator.charId].elite,
      level: 1,
    })),
);
const p02ActiveOperatorCount = computed(() => p02ActiveOperators.value.length);
const p02Result = computed(() =>
  calculateRiicTradingDrone(
    {
      type: "trading",
      product: p02Product.value,
      level: p02StationLevel.value,
    },
    p02ActiveOperators.value,
  ),
);
const p02ResultText = computed(() =>
  JSON.stringify(p02Result.value, null, 2),
);
const p02ResultStatus = computed(() => {
  if (p02Result.value.ok) {
    return "计算完成";
  }

  const errorLabels = {
    invalidFacility: "设施配置无效",
    invalidOperators: "干员配置无效",
    unsupportedStationLevel: "该订单仅支持 3 级贸易站",
    notSupported: "可露希尔精二特殊订单不能与当前干员组合",
  };
  return errorLabels[p02Result.value.error] || p02Result.value.error || "计算失败";
});
const p02ResourceResults = computed(() => {
  const result = p02Result.value;
  const resources = [
    {
      key: "lmd",
      name: "龙门币",
      image: lmdImage,
      value: result.lmdOutput,
    },
    {
      key: "gold",
      name: "赤金",
      image: goldImage,
      value: result.goldConsumption === null ? null : -result.goldConsumption,
    },
    {
      key: "orundum",
      name: "合成玉",
      image: orundumImage,
      value: result.orundumOutput,
    },
    {
      key: "shard",
      name: "源石碎片",
      image: shardImage,
      value: result.shardConsumption === null ? null : -result.shardConsumption,
    },
  ];

  return resources.filter((resource) => resource.value !== null && resource.value !== 0);
});

function setP01Product(product) {
  p01Product.value = product;
  if (product === "orundum") {
    p01StationLevel.value = 3;
  }
}

function setP01OperatorEnabled(charId, enabled) {
  const state = p01OperatorStates[charId];
  if (enabled && !state.enabled && p01ActiveOperatorCount.value >= 3) {
    ElMessage.warning("贸易站最多选择 3 名干员");
    return;
  }
  state.enabled = enabled;
}

function toggleP01Operator(charId) {
  const state = p01OperatorStates[charId];
  setP01OperatorEnabled(charId, !state.enabled);
}

function setP02Product(product) {
  p02Product.value = product;
  if (product === "orundum") {
    p02StationLevel.value = 3;
  }
}

function setP02OperatorEnabled(charId, enabled) {
  const state = p02OperatorStates[charId];
  if (enabled && !state.enabled && p02ActiveOperatorCount.value >= 3) {
    ElMessage.warning("贸易站最多选择 3 名干员");
    return;
  }
  state.enabled = enabled;
}

function toggleP02Operator(charId) {
  const state = p02OperatorStates[charId];
  setP02OperatorEnabled(charId, !state.enabled);
}

function formatResultValue(value) {
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${Number(value).toFixed(3).replace(/\.?0+$/, "")}`;
}

function formatPercent(value) {
  return `${Number(value).toFixed(2).replace(/\.?0+$/, "")}%`;
}

</script>

<style scoped>
.riic-test-page {
  max-width: 1080px;
  margin: 0 auto;
  padding: 24px;
}

.riic-test-page h1 {
  margin: 0 0 20px;
  font-size: 22px;
  font-weight: 600;
}

.module-panel {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.module-panel > :last-child {
  grid-column: 1 / -1;
}

.trading-workbench,
.trading-drone-workbench {
  max-width: 1040px;
}

.trading-workspace-panel,
.drone-workspace-panel {
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  background: var(--el-bg-color);
  overflow: hidden;
}

.trading-workspace-header,
.drone-workspace-header {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  align-items: center;
  padding: 16px 18px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.panel-heading {
  display: flex;
  gap: 10px;
  align-items: center;
  margin: 0;
}

.panel-heading-icon {
  width: 36px;
  height: 36px;
  object-fit: contain;
}

.panel-heading h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.panel-heading p,
.operator-card-main span {
  margin: 4px 0 0;
  color: var(--el-text-color-secondary);
  font-size: 13px;
  line-height: 1.45;
}

.setting-label {
  display: block;
  margin-bottom: 8px;
  color: var(--el-text-color-regular);
  font-size: 13px;
  font-weight: 600;
}

.product-toggle,
.level-toggle {
  display: inline-flex;
  width: auto;
}

.station-settings {
  display: flex;
  gap: 18px;
  align-items: flex-end;
}

.product-toggle :deep(.el-radio-button__inner),
.level-toggle :deep(.el-radio-button__inner) {
  min-width: 50px;
}

.trading-workspace-body,
.drone-workspace-body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 270px;
}

.trading-input-panel,
.drone-operators-panel {
  min-width: 0;
  padding: 16px 18px;
}

.operator-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.operator-heading h2 {
  margin: 0;
  color: var(--el-text-color-primary);
  font-size: 14px;
}

.operator-heading span {
  color: var(--el-text-color-secondary);
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}

.operator-row-list {
  display: grid;
  gap: 6px;
}

.drone-operator-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto auto;
  gap: 10px;
  align-items: center;
  min-height: 58px;
  padding: 7px 8px;
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  cursor: pointer;
  outline: none;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

.drone-operator-row:hover,
.drone-operator-row:focus-visible {
  border-color: var(--el-color-primary-light-5);
}

.drone-operator-row.active {
  border-color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}

.operator-card-main {
  display: grid;
  min-width: 0;
  gap: 3px;
}

.operator-card-main strong {
  color: var(--el-text-color-primary);
  font-size: 14px;
}

.operator-card-main span {
  font-size: 12px;
}

.operator-elite-control {
  white-space: nowrap;
}

.operator-elite-control.inactive {
  visibility: hidden;
}

.operator-level-control {
  width: 104px;
}

.trading-input-panel .drone-operator-row {
  grid-template-columns: auto minmax(0, 1fr) auto 104px auto;
}

.bonus-controls {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.bonus-controls label {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 112px auto;
  gap: 7px;
  align-items: center;
  min-width: 0;
  color: var(--el-text-color-regular);
  font-size: 12px;
}

.bonus-controls em {
  color: var(--el-text-color-secondary);
  font-size: 12px;
  font-style: normal;
}

.trading-result-panel,
.drone-result-panel {
  border-left: 1px solid var(--el-border-color-lighter);
  background: var(--el-fill-color-light);
}

.trading-result-panel.has-error,
.drone-result-panel.has-error {
  border-color: var(--el-color-danger-light-5);
}

.result-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 74px;
  padding: 18px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.eyebrow {
  display: block;
  margin-bottom: 5px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.drone-cost {
  display: flex;
  align-items: center;
  gap: 7px;
  color: var(--el-text-color-primary);
}

.drone-cost img {
  width: 30px;
  height: 30px;
  object-fit: contain;
}

.drone-cost strong {
  font-size: 18px;
}

.result-rate {
  color: var(--el-text-color-primary);
  font-size: 20px;
  font-variant-numeric: tabular-nums;
}

.resource-result-list {
  display: grid;
}

.resource-result {
  display: flex;
  gap: 10px;
  align-items: center;
  min-height: 52px;
  padding: 8px 18px;
}

.resource-result + .resource-result {
  border-top: 1px solid var(--el-border-color-lighter);
}

.resource-result img {
  width: 30px;
  height: 30px;
  object-fit: contain;
}

.resource-result span {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.resource-result strong {
  margin-left: auto;
  color: var(--el-color-success);
  font-size: 16px;
  font-variant-numeric: tabular-nums;
}

.resource-result strong.consumption {
  color: var(--el-color-danger);
}

.result-error {
  margin: 0;
  padding: 22px 18px;
  color: var(--el-color-danger);
}

.raw-result-collapse {
  margin: 0 18px;
  border-top: 1px solid var(--el-border-color-lighter);
  border-bottom: 0;
}

.raw-result-collapse :deep(.el-collapse-item__header) {
  height: 40px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.raw-result-collapse :deep(.el-collapse-item__wrap) {
  border-bottom: 0;
}

.result-json {
  min-height: 120px;
  margin: 0 0 14px;
  padding: 12px;
  overflow: auto;
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  background: var(--el-fill-color-light);
  color: var(--el-text-color-primary);
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
}

@media (max-width: 820px) {
  .riic-test-page {
    padding: 16px;
  }

  .module-panel,
  .trading-workbench,
  .trading-drone-workbench {
    grid-template-columns: 1fr;
  }

.trading-workspace-header,
  .drone-workspace-header,
  .station-settings {
    align-items: stretch;
    flex-direction: column;
    gap: 12px;
  }

  .trading-workspace-body,
  .drone-workspace-body {
    grid-template-columns: 1fr;
  }

  .trading-result-panel,
  .drone-result-panel {
    border-top: 1px solid var(--el-border-color-lighter);
    border-left: 0;
  }

  .operator-elite-control {
    grid-column: 2 / 4;
    grid-row: 2;
  }

  .drone-operator-row {
    grid-template-columns: auto minmax(0, 1fr) auto;
  }

  .drone-operator-row :deep(.el-switch) {
    grid-column: 3;
    grid-row: 1;
  }

  .trading-input-panel .operator-elite-control {
    grid-column: 2;
    grid-row: 2;
  }

  .trading-input-panel .operator-level-control {
    grid-column: 2;
    grid-row: 3;
  }

  .bonus-controls {
    grid-template-columns: 1fr;
  }
}
</style>
