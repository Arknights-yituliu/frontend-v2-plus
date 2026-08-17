<script setup>
import { computed } from "vue";
import battleRecordBackground from "/src/assets/images/riic-schedule-preview/battle-record.png";
import goldBackground from "/src/assets/images/riic-schedule-preview/gold.png";
import lmdBackground from "/src/assets/images/riic-schedule-preview/lmd.png";
import originiumShardBackground from "/src/assets/images/riic-schedule-preview/originium-shard.png";
import orundumBackground from "/src/assets/images/riic-schedule-preview/orundum.png";
import { getRiicLayoutCells } from "/src/utils/riic/riic-layout-grid.js";

const props = defineProps({
  open: {
    type: Boolean,
    default: false,
  },
  active: {
    type: Boolean,
    default: false,
  },
  resettable: {
    type: Boolean,
    default: false,
  },
  stations: {
    type: Array,
    default: () => [],
  },
  productOptions: {
    type: Object,
    default: () => ({}),
  },
  powerSummary: {
    type: Object,
    default: () => ({
      supply: 0,
      consumption: 0,
      remaining: 0,
      overloaded: false,
    }),
  },
});

const emit = defineEmits([
  "toggle",
  "change-station-level",
  "change-station-product",
  "apply",
  "reset",
]);

const FACILITY_META = Object.freeze({
  control: {
    label: "控制中枢",
    tone: "control",
  },
  trading: {
    label: "贸易站",
    tone: "trading",
  },
  manufacture: {
    label: "制造站",
    tone: "manufacture",
  },
  power: {
    label: "发电站",
    tone: "power",
  },
  meeting: {
    label: "会客室",
    tone: "meeting",
  },
  office: {
    label: "办公室",
    tone: "office",
  },
  dormitory: {
    label: "宿舍",
    tone: "dormitory",
  },
  processing: {
    label: "加工站",
    tone: "processing",
  },
  training: {
    label: "训练室",
    tone: "training",
  },
});

const editorRooms = computed(() => [
  ...(props.stations || []),
  {
    id: "control-1",
    facility: "control",
    stationIndex: 0,
    stationLevel: 5,
    slotCount: 5,
    locked: true,
  },
]);

const layoutCells = computed(() => getRiicLayoutCells(editorRooms.value));
const applyDisabled = computed(() => props.powerSummary?.overloaded === true);

function getFacilityMeta(facility) {
  return FACILITY_META[facility] || FACILITY_META.manufacture;
}

function getStationLabel(station) {
  const meta = getFacilityMeta(station?.facility);
  const index = Number(station?.stationIndex || 0);
  return index > 0 ? `${meta.label} ${index}` : meta.label;
}

function getMaxLevel(station) {
  return station?.facility === "dormitory" ? 5 : 3;
}

function getProductOptions(station) {
  return props.productOptions?.[station?.facility] || [];
}

function getProductBackground(station) {
  const imageByProduct = {
    lmd: lmdBackground,
    experience: battleRecordBackground,
    gold: goldBackground,
    orundum: station?.facility === "manufacture"
      ? originiumShardBackground
      : orundumBackground,
  };
  const source = imageByProduct[station?.product];
  return source ? { value: source } : null;
}

function updateStationLevel(station, delta) {
  if (station?.locked) {
    return;
  }

  const maxLevel = getMaxLevel(station);
  const currentLevel = Number(station?.stationLevel || 0);
  emit("change-station-level", {
    id: station.id,
    level: Math.min(maxLevel, Math.max(0, currentLevel + delta)),
  });
}

function selectProduct(station, product) {
  if (station?.locked || station?.stationLevel === 0) {
    return;
  }

  emit("change-station-product", {
    id: station.id,
    product,
  });
}
</script>

<template>
  <section class="custom-layout-entry">
    <button
      type="button"
      class="custom-layout-toggle"
      :aria-expanded="open"
      @click="emit('toggle')"
    >
      <span class="custom-layout-toggle-copy">
        <v-icon icon="mdi-tune-variant" size="18"></v-icon>
        <span>自定义布局（beta）-调整设施等级与产物-请确认你知道自己在干什么-如果出了问题可以点击上面预置布局恢复</span>
        <small v-if="active">已应用</small>
      </span>
      <v-icon
        :icon="open ? 'mdi-chevron-up' : 'mdi-chevron-down'"
        size="18"
      ></v-icon>
    </button>

    <transition name="custom-layout-editor">
      <section v-if="open" class="custom-layout-editor">
        <div
          class="custom-layout-power-summary"
          :class="{ overloaded: powerSummary.overloaded }"
        >
          <div class="custom-layout-power-summary-main">
            <v-icon icon="mdi-lightning-bolt" size="18"></v-icon>
            <strong>电力</strong>
            <span>
              {{ powerSummary.consumption }} /
              {{ powerSummary.supply }}
            </span>
          </div>
          <span class="custom-layout-power-remaining">
            {{
              powerSummary.overloaded
                ? `超载 ${Math.abs(powerSummary.remaining)}`
                : `剩余 ${powerSummary.remaining}`
            }}
          </span>
        </div>
        <p v-if="powerSummary.overloaded" class="custom-layout-power-warning">
          当前布局电力超载，无法应用。
        </p>

        <div class="custom-layout-layout">
          <template v-for="(room, index) in layoutCells" :key="`cell-${index}`">
            <article
              v-if="room"
              class="custom-layout-room"
              :class="[
                `tone-${getFacilityMeta(room.facility).tone}`,
                { locked: room.locked, unbuilt: room.stationLevel === 0 },
              ]"
            >
              <span
                v-if="getProductBackground(room)"
                class="custom-layout-resource-background"
                aria-hidden="true"
              >
                <img
                  :src="getProductBackground(room).value"
                  alt=""
                />
              </span>
              <header class="custom-layout-room-heading">
                <strong>{{ getStationLabel(room) }}</strong>
                <small>{{ room.locked ? "固定" : "" }}</small>
              </header>
              <div class="custom-layout-level-control">
                <button
                  type="button"
                  title="降低等级"
                  :disabled="room.locked || room.stationLevel <= 0"
                  @click="updateStationLevel(room, -1)"
                >
                  <v-icon icon="mdi-minus" size="16"></v-icon>
                </button>
                <span>Lv.{{ room.stationLevel }}</span>
                <button
                  type="button"
                  title="提高等级"
                  :disabled="
                    room.locked ||
                    room.stationLevel >= getMaxLevel(room)
                  "
                  @click="updateStationLevel(room, 1)"
                >
                  <v-icon icon="mdi-plus" size="16"></v-icon>
                </button>
              </div>
              <div
                v-if="getProductOptions(room).length"
                class="custom-layout-product-options"
              >
                <button
                  v-for="option in getProductOptions(room)"
                  :key="option.value"
                  type="button"
                  :class="{ selected: room.product === option.value }"
                  :disabled="room.stationLevel === 0"
                  @click="selectProduct(room, option.value)"
                >
                  {{ option.label }}
                </button>
              </div>
            </article>
            <div v-else class="custom-layout-empty-cell" aria-hidden="true"></div>
          </template>
        </div>

        <div class="custom-layout-actions">
          <button
            type="button"
            class="custom-layout-apply"
            :disabled="applyDisabled"
            @click="emit('apply')"
          >
            应用自定义布局
          </button>
          <button
            type="button"
            class="custom-layout-reset"
            :disabled="!resettable"
            @click="emit('reset')"
          >
            <v-icon icon="mdi-restore" size="16"></v-icon>
            <span>重置</span>
          </button>
        </div>
      </section>
    </transition>
  </section>
</template>

<style scoped>
.custom-layout-entry {
  margin-top: 14px;
  overflow: hidden;
  border: 1px solid var(--c-border-color);
  border-radius: 5px;
  background: var(--c-page-background-color-secondary);
}

.custom-layout-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-height: 42px;
  padding: 7px 10px;
  border: 0;
  background: transparent;
  color: var(--riic-blue);
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.custom-layout-toggle-copy {
  display: inline-flex;
  align-items: center;
  min-width: 0;
  gap: 6px;
}

.custom-layout-toggle small {
  padding: 2px 5px;
  border-radius: 3px;
  background: color-mix(
    in srgb,
    var(--riic-green) 12%,
    var(--c-page-background-color)
  );
  color: var(--riic-green);
  font-size: 11px;
  font-weight: 600;
  line-height: 1.2;
}

.custom-layout-editor {
  padding: 10px;
  border-top: 1px solid var(--c-border-color);
  background: var(--c-page-background-color);
}

.custom-layout-editor-enter-active,
.custom-layout-editor-leave-active {
  overflow: hidden;
  transition:
    max-height 0.2s ease,
    opacity 0.16s ease;
}

.custom-layout-editor-enter-from,
.custom-layout-editor-leave-to {
  max-height: 0;
  opacity: 0;
}

.custom-layout-editor-enter-to,
.custom-layout-editor-leave-from {
  max-height: 2400px;
  opacity: 1;
}

.custom-layout-power-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 38px;
  gap: 10px;
  margin-bottom: 10px;
  padding: 7px 10px;
  border: 1px solid color-mix(in srgb, var(--riic-green) 32%, var(--c-border-color));
  border-radius: 4px;
  background: color-mix(
    in srgb,
    var(--riic-green) 7%,
    var(--c-page-background-color-secondary)
  );
  color: var(--riic-green);
}

.custom-layout-power-summary.overloaded {
  border-color: color-mix(in srgb, var(--riic-red) 48%, var(--c-border-color));
  background: color-mix(
    in srgb,
    var(--riic-red) 8%,
    var(--c-page-background-color-secondary)
  );
  color: var(--riic-red);
}

.custom-layout-power-summary-main,
.custom-layout-power-remaining {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.custom-layout-power-summary-main span,
.custom-layout-power-remaining {
  font-variant-numeric: tabular-nums;
}

.custom-layout-power-warning {
  margin: -2px 0 8px;
  color: var(--riic-red);
  font-size: 12px;
  line-height: 1.4;
}

.custom-layout-layout {
  display: grid;
  grid-template-columns:
    repeat(3, minmax(0, 0.9fr))
    minmax(0, 1.28fr)
    minmax(0, 0.9fr);
  gap: 7px;
  padding: 0;
}

.custom-layout-empty-cell {
  min-width: 0;
  min-height: 88px;
}

.custom-layout-room {
  --room-color: var(--c-text-tip-color);
  display: flex;
  position: relative;
  min-width: 0;
  min-height: 88px;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 5px;
  padding: 7px 9px 8px;
  overflow: hidden;
  border: 2px solid
    color-mix(in srgb, var(--room-color) 62%, var(--c-border-color));
  border-left-width: 6px;
  border-radius: 4px;
  background: var(--c-page-background-color);
  color: var(--c-text-color);
}

.custom-layout-room.tone-control {
  --room-color: #6c7480;
}

.custom-layout-room.tone-trading {
  --room-color: var(--riic-blue);
}

.custom-layout-room.tone-manufacture {
  --room-color: var(--riic-gold);
}

.custom-layout-room.tone-power {
  --room-color: var(--riic-green);
}

.custom-layout-room.tone-meeting,
.custom-layout-room.tone-training {
  --room-color: var(--riic-orange);
}

.custom-layout-room.tone-office {
  --room-color: var(--riic-red);
}

.custom-layout-room.tone-dormitory,
.custom-layout-room.tone-processing {
  --room-color: var(--riic-muted);
}

.custom-layout-room.locked {
  background: color-mix(
    in srgb,
    var(--c-text-tip-color) 6%,
    var(--c-page-background-color)
  );
}

.custom-layout-room.unbuilt {
  opacity: 0.68;
}

.custom-layout-resource-background {
  position: absolute;
  z-index: 0;
  inset: 0;
  opacity: 0.18;
  pointer-events: none;
}

.custom-layout-resource-background img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.custom-layout-room-heading,
.custom-layout-level-control,
.custom-layout-product-options {
  position: relative;
  z-index: 1;
}

.custom-layout-room-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  width: 100%;
  min-width: 0;
  gap: 6px;
}

.custom-layout-room-heading strong {
  overflow: hidden;
  color: var(--room-color);
  font-size: 12px;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.custom-layout-room-heading small {
  flex: 0 0 auto;
  color: var(--riic-muted);
  font-size: 10px;
}

.custom-layout-level-control {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 25px;
  gap: 6px;
}

.custom-layout-level-control button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 23px;
  height: 23px;
  padding: 0;
  border: 1px solid color-mix(in srgb, var(--room-color) 36%, var(--c-border-color));
  border-radius: 3px;
  background: var(--c-page-background-color);
  color: var(--room-color);
  cursor: pointer;
}

.custom-layout-level-control button:disabled {
  opacity: 0.34;
  cursor: default;
}

.custom-layout-level-control span {
  min-width: 36px;
  color: var(--c-text-color);
  font-size: 12px;
  font-weight: 700;
  text-align: center;
}

.custom-layout-product-options {
  display: flex;
  flex-wrap: wrap;
  width: 100%;
  gap: 3px;
}

.custom-layout-product-options button {
  min-width: 0;
  padding: 3px 5px;
  border: 1px solid transparent;
  border-radius: 3px;
  background: transparent;
  color: var(--riic-muted);
  font: inherit;
  font-size: 10px;
  line-height: 1.25;
  cursor: pointer;
}

.custom-layout-product-options button:hover:not(:disabled),
.custom-layout-product-options button.selected {
  border-color: color-mix(in srgb, var(--room-color) 45%, var(--c-border-color));
  background: color-mix(
    in srgb,
    var(--room-color) 12%,
    var(--c-page-background-color)
  );
  color: var(--room-color);
}

.custom-layout-product-options button:disabled {
  opacity: 0.4;
  cursor: default;
}

.custom-layout-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
}

.custom-layout-apply,
.custom-layout-reset {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 34px;
  padding: 6px 10px;
  border-radius: 4px;
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.custom-layout-apply {
  border: 0;
  background: var(--riic-blue);
  color: #fff;
}

.custom-layout-apply:disabled {
  opacity: 0.42;
  cursor: default;
}

.custom-layout-reset {
  gap: 4px;
  border: 1px solid var(--c-border-color);
  background: var(--c-page-background-color-secondary);
  color: var(--riic-muted);
}

.custom-layout-reset:not(:disabled):hover {
  border-color: var(--riic-orange);
  color: var(--riic-orange);
}

.custom-layout-reset:disabled {
  opacity: 0.42;
  cursor: default;
}

@media (max-width: 640px) {
  .custom-layout-layout {
    min-width: 640px;
  }

  .custom-layout-editor {
    overflow-x: auto;
  }
}
</style>
