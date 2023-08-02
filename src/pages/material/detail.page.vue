<template>
  <div class="stageDetail_main">
    <div class="stageDetaol_title">
      <a class="button_select">查看其他产物详情</a>
      <el-switch @click="changePie()" v-model="by_product_flag"></el-switch> <br />
      <a class="button_select">{{ stageCode }}的理智转化效率是{{ stageEfficiency }}%</a>
    </div>
    <div class="checkBox">
      <div class="stageTable">
        <div v-for="(stage, key) in stageTable[zondId]">
          <button
            @click="
              findStageDetailByStageCode(stage.stageId, stage.stageCode);
              stageCode = stage.stageCode;
            "
            class="stageId"
          >
            {{ stage.stageCode }}
          </button>
        </div>
      </div>
      <div class="zoneTable">
        <div v-for="(stageList, key) in stageTable" v-show="key != '落叶逐火' || key != '多索雷斯假日' || key != '多索雷斯假日·复刻'">
          <button class="zoneId" @click="zondId = key">{{ key }}</button>
        </div>
      </div>
    </div>
    <div class="pieChartBlock" id="pieChartBlock"></div>
  </div>
</template>

<script setup>
import "@/assets/css/stageDetail.css";
import stageApi from "@/api/stage";
import * as echarts from "echarts";
import { onMounted, ref } from "vue";

let myChart = ""; //echart的dom
let stageCode = ref("1-7"); //关卡名称
let stageId = ref("main_01-07"); //关卡id
let stageDetail = ref(""); //关卡详情
let pieData_main = ref([]); //关卡主要产出
let pieData_secondary = ref([]); //次要产出
let by_product_flag = ref(false);
let stageEfficiency = ref(0); //关卡效率
let zondId = ref("第九章"); //区域id

function changePie() {
  //切换展示关卡主要/次要产出
  if (by_product_flag.value) {
    pieChart(pieData_secondary.value);
  } else {
    pieChart(pieData_main.value);
  }
}

const stageTable = ref({}); //关卡信息表

function getStageTable() {
  stageApi.getStageTable().then((response) => {
    stageTable.value = response.data;
  });
}

//设置饼图信息
function setPieChartObj(InsideOrOutside, ratio, describption) {
  let chartFan = {};
  if (ratio > 0) {
    chartFan.value = ratio;
    chartFan.name = describption;
    if ("inside" == InsideOrOutside) pieData_main.value.push(chartFan);
    if ("outside" == InsideOrOutside) pieData_secondary.value.push(chartFan);
  }
}

//根据关卡id查询关卡消息
function findStageDetailByStageCode(stageIdStr) {
  stageId.value = stageIdStr; //关卡id
  stageApi.findStageDetailByStageId(stageId.value).then((response) => {
    stageDetail.value = response.data; //关卡详情
    if (stageDetail.value.length > 0) {
      pieData_main.value = [];
      pieData_secondary.value = [];
      let efficiency = stageDetail.value[0].efficiency; //关卡效率
      let apCost = stageDetail.value[0].apCost; //关卡效率
      let totalOutputAP = efficiency * apCost; //总产出理智
      let isValue = stageDetail.value[0].isValue; //是否用于定价，绝大部分情况活动本不参与定价，根据这个判断是否加无限龙门币

      stageEfficiency.value = (efficiency * 100).toFixed(3); //关卡效率%
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
        stageEfficiency.value = (efficiency * 100).toFixed(3);
        console.log("是活动关");
      }

      stageDetail.value.forEach((element) => {
        // console.log((element.result/element.apCost*100).toFixed(2),'%')
        const ratio = (element.result / totalOutputAP) * 100; //占比

        let describption = element.itemName;
        if (ratio > 10) {
          //产出占比大于10%视为主要产出
          // if (stageIdStr.indexOf("act") == -1 || stageIdStr.indexOf("perm") != -1) {
          by_product -= ratio;
          // }
          describption = describption + "\n占" + ratio.toFixed(1) + "%"; //echart上的描述
          setPieChartObj("inside", ratio, describption); //设置echart的数据
        }

        //产出占比小于10%视为次要产出
        if (ratio < 10) {
          describption = describption + "\n占" + ratio.toFixed(1) + "%";
          setPieChartObj("outside", ratio, describption);
        }
      });

      pieData_secondary.value.sort((a, b) => {
        return a.value - b.value;
      });

      console.log("副产物占" + by_product.toFixed(2) + "%");

      // if (stageIdStr.indexOf("act") == -1 || stageIdStr.indexOf("perm") != -1) {
      setPieChartObj("inside", by_product, "其他产物\n占" + by_product.toFixed(1) + "%");
      // }

      // setPieChartObj("inside",((1.2 * 0.036 * apCost) / totalOutputAP) * 100,
      //   "龙门币\n占" + (((1.2 * 0.036 * apCost) / totalOutputAP) * 100).toFixed(1) + "%");

      if (efficiency < 0.9999) {
        setPieChartObj("inside", ((1 - efficiency) * 100).toFixed(2), "浪费的理智\n占" + ((1 - efficiency) * 100).toFixed(1) + "%");
      }

      console.log(pieData_main.value);

      pieChart(pieData_main.value);
    }
  });
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
          textStyle: { color: "black", fontSize: "16" },
        },
        labelLine: {
          show: true,
          lineStyle: { color: "red" },
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
  getStageTable();
});

const zoneNameList = ref([
  "第十二章 (标准)",
  "第十一章 (标准)",
  "第十章 (标准)",
  "第九章",
  "第八章",
  "第七章",
  "第六章",
  "第五章",
  "第四章",
  "第三章",
  "第二章",
  "第一章",
  "序章",
  "生于黑夜・复刻",
  "生于黑夜・插曲",
  "生于黑夜",
  "落叶逐火",
  "登临意",
  "照我以火",
  "叙拉古人",
  "理想城：长夏狂欢季",
  "绿野幻梦",
  "尘影余音",
  "覆潮之下・复刻",
  "覆潮之下・插曲",
  "覆潮之下",
  "遗尘漫步・复刻",
  "遗尘漫步・插曲",
  "遗尘漫步",
  "愚人号·复刻",
  "愚人号・插曲",
  "愚人号",
  "源石尘行动",
  "吾导先路・复刻",
  "吾导先路",
  "画中人・复刻",
  "画中人・别传",
  "画中人",
  "将进酒・复刻",
  "将进酒・别传",
  "将进酒",
  "孤岛风云・复刻",
  "孤岛风云・别传",
  "孤岛风云",
  "风雪过境・复刻",
  "风雪过境・别传",
  "风雪过境",
  "长夜临光・复刻",
  "长夜临光・别传",
  "长夜临光",
  "玛莉娅・临光・复刻",
  "玛莉娅・临光・别传",
  "玛莉娅・临光",
  "多索雷斯假日・复刻",
  "多索雷斯假日",
  "密林悍将归来・复刻",
  "密林悍将归来・别传",
  "密林悍将归来",
  "沃伦姆德的薄暮・复刻",
  "沃伦姆德的薄暮・别传",
  "沃伦姆德的薄暮",
  "火蓝之心・别传",
  "骑兵与猎人・复刻",
  "骑兵与猎人・别传",
  "骑兵与猎人",
]);
</script>
