<script setup>
import "/src/assets/css/survey/rank.v2.scss";
import "/src/assets/css/survey/rank.phone.scss";
import {filterByCharacterProperty, professionDict, yearDict} from "/src/utils/survey/common.js";
import {onMounted, ref} from "vue";
import character_table_simple from "/src/static/json/survey/character_table_simple.json";
import SpriteImage from "/src/components/SpriteImage.vue";
import operatorDataApi from "/src/api/operatorData";

import {operatorFilterCondition, filterOperatorList} from "/src/utils/survey/operatorFilter.js";
import {debounce} from "@/utils/debounce.js";


let operatorsStatisticsList = ref([]);
let userCountText = ref(0);
let updateTimeText = ref("2023-05-01");
let displayList = ref([])

const addFilterConditionAndFilterOperator = debounce((func,index) => {
  func(index)
  displayList.value = filterOperatorList(operatorsStatisticsList.value)
}, 500)

function btnAction(action){
   if(!action){
     return "tonal"
   }
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

//表头标题
let headers2 = [
  {title: '干员', align: 'start', sortable: false, key: 'charId'},
  {title: '持有率', key: 'own'},
  {title: '精二率', key: 'eliteS'},
  {title: '一技能', key: 'skill1S'},
  {title: '二技能', key: 'skill2S'},
  {title: '三技能', key: 'skill3S'},
  {title: 'X模组', key: 'modXS'},
  {title: 'Y模组', key: 'modYS'},
  {title: 'D模组', key: 'modDS'},
  {title: 'A模组', key: 'modAS'},
]


let sortBy = ref([])

for (const item of headers2) {
  sortBy.value.push({
    key: item.key, order: 'asc'
  })
}

console.log(sortBy.value)


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
        item.modAS = item.modA.rank3
        item.available = true
        item.date = charInfo.date
      } else {
        item.available = false
      }
    }
    result = result.filter(e => e.name)

    operatorsStatisticsList.value = result
    displayList.value =  filterOperatorList(operatorsStatisticsList.value)
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
function selectedBtn(property, rule) {
  if (filter_condition.value[property].indexOf(rule) < 0) {
    return "tonal"
  }

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

const formatCellData = (data) => {
  return `${(data * 100).toFixed(1)}%`
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


  <div class="survey-rank-page-v2 survey-common">
    <v-card class="rank-card">
      <div class="checkbox" v-for="(conditions,module) in operatorFilterCondition" :key="module">
        <v-btn variant="text" class="checkbox-label">{{ conditions.label }}</v-btn>
        <v-btn color="primary" :variant="btnAction(condition.action)"
               class="checkbox-button" rounded="x-large"
               v-for="(condition,index) in conditions.conditions" :key="index"
               @click="addFilterConditionAndFilterOperator(conditions.actionFunc,index)">
          {{ condition.label }}
        </v-btn>
      </div>

      <v-chip color="primary">
        以下展示数据仅为技能专三率和模组3级开启率
      </v-chip>
      <v-chip color="primary">
        调查人数{{ userCountText }}
      </v-chip>
      <v-chip color="primary">
        更新时间{{ updateTimeText }}
      </v-chip>
    </v-card>


    <v-card class="rank-card">
      <v-data-table
          v-model:sort-by="sortBy"
          :headers="headers2"
          :items="displayList"
          hide-default-footer
          items-per-page="-1">
        <template v-slot:item.charId="{ item }">
          <SpriteImage :roundedCorner="100" :image-name="item.charId" display-size="60"
                       original-size="180"></SpriteImage>
        </template>
        <template v-slot:item.own="{ item }">
          {{ formatCellData(item.own) }}
        </template>
        <template v-slot:item.eliteS="{ item }">
          {{ formatCellData(item.eliteS) }}
        </template>
        <template v-slot:item.skill1S="{ item }">
          {{ formatCellData(item.skill1S) }}
        </template>
        <template v-slot:item.skill2S="{ item }">
          {{ formatCellData(item.skill2S) }}
        </template>
        <template v-slot:item.skill3S="{ item }">
          {{ formatCellData(item.skill3S) }}
        </template>
        <template v-slot:item.modXS="{ item }">
          {{ formatCellData(item.modXS) }}
        </template>
        <template v-slot:item.modYS="{ item }">
          {{ formatCellData(item.modYS) }}
        </template>
        <template v-slot:item.modDS="{ item }">
          {{ formatCellData(item.modDS) }}
        </template>
        <template v-slot:item.modAS="{ item }">
          {{ formatCellData(item.modAS) }}
        </template>
      </v-data-table>
    </v-card>

  </div>
</template>


<style scoped>
.btn {
  margin: 4px;
}
</style>
