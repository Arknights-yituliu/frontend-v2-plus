<script setup>
import {operatorTable} from "/src/utils/gameData.js";

import {onMounted, ref} from "vue";
import {splitMaterialByTier, statisticsOperatorInfo} from "/src/utils/survey/operatorStatistical.js";
import ItemImage from "/src/components/sprite/ItemImage.vue";
import {dateFormat} from "@/utils/dateUtil.js";

let operatorList = []

for (const charId in operatorTable) {
  operatorList.push(operatorTable[charId])
}

operatorList.sort((a, b) => a.data - b.data)


let listItemCollect = ref({})
let logList = ref([])

const T3ItemId = [
  "30013",
  "30023",
  "30033",
  "30043",
  "30053",
  "30063",
  "30073",
  "30083",
  "30093",
  "30103",
  "31013",
  "31023",
  "31033",
  "31043",
  "31053",
  "31063",
  "31073",
  "31083"
]

let T3Material = ref([])


// 按 date 分组并排序
function groupAndSortByDate(items) {
  // 创建一个 Map 来存储分组结果
  const groups = new Map();

  // 遍历集合，按 date 分组
  items.forEach(item => {
    const date = item.date;
    if (!groups.has(date)) {
      groups.set(date, []);
    }
    groups.get(date).push(item);
  });

  // 将 Map 转换为数组，并按 date 排序
  return Array.from(groups.entries())
      .map(([date, group]) => ({date, group}))
      .sort((a, b) => a.date - b.date);
}


function formatData(list) {

  let newList = []
  let index = 0
  for (const info of list) {

    index++
    const {charId, name, rarity, date} = info;
    if (rarity < 3) {
      continue
    }

    let formatData = {
      charId: charId,
      name: name,
      rarity: rarity,
      elite: 0,
      level: 0,
      mainSkill: 0,
      skill1: 0,
      skill2: 0,
      skill3: 0,
      modX: 0,
      modY: 0,
      modD: 0,
      date: date,
    }

    if (info.equip) {
      for (const item of info.equip) {
        const {typeName2} = item
        formatData[`mod${typeName2}`] = 3
      }
    }

    if (info.skill) {
      for (const index in info.skill) {
        formatData[`skill${(parseInt(index) + 1)}`] = 3
      }
    }

    if (rarity === 6) {
      formatData.elite = 2
      formatData.level = 90
      formatData.mainSkill = 7
    }
    if (rarity === 5) {
      formatData.elite = 2
      formatData.level = 80
      formatData.mainSkill = 7
    }
    if (rarity === 4) {
      formatData.elite = 2
      formatData.level = 70
      formatData.mainSkill = 7
    }
    if (rarity === 3) {
      formatData.elite = 1
      formatData.level = 55
      formatData.mainSkill = 7
    }
    newList.push(formatData)
  }


  return newList
}

let statisticsResult = []


function statistics(list) {

  let result = []

  list.sort((a, b) => b.rarity - a.rarity)


  const {itemCostCollect, logs} = statisticsOperatorInfo(list)
  logList.value = logs
  console.log(itemCostCollect)

  listItemCollect.value = splitMaterialByTier(3, itemCostCollect);


  for (const id in listItemCollect.value[2]) {
    const item = listItemCollect.value[2][id]
    if (T3ItemId.includes(item.id.toString())) {
      result.push(item)
    }
  }

  result.sort((a, b) => b.count - a.count)


  return result
}



const formatDataList = formatData(operatorList);

const groupData = groupAndSortByDate(formatDataList);


// for (const item of groupData) {
//   const result = statistics(item.group);
//   statisticsResult.push({
//     time: dateFormat(item.date),
//     date: item.date,
//     result: result
//   })
// }


let statisticsResultCount = statistics(formatDataList)




</script>
<template>
  <div>
    <div class="flex flex-wrap" style="width: 520px">
      <div v-for="item in statisticsResultCount" class="m-8">
        <ItemImage size="60" :item-id="item.id"></ItemImage>
        <div style="text-align: center">{{ item.count }}</div>
      </div>
    </div>
  </div>

  <div v-for="group in statisticsResult">
    <div>{{ group.time }}</div>
    <div class="flex flex-wrap" style="width: 520px">
      <div v-for="item in group.result" class="m-8">
        <ItemImage size="60" :item-id="item.id"></ItemImage>
        <div style="text-align: center">{{ item.count }}</div>
      </div>
    </div>
  </div>


</template>


<style>
.statistics-material-table {
  border-collapse: collapse;

  td {
    border: 1px solid black;
    padding: 12px;
  }

}


</style>