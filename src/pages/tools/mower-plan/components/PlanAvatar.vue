<script setup>
import { computed } from "vue";
import OperatorAvatar from "@/components/sprite/OperatorAvatar.vue";
import { nameToCharId } from "@/utils/mower/operatorAssets.js";
const props = defineProps({ name: String, size: { type: Number, default: 45 } });
const id = computed(() => nameToCharId[props.name]);
</script>
<template>
  <div class="plan-avatar" :style="{ width: `${size}px`, minHeight: `${size}px` }" draggable="false">
    <OperatorAvatar v-if="id" :char-id="id" :size="size" :mobile-size="size" />
    <div v-else class="placeholder" :style="{ height: `${size}px` }">{{ name === "Current" ? "当前" : name === "Free" ? "Free" : name?.slice(0, 2) }}</div>
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
