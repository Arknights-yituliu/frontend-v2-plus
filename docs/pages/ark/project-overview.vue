<script setup >
import developmentChat from "@/static/json/about/developmentChat.json";
import informationRelease from "@/static/json/about/informationRelease.json";
import developmentTeam from "@/static/json/about/developmentTeam.json";
import developResources from "@/static/json/about/developResources.json";
import DevCard from "@/components/DevCard.vue";
</script>
<template>
  <h1 id="project">项目简介</h1>
  <v-divider class="border-opacity-50"></v-divider>
  <p>明日方舟一图流是一个无偿开源项目，旨在给各位博士提供一些游玩策略上的参考。包括以下内容：</p>

  <h1 id="project">网站功能</h1>
  <v-divider class="border-opacity-50"></v-divider>
  <h2 id="item">材料规划</h2>
  <ul>
    <li>精英材料刷取推荐：提供刷取精英材料的最佳地点参考</li>
    <li>商店性价比：提供各种商店中的材料兑换优先级参考</li>
    <li>礼包性价比：氪金时的性价比参考</li>
    <li>材料价值表：如果有额外的对材料方面的需求，但是网站上没有，可以通过这个页面自行计算</li>
    <li>干员精二价值表：主要用于直升道具（使用将干员直接提升为精二1级状态）使用时的参考</li>
  </ul>
  <h2 id="tools">实用小工具</h2>
  <ul>
    <li>攒抽计算器：提供当前时间到未来多个限定卡池时的可获取的抽卡次数，为博士的抽卡策略提供参考</li>
    <li>排班生成器：提供帕拉斯的基建协议可视化编辑器</li>
    <li>专精减半计算器：提供减半类专精技能的计算</li>
  </ul>
  <h2 id="survey">调查与统计</h2>
  <ul>
    <li>干员练度调查结果：基于收集来的博士们的练度数据进行统计，为博士的技能专精提供数据参考</li>
    <li>公招tag调查：基于上传到一图流的公招词条，统计部分tag的出率情况</li>
  </ul>
  <h1 id="project">加入我们</h1>
  <v-divider class="border-opacity-50"></v-divider>
  <h2>项目技术栈</h2>
  <h3>前端</h3>
  框架：<a href="https://cn.vuejs.org">vue@3</a> <br/>
  UI库：<a href="https://vuetifyjs.com/zh-Hans">vuetify</a>、<a href="https://element-plus-docs.bklab.cn/zh-CN">element-plus</a>、
  <a href="https://www.naiveui.com/zh-CN">naive-ui</a><br/>

  <h3>后端</h3>
  框架：<a href="https://spring.io/projects/spring-boot">Spring Boot 3</a> <br/>
  数据库：<a href="https://www.mysql.com/">Mysql 8.0</a> 、<a href="https://redis.io/">redis 7</a>

  <h1>开发群</h1>
  <v-divider class="border-opacity-50"></v-divider>
  <div class="flex flex-wrap">
    <DevCard v-for="(data,index) in developmentChat" :key="index" :data="data">

    </DevCard>
  </div>

  <h1>信息发布</h1>
  <v-divider class="border-opacity-50"></v-divider>
  <div class="flex flex-wrap">
    <DevCard v-for="(data,index) in informationRelease" :key="index" :data="data">

    </DevCard>
  </div>

  <h1>贡献/参与者</h1>
  <p>感谢各位参与到一图流项目中，让网站越来越好</p>
  <v-divider class="border-opacity-50"></v-divider>
  <div class="flex flex-wrap">
    <DevCard v-for="(data,index) in developmentTeam" :key="index" :data="data">
    </DevCard>
  </div>

  <h1>开发资料和数据来源</h1>
  <v-divider class="border-opacity-50"></v-divider>
  <div class="flex flex-wrap">
    <DevCard v-for="(data,index) in developResources" :key="index" :data="data">
    </DevCard>
  </div>

  <h1>版权声明与许可协议</h1>
  <v-divider class="border-opacity-50"></v-divider>
  <p>网站所涉及的公司名称、商标、产品等均为其各自所有者的资产，仅供识别。</p>
  <p>网站内使用的游戏图片、动画、音频、文本原文，仅用于更好地表现游戏资料，其版权属于 Arknights/上海鹰角网络科技有限公司。</p>
  <p>
    除非另有声明网站其他内容采用
    <a href="https://creativecommons.org/licenses/by-nc/4.0/deed.zh">知识共享 署名-非商业性使用 4.0 国际许可协议</a>进行许可。
    转载、公开或以任何形式复制、发行、再传播本页任何内容时，必须注明从明日方舟一图流转载，并提供版权标识、许可协议标识、免责标识和作品链接；
    且未经许可，不得将本站内容或由其衍生作品用于商业目的。
  </p>
  <p>本项目为无偿开源项目，致力于方便明日方舟玩家。如有开发/数据分析/设计/美工经验，欢迎来开发群一叙。</p>
</template>
