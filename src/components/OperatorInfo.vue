<script setup>

import '/src/assets/css/survey/operator_info_bar.scss'
import '/src/assets/css/survey/operator_info_bar.phone.scss'


import SpriteImage from "./SpriteImage.vue";
const props = defineProps(["modelValue", 'operatorInfo',]);

</script>

<template>

  <div class="operator-info-bar flex m-4">
    <SpriteImage original-size="180" display-size="50" :image-name="operatorInfo.charId" style="margin: 0 4px"></SpriteImage>
    <div>
      <img :src="`/image/survey/rank/elite${operatorInfo.elite}.png`" class="operator-elite-image" alt="">
      <div class="operator-level-image">
        {{ operatorInfo.level }}
      </div>
    </div>

    <div class="operator-skill-item" v-for="(skill,index) in operatorInfo.skill" :key="index">
      <SpriteImage original-size="128" display-size="40"  :image-name="`skill_icon_${skill.iconId}`" style="margin: auto"></SpriteImage>
      <div class="skill-name">{{ skill.name }}</div>
    </div>

    <div class="operator-equip-item" v-for="(equip,index) in operatorInfo.equip" :key="index">
      <div class="operator-equip-icon">
        <img :src="`/image/survey/mod-icon/${equip.typeIcon}.png`" alt="" class="operator-equip-icon-image">
        <img :src="`/image/survey/skill-rank-${operatorInfo[`mod${equip.typeName2}`]}.jpg`"
             v-show="operatorInfo[`mod${equip.typeName2}`]>0" class="operator-rank-icon" alt="">
      </div>
      <div class="equip-name">{{ `${equip.typeName1}-${equip.typeName2}` }}</div>
    </div>

    <div class="operator-equip-item">
      <SpriteImage original-size="183" display-size="40" id="AP_GAMEPLAY"></SpriteImage>
      <div class="item-ap-cost">{{ operatorInfo.apCost.toFixed(0) }}</div>
    </div>

  </div>

</template>

