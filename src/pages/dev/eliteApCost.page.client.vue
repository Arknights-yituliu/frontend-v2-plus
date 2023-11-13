<template>
  <table class="ap_cost_table">
    <tbody>
      <tr>
        <td>干员</td>
        <td>星级</td>
        <td>消耗</td>
      </tr>
      <tr v-for="(apCost,index) in apCostList" :key="index">
        <td>{{ apCost.name }}</td>
        <td>{{ apCost.rarity }}</td>
        <td>{{ apCost.apCost.toFixed(2) }}</td>
      </tr>
    </tbody>
  </table>
</template>

<script setup>
import stageApi from "/src/api/stage";
import {onMounted, ref} from "vue";
import item_cost_table from '/src/static/json/survey/operator_item_cost_table.json'
import character_table from '/src/static/json/survey/character_table_simple.json'

let item_value_map = ref({});

async function getItemValue() {
  await stageApi.findAllItem(0.625).then((response) => {
    for (const key in response.data) {
      const id = response.data[key].itemId;
      item_value_map.value[id] = response.data[key].itemValueAp;
    }
  });
  console.log(item_value_map)
}

let apCostList = ref([]);

async function eliteApCostCal() {
  await getItemValue();
  for(const charId in character_table){
    let  apCost = 0
    const character = character_table[charId]
    const rarity =  character.rarity
    const name = character.name
    if(rarity <5) continue
    const item_cost = item_cost_table[charId];
    if(item_cost==void 0) continue
    for(const eliteRank of item_cost.elite){
      // console.log(eliteRank)
      for(let item_id in eliteRank){
        // console.log(item_id)
        const value = item_value_map.value[item_id]
        // console.log(value)
        if(value !== void 0) apCost += (value*eliteRank[item_id])
      }
    }

    apCostList.value.push({
      charId:charId,
      name:name,
      apCost:apCost,
      rarity:rarity
    })
  }

  apCostList.value.sort((a,b)=>b.rarity-a.rarity)
}



onMounted(() => {
  eliteApCostCal()
});
</script>

<style scoped>
.ap_cost_table{
  margin: auto;
  border-collapse: collapse;
  text-align: center;
}

.ap_cost_table td{
  border: 1px solid black;
  padding: 4px 12px;
}
</style>
