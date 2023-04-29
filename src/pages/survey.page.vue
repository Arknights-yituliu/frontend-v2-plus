<template>
  <div class="main_survey">
    <div class="survey_title">
        明日方舟干员持有率统计
    </div>
    <div class="survey_tip_box">
      <div class="survey_tip">
        <a> 当前样本量</a> <br />
        114514人次
      </div>
      <div class="survey_tip">
        <a>本表单更新时间</a> <br />
        2023-11-14
      </div>
    </div>
    <div class="oper_table">
      <div class="oper" v-for="(operData, index) in operServeyData" v-show="operData.rarity > 5">
        <div class="operIndex">No.{{ index + 1 }}</div>
        <!-- <img class="image_avatar" :src="'/img/avatar/' + operData.charId + '.png'" alt="" /> -->
        <div :class="getSprite(operData.charId)"></div>
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
import "@/assets/css/sprite_char_6.css";
import "@/assets/css/survey.css";
import serveyJson from "@/static/json/survey.json";
import { ref } from "vue";
// console.log(serveyJson)

let operServeyData = ref(serveyJson);

function getSprite(charId,index) {
 return "image_avatar bg-"+charId;
}
</script>
