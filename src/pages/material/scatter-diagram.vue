<script setup>
import ITEM_COST_TABLE from '/src/static/json/survey/operator_item_cost_table.json'
import OPERATOR_TABLE from '/src/static/json/survey/character_list.json'
import materialAPI from '/src/api/material.js'
import operatorAPI from '/src/api/operatorData.js'
import {onMounted, ref} from "vue";
import {dataFormat} from "/src/utils/DateUtil.js";
import SpriteImage from "/src/components/SpriteImage.vue";
import {createPopover, popoverOnOpen} from "/src/utils/Popover.js";
import {getViewportInfo} from "/src/utils/GetViewportInfo.js";

const operatorMap = new Map()
const charIdMap = new Map()

for (const operator of OPERATOR_TABLE) {
  operatorMap.set(operator.charId, operator)
  charIdMap.set(operator.charId, operator.charId)
}




let operatorCoordinate = ref([])
let axisValue = ref({xAxisMax: 0, xAxisMin: 0})

async function initData(size = 800) {

  const element = document.getElementById("scatter-diagram")

  element.style.height = `${size + 40}px`
  element.style.width = `${size + 40}px`

  let skillCostRankList = []

  const itemMap = new Map()

  await materialAPI.getItemValueTable(0.625).then(response => {
    const list = response.data
    for (const item of list) {
      itemMap.set(item.itemId, item.itemValueAp)
    }
  })

  const skillRankRatioMap = new Map()

  await operatorAPI.getCharStatisticsResult().then(response => {
    const result = response.data.result;

    for (const item of result) {
      const {charId, skill1, skill2, skill3} = item
      skillRankRatioMap.set(`${charId}S1`, skill1.rank3)
      skillRankRatioMap.set(`${charId}S2`, skill2.rank3)
      skillRankRatioMap.set(`${charId}S3`, skill3.rank3)
    }
  })

  let max = 0
  let min = 114514
  for (const charId in ITEM_COST_TABLE) {
    const {skills, allSkill} = ITEM_COST_TABLE[charId]

    const {rarity, name, date,skill} = operatorMap.get(charId);

    if (rarity !== 6) {
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
    for (const s of skills) {
      let apCost = 0
      for (const rankCost of s) {
        for (const itemId in rankCost) {
          const num = rankCost[itemId]
          if (itemMap.get(itemId)) {
            apCost += itemMap.get(itemId) * num
          }
        }
      }

      const skillName = skill[index-1].name

      const proportion = skillRankRatioMap.get(`${charId}S${index}`) ? skillRankRatioMap.get(`${charId}S${index}`) : 0

      if (apCost > max) {
        max = apCost
      }
      if (apCost < min) {
        min = apCost
      }


      const skillItem = {
        charId: charId,
        name: name,
        apCost: apCost,
        skillIndex: index,
        skillName:skillName,
        rarity: rarity,
        mainApCost: mainApCost,
        proportion: proportion,
        time: dataFormat(new Date(date))
      }

      skillCostRankList.push(skillItem)
      index++
    }

  }


  skillCostRankList.sort((a, b) =>{ return  a.apCost - b.apCost })

  const difference = max - min
  axisValue.value.xAxisMax = max
  axisValue.value.xAxisMin = min

  let num = 1
  for (const item of skillCostRankList) {
    const percent = (item.apCost - min) / difference
    // item.xAxis = num / 297 * size
    item.xAxis = percent * size
    item.yAxis = (1 - item.proportion) * size
    num++

  }

  operatorCoordinate.value = skillCostRankList


}


onMounted(() => {

})


const canvasInit = () => {
  // 获取canvas元素
  const canvas = document.getElementById('myCanvas');
// 获取绘图上下文
  const ctx = canvas.getContext('2d');

// 定义网格线的间隔
  const gridSize = 100;

// 设置线条颜色
  ctx.strokeStyle = '#d3d3d3'; // 灰色
  ctx.lineWidth = 1; // 设置线条宽度

// 绘制垂直网格线
  for (let i = gridSize; i <= canvas.width; i += gridSize) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, canvas.height);
    ctx.stroke();
  }

// 绘制水平网格线
  for (let i = gridSize; i <= canvas.height; i += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(canvas.width, i);
    ctx.stroke();
  }

// 加粗中间的主轴线
  ctx.strokeStyle = 'black'; // 主轴颜色

  ctx.beginPath();
  ctx.moveTo(canvas.width / 2, 0);
  ctx.lineTo(canvas.width / 2, canvas.height);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(0, canvas.height / 2);
  ctx.lineTo(canvas.width, canvas.height / 2);
  ctx.stroke();

}

onMounted(() => {
  // canvasInit()
  const viewportInfo = getViewportInfo();
  console.log(viewportInfo)
  initData(viewportInfo.viewportHeight-180)
})


</script>

<template>

  <div style="padding: 1px">
    <div class="scatter-diagram-wrap" id="scatter-diagram">
      <span class="x-axis-min-value">{{ axisValue.xAxisMin }}</span>
      <span class="x-axis-max-value">{{ axisValue.xAxisMax }}</span>
      <span class="y-axis-min-value">0%</span>
      <span class="y-axis-max-value">100%</span>
      <div class="xAxis"></div>
      <div class="yAxis"></div>
      <div v-for="(item,index) in operatorCoordinate" :key="index" class="operator-coordinate-item">
        <div :style="`position:absolute;left:${item.xAxis-60}px;top:${item.yAxis-90}px`" class="operator-coordinate-data">
          干员名称：{{item.name}}
          <br> 技能名称：{{item.skillName}}
          <br> 技能消耗：{{item.apCost.toFixed(1)}}理智
          <br> 专三率：{{(item.proportion*100).toFixed(1)}}%

        </div>
        <sprite-image :image-name="item.charId" original-size="180" display-size="28" rounded-corner="300"
                      :style="`position:absolute;left:${item.xAxis}px;top:${item.yAxis}px`">

        </sprite-image>
        <!--      {{`S${item.skillIndex}——${item.apCost}——${(item.proportion*100).toFixed(0)}` }}-->
      </div>
      <!--    <canvas id="myCanvas" width="950" height="950"></canvas>-->


    </div>
  </div>

</template>
<style>

.scatter-diagram-wrap {
  position: relative;
  border: 1px solid red;
  margin: 40px 120px;

  .operator-coordinate-item{
    width: fit-content;
    cursor: pointer;
    .operator-coordinate-data{
      width: 180px;
      border: 1px solid #badfff;
      display: none;
      background: white;
      z-index: 3;
    }
  }

  .operator-coordinate-item:hover{
    .operator-coordinate-data{
      display: block;
    }
  }

  .xAxis {
    width: 100%;
    height: 1px;
    background: #1e222d;
    position: absolute;
    top: 50%;
  }

  .yAxis {
    width: 1px;
    height: 100%;
    left: 50%;
    position: absolute;
    background: #1e222d;
  }

  .x-axis-max-value {
    position: absolute;
    right: -100px;
    top: 50%;
  }

  .x-axis-min-value {
    position: absolute;
    left: -100px;
    top: 50%;
  }

  .y-axis-max-value {
    position: absolute;
    top: -30px;
    left: 50%;
  }

  .y-axis-min-value {
    position: absolute;
    bottom: -30px;
    left: 50%;
  }


}








canvas {
  border: 1px solid #b7b7b7; /* 可选：为了看得更清楚 */
  background-color: white;
}
</style>