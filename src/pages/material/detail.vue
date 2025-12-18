<script setup>
import {nextTick, onMounted, ref} from "vue";
import {createMessage} from '/src/utils/message'
import {calculationStageEfficiency} from '/src/utils/item/stageEfficiencyCal.js'
import {getStageConfig} from "/src/utils/user/userConfig.js";
import itemCache from "/src/plugins/indexedDB/itemCache.js";
import ActionButton from "/src/components/account/ActionButton.vue";
import {formatNumber} from "/src/utils/format.js";
import ItemImage from "/src/components/sprite/ItemImage.vue";

const stageTypeTabActive = ref("ACT")

let stageDropDetailMap = new Map()

const stageConfig = getStageConfig()

function getStageDetail() {
  calculationStageEfficiency(stageConfig).then(response => {
    for (const item of response) {
      // console.log(item.stageId)
      const {stageId} = item
      stageDropDetailMap.set(stageId, item)

      // if(stageId==="main_01-07"||stageId==="act15side_07"){
      //   reviewStageDropDetail(item)
      // }
    }

    // reviewStageDropDetail({stageId: "main_08-13"})
    // reviewStageDropDetail({stageId: "act30side_08"})
  })
}

//echart的dom
let myChart = "";

//关卡类型
const stageTypeMap = {
  ACT: "SideStory",
  ACT_REP: "SideStory",
  MAIN: "主线",
  ACT_PERM: "插曲别传"
};

const stageCollect = ref({
  "Main": [],
  "Act": [],
  "ActRep": [],
  "ActPerm": []
});


// 根据关卡的章节进行分组
function getStageCollectByZone() {

  itemCache.getStageInfoCache().then(response => {
    response = response.sort((a, b) => b.end - a.end)
    const indexMap = new Map();

    for (const stage of response) {
      const {zoneName, zoneId, stageCode, stageId, stageType, start, end} = stage;
      stage.active = false

      // 过滤掉不需要的阶段类型
      if (!stageTypeMap[stageType]) {
        continue;
      }

      if (zoneId.indexOf('tough') > -1) {
        continue
      }


      if (stageType === "MAIN") {
        if (!indexMap.has(zoneName)) {
          stageCollect.value.Main.push({
            zoneName, zoneId, selectAll: true, list: []
          })
          indexMap.set(zoneName, stageCollect.value.Main.length - 1)
        }

        const index = indexMap.get(zoneName);

        stageCollect.value.Main[index].list.push(stage);
        continue;
      }

      if (stageType === "ACT_PERM") {
        if (!indexMap.has(zoneName)) {
          stageCollect.value.ActPerm.push({
            zoneName, zoneId, selectAll: true, list: []
          })
          indexMap.set(zoneName, stageCollect.value.ActPerm.length - 1)
        }
        const index = indexMap.get(zoneName);
        stageCollect.value.ActPerm[index].list.push(stage);
        continue;
      }


      if (stageType === "ACT_REP") {
        if (!indexMap.has(zoneName)) {
          stageCollect.value.ActRep.push({
            zoneName, zoneId, selectAll: true, list: []
          })
          indexMap.set(zoneName, stageCollect.value.ActRep.length - 1)
        }
        const index = indexMap.get(zoneName);
        stageCollect.value.ActRep[index].list.push(stage);
        continue;
      }



      if (!indexMap.has(zoneName)) {
        stageCollect.value.Act.push({
          zoneName, zoneId, selectAll: true, list: []
        })

        indexMap.set(zoneName, stageCollect.value.Act.length - 1)
      }

      const index = indexMap.get(zoneName);

      stageCollect.value.Act[index].list.push(stage);
    }



  });
}

let reviewStageDropDetailList = ref([])
let reviewStageIdList = []

async function reviewStageDropDetail(stage) {
  const {stageId} = stage

  if (!stageDropDetailMap.has(stageId)) {
    createMessage({
      type: 'error',
      text: '该关卡无数据'
    })
  }

  stage.active = !stage.active
  _updateStageIdList(reviewStageIdList,stageId)
  reviewStageDropDetailList.value = []
  for(const stageId of reviewStageIdList){
    reviewStageDropDetailList.value.push(stageDropDetailMap.get(stageId))
  }

  console.log(reviewStageIdList)
  console.log(reviewStageDropDetailList.value)
// 等待 DOM 更新后再尝试初始化图表
  await nextTick();
  createLineChart(stageDropDetailMap.get(stageId))
  // const intervalId = setInterval(() => {
  //       if (createLineChart(stage)) {
  //         clearInterval(intervalId);
  //       }
  //     }, 500)

  function _updateStageIdList(collection,element){
    // 查找元素索引
    const index = collection.indexOf(element);
    if (index > -1) {
      // 存在则删除
      collection.splice(index, 1);
    } else {
      // 不存在则插入
      collection.push(element);
    }

  }

}


function createLineChart(stage) {
  const {stageId, dropDetail} = stage;
  const element = document.getElementById(`line-chart-${stageId}`)
  if (!element) {
    return false
  }
  let xData = []
  let yData = []
  // console.log(dropDetail)
  for (const item of dropDetail) {
    xData.push(item.itemName)
    yData.push(formatNumber(item.expectedOutput))
  }
  const myChart = echarts.init(element);
  const option = {
    tooltip: {
      trigger: 'axis',
      formatter: function (params) {
        return `<div style="padding: 10px; background: #fff; border: 1px solid #ccc;">
            ${params.map(item => {
          return `
                <div style="display: flex; align-items: center; margin-bottom: 4px;">
                  <span style="margin-right:2px;border-radius:50%;width:8px;height:8px;background:${item.color};"></span>
                  ${item.name}期望产出${item.value}理智
                </div>
              `;
        }).join('')}
          </div>`;
      }
    },
    xAxis: {
      type: 'category',
      data: xData
    },
    yAxis: {
      type: 'value'
    },
    series: [
      {
        name: '材料期望产出',
        data: yData,
        type: 'bar',
        label: {
          show: true,
          position: 'top',
          formatter: '{c}'
        }
      }
    ]
  };

  myChart.setOption(option);

}

onMounted(() => {
  //
  getStageCollectByZone()
  getStageDetail()
});

</script>

<template>

  <v-card>
    <v-tabs v-model="stageTypeTabActive">
      <v-tab value="ACT">SideStory</v-tab>
      <v-tab value="ACT_REP">SideStory复刻</v-tab>
      <v-tab value="MAIN">主线</v-tab>
      <v-tab value="ACT_PERM">插曲别传</v-tab>
    </v-tabs>
    <v-card-text>
      <div class="v-card-tabs-window">
        <v-tabs-window v-model="stageTypeTabActive">
          <v-tabs-window-item value="ACT">
            <div v-for="(collect, index) in stageCollect.Act" :key="index">
              <v-btn :text="collect.zoneName" variant="text"></v-btn>
              <v-divider color="primary" class="opacity-50"></v-divider>
              <ActionButton v-for="(stage, index) in collect.list" :btn-text="stage.stageCode"
                            :active="stage.active" @click="reviewStageDropDetail(stage)">
              </ActionButton>
            </div>
          </v-tabs-window-item>
        </v-tabs-window>
        <v-tabs-window v-model="stageTypeTabActive">
          <v-tabs-window-item value="ACT_REP">
            <div v-for="(collect, index) in stageCollect.ActRep" :key="index">
              <v-btn :text="collect.zoneName" variant="text"></v-btn>
              <v-divider color="primary" class="opacity-50"></v-divider>
              <ActionButton v-for="(stage, index) in collect.list" :btn-text="stage.stageCode"
                            :active="stage.active" @click="reviewStageDropDetail(stage)">
              </ActionButton>
            </div>
          </v-tabs-window-item>
        </v-tabs-window>
        <v-tabs-window v-model="stageTypeTabActive">
          <v-tabs-window-item value="MAIN">
            <div v-for="(collect, index) in stageCollect.Main" :key="index">
              <v-btn :text="collect.zoneName" variant="text"></v-btn>
              <v-divider color="primary" class="opacity-50"></v-divider>
              <ActionButton v-for="(stage, index) in collect.list" :btn-text="stage.stageCode"
                            :active="stage.active" @click="reviewStageDropDetail(stage)">
              </ActionButton>
            </div>
          </v-tabs-window-item>
        </v-tabs-window>
        <v-tabs-window v-model="stageTypeTabActive">
          <v-tabs-window-item value="ACT_PERM">
            <div v-for="(collect, index) in stageCollect.ActPerm" :key="index">
              <v-btn :text="collect.zoneName" variant="text"></v-btn>
              <v-divider color="primary" class="opacity-50"></v-divider>
              <ActionButton v-for="(stage, index) in collect.list" :btn-text="stage.stageCode"
                            :active="stage.active" @click="reviewStageDropDetail(stage)">
              </ActionButton>
            </div>
          </v-tabs-window-item>
        </v-tabs-window>
      </div>
    </v-card-text>
  </v-card>


  <div class="flex flex-wrap m-12-0 ">
    <v-card v-for="stage in reviewStageDropDetailList" class="m-4 stage-detail-card" :title="stage.stageCode">
      <v-card-text>
        <v-table>
          <tbody>
          <tr>
            <td>关卡消耗理智</td>
            <td>{{ formatNumber(stage.apCost) }}</td>
          </tr>
          <tr>
            <td>关卡期望产出</td>
            <td>{{ formatNumber(stage.stageExpectedOutput) }}</td>
          </tr>
          <tr>
            <td>关卡效率</td>
            <td>{{ formatNumber(stage.stageEfficiency * 100) }}%</td>
          </tr>
          </tbody>
        </v-table>

        <div :id="`line-chart-${stage.stageId}`" class="stage-detail-line-chart">

        </div>

        <v-table title="关卡掉落物产出详情">
          <thead>
          <tr>
            <th>
              材料
            </th>
            <th>
              名称
            </th>
            <th>
              材料价值
            </th>
            <th>
              材料掉率
            </th>
            <th>
              期望产出
            </th>
          </tr>
          </thead>
          <tbody>
          <tr
              v-for="item in stage.dropDetail"
          >
            <td>
              <ItemImage :item-id="item.itemId"></ItemImage>
            </td>
            <td>{{ item.itemName }}</td>
            <td>{{ formatNumber(item.itemValue) }}</td>
            <td>{{ formatNumber(item.knockRating * 100) }}%</td>
            <td>{{ formatNumber(item.expectedOutput) }}</td>
          </tr>

          </tbody>
        </v-table>
      </v-card-text>
    </v-card>
  </div>


</template>


<style>

.stage_detail_page {

}

.stage-detail-card {
  width: 480px;

  .stage-detail-line-chart {
    width: 420px;
    height: 400px;
  }
}

.v-card-tabs-window {
  height: 500px;
  overflow: auto;
}

::-webkit-scrollbar {
  display: none;
}


</style>