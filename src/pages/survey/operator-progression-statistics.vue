<script setup>
import "/src/assets/css/survey/rank.v2.scss";
import "/src/assets/css/survey/rank.phone.scss";
import {onMounted, ref} from "vue";
import {operatorTable} from "/src/utils/gameData.js";

import OperatorAvatar from "/src/components/sprite/OperatorAvatar.vue";
import operatorDataApi from "/src/api/operatorData";

import {operatorFilterCondition, filterOperatorList} from "/src/utils/survey/operatorFilter.js";
import {debounce} from "/src/utils/debounce.js";
import OperatorStatisticsDetail from "/src/components/survey/OperatorStatisticsDetail.vue";


let operatorsStatisticsList = ref([]);
let userCountText = ref(0);
let updateTimeText = ref("2023-05-01");
let displayOperatorsList = ref([])

const displayFilterCondition = ['profession', 'rarity', 'date', 'itemObtainApproach']

const addFilterConditionAndFilterOperator = debounce((func, index) => {
  func(index)
  displayOperatorsList.value = filterOperatorList(operatorsStatisticsList.value)
}, 500)

function btnAction(action) {
  if (!action) {
    return "tonal"
  }
}

//表头标题
let headers2 = [
  {title: '干员', align: 'start', sortable: false, key: 'charId'},
  {title: '持有率', sortable: true, key: 'own'},
  {title: '精二率', sortable: true, key: 'eliteS'},
  {title: '一技能', sortable: true, key: 'skill1S'},
  {title: '二技能', sortable: true, key: 'skill2S'},
  {title: '三技能', sortable: true, key: 'skill3S'},
  {title: 'X模组', sortable: true, key: 'modXS'},
  {title: 'Y模组', sortable: true, key: 'modYS'},
  {title: 'D模组', sortable: true, key: 'modDS'},
  {title: 'A模组', sortable: true, key: 'modAS'},
]


let sortBy = ref([])

for (const item of headers2) {
  sortBy.value.push({
    key: item.key, order: 'asc'
  })
}


function getCharStatisticsResult() {
  operatorDataApi.getOperatorStatisticsResult().then((response) => {
    let {result, userCount, updateTime} = response.data
    for (const item of result) {
      let charInfo = operatorTable[item.charId]
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
    displayOperatorsList.value = filterOperatorList(operatorsStatisticsList.value)

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


  <div class="survey-rank-page-v2">
    <v-card class="rank-card">
      <div class="flex flex-wrap" v-for="(conditions,module) in operatorFilterCondition" :key="module"
           v-show="displayFilterCondition.includes(module)">
        <v-btn variant="text" class="m-4">{{ conditions.label }}</v-btn>
        <v-btn color="primary" :variant="btnAction(condition.action)"
               class="m-4" rounded="x-large"
               v-for="(condition,index) in conditions.conditions" :key="index"
               @click="addFilterConditionAndFilterOperator(conditions.actionFunc,index)">
          {{ condition.label }}
        </v-btn>
      </div>
    </v-card>
    <v-chip color="primary">
      调查人数{{ userCountText }}
    </v-chip>
    <v-chip color="primary">
      更新时间{{ updateTimeText }}
    </v-chip>

    <v-card class="rank-card">
      <v-card-subtitle>
        表格展示数据为技能专三率和模组3级开启率，将鼠标移至技能和模组数字上方可查看所有等级的详细数据
      </v-card-subtitle>
      <v-data-table
          v-model:sort-by="sortBy"
          :headers="headers2"
          :items="displayOperatorsList"
          hide-default-footer
          items-per-page="-1">
        <template v-slot:item.charId="{ item }">
          <OperatorAvatar rounded :char-id="item.charId" size="60"></OperatorAvatar>
        </template>
        <template v-slot:item.own="{ item }">
          {{ formatCellData(item.own) }}
        </template>
        <template v-slot:item.eliteS="{ item }">
          {{ formatCellData(item.eliteS) }}
        </template>
        <template v-slot:item.skill1S="{ item }">
          <div class="display-data">
            {{ formatCellData(item.skill1S) }}
            <OperatorStatisticsDetail :data="item.skill1" class="display-detail-data">
            </OperatorStatisticsDetail>
          </div>
        </template>
        <template v-slot:item.skill2S="{ item }">
          <div class="display-data">
            {{ formatCellData(item.skill2S) }}
            <OperatorStatisticsDetail :data="item.skill2" class="display-detail-data">
            </OperatorStatisticsDetail>
          </div>
        </template>
        <template v-slot:item.skill3S="{ item }">
          <div class="display-data">
            {{ formatCellData(item.skill3S) }}
            <OperatorStatisticsDetail :data="item.skill3" class="display-detail-data">
            </OperatorStatisticsDetail>
          </div>
        </template>
        <template v-slot:item.modXS="{ item }">
          <div class="display-data">
            {{ formatCellData(item.modXS) }}
              <OperatorStatisticsDetail :data="item.modX" class="display-detail-data">
              </OperatorStatisticsDetail>
          </div>
        </template>
        <template v-slot:item.modYS="{ item }">
          <div class="display-data">
            {{ formatCellData(item.modYS) }}
            <OperatorStatisticsDetail :data="item.modY" class="display-detail-data">
            </OperatorStatisticsDetail>
          </div>
        </template>
        <template v-slot:item.modDS="{ item }">
          <div class="display-data">
            {{ formatCellData(item.modDS) }}
            <OperatorStatisticsDetail :data="item.modD" class="display-detail-data">
            </OperatorStatisticsDetail>
          </div>
        </template>
        <template v-slot:item.modAS="{ item }">
          <div class="display-data">
            {{ formatCellData(item.modAS) }}
            <OperatorStatisticsDetail :data="item.modA" class="display-detail-data">
            </OperatorStatisticsDetail>
          </div>
        </template>
      </v-data-table>
    </v-card>

  </div>
</template>

