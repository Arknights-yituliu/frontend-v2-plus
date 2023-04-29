<template>
  <div>
    <div class="operTable">
      <div class="oper" v-for="(operData, index) in operServeyData" v-show="operData.rarity > 5">
        <div class="operIndex">No.{{ index + 1 }}</div>
        <img class="image_avatar" :src="'/img/avatar/' + operData.charId + '.png'" alt="" />
        <div class="operRate">
          持有率<br />
          {{ operData.owningRate.toFixed(1) }}%
        </div>
        <div class="operRate">
          精二率<br />
          {{ operData.phases2Rate }}%
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import "@/assets/css/survey.css";
import serveyJson from "@/static/json/survey.json";
import { ref } from "vue";
// console.log(serveyJson)

let operServeyData = ref(serveyJson);

function digitLimit(number, digit) {
  number.toFixed(digit);
}
</script>
