<template>
  <div class="link_page">
    <div class="friend_card_wrap">
      <div class="friend_card">
        <div class="friend_title">
          <div class="friend_image_wrap">
            <a href="https://penguin-stats.cn"> <img class="friend_image" src="/image/website/penguin_stats_logo.webp" /></a>
          </div>
          <div class="friend_name">企鹅物流数据统计</div>
        </div>
        <div class="friend_tag_wrap">
          <div class="friend_tag_list">
            <div class="friend_tag">掉率统计</div>
            <div class="friend_tag">刷图规划</div>
          </div>
        </div>
        <div class="friend_link"><a href="https://penguin-stats.cn">penguin-stats.cn</a></div>
      </div>
      <div class="friend_card">
        <div class="friend_title">
          <div class="friend_image_wrap">
            <a href="https://viktorlab.cn/akdata/"> <img class="friend_image" src="/image/website/akdps.webp" /></a>
          </div>
          <div class="friend_name">DPS计算器</div>
        </div>
        <div class="friend_tag_wrap">
          <div class="friend_tag_list">
            <div class="friend_tag">DPS计算</div>
            <div class="friend_tag">游戏数据速查</div>
            <div class="friend_tag">专精收益</div>
            <div class="friend_tag">DPS可视化</div>
          </div>
        </div>
        <div class="friend_link"><a href="https://viktorlab.cn/akdata/">viktorlab.cn/akdata</a></div>
      </div>

      <div class="friend_card">
        <div class="friend_title">
          <div class="friend_image_wrap">
            <a href="https://arkgacha.kwer.top/"> <img class="friend_image" src="https://arkgacha.kwer.top/static/icon.ico" /></a>
          </div>

          <div class="friend_name">寻访记录分析</div>
        </div>
        <div class="friend_tag_wrap">
          <div class="friend_tag_list">
            <div class="friend_tag">抽卡记录分析</div>
          </div>
        </div>
        <div class="friend_link"><a href="https://arkgacha.kwer.top/">arkgacha.kwer.top</a></div>
      </div>

      <div class="friend_card">
        <div class="friend_title">
          <div class="friend_image_wrap">
            <a href="https://maa.plus/"> <img class="friend_image" src="https://avatars.githubusercontent.com/u/97677443?s=200" /></a>
          </div>
          <div class="friend_name">《明日方舟》小助手</div>
        </div>
        <div class="friend_tag_wrap">
          <div class="friend_tag_list">
            <div class="friend_tag">图像识别</div>
            <div class="friend_tag">自动刷图</div>
            <div class="friend_tag">一键长草</div>
          </div>
        </div>
        <div class="friend_link"><a href="https://maa.plus/">maa.plus</a></div>
      </div>

      <div class="friend_card">
        <div class="friend_title">
          <div class="friend_image_wrap">
            <a href="https://maa.plus/"> <img class="friend_image" src="https://avatars.githubusercontent.com/u/133866484?s=200" /></a>
          </div>
          <div class="friend_name">Arknights-Mower</div>
        </div>
        <div class="friend_tag_wrap">
          <div class="friend_tag_list">
            <div class="friend_tag">动态换班</div>
            <div class="friend_tag">支持跑单操作</div>
            <div class="friend_tag">支持调用MAA</div>
          </div>
        </div>
        <div class="friend_link"><a href="https://github.com/ArkMowers/arknights-mower">ArkMowers/arknights-mower</a></div>
      </div>

      <div class="friend_card">
        <div class="friend_title">
          <div class="friend_image_wrap">
            <a href="https://apps.apple.com/cn/app/id1632810611"> <img class="friend_image" src="/image/website/rhodes_asst.webp" /></a>
          </div>
          <div class="friend_name">罗德岛助理</div>
        </div>
        <div class="friend_tag_wrap">
          <div class="friend_tag_list">
            <div class="friend_tag">新闻推送</div>
            <div class="friend_tag">理智提醒</div>
            <div class="friend_tag">抽卡记录分析</div>
            <div class="friend_tag">公开招募计算</div>
          </div>
        </div>
        <div class="friend_link"><a href="https://apps.apple.com/cn/app/id1632810611">apps.apple.com/cn/app</a></div>
      </div>

      <div class="friend_card">
        <div class="friend_title">
          <div class="friend_image_wrap">
            <a href="https://terrach.net/"> <img class="friend_image" src="/image/website/terra.webp" /></a>
          </div>
          <div class="friend_name">泰拉通讯枢纽</div>
        </div>
        <div class="friend_tag_wrap">
          <div class="friend_tag_list">
            <div class="friend_tag">交流论坛</div>
          </div>
        </div>

        <div class="friend_link"><a href="https://terrach.net/">terrach.net</a></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
</script>

<style>
.link_page {
  font-family: "Microsoft YaHei", 微软雅黑, "MicrosoftJhengHei", 华文细黑, STHeiti, MingLiu, sans-serif;
  /* min-height: 95%; */
  /* height: 100%; */
}

.friend_card_wrap {
  display: flex;
  flex-wrap: wrap;
}

a {
  color: inherit;
  text-decoration: none;
}

.friend_card {
  width: 360px;
  /* border: 1px rgb(180, 180, 180) solid; */
  margin: 10px;
  background: rgb(240, 240, 240);
  border-radius: 6px;
  height: 270px;
  box-shadow: 1px 1px 2px 1px rgb(200, 200, 200);
}

.friend_title {
  display: flex;
  height: 80px;
  /* border: 1px red solid; */
}

.friend_image_wrap {
  margin-top: 10px;
  margin-left: 10px;
  height: 70px;
  margin-right: 10px;
}

.friend_image {
  border-radius: 50%;
  width: 65px;
}

.friend_name {
  margin-top: 10px;
  /* text-align: center; */
  font-size: 18px;
  font-weight: 700;
  line-height: 70px;
  height: 70px;
}

.friend_tag_wrap {
  /* margin: 10px; */
  height: 120px;
  /* border: 1px red solid; */
}

.friend_tag_list {
  display: flex;
  flex-wrap: wrap;
  flex-direction: row;
  justify-self: flex-start;
  margin: 10px;
}

.friend_tag {
  width: auto;
  height: 20px;
  border-radius: 20px;
  /* border: 1px solid red; */
  text-align: center;
  padding: 6px;
  padding-left: 10px;
  padding-right: 10px;
  margin: 4px;
  background: rgb(72, 130, 255);
  font-size: 14px;
  color: white;
}

.href {
}

.friend_link {
  margin: auto;
  width: 200px;
  border-radius: 20px;
  text-align: center;
  background: rgb(40, 40, 40);
  color: white;
  height: 30px;
  line-height: 30px;
  font-size: 14px;
}
</style>
