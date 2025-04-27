<script setup>
import {ref} from "vue";
import ItemImage from "/src/components/sprite/ItemImage.vue";
import equipUpdateTime from '/src/static/json/operator/equip_update_time.json'
import {dateFormat, formatDateString} from "@/utils/dateUtil.js";
import operatorTableSimple from '/src/static/json/operator/character_table_simple.json'
import operatorUpdateTime from '/public/json/operator_update_time.json'
import operatorItemCostTable from '/src/static/json/operator/operator_item_cost_table.json'
import compositeTableJson from '/src/static/json/material/composite_table.v2.json'
import OperatorAvatar from "@/components/sprite/OperatorAvatar.vue";
import EquipIcon from "@/components/sprite/EquipIcon.vue";
import itemInfo from '/src/static/json/material/item_info.json'
import deepClone from "@/utils/deepClone.js";

let compositeTable = {}
for (const item of compositeTableJson) {
  const {itemId, resolve, pathway, rarity} = item
  compositeTable[itemId] = {resolve, pathway, rarity}
}


let itemNameMap = new Map()
for (const item of itemInfo) {
  itemNameMap.set(item.itemId, item.itemName)
}

let itemIdList = ["30013", "30014", "30023", "30024", "30033", "30034",
  "30043", "30044", "30053", "30054", "30063", "30064", "30073", "30074",
  "30083", "30084", "30093", "30094", "30103", "30104", "30115", "30125",
  "30135", "30145", "30155", "30165", "31013", "31014", "31023", "31024",
  "31033", "31034", "31043", "31044", "31053", "31054", "31063", "31064",
  "31073", "31074", "31083", "31084", "31093", "31094"]


// for (const itemId in itemSeries) {
//   const {series} = itemSeries[itemId];
//   for (const r in series) {
//     itemIdList.push(series[r])
//   }
// }

let itemCostMap = new Map()

itemIdList.sort((a, b) => a - b)


let operatorAndEquipCollectByDate = new Map()

let equipUpdateTimeMap = new Map()

for (const item of equipUpdateTime) {
  const {equipName, updateTime} = item
  equipUpdateTimeMap.set(equipName, updateTime)
}

const regex = /^3\d{4}$/;

for (const charId in operatorTableSimple) {
  const operatorTableSimpleElement = operatorTableSimple[charId];
  const {name, equip} = operatorTableSimpleElement
  const operatorItemCostTableElement = operatorItemCostTable[charId];
  if (!operatorItemCostTableElement) {
    continue
  }
  const {skills, allSkill, elite} = operatorItemCostTableElement
  let operatorUpdateTimeElement = operatorUpdateTime[name]
  let updateTime = new Date()
  let updateTimeText = dateFormat(new Date())
  if (operatorUpdateTimeElement) {
    updateTime = new Date(operatorUpdateTimeElement.updateTime)
    updateTimeText = dateFormat(updateTime)
  }
  let collect = operatorAndEquipCollectByDate.get(updateTimeText);
  if (!collect) {
    collect = {
      updateTime: updateTime.getTime(),
      operator: [],
      equip: [],
      itemCost: new Map()
    }
  }

  collect.operator.push(charId)

  const list = [allSkill, elite]

  for (const table of list) {
    if (!table) {
      continue
    }
    for (const item of table) {
      for (const itemId in item) {

        if (regex.test(itemId)) {
          const cost = item[itemId];
          let oldValue = collect.itemCost.get(itemId);
          oldValue = oldValue ? oldValue : 0
          collect.itemCost.set(itemId, oldValue + cost)

          let allCount = itemCostMap.get(itemId);
          allCount = allCount ? allCount : 0
          itemCostMap.set(itemId, allCount + cost)


        }
      }
    }
  }

  if (skills) {

    for (const skill of skills) {

      for (const item of skill) {
        for (const itemId in item) {
          if (regex.test(itemId)) {
            const cost = item[itemId];
            let oldValue = collect.itemCost.get(itemId);
            oldValue = oldValue ? oldValue : 0
            collect.itemCost.set(itemId, oldValue + cost)

            let allCount = itemCostMap.get(itemId);
            allCount = allCount ? allCount : 0
            itemCostMap.set(itemId, allCount + cost)
          }
        }
      }
    }
  }
  operatorAndEquipCollectByDate.set(updateTimeText, collect)


  if (equip) {
    let lastTime = ''
    for (const item of equip) {
      let {uniEquipName, typeIcon, itemCost} = item
      let updateTimeText1 = equipUpdateTimeMap.get(uniEquipName)
      if (updateTimeText1) {
        updateTimeText1 = formatDateString(updateTimeText1)
        lastTime = updateTimeText1
      } else {
        console.log(uniEquipName)
        updateTimeText1 = lastTime
      }

      const updateTime1 = new Date(updateTimeText1 + " 12:00:00")

      let collect1 = operatorAndEquipCollectByDate.get(updateTimeText1);
      if (!collect1) {
        collect1 = {
          updateTime: updateTime1.getTime(),
          operator: [],
          equip: [],
          itemCost: new Map()
        }
      }
      collect1.equip.push(typeIcon)

      for (const obj of itemCost) {
        for (const itemId in obj) {
          if (regex.test(itemId)) {
            const cost = obj[itemId];
            let oldValue = collect1.itemCost.get(itemId);
            oldValue = oldValue ? oldValue : 0
            collect1.itemCost.set(itemId, oldValue + cost)

            let allCount = itemCostMap.get(itemId);
            allCount = allCount ? allCount : 0

            itemCostMap.set(itemId, allCount + cost)
          }
        }
      }
      operatorAndEquipCollectByDate.set(updateTimeText1, collect1)

    }
  }

}


let itemCostList = ref([])

for (const [key, value] of operatorAndEquipCollectByDate) {
  const {updateTime, operator, equip, itemCost} = value

  let list = []

  for (const itemId of itemIdList) {
    let count = itemCost.get(itemId);
    count = count ? count : 0;
    list.push({
      itemId,
      count: count
    })

  }

  itemCostList.value.push({
    updateTime, operator, equip, list
  })
}

itemCostList.value.sort((a, b) => b.updateTime - a.updateTime)
console.log(itemCostList.value)


let r3ItemCostMap = new Map()

function splitItem(map){
  let copyMap = new Map(map)
  for (const [itemId, value] of copyMap) {
    const compositeTableElement = compositeTable[itemId];
    if (!compositeTableElement) {
      r3ItemCostMap.set(itemId, value)
      continue
    }

    const {resolve, pathway, rarity} = compositeTableElement
    if (rarity === 5) {
      for (const item of pathway) {
        let oldValue = copyMap.get(item.itemId);
        oldValue = oldValue ? oldValue : 0
        copyMap.set(item.itemId, oldValue + item.count * value)

      }
    }
  }


  for (const [itemId, value] of copyMap) {
    const compositeTableElement = compositeTable[itemId];
    if (!compositeTableElement) {

      continue
    }

    const {resolve, pathway, rarity} = compositeTableElement

    if (rarity === 4) {
      for (const item of pathway) {
        let oldValue = r3ItemCostMap.get(item.itemId);
        oldValue = oldValue ? oldValue : 0
        r3ItemCostMap.set(item.itemId, oldValue + item.count * value)
      }
    }
  }
}

splitItem(itemCostMap)


</script>
<template>
  <div class="statistics-material">


    <h2>原始材料需求</h2>
    <div style="display: flex;flex-wrap: wrap;">

      <div style="text-align: center;margin:8px" v-for="[key,value] in itemCostMap">
        <ItemImage :item-id="key"></ItemImage>
        {{ value }}
      </div>
    </div>

    <h2>拆解为蓝材料后的需求</h2>
    <div style="display: flex">
      <div style="text-align: center;margin:8px" v-for="[key,value] in r3ItemCostMap">
        <ItemImage :item-id="key"></ItemImage>
        {{ value }}
      </div>
    </div>

    <h2>按日期分类的材料需求</h2>
    <div class="item-div-table">
      <div>
        <div class="item-div-table-header"></div>
        <div v-for="itemId in itemIdList" class="item-image">
          <ItemImage :item-id="itemId"></ItemImage>
        </div>
      </div>
      <div v-for="table in itemCostList">
        <div class="item-div-table-header">
          <OperatorAvatar :size="36" :char-id="charId" v-for="charId in table.operator"></OperatorAvatar>
          <EquipIcon :size="30" :icon="icon" v-for="icon in table.equip"></EquipIcon>
        </div>
        <div v-for="item in table.list" class="item-count">
          {{ item.count }}
        </div>
      </div>
    </div>
    <h2>按日期分类的材料需求</h2>
    <table class="item-table">
      <tbody>
      <tr>
        <td>
        </td>
        <td v-for="itemId in itemIdList">
          <!--          <ItemImage :size="30" :item-id="itemId"></ItemImage>-->
          {{ itemNameMap.get(itemId) }}
        </td>
      </tr>
      <tr v-for="table in itemCostList">
        <td>
          {{ dateFormat(table.updateTime) }}
        </td>
        <td v-for="item in table.list">
          {{ item.count }}
        </td>
      </tr>
      </tbody>
    </table>


  </div>
</template>


<style>
.statistics-material {

  .item-table {
    border-collapse: collapse;

    td {
      border: 1px solid #646464;
      text-align: center;
      padding: 4px;
    }
  }


  .item-image {
    width: 40px;
    height: 40px;
  }

  .item-div-table {
    display: flex;
    width: 100%;
    padding: 4px;
    overflow-x: scroll;
    overflow-y: hidden;
  }


  .item-div-table-header {
    border: 1px solid #646464;
    width: 120px;
    height: 200px;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
  }

  .item-count {
    border: 1px solid #646464;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

}


</style>