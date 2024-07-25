<script setup>
import "/src/assets/css/survey/rank.scss";
import { filterByCharacterProperty, professionDict} from "./service/common";
import {onMounted, ref} from "vue";
import character_table_simple from "/src/static/json/survey/character_table_simple.json";
import MyButton from '/src/components/Button.vue'
import SpriteImage from "/src/components/SpriteImage.vue";

import operatorDataApi from "/src/api/operator-data";
import OperatorDataLineChart from "../../components/OperatorDataLineChart.vue";

let rarityDict = [1, 2, 3, 4, 5, 6];

let operatorsStatisticsList = ref([]);


let userCountText = ref(0);
let updateTimeText = ref("2023-05-01");


function getCharStatisticsResult() {
  operatorDataApi.getCharStatisticsResult().then((response) => {
    let {result,userCount,updateTime} = response.data
    for(const item of result){
      let char_info = character_table_simple[item.charId]
      if (char_info) {
        item.name = char_info.name
        item.rarity = char_info.rarity
        item.profession = char_info.profession
        item.itemObtainApproach = char_info.itemObtainApproach
        item.skill = char_info.skill
        item.equip = char_info.equip
        item.available = true
      } else {
        item.available = false
      }
    }
    result = result.filter(e => e.name)

    operatorsStatisticsList.value = result
    addFilterCondition('rarity', 6)
    userCountText.value = userCount;
    updateTimeText.value = updateTime;
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
  if (typeof obj === "undefined") return '';
  if (typeof obj[rank] === "undefined") return '';
  return obj[rank];
}

function getSpriteIcon(skill, index) {
  if (skill.length < index + 1) return "";
  const iconId = skill[index].iconId;
  return "bg-skill_icon_" + iconId + " rank_sprite_skill";
}

function getSkillName(skill, index) {
  if (skill.length < index + 1) return "";
  return skill[index].name;
}

//判断按钮是否选择赋予样式
function selectedBtn(attribute, rule) {
  if (filter_condition.value[attribute].indexOf(rule) > -1) {
    return true;
  }
  return false;
}

let collapse_filter_visible = ref(false)

function collapseFilter(){
  collapse_filter_visible.value = !collapse_filter_visible.value
}

let filter_condition = ref({rarity: [], profession: [], year: [], own: [], equip: [], itemObtainApproach: [], TODO: []});

/**
 * 增加筛选条件
 * 同属性的条件可以多条，比如星级选择4，5，6星，筛选后显示4，5，6星干员
 * 不同属性的条件要均符合才能显示，比如星级选择4，5，6星，实装时间选择2019年，筛选后显示2019年的4，5，6星干员
 * @param property 要筛选的属性
 * @param condition 属性的条件
 */
function addFilterCondition(property, condition) {
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
  for (let i in operatorsStatisticsList.value) {
    const character = operatorsStatisticsList.value[i];
    operatorsStatisticsList.value[i].show = filterByCharacterProperty(filter_condition.value, character);
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
  operatorsStatisticsList.value.sort((a, b) => {
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
  if (last_property.value === property) {
    if (desc_or_asc.value % 2 !== 0 && 'desc' === descOrAsc) {
      return 'border-top: 8px solid #2692fd'
    }

    if (desc_or_asc.value % 2 === 0 && 'asc' === descOrAsc) {
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

  const len = operatorsStatisticsList.value.length


  for (let i = 0; i < len - 1; i++) {
    for (let j = 0; j < len - 1 - i; j++) {
      if (desc_or_asc.value % 2 !== 0) {
        if (operatorsStatisticsList.value[j][property][condition] < operatorsStatisticsList.value[j + 1][property][condition]) {
          const temp = operatorsStatisticsList.value[j]
          operatorsStatisticsList.value[j] = operatorsStatisticsList.value[j + 1]
          operatorsStatisticsList.value[j + 1] = temp;
        }
      }

      if (desc_or_asc.value % 2 === 0) {
        if (operatorsStatisticsList.value[j][property][condition] > operatorsStatisticsList.value[j + 1][property][condition]) {
          const temp = operatorsStatisticsList.value[j]
          operatorsStatisticsList.value[j] = operatorsStatisticsList.value[j + 1]
          operatorsStatisticsList.value[j + 1] = temp;
        }
      }
    }
  }

  last_property.value = property;
}

const getEliteData = (data)=>{
  return [data.rank0*100,data.rank1*100,data.rank2*100]
}

const formatData = (data) =>{
  return [data.rank1*100,data.rank2*100,data.rank3*100]
}

const getOwnData = (data)=>{
  return [0,(1-data)*100,data*100]
}

onMounted(() => {

  getCharStatisticsResult()
})
</script>

<template>
  <div class="survey_rank_page">
    <!-- 常驻条 -->
    <div class="control-header">
      <MyButton data-color="blue"  @click="collapseFilter()">
        筛选
      </MyButton>
      <div id="updateTime">
        调查人数{{ userCountText }}<br/>
        更新时间{{ updateTimeText }}
      </div>
    </div>

    <!-- 筛选模块 -->
    <c-collapse-item :name="'filter'" :visible="collapse_filter_visible" >

      <div class="control-box">
        <div class="control-line">
          <div class="control-line-label">职业</div>
          <div class="control-checkbox">
            <MyButton data-color="blue"
                       v-for="(profession,index) in professionDict" :key="index"
                       :active="selectedBtn('profession', profession.value)"
                       @click="addFilterCondition('profession', profession.value)">
              {{ profession.label }}
            </MyButton>
          </div>
        </div>

        <div class="control-line">
          <div class="control-line-label">稀有度</div>
          <div class="control-checkbox">
            <MyButton data-color="orange"
                       v-for="(rarity,index) in rarityDict" :key="index"
                       :active="selectedBtn('rarity', rarity)"
                       @click="addFilterCondition('rarity', rarity)">
              {{ rarity }}★
            </MyButton>
          </div>
        </div>

        <div class="control-line">
          <div class="control-line-label">其他</div>
          <div class="control-checkbox">
            <MyButton data-color="green" :active="selectedBtn('equip', true)"
                       @click="addFilterCondition('equip', true)">
              模组已实装
            </MyButton>
            <MyButton data-color="green" :active="selectedBtn('equip', false)"
                       @click="addFilterCondition('equip', false)">
              模组未实装
            </MyButton>
            <MyButton data-color="green" :active="selectedBtn('itemObtainApproach', '赠送干员')"
                       @click="addFilterCondition('itemObtainApproach', '赠送干员')">
              赠送干员
            </MyButton>
            <MyButton data-color="green" :active="selectedBtn('itemObtainApproach', '限定干员')"
                       @click="addFilterCondition('itemObtainApproach', '限定干员')">
              限定干员
            </MyButton>
          </div>
        </div>

        <!-- <div class="collapse_bar">
          <div class="collapse_title">排序</div>
          <div class="switch_btn_wrap">
            <div class="btn_switch" @click="sortCharacterList('profession')">按职业</div>
            <div class="btn_switch" @click="sortCharacterList('rarity')">按稀有度</div>
            <div class="btn_switch" @click="sortCharacterList('date')">按实装顺序</div>
          </div>
        </div> -->
      </div>

    </c-collapse-item>

    <!--    <div id="rank_table mdui-table-fluid">-->
    <!--      <table class="mdui-table">-->


    <div id="rank_table" class="rank-table-box">
      <table class="rank-table">
        <thead>
        <tr>
          <td>
            <div class="rank-table-title" style="width: 220px">代号</div>
          </td>
          <td @click="sortRank('own')">
            <div class="rank-table-title" style="width: 80px">
              <div>持有率</div>
              <div>
                <div class="sort-asc-icon" :style="sortIconClass('own','asc')"></div>
                <div class="sort-desc-icon" :style="sortIconClass('own','desc')"></div>
              </div>
            </div>
          </td>
          <td @click="commonSort('elite','rank2')">
            <div class="rank-table-title" style="width: 80px">
              <div>精二率</div>
              <div>
                <div class="sort-asc-icon" :style="sortIconClass('elite','asc')"></div>
                <div class="sort-desc-icon" :style="sortIconClass('elite','desc')"></div>
              </div>
            </div>
          </td>
          <td @click="commonSort('skill1','rank3')">
            <div class="rank-table-title" style="width: 80px">
              <div>一技能</div>
              <div>
                <div class="sort-asc-icon" :style="sortIconClass('skill1','asc')"></div>
                <div class="sort-desc-icon" :style="sortIconClass('skill1','desc')"></div>
              </div>
            </div>
          </td>
          <td @click="commonSort('skill2','rank3')">
            <div class="rank-table-title" style="width: 80px">
              <div>二技能</div>
              <div>
                <div class="sort-asc-icon" :style="sortIconClass('skill2','asc')"></div>
                <div class="sort-desc-icon" :style="sortIconClass('skill2','desc')"></div>

              </div>
            </div>
          </td>
          <td @click="commonSort('skill3','rank3')">
            <div class="rank-table-title" style="width: 80px">
              <div>三技能</div>
              <div>
                <div class="sort-asc-icon" :style="sortIconClass('skill3','asc')"></div>
                <div class="sort-desc-icon" :style="sortIconClass('skill3','desc')"></div>

              </div>
            </div>
          </td>
          <td @click="commonSort('modX','count')">
            <div class="rank-table-title" style="width: 80px">
              <div>X模组</div>
              <div>
                <div class="sort-asc-icon" :style="sortIconClass('modX','asc')"></div>
                <div class="sort-desc-icon" :style="sortIconClass('modX','desc')"></div>

              </div>
            </div>
          </td>
          <td @click="commonSort('modY','count')">
            <div class="rank-table-title" style="width: 80px">
              <div>Y模组</div>
              <div>
                <div class="sort-asc-icon" :style="sortIconClass('modY','asc')"></div>
                <div class="sort-desc-icon" :style="sortIconClass('modY','desc')"></div>
              </div>
            </div>
          </td>
          <td @click="commonSort('modD','count')">
            <div class="rank-table-title" style="width:80px">
              <div>D模组</div>
              <div>
                <div class="sort-asc-icon" :style="sortIconClass('modD','asc')"></div>
                <div class="sort-desc-icon" :style="sortIconClass('modD','desc')"></div>
              </div>
            </div>
          </td>
        </tr>
      </thead>

      <tbody>
        <tr v-for="(result, index) in operatorsStatisticsList" :key="index" v-show="result.show"
            class="rank_table_tr">
          <td class="rank_table_1 rank_table_text">
            <div class="rank_table_avatar">
             <SpriteImage :id="result.charId" display-size="70" original-size="180"></SpriteImage>
              <div class="rank_operator_name" :class="'rarity_'+result.rarity">{{ result.name }}</div>
            </div>
          </td>
          <td class="rank_table_2 rank_table_text">
            <OperatorDataLineChart  :line-data="getOwnData(result.own)"></OperatorDataLineChart>
          </td>
          <td class="rank_table_3 rank_table_text">
            <OperatorDataLineChart  :line-data="getEliteData(result.elite)"></OperatorDataLineChart>
         </td>
          <td class="rank_table_3 rank_table_text">
            <OperatorDataLineChart  :line-data="formatData(result.skill1)"></OperatorDataLineChart>
          </td>
          <td class="rank_table_3 rank_table_text">
            <OperatorDataLineChart  :line-data="formatData(result.skill2)"></OperatorDataLineChart>
          </td>
          <td class="rank_table_3 rank_table_text">
            <OperatorDataLineChart  :line-data="formatData(result.skill3)"></OperatorDataLineChart>
          </td>
          <td class="rank_table_7">
            <OperatorDataLineChart  :line-data="formatData(result.modX)"></OperatorDataLineChart>
          </td>
          <td class="rank_table_8">
            <OperatorDataLineChart  :line-data="formatData(result.modY)"></OperatorDataLineChart>
          </td>
          <td class="rank_table_8">
            <OperatorDataLineChart  :line-data="formatData(result.modD)"></OperatorDataLineChart>
          </td>
        </tr>
      </tbody>
      </table>
    </div>
  </div>
</template>




<style scoped>
.btn{
  margin: 4px;
}
</style>
