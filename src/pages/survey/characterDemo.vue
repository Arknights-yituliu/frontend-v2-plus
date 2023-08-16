<template>
  <c-popup :visible="firstpopup" v-model:visible="firstpopup" @click="isFirstPopupCache()" :width="'600px'">
    <!-- <div class="intro_title">填写流程说明</div> -->
    <div class="intro_wrap">
      <div class="intro_title">填写方法</div>
      默认干员未拥有,卡片显示为灰色(除头像外),点击头像设置为拥有此干员
      <br>点击选择精英化、专精、模组等级，再次点击则可以取消
    </div>
    
    <div class="intro_wrap">
      <div class="intro_title">保存机制</div>
      填写的时候可以多点点保存，如不慎误操作，可以刷新页面从服务器上重新拉取数据
    </div>

    <div class="intro_wrap">
      <div class="intro_title">三种填写模式</div>
      极简模式：是否持有<br>
      标准模式：是否持有、精英化程度、专精、模组<br>
      完整模式：是否持有、精英化程度、专精、模组、潜能<br>
      建议填的详细一些，以后会基于这些数据推出新功能
    </div>

    <div class="intro_wrap">
      <div class="intro_title">批量操作</div>
      批量操作：先筛选，再应用于全部筛选出的干员<br>
      除“全部设为已拥有”和“全部设为未拥有”外，都仅对已拥有的干员生效
    </div>

    <div class="intro_wrap">
      <div class="intro_title">导入和导出</div>
      数据导入/导出：目前支持Excel的导出，导入功能还在开发中
    </div>

  </c-popup>
  <button class="mdui-btn survey_button" @click="popupVisible()">填写说明</button>
</template>

<script setup>
import { onMounted, ref } from "vue";
import jsCookie from "js-cookie";
import { professionDict, yearDict } from "./commonUtils";

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
