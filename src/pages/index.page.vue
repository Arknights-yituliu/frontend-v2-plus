<script setup>
import stage from "/src/pages/material/stageV3.page.client.vue";
import FootComponent from "@/components/FootComponent.vue";
import {ref} from "vue";

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

function officialLink() {
  window.open('https://space.bilibili.com/688411531')
  if(window.location.hostname.indexOf("ytl")>-1) tipVisible.value = true
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


    <div id="RIICbeta" class="stage_3_intro to_official_card" @click="officialLink()" v-show="tipVisible">
      您现在正在通过<b style="color: rgb(255,94,66);">临时域名</b>访问本站<br>新域名(ark.yituliu.cn)正在备案中<br>
      建议关注 <b style="color: rgb(255,94,66);">bilibili@罗德岛基建BETA</b> 获取最新动态<br>点击本卡片即可跳转
    </div>


    <stage/>

    <!--     <foot-component/>-->

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

.to_official_card {
  max-width: 600px;
  font-size: 24px;
  font-family: Arial, Helvetica, sans-serif;
  text-align: center;
  margin: 8px auto;
  border: 2px solid #ff0000;
  line-height: 28px;
  padding-top: 8px;
  cursor: pointer;
}

</style>


<script>
export const documentProps = {
  title: "明日方舟一图流",
  description: "明日方舟材料掉落地图效率，采购中心性价比，活动商店性价比，物品价值一览",
};
</script>


