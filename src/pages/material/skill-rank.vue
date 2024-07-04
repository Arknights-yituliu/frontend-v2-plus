<script setup>
import ITEM_COST_TABLE from '/src/static/json/survey/operator_item_cost_table.json'
import OPERATOR_TABLE from '/src/static/json/survey/character_list.json'
import api from '/src/api/material.js'
import {onMounted, ref} from "vue";

const operatorMap = new Map()
for (const operator of OPERATOR_TABLE) {
  operatorMap.set(operator.charId, operator)
}

let skillCostRankList = ref([])

onMounted(() => {
  api.getItemValueTable(0.625).then(response => {
        const list = response.data
        const itemMap = new Map()

        for (const item of list) {
          itemMap.set(item.itemId, item.itemValueAp)
        }

        for (const charId in ITEM_COST_TABLE) {
          const {skills, allSkill} = ITEM_COST_TABLE[charId]

          const {rarity, name} = operatorMap.get(charId);

          if (rarity !== 5) {
            continue
          }

          let mainApCost = 0
          for (const rankCost of allSkill) {
            for (const itemId in rankCost) {
              const num = rankCost[itemId]
              if (itemMap.get(itemId)) {
                mainApCost += itemMap.get(itemId) * num
              }
            }
          }

          let index = 1
          for (const skill of skills) {
            let apCost = 0
            for (const rankCost of skill) {
              for (const itemId in rankCost) {
                const num = rankCost[itemId]
                if (itemMap.get(itemId)) {
                  apCost += itemMap.get(itemId) * num
                }
              }
            }
            skillCostRankList.value.push({
              charId: charId,
              name: name,
              apCost: apCost,
              skillIndex: index,
              rarity: rarity,
              mainApCost:mainApCost,
            })
            index++
          }

        }

        skillCostRankList.value.sort((a,b)=>{return b.apCost-a.apCost})

      }
  )
})

</script>


<template>

  <table class="table-114">
    <tbody>
    <tr>
      <td>干员</td>
      <td>星级</td>
      <td>通用技能等级消耗</td>
      <td>技能</td>
      <td>专三消耗理智</td>
    </tr>
    <tr v-for="(item,index) in skillCostRankList" :key="index">
      <td>{{ item.name }}</td>
      <td>{{ item.rarity }}</td>
      <td>{{ item.mainApCost.toFixed(3) }}</td>
      <td>S{{ item.skillIndex }}</td>
      <td>{{ item.apCost.toFixed(3) }}</td>
    </tr>
    </tbody>
  </table>


</template>

<style>
.table-114{
  border-collapse: collapse;
  text-align: center;
}

.table-114 td{
  padding: 4px;
  border: 1px solid black;
}
</style>