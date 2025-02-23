<script setup>
import '/src/pages/material/elite/style.scss'
import ItemImage from "@/components/sprite/ItemImage.vue";
const props = defineProps({
  info: Object,
  skillIndex: Number,
})

/**
 * 精英化: [rank1, rank2]
 * 技能/模组: [rank1, rank2, rank3]
 */
const rankList = Object.keys(props.info).filter(key => key.includes('rank'))
</script>

<template>
  <div class="material-item-wrapper">
    <slot name="block-label"></slot>
    <div class="row" v-for="(rank, index) in rankList" :key="index">
      <slot name="row-label" :rankIndex="index"></slot>
      <div v-for="(item, index) in info[rank].materials" :key="index" class="material-item">
        <ItemImage :item-id="item.itemId" :size="50"></ItemImage>
        <span class="num">{{ item.quantity }}</span>
      </div>
    </div>
  </div>
</template>

<style lang="scss">
@import "../style.scss";
</style>