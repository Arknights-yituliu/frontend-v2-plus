<script setup>
import "/src/assets/css/survey/rank.v2.scss";
import "/src/assets/css/survey/rank.phone.scss";


import {filterByCharacterProperty, professionDict} from "./service/common";
import {onMounted, ref} from "vue";
import character_table_simple from "/src/static/json/survey/character_table_simple.json";
import MyButton from '/src/components/Button.vue'
import SpriteImage from "/src/components/SpriteImage.vue";

import operatorDataApi from "/src/api/operatorData";
import OperatorDataLineChart from "/src/components/LineChart.vue";
import TableSortButton from "../../components/TableSortButton.vue";

let rarityDict = [1, 2, 3, 4, 5, 6];

let operatorsStatisticsList = ref([]);


let userCountText = ref(0);
let updateTimeText = ref("2023-05-01");


function getCharStatisticsResult() {
  operatorDataApi.getCharStatisticsResult().then((response) => {
    let {result, userCount, updateTime} = response.data
    for (const item of result) {
      let charInfo = character_table_simple[item.charId]
      if (charInfo) {
        item.name = charInfo.name
        item.rarity = charInfo.rarity
        item.profession = charInfo.profession
        item.itemObtainApproach = charInfo.itemObtainApproach
        item.skill = charInfo.skill
        item.equip = charInfo.equip
        item.eliteS = item.elite.rank2
        item.skill1S = item.skill1.rank3
        item.skill2S = item.skill2.rank3
        item.skill3S = item.skill3.rank3
        item.modXS = item.modX.rank3
        item.modYS = item.modY.rank3
        item.modDS = item.modD.rank3
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

function collapseFilter() {
  collapse_filter_visible.value = !collapse_filter_visible.value
}

let filter_condition = ref({
  rarity: [],
  profession: [],
  year: [],
  own: [],
  equip: [],
  itemObtainApproach: [],
  TODO: []
});

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

//筛选干员
function filterCharacterList() {
  for (let i in operatorsStatisticsList.value) {
    const character = operatorsStatisticsList.value[i];
    operatorsStatisticsList.value[i].show = filterByCharacterProperty(filter_condition.value, character);
  }


}


function quickSort(arr, compare = (a, b) => a - b) {
  if (arr.length <= 1) return arr;

  const pivotIndex = Math.floor(arr.length / 2);
  const pivot = arr.splice(pivotIndex, 1)[0];
  const less = [];
  const greater = [];

  for (let i = 0; i < arr.length; i++) {
    if (compare(arr[i], pivot) < 0) {
      less.push(arr[i]);
    } else {
      greater.push(arr[i]);
    }
  }

  return [...quickSort(less, compare), pivot, ...quickSort(greater, compare)];
}

//表头标题
const headers = [
  {label: '干员', value: 'charId'},
  {label: '持有率', value: 'own'},
  {label: '精二率', value: 'eliteS'},
  {label: '一技能', value: 'skill1S'},
  {label: '二技能', value: 'skill2S'},
  {label: '三技能', value: 'skill3S'},
  {label: 'X模组', value: 'modXS'},
  {label: 'Y模组', value: 'modYS'},
  {label: 'D模组', value: 'modDS'},
]

//选中的表头标题暂存
let selectedHeader = ref({value: '', order: 'asc'})

/**
 * 排序函数
 * @param list 传入的干员数据集合
 * @param compare 传入一个比较函数
 */
function sort(list, compare = (a, b) => a - b) {
  const length = list.length
  for (let i = 0; i < length - 1; i++) {
    for (let j = 0; j < length - 1 - i; j++) {
      if (compare(list[j], list[j + 1]) > 0) {
        const temp = list[j]
        list[j] = list[j + 1]
        list[j + 1] = temp;
      }
    }
  }

  operatorsStatisticsList.value = list
}

/**
 * 根据表头的属性排序
 * @param property 表头属性
 */
function sortByProperty(property) {
  let func = (a, b) => a[property] - b[property]
  if (selectedHeader.value.value === property) {
    if (selectedHeader.value.order === 'asc') {
      selectedHeader.value.order = 'desc'
      func = (a, b) => b[property] - a[property]
    } else {
      selectedHeader.value.order = 'asc'
      func = (a, b) => a[property] - b[property]
    }
  } else {
    selectedHeader.value.value = property
  }

  sort(operatorsStatisticsList.value, func)
}

// 后端返回的数据为如下格式，下面的部分函数为格式化数据函数
// {
// count: 1-3级合计占比,
// rank0:0级、未开启占比，
// rank1:1级占比
// rank2:2级占比
// rank3:3级占比
// }

/**
 * 获取干员精英化统计数据
 * @param data  统计数据
 * @return {string} 格式化后的百分比
 */
const getEliteData = (data) => {
  if (data) {
    if (data.rank2) {
      return `${(data.rank2 * 100).toFixed(1)}%`
    }
  }
  return `0%`
}

/**
 * 获取干员专精专三或模组三级统计数据
 * @param data  统计数据
 * @return {string} 格式化后的百分比
 */
const getSkillDataOrEquipData = (data) => {
  if (data) {
    if (data.rank2) {
      return `${(data.rank3 * 100).toFixed(1)}%`
    }
  }
  return `0%`
}

/**
 * 获取干员专精或模组1到3级完整统计数据
 * @param data 统计数据
 * @return {number[]} 1到3级的百分比数据集合
 */
const formatLineData = (data) => {
  return [data.rank1 * 100, data.rank2 * 100, data.rank3 * 100]
}

const getOwnData = (data) => {
  return `${(data * 100).toFixed(1)}%`
}

const getOwnLineData = (data) => {
  return [0, (1 - data) * 100, data * 100]
}

const getEliteLineData = (data) => {
  return [data.rank0 * 100, data.rank1 * 100, data.rank2 * 100]
}

onMounted(() => {

  getCharStatisticsResult()
})
</script>

<template>
  <div class="survey-rank-page">
    <!-- 常驻条 -->
    <div class="control-header">
      <MyButton data-color="blue" @click="collapseFilter()">
        筛选
      </MyButton>
      <div id="updateTime">
        调查人数{{ userCountText }}<br/>
        更新时间{{ updateTimeText }}
      </div>
    </div>

    <!-- 筛选模块 -->
    <c-collapse-item :name="'filter'" :visible="collapse_filter_visible">
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

      </div>

    </c-collapse-item>


    <div class="rank-table-legend-box">
      <!--      <div class="rank-table-legend line-0"></div>-->
      <!--      <span>专精/模组1级</span>-->
      <!--      <div class="rank-table-legend line-1"></div>-->
      <!--      <span>专精/模组2级、未持有</span>-->
      <!--      <div class="rank-table-legend line-2"></div>-->
      <!--      <span>专精/模组3级、持有</span>-->
      <span>以下展示数据仅为技能专三率和模组3级开启率</span>
    </div>

    <div class="rank-table-wrap">
      <div class="rank-table">
        <div class="rank-table-line rank-table-line-title">
          <div class="rank-table-line-item" :class="index===0?'rank-table-line-item-long':''"
               v-for="(header,index) in headers" :key="index">
            <TableSortButton
                :value="selectedHeader.value"
                :label="header.value"
                :order="selectedHeader.order"
                @click="sortByProperty(header.value)">
              {{ header.label }}
            </TableSortButton>
          </div>
        </div>
        <div class="rank-table-line" v-for="(result, index) in operatorsStatisticsList" :key="index"
             v-show="result.show">
          <div class="rank-table-line-item rank-table-line-item-long" style="position: relative">
            <div class="operator-name">{{ result.name }}</div>
            <SpriteImage :image-name="result.charId" display-size="60"
                         original-size="180"></SpriteImage>
          </div>
          <div class="rank-table-line-item">
            <span class="rank-table-line-item-text"> {{ getOwnData(result.own) }}</span>
          </div>
          <div class="rank-table-line-item">
            <span class="rank-table-line-item-text"> {{ getEliteData(result.elite) }}</span>
          </div>
          <div class="rank-table-line-item show-complete-data">
            <span class="rank-table-line-item-text"> {{ getSkillDataOrEquipData(result.skill1) }}</span>
            <div class="complete-data">
              <div v-for="(data,index) in formatLineData(result.skill1)">
                {{ `专精${index + 1}级：${data.toFixed(1)}%` }}
              </div>
            </div>
            <!--            <OperatorDataLineChart :line-data="formatLineData(result.skill1)"></OperatorDataLineChart>-->
          </div>
          <div class="rank-table-line-item show-complete-data">
            <span class="rank-table-line-item-text"> {{ getSkillDataOrEquipData(result.skill2) }}</span>
            <div class="complete-data">
              <div v-for="(data,index) in formatLineData(result.skill2)">
                {{ `专精${index + 1}级：${data.toFixed(1)}%` }}
              </div>
            </div>
            <!--            <OperatorDataLineChart :line-data="formatLineData(result.skill2)"></OperatorDataLineChart>-->
          </div>
          <div class="rank-table-line-item show-complete-data">
            <span class="rank-table-line-item-text"> {{ getSkillDataOrEquipData(result.skill3) }}</span>
            <div class="complete-data">
              <div v-for="(data,index) in formatLineData(result.skill3)">
                {{ `专精${index + 1}级：${data.toFixed(1)}%` }}
              </div>
            </div>
            <!--            <OperatorDataLineChart :line-data="formatLineData(result.skill3)"></OperatorDataLineChart>-->
          </div>
          <div class="rank-table-line-item show-complete-data">
            <span class="rank-table-line-item-text"> {{ getSkillDataOrEquipData(result.modX) }}</span>
            <div class="complete-data">
              <div v-for="(data,index) in formatLineData(result.modX)">
                {{ `模组${index + 1}级：${data.toFixed(1)}%` }}
              </div>
            </div>
            <!--            <OperatorDataLineChart :line-data="formatLineData(result.modX)"></OperatorDataLineChart>-->
          </div>
          <div class="rank-table-line-item show-complete-data">
            <span class="rank-table-line-item-text"> {{ getSkillDataOrEquipData(result.modY) }}</span>
            <div class="complete-data">
              <div v-for="(data,index) in formatLineData(result.modY)">
                {{ `模组${index + 1}级：${data.toFixed(1)}%` }}
              </div>
            </div>
            <!--            <OperatorDataLineChart :line-data="formatLineData(result.modY)"></OperatorDataLineChart>-->
          </div>
          <div class="rank-table-line-item show-complete-data">
            <span class="rank-table-line-item-text"> {{ getSkillDataOrEquipData(result.modD) }}</span>
            <div class="complete-data">
              <div v-for="(data,index) in formatLineData(result.modD)">
                {{ `模组${index + 1}级：${data.toFixed(1)}%` }}
              </div>
            </div>
            <!--            <OperatorDataLineChart :line-data="formatLineData(result.modD)"></OperatorDataLineChart>-->
          </div>
        </div>

      </div>
    </div>
  </div>
</template>


<style scoped>
.btn {
  margin: 4px;
}
</style>
