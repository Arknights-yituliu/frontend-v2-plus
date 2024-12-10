<script setup>
import {cMessage} from "/src/utils/message.js";
import {filterByCharacterProperty, professionDict, yearDict} from "/src/utils/survey/common.js"; //基础信息（干员基础信息列表，干员职业字典，干员星级）
import operatorStatistical from "/src/utils/survey/operatorStatistical"
import userAPI from "/src/api/userInfo";
import operatorDataAPI from "/src/api/operatorData.js"
import {onMounted, ref} from "vue";
import operatorRecommend from "/src/utils/survey/operatorRecommend";
import CHARACTER_TABLE from '/src/static/json/survey/character_table_simple.json'
import {exportExcel} from '/src/utils/exportExcel.js'

import "/src/assets/css/survey/operator.scss";
import "/src/assets/css/survey/operator.phone.scss";
import {debounce} from "/src/utils/debounce";
import {getUserInfo} from "/src/utils/survey/userInfo.js";
import {useRouter} from "vue-router";
import {operatorFilterCondition, filterOperatorList} from "@/utils/survey/operatorFilter.js";

import OperatorStatisticalTable from "/src/components/OperatorStatisticalTable.vue";

let RANK_TABLE = ref([0, 1, 2, 3, 4, 5, 6]);  //等级



let displayTabHeader = ref('干员筛选')

//用户信息
let userData = ref({uid: 0, userName: "未登录", akUid: "0", status: -100, token: void 0});

/**
 * 获取本地缓存的用户信息
 */
async function getUserInfoAndOperatorData() {
  userData.value = await getUserInfo()
  getOperatorData()
}


let operatorTable = ref(CHARACTER_TABLE);
//后端返回的用户干员信息
let operatorList = ref([])  //干员列表
//前端筛选后的干员信息
let displayOperatorList = ref([])  //干员列表
let operatorIdAndIndexDict = ref({})
//干员统计信息
let statisticalResultV2 = ref({})
/**
 * 找回填写过的角色信息
 */
function getOperatorData() {
  //检查是否登录
  if (checkUserStatus(false)) {
    console.log("未登录")
    return;
  }

  const data = {token: userData.value.token}

  //根据一图流的token查询用户填写的干员数据
  operatorDataAPI.getOperatorData(data).then((response) => {
    let list = response.data; //后端返回的数据
    //转为前端的数据格式
    operatorList.value = []
    for (const item of list) {
      const charId = item.charId;
      if(CHARACTER_TABLE[charId]){
        let formatData = CHARACTER_TABLE[charId]
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
        operatorList.value.push(formatData)
        operatorIdAndIndexDict.value[charId] = operatorList.value.length-1
      }
    }
    displayOperatorList.value = filterOperatorList(operatorList.value)
    cMessage("导入了 " + list.length + " 条数据");
    statisticalResultV2.value = operatorStatistical.operatorStatisticalV2(operatorTable.value)
  });
}

/**
 * 筛选干员
 * @param func 筛选函数
 * @param index 传入筛选条件索引
 */
const addFilterConditionAndFilterOperator = debounce((func, index) => {
  func(index)
  displayOperatorList.value = filterOperatorList(operatorList.value)
  console.log(displayOperatorList.value)
}, 500)

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
    '2技能专精等级', '3技能专精等级', 'X模组等级', 'Y模组等级', 'D模组等级'
  ]]
  for (const charId in operatorTable.value) {
    const operator = operatorTable.value[charId]
    list.push([
      operator.name,
      operator.own,
      operator.rarity,
      operator.level,
      operator.elite,
      operator.potential,
      operator.mainSkill,
      operator.skill1,
      operator.skill2,
      operator.skill3,
      operator.modX,
      operator.modY,
      operator.modD,
    ])
  }


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
  userAPI.uploadCharacter(uploadList, userData.value.token).then((response) => {
    uploadMessage.value = response.data;
    cMessage("保存成功");
    selectedCharId.value = {};
  });
}, 5000)

let uploadFileName = ref("上传的文件名");

/**
 * 将需要上传的数据去除无用信息
 */
function createUploadData() {
  let uploadList = [];
  for (const sCharId in selectedCharId.value) {
    const operator = {
      charId: operatorTable.value[sCharId].charId,
      own: operatorTable.value[sCharId].own,
      rarity: operatorTable.value[sCharId].rarity,
      elite: operatorTable.value[sCharId].elite,
      level: operatorTable.value[sCharId].level,
      potential: operatorTable.value[sCharId].potential,
      skill1: operatorTable.value[sCharId].skill1,
      skill2: operatorTable.value[sCharId].skill2,
      skill3: operatorTable.value[sCharId].skill3,
      modX: operatorTable.value[sCharId].modX,
      modY: operatorTable.value[sCharId].modY,
    };
    uploadList.push(operator);
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
  operatorTable.value[charId][property] = newValue
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
  operatorRecommendList.value = await operatorRecommend.operatorRecommend(operatorTable.value)
}








function getAvatar(id) {
  return "bg-" + id;
}

function getSkillSprite(id) {
  return "bg-skill_icon_" + id;
}




/**
 * 检查用户状态
 * @param notice 是否弹出提示
 * @returns {boolean} 状态
 */
function checkUserStatus(notice) {
  if (!userData.value.token) {
    if (notice) {
      cMessage('请先注册或登录一图流账号', 'error')
    }
    return true;
  }
  return false
}

onMounted(() => {

  getUserInfoAndOperatorData()
});
</script>


<template>
  <div class="survey-operator-page survey-common">
    <v-card style="width: 96%;margin: 0 auto">
      <v-tabs
          v-model="displayTabHeader"
          bg-color="primary" >
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
      <v-card-text>
        <v-tabs-window v-model="displayTabHeader">
          <v-tabs-window-item value="干员筛选">
            <div class="checkbox" v-for="(conditions,module) in operatorFilterCondition" :key="module">
              <v-btn variant="text" class="checkbox-label">{{ conditions.label }}</v-btn>
              <v-btn color="primary" :variant="btnAction(condition.action)"
                     class="checkbox-button" rounded="x-large"
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
              <v-btn type="primary"
                     @click="sortOperatorList('rarity')">
                按稀有度
              </v-btn>
              <v-btn type="primary"
                     @click="sortOperatorList('date')">
                按实装顺序
              </v-btn>
            </div>
          </v-tabs-window-item>

          <v-tabs-window-item value="数据导入导出">
            <v-btn color="primary" class="checkbox-button" @click="importDataBySkland()">
              从森空岛导入
            </v-btn>
            <v-btn color="primary" class="checkbox-button" @click="exportOperatorExcel()">
              导出为Excel
            </v-btn>
          </v-tabs-window-item>

          <v-tabs-window-item value="个人干员数据统计" v-loading>
            <OperatorStatisticalTable v-model="statisticalResultV2"></OperatorStatisticalTable>
          </v-tabs-window-item>


          <v-tabs-window-item value="干员练度推荐" v-loading>
            <div class="operator-recommend-popup-container operator-recommend-avatar-variables">
              <div class="operator-recommend-card-wrap">
                <div class="operator-recommend-card"
                     v-for="(recommend,index) in operatorRecommendList" :key="index">
                  <div class="operator-avatar-wrap">
                    <div class="operator-avatar">
                      <div :class="getAvatar(recommend.charId)"></div>
                    </div>
                    <span class="operator-name">{{ recommend.name }}</span>
                  </div>

                  <div class="operator-skill-icon-item"
                       v-show="recommend.info.type==='skill'">
                    <div class="operator-skill-icon-sprite">
                      <div :class="getSkillSprite(recommend.info.iconId)"></div>
                    </div>
                    <!--              <div class="skill-name">{{ recommend.info.name }}</div>-->
                  </div>
                  <div v-show="recommend.info.type==='equip'" class="operator-equip-image-wrap">
                    <img :src="`/image/survey/mod-icon/${recommend.info.iconId}.png`" alt=""
                         class="operator-equip-image">
                    <div class="equip-name">{{ recommend.info.iconId }}</div>
                  </div>

                  <div class="recommend-text">
                    {{ `平均等级为${recommend.avg.toFixed(2)}级` }} <br>
                    {{ `3级占比为${(recommend.ratio * 100).toFixed(2)}%` }}
                  </div>

                </div>
              </div>
            </div>
          </v-tabs-window-item>
        </v-tabs-window>
      </v-card-text>

    </v-card>

    <!--    <c-popup :visible="resetPopupVisible" v-model:visible="resetPopupVisible">-->
    <!--      <div class="popup_action_tip">-->
    <!--        此操作将清空一图流账号上保存的所有干员数据，确定要执行操作吗？-->
    <!--      </div>-->
    <!--      <div class="control-checkbox">-->
    <!--        <div class="btn btn-red" @click="operatorDataReset()">确定</div>-->
    <!--        <div style="width: 80px;height: 50px"></div>-->
    <!--        <div class="btn" @click="resetPopupVisible = !resetPopupVisible">取消</div>-->
    <!--      </div>-->
    <!--    </c-popup>-->


    <!--   干员表单-->
    <div class="operator-form">
      <v-card class="operator-card" v-for="(operator, charId) in displayOperatorList" :key="charId"
              @click="updateOperatorPopup(charId)">
        <div class="operator-avatar-wrap">
          <div class="operator-avatar">
            <div :class="getAvatar(operator.charId)"></div>
          </div>
          <span class="operator-name">{{ operator.name }}</span>
        </div>
        <div>
          <img :src="`/image/survey/rank/elite${operator.elite}.png`" class="operator-elite-image" alt="">
          <div class="operator-level-image">
            {{ operator.level }}
          </div>
        </div>

        <div class="operator-skill-icon-item" v-for="(skill,index) in operator.skill" :key="index">
          <div class="operator-skill-icon-sprite">
            <div :class="getSkillSprite(skill.iconId)"></div>
            <img :src="`/image/survey/skill-rank-${operator[`skill${index+1}`]}.jpg`"
                 v-show="operator[`skill${index+1}`]>0" class="operator-skill-rank" alt="">
          </div>
          <!--          <div class="skill-name">{{ skill.name }}</div>-->
        </div>

        <div class="operator-equip-image-wrap" v-for="(equip,index) in operator.equip" :key="index">
          <div class="operator-skill-icon-sprite">
            <img :src="`/image/survey/mod-icon/${equip.typeIcon}.png`" alt="" class="operator-equip-image">
            <img :src="`/image/survey/skill-rank-${operator[`mod${equip.typeName2}`]}.jpg`"
                 v-show="operator[`mod${equip.typeName2}`]>0" class="operator-skill-rank">
          </div>
          <div class="equip-name">{{ `${equip.typeName1}-${equip.typeName2}` }}</div>
        </div>

      </v-card>
    </div>


    <!--    <div class="opr-loading-btn" @click="loadCompleteData()">加载所有干员</div>-->

    <c-popup v-model="operatorPopupVisible">

      <div class="updateOperatorPopup">
        <div class="operator-own-switch-wrap">
          <div class="operator-avatar" style="margin: 0 4px">
            <div :class="getAvatar(operatorPopupData.charId)"></div>
          </div>
          <span>是否持有</span>
          <el-switch v-model="operatorPopupData.own">
          </el-switch>
        </div>
        <div class="operator-rank-checkbox">
          <div class="operator-equip-image-wrap">
            <img :src="`/image/survey/rank/elite${operatorPopupData.elite}.png`" class="operator-equip-image" alt="">
          </div>
          <div class="operator-rank-checkbox-button-group">
            <div v-for="rank in RANK_TABLE.slice(0,3)" :key="rank"
                 @click="updateOperatorData(operatorPopupData.charId,`elite`,rank)"
                 class="operator-rank-checkbox-button"
                 :class="dataOptionClass(operatorPopupData.charId,rank,`elite`)">
              <img :src="`/image/survey/rank/elite${rank}.png`"
                   class="operator-rank-checkbox-button-icon" alt="">
              <!--              <div :class="getOptionEliteSprite(`elite${rank}`)"></div>-->
            </div>
          </div>
        </div>

        <div class="operator-rank-checkbox" v-for="(skill,index) in operatorPopupData.skill" :key="index">
          <div class="operator-skill-icon-item"
               @click="updateOperatorData(operatorPopupData.charId,`skill${index+1}`,0)">
            <div class="operator-skill-icon-sprite">
              <div :class="getSkillSprite(skill.iconId)"></div>
              <img :src="`/image/survey/skill-rank-${operatorPopupData[`skill${index+1}`]}.jpg`"
                   v-show="operatorPopupData[`skill${index+1}`]>0" class="operator-skill-rank" alt="">
            </div>
          </div>

          <div class="operator-rank-checkbox-button-group">
            <div v-for="rank in RANK_TABLE.slice(1,4)" :key="rank"
                 class="operator-rank-checkbox-button"
                 @click="updateOperatorData(operatorPopupData.charId,`skill${index+1}`,rank)"
                 :class="dataOptionClass(operatorPopupData.charId,rank,`skill${index+1}`)">
              <img :src="`/image/survey/rank/skill-rank-${rank}.png`" class="operator-rank-checkbox-button-icon"
                   alt=""/>
            </div>
          </div>
        </div>

        <div class="operator-rank-checkbox"
             v-for="(equip,index) in operatorPopupData.equip" :key="index">
          <div class="operator-equip-image-wrap"
               @click="updateOperatorData(operatorPopupData.charId,`mod${equip.typeName2}`,0)">
            <img :src="`/image/survey/mod-icon/${equip.typeIcon}.png`" alt="" class="operator-equip-image">
            <img :src="`/image/survey/skill-rank-${operatorPopupData[`mod${equip.typeName2}`]}.jpg`"
                 v-show="operatorPopupData[`mod${equip.typeName2}`]>0" class="operator-equip-rank">
            <div class="equip-name">{{ `${equip.typeName1}-${equip.typeName2}` }}</div>
          </div>

          <div class="operator-rank-checkbox-button-group">
            <button v-for="rank in RANK_TABLE.slice(1,4)" :key="rank"
                    class="operator-rank-checkbox-button"
                    @click="updateOperatorData(operatorPopupData.charId,`mod${equip.typeName2}`,rank)"
                    :class="dataOptionClass(operatorPopupData.charId,rank,`mod${equip.typeName2}`)">
              <img :src="`/image/survey/rank/mod-rank-${rank}.png`" class="operator-rank-checkbox-button-icon" alt=""/>
            </button>
          </div>

        </div>
      </div>
    </c-popup>

    <!-- 数据声明 -->
    <!-- <div class="char_card">此处安放版权声明/开发信息</div> -->
    <div class="footer_info">
      除非另有声明，网站其他内容采用
      <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/">知识共享署名-非商业性使用-相同方式共享</a>授权。
    </div>
  </div>
</template>


<style scoped>


.dev_table td {
  border: 1px solid black;
  padding: 8px
}


.web_url {
  padding: 0 8px 0 8px;
  color: dodgerblue;
  cursor: pointer;
}


.control_input {
  margin: 2px 12px;
  height: 20px;
  line-height: 20px;
  width: 230px;
  border: none;
  outline: none;
  color: var(--c-input-text-color);
  border-bottom: var(--c-input-border);
  background-color: var(--c-input-bg);
}

.control_input:hover {
  border-bottom: solid rgb(105, 157, 239) 2px;
}

.import_tip_image {
  width: 400px;
  display: inline-block;
  margin: auto;
  box-shadow: 2px 2px 8px rgba(0, 0, 0, 0.3);
}


.not-own-operator-box {
  display: flex;
  flex-wrap: wrap;
  margin: auto;
  width: fit-content;
  max-height: 300px;
  overflow: auto;
}


.control_operator_card {
  width: 500px;
  display: block;
  text-align: center;
  font-size: 20px;
  font-weight: 600;
}


</style>