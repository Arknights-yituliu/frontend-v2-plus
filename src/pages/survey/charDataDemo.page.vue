<template>

  <div class="fill_course_tip_btn" @click="popupVisible()"> <div @click="popupVisible()"> 填写教程及说明</div> <div @click="popupVisible()" class="fill_course_tip_icon">?</div></div>
  <c-popup :visible="firstpopup">
    <div class="fill_course_wrap">
      <div class="from_card">
        <div class="card_title" :style="tableSytle('short')">干员</div>
        <div class="card_title" :style="tableSytle('long')">精英化</div>
        <div class="card_title" :style="tableSytle('long')">1技能</div>
        <div class="card_title" :style="tableSytle('long')">2技能</div>
        <div class="card_title" :style="tableSytle('long')">3技能</div>
        <div class="card_title" :style="tableSytle('long')">模组X</div>
        <div class="card_title" :style="tableSytle('long')">模组Y</div>
      </div>

      <div class="from_card" v-for="(char, index) in characterListDemo" :key="index">
        <div class="card_option" :style="tableSytle('short')">
          <div @click="char.own = !char.own" :class="getSprite(char.charId)"></div>
          <div class="ownAndPotential_wrap">
            <c-switch v-model="char.own" class="card_option_switch"></c-switch>
            <div class="dropDown" @click="dropDown('potential' + index)">
              <div :class="getSprite('potential' + char.potential, 'potential')"></div>
            </div>
            <div class="dropDown_menu">
              <div class="dropDown_content" :id="'potential' + index" @click="dropUp('potential' + index)">
                <div v-for="rank in ranks.slice(1, 7)" @click="char.potential = rank" class="dropDown_content_item">潜能{{ rank }}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="card_option" :style="tableSytle('long')">
          <div v-for="rank in ranks.slice(0, 3)" @click="changeDataDemo(index, 'phase', rank)" :class="selected(char.phase, rank)">
            <div :class="getSprite('phase' + rank, 'phase')"></div>
          </div>
        </div>

        <div class="card_option" :style="tableSytle('long')">
          <div v-for="rank in ranks.slice(1, 4)" @click="changeDataDemo(index, 'skill1', rank)" :class="selected(char.skill1, rank)">
            <div :class="getSprite('skill' + rank, 'skill')"></div>
          </div>
        </div>
        <div class="card_option" :style="tableSytle('long')">
          <div v-for="rank in ranks.slice(1, 4)" @click="changeDataDemo(index, 'skill2', rank)" :class="selected(char.skill2, rank)">
            <div :class="getSprite('skill' + rank, 'skill')"></div>
          </div>
        </div>
        <div class="card_option" :style="tableSytle('long')">
          <div v-for="rank in ranks.slice(1, 4)" @click="changeDataDemo(index, 'skill3', rank)" :class="selected(char.skill3, rank)">
            <div :class="getSprite('skill' + rank, 'skill')"></div>
          </div>
        </div>

        <div class="card_option" :style="tableSytle('long')">
          <div v-for="rank in ranks.slice(1, 4)" @click="changeDataDemo(index, 'modX', rank)" :class="selected(char.modX, rank)">
            <div :class="getSprite('mod_' + rank, 'mod')"></div>
          </div>
        </div>
        <div class="card_option" :style="tableSytle('long')">
          <div v-for="rank in ranks.slice(1, 4)" @click="changeDataDemo(index, 'modY', rank)" :class="selected(char.modY, rank)">
            <div :class="getSprite('mod_' + rank, 'mod')"></div>
          </div>
        </div>
      </div>
    </div>
    <div class="fill_course_tip_wrap">
      <div class="fill_course_tip">点击干员头像或<c-switch class="fill_course_tip_switch"></c-switch>来填写拥有此干员，默认拥有</div>
      <div class="fill_course_tip">
        点击
        <div class="card_option_check fill_course_tip_image"><div :class="getSprite('phase' + 1, 'phase')"></div></div>
        <div class="card_option_check fill_course_tip_image"><div :class="getSprite('skill' + 1, 'skill')"></div></div>
        <div class="card_option_check fill_course_tip_image"><div :class="getSprite('mod_' + 1, 'mod')"></div></div>
        选择精英化等级、专精等级、模组等级，
      </div>
      <div>点击一次为选择等级，再次点击为取消选择的等级</div>
      <!-- <div class="fill_course_tip">点击干员头像或按钮来填写拥有此干员，默认拥有</div> -->
    </div>
  </c-popup>
</template>

<script setup>
import "@/assets/css/sprite_char_6.css";
import "@/assets/css/sprite_rank.css";
import "@/assets/css/survey_charData.css";
import { ref } from "vue";

let firstpopup = ref(false)

function popupVisible(){
  firstpopup.value = !firstpopup.value
}

let ranks = ref([0, 1, 2, 3, 4, 5, 6]);

let characterListDemo = ref([
  {
    charId: "char_377_gdglow",
    own: true,
    level: 1,
    modX: 0,
    modY: 0,
    phase: 2,
    potential: 1,
    rarity: 6,
    skill1: 0,
    skill2: 0,
    skill3: 0,
  },
]);

function changeDataDemo(index, attrib, value) {
  if (characterListDemo.value[index][attrib] == value) {
    characterListDemo.value[index][attrib] = 0;
  } else {
    characterListDemo.value[index][attrib] = value;
  }
}

function selected(value, checkValue) {
  if (value == checkValue) return "card_option_check check_selected";
  return "card_option_check";
}

function dropDown(id) {
  document.getElementById(id).style.display = "flex";
}

function dropUp(id) {
  document.getElementById(id).style.display = "none";
}



function getSprite(id, type, index) {
  if ("mod" == type) return "bg-" + id + " sprite_mod";
  if ("skill" == type) return "bg-" + id + " sprite_skill";
  if ("phase" == type) return "bg-" + id + " sprite_phase";
  if ("potential" == type) return "bg-" + id + " sprite_potential";
  if ("own" == type) return "bg-" + id + " sprite_avatar_own";

  return "bg-" + id + " sprite_avatar";
}

function tableSytle(type) {
  if ("short" == type) return "min-width:98px";
  if ("long" == type) return "min-width:66px";
}
</script>
