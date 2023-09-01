<template>
  <div class="score_page">

    <!-- 设置区域 -->
    <div class="setup_wrap">
      <div class="control_panel">
        <!-- <div class="switch_title">设置</div> -->

        <div class="btn_setup" @click="collapse('switch_bar filter', 'switch_filter_wrap','switch_filter_box')">
          筛选/批量操作
          <div class="btn_setup_tips">可筛选后批量进行填写</div>
        </div>

<!--        <div class="btn_setup" @click="collapse('switch_bar upload', 'switch_upload_wrap','switch_upload_box')">-->
<!--          数据导入/导出-->
<!--          <div class="btn_setup_tips">导入/导出json/Excel等</div>-->
<!--        </div>-->

        <div class="btn_setup" @click="toBiliblili()">
          开发信息
          <div class="btn_setup_tips">反馈、建议<br/></div>
        </div>
      </div>
    </div>

    <!-- 设置区 -->
    <div class="switch_wrap" id="switch_filter_wrap">
      <div class="switch_box" id="switch_filter_box">
      <div class="switch_bar filter" id="score_selector_dimension">
        <div class="switch_title">选择评分项</div>
        <div class="switch_btns_wrap">
          <div :class="selectedScoreItem(key)" v-for="(item, key) in scoreItem" :key="key" @click="selectScoreItem(key)">
            {{ item.label }}
          </div>
        </div>
      </div>

      <div class="switch_bar filter" id="score_selector_class">
        <div class="switch_title">职业</div>
        <div class="switch_btns_wrap">
          <div :class="selectedBtn('profession', profession.value)" v-for="profession in professionDict" @click="addFilterCondition('profession', profession.value)">
            {{ profession.label }}
          </div>
        </div>
      </div>

      <div class="switch_bar filter" id="score_selector_rarity">
        <div class="switch_title">稀有度</div>
        <div class="switch_btns_wrap">
          <div :class="selectedBtn('rarity', rarity)" v-for="rarity in rarityDict" @click="addFilterCondition('rarity', rarity)">{{ rarity }} ★</div>
        </div>
      </div>

      <div class="switch_bar filter" id="score_selector_years">
        <div class="switch_title">年份</div>
        <div class="switch_btns_wrap">
          <div :class="selectedBtn('year', key)" v-for="(year, key) in yearDict" :key="key" @click="addFilterCondition('year', key)">
            {{ year.label }}
          </div>
        </div>
      </div>

      <div class="switch_bar filter" id="score_selector_sort">
        <div class="switch_title">排序</div>
        <div class="switch_btns_wrap">
          <div class="btn_switch" @click="sortCharacterList('rarity')">稀有度顺序</div>
          <div class="btn_switch" @click="sortCharacterList('date')">实装顺序</div>
        </div>
      </div>
      </div>
    </div>

    <!-- 评分卡片 -->
    <div class="score_wrap">
      <div v-for="(char, char_index) in scoreList.slice(0)" :key="char_index" class="score_card" v-show="char.show">
        <!-- 左侧区域 -->
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
          <div class="score_fastFill">
            请输入平均分 <input class="score_input_avg" v-model="avgScore" />
          </div>
        </div>


        <!-- 打分区域 -->
        <div class="score_right_wrap">
          <div class="score_bar" v-show="scoreItem.daily.show" :style="notScore(char.daily)">
            <div class="score_item" @click="resetScore(char_index, 'daily')">
              <div class="score_avg">(4.3)</div>
              日常：
            </div>
            <!-- 日常 -->
            <img class="image_score" :src="scoreSelected(rank, char.daily)" alt="" v-for="rank in scoreDict" @click="updateScore(char_index, 'daily', rank)" />
          </div>
          <div class="score_bar" v-show="scoreItem.rogue.show" :style="notScore(char.rogue)">
            <div class="score_item" @click="resetScore(char_index, 'rogue')">
              <div class="score_avg">(4.3)</div>
              肉鸽：</div>
            <!-- 肉鸽 -->
            <img class="image_score" :src="scoreSelected(rank, char.rogue)" alt="" v-for="rank in scoreDict" @click="updateScore(char_index, 'rogue', rank)" />
          </div>
          <div class="score_bar" v-show="scoreItem.hard.show" :style="notScore(char.hard)">
            <div class="score_item" @click="resetScore(char_index, 'hard')">
              <div class="score_avg">(4.3)</div>
              高难：</div>
            <!-- 高难 -->
            <img class="image_score" :src="scoreSelected(rank, char.hard)" alt="" v-for="rank in scoreDict" @click="updateScore(char_index, 'hard', rank)" />
          </div>
          <div class="score_bar" v-show="scoreItem.securityService.show" :style="notScore(char.securityService)">
            <div class="score_item" @click="resetScore(char_index, 'securityService')">
              <div class="score_avg">(4.3)</div>
              保全：</div>
            <!-- 保全 -->
            <img
              class="image_score"
              :src="scoreSelected(rank, char.securityService)"
              alt=""
              v-for="rank in scoreDict"
              @click="updateScore(char_index, 'securityService', rank)"
            />
          </div>
          <div class="score_bar" v-show="scoreItem.universal.show"  :style="notScore(char.universal)">
            <div class="score_item" @click="resetScore(char_index, 'universal')">
              <div class="score_avg">(4.3)</div>
              泛用：</div>
            <!-- 泛用 -->
            <img
              class="image_score"
              :src="scoreSelected(rank, char.universal)"
              alt=""
              v-for="rank in scoreDict"
              @click="updateScore(char_index, 'universal', rank)"
            />
          </div>
          <div class="score_bar" v-show="scoreItem.counter.show" :style="notScore(char.counter)">
            <div class="score_item" @click="resetScore(char_index, 'counter')">
              <div class="score_avg">(4.3)</div>
              对策：</div>
            <!-- 对策 -->
            <img
              class="image_score"
              :src="scoreSelected(rank, char.counter)"
              alt=""
              v-for="rank in scoreDict"
              @click="updateScore(char_index, 'counter', rank)"
            />
          </div>

          <div class="score_bar" v-show="scoreItem.building.show" :style="notScore(char.building)">
            <div class="score_item" @click="resetScore(char_index, 'building')">
              <div class="score_avg">(4.3)</div>
              基建：</div>
            <!-- 基建 -->
            <img
              class="image_score"
              :src="scoreSelected(rank, char.building)"
              alt=""
              v-for="rank in scoreDict"
              @click="updateScore(char_index, 'building', rank)"
            />
          </div>

          <div class="score_bar" v-show="scoreItem.comprehensive.show"  :style="notScore(char.comprehensive)">
            <div class="score_item" @click="resetScore(char_index, 'comprehensive')">
              <div class="score_avg">(4.3)</div>
              综合：</div>
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
import { scoreListInit, collapse, filterByCharacterProperty, professionDict, yearDict } from "./common";
import surveyApi from "@/api/survey";
import { globalUserData } from "./userService";
import "@/assets/css/survey_score.css";
import { cMessage } from "@/element/message.js";

let avgScore = ref(4)

let rarityDict = [1, 2, 3, 4, 5, 6];

function uploadScoreForm() {
  surveyApi.uploadScore(scoreList.value, globalUserData.value.token).then((response) => {
    cMessage("新增了 " + response.data.insertRows + " 条");
    cMessage("更新了 " + response.data.updateRows + " 条");
  });
}

function notScore(score){
    if(score<1){
      return 'opacity: 0.4;'
    }
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
  if (rank <= score) return "/image/survey/点赞.png";
  return "/image/survey/思考.png";
}

const scoreItem = ref({
  daily: { show: true, label: "日常" },
  rogue: { show: true, label: "肉鸽" },
  hard: { show: true, label: "高难" },
  securityService: { show: false, label: "保全" },
  universal: { show: false, label: "泛用" },
  counter: { show: false, label: "对策" },
  building: { show: false, label: "基建" },
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
  if (filterCondition.value[attribute].indexOf(rule) > -1) {
    return "btn_switch selected_color";
  }
  return "btn_switch";
}

let filterCondition = ref({rarity: [], profession: [], year: [], own: [], mod: [], itemObtainApproach: [], TODO: []});

/**
 *  增加筛选规则
 * @param property  干员属性
 * @param condition 筛选条件
 */

function addFilterCondition(property, condition) {
  console.log(filterCondition.value);
  let filterRulesCopy = [];

  if (filterCondition.value[property].indexOf(condition) > -1) {
    for (let i in filterCondition.value[property]) {
      if (condition !== filterCondition.value[property][i]) {
        filterRulesCopy.push(filterCondition.value[property][i]);
      }
    }
    filterCondition.value[property] = filterRulesCopy;
    filterCharacterList();
    return;
  }

  filterCondition.value[property].push(condition);
  filterCharacterList();
}


//筛选
function filterCharacterList() {
  for (let i in scoreList.value) {
    const character = scoreList.value[i];
    scoreList.value[i].show = filterByCharacterProperty(filterCondition.value, character);
  }
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
  if (type === "bg-tl") return "bg-portrait_bg_tl_" + name + " score_portrait_bg_tl";
  if (type === "profession") return "bg-" + name + " score_portrait_profession";
  if (type === "rarity") return "bg-rarity_" + name + " score_portrait_rarity";
  if (type === "bg") return "bg-portrait_bg_" + name + " score_portrait_bg";
  if (type === "light") return "bg-light_" + name + " score_portrait_right";
  if (type === "mask") return "bg-mask" + " score_portrait_mask";
}

function btnSetClass(flag) {
  if (flag) return "btn_setup btn_setup_selecteded";
  return "btn_setup";
}

onMounted(() => {
  addFilterCondition("rarity", 6);
});
</script>

<style scoped></style>
