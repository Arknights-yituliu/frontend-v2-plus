<template>
  <div class="survey-operator-page">
    <!-- 常驻条 -->
    <div class="control-header">
      <!--      <my-button data-color='blue' :active="true" @click="checkFirstPopup()">操作指引</my-button>-->

      <my-button data-color='blue' :active="btnStatus.btn_filter"
                @click="clickBtn('btn_filter');collapseFilter()">
        筛选/批量操作
      </my-button>

      <my-button data-color='blue' :active="btnStatus.btn_import"
                @click="clickBtn('btn_import');collapseImport()">
        数据导入导出
      </my-button>

      <!--      <div style="width: 60px"></div>-->
      <my-button data-color='green' :active="true" @click="upload()">手动保存练度</my-button>
      <my-button data-color='blue' :active="statisticalPopupVisible"
                @click="clickBtn('btn_statistics');getOperatorStatisticalResult()">统计干员练度
      </my-button>
      <my-button data-color='blue' :active="recommendPopupVisible"
                @click="clickBtn('btn_recommend');getOperatorRecommend()">干员练度推荐（测试）
      </my-button>
      <!--      <my-button data-color='blue' :active="btn_status.btn_plan"-->
      <!--                @click="clickBtn('btn_plan');getOperatorPlanItemCost()">练度计划材料消耗统计-->
      <!--      </my-button>-->


    </div>

    <!-- 筛选模块 -->
    <c-collapse-item-v2 v-model:visible="collapseImportFilter" :name="'filter'">
      <div class="control-box">
        <div class="control-line">
          <span class="control-line-label" style="width: 80px;">职业</span>
          <div class="control-checkbox">
            <my-button data-color="blue" :active="selectedBtn('profession', profession.value)"
                       v-for="(profession,index) in professionDict"
                       :key="index"
                       @click="addFilterCondition('profession', profession.value)">
              {{ profession.label }}
            </my-button>
          </div>
        </div>

        <div class="control-line">
          <span class="control-line-label" style="width: 80px;">稀有度</span>
          <div class="control-checkbox">
            <my-button data-color="blue" :active="selectedBtn('rarity', rarity)"
                       v-for="(rarity,index) in RARITY_TABLE" :key="index"
                       @click="addFilterCondition('rarity', rarity)">
              {{ rarity }}★
            </my-button>
          </div>
        </div>

        <div class="control-line">
          <span class="control-line-label" style="width: 80px;">年份</span>
          <div class="control-checkbox">
            <my-button data-color="blue" :active="selectedBtn('year',key)"
                       v-for="(year, key) in yearDict" :key="key"
                       @click="addFilterCondition('year', key)">
              {{ year.label }}
            </my-button>
          </div>
        </div>

        <div class="control-line">
          <span class="control-line-label" style="width: 80px;">是否拥有</span>
          <div class="control-checkbox">
            <my-button data-color="blue" :active="selectedBtn('own',false)"
                       @click="addFilterCondition('own', false)">
              已拥有
            </my-button >
            <my-button data-color="blue" :active="selectedBtn('own',true)"
                       @click="addFilterCondition('own', true)">
              未拥有
            </my-button>
          </div>
        </div>

        <div class="control-line">
          <span class="control-line-label" style="width: 80px;">获得方式</span>
          <div class="control-checkbox">
            <my-button data-color="blue" :active="selectedBtn('itemObtainApproach',type)"
                       v-for="(type,index) in itemObtainApproachType" :key="index"
                       @click="addFilterCondition('itemObtainApproach', type)">
              {{ type }}
            </my-button>

          </div>
        </div>

        <div class="control-line">
          <span class="control-line-label" style="width: 80px;">模组</span>
          <div class="control-checkbox">
            <my-button data-color="blue" :active="selectedBtn('equip', true)"
                       @click="addFilterCondition('equip', true)">
              模组已实装
            </my-button >
            <my-button data-color="blue" :active="selectedBtn('equip', false)"
                       @click="addFilterCondition('equip', false)">
              模组未实装
            </my-button>
          </div>
        </div>

        <div class="control-line">
          <span class="control-line-label" style="width: 80px;">排序</span>
          <div class="control-checkbox">
            <my-button data-color="blue" @click="sortOperatorList('rarity')"> 按稀有度</my-button>
            <my-button data-color="blue" @click="sortOperatorList('date')"> 按实装顺序</my-button>
            <my-button data-color="blue" @click="sortOperatorListByLevel('level')"> 按干员等级</my-button>
          </div>
        </div>

        <!--          <div class="control_tip ">-->
        <!--            <a class="">对所有被筛选出的干员进行操作</a>-->
        <!--          </div>-->
        <!--          <div class="control_bar">-->
        <!--            <div class="control_title" style="width: 100px;">-->
        <!--              批量操作-->
        <!--            </div>-->
        <!--            <div class="switch_btn_wrap">-->
        <!--              <div class="btn" @click="batchUpdatesOwn(true)">设为已拥有</div>-->
        <!--              <div class="btn" @click="batchUpdatesOwn(false)">设为未拥有</div>-->
        <!--              <div class="btn" @click="batchUpdatesElite(0)">设为无精</div>-->
        <!--              <div class="btn" @click="batchUpdatesElite(1)">设为精一</div>-->
        <!--              <div class="btn" @click="batchUpdatesElite(2)">设为精二</div>-->
        <!--              <div class="btn">设为满级</div>-->
        <!--              <div class="btn">设为满潜能</div>-->
        <!--              <div class="btn" @click="batchUpdatesSkillAndMod('skill1', 3)">一技能设为专三</div>-->
        <!--              <div class="btn" @click="batchUpdatesSkillAndMod('skill2', 3)">二技能设为专三</div>-->
        <!--              <div class="btn" @click="batchUpdatesSkillAndMod('skill3', 3)">三技能设为专三</div>-->
        <!--              <div class="btn" @click="batchUpdatesSkillAndMod('modX', 3)">X模组设为三级</div>-->
        <!--              <div class="btn" @click="batchUpdatesSkillAndMod('modY', 3)">Y模组设为三级</div>-->
        <!--            </div>-->
        <!--          </div>-->
      </div>
    </c-collapse-item-v2>


    <!-- 导入导出模块 -->
    <c-collapse-item v-model:visible="collapseImportVisible" :name="'upload'">
      <div class="control-box">
        <div class="control-line-label">导入导出</div>
        <div class="control-line">
          <div class="control-checkbox">
            <my-button data-color="green" :active="true" @click="importDataBySkland()">从森空岛导入</my-button>
            <my-button data-color="green" :active="true" @click="exportOperatorExcel()">导出为Excel</my-button>
<!--            <my-button data-color="red" @click="resetPopupVisible = !resetPopupVisible">清空所有数据</my-button>-->
          </div>
        </div>
        <div class="control-line">
          <div class="control-line-tip">如果遇到不正常干员练度信息，可尝试使用“清空所有数据”按钮，清空导入的数据，再次导入<br>
          </div>
        </div>
      </div>
    </c-collapse-item>


    <c-popup :visible="resetPopupVisible" v-model:visible="resetPopupVisible">
      <div class="popup_action_tip">
        此操作将清空一图流账号上保存的所有干员数据，确定要执行操作吗？
      </div>
      <div class="control-checkbox">
        <div class="btn btn-red" @click="operatorDataReset()">确定</div>
        <div style="width: 80px;height: 50px"></div>
        <div class="btn" @click="resetPopupVisible = !resetPopupVisible">取消</div>
      </div>
    </c-popup>


    <!--    干员统计弹窗-->
    <c-popup v-model="statisticalPopupVisible">
      <!--          干员统计-->
      <div class="statistical-popup-container not-own-avatar-sprite-variables">
        <!--        <div class="detail-card">-->
        <!--          <h2 class="card-h2">博士招募情况</h2>-->
        <!--          <span> Dr.{{ userInfo.userName }}，您的招募干员情况为-->
        <!--            {{ statisticalResultV2.own }}/{{ statisticalResultV2.count }}-->
        <!--          </span>-->
        <!--          <div v-show="statisticalResultV2.count-statisticalResultV2.own>0">-->
        <!--            <h3>未招募干员如下</h3>-->
        <!--            <div class="not-own-operator-wrap">-->
        <!--              <div class="not-own-operator" v-for="(operator,index) in statisticalResultV2.notOwn" :key="index">-->
        <!--                <div class="not-own-avatar-sprite">-->
        <!--                  <div :class="getAvatarSprite(operator.charId)"></div>-->
        <!--                  &lt;!&ndash;              <span class="sprite-alt" style="top:70px">{{ operator.name }}</span>&ndash;&gt;-->
        <!--                </div>-->
        <!--                <span class="not-own-operator-name">{{operator.name}}</span>-->
        <!--              </div>-->
        <!--            </div>-->
        <!--          </div>-->
        <!--        </div>-->

        <div class="o-statistical-card">
          <h2>博士招募情况</h2>
          <span class="statistical-module-text"> Dr.{{ userData.userName }}，您总计招募了{{
              statisticalResult.total.own
            }}位干员
            <span v-show="statisticalResult.total.count - statisticalResult.total.own>0"
                  class="statistical-module-text"> ，未招募干员{{
                statisticalResult.total.count - statisticalResult.total.own
              }}位</span>
          </span>
          <div v-show="statisticalResult.total.count - statisticalResult.total.own>0"
               class="statistical-module-text">
            未招募的干员是：
          </div>
          <div class="not-own-operator-wrap">
            <sprite-avatar :name="operator.charId" size="60" style="margin: 4px"
                           v-for="(operator,index) in statisticalResult.total.notOwn" :key="index"></sprite-avatar>
          </div>

          <table class="operator-statistical-table">
            <tbody>
            <tr>
              <td>星级</td>
              <td>已招募/总数</td>
              <td>精二数量</td>
              <td>专三数量</td>
              <td>3级模组</td>
            </tr>
            <tr>
              <td>总计</td>
              <td>{{ statisticalResult.total.own }}/{{ statisticalResult.total.count }}</td>
              <td>{{ statisticalResult.total.elite.rank2 }}</td>
              <td>{{ statisticalResult.total.skill.rank3 }}</td>
              <td>{{ statisticalResult.total.mod.rank3 }}</td>
            </tr>
            <tr v-for="(detail,index) in statisticsDetail" :key="index">
              <td><img :src="`/image/survey/bg/rarity-${6-index}.png`" alt=""></td>
              <td>{{ detail.own }}/{{ detail.count }}</td>
              <td>{{ detail.elite.rank2 }}</td>
              <td>{{ detail.skill.rank3 }}</td>
              <td>{{ detail.mod.rank3 }}</td>
            </tr>
            </tbody>
          </table>
        </div>

        <div class="o-statistical-card">
          <h2>干员理智投入排行</h2>
          <div class="statistical-ap-rank-list">
            <div class="operator-card" v-for="(operator, char_index) in statisticalResult.max" :key="char_index"
            >
              <div class="operator-avatar-wrap">
                <div class="operator-avatar">
                  <div :class="getAvatar(operator.charId)"></div>
                </div>
              </div>
              <div>
                <img :src="`/image/survey/rank/elite${operator.elite}.png`" class="operator-elite-image" alt="">
                <div class="operator-level-image">
                  {{ operator.level }}
                </div>
              </div>

              <div class="operator-skill-icon-sprite-wrap" v-for="(skill,index) in operator.skill" :key="index">
                <div class="operator-skill-icon-sprite">
                  <div :class="getSkillSprite(skill.iconId)"></div>
                  <img :src="`/image/survey/skill-rank-${operator[`skill${index+1}`]}.jpg`"
                       v-show="operator[`skill${index+1}`]>0" class="operator-skill-rank" alt="">
                </div>
                <div class="skill-name">{{ skill.name }}</div>
              </div>

              <div class="operator-equip-image-wrap" v-for="(equip,index) in operator.equip" :key="index">
                <div class="operator-skill-icon-sprite">
                  <img :src="`/image/survey/mod-icon/${equip.typeIcon}.png`" alt="" class="operator-equip-image">
                  <img :src="`/image/survey/skill-rank-${operator[`mod${equip.typeName2}`]}.jpg`"
                       v-show="operator[`mod${equip.typeName2}`]>0" class="operator-skill-rank">
                </div>
                <div class="equip-name">{{ `${equip.typeName1}-${equip.typeName2}` }}</div>
              </div>

              <div class="operator-equip-image-wrap">
                <div class="item-ap-sprite">
                  <div :class="getItem('AP_GAMEPLAY')"></div>
                </div>
                <div class="item-ap-cost">{{ operator.apCost.toFixed(0) }}</div>
              </div>

            </div>
          </div>
        </div>

        <div class="o-statistical-card">
          <h2>理智消耗情况</h2>
          <p style="">总计消耗{{ apCostCount.toFixed(0) }} 理智</p>
          <!--          材料统计-->
          <my-button data-color="orange" @click="splitMaterialByRarity(5)">不拆分</my-button>
          <my-button data-color="purple" @click="splitMaterialByRarity(4)">拆分材料到紫色品质</my-button>
          <my-button data-color="blue" @click="splitMaterialByRarity(3)">拆分材料到蓝色品质</my-button>
          <div class="control-line item_cost_wrap" v-for="(itemList,type) in itemCostList"
               :key="type">
            <div v-for="(item,index) in itemList" :key="index" class="item_cost_card">
              <div class="item-used-image">
                <div :class="getItemCostSprite(item.id)"></div>
                <span class="item-used-count">
                  {{ strShowLength(item.count) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </c-popup>


    <c-popup v-model="recommendPopupVisible">
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

            <div class="operator-skill-icon-sprite-wrap"
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

    </c-popup>

    <!--    干员推荐-->
    <c-collapse-item-v2 v-model:visible="collapseRecommendVisible" :name="'recommend'">
      <div class="control-box">
        <div class="operator-form">
          <div class="operator-recommend-card" v-for="(recommend,index) in operatorRecommendList" :key="index">
            <div class="operator-avatar">
              <div :class="getAvatar(recommend.charId)"></div>
              <div class="operator-name">{{ recommend.name }}</div>
            </div>
            <div v-show="recommend.info.type==='skill'" class="operator-skill-icon-sprite">
              <div :class="getSkillSprite(recommend.info.iconId)"></div>
              <div class="sprite-alt">{{ recommend.info.name }}</div>
            </div>
            <div v-show="recommend.info.type==='equip'" class="operator-skill-icon-sprite">
              <img :src="`/image/survey/mod-icon/${recommend.info.iconId}.png`" alt="" class="operator-equip-image">
              <div class="sprite-alt">{{ recommend.info.iconId }}</div>
            </div>

            <div class="recommend-text">
              {{ `平均等级为${recommend.avg.toFixed(2)}级` }} <br>
              {{ `3级占比为${(recommend.ratio * 100).toFixed(2)}%` }}
            </div>

          </div>
        </div>
      </div>
    </c-collapse-item-v2>

    <!--   干员表单-->
    <div class="operator-form">
      <div class="operator-card" v-for="(operator, char_index) in operatorList" :key="char_index"
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

        <div class="operator-skill-icon-sprite-wrap" v-for="(skill,index) in operator.skill" :key="index">
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

      </div>
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
          <div class="operator-skill-icon-sprite-wrap"
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

<script setup>
import {cMessage} from "/src/utils/message.js";
import {filterByCharacterProperty, professionDict, yearDict} from "./service/common"; //基础信息（干员基础信息列表，干员职业字典，干员星级）
import operatorStatistical from "/src/pages/survey/service/operatorStatistical"
import userAPI from "/src/api/userInfo";
import operatorDataAPI from "/src/api/operator-data.js"
import sklandApi from '/src/pages/survey/service/skland'
import {onMounted, ref} from "vue";
import operatorRecommend from "/src/pages/survey/service/operatorRecommend";
import characterTable from '/src/static/json/survey/character_table_simple.json'
import {exportExcel} from '/src/utils/exportExcel.js'

import "/src/assets/css/survey/operator.scss";
import "/src/assets/css/survey/operator.phone.scss";
import {debounce} from "/src/utils/debounce";
import {getUserInfo} from "/src/pages/survey/service/userInfo.js";
import {useRouter} from "vue-router";

import MyButton from '/src/components/Button.vue'
import SpriteAvatar from "/src/components/SpriteAvatar.vue";

let RANK_TABLE = ref([0, 1, 2, 3, 4, 5, 6]);  //等级
let RARITY_TABLE = [1, 2, 3, 4, 5, 6];  //星级
let itemObtainApproachType = ['常驻干员','赠送干员','限定干员']

let userData = ref({uid: 0, userName: "未登录", akUid: "0", status: -100, token: void 0});  //用户信息

/**
 * 获取本地缓存的用户信息
 */
async function getUserInfoAndOperatorData() {

  userData.value = await getUserInfo()
  getOperatorData()
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
    '干员名称', '是否已招募', '等级', '精英化等级', '潜能等级', '通用技能等级', '1技能专精等级',
    '2技能专精等级', '3技能专精等级', 'X模组等级', 'Y模组等级', 'D模组等级'
  ]]
  for (const charId in operatorTable.value) {
    const operator = operatorTable.value[charId]
    list.push([
      operator.name,
      operator.own,
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
function importDataBySkland(){
       router.push({name:'IMPORT_BY_SKLAND'})
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
  return filterCondition.value[property].indexOf(rule) > -1;
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

let itemCostList = ref([]) //材料消耗数量
let apCostCount = ref(0) //理智消耗数量
let itemCostTable = ref({}) //材料消耗数量

let statisticalPopupVisible = ref(false)

function getOperatorStatisticalResult() {
  statistics()
  setTimeout(function () {
    statisticalPopupVisible.value = !statisticalPopupVisible.value
  }, 20)
}


//干员练度统计结果
let statisticalResult = ref({
  max: [],
  total: {notOwn: [], elite: 0, count: 0, own: 0, skill: {}, mod: {}, modX: {}, modY: {}, modD: {}},
  rarity6: {notOwn: [], elite: 0, count: 0, own: 0, skill: {}, mod: {}, modX: {}, modY: {}, modD: {}},
  rarity5: {notOwn: [], elite: 0, count: 0, own: 0, skill: {}, mod: {}, modX: {}, modY: {}, modD: {}},
  rarity4: {notOwn: [], elite: 0, count: 0, own: 0, skill: {}, mod: {}, modX: {}, modY: {}, modD: {}},
  rarity3: {notOwn: [], elite: 0, count: 0, own: 0, skill: {}, mod: {}, modX: {}, modY: {}, modD: {}},
  rarity2: {notOwn: [], elite: 0, count: 0, own: 0, skill: {}, mod: {}, modX: {}, modY: {}, modD: {}},
  rarity1: {notOwn: [], elite: 0, count: 0, own: 0, skill: {}, mod: {}, modX: {}, modY: {}, modD: {}},
})

let statisticalResultV2 = ref({})

let statisticsDetail = ref([statisticalResult.value.rarity6, statisticalResult.value.rarity5,
  statisticalResult.value.rarity4, statisticalResult.value.rarity3,
  statisticalResult.value.rarity2, statisticalResult.value.rarity1])

//各种统计
function statistics() {
  const result = operatorStatistical.calAPCost(operatorTable.value);
  itemCostTable.value = result.itemMap;
  itemCostList.value = result.itemList;
  apCostCount.value = result.apCostCount;

  statisticalResult.value = operatorStatistical.operatorStatistical(operatorTable.value)

  statisticalResultV2.value = operatorStatistical.operatorStatisticalV2(operatorTable.value)
  console.log(statisticalResultV2)
  statisticsDetail.value = [
    statisticalResult.value.rarity6, statisticalResult.value.rarity5,
    statisticalResult.value.rarity4, statisticalResult.value.rarity3,
    statisticalResult.value.rarity2, statisticalResult.value.rarity1
  ]
}


/**
 * 根据材料最大星级对材料进行拆解计算
 * @param highestRarity  材料最大星级
 */
function splitMaterialByRarity(highestRarity) {
  itemCostList.value = operatorStatistical.splitMaterial(highestRarity, itemCostTable.value);
}


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


/**
 * 数字展示长度限制
 * @param num  原始数字
 * @returns {string|*}  格式化后的数字
 */
function strShowLength(num) {
  if (num > 99999999) {
    return (num / 100000000).toFixed(2) + "亿"
  }
  if (num > 9999) {
    return (num / 10000).toFixed(1) + "万"
  }
  return num
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


.not-own-operator-wrap {
  display: flex;
  flex-wrap: wrap;
  margin: auto;
  width: fit-content;
}


.control_operator_card {
  width: 500px;
  display: block;
  text-align: center;
  font-size: 20px;
  font-weight: 600;
}


</style>