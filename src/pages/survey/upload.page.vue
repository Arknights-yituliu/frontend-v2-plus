<template>
  <div class="survey_main">
    <!-- <button @click="register()">注册</button>
  <input type="text" v-model="userName.userName" />
  <div>{{ userData.userName }}</div> -->
    <table class="upload_table">
      <tbody>
        <tr>
          <td style="width: 50px">干员</td>
          <td style="width: 50px">精英化</td>
          <td style="width: 60px">1技能</td>
          <td style="width: 60px">2技能</td>
          <td style="width: 60px">3技能</td>
          <td style="width: 50px">潜能</td>
          <td style="width: 60px">模组X</td>
          <td style="width: 60px">模组Y</td>
        </tr>
        <tr v-for="(character, index) in characterList" :key="index">
          <td><div :class="getSprite(character.charId)"></div></td>
          <td>
            <div @click="character.phase = 0" :class="selected(character.phase, 0)">精英 0</div>
            <div @click="character.phase = 1" :class="selected(character.phase, 1)">精英 1</div>
            <div @click="character.phase = 2" :class="selected(character.phase, 2)">精英 2</div>
          </td>
          <td>
            <div @click="character.skill1 = 0" :class="selected(character.skill1, 0)">未专精</div>
            <div @click="character.skill1 = 1" :class="selected(character.skill1, 1)">专精 Ⅰ</div>
            <div @click="character.skill1 = 2" :class="selected(character.skill1, 2)">专精 Ⅱ</div>
            <div @click="character.skill1 = 3" :class="selected(character.skill1, 3)">专精 Ⅲ</div>
          </td>
          <td v-show="character.phase > 0">
            <div @click="character.skill2 = 0" :class="selected(character.skill2, 0)">未专精</div>
            <div @click="character.skill2 = 1" :class="selected(character.skill2, 1)">专精 Ⅰ</div>
            <div @click="character.skill2 = 2" :class="selected(character.skill2, 2)">专精 Ⅱ</div>
            <div @click="character.skill2 = 3" :class="selected(character.skill2, 3)">专精 Ⅲ</div>
          </td>
          <td v-show="character.phase > 1">
            <div @click="character.skill3 = 0" :class="selected(character.skill3, 0)">未专精</div>
            <div @click="character.skill3 = 1" :class="selected(character.skill3, 1)">专精 Ⅰ</div>
            <div @click="character.skill3 = 2" :class="selected(character.skill3, 2)">专精 Ⅱ</div>
            <div @click="character.skill3 = 3" :class="selected(character.skill3, 3)">专精 Ⅲ</div>
          </td>
          <td v-show="character.phase < 1"></td>
          <td v-show="character.phase < 2"></td>
          <td><input type="text" class="upload_check" v-model="character.potential" /></td>
          <td v-show="character.phase > 1">
            <div @click="character.modX = 0" :class="selected(character.modX, 0)">未专精</div>
            <div @click="character.modX = 1" :class="selected(character.modX, 1)">专精 Ⅰ</div>
            <div @click="character.modX = 2" :class="selected(character.modX, 2)">专精 Ⅱ</div>
            <div @click="character.modX = 3" :class="selected(character.modX, 3)">专精 Ⅲ</div>
          </td>
          <td v-show="character.phase > 1">
            <div @click="character.skill3 = 0" :class="selected(character.skill3, 0)">未专精</div>
            <div @click="character.skill3 = 1" :class="selected(character.skill3, 1)">专精 Ⅰ</div>
            <div @click="character.skill3 = 2" :class="selected(character.skill3, 2)">专精 Ⅱ</div>
            <div @click="character.skill3 = 3" :class="selected(character.skill3, 3)">专精 Ⅲ</div>
          </td>
        </tr>
      </tbody>
    </table>
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
  return "image_avatar bg-" + charId;
}

onMounted(() => {
  initData();
});
</script>
