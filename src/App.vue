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

const buildTime = import.meta.env.BUILD_TIME;

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
            <v-icon icon="mdi-theme-light-dark" @click="changeTheme"></v-icon>
            <div class="app-bar-content-spacer"/>
            <v-menu>
              <template v-slot:activator="{ props }">
                <!--              <v-icon icon="mdi-translate" size="28" v-bind="props" >-->
                <!--              </v-icon>-->
                <v-btn :text="language" prepend-icon="mdi-translate" v-bind="props"></v-btn>

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
        <v-main class="main-with-sticky-footer">
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
          <div class="main-content">
            <v-container>
              <router-view>
              </router-view>

            </v-container>
          </div>

          <v-card title="版权声明与许可协议" class="m-8">
            <v-card-text>
              网站所涉及的公司名称、商标、产品等均为其各自所有者的资产，仅供识别。网站内使用的游戏图片、动画、音频、文本原文，仅用于更好地表现游戏资料，其版权属于
              Arknights/上海鹰角网络科技有限公司。<br>
              除非另有声明，网站其他内容采用<a href="https://creativecommons.org/licenses/by-nc/4.0/deed.zh">知识共享
              署名-非商业性使用 4.0 国际
              许可协议</a>进行许可。转载、公开或以任何形式复制、发行、再传播本页任何内容时，必须注明从明日方舟一图流转载，并提供版权标识、许可协议标识、免责标识和直接指向被引用页面的链接；且未经许可不得将本站内容或由其衍生作品用于商业目的。<br>
              本项目为无偿开源项目，致力于方便明日方舟玩家。如有开发/数据分析/设计/美工经验，欢迎来<a
                href="https://jq.qq.com/?_wv=1027&k=ZmORnr5F">开发群</a>一叙。
            </v-card-text>
          </v-card>
          <div style="padding: 0 0 0 16px">本页面构建于 {{ buildTime }}</div>
          <v-footer class="flex justify-center sticky-footer" color="primary">
            <img src="/image/website/备案图标.png" style="width: 20px; height: 20px;margin: 0 12px" alt=""/>
            <a href="https://beian.miit.gov.cn/" style="color: white">豫ICP备2024043594号-1</a>

          </v-footer>
        </v-main>
      </v-app>

    </v-responsive>
  </n-config-provider>
</template>





