<script setup>
import {ref} from 'vue'
import '/src/assets/css/rogueSeed/rogue-seed-page.scss'
import RogueSeedPage from '/src/pages/tools/rogue-seed-page.vue'
import RogueSeedUpload from '/src/pages/tools/rogue-seed-upload.vue'

let currentNavigation = ref('种子列表')

const navigationAction = (navLabel) => {
  if (navLabel === currentNavigation.value) {
    return 'rogue-seed-navigation-button-action';
  }
}

const chooseNavigation = (navLabel) => {
  currentNavigation.value = navLabel
}

</script>


<template>
  <div class="rogue-seed-page">
    <div class="rogue-seed-navigation-bar">
      <div class="rogue-seed-navigation-button" :class="navigationAction('种子列表')"
           @click="chooseNavigation('种子列表')">
        种子列表
      </div>
      <div class="rogue-seed-navigation-button" :class="navigationAction('上传种子')"
           @click="chooseNavigation('上传种子')">
        上传种子
      </div>
    </div>

    <div class="rogue-seed-display-page">
      <RogueSeedPage v-show="'种子列表'===currentNavigation"></RogueSeedPage>
      <RogueSeedUpload v-show="'上传种子'===currentNavigation"></RogueSeedUpload>
    </div>
  </div>


</template>