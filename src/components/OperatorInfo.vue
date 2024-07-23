<script setup>

import SpriteImage from "./SpriteImage.vue";
const props = defineProps(["modelValue", 'operatorInfo',]);

</script>

<template>

  <div class="operator-card">
    <SpriteImage original-size="180" display-size="50" :id="operatorInfo.charId" style="margin: 0 4px"></SpriteImage>
    <div>
      <img :src="`/image/survey/rank/elite${operatorInfo.elite}.png`" class="operator-elite-image" alt="">
      <div class="operator-level-image">
        {{ operatorInfo.level }}
      </div>
    </div>

    <div class="operator-skill-icon-item" v-for="(skill,index) in operatorInfo.skill" :key="index">
      <SpriteImage original-size="128" display-size="40"  :id="`skill_icon_${skill.iconId}`" style="margin: auto"></SpriteImage>
      <div class="skill-name">{{ skill.name }}</div>
    </div>

    <div class="operator-equip-image-wrap" v-for="(equip,index) in operatorInfo.equip" :key="index">
      <div class="operator-skill-icon-sprite">
        <img :src="`/image/survey/mod-icon/${equip.typeIcon}.png`" alt="" class="operator-equip-image">
        <img :src="`/image/survey/skill-rank-${operatorInfo[`mod${equip.typeName2}`]}.jpg`"
             v-show="operatorInfo[`mod${equip.typeName2}`]>0" class="operator-skill-rank">
      </div>
      <div class="equip-name">{{ `${equip.typeName1}-${equip.typeName2}` }}</div>
    </div>

    <div class="operator-equip-image-wrap">
      <SpriteImage original-size="183" display-size="40" id="AP_GAMEPLAY"></SpriteImage>
      <div class="item-ap-cost">{{ operatorInfo.apCost.toFixed(0) }}</div>
    </div>

  </div>

</template>

<style scoped>

</style>