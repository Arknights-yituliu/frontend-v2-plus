<script setup>
import {onMounted, ref} from "vue";
import '/src/assets/css/tool/gacha_calc.css'
import * as echarts from "echarts";

//活动列表，包含活动的名称，开启和结束时间
let activityList = ref([
  {
    name: '春节(2.15)'
  },
  {
    name: '彩六二期联动(3.21)'
  },
  {
    name: '敬请期待'
  }
])

//选中的活动名称
let selectedActivity = ref('春节(2.15)')

//通过name控制折叠面板的展开，如果集合中有面板的name，面板会默认展开，当点击展开面板时，
//面板组件也会将面板组件的name赋予这个集合
let resultCollapseActiveNames = ref(['calculationResult'])
let optionsCollapseActiveNames = ref([])

//攒抽计算结果
let calculationResult = {
  totalDraw: 0,  //总抽数
  totalAmountOfRecharge: 0,  //选择的礼包总价格
  existTotalDraw: 0,
  dailyTotalDraw: 0,
  potentialTotalDraw: 0,
  rechargeTotalDraw: 0,
  activityTotalDraw: 0,
  otherTotalDraw: 0,
}


function setPieChart(data) {
  let option = {
    tooltip: {
      formatter: "{a} {b} : {c}抽,占 ({d}%)",
      position: "inner",
    },

    series: [
      {
        name: "攒抽占比",
        type: "pie",
        radius: "70%",
        center: ["50%", "50%"],
        data: data,
        itemStyle: {},
        label: {
          show: true,
          textStyle: {color: "rgb(255,69,0)", fontSize: "16"},
        },
        labelLine: {
          length: 6,
          length2: 6,
        },

        emphasis: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: "rgba(0, 0, 0, 0.5)",
        },
      },
    ],
  };
  // console.log(option);
  myChart.setOption(option);
}

let myChart = void 0;

let pieChartData = ref([
  {value: 22, name: "现有"},
  {value: 33, name: "潜在"},
  {value: 44, name: "日常"},
  {value: 22, name: "氪金"},
  {value: 33, name: "活动"},
  {value: 44, name: "其它"}
])

onMounted(() => {
  myChart = echarts.init(document.getElementById("calculationResultPieChart"));

  setPieChart(pieChartData.value)
})

const handleChange = (val) => {
  console.log(val)
}

</script>

<template>
  <div class="g-calc-container">
    <!--计算结果-->
    <div class="g-calc-result-wrap">
      <el-collapse v-model="resultCollapseActiveNames" @change="handleChange">
        <el-collapse-item name="calculationResult">
          <template #title>
            <div class="g-calc-collapse-title-icon" style="background: #ec8338"></div>
            <span class="g-calc-collapse-title-font">
                共计{{ calculationResult.totalDraw }}抽，氪金{{ calculationResult.totalAmountOfRecharge }}元
              </span>
          </template>
          <!--选择攒到某个活动的单选框-->
          <div class="g-calc-radio-group-wrap">
            <el-radio-group v-model="selectedActivity" size="large">
              <el-radio-button v-for="(activity,index) in activityList" :key="index" :label="activity.name"
                               class="custom-radio-button-style"/>
            </el-radio-group>
          </div>
          <div style="width: 270px;height: 270px" id="calculationResultPieChart">
          </div>
        </el-collapse-item>
      </el-collapse>
    </div>

    <div class="g-calc-result-wrap">
      <el-collapse v-model="optionsCollapseActiveNames" @change="handleChange">
        <el-collapse-item name="1">
          <template #title>
            <div class="g-calc-collapse-title-icon" style="background: #ec8338"></div>
            <span class="g-calc-collapse-title-font">
                共计{{ 1 }}抽，氪金{{ 1 }}元
              </span>
          </template>
          <div>
            Consistent with real life: in line with the process and logic of real
            life, and comply with languages and habits that the users are used to;
          </div>
          <div>
            Consistent within interface: all elements should be consistent, such
            as: design style, icons and texts, position of elements, etc.
          </div>
        </el-collapse-item>
      </el-collapse>
    </div>
  </div>
</template>


<!--因css命名过长，将下面的gacha-calc命名为g-calc-->
<style scoped>
.g-calc-container {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
}

.g-calc-result-wrap {
  margin: 8px;
  width: 550px;
  border: 1px solid var(--c-border-color);
}

.g-calc-collapse-title-icon {
  padding: 12px;
  margin: 12px;
  border-radius: 4px;
}

.g-calc-collapse-title-font {
  font-size: 24px;
  font-weight: 600;
}

.g-calc-radio-group-wrap {
  width: 482px;
  margin: auto;
}


</style>