<script setup>
import stageApi from '/src/api/material'
import {onMounted, ref} from "vue";
import itemSeries from '/src/static/json/material/item_series.json'
import FixedNav from "/src/components/FixedNav.vue";
import TourGuide from "/src/components/TourGuide.vue";
import '/src/assets/css/material/stage.scss'
import '/src/assets/css/material/stage.phone.scss'
import {dateFormat} from '/src/utils/dateUtil.js'
//漫游导航指引
const guideOpen = ref(false)

// 根据物品系列进行分组的推荐关卡
let stageResultGroup = {}
// let stage_result_group = ref(stage_api_data.data.recommendedStage.sort((a,b)=>a.itemSeriesId-b.itemSeriesId))

//材料卡片数据
let stageCardData = ref([])

//当前时间的时间戳
let nowTimeStamp = new Date().getTime();

let item_value_obj = ref({})

let selected_item = ref({
  itemId: '30013',
  itemValueAp: 17.32,
  itemName: '固源岩组',
  lastUp: {
    activityName: '叙拉古人',
    date: '2023-12-31'
  },
  nextUp: {
    activityName: '叙拉古人',
    date: '2023-12-31'
  },
  storeCostPerf: [
    {token: '4005', costPerf: 0.75},
    {token: 'EPGS_COIN', costPerf: 0.75},
    {token: 'REP_COIN', costPerf: 0.75},
    {token: '4004', costPerf: 0.75}
  ]
})


let updateTime = ref('')

// 获取关卡推荐数据
function getStageResult() {
  stageApi.getStageResultGroupByItemSeries(0.633, 300).then(response => {
    updateTime.value = response.data.updateTime
    stageResultGroup = response.data.recommendedStageList.sort((a, b) => a.itemSeriesId - b.itemSeriesId)
    //将后端返回的数据组装为卡片需要的数据格式
    getItemCardData()
    //获取材料价值数据
    stageApi.getItemValueTable(0.633).then(response => {
      for (const item of response.data) {
        item_value_obj.value[item.itemId] = item;
      }
      getItemTableData(0, false)
    })
  })
}


/**
 * 拼接材料卡片的数据
 */
function getItemCardData() {
  for (let index in stageResultGroup) {
    //每一种材料系列的推荐关卡
    let recommendedStageList = stageResultGroup[index]
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
      series: {r4: '', r3: '', r2: '', r1: ''}
    }

    //获得该材料系列的上下级材料的物品id
    recommendStage.series = itemSeries[recommendedStageList.itemSeriesId].series

    stageCardData.value.push(recommendStage)
    // console.log(item_recommend_stage)
  }
}


//根据物品id获得对应的关卡推荐数据集合
let item_table_data_by_item_id = ref([])

/**
 * 根据索引获得对应材料系列的所有推荐关卡
 * @param {number} index 集合索引,卡片展示的材料和索引对应  简单例子[0:xxx材料的所有数据]
 * @param {boolean} isJump 是否跳转到表格位置
 */
function getItemTableData(index, isJump) {
  //当前材料系列的推荐关卡
  let recommended_stage = stageResultGroup[index];
  //推荐关卡集合
  let stage_result_list = recommended_stage.stageResultList;
  //拼接表格数据,默认按总效率排序
  item_table_data_by_item_id.value = stage_result_list.sort((a, b) => b.stageEfficiency - a.stageEfficiency)

  if (isJump) {
    document.getElementById('detail-table').scrollIntoView({behavior: 'smooth', block: 'center'})
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


let itemIdList = [] // 材料表
let historyActItemTable = [] // 历史活动up材料表
let historyActItemList = []

let historyActDevice = ref('')

/**
 * 传入一个设备类型，将其赋值给 historyActDevice 按钮通过 historyActDevice 进行判断是什么模式
 * @param {string} device
 */
function chooseHistoryActDevice(device) {
  historyActDevice.value = device
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


function historyActDeviceBtnClass(device) {
  if (device === historyActDevice.value) {
    // return 'op_tag_1'
  }
  // return 'op_tag_0'
}

// 未来复刻的活动
const reprintActivityList = [
  {activityName: '孤星', startTime: '预计2024/05', itemList: {}},
  {activityName: '空想花庭', startTime: '预计2024/06', itemList: {}},
  {activityName: '火山旅梦', startTime: '预计2024/07', itemList: {}},
  {activityName: '不义之财', startTime: '预计2024/08', itemList: {}},
  {activityName: '崔林特尔梅之金', startTime: '预计2024/09', itemList: {}},
  {activityName: '银心湖列车', startTime: '预计2024/10', itemList: {}},
  {activityName: '怀黍离', startTime: '预计2025/01', itemList: {}}
]


/**
 * 获取历史活动关卡数据
 */
function getHistoryActStage() {
  historyActItemTable = []

  // 获取历史活动up材料信息
  stageApi.getHistoryActStage(0.633, 300).then(response => {
    // 先把当作表头的材料表转为一个集合
    for (const itemId in itemSeries) {
      const item = itemSeries[itemId]
      itemIdList.push({
        id: item.id,
        name: item.name,
        lastUp: false,
        lastUpInterval: 0
      })
    }

    // 历史活动数据
    historyActItemList = response.data

    // 每种材料距离上次up间隔
    let lastUpInterval = 0;

    // 循环历史活动数据
    for (const act of response.data) {
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
        startTime: dateFormat(new Date(act.endTime), 'yyyy/MM'),
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

      for (const reprintActivity of reprintActivityList) {
        if (reprintActivity.activityName === rowData.activityName) {
          reprintActivity.itemList = rowData.itemList
        }
      }

      historyActItemTable.push(rowData)
    }

    for (const reprintActivity of reprintActivityList) {
      historyActItemTable.unshift(reprintActivity)
    }

    itemIdList.sort((a, b) => a.lastUpInterval - b.lastUpInterval)
  })
}


function getCellBgColor(rowIndex, maxIndex) {

  if (rowIndex < reprintActivityList.length) {
    return ''
  }

  // console.log((rowIndex - reprintActivityList.length), '<', maxIndex)
  if ((rowIndex - reprintActivityList.length) < maxIndex) {
    return 'background-color: #82beff80'
  }
  return ''
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
      const {stageCode, stageType} = stage

      if (stageCode === '1-7' || stageCode === 'CW-6' || stageType === 'ACT' || stageType === 'ACT_REP') {
        displayOrundumRecommendedStage.value.push(stage)
      }
    }
  } else {
    displayOrundumRecommendedStage.value = orundumRecommendedStage.value
  }
}

function getOrundumRecommendedStage() {
  stageApi.getOrundumRecommendedStage(0.633, 300).then(response => {
    for (const stage of response.data) {
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
  })
}

function getFormatDate() {

}

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
  <tour-guide v-if="guideOpen" @close="guideOpen=false" :s1="`#sStageLegend`" :s2="`#c-0`" :s3="`#fixedNav`"/>


  <!-- 地图效率Start -->
  <div id="stage" class="stage-page">
    <!-- 标题区域 -->

    <div class="module-header">
      <div class="module-title">
        <h1>推荐关卡</h1>
        <h4>Best Stages</h4>
      </div>
      <button class="tag-button" @click="scrollToOrundumTable()">搓玉数据</button>
      <button class="tag-button" @click="scrollToHistoryStageTable()">往期活动</button>
      <button class="tag-button" @click="scrollToFrequentlyAskedQuestion()">常见问题</button>
      <!--      <button class="tag-button" @click="guideOpen=true">*点我查看操作指引</button>-->
      <!--      <span class="c-module-tip"></span>-->
      <span class="module-tip">更新时间：{{ updateTime }}</span>
    </div>
    <!-- 说明区域 -->

    <div class="recommendation-table-wrap" style="display: none">
      <h1>活动期间刷图推荐</h1>

      <table class="recommendation-table">
        <tbody>
        <tr>
          <td>材料</td>
          <td>推荐关卡</td>
          <td>关卡效率</td>
        </tr>
        <tr>
          <td>全新装置</td>
          <td>14-16、14-8、14-12、14-19</td>
          <td>125%(副本掉率提升+理智小样)</td>
        </tr>
        <tr>
          <td>酮凝集组</td>
          <td>14-20、14-14、14-6、14-9、14-17</td>
          <td>125%(副本掉率提升+理智小样)</td>
        </tr>
        <tr>
          <td>化合切削液</td>
          <td>12-17</td>
          <td>112%(仅理智小样)</td>
        </tr>
        <tr>
          <td>固源岩系</td>
          <td>1-7</td>
          <td>112%(仅理智小样)</td>
        </tr>
        <tr>
          <td> 其他精英材料</td>
          <td>对应的主线最优关</td>
          <td>112%(仅理智小样)</td>
        </tr>
        <tr>
          <td>资源本<br>龙门币/芯片/红票等</td>
          <td>对应的最高级资源关</td>
          <td> 112%(仅理智小样)</td>
        </tr>
        </tbody>
      </table>
      <span >*关卡效率：关卡掉落物品的总价值 / 关卡理智消耗，数值越大越推荐刷。<br>图上数据非最终结论，仅供参考，其他材料up关卡未必差。后续可查看一图流网站实时更新的材料一图流</span>
      <span>代币仅在第14章掉落，优先搬空商店。<br>效率计算：明日方舟一图流 https://ark.yituliu.cn<br>掉落数据：企鹅物流数据统计 https://penguin-stats.cn<br></span>

<!--      <span style="text-align: right;">制图：&emsp;B站@罗德岛基建BETA</span>-->
      <span style="text-align: right;">数据收集时间：&emsp;2024.5.3 09:00</span>
    </div>


    <!-- 图例3.0 -->
    <div class="stage-legend" @click="scrollToLegendDescription" id="sStageLegend" style="display: none;">
      <table class="stage-legend-table">
        <tbody>
        <tr>
          <td>
            <div class="stage-legend-sprite">
              <div :class="getLegendSprite('AP_GAMEPLAY')"></div>
            </div>
          </td>
          <td class="stage-legend-text-1">
            <span>需要所有材料→</span>
          </td>
          <td class="stage-legend-text-2">
            <span>10-10</span>
          </td>
          <td class="stage-legend-text-3">
            <span class="stage-legend-text-bold">[综合效率]</span>
            <br>
            <span class="stage-legend-text-underline">
                所有掉落物的价值之和
            </span>
            <br>
            <span>理智消耗</span>
          </td>
          <td class="stage-legend-text-4">
            <span>[综合效率]</span>
          </td>
        </tr>

        <tr>
          <td>
            <div class="stage-legend-sprite">
              <div :class="getLegendSprite('30024')"></div>
            </div>
          </td>
          <td class="stage-legend-text-1">
            <span>
              需要<span style="color: #c01dd7;font-weight: bold">紫材料→</span>
              </span>
          </td>
          <td class="stage-legend-text-2">
            <span>LE-5</span>
          </td>
          <td class="stage-legend-text-3">
            <span class="stage-legend-text-bold" style="color: #c01dd7;">[T4效率]</span>
            <br>
            <span class="stage-legend-text-underline">
              <span style="color: #c01dd7;font-weight: bold">紫</span>
              <span style="color: #0276f8;font-weight: bold">蓝</span>
              <span style="color: #01c028;font-weight: bold">绿</span>
              <span>白糖价值之和 </span>
            </span>
            <br>
            <span>理智消耗</span>

          </td>
          <td class="stage-legend-text-4">
            <span>[综合效率]</span>
          </td>
        </tr>

        <tr>
          <td>
            <div class="stage-legend-sprite">
              <div :class="getLegendSprite('30023')"></div>
            </div>
          </td>
          <td class="stage-legend-text-1">
            <span>
              需要<span style="color: #0276f8;font-weight: bold">蓝材料→</span>
              </span>
          </td>
          <td class="stage-legend-text-2">
            <span>LE-5</span>
          </td>
          <td class="stage-legend-text-3">
            <span class="stage-legend-text-bold" style="color: #0276f8;">[T3效率]</span>
            <br>
            <span class="stage-legend-text-underline">
              <span style="color: #0276f8;font-weight: bold">蓝</span>
              <span style="color: #01c028;font-weight: bold">绿</span>
              <span>白糖价值之和 </span>
            </span>
            <br>
            <span>理智消耗</span>

          </td>
          <td class="stage-legend-text-4">
            <span>[综合效率]</span>
          </td>
        </tr>
        </tbody>
      </table>
    </div>


    <!-- 卡片区域 -->
    <div id="stageForCards" class="stage-card-wrap" style="background-color: rgb(45,45,45);max-width: 420px;">
      <div class="stage-card" v-for="(stage, index) in stageCardData" :key="index"
           @click="getItemTableData(index, true)"
           :id="`c-${index}`"
           style="background-color: rgb(61,61,61);margin: 4px;"
      >
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
      <div class="stage-card" style="height: 0px;border: 1px;flex-grow: 1;"></div>
      <div class="stage-card" style="height: 0px;border: 1px;flex-grow: 1;"></div>
    </div>


    <!-- 材料情报卡 -->
    <div class="module-header">
      <div class="module-title">
        <h1>材料详情</h1>
        <h4>Item Info</h4>
      </div>
      <span class="module-tip">*移动端可左右拖动查看</span>
    </div>
    <!-- 详情表 -->
    <div id="detail-table" style="margin:0px 8px;width: 900px;height: 495px;border: 1px solid #00000040;font-size: 18px;padding: 15px 22px;">
      <el-table stripe :data="item_table_data_by_item_id" max-height="495" max-width="892" class="stage-detail-table">
        <el-table-column fixed prop="stageCode" label="关卡名" width="96px" >
          <template #default="scope">
            <div style="font-size: 16px;line-height: 20px;font-weight: 600;color: #000000;">
              <span style="font-size: 12px;line-height: 8px;font-weight: 400;color: #000000;">{{ replaceZoneName(scope) }}</span><br>
              {{ scope.row.stageCode }}
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="primary" label="主产物" width="93px">
          <template #default="scope">
            <div class="stage-detail-table-item-icon" style="margin-left: 6px;">
              <div :class="getDetailTableItemSprite(scope.row.itemId)"></div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="secondary" label="副产物" width="78px">
          <template #default="scope">
            <div class="stage-detail-table-item-icon" style="margin-left: 6px;">
              <div :class="getDetailTableItemSprite(scope.row.secondaryItemId)"></div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="primary" label="主产物掉率" width="120px">
          <template #default="scope">
            <div style="margin-left: 8px;">{{ formatNumber(scope.row.knockRating * 100, 1) }}%</div>
          </template>
        </el-table-column>
        <el-table-column prop="primary" label="期望理智" width="96px">
          <template #default="scope">
            <div style="margin-left: 8px;">{{ formatNumber(scope.row.apExpect, 1) }}</div>
          </template>
        </el-table-column>
        <el-table-column prop="eff" label="综合效率" width="96px">
          <template #default="scope">
            <div style="margin-left: 4px;">{{ formatNumber(scope.row.stageEfficiency * 100, 1) }}%</div> 
          </template>
        </el-table-column>
        <el-table-column prop="spm" label="SPM" :width="72"/>
        <el-table-column prop="leT4Efficiency" label="T4材料效率" width="120px">
          <template #default="scope">
            <div style="margin-left: 16px;">{{ formatNumber(scope.row.leT4Efficiency * 100, 1) }}%</div>
          </template>
        </el-table-column>
        <el-table-column prop="leT3Efficiency" label="T3材料效率" width="120px">
          <template #default="scope">
            <div style="margin-left: 16px;">{{ formatNumber(scope.row.leT3Efficiency * 100, 1) }}%</div>
          </template>
        </el-table-column>
      </el-table>
    </div>

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
      <button class="tag-button" @click="filterOrundumStage()">仅显示1-7、CW-6和活动关</button>
    </div>

    <div class="tableArea" style="margin:0px 8px;max-width: 720px;border: 1px solid #00000040;border-radius: 8px;">
      <el-table class="detailTable" :data="displayOrundumRecommendedStage" stripe style="width: 100%;height: 400px;">
        <el-table-column prop="stageCode" label="关卡名"/>
        <el-table-column label="每理智可搓玉">
          <template #default="scope">
            <div style="display: flex; align-items: center">
              <span style="margin-left: 10px">{{ scope.row.orundumPerAp }}</span>
              <div class="orundum-table-icon">
                <div class="bg-4003_icon sprite-icon"></div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="每搓1抽消耗">
          <template #default="scope">
            <div style="display: flex; align-items: center">
              <span style="margin-left: 10px">{{ scope.row.lmdcost }}</span>
              <div class="orundum-table-icon">
                <div class="bg-4001_icon sprite-icon" style="top:-8px"></div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="orundumPerApEfficiency" label="搓玉效率"/>
        <el-table-column prop="stageEfficiency" label="关卡效率"/>
      </el-table>
    </div>
    <!-- 历史活动 -->
    <div class="module-header" id="history-stage-table">
      <div class="module-title">
        <h1>往期活动数据</h1>
        <h4>History Event</h4>
      </div>
      <button class="tag-button" @click="chooseHistoryActDevice('phone')">列表模式
      </button>
      <button class="tag-button" @click="chooseHistoryActDevice('pc')">表格模式</button>
    </div>

    <!--    <div class="op_title" id="history-stage-table">-->
    <!--      <div class="op_title_text">-->
    <!--        <div class="op_title_ctext">往期活动数据</div>-->
    <!--        <div class="op_title_etext_light">History Event</div>-->
    <!--      </div>-->
    <!--      <div class="op_title_tag">-->
    <!--        &lt;!&ndash; <div class="op_tag_0">图例</div> &ndash;&gt;-->
    <!--        <div :class="historyActDeviceBtnClass('phone')" @click="chooseHistoryActDevice('phone')">紧密模式-->
    <!--        </div>-->
    <!--        <div :class="historyActDeviceBtnClass('pc')" @click="chooseHistoryActDevice('pc')">表格模式</div>-->
    <!--      </div>-->
    <!--    </div>-->
    <!-- pc端大表格 -->
    <div class="activity-table-pc-card" id="act-table-pc">
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
        <tr v-for="(act, rowIndex) in historyActItemTable" :key="rowIndex">
          <td class="activity-name-pc">
            {{ act.activityName }} <br>
            {{ act.startTime }}
          </td>
          <td v-for="(item, index) in itemIdList" :key="index"
              :style="getCellBgColor(rowIndex , item.lastUpInterval)">
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
    </div>
    <!-- 移动端小列表 -->
    <div class="activity-table-phone-card" id="act-table-phone">
      <table class="activity-table-phone">
        <tr v-for="(act, index) in historyActItemList" :key="index">
          <td class="activity-name-phone">{{ act.zoneName }}</td>
          <td v-for="(stage, index) in  act.actStageList" :key="index">
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
    </div>
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
                      <span class="stage-legend-text-2">10-10</span>
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
                      <span class="stage-legend-text-2">LE-5</span>
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
                      <span class="stage-legend-text-2">LE-5</span>
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


<style scoped>
.el-table{
  font-size: 18px;
  color: #000;
}
.cell{
  color: #000;
  padding: 0px 0px 0px 12px;
}

thead{
  color: #000;
}

</style>


