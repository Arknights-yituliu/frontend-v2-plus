<script setup>

import '/src/assets/css/survey/operator_info_bar.scss'
import '/src/assets/css/survey/operator_info_bar.phone.scss'


import OperatorAvatar from "/src/components/sprite/OperatorAvatar.vue";
import SkillIcon from "/src/components/sprite/SkillIcon.vue";
import EquipIcon from "/src/components/sprite/EquipIcon.vue";

defineProps({
  modelValue: null,
  operatorInfo: {
    type: Object,
    required: true
  },
  recommendedSkillIndexes: {
    type: Array,
    default: () => []
  },
  recommendedEquipIndexes: {
    type: Array,
    default: () => []
  }
});


</script>

<template>

  <v-card :class="['operator-info-card', `operator-rarity-${operatorInfo.rarity || 1}`]">
    <div class="operator-info-bar">
      <div class="operator-avatar-area">
        <OperatorAvatar :size="56" :mobile-size="44" :char-id="operatorInfo.charId"></OperatorAvatar>
      </div>
      <div class="operator-info">
        <div class="operator-name">{{ operatorInfo.name }}</div>
        <img :src="`/image/survey/rank/elite${operatorInfo.elite}.png`" class="operator-elite-image" alt="">
        <div class="operator-level-image">
          {{ operatorInfo.level }}
        </div>
      </div>

      <div class="operator-skills-area">
        <div class="bar-operator-skill-item" v-for="(skill,index) in operatorInfo.skill" :key="index">
          <div :class="['operator-skill-frame', { 'operator-skill-frame-recommended': recommendedSkillIndexes.includes(index) }]">
            <SkillIcon :size="40" :mobile-size="30" :icon="`${skill.iconId}`"></SkillIcon>
          </div>
          <img :src="`/image/survey/skill-rank-${operatorInfo[`skill${index+1}`]}-v1.jpg`"
               v-show="operatorInfo[`skill${index+1}`]>0"
               class="operator-skill-rank-icon"  alt="">
        </div>
      </div>

      <div class="operator-modules-area">
        <div :class="['operator-equip-group', { 'operator-equip-group-recommended': recommendedEquipIndexes.includes(index) }]" v-for="(equip,index) in operatorInfo.equip" :key="index">
          <div class="operator-equip">
            <EquipIcon :icon="equip.typeIcon" :mobile-size="20" :size="24" class="equip-icon" ></EquipIcon>
            <img :src="`/image/survey/mod-rank-${operatorInfo[`mod${equip.typeName2}`]}-v1.jpg`"
                 v-show="operatorInfo[`mod${equip.typeName2}`]>0" class="equip-rank-icon" alt="">
            <div class="equip-name">{{ `${equip.typeName1}-${equip.typeName2}` }}</div>
          </div>
        </div>
      </div>
    </div>
  </v-card>
</template>

