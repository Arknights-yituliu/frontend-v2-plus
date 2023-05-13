<template>
  <div class="survey_page">
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
          <div class="btn_login" @click="register()">注册</div>
          <div class="btn_login" @click="login()">登录</div>
        </div>
      </div>

      <div class="user_bar" v-show="userData.status == 1">
        <div class="user_name">
          欢迎回来，{{ userData.userName }}
          <div class="user_id">uid:{{ userData.id }}</div>
        </div>
      </div>
    </div>
    <div class="btn_login" @click="userDataCacheClear()">清除缓存</div>
    <div class="btn_login" @click="upload()">上传数据</div>
    <div class="char_card_box" v-show="userData.status == 1">
      <div class="char_card">
        <div class="card_title" :style="tableSytle(1)">干员</div>
        <div class="card_title" :style="tableSytle(2)">持有</div>
        <div class="card_title" :style="tableSytle(2)">精英化</div>
        <div class="card_title" :style="tableSytle(2)">1技能</div>
        <div class="card_title" :style="tableSytle(2)">2技能</div>
        <div class="card_title" :style="tableSytle(2)">3技能</div>
        <div class="card_title" :style="tableSytle(2)">模组X</div>
        <div class="card_title" :style="tableSytle(2)">模组Y</div>
      </div>
      <div class="char_card" v-show="clientWidth > 800">
        <div class="card_title" :style="tableSytle(1)">干员</div>
        <div class="card_title" :style="tableSytle(2)">持有</div>
        <div class="card_title" :style="tableSytle(2)">精英化</div>
        <div class="card_title" :style="tableSytle(2)">1技能</div>
        <div class="card_title" :style="tableSytle(2)">2技能</div>
        <div class="card_title" :style="tableSytle(2)">3技能</div>
        <div class="card_title" :style="tableSytle(2)">模组X</div>
        <div class="card_title" :style="tableSytle(2)">模组Y</div>
      </div>
      <div class="char_card" v-for="(char, index) in characterList" :key="index">
        <div class="card_option" :style="tableSytle(1)">
          <div :class="getSprite(char.charId)"></div>
        </div>
        <div class="card_option" :style="tableSytle(2)">
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
        <div class="card_option" :style="tableSytle(2)">
          <div v-for="rank in ranks.slice(0, 3)" @click="changeData(index, 'phase', rank)" :class="selected(char.phase, rank)">
            <div :class="getSprite('phase' + rank, 'skill')"></div>
          </div>
        </div>

        <div class="card_option" :style="tableSytle(2)">
          <div v-show="char.phase > 1" v-for="rank in ranks.slice(1, 4)" @click="changeData(index, 'skill1', rank)" :class="selected(char.skill1, rank)">
            <div :class="getSprite('skill' + rank, 'skill')"></div>
          </div>
        </div>
        <div class="card_option" :style="tableSytle(2)">
          <div v-show="char.phase > 1" v-for="rank in ranks.slice(1, 4)" @click="changeData(index, 'skill2', rank)" :class="selected(char.skill2, rank)">
            <div :class="getSprite('skill' + rank, 'skill')"></div>
          </div>
        </div>
        <div class="card_option" :style="tableSytle(2)">
          <div v-show="char.phase > 1" v-for="rank in ranks.slice(1, 4)" @click="changeData(index, 'skill3', rank)" :class="selected(char.skill3, rank)">
            <div :class="getSprite('skill' + rank, 'skill')"></div>
          </div>
        </div>

        <div class="card_option" :style="tableSytle(2)">
          <div v-show="char.phase > 1" v-for="rank in ranks.slice(1, 4)" @click="changeData(index, 'modX', rank)" :class="selected(char.modX, rank)">
            <div :class="getSprite('mod_' + rank, 'mod')"></div>
          </div>
        </div>
        <div class="card_option" :style="tableSytle(2)">
          <div v-show="char.phase > 1" v-for="rank in ranks.slice(1, 4)" @click="changeData(index, 'modY', rank)" :class="selected(char.modY, rank)">
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

import surveyApi from "@/api/survey";
import { onMounted, ref } from "vue";

let loginData = ref({ userName: "" }); //用户输入的用户名，用obj没准后期有别的字段
let userData = ref({ userName: "", status: -1 }); //用户信息(用户名，用户id，用户状态)

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
  });
}

function userDataCache() {
  let cacheData = window.localStorage.getItem("userData");
  console.log(cacheData);
  userData.value = cacheData == undefined ? userData.value : JSON.parse(cacheData);
  console.log(userData.value);
}

function userDataCacheClear() {
  window.localStorage.clear();
}

let ranks = ref([0, 1, 2, 3, 4, 5, 6]);

let characterList = ref([]);

function initData() {
  for (let charId in character_table) {
    var baseInfo = character_table[charId];
    if (baseInfo.rarity < 5) continue;
    let character = {
      charId: charId,
      own: true,
      level: 60,
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
  if (value == checkValue) return "checkItem checkItem_selected";
  return "checkItem";
}

function changeData(index, attrib, value) {
  if (characterList.value[index][attrib] == value) {
    characterList.value[index][attrib] = 0;
  } else {
    characterList.value[index][attrib] = value;
  }
  console.log(characterList.value[index]);
}

//上传
function upload() {
  surveyApi.upload_character(characterList.value, userData.value.userName).then((response) => {
    console.log(response.data);
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

function tableSytle(index) {
  if (1 == index) return "min-width:94px";
  if (2 == index) return "min-width:48px";
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
