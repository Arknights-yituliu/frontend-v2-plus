<template>
  <div class="survey_rank_page">
    <!-- 常驻条 -->
    <div class="setup_top">
      <!-- <button class="mdui-btn survey_button">说明</button> -->
      <button class="btn btn_blue"
              @click="collapseV2('filter_box_wrap', 'filter_box')">筛选
      </button>
      <div id="updateTime">
        调查人数{{ user_count }}<br/>
        更新时间{{ update_time }}
      </div>
    </div>

    <!-- 筛选模块 -->
    <div class="collapse_item_wrap" id="filter_box_wrap">
      <div class="collapse_item" id="filter_box">
        <div class="collapse_bar_wrap">
          <div class="collapse_bar">
            <div class="switch_title">职业</div>
            <div class="switch_btn_wrap">
              <div
                  :class="selectedBtn('profession', profession.value)"
                  v-for="(profession,index) in professionDict"
                  :key="index"
                  @click="addFilterCondition('profession', profession.value)"
              >
                {{ profession.label }}
              </div>
            </div>
          </div>

          <div class="collapse_bar">
            <div class="switch_title">稀有度</div>
            <div class="switch_btn_wrap">
              <div :class="selectedBtn('rarity', rarity)"
                   v-for="(rarity,index) in rarity_dict" :key="index"
                   @click="addFilterCondition('rarity', rarity)">{{ rarity }}★
              </div>
            </div>
          </div>

          <div class="collapse_bar">
            <div class="switch_title">其他</div>
            <div class="switch_btn_wrap">
              <!-- <div :class="selectedBtn('own', true)" @click="addFilterCondition('own', true)">已拥有</div> -->
              <!-- <div :class="selectedBtn('own', false)" @click="addFilterCondition('own', false)">未拥有</div> -->
              <div :class="selectedBtn('mod', true)" @click="addFilterCondition('mod', true)">模组已实装</div>
              <div :class="selectedBtn('mod', false)" @click="addFilterCondition('mod', false)">模组未实装</div>
              <div :class="selectedBtn('itemObtainApproach', '赠送干员')"
                   @click="addFilterCondition('itemObtainApproach', '赠送干员')">
                赠送干员
              </div>
              <div :class="selectedBtn('itemObtainApproach', '限定干员')"
                   @click="addFilterCondition('itemObtainApproach', '限定干员')">限定干员
              </div>
            </div>
          </div>

          <!-- <div class="collapse_bar">
            <div class="switch_title">排序</div>
            <div class="switch_btn_wrap">
              <div class="btn_switch" @click="sortCharacterList('profession')">按职业</div>
              <div class="btn_switch" @click="sortCharacterList('rarity')">按稀有度</div>
              <div class="btn_switch" @click="sortCharacterList('date')">按实装顺序</div>
            </div>
          </div> -->
        </div>
      </div>
    </div>

    <!--    <div id="rank_table mdui-table-fluid">-->
    <!--      <table class="mdui-table">-->


    <div id="rank_table">
      <table class="rank_table">
        <tr>
          <td>
            <div class="rank_table_title" style="width: 220px">代号</div>
          </td>
          <td @click="sortRank('own')">
            <div class="rank_table_title" style="width: 80px">
              <div>持有率</div>
              <div>
                <div class="sort_asc_icon" :style="sortIconClass('own','asc')"></div>
                <div class="sort_desc_icon" :style="sortIconClass('own','desc')"></div>
              </div>
            </div>
          </td>
          <td @click="commonSort('elite','rank2')">
            <div class="rank_table_title" style="width: 80px">
              <div>精二率</div>
              <div>
                <div class="sort_asc_icon" :style="sortIconClass('elite','asc')"></div>
                <div class="sort_desc_icon" :style="sortIconClass('elite','desc')"></div>

              </div>
            </div>
          </td>
          <td @click="commonSort('skill1','rank3')">
            <div class="rank_table_title" style="width: 150px">
              <div>一技能专三率</div>
              <div>
                <div class="sort_asc_icon" :style="sortIconClass('skill1','asc')"></div>
                <div class="sort_desc_icon" :style="sortIconClass('skill1','desc')"></div>

              </div>
            </div>
          </td>
          <td @click="commonSort('skill2','rank3')">
            <div class="rank_table_title" style="width: 150px">
              <div>二技能专三率</div>
              <div>
                <div class="sort_asc_icon" :style="sortIconClass('skill2','asc')"></div>
                <div class="sort_desc_icon" :style="sortIconClass('skill2','desc')"></div>

              </div>
            </div>
          </td>
          <td @click="commonSort('skill3','rank3')">
            <div class="rank_table_title" style="width: 150px">
              <div>三技能专三率</div>
              <div>
                <div class="sort_asc_icon" :style="sortIconClass('skill3','asc')"></div>
                <div class="sort_desc_icon" :style="sortIconClass('skill3','desc')"></div>

              </div>
            </div>
          </td>
          <td @click="commonSort('modX','count')">
            <div class="rank_table_title" style="width: 150px">
              <div>X模组解锁率</div>
              <div>
                <div class="sort_asc_icon" :style="sortIconClass('modX','asc')"></div>
                <div class="sort_desc_icon" :style="sortIconClass('modX','desc')"></div>

              </div>
            </div>
          </td>
          <td @click="commonSort('modY','count')">
            <div class="rank_table_title" style="width: 150px">
              <div>Y模组解锁率</div>
              <div>
                <div class="sort_asc_icon" :style="sortIconClass('modY','asc')"></div>
                <div class="sort_desc_icon" :style="sortIconClass('modY','desc')"></div>
              </div>
            </div>
          </td>
        </tr>


        <tr v-for="(result, index) in operators_statistics_list" :key="index" v-show="result.show"
            class="rank_table_tr">
          <td class="rank_table_1 rank_table_text">
            <div class="rank_table_avatar">
              <div class="rank_avatar_wrap">
                <div :class="getSprite(result.charId)"></div>
              </div>
              <div class="rank_operator_name" :class="'rarity_'+result.rarity">{{ result.name }}</div>
            </div>
          </td>
          <td class="rank_table_2 rank_table_text">{{ getPercentage(result.own, 1) }}</td>
          <td class="rank_table_3 rank_table_text">{{ getPercentage(getSurveyResult(result.elite, 'rank2'), 1) }}</td>
          <td class="rank_table_4 rank_table_text">
            <div class="rank_table_skill">
              <div class="rank_image_skill_wrap">
                <div :class="getSpriteIcon(result.skill, 0)"></div>
              </div>
              <div class="rank_table_skill_text">
                <div class="rank_ratio">{{ getSkillName(result.skill, 0) }}</div>
                <div class="rank_ratio">{{ getPercentage(getSurveyResult(result.skill1, "rank3"), 1) }}</div>
              </div>
            </div>
          </td>
          <td class="rank_table_5 rank_table_text">
            <div class="rank_table_skill">
              <div class="rank_image_skill_wrap">
                <div :class="getSpriteIcon(result.skill, 1)"></div>
              </div>
              <div class="rank_table_skill_text">
                <div class="rank_ratio"> {{ getSkillName(result.skill, 1) }}</div>
                <div class="rank_ratio">{{ getPercentage(getSurveyResult(result.skill2, "rank3"), 1) }}</div>
              </div>
            </div>
          </td>
          <td class="rank_table_6 rank_table_text">
            <div class="rank_table_skill">
              <div class="rank_image_skill_wrap">
                <div :class="getSpriteIcon(result.skill, 2)"></div>
              </div>
              <div class="rank_table_skill_text">
                <div class="rank_ratio"> {{ getSkillName(result.skill, 2) }}</div>
                <div class="rank_ratio">{{ getPercentage(getSurveyResult(result.skill3, "rank" + 3), 1) }}</div>
              </div>
            </div>
          </td>
          <td class="rank_table_7">
            <div>解锁：{{ getPercentage(getSurveyResult(result.modX, 'count'), 1) }}</div>
            <!--            <div>一级：{{ getPercentage(getSurveyResult(result.modX, 'rank1'), 1) }}</div>-->
            <!--            <div>二级：{{ getPercentage(getSurveyResult(result.modX, 'rank2'), 1) }}</div>-->
            <!--            <div>三级：{{ getPercentage(getSurveyResult(result.modX, 'rank3'), 1) }}</div>-->
          </td>
          <td class="rank_table_8">
            <div>解锁：{{ getPercentage(getSurveyResult(result.modY, 'count'), 1) }}</div>
            <!--            <div>一级：{{ getPercentage(getSurveyResult(result.modY, 'rank1'), 1) }}</div>-->
            <!--            <div>二级：{{ getPercentage(getSurveyResult(result.modY, 'rank2'), 1) }}</div>-->
            <!--            <div>三级：{{ getPercentage(getSurveyResult(result.modY, 'rank3'), 1) }}</div>-->
          </td>
        </tr>
      </table>
    </div>
  </div>
</template>

<script setup>
import "@/assets/css/survey/survey_rank.css";
import { filterByCharacterProperty, professionDict} from "./common";
import {collapseV2} from "/src/custom/collapse";
import '/src/custom/css/collapse.css'
import {onMounted, ref} from "vue";
import character_table_simple from "@/static/json/survey/character_table_simple.json";


import surveyApi from "/src/api/surveyUser";

let rarity_dict = [1, 2, 3, 4, 5, 6];

let operators_statistics_list = ref([]);


let user_count = ref(0);
let update_time = ref("2023-05-01");


function getCharStatisticsResult() {
  surveyApi.getCharStatisticsResult().then((response) => {
    const {result,userCount,updateTime} = response.data
    for(const item of result){
      const charId =  item.charId
      const char_info =  character_table_simple[charId]
      let rank_info = {
        charId: charId,
        name: char_info.name,
        rarity: char_info.rarity,
        own: item.own,
        elite: item.elite,
        skill1: item.skill1,
        skill2: item.skill2,
        skill3: item.skill3,
        modX: item.modX,
        modY: item.modY,
        profession: char_info.profession,
        itemObtainApproach: char_info.itemObtainApproach,
        mod: char_info.mod,
        skill: char_info.skill,
        show: true,
      }

      operators_statistics_list.value.push(rank_info)
    }
    addFilterCondition('rarity', 6)
    user_count.value = userCount ;
    update_time.value = updateTime;
  });
}


function getSprite(id, type) {
  if ("elite" === type) return "bg-" + id + " rank_sprite_elite";
  return "bg-" + id + " rank_avatar";
}

function getPercentage(value, digit) {
  if (value < 0) return "";
  return (value * 100).toFixed(digit) + "%";
}

function getSurveyResult(obj, rank) {
  if (obj === void 0) return '';
  if (obj[rank] === void 0) return '';
  return obj[rank];
}

function getSpriteIcon(skill, index) {
  if (skill.length < index + 1) return "";
  const iconId = skill[index].iconId;
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
  if (filter_condition.value[attribute].indexOf(rule) > -1) {
    return "btn btn_white btn_white_selected";
  }
  return "btn btn_white";
}

let filter_condition = ref({rarity: [], profession: [], year: [], own: [], mod: [], itemObtainApproach: [], TODO: []});

/**
 * 增加筛选条件
 * 同属性的条件可以多条，比如星级选择4，5，6星，筛选后显示4，5，6星干员
 * 不同属性的条件要均符合才能显示，比如星级选择4，5，6星，实装时间选择2019年，筛选后显示2019年的4，5，6星干员
 * @param property 要筛选的属性
 * @param condition 属性的条件
 */
function addFilterCondition(property, condition) {
  console.log(filter_condition.value);

  // let radio_properties = ['itemObtainApproach', 'mod'];
  // //判断筛选属性是Boolean类型，判断这个属性没有包含传入的条件
  // if (radio_properties.includes(property) && !filter_condition.value[property].includes(condition)) {
  //   filter_condition.value[property] = [condition];
  // } else if (filter_condition.value[property].indexOf(condition) > -1) {
  //   filter_condition.value[property] = filter_condition.value[property].filter(item => item !== condition);
  // } else {
  //   filter_condition.value[property].push(condition);
  // }
  let filterRulesCopy = [];
  if (filter_condition.value[property].indexOf(condition) > -1) {
    for (let i in filter_condition.value[property]) {
      if (condition !== filter_condition.value[property][i]) {
        filterRulesCopy.push(filter_condition.value[property][i]);
      }
    }
    filter_condition.value[property] = filterRulesCopy;
    filterCharacterList();
    return;
  }

  filter_condition.value[property].push(condition);
  filterCharacterList();
}

//筛选
function filterCharacterList() {
  for (let i in operators_statistics_list.value) {
    const character = operators_statistics_list.value[i];
    operators_statistics_list.value[i].show = filterByCharacterProperty(filter_condition.value, character);
  }
}

let last_property = ref('')
let desc_or_asc = ref(1)



//按条件排序
function sortRank(property) {
  if (last_property.value === property) {
    desc_or_asc.value++;
  } else {
    desc_or_asc.value = 1;
  }
  operators_statistics_list.value.sort((a, b) => {
    if (desc_or_asc.value % 2 !== 0) {
      return b[property] - a[property];
    }

    if (desc_or_asc.value % 2 === 0) {
      return a[property] - b[property];
    }

  });

  last_property.value = property;
}

function sortIconClass(property, descOrAsc) {
  // console.log(property,descOrAsc)
  if (last_property.value === property) {
    if (desc_or_asc.value % 2 !== 0 && 'desc' === descOrAsc) {
      // console.log('降序')
      return 'border-top: 8px solid #2692fd'
    }

    if (desc_or_asc.value % 2 === 0 && 'asc' === descOrAsc) {
      // console.log('升序')
      return 'border-bottom: 8px solid #2692fd'
    }

  }

  return ''
}


function commonSort(property, condition) {
  if (last_property.value === property) {
    desc_or_asc.value++;
  } else {
    desc_or_asc.value = 1;
  }

  const len = operators_statistics_list.value.length

  for(const item of operators_statistics_list.value){
    console.log(item.elite.rank2)
  }

  for (let i = 0; i < len - 1; i++) {
    for (let j = 0; j < len - 1 - i; j++) {
      if (desc_or_asc.value % 2 !== 0) {
        // console.log(operators_statistics_list.value[j][property][condition],operators_statistics_list.value[j + 1][property][condition])
        if (operators_statistics_list.value[j][property][condition] < operators_statistics_list.value[j + 1][property][condition]) {
          const temp = operators_statistics_list.value[j]
          operators_statistics_list.value[j] = operators_statistics_list.value[j + 1]
          operators_statistics_list.value[j + 1] = temp;
        }
      }

      if (desc_or_asc.value % 2 === 0) {
        // console.log(operators_statistics_list.value[j][property][condition],operators_statistics_list.value[j + 1][property][condition])
        if (operators_statistics_list.value[j][property][condition] > operators_statistics_list.value[j + 1][property][condition]) {
          const temp = operators_statistics_list.value[j]
          operators_statistics_list.value[j] = operators_statistics_list.value[j + 1]
          operators_statistics_list.value[j + 1] = temp;
        }
      }
    }
  }

  last_property.value = property;
}


onMounted(() => {

  getCharStatisticsResult()
})
</script>
