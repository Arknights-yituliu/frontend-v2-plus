<script setup>
import '/src/assets/svg/iconfont.css'
import '/src/assets/css/elite.css';
import {NConfigProvider} from 'naive-ui'
import {zhCN, dateZhCN} from 'naive-ui'
import {darkTheme} from 'naive-ui'
//雪碧图
import '/src/assets/css/sprite/sprite_avatar.css'
import '/src/assets/css/sprite/sprite_icon.css';
import '/src/assets/css/sprite/sprite_item.css';
import "/src/assets/css/sprite/sprite_skill.css";

// 通用样式
import '/src/assets/css/common/title_and_tag.scss'
import '/src/assets/css/common/icon.scss'

import '/src/assets/css/common/app.scss'
import '/src/assets/css/common/vuetify.scss'
import '/src/assets/css/layout/basic.scss'
import '/src/assets/css/common/theme.scss'
import '/src/assets/css/atomic/atomic.scss'

import Navigation from '/src/components/layout/Navigation.vue'
import {useTheme} from 'vuetify'

import User from '/src/pages/account/user.vue'
import {computed, onMounted, ref, watch} from "vue";
import {useRoute} from "vue-router";
import {routeMap} from "/src/router/routes";
import ComponentsContainer from "/src/components/layout/ComponentsContainer.vue";
import FeedbackTable from '/src/static/json/about/feedback_table.json'
import {language} from '/src/utils/i18n.js'

const themeOverrides = {
  common: {
    primaryColor: '#1867C0FF',
    borderColor: "rgba(93,162,248,0.3)",
    primaryColorHover: "#60acff",
  },
  // ...
}


const theme = useTheme()

let customTheme = ref("")
let drawer = ref(true)


let currentTheme = ref('dark')
let naiveTheme = ref()

function setTheme(value) {
  theme.global.name.value = value
  document.getElementsByTagName("html").item(0).className = value;
  customTheme.value = `theme-${value}`
  if (value === 'dark') {
    naiveTheme.value = darkTheme
  } else {
    naiveTheme.value = ''
  }
  localStorage.setItem("Theme", value)
}

function changeTheme() {
  currentTheme.value = currentTheme.value === 'dark' ? 'light' : 'dark'
  setTheme(currentTheme.value)
}

const route = useRoute();
const currentPath = computed(() => route.path);

let pageTitle = ref(routeMap.get(normalizePath(route.path)));


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


function openNewPage(url) {
  window.open(url)
}

watch(currentPath, (newPath, oldPath) => {
  pageTitle.value = routeMap.get(normalizePath(newPath)) || '未定义路径'

  if (route.name === '材料统计') {
    drawer.value = false
  }
  // 在这里执行你想要的操作
});


onMounted(() => {
  currentTheme.value = localStorage.getItem("Theme") === 'dark' ? 'dark' : 'light';
  setTheme(currentTheme.value)
  // initResource()
  // getDataByKey('OperatorTable').then(rep=>{
  //   console.log("indexedDB {} ",rep.resource)
  // })

  // console.log(OperatorTable)
})


</script>

<template>
  <n-config-provider :locale="zhCN" :date-locale="dateZhCN" :theme="naiveTheme" :theme-overrides="themeOverrides">
    <v-responsive>

      <v-app class="app" :class="customTheme">
        <v-navigation-drawer v-model="drawer" width="280" class="navigation-drawer">
          <div style="text-align: center;font-size: 24px;font-weight: bolder;padding: 12px 0 0">
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
            <v-btn text="反馈" variant="text" @click="feedbackPopupVisible=true"></v-btn>
            <div class="app-bar-content-spacer"/>
            <v-icon icon="mdi-theme-light-dark" size="28" @click="changeTheme"></v-icon>
            <div class="app-bar-content-spacer"/>
            <v-menu>
              <template v-slot:activator="{ props }">
              <v-icon icon="mdi-translate" size="28" v-bind="props"></v-icon>
              </template>
              <v-list>
                <v-list-item>
                  <v-btn variant="text" text="中文" color="primary" @click="language='cn'"></v-btn>
                </v-list-item>
                <v-list-item>
                  <v-btn variant="text" text="English" color="primary" @click="language='en'"></v-btn>
                </v-list-item>
              </v-list>
            </v-menu>
            <div class="app-bar-content-spacer"/>
            <User></User>

          </div>
        </v-app-bar>
        <v-main>
          <v-dialog v-model="feedbackPopupVisible" max-width="500">
            <v-card>
              <div class="flex justify-end m-8" @click="feedbackPopupVisible=false">
                <v-icon icon="mdi-close"></v-icon>
              </div>
              <v-table>
                <thead>
                <tr>
                  <th>反馈方式</th>
                  <th>说明</th>
                  <th>操作</th>
                </tr>
                </thead>
                <tbody>
                <tr v-for="item in FeedbackTable" :key="item.name">
                  <td>{{ item.label }}</td>
                  <td>{{ item.description }}</td>
                  <td>
                    <v-btn v-show="item.url" color="green" @click="openNewPage(item.url)">点击前往</v-btn>
                  </td>
                </tr>
                </tbody>
              </v-table>

            </v-card>
          </v-dialog>
          <v-container>
            <router-view>
            </router-view>
            <ComponentsContainer></ComponentsContainer>
          </v-container>
          <v-footer class="flex justify-center" color="primary">
            <img src="/image/website/备案图标.png" style="width: 20px; height: 20px;margin: 0 12px" alt=""/>
            <a href="https://beian.miit.gov.cn/" style="color: white">豫ICP备2024043594号-1</a>
          </v-footer>
        </v-main>
      </v-app>

    </v-responsive>
  </n-config-provider>
</template>





