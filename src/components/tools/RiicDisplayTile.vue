<script setup>
import { computed } from "vue";
import ItemImage from "/src/components/sprite/ItemImage.vue";
import { formatDisplayValue } from "/src/utils/riic/riic-efficiency-adapter.js";
import originiumShardIcon from "/src/assets/images/riic-schedule-preview/originium-shard.png";
import creditIcon from "/src/assets/images/riic-schedule-preview/credit.png";

const props = defineProps({
  tile: {
    type: Object,
    required: true,
  },
});

const ITEM_IMAGE_IDS = Object.freeze({
  理智: "AP_GAMEPLAY",
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

const itemImageId = computed(() => ITEM_IMAGE_IDS[props.tile.product] || "");
const productIcon = computed(() => PRODUCT_ICONS[props.tile.product] || "");
</script>

<template>
  <div class="riic-display-tile">
    <span v-if="itemImageId || productIcon" class="riic-display-tile-icon" aria-hidden="true">
      <ItemImage v-if="itemImageId" :item-id="itemImageId" :size="32" :mobile-size="32" />
      <img v-else :src="productIcon" alt="" />
    </span>
    <div class="riic-display-tile-content">
      <strong class="riic-display-tile-main">{{ formatDisplayValue(props.tile.main) }}</strong>
      <span v-for="line in props.tile.lines || []" :key="line.key" class="riic-display-tile-line">
        {{ formatDisplayValue(line.value) }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.riic-display-tile {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  padding: 10px 12px;
  border: 1px solid var(--c-border-color);
  border-radius: 4px;
  background: var(--c-page-background-color-secondary, #fafafa);
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
  gap: 2px;
  min-width: 0;
}
.riic-display-tile-main {
  font-size: 16px;
  font-variant-numeric: tabular-nums;
}
.riic-display-tile-line {
  color: var(--c-text-color-secondary, #6b7280);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
}
</style>
