<script setup>
import {ref} from 'vue'
import '/src/assets/css/rogueSeed/rogueSeed.scss'
import rogueSeedAPI from "/src/api/rogueSeed.js";
import {cMessage} from "@/utils/Message.js";
import {copyTextToClipboard} from "/src/utils/CopyText.js";
import SpriteImage from "@/components/SpriteImage.vue";
import CHARACTER_TABLE from '/src/static/json/survey/character_table_simple.json'

let charIdDict = new Map()

for (const charId in CHARACTER_TABLE) {
  const item = CHARACTER_TABLE[charId];
  charIdDict.set(item.name, charId)
}


let rougeSeedList = ref([])

let searchCriteria = ref({
  keywords: [],
  pageNum: 0,
  pageSize: 500,
  orderBy: "rating"
})

function getRougeSeedPage() {
  rogueSeedAPI.getRogueSeedPage(searchCriteria.value).then(response => {
    console.log(response.data)
    rougeSeedList.value = response.data
  })
}

function getOperatorList(team){

  let list = []
  for(const name of team){
    console.log(name)
    console.log(charIdDict)
    console.log(charIdDict.get(name))
     list.push(charIdDict.get(name))
  }
  return list
}

//总打分数、总星数
const links = [
  {
    "seed": "ROGUE114514",
    "text": "种子简介文本种子简介文本种子简介文本种子简介文本种子简介文本",
    "users": ["第一个提名的用户", "第二个提名的用户"],
    "totalRank": 114,
    "totalStar": 514,
    "lastDate": "2024/10/20",
    "version": "3.3",
  },
  {
    "seed": "ROGUE1919810",
    "text": "悬赏114514龙门币过这个天谴局，觉得够坑请打高分",
    "users": ["第一个提名的用户", "第二个提名的用户"],
    "totalRank": 114,
    "totalStar": 514,
    "lastDate": "2024/10/20",
    "version": "3.3",
  },
  {
    "seed": "ROGUE1048576",
    "text": "请自备999源石锭",
    "users": ["第一个提名的用户", "第二个提名的用户"],
    "totalRank": 114,
    "totalStar": 514,
    "lastDate": "2024/10/20",
    "version": "3.3",
  },
  {
    "seed": "ROGUE8388608",
    "text": "开局记得选维什戴尔",
    "users": ["第一个提名的用户", "第二个提名的用户"],
    "totalRank": 114,
    "totalStar": 514,
    "lastDate": "2024/10/20",
    "version": "3.3",
  }
]


getRougeSeedPage()

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
    <div >
      <!-- 版本热门seeds -->
      <el-card style="margin: 12px">
        <template #header>
          <div class="card-header">
            <span>版本热门seeds</span>
          </div>
        </template>
        <el-table :data="rougeSeedList" style="width: 100%">
          <el-table-column fixed prop="description" label="简介" width="240"/>
          <el-table-column prop="seed" label="种子代码" width="180"/>
          <el-table-column label="肉鸽主题" width="150" prop="rogueTheme">
          </el-table-column>
          <el-table-column label="分队" width="150" prop="squad">
          </el-table-column>
          <el-table-column label="评分" width="60" prop="rating">
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
              <el-button link type="primary" size="small" @click="copyTextToClipboard(scope.row.seed)">
                复制
              </el-button>
              <el-button link type="primary" size="small"  @click="">
                详情
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
      <!-- 本周热门seeds -->
      <el-card style="max-width: 720px">
        <template #header>
          <div class="card-header">
            <span>本周热门seeds</span>
          </div>
        </template>
        <el-table :data="links" style="width: 100%">
          <el-table-column fixed prop="text" label="简介" width="240"/>
          <el-table-column prop="seed" label="seed" width="180"/>
          <el-table-column prop="rank" label="有多爽/有多坑" width="150">
            <el-rate v-model="value" clearable/>
          </el-table-column>
          <el-table-column label="操作" min-width="120">
            <template #default>
              <el-button link type="primary" size="small" @click="">
                复制
              </el-button>
              <el-button link type="primary" size="small" disabled @click="">
                详情
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>

  </div>
</template>

<style scoped></style>