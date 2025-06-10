<script setup>
import composite_table from '/src/static/json/material/composite_table.v2.json'
import ytlStageInfo from '/src/static/json/material/ytl_stage_info.json'
import ItemImage from "@/components/sprite/ItemImage.vue";

const t5compositeTable = composite_table.filter(e => e.rarity === 5)
const t4compositeTable = composite_table.filter(e => e.rarity === 4)

const t3ItemNeed = {}
for (const itemId in ytlStageInfo) {
  t3ItemNeed[itemId] = {
    "30165": 0,
    "30155": 0,
    "30145": 0,
    "30135": 0,
    "30125": 0,
    "30115": 0
  }
}


const t4compositeTableMap = new Map()

for (const item of t4compositeTable) {
  t4compositeTableMap.set(item.itemId, item.pathway)
}

console.log(t4compositeTableMap)


for (const item of t5compositeTable) {
  const t5ItemId = item.itemId
  const t5Pathway = item.pathway
  for (const t4Item of t5Pathway) {
    const t4ItemId = t4Item.itemId
    const t4ItemCount = t4Item.count
    console.log(t4ItemId)
    const t4Pathway = t4compositeTableMap.get(t4ItemId);
    for (const t3Item of t4Pathway) {
      const t3ItemId = t3Item.itemId
      const t3ItemCount = t3Item.count
      t3ItemNeed[t3ItemId][t5ItemId] += t4ItemCount * t3ItemCount
    }
  }
}

function total(list){
  let total = 0
  for(const itemId in list){
    total+=list[itemId]
  }

  return total
}

console.log(t3ItemNeed)


</script>
<template>

  <table class="item-need-table">
    <thead>
    <tr>
      <th>

      </th>
      <th>
        <ItemImage :item-id="'30115'"></ItemImage>
      </th>
      <th>
        <ItemImage :item-id="'30125'"></ItemImage>
      </th>
      <th>
        <ItemImage :item-id="'30135'"></ItemImage>
      </th>
      <th>
        <ItemImage :item-id="'30145'"></ItemImage>
      </th>
      <th>
        <ItemImage :item-id="'30155'"></ItemImage>
      </th>
      <th>
        <ItemImage :item-id="'30165'"></ItemImage>
      </th>
      <th>
       总计
      </th>
    </tr>

    </thead>
    <tbody>
    <tr v-for="(list,itemId) in t3ItemNeed">
      <td>
        <ItemImage :item-id="itemId"></ItemImage>
      </td>
      <td v-for="(num,id) in list">
        {{num}}
      </td>
      <td>
        {{total(list)}}
      </td>
    </tr>
    </tbody>
  </table>

</template>

<style scoped>
.item-need-table{
  border-collapse: collapse;
  td,th{
    border:solid 1px black;
    text-align: center;
  }
}
</style>