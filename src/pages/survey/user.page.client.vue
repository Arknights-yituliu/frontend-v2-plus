<template>
  <div class="survey_user_page">
    <div class="user_info_wrap">
      <div class="user_image_wrap">
        <div class="user_image bg-char_010_chen"></div>
      </div>

      <div class="user_name">{{ userData.userName }}</div>
    </div>

    <div class="user_operator_statistics_wrap">
      <div class="user_operator_statistics">
        总计招募干员：<a class="user_operator_statistics_num"> {{ operatorStatisticsObj.count }}</a>
      </div>
      <div class="user_operator_statistics">
        精二干员总数：<a class="user_operator_statistics_num">{{ operatorStatisticsObj.elite2 }}</a>
      </div>
      <div class="user_operator_statistics">
        专一技能总数：<a class="user_operator_statistics_num">{{ operatorStatisticsObj.rank1 }}</a>
      </div>
      <div class="user_operator_statistics">
        专二技能总数：<a class="user_operator_statistics_num">{{ operatorStatisticsObj.rank2 }}</a>
      </div>
      <div class="user_operator_statistics">
        专三技能总数：<a class="user_operator_statistics_num">{{ operatorStatisticsObj.rank3 }}</a>
      </div>
    </div>
    <div class="operator_card_wrap">
      <div class="operator_card" v-for="operator in operator_list">
        <div class="user_portrait_wrap">
          <div :class="getBgSprite('bg-tl', operator.rarity)"></div>
          <div :class="getBgSprite('profession', operator.profession)"></div>
          <div :class="getBgSprite('rarity', operator.rarity)"></div>
          <div :class="getBgSprite('bg', operator.rarity)"></div>
          <div :class="getSprite('portrait', operator.charId)"></div>
          <div :class="getBgSprite('light', operator.rarity)"></div>
          <div :class="getBgSprite('elite', 'elite2')"></div>
          <div :class="getBgSprite('mask', operator.rarity)"></div>
          <div class="user_portrait_bg_bl"></div>
          <div class="user_operator_name">{{ operator.name }}</div>
          <div class="user_operator_level">{{ operator.level>0?operator.level:0 }}</div>

        </div>
        <div class="user_operator_skill_wrap">
          <div v-for="(skill,rank) in operator.skill">
            <div class="user_skill_icon_wrap">
              <div :class="getSprite('skill_icon', skill.iconId)"></div>
              <div class="user_skill_rank_bg"></div>
              <!--                    <div :class="getSprite('skill_rank', 'skill3')"></div>-->
              <div class="user_skill_rank_1" v-show="operator[('skill'+(1+rank))]>=1"></div>
              <div class="user_skill_rank_2" v-show="operator[('skill'+(1+rank))]>=2"></div>
              <div class="user_skill_rank_3" v-show="operator[('skill'+(1+rank))]>=2"></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="user_input_bar">
      <div class="user_input_item">用户名</div>
      <input v-model="userData.userName"/>
    </div>
    <div class="user_input_bar">
      <div class="user_input_item">森空岛CRED</div>
      <input v-model="userData.cred"/>
    </div>
    <div class="user_input_bar">
      <div class="user_input_item">密码</div>
      <input v-model="userData.passWord"/>
    </div>
    <div class="user_btn" @click="updateUser()">更新密码</div>

    <div></div>
  </div>
</template>

<script setup>
import {onMounted, ref} from "vue";
import surveyApi from "@/api/survey";
import {characterListInit, collapse, filterByCharacterProperty, professionDict, yearDict} from "./common"; //基础信息（干员基础信息列表，干员职业字典，干员星级）
import request from "@/api/requestBase";

let operator_list = ref(characterListInit())
let userData = ref({userName: "未登录", code: 0, status: -100, passWord: "", token: undefined, oldPassWord: "", cred: ""});

function getCacheUserData() {
  let cacheUserData = localStorage.getItem("globalUserData");
  if (!(cacheUserData == "undefined" || cacheUserData == void 0)) {
    const parse = JSON.parse(cacheUserData);
    userData.value.userName = parse.userName;
    userData.value.code = parse.code;
    userData.value.status = parse.status;
    userData.value.token = parse.token;
    getUserOperatorData()
  }
}

let operatorStatisticsObj = ref({
  rank1: 0,
  rank2: 0,
  rank3: 0,
  elite2: 0,
  count: 0,
})


function getUserOperatorData() {

  request({
    url: `survey/operator/retrieval?token=${userData.value.token}`,
    method: "get"
  }).then(response => {
    response = response.data
    if (response.code !== 200) {

    } else {
      const list = response.data
      operatorStatisticsObj.value.count = list.length
      //转为前端的数据格式
      for (let i = 0; i < operator_list.value.length; i++) {
        // characterList.value[i].own =false;
        for (let j = 0; j < list.length; j++) {
          if (list[j].charId === operator_list.value[i].charId) {
            if (!list[j].own) continue;
            operator_list.value[i].elite = list[j].elite;
            operator_list.value[i].level = list[j].level;
            operator_list.value[i].potential = list[j].potential;
            operator_list.value[i].mainSkill = list[j].mainSkill;
            operator_list.value[i].skill1 = list[j].skill1;
            operator_list.value[i].skill2 = list[j].skill2;
            operator_list.value[i].skill3 = list[j].skill3;
            operator_list.value[i].modX = list[j].modX;
            operator_list.value[i].modY = list[j].modY;
            operator_list.value[i].own = list[j].own;
            operatorStatisticsObj.value['elite' + list[j].elite]++
            operatorStatisticsObj.value['rank' + list[j].skill1]++
            operatorStatisticsObj.value['rank' + list[j].skill2]++
            operatorStatisticsObj.value['rank' + list[j].skill3]++
          }
        }
      }

      console.log(operator_list.value)
    }

  })
}

function getSkillRank(skill, rank) {

}

function updateUser() {
  surveyApi.updateUser(userData.value.token, userData.value).then((response) => {
    userData.value.status = response.data.status;
    userData.value.userName = response.data.userName;
    userData.value.code = response.data.code;
    if (response.data.code === 200) {
      localStorage.setItem("globalUserData", JSON.stringify(userData.value));
      location.reload();
    }
  });
}

function getSprite(type, id) {
  if ("portrait" === type) return "bg-" + id + "_1 user_portrait";
  if ("skill_icon" === type) return "bg-skill_icon_" + id + " user_skill_icon";
  if ("skill_rank" === type) return "bg-" + id + " user_skill_rank";
}

function getBgSprite(type, id) {
  if ("elite" === type) return "bg-" + id + " user_operator_elite";
  if (type === "bg-tl") return "bg-portrait_bg_tl_" + id + " user_portrait_bg_tl";
  if (type === "profession") return "bg-" + id + " user_portrait_profession";
  if (type === "rarity") return "bg-rarity_" + id + " user_portrait_rarity";
  if (type === "bg") return "bg-portrait_bg_" + id + " user_portrait_bg";
  if (type === "light") return "bg-light_" + id + " user_portrait_right";
  if (type === "mask") return "bg-mask" + " user_portrait_mask";
}

onMounted(() => {
  getCacheUserData()
})


</script>

<style scoped>
.survey_user_page {
  padding: 20px;
  width: 99%;
  margin: auto;

}

.user_info_wrap {
  display: flex;
}

.user_image_wrap {
  width: 70px;
  height: 70px;
  border-radius: 50%;
  border: 1px solid rgb(147, 147, 147);
  position: relative;
  overflow: hidden;
  /*box-shadow: grey 1px 0px 0px 0px;*/
}

.user_image {
  transform: scale(0.4);
  /* border: 1px solid rgb(0, 34, 255); */
  border-radius: 50%;
  position: absolute;
  top: -56px;
  left: -56px;
}

.user_name {
  font-size: 18px;
  font-weight: 600;
  line-height: 70px;
  color: black;
}

.user_operator_statistics_wrap {
  display: flex;
}

.user_operator_statistics{
  padding: 8px;
  line-height: 28px;
}

.user_operator_statistics_num{
  color: #ff6a00;
  font-size: 18px;
}


.operator_card_wrap {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  /*background: #0a0a0a;*/
  margin: 20px 0 0 0;
  width: 1105px;
}

.operator_card {
  /*border: 1px solid #fa5e5e;*/
  margin: 4px;
  display: flex;
  padding: 4px;
  background: #d9d9d9;
}

.user_operator_name {
  color: white;
  position: absolute;
  text-align: right;
  width: 110px;
  top: 246px;
  z-index: 50;
}


.user_operator_level {
  color: white;
  position: absolute;
  text-align: center;
  font-size: 22px;
  font-weight: 700;
  top: 204px;
  left: 0px;
  border: 2px solid orange;
  padding: 4px;
  border-radius: 50%;
  z-index: 50;
}

.user_operator_elite {
  transform: scale(0.15);
  position: absolute;
  z-index: 31;
  top: 120px;
  left: -66px;

}

.user_portrait_bg_tl {
  transform: scale(0.8);
  position: absolute;
  left: -9px;
  top: -4px;
}

.user_portrait_profession {
  transform: scale(0.08);
  position: absolute;
  left: -116px;
  z-index: 30;
  top: -116px;
  border: 2px solid #eeeeee;
}

.user_portrait_rarity {
  position: absolute;
  transform: scale(0.65);
  left: 8px;
  top: -286px;
}

.user_portrait_bg {
  transform: scale(0.775);
  position: absolute;
  height: 216px;
  left: -17px;
  top: 10px;
}

.user_portrait_right {
  transform: scale(0.79);
  position: absolute;
  z-index: 10;
  top: 130px;
  left: -16px;
}

.user_portrait_mask {
  transform: scale(0.77);
  position: absolute;
  z-index: 21;
  left: -22px;
  top: 168px;
}

.user_portrait_bg_bl {
  background: black;
  width: 90px;
  height: 30px;
  position: absolute;
  top: 238px;
  left: 0;
  z-index: 20;
}

.user_portrait {
  transform: scale(0.61);
  position: absolute;
  top: -56px;
  left: -36px;
}

.user_portrait_wrap {
  position: relative;
  width: 110px;
  height: 266px;
  background: white;
}

.user_operator_skill_wrap {
  left: 300px;
  top: -100px;
  width: 58px;
}

.user_skill_icon_wrap {
  position: relative;
  width: 50px;
  height: 50px;
  margin: 8px 0px 8px 8px;
}

.user_skill_icon {
  transform: scale(0.38);
  position: absolute;
  top: -40px;
  left: -40px;
}

.user_skill_rank_bg {
  position: absolute;
  width: 18px;
  height: 18px;
  background: #3d3d3d;
  /*z-index: 30;*/
  left: -4px;
  top: -4px;
}

.user_skill_rank_1 {
  position: absolute;
  background: #ffffff;
  border-radius: 50%;
  width: 8px;
  height: 8px;
  left: 1px;
  top: -4px;
}

.user_skill_rank_2 {
  position: absolute;
  background: #ffffff;
  border-radius: 50%;
  width: 8px;
  height: 8px;
  left: -3px;
  top: 4px;
}

.user_skill_rank_3 {
  position: absolute;
  background: #ffffff;
  border-radius: 50%;
  width: 8px;
  height: 8px;
  left: 6px;
  top: 4px;
}

.user_skill_rank {
  transform: scale(0.11);
  position: absolute;
  top: -110px;
  left: -110px;
}

.user_input_bar {
  display: flex;
  line-height: 24px;
  margin: 8px;
}

.user_input_item {
  width: 100px;
}

.user_btn {
  height: 28px;
  line-height: 28px;
  text-align: center;
  width: 120px;
  box-shadow: 0 3px 1px -2px rgba(0, 0, 0, 0.2), 0 2px 2px 0 rgba(0, 0, 0, 0.14), 0 1px 5px 0 rgba(0, 0, 0, 0.12);
  cursor: pointer;
  font-weight: 600;
}

.user_btn:hover {
  background: #d5d5d5;
}
</style>
