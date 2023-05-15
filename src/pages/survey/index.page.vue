<template>
  <div class="survey_page">
    <div class="survey_title">明日方舟干员{{ surveyType }}统计</div>

    <div class="survey_tip_box">
      <div class="survey_tip">
        <a>调查人数</a> <br />
        {{ userCount }}人次
      </div>
      <div class="survey_tip">
        <a>更新时间</a> <br />
        {{ updateTime }}
      </div>
    </div>

    <div class="setup_wrap">
      <div class="setup_bar">
        <div class="setup_title">榜单类型</div>
        <div class="btn_survey" @click="switchSurvey('精二率')">精二率统计</div>
        <div class="btn_survey" @click="switchSurvey('持有率')">持有率统计</div>
        <a href="/survey/upload"> <div class="btn_survey">上传数据</div></a>
      </div>
    </div>

    <div class="char_form">
      <div class="char_card" v-for="(operData, index) in charStatisticsResult" v-show="operData.rarity > 4">
        <div class="char_card_index">No.{{ index + 1 }}</div>
        <div class="avatar_back">
          <div :class="getSprite(operData.charId)"></div>
        </div>
        <div class="operRate" v-show="'持有率' == surveyType">
          <a> 持有率 </a><br />
          {{ operData.own.toFixed(1) }}%
        </div>
        <div class="operRate" v-show="'精二率' == surveyType">
          <a> 精二率</a><br />
          {{ operData.phase2.toFixed(1) }}%
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import "@/assets/css/sprite_char_6.css";
import "@/assets/css/survey.css";
import "@/assets/css/survey_upload.css";

import serveyJson from "@/static/json/survey.json";

import { onMounted, ref, watch } from "vue";
import { ElMessage } from "element-plus";

import surveyApi from "@/api/survey";

let charStatisticsResult = ref([]);
let surveyType = ref("持有率");
let popupStyle = ref("survey_popup_mask");

let operBoxData = ref("");
let userCount = ref(0);
let updateTime = ref("2023-05-01");

function getCharStatisticsResult() {
  surveyApi.getCharStatisticsResult().then((response) => {
    charStatisticsResult.value = response.data.result;
    userCount.value = response.data.userCount;

    // var date = new Date(response.data.updateTime);
    // var y = date.getFullYear(); //年
    // var m = (date.getMonth() + 1).toString().padStart(2, "0"); //月
    // var d = date.getDate().toString().padStart(2, "0"); //日
    // var h = date.getHours().toString().padStart(2, "0"); //时
    // var mm = date.getMinutes().toString().padStart(2, "0"); //分
    // updateTime.value = `${y}-${m}-${d}`;
    updateTime.value = response.data.updateTime;
  });
}

onMounted(() => {
  getCharStatisticsResult();
});

function getSprite(charId, index) {
  return "image_avatar bg-" + charId;
}

function switchSurvey(type) {
  surveyType.value = type;
}
</script>
