<template>
  <div id="maa_recruit_poster">
    <div id="maa_recruit_poster_main">
      <div id="poster_title">
        <div id="poster_title_main">公开招募大数据</div>
        <div id="poster_title_sub">
          Recruit Big Data
          <a style="font-size: 15px">更新时间：{{ updateTime }}</a>
        </div>
      </div>

      <div id="poster_content">
        <div class="poster_block" style="margin-top: 0vw">
          <div class="poster_block_number">1</div>
          <div class="poster_block_title" style="margin-top: 0">
            各稀有度Tag<span class="text_special">出现的概率</span>
          </div>
          <div class="poster_block_content pie_all" id="chart2" ref="chart"></div>
          <div class="probabilityDescribe">
            <table>
              <tr>
                <td>六星：{{ getProbability(maaData.topOperator, maaData.maaTagsDataCount) }}%</td>
                <td>五星：{{ getProbability(maaData.seniorOperatorCount, maaData.maaTagsDataCount) }}%</td>
              </tr>
              <tr>
                <td>四星：{{ getProbability(maaData.rareOperatorCount, maaData.maaTagsDataCount) }}%</td>
                <td>三星：{{ getProbability(maaData.commonOperatorCount, maaData.maaTagsDataCount) }}%</td>
              </tr>
            </table>
          </div>
        </div>
        <div class="poster_block">
          <div class="poster_block_number">2</div>
          <div class="poster_block_title">
            所有的<span class="text_special">{{ maaData.maaTagsDataCount }}条</span>数据中
          </div>
          <div class="poster_block_content">
            <div class="poster_block_p1">
              有<span class="text_special">{{ maaData.topOperator }}次</span>高级资深干员
            </div>
            <div class="poster_block_p1"></div>
            <div class="poster_block_p2">你是欧罗巴的贵族，</div>
            <div class="poster_block_p2">还是乌干达的酋长？</div>
          </div>
        </div>
        <div class="poster_block">
          <div class="poster_block_number">3</div>
          <div class="poster_block_title">
            火神仅出现了<span class="text_special">{{ maaData.vulcan }}次</span>
          </div>
          <div class="poster_block_content">
            <div class="poster_block_p1">
              占到了5星tag的<span class="text_special"
                >{{ getProbability(maaData.vulcan, maaData.seniorOperatorCount) }}%</span
              >
            </div>
            <div class="poster_block_p1"></div>
            <div class="poster_block_p2">那因陀罗呢？</div>
          </div>
        </div>
        <div class="poster_block">
          <div class="poster_block_number">4</div>
          <div class="poster_block_title">
            在<span class="text_special">{{ maaData.seniorOperator }}次</span>资深干员中
          </div>
          <div class="poster_block_content">
            <div class="poster_block_p1">
              出现了<span class="text_special">{{ maaData.topAndSeniorOperator }}次</span>高级资深干员
            </div>
            <div class="poster_block_p1"></div>
            <div class="poster_block_p2">我的黄票！<br />这俩TAG能不能拆开用啊！</div>
          </div>
        </div>

        <div class="poster_block">
          <div class="poster_block_number">5</div>
          <div class="poster_block_title">
            小车的出率有<span class="text_special">{{ getProbability(maaData.robot, maaData.maaTagsDataCount) }}%</span>
          </div>
          <div class="poster_block_content">
            <div class="poster_block_p1">
              但其中<span class="text_special">{{ getProbability(maaData.robotChoice, maaData.robot) }}%</span
              >面临黄票的诱惑
            </div>
            <div class="poster_block_p1"></div>
            <div class="poster_block_p2">Robot or certificates,</div>
            <div class="poster_block_p2">that is the question.</div>
          </div>
        </div>
      </div>

      <div id="poster_foot">
        <a href="https://maa.plus"
          ><div class="poster_button" style="width: 270px; margin-right: 0px">
            {{ maaData.maaTagsDataCount }}条数据 来自
            <span style="color: orange">MaaAssistantArknights</span>
          </div></a
        >
        <a href="https://yituliu.site"
          ><div class="poster_button" style="width: 64px; text-align: center">返回主站</div></a
        >
      </div>
    </div>
  </div>
</template>

<script>
import toolApi from "@/api/tool";
import * as echarts from "echarts";
import "@/assets/css/poster.css";

export default {
  layout: "poster",

  data() {
    return {
      pieData: [
        { value: 0, name: "六星" },
        { value: 0, name: "五星" },
        { value: 0, name: "四星" },
        { value: 0, name: "三星" },
      ],
      maaData: [],
      xData: [],
      updateTime: "",
    };
  },
  created() {
    this.maaStatistical1();
  },
  methods: {
    // 设置饼图
    maaStatistical1() {
      console.log("api方法");
      toolApi.maaStatistical().then((response) => {
        this.maaData = response.data;
        if (this.maaData.maaTagsDataCount == null) this.maaData.maaTagsDataCount = this.maaData.maaRecruitDataCount;
        this.pieData[0].value = this.maaData.topOperator;
        this.pieData[1].value = this.maaData.seniorOperatorCount;
        this.pieData[2].value = this.maaData.rareOperatorCount;
        this.pieData[3].value = this.maaData.commonOperatorCount;

        var date = new Date(this.maaData.createTime);
        var y = date.getFullYear(); //年
        var m = (date.getMonth() + 1).toString().padStart(2, "0"); //月
        var d = date.getDate().toString().padStart(2, "0"); //日
        var h = date.getHours().toString().padStart(2, "0"); //时
        var mm = date.getMinutes().toString().padStart(2, "0"); //分
        var s = date.getSeconds().toString().padStart(2, "0"); //秒
        this.updateTime = `${y}/${m}/${d} ${h}:${mm}:${s}`;

        this.xData.push({
          value: this.maaData.topOperator,
          itemStyle: {
            color: "#FF6600",
          },
        });

        this.xData.push({
          value: this.maaData.seniorOperatorCount,
          itemStyle: {
            color: "#FFFF99",
          },
        });

        this.xData.push({
          value: this.maaData.rareOperatorCount,
          itemStyle: {
            color: "#99CCFF",
          },
        });

        this.xData.push({
          value: this.maaData.commonOperatorCount,
          itemStyle: {
            color: "#99CC99",
          },
        });

        this.xData.push();
        //  this.xData.push(this.maaData.seniorOperatorCount)
        //   this.xData.push(this.maaData.rareOperatorCount)

        //    this.xData.push(this.maaData.commonOperatorCount)
        this.barChart();
      });
    },

    getProbability(divisor, dividend) {
      return this.getFixed((divisor / dividend) * 100);
    },

    getFixed(num, acc) {
      acc = typeof acc !== "undefined" ? acc : 2;
      return parseFloat(num).toFixed(acc);
    },

    pieChart(data) {
      console.log("触发了");

      var chartDom = document.getElementById("all");
      var myChart = echarts.init(chartDom);

      var option = {
        tooltip: {
          formatter: "{a} {b} : {c}个 ({d}%)",
          position: "inner",
        },

        series: [
          {
            name: "各星级出率",
            type: "pie",
            radius: "75%",
            center: ["50%", "50%"],
            itemStyle: {
              normal: {
                label: {
                  show: true,
                  textStyle: { color: "#ffffff", fontSize: "16" },
                  formatter: function (val) {
                    //让series 中的文字进行换行
                    return val.name.split("-").join("\n");
                  },
                }, //饼图图形上的文本标签，可用于说明图形的一些数据信息，比如值，名称等。可以与itemStyle属性同级，具体看文档
                labelLine: {
                  show: true,
                  lineStyle: { color: "#3c4858" },
                }, //线条颜色
              }, //基本样式
              emphasis: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: "rgba(0, 0, 0, 0.5)", //鼠标放在区域边框颜色
                textColor: "#000",
              }, //鼠标放在各个区域的样式
            },
            data: data,
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: "rgba(0, 0, 0, 0.5)",
              },
            },
          },
        ],
      };
      myChart.setOption(option);
    },
    barChart() {
      var myChart = echarts.init(document.getElementById("chart2"));
      console.log(this.xData);
      var option = {
        color: "#87CEEB",

        // backgroundColor: "black",
        tooltip: {
          trigger: "axis",
          formatter: "{b}:{c}个",
          backgroundColor: "rgba(255,255,255)",
          extraCssText: "box-shadow: 0 0 8px rgba(0, 0, 0, 0.3);",
          textStyle: {
            color: "#6a717b",
          },
        },
        // grid: {
        //   left: "3%",
        //   right: "11%",

        //   containLabel: true,
        // },
        grid: {
          // left: 40,
          right: 80,
          // bottom: 20,
          // top: 30,
          // containLabel: true
        },
        yAxis: [
          {
            type: "category",
            data: ["六星", "五星", "四星", "三星"],
            inverse: true,
            axisTick: {
              alignWithLabel: true,
            },
            axisLabel: {
              margin: 0,
              textStyle: {
                fontSize: 18,
                color: "#ffffff",
                left: "0%",
              },
            },
            axisLine: {
              lineStyle: {
                color: "#2548ac",
              },
            },
          },
        ],
        xAxis: [
          {
            show: false,
            type: "value",
            axisLabel: {
              margin: 0,
              interval: 1, //横轴信息全部显示
              minInterval: 1,
              // rotate: -30, //-15度角倾斜显示
              textStyle: {
                fontSize: 14,
                color: "#fffff",
              },
            },
            axisLine: {
              lineStyle: {
                color: "#192469",
              },
            },
            splitLine: {
              lineStyle: {
                color: "#17367c",
              },
            },
          },
        ],
        series: [
          {
            name: this.yData,
            type: "bar",
            barWidth: 30,
            radius: "60%",

            data: this.xData,
            label: {
              normal: {
                show: true,
                position: "right",

                textStyle: {
                  color: "#FFFFFF", //color of value
                  fontSize: 18,
                  margin: 20,
                },
              },
            },

            itemStyle: {
              normal: {},
            },
          },
        ],
      };
      myChart.setOption(option);
    },
  },
};
</script>

<style scoped>
.pie_all {
  width: 450px;
  height: 300px;
  border-radius: 16px;
  margin-top: -10%;
  /* border:solid red 1px; */
}

.probabilityValue {
  min-width: 150px;
  text-align: left;
}

.probabilityDescribe {
  margin-top: -50px;
  width: 250px;
  margin-left: 18%;
  text-align: left;
  color: #ffffff;
  /* border:solid red 1px; */
}
</style>
