<script setup>
import {translate} from "@/utils/i18n.js";
import ItemImage from "@/components/sprite/ItemImage.vue";
import OperatorAvatar from "@/components/sprite/OperatorAvatar.vue";
import character_table from "@/static/json/survey/character_table_simple.json";

let characterIdAndName = {}

for (const key in character_table) {
  characterIdAndName[character_table[key].name] = replaceCharId(key)
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


</script>

<template>
<div class="room-template" :class="props.roomType">
  <div class="flex flex-wrap align-center justify-center">
    <div>{{ translate('schedule', 'schedule.Factory') }}#{{ props.roomIndex }}</div>
    <div class="spacer-12"></div>
    <ItemImage size="24" mobile-size="24"
               :item-id="props.product"></ItemImage>
  </div>
  <div class="flex justify-center">

    <OperatorAvatar
        v-for="(charId, operatorIndex) in props.operators"
        :key="operatorIndex"
        :char-id="charId" class="m-4">
    </OperatorAvatar>
  </div>
</div>
</template>