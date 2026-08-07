<script setup>
const props = defineProps({
  progressItems: {
    type: Array,
    default: () => [],
  },
  selectionRows: {
    type: Array,
    default: () => [],
  },
  activeGroupId: {
    type: String,
    default: "",
  },
  layoutPlanSummary: {
    type: String,
    default: "",
  },
  hasRestorableRecommendedSchedule: {
    type: Boolean,
    default: false,
  },
  autoGeneratingSchedule: {
    type: Boolean,
    default: false,
  },
  getGroupCandidateStatus: {
    type: Function,
    required: true,
  },
});

const emit = defineEmits(["select-group", "restore-recommended"]);

function selectGroup(groupId) {
  emit("select-group", groupId);
}
</script>

<template>
  <div class="room-group-selection-layout">
    <aside class="room-group-progress" aria-label="房间组填写进度">
      <strong class="room-group-progress-heading">填写进度</strong>
      <button
        v-for="item in progressItems"
        :key="item.group.id"
        type="button"
        class="room-group-progress-item"
        :class="[
          `tone-${item.tone}`,
          { active: activeGroupId === item.group.id },
        ]"
        :aria-pressed="activeGroupId === item.group.id"
        @click="selectGroup(item.group.id)"
      >
        <span class="room-group-progress-label">
          <v-icon :icon="item.group.icon" size="16"></v-icon>
          <span>{{ item.group.label }}</span>
        </span>
        <small>{{ item.label }}</small>
      </button>
      <button
        type="button"
        class="restore-recommended-schedule"
        :disabled="
          !hasRestorableRecommendedSchedule || autoGeneratingSchedule
        "
        @click="emit('restore-recommended')"
      >
        <v-icon icon="mdi-restore" size="16"></v-icon>
        <span>恢复推荐方案</span>
      </button>
    </aside>

    <div class="room-group-schematic">
      <header class="room-workbench-heading">
        <div>
          <strong>房间组</strong>
        </div>
        <span class="room-layout-summary">
          {{ layoutPlanSummary }}
        </span>
      </header>

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
              { active: activeGroupId === group.id },
              { 'width-double': group.width === 2 },
            ]"
            :aria-pressed="activeGroupId === group.id"
            @click="selectGroup(group.id)"
          >
            <span class="room-group-tile-title">
              <v-icon :icon="group.icon" size="20"></v-icon>
              <strong>{{ group.label }}</strong>
              <v-icon
                v-if="getGroupCandidateStatus(group)"
                class="room-group-status-icon"
                :class="`tone-${getGroupCandidateStatus(group).tone}`"
                :icon="getGroupCandidateStatus(group).icon"
                :title="getGroupCandidateStatus(group).title"
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

.room-workbench-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
}

.room-workbench-heading > div {
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
}

.room-workbench-heading strong {
  color: var(--c-text-color);
  font-size: 14px;
  line-height: 1.4;
}

.room-workbench-heading span {
  color: var(--riic-muted);
  font-size: 12px;
  line-height: 1.4;
}

.room-layout-summary {
  overflow: hidden;
  max-width: 48%;
  text-align: right;
  text-overflow: ellipsis;
  white-space: nowrap;
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
  border: 0;
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
  border-left-width: 5px;
  background: color-mix(
    in srgb,
    var(--room-group-color) 13%,
    var(--c-page-background-color)
  );
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

.restore-recommended-schedule {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  align-self: flex-start;
  flex: 0 0 auto;
  gap: 5px;
  min-height: 28px;
  margin-top: 8px;
  padding: 4px 8px;
  border: 1px solid color-mix(
    in srgb,
    var(--riic-blue) 48%,
    var(--c-border-color)
  );
  border-radius: 4px;
  background: transparent;
  color: var(--riic-blue);
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.3;
  cursor: pointer;
}

.restore-recommended-schedule:hover:not(:disabled) {
  background: color-mix(
    in srgb,
    var(--riic-blue) 9%,
    var(--c-page-background-color-secondary)
  );
}

.restore-recommended-schedule:disabled {
  cursor: default;
  opacity: 0.55;
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

  .room-group-progress .restore-recommended-schedule {
    grid-column: 1 / -1;
  }

  .room-workbench-heading {
    align-items: flex-start;
    flex-direction: column;
    gap: 4px;
  }

  .room-layout-summary {
    max-width: 100%;
    text-align: left;
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
</style>
