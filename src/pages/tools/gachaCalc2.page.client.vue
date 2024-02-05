<script setup>
import {onMounted, ref} from "vue";
import '/src/assets/css/tool/gacha_calc.css'
import * as echarts from "echarts";
import '/src/assets/css/sprite_gacha.css'

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
let optionsCollapseActiveNames = ref(['exist'])

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
  originium: 0,
  orundum: 0,
  gachaTicket: 0,
  tenGachaTicket: 0,
}


let existResources = {
  originium: 0,
  orundum: 0,
  gachaTicket: 0,
  tenGachaTicket: 0,
  correctOrundum: 0,
  skinBudget: 0,
}

let produceOrundum = {
  ap: 0,
  coefficient: 0,
  output: 0,
}

let certificateStoreF3 = {
  certificate:0,
  disposableCertificate:0,
  orundum:0
}

let originiumIsUsed = ref(true)

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

const DRAW_RESOURCES = [
  {
    id: 4002,
    name: 'originium'
  },
  {
    id: 4003,
    name: 'orundum'
  },
  {
    id: 7003,
    name: 'gachaTicket'
  },
  {
    id: 7004,
    name: 'tenGachaTicket'
  }
]

function getDrawResourcesIcon(id) {
  return `bg-${id}icon `
}

function compute() {

}

onMounted(() => {
  myChart = echarts.init(document.getElementById("calculationResultPieChart"));
  setPieChart(pieChartData.value)
})

const handleChange = (val) => {
  console.log(val)
}

</script>

<template>
  <div class="gc-container">
    <!--计算结果-->
    <div class="gc-result-wrap" id="total-table">
      <el-collapse v-model="resultCollapseActiveNames" @change="handleChange" style="border: none">
        <el-collapse-item name="calculationResult" class="gc-collapse-item">
          <template #title>
            <div class="gc-collapse-title-icon" style="background: #ec8338"></div>
            <span class="gc-collapse-title-font">
                共计{{ calculationResult.totalDraw }}抽，氪金{{ calculationResult.totalAmountOfRecharge }}元
              </span>
          </template>

          <!--选择攒到某个活动的单选框-->
          <div class="gc-radio-group-wrap">
            <el-radio-group v-model="selectedActivity" size="large">
              <el-radio-button v-for="(activity,index) in activityList" :key="index" :label="activity.name"
                               class="custom-radio-button-style"/>
            </el-radio-group>
          </div>

          <div class="gc-draw-result">
            <div style="width: 290px;height: 220px" id="calculationResultPieChart">
            </div>
            <table class="gc-total-table">
              <tbody>
              <tr>
                <td>
                  现有
                </td>
                <td>
                  {{ calculationResult.existTotalDraw }}
                </td>
                <td>
                  抽
                </td>
              </tr>
              <tr>
                <td>
                  日常
                </td>
                <td>
                  {{ calculationResult.dailyTotalDraw }}
                </td>
                <td>
                  抽
                </td>
              </tr>
              <tr>
                <td>
                  潜在
                </td>
                <td>
                  {{ calculationResult.potentialTotalDraw }}
                </td>
                <td>
                  抽
                </td>
              </tr>
              <tr>
                <td>
                  氪金
                </td>
                <td>
                  {{ calculationResult.rechargeTotalDraw }}
                </td>
                <td>
                  抽
                </td>
              </tr>
              <tr>
                <td>
                  活动(估算)
                </td>
                <td>
                  {{ calculationResult.activityTotalDraw }}
                </td>
                <td>
                  抽
                </td>
              </tr>
              <tr>
                <td>
                  其它(估算)
                </td>
                <td>
                  {{ calculationResult.otherTotalDraw }}
                </td>
                <td>
                  抽
                </td>
              </tr>
              </tbody>
            </table>
          </div>
          <div class="gc-resources-result">
            <div class="gc-draw-resource">
              <div :class="getDrawResourcesIcon('4002')"></div>
              <span>{{ existResources.originium }}</span>
            </div>
            <div class="gc-draw-resource">
              <div :class="getDrawResourcesIcon('4003')"></div>
              <span>{{ existResources.orundum }}</span>
            </div>
            <div class="gc-draw-resource">
              <div :class="getDrawResourcesIcon('7003')"></div>
              <span>{{ existResources.gachaTicket }}</span>
            </div>
            <div class="gc-draw-resource">
              <div :class="getDrawResourcesIcon('7004')"></div>
              <span>{{ existResources.tenGachaTicket }}</span>
            </div>
          </div>

        </el-collapse-item>
      </el-collapse>
    </div>

    <div class="gc-result-wrap">
      <el-collapse v-model="optionsCollapseActiveNames" @change="handleChange" style="border: none">
        <el-collapse-item name="exist" class="gc-collapse-item">
          <template #title>
            <div class="gc-collapse-title-icon" style="background: rgba(119,118,255,0.8)"></div>
            <span class="gc-collapse-title-font">
               库存/预留/搓玉&emsp;{{ calculationResult.existTotalDraw }}抽
              </span>
          </template>
          <div class="gc-title">
            <span></span> 当前库存
          </div>
          <div class="gc-resources-result">
            <div class="gc-draw-resource">
              <div :class="getDrawResourcesIcon('4002')"></div>
              <input v-model.number="existResources.originium">
            </div>
            <div class="gc-draw-resource">
              <div :class="getDrawResourcesIcon('4003')"></div>
              <input v-model.number="existResources.orundum">
            </div>
            <div class="gc-draw-resource">
              <div :class="getDrawResourcesIcon('7003')"></div>
              <input v-model.number="existResources.gachaTicket">
            </div>
            <div class="gc-draw-resource">
              <div :class="getDrawResourcesIcon('7004')"></div>
              <input v-model.number="existResources.tenGachaTicket">
            </div>
          </div>
          <div class="gc-switch-wrap">
            <span class="gc-switch-label">是否使用源石抽卡</span>
            <el-switch v-model="originiumIsUsed"></el-switch>
          </div>

          <div class="gc-title">
            <span></span> 预留，自定义修正
          </div>
          <div class="gc-input-bar">
            <input v-model.number="existResources.correctOrundum">
            <span>合成玉自定义修正</span>
            <div :class="getDrawResourcesIcon('4003')"></div>
            <span>{{ existResources.correctOrundum }}</span>
          </div>
          <span class="gc-tip"> 例如给轮换池预留、其它来源等，可填负数</span>
          <el-slider v-model.number="existResources.skinBudget" :step="1" :min="0" :max="10"
                     show-stops show-input @change="compute()" style="width: 90%;margin: 0 5%">
          </el-slider>
          <span class="gc-tip">预留皮肤（18石/件）</span>

          <div class="gc-title">
            <span></span> 预留，自定义修正
          </div>

          <div class="gc-input-bar">
            <input v-model.number="produceOrundum.ap">
            <span>用于搓玉的理智 x </span>
            <input v-model.number="produceOrundum.coefficient">
            <span>搓玉系数 = </span>
            <div :class="getDrawResourcesIcon('4003')"></div>
            <span>{{ produceOrundum.output }}</span>
          </div>
          <span class="gc-tip">搓玉系数：1理智可搓多少玉，1-7搓玉系数1.09</span>

          <div class="gc-title">
            <span></span> 绿票商店第三层
          </div>

          <div class="gc-input-bar">
            <span>现有绿票</span>
            <input v-model.number="certificateStoreF3.certificate">
            <span>
              ，有{{ certificateStoreF3.disposableCertificate }}绿票可换
            </span>
            <div :class="getDrawResourcesIcon('4003')"></div>
            <span>{{ certificateStoreF3.orundum }}</span>
          </div>
        </el-collapse-item>

        <el-collapse-item name="daily" class="gc-collapse-item">
          <template #title>
            <div class="gc-collapse-title-icon" style="background: rgba(119,118,255,0.8)"></div>
            <span class="gc-collapse-title-font">
               日常积累&emsp;{{ calculationResult.dailyTotalDraw }}抽
              </span>
          </template>
        </el-collapse-item>

        <el-collapse-item name="potential" class="gc-collapse-item">
          <template #title>
            <div class="gc-collapse-title-icon" style="background: rgba(119,118,255,0.8)"></div>
            <span class="gc-collapse-title-font">
               潜在资源&emsp;{{ calculationResult.potentialTotalDraw }}抽
              </span>
          </template>
        </el-collapse-item>

        <el-collapse-item name="daily" class="gc-collapse-item">
          <template #title>
            <div class="gc-collapse-title-icon" style="background: rgba(119,118,255,0.8)"></div>
            <span class="gc-collapse-title-font">
               氪金资源&emsp;{{ calculationResult.dailyTotalDraw }}抽
              </span>
          </template>
        </el-collapse-item>

        <el-collapse-item name="daily" class="gc-collapse-item">
          <template #title>
            <div class="gc-collapse-title-icon" style="background: rgba(119,118,255,0.8)"></div>
            <span class="gc-collapse-title-font">
               活动获得（估算）&emsp;{{ calculationResult.dailyTotalDraw }}抽
              </span>
          </template>
        </el-collapse-item>

        <el-collapse-item name="daily" class="gc-collapse-item">
          <template #title>
            <div class="gc-collapse-title-icon" style="background: rgba(119,118,255,0.8)"></div>
            <span class="gc-collapse-title-font">
               其他资源（估算）&emsp;{{ calculationResult.dailyTotalDraw }}抽
              </span>
          </template>
        </el-collapse-item>
      </el-collapse>
    </div>
  </div>
</template>


<!--因css命名过长，将下面的gacha-calc简写为gc-->
<style scoped>
.gc-container {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
}

#total-table{

}

.gc-result-wrap {
  margin: 8px;
  width: 550px;
}

.gc-collapse-title-icon {
  padding: 12px;
  margin: 12px;
  border-radius: 4px;
}

.gc-collapse-title-font {
  font-size: 24px;
  font-weight: 600;
}

.gc-radio-group-wrap {
  width: 482px;
  margin: auto;

}

.gc-draw-result {
  display: flex;
  padding: 8px;
  justify-content: space-around;
}

.gc-total-table {
  width: 200px;
  font-size: 18px;
  font-weight: bolder;
}

.gc-resources-result {
  display: flex;
  justify-content: flex-end;
}

.gc-draw-resource {
  width: 130px;
  height: 36px;
  position: relative;
}

.gc-draw-resource div {
  position: absolute;
  left: 0;
}

.gc-draw-resource span {
  position: absolute;
  left: 44px;
  line-height: 36px;
  font-weight: bolder;
  font-size: 20px;
}

.gc-draw-resource input {
  position: absolute;
  left: 44px;
  width: 70px;
  line-height: 20px;
  font-size: 18px;
  font-weight: bolder;
  top: 6px;
}

.gc-switch-wrap {
  margin: 8px 0;
  display: flex;
  align-items: center;
}

.gc-switch-label {
  font-size: 18px;
  padding: 0 12px;
}

.gc-title {
  background-color: rgba(196, 196, 196, 0.5);
  height: 32px;
  width: 100%;
  line-height: 32px;
  font-size: 18px;
  padding: 0 32px;
  position: relative;
}

.gc-title span {
  border-left: 12px solid transparent;
  border-top: 16px solid rgb(255, 255, 255);
  border-bottom: 4px solid transparent;
  border-right: 12px solid transparent;
  position: absolute;
  top: 8px;
  left: 4px;
}

.gc-input-bar{
  display: flex;
  align-items: center;
  font-size: 18px;
  padding: 8px;
}

.gc-input-bar input {
  width: 80px;
  margin: 0 2px;
}

.gc-input-bar span{
  padding: 0 2px;
}

.gc-tip {
  font-style: italic;
  color: #599dff;
  padding: 8px 12px;
  font-size: 16px;
}

</style>