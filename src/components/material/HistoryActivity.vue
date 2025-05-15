<script setup>
import {ref} from "vue";
import ItemImage from "/src/components/sprite/ItemImage.vue";
import {dateFormat} from "/src/utils/dateUtil.js";
import {itemSeriesIdList} from "/src/utils/item/itemSeries.js";

import REPRODUCTION_ACTIVITY from '/src/static/json/material/reproduction_activity.json'
import {formatNumber} from "/src/utils/format.js";

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

function formatPcHistoryTableData() {

  if (Date.now() - startTime > 30 * 1000) {
    console.log('取消更新任务')
    clearInterval(intervalId)
  }

  if (dataLength.value >= props.modelValue.length) {
    // console.log('数据未更新')
    return
  }


  historyActivityTableHeaders.value = initTableHeader()

  dataLength.value = props.modelValue.length
  console.log('数据更新')
  historyActivityList.value = props.modelValue

  historyActivityTable.value = []
  // 每种材料距离上次up间隔
  let lastUpInterval = 0;


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

    for (const header of historyActivityTableHeaders.value) {

      //材料up标记
      let isUpFlag = false;

      //如果当前材料up了,将标记记为true
      if (rowData.itemList[header.itemId]) {
        isUpFlag = true
      }

      //如果这个材料已经up了，则将这个材料的上次up标记为true
      if (isUpFlag) {
        header.lastUp = true;
      }

      //如果这个材料这个活动没up,更新up间隔次数,表格根据这个间隔进行背景色的渲染
      if (!header.lastUp) {
        header.lastUpInterval = lastUpInterval;
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


</script>


<template>
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
        <td v-for="(item, index) in historyActivityTableHeaders" :key="index">
          <div>
            <ItemImage :item-id="item.itemId" class="m-a" ></ItemImage>
          </div>
        </td>
      </tr>
      <tr v-for="(act, rowIndex) in historyActivityTable" :key="rowIndex"
          :class="getTableDividerClass(act.divider)">
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
  <v-card class="activity-table-phone-card" id="act-table-phone">
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
  </v-card>
</template>