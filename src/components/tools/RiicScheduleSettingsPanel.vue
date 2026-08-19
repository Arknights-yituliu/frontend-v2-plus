<script setup>
defineProps({
  shiftMode: {
    type: String,
    default: "",
  },
  twoShiftRotationMode: {
    type: String,
    default: "maa",
  },
  is252LayoutPlan: {
    type: Boolean,
    default: false,
  },
  activeFacilityRequirement: {
    type: String,
    default: "rightFull",
  },
  facilityRequirements: {
    type: Object,
    default: () => ({}),
  },
  ownedOperatorCount: {
    type: Number,
    default: 0,
  },
  treatUnderleveledOperatorsAsQualified: {
    type: Boolean,
    default: false,
  },
  idealTrainingRaritySelection: {
    type: Object,
    default: () => ({
      six: true,
      five: true,
      fourOrBelow: true,
    }),
  },
});

const emit = defineEmits([
  "select-two-shift-rotation",
  "select-facility-requirement",
  "set-training-mode",
  "set-training-rarity-selection",
]);
</script>

<template>
  <section class="schedule-settings-panel" aria-label="排班设置">
    <div class="schedule-settings-control-grid">
      <slot name="before-settings"></slot>

      <section
        v-if="shiftMode === 'twice'"
        class="facility-profile-switch two-shift-rotation-switch"
        aria-label="一天两换模式"
      >
        <span class="facility-profile-label">一天两换</span>
        <div class="facility-profile-options">
          <button
            type="button"
            class="facility-profile-option"
            :class="{ active: twoShiftRotationMode === 'maa' }"
            :aria-pressed="twoShiftRotationMode === 'maa'"
            @click="emit('select-two-shift-rotation', 'maa')"
          >
            MAA 两班轮换
          </button>
          <button
            type="button"
            class="facility-profile-option"
            :class="{ active: twoShiftRotationMode === 'manual' }"
            :aria-pressed="twoShiftRotationMode === 'manual'"
            @click="emit('select-two-shift-rotation', 'manual')"
          >
            手动三班轮换
          </button>
        </div>
        <span class="facility-profile-note">
          {{
            twoShiftRotationMode === "maa"
              ? "每座生产站需两套完整班组"
              : "一天两换·手动三班会以每班8h计算每日资源"
          }}
        </span>
      </section>

      <section
        v-if="is252LayoutPlan"
        class="facility-profile-switch"
        aria-label="252 设施状态"
      >
        <span class="facility-profile-label">252 设施状态</span>
        <div class="facility-profile-options">
          <button
            type="button"
            class="facility-profile-option"
            :class="{ active: activeFacilityRequirement === 'rightFull' }"
            :aria-pressed="activeFacilityRequirement === 'rightFull'"
            @click="emit('select-facility-requirement', 'rightFull')"
          >
            右满 · {{ facilityRequirements.rightFull?.productionSlots }} 位
          </button>
          <button
            type="button"
            class="facility-profile-option"
            :class="{ active: activeFacilityRequirement === 'fullBlood' }"
            :aria-pressed="activeFacilityRequirement === 'fullBlood'"
            @click="emit('select-facility-requirement', 'fullBlood')"
          >
            满血 · {{ facilityRequirements.fullBlood?.productionSlots }} 位
          </button>
        </div>
        <span class="facility-profile-note">影响下方房间可进驻人数</span>
      </section>

      <section class="facility-profile-switch operator-training-mode" aria-label="干员练度">
        <span class="facility-profile-label">干员练度</span>
        <div class="facility-profile-options">
          <button
            type="button"
            class="facility-profile-option"
            :class="{ active: !treatUnderleveledOperatorsAsQualified }"
            :aria-pressed="!treatUnderleveledOperatorsAsQualified"
            :disabled="ownedOperatorCount === 0"
            @click="emit('set-training-mode', false)"
          >
            使用当前练度
          </button>
          <button
            type="button"
            class="facility-profile-option"
            :class="{ active: treatUnderleveledOperatorsAsQualified }"
            :aria-pressed="treatUnderleveledOperatorsAsQualified"
            :disabled="ownedOperatorCount === 0"
            @click="emit('set-training-mode', true)"
          >
            基建技能视为已解锁
          </button>
        </div>
        <div
          v-if="treatUnderleveledOperatorsAsQualified"
          class="facility-profile-options training-rarity-options"
        >
          <button
            type="button"
            class="facility-profile-option"
            :class="{ active: idealTrainingRaritySelection.six }"
            :aria-pressed="idealTrainingRaritySelection.six"
            :disabled="ownedOperatorCount === 0"
            @click="
              emit('set-training-rarity-selection', {
                ...idealTrainingRaritySelection,
                six: !idealTrainingRaritySelection.six,
              })
            "
          >
            解锁6星
          </button>
          <button
            type="button"
            class="facility-profile-option"
            :class="{ active: idealTrainingRaritySelection.five }"
            :aria-pressed="idealTrainingRaritySelection.five"
            :disabled="ownedOperatorCount === 0"
            @click="
              emit('set-training-rarity-selection', {
                ...idealTrainingRaritySelection,
                five: !idealTrainingRaritySelection.five,
              })
            "
          >
            解锁5星
          </button>
          <button
            type="button"
            class="facility-profile-option"
            :class="{ active: idealTrainingRaritySelection.fourOrBelow }"
            :aria-pressed="idealTrainingRaritySelection.fourOrBelow"
            :disabled="ownedOperatorCount === 0"
            @click="
              emit('set-training-rarity-selection', {
                ...idealTrainingRaritySelection,
                fourOrBelow: !idealTrainingRaritySelection.fourOrBelow,
              })
            "
          >
            解锁4星及以下
          </button>
        </div>
        <span class="facility-profile-note operator-training-mode-note">
          解锁基建技能则会在下方出现干员推荐
        </span>
      </section>

    </div>
  </section>
</template>

<style scoped>
.schedule-settings-panel {
  display: block;
  margin-top: 16px;
}

.schedule-settings-control-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 8px;
  min-width: 0;
}

.operator-training-mode {
  align-items: center;
}

.operator-training-mode .facility-profile-options {
  max-width: 100%;
}

.training-rarity-options {
  flex: 0 1 auto;
  width: auto;
}

.operator-training-mode .facility-profile-option:disabled {
  color: var(--riic-muted);
  cursor: default;
  opacity: 0.55;
}

.facility-profile-switch {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 10px;
  min-width: 0;
  margin: 0;
  padding: 9px 10px;
  border: 1px solid var(--c-border-color);
  border-radius: 4px;
  background: var(--c-page-background-color-secondary);
}

.facility-profile-label {
  color: var(--c-text-color);
  font-size: 13px;
  font-weight: 700;
  line-height: 1.4;
}

.facility-profile-options {
  display: inline-flex;
  align-items: center;
  overflow: hidden;
  border: 1px solid var(--c-border-color);
  border-radius: 4px;
}

.facility-profile-option {
  min-height: 28px;
  padding: 4px 8px;
  border: 0;
  border-left: 1px solid var(--c-border-color);
  background: transparent;
  color: var(--riic-muted);
  font: inherit;
  font-size: 12px;
  line-height: 1.25;
  cursor: pointer;
}

.facility-profile-option:first-child {
  border-left: 0;
}

.facility-profile-option:hover {
  background: color-mix(
    in srgb,
    var(--riic-green) 7%,
    var(--c-page-background-color-secondary)
  );
}

.facility-profile-option.active {
  background: color-mix(
    in srgb,
    var(--riic-green) 16%,
    var(--c-page-background-color)
  );
  color: var(--riic-green);
  font-weight: 700;
}

.facility-profile-note {
  flex: 0 0 100%;
  width: 100%;
  color: var(--riic-muted);
  font-size: 12px;
  line-height: 1.4;
}

@media (max-width: 900px) {
  .schedule-settings-control-grid {
    grid-template-columns: 1fr;
  }
}
</style>
