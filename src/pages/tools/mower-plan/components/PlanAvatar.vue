<script setup>
import { computed } from "vue";
import { getOperatorAvatarUrl, getOperatorAvatarStyle } from "@/utils/arknightsResource.js";
import { nameToCharId } from "@/utils/mower/operatorAssets.js";
const props = defineProps({ name: String, size: { type: Number, default: 45 } });
const id = computed(() => nameToCharId[props.name]);
</script>
<template>
  <div class="plan-avatar" :style="{ width: `${size}px`, minHeight: `${size}px` }" draggable="false">
    <img v-if="id" class="operator-avatar-img" :style="getOperatorAvatarStyle({ size: size, mobileSize: size })" :src="getOperatorAvatarUrl(id)" alt="" draggable="false">
    <div v-else class="placeholder" :style="{ height: `${size}px` }">{{ name === "Current" ? "Curr" : name === "Free" ? "Free" : name?.slice(0, 2) }}</div>
  </div>
</template>
<style scoped>
.plan-avatar {
  display: inline-block;
  box-sizing: content-box;
  vertical-align: bottom;
  flex-shrink: 0;
}
.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--c-background-color, #eee);
  font-size: 12px;
}
</style>
