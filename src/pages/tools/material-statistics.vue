<script setup>
import {onMounted, ref} from "vue";
import ItemImage from "/src/components/sprite/ItemImage.vue";
import equipUpdateTime from '/src/static/json/operator/equip_update_time.json'
import {dateFormat, formatDateString} from "@/utils/dateUtil.js";
import operatorTableSimple from '/src/static/json/operator/character_table_simple.json'
import OperatorUpdateTime from '/public/json/operator_update_time.json'
import operatorItemCostTable from '/src/static/json/operator/operator_item_cost_table.json'
import compositeTableJson from '/src/static/json/material/composite_table.v2.json'
import itemInfo from '/src/static/json/material/item_info.json'


let activeTab = ref('1')

let compositeTable = {}
for (const item of compositeTableJson) {
  const {itemId, resolve, pathway, rarity} = item
  compositeTable[itemId] = {resolve, pathway, rarity}
}

const regex = /^3\d{4}$/;


let itemInfoList = []
let itemInfoMap = new Map()
let r3MapTemplate = new Map()
let r3ItemIdList = []
let updateTimeList = []

for (const item of itemInfo) {
  itemInfoMap.set(item.itemId, item)
  if (regex.test(item.itemId)) {
    itemInfoList.push(item)
    if (item.rarity === 3) {
      r3MapTemplate.set(item.itemId, 0)
      r3ItemIdList.push(item)
    }
  }
}


const itemColor = [
  {
    itemId: '30073',
    color: '#f37127',
    itemName: "扭转醇"
  },
  {
    itemId: '30083',
    color: '#623fff',
    itemName: "轻锰矿"
  },
  {
    itemId: '30093',
    color: '#c9726e',
    itemName: "研磨石"
  }
]

r3ItemIdList.sort((a, b) => a.itemId - b.itemId)


//材料消耗表
let mapItemCostStatistics = new Map()
let listItemCostStatistics = []

//根据实装时间将干员和模组分类
let operatorAndEquipCollectByDate = new Map()

//模组更新时间表
let equipUpdateTimeMap = new Map()

//将模组更新时间格式化到equipUpdateTimeMap
for (const item of equipUpdateTime) {
  const {equipName, updateTime} = item
  equipUpdateTimeMap.set(equipName, updateTime)
}


//根据更新时间计算材料消耗数量
for (const charId in operatorTableSimple) {
  //干员信息
  const operatorTableSimpleElement = operatorTableSimple[charId];
  const {name, equip} = operatorTableSimpleElement
  //干员材料消耗
  const operatorItemCostTableElement = operatorItemCostTable[charId];
  if (!operatorItemCostTableElement) {
    continue
  }
  //干员专精，通用技能，精英化材料消耗信息
  const {skills, allSkill, elite} = operatorItemCostTableElement
  //从干员实装时间表中取出的干员更新时间
  let operatorUpdateTimeElement = OperatorUpdateTime[charId]
  //干员更新时间默认值为当前时间
  let operatorUpdateTime = new Date()
  //干员更新时间的格式化字符串默认为当前时间
  let operatorUpdateTimeText = dateFormat(new Date())
  //如果实装时间表中有当前干员的更新时间，将默认值替换为实装时间表中记录的值
  if (operatorUpdateTimeElement) {
    operatorUpdateTime = new Date(operatorUpdateTimeElement.updateTime)
    operatorUpdateTimeText = dateFormat(operatorUpdateTime)
  }
  //根据干员更新时间的格式化字符串获取对应时间的材料消耗记录对象
  let collectByOperator = operatorAndEquipCollectByDate.get(operatorUpdateTimeText);
  //如果对象不存在，新建一个
  if (!collectByOperator) {
    collectByOperator = {
      updateTime: operatorUpdateTime.getTime(),
      updateTimeText: operatorUpdateTimeText,
      operator: [],
      equip: [],
      itemCost: new Map()
    }
  }

  //记录对应时间实装的干员
  collectByOperator.operator.push(charId)

  const list = [allSkill, elite]

  //统计材料消耗
  for (const table of list) {
    if (!table) {
      continue
    }
    for (const item of table) {
      for (const itemId in item) {

        if (regex.test(itemId)) {
          const cost = item[itemId];
          let oldValue = collectByOperator.itemCost.get(itemId);
          oldValue = oldValue ? oldValue : 0
          collectByOperator.itemCost.set(itemId, oldValue + cost)

          _updateItemCostStatisticsMap(itemId, cost)
        }
      }
    }
  }

  //统计材料消耗
  if (skills) {
    for (const skill of skills) {
      for (const item of skill) {
        for (const itemId in item) {
          if (regex.test(itemId)) {
            const cost = item[itemId];
            let oldValue = collectByOperator.itemCost.get(itemId);
            oldValue = oldValue ? oldValue : 0
            collectByOperator.itemCost.set(itemId, oldValue + cost)
            _updateItemCostStatisticsMap(itemId, cost)
          }
        }
      }
    }
  }

  operatorAndEquipCollectByDate.set(operatorUpdateTimeText, collectByOperator)


  if (equip) {
    let lastTime = ''
    for (const item of equip) {
      let {uniEquipName, typeIcon, itemCost} = item
      let equipUpdateTimeText = equipUpdateTimeMap.get(uniEquipName)
      if (equipUpdateTimeText) {
        equipUpdateTimeText = formatDateString(equipUpdateTimeText)
        lastTime = equipUpdateTimeText
      } else {
        console.log(uniEquipName)
        equipUpdateTimeText = lastTime
      }

      const equipUpdateTime = new Date(equipUpdateTimeText + " 16:00:00")

      let collectByEquip = operatorAndEquipCollectByDate.get(equipUpdateTimeText);
      if (!collectByEquip) {
        collectByEquip = {
          updateTime: equipUpdateTime.getTime(),
          operator: [],
          equip: [],
          itemCost: new Map()
        }
      }
      collectByEquip.equip.push(typeIcon)

      for (const obj of itemCost) {
        for (const itemId in obj) {
          if (regex.test(itemId)) {
            const cost = obj[itemId];
            let oldValue = collectByEquip.itemCost.get(itemId);
            oldValue = oldValue ? oldValue : 0
            collectByEquip.itemCost.set(itemId, oldValue + cost)

            _updateItemCostStatisticsMap(itemId, cost)
          }
        }
      }
      operatorAndEquipCollectByDate.set(equipUpdateTimeText, collectByEquip)

    }
  }

  /**
   * 更新全干员统计消耗
   * @param itemId 材料id
   * @param cost 消耗个数
   * @private
   */
  function _updateItemCostStatisticsMap(itemId, cost) {
    let allCount = mapItemCostStatistics.get(itemId);
    allCount = allCount ? allCount : 0
    mapItemCostStatistics.set(itemId, allCount + cost)
  }
}


for (const [k, v] in operatorAndEquipCollectByDate) {
  updateTimeList.push(v.updateTime)
}

updateTimeList.sort((a, b) => a - b)


for (const [key, value] of mapItemCostStatistics) {
  const {rarity} = itemInfoMap.get(key)
  listItemCostStatistics.push({
    itemId: key,
    count: value,
    rarity
  })
}

listItemCostStatistics.sort((a, b) => b.rarity - a.rarity)


let listDisplayItem = ref([])
let itemCostTableData = ref([])
let itemCostTableHeader = ref([])

/**
 * 选择材料展示材料消耗
 * @param index
 */
function selectItem(index) {
  itemInfoList[index].display = !itemInfoList[index].display
  listDisplayItem.value = []

  //被选择的材料写入到材料展示对象
  for (const item of itemInfoList) {
    if (item.display) {
      listDisplayItem.value.push({
        itemId: item.itemId,
        itemName: item.itemName,
        list: []
      })
    }
  }


  let dateLength = 0;
  const startTime = new Date('2024/01/01 00:00:00').getTime()
  for (const item of listDisplayItem.value) {
    item.list = getItemCostByItemId(item)
    dateLength = item.list.length
  }

  itemCostTableData.value = []
  itemCostTableHeader.value = ['日期']
  for (const item of listDisplayItem.value) {
    itemCostTableHeader.value.push(item.itemId)
  }

  for (let i = 0; i < listDisplayItem.value.length; i++) {
    for (let t = 0; t < dateLength; t++) {
      if (!itemCostTableData.value[t]) {
        itemCostTableData.value[t] = []
      }
      const {list} = listDisplayItem.value[i]
      if (i === 0) {
        console.log(list[t].updateTime)
        itemCostTableData.value[t].push(dateFormat(list[t].updateTime))
      }
      itemCostTableData.value[t].push(list[t].count)
    }
  }


  // console.log(itemCostTableData.value)

  const timeRange = updateTimeList.filter(e => e > startTime && e < Date.now())
  const params = {itemList: listDisplayItem.value, timeRange: timeRange, startTime: startTime, endTime: Date.now()}
  // createLineChart(params)
}

function itemOptionStatus(display) {
  if (!display) {
    return 'not-selected'
  }
}


function getItemCostByItemId(item) {
  let list = []
  for (const [key, value] of operatorAndEquipCollectByDate) {
    const {updateTime, itemCost} = value
    let count = 0
    if (itemCost.get(item.itemId)) {
      count = itemCost.get(item.itemId)
    }
    list.push({
      updateTime,
      count: count,
    })
  }

  list.sort((a, b) => b.updateTime - a.updateTime)
  return list
}


//将按版本分类的材料拆解为三级材料
let r3ItemCostList = splitItem(mapItemCostStatistics)
let r3ItemCostListByDate = []

for (const [key, value] of operatorAndEquipCollectByDate) {
  const {updateTime, itemCost} = value
  const r3List = splitItem(itemCost)
  let count = 0
  for (const item of r3List) {
    count += item.count
  }

  for (const item of r3List) {
    item.rate = item.count / count
  }

  r3ItemCostListByDate.push({
    updateTime,
    list: r3List
  })


}

r3ItemCostListByDate.sort((a, b) => b.updateTime - a.updateTime)
console.log(r3ItemCostListByDate)


function splitItem(map) {

  let copyMap = new Map(map)

  let tempMap = new Map(r3MapTemplate)

  for (const [itemId, value] of copyMap) {
    if (tempMap.get(itemId) === 0) {
      tempMap.set(itemId, value)
      // console.log(itemInfoMap.get(itemId).itemName, '：', tempMap.get(itemId))
    }
    const compositeTableElement = compositeTable[itemId];
    if (!compositeTableElement) {
      continue
    }


    const {pathway, rarity} = compositeTableElement

    if (rarity === 5) {
      for (const item of pathway) {
        let oldValue = copyMap.get(item.itemId);
        oldValue = oldValue ? oldValue : 0
        copyMap.set(item.itemId, oldValue + item.count * value)
        // console.log(itemInfoMap.get(itemId).itemName, ':', value, '*', item.count, '==', itemInfoMap.get(item.itemId).itemName, '--->', copyMap.get(item.itemId))
      }
    }
  }

  // console.log(tempMap)


  for (const [itemId, value] of copyMap) {
    const compositeTableElement = compositeTable[itemId];
    if (!compositeTableElement) {
      continue
    }

    const {pathway, rarity} = compositeTableElement

    if (rarity === 4) {
      for (const item of pathway) {
        let oldValue = tempMap.get(item.itemId);
        oldValue = oldValue ? oldValue : 0
        tempMap.set(item.itemId, oldValue + item.count * value)

        // console.log(itemInfoMap.get(itemId).itemName, ':', value, '*', item.count, '==', itemInfoMap.get(item.itemId).itemName, '--->', tempMap.get(item.itemId))
      }
    }
  }

  let list = []

  for (const itemId of tempMap.keys()) {
    list.push({
      itemId: itemId,
      itemName: itemInfoMap.get(itemId).itemName,
      count: tempMap.get(itemId)
    })
  }

  list.sort((a, b) => a.itemId - b.itemId)

  return list
}

let lineChart = void 0;


function createLineChart(params) {

  const lineData = _initLineData(params);
  // console.log(lineData)
  const option = {

    title: {
      text: 'Stacked Line'
    },
    tooltip: {
      trigger: 'axis'
    },
    legend: {
      data: lineData.legendData
    },
    xAxis: {
      type: 'category',
      boundaryGap: false, // 设置为false使图表从轴的起点开始
      data: lineData.xData
    },
    yAxis: {
      type: 'value'
    },
    series: lineData.yData
  };

  lineChart.setOption(option)


  function _initLineData(params) {
    const {itemList, timeRange, startTime, endTime} = params

    const yData = []
    const xData = timeRange


    const legendData = []

    let offset = 0
    for (const item of itemList) {
      legendData.push(item.itemName)
      const list = getItemCostByItemId(item)
      const data = []
      for (const el of list) {
        if (el.updateTime > startTime && el.updateTime <= endTime) {
          data.push(el.count)
        }
      }
      const lastIndex = data.length - 1
      yData.push({
        data: data,
        name: item.itemName,
        type: 'line',
        markPoint: {
          data: [{
            type: 'image',
            coord: [0, data[0]], // 初始位置，需根据实际最后一个点动态调整
            symbol: `image://https://cos.yituliu.cn/image2/item/${item.itemId}.png`,
            symbolSize: [50, 50],
            symbolOffset: [offset * 10, 0]
          }]
        }
      })
      offset++
    }
    return {
      xData,
      yData,
      legendData
    }
  }


}


function loadingLine() {

  let dateList = []
  const startTimeStamp = new Date('2024/01/01 00:00:00')
  for (const [key, value] of operatorAndEquipCollectByDate) {
    const {updateTime, itemCost} = value
    if (updateTime > startTimeStamp) {

      dateList.push(updateTime)
    }
  }

  dateList.sort((a, b) => a - b)


  const itemList = [
    {
      itemId: '30073',
      itemName: '扭转醇'
    },
    {
      itemId: '30074',
      itemName: '白马醇'
    },
    {
      itemId: '30083',
      itemName: '轻锰矿'
    },
    {
      itemId: '30084',
      itemName: '三水锰矿'
    }
  ]

  let index = 1
  const timeRange = [dateFormat(startTimeStamp)]


  const intervalId = setInterval(() => {
    timeRange.push(dateFormat(dateList[index]))
    if (dateList[index]) {
      console.log(dateList[index])
      const params = {itemList: itemList, timeRange: timeRange, startTime: startTimeStamp, endTime: dateList[index]}
      createLineChart(params)
    } else {
      clearInterval(intervalId)
    }

    index++

  }, 30)


}

onMounted(() => {
  // const chartDom = document.getElementById('material-statistics-line');
  // lineChart = echarts.init(chartDom)
  // loadingLine()
})

</script>
<template>
  <div class="statistics-material">
    <v-tabs v-model="activeTab" bg-color="primary">
      <v-tab value="1">未拆解材料需求</v-tab>
      <v-tab value="2">未拆解材料需求(按版本)</v-tab>
      <v-tab value="3">拆解后材料需求</v-tab>
      <v-tab value="4">拆解后材料需求(按版本)</v-tab>
      <!--      <v-tab value="RollSeed" >Roll种子</v-tab>-->
    </v-tabs>


    <v-tabs-window v-model="activeTab">
      <v-tabs-window-item value="1">
        <div style="display: flex;flex-wrap: wrap;">
          <div style="text-align: center;margin:8px" v-for="item in listItemCostStatistics">
            <ItemImage :item-id="item.itemId" :size="60"></ItemImage>
            {{ item.count }}
          </div>
        </div>
      </v-tabs-window-item>

      <v-tabs-window-item value="2">
        <div class="flex flex-wrap">
          <ItemImage :item-id="el.itemId" :size="60" v-for="(el,index) in itemInfoList" @click="selectItem(index)"
                     :class="itemOptionStatus(el.display)"></ItemImage>
        </div>

        <table class="item-table">
          <tbody>
          <tr>
            <th v-for="(item,index) in itemCostTableHeader">
              <ItemImage :item-id="item" :size="50" :mobile-size="50" class="m-a" v-show="index>0"></ItemImage>
            </th>
          </tr>
          <tr v-for="list in itemCostTableData">
            <td v-for="item in list">
              {{ item }}
            </td>
          </tr>
          </tbody>
        </table>
      </v-tabs-window-item>

      <v-tabs-window-item value="3">
        <div style="display: flex;flex-wrap: wrap">
          <div style="text-align: center;margin:8px" v-for="item in r3ItemCostList">
            <ItemImage :item-id="item.itemId" :size="60" :mobile-size="60"></ItemImage>
            {{ item.count }}
          </div>
        </div>
      </v-tabs-window-item>

      <v-tabs-window-item value="4">
        <table class="item-table">
          <tbody>
          <tr>
            <th></th>
            <th v-for="item in r3ItemIdList">
              <ItemImage :item-id="item.itemId" :size="50" :mobile-size="50" class="m-a"></ItemImage>
            </th>
          </tr>
          <tr v-for="r3List in r3ItemCostListByDate">
            <td>{{ dateFormat(r3List.updateTime) }}</td>
<!--            <td>{{ r3List.updateTime }}</td>-->
            <td v-for="item in r3List.list">
              {{ item.count }}
              <!--          {{formatNumber(item.rate*100)}}%-->
            </td>

          </tr>
          </tbody>
        </table>
      </v-tabs-window-item>

    </v-tabs-window>

  </div>
</template>


<style>
.statistics-material {

  .item-table {
    border-collapse: collapse;

    td, th {
      border: 1px solid #646464;
      text-align: center;
      padding: 4px;
    }
  }

  .div-table {

  }

  .div-table-td {

    text-align: center;
    border: 1px solid #646464;
  }

  .div-table-td {

    text-align: center;
    border: 1px solid #646464;
  }

  .div-table div:nth-child(n+1):nth-child(odd) {
    background-color: rgb(var(--c-theme-primary));
    color: rgb(var(--c-theme-on-primary));
  }

  .not-selected {
    filter: grayscale(100%);
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