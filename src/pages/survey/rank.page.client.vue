<template>
  <div class="survey_rank_page">
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

    <div class="setup_wrap" id="setbar">
      <div class="setup_bar">
        <div :class="btnSetClass(filterCollapse)" @click="setBarCollapse()">筛选</div>
      </div>
      <div class="setup_bar">
        <div class="setup_title">稀有度</div>
        <div :class="selectedBtn('rarity', rarity)" v-for="rarity in rarityDict" @click="addFilterRule('rarity', rarity)">{{ rarity }}★</div>
      </div>
      <div class="setup_bar">
        <div class="setup_title">其他</div>
        <div :class="selectedBtn('mod', true)" id="other3" @click="addFilterRule('mod', true)">有模组</div>
        <div :class="selectedBtn('mod', false)" id="other4" @click="addFilterRule('mod', false)">无模组</div>
      </div>
      <div class="setup_bar">
        <div class="setup_title">排序</div>
        <div class="switch_set" @click="sortCharacterList('rarity')">稀有度顺序</div>
        <div class="switch_set" @click="sortCharacterList('date')">实装顺序</div>
      </div>
    </div>

    <div class="rank_wrap">
      <div class="rank_card" v-for="(result, index) in rankingList" v-show="result.show">
        <div class="rank_avatar_wrap">
          <div :class="getSprite(result.charId)"></div>
        </div>
        <div class="survey_result">
          <div class="survey_result_titit">持有率</div>
          <div class="survey_result_content">{{ getPercentage(result.own, 1) }}</div>
        </div>
        <div class="survey_result">
          <div class="survey_result_titit">
            <div class="rank_image_elite_wrap"><div :class="getSprite('elite2', 'elite')"></div></div>
          </div>
          <div class="survey_result_content">{{ getPercentage(getSurveyResult(result.elite, "rank" + 2), 1) }}</div>
        </div>
        <div class="survey_result">
          <div class="survey_result_titit"><div :class="getSpriteIcon(result.skill, 0)"></div></div>
          <div class="survey_result_content">{{ getPercentage(getSurveyResult(result.skill1, "rank" + 3), 1) }}</div>
        </div>
        <div class="survey_result">
          <div class="survey_result_titit"><div :class="getSpriteIcon(result.skill, 1)"></div></div>
          <div class="survey_result_content">{{ getPercentage(getSurveyResult(result.skill2, "rank" + 3), 1) }}</div>
        </div>
        <div class="survey_result">
          <div class="survey_result_titit"><div :class="getSpriteIcon(result.skill, 2)"></div></div>
          <div class="survey_result_content">{{ getPercentage(getSurveyResult(result.skill3, "rank" + 3), 1) }}</div>
        </div>
        <div class="survey_result">
          <div class="survey_result_titit">X模组</div>
          <div class="survey_result_content">{{ getPercentage(getSurveyResult(result.modX, "rank" + 3), 1) }}</div>
        </div>
        <div class="survey_result">
          <div class="survey_result_titit">Y模组</div>
          <div class="survey_result_content">{{ getPercentage(getSurveyResult(result.modY, "rank" + 3), 1) }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import "@/assets/css/survey_rank.css";

import { rankingListinit } from "./common";
import { onMounted, ref, watch } from "vue";

import surveyApi from "@/api/survey";

let rarityDict = [1, 2, 3, 4, 5, 6];

let rankingList = ref(rankingListinit());
let surveyType = ref("练度");

let userCount = ref(0);
let updateTime = ref("2023-05-01");

function getCharStatisticsResult() {
  surveyApi.getCharStatisticsResult().then((response) => {
    for (let i in rankingList.value) {
      for (let j in response.data.result) {
        if (rankingList.value[i].charId == response.data.result[j].charId) {
          rankingList.value[i].own = response.data.result[j].own;
          rankingList.value[i].elite = response.data.result[j].elite;
          rankingList.value[i].skill1 = response.data.result[j].skill1;
          rankingList.value[i].skill2 = response.data.result[j].skill2;
          rankingList.value[i].skill3 = response.data.result[j].skill3;
          rankingList.value[i].modX = response.data.result[j].modX;
          rankingList.value[i].modY = response.data.result[j].modY;
        }
      }
    }
    console.log(rankingList.value);
    // rankingList.value = response.data.result;
    userCount.value = response.data.userCount;
    updateTime.value = response.data.updateTime;
  });
}

onMounted(() => {
  getCharStatisticsResult();
});

function getSprite(id, type) {
  if ("elite" == type) return "bg-" + id + " rank_sprite_elite";
  return "bg-" + id + " rank_avatar";
}

function getPercentage(value, digit) {
  if (value < 0) return "";
  return (value * 100).toFixed(digit) + "%";
}

function getSurveyResult(obj, rank) {
  if (obj[rank] == undefined) return -1;
  return obj[rank];
}

function getSpriteIcon(skill, index) {
  if (skill.length < index + 1) return "";
  var iconId = skill[index].iconId;
  // console.log(iconId);
  return "bg-skill_icon_" + iconId + " rank_sprite_skill";
}

let filterRules = ref({ rarity: [], profession: [], year: [], own: [], mod: [] });
let filterCollapse = ref(false);

function setBarCollapse() {
  filterCollapse.value = !filterCollapse.value;
  if (filterCollapse.value) {
    let elements = document.getElementsByClassName("setup_bar");
    let height = 5;
    for (let e of elements) {
      height += e.offsetHeight + 10;
    }
    document.getElementById("setbar").style.height = height + "px";
    setTimeout(() => {
      document.getElementById("setbar").style.height = "auto";
    }, 500);
  } else {
    let elements = document.getElementsByClassName("setup_bar");
    let height = 5;
    for (let e of elements) {
      height += e.offsetHeight + 10;
    }
    document.getElementById("setbar").style.height = height + "px";
    setTimeout(() => {
      document.getElementById("setbar").style.height = 54 + "px";
    }, 100);
  }
}

//判断按钮是否选择赋予样式
function selectedBtn(attribute, rule) {
  if (filterRules.value[attribute].indexOf(rule) > -1) {
    return "switch_set selected_color";
  }
  return "switch_set";
}

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
    filterRankingList();
    return;
  }
  filterRules.value[attribute].push(rule);
  filterRankingList();
}

//筛选rankingList
function filterRankingList() {
  for (let i in rankingList.value) {
    var character = rankingList.value[i];
    let isRarity = isAttribute(character, "rarity");
    let isProfession = isAttribute(character, "profession");
    let isOwn = isAttribute(character, "own");
    let isMod = isAttribute(character, "mod");
    let isYearFlag = isYear(character);
    rankingList.value[i].show = isRarity & isProfession & isYearFlag & isOwn & isMod;
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
    // console.log(filterRules.value.year[r])
    let year = yearDict[filterRules.value.year[r]];
    // console.log(character.date, ">=", year.start, character.date, "<=", year.end);
    if (character.date >= year.start && character.date <= year.end) {
      return true;
    }
  }
  return false;
}

//按条件排序
function sortCharacterList(rule) {
  characterList.value.sort((a, b) => {
    return b[rule] - a[rule];
  });
}

function btnSetClass(flag) {
  if (flag) return "btn_set btn_setup_selected";
  return "btn_set";
}
</script>
