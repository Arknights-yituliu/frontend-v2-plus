<script setup>
import {onMounted, ref, watch} from "vue";
import {formatNumber} from "/src/utils/format.js";
import stageDataCache from "/src/utils/indexedDB/stageDataCache.js";
import ItemImage from "@/components/sprite/ItemImage.vue";
import {getUid} from "/src/utils/user/userInfo.js";
import {getStageConfig} from "@/utils/user/userConfig.js";


let stageList = ref([])
let zoneOptions = ref([])
let stageGroupByZoneName = ref({})
let selectedZoneName = ref('')
let itemList = ref([])

const stageTypeMap = {
  ACT: "SideStory",
  ACT_REP: "SideStory",
  MAIN: "主线",
  ACT_PERM: "插曲别传"
}


const numberRegex = /^(0|[1-9]\d*)(\.\d+)?$/;

const inputRules = [
  value => numberRegex.test(value) || '仅可输入0.0-1.0间的小数，小数点后位数不限',
  value => (value === 0 || (value != null && value !== '')) || '不能为空',
  value => (value >= 0 && value <= 1) || '仅可输入0.0-1.0间的小数，小数点后位数不限',
]


function getStageCollectByZone() {
  stageDataCache.getStageInfoCache().then(response => {

    let zoneMap = new Map()
    let zoneTmp = {}
    for (const stage of response) {
      const {zoneName, start, stageType} = stage
      if (!stageTypeMap[stageType]) {
        continue
      }

      if (!zoneTmp[zoneName]) {
        if (zoneMap.get(stageType)) {

          zoneMap.get(stageType).children.push({
            value: zoneName,
            label: zoneName
          })

        } else {
          zoneMap.set(stageType, {
            value: stageType,
            label: stageTypeMap[stageType],
            children: [{
              value: zoneName,
              label: zoneName
            }]
          })
        }
      }

      zoneTmp[zoneName] = true
      if (stageGroupByZoneName.value[zoneName]) {
        stageGroupByZoneName.value[zoneName].push(stage)
      } else {
        stageGroupByZoneName.value[zoneName] = [stage]
      }
    }


    for (const [k, v] of zoneMap) {
      zoneOptions.value.push(v)
    }


  })
}


let stageConfig = ref({
  id: getUid(),
  expCoefficient: 0.633,
  lmdCoefficient: 1,
  useActivityStage: false,
  stageBlacklist: [],
  source:'yituliu',
  customItem: [{
    itemId: '30073',
    itemValue: 1.8
  }]
})

const config = getStageConfig()
for(const key in config){
  stageConfig.value[key] = config[key]
}

stageConfig.value.source = 'yituliu'


const getStageList = (value) => {
  stageList.value = stageGroupByZoneName.value[value[1]]
}


function addStageBlackList(stage) {
  for (const item of stageConfig.value.stageBlacklist) {
    if (item.stageId === stage.stageId) {
      return;
    }
  }

  stageConfig.value.stageBlacklist.push({
    stageId: stage.stageId,
    stageCode: stage.stageCode
  })

}

function deleteStageBlackList(stageId) {

  stageConfig.value.stageBlacklist = stageConfig.value.stageBlacklist.filter(e => e.stageId !== stageId)
}


function getItemList() {
  checkStageConfig()
  stageDataCache.getItemValueCacheByConfig(stageConfig.value).then(response => {
    itemList.value = response
  })
}

function forceRefreshItemValue() {
  checkStageConfig()
  localStorage.setItem("StageConfig", JSON.stringify(stageConfig.value))
  stageDataCache.getItemValueCacheByConfig(stageConfig.value, true)
}

getItemList()

let customItemDialog = ref(false)

let customItem = ref({
  itemId: '30073',
  itemValue: 1.8
})

function chooseCustomItem(item) {
  customItem.value = {
    itemId: item.itemId,
    itemValue: item.itemValueAp
  }
}

function addCustomItem() {

  for (const item of stageConfig.value.customItem) {
    if (item.itemId === customItem.value.itemId) {
      item.itemValue = customItem.value.itemValue
      item.itemId = customItem.value.itemId
      return customItemDialog.value = false
    }
  }

  stageConfig.value.customItem.push({
    itemId: customItem.value.itemId,
    itemValue: customItem.value.itemValue,
  })
  customItemDialog.value = false
}

function deleteCustomItem(itemId) {
  stageConfig.value.customItem = stageConfig.value.customItem.filter(e => e.itemId !== itemId)
}

const debugText = ref('')


function checkStageConfig() {
  if (!_check(stageConfig.value.expCoefficient)) {
    stageConfig.value.expCoefficient = 0
  }

  if (!_check(stageConfig.value.lmdCoefficient)) {
    stageConfig.value.lmdCoefficient = 0
  }

  function _check(value) {
    // console.log('不为数字', numberRegex.test(value))
    // console.log('为空', (value === 0 || (value != null && value !== '')))
    // console.log('超限', (value >= 0 && value <= 1))
    return numberRegex.test(value) && (value === 0 || (value != null && value !== '')) && (value >= 0 && value <= 1)
  }
}

watch(stageConfig, (newVal, oldVal) => {
  debugText.value = JSON.stringify(stageConfig.value, null, 2)
  localStorage.setItem("StageConfig", JSON.stringify(stageConfig.value))
}, {deep: true});

getStageCollectByZone()

onMounted(() => {
  debugText.value = JSON.stringify(stageConfig.value, null, 2)
})

</script>

<template>

  <v-card title="材料价值自定义参数" class="user-card m-4">
    <span class="card-description m-0-16">
            材料价值自定义参数暂时只能保存于当前设备，后续将会通过一图流账号保存至服务器
    </span>
    <div>
      <v-list>
        <v-list-item>
          <v-list-item-title>
            经验书价值系数—{{ formatNumber(stageConfig.expCoefficient, 4) }}
          </v-list-item-title>
          <span class="card-description">
            用于调整经验书的价值，经验书价值=0.0036*价值系数
          </span>
          <v-text-field
              v-model="stageConfig.expCoefficient"
              :rules="inputRules"
              variant="outlined"
              density="compact">
          </v-text-field>
        </v-list-item>
        <v-list-item>
          <v-list-item-title>
            龙门币价值系数—{{ formatNumber(stageConfig.lmdCoefficient, 4) }}
          </v-list-item-title>
          <span class="card-description">
            用于调整龙门币的价值，龙门币价值=0.0036*价值系数
          </span>
          <v-text-field
              v-model="stageConfig.lmdCoefficient"
              :rules="inputRules"
              variant="outlined"
              density="compact">
          </v-text-field>
        </v-list-item>
        <v-list-item>
          <v-list-item-title>
            是否使用活动本定价 {{ stageConfig.useActivityStage }}
          </v-list-item-title>
          <span class="card-description">
            选择此选项后，计算过程将会包括过去的所有活动本，由于掉率有统计浮动，因此可能出现当期活动本不为100%，实际的最高收益本为过去的活动本
          </span>
          <v-switch hide-details color="primary" v-model="stageConfig.useActivityStage"></v-switch>
        </v-list-item>
        <v-list-item>
          <v-list-item-title>
            关卡黑名单
          </v-list-item-title>
          <v-list>
            <v-list-item>
              已选择关卡
              <v-chip
                  class="m-2"
                  label
                  v-for="stage in stageConfig.stageBlacklist"
                  :text="stage.stageCode"
                  @click="deleteStageBlackList(stage.stageId)"
              >
                <template v-slot:append>
                  <v-icon icon="mdi-close"></v-icon>
                </template>
              </v-chip>
            </v-list-item>
            <v-list-item>
              <div>选择章节—{{ selectedZoneName[1] }}</div>
            </v-list-item>
            <el-cascader v-model="selectedZoneName"
                         :show-all-levels="false"
                         :options="zoneOptions" @change="getStageList"/>
            <div>
              <v-btn v-for="stage in stageList"
                     :text="stage.stageCode"
                     class="m-2"
                     @click="addStageBlackList(stage)"
              >
              </v-btn>
            </div>
          </v-list>


        </v-list-item>
        <v-list-item>
          <v-list-item-title>
            自定义材料价值
          </v-list-item-title>
          <v-btn color="primary" variant="outlined"
                 size="small" text="新增自定义材料"
                 @click="customItemDialog = true"></v-btn>
          <v-table>
            <thead>
            <tr>
              <th>材料</th>
              <th>自定义价值</th>
              <th>操作</th>
            </tr>
            </thead>
            <tbody>
            <tr v-for="item in stageConfig.customItem">
              <td>
                <ItemImage :size="60" :mobile-size="40" :item-id="item.itemId"></ItemImage>
              </td>
              <td>{{ item.itemValue }}</td>
              <td>
                <v-btn color="red" text="删除" @click="deleteCustomItem(item.itemId)"></v-btn>
              </td>
            </tr>
            </tbody>
          </v-table>
        </v-list-item>

        <div class="flex justify-center">
          <v-btn text="加载新的材料参数" color="primary" @click="forceRefreshItemValue()"></v-btn>
        </div>

        <v-list-item>
          <v-list-item-title>
            debug
          </v-list-item-title>
          <textarea v-model="debugText" style="height: 300px;width: 80%" class="m-4">
          </textarea>
        </v-list-item>
      </v-list>

    </div>
  </v-card>

  <v-dialog v-model="customItemDialog" max-width="800">
    <v-card>

      <v-list>
        <v-list-item>
          <div>
            <v-text-field
                density="compact"
                v-model="customItem.itemValue"
                variant="outlined">
              <template v-slot:prepend>
                <ItemImage :size="60" :mobile-size="40" :item-id="customItem.itemId"></ItemImage>
              </template>
              <template v-slot:append>
                <v-btn color="primary" text="新增" @click="addCustomItem()"></v-btn>
              </template>
            </v-text-field>
          </div>
        </v-list-item>
        <v-list-item title="可选材料">
          <div class="flex flex-wrap justify-center">
            <ItemImage v-for="item in itemList" :item-id="item.itemId"
                       :size="60" :mobile-size="40"
                       @click="chooseCustomItem(item)">
            </ItemImage>
          </div>
        </v-list-item>
      </v-list>
    </v-card>
  </v-dialog>

</template>