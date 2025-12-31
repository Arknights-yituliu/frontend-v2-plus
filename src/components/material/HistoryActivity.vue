<script setup>
import {onMounted, ref} from "vue";
import ItemImage from "/src/components/sprite/ItemImage.vue";
import {dateFormat} from "/src/utils/dateUtil.js";
import {itemSeriesIdList} from "/src/utils/item/itemSeries.js";

import REPRODUCTION_ACTIVITY from '/src/static/json/material/reproduction_activity.json'
import {formatNumber} from "/src/utils/format.js";
import ModuleHeader from "@/components/layout/ModuleHeader.vue";

const props = defineProps(['modelValue'])

//大表格
let historyActivityTable = ref([])
//小表格
let historyActivityList = ref([])
let historyActivityDisplayType = ref('')


let historyActivityTableHeaders = ref([]) // 材料表

function initTableHeader() {
  let list = []
  for (const itemId of itemSeriesIdList) {
    list.push({
      itemId: itemId,
      lastUp: false,
      lastUpInterval: 0
    })
  }
  return list
}


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


function getStageEfficiency(info) {
  if (info) {
    return formatNumber(info.stageEfficiency, 2)
  }

}


let dataLength = ref(0)

const startTime = Date.now()


const intervalId = setInterval(formatPcHistoryTableData, 500);

/**
 * 格式化PC端历史活动表格数据
 * 处理活动数据，计算材料UP间隔，生成表格数据
 */
function formatPcHistoryTableData() {
  // 检查是否超过执行时间限制
  if (Date.now() - startTime > 30 * 1000) {
    console.log('取消更新任务')
    clearInterval(intervalId)
    return
  }

  // 检查数据是否更新
  if (dataLength.value >= props.modelValue.length) {
    return
  }

  // 初始化表格表头
  historyActivityTableHeaders.value = initTableHeader()

  // 更新数据长度和列表
  dataLength.value = props.modelValue.length
  console.log('数据更新')
  historyActivityList.value = props.modelValue
  historyActivityTable.value = []

  // 每种材料距离上次up间隔
  let lastUpInterval = 0
  // 存储活动名称到材料列表的映射，用于快速查找复刻活动材料
  const activityItemMap = new Map()

  // 循环处理历史活动数据
  for (const act of historyActivityList.value) {
    // 跳过特定活动
    if (act.zoneName === '落叶逐火') {
      continue
    }

    lastUpInterval++

    // 创建活动行数据
    const rowData = {
      activityName: act.zoneName, // 活动名
      startTime: dateFormat(new Date(act.endTime), 'yyyy/MM'), // 格式化结束时间
      itemList: {} // 材料up情况
    }

    // 处理活动关卡数据，筛选每个材料的最高效率关卡
    const itemList = {}
    for (const stage of act.actStageList) {
      const itemId = stage.itemId
      const efficiency = stage.stageEfficiency * 100
      
      // 只保留效率最高的关卡
      if (!itemList[itemId] || itemList[itemId].stageEfficiency < efficiency) {
        itemList[itemId] = {
          itemId,
          stageEfficiency: efficiency,
          stageCode: stage.stageCode
        }
      }
    }
    
    rowData.itemList = itemList
    // 存储活动材料映射
    activityItemMap.set(rowData.activityName, itemList)

    // 更新材料的上次UP状态和间隔
    for (const header of historyActivityTableHeaders.value) {
      const isUp = !!rowData.itemList[header.itemId]
      
      if (isUp) {
        header.lastUp = true
      } else if (!header.lastUp) {
        // 如果材料尚未UP，更新间隔
        header.lastUpInterval = lastUpInterval
      }
    }

    historyActivityTable.value.push(rowData)
  }

  // 标记第一个活动为分隔符（添加防御性检查）
  if (historyActivityTable.value.length > 0) {
    historyActivityTable.value[0].divider = true
  }

  // 处理复刻活动，快速查找对应材料
  const reprintActivities = REPRODUCTION_ACTIVITY.map(activity => {
    const itemList = activityItemMap.get(activity.activityName) || {}
    return { ...activity, itemList }
  })

  // 将复刻活动插入到表格开头
  historyActivityTable.value.unshift(...reprintActivities)

  // 按上次UP间隔对表头进行排序
  historyActivityTableHeaders.value.sort((a, b) => a.lastUpInterval - b.lastUpInterval)
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

onMounted(() => {
  chooseHistoryActDevice('pc')
})

</script>


<template>
  <div class="flex-wrap flex  align-center">
    <ModuleHeader title="往期活动数据" title-en="History Event"></ModuleHeader>
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
        <td v-for="(item, index) in historyActivityTableHeaders" :key="index">
          <div>
            <ItemImage :item-id="item.itemId" class="m-a"></ItemImage>
          </div>
        </td>
      </tr>
      <tr v-for="(act, rowIndex) in historyActivityTable" :key="rowIndex" :class="getTableDividerClass(act.divider)">
        <td class="activity-name-pc">
          {{ act.activityName }} <br>
          {{ act.startTime }}
        </td>
        <td v-for="(item, index) in historyActivityTableHeaders" :key="index"
            :style="getCellBgColor(rowIndex, item.lastUpInterval)">
          <div v-show="act.itemList[item.itemId]">
            <ItemImage :item-id="item.itemId" class="m-a"></ItemImage>
          </div>
          <div class="activity-stage-efficiency-pc" v-show="act.itemList[item.itemId]">
            {{ getStageEfficiency(act.itemList[item.itemId]) }}%
          </div>
        </td>
      </tr>
      </tbody>
    </table>
  </v-card>
  <!-- 移动端小列表 -->
  <!-- <v-card class="activity-table-phone-card" id="act-table-phone">
    <table class="activity-table-phone">
      <tr v-for="(act, index) in historyActivityList" :key="index">
        <td class="activity-name-phone">{{ act.zoneName }}</td>
        <td v-for="(stage, index) in act.actStageList" :key="index">
          <div class="activity-drop">

            <ItemImage :item-id="stage.itemId"></ItemImage>

            <span class="activity-drop-detail">
                {{ stage.stageCode }} <br>
                {{ formatNumber(stage.stageEfficiency * 100, 2) }}%
            </span>
          </div>
        </td>
      </tr>
    </table>
  </v-card> -->

  <!-- 正常 container，不加 fluid -->

  <v-container id="act-table-phone">
    <v-row dense>
      <v-col
          v-for="(act, index) in historyActivityList"
          :key="index"
          cols="12"
      >
        <v-card max-width="570">
          <v-card-text style="padding: 12px;">
            <v-row class="d-flex align-center" no-gutters>
              <!-- 左边活动名称，xs占满12列，sm及以上自动调整 -->
              <v-col cols="12" sm="4">
                <div class="text-h6 font-weight-bold">
                  {{ act.zoneName }}
                </div>
              </v-col>

              <!-- 右边模块，xs占满12列，sm及以上占8列 -->
              <v-col cols="12" sm="8">
                <div class="d-flex flex-row flex-wrap ga-2 justify-end" style="max-width: 100%;">
                  <div
                      v-for="(stage, stageIndex) in act.actStageList"
                      :key="stageIndex"
                      class="d-flex align-center"
                      style="width: 108px;"
                  >
                    <ItemImage :item-id="stage.itemId" size="36"/>
                    <div class="d-flex flex-column ms-2">
                      <div>{{ stage.stageCode }}</div>
                      <div class="text-caption">
                        {{ formatNumber(stage.stageEfficiency * 100, 2) }}%
                      </div>
                    </div>
                  </div>
                </div>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>


</template>