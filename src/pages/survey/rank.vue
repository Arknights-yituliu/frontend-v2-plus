<script setup>
import "/src/assets/css/survey/rank.v2.scss";
import "/src/assets/css/survey/rank.phone.scss";
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

const displayFilterCondition = ['profession', 'rarity', 'date', 'itemObtainApproach']

const addFilterConditionAndFilterOperator = debounce((func, index) => {
  func(index)
  displayList.value = filterOperatorList(operatorsStatisticsList.value)
}, 500)

function btnAction(action) {
  if (!action) {
    return "tonal"
  }
}

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
    displayList.value = filterOperatorList(operatorsStatisticsList.value)

    userCountText.value = userCount;
    updateTimeText.value = updateTime;

  });
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


// 后端返回的数据为如下格式，下面的部分函数为格式化数据函数
// {
// count: 1-3级合计占比,
// rank0:0级、未开启占比，
// rank1:1级占比
// rank2:2级占比
// rank3:3级占比
// }

const formatCellData = (data) => {
  return `${(data * 100).toFixed(1)}%`
}

onMounted(() => {
  getCharStatisticsResult()
})


</script>

<template>


  <div class="survey-rank-page-v2 survey-common">
    <v-card class="rank-card">
      <div class="checkbox" v-for="(conditions,module) in operatorFilterCondition" :key="module"
           v-show="displayFilterCondition.includes(module)">
        <v-btn variant="text" class="checkbox-label">{{ conditions.label }}</v-btn>
        <v-btn color="primary" :variant="btnAction(condition.action)"
               class="checkbox-button" rounded="x-large"
               v-for="(condition,index) in conditions.conditions" :key="index"
               @click="addFilterConditionAndFilterOperator(conditions.actionFunc,index)">
          {{ condition.label }}
        </v-btn>
      </div>
    </v-card>
    <v-chip color="primary">
      以下展示数据仅为技能专三率和模组3级开启率
    </v-chip>
    <v-chip color="primary">
      调查人数{{ userCountText }}
    </v-chip>
    <v-chip color="primary">
      更新时间{{ updateTimeText }}
    </v-chip>

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
