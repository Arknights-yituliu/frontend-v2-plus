<template>
  <navBar></navBar>
  <div class="score_page">
    <div class="setup_wrap">
      <div class="setup_bar">
        <div class="setup_title">设置</div>
        <div class="btn_survey" @click="filterCollapse = !filterCollapse">{{ filterCollapse ? "展开" : "收起" }}筛选栏</div>
        <div class="btn_survey" @click="uploadScoreForm()">上传数据</div>
      </div>
      <div v-show="filterCollapse">
        <div class="setup_bar">
          <div class="setup_title">职业</div>
          <div :class="selectedBtn('profession', profession.value)" v-for="profession in professionDict" @click="addFilterRule('profession', profession.value)">
            {{ profession.label }}
          </div>
        </div>
        <div class="setup_bar">
          <div class="setup_title">稀有度</div>
          <div :class="selectedBtn('rarity', rarity)" v-for="rarity in rarityDict" @click="addFilterRule('rarity', rarity)">
            {{ rarity }} ★
          </div>
        </div>
        <div class="setup_bar">
          <div class="setup_title">年份</div>
          <div :class="selectedBtn('year', key)" v-for="(year, key) in yearDict" :key="key" @click="addFilterRule('year', key)">
            {{ year.label }}
          </div>
        </div>

        <div class="setup_bar">
          <div class="setup_title">排序</div>
          <div class="set_btn" @click="sortCharacterList('rarity')">稀有度顺序</div>
          <div class="set_btn" @click="sortCharacterList('date')">实装顺序</div>
        </div>
      </div>
    </div>

    <div class="score_wrap">
      <div v-for="(char, charId) in scoreList.slice(0)" :key="charId" class="char_card" v-show="char.show">
        <div>
          <div class="score_avatar_wrap">
            <div :class="getSprite(char.charId)"></div>
          </div>
          <div class="char_name">{{ char.name }}</div>
        </div>
        <div class="score_bar_wrap">
          <div class="score_bar">
            <div class="score_name">日常：</div>
            <img class="image_score" :src="scoreSelected(rank, char.daily)" alt="" v-for="rank in 10" @click="updateScore(charId, 'daily', rank)" />
          </div>
          <div class="score_bar">
            <div class="score_name">肉鸽：</div>
            <img class="image_score" :src="scoreSelected(rank, char.rogue)" alt="" v-for="rank in 10" @click="updateScore(charId, 'rogue', rank)" />
          </div>
          <div class="score_bar">
            <div class="score_name">高难：</div>
            <img class="image_score" :src="scoreSelected(rank, char.hard)" alt="" v-for="rank in 10" @click="updateScore(charId, 'hard', rank)" />
          </div>
          <div class="score_bar">
            <div class="score_name">保全：</div>
            <img
              class="image_score"
              :src="scoreSelected(rank, char.securityService)"
              alt=""
              v-for="rank in 10"
              @click="updateScore(charId, 'securityService', rank)"
            />
          </div>
          <div class="score_bar">
            <div class="score_name">泛用：</div>
            <img class="image_score" :src="scoreSelected(rank, char.universal)" alt="" v-for="rank in 10" @click="updateScore(charId, 'universal', rank)" />
          </div>
          <div class="score_bar">
            <div class="score_name">对策：</div>
            <img
              class="image_score"
              :src="scoreSelected(rank, char.countermeasures)"
              alt=""
              v-for="rank in 10"
              @click="updateScore(charId, 'countermeasures', rank)"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { scoreListInit, professionDict, rarityDict, yearDict } from "./baseData";
import surveyApi from "@/api/survey";
import { globalUserData } from "./userService";
import navBar from "@/pages/survey/navBar.vue";

import { cMessage } from "@/element/message.js";

function uploadScoreForm() {
  surveyApi.uploadScore(scoreList.value, globalUserData.value.userName).then((response) => {
    cMessage("新增了 " + response.data.insertRows + " 条");
    cMessage("更新了 " + response.data.updateRows + " 条");
  });
}

let scoreList = ref(scoreListInit());
function updateScore(charId, attribute, score) {
  scoreList.value[charId][attribute] = score;
}

function scoreSelected(rank, score) {
  if (rank <= score) return "/image/rank2/rarity_fill.png";
  return "/image/rank2/rarity.png";
}

//判断按钮是否选择赋予样式
function selectedBtn(attribute, rule, type) {
  if ("rarity" == type) {
    if (filterRules.value[attribute].indexOf(rule) > -1) {
      return "/image/rank2/rarity_fill.png";
    }
    return "/image/rank2/rarity.png";
  }
  if (filterRules.value[attribute].indexOf(rule) > -1) {
    return "set_btn selected_color";
  }
  return "set_btn";
}

let filterRules = ref({ rarity: [], profession: [], year: [], own: [], mod: [] });
let filterCollapse = ref(false);

//增加筛选规则
function addFilterRule(attribute, rule) {
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

//筛选
function filterCharacterList() {
  for (let i in scoreList.value) {
    var character = scoreList.value[i];
    let isRarity = isAttribute(character, "rarity");
    let isProfession = isAttribute(character, "profession");
    let isOwn = isAttribute(character, "own");
    let isMod = isAttribute(character, "mod");
    let isYearFlag = isYear(character);
    scoreList.value[i].show = isRarity & isProfession & isYearFlag & isOwn & isMod;
  }
}

//是否有这个属性
function isAttribute(character, attribute) {
  if (filterRules.value[attribute].length == 0) return true;
  for (let r in filterRules.value[attribute]) {
    if (character[attribute] == filterRules.value[attribute][r]) {
      return true;
    }
  }
  return false;
}

//是否在这个年份
function isYear(character) {
  if (filterRules.value.year.length == 0) return true;
  for (let r in filterRules.value.year) {
    let year = yearDict[filterRules.value.year[r]];
    if (character.date >= year.start && character.date <= year.end) {
      return true;
    }
  }
  return false;
}

//按条件排序
function sortCharacterList(rule) {
  scoreList.value.sort((a, b) => {
    return b[rule] - a[rule];
  });
}

function getSprite(id, type) {
  return "bg-" + id + " score_avatar";
}

onMounted(() => {
  addFilterRule("rarity", 6);
});
</script>

<style scoped></style>
