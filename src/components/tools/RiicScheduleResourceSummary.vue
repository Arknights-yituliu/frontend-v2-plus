<script setup>
import { computed } from "vue";
import battleRecordBackground from "/src/assets/images/riic-schedule-preview/battle-record.png";
import greenCertificateBackground from "/src/assets/images/riic-schedule-preview/green-certificate.png";
import goldBackground from "/src/assets/images/riic-schedule-preview/gold.png";
import lmdBackground from "/src/assets/images/riic-schedule-preview/lmd.png";
import originiumShardBackground from "/src/assets/images/riic-schedule-preview/originium-shard.png";
import orundumBackground from "/src/assets/images/riic-schedule-preview/orundum.png";
import yellowCertificateBackground from "/src/assets/images/riic-schedule-preview/yellow-certificate.png";

const props = defineProps({
  calculationMode: {
    type: String,
    default: "riic-efficiency",
  },
  yield: {
    type: Object,
    default: null,
  },
  outputMode: {
    type: String,
    default: "net",
  },
  showOutputModeToggle: {
    type: Boolean,
    default: false,
  },
  droneDisplay: {
    type: Object,
    default: null,
  },
  shifts: {
    type: Array,
    default: () => [],
  },
  droneTargetPreviewKeysByState: {
    type: Array,
    default: () => [],
  },
  roomIndexAssignments: {
    type: Object,
    default: () => ({}),
  },
});

const emit = defineEmits([
  "select-drone-target",
  "update-drone-order",
  "update:outputMode",
]);

const RECRUITMENT_REFRESH_GREEN_CERTIFICATE_RATE = 2.673946816;
const RECRUITMENT_REFRESH_YELLOW_CERTIFICATE_RATE = 0.255580301;

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function formatNumber(value) {
  const number = toNumber(value);
  if (number === null) {
    return "--";
  }

  return new Intl.NumberFormat("zh-CN", {
    maximumFractionDigits: 2,
  }).format(number);
}

function formatResourceValue(value, unit, { signed = false } = {}) {
  const number = toNumber(value);
  if (number === null) {
    return "--";
  }

  const sign = signed && number > 0 ? "+" : "";
  return `${sign}${formatNumber(number)}${unit ? ` ${unit}` : ""}`;
}

function formatDroneCount(value) {
  const number = toNumber(value);
  return number === null ? "--" : `${formatNumber(number)} 架`;
}

function formatOverviewValue(value, digits = 0) {
  const number = toNumber(value);
  if (number === null) {
    return "--";
  }

  return new Intl.NumberFormat("zh-CN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(number);
}

function getStationNumber(room, key) {
  const roomKey = String(key || room?.key || "").trim();
  const assignedIndex = Number(props.roomIndexAssignments?.[roomKey]);
  if (Number.isInteger(assignedIndex) && assignedIndex >= 1) {
    return assignedIndex;
  }

  const stationIndex = Number(room?.stationIndex);
  if (Number.isInteger(stationIndex) && stationIndex >= 0) {
    return stationIndex + 1;
  }

  const matchedKeyIndex = String(key || "").match(/:(\d+)$/);
  if (matchedKeyIndex) {
    return Number(matchedKeyIndex[1]) + 1;
  }

  const matchedLabelIndex = String(room?.label || "").match(/(\d+)$/);
  return matchedLabelIndex ? Number(matchedLabelIndex[1]) : null;
}

function getProductIcon(product, facility) {
  if (product === "orundum") {
    return facility === "manufacture"
      ? originiumShardBackground
      : orundumBackground;
  }

  return (
    {
      lmd: lmdBackground,
      experience: battleRecordBackground,
      gold: goldBackground,
    }[String(product || "")] || null
  );
}

function getYieldResource(resource) {
  const resources = Array.isArray(props.yield?.overviewResources)
    ? props.yield.overviewResources
    : props.yield?.resources || [];
  return resources.find(
    (item) => String(item?.resource || "") === resource,
  );
}

function getGrossYieldResource(resource) {
  const resources = Array.isArray(props.yield?.resources)
    ? props.yield.resources
    : [];
  return (
    resources.find((item) => String(item?.resource || "") === resource) ||
    getYieldResource(resource)
  );
}

function getFinalDailyOutput(resource) {
  const resourceSummary = getYieldResource(resource);
  const grossSummary = getGrossYieldResource(resource);
  const netValue = toNumber(resourceSummary?.outputPerDay);
  const grossValue = toNumber(grossSummary?.grossOutputPerDay);

  return {
    netValue:
      resourceSummary?.isCalculated === true && netValue !== null
        ? netValue
        : null,
    grossValue:
      (grossSummary?.grossIsCalculated === true ||
        (grossSummary?.grossIsCalculated !== false &&
          grossSummary?.isCalculated === true)) &&
      grossValue !== null
        ? grossValue
        : null,
  };
}

const comprehensiveResources = computed(() => {
  const lmd = getFinalDailyOutput("lmd");
  const exp = getFinalDailyOutput("exp");
  const gold = getFinalDailyOutput("gold");
  const recruitmentRefresh = getYieldResource("recruitmentRefresh");
  const refreshesPerDay = toNumber(recruitmentRefresh?.outputPerDay);
  const recruitmentCalculated =
    recruitmentRefresh?.isCalculated === true && refreshesPerDay !== null;
  const orundumResource = getYieldResource("orundum");
  const orundum = getFinalDailyOutput("orundum");
  const shards = getFinalDailyOutput("originiumShard");
  const shardResource = getYieldResource("originiumShard");
  const hasOrundumOutput = Number(orundumResource?.roomCount || 0) > 0;
  const hasShardOutput = Number(shardResource?.roomCount || 0) > 0;

  return {
    final: [
      {
        key: "lmd",
        label: "龙门币",
        icon: lmdBackground,
        value: props.outputMode === "gross" ? lmd.grossValue : lmd.netValue,
        isCalculated:
          props.outputMode === "gross"
            ? lmd.grossValue !== null
            : lmd.netValue !== null,
        digits: 0,
        color: "lmd",
      },
      {
        key: "gold",
        label: props.outputMode === "net" ? "净赤金" : "赤金",
        icon: goldBackground,
        value: props.outputMode === "gross" ? gold.grossValue : gold.netValue,
        isCalculated:
          props.outputMode === "gross"
            ? gold.grossValue !== null
            : gold.netValue !== null,
        digits: 0,
        color: "gold",
      },
      {
        key: "experience",
        label: "经验书",
        icon: battleRecordBackground,
        value: exp.netValue,
        isCalculated: exp.netValue !== null,
        digits: 0,
        color: "experience",
      },
      {
        key: "yellowCertificate",
        label: "黄证",
        icon: yellowCertificateBackground,
        value: recruitmentCalculated
          ? refreshesPerDay * RECRUITMENT_REFRESH_YELLOW_CERTIFICATE_RATE
          : null,
        isCalculated: recruitmentCalculated,
        digits: 2,
        color: "yellow-certificate",
      },
      {
        key: "greenCertificate",
        label: "绿证",
        icon: greenCertificateBackground,
        value: recruitmentCalculated
          ? refreshesPerDay * RECRUITMENT_REFRESH_GREEN_CERTIFICATE_RATE
          : null,
        isCalculated: recruitmentCalculated,
        digits: 2,
        color: "green-certificate",
      },
       ...(hasOrundumOutput
         ? [
             {
               key: "orundum",
               label: "合成玉",
               icon: orundumBackground,
               value: orundum.netValue,
               isCalculated: orundum.netValue !== null,
              digits: 0,
              color: "orundum",
            },
          ]
          : []),
       ...(hasShardOutput
         ? [
             {
               key: "originiumShard",
               label: props.outputMode === "net" ? "净源石碎片" : "源石碎片",
               icon: originiumShardBackground,
               value:
                 props.outputMode === "gross"
                   ? shards.grossValue
                   : shards.netValue,
               isCalculated:
                 props.outputMode === "gross"
                   ? shards.grossValue !== null
                   : shards.netValue !== null,
               digits: 0,
               color: "originium-shard",
            },
          ]
        : []),
    ],
  };
});

const roomColumns = computed(() => {
  const roomsByKey = new Map(
    (props.droneDisplay?.rooms || props.yield?.rooms || []).map(
      (room, index) => [String(room?.key || ""), { ...room, index }],
    ),
  );

  return (props.droneDisplay?.droneTargetSettlements || [])
    .map((settlement) => {
      const key = String(settlement?.key || "").trim();
      const room = roomsByKey.get(key);

      return {
        key,
        facility: String(room?.facility || "").trim(),
        stationNumber: getStationNumber(room, key),
        product: String(room?.product || "").trim(),
        icon: getProductIcon(room?.product, room?.facility),
        order: Number(room?.index),
        segments: Array.isArray(settlement?.segments)
          ? settlement.segments
          : [],
        resourceEffectsBySegment: Array.isArray(
          settlement?.resourceEffectsBySegment,
        )
          ? settlement.resourceEffectsBySegment
          : [],
      };
    })
    .filter(
      (column) =>
        column.key &&
        ["trading", "manufacture"].includes(column.facility),
    )
    .sort((left, right) => left.order - right.order);
});

const droneUsageByState = computed(
  () =>
    new Map(
      (props.droneDisplay?.droneUsage?.segments || []).map((segment) => [
        Number(segment?.stateIndex),
        segment,
      ]),
    ),
);

function hasActivePackageDroneSetting(stateIndex) {
  const shift = props.shifts[stateIndex] || {};
  const drone = shift?.drone && typeof shift.drone === "object"
    ? shift.drone
    : {};
  const target = String(drone.target || "").trim();
  const targetKeys = Object.values(
    props.droneTargetPreviewKeysByState?.[stateIndex] || {},
  );

  return (
    drone.disabled !== true &&
    drone.order !== "retain" &&
    target &&
    targetKeys.some((key) => String(key || "").trim() === target)
  );
}

const shiftRows = computed(() => {
  const stateCount = Math.max(
    props.shifts.length,
    ...roomColumns.value.map((column) => column.segments.length),
  );

  return Array.from({ length: stateCount }, (_, index) => {
    const shift = props.shifts[index] || {};
    const drone =
      shift?.drone && typeof shift.drone === "object" ? shift.drone : {};
    const droneUsage = droneUsageByState.value.get(index);

    return {
      index,
      name: String(shift?.name || `${String.fromCharCode(65 + index)}班`),
      availableDroneAmount:
        props.calculationMode === "riic-efficiency" &&
        !hasActivePackageDroneSetting(index)
          ? 0
          : (droneUsage?.availableDroneAmount ??
            droneUsage?.availableDroneOutput ??
            null),
      droneTarget: drone.disabled === true ? "" : String(drone.target || "").trim(),
      droneOrder:
        drone.disabled === true
          ? "retain"
          : ["post", "retain"].includes(drone.order)
            ? drone.order
            : "pre",
      droneCapacityReached: droneUsage?.capacityReached === true,
    };
  });
});

function getEffect(column, stateIndex) {
  const candidateTarget = String(
    props.droneTargetPreviewKeysByState?.[stateIndex]?.[column?.key] || "",
  ).trim();
  if (
    props.calculationMode === "riic-efficiency" &&
    candidateTarget &&
    !hasActivePackageDroneSetting(stateIndex)
  ) {
    return {
      isCalculated: true,
      output: 0,
      netGold: null,
      shardConsumption: null,
      lmdConsumption: null,
    };
  }

  const segment = column?.segments?.[stateIndex];
  const resourceEffects = column?.resourceEffectsBySegment?.[stateIndex];
  const netGold = toNumber(resourceEffects?.netGold);
  const shardConsumption = toNumber(resourceEffects?.shardConsumption);
  const lmdConsumption = toNumber(resourceEffects?.lmdConsumption);

  return {
    isCalculated:
      segment?.calculated === true && resourceEffects?.isCalculated === true,
    output: resourceEffects?.primaryOutput,
    netGold:
      netGold !== null && Math.abs(netGold) > 0
        ? netGold
        : null,
    shardConsumption:
      shardConsumption !== null && Math.abs(shardConsumption) > 0
        ? shardConsumption
        : null,
    lmdConsumption:
      lmdConsumption !== null && Math.abs(lmdConsumption) > 0
        ? lmdConsumption
        : null,
  };
}

function isSelected(row, column) {
  return row.droneTarget === getPreviewTargetKey(row, column);
}

function getPreviewTargetKey(row, column) {
  return String(
    props.droneTargetPreviewKeysByState?.[row.index]?.[column.key] || "",
  ).trim();
}

function canSelectDroneTarget(row, column) {
  return Boolean(getPreviewTargetKey(row, column)) &&
    getEffect(column, row.index).isCalculated;
}

function selectDroneTarget(row, column) {
  const target = getPreviewTargetKey(row, column);
  if (!target || !getEffect(column, row.index).isCalculated) {
    return;
  }

  emit("select-drone-target", {
    index: row.index,
    target,
  });
}

function updateDroneOrder(index, order) {
  emit("update-drone-order", {
    index,
    order: ["post", "retain"].includes(order) ? order : "pre",
  });
}
</script>

<template>
  <section
    v-if="
      calculationMode === 'legacy'
        ? yield && roomColumns.length
        : yield || droneDisplay
    "
    class="schedule-resource-summary"
  >
    <div v-if="yield" class="schedule-resource-overview">
      <section class="schedule-resource-overview-section">
        <span class="schedule-resource-overview-title">每日综合产出</span>
        <div class="schedule-resource-overview-values">
          <div
            v-for="resource in comprehensiveResources.final"
            :key="resource.key"
            class="schedule-resource-overview-value"
            :class="`resource-${resource.color}`"
            :title="resource.label"
            :aria-label="resource.label"
          >
            <img :src="resource.icon" alt="" />
            <strong>
              {{
                resource.isCalculated
                  ? formatOverviewValue(resource.value, resource.digits)
                  : "--"
              }}
            </strong>
          </div>
        </div>
        <div
          v-if="showOutputModeToggle"
          class="schedule-resource-output-mode"
          role="group"
          aria-label="资源产出模式"
        >
          <button
            type="button"
            :class="{ active: outputMode === 'gross' }"
            :aria-pressed="outputMode === 'gross'"
            @click="emit('update:outputMode', 'gross')"
          >
            总产出
          </button>
          <button
            type="button"
            :class="{ active: outputMode === 'net' }"
            :aria-pressed="outputMode === 'net'"
            @click="emit('update:outputMode', 'net')"
          >
            净产出
          </button>
        </div>
      </section>
    </div>

    <div v-if="roomColumns.length" class="schedule-resource-table-scroll">
      <table class="schedule-resource-table">
        <thead>
          <tr>
            <th class="schedule-resource-shift-heading" scope="col">班次</th>
            <th
              v-for="column in roomColumns"
              :key="column.key"
              scope="col"
              :class="`facility-${column.facility}`"
            >
              <span class="schedule-resource-room-heading">
                <img v-if="column.icon" :src="column.icon" alt="" />
                <v-icon
                  v-else
                  icon="mdi-hexagon-multiple-outline"
                  size="17"
                ></v-icon>
                <strong>
                  {{
                    `${column.facility === "trading" ? "贸易站" : "制造站"}${
                      column.stationNumber ? ` ${column.stationNumber}` : ""
                    }`
                  }}
                </strong>
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in shiftRows" :key="row.index">
            <th scope="row">
              <div class="schedule-resource-shift-name">
                <strong>{{ row.name }}</strong>
                <span
                  :title="
                    calculationMode === 'riic-efficiency'
                      ? `本班可用于所选无人机加速队列：${formatDroneCount(row.availableDroneAmount)}`
                      : undefined
                  "
                >
                  {{ formatDroneCount(row.availableDroneAmount) }}
                </span>
                <small
                  v-if="row.droneCapacityReached"
                  class="schedule-resource-drone-limit-warning"
                >
                  已超出无人机上限
                </small>
              </div>
              <div class="schedule-resource-drone-order">
                <button
                  type="button"
                  :class="{ active: row.droneOrder === 'pre' }"
                  :aria-pressed="row.droneOrder === 'pre'"
                  @click="updateDroneOrder(row.index, 'pre')"
                >
                  换班前
                </button>
                <button
                  type="button"
                  :class="{ active: row.droneOrder === 'post' }"
                  :aria-pressed="row.droneOrder === 'post'"
                  @click="updateDroneOrder(row.index, 'post')"
                >
                  换班后
                </button>
                <button
                  type="button"
                  :class="{ active: row.droneOrder === 'retain' }"
                  :aria-pressed="row.droneOrder === 'retain'"
                  @click="updateDroneOrder(row.index, 'retain')"
                >
                  留给下一班
                </button>
              </div>
            </th>
            <td
              v-for="column in roomColumns"
              :key="`${row.index}:${column.key}`"
              :class="`facility-${column.facility}`"
            >
              <button
                type="button"
                :class="{
                  active: isSelected(row, column),
                  unavailable: !canSelectDroneTarget(row, column),
                }"
                :disabled="!canSelectDroneTarget(row, column)"
                :title="`投向${
                  column.facility === 'trading' ? '贸易站' : '制造站'
                }${column.stationNumber ? ` ${column.stationNumber}` : ''}`"
                @click="selectDroneTarget(row, column)"
              >
                <span v-if="isSelected(row, column)" class="schedule-resource-drone">
                  <v-icon icon="mdi-quadcopter" size="15"></v-icon>
                </span>
                <strong>
                  {{
                    getEffect(column, row.index).isCalculated
                      ? formatResourceValue(
                          getEffect(column, row.index).output,
                          "",
                          { signed: true },
                        )
                      : "--"
                  }}
                </strong>
                <span
                  v-if="getEffect(column, row.index).netGold !== null"
                  class="schedule-resource-gold-consumption"
                >
                  净赤金
                  {{
                    formatResourceValue(
                      getEffect(column, row.index).netGold,
                      "根",
                      { signed: true },
                    )
                  }}
                </span>
                <span
                  v-if="getEffect(column, row.index).shardConsumption !== null"
                  class="schedule-resource-shard-consumption"
                >
                  源石碎片消耗
                  {{
                    formatResourceValue(
                      -getEffect(column, row.index).shardConsumption,
                      "枚",
                    )
                  }}
                </span>
                <span
                  v-if="getEffect(column, row.index).lmdConsumption !== null"
                  class="schedule-resource-lmd-consumption"
                >
                  龙门币消耗
                  {{
                    formatResourceValue(
                      -getEffect(column, row.index).lmdConsumption,
                      "",
                    )
                  }}
                </span>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
.schedule-resource-summary {
  margin-top: 10px;
  overflow: hidden;
  border: 1px solid var(--c-border-color);
  border-radius: 4px;
  background: var(--c-page-background-color-secondary);
}

.schedule-resource-overview {
  display: flex;
  flex-direction: column;
  border-bottom: 1px solid var(--c-border-color);
}

.schedule-resource-overview-section {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  min-width: 0;
  padding: 8px 10px;
  gap: 10px;
}

.schedule-resource-overview-title {
  flex: 0 0 auto;
  color: var(--riic-muted);
  font-size: 11px;
  line-height: 1.35;
}

.schedule-resource-overview-values {
  display: flex;
  flex: 1 1 500px;
  min-width: 0;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px 12px;
}

.schedule-resource-output-mode {
  display: inline-flex;
  flex: 0 0 auto;
  margin-left: auto;
  padding: 2px;
  border: 1px solid var(--c-border-color);
  border-radius: 4px;
  background: var(--c-page-background-color);
}

.schedule-resource-output-mode button {
  min-width: 64px;
  min-height: 28px;
  padding: 4px 8px;
  border: 0;
  border-radius: 2px;
  background: transparent;
  color: var(--c-text-color);
  font: inherit;
  font-size: 11px;
  cursor: pointer;
}

.schedule-resource-output-mode button.active {
  background: var(--riic-blue);
  color: #fff;
}

.schedule-resource-output-mode button:focus-visible {
  outline: 2px solid var(--riic-blue);
  outline-offset: 1px;
}

.schedule-resource-overview-value {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--riic-muted);
  font-size: 11px;
  line-height: 1.5;
  white-space: nowrap;
}

.schedule-resource-overview-value img {
  width: 26px;
  height: 26px;
  flex: 0 0 auto;
  object-fit: contain;
}

.schedule-resource-overview-value strong {
  color: var(--c-text-color);
  font-size: 17px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.schedule-resource-overview-value.resource-lmd strong {
  color: #2878c8;
}

.schedule-resource-overview-value.resource-experience strong {
  color: #b88616;
}

.schedule-resource-overview-value.resource-yellow-certificate strong {
  color: #c99a18;
}

.schedule-resource-overview-value.resource-green-certificate strong {
  color: #23866c;
}

.schedule-resource-overview-value.resource-gold strong {
  color: #a87413;
}

.schedule-resource-overview-value.resource-originium-shard strong {
  color: #6c5aa7;
}

.schedule-resource-table-scroll {
  overflow-x: auto;
}

.schedule-resource-table {
  width: 100%;
  min-width: 620px;
  border-spacing: 0;
  border-collapse: collapse;
  table-layout: fixed;
}

.schedule-resource-table th,
.schedule-resource-table td {
  min-width: 0;
  border-right: 1px solid var(--c-border-color);
  border-bottom: 1px solid var(--c-border-color);
}

.schedule-resource-table tr > :last-child {
  border-right: 0;
}

.schedule-resource-table tbody tr:last-child > * {
  border-bottom: 0;
}

.schedule-resource-table thead th {
  padding: 7px 8px;
  background: color-mix(
    in srgb,
    var(--room-color, #7d8792) 5%,
    var(--c-page-background-color)
  );
  color: var(--c-text-color);
  font-size: 11px;
  font-weight: 400;
  line-height: 1.3;
  text-align: left;
}

.schedule-resource-room-heading {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 5px;
}

.schedule-resource-room-heading img {
  width: 18px;
  height: 18px;
  flex: 0 0 auto;
  object-fit: contain;
}

.schedule-resource-room-heading > .v-icon {
  flex: 0 0 auto;
  color: var(--room-color, var(--riic-muted));
}

.schedule-resource-room-heading strong {
  overflow: hidden;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.schedule-resource-shift-heading {
  color: var(--riic-muted) !important;
}

.schedule-resource-table tbody th {
  padding: 6px 8px;
  background: var(--c-page-background-color);
  color: var(--c-text-color);
  font-size: 11px;
  font-weight: 400;
  text-align: left;
}

.schedule-resource-shift-name {
  display: flex;
  align-items: baseline;
  gap: 5px;
}

.schedule-resource-shift-name strong {
  font-size: 12px;
  font-weight: 600;
}

.schedule-resource-shift-name span {
  color: var(--riic-muted);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.schedule-resource-drone-order {
  display: inline-flex;
  margin-top: 5px;
  overflow: hidden;
  border: 1px solid var(--c-border-color);
  border-radius: 3px;
}

.schedule-resource-drone-order button {
  min-height: 21px;
  padding: 2px 5px;
  border: 0;
  border-left: 1px solid var(--c-border-color);
  background: var(--c-page-background-color);
  color: var(--riic-muted);
  font: inherit;
  font-size: 10px;
  line-height: 1.2;
  cursor: pointer;
}

.schedule-resource-drone-order button:first-child {
  border-left: 0;
}

.schedule-resource-drone-order button.active {
  background: color-mix(
    in srgb,
    var(--riic-blue) 13%,
    var(--c-page-background-color)
  );
  color: var(--riic-blue);
  font-weight: 700;
}

.schedule-resource-drone-limit-warning {
  color: var(--riic-orange);
  font-size: 10px;
  line-height: 1.2;
}

.schedule-resource-table td {
  padding: 0;
  background: var(--c-page-background-color);
}

.schedule-resource-table td > button {
  display: grid;
  position: relative;
  width: 100%;
  min-height: 57px;
  padding: 6px 8px;
  border: 0;
  background: transparent;
  color: var(--c-text-color);
  font: inherit;
  line-height: 1.3;
  text-align: left;
  cursor: pointer;
}

.schedule-resource-table td > button:hover,
.schedule-resource-table td > button.active {
  background: color-mix(
    in srgb,
    var(--room-color, #2878c8) 9%,
    var(--c-page-background-color)
  );
}

.schedule-resource-table td > button.active {
  box-shadow: inset 4px 0 0 var(--room-color, var(--riic-blue));
}

.schedule-resource-table td > button.unavailable,
.schedule-resource-table td > button:disabled {
  color: var(--riic-muted);
  cursor: default;
}

.schedule-resource-table td > button > strong,
.schedule-resource-table td > button > span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.schedule-resource-table td > button > strong {
  color: var(--room-color, var(--c-text-color));
  font-size: 14px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.schedule-resource-table td > button.unavailable > strong {
  color: var(--riic-muted);
}

.schedule-resource-gold-consumption {
  margin-top: 3px;
  padding-right: 20px;
  color: var(--riic-red);
  font-size: 10px;
  font-variant-numeric: tabular-nums;
}

.schedule-resource-shard-consumption {
  margin-top: 3px;
  padding-right: 20px;
  color: #7158a7;
  font-size: 10px;
  font-variant-numeric: tabular-nums;
}

.schedule-resource-lmd-consumption {
  margin-top: 3px;
  padding-right: 20px;
  color: var(--riic-blue);
  font-size: 10px;
  font-variant-numeric: tabular-nums;
}

.schedule-resource-drone {
  display: inline-flex;
  position: absolute;
  bottom: 5px;
  right: 6px;
  color: var(--room-color, var(--riic-blue));
  filter: drop-shadow(0 1px 1px rgb(0 0 0 / 18%));
}

.facility-trading {
  --room-color: #2878c8;
}

.facility-manufacture {
  --room-color: #b88616;
}

@media (max-width: 760px) {
  .schedule-resource-table {
    min-width: 560px;
  }
}
</style>
