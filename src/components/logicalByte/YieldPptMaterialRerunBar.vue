<script setup>
import ItemImage from '/src/components/sprite/ItemImage.vue'

const props = defineProps({
  rerun: {
    type: Object,
    default: null,
  },
})

function formatEfficiency(value) {
  const percentage = Number(value) * 100
  return Number.isFinite(percentage) ? `${percentage.toFixed(2)}%` : '-'
}
</script>

<template>
  <div v-if="props.rerun" class="yield-ppt-material-rerun-bar">
    <strong class="yield-ppt-material-rerun-bar__title">{{ props.rerun.name }}</strong>
    <div
      v-for="stage in props.rerun.stages"
      :key="`${stage.stageCode}-${stage.itemId}`"
      class="yield-ppt-material-rerun-bar__stage"
    >
      <ItemImage :item-id="stage.itemId" :size="46" />
      <div class="yield-ppt-material-rerun-bar__stage-text">
        <span>{{ stage.stageCode }}</span>
        <small>{{ formatEfficiency(stage.stageEfficiency) }}</small>
      </div>
    </div>
  </div>
</template>

<style scoped>
.yield-ppt-material-rerun-bar {
  display: flex;
  width: 850px;
  height: 92px;
  box-sizing: border-box;
  align-items: center;
  gap: 30px;
  padding: 0 28px;
  overflow: hidden;
  border-radius: 48px;
  background: #ffffff;
  color: #101820;
  font-family: Arial, "Microsoft YaHei", sans-serif;
}

.yield-ppt-material-rerun-bar__title {
  flex: 0 0 220px;
  overflow: hidden;
  font-size: 28px;
  line-height: 1;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.yield-ppt-material-rerun-bar__stage {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
}

.yield-ppt-material-rerun-bar__stage-text {
  display: flex;
  min-width: 72px;
  flex-direction: column;
  gap: 4px;
  font-size: 22px;
  line-height: 1;
  white-space: nowrap;
}

.yield-ppt-material-rerun-bar__stage-text small {
  font-size: 17px;
}
</style>
