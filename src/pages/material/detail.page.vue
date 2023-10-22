<template>
  <div class="stage_detail_page">
    <div class="stage_detail_title">
      <a class="">查看其他产物详情</a>
      <el-switch @click="changePie()" v-model="by_product_flag"></el-switch>
      <br/>
      <a class="">{{ stage_code }}的理智转化效率是{{ stage_efficiency }}%</a>
    </div>
    <div class="zone_table_wrap">
      <div class="stage_type">
        <c-button :color="'blue'" :isSelected="stage_type==='MAIN'" @click="stage_type='MAIN'">主线</c-button>
        <c-button :color="'blue'" :isSelected="stage_type==='ACT_PERM'" @click="stage_type='ACT_PERM'">常驻</c-button>
        <c-button :color="'blue'" :isSelected="stage_type==='ACT'" @click="stage_type='ACT'">SideStory</c-button>
        <c-button :color="'blue'" :isSelected="stage_type==='ACT_MINI'" @click="stage_type='ACT_MINI'">故事集</c-button>
        <c-button :color="'blue'" :isSelected="stage_type==='ACT_REP'" @click="stage_type='ACT_REP'">SideStory复刻</c-button>
      </div>
        <div class="zone_table">
          <div v-for="({zoneName,stageList},index) in zoneTable[stage_type]" :key="index" class="zone_title">
            <collapse :name="zoneName" class="stage_table_wrap">
              <template #title>{{ zoneName }}</template>
                <div class="stage_table">
                  <div v-for="({stageId,stageCode},index) in stageList" :key="index" class="btn btn_white"
                       @click="getStageDetailByStageId(stageId)">
                    {{ stageCode }}
                  </div>
                </div>
            </collapse>
          </div>
      </div>

    </div>
    <div class="pieChartBlock" id="pieChartBlock"></div>
  </div>
</template>

<script setup>
import "@/assets/css/stageDetail.css";
import stageApi from "/src/api/stage";
import * as echarts from "echarts";
import {onMounted, ref} from "vue";
import {cMessage} from '/src/custom/message'
import collapse from '/src/custom/collapse.vue'

let myChart = ""; //echart的dom
let stage_code = ref("1-7"); //关卡名称
let pieData_main = ref([]); //关卡主要产出
let pieData_extra = ref([]); //次要产出
let by_product_flag = ref(false);
let stage_efficiency = ref(0); //关卡效率
let stage_type = ref("MAIN")


function changePie() {
  //切换展示关卡主要/次要产出
  if (by_product_flag.value) {
    pieChart(pieData_extra.value);
  } else {
    pieChart(pieData_main.value);
  }
}

const zoneTable = ref({}); //关卡信息表

function getZoneTable() {
  stageApi.getStageMenu().then((response) => {
    zoneTable.value = response.data;
  });
}

let all_stage_result_detail = ref({})

function getStageResultDetail() {
  stageApi.getAllStageResultDetail(0.625,300).then(response => {
    all_stage_result_detail.value = response.data
    getStageDetailByStageId('main_01-07')
  })
}

//设置饼图信息
function setPieChartObj(InsideOrOutside, ratio, description) {
  let chartFan = {};
  if (ratio > 0) {
    chartFan.value = ratio;
    chartFan.name = description;
    if ("inside" === InsideOrOutside) pieData_main.value.push(chartFan);
    if ("outside" === InsideOrOutside) pieData_extra.value.push(chartFan);
  }
}

function getStageDetailByStageId(stage_id) {

  let stage_result_detail = all_stage_result_detail.value[stage_id];
  if (stage_result_detail == void 0) {
    stage_result_detail = []
    cMessage(`${stage_id}没有掉落数据`, 'error')
    return;
  }

  pieData_main.value = [];
  pieData_extra.value = [];

  console.log(stage_id)

  stage_efficiency.value = formatNumber(stage_result_detail.stageEfficiency * 100, 2)
  let extra_ratio = stage_result_detail.stageEfficiency * 100
  stage_code.value = stage_result_detail.stageCode
  const drop_detail_list = stage_result_detail.dropDetailList
  for (const element of drop_detail_list) {
    const ratio = formatNumber(element.ratio * 100, 1); //占比

    let description = element.itemName;
    if (ratio > 10) {
      //产出占比大于10%视为主要产出
      description = description + "\n占" + ratio + "%"; //echart上的描述
      setPieChartObj("inside", ratio, description); //设置echart的数据
      extra_ratio -= ratio;
    }
    //产出占比小于10%视为次要产出
    if (ratio < 10) {
      description = description + "\n占" + ratio + "%";
      setPieChartObj("outside", ratio, description);
    }
  }

  extra_ratio = formatNumber(extra_ratio, 1)
  setPieChartObj("inside", extra_ratio, "其他产物\n占" + extra_ratio + "%");

  if (stage_efficiency.value < 100) {
    let waste_ratio = formatNumber(100 - stage_efficiency.value, 1)
    setPieChartObj("inside", waste_ratio, "浪费的理智\n占" + waste_ratio + "%");
  }

  console.log(pieData_main.value)
  console.log(pieData_extra.value)
  pieChart(pieData_main.value);
}

function formatNumber(num, acc) {
  acc = typeof acc !== "undefined" ? acc : 2;
  return parseFloat(num).toFixed(acc);
}

function pieChart(data) {
  let option = {
    tooltip: {
      formatter: "{a} ({d}%)",
    },

    series: [
      {
        name: "产出占比",
        type: "pie",
        radius: "70%",
        center: ["50%", "50%"],
        label: {
          show: true,
          textStyle: {color: "black", fontSize: "16"},
        },
        labelLine: {
          show: true,
          lineStyle: {color: "red"},
          length:5,
          length2:10
        }, //线条颜色
        //基本样式

        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: "rgba(0, 0, 0, 0.5)", //鼠标放在区域边框颜色
            textColor: "#000",
          }, //鼠标放在各个区域的样式
        },
        data: data,
      },
    ],
  };
  myChart.setOption(option);
}

onMounted(() => {
  myChart = echarts.init(document.getElementById("pieChartBlock"));
  getZoneTable();
  getStageResultDetail()

});


</script>
