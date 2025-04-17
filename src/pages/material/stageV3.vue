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
import itemCache from '/src/utils/indexedDB/itemCache.js'
import {formatNumber} from "/src/utils/format.js";
import {useRouter} from "vue-router";
import TMP_STAGE_RESULT from '/src/static/json/material/tmp_stage_result.json'
import NoticeBoard from "@/components/NoticeBoard.vue";
import {dateFormat} from "@/utils/dateUtil.js";

const router = useRouter();

const {mobile} = useDisplay()

let dataSource = ref("Local")
let legendDisplay = ref(false)
let hiddenPermStageFlag = ref(true)
let currentItemTableIndex = ref(0)


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

loadingLocalHostData()

function loadingLocalHostData() {
  stageResultGroup.value = TMP_STAGE_RESULT.recommendedStage.sort((a, b) => a.itemSeriesId - b.itemSeriesId)
  orundumRecommendedStage.value = TMP_STAGE_RESULT.orundumRecommendedStageVO
  historyActivityList.value = TMP_STAGE_RESULT.historyActStage
  updateTime.value = TMP_STAGE_RESULT.updateTime
  getItemCardData()
  getItemTableData(0, false)
}


// 获取关卡推荐数据
function getStageResult() {

  getStageData().then(response => {

    const {recommendedStage, orundumRecommendedStageVO, historyActStage} = response

    console.log(JSON.stringify(response))

    stageResultGroup.value = recommendedStage.sort((a, b) => a.itemSeriesId - b.itemSeriesId)
    //将后端返回的数据组装为卡片需要的数据格式
    orundumRecommendedStage.value = orundumRecommendedStageVO

    historyActivityList.value = historyActStage
    dataSource.value = 'Web'
    getItemCardData()
    getItemTableData(0, false)

    itemCache.getLastSynchronizationTime().then(response => {
      updateTime.value = dateFormat(response.createTime, 'yyyy/MM/dd HH:mm')
    })
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

      const {stageEfficiency, leT4Efficiency, leT3Efficiency, leT2Efficiency, stageType} = stage

      // console.log(leT4MaxEfficiencyStage.leT4Efficiency, '<' ,leT4Efficiency ,'---', leT4MaxEfficiencyStage.leT4Efficiency < leT4Efficiency  )

      if (hiddenPermStageFlag.value && 'Local' !== dataSource.value) {
        if (stageType === "ACT_PERM") {
          continue
        }
      }

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
      display: maxEfficiencyStage.stageEfficiency > 0.8,
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
  // console.log(stageResultGroup.value)

  //推荐关卡集合
  let stageResultList = recommendedStage.stageResultList;
  recommendedStageDetailTable.value = []
  //拼接表格数据,默认按总效率排序
  stageResultList = stageResultList.sort((a, b) => b.stageEfficiency - a.stageEfficiency)


  for (const item of stageResultList) {
    const {stageType} = item
    if (hiddenPermStageFlag.value && 'Local' !== dataSource.value) {
      if (stageType === "ACT_PERM") {
        continue
      }
    }
    recommendedStageDetailTable.value.push(item)
  }

  currentItemTableIndex.value = index

  if (isJump) {
    document.getElementById('StageDetailTable').scrollIntoView({behavior: 'smooth', block: 'center'})
  }
}


function hiddenPermStage() {
  getItemCardData()
  getItemTableData(currentItemTableIndex.value, false)
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

function openNewPage() {
  window.open('https://www.bilibili.com/video/BV1jPALeTEtP')
}


onMounted(() => {


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
        <h1 style="font-size: 36px">推荐关卡</h1>
        <h4>Best Stages</h4>
      </div>

      <div style="display: flex;flex-wrap: wrap;align-items: center;margin-top: 20px;">
        <v-btn-group style="height: 36px;margin: 0 8px">
          <v-btn color="primary" :size="getButtonSize()"
                 @click="scrollToOrundumTable()">搓玉数据
          </v-btn>
          <v-btn color="primary" :size="getButtonSize()"
                 @click="scrollToHistoryStageTable()">往期活动
          </v-btn>
          <v-btn color="primary" :size="getButtonSize()"
                 @click="scrollToFrequentlyAskedQuestion()">常见问题
          </v-btn>
        </v-btn-group>
        <v-btn color="primary" style="display:none" class="m-0-8" :size="getButtonSize()"
               @click="router.push({name:'AccountHome'})" disabled>自定义一图流
        </v-btn>
        <v-btn color="secondary" variant="tonal" class="m-0-8" :size="getButtonSize()"
               @click="legendDisplay = !legendDisplay">显示图例
        </v-btn>

        <v-switch hide-details v-model="hiddenPermStageFlag" @change="hiddenPermStage()"
                  color="primary" class="m-0-8"
                  label="隐藏常驻活动关卡">
          <template v-slot:append>
            <v-tooltip

                location="top"
            >
              <template v-slot:activator="{ props }">
                <v-btn
                    icon
                    v-bind="props"
                    size="xs"
                >
                  <v-icon icon="mdi-help">
                  </v-icon>
                </v-btn>
              </template>
              <span>常驻活动关卡在部分活动中不掉落活动代币</span>
            </v-tooltip>
          </template>
        </v-switch>

        <span class="module-tip">上次同步企鹅物流时间：{{ updateTime }}</span>
      </div>
    </div>
    <!-- 说明区域 -->
    <StageLegend @click="scrollToLegendDescription" v-show="legendDisplay"></StageLegend>

    <v-alert
        border="start"
        type="warning"
        title="BUG修复提示"
        variant="tonal"
        density="compact"
    >
      <p> 官方修复了12-17掉率偏低的bug，数据源还需要一段时间更新，切削液推荐从12-17获取，详情可点击<a
          style="color: orangered;cursor: pointer"
          @click="openNewPage()">《史无前例的掉率降低！全网最速复盘12-17Bug事件始末！》</a>查看</p>
    </v-alert>

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

    <div id="frequently-asked-question"></div>
    <NoticeBoard module="stage">

    </NoticeBoard>


  </div>


  <fixed-nav id="fixedNav"/>
</template>


<style></style>
