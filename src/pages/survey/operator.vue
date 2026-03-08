<script setup>
import {createMessage} from "/src/utils/message.js";
import operatorDataAPI from "/src/api/operatorData.js"
import {onMounted, ref, computed} from "vue";
import {operatorRecommend} from "/src/utils/survey/operatorRecommend";
import {operatorTable, operatorTableV2} from "/src/utils/gameData.js";
import {exportExcel} from '/src/utils/exportExcel.js'

import "/src/assets/css/survey/operator.scss";
import "/src/assets/css/survey/operator.phone.scss";
import {debounce} from "/src/utils/debounce";
import {useRouter} from "vue-router";
import {operatorFilterCondition, filterOperatorList} from "/src/utils/survey/operatorFilter.js";

import OperatorStatisticalTable from "/src/components/survey/OperatorStatisticalTable.vue";
import deepClone from "/src/utils/deepClone.js";
import EquipIcon from "/src/components/sprite/EquipIcon.vue";
import OperatorBar from "/src/components/survey/OperatorBar.vue";
import OperatorAvatar from "@/components/sprite/OperatorAvatar.vue";
import {formatNumber} from "/src/utils/format.js";
import SkillIcon from "@/components/sprite/SkillIcon.vue";
import operatorProgressionStatisticsDataCache from "@/plugins/indexedDB/operatorProgressionStatisticsData.js";
import {dateFormat} from "@/utils/dateUtil.js";
import AccountOverviewPanel from "/src/components/survey/AccountOverviewPanel.vue";
import SklandAPI from '/src/utils/survey/skland.js';
import { copyTextToClipboard } from "/src/utils/copyText.js";
import { userInfo } from "/src/utils/user/userInfo.js";
import operatorUpdateTime from '/public/json/operator_update_time.json';

let RANK_TABLE = ref([0, 1, 2, 3, 4, 5, 6]);  //等级


let displayTabHeader = ref('数据导入导出')

// 账号一图流相关数据
let sklandAccountData = ref(null)  // 完整的森空岛账号数据
const accountOverviewPanelRef = ref(null)

// 森空岛导入相关
const SKLAND_LINK = 'https://www.skland.com/index'
const CONSOLE_CODE = "copy(localStorage.getItem('SK_OAUTH_CRED_KEY')+','+localStorage.getItem('SK_TOKEN_CACHE_KEY'))"

// 联动干员ID列表
const COLLAB_OPERATOR_IDS = new Set([
  'char_197_poca', 'char_198_blackd', 'char_199_blitz', 'char_200_frost', 'char_201_moeshd',
  'char_276_blitz', 'char_277_tachak', 'char_278_ahorn',
  'char_4182_oblvns', 'char_4183_mortis', 'char_4186_tmoris', 'char_4184_dolris', 'char_4185_amoris'
])

const sklandImportDialog = ref(false)
const sklandInputText = ref('')
const sklandLoading = ref(false)
const sklandImportStep = ref(1) // 当前导入步骤
const sklandCred = ref('')
const sklandToken = ref('')
const playBindingList = ref([])
const currentBinding = ref(null)
const rawWarehouseData = ref(null)
const sklandUploading = ref(false)

// 获取限定干员列表
const limitedOperatorIds = computed(() => {
  const ids = new Set()
  for (const charId in operatorUpdateTime) {
    if (operatorUpdateTime[charId].obtainApproach === '限定干员') {
      ids.add(charId)
    }
  }
  return ids
})

// 检查用户是否登录
const isUserLoggedIn = computed(() => {
  return !!userInfo.value.token
})

function openLinkOnNewPage(url) {
  window.open(url)
}

function copyText(text) {
  copyTextToClipboard(text)
}

function getCredAndSecret(text) {
  text = text.replace(/\s+/g, '').replace(/["']/g, '')
  const textArr = text.split(',')
  const cred = textArr[0]
  const token = textArr[1]
  return { cred, token }
}

function openSklandImportDialog() {
  sklandImportDialog.value = true
  playBindingList.value = []
  sklandInputText.value = ''
  sklandImportStep.value = 1 // 重置步骤
}

async function getPlayerBindingBySkland() {
  if (!sklandInputText.value) {
    createMessage({ type: 'error', text: '请输入森空岛凭证' })
    return
  }
  
  sklandLoading.value = true
  try {
    const { cred, token } = getCredAndSecret(sklandInputText.value)
    sklandCred.value = cred
    sklandToken.value = token
    
    const playBinding = await SklandAPI.getPlayBindingV2('', '', cred, token)
    playBindingList.value = playBinding.bindingList
    
    if (playBinding.bindingList.length === 0) {
      createMessage({ type: 'warning', text: '未找到绑定的明日方舟账号' })
    }
  } catch (error) {
    console.error(error)
    createMessage({ type: 'error', text: '获取账号信息失败' })
  } finally {
    sklandLoading.value = false
  }
}

async function getPlayerDataAndSync(binding) {
  const { uid, nickName, channelName, channelMasterId } = binding
  
  sklandLoading.value = true
  createMessage({ type: 'info', text: '正在获取账号数据，请稍候...' })
  
  try {
    currentBinding.value = binding
    
    // 获取账号概览数据
    const data = await SklandAPI.getAccountOverviewData(
      uid,
      nickName,
      channelName,
      sklandCred.value,
      sklandToken.value
    )
    
    // 同时获取原始仓库数据用于上传
    const warehouseData = await SklandAPI.getWarehouseInfo(uid, sklandCred.value, sklandToken.value)
    warehouseData.channelName = channelName
    warehouseData.channelMasterId = channelMasterId
    warehouseData.nickName = nickName
    rawWarehouseData.value = warehouseData
    
    // 添加干员详细信息
    for (const operator of data.operatorDataList) {
      const charInfo = operatorTableV2[operator.charId]
      if (charInfo) {
        operator.name = charInfo.name
        operator.profession = charInfo.profession
        operator.skills = charInfo.skills || []
        operator.equip = charInfo.equip || []
        operator.isLimited = limitedOperatorIds.value.has(operator.charId)
        operator.isCollab = COLLAB_OPERATOR_IDS.has(operator.charId)
      }
    }
    
    // 排序干员
    data.operatorDataList.sort((a, b) => {
      if (b.rarity !== a.rarity) return b.rarity - a.rarity
      if (b.elite !== a.elite) return b.elite - a.elite
      return b.level - a.level
    })
    
    // 保存账号数据用于一图流显示
    sklandAccountData.value = {
      uid: uid,
      nickName: data.nickName,
      channelName: channelName,
      status: data.status,
      operatorDataList: data.operatorDataList,
      itemList: data.itemList || [],
      skins: data.skins || [],  // 时装数据
      charInfoMap: data.charInfoMap || {}  // 干员详情映射（包含skinId）
    }
    
    // 保存到sessionStorage
    sessionStorage.setItem('skland_account_data', JSON.stringify(sklandAccountData.value))
    
    createMessage({ type: 'success', text: '账号数据获取成功！' })
    
    // 如果用户已登录，自动同步到练度调查
    if (isUserLoggedIn.value) {
      sklandUploading.value = true
      try {
        await operatorDataAPI.importSkLandOperatorDataV3(rawWarehouseData.value)
        createMessage({ type: 'success', text: '干员数据已同步到练度调查！' })
        // 刷新干员数据
        getOperatorData()
      } catch (error) {
        console.error(error)
        createMessage({ type: 'error', text: '同步到练度调查失败' })
      } finally {
        sklandUploading.value = false
      }
    }
    
    // 关闭对话框并切换到账号一图流Tab
    sklandImportDialog.value = false
    displayTabHeader.value = '账号一图流'
    
  } catch (error) {
    console.error(error)
    createMessage({ type: 'error', text: '获取账号数据失败' })
  } finally {
    sklandLoading.value = false
  }
}



//后端返回的用户干员信息
let operatorList = ref([])  //干员列表
//前端筛选后的干员信息
let displayOperatorList = ref([])  //干员列表
let operatorIdAndIndexDict = ref({})

let operatorProgressionStatisticsMap = new Map()

let operatorProgressionStatistics = ref()

async function getCharStatisticsResult() {

  const data = await operatorProgressionStatisticsDataCache.getData();
  operatorProgressionStatistics.value = data
  let {result} = data

  for (const item of result) {
      operatorProgressionStatisticsMap.set(item.charId,item)
  }
}

function resultFormat(dividend, divisor) {
  if (dividend) {
    return formatNumber(dividend / divisor * 100, 1)
  } else {
    return 0
  }
}

getCharStatisticsResult()

let operatorsStatisticsDetail = ref({})

let operatorsStatisticsDetailDialog = ref(false)

const detailHeader = [
  {title: '查看项目', sortable: false},
  {title: '图标', sortable: false},
  {title: '等级一', sortable: false},
  {title: '等级二', sortable: false},
  {title: '等级三', sortable: false}
]



function openOperatorsStatisticsDetail(operator) {

  const {charId,elite,skill1,skill2,skill3,modX,modY,modD,modA} = operator

  if(!operatorProgressionStatisticsMap.get(charId)){
    return
  }

  const result = operatorProgressionStatisticsMap.get(charId)
  const {skill,equip} = result
  const data = []

  const playerSkillRankList = [skill1,skill2,skill3]

  for (let index = 0; index < 3; index++) {
    const info = skill[index]
    const playerSkillRank = playerSkillRankList[index]

    const ranks = result[`skill${index + 1}`]
    const item = {
      label: info.name,
      type: 'skill',
      iconId: info.iconId,
      ranks: [
        {
          highlight: playerSkillRank === 1,
          rate:formatNumber(ranks.rank1 * 100)
        },
        {
          highlight: playerSkillRank === 2,
          rate:formatNumber(ranks.rank2 * 100)
        },
        {
          highlight: playerSkillRank === 3,
          rate:formatNumber(ranks.rank3 * 100)
        }
      ]
    }
    data.push(item)
  }



  for (const info of equip) {
    const playerEquipRank = operator[`mod${info.typeName2}`]
    const ranks = result[`mod${info.typeName2}`]
    const item = {
      label: info.uniEquipName,
      type: 'equip',
      iconId: info.typeIcon,
      ranks: [
        {
          highlight: playerEquipRank === 1,
          rate:formatNumber(ranks.rank1 * 100)
        },
        {
          highlight: playerEquipRank === 2,
          rate:formatNumber(ranks.rank2 * 100)
        },
        {
          highlight: playerEquipRank === 3,
          rate:formatNumber(ranks.rank3 * 100)
        }
      ]
    }
    data.push(item)
  }

  operatorsStatisticsDetail.value = data
  operatorsStatisticsDetailDialog.value = true

}


function playProgressionHighlight(highlight){
  if(highlight){
    return 'highlight'
  }
}

/**
 * 找回填写过的角色信息
 */
function getOperatorData() {

  //根据一图流的token查询用户填写的干员数据
  operatorDataAPI.getOperatorData().then((response) => {
    let list = response.data; //后端返回的数据
    //转为前端的数据格式

    const operatorMap = {}
    for (const item of list) {
      operatorMap[item.charId] = item;
    }

    const tmpList = []
    for (const charId in operatorTable) {
      let formatData = deepClone(operatorTable[charId])

      let item = {}
      if (operatorMap[charId]) {
        item = operatorMap[charId]
      } else {
        item = {
          elite: 0,
          level: 0,
          mainSkill: 0,
          skill1: 0,
          skill2: 0,
          skill3: 0,
          modX: 0,
          modY: 0,
          own:false
        }
      }

      formatData.elite = item.elite;
      formatData.level = item.level;
      formatData.potential = item.potential;
      formatData.mainSkill = item.mainSkill;
      formatData.skill1 = item.skill1;
      formatData.skill2 = item.skill2;
      formatData.skill3 = item.skill3;
      formatData.modX = item.modX;
      formatData.modY = item.modY;
      formatData.modD = item.modD;
      formatData.own = item.own;
      formatData.modA = item.modA;

      tmpList.push(formatData)
      operatorIdAndIndexDict.value[charId] = operatorList.value.length - 1
    }

    operatorList.value = tmpList
    displayOperatorList.value = filterOperatorList(operatorList.value)
    createMessage({type:'success',text:"导入了 " + list.length + " 条数据"});

  });
}

/**
 * 筛选干员
 * @param func 筛选函数
 * @param index 传入筛选条件索引
 */
function addFilterConditionAndFilterOperator (func, index){
  func(index)
  displayOperatorList.value = filterOperatorList(operatorList.value)
}

/**
 * 根据按钮点击状态返回按钮样式
 * @param action 状态
 * @returns {string} 按钮样式
 */
function btnAction(action) {
  if (!action) {
    return "tonal"
  }
}


let operatorRecommendList = ref([]) //干员练度推荐列表


let introPopupVisible = ref(false) //网站教程弹窗显示状态

/**
 * 检查是否是第一次进入页面
 */
function checkFirstPopup() {
  introPopupVisible.value = !introPopupVisible.value
  localStorage.setItem("first_popup", "done");
}


/**
 * 导出评分表的excel
 */
function exportOperatorExcel() {
  let list = [[
    '干员名称', '是否已招募', '星级', '等级', '精英化等级', '潜能等级', '通用技能等级', '1技能专精等级',
    '2技能专精等级', '3技能专精等级', 'χ分支模组', 'γ分支模组', 'Δ分支模组', 'α分支模组'
  ]]
  for (const operator of operatorList.value) {
    const {name,own,rarity,level,elite,potential,mainSkill,skill1,skill2,skill3,modX,modY,modD,modA} = operator
    list.push([name,own,rarity,level,elite,potential,mainSkill,skill1,skill2,skill3,modX,modY,modD,modA])
  }

  console.log(list)

  exportExcel('干员练度表', list)
}


//上传APi返回的信息
let uploadMessage = ref({updateTime: "", affectedRows: 0, registered: false, userName: ''});
//每次点击操作记录下被更新的干员的索引，只上传被修改过的干员
let selectedCharId = ref({});

const router = useRouter()

/**
 * 手动上传
 */
const upload = debounce(() => {
  let uploadList = createUploadData();
  operatorDataAPI.uploadOperatorInfo(uploadList).then((response) => {
    uploadMessage.value = response.data;
    createMessage({type:'success',text:"保存成功"});
    selectedCharId.value = {};
  });
}, 5000)

let uploadFileName = ref("上传的文件名");

/**
 * 将需要上传的数据去除无用信息
 */
function createUploadData() {
  let uploadList = [];
  for (const charId in selectedCharId.value) {

    const index = operatorIdAndIndexDict.value[charId];

    const operator = operatorList.value[index];

    const data = {

      charId: operator.charId,
      own: operator.own,
      rarity: operator.rarity,
      elite: operator.elite,
      level: operator.level,
      potential: operator.potential,
      skill1: operator.skill1,
      skill2: operator.skill2,
      skill3: operator.skill3,
      modX: operator.modX,
      modY: operator.modY,
    };
    uploadList.push(data);
  }

  return uploadList;
}


let operatorPopupVisible = ref(false) //干员弹窗的显示状态
let operatorPopupData = ref({})   //干员弹窗内的干员数据

/**
 * 更新修改干员练度弹窗内的干员数据
 * @param {number} index 列表索引
 */
function updateOperatorPopup(index) {
  operatorPopupVisible.value = true;
  operatorPopupData.value = operatorList.value[index]
}

/**
 * 修改干员练度
 * @param {string} charId 干员id
 * @param {string} property 属性
 * @param {number} newValue 新值
 */
function updateOperatorData(charId, property, newValue) {
  operatorPopupData.value[property] = newValue
  // operatorTable.value[charId][property] = newValue
  selectedCharId.value[charId] = charId
}


/**
 * 返回干员的属性选项是否选中样式
 * @param {string} charId 干员id
 * @param {string} current 干员属性值
 * @param {string} property 干员属性名
 * @returns {string} class css样式
 */
function dataOptionClass(charId, current, property) {
  if (current === operatorPopupData.value[property]) {
    return 'is-selected'
  }

}


let sortProperty = ref({})

/**
 * 干员数组operator_list根据干员属性排序
 * @param {string} property 干员属性
 */
function sortOperatorList(property) {

  sortProperty.value[property] = !sortProperty.value[property]
  displayOperatorList.value.sort((a, b) => {
    if (sortProperty.value[property]) {
      return b[property] - a[property];
    } else {
      return a[property] - b[property];
    }
  });
}


/**
 * 控制干员练度推荐折叠栏的显示状态
 */
async function getOperatorRecommend() {
  operatorRecommendList.value = await operatorRecommend(operatorList.value,operatorProgressionStatistics.value)
}


function getAvatar(id) {
  return "bg-" + id;
}

function getSkillSprite(id) {
  return "bg-skill_icon_" + id;
}


const headers = [
  {title: '干员',key:"charId"},
  {title: '图标'},
  {title: '模组/技能名称'},
  {title: '当前等级'},
  {title: '一级占比'},
  {title: '二级占比'},
  {title: '三级占比'},
]

onMounted(() => {
  getOperatorData()
  
  // 读取sessionStorage中的完整账号数据（从森空岛导入时保存的）
  try {
    const savedAccountData = sessionStorage.getItem('skland_account_data')
    if (savedAccountData) {
      sklandAccountData.value = JSON.parse(savedAccountData)
    }
    
    // 检查是否需要切换到账号一图流Tab
    const switchToOverview = sessionStorage.getItem('skland_switch_to_overview')
    if (switchToOverview === 'true') {
      displayTabHeader.value = '账号一图流'
      sessionStorage.removeItem('skland_switch_to_overview')
    }
  } catch (e) {
    console.error('读取账号信息失败', e)
  }
});
</script>


<template>
  <div class="survey-operator-page">
    <v-card>
      <v-tabs
          v-model="displayTabHeader"
          bg-color="primary">
        <v-tab value="数据导入导出">数据导入导出</v-tab>
        <v-tab value="干员筛选">干员筛选</v-tab>

        <v-tab value="个人干员数据统计">
          个人干员数据统计
        </v-tab>
        <v-tab value="账号一图流">
          账号一图流
        </v-tab>
        <v-tab value="干员练度推荐"
               @click="getOperatorRecommend()">
          干员练度推荐
        </v-tab>
      </v-tabs>

        <v-tabs-window v-model="displayTabHeader">
          <v-tabs-window-item value="干员筛选">
            <div class="flex flex-wrap" v-for="(conditions,module) in operatorFilterCondition" :key="module">
              <v-btn variant="text" class="m-4">{{ conditions.label }}</v-btn>
              <v-btn color="primary" :variant="btnAction(condition.action)"
                     class="m-4" rounded="x-large"
                     v-for="(condition,index) in conditions.conditions" :key="index"
                     @click="addFilterConditionAndFilterOperator(conditions.actionFunc,index)">
                {{ condition.label }}
              </v-btn>
            </div>
            <!--            <pre>-->
            <!--              {{operatorFilterCondition}}-->
            <!--            </pre>-->
            <div class="checkbox">
              <v-btn variant="text" class="checkbox-label">排序</v-btn>
              <v-btn color="primary" variant="tonal"
                     @click="sortOperatorList('updateTime')"
                     class="m-4">
                按实装顺序
              </v-btn>
            </div>
          </v-tabs-window-item>

          <v-tabs-window-item value="数据导入导出" >
            <div class="import-export-section">
              <v-chip color="red" text="导入之前请先登录" class="mb-4"></v-chip>
              <div class="flex flex-wrap gap-2">
                <v-btn color="primary" @click="openSklandImportDialog()">
                  <v-icon>mdi-cloud-download</v-icon>
                  从森空岛导入
                </v-btn>
                <v-btn color="primary" variant="outlined" @click="exportOperatorExcel()">
                  <v-icon>mdi-file-excel</v-icon>
                  导出为Excel
                </v-btn>
              </div>
              
              <v-alert v-if="sklandAccountData" type="success" variant="tonal" class="mt-4">
                <div class="flex justify-between items-center">
                  <span>已导入账号：{{ sklandAccountData.nickName }} (UID: {{ sklandAccountData.uid }})</span>
                  <v-btn size="small" color="primary" @click="displayTabHeader = '账号一图流'">
                    查看一图流
                  </v-btn>
                </div>
              </v-alert>
            </div>
          </v-tabs-window-item>

          <v-tabs-window-item value="个人干员数据统计" v-loading>
            <OperatorStatisticalTable v-model="operatorList"></OperatorStatisticalTable>
          </v-tabs-window-item>

          <v-tabs-window-item value="账号一图流">
            <AccountOverviewPanel 
              ref="accountOverviewPanelRef"
              :operator-list="operatorList"
              :skland-account-data="sklandAccountData"
            />
          </v-tabs-window-item>

          <v-tabs-window-item value="干员练度推荐" v-loading>
            <v-data-table :headers="headers" :items="operatorRecommendList" hide-default-footer
            items-per-page="-1" class="operator-recommend-table" >
              <template v-slot:item="{ item }">
                 <tr>
                   <td>
                     <OperatorAvatar :size="50" :mobile-size="50" :border="true" :char-id="item.charId"></OperatorAvatar>
                   </td>
                   <td>
                     <SkillIcon :icon="item.info.iconId" size="40" mobile-size="40" v-show="item.info.type==='skill'">
                     </SkillIcon>
                     <div class="operator-equip-group" v-show="item.info.type==='equip'">
                       <div class="operator-equip">
                         <EquipIcon :icon="item.info.iconId" mobile-size="30" size="30" class="block m-a" ></EquipIcon>
                         <div class="equip-name">{{ item.info.iconId }}</div>
                       </div>
                     </div>
                   </td>
                   <td>
                     {{item.info.name}}
                   </td>
                   <td>
                     {{item.current}}级
                   </td>
<!--                   <td>-->
<!--                    {{formatNumber(item.avg,2)}}级-->
<!--                   </td>-->
                   <td v-for="rank in item.ranks">
                     {{formatNumber(rank*100,2)}}%
                   </td>
                 </tr>
              </template>
            </v-data-table>

          </v-tabs-window-item>
        </v-tabs-window>


    </v-card>



    <p>点击干员卡片可查看当前干员的练度统计结果</p>
    <!--   干员表单-->
    <div class="operator-form">
      <OperatorBar @click="openOperatorsStatisticsDetail(operator)" v-for="(operator, charId) in displayOperatorList"  :operator-info="operator"></OperatorBar>
    </div>



    <v-dialog v-model="operatorsStatisticsDetailDialog" max-width="500">
      <v-card title="干员练度统计结果" subtitle="蓝色高亮为博士当前练度">
        <v-card-text>
          <v-data-table
              :headers="detailHeader"
              :items="operatorsStatisticsDetail"
              hide-default-footer
              items-per-page="-1">
            <template v-slot:item="{ item }">
              <tr>
                <td>{{item.label}}</td>
                <td>
                  <EquipIcon :icon="item.iconId"  :size="36"  v-show="item.type==='equip'"></EquipIcon>
                  <SkillIcon size="40" :mobile-size="30" :border="true" :icon="`${item.iconId}`" v-show="item.type==='skill'"></SkillIcon>
                </td>
                <td v-for="rank in item.ranks" >
                  <div :class="playProgressionHighlight(rank.highlight)" class="p-8">
                    {{rank.rate}}%
                  </div>
                </td>
              </tr>
            </template>
          </v-data-table>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- 森空岛导入对话框 -->
    <v-dialog v-model="sklandImportDialog" max-width="800" persistent>
      <v-card>
        <v-card-title class="d-flex justify-space-between align-center">
          <span>从森空岛导入数据</span>
          <v-btn icon variant="text" @click="sklandImportDialog = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-card-text>
          <v-stepper v-model="sklandImportStep" :items="['登录森空岛', '获取凭证', '选择账号']" alt-labels editable>
            <template v-slot:item.1>
              <v-card flat>
                <v-card-text class="text-center">
                  <p class="mb-4">首先登录森空岛网站</p>
                  <v-btn color="primary" @click="openLinkOnNewPage(SKLAND_LINK)">
                    <v-icon>mdi-open-in-new</v-icon>
                    打开森空岛官网
                  </v-btn>
                  <v-alert :icon="false" color="primary" variant="tonal" class="mt-4">
                    此导入方式仅适合电脑，Windows系统建议使用Microsoft Edge浏览器，iOS系统建议使用Safari浏览器
                  </v-alert>
                </v-card-text>
              </v-card>
            </template>
            
            <template v-slot:item.2>
              <v-card flat>
                <v-card-text>
                  <p>登录后按键盘F12调出开发者工具，在下方选择控制台(console)，输入以下命令：</p>
                  <v-alert :icon="false" color="primary" variant="tonal" class="my-4">
                    <code style="word-break: break-all;">{{ CONSOLE_CODE }}</code>
                  </v-alert>
                  <div class="text-center">
                    <v-btn color="primary" @click="copyText(CONSOLE_CODE)">
                      <v-icon>mdi-content-copy</v-icon>
                      点击复制命令
                    </v-btn>
                  </div>
                  <p class="text-center mt-2 text-caption">执行后凭证会自动复制到剪贴板</p>
                </v-card-text>
              </v-card>
            </template>
            
            <template v-slot:item.3>
              <v-card flat>
                <v-card-text>
                  <p class="mb-4">将获取的字符串粘贴到下面的输入框中</p>
                  <v-text-field 
                    v-model="sklandInputText"
                    label="粘贴凭证字符串"
                    variant="outlined"
                    density="compact"
                    hide-details
                    class="mb-4"
                  ></v-text-field>
                  <v-btn 
                    color="primary" 
                    @click="getPlayerBindingBySkland" 
                    :loading="sklandLoading"
                    block
                  >
                    获取账号列表
                  </v-btn>
                  
                  <div v-if="playBindingList.length > 0" class="mt-4">
                    <p class="mb-2">选择要导入的账号：</p>
                    <v-btn 
                      v-for="(binding, index) in playBindingList" 
                      :key="index"
                      color="success"
                      variant="tonal"
                      block
                      class="mb-2 text-left"
                      style="height: auto; padding: 12px;"
                      @click="getPlayerDataAndSync(binding)"
                      :loading="sklandLoading"
                    >
                      <div style="width: 100%;">
                        <div class="font-weight-bold">{{ binding.nickName }}</div>
                        <div class="text-caption">区服：{{ binding.channelName }} | UID: {{ binding.uid }}</div>
                      </div>
                    </v-btn>
                  </div>
                </v-card-text>
              </v-card>
            </template>
          </v-stepper>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- 数据声明 -->
    <!-- <div class="char_card">此处安放版权声明/开发信息</div> -->
    <div class="footer_info">
      除非另有声明，网站其他内容采用
      <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/">知识共享署名-非商业性使用-相同方式共享</a>授权。
    </div>
  </div>
</template>


