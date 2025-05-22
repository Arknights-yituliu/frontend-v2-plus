<template>
  <div class="div_page">

    <h1>参与开发</h1>
    <h2>项目技术栈</h2>
    <h4>前端</h4>
    框架：<a href="https://cn.vuejs.org">vue@3</a> <br/>
    vite插件（服务端渲染）：<a href="https://cn.vite-plugin-ssr.com">vite-plugin-ssr</a>
    <h4>后端</h4>
    框架：<a href="https://spring.io/projects/spring-boot">Spring Boot 3</a> <br/>
    数据库：<a href="https://www.mysql.com/">Mysql 8.0</a> 、<a href="https://redis.io/">redis 7</a>

    <h2>示例/沙盒</h2>
    <a href="http://localhost:3000/design">http://localhost:3000/design</a>
    <h2>Github</h2>

    <div class="card-module">
      <DevCard v-for="(data,index) in developmentRelated" :key="index" :data="data">

      </DevCard>
    </div>
    <h2>开发群</h2>
    <div class="card-module">
      <DevCard v-for="(data,index) in developmentChat" :key="index" :data="data">

      </DevCard>
    </div>
    <h2>信息发布</h2>
    <div class="card-module">
      <DevCard v-for="(data,index) in informationRelease" :key="index" :data="data">

      </DevCard>
    </div>
    <h2>网站开发贡献者名单</h2>
    <div class="card-module">
      <DevCard v-for="(data,index) in developmentTeam" :key="index" :data="data">
      </DevCard>
    </div>

    <h2>开发资料和数据来源</h2>
    <div class="card-module">
      <DevCard v-for="(data,index) in developResources" :key="index" :data="data">
      </DevCard>
    </div>

    <!--    <div class="mdui-typo" id="dev_api">-->
    <!--      <h1>数据接口</h1>-->
    <!--      可供第三方使用的数据接口 详见<a href="/about/api">API文档</a>页面-->
    <!--    </div>-->




    <div class="mdui-typo" id="dev_api">
      <h1>版权声明与许可协议</h1>
      <p>网站所涉及的公司名称、商标、产品等均为其各自所有者的资产，仅供识别。</p>
      <p>网站内使用的游戏图片、动画、音频、文本原文，仅用于更好地表现游戏资料，其版权属于
        Arknights/上海鹰角网络科技有限公司。</p>
      <p>
        除非另有声明网站其他内容采用
        <a href="https://creativecommons.org/licenses/by-nc/4.0/deed.zh">知识共享 署名-非商业性使用 4.0 国际
          许可协议</a>
        进行许可。转载、公开或以任何形式复制、发行、再传播本页任何内容时，必须注明从明日方舟一图流转载，并提供版权标识、许可协议标识、免责标识和作品链接；且未经许可，不得将本站内容或由其衍生作品用于商业目的。
      </p>
      <p>本项目为无偿开源项目，致力于方便明日方舟玩家。如有开发/数据分析/设计/美工经验，欢迎来开发群一叙。</p>
    </div>
  </div>
</template>

<script setup>
import DevCard from "/src/components/dev/DevCard.vue";

import developmentRelated from '/src/static/json/about/developmentRelated.json'
import developmentChat from '/src/static/json/about/developmentChat.json'
import informationRelease from '/src/static/json/about/informationRelease.json'
import developmentTeam from '/src/static/json/about/developmentTeam.json'
import developResources from '/src/static/json/about/developResources.json'




</script>

<style>
.div_page {
   padding: 12px;
}



.card-module {
  display: flex;
  flex-wrap: wrap;
}
</style>
