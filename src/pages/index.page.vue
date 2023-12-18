<template>
  <div >
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



    <stage/>

    <!-- <foot-component/> -->

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
</style>

<script setup>
import stage from "/src/pages/material/stageV3.page.client.vue";
import FootComponent from "@/components/FootComponent.vue";

import axios from 'axios'

const data = {
  stageId: 'main_01-07',
  stars: 3,
  times: 5,

  server: 'TEST',
  source: 'TEST',
  version: 'TEST'
}

function sleep(d) {
  return new Promise((resolve) => setTimeout(resolve, d));
}

// let testApi = 'https://developer.yituliu.site/stage/drop/upload'
// let testApi = 'http://127.0.0.1:10020/stage/drop/upload'

// for (let i = 0; i < 5; i++) {
//   axios.post(testApi,
//       data,
//       {
//         headers: {
//           authorization: 'penguin 014801238',
//           'Content-Type': 'application/json'
//         }
//       }).then(response => {
//     console.log(response.data)
//   })
//
//    sleep(5000)
// }



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
</script>

<script>
export const documentProps = {
  title: "明日方舟一图流",
  description: "明日方舟材料掉落地图效率，采购中心性价比，活动商店性价比，物品价值一览",
};
</script>


