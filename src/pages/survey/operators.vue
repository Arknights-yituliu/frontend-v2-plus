<script setup>
import {cMessage} from "/src/utils/Message.js";
import {filterByCharacterProperty, professionDict, yearDict} from "./service/common"; //基础信息（干员基础信息列表，干员职业字典，干员星级）
import operatorStatistical from "/src/pages/survey/service/operatorStatistical"
import userAPI from "/src/api/userInfo";
import operatorDataAPI from "/src/api/operatorData.js"
import sklandApi from '/src/pages/survey/service/skland'
import {onMounted, ref} from "vue";
import operatorRecommend from "/src/pages/survey/service/operatorRecommend";
import characterTable from '/src/static/json/survey/character_table_simple.json'
import {exportExcel} from '/src/utils/ExportExcel.js'

import "/src/assets/css/survey/operator.scss";
import "/src/assets/css/survey/operator.phone.scss";
import {debounce} from "/src/utils/Debounce";
import {getUserInfo} from "/src/pages/survey/service/userInfo.js";
import {useRouter} from "vue-router";

import MyButton from '/src/components/Button.vue'
import OperatorStatisticalTable from "../../components/OperatorStatisticalTable.vue";

let RANK_TABLE = ref([0, 1, 2, 3, 4, 5, 6]);  //等级
let RARITY_TABLE = [1, 2, 3, 4, 5, 6];  //星级
let itemObtainApproachType = ['常驻干员', '赠送干员', '限定干员']

let userData = ref({uid: 0, userName: "未登录", akUid: "0", status: -100, token: void 0});  //用户信息

/**
 * 获取本地缓存的用户信息
 */
async function getUserInfoAndOperatorData() {

  userData.value = await getUserInfo()
  getOperatorData()
}

let headerTag = ref('干员筛选')

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


let introPopupVisible = ref(false) //网站教程弹窗显示状态

/**
 * 检查是否是第一次进入页面
 */
function checkFirstPopup() {
  introPopupVisible.value = !introPopupVisible.value
  localStorage.setItem("first_popup", "done");
}


let operatorTable = ref(characterTable);
let operatorList = ref([])  //干员列表

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
    let obj = {}
    operatorTable.value = characterTable
    //转为前端的数据格式
    for (const item of list) {
      const sCharId = item.charId;
      obj[sCharId] = item
      if (operatorTable.value[sCharId]) {
        operatorTable.value[sCharId].elite = item.elite;
        operatorTable.value[sCharId].level = item.level;
        operatorTable.value[sCharId].potential = item.potential;
        operatorTable.value[sCharId].mainSkill = item.mainSkill;
        operatorTable.value[sCharId].skill1 = item.skill1;
        operatorTable.value[sCharId].skill2 = item.skill2;
        operatorTable.value[sCharId].skill3 = item.skill3;
        operatorTable.value[sCharId].modX = item.modX;
        operatorTable.value[sCharId].modY = item.modY;
        operatorTable.value[sCharId].modD = item.modD;
        operatorTable.value[sCharId].own = item.own;
      }
    }
    //转为前端的数据格式
    // loadDisplayData()
    cMessage("导入了 " + list.length + " 条数据");
    statisticalResultV2.value = operatorStatistical.operatorStatisticalV2(operatorTable.value)
  });
}


function sleep(time) {
  return new Promise((resolve) => setTimeout(resolve, time))
}


function importData() {
  operatorList.value = []
  for (const charId in operatorTable.value) {
    const operator = operatorTable.value[charId]
    if (operator.show) {
      operatorList.value.push(operator)
    }
  }
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


let importPopupVisible = ref(false)  //导入教程弹窗显示状态
let SKlandCREDAndSECRET = ref("");  //森空岛cred
let bindAccount = ref(false) //玩家uid是否绑定了一图流账号
let bindingList = ref([])  //绑定列表
let currentUid = ref('')  //默认uid
let importFlag = ref(false) //是否导入
let collapseImportVisible = ref(true) //导入折叠栏显示状态

//控制导入折叠栏关闭展开
function collapseImport() {
  collapseImportVisible.value = !collapseImportVisible.value
}


let resetPopupVisible = ref(false) //重置账号提示弹窗显示状态

/**
 * 重置账号数据
 */
function operatorDataReset() {
  let data = {
    token: userData.value.token,
  }
  operatorDataAPI.resetOperatorData(data).then(response => {
    cMessage(response.data)
  })
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


/**
 * 返回筛选按钮是否选中的样式
 * @param {string} property 干员属性名
 * @param {string|number|boolean} rule 筛选规则
 * @returns {boolean} class 按钮样式
 */
function selectedBtn(property, rule) {
  if (filterCondition.value[property].indexOf(rule) > -1) {
    return "primary"
  }
  return "secondary"

}

let collapseImportFilter = ref(false)  //干员筛选条件折叠栏的展开状态

let filterCondition = ref({   //干员筛选条件
  rarity: [6],
  profession: [],
  year: [],
  own: [true],
  equip: [],
  itemObtainApproach: [],
  TODO: []
});

/**
 * 控制干员筛选条件折叠栏展开状态
 */
function collapseFilter() {
  collapseImportFilter.value = !collapseImportFilter.value
}

/**
 *  增加筛选规则
 * @param {string} property  干员属性
 * @param {string|number|boolean} condition 筛选条件
 */
function addFilterCondition(property, condition) {

  console.log(filterCondition.value);
  if (filterCondition.value[property].indexOf(condition) > -1) {
    filterCondition.value[property] = filterCondition.value[property].filter(e => e !== condition)
    filterCharacterList();
    return;
  }

  filterCondition.value[property].push(condition);
  filterCharacterList();
}


/**
 * 过滤干员列表
 */
function filterCharacterList() {
  operatorList.value = []
  for (let charId in operatorTable.value) {
    const operator = operatorTable.value[charId];
    const show = filterByCharacterProperty(filterCondition.value, operator);
    operatorTable.value[charId].show = show;

    if (show) {
      operatorList.value.push(operator)
    }
  }
}


let sortProperty = ref({})

/**
 * 干员数组operator_list根据干员属性排序
 * @param {string} property 干员属性
 */
function sortOperatorList(property) {

  sortProperty.value[property] = !sortProperty.value[property]
  operatorList.value.sort((a, b) => {
    if (sortProperty.value[property]) {
      return a[property] - b[property];
    } else {
      return b[property] - a[property];
    }
  });
}

function sortOperatorListByLevel(property) {
  sortProperty.value[property] = !sortProperty.value[property]
  operatorList.value.sort((a, b) => {
    let difference = 0;
    if (a.elite !== b.elite) {
      difference = b.elite - a.elite
    } else {
      difference = b.level - a.level
    }
    return sortProperty.value[property] ? difference : -difference;
  });
}

function openStatisticalPopup() {
  statisticalPopupVisible.value = !statisticalPopupVisible.value
}

let statisticalPopupVisible = ref(false)
let statisticalResultV2 = ref({})


let collapseRecommendVisible = ref(false)  //干员练度推荐折叠栏的显示状态
let operatorRecommendList = ref([]) //干员练度推荐列表
let recommendPopupVisible = ref(false);


/**
 * 控制干员练度推荐折叠栏的显示状态
 */
async function getOperatorRecommend() {
  operatorRecommendList.value = await operatorRecommend.operatorRecommend(operatorTable.value)

  setTimeout(function () {
    recommendPopupVisible.value = !recommendPopupVisible.value;
  }, 50);

}


function toSKLand() {
  window.open("https://www.skland.com");
}

/**
 * 点击复制内容
 */
function copyCode(text) {
  let elementInput = document.createElement('input');
  elementInput.value = text
  document.body.appendChild(elementInput)
  elementInput.select()
  document.execCommand("Copy");
  elementInput.remove()
}

let btnStatus = ref({
  btn_import: true,
  btn_filter: false,
  btn_statistics: false,
  btn_plan: false,
  btn_recommend: false
})  //所有按钮的状态

/**
 * 点击按钮改变按钮状态
 * @param btnId 按钮id
 */
function clickBtn(btnId) {
  btnStatus.value[btnId] = !btnStatus.value[btnId]
}


function getAvatarSprite(id) {
  return "bg-" + id;
}

/**
 * 获取雪碧图
 * @param {string} id 图片id
 * @returns {string} css样式名
 */
function getItemCostSprite(id) {
  return 'bg-' + id
}

function getAvatar(id) {
  return "bg-" + id;
}

function getSkillSprite(id) {
  return "bg-skill_icon_" + id;
}

function getItem(id) {
  return 'bg-' + id
}


onMounted(() => {
  importData()
  getUserInfoAndOperatorData()


});
</script>


<template>
  <div class="survey-operator-page">
    <v-card style="width: 96%;margin: 0 auto">
      <v-tabs
          v-model="headerTag"
          bg-color="primary"
      >
        <v-tab value="干员筛选">干员筛选</v-tab>
        <v-tab value="数据导入导出">数据导入导出</v-tab>
        <v-tab value="个人干员数据统计"
               @click="clickBtn('btn_statistics');openStatisticalPopup()">
          个人干员数据统计
        </v-tab>
        <v-tab value="干员练度推荐"
               @click="clickBtn('btn_recommend');getOperatorRecommend()">
          干员练度推荐</v-tab>
      </v-tabs>
      <v-card-text>
        <v-tabs-window v-model="headerTag">
          <v-tabs-window-item value="干员筛选">
            <div class="checkbox">
              <v-btn variant="text" class="checkbox-label">职业</v-btn>
              <v-btn :type="selectedBtn('profession', profession.value)"
                     class="checkbox-button" rounded="x-large"
                     v-for="(profession,index) in professionDict" :key="index"
                     @click="addFilterCondition('profession', profession.value)">
                {{ profession.label }}
              </v-btn>
            </div>
            <div class="checkbox">
              <v-btn variant="text" class="checkbox-label">稀有度</v-btn>
              <v-btn :type="selectedBtn('rarity', rarity)"
                     class="checkbox-button" rounded="x-large"
                     v-for="(rarity,index) in RARITY_TABLE" :key="index"
                     @click="addFilterCondition('rarity', rarity)">
                {{ rarity }}★
              </v-btn>
            </div>
            <div class="checkbox">
              <v-btn variant="text" class="checkbox-label">年份</v-btn>
              <v-btn :type="selectedBtn('year',key)"
                     class="checkbox-button" rounded="x-large"
                     v-for="(year, key) in yearDict" :key="key"
                     @click="addFilterCondition('year', key)">
                {{ year.label }}
              </v-btn>
            </div>
            <div class="checkbox">
              <v-btn variant="text" class="checkbox-label">是否拥有</v-btn>
              <v-btn :type="selectedBtn('own',true)"
                     class="checkbox-button" rounded="x-large"
                     @click="addFilterCondition('own',true)">
                已拥有
              </v-btn>
              <v-btn :type="selectedBtn('own', false)"
                     class="checkbox-button" rounded="x-large"
                     @click="addFilterCondition('own', false)">
                未拥有
              </v-btn>
            </div>
            <div class="checkbox">
              <v-btn variant="text" class="checkbox-label">获得方式</v-btn>
              <v-btn :type="selectedBtn('itemObtainApproach',itemObtainApproach)"
                     class="checkbox-button" rounded="x-large"
                     v-for="(itemObtainApproach,index) in itemObtainApproachType" :key="index"
                     @click="addFilterCondition('itemObtainApproach',itemObtainApproach)">
                {{ itemObtainApproach }}
              </v-btn>

            </div>
          </v-tabs-window-item>

          <v-tabs-window-item value="数据导入导出">
            <v-btn data-color="green" type="primary" class="checkbox-button" @click="importDataBySkland()">
              从森空岛导入
            </v-btn>
            <v-btn data-color="green" type="primary" class="checkbox-button" @click="exportOperatorExcel()">
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
      <v-card class="operator-card" v-for="(operator, char_index) in operatorList" :key="char_index"
           @click="updateOperatorPopup(char_index)">
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