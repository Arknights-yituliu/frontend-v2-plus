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

let rougeSeedList = ref([])

function getRogueSeedPage() {
  rogueSeedAPI.getRogueSeedPage(pageInfo.value).then(response => {
    rougeSeedList.value = response.data
    rogueSeedAPI.getRogueSeedUserRating().then(response => {
      let ratingMap = response.data
      for (const item of rougeSeedList.value) {
        if (ratingMap[item.seedId]) {
          item.rating = ratingMap[item.seedId].rating
        }
      }
    })
  })
}

function rogueSeedRating(seedId, rating) {

  rogueSeedAPI.rogueSeedRating({seedId: seedId, rating: rating}).then(response => {
    cMessage('评分成功')
  })
}

function getUserRating() {

}

onMounted(() => {
  getRogueSeedPage()
})

</script>

<template>

  <v-row dense>
    <v-col
        v-for="(rougeSeed, index) in rougeSeedList"
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


  <v-container>

    <v-row>
      <v-col cols="12" sm="6" md="4" lg="3">
        <v-card outlined>
          <v-card-title>这里是种是种是种是种是种是种是种子</v-card-title>
          <v-card-subtitle>得分: 95</v-card-subtitle>
          <v-card-text>
            <p>难度: 高</p>
            <p>版本: 1.0.1</p>
          </v-card-text>
          <v-card-actions>
            <v-btn color="success" text>查看详情</v-btn>
            <v-btn color="primary" text>收藏</v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="4" lg="3">
        <v-card outlined>
          <v-card-title>种子名称: 胡种示例2</v-card-title>
          <v-card-subtitle>得分: 89</v-card-subtitle>
          <v-card-text>
            <p>难度: 中</p>
            <p>版本: 1.2.0</p>
          </v-card-text>
          <v-card-actions>
            <v-btn color="success" text>查看详情</v-btn>
            <v-btn color="primary" text>收藏</v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
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