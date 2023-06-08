<template>
  <div class="fill_course_tip_btn" @click="popupVisible()">
    <div >填写流程说明</div>
    <div  class="fill_course_tip_icon">?</div>
  </div>
  <c-popup :visible="firstpopup" v-model:visible="firstpopup" @click="isFirstPopupCache()">
    <div class="fill_course_title">填写流程说明</div>

    <div class="fill_course_wrap">
      <div class="from_card" v-for="(char, index) in characterListDemo" :key="index">
        <div class="card_option" :style="tableSytle('short')">
          <div @click="char.own = !char.own" :class="getSprite(char.charId)"></div>
        </div>

        <div class="card_option" style="width: 66px">
          <div class="dropDown" @click="dropDown('potential' + index)">
            <div :class="getSprite('potential' + char.potential, 'potential')"></div>
          </div>
          <div class="dropDown_menu">
            <div class="dropDown_content" :id="'potential' + index" @click="dropUp('potential' + index)">
              <div v-for="rank in ranks.slice(1, 7)" @click="char.potential = rank" class="dropDown_content_item">潜能{{ rank }}</div>
            </div>
          </div>
          <div class="ownAndPotential_wrap">
            <c-switch v-model="char.own" class="card_option_switch"></c-switch>
          </div>
        </div>

        <div class="card_option" style="width: 66px">
          <div class="card_option_title">精英化</div>
          <div class="card_option_image" @click="changeData(index, 'phase')">
            <div :class="getSprite('phase' + char.phase, 'phase')"></div>
          </div>
        </div>

        <div class="card_option" style="width: 66px" v-for="(skill, rank) in char.skill" :key="rank">
          <div class="card_option_image_noshadow">
            <div :class="getSprite(skill.iconId, 'icon')"></div>
          </div>
          <div class="card_option_image" @click="changeData(index, 'skill1')">
            <div :class="getSprite('skill' + char['skill' + (rank + 1)], 'skill')"></div>
          </div>
        </div>

        <div class="card_option" style="width: 66px">
          <div class="card_option_title">{{ "模组X" }}</div>
          <div class="card_option_image" @click="changeData(index, 'modX')" v-show="char.modX > -1">
            <div :class="getSprite('mod' + char.modX, 'mod')"></div>
          </div>
        </div>

        <div class="card_option" style="width: 66px">
          <div class="card_option_title">{{ "模组Y" }}</div>
          <div class="card_option_image" @click="changeData(index, 'modY')" v-show="char.modY > -1">
            <div :class="getSprite('mod' + char.modY, 'mod')"></div>
          </div>
        </div>
      </div>
    </div>
    <div class="fill_course_tip_wrap">
      <div class="fill_course_tip">点击干员头像或<c-switch class="fill_course_tip_switch"></c-switch>来填写拥有此干员，默认未拥有</div>
      <div class="fill_course_tip">
        点击
        <div class="card_option_check fill_course_tip_image"><div :class="getSprite('phase' + 1, 'phase')"></div></div>
        <div class="card_option_check fill_course_tip_image"><div :class="getSprite('skill' + 1, 'skill')"></div></div>
        <div class="card_option_check fill_course_tip_image"><div :class="getSprite('mod_' + 1, 'mod')"></div></div>
        选择精英化等级、专精等级、模组等级，
      </div>
      <div>每点击一次精英、专精、模组等级加1，满级后再次点击为回到0级</div>
      <!-- <div class="fill_course_tip">点击干员头像或按钮来填写拥有此干员，默认拥有</div> -->
    </div>
  </c-popup>
</template>

<script setup>

import { onMounted, ref } from "vue";
import jsCookie from "js-cookie";

let firstpopup = ref(false);

function isFirstPopup() {
  console.log(jsCookie.get("firstpopup"));
  if ("firstpopup" != jsCookie.get("firstpopup")) {
    firstpopup.value = true;
  }
}

function isFirstPopupCache() {
  jsCookie.set("firstpopup", "firstpopup", { expires: 30 });
}

function popupVisible() {
  firstpopup.value = !firstpopup.value;
}

let ranks = ref([0, 1, 2, 3, 4, 5, 6]);

let characterListDemo = ref([
  {
    charId: "char_332_archet",
    own: false,
    level: 1,
    modX: 0,
    modY: 0,
    phase: 2,
    potential: 1,
    rarity: 6,
    skill1: 0,
    skill2: 0,
    skill3: 0,
    skill: [
      {
        iconId: "skchr_archet_1",
        name: "箭矢·散逸",
      },
      {
        iconId: "skchr_archet_2",
        name: "箭矢·追猎",
      },
      {
        iconId: "skchr_archet_3",
        name: "箭矢·暴风",
      },
    ],
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

function getSprite(id, type) {
  if ("mod" == type) return "bg-" + id + " sprite_mod";
  if ("skill" == type) return "bg-" + id + " sprite_skill";
  if ("phase" == type) return "bg-" + id + " sprite_phase";
  if ("potential" == type) return "bg-" + id + " sprite_potential";
  if ("icon" == type) return "bg-skill_icon_" + id + " sprite_skill_icon";

  return "bg-" + id + " sprite_avatar";
}

function tableSytle(type) {
  if ("short" == type) return "min-width:98px";
  if ("long" == type) return "min-width:66px";
}

onMounted(() => {
  isFirstPopup();
});
</script>
