<script setup>
import rogueSeedAPI from "/src/api/rogueSeed.js";
import {onMounted, ref, watch} from "vue";
import {copyTextToClipboard} from "/src/utils/copyText.js";
import {cMessage} from "@/utils/message.js";
import userActionOnSeedDB from "/src/utils/IndexedDB/userActionOnSeed.js";
import userActionOnSeed from "/src/utils/IndexedDB/userActionOnSeed.js";
import {dateFormat} from "/src/utils/dateUtil.js";
import {useDisplay} from "vuetify";
import {getTmpUid} from "@/utils/user/userInfo.js";
import {stringToArray} from "@/utils/stringUtils.js";

const {mobile} = useDisplay()

//临时uid，用于作为保存非登录状态的用户各种记录的唯一标识
const tmpUid = getTmpUid();

//分页获取种子API的参数
let pageInfo = ref({
  //排序条件
  sortCondition: 'rating',
  //页数
  pageNum: 0,
  //每页数量
  pageSize: 20,
  //种子类型
  seedType: 1
})

//从父组件传来的数据
const props = defineProps(["modelValue", 'seedType']);

//种子列表
let rogueSeedList = ref([])

/**
 * 分页获取种子
 * @param sortCondition 获取种子列表的排序条件
 */
function getRogueSeedPage(sortCondition) {

  if (pageInfo.value.sortCondition !== sortCondition) {
    rogueSeedList.value = []
    pageInfo.value.pageNum = 0
  }

  //设置排序条件
  pageInfo.value.sortCondition = sortCondition
  //种子类型
  pageInfo.value.seedType = props.seedType
  //根据分页参数获取种子
  rogueSeedAPI.getRogueSeedPage(pageInfo.value).then(response => {

    if (response.data.length < 1) {
      cMessage("没有更多种子了")
      return
    }
    for (const seed of response.data) {
      const {squad, difficulty} = seed
      seed.tags.push(`n${difficulty}`)
      if (squad && squad.length > 1) {
        const squads = stringToArray(squad);
        for (const s of squads) {
          seed.tags.push(s)
        }
      }

      rogueSeedList.value.push(seed)
    }
    //获取在服务段保存的用户评价
    getUserRating()
    getUserCopyRecord()
  })
}

let ratingRecord = ref({})

/**
 * 获取在服务段保存的用户评价
 */
function getUserRating() {
  //如果已经获取过了，则不在从服务端获取数据
  if (ratingRecord.value.length > 1) {
    _writeRatingValue()
  }
  rogueSeedAPI.getRogueSeedUserRating(tmpUid).then(response => {
    //获取的评价记录是一个map，key为种子id，value为评价状态
    ratingRecord.value = response.data
    _writeRatingValue()
  })

  /**
   * 遍历种子列表，写入用户之前的评价
   * @private
   */
  function _writeRatingValue() {
    for (const item of rogueSeedList.value) {
      if (ratingRecord.value[item.seedId]) {
        item.userRating = ratingRecord.value[item.seedId].rating
      }
    }
  }
}


/**
 * 点赞种子
 * @param seedIndex 种子在种子列表中的索引
 * @param oldRating 用户之前的评价
 * @param newRating 用户当前的评价
 */
function rogueSeedRating(seedIndex, oldRating, newRating) {


  //请求体
  const data = {
    //种子的唯一标识
    seedId: rogueSeedList.value[seedIndex].seedId,
    //新评价
    rating: newRating,
    //这个uid填入的是临时uid，是一个兜底方式。<br>
    //如果用户是登录状态，后端会忽略这个临时uid，根据请求头的token获取的用户id进行评价并记录；反之则会使用这个临时id进行评价并记录
    uid: tmpUid
  }
  //发起评价请求
  rogueSeedAPI.rogueSeedRating(data).then(response => {
    //待请求成功后再对前端的种子评价进行更新
    //如果新旧评价相同，代表用户要取消评价，将这个种子的评价取消
    if (oldRating === newRating) {
      rogueSeedList.value[seedIndex].userRating = -1;
    } else {
      //反之则直接对种子更新评价
      rogueSeedList.value[seedIndex].userRating = newRating;
    }
    cMessage(response.data)
  })
}

/**
 * 根据用户选择的种子排序方式获取排序按钮样式
 * @param sortCondition  排序条件
 * @returns {string} 按钮颜色样式
 */
function sortBtnAction(sortCondition) {
  if (sortCondition === pageInfo.value.sortCondition) {
    return 'primary'
  }
}

/**
 * 根据用户对种子的评价获取按钮样式
 * @param userRating  用户评价
 * @param activeValue 按钮代表的评价
 * @returns {string}  按钮颜色样式
 */
function ratingBtnAction(userRating, activeValue) {
  if (userRating === 0 && userRating === activeValue) {
    return 'error'
  }
  if (userRating === 1 && userRating === activeValue) {
    return 'primary'
  }
  return 'gery'
}


/**
 * 复制种子
 * @param seed 种子
 */
function copySeed(seed) {
  copyTextToClipboard(seed.seed)
  //将用户的复制记录保存在indexDB中
  userActionOnSeedDB.insert({
    id: new Date().getTime(),
    seedId: seed.seedId,
    action: 'copy'
  })
}

/**
 * 获取用户的历史操作
 */
function getUserCopyRecord() {
  //从indexDB中获取动作为复制的数据
  userActionOnSeed.queryByAction('copy').then(response => {
    let actionMap = new Map()
    //将集合转为map
    for (let item of response) {
      actionMap.set(item.seedId, '已复制')
    }

    //遍历种子，判断种子是否被复制过
    for (const item of rogueSeedList.value) {
      if (actionMap.get(item.seedId)) {
        item.copyFlag = true
      }
    }
  })
}

function getBtnSize() {
  if (mobile.value) {
    return 'small'
  }
}

function loadNextPage() {
  pageInfo.value.pageNum += 20
  getRogueSeedPage(pageInfo.value.sortCondition)
}

onMounted(() => {
  getRogueSeedPage(pageInfo.value.sortCondition)
})


</script>

<template>

  <div class="flex justify-end align-center m-8">

    <v-icon icon="mdi-sort-ascending" :size="getBtnSize()"></v-icon>
    <v-btn variant="text"
           :size="getBtnSize()"
           :color="sortBtnAction('rating')"
           text="按评分"
           @click="getRogueSeedPage('rating')">
    </v-btn>
    <v-btn variant="text"
           :size="getBtnSize()"
           :color="sortBtnAction('thumbsUp')"
           text="按点赞次数"
           @click="getRogueSeedPage('thumbsUp')">
    </v-btn>
    <v-btn variant="text"
           :size="getBtnSize()"
           :color="sortBtnAction('date')"
           text="按时间"
           @click="getRogueSeedPage('date')">
    </v-btn>
  </div>

  <div class="flex flex-wrap align-center justify-center">
    <v-card class="rogue-seed-card" v-for="(rogueSeed, seedIndex) in rogueSeedList" :key="seedIndex">
      <!-- 标题和复制按钮 -->
      <v-card-text>
        <div class="flex align-center m-4-0">
          <span class="rogue-seed">{{ rogueSeed.seed }}</span>
          <v-spacer></v-spacer>
          <v-btn color="primary" @click="copySeed(rogueSeed)" :size="getBtnSize()">
            <template v-slot:prepend>
              <v-icon icon="mdi-clipboard"></v-icon>
            </template>
            复制
          </v-btn>
        </div>


        <!-- 标签区域 -->
        <div class="flex flex-wrap m-12-0">
          <v-chip color="green" class="m-4" size="small" text="已复制" v-show="rogueSeed.copyFlag">
          </v-chip>
          <v-chip v-for="(tag, tagIndex) in rogueSeed.tags" :key="tagIndex" color="primary" class="m-4" size="small"
                  :text="tag">
          </v-chip>
        </div>

        <!-- 描述区域 -->
        <v-alert :icon="false"
                 :text=" rogueSeed.description"
                 type="info"
                 variant="tonal"
                 class="m-8-0"
                 height="140">

        </v-alert>
        <!--        <div class="mb-4 description" >-->
        <!--          如果没有描述 显示-无描述- -->
        <!--          {{ }}-->
        <!--        </div>-->

        <!-- 评分模块 -->

        <v-row justify="center" align="center" dense>
          <v-col cols="auto">
            <v-btn :color="ratingBtnAction(rogueSeed.userRating,1)" size="small" rounded="xl" variant="elevated"
                   @click="rogueSeedRating(seedIndex,rogueSeed.userRating,1)">
              <v-icon left>mdi-thumb-up</v-icon>
              <template v-slot:append>
                {{ rogueSeed.thumbsUp }}
              </template>
              <!-- 好玩！ (514) -->
            </v-btn>
          </v-col>
          <v-rating v-model="rogueSeed.rating" color="primary" half-increments density="compact" readonly></v-rating>
          <v-col cols="auto">
            <v-btn :color="ratingBtnAction(rogueSeed.userRating,0)" size="small" rounded="xl" variant="elevated"
                   @click="rogueSeedRating(seedIndex,rogueSeed.userRating,0)">
              <v-icon left>mdi-thumb-down</v-icon>
              <!-- 没意思! (114) -->
              <template v-slot:append>
                {{ rogueSeed.thumbsDown }}
              </template>
            </v-btn>
          </v-col>
        </v-row>

        <div class="m-12"></div>

        <div class="flex align-center justify-end">
          <v-icon icon="mdi-update" color="primary">
          </v-icon>
          <div> {{ dateFormat(rogueSeed.createTime, 'yyyy/MM/dd HH:mm') }}</div>
        </div>

      </v-card-text>
    </v-card>
  </div>

  <div class="flex justify-center m-20-0">
    <v-btn text="加载更多种子" variant="text" color="primary" @click="loadNextPage()">
    </v-btn>
  </div>
</template>


<style scoped>
/* 固定卡片内容高度，描述多行文本截断 */


</style>