<script setup>

const links = [
  {
    "name": "明日方舟材料理智消耗查询器v0.1",
    "link": "https://docs.qq.com/sheet/DQW1vZkNBcGlyTGlT?tab=000001",
    "linkText": "腾讯文档",
    "tags": ["掉率统计", "刷图规划"],
    "avatar": "penguin_stats_logo.webp"
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
           这里糊作品相关信息
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