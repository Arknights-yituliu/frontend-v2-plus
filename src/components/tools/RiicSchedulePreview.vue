<script setup>
import { computed } from "vue";
import OperatorAvatar from "/src/components/sprite/OperatorAvatar.vue";

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
});

const emit = defineEmits([
  "update:activeStateIndex",
  "update:shift",
  "edit-room",
]);

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
    };
  }),
);
const layoutCells = computed(() => {
  const rooms = activeState.value?.rooms || [];
  const roomsByFacility = new Map();
  for (const room of rooms) {
    const facilityRooms = roomsByFacility.get(room.facility) || [];
    facilityRooms.push(room);
    roomsByFacility.set(room.facility, facilityRooms);
  }

  const productionRooms = ["trading", "manufacture", "power"]
    .flatMap((facility) => roomsByFacility.get(facility) || [])
    .sort((left, right) => left.key.localeCompare(right.key, "en"));
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

function getProductLabel(product) {
  const labels = {
    lmd: "龙门币",
    experience: "作战记录",
    gold: "赤金",
    orundum: "源石碎片",
  };
  return labels[product] || "";
}

function getEffectTitle(metric) {
  const labels = {
    trading: "贸易站",
    manufacture: "制造站",
    meeting: "会客室",
    office: "办公室",
    power: "发电站",
  };
  return `${labels[metric?.facility] || "设施"} +${metric?.percent || 0}%`;
}

function selectState(index) {
  emit("update:activeStateIndex", index);
}

function editRoom(room) {
  if (room?.key) {
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
</script>

<template>
  <section class="riic-schedule-preview">
    <header class="schedule-preview-heading">
      <strong>排班表</strong>
      <div
        class="schedule-preview-state-tabs"
        :style="{
          gridTemplateColumns: `repeat(${Math.max(displayShifts.length, 1)}, minmax(0, 1fr))`,
        }"
        role="tablist"
        aria-label="班次"
      >
        <button
          v-for="shift in displayShifts"
          :key="shift.id"
          type="button"
          class="schedule-preview-state-tab"
          :class="{ active: shift.index === activeStateIndex }"
          :aria-selected="shift.index === activeStateIndex"
          @click="selectState(shift.index)"
        >
          <input
            :value="shift.time"
            type="time"
            :aria-label="`${shift.name}开始时间`"
            @click.stop
            @input="updateShift(shift.index, 'time', $event)"
          />
          <input
            :value="shift.name"
            type="text"
            :aria-label="`班次 ${shift.index + 1} 名称`"
            @click.stop
            @input="updateShift(shift.index, 'name', $event)"
          />
        </button>
      </div>
    </header>

    <div v-if="activeState" class="schedule-preview-layout">
      <template v-for="(room, index) in layoutCells" :key="`cell-${index}`">
        <button
          v-if="room"
          type="button"
          class="schedule-preview-room"
          :class="[
            `facility-${room.facility}`,
            {
              selected: room.key === selectedRoomKey,
              edited: room.manuallyEdited,
            },
          ]"
          :title="getRoomTitle(room)"
          @click="editRoom(room)"
        >
          <span class="schedule-preview-room-heading">
            <strong>{{ room.label }}</strong>
            <small v-if="getProductLabel(room.product)">
              {{ getProductLabel(room.product) }}
            </small>
          </span>
          <span class="schedule-preview-avatars">
            <template
              v-for="operator in room.operators"
              :key="`${room.key}:${operator.charId || operator.name}`"
            >
              <OperatorAvatar
                v-if="operator.charId"
                :char-id="operator.charId"
                :rarity="getRarity(operator.charId)"
                :size="30"
                :mobile-size="26"
                border
              ></OperatorAvatar>
              <span
                v-else
                class="schedule-preview-manual-operator"
                :title="operator.name"
              >
                {{ operator.name }}
              </span>
            </template>
          </span>
          <span
            v-if="room.effectMetrics.length"
            class="schedule-preview-effects"
          >
            <i
              v-for="metric in room.effectMetrics"
              :key="metric.facility"
              :class="`facility-${metric.facility}`"
              :title="getEffectTitle(metric)"
            >
              +{{ metric.percent }}%
            </i>
          </span>
        </button>
        <div v-else class="schedule-preview-empty-cell" aria-hidden="true"></div>
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
  grid-template-columns: 72px minmax(0, 1fr);
  align-items: center;
  min-width: 0;
  min-height: 38px;
  gap: 6px;
  padding: 4px 8px;
  border: 1px solid var(--c-border-color);
  border-radius: 4px;
  background: var(--c-page-background-color);
  color: var(--c-text-color);
  cursor: pointer;
  text-align: left;
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
  font-weight: 700;
}

.schedule-preview-layout {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 7px;
  padding: 10px;
}

.schedule-preview-empty-cell {
  min-width: 0;
  min-height: 80px;
}

.schedule-preview-room {
  --room-color: var(--c-text-tip-color);
  display: flex;
  min-width: 0;
  min-height: 80px;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  gap: 6px;
  padding: 7px 8px;
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

.schedule-preview-room.selected {
  border-left-width: 8px;
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--room-color) 38%, transparent);
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
  align-items: baseline;
  justify-content: space-between;
  width: 100%;
  gap: 5px;
}

.schedule-preview-room-heading strong {
  overflow: hidden;
  font-size: 12px;
  font-weight: 650;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.schedule-preview-room-heading small {
  flex: 0 0 auto;
  color: var(--room-color);
  font-size: 10px;
  font-weight: 700;
  line-height: 1.25;
}

.schedule-preview-avatars {
  display: flex;
  min-height: 30px;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px;
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
  font-weight: 700;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.schedule-preview-effects {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
}

.schedule-preview-effects i {
  font-size: 10px;
  font-style: normal;
  font-weight: 700;
  line-height: 1.25;
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

.schedule-preview-effects .facility-trading {
  color: #2878c8;
}

.schedule-preview-effects .facility-manufacture {
  color: #b88616;
}

.schedule-preview-effects .facility-power {
  color: #23866c;
}

.schedule-preview-effects .facility-meeting {
  color: #d46d2b;
}

.schedule-preview-effects .facility-office {
  color: #c94f4f;
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
    grid-template-columns: 64px minmax(0, 1fr);
    padding: 4px 6px;
  }

  .schedule-preview-layout {
    gap: 4px;
    padding: 7px 4px;
  }

  .schedule-preview-room,
  .schedule-preview-empty-cell {
    min-height: 68px;
  }

  .schedule-preview-room {
    gap: 4px;
    padding: 5px;
    border-left-width: 4px;
  }

  .schedule-preview-room.selected {
    border-left-width: 6px;
  }

  .schedule-preview-room-heading strong {
    font-size: 10px;
  }

  .schedule-preview-room-heading small,
  .schedule-preview-effects {
    display: none;
  }
}
</style>
