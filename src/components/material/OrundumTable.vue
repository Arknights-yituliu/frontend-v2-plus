<script setup>

import {ref, watch} from "vue";
import {formatNumber} from "@/utils/format.js";

const props = defineProps(['modelValue'])


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


function formatOrundumRecommendedStage() {
  orundumRecommendedStage.value = []
  for (const stage of props.modelValue) {
    orundumRecommendedStage.value.push({
      stageCode: stage.stageCode,
      orundumPerAp: formatNumber(stage.orundumPerAp,2),
      lmdcost: formatNumber(stage.lmdcost,2) + 'w',
      orundumPerApEfficiency: formatNumber((stage.orundumPerApEfficiency * 100),2) + '%',
      stageEfficiency: formatNumber((stage.stageEfficiency * 100),2) + '%',
      stageType: stage.stageType ? stage.stageType : ''
    })
  }
  displayOrundumRecommendedStage.value = orundumRecommendedStage.value
}

watch(()=>props.modelValue.length,(newVal)=>{
     formatOrundumRecommendedStage()
})

const headers = [
  {title: '关卡名', key: 'stageCode'},
  {title: '每理智可搓玉', key: 'orundumPerAp'},
  {title: '每搓1抽消耗龙门币', key: 'lmdcost'},
  {title: '搓玉效率', key: 'orundumPerApEfficiency'},
  {title: '关卡效率', key: 'stageEfficiency'},
]


</script>

<template>

  <div class="module-header" id="orundum-table">
    <div class="module-title">
      <h1>搓玉数据表</h1>
      <h4>Orundum</h4>
    </div>
    <v-btn color="primary" variant="tonal"  @click="filterOrundumStage()">
      仅显示1-7、CW-6和活动关
    </v-btn>
  </div>

  <v-card >
    <v-data-table
        :headers="headers"
        :items="displayOrundumRecommendedStage"
        density="compact">
      <template v-slot:item.orundumPerAp="{ item }">
        <div style="display: flex;align-items: center">
          {{ item.orundumPerAp }}
          <div class="orundum-table-icon">
            <div class="bg-4003_icon sprite-icon" ></div>
          </div>
        </div>
      </template>
      <template v-slot:item.lmdcost="{ item }">
        <div style="display: flex;align-items: center">
          {{ item.lmdcost }}
          <div class="orundum-table-icon">
            <div class="bg-4001_icon sprite-icon" style="top:-8px"></div>
          </div>
        </div>
      </template>
      <template v-slot:item.orundumPerApEfficiency="{ item }">
        {{ item.orundumPerApEfficiency }}
      </template>
      <template v-slot:item.stageEfficiency="{ item }">
        {{ item.stageEfficiency }}
      </template>
    </v-data-table>
  </v-card>
</template>