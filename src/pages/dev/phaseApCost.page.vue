<template>
  <table>
    <tbody>
      <tr>
        <td>干员</td>
        <td>星级</td>
        <td>消耗</td>
      </tr>
      <tr v-for="apCost in apCostList">
        <td>{{ apCost.name }}</td>
        <td>{{ apCost.rarity }}</td>
        <td>{{ apCost.apCost }}</td>
      </tr>
    </tbody>
  </table>
</template>

<script setup>
// import character_table from "@/static/json/survey/character_table.json";
import storeApi from "@/api/store";
import { onMounted, ref } from "vue";

let itemValue = ref({});

async function getItemValue() {
  await storeApi.findAllItem(0.625).then((response) => {
    for (const key in response.data) {
      const id = response.data[key].itemId;
      const value = response.data[key].itemValueAp;
      itemValue.value[id] = value;
    }
  });

  console.log(itemValue.value);
}

let apCostList = ref([]);

async function apCountCostCal() {
  await getItemValue();
  for (const key in character_table) {
    let apCost = 0;
    if (!key.startsWith("char")) continue;
    if (character_table[key].phases.length < 3) continue;
    console.log(character_table[key].name, character_table[key].rarity);
    apCost += apCostCal(character_table[key].phases[1].evolveCost);
    apCost += apCostCal(character_table[key].phases[2].evolveCost);
    apCostList.value.push({ name: character_table[key].name, rarity: character_table[key].rarity, apCost: apCost });
  }
}

function apCostCal(list) {
  let apCost = 0;
  for (const key in list) {
    const id = list[key].id;
    const count = list[key].count;
    if (itemValue.value[id] === undefined) {
      console.log(id);
      continue;
    }
    console.log(itemValue.value[id], "*", count);
    apCost += itemValue.value[id] * count;
  }

  return apCost;
}

onMounted(() => {
  apCountCostCal();
});
</script>
