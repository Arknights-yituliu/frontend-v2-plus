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

let displayRougeSeedList = ref([])

let rougeSeedListByDate = ref([])
let rougeSeedListByRating = ref([])



function getRogueSeedPage(sortCondition) {
  pageInfo.value.sortCondition = sortCondition
  if ('rating' === sortCondition && rougeSeedListByRating.value.length > 10) {
    displayRougeSeedList.value = rougeSeedListByRating.value
    getUserRating()
  }

  rogueSeedAPI.getRogueSeedPage(pageInfo.value).then(response => {
    displayRougeSeedList.value = response.data
    getUserRating()
    if ('rating' === sortCondition) {
      rougeSeedListByRating.value = response.data
    }
    if ('date' === sortCondition) {
      rougeSeedListByDate.value = response.data
    }
  })
}

function getUserRating() {
  rogueSeedAPI.getRogueSeedUserRating().then(response => {
    let ratingMap = response.data
    for (const item of displayRougeSeedList.value) {
      if (ratingMap[item.seedId]) {
        item.rating = ratingMap[item.seedId].rating
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

  <v-row dense>
    <v-col
        v-for="(rougeSeed, index) in displayRougeSeedList"
        :key="index"
    >
      <v-card class="rogue-seed-card" outlined>
        <!-- 标题和复制按钮 -->
        <v-card-text>

          <div class="flex justify-between align-center m-4-0">
            {{ rougeSeed.seed }}
            <v-btn variant="text" color="primary" density="compact" @click="copyTextToClipboard(rougeSeed.seed)">
              复制
            </v-btn>
          </div>

          <!-- 标签区域 -->
          <div class="flex flex-wrap m-12-0">
            <v-chip
                v-for="(tag, tagIndex) in rougeSeed.tags"
                :key="tagIndex"
                color="primary"
                class="m-4"
                density="compact"
            >
              {{ tag }}
            </v-chip>
          </div>

          <!-- 描述区域 -->
          <div class="mb-4 description">
            {{ rougeSeed.description }}
          </div>

          <!-- 评分模块 -->
          <v-card-actions class="justify-end">
            <v-rating
                v-model="rougeSeed.rating"
                length="5"
                color="orange"
                background-color="grey"
                half-increments
                @click="rogueSeedRating(rougeSeed.seedId,rougeSeed.rating)"
            ></v-rating>
            <p class="mb-0">{{ rougeSeed.rating }}/5</p>
          </v-card-actions>
        </v-card-text>
      </v-card>
    </v-col>
  </v-row>



</template>


<style scoped>
/* 固定卡片内容高度，描述多行文本截断 */
.v-card {
  border-radius: 12px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.15);
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