<template>
  <div class="survey_rank_page">
    <!-- 常驻条 -->
    <div class="setup_top">
      <button class="mdui-btn survey_button">说明</button>
      <button class="mdui-btn survey_button" @click="collapse('switch_bar select', 'element_filter_wrap')">筛选</button>
      <div id="updateTime">
        调查人数5000<br />
        更新时间2023-05-27
      </div>
    </div>

    <!-- 筛选模块 -->
    <div class="switch_wrap" id="element_filter_wrap">
      <div class="switch_bar select">
        <div class="switch_title">职业</div>
        <div class="switch_btns_wrap">
          <div
            :class="selectedBtn('profession', profession.value)"
            v-for="profession in professionDict"
            @click="addFilterCondition('profession', profession.value)"
          >
            {{ profession.label }}
          </div>
        </div>
      </div>

      <div class="switch_bar select">
        <div class="switch_title">稀有度</div>
        <div class="switch_btns_wrap">
          <div :class="selectedBtn('rarity', rarity)" v-for="rarity in rarityDict" @click="addFilterCondition('rarity', rarity)">{{ rarity }}★</div>
        </div>
      </div>

      <div class="switch_bar select">
        <div class="switch_title">其他</div>
        <div class="switch_btns_wrap">
          <!-- <div :class="selectedBtn('own', true)" @click="addFilterCondition('own', true)">已拥有</div> -->
          <!-- <div :class="selectedBtn('own', false)" @click="addFilterCondition('own', false)">未拥有</div> -->
          <div :class="selectedBtn('mod', true)" @click="addFilterCondition('mod', true)">模组已实装</div>
          <div :class="selectedBtn('mod', false)" @click="addFilterCondition('mod', false)">模组未实装</div>
          <div :class="selectedBtn('itemObtainApproach', 0)" @click="addFilterCondition('itemObtainApproach', 0)">赠送干员</div>
          <div :class="selectedBtn('itemObtainApproach', 1)">限定干员</div>
        </div>
      </div>

      <!-- <div class="switch_bar select">
        <div class="switch_title">排序</div>
        <div class="switch_btns_wrap">
          <div class="btn_switch" @click="sortCharacterList('profession')">按职业</div>
          <div class="btn_switch" @click="sortCharacterList('rarity')">按稀有度</div>
          <div class="btn_switch" @click="sortCharacterList('date')">按实装顺序</div>
        </div>
      </div> -->
    </div>

    <div id="rank_table mdui-table-fluid">
      <table class="mdui-table">
        <thead>
          <tr>
            <td class="rank_table_1">代号</td>
            <td class="rank_table_2">持有率</td>
            <td class="rank_table_3">精二率</td>
            <td class="rank_table_4">一技能专三率</td>
            <td class="rank_table_5">二技能专三率</td>
            <td class="rank_table_6">三技能专三率</td>
            <td class="rank_table_7">x模组解锁率</td>
            <td class="rank_table_8">y模组解锁率</td>
          </tr>
        </thead>
        <tr v-for="(result, index) in rankingList" v-show="result.show" class="rank_table_tr">
          <td class="rank_table_1 rank_table_text">
            <div class="rank_table_avatar">
              <div class="rank_avatar_wrap"><div :class="getSprite(result.charId)"></div></div>
              <div class="rank_character_name">{{ result.name }}</div>
            </div>
          </td>
          <td class="rank_table_2 rank_table_text">{{ getPercentage(result.own, 1) }}</td>
          <td class="rank_table_3 rank_table_text">{{ getPercentage(result.elite2, 1) }}</td>
          <td class="rank_table_4 rank_table_text">
            <div class="rank_table_skill">
              <div class="rank_image_skill_wrap"><div :class="getSpriteIcon(result.skill, 0)"></div></div>
              <div class="rank_table_skill_text">
                <div class="rank_ratio">{{ getSkillName(result.skill, 0) }}</div>
                <div class="rank_ratio">{{ getPercentage(getSurveyResult(result.skill1, "rank3"), 1) }}</div>
              </div>
            </div>
          </td>
          <td class="rank_table_5 rank_table_text">
            <div class="rank_table_skill">
              <div class="rank_image_skill_wrap"><div :class="getSpriteIcon(result.skill, 1)"></div></div>
              <div class="rank_table_skill_text">
                <div class="rank_ratio"> {{ getSkillName(result.skill, 1) }}</div>
                <div class="rank_ratio">{{ getPercentage(getSurveyResult(result.skill2, "rank3"), 1) }}</div>
              </div>
            </div>
          </td>
          <td class="rank_table_6 rank_table_text">
            <div class="rank_table_skill">
              <div class="rank_image_skill_wrap"><div :class="getSpriteIcon(result.skill, 2)"></div></div>
              <div class="rank_table_skill_text">
                <div class="rank_ratio"> {{ getSkillName(result.skill, 2) }}</div>
                <div class="rank_ratio">{{ getPercentage(getSurveyResult(result.skill3, "rank" + 3), 1) }}</div>
              </div>
            </div>
          </td>
          <td class="rank_table_7">{{ getPercentage(getSurveyResult(result.modX, "rank" + 3), 1) }}</td>
          <td class="rank_table_8">{{ getPercentage(getSurveyResult(result.modY, "rank" + 3), 1) }}</td>
        </tr>
      </table>
    </div>
  </div>
</template>

<script setup>
import "@/assets/css/survey_rank.css";
import { rankingListInit, collapse, filterByCharacterProperty, professionDict } from "./common";
import { onMounted, ref, watch } from "vue";

import surveyApi from "@/api/survey";

let rarityDict = [1, 2, 3, 4, 5, 6];

let rankingList = ref(rankingListInit());
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
  // getCharStatisticsResult();
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
  if (obj[rank] == void 0) return -1;
  return obj[rank];
}

function getSpriteIcon(skill, index) {
  if (skill.length < index + 1) return "";
  var iconId = skill[index].iconId;
  // console.log(iconId);
  return "bg-skill_icon_" + iconId + " rank_sprite_skill";
}

function getSkillName(skill, index) {
  if (skill.length < index + 1) return "";
  return skill[index].name;
  // console.log(iconId);
}

//判断按钮是否选择赋予样式
function selectedBtn(attribute, rule) {
  if (filterCondition.value[attribute].indexOf(rule) > -1) {
    return "btn_switch selected_color";
  }
  return "btn_switch";
}

let filterCondition = ref({ rarity: [], profession: [], year: [], own: [], mod: [], itemObtainApproach: [], TODO: [] });

//增加筛选规则
function addFilterCondition(attribute, condition) {
  console.log(filterCondition.value);
  let filterRulesCopy = [];
  if (filterCondition.value[attribute].indexOf(condition) > -1) {
    for (let i in filterCondition.value[attribute]) {
      if (condition !== filterCondition.value[attribute][i]) {
        filterRulesCopy.push(filterCondition.value[attribute][i]);
      }
    }
    filterCondition.value[attribute] = filterRulesCopy;
    filterCharacterList();
    return;
  }

  filterCondition.value[attribute].push(condition);
  filterCharacterList();
}

//筛选
function filterCharacterList() {
  for (let i in rankingList.value) {
    const character = rankingList.value[i];
    rankingList.value[i].show = filterByCharacterProperty(filterCondition.value, character);
  }
}

//按条件排序
function sortCharacterList(rule) {
  rankingList.value.sort((a, b) => {
    return b[rule] - a[rule];
  });
}

function btnSetClass(flag) {
  if (flag) return "btn_set btn_setup_selected";
  return "btn_set";
}
</script>
