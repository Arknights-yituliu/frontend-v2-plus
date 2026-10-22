<script setup>
import { computed, onMounted, ref } from "vue";
import ItemImage from "/src/components/sprite/ItemImage.vue";
import itemCache from "/src/plugins/indexedDB/itemCache.js";
import { formatNumber as formatItemValue } from "/src/utils/format.js";
import { getStageConfig } from "/src/utils/user/userConfig.js";
import { RIIC_RECYCLE_BOOST_OPTIONS } from "/src/utils/riic/riic-efficiency-adapter.js";

const props = defineProps({
  modelValue: {
    type: String,
    default: "",
  },
  placeholder: {
    type: String,
    default: "不加速",
  },
  ariaLabel: {
    type: String,
    default: "回收站加速材料",
  },
});

const emit = defineEmits(["update:modelValue"]);
const itemValues = ref(new Map());
const options = computed(() =>
  RIIC_RECYCLE_BOOST_OPTIONS.map((item, index) => {
    const equivalentSanity = itemValues.value.get(String(item.itemId));
    return {
      ...item,
      index,
      valueRatio:
        Number.isFinite(equivalentSanity) && equivalentSanity > 0
          ? item.addedTime / equivalentSanity
          : -Infinity,
    };
  }).sort(
    (left, right) =>
      right.valueRatio - left.valueRatio || left.index - right.index,
  ),
);

function formatDuration(addedTime) {
  const hours = Number(addedTime) / 3600;
  return `加速 ${Number.isInteger(hours) ? hours : hours.toFixed(1)} 小时`;
}

onMounted(() => {
  itemCache
    .getItemValueCacheByConfig(getStageConfig())
    .then((items) => {
      itemValues.value = new Map(
        items.map((item) => [
          String(item.itemId),
          Number(formatItemValue(item.itemValue, 4)),
        ]),
      );
    })
    .catch((error) => {
      console.error("Failed to load item values for recycle boost sorting", error);
    });
});
</script>

<template>
  <el-select
    :model-value="props.modelValue"
    clearable
    :placeholder="props.placeholder"
    :aria-label="props.ariaLabel"
    @change="emit('update:modelValue', $event || '')"
  >
    <el-option
      v-for="item in options"
      :key="item.itemId"
      :label="`${item.name}（${formatDuration(item.addedTime)}）`"
      :value="item.itemId"
    >
      <div class="riic-recycle-boost-option">
        <ItemImage
          :item-id="item.itemId"
          :size="24"
          :mobile-size="24"
        />
        <span class="riic-recycle-boost-option-name">{{ item.name }}</span>
        <span class="riic-recycle-boost-option-duration">
          {{ formatDuration(item.addedTime) }}
        </span>
      </div>
    </el-option>
  </el-select>
</template>

<style scoped>
.riic-recycle-boost-option {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  min-height: 32px;
  width: 100%;
}

.riic-recycle-boost-option-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.riic-recycle-boost-option-duration {
  color: var(--c-text-color-secondary, #6b7280);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
</style>
