<script setup>
import CHARACTER_TABLE from '/src/static/json/survey/character_table_simple.json'
import {ref} from "vue";
import {statisticsOperatorInfo, splitMaterialByTier} from "@/utils/survey/operatorStatistical.js";
import SpriteImage from "@/components/sprite/SpriteImage.vue";
import ItemImage from "/src/components/sprite/ItemImage.vue";
let listItemCollect = ref({})
let logList = ref([])

function statistics() {
  let list = []
  for (const charId in CHARACTER_TABLE) {
    const info = CHARACTER_TABLE[charId]
    _formatData(info)
  }
  list.sort((a, b) => b.rarity - a.rarity)

  console.table(list)
  const {itemCostCollect, logs} = statisticsOperatorInfo(list)
  logList.value = logs
  console.log(itemCostCollect)

  listItemCollect.value = splitMaterialByTier(5, itemCostCollect);


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





  <table v-for="(list,tier) in listItemCollect">
    <tbody>
    <tr v-for="(item,index) in list">
      <td>
        <ItemImage size="60" :item-id="item.id"></ItemImage>
      </td>
      <td>
        {{ item.count }}
      </td>
    </tr>
    </tbody>
  </table>

</template>


<style>
.log114514 {
  display: flex;flex-wrap: wrap;
  .cell114514 {
    display: block;
    width: 140px;
    padding: 4px 12px;
  }
}


</style>