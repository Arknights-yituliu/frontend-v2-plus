<template>
  <div :class="popClass" @click="closePopup()"></div>
  <div class="survey_popup">
    <input type="text" v-model="uploadOperBox" class="input_operBox" placeholder="粘贴从MAA干员识别小工具导出的数据" />
  </div>

  <div class="main_survey">
    <div class="survey_title">明日方舟干员{{ surveyType }}统计</div>
    <div class="survey_button_box">
      <button class="survey_button" @click="switchSurvey()">切换为{{ "精二率" == surveyType ? "持有率" : "精二率" }}统计</button>
      <button class="survey_button" @click="inputOperBox()">手动导入干员信息</button>
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
        <div class="operRate" v-show="'持有率' == surveyType">
          <a> 持有率 </a><br />
          {{ operData.owningRate.toFixed(1) }}%
        </div>
        <div class="operRate" v-show="'精二率' == surveyType">
          <a> 精二率</a><br />
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
import { ref, watch } from "vue";
// console.log(serveyJson)

let operServeyData = ref(serveyJson);
let surveyType = ref("持有率");
let popClass = ref("survey_popup_mask");

let uploadOperBox = ref("");
let operBoxJson = ref("");

function getSprite(charId, index) {
  return "image_avatar bg-" + charId;
}

function switchSurvey() {
  if ("持有率" == surveyType.value) {
    return (surveyType.value = "精二率");
  }

  return (surveyType.value = "持有率");
}

function inputOperBox() {
  popClass.value = "survey_popup_mask";
}

function closePopup() {
  popClass.value = "";
}

watch(uploadOperBox, (new_value) => {
  let obj = {};
  obj = JSON.parse(new_value);
  console.log(obj[0]);
  uploadOperBox.value = JSON.stringify(obj, null, 4);
  // console.log(uploadOperBox.value)
});
</script>
