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
  shifts: {
    type: Array,
    default: () => [],
  },
  droneTargetOptions: {
    type: Array,
    default: () => [],
  },
  droneTarget: {
    type: String,
    default: "",
  },
  droneOrder: {
    type: String,
    default: "pre",
  },
  placeholder: {
    type: Boolean,
    default: false,
  },
  exportStatic: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits([
  "update:activeStateIndex",
  "update:shift",
  "edit-room",
  "move-operator",
  "select-drone-target",
  "update:drone-order",
]);

const isDraggingDrone = ref(false);
const draggedOperator = ref(null);
const suppressNextRoomClick = ref(false);
const activeState = computed(() => {
  const states = props.preview?.states || [];
  return states[props.activeStateIndex] || states[0] || null;
});
const displayShifts = computed(() =>
  (props.preview?.states || []).map((state, index) => {
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
  }),
);
const activeShift = computed(
  () =>
    displayShifts.value[props.activeStateIndex] ||
    displayShifts.value[0] ||
    null,
);
const visibleDroneTargetOptions = computed(() =>
  props.droneTargetOptions.filter((option) => option?.facility !== "power"),
);
const layoutCells = computed(() => {
  const rooms = activeState.value?.rooms || [];
  const roomsByFacility = new Map();
  for (const room of rooms) {
    const facilityRooms = roomsByFacility.get(room.facility) || [];
    facilityRooms.push(room);
    roomsByFacility.set(room.facility, facilityRooms);
  }

  for (const facilityRooms of roomsByFacility.values()) {
    facilityRooms.sort(
      (left, right) =>
        Number(left?.stationIndex || 0) - Number(right?.stationIndex || 0),
    );
  }

  const productionRooms = rooms.filter(isProductionRoom);
  const getFacilityRoom = (facility, index = 0) =>
    (roomsByFacility.get(facility) || [])[index] || null;
  const cells = Array(25).fill(null);

  cells[3] = getFacilityRoom("control");
  cells[4] = getFacilityRoom("meeting");
  cells[5] = productionRooms[0] || null;
  cells[6] = productionRooms[1] || null;
  cells[7] = productionRooms[2] || null;
  cells[8] = getFacilityRoom("dormitory", 0);
  cells[9] = getFacilityRoom("processing");
  cells[10] = productionRooms[3] || null;
  cells[11] = productionRooms[4] || null;
  cells[12] = productionRooms[5] || null;
  cells[13] = getFacilityRoom("dormitory", 1);
  cells[14] = getFacilityRoom("office");
  cells[15] = productionRooms[6] || null;
  cells[16] = productionRooms[7] || null;
  cells[17] = productionRooms[8] || null;
  cells[18] = getFacilityRoom("dormitory", 2);
  cells[19] = getFacilityRoom("training");
  cells[23] = getFacilityRoom("dormitory", 3);

  return cells;
});

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

  const imageByProduct = {
    lmd: lmdBackground,
    experience: battleRecordBackground,
    gold: goldBackground,
    orundum: originiumShardBackground,
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

function selectDroneTarget(option) {
  if (!option?.disabled && option?.value) {
    emit("select-drone-target", option.value);
  }
}

function selectDroneOrder(order) {
  emit("update:drone-order", order === "post" ? "post" : "pre");
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
  return visibleDroneTargetOptions.value.some(
    (option) => option.value === room?.key && !option.disabled,
  );
}

function allowRoomDroneDrop(room, event) {
  if (isDroneDropRoom(room) && props.droneTarget) {
    event.dataTransfer.dropEffect = "move";
  }
}

function dropRoomDroneTarget(room) {
  if (isDroneDropRoom(room)) {
    selectDroneTarget(
      visibleDroneTargetOptions.value.find(
        (option) => option.value === room.key,
      ),
    );
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
  <section class="riic-schedule-preview">
    <header v-if="!exportStatic" class="schedule-preview-heading">
      <strong>排班表</strong>
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
    <header v-else class="schedule-preview-export-heading">
      <strong>{{ activeShift?.name || "班次" }}</strong>
      <span>{{ activeShift?.time || "09:00" }}</span>
    </header>

    <div v-if="activeState" class="schedule-preview-layout">
      <template v-for="(room, index) in layoutCells" :key="`cell-${index}`">
        <div
          v-if="
            !exportStatic &&
            index === 20 &&
            visibleDroneTargetOptions.length
          "
          class="schedule-preview-drone-controls"
          :class="{
            'has-three-rows': visibleDroneTargetOptions.length > 6,
          }"
          aria-label="无人机投向"
        >
          <div class="schedule-preview-drone-mode">
            <v-icon
              class="schedule-preview-drone-icon"
              icon="mdi-quadcopter"
              size="21"
              aria-hidden="true"
            ></v-icon>
            <div class="schedule-preview-drone-order">
              <button
                type="button"
                :class="{ active: droneOrder !== 'post' }"
                :aria-pressed="droneOrder !== 'post'"
                @click="selectDroneOrder('pre')"
              >
                换班前
              </button>
              <button
                type="button"
                :class="{ active: droneOrder === 'post' }"
                :aria-pressed="droneOrder === 'post'"
                @click="selectDroneOrder('post')"
              >
                换班后
              </button>
            </div>
          </div>
          <div class="schedule-preview-drone-options">
            <button
              v-for="option in visibleDroneTargetOptions"
              :key="option.value"
              type="button"
              :class="[
                `facility-${option.facility}`,
                {
                  active: option.value === droneTarget,
                  disabled: option.disabled,
                },
              ]"
              :disabled="option.disabled"
              :aria-pressed="option.value === droneTarget"
              @click="selectDroneTarget(option)"
            >
              <v-icon
                v-if="option.value === droneTarget"
                class="schedule-preview-drone-option-icon"
                icon="mdi-quadcopter"
                size="14"
              ></v-icon>
              {{ option.label }}
            </button>
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
            v-if="getRoomEfficiencyLabel(room)"
            class="schedule-preview-efficiency"
            :title="`效率 ${getRoomEfficiencyLabel(room)}`"
          >
            {{ getRoomEfficiencyLabel(room) }}
          </span>
        </button>
        <div
          v-else-if="
            !(
              visibleDroneTargetOptions.length &&
              index === 21
            )
          "
          class="schedule-preview-empty-cell"
          aria-hidden="true"
        ></div>
      </template>
    </div>
  </section>
</template>

<style scoped>
.riic-schedule-preview {
  background: transparent;
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

.schedule-preview-heading > strong {
  flex: 0 0 auto;
  color: var(--c-text-color);
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
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

.riic-schedule-preview.export-capture .schedule-preview-drone-controls {
  background: rgba(125, 135, 146, 0.1);
}

.riic-schedule-preview.export-capture .schedule-preview-drone-order button.active {
  background: var(--riic-export-active-surface);
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

.schedule-preview-drone-controls {
  display: grid;
  grid-column: 1 / span 2;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: stretch;
  justify-self: stretch;
  width: auto;
  gap: 8px;
  padding: 8px;
  border-radius: 8px;
  background: rgba(125, 135, 146, 0.1);
}

.schedule-preview-drone-icon {
  color: #6b7785;
}

.schedule-preview-drone-mode {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.schedule-preview-drone-options {
  display: grid;
  align-self: stretch;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  grid-auto-rows: minmax(0, 1fr);
  gap: 4px;
}

.schedule-preview-drone-order {
  display: inline-flex;
  align-items: stretch;
  overflow: hidden;
  border: 1px solid var(--c-border-color);
  border-radius: 4px;
}

.schedule-preview-drone-order button {
  min-width: 48px;
  padding: 3px 6px;
  border: 0;
  border-left: 1px solid var(--c-border-color);
  background: transparent;
  color: var(--riic-muted);
  font: inherit;
  font-size: 10px;
  line-height: 1.2;
  white-space: nowrap;
  cursor: pointer;
}

.schedule-preview-drone-order button:first-child {
  border-left: 0;
}

.schedule-preview-drone-order button.active {
  background: color-mix(
    in srgb,
    var(--riic-blue) 13%,
    var(--c-page-background-color)
  );
  color: var(--riic-blue);
  font-weight: 700;
}

.schedule-preview-drone-options button {
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  padding: 3px 5px;
  border: 1px solid var(--room-color, #7d8792);
  border-radius: 4px;
  background: transparent;
  color: var(--room-color, #65717f);
  font: inherit;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
}

.schedule-preview-drone-option-icon {
  margin-right: 2px;
  vertical-align: -2px;
}

.schedule-preview-drone-controls.has-three-rows
  .schedule-preview-drone-options
  button {
  min-height: 0;
  padding-top: 2px;
  padding-bottom: 2px;
}

.schedule-preview-drone-options button:hover,
.schedule-preview-drone-options button.active {
  background: var(--drone-target-surface, rgba(125, 135, 146, 0.12));
  color: var(--room-color, #65717f);
}

.schedule-preview-drone-options button.active {
  box-shadow: inset 0 0 0 1px var(--room-color, #65717f);
}

.schedule-preview-drone-options button.disabled,
.schedule-preview-drone-options button:disabled {
  cursor: default;
  opacity: 0.56;
}

.schedule-preview-drone-options button.facility-trading {
  --drone-target-surface: rgba(40, 120, 200, 0.12);
}

.schedule-preview-drone-options button.facility-manufacture {
  --drone-target-surface: rgba(184, 134, 22, 0.13);
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

  .schedule-preview-drone-controls {
    grid-column: 1 / -1;
    padding: 6px;
  }

  .schedule-preview-drone-order button {
    min-width: 44px;
    padding-inline: 5px;
  }

  .schedule-preview-drone-options button {
    min-height: 20px;
    padding: 3px 4px;
    font-size: 10px;
  }
}
</style>
