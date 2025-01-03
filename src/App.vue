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
import ComponentsContainer from "@/components/ComponentsContainer.vue";
import {language} from "@/utils/i18n.js";

let customTheme = ref("")
let drawer = ref(true)
let rightDrawer = ref()


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
  localStorage.setItem("Theme", currentTheme.value)
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
  if (path === '/' || !path) {
    return '/';
  }

  // 如果路径最后一位是 '/'，则去除它
  if (path.endsWith('/')) {
    return path.slice(0, -1);
  }

  // 否则，返回原路径
  return path;
}

let feedbackPopupVisible = ref(false)

const feedbackLinkList = {
  "GitHubIssues": 'https://github.com/Arknights-yituliu/frontend-v2-plus/issues',
  "OfficialAccount": 'https://space.bilibili.com/688411531',
  "QQFan": 'https://jq.qq.com/?_wv=1027&k=q1z3p9Yj',
  "QQDocs": 'https://docs.qq.com/form/page/DVVNyd2J5RmV2UndQ#/fill'
}

function openNewPage(url) {
  window.open(url)
}


</script>

<template>
  <v-responsive class="border rounded">
    <v-app class="app color_var" :class="customTheme">
      <v-navigation-drawer v-model="drawer" width="280" class="navigation-drawer">

<!--        <img src="/image/website/icon-large.webp" alt=""-->
<!--             style="border-radius: 1000px;width: 120px;margin:36px auto 20px;display: block">-->

        <div style="text-align: center;font-size: 24px;font-weight: bolder;padding: 36px 0 12px">
          明日方舟一图流
        </div>
        <Navigation></Navigation>
      </v-navigation-drawer>

      <v-app-bar :elevation="1" color="primary">
        <template v-slot:prepend>
          <v-app-bar-nav-icon @click="drawer=!drawer"></v-app-bar-nav-icon>
        </template>
        <v-app-bar-title>{{ pageTitle }}
        </v-app-bar-title>
        <div class="app-bar-content">
          <v-btn text="反馈" variant="text" style="font-size: 16px" @click="feedbackPopupVisible=true"></v-btn>
          <div class="app-bar-content-spacer"/>
<!--          <v-menu>-->
<!--            <template v-slot:activator="{ props }">-->
<!--              <v-icon icon="mdi-translate" size="28" v-bind="props"></v-icon>-->
<!--            </template>-->
<!--            <v-list>-->
<!--              <v-list-item>-->
<!--                <v-btn variant="text" @click="language='cn'" text="中文"></v-btn>-->
<!--              </v-list-item>-->
<!--              <v-list-item>-->
<!--                <v-btn variant="text" @click="language='en'" text="English"></v-btn>-->
<!--              </v-list-item>-->
<!--            </v-list>-->
<!--          </v-menu>-->
<!--          <div class="app-bar-content-spacer"/>-->
          <v-icon icon="mdi-theme-light-dark" size="28" @click="changeTheme"></v-icon>
          <div class="app-bar-content-spacer"/>
          <User></User>
        </div>
      </v-app-bar>
      <v-main>
        <v-dialog v-model="feedbackPopupVisible">
          <v-card max-width="320" class="m-a" >
            <v-card-text title="反馈方式">
              <v-list lines="three">
                <v-list-item title="Github issues" subtitle="国内访问体验稍差一点">
                  <v-btn color="green" @click="openNewPage(feedbackLinkList.GitHubIssues)">点击前往</v-btn>
                </v-list-item>
                <v-list-item title="粉丝群539600566" subtitle="进群@山桜反馈，如果不在找管理员">
                  <v-btn color="green" @click="openNewPage(feedbackLinkList.QQFan)">点击前往</v-btn>
                </v-list-item>
                <v-list-item title="B站@罗德岛基建BETA" subtitle="直接私信反馈">
                  <v-btn color="green" @click="openNewPage(feedbackLinkList.OfficialAccount)">点击前往</v-btn>
                </v-list-item>
                <v-list-item title="开发群938710832" subtitle="如果有能力自己解决问题，可以加开发群">
                </v-list-item>
              </v-list>
            </v-card-text>
          </v-card>
        </v-dialog>
        <v-container>
          <router-view>

          </router-view>
          <ComponentsContainer></ComponentsContainer>
        </v-container>
      </v-main>
    </v-app>
  </v-responsive>

</template>





