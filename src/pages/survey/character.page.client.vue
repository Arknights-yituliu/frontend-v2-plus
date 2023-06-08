<template>
  <!-- <navBar></navBar> -->
  <div class="survey_charData_page">
    <div class="setup_wrap">
      <div class="setup_bar">
        <div class="setup_title">设置</div>
        <div class="btn_survey"><characterDemo></characterDemo></div>
        <!-- <a href="/survey/list"> <div class="btn_survey">查看榜单</div></a> -->
        <div class="btn_survey" @click="filterCollapse = !filterCollapse">{{ filterCollapse ? "展开" : "收起" }}筛选栏</div>
        <div class="btn_survey" @click="upload()">上传数据</div>
      </div>
      <div v-show="filterCollapse">
        <div class="setup_bar">
          <div class="setup_title">职业</div>
          <div :class="selectedBtn('profession', profession.value)" v-for="profession in professionDict" @click="addFilterRule('profession', profession.value)">
            {{ profession.label }}
          </div>
        </div>
        <div class="setup_bar">
          <div class="setup_title">稀有度</div>
          <div :class="selectedBtn('rarity', rarity)" v-for="rarity in rarityDict" @click="addFilterRule('rarity', rarity)">
               {{ rarity }}★
          </div>
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
        </div>

        <div class="setup_bar">
          <div class="setup_title">排序</div>
          <div class="set_btn" @click="sortCharacterList('rarity')">稀有度顺序</div>
          <div class="set_btn" @click="sortCharacterList('date')">实装顺序</div>
        </div>

        <div class="setup_bar">
          <div class="setup_title">批量操作</div>
          <div class="set_btn" @click="batchUpdates('own', true)">全部拥有</div>
          <div class="set_btn" @click="batchUpdates('phase', 2)">全部精二</div>
          <div class="set_btn" @click="batchUpdates('skill2', 3)">二技能专三</div>
          <div class="set_btn" @click="batchUpdates('skill3', 3)">三技能专三</div>
          <div class="set_btn" @click="batchUpdates('modX', 3)">X模组三级</div>
          <div class="set_btn" @click="batchUpdates('modY', 3)">Y模组三级</div>
        </div>
      </div>
    </div>

    <div class="fill_course_page"></div>
    <div class="char_forms">
      <div class="from_card" v-for="(char, char_index) in characterList" :key="char_index" v-show="char.show">
        <div class="card_option">
          <div class="avatar_wrap">
            <div @click="char.own = !char.own" :class="getSprite(char.charId)"></div>
          </div>
        </div>

        <div class="card_option" style="width: 60px">
          <div class="dropDown" @click="dropDown('potential' + char_index)">
            <div :class="getSprite('potential' + char.potential, 'potential')"></div>
          </div>
          <div class="dropDown_menu">
            <div class="dropDown_content" :id="'potential' + char_index" @click="dropUp('potential' + char_index)">
              <div v-for="rank in ranks.slice(1, 7)" @click="char.potential = rank" class="dropDown_content_item">
                <div :class="getSprite('potential' + rank, 'potential')"></div>
              </div>
            </div>
          </div>

          <c-switch v-model="char.own" class="card_option_switch"></c-switch>
        </div>

        <div class="card_option" style="width: 60px">
          <div class="card_option_title">精英化</div>
          <div class="card_option_image" @click="changeDataIncr(char_index, 'phase')" v-if="'phone' == swithType">
            <div :class="getSprite('phase' + char.phase, 'phase')"></div>
          </div>

          <div
            v-for="rank in ranks.slice(0, 3)"
            :class="switchSelected(char.phase, rank)"
            @click="changeDataSwitch(char_index, 'phase', rank)"
            v-if="'pc' == swithType"
          >
            <div :class="getSprite('phase' + rank, 'phase')"></div>
          </div>
        </div>

        <div class="card_option" style="width: 60px" v-for="(skill, skill_index) in char.skill" :key="skill_index">
          <div class="card_option_image_noshadow">
            <div :class="getSprite(skill.iconId, 'icon')"></div>
          </div>
          <div class="card_option_image" @click="changeDataIncr(char_index, 'skill' + (skill_index + 1))" v-if="'phone' == swithType">
            <div :class="getSprite('skill' + char['skill' + (skill_index + 1)], 'skill')"></div>
          </div>

          <div
            v-for="rank in ranks.slice(1, 4)"
            :class="switchSelected(char['skill' + (skill_index + 1)], rank)"
            @click="changeDataSwitch(char_index, 'skill' + (skill_index + 1), rank)"
            v-if="'pc' == swithType"
          >
            <div :class="getSprite('skill' + rank, 'skill')"></div>
          </div>
        </div>

        <div class="card_option" style="width: 60px" v-show="char.skill.length < 3"></div>
        <div class="card_option" style="width: 60px" v-show="char.skill.length < 2"></div>
        <div class="card_option" style="width: 60px" v-show="char.skill.length < 1"></div>

        <div class="card_option" style="width: 60px">
          <div class="card_option_title">{{ "模组X" }}</div>
          <div class="card_option_image" @click="changeDataIncr(char_index, 'modX')" v-show="char.modX > -1" v-if="'phone' == swithType">
            <div :class="getSprite('mod' + char.modX, 'mod')"></div>
          </div>

          <div
            v-for="rank in ranks.slice(1, 4)"
            :class="switchSelected(char.modX, rank)"
            @click="changeDataSwitch(char_index, 'modX', rank)"
            v-show="char.modX > -1"
            v-if="'pc' == swithType"
          >
            <div :class="getSprite('mod' + rank, 'mod')"></div>
          </div>
        </div>

        <div class="card_option" style="width: 60px">
          <div class="card_option_title">{{ "模组Y" }}</div>
          <div class="card_option_image" @click="changeDataIncr(char_index, 'modY')" v-show="char.modY > -1" v-if="'phone' == swithType">
            <div :class="getSprite('mod' + char.modY, 'mod')"></div>
          </div>
          <div
            v-for="rank in ranks.slice(1, 4)"
            :class="switchSelected(char.modY, rank)"
            @click="changeDataSwitch(char_index, 'modY', rank)"
            v-show="char.modY > -1"
            v-if="'pc' == swithType"
          >
            <div :class="getSprite('mod' + rank, 'mod')"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { cMessage } from "@/element/message.js";
import { globalUserData } from "./userService";
import { characterListInit, professionDict, rarityDict, yearDict } from "./baseData";
import characterDemo from "@/pages/survey/characterDemo.vue";
import surveyApi from "@/api/survey";
import { onMounted, ref, watch } from "vue";
import navBar from "@/pages/survey/navBar.vue";

let characterList = ref(characterListInit());
let ranks = ref([0, 1, 2, 3, 4, 5, 6]);

//找回填写过的角色信息
function getSurveyCharacter() {
  surveyApi.getSurveyCharacter(globalUserData.value.userName).then((response) => {
    let list = response.data;
    for (var i = 0; i < characterList.value.length; i++) {
      // characterList.value[i].own =false;
      for (var j = 0; j < list.length; j++) {
        if (list[j].charId == characterList.value[i].charId) {
          characterList.value[i].phase = list[j].phase;
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

function changeDataIncr(char_index, attrib) {
  if ("phase" == attrib) {
    characterList.value[char_index][attrib]++;
    if (characterList.value[char_index][attrib] > 2) {
      characterList.value[char_index][attrib] = 0;
      return;
    }
    return;
  }

  characterList.value[char_index][attrib]++;
  if (characterList.value[char_index][attrib] > 3) {
    characterList.value[char_index][attrib] = 0;
    return;
  }
  return;
}

function changeDataSwitch(char_index, attrib, rank) {
  console.log(rank, characterList.value[char_index][attrib]);
  if (rank == characterList.value[char_index][attrib]) {
    return (characterList.value[char_index][attrib] = 0);
  }
  characterList.value[char_index][attrib] = rank;
}

function switchSelected(dataValue, switchValue) {
  if (dataValue == switchValue) return "card_option_image selected_background";
  return "card_option_image";
}

//上传
function upload() {
  surveyApi.uploadCharacter(characterList.value, globalUserData.value.userName).then((response) => {
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

let swithType = ref("phone");

//打开选择框
function dropDown(id) {
  document.getElementById(id).style.display = "flex";
}

//关闭选择框
function dropUp(id) {
  document.getElementById(id).style.display = "none";
}

function getSprite(id, type) {
  if ("mod" == type) return "bg-" + id + " sprite_mod";
  if ("skill" == type) return "bg-" + id + " sprite_skill";
  if ("phase" == type) return "bg-" + id + " sprite_phase";
  if ("potential" == type) return "bg-" + id + " sprite_potential";
  if ("icon" == type) return "bg-skill_icon_" + id + " sprite_skill_icon";
  return "bg-" + id + " sprite_avatar";
}

let filterRules = ref({ rarity: [], profession: [], year: [], own: [], mod: [] });
let filterCollapse = ref(true);

//判断按钮是否选择赋予样式
function selectedBtn(attribute, rule, type) {
  if ("rarity" == type) {
    if (filterRules.value[attribute].indexOf(rule) > -1) {
      return "/image/rank2/rarity_fill.png";
    }
    return "/image/rank2/rarity.png";

  }
  if (filterRules.value[attribute].indexOf(rule) > -1) {
    return "set_btn selected_color";
  }
  return "set_btn";
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
    let isYearFlag = isYear(character);
    characterList.value[i].show = isRarity & isProfession & isYearFlag & isOwn & isMod;
  }
}

//是否有这个属性
function isAttribute(character, attribute) {
  if (filterRules.value[attribute].length == 0) return true;
  for (let r in filterRules.value[attribute]) {
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

function batchUpdates(attribute, rank) {
  for (let i in characterList.value) {
    if (characterList.value[i].show) {
      if (characterList.value[i][attribute] == -1) continue;

      characterList.value[i][attribute] = rank;
    }
  }
}

let clientWidth = ref(1080);
function getClientWidth() {
  const width = document.documentElement.clientWidth;
  clientWidth.value = width;

  if (width > 1000) swithType.value = "pc";
}

onMounted(() => {
  getClientWidth();
  // getSurveyCharacter();
  addFilterRule("rarity", 6);
});
</script>
