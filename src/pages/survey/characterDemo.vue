<template>
  <c-popup :visible="firstpopup" v-model:visible="firstpopup" @click="isFirstPopupCache()" :width="'600px'">
    <!-- <div class="intro_title">填写流程说明</div> -->
    <div class="intro_wrap">
      <div class="intro_title">填写方法</div>
      默认干员未拥有,卡片显示为灰色(除头像外),点击头像设置为拥有此干员
      <br />点击选择精英化、专精、模组等级，再次点击则可以取消
    </div>

    <div class="intro_wrap">
      <div class="intro_title">保存机制</div>
      填写的时候可以多点点保存，如不慎误操作，可以刷新页面从服务器上重新拉取数据
    </div>

    <div class="intro_wrap">
      <div class="intro_title">三种填写模式</div>
      极简模式：是否持有<br />
      标准模式：是否持有、精英化程度、专精、模组<br />
      完整模式：是否持有、精英化程度、专精、模组、潜能<br />
      建议填的详细一些，以后会基于这些数据推出新功能
    </div>

    <div class="intro_wrap">
      <div class="intro_title">批量操作</div>
      批量操作：先筛选，再应用于全部筛选出的干员<br />
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
  if ("done" != localStorage.getItem("firstpopup")) {
    firstpopup.value = true;
  }
}

function isFirstPopupCache() {
  localStorage.setItem("firstpopup", "done");
}

function popupVisible() {
  firstpopup.value = !firstpopup.value;
}


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



onMounted(() => {
  isFirstPopup();
});
</script>
