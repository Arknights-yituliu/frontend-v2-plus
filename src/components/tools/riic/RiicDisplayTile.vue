<script setup>
import { computed } from "vue";
import ItemImage from "/src/components/sprite/ItemImage.vue";
import ITEM_INFO from "/src/static/json/material/item_info.json";
import RiicRecycleOutputDialog from "/src/components/tools/riic/RiicRecycleOutputDialog.vue";
import { formatDisplayValue } from "/src/utils/riic/riic-efficiency-adapter.js";
import originiumShardIcon from "/src/assets/images/riic-schedule-preview/originium-shard.png";
import creditIcon from "/src/assets/images/riic-schedule-preview/credit.png";

const props = defineProps({
  tile: {
    type: Object,
    required: true,
  },
  recycleOutputs: {
    type: Array,
    default: () => [],
  },
  mainSegments: {
    type: Array,
    default: null,
  },
});

const ITEM_IMAGE_IDS = Object.freeze({
  理智: "AP_GAMEPLAY",
  无人机: "base_ap",
  龙门币: "4001",
  中级作战记录: "2003",
  赤金: "3003",
  合成玉: "4003",
  固源岩: "30012",
  固源岩组: "30013",
  装置: "30062",
  公开招募标签刷新次数: "7001",
});
const PRODUCT_ICONS = Object.freeze({
  源石碎片: originiumShardIcon,
  信用: creditIcon,
});
const ITEM_IMAGE_IDS_BY_NAME = new Map(
  ITEM_INFO.map((item) => [
    String(item.itemName || "").trim(),
    String(item.itemId || ""),
  ]).filter(([name, itemId]) => name && itemId),
);
const isRecycleOutput = computed(() => props.tile.product === "精英材料");
const itemImageId = computed(() =>
  ITEM_IMAGE_IDS[props.tile.product] ||
  ITEM_IMAGE_IDS_BY_NAME.get(String(props.tile.product || "").trim()) ||
  "",
);
const productIcon = computed(() => PRODUCT_ICONS[props.tile.product] || "");
function formatMainSegment(segment) {
  return (
    segment.text ??
    formatDisplayValue({ template: "{0}", raws: [segment.value] })
  );
}
</script>

<template>
  <RiicRecycleOutputDialog
    :outputs="isRecycleOutput ? props.recycleOutputs : []"
  >
    <template #activator="{ canOpen, open }">
      <component
        :is="canOpen ? 'button' : 'div'"
        :type="canOpen ? 'button' : undefined"
        :aria-haspopup="canOpen ? 'dialog' : undefined"
        :aria-label="canOpen ? '查看回收站材料期望产量' : undefined"
        class="riic-display-tile"
        :class="{ 'riic-display-tile-clickable': canOpen }"
        @click="open"
      >
        <span v-if="isRecycleOutput || itemImageId || productIcon" class="riic-display-tile-icon" aria-hidden="true">
          <v-icon v-if="isRecycleOutput" icon="mdi-recycle" size="32" />
          <ItemImage v-else-if="itemImageId" :item-id="itemImageId" :size="32" :mobile-size="32" />
          <img v-else :src="productIcon" alt="" />
        </span>
        <div class="riic-display-tile-content">
          <strong class="riic-display-tile-main">
            <template v-if="props.mainSegments">
              <span
                v-for="(segment, index) in props.mainSegments"
                :key="segment.key || index"
                :class="{ 'riic-display-tile-main-secondary': segment.secondary }"
              >{{ formatMainSegment(segment) }}</span>
            </template>
            <template v-else>{{ formatDisplayValue(props.tile.main) }}</template>
          </strong>
          <span v-for="line in props.tile.lines || []" :key="line.key" class="riic-display-tile-line">
            {{ formatDisplayValue(line.value) }}
          </span>
        </div>
      </component>
    </template>
  </RiicRecycleOutputDialog>
</template>

<style scoped>
.riic-display-tile {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  padding: 12px;
  border: 1px solid var(--maa-border, var(--c-border-color));
  border-radius: 3px;
  background: var(--maa-soft-panel, var(--c-page-background-color-secondary, #fafafa));
}
.riic-display-tile-clickable {
  box-sizing: border-box;
  width: 100%;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.riic-display-tile-clickable:focus-visible {
  outline: 2px solid var(--riic-blue, #2878c8);
  outline-offset: 2px;
}
.riic-display-tile-icon {
  display: block;
  flex: 0 0 32px;
  width: 32px;
  height: 32px;
}
.riic-display-tile-icon img {
  display: block;
  width: 32px;
  height: 32px;
  object-fit: contain;
}
.riic-display-tile-content {
  display: grid;
  gap: 4px;
  min-width: 0;
  line-height: 1.45;
}
.riic-display-tile-main {
  font-size: 16px;
  font-variant-numeric: tabular-nums;
}
.riic-display-tile-main-secondary {
  font-size: 14px;
}
.riic-display-tile-line {
  color: var(--c-text-color-secondary, #6b7280);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
}
</style>
