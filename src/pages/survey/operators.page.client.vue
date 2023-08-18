<template>
  <div class="survey_character_page">
    <!-- 常驻条 -->
    <div class="setup_top">
      <characterDemo></characterDemo>
      <button class="mdui-btn survey_button">干员持有率：114 / 514</button>
      <button class="mdui-btn survey_button" @click="upload()">保存数据</button>
      <div id="updateTime">上次保存时间<br>{{ uploadMessage.updateTime }}</div>
    </div>

    <!-- 设置区域 -->
    <div class="setup_wrap">
      <div class="control_panel">
        <!-- <div class="switch_title">设置</div> -->

        <div class="btn_setup" @click="barCollapse('switch_bar select', 'element_switch_wrap')">
          筛选/批量操作
          <div class="btn_setup_tips">可筛选后批量进行填写</div>
        </div>

        <div class="btn_setup" @click="barCollapse('switch_bar upload', 'element_upload_wrap')">
          数据导入/导出
          <div class="btn_setup_tips">导入/导出json/Excel等</div>
        </div>

        <!-- <div class="btn_setup">
          模式切换
          <div class="btn_setup_tips">当前模式：标准统计<br />仅持有/标准统计/高级统计</div>
        </div> -->

        <div class="btn_setup" @click="changeSurveyType()">
          问卷类型切换
          <div class="btn_setup_tips">当前问卷：{{ surveyTypeText }}</div>
        </div>
        <div class="btn_setup">
          开发信息
          <div class="btn_setup_tips">反馈、建议<br /></div>
        </div>

        <!-- <div class="btn_setup">
          最后一次自动保存于
          <div class="btn_setup_tips btn_setup_tips_wran">
            {{ uploadMessage.updateTime }}<br />
            每30秒自动保存一次
          </div>
        </div>

        <div class="btn_setup" @click="upload()">
          手动上传数据
          <div class="btn_setup_tips">建议退出网页前手动保存一下</div>
        </div> -->

        <!--    以下噶掉
       <div :class="btnSetClass(simpleCard)" @click="changeSurveyCard()">仅显示头像</div>
        <div class="btn_setup" @click="changeSurveyType()">{{ surveyTypeText }}</div>
        <div class="btn_setup" @click="automaticUpload()">上传数据</div>
        <div class="btn_setup" @click="exportExcel()">{{ exportExcelBtnText }}</div>

        <div class="btn_setup btn_upload">
          <div class="input_upload_wrap">
            <div class="upload_file_text">{{ uploadFileName }}</div>
            <input id="uploadInput" type="file" class="input_upload" @input="getUploadFileName()" />
          </div>
        </div>
        <div class="btn_setup" @click="uploadByExcel">上传EXCEL</div>
        <div class="btn_setup"><characterDemo></characterDemo></div> -->
      </div>
    </div>

    <!-- 筛选模块 -->
    <div class="switch_wrap" id="element_switch_wrap">
      <div class="switch_bar select">
        <div class="switch_title">职业</div>
        <div class="switch_btns_wrap">
          <div :class="selectedBtn('profession', profession.value)" v-for="profession in professionDict" @click="addFilterRule('profession', profession.value)">
            {{ profession.label }}
          </div>
        </div>
      </div>

      <div class="switch_bar select">
        <div class="switch_title">稀有度</div>
        <div class="switch_btns_wrap">
          <div :class="selectedBtn('rarity', rarity)" v-for="rarity in rarityDict" @click="addFilterRule('rarity', rarity)">{{ rarity }}★</div>
        </div>
      </div>

      <div class="switch_bar select">
        <div class="switch_title">年份</div>
        <div class="switch_btns_wrap">
          <div :class="selectedBtn('year', key)" v-for="(year, key) in yearDict" :key="key" @click="addFilterRule('year', key)">
            {{ year.label }}
          </div>
        </div>
      </div>

      <div class="switch_bar select">
        <div class="switch_title">其他</div>
        <div class="switch_btns_wrap">
          <div :class="selectedBtn('own', true)" id="other1" @click="addFilterRule('own', true)">已拥有</div>
          <div :class="selectedBtn('own', false)" id="other2" @click="addFilterRule('own', false)">未拥有</div>
          <div :class="selectedBtn('mod', true)" id="other3" @click="addFilterRule('mod', true)">模组已实装</div>
          <div :class="selectedBtn('mod', false)" id="other4" @click="addFilterRule('mod', false)">模组未实装</div>
          <div :class="selectedBtn('itemObtainApproach', 0)" id="other5" @click="addFilterRule('itemObtainApproach', 0)">赠送干员</div>
          <div :class="selectedBtn('itemObtainApproach', 0)" id="other5" @click="addFilterRule('itemObtainApproach', 0)">限定干员</div>
        </div>
      </div>

      <div class="switch_bar select">
        <div class="switch_title">练度</div>
        <div class="switch_btns_wrap">
          <div :class="selectedBtn('mod', false)" id="other4" @click="addFilterRule('mod', false)">无专三</div>
          <div :class="selectedBtn('mod', false)" id="other4" @click="addFilterRule('mod', false)">一个专三</div>
          <div :class="selectedBtn('mod', false)" id="other4" @click="addFilterRule('mod', false)">两个专三</div>
          <div :class="selectedBtn('mod', false)" id="other4" @click="addFilterRule('mod', false)">三个专三</div>
          <div :class="selectedBtn('mod', false)" id="other4" @click="addFilterRule('mod', false)">未开模组</div>
          <div :class="selectedBtn('mod', false)" id="other4" @click="addFilterRule('mod', false)">已开模组</div>
        </div>
      </div>

      <div class="switch_bar select">
        <div class="switch_title">排序</div>
        <div class="switch_btns_wrap">
          <div class="btn_switch">按职业</div>
          <div class="btn_switch" @click="sortCharacterList('rarity')">按稀有度</div>
          <div class="btn_switch" @click="sortCharacterList('date')">按实装顺序</div>
        </div>
      </div>

      <div class="mdui-divider"></div>

      <div class="switch_bar select">
        <div class="switch_title">批量操作
          <!-- <br><div style="font-size: 12px;">仅对被筛选的干员生效</div> -->
        </div>
        <div class="switch_btns_wrap">
          <div class="btn_switch" @click="batchUpdatesOwn(true)">全部设为已拥有</div>
          <div class="btn_switch" @click="batchUpdatesOwn(false)">全部设为未拥有</div>
          <div class="btn_switch" @click="batchUpdatesElite(2)">全部设为精二</div>
          <div class="btn_switch" >全部设为满级</div>
          <div class="btn_switch" >全部设为满潜能</div>
          <div class="btn_switch" @click="batchUpdatesSkillAndMod('skill1', 3)">一技能专三</div>
          <div class="btn_switch" @click="batchUpdatesSkillAndMod('skill2', 3)">二技能专三</div>
          <div class="btn_switch" @click="batchUpdatesSkillAndMod('skill3', 3)">三技能专三</div>
          <div class="btn_switch" @click="batchUpdatesSkillAndMod('modX', 3)">X模组三级</div>
          <div class="btn_switch" @click="batchUpdatesSkillAndMod('modY', 3)">Y模组三级</div>
        </div>
      </div>
    </div>

     <!-- 导入导出模块 -->
    <div class="switch_wrap" id="element_upload_wrap">
      <div class="switch_bar upload">
        <div class="switch_title">导入导出</div>
        <div class="switch_btns_wrap">
          <div class="btn_switch" @click="exportExcel()">导出到Excel</div>
          <div class="btn_switch">
            <div class="input_upload_wrap">
              选择文件
              <input id="uploadInput" type="file" class="input_upload" @input="getUploadFileName()" />
            </div>
          </div>
          <div class="btn_switch" @click="uploadByExcel()">上传文件</div>
          <div class="upload_file_name">文件名：{{ uploadFileName }}</div>
        </div>
      </div>
    </div>

    <!-- 统计模块 -->
    <div class="switch_wrap" id="element_stats_wrap">
      <div class="switch_bar upload">
        <div class="switch_title">导入导出</div>
        <div class="switch_btns_wrap">
          <div class="btn_switch" @click="exportExcel()">导出到Excel</div>
          <div class="btn_switch">
            <div class="input_upload_wrap">
              选择文件
              <input id="uploadInput" type="file" class="input_upload" @input="getUploadFileName()" />
            </div>
          </div>
          <div class="btn_switch" @click="uploadByExcel()">上传文件</div>
          <div class="upload_file_name">文件名：{{ uploadFileName }}</div>
        </div>
      </div>
    </div>


    <!-- 干员组 -->
    <div class="char_forms">
      <div :class="simpleCardClass()" v-for="(char, char_index) in characterList" :key="char_index" v-show="char.show">
        <!-- 左半部分 -->
        <div :class="surveyTypeClass('card_option_left')">
          <div :class="surveyTypeClass('card_option_top_left')">
            <div class="avatar_at_top">
              <div class="image_avatar" @click="updateOwn(char_index, !char.own, true)">
                <div :class="getSprite(char.charId)"></div>
              </div>
              <div class="char_name">{{ char.name }}</div>
            </div>
            <div :class="surveyTypeClass('potential_wrap')">
              <div class="image_potential" :id="char_index + 'potential' + rank" v-for="rank in ranks.slice(1, 7)" @click="updatePotential(char_index, rank)">
                <div :class="getSprite('potential' + rank, 'potential')"></div>
              </div>
            </div>
          </div>

          <!--  -->
          <div :class="surveyTypeClass('elite_wrap')">
            <div class="image_elite" :id="char_index + 'elite0'" @click="updateElite(char_index, 0)">
              <div :class="getSprite('elite0', 'elite')"></div>
            </div>
            <div :id="char_index + 'elite1'" class="image_elite" @click="updateElite(char_index, 1)" v-show="char.rarity > 2">
              <div :class="getSprite('elite1', 'elite')"></div>
            </div>
            <div :id="char_index + 'elite2'" class="image_elite" @click="updateElite(char_index, 2)" v-show="char.rarity > 3">
              <div :class="getSprite('elite2', 'elite')"></div>
            </div>
            <div class="image_elite" :id="char_index + 'level'" @click="updateLevel(char_index, char.rarity, char.elite)">
              <img class="image_lvMax" src="/image/rank2/lvMax.png" alt="" />
            </div>
          </div>
        </div>

        <!-- 右半部分 -->
        <!-- 技能 -->
        <div class="card_option_right">
          <div v-for="(skill, skill_index) in char.skill" :key="skill_index" :class="surveyTypeClass('skill_wrap')">
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
          <div :class="surveyTypeClass('skill_wrap')" v-show="char.modXOwn">
            <div class="image_mod">{{ "模组X" }}</div>
            <div v-for="rank in ranks.slice(1, 4)" class="image_rank" :id="char_index + 'modX' + rank" @click="updateSkillAndMod(char_index, 'modX', rank)">
              <div :class="getSprite('mod' + rank, 'mod')"></div>
            </div>
          </div>

          <!-- 没有模组X显示 -->
          <div :class="surveyTypeClass('skill_wrap')" v-show="!char.modXOwn">
            <div class="image_mod">[N/A]</div>
            <div v-for="rank in ranks.slice(1, 4)" class="image_rank">
              <img class="image_null" src="/image/rank2/null.png" alt="" />
            </div>
          </div>

          <!-- 模组Y -->
          <div :class="surveyTypeClass('skill_wrap')" v-show="char.modYOwn">
            <div class="image_mod">{{ "模组Y" }}</div>

            <div v-for="rank in ranks.slice(1, 4)" class="image_rank" :id="char_index + 'modY' + rank" @click="updateSkillAndMod(char_index, 'modY', rank)">
              <div :class="getSprite('mod' + rank, 'mod')"></div>
            </div>
          </div>

          <!-- 没有模组Y显示 -->
          <div :class="surveyTypeClass('skill_wrap')" v-show="!char.modYOwn">
            <div class="image_mod">[N/A]</div>
            <div v-for="rank in ranks.slice(1, 4)" class="image_rank">
              <img class="image_null" src="/image/rank2/null.png" alt="" />
            </div>
          </div>
        </div>

        <div class="card-overlay" v-show="'简易问卷' != surveyTypeText && !characterList[char_index].own">
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
import { cMessage } from "@/element/message.js";
import { globalUserData } from "./userService"; //从用户服务js获取用户信息
import { characterListInit, professionDict, yearDict, barCollapse } from "./commonUtils"; //基础信息（干员基础信息列表，干员职业字典，干员星级）
import characterDemo from "@/pages/survey/characterDemo.vue";
import surveyApi from "@/api/survey";
import { onMounted, ref, watch } from "vue";
import "@/assets/css/survey_character.css";
import { http } from "@/api/baseURL";

function getSprite(id, type) {
  if ("mod" == type) return "bg-" + id + " sprite_mod";
  if ("skill" == type) return "bg-" + id + " sprite_skill";
  if ("elite" == type) return "bg-" + id + " sprite_elite";
  if ("potential" == type) return "bg-" + id + " sprite_potential";
  if ("icon" == type) return "bg-skill_icon_" + id + " sprite_skill_icon";
  return "bg-" + id + " sprite_avatar";
}

let characterList = ref(characterListInit());
let ranks = ref([0, 1, 2, 3, 4, 5, 6]);
let rarityDict = [1, 2, 3, 4, 5, 6];

//找回填写过的角色信息
function getSurveyCharacter() {
  surveyApi.getSurveyCharacter(globalUserData.value.token).then((response) => {
    let list = response.data; //后端返回的数据

    //转为前端的数据格式
    for (var i = 0; i < characterList.value.length; i++) {
      // characterList.value[i].own =false;
      for (var j = 0; j < list.length; j++) {
        if (list[j].charId == characterList.value[i].charId) {
          if (!list[j].own) continue;
          characterList.value[i].elite = list[j].elite;

          characterList.value[i].level = list[j].level;
          characterList.value[i].potential = list[j].potential;
          characterList.value[i].skill1 = list[j].skill1;
          characterList.value[i].skill2 = list[j].skill2;
          characterList.value[i].skill3 = list[j].skill3;
          characterList.value[i].modX = list[j].modX;
          characterList.value[i].modY = list[j].modY;
          characterList.value[i].own = list[j].own;

          if (characterList.value[i].level > -1) {
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

let exportExcelBtnText = ref("导出excel");

//导出评分表的excel
function exportExcel() {
  exportExcelBtnText.value = "导出中···";
  const exportExcelUrl = http + "survey/character/export?token=" + globalUserData.value.token;
  var element = document.createElement("a");
  element.download = "form.xlsx";
  element.style.display = "none";
  element.href = exportExcelUrl;
  element.click();
  setTimeout(() => {
    exportExcelBtnText.value = "导出excel";
  }, 5000);
}

let lastUploadTimeStamp = 1689425013364; //上次上传时间的时间戳
let uploadMessage = ref({ updateTime: "2023/08/08 00:00:00", affectedRows: 0 }); //上传APi返回的信息
let updateIndexMap = ref({}); //每次点击操作记录下被更新的干员的索引，只上传被修改过的干员

//自动上传风评表
function automaticUpload() {
  //方法触发时的时间戳
  let nowUploadTimeStamp = Date.parse(new Date());
  //与上一次自动上传时间的间隔
  let uploadFrequency = nowUploadTimeStamp - lastUploadTimeStamp;
  // 检查用户是否登录
  if (globalUserData.value.token == void 0) {
    console.log(globalUserData.value.token == void 0);
    cMessage("未登录", "error");
    return;
  }
  //上传间隔小于30s退出方法
  if (uploadFrequency < 30000) return;
  console.log("上传频率：", uploadFrequency / 1000, "s");

  //上传的数据
  let uploadList = uploadDataReduction();

  surveyApi.uploadCharacter(uploadList, globalUserData.value.token).then((response) => {
    uploadMessage.value = response.data;
    updateIndexMap.value = {};
    cMessage("自动保存成功");
  });

  lastUploadTimeStamp = nowUploadTimeStamp;
}

//手动上传
function upload() {
  let uploadList = uploadDataReduction();
  surveyApi.uploadCharacter(uploadList, globalUserData.value.token).then((response) => {
    uploadMessage.value = response.data;
    cMessage("手动保存成功");
    updateIndexMap.value = {};
  });
}

let uploadFileName = ref("上传的文件名");

// 将需要上传的数据去除无用信息
function uploadDataReduction() {
  let uploadList = [];
  console.log(updateIndexMap.value);

  for (const i in updateIndexMap.value) {
    const character = {
      charId: characterList.value[i].charId,
      own: characterList.value[i].own,
      rarity: characterList.value[i].rarity,
      elite: characterList.value[i].elite,
      level: characterList.value[i].level,
      potential: characterList.value[i].potential,
      skill1: characterList.value[i].skill1,
      skill2: characterList.value[i].skill2,
      skill3: characterList.value[i].skill3,
      modX: characterList.value[i].modX,
      modY: characterList.value[i].modY,
    };
    console.log(character);
    uploadList.push(character);
  }

  return uploadList;
}

//显示文件名称
function getUploadFileName() {
  const file = document.getElementById("uploadInput");
  uploadFileName.value = file.files[0].name;
}

//通过excel上传
function uploadByExcel() {
  const file = document.getElementById("uploadInput");
  let formData = new FormData();
  formData.append("file", file.files[0]);
  console.log(file);
  surveyApi.uploadCharacterByExcel(formData, globalUserData.value.token).then((response) => {
    // console.log(response.data);
    cMessage("新增了 " + response.data.insertRows + " 条");
    cMessage("更新了 " + response.data.updateRows + " 条");
  });
}

let maaData = ref([{}]);

function maaData1() {
  let dataJson = JSON.parse(maaData.value);
  for (let i in dataJson) {
  }
}

//更新是否持有
function updateOwn(char_index, newVal) {
  updateIndexMap.value[char_index] = char_index; //记录更新的干员的索引

  const character = characterList.value[char_index];
  characterList.value[char_index].own = newVal;
  const oldElite = characterList.value[char_index].elite; //旧精英等级
  const oldPotential = characterList.value[char_index].potential; //旧潜能等级

  if (newVal) {
    //点击拥有且干员三星以上，设为精英等级2，潜能1
    if (character.rarity > 3) {
      characterList.value[char_index].elite = 2;
      cancelAndUpdateOption(char_index + "elite", 2, oldElite);
      characterList.value[char_index].potential = 1;
      cancelAndUpdateOption(char_index + "potential", 1, oldPotential);
    }
  } else {
    //点击未拥有时，撤销所有选项
    let attributeList = ["elite", "potential", "skill1", "skill2", "skill3", "modX", "modY"];
    for (let attribute of attributeList) {
      updateOption(char_index + attribute + character[attribute], false);
      characterList.value[char_index][attribute] = -1;
    }
    updateOption(char_index + "level", false);
  }

  automaticUpload();
}

//批量更新是否持有
function batchUpdatesOwn(newVal) {
  for (let index in characterList.value) {
    if (characterList.value[index].show) {
      characterList.value[index].own = newVal;
      updateIndexMap.value[index] = index;
    }
  }
}

//更新精英化等级
function updateElite(char_index, newVal) {
  //记录更新过信息的干员的索引
  updateIndexMap.value[char_index] = char_index;
  //需要修改的elementId
  let elementId = char_index + "elite";
  //需要删去的旧值
  let oldVal = characterList.value[char_index].elite;
  // console.log("更新精英化——", "新值：", newVal, "，旧值：", oldVal, "，结果：", newVal == oldVal);
  //新旧值相同直接取消选项背景色，并更新精英等级为-1
  if (newVal == oldVal) {
    characterList.value[char_index].elite = -1;
    updateOption(elementId + oldVal, false);
    return;
  }

  //更新精英等级并取消旧值的选项背景色，给新值的选项加上选项背景色
  characterList.value[char_index].elite = newVal;
  cancelAndUpdateOption(elementId, newVal, oldVal);
  characterList.value[char_index].own = true;

  automaticUpload();
}

// 批量精英化
function batchUpdatesElite(newVal) {
  for (let index in characterList.value) {
    if (characterList.value[index].show && characterList.value[index].own) {
      let elementId = index + "elite";
      let oldVal = characterList.value[index].elite;
      characterList.value[index].elite = newVal;
      cancelAndUpdateOption(elementId, newVal, oldVal);
      updateIndexMap.value[index] = index;
    }
  }
}

//更新专精或模组等级
function updateSkillAndMod(char_index, attribute, newVal) {
  updateIndexMap.value[char_index] = char_index;
  //需要修改的elementId
  let elementId = char_index + attribute;
  //需要删去的旧值
  let oldVal = characterList.value[char_index][attribute];
  let oldElite = characterList.value[char_index].elite;
  // console.log("更新专精模组——", "新值：", newVal, "，旧值：", oldVal, "，结果：", newVal == oldVal);

  //新旧值相同直接取消选项背景色，并更新专精/模组等级为-1
  if (newVal == oldVal) {
    characterList.value[char_index][attribute] = -1;
    updateOption(elementId + oldVal, false);
    return;
  }

  //更新精英等级并取消旧值的选项背景色，给新值的选项加上选项背景色
  characterList.value[char_index][attribute] = newVal;
  cancelAndUpdateOption(elementId, newVal, oldVal);

  //如果干员是三星以上，自动更新精英等级为2
  if (characterList.value[char_index].rarity > 3) {
    characterList.value[char_index].elite = 2;
    cancelAndUpdateOption(char_index + "elite", 2, oldElite);
  }

  characterList.value[char_index].own = true;

  // console.log("专精模组:", JSON.stringify(characterList.value[char_index], null, 2));

  automaticUpload();
}

// 批量专精或模组
function batchUpdatesSkillAndMod(attribute, newVal) {
  for (let index in characterList.value) {
    if (!(characterList.value[index].show && characterList.value[index].own)) continue;
    if ("modX" == attribute && !characterList.value[index].modXOwn) {
      console.log("没有x模组");
      continue;
    }
    if ("modY" == attribute && !characterList.value[index].modYOwn) {
      console.log("没有y模组");
      continue;
    }
    if ("skill3" == attribute && characterList.value[index].rarity < 6) {
      console.log("6星以下没有三技能");
      continue;
    }

    if ("skill2" == attribute && characterList.value[index].rarity < 4) {
      console.log("4星以下没有三技能");
      continue;
    }

    let elementId = index + attribute;
    let oldVal = characterList.value[index][attribute];
    characterList.value[index][attribute] = newVal;

    cancelAndUpdateOption(elementId, newVal, oldVal);
    updateIndexMap.value[index] = index;
  }
}

//更新潜能
function updatePotential(char_index, newVal) {
  //记录更新过信息的干员的索引
  updateIndexMap.value[char_index] = char_index;
  //需要修改的elementId
  let elementId = char_index + "potential";
  //需要删去的旧值
  let oldVal = characterList.value[char_index].potential;
  // console.log("更新潜能——", "新值：", newVal, "，旧值：", oldVal, "，结果：", newVal == oldVal);
  //新旧值相同直接取消选项背景色，并更新潜能等级为-1
  if (newVal == oldVal) {
    characterList.value[char_index].potential = -1;
    updateOption(elementId + oldVal, false);
    return;
  }

  //更新潜能等级并取消旧值的选项背景色，给新值的选项加上选项背景色
  characterList.value[char_index].potential = newVal;
  cancelAndUpdateOption(elementId, newVal, oldVal);
  characterList.value[char_index].own = true;

  automaticUpload();
}

//最大等级
function updateLevel(char_index, rarity) {
  //记录更新过信息的干员的索引
  updateIndexMap.value[char_index] = char_index;

  let level = -1;
  //旧精英等级
  let oldElite = characterList.value[char_index].elite;

  characterList.value[char_index].own = true;
  //如果是满级则取消满级，并将选项背景色去除
  if (characterList.value[char_index].level > 0) {
    characterList.value[char_index].level = level;
    updateOption(char_index + "level", false);
    return;
  }

  // 根据星级更新精英等级和等级
  if (rarity == 6) {
    level = 90;
    characterList.value[char_index].elite = 2;
    cancelAndUpdateOption(char_index + "elite", 2, oldElite);
  }
  if (rarity == 5) {
    level = 80;
    characterList.value[char_index].elite = 2;
    cancelAndUpdateOption(char_index + "elite", 2, oldElite);
  }
  if (rarity == 4) {
    level = 70;
    characterList.value[char_index].elite = 2;
    cancelAndUpdateOption(char_index + "elite", 2, oldElite);
  }
  if (rarity == 3) {
    level = 55;
    characterList.value[char_index].elite = 1;
    cancelAndUpdateOption(char_index + "elite", 1, oldElite);
  }
  if (rarity < 3) {
    level = 30;
    characterList.value[char_index].elite = 0;
    cancelAndUpdateOption(char_index + "elite", 0, oldElite);
  }

  if (level == -1) return;

  characterList.value[char_index].level = level;

  //更新等级选项背景色
  updateOption(char_index + "level", true);

  // console.log("等级:", JSON.stringify(characterList.value[char_index], null, 2));

  automaticUpload();
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

function updateBackBeforecancel(elementIdHeader, rank, oldRank) {
  updateOption(elementIdHeader + rank, true);
  updateOption(elementIdHeader + oldRank, false);
}

// 修改选项的背景色
function updateOption(elementId, selected) {
  // 干员数据是一个数组，每个选项的element的id为 索引+属性名，例如 第一个干员号角的3技能的id是 '0skill3'
  console.log("修改的元素id", elementId);
  let element = document.getElementById(elementId);
  if (element == null) return;
  if (selected) {
    console.log("添加背景色id", elementId);
    element.style.backgroundColor = "rgba(255, 115, 0, 0.5)";
  } else {
    console.log("取消背景色id", elementId);
    element.style.backgroundColor = "rgba(127, 127, 127, 0.1)";
  }
}

let surveyTypeText = ref("标准问卷");
let surveyType = ref("_basic");
//简易卡片样式
let simpleCard = ref(false);

//标准问卷与完整问卷
function changeSurveyType() {
  if ("简易问卷" == surveyTypeText.value) {
    surveyType.value = "_basic";
    surveyTypeText.value = "标准问卷";
    simpleCard.value = !simpleCard.value;
    return;
  }
  if ("标准问卷" == surveyTypeText.value) {
    surveyType.value = "";
    surveyTypeText.value = "完整问卷";
    return;
  }

  if ("完整问卷" == surveyTypeText.value) {
    surveyType.value = "";
    simpleCard.value = !simpleCard.value;
    surveyTypeText.value = "简易问卷";
    return;
  }
}

function surveyTypeClass(classNameHeader) {
  return classNameHeader + surveyType.value;
}
//
function simpleCardClass() {
  if (simpleCard.value) return "char_card char_card_simple";
  return "char_card";
}



let filterRules = ref({ rarity: [], profession: [], year: [], own: [], mod: [], itemObtainApproach: [] });

//判断按钮是否选中
function selectedBtn(attribute, rule) {
  if (filterRules.value[attribute].indexOf(rule) > -1) {
    return "btn_switch selected_color";
  }
  return "btn_switch";
}

//增加筛选规则
function addFilterRule(attribute, rule) {
  console.log(filterRules.value);
  let filterRulesCopy = [];
  if (filterRules.value[attribute].indexOf(rule) > -1) {
    for (let i in filterRules.value[attribute]) {
      if (rule != filterRules.value[attribute][i]) {
        filterRulesCopy.push(filterRules.value[attribute][i]);
      }
    }
    filterRules.value[attribute] = filterRulesCopy;
    filterCharacterList();
    return;
  }

  filterRules.value[attribute].push(rule);
  filterCharacterList();
}

//筛选
function filterCharacterList() {
  for (let i in characterList.value) {
    var character = characterList.value[i];
    let isRarity = isAttribute(character, "rarity");
    let isProfession = isAttribute(character, "profession");
    let isOwn = isAttribute(character, "own");
    let isMod = isAttribute(character, "mod");
    let isItemObtainApproach = isAttribute(character, "itemObtainApproach");
    let isYearFlag = isYear(character);
    characterList.value[i].show = isRarity & isProfession & isYearFlag & isOwn & isMod & isItemObtainApproach;
  }
}

//是否有这个属性
function isAttribute(character, attribute) {
  if (filterRules.value[attribute].length == 0) return true;
  for (let r in filterRules.value[attribute]) {
    // console.log(character, '==' , filterRules.value[attribute][r])
    if (character[attribute] == filterRules.value[attribute][r]) {
      return true;
    }
  }
  return false;
}

//是否在这个年份
function isYear(character) {
  if (filterRules.value.year.length == 0) return true;
  for (let r in filterRules.value.year) {
    // console.log(filterRules.value.year[r])
    let year = yearDict[filterRules.value.year[r]];
    // console.log(character.date, ">=", year.start, character.date, "<=", year.end);
    if (character.date >= year.start && character.date <= year.end) {
      return true;
    }
  }
  return false;
}

//按条件排序
function sortCharacterList(rule) {
  characterList.value.sort((a, b) => {
    return b[rule] - a[rule];
  });
}

onMounted(() => {
  getSurveyCharacter();
  addFilterRule("rarity", 6);
});
</script>
