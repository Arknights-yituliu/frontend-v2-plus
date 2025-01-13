<script setup>
import {ref} from 'vue'
import '/src/assets/css/rogue/rogue-seed-upload.scss'
import rogueSeedAPI from "/src/api/rogueSeed.js";
import {cMessage} from "/src/utils/message.js";
import CHARACTER_TABLE from '/src/static/json/survey/character_table_simple.json'
import OperatorAvatar from "/src/components/sprite/OperatorAvatar.vue";
import {operatorFilterCondition, filterOperatorList} from "/src/utils/survey/operatorFilter.js";
import {compressImage, getDataUrl} from '/src/utils/fileConversion.js'
import {debounce} from "@/utils/debounce.js";

const displayFilterCondition = ['profession', 'rarity']

let operatorsList = []

let operatorIdDict = new Map()

for (const charId in CHARACTER_TABLE) {
  const item = CHARACTER_TABLE[charId];
  operatorIdDict.set(item.name, charId)
  operatorsList.push({
    charId: charId,
    name: item.name,
    rarity: item.rarity,
    profession: item.profession,
    itemObtainApproach: item.itemObtainApproach,
    subProfessionId: item.subProfessionId,
  })
}


let displayOperatorsList = ref([])


const debounceAddFilterConditionAndFilterOperator = debounce(filterOperatorByCondition, 500)

function filterOperatorByCondition(func, index) {
  func(index)
  displayOperatorsList.value = filterOperatorList(operatorsList)
}

filterOperatorByCondition(operatorFilterCondition.value.profession.actionFunc, 4)



function btnAction(action) {
  if (!action) {
    return "tonal"
  }
}


const ROGUE_THEME = ["萨卡兹的无终奇语", "探索者的银凇止境", "水月与深蓝之树"]

const ROGUE_VERSION = ["萨卡兹的无终奇语DLC-遁入阇那"]

const SQUAD = ["蓝图测绘分队", "突击战术分队", "远程战术分队", "破坏战术分队",
  "异想天开分队", "点刺成锭分队", "因地制宜分队", "魂灵护送分队", "博闻广记分队"]


const rogueSeedForm = ref({
  "seedId": 1741880747960100,
  "seed": "1414115151",
  "uid": 14401084810,
  'difficulty': 15,
  "rogueVersion": "萨卡兹的无终奇语DLC-遁入阇那",
  "rogueTheme": "萨卡兹的无终奇语",
  "squad": "蓝图测绘分队",
  "operatorTeam": ['维什戴尔', '古米', '卡达'],
  "description": "这里写下你的描述",
  "tags": ["萨卡兹的无终奇语", "蓝图测绘分队"],
  "summaryImageLink": ""
})

let inputTagText = ref('')

function addSeedTag() {
  if (rogueSeedForm.value.tags.indexOf(inputTagText.value) < 0) {
    rogueSeedForm.value.tags.push(inputTagText.value)
    inputTagText.value = ''
  }
}

function addOrDeleteOperator(operator) {
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

function uploadSeed() {
  let data = JSON.parse(JSON.stringify(rogueSeedForm.value))
  if (data.operatorTeam) {
    data.operatorTeam = data.operatorTeam.join(',')
  } else {
    cMessage('未选择初始干员', 'error')
  }

  rogueSeedAPI.uploadRogueSeed(data).then(response => {

    cMessage('提交成功')
  })
}

const upload = debounce(() => {
  const input = document.getElementById('settlement-chart')
  if (input.files.length > 0) {
    uploadImage()
  } else {
    uploadSeed()
  }

}, 1500)

function uploadImage() {
  const formData = new FormData();
  formData.append('file', settlementChartBlob.value)
  rogueSeedAPI.uploadRogueSeedSettlementChart(formData).then(response => {
    rogueSeedForm.value.summaryImageLink = response.data.imagePath

    uploadSeed()
  })
}


</script>

<template>
  <div class="rogue-seed-upload">
    <!-- 提名区域 -->

    <v-card class="rogue-seed-form">
      <v-card-text>
        <div class="m-0-4 opacity-70">种子id</div>
        <v-text-field
            density="compact"
            v-model="rogueSeedForm.seed"
            color="primary"
            variant="outlined"
            class="m-4"
        ></v-text-field>
        <div class="m-0-4 opacity-70">肉鸽主题</div>
        <v-select
            :items="ROGUE_THEME"
            density="compact"
            variant="outlined"
            v-model="rogueSeedForm.rogueTheme"
        ></v-select>
        <div class="m-0-4 opacity-70">肉鸽版本</div>
        <v-select
            :items="ROGUE_VERSION"
            density="compact"
            variant="outlined"
            v-model="rogueSeedForm.rogueVersion"
        ></v-select>
        <div class="m-0-4 opacity-70">分队</div>
        <v-select
            :items="SQUAD"
            density="compact"
            variant="outlined"
            v-model="rogueSeedForm.squad"
        ></v-select>
        <div class="m-0-4 opacity-70">初始干员</div>

        <div class="flex">
          <OperatorAvatar :char-id="operatorIdDict.get(operator)" size="60" mobile-size="50"
                          class="m-4 shadow-md"
                          v-for="(operator,index) in rogueSeedForm.operatorTeam" :key="index"
                          @click="addOrDeleteOperator(operator)"></OperatorAvatar>
        </div>

        <div class="m-4" v-for="(conditions,module) in operatorFilterCondition" :key="module"
             v-show="displayFilterCondition.includes(module)">
          <v-btn variant="text" class="m-4">{{ conditions.label }}</v-btn>
          <v-btn color="primary" :variant="btnAction(condition.action)"
                 class="m-4" rounded="x-large"
                 v-for="(condition,index) in conditions.conditions" :key="index"
                 @click="debounceAddFilterConditionAndFilterOperator(conditions.actionFunc,index)">
            {{ condition.label }}
          </v-btn>
        </div>

        <div class="flex flex-wrap">
          <OperatorAvatar :char-id="operator.charId" class="m-4 shadow-md" size="60" mobile-size="50"
                          v-for="(operator,index) in displayOperatorsList" :key="index"
                          @click="addOrDeleteOperator(operator.name)">
          </OperatorAvatar>
        </div>

        <div class="m-0-4 opacity-70">种子简介</div>
        <v-textarea v-model="rogueSeedForm.description" variant="outlined"></v-textarea>

<!--        <div class="m-0-4 opacity-70">上传图片（非必须）</div>-->
        <input style="display: none" type="file" id="settlement-chart">
<!--        <div class="settlement-chart-checkbox" @click="chooseImage()">-->
<!--          <v-icon icon="mdi-plus" class="settlement-chart-upload-button" size="60" color="grey"></v-icon>-->
<!--          <img :src="settlementChartDataUrl" alt="" class="settlement-chart">-->
<!--        </div>-->

        <div class="m-0-4 opacity-70">种子标签</div>
        <div>
          <v-chip density="compact" :text="`#${tag}`" color="primary"
                  v-for="(tag,index) in rogueSeedForm.tags" class="m-4"></v-chip>
        </div>

        <div class="flex align-center">
          <v-text-field
              density="compact"
              v-model="inputTagText"
              color="primary"
              variant="outlined"
          >
            <template v-slot:append>
              <v-btn color="primary" variant="outlined" text="添加tag" @click="addSeedTag"></v-btn>
            </template>
          </v-text-field>

        </div>


        <div class="flex justify-center">
          <v-btn color="primary" @click="upload" text="提交种子"></v-btn>
        </div>

      </v-card-text>
    </v-card>

  </div>

</template>