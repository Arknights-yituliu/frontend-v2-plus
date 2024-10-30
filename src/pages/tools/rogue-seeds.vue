<script  setup>
import {ref} from 'vue'
import '/src/assets/css/rogueSeed/rogueSeed.scss'
import rogueSeedAPI from "/src/api/rogueSeed.js";
import {cMessage} from "@/utils/Message.js";
import {copyTextToClipboard} from "/src/utils/CopyText.js";
// do not use same name with ref
const rougeSeedForm = ref({
  "seedId": 1735237566300,
  "seed": "1414115151",
  "uid": 14401084810,
  "rogueVersion": "萨卡兹的无终奇语DLC-遁入阇那",
  "rogueTheme": "萨卡兹的无终奇语",
  "squad": "蓝图测绘分队",
  "operatorTeam":  "维什戴尔,古米,卡达",
  "description": "这里写下你的描述",
  "tags": ["萨卡兹的无终奇语", "蓝图测绘分队"],
  "summaryImageLink": "http://192.168.1.19:4000/image/sprite/sprites-icon.png"
})

const onSubmit = () => {
  console.log('submit!')
}

const upload = () =>{
  rogueSeedAPI.uploadRogueSeed(rougeSeedForm.value).then(response=>{
    console.log(response.data)
    cMessage('提交成功')
  })
}

let seedTagValue = ref('')

const addSeedTag = ()=>{
  if(rougeSeedForm.value.tags.indexOf(seedTagValue.value)<0){
    rougeSeedForm.value.tags.push(seedTagValue.value)
    seedTagValue.value = ''
  }
}

let rougeSeedList = ref([])

let searchCriteria = ref({
  keywords:[],
  pageNum:0,
  pageSize:500,
  orderBy:"rating"
})
function getRougeSeedPage(){
  rogueSeedAPI.getRogueSeedPage(searchCriteria.value).then(response=>{
    console.log(response.data)
    rougeSeedList.value = response.data
  })
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


function openNewPage(url) {
  window.open(url)
}

getRougeSeedPage()

</script>

<template>
  <div class="rogue-seed-page">
    <!-- 提名区域 -->
    <el-card >
      <el-form :model="rougeSeedForm" label-width="auto" class="rogue-seed-form">
        <el-form-item label="种子">
          <el-input v-model="rougeSeedForm.seed" style="width: 500px;"/>
        </el-form-item>
        <el-form-item label="肉鸽主题">
          <el-select v-model="rougeSeedForm.rogueTheme" placeholder="" style="width: 500px;">
            <el-option label="水月与深蓝之树" value="水月与深蓝之树"/>
            <el-option label="探索者的银凇止境" value="探索者的银凇止境"/>
            <el-option label="萨卡兹的无终奇语" value="萨卡兹的无终奇语"/>
          </el-select>
        </el-form-item>
        <el-form-item label="肉鸽版本">
          <el-select v-model="rougeSeedForm.rogueVersion" placeholder="" style="width: 500px;">
            <el-option label="萨卡兹的无终奇语DLC-遁入阇那" value="萨卡兹的无终奇语DLC-遁入阇那"/>
          </el-select>
        </el-form-item>
        <el-form-item label="分队选择">
          <el-select v-model="rougeSeedForm.squad" placeholder="" style="width: 500px;">
            <el-option label="蓝图测绘分队" value="蓝图测绘分队"/>
            <el-option label="突击战术分队" value="突击战术分队"/>
            <el-option label="远程战术分队" value="远程战术分队"/>
            <el-option label="破坏战术分队" value="破坏战术分队"/>
            <el-option label="异想天开分队" value="异想天开分队"/>
            <el-option label="点刺成锭分队" value="点刺成锭分队"/>
            <el-option label="因地制宜分队" value="因地制宜分队"/>
            <el-option label="魂灵护送分队" value="魂灵护送分队"/>
            <el-option label="博闻广记分队" value="博闻广记分队"/>
            <el-option label="指挥分队" value="指挥分队"/>
            <el-option label="拟态学者分队" value="拟态学者分队"/>
          </el-select>
        </el-form-item>
        <el-form-item label="种子简介">
          <el-input v-model="rougeSeedForm.description" type="textarea" />
        </el-form-item>
        <el-form-item>
          <div class="rogue-seed-tag-form">
            <div class="rogue-seed-tag-box">
              <div class="rogue-seed-tag" v-for="(tag,index) in rougeSeedForm.tags">
                #{{tag}}
              </div>
            </div>
            <input class="rogue-seed-tag-input" v-model="seedTagValue"/>
            <div class="rogue-seed-tag-button" @click="addSeedTag()">输入后点击添加标签</div>
          </div>
        </el-form-item>

        <el-button type="primary" @click="upload">提名种子！</el-button>

<!--        <el-button type="primary" @click="onSubmit">随机来一个Seed让我爽爽！</el-button>-->
<!--        <div>-->
<!--          种子 : KFCVME50 天胡国王套200源石锭戒律酒杯胡局-->
<!--        </div>-->
      </el-form>
    </el-card>

    <!-- 展示区域 -->
<!--    <el-radio-group size="large">-->
<!--      <el-radio-button label="#1 傀影与猩红血钻" value="New York"/>-->
<!--      <el-radio-button label="#2 水月" value="Washington"/>-->
<!--      <el-radio-button label="#3 萨米" value="Los Angeles"/>-->
<!--      <el-radio-button label="#4 萨卡兹" value=""/>-->
<!--    </el-radio-group>-->
    <div class="flex flex-wrap gap-4" style="display: flex;">
      <!-- 版本热门seeds -->
      <el-card style="max-width: 720px">
        <template #header>
          <div class="card-header">
            <span>版本热门seeds</span>
          </div>
        </template>
        <el-table :data="rougeSeedList" style="width: 100%">
          <el-table-column fixed prop="description" label="简介" width="240"/>
          <el-table-column prop="seed" label="种子代码" width="180"/>
          <el-table-column label="有多爽/有多坑" width="150">
            <el-rate v-model="value" clearable/>
          </el-table-column>
          <el-table-column label="操作" min-width="120">
            <template #default="scope">
              <el-button link type="primary" size="small" @click="copyTextToClipboard(scope.row.seed)">
                复制
              </el-button>
              <el-button link type="primary" size="small" disabled @click="">
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