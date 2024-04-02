<script setup>
import stage from "/src/pages/material/stageV3.page.vue";
import FootComponent from "/src/components/FootComponent.vue";
import {onMounted, ref} from "vue";
import myFooter from '/src/components/myfooter.vue'
/**
 * 点击复制内容
 */
function copyCode(text) {
  let elementInput = document.createElement('input');
  elementInput.value = text
  document.body.appendChild(elementInput)
  elementInput.select()
  document.execCommand("Copy");
  elementInput.remove()
  window.open('https://ak.hypergryph.com')
}

let tipVisible = ref(false)

function openNewPage(url) {
  window.open(url)

}

let announcementQuantity = ref(1)
let currentAnnouncementIndex = ref(0)

function announcementBtnStyle(index) {
  if (currentAnnouncementIndex.value == index) {
    return 'background-color: #9d9d9d'
  }
}

onMounted(() => {
  const announcementList = document.getElementsByClassName('announcement-card')
  announcementQuantity.value = announcementList.length

  if (window.location.hostname.indexOf("ytl") > -1){
    tipVisible.value = true
  }
})

function chooseAnnouncement(index) {

}

</script>
<template>
  <div>
    <!--    <div class="act_tips_wrap">-->
    <!--      <div class="to_act_wrap">-->
    <!--        <a href="https://ak.hypergryph.com/activity/resonance-of-the-mind">-->
    <!--          <img src="/image/temp/4.5H5小活动.jpg" class="to_h5_image" alt=""/>-->
    <!--        </a>-->
    <!--        点击转跳庆典网页小活动-->
    <!--      </div>-->

    <!--      <div class="to_act_wrap">-->
    <!--        <div class="code">直播兑换码——20000龙门币</div>-->
    <!--        <div class="code">02023CELEBRATION</div>-->
    <!--        <c-button :color="'blue'" @click="copyCode('02023CELEBRATION')">点击复制兑换码并转跳官网</c-button>-->
    <!--      </div>-->
    <!--    </div>-->

    <div style="display:flex;flex-wrap:wrap;justify-content: center">
      <div id="RIICbeta" class="announcement-card" @click="openNewPage('https://ark.yituliu.cn')" v-show="tipVisible">
        您现在正在通过<b style="color: rgb(255,94,66);">临时域名</b>访问本站<br>新域名(ark.yituliu.cn)正在备案中<br>
        建议关注 <b style="color: rgb(255,94,66);">bilibili@罗德岛基建BETA</b> 获取最新动态<br>点击本卡片即可跳转新域名
      </div>

<!--      <div id="RIICbeta" class="announcement-card" @click="openNewPage('/tools/rogueCal')" style="position: relative">-->
<!--        <img src="/RogueCalcV1/roguebanner.jpg" alt="" style="width: 400px;position: absolute;top:-10px;left:0">-->
<!--        <span style="position: absolute;top:100px;left:0;text-align: center;width: 400px;font-weight: bold">-->
<!--          通天联赛#0附加赛激励计划-->
<!--        </span>-->
<!--        <span style="position: absolute;top:128px;left:25px;text-align: center;width: 350px;font-style: italic ;font-size: 14px;line-height: 20px">-->
<!--          通天联赛#0附加赛正在如火如荼地进行中，在观看比赛的同时，我们也欢迎您一同挑战，获得丰厚奖金-->
<!--        </span>-->
<!--      </div>-->
    </div>
    <!--    <div class="announcement-card-wrap">-->
    <!--      <div class="announcement-card-list">-->
    <!--        -->
    <!--      </div>-->
    <!--      <div class="announcement-btn-wrap">-->
    <!--        <div v-for="(num,index) in announcementQuantity" :key="index" class="announcement-btn"-->
    <!--        :style="announcementBtnStyle(index)"> </div>-->
    <!--      </div>-->
    <!--    </div>-->


    <stage/>


  </div>
</template>

<style scoped>
#indexDiv {
  margin: auto;
  color: var(--index-div-fg);
  background-color: var(--index-div-bg);
}

.act_tips_wrap {
  display: flex;
  max-width: 700px;
  margin: auto;
  padding: 20px;
  justify-content: space-around;
  flex-wrap: wrap;
}


.code {
  font-size: 20px;
  font-weight: 600;
  text-align: center;
  margin: 20px auto;
}

.to_act_wrap {
  width: 300px;
  overflow: hidden;
  transition: all .3s;
  text-align: center;
  color: #e85d06;
  font-weight: 600;
  font-size: 20px;
  align-items: center;

}

.to_act_wrap:hover {
  transform: scale(1.1);
}

.to_h5_image {
  width: 400px;
}

.announcement-card-wrap {
  display: flex;
  margin: auto;
  width: 500px;
  height: 140px;
  position: relative;
  overflow: hidden;
  box-shadow: 2px 2px 4px var(--c-box-shadow-color), -2px -2px 4px var(--c-box-shadow-color);
}

.announcement-card-list {
  display: flex;
  transition: .3s ease-in-out;
  transform: translateX(-500px);
}

.announcement-card {
  min-width: 400px;
  font-size: 18px;
  font-family: Arial, Helvetica, sans-serif;
  text-align: center;
  line-height: 28px;
  padding-top: 8px;
  cursor: pointer;
  margin:4px 24px;
  height: 160px;
  overflow: hidden;
  box-shadow: 2px 2px 4px var(--c-box-shadow-color), -2px -2px 4px var(--c-box-shadow-color);
}

.announcement-btn-wrap {
  position: absolute;
  width: 500px;
  top: 125px;
  display: flex;
  justify-content: center;
}

.announcement-btn {
  width: 40px;
  height: 8px;
  margin: 0 8px;
  background-color: #d0d0d0;
}


</style>


<script>
export const documentProps = {
  title: "明日方舟一图流",
  description: "明日方舟材料掉落地图效率，采购中心性价比，活动商店性价比，物品价值一览",
};
</script>


