<template>
  <div class="div_page">
    <div class="dev_page_title_1">友情链接</div>

    <div class="dev_wrap">
      <div class="dev_card">
        <div class="dev_image_wrap">
          <a href="https://viktorlab.cn/akdata/"> <img class="dev_image_head" src="/image/website/akdps.jpg" /></a>
        </div>
        <div class="dev_content">
          <div class="dev_name">明日方舟DPS计算器</div>
          <div class="dev_work">自定义计算干员DPS</div>
        </div>
      </div>

      <div class="dev_card">
        <div class="dev_image_wrap">
          <a href="https://arkgacha.kwer.top/"> <img class="dev_image_head" src="https://arkgacha.kwer.top/static/icon.ico" /></a>
        </div>
        <div class="dev_content">
          <div class="dev_name">明日方舟寻访记录分析</div>
          <div class="dev_work">抽卡记录分析</div>
        </div>
      </div>

      <div class="dev_card">
        <div class="dev_image_wrap">
          <a href="https://maa.plus/"> <img class="dev_image_head" src="https://avatars.githubusercontent.com/u/97677443?s=200" /></a>
        </div>
        <div class="dev_content">
          <div class="dev_name">《明日方舟》小助手</div>
          <div class="dev_work">全日常一键长草</div>
        </div>
      </div>

      <div class="dev_card">
        <div class="dev_image_wrap">
          <a href="https://zhaozuohong.vip"> <img class="dev_image_head" src="/image/website/rhodes_asst.png" /></a>
        </div>
        <div class="dev_content">
          <div class="dev_name">罗德岛助理</div>

          <div class="dev_work">理智提醒，游戏新闻推送，公开招募计算和寻访记录</div>
        </div>
      </div>

      <div class="dev_card">
        <div class="dev_image_wrap">
          <a href="https://terrach.net/"> <img class="dev_image_head" src="/image/website/terra.png" /></a>
        </div>
        <div class="dev_content">
          <div class="dev_name">泰拉通讯枢纽</div>

          <div class="dev_work">交流社区，由明日方舟玩家创建的干净、纯粹的论坛。</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
</script>

<style>
.div_page {
  font-family: "Microsoft YaHei", 微软雅黑, "MicrosoftJhengHei", 华文细黑, STHeiti, MingLiu;
  min-height: 95%;
}

.dev_page_title_1 {
  margin-top: 30px;
  margin-left: 20px;
  margin-bottom: 10px;
  font-size: 32px;
  font-weight: 800;
}

.dev_page_content {
  margin-left: 20px;
  margin-bottom: 20px;
}

.dev_page_title_2 {
  margin-top: 30px;
  margin-left: 20px;
  margin-bottom: 10px;
  font-size: 24px;
  font-weight: 800;
}

.dev_wrap {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
}

.dev_card {
  width: 300px;
  display: flex;
  /* border: 1px rgb(180, 180, 180) solid; */
  margin: 10px;
  background: rgb(231, 230, 230);
  border-radius: 6px;
}

.dev_image_wrap {
  margin: 10px;
  margin-right: 20px;
  margin-top: 20px;
}

.dev_image_head {
  border-radius: 50%;
  width: 65px;
}

.dev_content {
  margin-top: 20px;
}

.dev_name {
  /* text-align: center; */
  font-size: 24px;
  font-weight: 700;
}

.dev_profile {
  color: rgb(94, 94, 94);
  margin-bottom: 20px;
}

.dev_work {
  margin-top: 5px;
  margin-bottom: 5px;
  font-weight: 700;
}
</style>
