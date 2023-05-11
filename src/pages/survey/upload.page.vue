<template>
  <div class="survey_main">
    <!-- <button @click="register()">注册</button>
  <input type="text" v-model="userName.userName" />
  <div>{{ userData.userName }}</div> -->
    <div>
      <table class="upload_table">
        <tbody>
          <tr class="upload_table_title">
            <td>干员</td>
            <td>精英化</td>
            <td>1技能</td>
            <td>2技能</td>
            <td>3技能</td>
            <td>潜能</td>
            <td>模组X</td>
            <td>模组Y</td>
          </tr>
          <tr v-for="(char, index) in characterList" :key="index">
            <td><div :class="getSprite(char.charId)"></div></td>
            <td>
              <div v-for="rank in ranks.slice(0, 3)" @click="char.phase = rank" :class="selected(char.phase, rank)">精英 {{ rank }}</div>
           
            </td>
            <td>
              <div v-show="char.phase > 1" v-for="rank in ranks.slice(0, 4)" @click="char.skill1 = rank" :class="selected(char.skill1, rank)">
                {{ rank == 0 ? "未专精" : "专精" + rank }}
              </div>
            </td>
            <td>
              <div v-show="char.phase > 1" v-for="rank in ranks.slice(0, 4)" @click="char.skill2 = rank" :class="selected(char.skill2, rank)">
                {{ rank == 0 ? "未专精" : "专精" + rank }}
              </div>
            </td>
            <td>
              <div v-show="char.phase > 1" v-for="rank in ranks.slice(0, 4)" @click="char.skill3 = rank" :class="selected(char.skill3, rank)">
                {{ rank == 0 ? "未专精" : "专精" + rank }}
              </div>
            </td>

            <td>
              <div class="potential_box">
                <div v-for="rank in ranks.slice(1, 7)" @click="char.potential = rank" :class="selected(char.potential, rank)">潜能{{ rank }}</div>
              </div>
            </td>
            <td>
              <div v-show="char.phase > 1" v-for="rank in ranks.slice(0, 4)" @click="char.modX = rank" :class="selected(char.modX, rank)">
                {{ rank == 0 ? "未开启" : "等级" + rank }}
              </div>
            </td>
            <td>
              <div v-show="char.phase > 1" v-for="rank in ranks.slice(0, 4)" @click="char.modY = rank" :class="selected(char.modY, rank)">
                {{ rank == 0 ? "未开启" : "等级" + rank }}
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import "@/assets/css/sprite_char_6.css";
import "@/assets/css/survey_upload.css";
import character_table from "@/static/json/character_table.json";

import surveyApi from "@/api/survey";
import { onMounted, ref } from "vue";

let userName = ref({ userName: "山桜x" }); //用户输入的用户名，用obj没准后期有别的字段
let userData = ref({ userName: "" }); //用户信息(用户名，用户id，用户状态)

//注册
function register() {
  surveyApi.register(userName.value).then((response) => {
    console.log(response.data);
    userData.value = response.data;
  });
}

let ranks = ref([0, 1, 2, 3, 4, 5, 6]);

let characterList = ref([]);

function changeData() {
  characterList = characterList;
}

function initData() {
  for (let charId in character_table) {
    var baseInfo = character_table[charId];
    if (baseInfo.rarity < 5) continue;
    let character = {
      charId: charId,
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

//上传
function upload() {
  surveyApi.upload_character().then((response) => {});
}

function getSprite(charId, index) {
  return "image_avatar bg-" + charId + " upload_avatar";
}

onMounted(() => {
  initData();
});
</script>
