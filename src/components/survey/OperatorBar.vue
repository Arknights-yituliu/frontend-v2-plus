<script setup>

import '/src/assets/css/survey/operator_info_bar.scss'
import '/src/assets/css/survey/operator_info_bar.phone.scss'


import OperatorAvatar from "/src/components/sprite/OperatorAvatar.vue";
import ItemImage from "/src/components/sprite/ItemImage.vue";
import SkillIcon from "/src/components/sprite/SkillIcon.vue";
import EquipIcon from "/src/components/EquipIcon.vue";
import {formatNumber} from "/src/utils/format.js";

const props = defineProps(["modelValue", 'operatorInfo',]);


</script>

<template>

  <v-card class="operator-info-card">
    <div class="operator-info-bar">
      <OperatorAvatar size="50" mobile-size="40" :char-id="operatorInfo.charId" class="m-0-4" :border="true"></OperatorAvatar>
      <div class="operator-info">
        <div class="operator-name">{{ operatorInfo.name }}</div>
        <img :src="`/image/survey/rank/elite${operatorInfo.elite}.png`" class="operator-elite-image" alt="">
        <div class="operator-level-image">
          {{ operatorInfo.level }}
        </div>
      </div>

      <div class="bar-operator-skill-item" v-for="(skill,index) in operatorInfo.skill" :key="index">
        <SkillIcon size="40" mobile-size="30" :border="true" :icon="`${skill.iconId}`"></SkillIcon>
        <img :src="`/image/survey/skill-rank-${operatorInfo[`skill${index+1}`]}-v1.jpg`"
             v-show="operatorInfo[`skill${index+1}`]>0"
             class="operator-skill-rank-icon"  alt="">
      </div>

      <div class="operator-equip-group" v-for="(equip,index) in operatorInfo.equip" :key="index">
        <div class="operator-equip">
          <EquipIcon :icon="equip.typeIcon" mobile-size="20" size="24" class="equip-icon" ></EquipIcon>
          <img :src="`/image/survey/mod-rank-${operatorInfo[`mod${equip.typeName2}`]}-v1.jpg`"
               v-show="operatorInfo[`mod${equip.typeName2}`]>0" class="equip-rank-icon" alt="">
          <div class="equip-name">{{ `${equip.typeName1}-${equip.typeName2}` }}</div>
        </div>
      </div>

      <div v-show="operatorInfo.apCost">
        <ItemImage item-id="AP_GAMEPLAY" mobile-size="28"></ItemImage>
        <div class="operator-ap-cost">{{ formatNumber(operatorInfo.apCost) }}</div>
      </div>
    </div>
  </v-card>
</template>

