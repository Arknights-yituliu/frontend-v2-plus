<script setup>

import dropData from '/src/static/json/tmp/data.json'
import {onMounted} from "vue";

let xData = []
let yData = []

for(const item of dropData){
  let {time,times,knockRating} = item
  if(!(time.indexOf("2024-07-31")>-1||time.indexOf("2024-08-01")>-1||time.indexOf("2024-08-02")>-1
      ||time.indexOf("2024-08-03")>-1||time.indexOf("2024-08-04")>-1||time.indexOf("2024-08-05")>-1)){
    continue
  }

  time = time.replace('2024-','')

  if(knockRating==='NaN'||times<5){
    knockRating = 0
  }
  knockRating = knockRating.toFixed(2)
  xData.push(time)
  yData.push(knockRating)
}

const option = {
  title: {
    text: '12-17',
    left: 'center',
  },
  xAxis: {
    type: 'category',
    data: xData,
    axisLabel: {
      // 旋转标签以避免重叠
      rotate: 45,
      interval: 0 // 强制显示所有标签
    }
  },
  yAxis: {
    type: 'value'
  },
  series: [
    {
      data: yData,
      type: 'line',
      label: {
        show: true, // 开启显示
        position: 'top', // 数据标签位置，可选'top', 'left', 'right', 'bottom'等
        textStyle: {
          fontSize: 12,
          color: 'black' // 设置文本颜色
        }
      }
    }
  ]
};

onMounted(()=>{
  const chartDom = document.getElementById('main');
  const myChart = echarts.init(chartDom);

  option && myChart.setOption(option);
})


</script>


<template>

  <div style="width: 2400px;height: 500px;background-color: white" id="main">

  </div>

</template>






