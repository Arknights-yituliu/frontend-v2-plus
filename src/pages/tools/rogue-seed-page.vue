<script setup>
import {ref} from 'vue'
import '/src/assets/css/rogueSeed/rogue-seed-page.scss'
import rogueSeedAPI from "/src/api/rogueSeed.js";
import {cMessage} from "@/utils/Message.js";
import {copyTextToClipboard} from "/src/utils/CopyText.js";
import SpriteImage from "@/components/SpriteImage.vue";
import CHARACTER_TABLE from '/src/static/json/survey/character_table_simple.json'
import Popup from '/src/components/popup.vue'
import {debounce} from "@/utils/Debounce.js";

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
      rogueSeedDetail.value = rogueSeedList.value[6]
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

function getRogueSeedRating(value, icon, seedId) {

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


    <div class="rogue-seed-table">
      <div class="rogue-seed-container" v-for="(rogueSeed, index) in rogueSeedList" :key="index">
        <div class="rogue-seed-init-team">
          <SpriteImage v-for="(operator,index) in getOperatorList(rogueSeed.operatorTeam)"
                       display-size="50" original-size="180" :image-name="operator"
                       style="margin:0 8px 0 0">

          </SpriteImage>
        </div>

        <div class="rogue-seed-tag-box">
          <div class="rogue-seed-tag" v-for="(tag,index) in rogueSeed.tags">
            #{{ tag }}
          </div>
        </div>

        <div class="rogue-seed-action-button">
          <span class="rogue-seed-label">种子：{{ rogueSeed.seed }}</span>
          <span class="rogue-seed-label-button" @click="copyTextToClipboard(rogueSeed.seed)">复制</span>
          <span class="rogue-seed-label-button" @click="displayRogueSeedDetail(rogueSeed)">详情</span>
        </div>


        <span class="rogue-seed-card-description">{{ rogueSeed.description }}</span>

        <div class="rogue-seed-rating-check-box">
          <div class="rogue-seed-rating-item" @click="rogueSeedRating(rogueSeed.seedId,0)">
            <img :src="getRogueSeedRating(0,'dislike',rogueSeed.seedId)"
                 class="rogue-seed-rating-icon" alt="">
            <span>{{ rogueSeed.rating.likeCount }}</span>
          </div>
          <div class="rogue-seed-rating-item" @click="rogueSeedRating(rogueSeed.seedId,1)">
            <img :src="getRogueSeedRating(1,'normal',rogueSeed.seedId)"
                 class="rogue-seed-rating-icon" alt="">
            <span>{{ rogueSeed.rating.normalCount }}</span>
          </div>
          <div class="rogue-seed-rating-item" @click="rogueSeedRating(rogueSeed.seedId,2)">
            <img :src="getRogueSeedRating(2,'like',rogueSeed.seedId)"
                 class="rogue-seed-rating-icon" alt="">
            <span>{{ rogueSeed.rating.dislikeCount }}</span>
          </div>
        </div>

      </div>
    </div>
    <div>



      <Popup v-model:visible="rogueSeedDetailVisible" :width="'500px'">
        <div class="rogue-seed-detail-content">

          <h3>种子描述</h3>
          <p>{{ rogueSeedDetail.description }}</p>
          <h3>通关结算图</h3>
          <img class="rogue-seed-detail-settlement-chart"
               :src="`https://cos.yituliu.cn/${rogueSeedDetail.summaryImageLink}`" alt="">
          <h3>对种子评价</h3>
          <div style="display: flex">
            <img :src="getRogueSeedRating(0,'dislike',rogueSeedDetail.seedId)" alt=""
                 class="rogue-seed-rating-button" @click="rogueSeedRating(rogueSeedDetail.seedId,0)">
            <img :src="getRogueSeedRating(1,'normal',rogueSeedDetail.seedId)" alt=""
                 class="rogue-seed-rating-button" @click="rogueSeedRating(rogueSeedDetail.seedId,1)">
            <img :src="getRogueSeedRating(2,'like',rogueSeedDetail.seedId)" alt=""
                 class="rogue-seed-rating-button" @click="rogueSeedRating(rogueSeedDetail.seedId,2)">
          </div>
        </div>
      </Popup>
    </div>

  </div>
</template>

<style scoped></style>