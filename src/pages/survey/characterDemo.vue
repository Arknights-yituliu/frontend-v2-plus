<template>
  <div class="btn_setup" @click="popupVisible()">
    <div>填写说明</div>
    <div class="btn_setup_tips">功能介绍<br />使用说明</div>
  </div>
  <c-popup :visible="firstpopup" v-model:visible="firstpopup" @click="isFirstPopupCache()" :width="'600px'">
    <!-- <div class="fill_course_title">填写流程说明</div> -->

    <div class="fill_course_wrap">
      <div class="char_forms">
        <div :class="characterOwnClass()" v-for="(char, char_index) in characterList" :key="char_index">
          <div class="card_option_left">
            <div class="card_option_top_left">
              <div>
                <div class="image_avatar">
                  <div @click="char.own = !char.own" :class="getSprite(char.charId)"></div>
                </div>
                <div :class="char.own ? 'char_name' : 'char_name notown'">{{ char.name }}</div>
              </div>
              <div :class="potentialWrapClass(char.own)">
                <div :class="potentialClass(rank, char.potential)" v-for="rank in ranks.slice(1, 7)" @click="updateDataSwitch(char_index, 'potential', rank)">
                  <div :class="getSprite('potential' + rank, 'potential')"></div>
                </div>
              </div>
            </div>
            <!--  -->
            <div :class="eliteWrapClass(char.own)">
              <div v-for="rank in ranks.slice(0, 3)" :class="eliteClass(char.elite, rank)" @click="updateDataSwitch(char_index, 'elite', rank)">
                <div :class="getSprite('elite' + rank, 'elite')"></div>
              </div>
            </div>
          </div>

          <div :class="cardOptionRightClass(char.own)">
            <div v-for="(skill, skill_index) in char.skill" :key="skill_index" class="skill_wrap">
              <div class="image_skill">
                <div :class="getSprite(skill.iconId, 'icon')"></div>
              </div>
              <div
                v-for="rank in ranks.slice(1, 4)"
                :class="skillAndModClass(char['skill' + (skill_index + 1)], rank)"
                @click="updateDataSwitch(char_index, 'skill' + (skill_index + 1), rank)"
              >
                <div :class="getSprite('skill' + rank, 'skill')"></div>
              </div>
            </div>

            <div class="skill_wrap">
              <div class="image_mod">{{ "模组X" }}</div>
              <div
                v-for="rank in ranks.slice(1, 4)"
                :class="skillAndModClass(char.modX, rank)"
                @click="updateDataSwitch(char_index, 'modX', rank)"
                v-show="char.modX > -1"
              >
                <div :class="getSprite('mod' + rank, 'mod')"></div>
              </div>
            </div>

            <div class="skill_wrap">
              <div class="image_mod">{{ "模组Y" }}</div>

              <div
                v-for="rank in ranks.slice(1, 4)"
                :class="skillAndModClass(char.modY, rank)"
                @click="updateDataSwitch(char_index, 'modY', rank)"
                v-show="char.modY > -1"
              >
                <div :class="getSprite('mod' + rank, 'mod')"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="fill_course_tip_wrap">
      <p>默认干员未拥有,卡片显示为灰色(除头像外),点击头像设置为拥有此干员,干员名字和其他区域会恢复颜色</p>
      <div style="display: flex">
        <p>点击</p>
        <div class="image_elite"><div :class="getSprite('elite' + 1, 'elite')"></div></div>
        <div class="image_rank"><div :class="getSprite('skill' + 1, 'skill')"></div></div>
        <div class="image_mod" style="margin: 10px"><div :class="getSprite('mod' + 1, 'mod')"></div></div>
        <p>选择精英化、专精、模组等级，</p>
      </div>
      <p>点击图片后会设为图片上显示的登记,再次点击则可以取消</p>
      <!-- <div class="fill_course_tip">点击干员头像或按钮来填写拥有此干员，默认拥有</div> -->
    </div>
  </c-popup>
</template>

<script setup>
import { onMounted, ref } from "vue";
import jsCookie from "js-cookie";
import { professionDict, rarityDict, yearDict } from "./baseData";

function getSprite(id, type) {
  if ("mod" == type) return "bg-" + id + " sprite_mod";
  if ("skill" == type) return "bg-" + id + " sprite_skill";
  if ("elite" == type) return "bg-" + id + " sprite_elite";
  if ("potential" == type) return "bg-" + id + " sprite_potential";
  if ("icon" == type) return "bg-skill_icon_" + id + " sprite_skill_icon";
  return "bg-" + id + " sprite_avatar";
}

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

let characterList = ref([
  {
    charId: "char_332_archet",
    name: "空弦",
    own: false,
    level: 1,
    modX: 0,
    modY: 0,
    elite: 2,
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

//点选填写内容
function updateDataSwitch(char_index, attrib, rank) {
  console.log(rank, characterList.value[char_index][attrib]);
  if (rank == characterList.value[char_index][attrib]) {
    return (characterList.value[char_index][attrib] = 0);
  }
  characterList.value[char_index][attrib] = rank;
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

let cardSimple = ref(false);

function characterOwnClass() {
  if (cardSimple.value) return "char_card char_card_simple";
  return "char_card";
}

function skillAndModClass(dataValue, switchValue) {
  if (dataValue == switchValue) return "image_rank switch_select";
  return "image_rank";
}

function eliteClass(dataValue, switchValue) {
  if (dataValue == switchValue) return "image_elite switch_select";
  return "image_elite";
}

function potentialClass(dataValue, switchValue) {
  if (dataValue == switchValue) return "image_potential switch_select";
  return "image_potential";
}

function cardOptionRightClass(own) {
  if (own) return "card_option_right";
  return "card_option_right notown";
}

function eliteWrapClass(own) {
  if (own) return "elite_wrap";
  return "elite_wrap notown";
}

function potentialWrapClass(own) {
  if (own) return "potential_wrap";
  return "potential_wrap notown";
}

onMounted(() => {
  isFirstPopup();
});
</script>
