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
        <!-- <a href="/survey/list"> <div class="btn_survey">查看榜单</div></a> -->
        <div class="btn_survey">展开筛选栏</div>
        <div class="btn_survey"><characterDemo></characterDemo></div>
      </div>

      <div class="setup_bar">
        <div class="setup_title">职业</div>
        <div class="btn_survey" v-for="profession in professionDict" @click="addSortRule('profession', profession.value)">
          {{ profession.label }}
        </div>
      </div>
      <div class="setup_bar">
        <div class="setup_title">稀有度</div>
        <div class="btn_survey" v-for="rarity in rarityDict" @click="addSortRule('rarity', rarity)">
          {{ rarity + "⭐" }}
        </div>
      </div>
      <div class="setup_bar">
        <div class="setup_title">年份</div>
        <div class="btn_survey" v-for="(year, key) in yearDict" :key="key" @click="addSortRule('year', key)">
          {{ year.label }}
        </div>
      </div>
      <div class="setup_bar">
        <div class="setup_title">其他</div>
        <div class="btn_survey" @click="addSortRule('own_own')">未填写拥有</div>
        <div class="btn_survey" @click="addSortRule('own_mod')">是否有模组</div>
      </div>

      <div class="setup_bar">
        <div class="setup_title">排序</div>
        <div class="btn_survey" @click="sortCharacterList('rarity')">按稀有度顺序</div>
        <div class="btn_survey" @click="sortCharacterList('date')">按实装顺序</div>
        <div>{{ filterRules }}</div>
      </div>
    </div>
    <div class="fill_course_page"></div>
    <div class="char_forms">
      <div class="from_card" v-for="(char, index) in characterList" :key="index" v-show="char.show">
        <div class="card_option" :style="tableSytle('short')">
          <div @click="char.own = !char.own" :class="getSprite(char.charId)"></div>
        </div>

        <div class="card_option" style="width: 66px">
          <div class="dropDown" @click="dropDown('potential' + index)">
            <div :class="getSprite('potential' + char.potential, 'potential')"></div>
          </div>
          <div class="dropDown_menu">
            <div class="dropDown_content" :id="'potential' + index" @click="dropUp('potential' + index)">
              <div v-for="rank in ranks.slice(1, 7)" @click="char.potential = rank" class="dropDown_content_item">潜能{{ rank }}</div>
            </div>
          </div>
          <div class="ownAndPotential_wrap">
            <c-switch v-model="char.own" class="card_option_switch"></c-switch>
          </div>
        </div>

        <div class="card_option" style="width: 66px">
          <div class="card_option_title">精英化</div>
          <div class="card_option_image" @click="changeData(index, 'phase')">
            <div :class="getSprite('phase' + char.phase, 'phase')"></div>
          </div>
        </div>

        <div class="card_option" style="width: 66px" v-for="(skill, rank) in char.skill" :key="rank">
          <div class="card_option_image_noshadow">
            <div :class="getSprite(skill.iconId, 'icon')"></div>
          </div>
          <div class="card_option_image" @click="changeData(index, 'skill1')">
            <div :class="getSprite('skill' + char['skill' + (rank + 1)], 'skill')"></div>
          </div>
        </div>
        <div class="card_option" style="width: 66px" v-show="char.skill.length < 3"></div>
        <div class="card_option" style="width: 66px" v-show="char.skill.length < 2"></div>
        <div class="card_option" style="width: 66px" v-show="char.skill.length < 1"></div>

        <div class="card_option" style="width: 66px">
          <div class="card_option_title">{{ "模组X" }}</div>
          <div class="card_option_image" @click="changeData(index, 'modX')" v-show="char.modX > -1">
            <div :class="getSprite('mod' + char.modX, 'mod')"></div>
          </div>
        </div>

        <div class="card_option" style="width: 66px">
          <div class="card_option_title">{{ "模组Y" }}</div>
          <div class="card_option_image" @click="changeData(index, 'modY')" v-show="char.modY > -1">
            <div :class="getSprite('mod' + char.modY, 'mod')"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import "@/assets/css/sprite_char_6_part1.css";
import "@/assets/css/sprite_char_5_part1.css";
import "@/assets/css/sprite_char_5_part2.css";
import "@/assets/css/sprite_char_4_part1.css";
import "@/assets/css/sprite_rank.css";
import "@/assets/css/survey_character.css";
import "@/assets/css/sprite_skill.css";
import { cMessage } from "@/element/message.js";
import { registerEvent, loginEvent, userDataCacheEvent, userDataCacheClearEvent, globalUserData } from "./serveyService";
import { characterListInit, professionDict, rarityDict, yearDict } from "./baseData";
import characterDemo from "@/pages/survey/characterDemo.vue";

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

//登出
function logout() {
  userData.value = userDataCacheClearEvent();
}

//找回填写过的角色信息
function getSurveyCharData() {
  surveyApi.getSurveyCharData(userData.value.userName).then((response) => {
    let list = response.data;
    for (var i = 0; i < characterList.value.length; i++) {
      // characterList.value[i].own =false;
      for (var j = 0; j < list.length; j++) {
        if (list[j].charId == characterList.value[i].charId) {
          characterList.value[i].phase = list[j].phase;
          (characterList.value[i].level = list[j]), level;
          (characterList.value[i].potential = list[j]), potential;
          (characterList.value[i].skill1 = list[j]), skill1;
          (characterList.value[i].skill2 = list[j]), skill2;
          (characterList.value[i].skill3 = list[j]), skill3;
          (characterList.value[i].modX = list[j]), modX;
          (characterList.value[i].modY = list[j]), modY;
          (characterList.value[i].own = list[j]), own;
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
  if ("phase" == attrib) {
    characterList.value[index][attrib]++;
    if (characterList.value[index][attrib] > 2) {
      characterList.value[index][attrib] = 0;
      return;
    }
    return;
  }

  characterList.value[index][attrib]++;
  if (characterList.value[index][attrib] > 3) {
    characterList.value[index][attrib] = 0;
    return;
  }
  return;
}

//上传
function upload() {
  surveyApi.uploadCharacter(characterList.value, userData.value.userName).then((response) => {
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

//打开选择框
function dropDown(id) {
  document.getElementById(id).style.display = "flex";
}

//关闭选择框
function dropUp(id) {
  document.getElementById(id).style.display = "none";
}

function getSprite(id, type) {
  if ("mod" == type) return "bg-" + id + " sprite_mod";
  if ("skill" == type) return "bg-" + id + " sprite_skill";
  if ("phase" == type) return "bg-" + id + " sprite_phase";
  if ("potential" == type) return "bg-" + id + " sprite_potential";
  if ("own" == type) return "bg-" + id + " sprite_avatar_own";
  if ("icon" == type) return "bg-skill_icon_" + id + " sprite_skill_icon";
  return "bg-" + id + " sprite_avatar";
}

let filterRules = ref({ rarity: [], profession: [], year: [] });

function addSortRule(attribute, rule) {
  let filterRulesCopy = [];
  if (filterRules.value[attribute].indexOf(rule) > -1) {
    for (let i in filterRules.value[attribute]) {
      if (rule != filterRules.value[attribute][i]) {
        filterRulesCopy.push(filterRules.value[attribute][i]);
      }
    }
    filterRules.value[attribute] = filterRulesCopy;
    filterCharacterList();
    return;
  }

  filterRules.value[attribute].push(rule);
  filterCharacterList();
}

function filterCharacterList() {
  for (let i in characterList.value) {
    var character = characterList.value[i];
    let isRarity = isAttribute(character, "rarity");
    let isProfession = isAttribute(character, "profession");
    let isYearFlag = isYear(character);
    console.log(isRarity, isProfession);
    characterList.value[i].show = isRarity & isProfession & isYearFlag;
  }
}

function isAttribute(character, attribute) {
  if (filterRules.value[attribute].length == 0) return true;
  for (let r in filterRules.value[attribute]) {
    if (character[attribute] == filterRules.value[attribute][r]) {
      return true;
    }
  }
  return false;
}

function isYear(character) {
  if (filterRules.value.year.length == 0) return true;
  for (let r in filterRules.value.year) {
    // console.log(filterRules.value.year[r])
    let year = yearDict[filterRules.value.year[r]];
    // console.log(character.date, ">=", year.start, character.date, "<=", year.end);
    if (character.date >= year.start && character.date <= year.end) {
      return true;
    }
  }
  return false;
}

function sortCharacterList(rule) {
  characterList.value.sort((a, b) => {
    return b[rule] - a[rule];
  });
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
  getSurveyCharData();
});
</script>
