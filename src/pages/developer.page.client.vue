<template>
  <div class="div_page">
    <div class="dev_page_title_1">开发团队</div>
    <div class="dev_page_content">明日方舟一图流网站能走到今天，源自于各位成员的热情贡献，以下是成员的个人信息</div>

    <div class="dev_page_title_2">主要开发</div>

    <div class="dev_wrap">
      <div class="dev_card">
        <div class="dev_image_wrap">
          <a href="https://github.com/yamasakura"> <img class="dev_image_head" src="https://avatars.githubusercontent.com/u/84258011?v=4" /></a>
        </div>
        <div class="dev_content">
          <div class="dev_name">山桜</div>
          <div class="dev_profile">创建</div>
          <div class="dev_work">后端</div>
          <div class="dev_work">前端</div>
        </div>
      </div>

      <div class="dev_card">
        <div class="dev_image_wrap">
          <a href="https://space.bilibili.com/10057492"> <img class="dev_image_head" src="https://avatars.githubusercontent.com/u/84625349?v=4" /></a>
        </div>
        <div class="dev_content">
          <div class="dev_name">Zirunwang</div>
          <div class="dev_profile">创建</div>
          <div class="dev_work">前端</div>
          <div class="dev_work">UI</div>
          <div class="dev_work">效率算法</div>
        </div>
      </div>

      <div class="dev_card">
        <div class="dev_image_wrap">
          <a href="https://github.com/hguandl"> <img class="dev_image_head" src="https://avatars.githubusercontent.com/u/10684225?v=4" /></a>
        </div>
        <div class="dev_content">
          <div class="dev_name">hguandl</div>
          <div class="dev_profile">顾问、创建</div>
          <div class="dev_work">后端</div>
        </div>
      </div>

      <div class="dev_card">
        <div class="dev_image_wrap">
          <a href="https://zhaozuohong.vip"> <img class="dev_image_head" src="https://zhaozuohong.vip/avatar.png" /></a>
        </div>
        <div class="dev_content">
          <div class="dev_name">ZhaoZuohong</div>
          <div class="dev_profile">开发</div>
          <div class="dev_work">后端</div>
          <div class="dev_work">前端</div>
          <div class="dev_work">UI</div>
        </div>
      </div>

      <div class="dev_card">
        <div class="dev_image_wrap">
          <a href="https://www.bilibili.com/video/BV1yL4y1P7K1"> <img class="dev_image_head" src="/image/website/shaobing.png" /></a>
        </div>
        <div class="dev_content">
          <div class="dev_name">一个资深的烧饼</div>
          <div class="dev_profile">顾问</div>
          <div class="dev_work">算法顾问</div>
        </div>
      </div>
    </div>

    <div class="dev_page_title_2">贡献者</div>
    <div class="dev_wrap">
      <div class="dev_card">
        <div class="dev_image_wrap">
          <a href="https://space.bilibili.com/12786648"> <img class="dev_image_head" src="/image/website/wmm.png" /></a>
        </div>
        <div class="dev_content">
          <div class="dev_name">無冕Crownless</div>
          <div class="dev_profile">开发</div>
          <div class="dev_work">UI设计</div>
        </div>
      </div>

      <div class="dev_card">
        <div class="dev_image_wrap">
          <a href="https://github.com/Yanstory"> <img class="dev_image_head" src="https://avatars.githubusercontent.com/u/5153875?v=4" /></a>
        </div>
        <div class="dev_content">
          <div class="dev_name">Yanstime</div>
          <div class="dev_profile">开发</div>
          <div class="dev_work">前端</div>
        </div>
      </div>
      <div class="dev_card">
        <div class="dev_image_wrap">
          <a href="https://github.com/youcai922"> <img class="dev_image_head" src="https://avatars.githubusercontent.com/u/64458943?v=4" /></a>
        </div>
        <div class="dev_content">
          <div class="dev_name">youcai922</div>
          <div class="dev_profile">开发</div>
          <div class="dev_work">后端</div>
        </div>
      </div>

      <div class="dev_card">
        <div class="dev_image_wrap">
          <a href="https://github.com/Ks-luow"> <img class="dev_image_head" src="https://avatars.githubusercontent.com/u/64978950?v=4" /></a>
        </div>
        <div class="dev_content">
          <div class="dev_name">Ks-luow</div>
          <div class="dev_profile">开发</div>
          <div class="dev_work">后端</div>
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
