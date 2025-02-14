<script setup>
import {onMounted, ref} from "vue";
import ITEM_SERIES from '/src/static/json/material/item_series.json'
import FixedNav from "/src/components/FixedNav.vue";
import TourGuide from "/src/components/TourGuide.vue";
import '/src/assets/css/material/stage.scss'
import '/src/assets/css/material/stage.phone.scss'
import StageLegend from "/src/components/material/StageLegend.vue";
import StageDetailTable from "/src/components/material/StageDetailTable.vue";
import OrundumTable from "/src/components/material/OrundumTable.vue";
import HistoryActivity from "/src/components/material/HistoryActivity.vue";
import {useDisplay} from "vuetify";
import {getStageData} from '/src/utils/stageEfficiencyCal.js'
import {formatNumber} from "/src/utils/format.js";
import {useRouter} from "vue-router";
import TMP_STAGE_RESULT from '/src/static/json/material/tmp_stage_result.json'
const router = useRouter();

const {mobile} = useDisplay()



let legendDisplay = ref(false)


function getButtonSize() {
  if (mobile.value) {

    return 'small'
  }
}

//漫游导航指引
const guideOpen = ref(false)


// 根据物品系列进行分组的推荐关卡
let stageResultGroup = ref([])
//材料卡片数据
let stageCardData = ref([])
let updateTime = ref()
//搓玉推荐关卡
let orundumRecommendedStage = ref([])
//历史活动关卡数据
let historyActivityList = ref([])
//根据物品id获得对应的关卡推荐数据集合
let recommendedStageDetailTable = ref([])



// 获取关卡推荐数据
function getStageResult() {
  getStageData().then(response => {
    const {recommendedStage, orundumRecommendedStageVO, historyActStage,updateTimeVO} = response
    updateTime.value = updateTimeVO
    stageResultGroup.value = recommendedStage.sort((a, b) => a.itemSeriesId - b.itemSeriesId)
    //将后端返回的数据组装为卡片需要的数据格式
    orundumRecommendedStage.value = orundumRecommendedStageVO

    historyActivityList.value = historyActStage
    getItemCardData()
    getItemTableData(0, false)
  })

}


/**
 * 拼接材料卡片的数据
 */
function getItemCardData() {

  let list = []
  for (let index in stageResultGroup.value) {
    //每一种材料系列的推荐关卡
    let recommendedStageList = stageResultGroup.value[index]
    //推荐关卡集合
    let stageList = recommendedStageList.stageResultList;

    let leT4MaxEfficiencyStage = {leT4Efficiency: 0}
    let leT3MaxEfficiencyStage = {leT3Efficiency: 0}
    let leT2MaxEfficiencyStage = {leT2Efficiency: 0}
    let maxEfficiencyStage = {stageEfficiency: 0}

    for (const stage of stageList) {

      const {stageEfficiency, leT4Efficiency, leT3Efficiency, leT2Efficiency} = stage

      // console.log(leT4MaxEfficiencyStage.leT4Efficiency, '<' ,leT4Efficiency ,'---', leT4MaxEfficiencyStage.leT4Efficiency < leT4Efficiency  )

      if (maxEfficiencyStage.stageEfficiency < stageEfficiency) {
        maxEfficiencyStage = stage
      }
      if (leT4MaxEfficiencyStage.leT4Efficiency < leT4Efficiency) {
        leT4MaxEfficiencyStage = stage
      }
      if (leT3MaxEfficiencyStage.leT3Efficiency < leT3Efficiency) {
        leT3MaxEfficiencyStage = stage
      }
      if (leT2MaxEfficiencyStage.leT2Efficiency < leT2Efficiency) {
        leT2MaxEfficiencyStage = stage
      }

    }

    const recommendStage = {
      maxEfficiencyStage: maxEfficiencyStage,
      leT4MaxEfficiencyStage: leT4MaxEfficiencyStage,
      leT3MaxEfficiencyStage: leT3MaxEfficiencyStage,
      leT2MaxEfficiencyStage: leT2MaxEfficiencyStage,
      display:maxEfficiencyStage.stageEfficiency>0.8,
      series: {r4: '', r3: '', r2: '', r1: ''}
    }

    //获得该材料系列的上下级材料的物品id
    recommendStage.series = ITEM_SERIES[recommendedStageList.itemSeriesId].series

    list.push(recommendStage)
    // console.log(item_recommend_stage)
  }

  stageCardData.value = list
}




/**
 * 根据索引获得对应材料系列的所有推荐关卡
 * @param {number} index 集合索引,卡片展示的材料和索引对应  简单例子[0:xxx材料的所有数据]
 * @param {boolean} isJump 是否跳转到表格位置
 */
function getItemTableData(index, isJump) {
  //当前材料系列的推荐关卡
  let recommendedStage = stageResultGroup.value[index];

  //推荐关卡集合
  let stageResultList = recommendedStage.stageResultList;
  //拼接表格数据,默认按总效率排序
  recommendedStageDetailTable.value = stageResultList.sort((a, b) => b.stageEfficiency - a.stageEfficiency)

  if (isJump) {
    document.getElementById('StageDetailTable').scrollIntoView({behavior: 'smooth', block: 'center'})
  }
}


function replaceZoneName(str) {
  if (typeof str === "undefined") return ''
  str = str.row.zoneName
  return str.replace("(标准)", '')
}

let legendStyle = ref('')
onMounted(() => {
  legendStyle.value = localStorage.getItem('itemLegend') ? localStorage.getItem('itemLegend') : ''
})

/**
 * 隐藏图例
 */
// function hiddenLegend() {
//   legendStyle.value = 'none'
//   localStorage.setItem('itemLegend', 'none')
// }

/**
 * 滚动到图例说明
 */
function scrollToLegendDescription() {
  document.getElementById('description').scrollIntoView({behavior: 'smooth'})
}

/**
 * 滚动到搓玉关卡表
 */
function scrollToOrundumTable() {
  document.getElementById('orundum-table').scrollIntoView({behavior: 'smooth'})
}

/**
 * 滚动到历史活动关卡表
 */
function scrollToHistoryStageTable() {
  document.getElementById('history-stage-table').scrollIntoView({behavior: 'smooth'})
}

/**
 * 滚动到常见问题
 */
function scrollToFrequentlyAskedQuestion() {
  document.getElementById('frequently-asked-question').scrollIntoView({behavior: 'smooth'})
}


function getLegendSprite(id) {
  return "bg-" + id;
}

function getCardBgSprite(id) {
  return "bg-" + id;
}

function getCardIconSprite(id) {
  return "bg-" + id;
}


onMounted(() => {
  stageResultGroup.value = TMP_STAGE_RESULT.recommendedStage.sort((a, b) => a.itemSeriesId - b.itemSeriesId)
  orundumRecommendedStage.value = TMP_STAGE_RESULT.orundumRecommendedStage
  historyActivityList.value = TMP_STAGE_RESULT.historyActStage
  updateTime.value = TMP_STAGE_RESULT.updateTime
  getItemCardData()
  getItemTableData(0, false)

  getStageResult()

})
</script>


<template>
  <!--漫游导航指引，先停用-->
  <!--  <el-tour v-model="guideOpen" :target-area-clickable="false">-->
  <!--    <el-tour-step-->
  <!--        target="#sStageLegend"-->
  <!--        title="效率详情"-->
  <!--        description="点击这个卡片可查看相对应的效率计算信息哦">-->
  <!--    </el-tour-step>-->
  <!--    <el-tour-step-->
  <!--        target="#c-0"-->
  <!--        title="材料详情"-->
  <!--        description="点击这里的卡片可以查看相对应的材料掉落信息哦">-->
  <!--    </el-tour-step>-->
  <!--    <el-tour-step-->
  <!--        target="#fixedNav"-->
  <!--        title="标题导航栏"-->
  <!--        description="将光标悬停至此处可唤出该页面的标题导航栏，其它页面也可能会有哦=w="-->
  <!--    />-->
  <!--  </el-tour>-->
  <tour-guide v-if="guideOpen" @close="guideOpen = false" :s1="`#sStageLegend`" :s2="`#c-0`" :s3="`#fixedNav`"/>


  <!-- 地图效率Start -->
  <div id="stage" class="stage-page">
    <!-- 标题区域 -->

    <div class="module-header">
      <div class="module-title">
        <h1>推荐关卡</h1>
        <h4>Best Stages</h4>
      </div>
      <v-btn-group>
        <v-btn color="primary" :size="getButtonSize()"
               @click="scrollToOrundumTable()" style="margin: 10px 0px 2px 8px;">搓玉数据
        </v-btn>
        <v-btn color="primary" :size="getButtonSize()"
               @click="scrollToHistoryStageTable()" style="margin: 10px 0px 2px 0px;">往期活动
        </v-btn>
        <v-btn color="primary" :size="getButtonSize()"
               @click="scrollToFrequentlyAskedQuestion()" style="margin: 10px 4px 2px 0px;">常见问题
        </v-btn>
      </v-btn-group>
      <v-btn color="primary"  style="display:none" class="v-btn" :size="getButtonSize()"
             @click="router.push({name:'AccountHome'})" disabled>自定义一图流
      </v-btn>
      <v-btn color="secondary" variant="tonal" class="v-btn" :size="getButtonSize()"
             @click="legendDisplay = !legendDisplay">显示图例
      </v-btn>

      <span class="module-tip">更新时间：{{ updateTime }}</span>
    </div>
    <!-- 说明区域 -->
    <StageLegend @click="scrollToLegendDescription" v-show="legendDisplay"></StageLegend>

    <!-- 卡片区域 -->
    <div id="stageForCards" class="stage-card-wrap">
      <div class="stage-card" v-for="(stage, index) in stageCardData" :key="index"
           @click="getItemTableData(index, true)" :id="`c-${index}`" v-show="stage.display">
        <div class="stage-card-bg-sprite" :class="getCardBgSprite(stage.series.r3)"></div>
        <div class="stage-card-bar-container">
          <div class="stage-card-bar">
            <div class="stage-card-item-icon">
              <div :class="getCardIconSprite('AP_GAMEPLAY')"></div>
            </div>
            <div class="stage_card_3_2" style="display: none;">

              {{ stage.maxEfficiencyStage.zoneName }}
            </div>
            <div class="stage-card-bar-stage-code">
              {{ stage.maxEfficiencyStage.stageCode }}
            </div>
            <div class="stage-card-bar-stage-efficiency">
              {{ formatNumber(stage.maxEfficiencyStage.stageEfficiency * 100, 1) }}%
            </div>
            <div class="stage-card-bar-stage-efficiency">
              {{ formatNumber(stage.maxEfficiencyStage.stageEfficiency * 100, 1) }}%
            </div>
          </div>
          <div class="stage-card-bar">
            <div class="stage-card-item-icon">
              <div :class="getCardIconSprite(stage.series.r4)"></div>
            </div>
            <div class="stage-card-bar-stage-code">
              {{ stage.leT4MaxEfficiencyStage.stageCode }}
            </div>
            <div class="stage-card-bar-stage-efficiency">
              {{ formatNumber(stage.leT4MaxEfficiencyStage.leT4Efficiency * 100, 1) }}%
            </div>
            <div class="stage-card-bar-stage-efficiency">
              {{ formatNumber(stage.leT4MaxEfficiencyStage.stageEfficiency * 100, 1) }}%
            </div>
          </div>
          <div class="stage-card-bar">
            <div class="stage-card-item-icon">
              <div :class="getCardIconSprite(stage.series.r3)"></div>
            </div>
            <div class="stage-card-bar-stage-code">
              {{ stage.leT3MaxEfficiencyStage.stageCode }}
            </div>
            <div class="stage-card-bar-stage-efficiency">
              {{ formatNumber(stage.leT3MaxEfficiencyStage.leT3Efficiency * 100, 1) }}%
            </div>
            <div class="stage-card-bar-stage-efficiency">
              {{ formatNumber(stage.leT3MaxEfficiencyStage.stageEfficiency * 100, 1) }}%
            </div>
          </div>
          <div class="stage-card-bar" v-show="stage.series.r2">
            <div class="stage-card-item-icon">
              <div :class="getCardIconSprite(stage.series.r2)"></div>
            </div>
            <div class="stage-card-bar-stage-code">
              {{ stage.leT2MaxEfficiencyStage.stageCode }}
            </div>
            <div class="stage-card-bar-stage-efficiency">
              {{ formatNumber(stage.leT2MaxEfficiencyStage.leT2Efficiency * 100, 1) }}%
            </div>
            <div class="stage-card-bar-stage-efficiency">
              {{ formatNumber(stage.leT2MaxEfficiencyStage.stageEfficiency * 100, 1) }}%
            </div>
          </div>
        </div>
      </div>
      <!-- 网站信息卡 -->
      <div class="stage-card" style="display: none; align-items: center; flex-grow: 1;">
        <div style="display: inline-block;margin:0px 16px ;">
          明日方舟一图流<br>
          ark.yituliu.cn<br>
          2024/12/20
        </div>
        <img src="/image/website/QR/yituliuQR.png" style="height: 128px; display: inline-block;">
      </div>
      <div class="stage-card" style="height: 0;border: 1px;flex-grow: 1;"></div>
      <div class="stage-card" style="height: 0;border: 1px;flex-grow: 1;"></div>
      <div class="stage-card" style="height: 0;border: 1px;flex-grow: 1;"></div>
      <div class="stage-card" style="height: 0;border: 1px;flex-grow: 1;"></div>
      <div class="stage-card" style="height: 0;border: 1px;flex-grow: 1;"></div>
      <div class="stage-card" style="height: 0;border: 1px;flex-grow: 1;"></div>
    </div>


    <!-- 材料情报卡 -->
    <StageDetailTable v-model="recommendedStageDetailTable"></StageDetailTable>


    <!-- 搓玉推荐表 -->
    <OrundumTable v-model="orundumRecommendedStage"></OrundumTable>


    <!-- 历史活动 -->
    <HistoryActivity v-model="historyActivityList"></HistoryActivity>


    <!-- 常见问题 -->
    <div class="module-header" id="frequently-asked-question">
      <div class="module-title">
        <h1>常见问题</h1>
        <h4>FAQ</h4>
      </div>
    </div>

    <div id="foot_main">
      <div class="foot_unit" style="width: 100%; white-space: normal">
        <el-card class="box-card">
          <el-collapse>
            <el-collapse-item name="2" style="">
              <template #title>
                <span style="font-size: large; display: flex; align-items: center">
                  <i class="iconfont icon-legend"></i><b style="margin-left: 4px">算法简述与图例</b></span>
              </template>
              <b>通过[物品价值表]中的物品价值和[企鹅物流数据统计]中的材料掉率计算各个关卡的效率</b>
              <hr/>
              <ul style="padding-left: 2em">
                <li>只有多于300样本的关卡才会被收录。</li>
                <li>仅收录由自动刷图软件上报的掉落数据。</li>
                <li>活动关卡只在活动期间出现。</li>
                <li>插曲和别传常驻后重新计算效率，该效率与活动时无关。</li>
              </ul>
              <b>图例</b>
              <hr/>
              <div class="stage-legend">
                <table class="stage-legend-table">
                  <tbody>
                  <tr>
                    <td>
                      <div class="stage-legend-sprite">
                        <div :class="getLegendSprite('AP_GAMEPLAY')"></div>
                      </div>
                    </td>
                    <td>
                      <span class="stage-legend-text-1">需要所有材料→</span>
                    </td>
                    <td>
                      <span class="stage-legend-text-2">14-17</span>
                    </td>
                    <td>
                      <span class="stage-legend-text-3">[综合效率]<br>所有掉落物的价值之和/理智消耗</span>
                    </td>
                    <td>
                      <span class="stage-legend-text-4">[综合效率]</span>
                    </td>
                  </tr>

                  <tr>
                    <td>
                      <div class="stage-legend-sprite">
                        <div :class="getLegendSprite('30024')"></div>
                      </div>
                    </td>
                    <td>
                        <span class="stage-legend-text-1">
                          需要<span style="color: #c01dd7;font-weight: bold">紫材料→</span>
                        </span>
                    </td>
                    <td>
                      <span class="stage-legend-text-2">14-17</span>
                    </td>
                    <td>
                        <span class="stage-legend-text-3">
                          [<span style="color: #c01dd7;font-weight: bold">T4</span>效率]<br>
                          <span style="color: #c01dd7;font-weight: bold">紫</span>
                          <span style="color: #0276f8;font-weight: bold">蓝</span>
                          <span style="color: #01c028;font-weight: bold">绿</span>白糖价值之和/理智消耗
                        </span>
                    </td>
                    <td>
                      <span class="stage-legend-text-4">[综合效率]</span>
                    </td>
                  </tr>

                  <tr>
                    <td>
                      <div class="stage-legend-sprite">
                        <div :class="getLegendSprite('30023')"></div>
                      </div>
                    </td>
                    <td>
                        <span class="stage-legend-text-1">
                          需要<span style="color: #0276f8;font-weight: bold">蓝材料→</span>
                        </span>
                    </td>
                    <td>
                      <span class="stage-legend-text-2">MB-6</span>
                    </td>
                    <td>
                        <span class="stage-legend-text-3">
                          [<span style="color: #0276f8;font-weight: bold">T3</span>效率]<br>
                          <span style="color: #0276f8;font-weight: bold">蓝</span>
                          <span style="color: #01c028;font-weight: bold">绿</span>白糖价值之和/理智消耗
                        </span>
                    </td>
                    <td>
                      <span class="stage-legend-text-4">[综合效率]</span>
                    </td>
                  </tr>
                  <tr>

                  </tr>
                  </tbody>
                </table>

              </div>


            </el-collapse-item>
            <el-collapse-item name="3" style="">
              <template #title>
                <span style="font-size: large; display: flex; align-items: center">
                  <i class="iconfont icon-publicity"></i><b style="margin-left: 4px">算法公示卡</b></span>
              </template>
              <table id="al_card">
                <tbody>
                <tr>
                  <td>算法代号</td>
                  <td>一图流_标准 v6.0</td>
                  <td>更新时间</td>
                  <td>
                    <!-- {{ updateTime }} -->
                  </td>
                </tr>
                <tr>
                  <td>数据源</td>
                  <td>企鹅物流</td>
                  <td>基准</td>
                  <td>常驻关卡</td>
                </tr>
                <tr>
                  <td>计算引擎</td>
                  <td>yituliuBackEnd</td>
                  <td>样本阈值</td>
                  <td>300</td>
                </tr>
                <tr>
                  <td>需求目标</td>
                  <td>无限需求</td>
                  <td>EXP系数</td>
                  <td>0.633</td>
                </tr>
                </tbody>
              </table>
            </el-collapse-item>
            <el-collapse-item name="4" style="">
              <template #title>
                <span style="font-size: large; display: flex; align-items: center">
                  <i class="iconfont icon-copyright"></i><b style="margin-left: 4px">版权声明与许可协议</b>
                </span>
              </template>
              网站所涉及的公司名称、商标、产品等均为其各自所有者的资产，仅供识别。网站内使用的游戏图片、动画、音频、文本原文，仅用于更好地表现游戏资料，其版权属于
              Arknights/上海鹰角网络科技有限公司。<br>
              除非另有声明，网站其他内容采用<a href="https://creativecommons.org/licenses/by-nc/4.0/deed.zh">知识共享
              署名-非商业性使用 4.0 国际
              许可协议</a>进行许可。转载、公开或以任何形式复制、发行、再传播本页任何内容时，必须注明从明日方舟一图流转载，并提供版权标识、许可协议标识、免责标识和直接指向被引用页面的链接；且未经许可不得将本站内容或由其衍生作品用于商业目的。<br>
              本项目为无偿开源项目，致力于方便明日方舟玩家。如有开发/数据分析/设计/美工经验，欢迎来<a
                href="https://jq.qq.com/?_wv=1027&k=ZmORnr5F">开发群</a>一叙。
            </el-collapse-item>
          </el-collapse>
        </el-card>
      </div>
    </div>
    <!-- <foot-component></foot-component> -->
  </div>

  <fixed-nav id="fixedNav"/>
</template>


<style></style>
