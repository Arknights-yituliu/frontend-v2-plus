<template>
  <div class="survey_character_page">
    <!-- 设置区域 -->

    <div class="setup_wrap">
      <div class="control_panel">
        <!-- <div class="switch_title">设置</div> -->
        <characterDemo></characterDemo>

        <div :class="btnSetClass(filterCollapse)" @click="setBarCollapse()">
          筛选/批量操作
          <div class="btn_setup_tips">筛选，然后批量操作<br />高效填写</div>
        </div>

        <div class="btn_setup">
          数据导入/导出
          <div class="btn_setup_tips">导出到Excel<br />或从Excel/MAA导入数据</div>
        </div>

        <!-- <div class="btn_setup">
          模式切换
          <div class="btn_setup_tips">当前模式：标准统计<br />仅持有/标准统计/高级统计</div>
        </div> -->
        <div class="btn_setup">
          统计数据
          <div class="btn_setup_tips">干员持有率：114 / 514<br />点击查看更多</div>
        </div>
        <div class="btn_setup" @click="changeSurveyType()">
          问卷类型切换
          <div class="btn_setup_tips">当前问卷：{{ surveyTypeText }}<br />简易/标准/完整问卷</div>
        </div>
        <div class="btn_setup">
          开发信息
          <div class="btn_setup_tips">反馈、建议<br /></div>
        </div>

        <div class="btn_setup">
          最后保存时间
          <div class="btn_setup_tips btn_setup_tips_wran">
            {{ uploadMessage.updateTime }}<br />

            更新&nbsp;{{ uploadMessage.affectedRows }}条
          </div>
        </div>

        <!--    以下噶掉
       <div :class="btnSetClass(simpleCard)" @click="changeSurveyCard()">仅显示头像</div>
        <div class="btn_setup" @click="changeSurveyType()">{{ surveyTypeText }}</div>
        <div class="btn_setup" @click="upload()">上传数据</div>
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

    <div class="switch_wrap" id="dom_switch_wrap">
      <div class="switch_bar">
        <div class="switch_title">职业</div>
        <div class="switch_btns_wrap">
          <div :class="selectedBtn('profession', profession.value)" v-for="profession in professionDict" @click="addFilterRule('profession', profession.value)">
            {{ profession.label }}
          </div>
        </div>
      </div>

      <div class="switch_bar">
        <div class="switch_title">稀有度</div>
        <div class="switch_btns_wrap">
          <div :class="selectedBtn('rarity', rarity)" v-for="rarity in rarityDict" @click="addFilterRule('rarity', rarity)">{{ rarity }}★</div>
        </div>
      </div>

      <div class="switch_bar">
        <div class="switch_title">年份</div>
        <div class="switch_btns_wrap">
          <div :class="selectedBtn('year', key)" v-for="(year, key) in yearDict" :key="key" @click="addFilterRule('year', key)">
            {{ year.label }}
          </div>
        </div>
      </div>

      <div class="switch_bar">
        <div class="switch_title">其他</div>
        <div class="switch_btns_wrap">
          <div :class="selectedBtn('own', true)" id="other1" @click="addFilterRule('own', true)">已拥有</div>
          <div :class="selectedBtn('own', false)" id="other2" @click="addFilterRule('own', false)">未拥有</div>
          <div :class="selectedBtn('mod', true)" id="other3" @click="addFilterRule('mod', true)">模组已实装</div>
          <div :class="selectedBtn('mod', false)" id="other4" @click="addFilterRule('mod', false)">模组未实装</div>
          <div :class="selectedBtn('itemObtainApproach', 0)" id="other5" @click="addFilterRule('itemObtainApproach', 0)">赠送干员</div>
        </div>
      </div>

      <div class="switch_bar">
        <div class="switch_title">排序</div>
        <div class="switch_btns_wrap">
          <div class="btn_switch" @click="sortCharacterList('rarity')">稀有度顺序</div>
          <div class="btn_switch" @click="sortCharacterList('date')">实装顺序</div>
        </div>
      </div>

      <div class="switch_bar">
        <div class="switch_title">批量操作</div>
        <div class="switch_btns_wrap">
          <div class="btn_switch" @click="batchUpdatesOwn(true)">全部拥有</div>
          <div class="btn_switch" @click="batchUpdatesOwn(false)">全部设为未拥有</div>
          <div class="btn_switch" @click="batchUpdatesElite(2)">全部设为精二</div>
          <div class="btn_switch" @click="batchUpdatesSkillAndMod('skill1', 3)">一技能专三</div>
          <div class="btn_switch" @click="batchUpdatesSkillAndMod('skill2', 3)">二技能专三</div>
          <div class="btn_switch" @click="batchUpdatesSkillAndMod('skill3', 3)">三技能专三</div>
          <div class="btn_switch" @click="batchUpdatesSkillAndMod('modX', 3)">X模组三级</div>
          <div class="btn_switch" @click="batchUpdatesSkillAndMod('modY', 3)">Y模组三级</div>
        </div>
      </div>
    </div>

    <div class="switch_wrap" style="height: auto">
      <div class="switch_bar">
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
              <div class="image_avatar">
                <div @click="updateOwn(char_index, !char.own)" :class="getSprite(char.charId)"></div>
              </div>
              <div class="char_name">{{ char.name }}</div>
            </div>
            <div :class="surveyTypeClass('potential_wrap')">
              <div
                class="image_potential"
                :id="char_index + 'potential' + rank"
                v-for="rank in ranks.slice(1, 7)"
                @click="updatePotential(char_index, 'potential', rank)"
              >
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
          <div class="card-overlay-detail">点击干员头像设为拥有</div>
        </div>
      </div>
    </div>

    <!-- 数据声明 -->
    <!-- <div class="char_card">此处安放版权声明/开发信息</div> -->
    <div class="footer_info">
      除非另有声明，网站其他内容采用
      <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/">知识共享署名-非商业性使用-相同方式共享</a>授权。
    </div>
    <div></div>
  </div>
</template>

<script setup>
import { cMessage } from "@/element/message.js";
import { globalUserData } from "./userService";
import { characterListInit, professionDict, rarityDict, yearDict } from "./baseData";
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

//找回填写过的角色信息
function getSurveyCharacter() {
  surveyApi.getSurveyCharacter(globalUserData.value.token).then((response) => {
    let list = response.data;
    for (var i = 0; i < characterList.value.length; i++) {
      // characterList.value[i].own =false;
      for (var j = 0; j < list.length; j++) {
        if (list[j].charId == characterList.value[i].charId) {
          characterList.value[i].elite = list[j].elite;
          characterList.value[i].level = list[j].level;
          characterList.value[i].potential = list[j].potential;
          characterList.value[i].skill1 = list[j].skill1;
          characterList.value[i].skill2 = list[j].skill2;
          characterList.value[i].skill3 = list[j].skill3;
          characterList.value[i].modX = list[j].modX;
          characterList.value[i].modY = list[j].modY;
          characterList.value[i].own = list[j].own;
        }
      }
    }
    cMessage("导入了 " + list.length + " 条数据");
  });
}

let exportExcelBtnText = ref("导出excel");

//导出评分表的excel
function exportExcel() {
  exportExcelBtnText.value = "导出中";
  const exportExcelUrl = http + "survey/character/export?token=" + globalUserData.value.token;
  var dom = document.createElement("a");
  dom.download = "form.xlsx";
  dom.style.display = "none";
  dom.href = exportExcelUrl;
  dom.click();
  setTimeout(() => {
    exportExcelBtnText.value = "导出excel";
  }, 5000);
}

let lastUploadTimeStamp = 1689425013364;
let uploadMessage = ref({ updateTime: "00:00:00", affectedRows: 0});
let updateIndexMap = ref({})

//上传风评表
function upload() {
  let uploadList = [];
  console.log(updateIndexMap.value);
  
  
  for (const i in updateIndexMap.value) {
    const character = {
      charId: characterList.value[i].charId,
      own: characterList.value[i].own,
      elite: characterList.value[i].elite,
      level: characterList.value[i].level,
      potential: characterList.value[i].potential,
      skill1: characterList.value[i].skill1,
      skill2: characterList.value[i].skill2,
      skill3: characterList.value[i].skill3,
      modX: characterList.value[i].modX,
      modY: characterList.value[i].modY,
    };
    uploadList.push(character);
  }

  
  let nowUploadTimeStamp = Date.parse(new Date());
  let uploadFrequency = nowUploadTimeStamp - lastUploadTimeStamp;
  
  if (uploadFrequency < 5000)  return;
  if (globalUserData.value.token == void 0)   {
    console.log(globalUserData.value.token == void 0)
    cMessage("未登录",'error')
    return;
  }

  console.log("上传频率：", uploadFrequency / 1000, "s");
  
    surveyApi.uploadCharacter(uploadList, globalUserData.value.token).then((response) => {
      // console.log(response.data);
      lastUploadTimeStamp = nowUploadTimeStamp;
      uploadMessage.value = response.data;
      updateIndexMap.value = {}
    });
  
}

let uploadFileName = ref("null");

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

//控制筛选栏的展开
function setBarCollapse() {
  filterCollapse.value = !filterCollapse.value;
  if (filterCollapse.value) {
    let elements = document.getElementsByClassName("switch_bar");
    let height = 0;
    for (let e of elements) {
      height += e.offsetHeight;
    }
    document.getElementById("dom_switch_wrap").style.height = height + "px";
    console.log("展开高度", height + "px");
    setTimeout(() => {
      document.getElementById("dom_switch_wrap").style.height = "auto";
    }, 500);
  } else {
    let elements = document.getElementsByClassName("switch_bar");
    let height = 0;
    for (let e of elements) {
      height += e.offsetHeight;
    }
    document.getElementById("dom_switch_wrap").style.height = height + "px";

    setTimeout(() => {
      document.getElementById("dom_switch_wrap").style.height = 0 + "px";
    }, 100);
  }
}

let filterRules = ref({ rarity: [], profession: [], year: [], own: [], mod: [], itemObtainApproach: [] });
let filterCollapse = ref(false);

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

//更新是否持有
function updateOwn(char_index, newVal) {
  const character = characterList.value[char_index];
  characterList.value[char_index].own = newVal;
  const oldElite = characterList.value[char_index].elite;
  const oldPotential = characterList.value[char_index].potential;

  if (newVal) {
    if (character.rarity > 3) {
      characterList.value[char_index].elite = 2;
      cancelBackBeforeUpdate(char_index + "elite", 2, oldElite);
      characterList.value[char_index].potential = 1;
      cancelBackBeforeUpdate(char_index + "potential", 1, oldPotential);

    }
  } else {
    let attributeList = ["level", "elite", "potential", "skill1", "skill2", "skill3", "modX", "modY"];
    for (let attribute of attributeList) {
      setDomBackgroundColor(char_index + attribute + character[attribute],false);
      characterList.value[char_index][attribute] = -1;
    }
    setDomBackgroundColor(char_index + "level",false);
  }
  
  updateIndexMap.value[char_index]=char_index
  upload();
}

//批量更新是否持有
function batchUpdatesOwn(newVal) {
  for (let i in characterList.value) {
    if (characterList.value[i].show) {
      updateOwn(i, newVal);
    }
  }
}

//更新精英化等级
function updateElite(char_index, newVal) {
  let domId = char_index + "elite";
  let oldVal = characterList.value[char_index].elite;
  // console.log("更新精英化——", "新值：", newVal, "，旧值：", oldVal, "，结果：", newVal == oldVal);
  if (newVal == oldVal) {
    characterList.value[char_index].elite = -1;
    setDomBackgroundColor(domId+oldVal, false);
    // cancelSkillAndMod(char_index);
    return;
  }
  if (newVal < 2) {
    // cancelSkillAndMod(char_index);
  }
  characterList.value[char_index].elite = newVal;
  cancelBackBeforeUpdate(domId, newVal, oldVal, true);
  characterList.value[char_index].own = true;
  // console.log("精英化:", JSON.stringify(characterList.value[char_index], null, 2));
  
  updateIndexMap.value[char_index]=char_index
  upload();
}

//取消专精和模组等级
function cancelSkillAndMod(char_index) {
  let attributeList = ["skill1", "skill2", "skill3", "modX", "modY"];
  for (let attribute of attributeList) {
    cancelBackBeforeUpdate(char_index + attribute, -1, characterList.value[char_index][attribute]);
    characterList.value[char_index][attribute] = -1;
  }
}

// 批量精英化
function batchUpdatesElite(newVal) {
  for (let i in characterList.value) {
    if (characterList.value[i].show) {
      updateElite(char_index, newVal);
    }
  }
}


//更新专精或模组等级
function updateSkillAndMod(char_index, attribute, newVal) {
  let domId = char_index + attribute;
  let oldVal = characterList.value[char_index][attribute];
  let oldElite = characterList.value[char_index].elite;
  // console.log("更新专精模组——", "新值：", newVal, "，旧值：", oldVal, "，结果：", newVal == oldVal);
  if (newVal == oldVal) {
    characterList.value[char_index][attribute] = -1;
    setDomBackgroundColor(domId + oldVal, false);
    return;
  }

  characterList.value[char_index][attribute] = newVal;

  if (characterList.value[char_index].rarity > 3) {
    characterList.value[char_index].elite = 2;
    cancelBackBeforeUpdate(char_index + "elite", 2, oldElite);
  }

  cancelBackBeforeUpdate(domId, newVal, oldVal, true);
  characterList.value[char_index].own = true;

  // console.log("专精模组:", JSON.stringify(characterList.value[char_index], null, 2));

  updateIndexMap.value[char_index]=char_index
  upload();
}

// 批量精英化
function batchUpdatesSkillAndMod(attribute, newVal) {
  for (let i in characterList.value) {
    if (characterList.value[i].show) {
      updateSkillAndMod(char_index, attribute, newVal);
    }
  }
}

//更新潜能
function updatePotential(char_index, newVal) {
  let domId = char_index + "potential";
  let oldRank = characterList.value[char_index].potential;
  // console.log("更新潜能——", "新值：", newVal, "，旧值：", oldVal, "，结果：", newVal == oldVal);
  if (newVal == oldRank) {
    characterList.value[char_index].potential = -1;
    setDomBackgroundColor(domId + oldRank,false);
    return;
  }

  characterList.value[char_index].potential = newVal;
  cancelBackBeforeUpdate(domId, newVal, oldRank);
  characterList.value[char_index].own = true;

  // console.log("潜能:", JSON.stringify(characterList.value[char_index], null, 2));

  updateIndexMap.value[char_index]=char_index
  upload();
}

//最大等级
function updateLevel(char_index, rarity) {
  let level = 0;
  let oldElite = characterList.value[char_index].elite;

  characterList.value[char_index].own = true;
  if (characterList.value[char_index].level > 0) {
    characterList.value[char_index].level = level;
    setDomBackgroundColor(char_index + "level",false);
    return;
  }

  if (rarity == 6) {
    level = 90;
    characterList.value[char_index].elite = 2;
    cancelBackBeforeUpdate(char_index + "elite", 2, oldElite);
  }
  if (rarity == 5) {
    level = 80;
    characterList.value[char_index].elite = 2;
    cancelBackBeforeUpdate(char_index + "elite", 2, oldElite);
  }
  if (rarity == 4) {
    level = 70;
    characterList.value[char_index].elite = 2;
    cancelBackBeforeUpdate(char_index + "elite", 2, oldElite);
  }
  if (rarity == 3) {
    level = 55;
    characterList.value[char_index].elite = 1;
    cancelBackBeforeUpdate(char_index + "elite", 1, oldElite);
  }
  if (rarity < 3) {
    level = 30;
    characterList.value[char_index].elite = 0;
    cancelBackBeforeUpdate(char_index + "elite", 0, oldElite);
  }

  if (level == 0) return;

  characterList.value[char_index].level = level;
  setDomBackgroundColor(char_index + "level",true);

  // console.log("等级:", JSON.stringify(characterList.value[char_index], null, 2));

  updateIndexMap.value[char_index]=char_index
  upload();
}

//选中标题
function btnSetClass(flag) {
  if (flag) return "btn_setup btn_setup_selected";
  return "btn_setup";
}

//调用 setDomBackgroundColor 修改选中的新选项和旧选项的背景颜色
function cancelBackBeforeUpdate(domIdHeader, rank, oldRank) {
  setDomBackgroundColor(domIdHeader + oldRank, false);
  setDomBackgroundColor(domIdHeader + rank, true);
}

function updateBackBeforecancel(domIdHeader, rank, oldRank) {
    setDomBackgroundColor(domIdHeader + rank, true);
    setDomBackgroundColor(domIdHeader + oldRank, false);
}

// 修改dom的背景颜色
function setDomBackgroundColor(domId, selected) {
  let dom = document.getElementById(domId);
  if (dom == null) return;
  if (selected) {
    console.log("添加背景色id", domId);
    dom.style.backgroundColor = "rgba(255, 115, 0, 0.5)";
  } else {
    console.log("取消背景色id", domId);
    dom.style.backgroundColor = "rgba(127, 127, 127, 0.1)";
  }
}

let surveyTypeText = ref("标准问卷");
let surveyType = ref("_basic");
//简易卡片样式
let simpleCard = ref(false);

//标准问卷与完整问卷
function changeSurveyType(type) {
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

onMounted(() => {
  // getSurveyCharacter();
  addFilterRule("rarity", 6);
 
});
</script>
