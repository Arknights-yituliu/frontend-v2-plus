<template>
  <div class="survey_character_page">
    <!-- 设置区域 -->
    <div class="setup_wrap" id="setbar">
      <div class="setup_bar">
        <!-- <div class="setup_title">设置</div> -->
        <div :class="btnSetClass(filterCollapse)" @click="setBarCollapse()">筛选/批量操作</div>
        <div :class="btnSetClass(cardSimple)" @click="cardSimple = !cardSimple">仅显示头像</div>
        <div class="btn_set" @click="upload()">上传数据</div>
        <!-- <div :class="btnSetClass(filterCollapse)" @click="setBarCollapse()">{{ filterCollapse ? "收起" : "展开" }}筛选栏</div> -->
        <div class="btn_set" @click="exportExcel()">{{ exportExcelBtnText }}</div>

        <div class="btn_set btn_upload">
          <div class="input_upload_wrap">
            <div class="upload_file_text">{{ uploadFileName }}</div>
            <input id="uploadInput" type="file" class="input_upload" @input="getUploadFileName()" />
          </div>
        </div>
        <div class="btn_set" @click="uploadByExcel">上传EXCEL</div>
        <div class="btn_set"><characterDemo></characterDemo></div>
        <!-- <div class="btn_set">统计</div> -->
      </div>

      <div id="survey_filter">
        <div class="setup_bar">
          <div class="setup_title">职业</div>
          <div :class="selectedBtn('profession', profession.value)" v-for="profession in professionDict" @click="addFilterRule('profession', profession.value)">
            {{ profession.label }}
          </div>
        </div>
        <div class="setup_bar">
          <div class="setup_title">稀有度</div>
          <div :class="selectedBtn('rarity', rarity)" v-for="rarity in rarityDict" @click="addFilterRule('rarity', rarity)">{{ rarity }}★</div>
        </div>
        <div class="setup_bar">
          <div class="setup_title">年份</div>
          <div :class="selectedBtn('year', key)" v-for="(year, key) in yearDict" :key="key" @click="addFilterRule('year', key)">
            {{ year.label }}
          </div>
        </div>
        <div class="setup_bar">
          <div class="setup_title">其他</div>
          <div :class="selectedBtn('own', true)" id="other1" @click="addFilterRule('own', true)">已拥有</div>
          <div :class="selectedBtn('own', false)" id="other2" @click="addFilterRule('own', false)">未拥有</div>
          <div :class="selectedBtn('mod', true)" id="other3" @click="addFilterRule('mod', true)">有模组</div>
          <div :class="selectedBtn('mod', false)" id="other4" @click="addFilterRule('mod', false)">无模组</div>
          <div :class="selectedBtn('itemObtainApproach', 0)" id="other5" @click="addFilterRule('itemObtainApproach', 0)">是否赠送</div>
        </div>

        <div class="setup_bar">
          <div class="setup_title">排序</div>
          <div class="switch_set" @click="sortCharacterList('rarity')">稀有度顺序</div>
          <div class="switch_set" @click="sortCharacterList('date')">实装顺序</div>
        </div>

        <div class="setup_bar">
          <div class="setup_title">批量操作</div>
          <div class="switch_set" @click="batchUpdates('own', true)">全部拥有</div>
          <div class="switch_set" @click="batchUpdates('own', false)">全部未拥有</div>
          <div class="switch_set" @click="batchUpdates('elite', 2)">全部设为精二</div>
          <div class="switch_set" @click="batchUpdates('skill1', 3)">一技能专三</div>
          <div class="switch_set" @click="batchUpdates('skill2', 3)">二技能专三</div>
          <div class="switch_set" @click="batchUpdates('skill3', 3)">三技能专三</div>
          <div class="switch_set" @click="batchUpdates('modX', 3)">X模组三级</div>
          <div class="switch_set" @click="batchUpdates('modY', 3)">Y模组三级</div>
        </div>
      </div>
    </div>

    <!-- 干员组 -->
    <div class="char_forms">
      <div :class="characterOwnClass()" v-for="(char, char_index) in characterList" :key="char_index" v-show="char.show">
        <!-- 左半部分 -->
        <div class="card_option_left">
          <div class="card_option_top_left">
            <div>
              <div :class="char.own ? 'image_avatar_own' : 'image_avatar'">
                <div @click="updateOwn(char_index)" :class="getSprite(char.charId)"></div>
              </div>
              <div :class="char.own ? 'char_name' : 'char_name notown'">{{ char.name }}</div>
            </div>
            <div :class="char.own ? 'potential_wrap' : 'potential_wrap notown'">
              <div
                class="image_potential"
                :id="char_index + 'potential' + rank"
                v-for="rank in ranks.slice(1, 7)"
                @click="updateDataSwitch(char_index, 'potential', rank)"
              >
                <div :class="getSprite('potential' + rank, 'potential')"></div>
              </div>
            </div>
          </div>
          <!--  -->
          <div :class="char.own ? 'elite_wrap' : 'elite_wrap notown'">
            <div class="image_elite" :id="char_index + 'elite0'" @click="updateDataSwitch(char_index, 'elite', 0)">
              <div :class="getSprite('elite0', 'elite')"></div>
            </div>
            <div :id="char_index + 'elite1'" class="image_elite" @click="updateDataSwitch(char_index, 'elite', 1)" v-show="char.rarity > 2">
              <div :class="getSprite('elite1', 'elite')"></div>
            </div>
            <div :id="char_index + 'elite2'" class="image_elite" @click="updateDataSwitch(char_index, 'elite', 2)" v-show="char.rarity > 3">
              <div :class="getSprite('elite2', 'elite')"></div>
            </div>
            <div class="image_elite" :id="char_index + 'level'" @click="updateLevel(char_index, char.rarity, char.elite)">
              <img class="image_lvMax" src="/image/rank2/lvMax.png" alt="" />
            </div>
          </div>
        </div>

        <!-- 右半部分 -->
        <!-- 技能 -->
        <div :class="char.own ? 'card_option_right' : 'card_option_right notown'">
          <div v-for="(skill, skill_index) in char.skill" :key="skill_index" class="skill_wrap">
            <div class="image_skill">
              <div :class="getSprite(skill.iconId, 'icon')"></div>
            </div>
            <div
              v-for="rank in ranks.slice(1, 4)"
              class="image_rank"
              :id="char_index + 'skill' + (skill_index + 1) + rank"
              @click="updateDataSwitch(char_index, 'skill' + (skill_index + 1), rank)"
            >
              <div :class="getSprite('skill' + rank, 'skill')"></div>
            </div>
          </div>
          <!-- 模组X -->
          <div class="skill_wrap" v-show="char.modXOwn">
            <div class="image_mod">{{ "模组X" }}</div>
            <div v-for="rank in ranks.slice(1, 4)" class="image_rank" :id="char_index + 'modX' + rank" @click="updateDataSwitch(char_index, 'modX', rank)">
              <div :class="getSprite('mod' + rank, 'mod')"></div>
            </div>
          </div>
          <!-- 没有模组X显示 -->
          <div class="skill_wrap" v-show="!char.modXOwn">
            <div class="image_mod">[N/A]</div>
            <div v-for="rank in ranks.slice(1, 4)" class="image_rank">
              <img class="image_null" src="/image/rank2/null.png" alt="" />
            </div>
          </div>
          <!-- 模组Y -->
          <div class="skill_wrap" v-show="char.modYOwn">
            <div class="image_mod">{{ "模组Y" }}</div>

            <div v-for="rank in ranks.slice(1, 4)" class="image_rank" :id="char_index + 'modY' + rank" @click="updateDataSwitch(char_index, 'modY', rank)">
              <div :class="getSprite('mod' + rank, 'mod')"></div>
            </div>
          </div>

          <!-- 没有模组Y显示 -->
          <div class="skill_wrap" v-show="!char.modYOwn">
            <div class="image_mod">[N/A]</div>
            <div v-for="rank in ranks.slice(1, 4)" class="image_rank">
              <img class="image_null" src="/image/rank2/null.png" alt="" />
            </div>
          </div>
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
  const exportExcelUrl = "http://127.0.0.1:10013/survey/character/export?token=" + globalUserData.value.token;
  var dom = document.createElement("a");
  dom.download = "form.xlsx";
  dom.style.display = "none";
  dom.href = exportExcelUrl;
  dom.click();
  setTimeout(() => {
    exportExcelBtnText.value = "导出excel";
  }, 5000);
}

//上传风评表
function upload() {
  surveyApi.uploadCharacter(characterList.value, globalUserData.value.token).then((response) => {
    // console.log(response.data);
    cMessage("新增了 " + response.data.insertRows + " 条");
    cMessage("更新了 " + response.data.updateRows + " 条");
  });
}

let uploadFileName = ref("未选择文件");

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
    let elements = document.getElementsByClassName("setup_bar");
    let height = 5;
    for (let e of elements) {
      height += e.offsetHeight + 10;
    }
    document.getElementById("setbar").style.height = height + "px";
    setTimeout(() => {
      document.getElementById("setbar").style.height = "auto";
    }, 500);
  } else {
    let elements = document.getElementsByClassName("setup_bar");
    let height = 5;
    for (let e of elements) {
      height += e.offsetHeight + 10;
    }
    document.getElementById("setbar").style.height = height + "px";
    setTimeout(() => {
      document.getElementById("setbar").style.height = 54 + "px";
    }, 100);
  }
}

let filterRules = ref({ rarity: [], profession: [], year: [], own: [], mod: [], itemObtainApproach: [] });
let filterCollapse = ref(false);

//判断按钮是否选择赋予样式
function selectedBtn(attribute, rule) {
  if (filterRules.value[attribute].indexOf(rule) > -1) {
    return "switch_set selected_color";
  }
  return "switch_set";
}

//增加筛选规则
function addFilterRule(attribute, rule) {
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

function updateOwn(char_index) {
  const character = characterList.value[char_index];
  characterList.value[char_index].own = !character.own;
  if (characterList.value[char_index].own) {
    if (character.rarity == 6) {
      characterList.value[char_index].elite = 2;
      characterList.value[char_index].potential = 1;
    }
  } else {
    switchSelected(char_index + "level", -1, character.level, false);
    switchSelected(char_index + "elite", -1, character.elite, false);
    switchSelected(char_index + "potential", -1, character.potential, false);
    switchSelected(char_index + "skill1", -1, character.skill1, false);
    switchSelected(char_index + "skill2", -1, character.skill2, false);
    switchSelected(char_index + "skill3", -1, character.skill3, false);
    switchSelected(char_index + "modX", -1, character.modX, false);
    switchSelected(char_index + "modY", -1, character.modY, false);

    characterList.value[char_index].level = -1;
    characterList.value[char_index].elite = -1;
    characterList.value[char_index].potential = -1;
    characterList.value[char_index].skill1 = -1;
    characterList.value[char_index].skill2 = -1;
    characterList.value[char_index].skill3 = -1;
    characterList.value[char_index].modX = -1;
    characterList.value[char_index].modY = -1;
  }
}

//点选填写内容
function updateDataSwitch(char_index, attribute, rank) {
  console.log(rank, characterList.value[char_index][attribute]);
  let domId = char_index + attribute;
  let oldRank = characterList.value[char_index][attribute];
  if (rank == oldRank) {
    characterList.value[char_index][attribute] = -1;
    switchSelected(domId, rank, oldRank, false);
    return;
  }
  characterList.value[char_index][attribute] = rank;
  switchSelected(domId, rank, oldRank, true);
  characterList.value[char_index].own = true;
}

//最大等级
function updateLevel(char_index, rarity, elite) {
  let level = 0;

  characterList.value[char_index].own = true;
  if (characterList.value[char_index].level > 0) {
    console.log("取消满级:");
    characterList.value[char_index].level = level;
    document.getElementById(char_index + "level").style.backgroundColor = "rgba(127, 127, 127, 0.1)";
    return;
  }

  console.log(rarity, elite);
  if (rarity == 6 && elite == 2) {
    level = 90;
  }
  if (rarity == 5 && elite == 2) {
    level = 80;
  }
  if (rarity == 4 && elite == 2) {
    level = 70;
  }
  if (rarity == 3 && elite == 1) {
    level = 55;
  }
  if (rarity < 3 && elite == 0) {
    level = 30;
  }

  if (level == 0) return;

  console.log("满级:", level);
  characterList.value[char_index].level = level;
  document.getElementById(char_index + "level").style.backgroundColor = "rgba(0, 102, 255, 0.3)";
}

//批量更新
function batchUpdates(attribute, rank) {
  for (let i in characterList.value) {
    if (characterList.value[i].show) {
      if (characterList.value[i][attribute] == -1) continue;
      characterList.value[i][attribute] = rank;
    }
  }
}

// function batchCancellation(){
//   for (let i in characterList.value) {
//     if (characterList.value[i].show) {
//      characterList.value[i].show = false;
//     }
//   }
// }

let cardSimple = ref(false);

function btnSetClass(flag) {
  if (flag) return "btn_set btn_set_select";
  return "btn_set";
}

function switchSelected(domId, rank, oldRank, selected) {
  let dom = document.getElementById(domId + rank);
  let oldDom = document.getElementById(domId + oldRank);
  if (dom != null) {
    console.log("修改：", domId + rank);
    dom.style.backgroundColor = "rgba(0, 102, 255, 0.3)";
  }

  if (oldDom != null) {
    console.log("修改：", domId + oldRank);
    oldDom.style.backgroundColor = "rgba(127, 127, 127, 0.1)";
  }
}

function characterOwnClass() {
  if (cardSimple.value) return "char_card char_card_simple";
  return "char_card";
}

onMounted(() => {
  // getSurveyCharacter();
  addFilterRule("rarity", 6);
});
</script>
