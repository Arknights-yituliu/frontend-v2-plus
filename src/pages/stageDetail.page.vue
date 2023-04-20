<template>
    <input type="text" class="input_select" v-model="stageCode">  <button class="button_select" @click="findStageDetailByStageCode()">查询</button>
    <a class="button_select">查看副产物详情</a>  <el-switch @click="changePie()" v-model="by_product_flag"></el-switch>
    <div class="pieChartBlock" id="pieChartBlock"></div>
</template>

<script setup>
import "@/assets/css/stageDetail.css"
import stageApi from "@/api/stage";
import * as echarts from "echarts";
import { onMounted, ref } from "vue";


 var myChart = '';

let stageCode = ref('11-12')
let stageDetail = ref('')

let pieData = ref([]);

let pieData_inside = ref([]);

let pieData_outside = ref([]);

let by_product_flag = ref(false)


function changePie(){
    if(by_product_flag.value){
      pieChart(pieData_outside.value)
    }else{
      pieChart(pieData_inside.value)
    }
}



function setNestPieChart(InsideOrOutside ,ratio, describption) {
      let chartFan = {};
      if (ratio > 0) {
        chartFan.value = parseInt(ratio);
        chartFan.name = describption;
        if('inside'==InsideOrOutside) pieData_inside.value.push(chartFan);
        if('outside'==InsideOrOutside) pieData_outside.value.push(chartFan);
      }
}

function findStageDetailByStageCode(){
    stageApi.findStageDetailByStageCode(stageCode.value).then((response) => {
        stageDetail.value = response.data;       
        if(stageDetail.value.length>0){
          pieData.value = [];
          const efficiency  = stageDetail.value[0].efficiency;
          
        stageDetail.value.forEach(element => {   
          // console.log((element.result/element.apCost*100).toFixed(2),'%')
          const ratio = (element.result/element.apCost*100).toFixed(2);
          let describption = element.itemName + ''         
          if(ratio>10)  {
             describption = describption +"占"+ ratio + "%"
            setNestPieChart('inside',ratio,describption); 
          } 
          if(ratio<10)  setNestPieChart('outside',ratio,describption);             
        });
        pieData_outside.value.sort((a,b)=>{
               return a.value - b.value
        })
        
        let by_product  = 100;
        pieData_inside.value.forEach(element=>{
              by_product -= element.value
        })

        console.log("副产物占"+by_product.toFixed(2)+'%')
        
        setNestPieChart('inside',by_product,"副产物占"+by_product.toFixed(2)+'%' );
        
        if(efficiency<0.9999){
            setNestPieChart('inside',((1-efficiency)*100).toFixed(2),"浪费理智占"+((1-efficiency)*100).toFixed(2)+'%' );
          }

        console.log(pieData_inside.value)  
               
        pieChart(pieData_inside.value)
      }
    })
}



function pieChart(data) {
      let option = {
        tooltip: {
          formatter: "{a} ({d}%)",
          position: "inner",
        },

        series: [
          {
            name: "产出占比",
            type: "pie",
            radius: "65%",
            center: ["50%", "50%"],
            itemStyle: {
              label: {
                show: true,
                textStyle: { color: "#000000", fontSize: "30" },
                formatter: function (val) {
                  //让series 中的文字进行换行
                  return val.name.split("-").join("\n");
                },
              },
              labelLine: {
                show: true,
                lineStyle: { color: "#000000" },
              }, //线条颜色
              //基本样式
            },
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: "rgba(0, 0, 0, 0.5)", //鼠标放在区域边框颜色
                textColor: "#000",
              }, //鼠标放在各个区域的样式
            },
            data: data,
            emphasis: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: "rgba(0, 0, 0, 0.5)",
            },
          },
        ],
      };
      myChart.setOption(option);
    }


onMounted(()=>{
       myChart = echarts.init(document.getElementById("pieChartBlock"));
})
</script>