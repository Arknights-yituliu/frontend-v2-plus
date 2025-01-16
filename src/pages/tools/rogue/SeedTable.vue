<script setup>
import rogueSeedAPI from "/src/api/rogueSeed.js";
import {onMounted, ref, watch} from "vue";
import {copyTextToClipboard} from "/src/utils/copyText.js";
import {cMessage} from "@/utils/message.js";


let pageInfo = ref({
  sortCondition: 'rating',
  pageNum: 0,
  pageSize: 30,
  seedType:1
})

const props = defineProps(["modelValue", 'seedType']);


let rogueSeedList = ref([])
function getRogueSeedPage(sortCondition) {
  pageInfo.value.sortCondition = sortCondition
  pageInfo.value.seedType = props.seedType
  rogueSeedAPI.getRogueSeedPage(pageInfo.value).then(response => {
    rogueSeedList.value = response.data
    getUserRating()
  })
}

function getUserRating() {
  rogueSeedAPI.getRogueSeedUserRating().then(response => {
    let ratingMap = response.data
    for (const item of rogueSeedList.value) {
      if (ratingMap[item.seedId]) {
        item.userRating = ratingMap[item.seedId].rating
      }
    }
  })
}

function rogueSeedRating(seedIndex,oldRating,newRating) {

  if(oldRating===newRating){
    rogueSeedList.value[seedIndex].userRating=-1;
  }else {
    rogueSeedList.value[seedIndex].userRating=newRating;
  }

  const seedId = rogueSeedList.value[seedIndex].seedId

  rogueSeedAPI.rogueSeedRating({seedId: seedId, rating: newRating}).then(response => {
    cMessage(response.data)
  })
}

function sortBtnAction(sortCondition) {
  if (sortCondition === pageInfo.value.sortCondition) {
    return 'primary'
  }
}

function ratingBtnAction(oldRating,newRating){
   if(oldRating===0&&oldRating===newRating){

     return 'error'
   }
   if(oldRating===1&&oldRating===newRating){
     return 'primary'
   }

   return 'gery'
}

onMounted(() => {
  getRogueSeedPage(pageInfo.value.sortCondition)
})


watch(()=>props.seedType,(newVal,oldVal) => {
  getRogueSeedPage(pageInfo.value.sortCondition)
})

</script>

<template>

  <div class="flex justify-end align-center m-8">
    <div class="difficulty-wrap">
      <v-select :items="numbers" label="选择难度" v-model="selectedNumber" variant="outlined"></v-select>
    </div>
    <v-icon icon="mdi-sort-ascending"></v-icon>
    <v-btn variant="text" :color="sortBtnAction('rating')" text="按评分" @click="getRogueSeedPage('rating')"></v-btn>
    <v-btn variant="text" :color="sortBtnAction('date')" text="按时间" @click="getRogueSeedPage('date')"></v-btn>
  </div>

  <div class="flex flex-wrap align-center justify-center">
    <v-card class="rogue-seed-card" v-for="(rogueSeed, seedIndex) in rogueSeedList" :key="seedIndex">
      <!-- 标题和复制按钮 -->
      <v-card-text>

        <div class="flex align-center m-4-0">
          <span class="rogue-seed" style="border-radius: 8px;padding: 8px;">{{ rogueSeed.seed }}</span>
          <v-spacer></v-spacer>
          <v-btn color="primary" @click="copyTextToClipboard(rogueSeed.seed)">
            <template v-slot:prepend>
              <v-icon icon="mdi-clipboard"></v-icon>
            </template>
            复制
          </v-btn>
        </div>


        <!-- 标签区域 -->
        <div class="flex flex-wrap m-12-0">
          <v-chip color="green" class="m-4" size="small">
            已复制
          </v-chip>
          <v-chip v-for="(tag, tagIndex) in rogueSeed.tags" :key="tagIndex" color="primary" class="m-4" size="small">
            {{ tag }}
          </v-chip>
        </div>

        <!-- 描述区域 -->
        <v-alert :icon="false"
                 :text=" rogueSeed.description"
                 type="info"
                 variant="tonal"
                 height="100"
          class="m-8-0">

        </v-alert>
        <!--        <div class="mb-4 description" >-->
        <!--          如果没有描述 显示-无描述- -->
        <!--          {{ }}-->
        <!--        </div>-->

        <!-- 评分模块 -->

        <v-row justify="center" align="center" dense>
          <v-col cols="auto">
            <v-btn :color="ratingBtnAction(rogueSeed.userRating,1)"  size="small" rounded="xl" variant="elevated"  @click="rogueSeedRating(seedIndex,rogueSeed.userRating,1)">
              <v-icon left>mdi-thumb-up</v-icon>
              <!-- 好玩！ (514) -->
            </v-btn>
          </v-col>
          <v-rating v-model="rogueSeed.rating" color="primary" half-increments density="compact" readonly></v-rating>
          <v-col cols="auto">
            <v-btn :color="ratingBtnAction(rogueSeed.userRating,0)"  size="small"   rounded="xl" variant="elevated" @click="rogueSeedRating(seedIndex,rogueSeed.userRating,0)">
              <v-icon left>mdi-thumb-down</v-icon>
              <!-- 没意思! (114) -->
            </v-btn>
          </v-col>
          {{rogueSeed.userRating}}
        </v-row>

      </v-card-text>
    </v-card>
  </div>

</template>


<style scoped>
/* 固定卡片内容高度，描述多行文本截断 */

.avg-rating {
  font-size: 18px;
}

.rating-ceiling {
  font-size: 10px;
}

.description {
  height: 60px;
  /* 固定高度 */
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  /* 限制显示行数 */
  -webkit-box-orient: vertical;
  background-color: #55553322;
  border-radius: 12px;
  padding: 8px;
}
</style>