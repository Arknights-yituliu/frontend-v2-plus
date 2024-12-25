<script setup>
import {ref} from 'vue'
import '/src/assets/css/rogueSeed/rogue-seed-upload.scss'
import rogueSeedAPI from "/src/api/rogueSeed.js";
import {cMessage} from "/src/utils/message.js";
import CHARACTER_TABLE from '/src/static/json/survey/character_table_simple.json'
import SpriteImage from "/src/components/sprite/SpriteImage.vue";
import {professionDict} from "/src/utils/survey/common.js";

import {compressImage, getDataUrl} from '/src/utils/fileConversion.js'
import {debounce} from "@/utils/debounce.js";

let operatorTable = new Map()

let charIdDict = new Map()

function initOperatorTable() {
  for (const charId in CHARACTER_TABLE) {
    const item = CHARACTER_TABLE[charId];
    charIdDict.set(item.name, charId)
  }
}

const rogueSeedForm = ref({
  "seedId": 1741880747960100,
  "seed": "1414115151",
  "uid": 14401084810,
  'difficulty':15,
  "rogueVersion": "萨卡兹的无终奇语DLC-遁入阇那",
  "rogueTheme": "萨卡兹的无终奇语",
  "squad": "蓝图测绘分队",
  "operatorTeam": ['维什戴尔', '古米', '卡达'],
  "description": "这里写下你的描述",
  "tags": ["萨卡兹的无终奇语", "蓝图测绘分队"],
  "summaryImageLink": ""
})

let seedTagValue = ref('')

const addSeedTag = () => {
  if (rogueSeedForm.value.tags.indexOf(seedTagValue.value) < 0) {
    rogueSeedForm.value.tags.push(seedTagValue.value)
    seedTagValue.value = ''
  }
}

const addOrDeleteOperator = (operator) => {
  if (rogueSeedForm.value.operatorTeam.indexOf(operator) < 0) {
    rogueSeedForm.value.operatorTeam.push(operator)
  } else {
    rogueSeedForm.value.operatorTeam = rogueSeedForm.value.operatorTeam.filter(e => e !== operator)
  }
}

let settlementChartBlob = ref('')
let settlementChartDataUrl = ref('')

function chooseImage() {
  const element = document.getElementById("settlement-chart");
  // 添加一个事件监听器来监听文件选择的变化
  element.addEventListener('change', fileToDataUrl);
  // 触发文件选择对话框
  element.click();
}

const fileToDataUrl = async () => {
  const input = document.getElementById('settlement-chart')
  const files = input.files;
  if (files.length === 0) {
    alert('至少选择一个文件');
    return;
  }

  const file = files[0]
  settlementChartBlob.value = await compressImage(file)
  getDataUrl(settlementChartBlob.value).then(response => {

    settlementChartDataUrl.value = response
  })


}

const uploadSeed = () => {
  let data = JSON.parse(JSON.stringify(rogueSeedForm.value))
  if (data.operatorTeam) {
    data.operatorTeam = data.operatorTeam.join(',')
  } else {
    cMessage('未选择初始干员', 'error')
  }

  rogueSeedAPI.uploadRogueSeed(data).then(response => {
    console.log(response.data)
    cMessage('提交成功')
  })
}

const upload = debounce(() => {
  const input = document.getElementById('settlement-chart')
  if(input.files.length>0){
    uploadImage()
  }else {
    uploadSeed()
  }

}, 1500)

const uploadImage = () => {
  const formData = new FormData();
  formData.append('file', settlementChartBlob.value)
  rogueSeedAPI.uploadRogueSeedSettlementChart(formData).then(response => {
    rogueSeedForm.value.summaryImageLink = response.data.imagePath

    uploadSeed()
  })
}

let selectedProfession = ref('SNIPER')
let selectedRarity = ref(6)

let displayOperator = ref([])
const filterOperator = () => {
  for (const charId in CHARACTER_TABLE) {
    const item = CHARACTER_TABLE[charId];
    if (item.rarity !== selectedRarity.value) {
      console.log(item.rarity + "跳出")
      continue
    }
    if (item.profession !== selectedProfession.value) {
      console.log(item.profession + "跳出")
      continue
    }
    displayOperator.value.push(item)
  }
  console.log(displayOperator.value)
}


let operatorCheckBoxCollapse = ref(true)
initOperatorTable()
console.log(charIdDict)
filterOperator()
</script>

<template>
  <div class="rogue-seed-upload">
    <!-- 提名区域 -->
    <el-card style="margin: 0 0 0 8px;width: 800px;">
      <el-form :model="rogueSeedForm" label-width="auto" class="rogue-seed-form">
        <el-form-item label="种子">
          <el-input v-model="rogueSeedForm.seed" style="width: 500px;"/>
        </el-form-item>
        <el-form-item label="肉鸽主题">
          <el-select v-model="rogueSeedForm.rogueTheme" placeholder="" style="width: 500px;">
            <el-option label="水月与深蓝之树" value="水月与深蓝之树"/>
            <el-option label="探索者的银凇止境" value="探索者的银凇止境"/>
            <el-option label="萨卡兹的无终奇语" value="萨卡兹的无终奇语"/>
          </el-select>
        </el-form-item>
        <el-form-item label="肉鸽版本">
          <el-select v-model="rogueSeedForm.rogueVersion" placeholder="" style="width: 500px;">
            <el-option label="萨卡兹的无终奇语DLC-遁入阇那" value="萨卡兹的无终奇语DLC-遁入阇那"/>
          </el-select>
        </el-form-item>
        <el-form-item label="分队选择">
          <el-select v-model="rogueSeedForm.squad" placeholder="" style="width: 500px;">
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
        <el-form-item label="初始干员">
          <div>
            <div class="operator-checkbox">
              <SpriteImage original-size="180" display-size="60" :image-name="charIdDict.get(operator)"
                           v-for="(operator,index) in rogueSeedForm.operatorTeam" :key="index"
                           @click="addOrDeleteOperator(operator)"></SpriteImage>
            </div>

            <h3>点击下面头像选择初始干员，再次点击取消选择</h3>
            <div>
              星级
              <el-radio-group v-model="selectedRarity">
                <el-radio-button v-for="(item,index) in [1,2,3,4,5,6]" :label="item" :value="item"/>

              </el-radio-group>
            </div>
            <div>
              职业
              <el-radio-group v-model="selectedProfession">
                <el-radio-button v-for="(item,index) in professionDict" :label="item.label" :value="item.value"/>
              </el-radio-group>
            </div>

            <div>
              <div class="operator-checkbox">
                <SpriteImage original-size="180" display-size="60" :image-name="operator.charId" margin="4"
                             v-for="(operator,charId) in displayOperator" :key="charId"
                             @click="addOrDeleteOperator(operator.name)">
                </SpriteImage>
              </div>
            </div>

          </div>
        </el-form-item>

<!--        <el-form-item label="结算图">-->
<!--          <div>-->
<!--            <div>-->
<!--              <el-button type="primary">上传结算图</el-button>-->
<!--            </div>-->
<!--            <input style="display: none" type="file" id="settlement-chart">-->
<!--            <div class="settlement-chart-checkbox" @click="chooseImage()">-->
<!--              <img src="/image/icon/upload-image.png" class="settlement-chart-upload-button" alt="">-->
<!--              <img :src="settlementChartDataUrl" alt="" class="settlement-chart">-->
<!--            </div>-->
<!--          </div>-->
<!--        </el-form-item>-->

        <el-form-item label="种子简介">
          <el-input v-model="rogueSeedForm.description" type="textarea"/>
        </el-form-item>
        <el-form-item>
          <div class="rogue-seed-tag-form">
            <div class="rogue-seed-tag-box">
              <div class="rogue-seed-tag" v-for="(tag,index) in rogueSeedForm.tags">
                #{{ tag }}
              </div>
            </div>
            <input class="rogue-seed-tag-input" v-model="seedTagValue"/>
            <div class="rogue-seed-tag-button" @click="addSeedTag()">输入后点击添加标签</div>
          </div>
        </el-form-item>

        <el-button type="primary" @click="upload()">提名种子！</el-button>

        <!--        <el-button type="primary" @click="onSubmit">随机来一个Seed让我爽爽！</el-button>-->
        <!--        <div>-->
        <!--          种子 : KFCVME50 天胡国王套200源石锭戒律酒杯胡局-->
        <!--        </div>-->
      </el-form>
    </el-card>

  </div>

</template>