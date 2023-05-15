<template>
  <div class="survey_upload_page">
    <!-- <div class="setupBox">
      设置 <br />
      设置 <br />
      设置 <br />
      设置 <br />
      设置 <br />
      设置 <br />
    </div> -->
    <div class="survey_header">
      <div class="login_bar" v-show="userData.status < 0">
        <div>
          <input type="text" class="input_login" v-model="loginData.userName" />
        </div>
        <div style="display: flex">
          <div class="btn_survey" @click="register()">注册</div>
          <div class="btn_survey" @click="login()">登录</div>
        </div>
      </div>

      <div class="user_wrap" v-show="userData.status == 1">
        <div class="user_name">昵称：{{ userData.userName }}</div>
        <div class="user_id">UID:{{ userData.uid }}</div>
      </div>
    </div>

    <div class="setup_wrap">
      <div class="setup_bar">
        <div class="setup_title">设置</div>
        <div class="btn_survey" @click="userDataCacheClear()">退出登录</div>
        <div class="btn_survey" @click="upload()">上传数据</div>
        <div class="btn_survey">查看榜单</div>
        <!-- <div class="btn_survey">第三方导入</div> -->
      </div>
      <!-- <div class="setup_bar">
        <div class="setup_title">筛选</div>
        <div class="btn_survey" @click="userDataCacheClear()">实装时间</div>
        <div class="btn_survey" @click="upload()">是否精二</div>
        <div class="btn_survey">是否有模组</div>
        <div class="btn_survey" @click="createMessage()">XXXX</div>
      </div> -->
    </div>

    <div class="char_forms">
      <div class="from_title">
        <div class="from_card">
          <div :style="tableSytle('short')">干员</div>
          <div :style="tableSytle('long')">持有</div>
          <div :style="tableSytle('long')">精英化</div>
          <div :style="tableSytle('long')">1技能</div>
          <div :style="tableSytle('long')">2技能</div>
          <div :style="tableSytle('long')">3技能</div>
          <div :style="tableSytle('long')">模组X</div>
          <div :style="tableSytle('long')">模组Y</div>
        </div>
        <div class="from_card" v-show="clientWidth > 800">
          <div :style="tableSytle('short')">干员</div>
          <div :style="tableSytle('long')">持有</div>
          <div :style="tableSytle('long')">精英化</div>
          <div :style="tableSytle('long')">1技能</div>
          <div :style="tableSytle('long')">2技能</div>
          <div :style="tableSytle('long')">3技能</div>
          <div :style="tableSytle('long')">模组X</div>
          <div :style="tableSytle('long')">模组Y</div>
        </div>
      </div>

      <div class="from_card" v-for="(char, index) in characterList" :key="index">
        <div class="card_option" :style="tableSytle('short')">
          <div :class="getSprite(char.charId)"></div>
        </div>
        <div class="card_option" :style="tableSytle('long')">
          <op-switch v-model="char.own" class="card_option_switch"></op-switch>
          <div class="dropDown" @click="dropDown('potential' + index)">
            <div :class="getSprite('potential' + char.potential, 'potential')"></div>
            <div>{{ "潜能" + char.potential }}</div>
          </div>
          <div class="dropDown_menu">
            <div class="dropDown_content" :id="'potential' + index" @click="dropUp('potential' + index)">
              <div v-for="rank in ranks.slice(1, 7)" @click="char.potential = rank" class="dropDown_content_item">潜能{{ rank }}</div>
            </div>
          </div>
        </div>
        <div class="card_option" :style="tableSytle('long')">
          <div v-for="rank in ranks.slice(0, 3)" @click="changeData(index, 'phase', rank)" :class="selected(char.phase, rank)">
            <div :class="getSprite('phase' + rank, 'skill')"></div>
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
          <div v-for="rank in ranks.slice(1, 4)" @click="changeData(index, 'modX', rank)" :class="selected(char.modX, rank)">
            <div :class="getSprite('mod_' + rank, 'mod')"></div>
          </div>
        </div>
        <div class="card_option" :style="tableSytle('long')">
          <div v-for="rank in ranks.slice(1, 4)" @click="changeData(index, 'modY', rank)" :class="selected(char.modY, rank)">
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
import "@/assets/css/survey_upload.css";
import character_table from "@/static/json/character_table.json";
import { OPmessage } from "@/components/message.js";

import surveyApi from "@/api/survey";
import { onMounted, ref, watch } from "vue";

let loginData = ref({ userName: "" }); //用户输入的用户名，用obj没准后期有别的字段
let userData = ref({ userName: "山桜", status: -1, uid: 10000 }); //用户信息(用户名，用户id，用户状态)

//注册
function register() {
  surveyApi.register(loginData.value).then((response) => {
    console.log(response.data);
    userData.value = response.data;
    window.localStorage.setItem("userData", JSON.stringify(userData.value));
  });
}

//登录
function login() {
  surveyApi.login(loginData.value).then((response) => {
    console.log(response.data);
    userData.value = response.data;
    window.localStorage.setItem("userData", JSON.stringify(userData.value));
    if (userData.value.status == 1) {
      getSurveyData(userData.value.userName);
    }
  });
}

function userDataCache() {
  let cacheData = window.localStorage.getItem("userData");
  console.log(cacheData);
  userData.value = cacheData == undefined ? userData.value : JSON.parse(cacheData);
  console.log(userData.value);
  if (userData.value.status == 1) {
    console.log(userData.value);
    getSurveyData(userData.value.userName);
  }
}

function userDataCacheClear() {
  window.localStorage.clear();
  userData.value = { userName: "", status: -1 };
}

function getSurveyData(userName) {
  surveyApi.getSurveyData(userName).then((response) => {
    let list = response.data;
    for (var i = 0; i < characterList.value.length; i++) {
      for (var j = 0; j < list.length; j++) {
        if (list[j].charId == characterList.value[i].charId) {
          characterList.value[i] = list[j];
          characterList.value[i].own = true;
        }
      }
    }

    OPmessage("导入了 " + list.length + " 条数据");
  });
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

let ranks = ref([0, 1, 2, 3, 4, 5, 6]);

let characterList = ref([]);

function initData() {
  for (let charId in character_table) {
    var baseInfo = character_table[charId];
    if (baseInfo.rarity < 5) continue;
    let character = {
      charId: charId,
      own: false,
      level: 1,
      modX: 0,
      modY: 0,
      phase: 2,
      potential: 1,
      rarity: baseInfo.rarity,
      skill1: 0,
      skill2: 0,
      skill3: 0,
    };
    characterList.value.push(character);
  }
}

function selected(value, checkValue) {
  if (value == checkValue) return "card_option_check check_selected";
  return "card_option_check";
}

function changeData(index, attrib, value) {
  if (characterList.value[index][attrib] == value) {
    characterList.value[index][attrib] = 0;
  } else {
    characterList.value[index][attrib] = value;
  }
  // console.log(characterList.value[index]);
}

//上传
function upload() {
  let uploadList = [];

  for (var i = 0; i < characterList.value.length; i++) {
    if (characterList.value[i].own) {
      if (characterList.value[i].phase < 2) {
        characterList.value[i] = {
          modX: 0,
          modY: 0,
          skill1: 0,
          skill2: 0,
          skill3: 0,
        };
      }
      uploadList.push(characterList.value[i]);
    }
  }

  surveyApi.upload_character(uploadList, userData.value.userName).then((response) => {
    console.log(response.data);
    OPmessage("更新了 " + response.data.rowsAffected + " 条");
  });
}

function dropDown(id) {
  console.log(id);
  document.getElementById(id).style.display = "flex";
}

function dropUp(id) {
  console.log(id);
  document.getElementById(id).style.display = "none";
}

function getSprite(id, type, index) {
  if ("mod" == type) return "bg-" + id + " sprite_mod";
  if ("skill" == type) return "bg-" + id + " sprite_skill";
  if ("potential" == type) return "bg-" + id + " sprite_potential";

  return "bg-" + id + " sprite_avatar";
}

function tableSytle(type) {
  if ("short" == type) return "min-width:98px";
  if ("long" == type) return "min-width:50px";
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
  userDataCache();
});
</script>
