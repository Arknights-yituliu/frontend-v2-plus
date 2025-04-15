<script setup>
import {createMessage} from "/src/utils/message.js";
import operatorDataAPI from "/src/api/operatorData.js"
import {onMounted, ref} from "vue";
import {operatorRecommend} from "/src/utils/survey/operatorRecommend";
import {operatorTable} from "/src/utils/gameData.js";
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
import operatorProgressionStatisticsDataCache from "@/utils/indexedDB/operatorProgressionStatisticsData.js";
import {dateFormat} from "@/utils/dateUtil.js";

let RANK_TABLE = ref([0, 1, 2, 3, 4, 5, 6]);  //等级


let displayTabHeader = ref('数据导入导出')



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



function openOperatorsStatisticsDetail(charId) {
console.log(operatorProgressionStatisticsMap.get(charId))
  if(!operatorProgressionStatisticsMap.get(charId)){
    return
  }

  const operator = operatorProgressionStatisticsMap.get(charId)
  const {skill,equip} = operator
  const data = []

  for (let index = 0; index < 3; index++) {
    const info = skill[index]
    const num = index + 1
    const ranks = operator[`skill${num}`]
    const item = {
      label: info.name,
      type: 'skill',
      iconId: info.iconId,
      ranks: [
        formatNumber(ranks.rank1 * 100),
        formatNumber(ranks.rank2 * 100),
        formatNumber(ranks.rank3 * 100)
      ]
    }
    data.push(item)
  }



  for (const info of equip) {
    const ranks = operator[`mod${info.typeName2}`]
    const item = {
      label: info.uniEquipName,
      type: 'equip',
      iconId: info.typeIcon,
      ranks: [
        formatNumber(ranks.rank1 * 100),
        formatNumber(ranks.rank2 * 100),
        formatNumber(ranks.rank3 * 100)
      ]
    }
    data.push(item)
  }

  operatorsStatisticsDetail.value = data
  operatorsStatisticsDetailDialog.value = true

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

function importDataBySkland() {
  router.push({name: 'IMPORT_BY_SKLAND'})
}

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
  {title: '推荐技能or模组'},
  {title: '当前等级'},
  {title: '平均等级'},
  {title: '三级占比'},
]

onMounted(() => {

  getOperatorData()
});
</script>


<template>
  <div class="survey-operator-page survey-common">
    <v-card>
      <v-tabs
          v-model="displayTabHeader"
          bg-color="primary">
        <v-tab value="数据导入导出">数据导入导出</v-tab>
        <v-tab value="干员筛选">干员筛选</v-tab>

        <v-tab value="个人干员数据统计">
          个人干员数据统计
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
            <v-chip color="red" text="导入之前请先登录"></v-chip>
            <v-btn color="primary" class="m-4" @click="importDataBySkland()">
              从森空岛导入
            </v-btn>
            <v-btn color="primary" class="m-4" @click="exportOperatorExcel()">
              导出为Excel
            </v-btn>
          </v-tabs-window-item>

          <v-tabs-window-item value="个人干员数据统计" v-loading>
            <OperatorStatisticalTable v-model="operatorList"></OperatorStatisticalTable>
          </v-tabs-window-item>


          <v-tabs-window-item value="干员练度推荐" v-loading>
            <v-data-table :headers="headers" :items="operatorRecommendList" hide-default-footer
            items-per-page="-1" class="operator-recommend-table">
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
                         <EquipIcon :icon="item.info.iconId" mobile-size="22" size="22" class="equip-icon" ></EquipIcon>
                         <div class="equip-name">{{ item.info.iconId }}</div>
                       </div>
                     </div>
                   </td>
                   <td>
                     {{item.current}}级
                   </td>
                   <td>
                    {{formatNumber(item.avg,2)}}级
                   </td>
                   <td>
                     {{formatNumber(item.ratio*100,2)}}%
                   </td>
                 </tr>
              </template>
            </v-data-table>

          </v-tabs-window-item>
        </v-tabs-window>


    </v-card>




    <!--   干员表单-->
    <div class="operator-form">

      <OperatorBar @click="openOperatorsStatisticsDetail(operator.charId)" v-for="(operator, charId) in displayOperatorList"  :operator-info="operator"></OperatorBar>

    </div>


    <v-dialog v-model="operatorsStatisticsDetailDialog" max-width="500">
      <v-card title="干员练度统计结果">
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
                <td v-for="rank in item.ranks">
                  {{rank}}%
                </td>
              </tr>
            </template>
          </v-data-table>
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


