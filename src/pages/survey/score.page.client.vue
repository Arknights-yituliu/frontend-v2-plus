<template>
  <div class="score_page">
    <!-- 设置区 -->
    <div class="switch_wrap" style="height: auto">
      <!-- <div class="setup_bar">
        <div :class="btnSetClass(filterCollapse)" @click="setBarCollapse()">干员筛选</div>
        <div class="btn_setup" @click="uploadScoreForm()">上传数据</div>
      </div> -->
      <!-- 评分项选择 -->
      <div class="setup_bar" id="score_selector_dimension">
        <div class="switch_title">选择评分项</div>
        <div class="switch_btns_wrap">
          <div class="mdui-btn" :class="selectedScoreItem(key)" v-for="(item, key) in scoreItem" :key="key" @click="selectScoreItem(key)">
            {{ item.label }}
          </div>
        </div>
      </div>

      <div class="setup_bar" id="score_selector_class">
        <div class="switch_title">职业</div>
        <div class="switch_btns_wrap">
          <div :class="selectedBtn('profession', profession.value)" v-for="profession in professionDict" @click="addFilterRule('profession', profession.value)">
            {{ profession.label }}
          </div>
        </div>
      </div>

      <div class="setup_bar" id="score_selector_rarity">
        <div class="switch_title">稀有度</div>
        <div class="switch_btns_wrap">
          <div :class="selectedBtn('rarity', rarity)" v-for="rarity in rarityDict" @click="addFilterRule('rarity', rarity)">{{ rarity }} ★</div>
        </div>
      </div>

      <div class="setup_bar" id="score_selector_years">
        <div class="switch_title">年份</div>
        <div class="switch_btns_wrap">
          <div :class="selectedBtn('year', key)" v-for="(year, key) in yearDict" :key="key" @click="addFilterRule('year', key)">
            {{ year.label }}
          </div>
        </div>
      </div>

      <div class="setup_bar" id="score_selector_sort">
        <div class="switch_title">排序</div>
        <div class="switch_btns_wrap">
          <div class="btn_switch" @click="sortCharacterList('rarity')">稀有度顺序</div>
          <div class="btn_switch" @click="sortCharacterList('date')">实装顺序</div>
        </div>
      </div>
    </div>

    <!-- 评分卡片 -->
    <div class="score_wrap">
      <div v-for="(char, char_index) in scoreList.slice(0)" :key="char_index" class="score_card" v-show="char.show">
        <!-- 标题区域 -->

        <div class="score_left_wrap">
          <div class="score_portrait_wrap">
            <div :class="getBgSprite('bg-tl', char.rarity)"></div>
            <div :class="getBgSprite('profession', char.profession)"></div>
            <div :class="getBgSprite('rarity', char.rarity)"></div>
            <div :class="getBgSprite('bg', char.rarity)"></div>
            <div :class="getSprite(char.charId)"></div>
            <div :class="getBgSprite('light', char.rarity)"></div>
            <div :class="getBgSprite('mask', char.rarity)"></div>
            <div class="score_portrait_bg_bl"></div>
            <div class="score_char_name">{{ char.name }}</div>
          </div>
        </div>

        <!-- 打分区域 -->
        <div class="score_right_wrap">
          <div class="score_bar" v-show="scoreItem.daily.show">
            <div class="score_name" @click="resetScore(char_index, 'daily')">日常：</div>
            <!-- 日常 -->
            <img class="image_score" :src="scoreSelected(rank, char.daily)" alt="" v-for="rank in scoreDict" @click="updateScore(char_index, 'daily', rank)" />
          </div>
          <div class="score_bar" v-show="scoreItem.rogue.show">
            <div class="score_name" @click="resetScore(char_index, 'rogue')">肉鸽：</div>
            <!-- 肉鸽 -->
            <img class="image_score" :src="scoreSelected(rank, char.rogue)" alt="" v-for="rank in scoreDict" @click="updateScore(char_index, 'rogue', rank)" />
          </div>
          <div class="score_bar" v-show="scoreItem.hard.show">
            <div class="score_name" @click="resetScore(char_index, 'hard')">高难：</div>
            <!-- 高难 -->
            <img class="image_score" :src="scoreSelected(rank, char.hard)" alt="" v-for="rank in scoreDict" @click="updateScore(char_index, 'hard', rank)" />
          </div>
          <div class="score_bar" v-show="scoreItem.securityService.show">
            <div class="score_name" @click="resetScore(char_index, 'securityService')">保全：</div>
            <!-- 保全 -->
            <img
              class="image_score"
              :src="scoreSelected(rank, char.securityService)"
              alt=""
              v-for="rank in scoreDict"
              @click="updateScore(char_index, 'securityService', rank)"
            />
          </div>
          <div class="score_bar" v-show="scoreItem.universal.show">
            <div class="score_name" @click="resetScore(char_index, 'universal')">泛用：</div>
            <!-- 泛用 -->
            <img
              class="image_score"
              :src="scoreSelected(rank, char.universal)"
              alt=""
              v-for="rank in scoreDict"
              @click="updateScore(char_index, 'universal', rank)"
            />
          </div>
          <div class="score_bar" v-show="scoreItem.counter.show">
            <div class="score_name" @click="resetScore(char_index, 'counter')">对策：</div>
            <!-- 对策 -->
            <img
              class="image_score"
              :src="scoreSelected(rank, char.counter)"
              alt=""
              v-for="rank in scoreDict"
              @click="updateScore(char_index, 'counter', rank)"
            />
          </div>

          <div class="score_bar" v-show="scoreItem.building.show">
            <div class="score_name" @click="resetScore(char_index, 'building')">基建：</div>
            <!-- 基建 -->
            <img
              class="image_score"
              :src="scoreSelected(rank, char.building)"
              alt=""
              v-for="rank in scoreDict"
              @click="updateScore(char_index, 'building', rank)"
            />
          </div>

          <div class="score_bar" v-show="scoreItem.comprehensive.show">
            <div class="score_name" @click="resetScore(char_index, 'comprehensive')">综合：</div>
            <!-- 综合 -->
            <img
              class="image_score"
              :src="scoreSelected(rank, char.comprehensive)"
              alt=""
              v-for="rank in scoreDict"
              @click="updateScore(char_index, 'comprehensive', rank)"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { h, onMounted, ref } from "vue";
import { scoreListInit, professionDict, yearDict } from "./commonUtils";
import surveyApi from "@/api/survey";
import { globalUserData } from "./userService";
import "@/assets/css/survey_score.css";
import { cMessage } from "@/element/message.js";


let rarityDict = [1, 2, 3, 4, 5, 6];

function uploadScoreForm() {
  surveyApi.uploadScore(scoreList.value, globalUserData.value.token).then((response) => {
    cMessage("新增了 " + response.data.insertRows + " 条");
    cMessage("更新了 " + response.data.updateRows + " 条");
  });
}

let scoreList = ref(scoreListInit());
let scoreDict = ref([1, 2, 3, 4, 5]);

function updateScore(char_index, attribute, score) {
  scoreList.value[char_index][attribute] = score;
}

function resetScore(char_index, attribute) {
  scoreList.value[char_index][attribute] = -1;
}

function scoreSelected(rank, score) {
  if (rank <= score) return "/image/rank2/rarity_fill.png";
  return "/image/rank2/rarity.png";
}

const scoreItem = ref({
  daily: { show: true, label: "日常" },
  rogue: { show: true, label: "肉鸽" },
  hard: { show: true, label: "高难" },
  securityService: { show: true, label: "保全" },
  universal: { show: true, label: "泛用" },
  counter: { show: true, label: "对策" },
  building: { show: true, label: "基建" },
  comprehensive: { show: true, label: "综合" },
});

function selectScoreItem(attribute) {
  scoreItem.value[attribute].show = !scoreItem.value[attribute].show;
  console.log(scoreItem.value[attribute].show);
}

function selectedScoreItem(attribute) {
  if (scoreItem.value[attribute].show) {
    return "btn_switch selected_color";
  }
  return "btn_switch";
}

//判断按钮是否选择赋予样式
function selectedBtn(attribute, rule) {
  if (filterRules.value[attribute].indexOf(rule) > -1) {
    return "btn_switch selected_color";
  }
  return "btn_switch";
}

let filterRules = ref({ rarity: [], profession: [], year: [], own: [], mod: [] });
let filterCollapse = ref(false);

function setBarCollapse() {
  filterCollapse.value = !filterCollapse.value;
  if (filterCollapse.value) {
    let elements = document.getElementsByClassName("switch_bar");
    let height = 0;
    for (let e of elements) {
      height += e.offsetHeight;
    }
    document.getElementById("filter").style.height = height + "px";
    setTimeout(() => {
      document.getElementById("filter").style.height = "auto";
    }, 500);
  } else {
    let elements = document.getElementsByClassName("switch_bar");
    let height = 0;
    for (let e of elements) {
      height += e.offsetHeight;
    }
    document.getElementById("filter").style.height = height + "px";

    setTimeout(() => {
      document.getElementById("filter").style.height = 0 + "px";
    }, 100);
  }
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
    filterCard();
    return;
  }
  filterRules.value[attribute].push(rule);
  filterCard();
}

function filterByScore(char) {}

//筛选
function filterCard() {
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
  return "bg-" + id + "_1 score_portrait";
}

function getBgSprite(type, name) {
  if (type == "bg-tl") return "bg-portrait_bg_tl_" + name + " score_portrait_bg_tl";
  if (type == "profession") return "bg-" + name + " score_portrait_profession";
  if (type == "rarity") return "bg-rarity_" + name + " score_portrait_rarity";
  if (type == "bg") return "bg-portrait_bg_" + name + " score_portrait_bg";
  if (type == "light") return "bg-light_" + name + " score_portrait_right";
  if (type == "mask") return "bg-mask" + " score_portrait_mask";
}

function btnSetClass(flag) {
  if (flag) return "btn_setup btn_setup_selecteded";
  return "btn_setup";
}

onMounted(() => {
  addFilterRule("rarity", 6);
});
</script>

<style scoped></style>
