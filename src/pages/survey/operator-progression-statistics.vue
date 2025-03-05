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


let operatorsStatisticsList = ref([]);
let userCountText = ref(0);
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


// 后端返回的数据为如下格式，下面的部分函数为格式化数据函数
// {
// count: 1-3级合计占比,
// rank0:0级、未开启占比，
// rank1:1级占比
// rank2:2级占比
// rank3:3级占比
// }

async function getCharStatisticsResult() {

  const data = await operatorProgressionStatisticsDataCache.getData('operatorProgressionStatisticsV2');

  let {result, userCount, updateTime} = data
  userCountText.value = userCount;
  updateTimeText.value = updateTime;
  for (const item of result) {
    let charInfo = operatorTable[item.charId]
    if (charInfo) {
      item.name = charInfo.name
      item.rarity = charInfo.rarity
      item.profession = charInfo.profession
      item.itemObtainApproach = charInfo.itemObtainApproach
      item.skill = charInfo.skill
      item.equip = charInfo.equip
      item.own = formatNumber(item.own * 100, 1)
      item.eliteS = formatNumber(item.elite.rank2 * 100, 1)
      item.skill1S = formatNumber(item.skill1.rank3 * 100, 1)
      item.skill2S = formatNumber(item.skill2.rank3 * 100, 1)
      item.skill3S = formatNumber(item.skill3.rank3 * 100, 1)
      item.modXS = formatNumber(item.modX.rank3 * 100, 1)
      item.modYS = formatNumber(item.modY.rank3 * 100, 1)
      item.modDS = formatNumber(item.modD.rank3 * 100, 1)
      item.modAS = formatNumber(item.modA.rank3 * 100, 1)
      item.available = true
      item.date = charInfo.date
    } else {
      item.available = false
    }
  }
  result = result.filter(e => e.name)

  operatorsStatisticsList.value = result

  displayOperatorsList.value = filterOperatorList(operatorsStatisticsList.value)

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


  const {skill, equip} = operator
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
        formatNumber(ranks.rank1 * 100, 1),
        formatNumber(ranks.rank2 * 100, 1),
        formatNumber(ranks.rank3 * 100, 1)
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
        formatNumber(ranks.rank1 * 100, 1),
        formatNumber(ranks.rank2 * 100, 1),
        formatNumber(ranks.rank3 * 100, 1)
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
      调查人数{{ userCountText }}
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
          items-per-page="-1">
        <template v-slot:item="{ item }">
          <tr @click="openOperatorsStatisticsDetail(item)">
            <td>
              <OperatorAvatar rounded :char-id="item.charId" :size="60"></OperatorAvatar>
            </td>
            <td>{{ item.own }}%</td>
            <td>{{ item.eliteS }}%</td>
            <td>{{ item.skill1S }}%</td>
            <td>{{ item.skill2S }}%</td>
            <td>{{ item.skill3S }}%</td>
            <td>{{ item.modXS }}%</td>
            <td>{{ item.modYS }}%</td>
            <td>{{ item.modDS }}%</td>
            <td>{{ item.modAS }}%</td>
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
                <td>{{item.label}}</td>
                <td>
                  <EquipIcon :icon="item.iconId"  :size="36"  v-show="item.type==='equip'"></EquipIcon>
                  <SkillIcon size="40" :mobile-size="30" :border="true" :icon="`${item.iconId}`" v-show="item.type==='skill'"></SkillIcon>
                </td>
                <td v-for="rank in item.ranks">
                  {{rank}}%
                </td>
              </tr>
            </template>
          </v-data-table>
        </v-card-text>
      </v-card>
    </v-dialog>

  </div>
</template>

