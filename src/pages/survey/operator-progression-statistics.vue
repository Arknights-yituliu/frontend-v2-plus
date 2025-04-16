<script setup>
import "/src/assets/css/survey/rank.v2.scss";
import "/src/assets/css/survey/rank.phone.scss";
import {onMounted, ref} from "vue";
import {operatorTable} from "/src/utils/gameData.js";
import OperatorAvatar from "/src/components/sprite/OperatorAvatar.vue";
import operatorProgressionStatisticsDataCache from "/src/utils/indexedDB/operatorProgressionStatisticsData.js";
import {operatorFilterCondition, filterOperatorList} from "/src/utils/survey/operatorFilter.js";

import {formatNumber} from "@/utils/format.js";
import EquipIcon from "@/components/sprite/EquipIcon.vue";
import SkillIcon from "@/components/sprite/SkillIcon.vue";
import {dateFormat} from "@/utils/dateUtil.js";


let operatorsStatisticsList = ref([]);
let dataSampleSize = ref(1);
let updateTimeText = ref("2023-05-01");
let displayOperatorsList = ref([])

const displayFilterCondition = ['profession', 'rarity', 'date', 'itemObtainApproach']


function addFilterConditionAndFilterOperator(func, index) {

  func(index)
  displayOperatorsList.value = filterOperatorList(operatorsStatisticsList.value)

}

function btnAction(action) {
  if (!action) {
    return "tonal"
  }
}

//表头标题
let headers2 = [
  {title: '干员', align: 'start', sortable: false, key: 'charId'},
  {title: '持有率', sortable: true, key: 'ownRate'},
  {title: '精二率', sortable: true, key: 'eliteRank2'},
  {title: '一技能', sortable: true, key: 'skill1Rank3'},
  {title: '二技能', sortable: true, key: 'skill2Rank3'},
  {title: '三技能', sortable: true, key: 'skill3Rank3'},
  {title: 'X模组', sortable: true, key: 'modXRank3'},
  {title: 'Y模组', sortable: true, key: 'modYRank3'},
  {title: 'D模组', sortable: true, key: 'modDRank3'},
  {title: 'A模组', sortable: true, key: 'modARank3'},
]


let sortBy = ref([])

for (const item of headers2) {
  sortBy.value.push({
    key: item.key, order: 'asc'
  })
}


// 后端返回的数据为如下格式，下面的部分函数为格式化数据函数
// {
// count: 1-3级合计占比,
// rank0:0级、未开启占比，
// rank1:1级占比
// rank2:2级占比
// rank3:3级占比
// }

async function getCharStatisticsResult() {

  const data = await operatorProgressionStatisticsDataCache.getData();

  let {result, sampleSize, createTime} = data
  dataSampleSize.value = sampleSize;
  updateTimeText.value = dateFormat(createTime, 'yyyy-MM-dd HH:mm:ss');
  operatorsStatisticsList.value = result
  displayOperatorsList.value = filterOperatorList(operatorsStatisticsList.value)

}

function resultFormat(dividend, divisor) {
  if (dividend) {
    return formatNumber(dividend / divisor * 100, 1)
  } else {
    return 0
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


let operatorsStatisticsDetail = ref({})

let operatorsStatisticsDetailDialog = ref(false)

function openOperatorsStatisticsDetail(operator) {


  const {skill, equip, own} = operator
  const data = []

  for (let index = 0; index < 3; index++) {
    const info = skill[index]
    const num = index + 1
    const ranks = operator[`skill${num}`]

    const item = {
      label: info.name,
      type: 'skill',
      iconId: info.iconId,
      ranks: [
        formatNumber(ranks.rank1 * 100),
        formatNumber(ranks.rank2 * 100),
        formatNumber(ranks.rank3 * 100)
      ]
    }
    data.push(item)
  }

  for (const info of equip) {
    const ranks = operator[`mod${info.typeName2}`]
    const item = {
      label: info.uniEquipName,
      type: 'equip',
      iconId: info.typeIcon,
      ranks: [
        formatNumber(ranks.rank1 * 100),
        formatNumber(ranks.rank2 * 100),
        formatNumber(ranks.rank3 * 100)
      ]
    }
    data.push(item)
  }

  operatorsStatisticsDetail.value = data
  operatorsStatisticsDetailDialog.value = true

}

const detailHeader = [
  {title: '查看项目', sortable: false},
  {title: '图标', sortable: false},
  {title: '等级一', sortable: false},
  {title: '等级二', sortable: false},
  {title: '等级三', sortable: false}
]


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
      调查人数{{ dataSampleSize }}
    </v-chip>
    <v-chip color="primary">
      更新时间{{ updateTimeText }}
    </v-chip>

    <v-card class="rank-card">
      <v-card-subtitle>
        表格展示数据为技能专三率和模组3级开启率，点击干员的头像查看完整数据
      </v-card-subtitle>
      <v-data-table
          v-model:sort-by="sortBy"
          :headers="headers2"
          :items="displayOperatorsList"
          hide-default-footer
          items-per-page="-1"
          fixed-header
          height="100%"
          class="full-height-table">
        <template v-slot:item="{ item }">
          <tr @click="openOperatorsStatisticsDetail(item)">
            <td>
              <OperatorAvatar rounded :char-id="item.charId" :size="60"></OperatorAvatar>
            </td>
            <td>{{ item.ownRate }}%</td>
            <td>{{ item.eliteRank2 }}%</td>
            <td>{{ item.skill1Rank3 }}%</td>
            <td>{{ item.skill2Rank3 }}%</td>
            <td>{{ item.skill3Rank3 }}%</td>
            <td>{{ item.modXRank3 }}%</td>
            <td>{{ item.modYRank3 }}%</td>
            <td>{{ item.modDRank3 }}%</td>
            <td>{{ item.modARank3 }}%</td>
          </tr>
        </template>

      </v-data-table>
    </v-card>

    <v-dialog v-model="operatorsStatisticsDetailDialog" max-width="500">
      <v-card>
        <v-card-text>
          <v-data-table
              :headers="detailHeader"
              :items="operatorsStatisticsDetail"
              hide-default-footer
              items-per-page="-1">
            <template v-slot:item="{ item }">
              <tr>
                <td>{{ item.label }}</td>
                <td>
                  <EquipIcon :icon="item.iconId" :size="36" v-show="item.type==='equip'"></EquipIcon>
                  <SkillIcon size="40" :mobile-size="30" :border="true" :icon="`${item.iconId}`"
                             v-show="item.type==='skill'"></SkillIcon>
                </td>
                <td v-for="rank in item.ranks">
                  {{ rank }}%
                </td>
              </tr>
            </template>
          </v-data-table>
        </v-card-text>
      </v-card>
    </v-dialog>

  </div>
</template>

