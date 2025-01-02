<script setup>

import '/src/assets/css/survey/operator_info_bar.scss'
import '/src/assets/css/survey/operator_info_bar.phone.scss'



import OperatorAvatar from "/src/components/sprite/OperatorAvatar.vue";
import ItemImage from "/src/components/sprite/ItemImage.vue";
import SkillIcon from "/src/components/sprite/SkillIcon.vue";
const props = defineProps(["modelValue", 'operatorInfo',]);

console.log(props.operatorInfo)

</script>

<template>

  <div class="operator-info-bar flex m-4">
    <OperatorAvatar  :char-id="operatorInfo.charId" class="m-0-4"></OperatorAvatar>
    <div>
      <img :src="`/image/survey/rank/elite${operatorInfo.elite}.png`" class="operator-elite-image" alt="">
      <div class="operator-level-image">
        {{ operatorInfo.level }}
      </div>
    </div>

    <div class="operator-skill-item" v-for="(skill,index) in operatorInfo.skill" :key="index">
      <SkillIcon mobile-size="32" :icon="`skill_icon_${skill.iconId}`" ></SkillIcon>
      <img :src="`/image/survey/skill-rank-${operatorInfo[`skill${index+1}`]}-v1.jpg`"
           v-show="operatorInfo[`skill${index+1}`]>0" class="operator-skill-rank" alt="">
    </div>

    <div class="operator-equip-group" v-for="(equip,index) in operatorInfo.equip" :key="index">
      <div class="operator-equip">
        <img :src="`/image/survey/mod-icon/${equip.typeIcon}.png`" alt="" class="operator-equip-icon-image">
        <img :src="`/image/survey/skill-rank-${operatorInfo[`mod${equip.typeName2}`]}-v1.jpg`"
             v-show="operatorInfo[`mod${equip.typeName2}`]>0" class="operator-rank-icon" alt="">
      </div>
      <div class="equip-name">{{ `${equip.typeName1}-${equip.typeName2}` }}</div>
    </div>

    <div class="operator-ap-cost">
      <ItemImage  item-id="AP_GAMEPLAY" ></ItemImage>
      <div class="item-ap-cost">{{ operatorInfo.apCost.toFixed(0) }}</div>
    </div>

  </div>

</template>

