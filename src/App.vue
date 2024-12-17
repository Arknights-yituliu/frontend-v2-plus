<script setup>
import '/src/assets/svg/iconfont.css'
import '/src/assets/css/stage_v2.css';
import '/src/assets/css/store_v2.css';
import '/src/assets/css/sprite_item.css';
import '/src/assets/css/sprite_style.css';
import '/src/assets/css/sprite_icon.css';
import '/src/assets/css/about.scss';
import '/src/assets/css/elite.css';
import '/src/assets/css/sprite/sprite_avatar.css'
import '/src/assets/css/stage_v3.css';

// 通用样式
import '/src/assets/css/common/btn.scss'
import '/src/assets/css/common/checkbox.scss'
import '/src/assets/css/common/input.scss'
import '/src/assets/css/common/tip.scss'
import '/src/assets/css/common/title_and_tag.scss'
import '/src/assets/css/common/popover.scss'
import '/src/assets/css/common/icon.scss'

import '/src/assets/css/layout.scss'
import '/src/assets/css/layout/aside.scss'
import '/src/assets/css/layout/atom.scss'
import '/src/assets/css/layout/basic.scss'
import '/src/assets/css/layout/navigation.scss'
import '/src/assets/css/layout/main.scss'
import '/src/assets/css/common/theme.scss'
import '/src/assets/css/atomic.scss'

import "/src/assets/css/survey/survey_common.css";

// svg字体
import Navigation from '/src/components/drawer/Navigation.vue'
import {useTheme} from 'vuetify'
// 旧版css，待修改

const theme = useTheme()

import User from '/src/pages/account/user.vue'

import {computed, onMounted, ref, watch} from "vue";
import {useRoute} from "vue-router";
import {routeMap} from "/src/router/routes";

let customTheme = ref("")
let drawer = ref(true)
let rightDrawer = ref(false)


onMounted(() => {
  const themeSet = localStorage.getItem("Theme");
  console.log(themeSet)
  changeTheme()
})

let currentTheme = ref('dark')

function changeTheme() {
  currentTheme.value = currentTheme.value === 'dark' ? 'light' : 'dark'
  theme.global.name.value = currentTheme.value
  document.getElementsByTagName("html").item(0).className = currentTheme.value;
  customTheme.value = `theme-${currentTheme.value}`
  localStorage.setItem("Theme",currentTheme.value)
}

const route = useRoute();
const currentPath = computed(() => route.path);

let pageTitle = ref(routeMap.get(normalizePath(route.path)));

watch(currentPath, (newPath, oldPath) => {

  pageTitle.value = routeMap.get(normalizePath(newPath)) || '未定义路径'
  // 在这里执行你想要的操作
});

function normalizePath(path) {
  // 如果路径是根路径 '/'，直接返回
  if (path === '/'||!path) {
    return '/';
  }

  // 如果路径最后一位是 '/'，则去除它
  if (path.endsWith('/')) {
    return path.slice(0, -1);
  }

  // 否则，返回原路径
  return path;
}


</script>

<template>
  <v-responsive class="border rounded" >
    <v-app class="app color_var" :class="customTheme">
      <v-navigation-drawer v-model="drawer" width="280">
        <Navigation></Navigation>
      </v-navigation-drawer>

      <v-navigation-drawer v-model="rightDrawer" location="right" temporary>
      </v-navigation-drawer>

      <v-app-bar :elevation="1" color="primary">
        <template v-slot:prepend>
          <v-app-bar-nav-icon @click="drawer=!drawer"></v-app-bar-nav-icon>
        </template>
        <v-app-bar-title>{{ pageTitle }}
        </v-app-bar-title>
        <div class="app-bar-content">
          <v-icon icon="mdi-theme-light-dark" size="40" @click="changeTheme"></v-icon>
          <div class="app-bar-content-spacer">
          </div>
         <User></User>
        </div>
      </v-app-bar>

      <v-main>
        <v-container>
          <router-view>
          </router-view>
        </v-container>
      </v-main>
    </v-app>
  </v-responsive>

</template>





