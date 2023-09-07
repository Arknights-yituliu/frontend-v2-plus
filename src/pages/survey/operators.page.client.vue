<template>




  <c-popup :visible="first_popup" v-model:visible="first_popup">
    <!-- <div class="intro_title">填写流程说明</div> -->
    <div class="intro_wrap">
      <div class="intro_title">填写方法</div>
      <b>填写前请在右上角注册并登录一个账号，以方便在不同设备间同步</b><br>
      默认干员未拥有,卡片显示为灰色(除头像外),点击头像设置为拥有此干员
      <br/>点击选择精英化、专精、模组等级，再次点击则可以取消
    </div>

    <div class="intro_wrap">
      <div class="intro_title">保存机制</div>
      填写的时候可以多点点保存，如不慎误操作，可以刷新页面从服务器上重新拉取数据
    </div>

    <div class="intro_wrap">
      <div class="intro_title">三种填写模式</div>
      极简模式：是否持有<br/>
      标准模式：是否持有、精英化程度、专精、模组<br/>
      完整模式：是否持有、精英化程度、专精、模组、潜能<br/>
      建议填的详细一些，以后会基于这些数据推出新功能
    </div>

    <div class="intro_wrap">
      <div class="intro_title">批量操作</div>
      批量操作：先筛选，再应用于全部筛选出的干员<br/>
      除“全部设为已拥有”和“全部设为未拥有”外，都仅对已拥有的干员生效
    </div>

    <div class="intro_wrap">
      <div class="intro_title">导入和导出</div>
      数据导入/导出：目前支持Excel的导入导出和森空岛CRED导入，json导出等功能还在开发中
    </div>
  </c-popup>

  <div class="survey_character_page">
    <!-- 常驻条 -->
    <div class="setup_top">
      <button class="mdui-btn survey_button" @click="firstPopupClose()">填写说明</button>
      <button class="mdui-btn survey_button">干员持有率：{{ user_own_operator_count }} / {{ operator_count }}</button>
      <button class="mdui-btn survey_button" @click="upload()" style="background-color:lightsalmon;">保存问卷</button>
      <div id="updateTime">上次保存时间<br/>{{ upload_message.updateTime }}</div>
      <div class="mdui-divider" style="margin: 4px;"></div>
      <button class="mdui-btn survey_button"
              @click="collapse('switch_bar filter', 'switch_filter_wrap','switch_filter_box')">筛选/批量操作
      </button>
      <button class="mdui-btn survey_button"
              @click="collapse('switch_bar upload', 'switch_upload_wrap','switch_upload_box')">数据导入导出
      </button>
      <div class="mdui-btn-group">
        <button type="button" class="mdui-btn survey_button_group_left" :class="surveyTypeBtnClass('极简模式')"
                @click="changeSurveyType('极简模式')">极简模式
        </button>
        <button type="button" class="mdui-btn survey_button_group" :class="surveyTypeBtnClass('标准模式')"
                @click="changeSurveyType('标准模式')">标准模式
        </button>
        <button type="button" class="mdui-btn survey_button_group" :class="surveyTypeBtnClass('高级模式')"
                @click="changeSurveyType('高级模式')">高级模式
        </button>
      </div>
      <button class="mdui-btn survey_button" @click="toBiliblili()">建议与反馈</button>
      <button class="mdui-btn survey_button" @click="statisticsCollapse()">统计材料消耗</button>

    </div>

    <!-- 设置区域 -->
    <!-- <div class="setup_wrap">
      <div class="control_panel">
        <div class="switch_title">设置</div>

        <div class="btn_setup" @click="collapse('switch_bar filter', 'switch_filter_wrap','switch_filter_box')">
          筛选/批量操作
          <div class="btn_setup_tips">可筛选后批量进行填写</div>
        </div>

        <div class="btn_setup" @click="collapse('switch_bar upload', 'switch_upload_wrap','switch_upload_box')">
          数据导入/导出
          <div class="btn_setup_tips">导入/导出json/Excel等</div>
        </div>
        <div class="btn_setup" @click="changeSurveyType()">
          问卷类型切换
          <div class="btn_setup_tips">当前问卷：{{ surveyTypeText }}</div>
        </div>
        <div class="btn_setup" @click="toBiliblili()">
          开发信息
          <div class="btn_setup_tips">反馈、建议、参与开发<br/></div>
        </div>
      </div>
    </div> -->

    <!-- 筛选模块 -->
    <div class="switch_wrap" id="switch_filter_wrap">
      <div class="switch_box" id="switch_filter_box">
        <div class="switch_bar filter">
          <div class="switch_title">职业</div>
          <div class="switch_btns_wrap">
            <div
                :class="selectedBtn('profession', profession.value)"
                v-for="profession in professionDict"
                @click="addFilterCondition('profession', profession.value)"
            >
              {{ profession.label }}
            </div>
          </div>
        </div>

        <div class="switch_bar filter">
          <div class="switch_title">稀有度</div>
          <div class="switch_btns_wrap">
            <div :class="selectedBtn('rarity', rarity)" v-for="rarity in rarity_dict"
                 @click="addFilterCondition('rarity', rarity)">{{ rarity }}★
            </div>
          </div>
        </div>

        <div class="switch_bar filter">
          <div class="switch_title">年份</div>
          <div class="switch_btns_wrap">
            <div :class="selectedBtn('year', key)" v-for="(year, key) in yearDict" :key="key"
                 @click="addFilterCondition('year', key)">
              {{ year.label }}
            </div>
          </div>
        </div>

        <div class="switch_bar filter">
          <div class="switch_title">是否拥有</div>
          <div class="switch_btns_wrap">
            <div :class="selectedBtn('own', true)" @click="addFilterCondition('own', true)">已拥有</div>
            <div :class="selectedBtn('own', false)" @click="addFilterCondition('own', false)">未拥有</div>
          </div>
        </div>

        <div class="switch_bar filter">
          <div class="switch_title">其它</div>
          <div class="switch_btns_wrap">
            <div :class="selectedBtn('mod', true)" @click="addFilterCondition('mod', true)">模组已实装</div>
            <div :class="selectedBtn('mod', false)" @click="addFilterCondition('mod', false)">模组未实装</div>
            <div :class="selectedBtn('itemObtainApproach', '赠送干员')"
                 @click="addFilterCondition('itemObtainApproach', '赠送干员')">赠送干员
            </div>
            <div :class="selectedBtn('itemObtainApproach', '限定干员')"
                 @click="addFilterCondition('itemObtainApproach', '限定干员')">限定干员
            </div>
          </div>
        </div>

        <div class="switch_bar filter">
          <div class="switch_title">排序</div>
          <div class="switch_btns_wrap">
            <!-- <div class="btn_switch" @click="sortCharacterList('profession')">按职业</div> -->
            <div class="btn_switch" @click="sortCharacterList('rarity')">按稀有度</div>
            <div class="btn_switch" @click="sortCharacterList('date')">按实装顺序</div>
          </div>
        </div>

        <!-- <div class="switch_bar filter">
          <div class="switch_title">练度</div>
          <div class="switch_btns_wrap">
            <div :class="selectedBtn('TODO', 0)" @click="addFilterCondition('mod', false)">无专三</div>
            <div :class="selectedBtn('TODO', 1)" @click="addFilterCondition('mod', false)">一个专三</div>
            <div :class="selectedBtn('TODO', 2)" @click="addFilterCondition('mod', false)">两个专三</div>
            <div :class="selectedBtn('TODO', 3)" @click="addFilterCondition('mod', false)">三个专三</div>
            <div :class="selectedBtn('TODO', 4)" @click="addFilterCondition('mod', false)">未开模组</div>
            <div :class="selectedBtn('TODO', 5)" @click="addFilterCondition('mod', false)">已开模组</div>
          </div>
        </div> -->

        <div class="mdui-divider" style="margin: 8px;"></div>

        <div class="switch_bar filter">
          <div class="switch_title">
            批量操作 <br/>
            <div style="font-size: 12px; font-style: italic">对所有被筛选出的干员进行操作</div>
          </div>
          <div class="switch_btns_wrap">
            <div class="btn_switch" @click="batchUpdatesOwn(true)">设为已拥有</div>
            <div class="btn_switch" @click="batchUpdatesOwn(false)">设为未拥有</div>
            <div class="btn_switch" @click="batchUpdatesElite(0)">设为无精</div>
            <div class="btn_switch" @click="batchUpdatesElite(1)">设为精一</div>
            <div class="btn_switch" @click="batchUpdatesElite(2)">设为精二</div>
            <div class="btn_switch">设为满级</div>
            <div class="btn_switch">设为满潜能</div>
            <div class="btn_switch" @click="batchUpdatesSkillAndMod('skill1', 3)">一技能设为专三</div>
            <div class="btn_switch" @click="batchUpdatesSkillAndMod('skill2', 3)">二技能设为专三</div>
            <div class="btn_switch" @click="batchUpdatesSkillAndMod('skill3', 3)">三技能设为专三</div>
            <div class="btn_switch" @click="batchUpdatesSkillAndMod('modX', 3)">X模组设为三级</div>
            <div class="btn_switch" @click="batchUpdatesSkillAndMod('modY', 3)">Y模组设为三级</div>
          </div>
        </div>
      </div>
    </div>


    <c-popup :visible="import_popup_visible" v-model:visible="import_popup_visible">
      <div>
        <div class="intro_wrap">
          <div class="intro_title">森空岛CRED的风险声明</div>
          &emsp;&emsp;森空岛CRED与鹰角网络通行证的Token并不通用（仅通过官网实验不通用，不能完全确定），目前仅可获取森空岛内展示的游戏数据<br/>
          &emsp;&emsp;一图流不会保存任何CRED信息<br/>
          <a style="color: #fa5e5e">&emsp;&emsp;*请妥善保管此CRED</a>
        </div>


        <div class="intro_wrap">
          <div class="intro_title">森空岛数据导入流程</div>

          <p><b>step1：</b>使用PC打开森空岛官网<a @click="toSkland()" class="skland_url">https://www.skland.com/</a>进行登录</p>
          <p><b>step2：</b>登录后按键盘F12调出开发者工具，在下方选择控制台(console)，输入以下命令：<br/>
            <a style="color:dodgerblue">localStorage.getItem('SK_OAUTH_CRED_KEY')</a>
            <br/>
            <button class="mdui-btn survey_button" @click="copyCode()">复制命令</button>

            <br/>输入之后回车确认
          </p>
          <img src="/image/skland/step1.jpg" class="skland_import_image" alt=""><img>
          <p><b>step3：</b>此时你可以获得一段神秘的字符，此即为CRED，复制这段CRED，<b>不要带引号</b></p>
          <img src="/image/skland/step2.jpg" class="skland_import_image" alt=""><img>
          <p><b>step4：</b>将 <b>step3</b> 中获得的CRED粘贴到输入栏中，点击“导入森空岛数据”即可完成导入</p>
          <img src="/image/skland/step3.jpg" class="skland_import_image" alt=""><img>
        </div>
      </div>

    </c-popup>

    <c-popup :visible="reset_popup_visible" v-model:visible="reset_popup_visible">
      <div class="popup_action_tip">此操作将解除您的森空岛UID与一图流账号的绑定，同时并清空一图流账号上保存的干员数据，确定要执行操作吗？</div>
      <div class="btn_switch_wrap">
        <div class="btn_switch" @click="operatorDataReset()">确定</div>
        <div class="btn_switch" @click="reset_popup_visible = !reset_popup_visible">取消</div>
      </div>

    </c-popup>

    <!-- 导入导出模块 -->
    <div class="switch_wrap switch_wrap_open" id="switch_upload_wrap">
      <div class="switch_box switch_box_open" id="switch_upload_box">
        <div class="switch_bar upload">
          <div class="switch_title">导入导出</div>
          <div class="switch_btns_wrap">
            <div class="btn_switch" @click="exportExcel()">导出为Excel</div>
            <!--            <div class="btn_switch">-->
            <!--              <div class="input_upload_wrap">-->
            <!--                导入Excel文件-->
            <!--                <input id="uploadInput" type="file" class="input_upload" @input="getUploadFileName()"/>-->
            <!--              </div>-->
            <!--            </div>-->
            <!--            &lt;!&ndash; <div class="btn_switch" @click="uploadByExcel()">上传Excel文件</div> &ndash;&gt;-->
            <!--            <div class="upload_file_name">文件名：{{ upload_file_name }}</div>-->
          </div>
        </div>
        <div class="switch_bar upload">
          <div class="switch_desc"><b>*上传须知：</b>导入的Excel的数据格式需与一图流导出的Excel内数据格式一致，请先导出一份空白表格以确保格式无误</div>
        </div>

        <div class="divider"></div>
        <div class="switch_bar upload">
          <div class="switch_title">森空岛导入</div>
          <div class="switch_btns_wrap">
            <div class="skland_desc">输入CRED</div>
            <div><input class="skland_input" type="text" v-model="skland_CRED"/></div>
            <div class="btn_switch" @click="importSKLandCRED()">导入森空岛数据</div>
            <div class="btn_switch" @click="retrieveAccount()">找回一图流账号</div>
            <div class="btn_switch" @click="reset_popup_visible = !reset_popup_visible" >清空所有数据</div>
          </div>
        </div>
        <div class="switch_bar upload" v-show="bindAccount">
          <div class="switch_desc">您已经导入过该账号的练度数据，已注册的一图流账号为：<a style="color: #ff0000;"> {{upload_message.userName}} </a> 请登录之前的账号 <br>
            <div class="skland_login_btn" @click="login(upload_message.userName)">请登录用户{{upload_message.userName}}并刷新网页</div>
          </div>
        </div>
        <div class="switch_bar upload">
          <div class="switch_desc"><b>*森空岛导入：</b>请遵循
            <a class="skland_notice_btn" @click="import_popup_visible = !import_popup_visible">《森空岛导入说明》</a>的指引，导入完如显示有误请手动保存并刷新页面<br>
            如果忘了一图流账号，可输入CRED点击&nbsp; <a class="skland_notice_btn">找回一图流账号</a> &nbsp;按钮，此时会找回您的一图流账号
          </div>
        </div>
      </div>
    </div>

    <div class="switch_wrap" id="switch_statistics_wrap">
      <div class="switch_box" id="switch_statistics_box">
        <div class="switch_bar statistics"
             style="line-height: 32px;font-weight: 600;font-size: 24px;padding: 12px 12px 12px 12px;">
          总计消耗{{ apCostCount.toFixed(0) }} 理智
        </div>

        <div class="switch_bar statistics item_cost_wrap" v-for="(itemList,type) in itemCostResult"
             :key="type" >
          <div v-for="(item,index) in itemList" :key="index" class="item_cost_card" >
            <div class="image_item_wrap">
              <div :class="getSprite(item.id,'item')"></div>
              <div class="item_count">
                {{ strShowLength(item.count) }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 干员组 -->
    <div class="char_forms">
      <div :class="simpleCardClass()" v-for="(operator, char_index) in operator_list.slice(0,list_size)"
           :key="char_index" v-show="operator.show">
        <!-- 左半部分 -->
        <div :class="surveyTypeClass('card_option_left')">
          <div :class="surveyTypeClass('card_option_top_left')">
            <div class="avatar_at_top">
              <div class="character_own_label" v-if="operator.own">已拥有</div>
              <div class="character_not_own_label" v-if="!operator.own">未拥有</div>
              <div class="image_avatar" @click="updateOwn(char_index, !operator.own, true)">
                <div :class="getSprite(operator.charId)"></div>
              </div>
              <div class="char_name">{{ operator.name }}</div>
            </div>
            <div :class="surveyTypeClass('potential_wrap')">
              <div class="image_potential" :id="char_index + 'potential' + rank" v-for="rank in ranks.slice(1, 7)"
                   @click="updatePotential(char_index, rank)">
                <div :class="getSprite('potential' + rank, 'potential')"></div>
              </div>
            </div>
          </div>

          <!--  -->
          <div :class="surveyTypeClass('elite_wrap')">
            <div class="image_elite" :id="char_index + 'elite0'" @click="updateElite(char_index, 0)">
              <div :class="getSprite('elite0', 'elite')"></div>
            </div>
            <div :id="char_index + 'elite1'" class="image_elite" @click="updateElite(char_index, 1)"
                 v-show="operator.rarity > 2">
              <div :class="getSprite('elite1', 'elite')"></div>
            </div>
            <div :id="char_index + 'elite2'" class="image_elite" @click="updateElite(char_index, 2)"
                 v-show="operator.rarity > 3">
              <div :class="getSprite('elite2', 'elite')"></div>
            </div>
            <!--            <div class="image_elite" :id="char_index + 'level'" @click="updateLevel(char_index)">-->
            <div class="level_wrap" :id="char_index + 'level'">
              <!--              <img class="image_lvMax" src="/image/survey/lvMax.png" alt=""/>-->
              {{ operator.level }}
            </div>
          </div>
        </div>

        <!-- 右半部分 -->
        <!-- 技能 -->
        <div class="card_option_right">
          <div v-for="(skill, skill_index) in operator.skill" :key="skill_index" :class="surveyTypeClass('skill_wrap')">
            <div class="image_skill">
              <div :class="getSprite(skill.iconId, 'icon')"></div>
            </div>
            <div
                v-for="rank in ranks.slice(1, 4)"
                class="image_rank"
                :id="char_index + 'skill' + (skill_index + 1) + rank"
                @click="updateSkillAndMod(char_index, 'skill' + (skill_index + 1), rank)"
            >
              <div :class="getSprite('skill' + rank, 'skill')"></div>
            </div>
          </div>

          <div :class="surveyTypeClass('skill_delimiter')"></div>

          <!-- 模组X -->
          <div :class="surveyTypeClass('skill_wrap')" v-show="operator.modXOwn">
            <div class="image_mod">{{ "模组X" }}</div>
            <div v-for="rank in ranks.slice(1, 4)" class="image_rank" :id="char_index + 'modX' + rank"
                 @click="updateSkillAndMod(char_index, 'modX', rank)">
              <div :class="getSprite('mod' + rank, 'mod')"></div>
            </div>
          </div>

          <!-- 没有模组X显示 -->
          <div :class="surveyTypeClass('skill_wrap')" v-show="!operator.modXOwn">
            <div class="image_mod">[N/A]</div>
            <div v-for="rank in ranks.slice(1, 4)" class="image_rank_disable">
              <img class="image_null" src="/image/survey/null.png" alt=""/>
            </div>
          </div>

          <!-- 模组Y -->
          <div :class="surveyTypeClass('skill_wrap')" v-show="operator.modYOwn">
            <div class="image_mod">{{ "模组Y" }}</div>

            <div v-for="rank in ranks.slice(1, 4)" class="image_rank" :id="char_index + 'modY' + rank"
                 @click="updateSkillAndMod(char_index, 'modY', rank)">
              <div :class="getSprite('mod' + rank, 'mod')"></div>
            </div>
          </div>

          <!-- 没有模组Y显示 -->
          <div :class="surveyTypeClass('skill_wrap')" v-show="!operator.modYOwn">
            <div class="image_mod">[N/A]</div>
            <div v-for="rank in ranks.slice(1, 4)" class="image_rank_disable">
              <img class="image_null" src="/image/survey/null.png" alt=""/>
            </div>
          </div>
        </div>

        <div class="card-overlay" v-show="'简易问卷' !== surveyTypeText && !operator_list[char_index].own">
          <div class="card-overlay-title">未拥有</div>
          <div class="card-overlay-detail">点击头像将干员设为拥有</div>
        </div>
      </div>
    </div>

    <!-- 数据声明 -->
    <!-- <div class="char_card">此处安放版权声明/开发信息</div> -->
    <div class="footer_info">
      除非另有声明，网站其他内容采用
      <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/">知识共享署名-非商业性使用-相同方式共享</a>授权。
    </div>
  </div>
</template>

<script setup>
import {cMessage} from "@/element/message.js";
import {globalUserData} from "./userService"; //从用户服务js获取用户信息
import {characterListInit, collapse, filterByCharacterProperty, professionDict, yearDict} from "./common"; //基础信息（干员基础信息列表，干员职业字典，干员星级）
import {calAPCost} from "./operatorStatistics"; //基础信息（干员基础信息列表，干员职业字典，干员星级）
import surveyApi from "@/api/survey";
import {onMounted, ref} from "vue";
import "@/assets/css/survey_character.css";
import {http} from "@/api/baseURL";
import request from "@/api/requestBase";
import { importSklandData,getPlayerBind} from "./skland.js";

let first_popup = ref(false)
let import_popup_visible = ref(false)

function isFirstPopup() {
  if ("done" !== localStorage.getItem("first_popup")) {
    first_popup.value = true;
  }
  return false;
}

function firstPopupClose() {
  first_popup.value = !first_popup.value
  localStorage.setItem("first_popup", "done");
}

/**
 * 获取雪碧图
 * @param id 图片id
 * @param type 图片类型
 * @returns {string}
 */
function getSprite(id, type) {
  if ("mod" === type) return "bg-" + id + " sprite_mod";
  if ("skill" === type) return "bg-" + id + " sprite_skill";
  if ("elite" === type) return "bg-" + id + " sprite_elite";
  if ("potential" === type) return "bg-" + id + " sprite_potential";
  if ("icon" === type) return "bg-skill_icon_" + id + " sprite_skill_icon";
  if ("item" === type) return 'bg-' + id + " image_item"
  return "bg-" + id + " sprite_avatar";
}

let operator_list = ref([]);
let ranks = ref([0, 1, 2, 3, 4, 5, 6]);
let rarity_dict = [1, 2, 3, 4, 5, 6];
let list_size = ref(10)

function initOperatorsList() {
  operator_list.value = characterListInit();

  setTimeout(() => {
    list_size.value = operator_list.value.length;
    getSurveyCharacter();

  }, 1000);

  setTimeout(() => {
    statistics()
  }, 2000);

}

//找回填写过的角色信息
function getSurveyCharacter() {
  if (globalUserData.value.token === void 0) {
    console.log(globalUserData.value.token === void 0);
    // cMessage("未登录", "error");
    return;
  }

  surveyApi.getSurveyCharacter(globalUserData.value.token).then((response) => {
    let list = response.data; //后端返回的数据

    //转为前端的数据格式
    for (let i = 0; i < operator_list.value.length; i++) {
      // characterList.value[i].own =false;
      for (let j = 0; j < list.length; j++) {
        if (list[j].charId === operator_list.value[i].charId) {
          if (!list[j].own) continue;
          operator_list.value[i].elite = list[j].elite;

          operator_list.value[i].level = list[j].level;
          operator_list.value[i].potential = list[j].potential;
          operator_list.value[i].mainSkill = list[j].mainSkill;
          operator_list.value[i].skill1 = list[j].skill1;
          operator_list.value[i].skill2 = list[j].skill2;
          operator_list.value[i].skill3 = list[j].skill3;
          operator_list.value[i].modX = list[j].modX;
          operator_list.value[i].modY = list[j].modY;
          operator_list.value[i].own = list[j].own;

          if (operator_list.value[i].level > -1) {
            updateOption(i + "level", true);
          }

          updateOption(i + "elite" + list[j].elite, true);
          updateOption(i + "potential" + list[j].potential, true);
          updateOption(i + "skill1" + list[j].skill1, true);
          updateOption(i + "skill2" + list[j].skill2, true);
          updateOption(i + "skill3" + list[j].skill3, true);
          updateOption(i + "modX" + list[j].modX, true);
          updateOption(i + "modY" + list[j].modY, true);
        }
      }
    }
    cMessage("导入了 " + list.length + " 条数据");
  });
}


let export_excel_etn_text = ref("导出excel");

//导出评分表的excel
function exportExcel() {
  export_excel_etn_text.value = "导出中···";
  const export_excel_url = http + "survey/operator/export?token=" + globalUserData.value.token;
  const element = document.createElement("a");
  element.download = "form.xlsx";
  element.style.display = "none";
  element.href = export_excel_url;
  element.click();
  setTimeout(() => {
    export_excel_etn_text.value = "导出excel";
  }, 5000);
}


let skland_CRED = ref("");
let bindAccount = ref(false)


async function retrieveAccount(){
  const playerBind = await getPlayerBind(skland_CRED.value);
  const data = {
    uid:playerBind.uid
  }

  request({
    url:'survey/user/retrieval',
    method: "post",
    data:data
  }).then(response=>{
   response = response.data
    if(response.code===200){
      const userName = response.data.userName;
      login(userName)
    }else {
      cMessage(response.msg,'error')
    }
  })
}

/**
 * 森空岛导入
 * @returns {Promise<void>}
 */
async function importSKLandCRED() {

  const response = await importSklandData(skland_CRED.value);

  if (globalUserData.value.token === void 0) {
    console.log(globalUserData.value.token === void 0);
    cMessage("请先注册或登录一图流账号", "error");
    return;
  }

  const data = {
    token:globalUserData.value.token,
    data:JSON.stringify(response)
  }

   request({
    url:'survey/operator/import/skland/v2',
    method: "post",
    data:data
  }).then(response=>{
         response = response.data
         upload_message.value = response.data;
         if(response.code === 20004){
           cMessage("您已经注册导入过了","error");
           bindAccount.value = true;
           return;
         }

         if(response.code === 200){
           cMessage("森空岛数据导入成功");
           getSurveyCharacter()
           bindAccount.value = false;
         }else {
           cMessage(response.msg,"error");
         }
  })

  // let info = {
  //   token: globalUserData.value.token,
  //   cred: skland_CRED.value,
  // };
  //
  // request({
  //   url: `survey/operator/import/skland`,
  //   method: "post",
  //   data: info,
  // }).then(response => {
  //     response = response.data
  //     upload_message.value = response.data;
  //     if(response.code === 20004){
  //       cMessage("您已经注册导入过了","error");
  //       bindAccount.value = true;
  //     }
  //
  //     if(response.code === 200){
  //       cMessage("森空岛数据导入成功");
  //       getSurveyCharacter()
  //       bindAccount.value = false;
  //     }else {
  //       cMessage("您已经注册导入过了","error");
  //     }
  // })

  // surveyApi.uploadCharacterBySKLand(info).then((response) => {
  //   upload_message.value = response.data;
  //   selected_index_obj.value = {};
  //   if(upload_message.value.registered){
  //     cMessage("您已经注册导入过了","error");
  //   }else {
  //     cMessage("森空岛数据导入成功");
  //     getSurveyCharacter()
  //   }
  //
  // });
}

let reset_popup_visible = ref(false)


/**
 * 重置账号数据
 */
function  operatorDataReset(){

  let data = {
    token:globalUserData.value.token,
  }

  request({
    url:'survey/operator/reset',
    method: "post",
    data:data
  }).then(response=>{
    response =  response.data
    if(response.code===200){
      cMessage(response.data)
    }else {
      cMessage(response.msg,'error')
    }
  })
}

/**
 * 登录一图流账号
 * @param userName 一图流用户名（即账号名）
 */

function login(userName) {
  let info ={userName:userName}
   request({
    url: `survey/login`,
    method: "post",
    data: info,
  }).then(response => {
    response = response.data
    if (response.code !== 200) {
      cMessage(response.msg,'error')
    }
    if (response.code === 200 && response.data.status > 0) {
      localStorage.setItem("globalUserData", JSON.stringify(response.data));
      // 登录成功刷新
      location.reload()
    }
  })
}


let last_upload_time_stamp = 1689425013364; //上次上传时间的时间戳
let upload_message = ref({updateTime: "", affectedRows: 0, registered:false, userName:'' }); //上传APi返回的信息
let selected_index_obj = ref({}); //每次点击操作记录下被更新的干员的索引，只上传被修改过的干员

//自动上传风评表
function automaticUpload() {
  return;
  //方法触发时的时间戳
  const now_upload_time_stamp = Date.parse(new Date().toString());
  //与上一次自动上传时间的间隔
  let upload_frequency = now_upload_time_stamp - last_upload_time_stamp;
  // 检查用户是否登录
  if (globalUserData.value.token === void 0) {
    console.log(globalUserData.value.token === void 0);
    cMessage("未登录", "error");
    return;
  }
  //上传间隔小于30s退出方法
  if (upload_frequency < 30000) return;
  console.log("上传频率：", upload_frequency / 1000, "s");

  //上传的数据
  let upload_list = uploadDataReduction();

  last_upload_time_stamp = now_upload_time_stamp;

  surveyApi.uploadCharacter(upload_list, globalUserData.value.token).then((response) => {
    upload_message.value = response.data;
    selected_index_obj.value = {};
    cMessage("自动保存成功");
  });
}

//手动上传
function upload() {
  let uploadList = uploadDataReduction();
  surveyApi.uploadCharacter(uploadList, globalUserData.value.token).then((response) => {
    upload_message.value = response.data;
    cMessage("保存成功");
    selected_index_obj.value = {};
  });
}

let upload_file_name = ref("上传的文件名");

// 将需要上传的数据去除无用信息
function uploadDataReduction() {
  let upload_list = [];
  console.log(selected_index_obj.value);

  for (const i in selected_index_obj.value) {
    const operator = {
      charId: operator_list.value[i].charId,
      own: operator_list.value[i].own,
      rarity: operator_list.value[i].rarity,
      elite: operator_list.value[i].elite,
      level: operator_list.value[i].level,
      potential: operator_list.value[i].potential,
      skill1: operator_list.value[i].skill1,
      skill2: operator_list.value[i].skill2,
      skill3: operator_list.value[i].skill3,
      modX: operator_list.value[i].modX,
      modY: operator_list.value[i].modY,
    };
    console.log(operator);
    upload_list.push(operator);
  }

  return upload_list;
}

//Excel文件上传
function getUploadFileName() {
  const file = document.getElementById("uploadInput");
  upload_file_name.value = file.files[0].name;
  let formData = new FormData();
  formData.append("file", file.files[0]);
  console.log(file);
  surveyApi.uploadCharacterByExcel(formData, globalUserData.value.token).then((response) => {
    // console.log(response.data);
    cMessage("新增了 " + response.data.insertRows + " 条");
    cMessage("更新了 " + response.data.updateRows + " 条");
  });
}

//通过excel上传
// function uploadByExcel() {
//   const file = document.getElementById("uploadInput");
//   let formData = new FormData();
//   formData.append("file", file.files[0]);
//   console.log(file);
//   surveyApi.uploadCharacterByExcel(formData, globalUserData.value.token).then((response) => {
//     // console.log(response.data);
//     cMessage("新增了 " + response.data.insertRows + " 条");
//     cMessage("更新了 " + response.data.updateRows + " 条");
//   });
// }

let maaData = ref([{}]);

function maaData1() {
  let dataJson = JSON.parse(maaData.value);
  for (let i in dataJson) {
  }
}

/**
 * 更新是否持有
 * @param char_index  干员数组的索引
 * @param new_value   传入的新值
 */

function updateOwn(char_index, new_value) {
  selected_index_obj.value[char_index] = char_index; //记录更新的干员的索引

  const operator = operator_list.value[char_index];
  operator_list.value[char_index].own = new_value;
  const oldElite = operator_list.value[char_index].elite; //旧精英等级
  const oldPotential = operator_list.value[char_index].potential; //旧潜能等级

  if (new_value) {
    //点击拥有且干员三星以上，设为精英等级2，潜能1
    if (operator.rarity > 3) {
      operator_list.value[char_index].elite = 2;
      cancelAndUpdateOption(char_index + "elite", 2, oldElite);
      operator_list.value[char_index].potential = 1;
      cancelAndUpdateOption(char_index + "potential", 1, oldPotential);
    }
  } else {
    //点击未拥有时，撤销所有选项
    let propertyL_list = ["elite", "potential", "skill1", "skill2", "skill3", "modX", "modY"];
    for (let property of propertyL_list) {
      updateOption(char_index + property + operator[property], false);
      operator_list.value[char_index][property] = -1;
    }
    updateOption(char_index + "level", false);
  }

  automaticUpload();
  statistics()
}

//批量更新是否持有
function batchUpdatesOwn(new_value) {
  for (let index in operator_list.value) {
    if (operator_list.value[index].show) {
      operator_list.value[index].own = new_value;
      selected_index_obj.value[index] = index;
    }
  }
  statistics()
}

/**
 * 更新精英化等级
 * @param char_index  干员数组的索引
 * @param new_value   传入的新值
 */
function updateElite(char_index, new_value) {
  //记录更新过信息的干员的索引
  selected_index_obj.value[char_index] = char_index;
  //需要修改的elementId
  let element_id = char_index + "elite";
  //需要删去的旧值
  let old_value = operator_list.value[char_index].elite;
  // console.log("更新精英化——", "新值：", new_value, "，旧值：", old_value, "，结果：", new_value == old_value);
  //新旧值相同直接取消选项背景色，并更新精英等级为-1
  if (new_value === old_value) {
    operator_list.value[char_index].elite = -1;
    updateOption(element_id + old_value, false);
    return;
  }

  //更新精英等级并取消旧值的选项背景色，给新值的选项加上选项背景色
  operator_list.value[char_index].elite = new_value;
  cancelAndUpdateOption(element_id, new_value, old_value);
  operator_list.value[char_index].own = true;

  automaticUpload();
  statistics()
}

// 批量精英化
function batchUpdatesElite(new_value) {
  for (let index in operator_list.value) {
    if (operator_list.value[index].show && operator_list.value[index].own) {
      let element_id = index + "elite";
      let old_value = operator_list.value[index].elite;
      operator_list.value[index].elite = new_value;
      cancelAndUpdateOption(element_id, new_value, old_value);
      selected_index_obj.value[index] = index;
    }
  }

  statistics()
}

/**
 * 更新精英化等级
 * @param char_index  干员数组的索引
 * @param property 需要修改的干员信息属性名称
 * @param new_value   传入的新值
 */
//更新专精或模组等级
function updateSkillAndMod(char_index, property, new_value) {
  selected_index_obj.value[char_index] = char_index;
  //需要修改的elementId
  let element_id = char_index + property;
  //需要删去的旧值
  let old_value = operator_list.value[char_index][property];
  let oldElite = operator_list.value[char_index].elite;
  // console.log("更新专精模组——", "新值：", new_value, "，旧值：", old_value, "，结果：", new_value == old_value);

  //新旧值相同直接取消选项背景色，并更新专精/模组等级为-1
  if (new_value === old_value) {
    operator_list.value[char_index][property] = -1;
    updateOption(element_id + old_value, false);
    return;
  }

  //更新精英等级并取消旧值的选项背景色，给新值的选项加上选项背景色
  operator_list.value[char_index][property] = new_value;
  cancelAndUpdateOption(element_id, new_value, old_value);

  //如果干员是三星以上，自动更新精英等级为2
  if (operator_list.value[char_index].rarity > 3) {
    operator_list.value[char_index].elite = 2;
    cancelAndUpdateOption(char_index + "elite", 2, oldElite);
  }

  operator_list.value[char_index].own = true;

  // console.log("专精模组:", JSON.stringify(characterList.value[char_index], null, 2));

  automaticUpload();

  statistics()
}

/**
 * 批量专精或模组
 * @param property 需要修改的干员信息属性名称
 * @param new_value   传入的新值
 */
function batchUpdatesSkillAndMod(property, new_value) {
  for (let index in operator_list.value) {
    if (!(operator_list.value[index].show && operator_list.value[index].own)) continue;
    if ("modX" === property && !operator_list.value[index].modXOwn) {
      console.log("没有x模组");
      continue;
    }
    if ("modY" === property && !operator_list.value[index].modYOwn) {
      console.log("没有y模组");
      continue;
    }
    if ("skill3" === property && operator_list.value[index].rarity < 6) {
      console.log("6星以下没有三技能");
      continue;
    }

    if ("skill2" === property && operator_list.value[index].rarity < 4) {
      console.log("4星以下没有三技能");
      continue;
    }

    let element_id = index + property;
    let old_value = operator_list.value[index][property];
    operator_list.value[index][property] = new_value;

    cancelAndUpdateOption(element_id, new_value, old_value);
    selected_index_obj.value[index] = index;
  }

  statistics()
}

/**
 * 更新潜能
 * @param char_index 干员数组的索引
 * @param new_value   传入的新值
 */
function updatePotential(char_index, new_value) {
  //记录更新过信息的干员的索引
  selected_index_obj.value[char_index] = char_index;
  //需要修改的elementId
  let element_id = char_index + "potential";
  //需要删去的旧值
  let old_value = operator_list.value[char_index].potential;
  // console.log("更新潜能——", "新值：", new_value, "，旧值：", old_value, "，结果：", new_value == old_value);
  //新旧值相同直接取消选项背景色，并更新潜能等级为-1
  if (new_value === old_value) {
    operator_list.value[char_index].potential = -1;
    updateOption(element_id + old_value, false);
    return;
  }

  //更新潜能等级并取消旧值的选项背景色，给新值的选项加上选项背景色
  operator_list.value[char_index].potential = new_value;
  cancelAndUpdateOption(element_id, new_value, old_value);
  operator_list.value[char_index].own = true;

  automaticUpload();
  statistics()
}

/**
 * 更新干员的等级
 * @param char_index 干员数组的索引
 */
function updateLevel(char_index) {
  //记录更新过信息的干员的索引
  selected_index_obj.value[char_index] = char_index;

  let level = -1;
  //旧精英等级
  let oldElite = operator_list.value[char_index].elite;
  let rarity = operator_list.value[char_index].rarity;

  operator_list.value[char_index].own = true;
  //如果是满级则取消满级，并将选项背景色去除
  if (operator_list.value[char_index].level > 0) {
    operator_list.value[char_index].level = level;
    updateOption(char_index + "level", false);
    return;
  }

  // 根据星级更新精英等级和等级
  if (rarity === 6) {
    level = 90;
    operator_list.value[char_index].elite = 2;
    cancelAndUpdateOption(char_index + "elite", 2, oldElite);
  }
  if (rarity === 5) {
    level = 80;
    operator_list.value[char_index].elite = 2;
    cancelAndUpdateOption(char_index + "elite", 2, oldElite);
  }
  if (rarity === 4) {
    level = 70;
    operator_list.value[char_index].elite = 2;
    cancelAndUpdateOption(char_index + "elite", 2, oldElite);
  }
  if (rarity === 3) {
    level = 55;
    operator_list.value[char_index].elite = 1;
    cancelAndUpdateOption(char_index + "elite", 1, oldElite);
  }
  if (rarity < 3) {
    level = 30;
    operator_list.value[char_index].elite = 0;
    cancelAndUpdateOption(char_index + "elite", 0, oldElite);
  }

  if (level === -1) return;

  operator_list.value[char_index].level = level;

  //更新等级选项背景色
  updateOption(char_index + "level", true);

  // console.log("等级:", JSON.stringify(characterList.value[char_index], null, 2));

  automaticUpload();
  statistics()
}

//选中标题
function btnSetClass(flag) {
  if (flag) return "btn_setup btn_setup_selected";
  return "btn_setup";
}

//先取消旧选项，更修改新选项的背景色
function cancelAndUpdateOption(elementIdHeader, rank, oldRank) {
  // console.log("元素id：",elementIdHeader,"，旧值：",oldRank,'，新值：',rank)
  updateOption(elementIdHeader + oldRank, false);
  updateOption(elementIdHeader + rank, true);
}

function updateBackBeforeCancel(elementIdHeader, rank, oldRank) {
  updateOption(elementIdHeader + rank, true);
  updateOption(elementIdHeader + oldRank, false);
}

/**
 *
 * @param element_id  需要修改的选项背景所在的元素id
 * @param selected_flag  是否选中
 */
function updateOption(element_id, selected_flag) {
  // 干员数据是一个数组，每个选项的element的id为 数组索引+属性名，例如 第一个干员号角的3技能的id是 '0skill3'
  // console.log("修改的元素id", element_id);
  let element = document.getElementById(element_id);
  if (element == null) return;
  if (selected_flag) {
    // console.log("添加背景色id", element_id);
    element.style.backgroundColor = "rgba(255, 115, 0, 0.5)";
  } else {
    // console.log("取消背景色id", element_id);
    element.style.backgroundColor = "rgba(127, 127, 127, 0.1)";
  }
}

let surveyTypeText = ref("标准模式");
let surveyType = ref("_basic");
//简易卡片样式
let simpleCard = ref(false);

//标准问卷与完整问卷
function changeSurveyType(type) {
  if ("极简模式" === type) {
    surveyType.value = "";
    simpleCard.value = true;
    surveyTypeText.value = "极简模式";
    return;
  }
  if ("标准模式" === type) {
    surveyType.value = "_basic";
    surveyTypeText.value = "标准模式";
    simpleCard.value = false
    return;
  }

  if ("高级模式" === type) {
    surveyType.value = "";
    surveyTypeText.value = "高级模式";
    simpleCard.value = false
  }
}

function surveyTypeBtnClass(now) {
  if (now === surveyTypeText.value) return 'mdui-btn-active'
  return ''
}

function surveyTypeClass(classNameHeader) {
  return classNameHeader + surveyType.value;
}

//
function simpleCardClass() {
  if (simpleCard.value) return "char_card char_card_simple";
  return "char_card";
}

//判断按钮是否选中
function selectedBtn(property, rule) {
  if (filterCondition.value[property].indexOf(rule) > -1) {
    return "btn_switch selected_color";
  }
  return "btn_switch";
}

let filterCondition = ref({rarity: [6], profession: [], year: [], own: [], mod: [], itemObtainApproach: [], TODO: []});

/**
 *  增加筛选规则
 * @param property  干员属性
 * @param condition 筛选条件
 */

function addFilterCondition(property, condition) {
  console.log(filterCondition.value);
  let filterRulesCopy = [];
  if (filterCondition.value[property].indexOf(condition) > -1) {
    for (let i in filterCondition.value[property]) {
      if (condition !== filterCondition.value[property][i]) {
        filterRulesCopy.push(filterCondition.value[property][i]);
      }
    }
    filterCondition.value[property] = filterRulesCopy;
    filterCharacterList();
    return;
  }

  filterCondition.value[property].push(condition);
  filterCharacterList();
}

//筛选
function filterCharacterList() {
  for (let i in operator_list.value) {
    const character = operator_list.value[i];
    operator_list.value[i].show = filterByCharacterProperty(filterCondition.value, character);
  }
}

//按条件排序
function sortCharacterList(rule) {
  console.log(rule);
  operator_list.value.sort((a, b) => {
    return b[rule] - a[rule];
  });
}

let operator_count = ref(0)
let user_own_operator_count = ref(0)

let itemCostResult = ref({})
let apCostCount = ref(0)

function statisticsCollapse() {
  statistics()
  collapse('switch_bar statistics', 'switch_statistics_wrap', 'switch_statistics_box')

}

//各种统计
function statistics() {
  user_own_operator_count.value = 0;
  operator_count.value = operator_list.value.length

  for (const i in operator_list.value) {
    if (operator_list.value[i].own) {
      user_own_operator_count.value++;
    }
  }


  itemCostResult.value = calAPCost(operator_list.value).itemList;
  apCostCount.value = calAPCost(operator_list.value).apCostCount;
}

function strShowLength(num){
     if(num>99999999){
        return (num/100000000).toFixed(2)+"亿"
     }
     if(num>9999){
       return (num/10000).toFixed(0)+"万"
     }
     return num
}


function toSkland() {
  window.open("https://www.skland.com");
}

function copyCode() {

  let elementInput = document.createElement('input');
  elementInput.value = "localStorage.getItem('SK_OAUTH_CRED_KEY')"
  document.body.appendChild(elementInput)
  elementInput.select()
  document.execCommand("Copy");
  elementInput.remove()
}


//转跳罗德岛基建Beta
function toBiliblili() {

  const excelHref = "https://docs.qq.com/form/page/DVVNyd2J5RmV2UndQ"
  const element = document.createElement("a");
  element.style.display = "none";
  // element.href = bilibiliHref;
  // element.href = devHerf;
  element.href = excelHref;
  element.click();
}

onMounted(() => {

  initOperatorsList();

});
</script>
