<script setup>
import { computed, ref } from "vue";
import OperatorAvatar from "/src/components/sprite/OperatorAvatar.vue";
import battleRecordBackground from "/src/assets/images/riic-schedule-preview/battle-record.png";
import creditBackground from "/src/assets/images/riic-schedule-preview/credit.png";
import droneBackground from "/src/assets/images/riic-schedule-preview/drone.png";
import goldBackground from "/src/assets/images/riic-schedule-preview/gold.png";
import highCertificateBackground from "/src/assets/images/riic-schedule-preview/high-certificate.png";
import lmdBackground from "/src/assets/images/riic-schedule-preview/lmd.png";
import originiumShardBackground from "/src/assets/images/riic-schedule-preview/originium-shard.png";
import orundumBackground from "/src/assets/images/riic-schedule-preview/orundum.png";
import { getRiicLayoutCells } from "/src/utils/riic/riic-layout-grid.js";

const props = defineProps({
  preview: {
    type: Object,
    required: true,
  },
  activeStateIndex: {
    type: Number,
    default: 0,
  },
  operatorTable: {
    type: Object,
    default: () => ({}),
  },
  selectedRoomKey: {
    type: String,
    default: "",
  },
  title: {
    type: String,
    default: "",
  },
  defaultTitle: {
    type: String,
    default: "一图流排班表",
  },
  shifts: {
    type: Array,
    default: () => [],
  },
  droneTarget: {
    type: String,
    default: "",
  },
  placeholder: {
    type: Boolean,
    default: false,
  },
  exportStatic: {
    type: Boolean,
    default: false,
  },
  outputDecorated: {
    type: Boolean,
    default: false,
  },
  outputTheme: {
    type: String,
    default: "balanced",
  },
  showRoomEfficiency: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits([
  "update:activeStateIndex",
  "update:shift",
  "update:title",
  "edit-room",
  "move-operator",
  "select-drone-target",
]);

const isDraggingDrone = ref(false);
const draggedOperator = ref(null);
const suppressNextRoomClick = ref(false);
const displayTitle = computed(
  () => String(props.title || "").trim() || props.defaultTitle,
);
const activeState = computed(() => {
  const states = props.preview?.states || [];
  return states[props.activeStateIndex] || states[0] || null;
});
const displayShifts = computed(() =>
  (props.preview?.states || [])
    .map((state, index) => {
      const savedShift = props.shifts[index] || {};
      return {
        ...state,
        name: String(savedShift.name || `${String.fromCharCode(65 + index)}班`),
        time: String(savedShift.time || "09:00"),
        fiammetta:
          savedShift?.fiammetta?.enable === true
            ? {
                target: String(savedShift.fiammetta.target || "").trim(),
              }
            : null,
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name, "zh-CN")),
);
const activeShift = computed(
  () =>
    displayShifts.value.find(
      (shift) => shift.index === props.activeStateIndex,
    ) ||
    displayShifts.value[0] ||
    null,
);
const activeShiftPeriod = computed(() => {
  const startMinutes = parseShiftTime(activeShift.value?.time);
  if (startMinutes === null) {
    return String(activeShift.value?.time || "").trim();
  }

  const nextShiftDelta = displayShifts.value
    .map((shift) => parseShiftTime(shift.time))
    .filter((minutes) => minutes !== null)
    .map((minutes) => (minutes - startMinutes + 1440) % 1440)
    .filter((delta) => delta > 0)
    .sort((left, right) => left - right)[0];
  const duration = nextShiftDelta || 1440;
  const endMinutes = (startMinutes + duration - 1) % 1440;

  return `${formatShiftTime(startMinutes)} - ${formatShiftTime(endMinutes)}`;
});
const outputFiammettaTargetOperator = computed(() => {
  const targetName = String(activeShift.value?.fiammetta?.target || "").trim();
  if (!targetName) {
    return null;
  }

  const match = Object.entries(props.operatorTable || {}).find(
    ([, operator]) =>
      String(operator?.name || "").trim() === targetName,
  );

  return {
    charId: match?.[0] || "",
    name: targetName,
  };
});

function parseShiftTime(value) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(value || "").trim());
  const hours = Number(match?.[1]);
  const minutes = Number(match?.[2]);
  return match &&
    Number.isInteger(hours) &&
    Number.isInteger(minutes) &&
    hours >= 0 &&
    hours < 24 &&
    minutes >= 0 &&
    minutes < 60
    ? hours * 60 + minutes
    : null;
}

function formatShiftTime(totalMinutes) {
  const minutes = ((totalMinutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(
    minutes % 60,
  ).padStart(2, "0")}`;
}

const layoutCells = computed(() =>
  getRiicLayoutCells(activeState.value?.rooms || []),
);

function getRarity(charId) {
  return props.operatorTable?.[charId]?.rarity || 1;
}

function getRoomTitle(room) {
  const names = (room?.operators || [])
    .map((operator) => operator?.name)
    .filter(Boolean)
    .join("、");
  return names ? `${room.label}：${names}` : room.label;
}

function isProductionRoom(room) {
  return ["trading", "manufacture", "power"].includes(room?.facility);
}

function getRoomProductBackground(room) {
  if (room?.facility === "meeting") {
    return {
      type: "image",
      value: creditBackground,
    };
  }

  if (["office", "hire"].includes(room?.facility)) {
    return {
      type: "image",
      value: highCertificateBackground,
    };
  }

  if (room?.facility === "power") {
    return {
      type: "image",
      value: droneBackground,
    };
  }

  if (room?.product === "orundum") {
    return {
      type: "image",
      value:
        room?.facility === "manufacture"
          ? originiumShardBackground
          : orundumBackground,
    };
  }

  const imageByProduct = {
    lmd: lmdBackground,
    experience: battleRecordBackground,
    gold: goldBackground,
  };
  if (imageByProduct[room?.product]) {
    return {
      type: "image",
      value: imageByProduct[room.product],
    };
  }

  return null;
}

function getRoomEfficiencyLabel(room) {
  const sourceValue = room?.efficiency;
  const value = Number(sourceValue);

  return sourceValue !== null &&
    sourceValue !== "" &&
    Number.isFinite(value)
    ? String(Math.round(value))
    : "";
}

function getEmptySlotCount(room) {
  const expectedSlots = Number(room?.expectedSlots);
  const operatorCount = Array.isArray(room?.operators)
    ? room.operators.length
    : 0;

  return Number.isInteger(expectedSlots) && expectedSlots > operatorCount
    ? expectedSlots - operatorCount
    : 0;
}

function selectState(index) {
  emit("update:activeStateIndex", index);
}

function editRoom(room) {
  if (suppressNextRoomClick.value) {
    return;
  }

  if (!props.exportStatic && !props.placeholder && room?.key) {
    emit("edit-room", {
      roomKey: room.key,
      stateIndex: props.activeStateIndex,
    });
  }
}

function updateShift(index, field, event) {
  emit("update:shift", {
    index,
    [field]: event.target.value,
  });
}

function updateTitle(event) {
  emit("update:title", event.target.value);
}

function startDroneDrag(event) {
  if (!props.droneTarget) {
    event.preventDefault();
    return;
  }

  isDraggingDrone.value = true;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", props.droneTarget);
  }
}

function isDroneDropRoom(room) {
  return ["trading", "manufacture"].includes(room?.facility);
}

function allowRoomDroneDrop(room, event) {
  if (isDroneDropRoom(room) && props.droneTarget) {
    event.dataTransfer.dropEffect = "move";
  }
}

function dropRoomDroneTarget(room) {
  if (isDroneDropRoom(room)) {
    emit("select-drone-target", room.key);
  }
}

function endDroneDrag() {
  isDraggingDrone.value = false;
}

function getOperatorKey(operator) {
  const charId = String(operator?.charId || "").trim();
  return charId
    ? `id:${charId}`
    : `name:${String(operator?.name || "").trim()}`;
}

function getExpectedSlots(room) {
  const slots = Number(room?.expectedSlots);
  return Number.isInteger(slots) && slots > 0 ? slots : null;
}

function roomHasOperator(room, operatorKey) {
  return (room?.operators || []).some(
    (operator) => getOperatorKey(operator) === operatorKey,
  );
}

function canMoveOperatorToRoom(room) {
  const source = draggedOperator.value;
  if (
    !source ||
    !room?.key ||
    room.key === source.roomKey ||
    roomHasOperator(room, source.operatorKey)
  ) {
    return false;
  }

  const expectedSlots = getExpectedSlots(room);
  return !expectedSlots || (room?.operators || []).length < expectedSlots;
}

function canSwapOperatorWith(room, operator) {
  const source = draggedOperator.value;
  if (
    !source ||
    !room?.key ||
    room.key === source.roomKey ||
    getOperatorKey(operator) === source.operatorKey ||
    roomHasOperator(room, source.operatorKey)
  ) {
    return false;
  }

  return true;
}

function canDropOperatorOnRoom(room) {
  return (
    canMoveOperatorToRoom(room) ||
    (room?.operators || []).some((operator) =>
      canSwapOperatorWith(room, operator),
    )
  );
}

function startOperatorDrag(event, room, operator) {
  if (props.exportStatic || props.placeholder || !room?.key || !operator) {
    event.preventDefault();
    return;
  }

  draggedOperator.value = {
    roomKey: room.key,
    operatorKey: getOperatorKey(operator),
  };
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", draggedOperator.value.operatorKey);
  }
}

function endOperatorDrag() {
  draggedOperator.value = null;
}

function suppressRoomClickOnce() {
  suppressNextRoomClick.value = true;
  window.setTimeout(() => {
    suppressNextRoomClick.value = false;
  }, 0);
}

function allowRoomDrop(room, event) {
  if (
    (isDraggingDrone.value && isDroneDropRoom(room) && props.droneTarget) ||
    (draggedOperator.value && canDropOperatorOnRoom(room))
  ) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }
}

function dropRoom(room, event) {
  event.preventDefault();

  if (draggedOperator.value && canMoveOperatorToRoom(room)) {
    suppressRoomClickOnce();
    emit("move-operator", {
      stateIndex: props.activeStateIndex,
      sourceRoomKey: draggedOperator.value.roomKey,
      sourceOperatorKey: draggedOperator.value.operatorKey,
      targetRoomKey: room.key,
    });
    return;
  }

  if (isDraggingDrone.value) {
    dropRoomDroneTarget(room);
  }
}

function allowOperatorDrop(room, operator, event) {
  if (draggedOperator.value && canSwapOperatorWith(room, operator)) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }
}

function dropOperator(room, operator) {
  if (!draggedOperator.value || !canSwapOperatorWith(room, operator)) {
    return;
  }

  suppressRoomClickOnce();
  emit("move-operator", {
    stateIndex: props.activeStateIndex,
    sourceRoomKey: draggedOperator.value.roomKey,
    sourceOperatorKey: draggedOperator.value.operatorKey,
    targetRoomKey: room.key,
    targetOperatorKey: getOperatorKey(operator),
  });
}
</script>

<template>
  <section
    class="riic-schedule-preview"
    :class="{
      'export-output': outputDecorated,
      [`export-output-theme-${outputTheme}`]: outputDecorated,
    }"
  >
    <header v-if="!exportStatic" class="schedule-preview-heading">
      <input
        :value="displayTitle"
        type="text"
        class="schedule-preview-title-input"
        aria-label="排班表标题"
        @input="updateTitle"
      />
      <div
        class="schedule-preview-state-tabs"
        :style="{
          gridTemplateColumns: `repeat(${Math.max(displayShifts.length, 1)}, minmax(0, 1fr))`,
        }"
        role="tablist"
        aria-label="班次"
      >
        <div
          v-for="shift in displayShifts"
          :key="shift.id"
          class="schedule-preview-state-tab"
          :class="{ active: shift.index === activeStateIndex }"
        >
          <input
            :value="shift.time"
            type="time"
            class="schedule-preview-state-time"
            :aria-label="`${shift.name}开始时间`"
            @input="updateShift(shift.index, 'time', $event)"
          />
          <input
            :value="shift.name"
            type="text"
            class="schedule-preview-state-name"
            :aria-label="`班次 ${shift.index + 1} 名称`"
            @input="updateShift(shift.index, 'name', $event)"
          />
          <button
            type="button"
            class="schedule-preview-state-select"
            role="tab"
            :aria-label="`切换到${shift.name}`"
            :aria-selected="shift.index === activeStateIndex"
            @click="selectState(shift.index)"
          >
            <v-icon icon="mdi-swap-horizontal" size="15"></v-icon>
            <span>切换</span>
          </button>
        </div>
      </div>
    </header>
    <header
      v-else-if="!outputDecorated"
      class="schedule-preview-export-heading"
    >
      <strong>{{ activeShift?.name || "班次" }}</strong>
      <span>{{ activeShift?.time || "09:00" }}</span>
    </header>
    <header v-else class="schedule-preview-output-shift-heading">
      <strong>{{ activeShift?.name || "班次" }}</strong>
      <span>{{ activeShiftPeriod }}</span>
    </header>

    <div v-if="activeState" class="schedule-preview-layout">
      <template v-for="(room, index) in layoutCells" :key="`cell-${index}`">
        <template
          v-if="
            !exportStatic &&
            $slots['schedule-auxiliary'] &&
            index === 20
          "
        >
          <div class="schedule-preview-auxiliary">
            <slot name="schedule-auxiliary"></slot>
          </div>
        </template>
        <template
          v-else-if="
            exportStatic ||
            !$slots['schedule-auxiliary'] ||
            index !== 21
          "
        >
          <div
            v-if="
              outputDecorated &&
              index === 22 &&
              outputFiammettaTargetOperator
            "
            class="schedule-preview-fiammetta-card"
            :title="`菲亚梅塔应用：${outputFiammettaTargetOperator.name}`"
          >
            <div class="schedule-preview-fiammetta-flow">
              <OperatorAvatar
                char-id="char_300_phenxi"
                :size="45"
                :mobile-size="39"
                :border="true"
              ></OperatorAvatar>
              <v-icon
                icon="mdi-arrow-right"
                size="22"
                aria-hidden="true"
              ></v-icon>
              <OperatorAvatar
                v-if="outputFiammettaTargetOperator.charId"
                :char-id="outputFiammettaTargetOperator.charId"
                :rarity="getRarity(outputFiammettaTargetOperator.charId)"
                :size="45"
                :mobile-size="39"
                :border="true"
              ></OperatorAvatar>
              <span
                v-else
                class="schedule-preview-fiammetta-manual-target"
              >
                {{ outputFiammettaTargetOperator.name }}
              </span>
            </div>
          </div>
          <button
            v-else-if="room"
          type="button"
          class="schedule-preview-room"
          :class="[
            `facility-${room.facility}`,
            {
              'is-production-room': isProductionRoom(room),
              selected: room.key === selectedRoomKey,
               edited: room.manuallyEdited,
               placeholder,
               'drone-drop-target':
                 isDraggingDrone && isDroneDropRoom(room),
               'operator-drop-target':
                 Boolean(draggedOperator) && canDropOperatorOnRoom(room),
             },
           ]"
           :title="getRoomTitle(room)"
           :aria-disabled="placeholder"
           @click="editRoom(room)"
           @dragover="allowRoomDrop(room, $event)"
           @drop="dropRoom(room, $event)"
        >
          <span class="schedule-preview-room-heading">
            <strong>{{ room.label }}</strong>
          </span>
          <span
            v-if="room.key === droneTarget"
            class="schedule-preview-room-drone"
            draggable="true"
            @click.stop
            @dragstart.stop="startDroneDrag"
            @dragend.stop="endDroneDrag"
            title="无人机投向"
            aria-label="无人机投向"
          >
            <v-icon icon="mdi-quadcopter" size="22" aria-hidden="true"></v-icon>
          </span>
          <span
            v-if="getRoomProductBackground(room)"
            class="schedule-preview-resource-background"
            aria-hidden="true"
          >
            <img
              class="schedule-preview-resource-image"
              :src="getRoomProductBackground(room).value"
              alt=""
            />
          </span>
           <div class="schedule-preview-avatars">
             <div
               v-for="operator in room.operators"
               :key="`${room.key}:${operator.charId || operator.name}`"
               class="schedule-preview-operator"
               :class="{
                 dragging:
                   draggedOperator?.roomKey === room.key &&
                   draggedOperator?.operatorKey === getOperatorKey(operator),
                 'operator-drop-target': canSwapOperatorWith(room, operator),
               }"
               :draggable="!exportStatic && !placeholder"
               @dragstart.stop="startOperatorDrag($event, room, operator)"
               @dragover.stop="allowOperatorDrop(room, operator, $event)"
               @drop.stop.prevent="dropOperator(room, operator)"
               @dragend.stop="endOperatorDrag"
             >
               <OperatorAvatar
                 v-if="operator.charId"
                :char-id="operator.charId"
                :rarity="getRarity(operator.charId)"
                :size="45"
                :mobile-size="39"
                border
              ></OperatorAvatar>
              <span
                v-else
                class="schedule-preview-manual-operator"
                :title="operator.name"
              >
                 {{ operator.name }}
               </span>
             </div>
             <span
               v-for="slotIndex in getEmptySlotCount(room)"
              :key="`${room.key}:empty:${slotIndex}`"
              class="schedule-preview-empty-slot"
               aria-hidden="true"
             ></span>
           </div>
          <span
            v-if="showRoomEfficiency && getRoomEfficiencyLabel(room)"
            class="schedule-preview-efficiency"
            :title="`效率 ${getRoomEfficiencyLabel(room)}`"
          >
            {{ getRoomEfficiencyLabel(room) }}
          </span>
          </button>
          <div v-else class="schedule-preview-empty-cell" aria-hidden="true"></div>
        </template>
      </template>
    </div>
  </section>
</template>

<style scoped>
.riic-schedule-preview {
  background: transparent;
}

.riic-schedule-preview.export-output {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  background: var(--riic-export-surface);
}

.riic-schedule-preview.export-output::before {
  position: absolute;
  z-index: 0;
  inset: 0;
  background: transparent;
  content: "";
  pointer-events: none;
}

.riic-schedule-preview.export-output-theme-orundum::before {
  background: linear-gradient(
    30deg,
    rgba(190, 52, 52, 0.28) 0%,
    rgba(190, 52, 52, 0.16) 14%,
    transparent 40%
  );
}

.riic-schedule-preview.export-output-theme-experience::before {
  background: linear-gradient(
    30deg,
    rgba(202, 156, 43, 0.28) 0%,
    rgba(202, 156, 43, 0.16) 14%,
    transparent 40%
  );
}

.riic-schedule-preview.export-output-theme-balanced::before {
  background: linear-gradient(
    30deg,
    rgba(39, 92, 70, 0.28) 0%,
    rgba(39, 92, 70, 0.16) 14%,
    transparent 40%
  );
}

.riic-schedule-preview.export-output-theme-lmd::before {
  background: linear-gradient(
    30deg,
    rgba(41, 105, 180, 0.28) 0%,
    rgba(41, 105, 180, 0.16) 14%,
    transparent 40%
  );
}

.schedule-preview-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 48px;
  gap: 12px;
  padding: 8px 10px 8px 12px;
  border-bottom: 1px solid var(--c-border-color);
}

.schedule-preview-title-input {
  width: min(420px, 42%);
  min-width: 180px;
  padding: 2px 0;
  overflow: hidden;
  border: 0;
  border-bottom: 1px solid transparent;
  background: transparent;
  color: var(--c-text-color);
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
  outline: 0;
}

.schedule-preview-title-input:hover,
.schedule-preview-title-input:focus {
  border-bottom-color: color-mix(
    in srgb,
    var(--riic-blue, #2878c8) 54%,
    var(--c-border-color)
  );
}

.schedule-preview-title-input:focus {
  color: var(--riic-blue, #2878c8);
}

.schedule-preview-state-tabs {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  width: min(640px, 100%);
  gap: 6px;
}

.schedule-preview-state-tab {
  display: grid;
  grid-template-columns: 64px 58px minmax(48px, 1fr);
  align-items: center;
  min-width: 0;
  min-height: 38px;
  gap: 5px;
  padding: 4px 6px;
  border: 1px solid var(--c-border-color);
  border-radius: 4px;
  background: var(--c-page-background-color);
  color: var(--c-text-color);
  text-align: left;
}

.schedule-preview-export-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 30px;
  padding: 0 10px;
  border-bottom: 1px solid var(--c-border-color);
  color: var(--c-text-color);
}

.schedule-preview-export-heading > strong {
  font-size: 15px;
  font-weight: 700;
  line-height: 1.4;
}

.schedule-preview-export-heading > span {
  color: var(--c-text-tip-color);
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}

.schedule-preview-output-shift-heading {
  display: flex;
  position: absolute;
  z-index: 2;
  bottom: 12px;
  left: 18px;
  align-items: baseline;
  gap: 12px;
  max-width: calc(100% - 36px);
  color: rgba(78, 87, 96, 0.72);
  pointer-events: none;
  white-space: nowrap;
}

.schedule-preview-output-shift-heading > strong {
  font-size: 36px;
  font-weight: 700;
  line-height: 1.1;
}

.schedule-preview-output-shift-heading > span {
  color: inherit;
  font-size: 24px;
  font-variant-numeric: tabular-nums;
  font-weight: 400;
  line-height: 1.15;
}

.schedule-preview-state-tab:hover,
.schedule-preview-state-tab.active {
  border-color: color-mix(in srgb, #2878c8 56%, var(--c-border-color));
  background: color-mix(
    in srgb,
    #2878c8 8%,
    var(--c-page-background-color)
  );
}

.schedule-preview-state-tab.active {
  box-shadow: inset 0 0 0 1px color-mix(in srgb, #2878c8 28%, transparent);
}

.schedule-preview-state-tab input {
  width: 100%;
  min-width: 0;
  height: 24px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--c-text-color);
  font: inherit;
  font-size: 12px;
  line-height: 1.25;
  outline: 0;
}

.schedule-preview-state-tab input[type="time"] {
  font-variant-numeric: tabular-nums;
}

.schedule-preview-state-tab input[type="text"] {
  font-weight: 600;
}

.schedule-preview-state-select {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 48px;
  min-height: 24px;
  gap: 2px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #2878c8;
  font: inherit;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.2;
  cursor: pointer;
}

.schedule-preview-state-select:hover {
  color: #185d9e;
}

.schedule-preview-state-select:focus-visible {
  outline: 2px solid #2878c8;
  outline-offset: 1px;
}

.schedule-preview-layout {
  display: grid;
  position: relative;
  z-index: 1;
  grid-template-columns:
    repeat(3, minmax(0, 0.9fr))
    minmax(0, 1.28fr)
    minmax(0, 0.9fr);
  gap: 7px;
  padding: 10px;
}

.schedule-preview-empty-cell {
  min-width: 0;
  min-height: 88px;
}

.schedule-preview-auxiliary {
  grid-column: span 2;
  min-width: 0;
  min-height: 88px;
}

.schedule-preview-fiammetta-card {
  --room-color: #4f9b72;
  display: flex;
  position: relative;
  min-width: 0;
  min-height: 88px;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
  padding: 7px 9px 18px;
  overflow: hidden;
  border: 0;
  border-radius: 4px;
  background: #e4e8eb;
  color: var(--riic-export-text);
}

.schedule-preview-fiammetta-flow {
  display: flex;
  position: relative;
  z-index: 1;
  align-items: center;
  justify-content: space-between;
  min-width: 0;
  gap: 5px;
}

.schedule-preview-fiammetta-flow > .v-icon {
  flex: 0 0 auto;
  color: var(--room-color);
}

.schedule-preview-fiammetta-manual-target {
  display: inline-flex;
  align-items: center;
  min-width: 0;
  min-height: 28px;
  padding: 0 4px;
  overflow: hidden;
  border: 1px solid var(--room-color);
  border-radius: 3px;
  color: var(--room-color);
  font-size: 10px;
  font-weight: 600;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.schedule-preview-room {
  --room-color: var(--c-text-tip-color);
  display: flex;
  position: relative;
  min-width: 0;
  min-height: 88px;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 6px;
  padding: 7px 9px 18px;
  overflow: hidden;
  border: 2px solid
    color-mix(in srgb, var(--room-color) 62%, var(--c-border-color));
  border-left-width: 6px;
  border-radius: 4px;
  background: var(--c-page-background-color);
  color: var(--c-text-color);
  text-align: left;
  cursor: pointer;
}

.schedule-preview-room:hover {
  background: color-mix(
    in srgb,
    var(--room-color) 7%,
    var(--c-page-background-color)
  );
}

.schedule-preview-room.placeholder {
  cursor: default;
}

.schedule-preview-room.placeholder:hover {
  background: var(--c-page-background-color);
}

.schedule-preview-room.selected {
  border-left-width: 8px;
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--room-color) 38%, transparent);
}

.schedule-preview-room.drone-drop-target {
  outline: 2px dashed
    color-mix(in srgb, var(--room-color) 72%, transparent);
  outline-offset: 2px;
}

.schedule-preview-room.operator-drop-target {
  outline: 2px dashed #2878c8;
  outline-offset: 2px;
}

.schedule-preview-room.edited {
  background: color-mix(
    in srgb,
    var(--room-color) 10%,
    var(--c-page-background-color)
  );
}

.schedule-preview-room-heading {
  display: flex;
  position: absolute;
  z-index: 1;
  right: 8px;
  bottom: 6px;
  align-items: baseline;
  max-width: calc(100% - 60px);
}

.schedule-preview-room-heading strong {
  overflow: hidden;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.schedule-preview-room-drone {
  display: inline-flex;
  position: absolute;
  z-index: 2;
  top: 6px;
  right: 7px;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  color: var(--room-color);
  filter: drop-shadow(0 2px 2px rgb(0 0 0 / 30%));
  cursor: grab;
}

.schedule-preview-room-drone:active {
  cursor: grabbing;
}

.schedule-preview-resource-background {
  position: absolute;
  z-index: 0;
  top: 50%;
  right: -24px;
  opacity: 0.17;
  transform: translateY(-50%);
  pointer-events: none;
}

.schedule-preview-resource-image {
  display: block;
  width: 96px;
  height: auto;
  max-width: none;
}

.schedule-preview-avatars {
  display: flex;
  position: relative;
  z-index: 1;
  min-height: 45px;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px;
}

.schedule-preview-operator {
  display: inline-flex;
  min-width: 0;
  cursor: grab;
}

.schedule-preview-operator.dragging {
  cursor: grabbing;
  opacity: 0.42;
}

.schedule-preview-operator.operator-drop-target {
  border-radius: 4px;
  box-shadow: 0 0 0 2px #2878c8;
}

.schedule-preview-empty-slot {
  display: block;
  box-sizing: border-box;
  width: 45px;
  height: 45px;
  border: 1px dashed
    color-mix(in srgb, var(--room-color) 56%, var(--c-border-color));
  border-radius: 3px;
  background: color-mix(
    in srgb,
    var(--room-color) 3%,
    var(--c-page-background-color)
  );
}

.schedule-preview-manual-operator {
  display: inline-flex;
  align-items: center;
  max-width: 72px;
  min-height: 28px;
  padding: 0 5px;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--room-color) 42%, var(--c-border-color));
  border-radius: 3px;
  color: var(--room-color);
  font-size: 10px;
  font-weight: 600;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.riic-schedule-preview.export-capture .schedule-preview-state-tab.active {
  border-color: #2878c8;
  background: var(--riic-export-active-surface);
  box-shadow: none;
}

.riic-schedule-preview.export-capture .schedule-preview-heading {
  border-bottom-color: var(--riic-export-border);
}

.riic-schedule-preview.export-capture .schedule-preview-export-heading {
  border-bottom-color: var(--riic-export-border);
  color: var(--riic-export-text);
}

.riic-schedule-preview.export-capture .schedule-preview-export-heading > span {
  color: var(--riic-export-text);
}

.riic-schedule-preview.export-capture .schedule-preview-heading > strong,
.riic-schedule-preview.export-capture .schedule-preview-state-tab,
.riic-schedule-preview.export-capture .schedule-preview-state-tab input {
  color: var(--riic-export-text);
}

.riic-schedule-preview.export-capture .schedule-preview-state-tab {
  border-color: var(--riic-export-border);
  background: var(--riic-export-surface);
  box-shadow: none;
}

.riic-schedule-preview.export-capture .schedule-preview-room {
  border-color: var(--room-color);
  background: var(--riic-export-surface);
  color: var(--riic-export-text);
}

.riic-schedule-preview.export-capture .schedule-preview-room:hover {
  background: var(--riic-export-surface);
}

.riic-schedule-preview.export-capture .schedule-preview-room.selected {
  box-shadow: none;
}

.riic-schedule-preview.export-capture .schedule-preview-room.drone-drop-target {
  outline-color: var(--room-color);
}

.riic-schedule-preview.export-capture .schedule-preview-room.operator-drop-target {
  outline: none;
}

.riic-schedule-preview.export-capture .schedule-preview-room.edited {
  background: var(--riic-export-edited-surface);
}

.riic-schedule-preview.export-capture .schedule-preview-empty-slot {
  border-color: var(--room-color);
  background: transparent;
}

.riic-schedule-preview.export-capture .schedule-preview-manual-operator {
  border-color: var(--room-color);
}

.schedule-preview-efficiency {
  position: absolute;
  z-index: 1;
  bottom: 6px;
  left: 9px;
  color: var(--room-color);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  line-height: 1.2;
}

.facility-trading {
  --room-color: #2878c8;
}

.facility-manufacture {
  --room-color: #b88616;
}

.facility-power {
  --room-color: #23866c;
}

.facility-control,
.facility-dormitory {
  --room-color: #4f9b72;
}

.facility-meeting {
  --room-color: #d46d2b;
}

.facility-office {
  --room-color: #c94f4f;
}

.facility-processing,
.facility-training {
  --room-color: #7d8792;
}

@media (max-width: 760px) {
  .schedule-preview-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .schedule-preview-state-tabs {
    width: 100%;
  }

  .schedule-preview-state-tab {
    grid-template-columns: 62px 54px minmax(42px, 1fr);
    padding: 4px 6px;
  }

  .schedule-preview-layout {
    gap: 4px;
    padding: 7px 4px;
  }

  .schedule-preview-room,
  .schedule-preview-empty-cell {
    min-height: 72px;
  }

  .schedule-preview-room {
    padding: 5px 6px 14px;
    border-left-width: 4px;
  }

  .schedule-preview-room.selected {
    border-left-width: 6px;
  }

  .schedule-preview-room-heading strong {
    font-size: 10px;
  }

  .schedule-preview-empty-slot {
    width: 39px;
    height: 39px;
  }

  .schedule-preview-resource-image {
    width: 66px;
  }

  .schedule-preview-efficiency {
    bottom: 5px;
    left: 6px;
    font-size: 10px;
  }

}
</style>
