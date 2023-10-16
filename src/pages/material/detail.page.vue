<template>
  <div class="stage_detail_page">
    <div class="stage_detail_title">
      <a class="">查看其他产物详情</a>
      <el-switch @click="changePie()" v-model="by_product_flag"></el-switch>
      <br/>
      <a class="">{{ stage_code }}的理智转化效率是{{ stage_efficiency }}%</a>
    </div>
    <div class="checkBox">
      <div>
        <div v-for="(zoneList, stageType) in zoneTable" :key="stageType" >
          <div class="zone_title">{{ stageType }}</div>
          <div class="zone_table">
            <div v-for="(zone,index) in zoneList" :key="index" class="zone_title">
              <div>{{ zone.zoneName }}</div>
              <collapse>

              </collapse>
              <div :id="zone.zoneId+'wrap'" class="stage_table_wrap">
                <div :id="zone.zoneId" class="stage_table">
                <div  v-for="(stage,index) in zone.stageList" :key="index" class="btn btn_white"
                     @click="getStageDetailByStageId(stage.stageId)">
                  {{ stage.stageCode }}
                </div>
                </div>
              </div>
            </div>

          </div>
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
import {collapseV2} from '/src/custom/collapse'
import {cMessage} from '/src/custom/message'
import collapse from '/src/custom/collapse.vue'

let myChart = ""; //echart的dom
let stage_code = ref("1-7"); //关卡名称
let stageId = ref("main_01-07"); //关卡id
let stageDetail = ref(""); //关卡详情
let pieData_main = ref([]); //关卡主要产出
let pieData_extra = ref([]); //次要产出
let by_product_flag = ref(false);
let stage_efficiency = ref(0); //关卡效率

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
  stageApi.getAllStageResultDetail(0.625).then(response => {
    all_stage_result_detail.value = response.data
  })
}

//设置饼图信息
function setPieChartObj(InsideOrOutside, ratio, description) {
  let chartFan = {};
  if (ratio > 0) {
    chartFan.value = ratio;
    chartFan.name = description;
    if ("inside" == InsideOrOutside) pieData_main.value.push(chartFan);
    if ("outside" == InsideOrOutside) pieData_extra.value.push(chartFan);
  }
}

function getStageDetailByStageId(stage_id) {

  let stage_result_detail = all_stage_result_detail.value[stage_id];
  if (stage_result_detail == void 0) {
    stage_result_detail = []
    cMessage("没有数据", 'error')
    return;
  }

  pieData_main.value = [];
  pieData_extra.value = [];

  console.log(stage_result_detail)
  const detail = stage_result_detail[0]
  stage_efficiency.value = formatNumber(detail.stageEfficiency * 100, 2)
  let extra_ratio = detail.stageEfficiency * 100
  stage_code.value = detail.stageCode

  for (const element of stage_result_detail) {
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

//根据关卡id查询关卡消息
function findStageDetailByStageCode(stageIdStr) {
  stageId.value = stageIdStr; //关卡id
  stageApi.findStageDetailByStageId(stageId.value).then((response) => {
    stageDetail.value = response.data; //关卡详情
    if (stageDetail.value.length > 0) {
      pieData_main.value = [];
      pieData_extra.value = [];
      let efficiency = stageDetail.value[0].stageEfficiency / 100; //关卡效率
      let apCost = stageDetail.value[0].apCost; //关卡效率
      let totalOutputAP = efficiency * apCost; //总产出理智
      let isValue = stageDetail.value[0].isValue; //是否用于定价，绝大部分情况活动本不参与定价，根据这个判断是否加无限龙门币

      stage_efficiency.value = (efficiency * 100).toFixed(3); //关卡效率%
      let by_product = 100; //副产物

      stageDetail.value.push({
        result: 1.2 * 0.036 * apCost,
        itemName: "龙门币",
      });

      if (isValue == 0) {
        stageDetail.value.push({
          result: 20 * 0.0036 * apCost,
          itemName: "龙门币\n(无限兑换)",
        });
        efficiency = efficiency + 0.072;
        totalOutputAP = efficiency * apCost;
        stage_efficiency.value = (efficiency * 100).toFixed(3);
        console.log("是活动关");
      }

      stageDetail.value.forEach((element) => {

        const ratio = (element.result / totalOutputAP) * 100; //占比

        let describption = element.itemName;
        if (ratio > 10) {
          //产出占比大于10%视为主要产出
          // if (stageIdStr.indexOf("act") == -1 || stageIdStr.indexOf("perm") != -1) {
          by_product -= ratio;
          // }
          describption = describption + "\n占" + (ratio * 100).toFixed(1) + "%"; //echart上的描述
          setPieChartObj("inside", ratio, describption); //设置echart的数据
        }

        //产出占比小于10%视为次要产出
        if (ratio < 10) {
          describption = describption + "\n占" + ratio.toFixed(1) + "%";
          setPieChartObj("outside", ratio, describption);
        }
      });

      pieData_extra.value.sort((a, b) => {
        return a.value - b.value;
      });

      console.log("副产物占" + by_product.toFixed(2) + "%");

      // if (stageIdStr.indexOf("act") == -1 || stageIdStr.indexOf("perm") != -1) {
      setPieChartObj("inside", by_product, "其他产物\n占" + by_product.toFixed(1) + "%");
      // }

      // setPieChartObj("inside",((1.2 * 0.036 * apCost) / totalOutputAP) * 100,
      //   "龙门币\n占" + (((1.2 * 0.036 * apCost) / totalOutputAP) * 100).toFixed(1) + "%");

      if (efficiency < 0.9999) {
        setPieChartObj("inside", formatNumber((1 - efficiency) * 100, 1), "浪费的理智\n占" + ((1 - efficiency) * 100).toFixed(1) + "%");
      }

      console.log(pieData_main.value);

      pieChart(pieData_main.value);
    }
  });
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
        radius: "60%",
        center: ["50%", "50%"],

        label: {
          show: true,
          textStyle: {color: "black", fontSize: "16"},
        },
        labelLine: {
          show: true,
          lineStyle: {color: "red"},
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
