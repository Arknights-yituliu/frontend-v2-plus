<template>
  <div class="survey_charData_page">
    <!-- <div class="setupBox">
        设置 <br />
        设置 <br />
        设置 <br />
        设置 <br />
        设置 <br />
        设置 <br />
      </div> -->

    <div class="survey_charData_header">
      <div class="login_wrap" v-show="userData.status < 0">
        <div>
          <input type="text" class="login_input" v-model="loginData.userName" />
        </div>
        <div style="display: flex">
          <div class="btn_survey" @click="register()">注册</div>
          <div class="btn_survey" @click="login()">登录</div>
        </div>
      </div>
      <div class="user_wrap" v-show="userData.status == 1">
        <div class="user_name">用户：{{ userData.userName }}</div>
      </div>
    </div>

    <div class="setup_wrap">
      <div class="setup_bar">
        <div class="setup_title">设置</div>
        <div class="btn_survey" @click="logout()">退出登录</div>
        <div class="btn_survey" @click="upload()">上传数据</div>
        <a href="/survey/list"> <div class="btn_survey">查看榜单</div></a>
        <!-- <div class="btn_survey">第三方导入</div> -->
      </div>
      <div class="setup_bar">
        <div class="setup_title">筛选</div>
        <div class="btn_survey">是否拥有</div>
        <!-- <div class="btn_survey" @click="logout()">实装时间</div> -->
        <div class="btn_survey">是否精二</div>
        <div class="btn_survey">是否有模组</div>
      </div>
    </div>
    <div class="fill_course_page">
      <charDataDemo></charDataDemo>
    </div>
    <div class="char_forms">
      <div class="from_title_wrap">
        <div class="from_card">
          <div class="from_title" :style="tableSytle('short')">干员</div>
          <div class="from_title" :style="tableSytle('long')">精英化</div>
          <div class="from_title" :style="tableSytle('long')">1技能</div>
          <div class="from_title" :style="tableSytle('long')">2技能</div>
          <div class="from_title" :style="tableSytle('long')">3技能</div>
          <div class="from_title" :style="tableSytle('long')">模组X</div>
          <div class="from_title" :style="tableSytle('long')">模组Y</div>
        </div>
        <div class="from_card" v-show="clientWidth > 800">
          <div class="from_title" :style="tableSytle('short')">干员</div>
          <div class="from_title" :style="tableSytle('long')">精英化</div>
          <div class="from_title" :style="tableSytle('long')">1技能</div>
          <div class="from_title" :style="tableSytle('long')">2技能</div>
          <div class="from_title" :style="tableSytle('long')">3技能</div>
          <div class="from_title" :style="tableSytle('long')">模组X</div>
          <div class="from_title" :style="tableSytle('long')">模组Y</div>
        </div>
      </div>

      <div class="from_card" v-for="(char, index) in characterList" :key="index">
        <div class="card_option" :style="tableSytle('short')">
          <div @click="char.own = !char.own" :class="getSprite(char.charId)"></div>
          <div class="ownAndPotential_wrap">
            <c-switch v-model="char.own" class="card_option_switch"></c-switch>
            <div class="dropDown" @click="dropDown('potential' + index)">
              <div :class="getSprite('potential' + char.potential, 'potential')"></div>
            </div>
            <div class="dropDown_menu">
              <div class="dropDown_content" :id="'potential' + index" @click="dropUp('potential' + index)">
                <div v-for="rank in ranks.slice(1, 7)" @click="char.potential = rank" class="dropDown_content_item">潜能{{ rank }}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="card_option" :style="tableSytle('long')">
          <div v-for="rank in ranks.slice(0, 3)" @click="changeData(index, 'phase', rank)" :class="selected(char.phase, rank)">
            <div :class="getSprite('phase' + rank, 'phase')"></div>
          </div>
        </div>

        <div class="card_option" :style="tableSytle('long')">
          <div v-for="rank in ranks.slice(1, 4)" @click="changeData(index, 'skill1', rank)" :class="selected(char.skill1, rank)">
            <div :class="getSprite('skill' + rank, 'skill')"></div>
          </div>
        </div>
        <div class="card_option" :style="tableSytle('long')">
          <div v-for="rank in ranks.slice(1, 4)" @click="changeData(index, 'skill2', rank)" :class="selected(char.skill2, rank)">
            <div :class="getSprite('skill' + rank, 'skill')"></div>
          </div>
        </div>
        <div class="card_option" :style="tableSytle('long')">
          <div v-for="rank in ranks.slice(1, 4)" @click="changeData(index, 'skill3', rank)" :class="selected(char.skill3, rank)">
            <div :class="getSprite('skill' + rank, 'skill')"></div>
          </div>
        </div>

        <div class="card_option" :style="tableSytle('long')">
          <div v-for="rank in ranks.slice(1, 4)" v-show="char.modX > -1" @click="changeData(index, 'modX', rank)" :class="selected(char.modX, rank)">
            <div :class="getSprite('mod_' + rank, 'mod')"></div>
          </div>
        </div>
        <div class="card_option" :style="tableSytle('long')">
          <div v-for="rank in ranks.slice(1, 4)" v-show="char.modY > -1" @click="changeData(index, 'modY', rank)" :class="selected(char.modY, rank)">
            <div :class="getSprite('mod_' + rank, 'mod')"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import "@/assets/css/sprite_char_6.css";
import "@/assets/css/sprite_rank.css";
import "@/assets/css/survey_charData.css";
import { cMessage } from "@/components/message.js";
import { registerEvent, loginEvent, userDataCacheEvent, userDataCacheClearEvent, characterListInit, globalUserData } from "./serveyService";
import charDataDemo from "@/pages/survey/charDataDemo.vue";

import surveyApi from "@/api/survey";
import { onMounted, ref, watch } from "vue";

let loginData = ref({ userName: "" }); //用户输入的用户名，用obj没准后期有别的字段
let userData = ref({ userName: "山桜", status: -1, uid: 10000 }); //用户信息(用户名，用户id，用户状态)

//注册
async function register() {
  let response = await registerEvent(loginData.value);
  console.log("异步：", response);
  userData.value = response;
  // surveyApi.register(loginData.value).then((response) => {
  //   userData.value = response.data;
  //   window.localStorage.setItem("userData", JSON.stringify(userData.value));
  // });
}

//登录
async function login() {
  let response = await loginEvent(loginData.value);
  console.log("异步：", response);
  userData.value = response;
}

function logout() {
  userData.value = userDataCacheClearEvent();
}

function getSurveyCharData(userName) {
  surveyApi.getSurveyCharData(userName).then((response) => {
    let list = response.data;
    for (var i = 0; i < characterList.value.length; i++) {
      // characterList.value[i].own =false;
      for (var j = 0; j < list.length; j++) {
        if (list[j].charId == characterList.value[i].charId) {
          characterList.value[i] = list[j];
        }
      }
    }
    cMessage("导入了 " + list.length + " 条数据");
  });
}

let characterList = ref([]);
let ranks = ref([0, 1, 2, 3, 4, 5, 6]);

function initData() {
  characterList.value = characterListInit();
}

function changeData(index, attrib, value) {
  if (characterList.value[index][attrib] == value) {
    characterList.value[index][attrib] = 0;
  } else {
    characterList.value[index][attrib] = value;
  }
}

function sortCharList() {
  for (var i = 0; i < characterList.value.length; i++) {
    for (var j = i + 1; j < characterList.value.length; j++) {
      if (characterList.value[i][attrib] > characterList.value[j][attrib]) {
        let t = characterList.value[i];
        characterList.value[i] = characterList.value[j];
        characterList.value[j] = t;
      }
    }
  }
}

function selected(value, checkValue) {
  if (value == checkValue) return "card_option_check check_selected";
  return "card_option_check";
}

//上传
function upload() {
  surveyApi.upload_character(characterList.value, userData.value.userName).then((response) => {
    // console.log(response.data);
    cMessage("新增了 " + response.data.insertRows + " 条");
    cMessage("更新了 " + response.data.updateRows + " 条");
  });
}

let maaData = ref([{}]);

function maaData1() {
  let dataJson = JSON.parse(maaData.value);
  for (let i in dataJson) {
  }
}

function dropDown(id) {
  document.getElementById(id).style.display = "flex";
}

function dropUp(id) {
  document.getElementById(id).style.display = "none";
}

const popupFlag_illustrate = ref(true);

function getSprite(id, type, index) {
  if ("mod" == type) return "bg-" + id + " sprite_mod";
  if ("skill" == type) return "bg-" + id + " sprite_skill";
  if ("phase" == type) return "bg-" + id + " sprite_phase";
  if ("potential" == type) return "bg-" + id + " sprite_potential";
  if ("own" == type) return "bg-" + id + " sprite_avatar_own";

  return "bg-" + id + " sprite_avatar";
}

function tableSytle(type) {
  if ("short" == type) return "min-width:98px";
  if ("long" == type) return "min-width:66px";
}

let clientWidth = ref(500);

function getClientWidth() {
  const width = document.documentElement.clientWidth;
  clientWidth.value = width;
  console.log(width);
}

onMounted(() => {
  getClientWidth();
  initData();
  userData.value = userDataCacheEvent();
});
</script>
