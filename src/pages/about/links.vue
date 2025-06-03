<script setup>

import {ref} from "vue";


const requestOptions = {
  method: 'GET',
  redirect: 'follow'
};

let toolLinks = ref([])

fetch("https://server-cdn.ceobecanteen.top/api/v1/cdn/operate/toolLink/list", requestOptions)
    .then(response => response.json())
    .then(result => {
      for (const item of result.data) {
        const formatItem = formatLinkData(item);
        console.log(formatItem)
        toolLinks.value.push(formatItem)
      }
      extraLinks()
    })
    .catch(error => console.log('error', error));


function openNewPage(url) {
  window.open(url)
}

function extraLinks(){
  toolLinks.value.push({
    name:'Bilibili游戏中心',
    description:'哔哩哔哩游戏中心明日方舟专区',
    links:[{name:'明日方舟-攻略区',url:'https://app.biligame.com/detail?tab=2&id=101772&directory_id=DR1914546352407318556'}],
    iconUrl:'https://ark.yituliu.cn/image/website/bilibili.webp',
    slogan:'',
    tags:["新闻动态", "攻略合集"]
  })

    toolLinks.value.push({
    name:'MaaAssistantArknights',
    description:'《明日方舟》小助手，自动刷图、智能基建换班，全日常一键长草',
    links:[{name:'官网',url:'https://maa.plus'}],
    iconUrl:'https://maa.plus/docs/images/maa-logo_512x512.png',
    slogan:'',
    tags:["图像识别", "自动刷图", "一键长草"]
  })

  toolLinks.value.push({
    name:'Mirror酱',
    description:'Mirror酱是一个第三方应用分发平台，让开源应用的更新更简单。用户付费使用，收益与开发者共享。此外，Mirror酱本身也是开源的。',
    links:[{name:'官网',url:'https://mirrorchyan.com/zh/get-start'}],
    iconUrl:'https://mirrorchyan.com/favicon.ico',
    slogan:'',
    tags:['开源分发平台','高速下载']
  })

  toolLinks.value.push({
    name:'Arknights-Mower',
    description:'动态换班',
    links:[{name:'项目地址',url:'https://github.com/ArkMowers/arknights-mower'}],
    iconUrl:'https://ark.yituliu.cn/image/website/mower.webp',
    slogan:'',
    tags:["动态换班", "支持跑单操作", "支持调用MAA"]
  })
}




const formatLinkData = (data, localized = 'zh_CN') => {

  const {
    localized_name, localized_description, localized_slogan,
    localized_tags, icon_url, links
  } = data


  return {
    name: localized_name[localized],
    description: localized_description[localized],
    slogan: localized_slogan[localized],
    tags: localized_tags[localized],
    iconUrl: icon_url,
    links: _formatLinks(links)
  }


  function _formatLinks(links, localized = 'zh_CN') {
    let list = []
    for (const item of links) {
      const {localized_name, url} = item
      list.push({
        name: localized_name[localized],
        url: url
      })
    }
    return list
  }
}





</script>

<template>

  <div class="tool-link-page">
    <v-card v-for="(item,index) in toolLinks" :key="index" class="tool-link-card">
      <v-card-text>
      <div class="tool-link-card-content">
        <div class="f-link-card-header">
          <img :src="item.iconUrl" alt="" class="f-link-avatar" @click="openNewPage(item.url)">
          <span class="f-link-name">{{ item.name }}</span>
        </div>
        <div class="f-link-tag-wrap">
          <v-chip v-for="(tag,index) in item.tags" :key="index" style="margin: 4px" color="primary">
            {{ tag }}
          </v-chip>
        </div>
        <p>{{ item.description }}</p>
      </div>
      <v-btn rounded="x-large" color="primary"  class="tool-link-button"  v-for="(link,index) in item.links" @click="openNewPage(link.url)">
        {{ link.name }}
      </v-btn>
      </v-card-text>
    </v-card>

  </div>

</template>

<style scoped>

.tool-link-page{
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  .tool-link-card{
    width: 350px;
    margin: 4px;

  }
  .tool-link-card-content{
    height: 240px;
  }

  .tool-link-button{
    margin: 4px;
  }
}

.f-link-card-header {
  display: flex;
  align-items: center;
  height: 40px;
  padding: 8px;
}


.f-link-avatar {
  width: 40px;
  height: 40px;
  border-radius: 100px;
  margin: 0 12px 0 0;
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



</style>