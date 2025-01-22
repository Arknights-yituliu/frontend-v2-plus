<script setup>
import {operatorTable} from "/src/utils/gameData.js";

import {ref} from "vue";
import {statisticsOperatorInfo, splitMaterialByTier} from "@/utils/survey/operatorStatistical.js";
import ItemImage from "/src/components/sprite/ItemImage.vue";

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

function statistics() {
  let list = []
  for (const charId in operatorTable) {
    const info = operatorTable[charId]
    _formatData(info)
  }
  list.sort((a, b) => b.rarity - a.rarity)


  const {itemCostCollect, logs} = statisticsOperatorInfo(list)
  logList.value = logs


  listItemCollect.value = splitMaterialByTier(3, itemCostCollect);



  for (const id in listItemCollect.value[2]) {
    const item = listItemCollect.value[2][id]
    if (item.id > 30000) {
      T3Material.value.push(item)
    }
  }

  T3Material.value.sort((a,b)=> b.count-a.count)


  function _formatData(info) {

    const {charId, name, rarity} = info;
    if (rarity < 3) {
      return
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
      modD: 0
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

    list.push(formatData)
  }
}


statistics()

</script>
<template>


  <div class="flex flex-wrap" style="width: 520px">
    <div v-for="(item,index) in T3Material" v-show="T3ItemId.includes(item.id)" class="m-8">
      <ItemImage size="60" :item-id="item.id"></ItemImage>
      <div style="text-align: center">{{ item.count }}</div>
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