<script setup>
import {ref} from 'vue'
import '/src/assets/css/rogueSeed/rogue-seed-page.scss'
import rogueSeedAPI from "/src/api/rogueSeed.js";
import {copyTextToClipboard} from "/src/utils/copyText.js";

import OperatorAvatar from "/src/components/sprite/OperatorAvatar.vue";
import CHARACTER_TABLE from '/src/static/json/survey/character_table_simple.json'
import {debounce} from "@/utils/debounce.js";

import goodSeeds from "/src/components/tools/goodSeeds.vue";
import badSeeds from "/src/components/tools/badSeeds.vue";
import uploadSeeds from "/src/components/tools/uploadSeeds.vue";

let charIdDict = new Map()

for (const charId in CHARACTER_TABLE) {
  const item = CHARACTER_TABLE[charId];
  charIdDict.set(item.name, charId)
}

let rogueSeedList = ref([])

let searchCriteria = ref({
  keywords: [],
  pageNum: 0,
  pageSize: 500,
  orderBy: "rating"
})

function getRogueSeedPage() {
  rogueSeedAPI.getRogueSeedPageTag().then(rep => {
    const tag = rep.data
    rogueSeedAPI.getRogueSeedPageByCOS(tag).then(response => {
      rogueSeedList.value = response.data.list
      console.log(rogueSeedList.value[6])
      getRogueSeedRatingList()
    })
  })
}

//记录点赞的字典
//内部对象结构
// { 种子唯一id:{rating:0} }

let rogueSeedRatingDict = ref({})

function getRogueSeedRatingList() {
  rogueSeedAPI.getRogueSeedRatingList().then(rep => {
    for (const item of rep.data) {
      rogueSeedRatingDict.value[item.seedId] = item
    }
  })
}


function getOperatorList(team) {
  let list = []
  for (const name of team) {
    list.push(charIdDict.get(name))
  }
  return list
}

let rogueSeedDetail = ref({})
let rogueSeedDetailVisible = ref(false)

function displayRogueSeedDetail(item) {
  rogueSeedDetail.value = item
  rogueSeedDetailVisible.value = true
}

function ratingAction(value, icon, seedId) {

  if (typeof rogueSeedRatingDict.value[seedId] === "undefined") {
    return `/image/survey/${icon}0.png`
  }
  const {rating} = rogueSeedRatingDict.value[seedId]
  if (typeof rating === 'number') {

    if (value === rating) {
      return `/image/survey/${icon}1.png`
    }
  }
  return `/image/survey/${icon}0.png`
}


const rating = debounce((seedId, value) => {
  const item = rogueSeedRatingDict.value[seedId]
  let data

  if (!item) {
    data = {seedId: seedId, rating: value}
  } else {
    if (value === item.rating) {
      data = {seedId: seedId, rating: -1}
    } else {
      data = {seedId: seedId, rating: value}
    }
  }
  rogueSeedRatingDict.value[seedId] = data
  rogueSeedAPI.rogueSeedRating(data).then(response => {
  })
}, 500)

/**
 * 上传种子评分
 * @param seedId 种子id
 * @param value 评价分值
 */
function rogueSeedRating(seedId, value) {
  rating(seedId, value)
}


getRogueSeedPage()

</script>

<template>
  <div class="rogue-seed-page">
    <v-container>
    <v-row justify="center">
      <v-col cols="auto">
        <v-btn color="success" @click="generateHu">给我一个胡种</v-btn>
      </v-col>
      <v-col cols="auto">
        <v-btn color="error" @click="generateDu">给我一个毒种</v-btn>
      </v-col>
    </v-row>
  </v-container>

  <v-container>
    <v-card>
      <v-row>
        <!-- 左栏 -->
        <v-col cols="6">
          <div>
            <h4 class="text-primary">此处为种子</h4>
          </div>
          <div>
            <p class="text-secondary">此处为肉鸽版本</p>
          </div>
          <div>
            <p class="text-secondary">此处为难度</p>
          </div>
        </v-col>

        <!-- 右栏 -->
        <v-col cols="6">
          <!-- 首次体验得分 -->
          <div>
            <h5 class="text-primary">首次体验得分</h5>
          </div>

          <!-- 四个方框 -->
          <div class="d-flex align-center my-2">
            <v-btn outlined color="primary" class="mr-4">分队</v-btn>
            <v-divider vertical class="mx-2"></v-divider>
            <v-btn outlined color="primary" class="mx-1">干员</v-btn>
            <v-btn outlined color="primary" class="mx-1">干员</v-btn>
            <v-btn outlined color="primary" class="mx-1">干员</v-btn>
          </div>

          <!-- 五分制评分组件 -->
          <div>
            <v-rating
              value="3"
              length="5"
              color="warning"
              background-color="grey lighten-2"
              dense
            ></v-rating>
          </div>
        </v-col>
      </v-row>
    </v-card>
  </v-container>

  <v-container>
    <!-- Tabs -->
    <v-tabs v-model="activeTab" background-color="primary" dark>
      <v-tab>胡种榜</v-tab>
      <v-tab>毒种榜</v-tab>
      <v-tab>种子上传</v-tab>
    </v-tabs>

    <!-- Tab content -->
    <v-tabs-items v-model="activeTab">
      <v-tab-item>
        <goodSeeds />
      </v-tab-item>
      <v-tab-item>
        <badSeeds />
      </v-tab-item>
      <v-tab-item>
        <uploadSeeds />
      </v-tab-item>
    </v-tabs-items>
  </v-container>





    <div class="flex flex-wrap">
      <v-card v-for="(rogueSeed, index) in rogueSeedList" :key="index" class="rogue-seed-card m-8">
        <v-card-text>
          <div class="flex justify-between m-8">
            <div class="flex">
              <OperatorAvatar v-for="(operator,index) in getOperatorList(rogueSeed.operatorTeam)"
                              :char-id="operator" class="m-0-4">
              </OperatorAvatar>
            </div>

            <div class="flex align-center">
              <span>种子：{{ rogueSeed.seed }}</span>
              <v-btn color="primary" variant="text" @click="copyTextToClipboard(rogueSeed.seed)">复制</v-btn>
              <v-btn color="primary" variant="text" @click="displayRogueSeedDetail(rogueSeed)">详情</v-btn>
            </div>
          </div>

          <div class="flex">
            <v-chip density="compact" color="primary" v-for="(tag,index) in rogueSeed.tags" class="m-0-4">
              #{{ tag }}
            </v-chip>
          </div>
          <div class="m-8">{{ rogueSeed.description }}</div>
          <div class="flex justify-end">
            <div class="flex align-center" @click="rogueSeedRating(rogueSeed.seedId,0)">
              <img :src="ratingAction(0,'dislike',rogueSeed.seedId)"
                   class="rogue-seed-rating-icon" alt="">
              <span>{{ rogueSeed.rating.likeCount }}</span>
            </div>
            <div class="flex align-center" @click="rogueSeedRating(rogueSeed.seedId,1)">
              <img :src="ratingAction(1,'normal',rogueSeed.seedId)"
                   class="rogue-seed-rating-icon" alt="">
              <span>{{ rogueSeed.rating.normalCount }}</span>
            </div>
            <div class="flex align-center" @click="rogueSeedRating(rogueSeed.seedId,2)">
              <img :src="ratingAction(2,'like',rogueSeed.seedId)"
                   class="rogue-seed-rating-icon" alt="">
              <span>{{ rogueSeed.rating.dislikeCount }}</span>
            </div>
          </div>
        </v-card-text>
      </v-card>
    </div>






  </div>
</template>

<style scoped></style>