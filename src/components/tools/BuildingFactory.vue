<script setup>
import {translate} from "/src/utils/i18n.js";
import ItemImage from "/src/components/sprite/ItemImage.vue";
import OperatorAvatar from "/src/components/sprite/OperatorAvatar.vue";
import {operatorTable} from '/src/utils/gameData.js'


let characterIdAndName = {}

for (const key in operatorTable) {
  characterIdAndName[operatorTable[key].name] = replaceCharId(key)
}


function replaceCharId(string) {
  if (string === 'char_1001_amiya2' || string === 'char_1001_amiya3') {
    return 'char_002_amiya'
  }
  return string
}

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
  Training: 'Training',
}


</script>

<template>
  <div class="room-template" :class="props.roomType">
    <div class="flex flex-wrap align-center justify-center">
      <div>{{ translate('schedule', `schedule.${translateKey[props.roomType]}`) }}#{{ props.roomIndex }}</div>
      <div class="spacer-12"></div>
      <ItemImage size="24" mobile-size="24"
                 :item-id="props.product"></ItemImage>
    </div>
    <div class="flex justify-center">
      <OperatorAvatar
          v-for="(name, operatorIndex) in props.operators"
          :key="operatorIndex"
          :char-id="characterIdAndName[name]" class="m-4" size="44" mobile-size="44">
      </OperatorAvatar>
    </div>
  </div>
</template>