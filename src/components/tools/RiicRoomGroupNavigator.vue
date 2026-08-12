<script setup>
const props = defineProps({
  selectionRows: {
    type: Array,
    default: () => [],
  },
  activeGroupId: {
    type: String,
    default: "",
  },
  getGroupStatus: {
    type: Function,
    required: true,
  },
});

const emit = defineEmits(["select-group"]);

function selectGroup(groupId) {
  emit("select-group", groupId);
}

function getTileStatus(group) {
  return (
    props.getGroupStatus(group) || {
      tone: "pending",
      icon: "mdi-alert-circle-outline",
      title: "待填入",
    }
  );
}
</script>

<template>
  <div class="room-group-selection-layout">
    <div class="room-group-schematic">
      <div class="room-group-rows" aria-label="房间组列表">
        <div
          v-for="row in selectionRows"
          :key="row.id"
          class="room-group-row"
          :class="`room-group-row-${row.id}`"
        >
          <button
            v-for="group in row.groups"
            :key="group.id"
            type="button"
            class="room-group-tile"
            :class="[
              `tone-${group.tone}`,
              `status-${getTileStatus(group).tone}`,
              { active: activeGroupId === group.id },
            ]"
            :aria-pressed="activeGroupId === group.id"
            @click="selectGroup(group.id)"
          >
            <span class="room-group-tile-title">
              <v-icon :icon="group.icon" size="20"></v-icon>
              <strong>{{ group.label }}</strong>
              <v-icon
                v-if="getTileStatus(group).tone !== 'complete'"
                class="room-group-status-icon"
                :class="`status-${getTileStatus(group).tone}`"
                :icon="getTileStatus(group).icon"
                :title="getTileStatus(group).title"
                size="15"
              ></v-icon>
            </span>
            <span class="room-group-count">
              <i
                v-for="index in group.count"
                :key="index"
                aria-hidden="true"
              ></i>
              <small>
                <template v-if="group.stationLevelSummary">
                  {{ group.stationLevelSummary }}
                </template>
              </small>
            </span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.room-group-selection-layout {
  display: grid;
  grid-template-columns: 164px minmax(0, 1fr);
  align-items: start;
  gap: 18px;
  padding: 12px;
  border-radius: 6px;
  background: color-mix(
    in srgb,
    var(--riic-muted) 8%,
    var(--c-page-background-color-secondary)
  );
}

.room-group-progress {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  padding: 2px 0;
}

.room-group-progress-heading {
  margin: 0 0 5px 8px;
  color: var(--riic-muted);
  font-size: 11px;
  font-weight: 700;
  line-height: 1.4;
}

.room-group-progress-item {
  --room-group-progress-color: var(--riic-orange);
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-width: 0;
  min-height: 32px;
  gap: 8px;
  padding: 5px 7px 5px 8px;
  border: 0;
  border-left: 2px solid transparent;
  border-radius: 0;
  background: transparent;
  color: var(--c-text-color);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    border-color 0.18s ease,
    background-color 0.18s ease;
}

.room-group-progress-item:hover {
  background: color-mix(
    in srgb,
    var(--room-group-progress-color) 6%,
    transparent
  );
}

.room-group-progress-item.active {
  border-left-color: var(--room-group-progress-color);
  background: color-mix(
    in srgb,
    var(--room-group-progress-color) 10%,
    transparent
  );
}

.room-group-progress-item.tone-complete {
  --room-group-progress-color: var(--riic-green);
}

.room-group-progress-item.tone-pending {
  --room-group-progress-color: var(--riic-orange);
}

.room-group-progress-item.tone-error {
  --room-group-progress-color: var(--riic-red);
}

.room-group-progress-item.tone-notRequired {
  --room-group-progress-color: var(--riic-muted);
}

.room-group-progress-label {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 6px;
}

.room-group-progress-label > .v-icon {
  flex: 0 0 auto;
  color: var(--room-group-progress-color);
}

.room-group-progress-label > span {
  overflow: hidden;
  color: var(--c-text-color);
  font-size: 12px;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.room-group-progress-item small {
  flex: 0 0 auto;
  color: var(--room-group-progress-color);
  font-size: 11px;
  line-height: 1.3;
  white-space: nowrap;
}

.room-group-schematic {
  min-width: 0;
}

.room-group-rows {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.room-group-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
  gap: 8px;
  min-width: 0;
}

.room-group-tile {
  --room-group-color: var(--riic-blue);
  display: flex;
  position: relative;
  flex-direction: column;
  align-items: flex-start;
  box-sizing: border-box;
  flex: 0 0 180px;
  justify-content: space-between;
  width: 180px;
  min-width: 180px;
  max-width: 180px;
  min-height: 82px;
  padding: 10px;
  border: 1px solid var(--c-border-color);
  border-left: 3px solid
    color-mix(in srgb, var(--room-group-color) 70%, var(--c-border-color));
  border-radius: 0;
  background: var(--c-page-background-color-secondary);
  color: var(--c-text-color);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    border-color 0.18s ease,
    background-color 0.18s ease,
    box-shadow 0.18s ease;
}

.room-group-tile.width-double {
  flex-basis: 360px;
  width: 360px;
  min-width: 360px;
  max-width: 360px;
}

.room-group-tile.tone-trading {
  --room-group-color: var(--riic-blue);
}

.room-group-tile.tone-manufacture {
  --room-group-color: var(--riic-gold);
}

.room-group-tile.tone-power {
  --room-group-color: var(--riic-green);
}

.room-group-tile.tone-control {
  --room-group-color: #6a629e;
}

.room-group-tile.tone-meeting {
  --room-group-color: #b95c7a;
}

.room-group-tile.tone-dormitory {
  --room-group-color: #3d8586;
}

.room-group-tile.tone-processing {
  --room-group-color: #ad762c;
}

.room-group-tile.tone-hire,
.room-group-tile.tone-office {
  --room-group-color: #84699c;
}

.room-group-tile.tone-training {
  --room-group-color: #bf6252;
}

.room-group-tile:hover {
  background: color-mix(
    in srgb,
    var(--room-group-color) 6%,
    var(--c-page-background-color-secondary)
  );
}

.room-group-tile.active {
  border-left-width: 3px;
  background: var(--c-page-background-color-secondary);
}

.room-group-tile-title {
  display: flex;
  align-items: center;
  width: 100%;
  padding-right: 22px;
  gap: 7px;
  min-width: 0;
}

.room-group-tile-title > .v-icon {
  flex: 0 0 auto;
  color: var(--room-group-color);
}

.room-group-tile-title > .room-group-status-icon {
  position: absolute;
  top: 9px;
  right: 9px;
  margin-left: 0;
}

.room-group-status-icon.tone-ready {
  color: var(--riic-green);
}

.room-group-status-icon.tone-waiting,
.room-group-status-icon.tone-selectionPending {
  color: var(--riic-orange);
}

.room-group-status-icon.tone-blocked {
  color: var(--riic-red);
}

.room-group-tile strong {
  overflow: hidden;
  max-width: 100%;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.room-group-count {
  display: flex;
  align-items: center;
  min-height: 18px;
  gap: 4px;
  margin-top: 9px;
}

.room-group-count i {
  display: block;
  width: 14px;
  height: 11px;
  border: 1px solid
    color-mix(in srgb, var(--room-group-color) 58%, var(--c-border-color));
  border-radius: 2px;
  background: color-mix(
    in srgb,
    var(--room-group-color) 14%,
    var(--c-page-background-color)
  );
}

.room-group-count small {
  margin-left: 2px;
  color: var(--riic-muted);
  font-size: 11px;
  line-height: 1;
  white-space: nowrap;
}

@media (max-width: 640px) {
  .room-group-selection-layout {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .room-group-progress {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 2px 10px;
  }

  .room-group-progress-heading {
    grid-column: 1 / -1;
  }

  .room-group-tile {
    flex: 1 1 calc(50% - 4px);
    width: auto;
    min-width: 0;
    max-width: none;
  }

  .room-group-tile.width-double {
    flex: 1 1 100%;
    width: 100%;
    min-width: 0;
    max-width: none;
  }
}

/* The three schematic rows use completion status for emphasis while retaining
 * facility-colored icons for fast recognition. */
.room-group-selection-layout {
  display: block;
  padding: 12px;
}

.room-group-schematic {
  width: 100%;
}

.room-group-row {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  flex-wrap: nowrap;
}

.room-group-tile {
  --room-group-facility-color: var(--room-group-color);
  --room-group-status-color: var(--riic-orange);
  flex: 0 0 auto;
  width: auto;
  min-width: 0;
  max-width: none;
  border-left-color: color-mix(
    in srgb,
    var(--room-group-status-color) 70%,
    var(--c-border-color)
  );
  background: color-mix(
    in srgb,
    var(--room-group-status-color) 4%,
    var(--c-page-background-color-secondary)
  );
}

.room-group-tile.status-complete {
  --room-group-status-color: var(--riic-green);
}

.room-group-tile.status-error {
  --room-group-status-color: var(--riic-red);
}

.room-group-tile:hover {
  background: color-mix(
    in srgb,
    var(--room-group-status-color) 8%,
    var(--c-page-background-color-secondary)
  );
}

.room-group-tile.active {
  background: color-mix(
    in srgb,
    var(--room-group-status-color) 4%,
    var(--c-page-background-color-secondary)
  );
  animation: room-group-active-pulse 1.8s ease-in-out infinite;
}

.room-group-tile-title > .v-icon {
  color: var(--room-group-facility-color);
}

.room-group-tile-title > .room-group-status-icon.status-complete {
  color: var(--riic-green);
}

.room-group-tile-title > .room-group-status-icon.status-pending {
  color: var(--riic-orange);
}

.room-group-tile-title > .room-group-status-icon.status-error {
  color: var(--riic-red);
}

.room-group-count i {
  border-color: color-mix(
    in srgb,
    var(--room-group-status-color) 58%,
    var(--c-border-color)
  );
  background: color-mix(
    in srgb,
    var(--room-group-status-color) 14%,
    var(--c-page-background-color)
  );
}

@keyframes room-group-active-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 1px
      color-mix(in srgb, var(--riic-blue) 48%, transparent);
  }

  50% {
    box-shadow:
      0 0 0 2px
        color-mix(in srgb, var(--riic-blue) 78%, transparent),
      0 0 10px
        color-mix(in srgb, var(--riic-blue) 28%, transparent);
  }
}

@media (max-width: 760px) {
  .room-group-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
