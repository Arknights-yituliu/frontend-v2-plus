<script setup>

const links = [
  {
    "name": "企鹅物流数据统计",
    "link": "https://penguin-stats.cn",
    "linkText": "penguin-stats.cn",
    "tags": ["掉率统计", "刷图规划"],
    "avatar": "penguin_stats_logo.webp"
  },
  {
    "name": "DPS计算器",
    "link": "https://viktorlab.cn/akdata",
    "linkText": "viktorlab.cn/akdata",
    "tags": ["DPS计算", "游戏数据速查", "专精收益", "DPS可视化"],
    "avatar": "akdps.webp"
  },
  {
    "name": "小刻食堂",
    "link": "https://www.ceobecanteen.top",
    "linkText": "ceobecanteen.top",
    "tags": ["24小时蹲饼", "活动攻略在线推送", "资源提示", "各类常用工具便捷使用"],
    "avatar": "ceobecanteen.png"
  },
  {
    "name": "寻访记录分析",
    "link": "https://arkgacha.kwer.top",
    "linkText": "arkgacha.kwer.top",
    "tags": ["抽卡记录分析"],
    "avatar": "arkgacha.ico"
  },
  {
    "name": "《明日方舟》小助手",
    "link": "https://maa.plus",
    "linkText": "maa.plus",
    "tags": ["图像识别", "自动刷图", "一键长草"],
    "avatar": "maa.webp"
  },
  {
    "name": "Arknights-Mower",
    "link": "https://github.com/ArkMowers/arknights-mower",
    "linkText": "github.com/ArkMowers/arknights-mower",
    "tags": ["动态换班", "支持跑单操作", "支持调用MAA"],
    "avatar": "mower.webp"
  },
  {
    "name": "罗德岛助理",
    "link": "https://apps.apple.com/cn/app/id1632810611",
    "linkText": "apps.apple.com/cn/app/id1632810611",
    "tags": ["新闻推送", "理智提醒", "抽卡记录分析", "公开招募计算"],
    "avatar": "rhodes_asst.webp"
  },
  {
    "name": "泰拉通讯枢纽",
    "link": "https://terrach.net",
    "linkText": "terrach.net",
    "tags": ["交流论坛"],
    "avatar": "terra.webp"
  }
]


function openNewPage(url) {
  window.open(url)
}

</script>

<template>

  <div class="f-link-card-wrap">
    <div class="f-link-card" v-for="(link,index) in links" :key="index">
      <div class="f-link-card-content">
        <div class="f-link-card-header">
          <img :src="`/image/website/${link.avatar}`" alt="" class="f-link-avatar" @click="openNewPage(link.link)">
          <span class="f-link-name">{{ link.name }}</span>
        </div>
        <div class="f-link-tag-wrap">
           <span class="f-link-tag" v-for="(tag,index) in link.tags" :key="index">
             {{ tag }}
           </span>
        </div>
      </div>
      <a :href="link.link" class="f-link">{{ link.linkText }}</a>
    </div>
  </div>

</template>

<style scoped>
.f-link-card-wrap {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-around;
  padding-bottom: 200px;
}

.f-link-card {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  width: 280px;
  height: 240px;
  margin: 10px;
  border-radius: 4px;
  background-color: var(--c-background-white-transparent);
  box-shadow: 1px 1px 10px var(--c-box-shadow-color)
}

.f-link-card-header {
  display: flex;
  align-items: center;
  height: 40px;
  padding: 8px;
}

.f-link-card-content {
  height: 190px;
}

.f-link-avatar {
  width: 40px;
  height: 40px;
  border-radius: 100px;
  cursor: pointer;
}

.f-link-name {
  display: block;
  line-height: 40px;
  font-weight: bold;

}

.f-link-tag-wrap {
  display: flex;
  flex-wrap: wrap;
}

.f-link-tag {
  display: block;
  padding: 4px 12px;
  margin: 4px;
  font-size: 14px;
  border-radius: 20px;
  background: rgb(61, 111, 224);
  color: white;
}

.f-link {
  width: 280px;
  border-radius: 20px;
  text-align: center;
  overflow: hidden;
  background: rgb(40, 40, 40);
  color: #e6e6e6;
  height: 30px;
  line-height: 30px;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
}

</style>