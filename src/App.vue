<script setup>
import '/src/assets/svg/iconfont.css'
import '/src/assets/css/elite.css';

//雪碧图
import '/src/assets/css/sprite/sprite_avatar.css'
import '/src/assets/css/sprite/sprite_icon.css';
import '/src/assets/css/sprite/sprite_item.css';
import "/src/assets/css/sprite/sprite_skill.css";

// 通用样式
import '/src/assets/css/common/title_and_tag.scss'
import '/src/assets/css/common/popover.scss'
import '/src/assets/css/common/icon.scss'

import '/src/assets/css/layout.scss'
import '/src/assets/css/layout/basic.scss'
import '/src/assets/css/layout/main.scss'
import '/src/assets/css/common/theme.scss'
import '/src/assets/css/atomic.scss'
import "/src/assets/css/survey/survey_common.css";

import Navigation from '/src/components/drawer/Navigation.vue'
import {useTheme} from 'vuetify'

import User from '/src/pages/account/user.vue'
import {computed, onMounted, ref, watch} from "vue";
import {useRoute} from "vue-router";
import {routeMap} from "/src/router/routes";
import ComponentsContainer from "@/components/ComponentsContainer.vue";
import resourceAPI from '/src/api/resource.js'
import {addData, getDataByKey} from "/src/plugins/IndexedDB/IndexedDB.js";
import OperatorTable from '/src/static/json/game-data/operator_table.json'

const theme = useTheme()

let customTheme = ref("")
let drawer = ref(true)


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

watch(currentPath, (newPath, oldPath) => {
  pageTitle.value = routeMap.get(normalizePath(newPath)) || '未定义路径'
  // 在这里执行你想要的操作
});


function initResource() {
  resourceAPI.getOperatorTableByCOS().then(rep => {
    const data = {
      name: 'OperatorTable',
      resource: rep.data,
      updateTime: new Date().getTime().toString(),
    }
    addData(data)
  })
}

const feedbackTable = [
  {
    label: "Github issues",
    description: '国内访问体验稍差一点',
    url: 'https://github.com/Arknights-yituliu/frontend-v2-plus/issues'
  },
  {
    label: "B站@罗德岛基建BETA",
    description: '直接私信反馈',
    url: 'https://space.bilibili.com/688411531'
  },
  {
    label: "粉丝群539600566",
    description: '进群@山桜反馈，如果不在找管理员',
    url: 'https://jq.qq.com/?_wv=1027&k=q1z3p9Yj'
  },
  {
    label: "开发群938710832",
    description: '如果有能力自己解决问题，可以加开发群',
    url: void 0
  }
]


onMounted(() => {
  const themeSet = localStorage.getItem("Theme");
  console.log(themeSet)
  changeTheme()
  // initResource()
  // getDataByKey('OperatorTable').then(rep=>{
  //   console.log("indexedDB {} ",rep.resource)
  // })

  // console.log(OperatorTable)
})


</script>

<template>
  <v-responsive >
    <v-app class="app" :class="customTheme">
      <v-navigation-drawer v-model="drawer" width="280" class="navigation-drawer">
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
        <v-dialog v-model="feedbackPopupVisible" max-width="500">
          <v-card>
            <div class="flex justify-end m-8" @click="feedbackPopupVisible=false">
              <v-icon icon="mdi-close"></v-icon>
            </div>
            <v-table>
              <thead>
              <tr>
                <th class="text-left">
                  反馈方式
                </th>
                <th class="text-left">
                  说明
                </th>
                <th class="text-left">
                  操作
                </th>
              </tr>
              </thead>
              <tbody>
              <tr
                  v-for="item in feedbackTable"
                  :key="item.name"
              >
                <td>{{ item.label }}</td>
                <td>{{ item.description }}</td>
                <td>
                  <v-btn v-show="item.url" color="green" @click="openNewPage(item.label)">点击前往</v-btn>
                </td>
              </tr>
              </tbody>
            </v-table>

          </v-card>
        </v-dialog>
        <v-container>
          <router-view>

          </router-view>

            <div class="flex justify-center align-center">
              <img src="/image/website/备案图标.png" style="width: 20px; height: 20px;margin: 0 12px" alt=""/>
              <a href="https://beian.miit.gov.cn/">豫ICP备2024043594号-1</a>
            </div>

          <ComponentsContainer></ComponentsContainer>
        </v-container>
      </v-main>
    </v-app>
  </v-responsive>

</template>





