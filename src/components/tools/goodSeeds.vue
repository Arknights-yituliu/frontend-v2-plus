<script setup>
import rogueSeedAPI from "/src/api/rogueSeed.js";
import {onMounted, ref} from "vue";
import {copyTextToClipboard} from "/src/utils/copyText.js";
import {cMessage} from "@/utils/message.js";


let pageInfo = ref({
  sortCondition: 'rating',
  pageNum: 0,
  pageSize: 30,
})

let displayRogueSeedList = ref([])

let rogueSeedListByDate = ref([])
let rogueSeedListByRating = ref([])



function getRogueSeedPage(sortCondition) {
  pageInfo.value.sortCondition = sortCondition
  if ('rating' === sortCondition && rogueSeedListByRating.value.length > 10) {
    displayRogueSeedList.value = rogueSeedListByRating.value
    getUserRating()
  }

  rogueSeedAPI.getRogueSeedPage(pageInfo.value).then(response => {
    displayRogueSeedList.value = response.data
    getUserRating()
    if ('rating' === sortCondition) {
      rogueSeedListByRating.value = response.data
    }
    if ('date' === sortCondition) {
      rogueSeedListByDate.value = response.data
    }
  })
}

function getUserRating() {
  rogueSeedAPI.getRogueSeedUserRating().then(response => {
    let ratingMap = response.data
    for (const item of displayRogueSeedList.value) {
      if (ratingMap[item.seedId]) {
        item.userRating = ratingMap[item.seedId].rating
      }
    }
  })
}

function rogueSeedRating(seedId, rating) {

  rogueSeedAPI.rogueSeedRating({seedId: seedId, rating: rating}).then(response => {
    cMessage('评分成功')
  })
}

function sortBtnAction(sortCondition) {
  if(sortCondition===pageInfo.value.sortCondition) {
    return 'primary'
  }
}

onMounted(() => {
  getRogueSeedPage('rating')
})

</script>

<template>

  <div class="flex justify-end align-center m-8">
    <v-icon icon="mdi-sort-ascending"></v-icon>
    <v-btn variant="text" :color="sortBtnAction('rating')" text="按评分" @click="getRogueSeedPage('rating')"></v-btn>
    <v-btn variant="text" :color="sortBtnAction('date')" text="按时间" @click="getRogueSeedPage('date')"></v-btn>
  </div>

  <div class="flex flex-wrap align-center justify-center">
    <v-card class="rogue-seed-card" outlined  v-for="(rogueSeed, index) in displayRogueSeedList"
            :key="index">
      <!-- 标题和复制按钮 -->
      <v-card-text>

        <div class="flex align-center m-4-0">
          <span class="rogue-seed">{{ rogueSeed.seed }}</span>
          <v-spacer></v-spacer>
          <v-btn variant="text" color="primary" density="compact" @click="copyTextToClipboard(rogueSeed.seed)">
            <template v-slot:prepend><v-icon icon="mdi-clipboard"></v-icon></template>
            复制
          </v-btn>
        </div>
        <div class="flex  align-center m-4-0">
          <v-icon icon="mdi-thumb-up" color="grey">

          </v-icon>
          <v-rating color="orange"
                    density="compact"
                    length="5"
                    background-color="grey"
                    half-increments
                    v-model="rogueSeed.rating"
          >
          </v-rating>
<!--          <div>-->
<!--          <span class="avg-rating">{{rogue.rating.toFixed(2)}}</span>-->
<!--          <span class="rating-ceiling">/5</span>-->
<!--          </div>-->
          <v-spacer></v-spacer>

          <v-btn variant="text" color="primary" density="compact"  :text="rogueSeed.uploadTimes">
            <template v-slot:prepend ><v-icon color="grey" icon="mdi-upload"></v-icon></template>
          </v-btn>

        </div>

        <!-- 标签区域 -->
        <div class="flex flex-wrap m-12-0">
          <v-chip
              v-for="(tag, tagIndex) in rogueSeed.tags"
              :key="tagIndex"
              color="primary"
              class="m-4"
              size="small"
          >
            {{ tag }}
          </v-chip>
        </div>

        <!-- 描述区域 -->
        <div class="mb-4 description">
          {{ rogueSeed.description }}
        </div>

        <!-- 评分模块 -->
        <div class="flex align-center justify-end">
          <v-rating
              v-model="rogueSeed.userRating"
              length="5"
              color="primary"
              density="compact"
              background-color="grey"
              half-increments
              @click="rogueSeedRating(rogueSeed.seedId,rogueSeed.userRating)"
          ></v-rating>
          <span>{{rogueSeed.userRating}}/5</span>
        </div>
      </v-card-text>
    </v-card>
  </div>

</template>


<style scoped>

/* 固定卡片内容高度，描述多行文本截断 */

.avg-rating{
 font-size: 18px;
}

.rating-ceiling{
    font-size:10px;
}

.description {
  height: 60px; /* 固定高度 */
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 3; /* 限制显示行数 */
  -webkit-box-orient: vertical;
}
</style>