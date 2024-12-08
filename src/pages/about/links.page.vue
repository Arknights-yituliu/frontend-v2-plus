<script setup>

import {ref} from "vue";
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
    <v-card v-for="(item,index) in toolLinks" :key="index" class="tool-link-card">
      <div class="tool-link-card-content">
        <div class="f-link-card-header">
          <img :src="item.icon_url" alt="" class="f-link-avatar" @click="openNewPage(item.url)">
          <span class="f-link-name">{{ item.name }}</span>
        </div>
        <div class="f-link-tag-wrap">
          <v-chip v-for="(tag,index) in item.tags" :key="index" style="margin: 4px" color="primary">
            {{ tag }}
          </v-chip>
        </div>
        <p>{{ item.description }}</p>
      </div>
      <v-btn rounded="x-large" type="primary" class="tool-link-button"  v-for="(link,index) in item.links" @click="openNewPage(link.url)">
        {{ link.name }}
      </v-btn>
    </v-card>

  </div>

</template>

<style scoped>



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