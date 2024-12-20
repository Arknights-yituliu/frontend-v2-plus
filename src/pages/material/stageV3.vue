<script setup>
import stageApi from '/src/api/material'
import { onMounted, ref } from "vue";
import ITEM_SERIES from '/src/static/json/material/item_series.json'
import FixedNav from "/src/components/FixedNav.vue";
import TourGuide from "/src/components/TourGuide.vue";
import '/src/assets/css/material/stage.scss'
import '/src/assets/css/material/stage.phone.scss'
import { dataFormat } from '/src/utils/dateUtil.js'
import userService from '/src/utils/user/userConfig.js'
import REPRODUCTION_ACTIVITY from '/src/static/json/material/reproduction_activity.json'

import TMP_HISTORY_STAGE from '/src/static/json/material/tmp_history_stage.json'
import TMP_STAGE_RESULT from '/src/static/json/material/tmp_stage_result.json'
import TMP_STAGE_ORUNDUM from '/src/static/json/material/tmp_stage_orundum.json'
import StageLegend from "@/components/material/StageLegend.vue";
import StageDetailTable from "@/components/material/StageDetailTable.vue";
import OrundumTable from "@/components/material/OrundumTable.vue";

// import {getButtonSize} from '/src/plugins/vuetify/getDisplaySize'

function getButtonSize() {

}

let legendDisplay = ref(false)


//漫游导航指引
const guideOpen = ref(false)

let itemIdList = [] // 材料表

const itemIdListInit = () => {
  itemIdList = []
  // 先把当作表头的材料表转为一个集合
  for (const itemId in ITEM_SERIES) {
    const item = ITEM_SERIES[itemId]
    itemIdList.push({
      id: item.id,
      name: item.name,
      lastUp: false,
      lastUpInterval: 0
    })
  }
}


// 根据物品系列进行分组的推荐关卡
let stageResultGroup = ref(TMP_STAGE_RESULT.recommendedStageList.sort((a, b) => a.itemSeriesId - b.itemSeriesId))


//材料卡片数据
let stageCardData = ref([])


let updateTime = ref('')

// 获取关卡推荐数据
function getStageResult() {
  const config = userService.getStageConfig()
  stageApi.getRecommendedStage(config).then(response => {
    updateTime.value = response.data.updateTime
    stageResultGroup.value = response.data.recommendedStageList.sort((a, b) => a.itemSeriesId - b.itemSeriesId)
    //将后端返回的数据组装为卡片需要的数据格式
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

    let leT4MaxEfficiencyStage = { leT4Efficiency: 0 }
    let leT3MaxEfficiencyStage = { leT3Efficiency: 0 }
    let leT2MaxEfficiencyStage = { leT2Efficiency: 0 }
    let maxEfficiencyStage = { stageEfficiency: 0 }

    for (const stage of stageList) {

      const { stageEfficiency, leT4Efficiency, leT3Efficiency, leT2Efficiency } = stage

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
      series: { r4: '', r3: '', r2: '', r1: '' }
    }

    //获得该材料系列的上下级材料的物品id
    recommendStage.series = ITEM_SERIES[recommendedStageList.itemSeriesId].series

    list.push(recommendStage)
    // console.log(item_recommend_stage)
  }

  stageCardData.value = list
}


//根据物品id获得对应的关卡推荐数据集合
let recommendedStageDetailTable = ref([])

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
    document.getElementById('detail-table').scrollIntoView({ behavior: 'smooth', block: 'center' })
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
  document.getElementById('description').scrollIntoView({ behavior: 'smooth' })
}

/**
 * 滚动到搓玉关卡表
 */
function scrollToOrundumTable() {
  document.getElementById('orundum-table').scrollIntoView({ behavior: 'smooth' })
}

/**
 * 滚动到历史活动关卡表
 */
function scrollToHistoryStageTable() {
  document.getElementById('history-stage-table').scrollIntoView({ behavior: 'smooth' })
}

/**
 * 滚动到常见问题
 */
function scrollToFrequentlyAskedQuestion() {
  document.getElementById('frequently-asked-question').scrollIntoView({ behavior: 'smooth' })
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


function getDetailTableItemSprite(id) {
  return "bg-" + id + " table-item-sprite";
}

function getActTableItemSprite(id) {
  return "bg-" + id + " act-table-item-sprite";
}

function getActTableSimpleItemSprite(id) {
  return "bg-" + id + " act-table-simple-item-sprite";
}


/**
 * 格式化数字
 * @param {number} num 数字
 * @param {number} acc 位数
 * @returns {string} 格式化后的数字
 */
function formatNumber(num, acc) {
  acc = typeof acc !== "undefined" ? acc : 2;
  if (typeof num === "undefined") return ''
  return parseFloat(num.toString()).toFixed(acc);
}

onMounted(() => {

})


let historyActivityTable = ref([]) // 历史活动up材料表
let historyActivityList = ref(TMP_HISTORY_STAGE)

let historyActivityDisplayType = ref('')

/**
 * 传入一个设备类型，将其赋值给 actHistoryTableType 按钮通过 actHistoryTableType 进行判断是什么形式的表格
 * @param {string} device
 */
function chooseHistoryActDevice(device) {
  historyActivityDisplayType.value = device
  const pcElement = document.getElementById('act-table-pc')
  const phoneElement = document.getElementById('act-table-phone')
  if (device === 'pc') {
    pcElement.style.display = 'block'
    phoneElement.style.display = 'none'
  } else if (device === 'phone') {
    pcElement.style.display = 'none'
    phoneElement.style.display = 'block'
  }

}


function formatPcHistoryTableData() {
  historyActivityTable.value = []
  // 每种材料距离上次up间隔
  let lastUpInterval = 0;
  itemIdListInit()

  // 循环历史活动数据
  for (const act of historyActivityList.value) {
    if (act.zoneName === '落叶逐火') {
      continue
    }
    lastUpInterval++
    //复刻不计入
    // if(act.zoneName.indexOf('复刻')>-1) {
    //   continue;
    // }
    //每行数据
    let rowData = {
      activityName: act.zoneName, //活动名
      startTime: dataFormat(new Date(act.endTime), 'yyyy/MM'),
      itemList: {} //材料up情况
    }


    for (const stage of act.actStageList) {
      rowData.itemList[stage.itemId] = {
        itemId: stage.itemId,
        stageEfficiency: stage.stageEfficiency * 100,
        stageCode: stage.stageCode
      }
    }

    for (const itemIndex in itemIdList) {
      const item = itemIdList[itemIndex]
      //材料up标记
      let isUpFlag = false;

      //如果当前材料up了,将标记记为true
      if (rowData.itemList[item.id]) {
        isUpFlag = true
      }

      //如果这个材料已经up了，则将这个材料的上次up标记为true
      if (isUpFlag) {
        itemIdList[itemIndex].lastUp = true;
      }

      //如果这个材料这个活动没up,更新up间隔次数,表格根据这个间隔进行背景色的渲染
      if (!itemIdList[itemIndex].lastUp) {
        itemIdList[itemIndex].lastUpInterval = lastUpInterval;
      }
    }

    //循环复刻活动的数据
    for (const reprintActivity of REPRODUCTION_ACTIVITY) {
      //通过判断同名的活动和复刻活动，将up材料赋予给复刻活动
      if (reprintActivity.activityName === rowData.activityName) {
        //将up材料赋予给复刻活动
        reprintActivity.itemList = rowData.itemList
      }
    }

    historyActivityTable.value.push(rowData)
  }

  historyActivityTable.value[0].divider = true

  //将复刻活动按首位插入进活动表格的集合中
  for (const reprintActivity of REPRODUCTION_ACTIVITY) {
    historyActivityTable.value.unshift(reprintActivity)
  }

  itemIdList.sort((a, b) => a.lastUpInterval - b.lastUpInterval)
}

/**
 * 获取历史活动关卡数据
 */
function getHistoryActStage() {
  const config = userService.getStageConfig()
  // 获取历史活动up材料信息
  stageApi.getHistoryActStageV4(config).then(response => {
    // 历史活动数据
    historyActivityList.value = response.data
    formatPcHistoryTableData()
  })
}


function getCellBgColor(rowIndex, maxIndex) {

  if (rowIndex < REPRODUCTION_ACTIVITY.length) {
    return ''
  }

  if ((rowIndex - REPRODUCTION_ACTIVITY.length) < maxIndex) {
    return 'background-color: #82beff80'
  }
  return ''
}

function getTableDividerClass(divider) {
  if (divider) {
    return 'act-history-table-divider'
  }
}


let orundumRecommendedStage = ref([])
let displayOrundumRecommendedStage = ref([])
let onlyShowActStage = ref(false)


/**
 * 过滤搓玉推荐关卡，只显示1-7，CW-6和当前活动关
 */
function filterOrundumStage() {
  onlyShowActStage.value = !onlyShowActStage.value
  if (onlyShowActStage.value) {
    displayOrundumRecommendedStage.value = []
    for (const stage of orundumRecommendedStage.value) {
      const { stageCode, stageType } = stage

      if (stageCode === '1-7' || stageCode === 'CW-6' || stageType === 'ACT' || stageType === 'ACT_REP') {
        displayOrundumRecommendedStage.value.push(stage)
      }
    }
  } else {
    displayOrundumRecommendedStage.value = orundumRecommendedStage.value
  }
}

function getOrundumRecommendedStage() {
  const config = userService.getStageConfig()
  stageApi.getOrundumRecommendedStageV4(config).then(response => {
    formatOrundumRecommendedStage(response.data)
  })
}

function formatOrundumRecommendedStage(list) {
  orundumRecommendedStage.value = []
  for (const stage of list) {
    orundumRecommendedStage.value.push({
      stageCode: stage.stageCode,
      orundumPerAp: stage.orundumPerAp.toFixed(2),
      lmdcost: stage.lmdcost.toFixed(2) + 'w',
      orundumPerApEfficiency: (stage.orundumPerApEfficiency * 100).toFixed(2) + '%',
      stageEfficiency: (stage.stageEfficiency * 100).toFixed(2) + '%',
      stageType: stage.stageType ? stage.stageType : ''
    })
  }
  displayOrundumRecommendedStage.value = orundumRecommendedStage.value
}

getItemCardData()
getItemTableData(0, false)
formatPcHistoryTableData()
formatOrundumRecommendedStage(TMP_STAGE_ORUNDUM)

onMounted(() => {
  getOrundumRecommendedStage()
  getHistoryActStage()
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
  <tour-guide v-if="guideOpen" @close="guideOpen = false" :s1="`#sStageLegend`" :s2="`#c-0`" :s3="`#fixedNav`" />


  <!-- 地图效率Start -->
  <div id="stage" class="stage-page">
    <!-- 标题区域 -->

    <div class="module-header">
      <div class="module-title">
        <h1>推荐关卡</h1>
        <h4>Best Stages</h4>
      </div>
      <v-btn color="primary" variant="tonal" class="v-btn" :size="getButtonSize()"
        @click="legendDisplay = !legendDisplay">显示图例说明
      </v-btn>
      <v-btn color="primary" variant="tonal" class="v-btn" :size="getButtonSize()" @click="scrollToOrundumTable()">搓玉数据
      </v-btn>
      <v-btn color="primary" variant="tonal" class="v-btn" :size="getButtonSize()"
        @click="scrollToHistoryStageTable()">往期活动
      </v-btn>
      <v-btn color="primary" variant="tonal" class="v-btn" :size="getButtonSize()"
        @click="scrollToFrequentlyAskedQuestion()">常见问题
      </v-btn>
      <span class="module-tip">更新时间：{{ updateTime }}</span>
      <!-- <v-chip color="primary" variant="tonal" class="v-btn" :size="getButtonSize()">
        更新时间：{{ updateTime }}
      </v-chip> -->

    </div>


    <!-- 说明区域 -->



    <StageLegend @click="scrollToLegendDescription" v-show="legendDisplay"></StageLegend>

    <!-- 卡片区域 -->
    <div id="stageForCards" class="stage-card-wrap">
      <div class="stage-card" v-for="(stage, index) in stageCardData" :key="index"
        @click="getItemTableData(index, true)" :id="`c-${index}`">
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
      <div class="stage-card" style="display: flex; align-items: center; flex-grow: 1;display: none;">
        <div style="display: inline-block;margin:0px 16px ;">
          明日方舟一图流<br>
          ark.yituliu.cn<br>
          2024/12/20
        </div>
        <img src="\public\image\website\QR\yituliuQR.png" style="height: 128px; display: inline-block;">
      </div>
      <div class="stage-card" style="height: 0;border: 1px;flex-grow: 1;"></div>
      <div class="stage-card" style="height: 0;border: 1px;flex-grow: 1;"></div>
      <div class="stage-card" style="height: 0;border: 1px;flex-grow: 1;"></div>
      <div class="stage-card" style="height: 0;border: 1px;flex-grow: 1;"></div>
      <div class="stage-card" style="height: 0;border: 1px;flex-grow: 1;"></div>
      <div class="stage-card" style="height: 0;border: 1px;flex-grow: 1;"></div>
    </div>


    <!-- 材料情报卡 -->
    <div class="module-header">
      <div class="module-title">
        <h1>材料详情</h1>
        <h4>Item Info</h4>
      </div>
      <span class="module-tip">*移动端可左右拖动查看</span>
    </div>

    <StageDetailTable v-model="recommendedStageDetailTable"></StageDetailTable>

    <!-- 搓玉 -->
    <!--    <div class="op_title" id="orundum-table">-->
    <!--      <div class="op_title_text">-->
    <!--        <div class="op_title_ctext">搓玉数据表</div>-->
    <!--        <div class="op_title_etext_light">Orundum</div>-->
    <!--      </div>-->
    <!--      <div class="op_title_tag">-->
    <!--        &lt;!&ndash; <div class="op_tag_0">图例</div> &ndash;&gt;-->
    <!--        <div class="op_tag_0" @click="filterOrundumStage()">仅显示活动关</div>-->
    <!--      </div>-->
    <!--    </div>-->
    <div class="module-header" id="orundum-table">
      <div class="module-title">
        <h1>搓玉数据表</h1>
        <h4>Orundum</h4>
      </div>
      <v-btn color="primary" variant="tonal" :size="getButtonSize()" @click="filterOrundumStage()">
        仅显示1-7、CW-6和活动关
      </v-btn>
    </div>

    <OrundumTable v-model="displayOrundumRecommendedStage"></OrundumTable>

    <!--    <div class="tableArea" style="margin:0 8px;max-width: 720px;border: 1px solid #00000040;border-radius: 8px;">-->
    <!--      <el-table class="detailTable" :data="displayOrundumRecommendedStage" stripe style="width: 100%;height: 400px;">-->
    <!--        <el-table-column prop="stageCode" label="关卡名"/>-->
    <!--        <el-table-column label="每理智可搓玉">-->
    <!--          <template #default="scope">-->
    <!--            <div style="display: flex; align-items: center">-->
    <!--              <span style="margin-left: 10px">{{ scope.row.orundumPerAp }}</span>-->
    <!--              <div class="orundum-table-icon">-->
    <!--                <div class="bg-4003_icon sprite-icon"></div>-->
    <!--              </div>-->
    <!--            </div>-->
    <!--          </template>-->
    <!--        </el-table-column>-->
    <!--        <el-table-column label="每搓1抽消耗">-->
    <!--          <template #default="scope">-->
    <!--            <div style="display: flex; align-items: center">-->
    <!--              <span style="margin-left: 10px">{{ scope.row.lmdcost }}</span>-->
    <!--              <div class="orundum-table-icon">-->
    <!--                <div class="bg-4001_icon sprite-icon" style="top:-8px"></div>-->
    <!--              </div>-->
    <!--            </div>-->
    <!--          </template>-->
    <!--        </el-table-column>-->
    <!--        <el-table-column prop="orundumPerApEfficiency" label="搓玉效率"/>-->
    <!--        <el-table-column prop="stageEfficiency" label="关卡效率"/>-->
    <!--      </el-table>-->
    <!--    </div>-->
    <!-- 历史活动 -->
    <div class="module-header" id="history-stage-table">
      <div class="module-title">
        <h1>往期活动数据</h1>
        <h4>History Event</h4>
      </div>
      <v-btn color="primary" variant="tonal" class="tag-button" @click="chooseHistoryActDevice('phone')">列表模式
      </v-btn>
      <v-btn color="primary" variant="tonal" class="tag-button" @click="chooseHistoryActDevice('pc')">表格模式</v-btn>
    </div>

    <!-- pc端大表格 -->
    <v-card class="activity-table-pc-card" id="act-table-pc">
      <table class="activity-table-pc">
        <tbody>
          <tr>
            <td class="activity-name-pc">活动名称</td>
            <td v-for="(item, index) in itemIdList" :key="index">
              <div class="activity-pickup-item-pc">
                <div :class="getActTableItemSprite(item.id)"></div>
              </div>
            </td>
          </tr>
          <tr v-for="(act, rowIndex) in historyActivityTable" :key="rowIndex"
            :class="getTableDividerClass(act.divider)">
            <td class="activity-name-pc">
              {{ act.activityName }} <br>
              {{ act.startTime }}
            </td>
            <td v-for="(item, index) in itemIdList" :key="index" :style="getCellBgColor(rowIndex, item.lastUpInterval)">
              <div class="activity-pickup-item-pc" v-if="act.itemList[item.id]">
                <div :class="getActTableItemSprite(item.id)"></div>
              </div>
              <div class="activity-stage-efficiency-pc" v-if="act.itemList[item.id]">
                {{ formatNumber(act.itemList[item.id].stageEfficiency, 2) }}%
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </v-card>
    <!-- 移动端小列表 -->
    <v-card class="activity-table-phone-card" id="act-table-phone">
      <table class="activity-table-phone">
        <tr v-for="(act, index) in historyActivityList" :key="index">
          <td class="activity-name-phone">{{ act.zoneName }}</td>
          <td v-for="(stage, index) in act.actStageList" :key="index">
            <div class="activity-drop">
              <div class="activity-pickup-item">
                <div :class="getActTableSimpleItemSprite(stage.itemId)"></div>
              </div>
              <span class="activity-drop-detail">
                {{ stage.stageCode }} <br>
                {{ formatNumber(stage.stageEfficiency * 100, 2) }}%
              </span>
            </div>
          </td>
        </tr>
      </table>
    </v-card>
    <!-- 常见问题 -->
    <div class="module-header" id="frequently-asked-question">
      <div class="module-title">
        <h1>常见问题</h1>
        <h4>FAQ</h4>
      </div>
    </div>
    <!--    <div class="op_title" id="frequently-asked-question">-->
    <!--      <div class="op_title_text">-->
    <!--        <div class="op_title_ctext">常见问题</div>-->
    <!--        <div class="op_title_etext_light">FAQ</div>-->
    <!--      </div>-->
    <!--      <div class="op_title_tag" style="height: 24px">-->
    <!--        <div class="tab_text">-->
    <!--        </div>-->
    <!--      </div>-->
    <!--    </div>-->

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
              <hr />
              <ul style="padding-left: 2em">
                <li>只有多于300样本的关卡才会被收录。</li>
                <li>仅收录由自动刷图软件上报的掉落数据。</li>
                <li>活动关卡只在活动期间出现。</li>
                <li>插曲和别传常驻后重新计算效率，该效率与活动时无关。</li>
              </ul>
              <b>图例</b>
              <hr />
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
              本项目为无偿开源项目，致力于方便明日方舟玩家。如有开发/数据分析/设计/美工经验，欢迎来<a href="https://jq.qq.com/?_wv=1027&k=ZmORnr5F">开发群</a>一叙。
            </el-collapse-item>
          </el-collapse>
        </el-card>
      </div>
    </div>
    <!-- <foot-component></foot-component> -->
  </div>

  <fixed-nav id="fixedNav" />
</template>


<style></style>
