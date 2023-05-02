<template>
  <div class="survey_popup_mask" :style="popupStyle" @click="closePopup()"></div>
  <div class="survey_popup" :style="popupStyle">
    <div class="survey_popup_title">导入JSON</div>
    <div class="survey_popup_input">
      <input type="text" v-model="operBoxData"  class="input_operBox" placeholder="粘贴从MAA干员识别小工具导出的数据" />
    </div>
    <div class="survey_popup_foot">
      <div class="survey_popup_button" @click="closePopup()">取消</div>
      <div class="survey_popup_button" @click="manualUpload()">导入</div>
    </div>
  </div>

  <div class="main_survey">
    <div class="survey_title">明日方舟干员{{ surveyType }}统计</div>
    

    <div class="survey_tip_box">
      <div class="survey_tip">
        <a>调查人数</a> <br />
        {{userCount}}人次
      </div>
      <div class="survey_tip">
        <a>更新时间</a> <br />
        {{updateTime}}
      </div>
    </div>
    <div class="survey_button_box">
      <div class="survey_button_title">设置</div>
      <div class="survey_button" style="width: 120px;" @click="switchSurvey('精二率')">精二率统计</div>
      <div class="survey_button" style="width: 120px;" @click="switchSurvey('持有率')">持有率统计</div>
      <div class="survey_button" style="width: 190px;" @click="inputOperBox()">手动导入干员信息</div>
    </div>

    <div class="oper_table">
      <div class="oper" v-for="(operData, index) in operServeyData" v-show="operData.rarity > 5">
        <div class="operIndex">No.{{ index + 1 }}</div>
        <!-- <img class="image_avatar" :src="'/img/avatar/' + operData.charId + '.png'" alt="" /> -->
        <div class="image_avatar_background">
        <div style="width: 58px;height:58px;" :class="getSprite(operData.charId)"></div>
        </div>
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
import { onMounted, ref, watch } from "vue";
import { ElMessage } from 'element-plus';

import surveyApi from "@/api/survey";

let operServeyData = ref([]);
let surveyType = ref("持有率");
let popupStyle = ref("survey_popup_mask");

let operBoxData = ref("");
let userCount = ref(0);
let updateTime = ref('2023-05-01');

function getOperatorDataResult() {
   surveyApi.getOperatorDataResult().then((response) => {
      operServeyData.value = response.data.result;
      userCount.value = response.data.userCount;
       
      var date = new Date(response.data.updateTime);
        var y = date.getFullYear(); //年
        var m = (date.getMonth() + 1).toString().padStart(2, "0"); //月
        var d = date.getDate().toString().padStart(2, "0"); //日
        var h = date.getHours().toString().padStart(2, "0"); //时
        var mm = date.getMinutes().toString().padStart(2, "0"); //分
        updateTime.value = `${y}/${m}/${d} ${h}:${mm}`;
          
  })
}

onMounted(()=>{
  getOperatorDataResult()
})

function getSprite(charId, index) {
  return "image_avatar bg-" + charId;
}

function switchSurvey(type) {
  surveyType.value = type;
}

function inputOperBox() {
  popupStyle.value = "display:block";
}

function closePopup() {
  popupStyle.value = "display:none";
}

function manualUpload(){
  let dataJson  = JSON.parse(operBoxData.value);
  console.log(dataJson)
  surveyApi.manualUploadOperBox(dataJson).then((response) => {
    console.log(response)
    ElMessage({
    message: '更新了'+response.data.rowsAffected+'条数据',
    type: 'success',
  })
  })
}
</script>
