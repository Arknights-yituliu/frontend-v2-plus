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
  yield: {
    type: Object,
    default: null,
  },
  shifts: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(["select-drone-target", "update-drone-order"]);

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
  return (props.yield?.resources || []).find(
    (item) => String(item?.resource || "") === resource,
  );
}

function getFinalDailyOutput(resource) {
  const resourceSummary = getYieldResource(resource);
  const output = toNumber(resourceSummary?.outputPerDay);

  return {
    value:
      resourceSummary?.isCalculated === true && output !== null
        ? output
        : null,
    isCalculated:
      resourceSummary?.isCalculated === true && output !== null,
  };
}

const comprehensiveResources = computed(() => {
  const lmd = getFinalDailyOutput("lmd");
  const exp = getFinalDailyOutput("exp");
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
        icon: lmdBackground,
        value: lmd.value,
        isCalculated: lmd.isCalculated,
        digits: 0,
        color: "lmd",
      },
      {
        key: "experience",
        icon: battleRecordBackground,
        value: exp.value,
        isCalculated: exp.isCalculated,
        digits: 0,
        color: "experience",
      },
      {
        key: "yellowCertificate",
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
               icon: orundumBackground,
               value: orundum.value,
               isCalculated: orundum.isCalculated,
              digits: 0,
              color: "orundum",
            },
          ]
        : []),
    ],
    reference: [
      {
        label: "净赤金",
        value: getYieldResource("gold")?.outputPerDay,
        unit: "根/天",
        isCalculated: getYieldResource("gold")?.isCalculated === true,
      },
       ...(hasShardOutput
         ? [
             {
               label: "净源石碎片",
               value: shards.value,
               unit: "片/天",
               isCalculated: shards.isCalculated,
            },
          ]
        : []),
    ],
  };
});

const roomColumns = computed(() => {
  const roomsByKey = new Map(
    (props.yield?.rooms || []).map((room, index) => [
      String(room?.key || ""),
      { ...room, index },
    ]),
  );

  return (props.yield?.droneTargetSettlements || [])
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
      (props.yield?.droneUsage?.segments || []).map((segment) => [
        Number(segment?.stateIndex),
        segment,
      ]),
    ),
);

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
      droneAvailableOutput: droneUsage?.availableDroneOutput ?? null,
      droneTarget: drone.disabled === true ? "" : String(drone.target || "").trim(),
      droneOrder: ["post", "retain"].includes(drone.order)
        ? drone.order
        : "pre",
      droneCapacityReached: droneUsage?.capacityReached === true,
    };
  });
});

function getEffect(column, stateIndex) {
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
  return row.droneTarget === column.key;
}

function selectDroneTarget(row, column) {
  const effect = getEffect(column, row.index);
  if (!effect.isCalculated) {
    return;
  }

  emit("select-drone-target", {
    index: row.index,
    target: column.key,
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
    v-if="yield && roomColumns.length"
    class="schedule-resource-summary"
  >
    <div class="schedule-resource-overview">
      <section class="schedule-resource-overview-section">
        <span class="schedule-resource-overview-title">每日综合产出</span>
        <div class="schedule-resource-overview-values">
          <div
            v-for="resource in comprehensiveResources.final"
            :key="resource.key"
            class="schedule-resource-overview-value"
            :class="`resource-${resource.color}`"
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
          <div
            v-for="resource in comprehensiveResources.reference"
            :key="resource.label"
            class="schedule-resource-overview-value reference"
          >
            <span>{{ resource.label }}</span>
            <strong>
              {{
                resource.isCalculated
                  ? formatResourceValue(resource.value, resource.unit, {
                      signed: true,
                    })
                  : "--"
              }}
            </strong>
          </div>
        </div>
      </section>
    </div>

    <div class="schedule-resource-table-scroll">
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
                <span>{{ formatDroneCount(row.droneAvailableOutput) }}</span>
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
                  unavailable: !getEffect(column, row.index).isCalculated,
                }"
                :disabled="!getEffect(column, row.index).isCalculated"
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
  min-width: 0;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px 12px;
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

.schedule-resource-overview-value.reference {
  align-items: baseline;
}

.schedule-resource-overview-value.reference strong {
  color: var(--riic-muted);
  font-size: 12px;
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
