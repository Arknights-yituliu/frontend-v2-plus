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

function displayRogueSeedDetail(item){
  rogueSeedDetail.value = item
  rogueSeedDetailVisible.value  = true
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


    <!-- 展示区域 -->
    <!--    <el-radio-group size="large">-->
    <!--      <el-radio-button label="#1 傀影与猩红血钻" value="New York"/>-->
    <!--      <el-radio-button label="#2 水月" value="Washington"/>-->
    <!--      <el-radio-button label="#3 萨米" value="Los Angeles"/>-->
    <!--      <el-radio-button label="#4 萨卡兹" value=""/>-->
    <!--    </el-radio-group>-->
    <div>
      <!-- 版本热门seeds -->
      <el-card style="margin: 12px">
        <template #header>
          <div class="card-header">
            <span>版本热门seeds</span>
          </div>
        </template>
        <el-table :data="rogueSeedList" style="width: 100%">
          <el-table-column fixed prop="description" label="简介" width="240"/>
          <el-table-column prop="seed" label="种子代码" width="180"/>
          <el-table-column label="肉鸽主题" width="150" prop="rogueTheme">
          </el-table-column>
          <el-table-column label="分队" width="150" prop="squad">
          </el-table-column>
          <el-table-column label="评分" width="60" prop="rating">
            <template #default="scope">
              <div>
                <div class="rogue-seed-rating-item">
                  <img src="/image/survey/like1.png" class="rogue-seed-rating-icon" alt="">
                  <span>{{ scope.row.rating.likeCount }}</span>
                </div>
                <div class="rogue-seed-rating-item">
                  <img src="/image/survey/normal1.png" class="rogue-seed-rating-icon" alt="">
                  <span>{{ scope.row.rating.normalCount }}</span>
                </div>
                <div class="rogue-seed-rating-item">
                  <img src="/image/survey/dislike1.png" class="rogue-seed-rating-icon" alt="">
                  <span>{{ scope.row.rating.dislikeCount }}</span>
                </div>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="难度" width="60" prop="difficulty">
          </el-table-column>
          <el-table-column label="初始干员" width="200" prop="difficulty">
            <template #default="scope">
              <div style="display: flex">
                <SpriteImage v-for="(operator,index) in getOperatorList(scope.row.operatorTeam)"
                             display-size="50" original-size="180" :image-name="operator" margin="8"></SpriteImage>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="操作" min-width="120">
            <template #default="scope">
              <el-button link type="primary" size="small" @click="copyTextToClipboard(scope.row.seed)" >
                复制
              </el-button>
              <el-button link type="primary" size="small" @click="displayRogueSeedDetail(scope.row)">
                详情
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>


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