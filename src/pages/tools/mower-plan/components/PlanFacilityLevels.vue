<script setup>
import { computed } from "vue";
import { mowerPlanStore as store } from "../store/planStore.js";
import { facilityLevelState, maximumFacilityLevel } from "@/utils/mower/facility_levels.js";
const props = defineProps({ facility: String, locked: Boolean, mode: { type: String, default: "summary" } });
const state = computed(() => facilityLevelState(store.build_plan()));
const selected = computed(() => state.value.facilities[props.facility]);
const editableMapping = () => store.facility_levels.value && typeof store.facility_levels.value === "object" && !Array.isArray(store.facility_levels.value);
const explicit = computed(() => editableMapping() && Object.hasOwn(store.facility_levels.value, props.facility || ""));
const options = computed(() => !selected.value ? [] : Array.from({ length: maximumFacilityLevel(props.facility) + 1 }, (_, level) => ({
  label: (level ? `${level} 级` : "未建造") + (level === selected.value.level && !explicit.value ? "（默认）" : ""), value: level,
})));
function setLevel(level) {
  if (props.locked || level === null) return;
  store.facility_levels.value = { ...(editableMapping() ? store.facility_levels.value : {}), [props.facility]: level };
}
function resetLevel() {
  if (props.locked) return;
  const levels = { ...(editableMapping() ? store.facility_levels.value : {}) };
  delete levels[props.facility];
  store.facility_levels.value = levels;
}
</script>

<template>
  <div class="facility-levels" :class="mode" data-no-update-drop>
    <div v-if="mode === 'summary'" class="power-summary" role="status" aria-label="基建电力摘要">
      <span>发电 <b>{{ state.power.generation }}</b></span>
      <span>耗电 <b>{{ state.power.consumption }}</b></span>
      <n-tag :type="state.power.sufficient ? 'success' : 'error'" size="small">{{ state.power.sufficient ? '剩余' : '缺电' }} {{ Math.abs(state.power.margin) }}</n-tag>
    </div>
    <div v-if="mode === 'level' && selected" class="level-control">
      <span>等级：</span>
      <n-select aria-label="设施等级" :value="selected.level" :options="options" :disabled="locked || (facility.startsWith('room_') && !store.plan.value[facility]?.name)" @update:value="setLevel" />
      <n-button v-if="explicit" text size="small" :disabled="locked" @click="resetLevel">恢复默认</n-button>
    </div>
    <n-alert v-if="mode === 'summary' && state.issues.length" type="warning"><div v-for="(issue, index) in state.issues" :key="index">{{ issue }}</div></n-alert>
  </div>
</template>

<style scoped>
.facility-levels { min-width: 0; }
.power-summary, .level-control { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; }
.level-control { flex-wrap: nowrap; gap: 8px; white-space: nowrap; }
.level-control .n-select { width: 120px; }
.n-alert { margin-top: 8px; }
</style>
