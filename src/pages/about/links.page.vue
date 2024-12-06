<script setup>

import {ref} from "vue";
import {NCard, NTag, NButton} from 'naive-ui'
import "/src/assets/css/about.scss"

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
        toolLinks.value.push(formatItem)
      }

    })
    .catch(error => console.log('error', error));


function openNewPage(url) {
  window.open(url)
}


const formatLinkData = (data, localized = 'zh_CN') => {

  const {
    localized_name, localized_description, localized_slogan,
    localized_tags, icon_url, links
  } = data
  console.log(data)
  console.log(links)
  return {
    name: localized_name[localized],
    description: localized_description[localized],
    slogan: localized_slogan[localized],
    tags: localized_tags[localized],
    icon_url: icon_url,
    links: formatLinks(links)
  }


  function formatLinks(links, localized = 'zh_CN') {
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
    <n-card v-for="(item,index) in toolLinks" :key="index" class="tool-link-card">
      <div class="tool-link-card-content">
        <div class="f-link-card-header">
          <img :src="item.icon_url" alt="" class="f-link-avatar" @click="openNewPage(item.url)">
          <span class="f-link-name">{{ item.name }}</span>
        </div>
        <div class="f-link-tag-wrap">
          <n-tag type="info" round v-for="(tag,index) in item.tags" :key="index" style="margin: 4px">
            {{ tag }}
          </n-tag>
        </div>
        <p>{{ item.description }}</p>
      </div>
      <n-button quaternary type="error" v-for="(link,index) in item.links" @click="openNewPage(link.url)">
        {{ link.name }}
      </n-button>
    </n-card>
  </div>

</template>

<style scoped>
.f-link-card-wrap {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-around;
  padding-bottom: 200px;
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
  line-height: 30px;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
}

</style>