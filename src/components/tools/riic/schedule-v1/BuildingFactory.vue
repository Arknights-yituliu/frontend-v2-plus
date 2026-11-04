<script setup>
import {translate} from "/src/utils/i18n.js";
import ItemImage from "/src/components/sprite/ItemImage.vue";
import { getOperatorAvatarUrl, getOperatorAvatarStyle } from "/src/utils/arknightsResource.js";
import {operatorTableV2} from '/src/utils/gameData.js'
import { buildRiicOperatorIdByName } from "/src/utils/riicOperatorIdentity.js";


const characterIdAndName = buildRiicOperatorIdByName(operatorTableV2)

const props = defineProps({
  roomType: {
    type: String
  },
  roomIndex: {
    type: Number
  },
  product: {
    type: String
  },
  operators: {
    type: Array
  }
})


const translateKey = {
  manufacture: 'Factory',
  trading: 'TradingPost',
  power: 'PowerPlant',
  control: 'ControlCenter',
  dormitory: 'Dormitory',
  meeting: 'ReceptionRoom',
  processing: 'Workshop',
  hire: 'Office',
  training: 'Training',
  recycle: 'Recycle',
}


</script>

<template>
  <div class="building-factory-template" :class="props.roomType">
    <div class="flex flex-wrap align-center justify-center">
      <div class="building-factory-name">{{ translate('schedule', `schedule.${translateKey[props.roomType]}`) }}#{{ props.roomIndex }}</div>
      <div class="spacer-12"></div>
      <ItemImage size="32" mobile-size="32"
                 :item-id="props.product"></ItemImage>
    </div>
    <div class="flex justify-center">
      <img
          v-for="(name, operatorIndex) in props.operators"
          :key="operatorIndex"
          class="operator-avatar-img m-4"
          :style="getOperatorAvatarStyle({ size: 50, mobileSize: 50 })"
          :src="getOperatorAvatarUrl(characterIdAndName[name])" alt="">
    </div>
  </div>
</template>
