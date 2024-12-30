<template>
  <div class="stage_detail_page">
    <div class="flex flex-wrap">
      <v-card width="550" class="m-4">
        <div class="stage_type">
          <v-btn color="primary" :variant="stageType==='MAIN'?void 0:`tonal`" class="m-2" text="主线"
                 @click="stageType='MAIN'">
          </v-btn>
          <v-btn color="primary" :variant="stageType==='ACT_PERM'?void 0:`tonal`" class="m-2" text="常驻"
                 @click="stageType='ACT_PERM'">
          </v-btn>
          <v-btn color="primary" :variant="stageType==='ACT'?void 0:`tonal`" class="m-2" text="SideStory"
                 @click="stageType='ACT'">
          </v-btn>
          <v-btn color="primary" :variant="stageType==='ACT_MINI'?void 0:`tonal`" text="故事集" class="m-2"
                 @click="stageType='ACT_MINI'">
          </v-btn>
          <v-btn color="primary" :variant="stageType==='ACT_REP'?void 0:`tonal`" text="SideStory复刻" class="m-2"
                 @click="stageType='ACT_REP'">

          </v-btn>
        </div>
        <div class="zone_table">
          <v-expansion-panels>
            <v-expansion-panel :title="zoneName" v-for="({zoneName,stageList},index) in zoneTable[stageType]"
                               :key="index"
                               class="m-4">
              <template v-slot:text>
                <v-btn color="primary" :variant="selectedStageCode===stageCode?void 0:`tonal`" class="m-2"
                       :text="stageCode"
                       v-for="({stageId,stageCode},index) in stageList" :key="index"
                       @click="getStageDetailByStageId(stageId)"></v-btn>
              </template>
            </v-expansion-panel>
          </v-expansion-panels>
        </div>

      </v-card>
      <v-card class="m-4" >
        <div >
          <span>{{ selectedStageCode }}的理智转化效率是{{ stageEfficiency.toFixed(2) }}%</span>
        </div>
        <div>
          <v-switch color="primary" label="显示其他产物" @click="changePie()" v-model="byProductFlag"></v-switch>

        </div>
        <div class="pieChartBlock"  id="pieChartBlock"></div>

      </v-card>
    </div>
  </div>
</template>

<script setup>
import "/src/assets/css/stageDetail.css";
import stageApi from "/src/api/material";
import {onMounted, ref} from "vue";
import {cMessage} from '/src/utils/message'




let myChart = ""; //echart的dom
let selectedStageCode = ref("1-7"); //关卡名称
let pieDataMain = ref([]); //关卡主要产出
let pieDataExtra = ref([]); //次要产出
let byProductFlag = ref(false);
let stageEfficiency = ref(0); //关卡效率
let stageType = ref("MAIN")


function changePie() {
  //切换展示关卡主要/次要产出
  if (byProductFlag.value) {
    pieChart(pieDataExtra.value);
  } else {
    pieChart(pieDataMain.value);
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
  stageApi.getAllStageResultDetail(0.625, 300).then(response => {
    all_stage_result_detail.value = response.data
    getStageDetailByStageId('main_01-07')
  })
}


function getStageDetailByStageId(stage_id) {

  let stage_result_detail = all_stage_result_detail.value[stage_id];
  if (typeof stage_result_detail === "undefined") {
    stage_result_detail = []
    cMessage(`${stage_id}没有掉落数据`, 'error')
    return;
  }

  pieDataMain.value = [];
  pieDataExtra.value = [];

  stageEfficiency.value = stage_result_detail.stageEfficiency * 100
  let extra_ratio = 100
  selectedStageCode.value = stage_result_detail.stageCode

  const drop_detail_list = stage_result_detail.dropDetailList
  for (const element of drop_detail_list) {

    const ratio = formatNumber(element.ratio * 100, 1); //占比

    let description = element.itemName;
    if (ratio > 10) {
      //产出占比大于10%视为主要产出
      // console.log(element.itemName,'——',ratio,'%')
      description = description + "\n占" + ratio + "%"; //echart上的描述
      setPieChartObj("inside", ratio, description); //设置echart的数据
      extra_ratio -= ratio;
    }
    //产出占比小于10%视为次要产出
    if (ratio < 10) {
      // console.log(element.itemName,'——',ratio,'%')
      description = description + "\n占" + ratio + "%";
      setPieChartObj("outside", ratio, description);
    }
  }

  if (stageEfficiency.value < 100) {
    let waste_ratio = formatNumber(100 - stageEfficiency.value, 1)
    extra_ratio -= waste_ratio
    setPieChartObj("inside", waste_ratio, "浪费的理智\n占" + waste_ratio + "%");
  }

  extra_ratio = formatNumber(extra_ratio, 1)
  setPieChartObj("inside", extra_ratio, "其他产物\n占" + extra_ratio + "%");


  console.log(pieDataMain.value)
  // console.log(pieDataExtra.value)
  pieChart(pieDataMain.value);
}


//设置饼图信息
function setPieChartObj(InsideOrOutside, ratio, description) {
  let chartFan = {};
  if (ratio > 0) {
    chartFan.value = ratio;
    chartFan.name = description;
    if ("inside" === InsideOrOutside) {
      pieDataMain.value.push(chartFan);
    }
    if ("outside" === InsideOrOutside) {
      pieDataExtra.value.push(chartFan);
    }
  }
}

function formatNumber(num, acc) {
  acc = typeof acc !== "undefined" ? acc : 2;
  return parseFloat(num).toFixed(acc);
}

function pieChart(data) {
  let option = {
    tooltip: {
      formatter: "{b} ({d}%)",
    },

    series: [
      {
        name: "产出占比",
        type: "pie",
        radius: "70%",
        center: ["50%", "50%"],
        label: {
          show: true,
          textStyle: {color: "#FF8C00FF", fontSize: "16"},
        },
        labelLine: {
          show: true,
          lineStyle: {color: "#FF8C00FF"},
          length: 5,
          length2: 10
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
