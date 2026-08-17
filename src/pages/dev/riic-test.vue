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
                    v-for="(slot, index) in p01OperatorSlots"
                    :key="index"
                    class="operator-slot-row"
                  >
                    <OperatorAvatar
                      v-if="slot.charId"
                      :char-id="slot.charId"
                      :rarity="getOperatorRarity(slot.charId)"
                      :size="44"
                      :mobile-size="40"
                      border
                    />
                    <div v-else class="operator-slot-avatar" aria-hidden="true">
                      <v-icon icon="mdi-account-outline" size="22"></v-icon>
                    </div>
                    <el-select
                      v-model="slot.charId"
                      filterable
                      clearable
                      placeholder="选择干员"
                    >
                      <el-option
                        v-for="operator in operatorOptions"
                        :key="operator.charId"
                        :label="operator.name"
                        :value="operator.charId"
                      >
                      </el-option>
                    </el-select>
                    <el-radio-group v-model="slot.elite" size="small">
                      <el-radio-button :label="0">E0</el-radio-button>
                      <el-radio-button :label="1">E1</el-radio-button>
                      <el-radio-button :label="2">E2</el-radio-button>
                    </el-radio-group>
                    <el-input-number
                      v-model="slot.level"
                      class="operator-slot-level"
                      :min="1"
                      :max="90"
                      :step="1"
                      controls-position="right"
                    />
                    <el-switch
                      v-model="slot.enabled"
                      :aria-label="`启用第 ${index + 1} 个干员槽位`"
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
                    <span>指定干员加成</span>
                    <el-select
                      v-model="p01BonusOperatorId"
                      clearable
                      filterable
                      placeholder="选择干员"
                    >
                      <el-option
                        v-for="operator in p01ActiveOperators"
                        :key="operator.charId"
                        :label="getOperatorName(operator.charId)"
                        :value="operator.charId"
                      />
                    </el-select>
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
                <div class="trading-context-controls">
                  <label>
                    <span>跨房间加成表（已解析 JSON）</span>
                    <el-input
                      v-model="p01ExternalOrderBonusesJson"
                      type="textarea"
                      :rows="3"
                      placeholder='{"char_xxx|trading|技能名|2|1": 10}'
                    />
                  </label>
                  <label>
                    <span>静默共鸣</span>
                    <el-input-number
                      v-model="p01SilentResonance"
                      :min="0"
                      :max="999"
                      :step="1"
                    />
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
                    v-for="(slot, index) in p02OperatorSlots"
                    :key="index"
                    class="operator-slot-row"
                  >
                    <OperatorAvatar
                      v-if="slot.charId"
                      :char-id="slot.charId"
                      :rarity="getOperatorRarity(slot.charId)"
                      :size="44"
                      :mobile-size="40"
                      border
                    />
                    <div v-else class="operator-slot-avatar" aria-hidden="true">
                      <v-icon icon="mdi-account-outline" size="22"></v-icon>
                    </div>
                    <el-select
                      v-model="slot.charId"
                      filterable
                      clearable
                      placeholder="选择干员"
                    >
                      <el-option
                        v-for="operator in operatorOptions"
                        :key="operator.charId"
                        :label="operator.name"
                        :value="operator.charId"
                      >
                      </el-option>
                    </el-select>
                    <el-radio-group v-model="slot.elite" size="small">
                      <el-radio-button :label="0">E0</el-radio-button>
                      <el-radio-button :label="1">E1</el-radio-button>
                      <el-radio-button :label="2">E2</el-radio-button>
                    </el-radio-group>
                    <el-input-number
                      v-model="slot.level"
                      class="operator-slot-level"
                      :min="1"
                      :max="90"
                      :step="1"
                      controls-position="right"
                    />
                    <el-switch
                      v-model="slot.enabled"
                      :aria-label="`启用第 ${index + 1} 个干员槽位`"
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

      <el-tab-pane label="P03 普通产出" name="p03">
        <section class="module-test-panel">
          <header class="module-test-header">
            <div>
              <h2>普通制造产出</h2>
              <p>验证经验书、赤金、源石碎片按效率换算的产出值</p>
            </div>
            <el-tag :type="p03Result.ok ? 'success' : 'danger'" effect="plain">
              {{ p03Result.ok ? "计算完成" : "无法计算" }}
            </el-tag>
          </header>

          <div class="module-test-grid">
            <label>
              <span>制造产物</span>
              <el-select v-model="p03Product">
                <el-option label="经验书" value="experience" />
                <el-option label="赤金" value="gold" />
                <el-option label="源石碎片" value="orundum" />
              </el-select>
            </label>
            <label>
              <span>制造站等级</span>
              <el-select v-model="p03StationLevel">
                <el-option v-for="level in [1, 2, 3]" :key="level" :label="level" :value="level" />
              </el-select>
            </label>
            <label>
              <span>效率</span>
              <el-input-number v-model="p03Efficiency" :min="0" :max="500" :step="1" />
            </label>
            <label>
              <span>班段时长（小时）</span>
              <el-input-number v-model="p03DurationHours" :min="0.1" :max="24" :step="0.5" />
            </label>
          </div>

          <div v-if="p03Result.ok" class="module-test-result">
            <div>
              <span>本班段产出</span>
              <strong>{{ formatResultValue(p03Result.outputPerCycle) }}</strong>
            </div>
            <div>
              <span>折算日产出</span>
              <strong>{{ formatResultValue(p03Result.outputPerDay) }}</strong>
            </div>
          </div>
          <p v-else class="result-error">当前等级或产物没有可用的基础产能</p>

          <el-collapse class="raw-result-collapse">
            <el-collapse-item title="原始计算结果">
              <pre class="result-json">{{ p03ResultText }}</pre>
            </el-collapse-item>
          </el-collapse>
        </section>
      </el-tab-pane>

      <el-tab-pane label="P04 净值汇总" name="p04">
        <section class="module-test-panel">
          <header class="module-test-header">
            <div>
              <h2>资源净值抵扣</h2>
              <p>手动输入各类产出和消耗，检查净赤金、净龙门币、净源石碎片</p>
            </div>
          </header>

          <div class="module-test-grid">
            <label>
              <span>周期（小时）</span>
              <el-input-number v-model="p04CycleHours" :min="0.1" :max="168" :step="1" />
            </label>
            <label>
              <span>赤金制造（周期）</span>
              <el-input-number v-model="p04GoldManufacture" :min="0" :step="1" />
            </label>
            <label>
              <span>龙门币贸易（周期）</span>
              <el-input-number v-model="p04LmdTrade" :min="0" :step="1" />
            </label>
            <label>
              <span>贸易赤金消耗（周期）</span>
              <el-input-number v-model="p04GoldConsumption" :min="0" :step="1" />
            </label>
            <label>
              <span>虚拟赤金（周期）</span>
              <el-input-number v-model="p04VirtualGold" :min="0" :step="1" />
            </label>
            <label>
              <span>源石碎片制造（周期）</span>
              <el-input-number v-model="p04ShardManufacture" :min="0" :step="1" />
            </label>
            <label>
              <span>合成玉贸易消耗（周期）</span>
              <el-input-number v-model="p04ShardConsumption" :min="0" :step="1" />
            </label>
            <label>
              <span>源石碎片制造耗费龙门币（周期）</span>
              <el-input-number v-model="p04OrundumLmdConsumption" :min="0" :step="1" />
            </label>
          </div>

          <div class="module-test-result-grid">
            <div v-for="resource in p04ResourceResults" :key="resource.key">
              <span>{{ resource.name }}</span>
              <strong>{{ formatResultValue(resource.value) }}</strong>
              <small>/周期</small>
            </div>
          </div>

          <el-collapse class="raw-result-collapse">
            <el-collapse-item title="原始计算结果">
              <pre class="result-json">{{ p04ResultText }}</pre>
            </el-collapse-item>
          </el-collapse>
        </section>
      </el-tab-pane>
    </el-tabs>
  </main>
</template>

<script setup>
import { computed, ref } from "vue";
import OperatorAvatar from "@/components/sprite/OperatorAvatar.vue";
import droneImage from "@/assets/images/riic-schedule-preview/drone.png";
import goldImage from "@/assets/images/riic-schedule-preview/gold.png";
import lmdImage from "@/assets/images/riic-schedule-preview/lmd.png";
import orundumImage from "@/assets/images/riic-schedule-preview/orundum.png";
import shardImage from "@/assets/images/riic-schedule-preview/originium-shard.png";
import { operatorTableV2 } from "@/utils/gameData.js";
import { calculateRiicTrading } from "@/utils/riic/P01-riic-trading.js";
import { calculateRiicTradingDrone } from "@/utils/riic/P02-riic-trading-drone.js";
import {
  calculateRiicDirectProductionOutput,
} from "@/utils/riic/P03-riic-production.js";
import {
  settleRiicNetResources,
} from "@/utils/riic/P04-riic-resource-netting.js";

const activeModule = ref("p01");
const operatorOptions = Object.freeze(
  Object.entries(operatorTableV2)
    .filter(([, operator]) => operator?.name)
    .map(([charId, operator]) => ({
      charId,
      name: operator.name,
    }))
    .sort((left, right) => left.name.localeCompare(right.name, "zh-CN")),
);

const p01Product = ref("lmd");
const p01StationLevel = ref(3);
const p01RoomBonus = ref(0);
const p01OperatorBonus = ref(0);
const p01BonusOperatorId = ref("");
const p01ExternalOrderBonusesJson = ref("{}");
const p01SilentResonance = ref(0);
const p01OperatorSlots = ref([
  { charId: "char_502_nblade", elite: 0, level: 30, enabled: true },
  { charId: "char_123_fang", elite: 1, level: 1, enabled: true },
  { charId: "char_282_catap", elite: 0, level: 1, enabled: true },
]);
const p01ActiveOperators = computed(() =>
  p01OperatorSlots.value
    .filter((operator) => operator.enabled && operator.charId)
    .map((operator) => ({
      charId: operator.charId,
      elite: Number(operator.elite),
      level: Number(operator.level),
    })),
);
const p01ActiveOperatorCount = computed(() => p01ActiveOperators.value.length);
const p01ExternalOrderBonuses = computed(() => {
  try {
    const value = JSON.parse(p01ExternalOrderBonusesJson.value || "{}");
    return value && typeof value === "object" && !Array.isArray(value)
      ? value
      : null;
  } catch {
    return null;
  }
});
const p01Result = computed(() =>
  p01ExternalOrderBonuses.value === null
    ? {
        ok: false,
        error: "invalidExternalContext",
      }
    : calculateRiicTrading(
        {
          type: "trading",
          product: p01Product.value,
          level: p01StationLevel.value,
          context: {
            resolvedExternalOrderBonuses: p01ExternalOrderBonuses.value,
            silentResonance: Number(p01SilentResonance.value),
          },
        },
        p01ActiveOperators.value,
        {
          room: p01RoomBonus.value,
          operators:
            p01BonusOperatorId.value && p01OperatorBonus.value
              ? { [p01BonusOperatorId.value]: p01OperatorBonus.value }
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
    invalidExternalContext: "跨房间加成 JSON 无效",
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
const p02OperatorSlots = ref([
  { charId: "char_4032_provs", elite: 2, level: 1, enabled: true },
  { charId: "char_486_takila", elite: 2, level: 1, enabled: true },
  { charId: "", elite: 0, level: 1, enabled: false },
]);
const p02ActiveOperators = computed(() =>
  p02OperatorSlots.value
    .filter((operator) => operator.enabled && operator.charId)
    .map((operator) => ({
      charId: operator.charId,
      elite: Number(operator.elite),
      level: Number(operator.level),
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

const p03Product = ref("experience");
const p03StationLevel = ref(3);
const p03Efficiency = ref(100);
const p03DurationHours = ref(12);
const p03Result = computed(() => {
  const outputPerCycle = calculateRiicDirectProductionOutput({
    room: {
      facility: "manufacture",
      product: p03Product.value,
      stationLevel: Number(p03StationLevel.value),
    },
    efficiency: Number(p03Efficiency.value),
    durationHours: Number(p03DurationHours.value),
  });
  if (outputPerCycle === null) {
    return {
      ok: false,
      outputPerCycle: null,
      outputPerDay: null,
    };
  }

  return {
    ok: true,
    outputPerCycle,
    outputPerDay:
      Number(p03DurationHours.value) > 0
        ? outputPerCycle * (24 / Number(p03DurationHours.value))
        : null,
  };
});
const p03ResultText = computed(() =>
  JSON.stringify(
    {
      input: {
        facility: "manufacture",
        product: p03Product.value,
        level: Number(p03StationLevel.value),
        efficiency: Number(p03Efficiency.value),
        durationHours: Number(p03DurationHours.value),
      },
      result: p03Result.value,
    },
    null,
    2,
  ),
);

const p04CycleHours = ref(24);
const p04GoldManufacture = ref(0);
const p04LmdTrade = ref(0);
const p04GoldConsumption = ref(0);
const p04VirtualGold = ref(0);
const p04ShardManufacture = ref(0);
const p04ShardConsumption = ref(0);
const p04OrundumLmdConsumption = ref(0);
const p04Input = computed(() => {
  const cycleHours = Number(p04CycleHours.value);
  const dailyMultiplier = cycleHours > 0 ? 24 / cycleHours : 0;
  const createResource = (resource, outputPerCycle) => ({
    resource,
    roomCount: 1,
    calculatedRoomCount: 1,
    isCalculated: true,
    outputPerCycle: Number(outputPerCycle),
    outputPerDay: Number(outputPerCycle) * dailyMultiplier,
  });

  return {
    resourcesByKey: {
      gold: createResource("gold", p04GoldManufacture.value),
      lmd: createResource("lmd", p04LmdTrade.value),
      originiumShard: createResource(
        "originiumShard",
        p04ShardManufacture.value,
      ),
    },
    tradingFlowTotals: {
      isCalculated: true,
      goldConsumptionPerCycle: Number(p04GoldConsumption.value),
      virtualGoldOutputPerCycle: Number(p04VirtualGold.value),
    },
    orundumTradeFlowTotals: {
      isCalculated: true,
      roomCount: 1,
      calculatedRoomCount: 1,
      shardConsumptionPerCycle: Number(p04ShardConsumption.value),
    },
    orundumManufactureFlowTotals: {
      isCalculated: true,
      roomCount: 1,
      calculatedRoomCount: 1,
      lmdConsumptionPerCycle: Number(p04OrundumLmdConsumption.value),
    },
    cycleHours,
  };
});
const p04Result = computed(() => {
  const input = p04Input.value;
  return settleRiicNetResources({
    ...input,
    resourcesByKey: new Map(Object.entries(input.resourcesByKey)),
  });
});
const p04ResourceResults = computed(() => [
  {
    key: "gold",
    name: "净赤金",
    value: p04Result.value.gold.outputPerCycle,
  },
  {
    key: "lmd",
    name: "净龙门币",
    value: p04Result.value.lmd.outputPerCycle,
  },
  {
    key: "originiumShard",
    name: "净源石碎片",
    value: p04Result.value.originiumShard.outputPerCycle,
  },
]);
const p04ResultText = computed(() =>
  JSON.stringify(
    {
      input: p04Input.value,
      result: p04Result.value,
    },
    null,
    2,
  ),
);

function setP01Product(product) {
  p01Product.value = product;
  if (product === "orundum") {
    p01StationLevel.value = 3;
  }
}

function setP02Product(product) {
  p02Product.value = product;
  if (product === "orundum") {
    p02StationLevel.value = 3;
  }
}

function getOperatorRarity(charId) {
  return Number(operatorTableV2[charId]?.rarity) || 1;
}

function getOperatorName(charId) {
  return operatorTableV2[charId]?.name || charId;
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

.module-test-panel {
  max-width: 1040px;
  padding: 18px;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  background: var(--el-bg-color);
}

.module-test-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.module-test-header h2 {
  margin: 0;
  color: var(--el-text-color-primary);
  font-size: 16px;
  font-weight: 600;
}

.module-test-header p {
  margin: 5px 0 0;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.module-test-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  padding: 18px 0;
}

.module-test-grid label {
  display: grid;
  gap: 7px;
  min-width: 0;
  color: var(--el-text-color-regular);
  font-size: 12px;
}

.module-test-result,
.module-test-result-grid {
  display: grid;
  gap: 10px;
  padding: 16px 0;
  border-top: 1px solid var(--el-border-color-lighter);
}

.module-test-result {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.module-test-result-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.module-test-result > div,
.module-test-result-grid > div {
  display: grid;
  gap: 5px;
  padding: 12px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 4px;
  background: var(--el-fill-color-light);
}

.module-test-result span,
.module-test-result-grid span,
.module-test-result-grid small {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.module-test-result strong,
.module-test-result-grid strong {
  color: var(--el-color-success);
  font-size: 18px;
  font-variant-numeric: tabular-nums;
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

.operator-slot-row {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) auto 104px auto;
  gap: 8px;
  align-items: center;
  min-height: 52px;
  padding: 4px 0;
}

.operator-slot-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  color: var(--el-text-color-secondary);
}

.operator-slot-row :deep(.el-select) {
  min-width: 0;
}

.operator-slot-level {
  width: 104px;
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
  grid-template-columns: minmax(0, 1fr) 112px 112px auto;
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

.trading-context-controls {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 180px;
  gap: 10px;
  margin-top: 10px;
}

.trading-context-controls label {
  display: grid;
  gap: 7px;
  min-width: 0;
  color: var(--el-text-color-regular);
  font-size: 12px;
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

  .operator-slot-row {
    grid-template-columns: 40px minmax(0, 1fr) auto;
  }

  .operator-slot-avatar {
    width: 40px;
    height: 40px;
  }

  .operator-slot-level {
    grid-column: 2 / -1;
    grid-row: 2;
    width: 100%;
  }

  .trading-input-panel .operator-level-control {
    grid-column: 2;
    grid-row: 3;
  }

  .bonus-controls {
    grid-template-columns: 1fr;
  }

  .trading-context-controls {
    grid-template-columns: 1fr;
  }

  .module-test-grid,
  .module-test-result,
  .module-test-result-grid {
    grid-template-columns: 1fr;
  }
}
</style>
