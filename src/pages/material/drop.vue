<script setup>
import {ref} from "vue";
import itemCache from "@/plugins/indexedDB/itemCache.js";
import materialAPI from "@/api/material.js";
import {NDatePicker} from 'naive-ui'
import {createMessage} from "@/utils/message.js";
import {formatNumber} from "@/utils/format.js";
import {dateFormat} from "@/utils/dateUtil.js";
import ItemImage from "@/components/sprite/ItemImage.vue";

let stageTableDialog = ref()

let stageIdBtnText = ref("12-15(标准)")

const stageTypeMap = {
  ACT: "SideStory",
  ACT_REP: "SideStory",
  MAIN: "主线",
  ACT_PERM: "插曲别传"
}

let groupedByZoneName = ref({})

let stageInfo = ref({})

function getStageCollectByZone() {
  itemCache.getStageInfoCache().then(response => {

    const collect = {}; // 初始化一个空对象用于存储分组结果

    for (const stage of response) { // 遍历response中的每个stage
      stageInfo.value[stage.stageId] = stage
      const zoneName = stage.zoneName; // 获取当前stage的zoneName
      if(!(stage.stageType==='MAIN'||stage.stageType==="ACT_PERM")){
        continue
      }

      // 如果groupedByZoneName对象中不存在当前zoneName对应的数组，则初始化一个空数组
      if (!collect[zoneName]) {
        collect[zoneName] = [];
      }

      // 将当前stage添加到对应zoneName的数组中
      collect[zoneName].push(stage);
    }
    groupedByZoneName.value = collect
    console.log(groupedByZoneName.value)
  })
}

let stageListByZone = ref([])

function chooseZone(zoneName) {
  stageListByZone.value = groupedByZoneName.value[zoneName]

}

function chooseStage(stageCode, stageId) {
  stageIdBtnText.value = stageCode
  queryForm.value.stageId = stageId
  stageTableDialog.value = false
}


let queryForm = ref({
  stageId: 'main_12-15',
  timeGranularity: 2,
  start: 1719763200000,
  end: 1739019046363,
})

getStageCollectByZone()

const timeGranularityTable = [
  {value: 2, label: "月"},
  {value: 4, label: "天"},
  {value: 5, label: "小时"}
]

let selectedTimeGranularity = ref(2)

function chooseTimeGranularity() {
  queryForm.value.timeGranularity = selectedTimeGranularity.value
}

let stageDropCollect = ref([])

function getStageDropByStageId() {
  materialAPI.getStageDrop(queryForm.value).then(response => {
    let groupedByEnd = []
    for (const drop of response.data) {
      const {stageId, itemId, times, quantity, start, end,} = drop; // 获取当前stage的end属性

      // 如果groupedByEnd对象中不存在当前end对应的数组，则初始化一个空数组
      if (!groupedByEnd[end]) {
        groupedByEnd[end] = [];
      }


      const {apCost, stageCode} = stageInfo.value[stageId]
      const knockRating = quantity / times

      const item = {
        stageId: stageId,
        stageCode: stageCode,
        itemId: itemId,
        times: times,
        quantity: quantity,
        knockRating: formatNumber(knockRating * 100),
        apExpect: formatNumber(apCost / knockRating),
        end: dateFormat(end, 'yyyy-MM-dd HH'),
        start: dateFormat(start, 'yyyy-MM-dd HH')
      }
      // 将当前stage添加到对应end的数组中
      groupedByEnd[end].push(item);
    }
    stageDropCollect.value = []
    for (const key in groupedByEnd) {
      const {end, start} = groupedByEnd[key][0]
      stageDropCollect.value.push({
        end: end,
        timeStamp: key,
        list: groupedByEnd[key].sort((a, b) => b.knockRating - a.knockRating),
        start: start
      })
    }

    stageDropCollect.value.sort((a, b) => a.timeStamp - b.timeStamp)
    createMessage({type:'success',text:"查询成功"})
  })
}

const headers = [
  {title: '关卡名称', key: 'stageCode'},
  {title: '掉落数', key: 'quantity'},
  {title: '样本数', key: 'times'},
  {title: '掉率', key: 'knockRating'},
  {title: '期望', key: 'apExpect'},
  {title: '统计区间', key: 'period'}
]

</script>
<template>

  <v-card max-width="600" class="m-12-a">
    <v-card-text>
      <v-list>
        <v-list-item title="选择关卡">
          <v-btn :text="stageIdBtnText" color="primary" @click="stageTableDialog = true"></v-btn>
        </v-list-item>
        <v-list-item title="时间粒度">
          <v-select width="300"
              :items="timeGranularityTable"
              item-title="label"
              item-value="value"
              v-model="selectedTimeGranularity"
              color="primary"
              variant="outlined"
              @update:model-value="chooseTimeGranularity"
          ></v-select>
        </v-list-item>
        <v-list-item title="时间范围">
          <div class="flex ">
            <n-date-picker v-model:value="queryForm.start" type="date" class="m-4">
            </n-date-picker>
            <n-date-picker v-model:value="queryForm.end" type="date" class="m-4">
            </n-date-picker>
          </div>
        </v-list-item>
        <v-list-item>
          <div class="flex justify-center">
            <v-btn color="primary" text="查询关卡" @click="getStageDropByStageId"></v-btn>
          </div>
        </v-list-item>
        <v-list-item title="debug">
          <pre>
            {{ JSON.stringify(queryForm) }}
          </pre>
        </v-list-item>
      </v-list>
    </v-card-text>
  </v-card>

  <v-card class="drop-table-card">
    <v-card-text>
      <div class="flex flex-wrap justify-center">
        <v-card v-for="collect in stageDropCollect" class="m-8">
          <v-card-title>
            {{ `${collect.start} ~ ${collect.end}` }}
          </v-card-title>
          <v-card-text>
            <v-table class="drop-table" density="compact">
              <thead>
              <tr>
                <th>关卡名称</th>
                <th>物品</th>
                <th>掉落数</th>
                <th>样本数</th>
                <th>掉率</th>
                <th>期望</th>
              </tr>
              </thead>
              <tbody class="drop-table">
              <tr v-for="item in collect.list">
                <td>{{ item.stageCode }}</td>
                <td>
                  <ItemImage :item-id="item.itemId"></ItemImage>
                </td>
                <td> {{ item.quantity }}</td>
                <td> {{ item.times }}</td>
                <td>{{ item.knockRating }}%</td>
                <td>{{ item.apExpect }}</td>
              </tr>
              </tbody>
            </v-table>
          </v-card-text>
        </v-card>
      </div>
    </v-card-text>
  </v-card>

  <v-dialog v-model="stageTableDialog" max-width="600">
    <v-card>
      <v-card-text>
        <v-list>
          <v-list-item title="选择章节">
            <v-btn class="m-4" v-for="(list,zoneName) in groupedByZoneName"
                   :text="zoneName" @click="chooseZone(zoneName)">
            </v-btn>
          </v-list-item>
          <v-list-item title="选择关卡">
            <v-btn class="m-4" v-for="stage in stageListByZone"
                   :text="stage.stageCode" @click="chooseStage(stage.stageCode,stage.stageId)">
            </v-btn>
          </v-list-item>
        </v-list>

      </v-card-text>
    </v-card>
  </v-dialog>

</template>

<style>

.drop-table-card{

  .drop-table {

  }
}



</style>