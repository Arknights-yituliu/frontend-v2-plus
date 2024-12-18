<script setup>
import {ref, onMounted, watchEffect} from "vue";
import toolApi from "/src/api/tool";
import user from "/src/pages/account/user.vue";
import {routes,LinkedTable} from "/src/router/routes.js";
import {language} from '/src/utils/i18n.js'
import {useRoute} from 'vue-router';
import MyButton from '/src/components/Button.vue'

const LanguageLabel = {
  cn: '中文',
  en: 'English'
}

let menuFlag = ref(false);

function menu_collapse(flag) {
  menuFlag.value = flag;
  if (menuFlag.value) {
    setTimeout(function () {
      document.getElementById("drawer114").style.willChange = 'transform'
      document.getElementById("drawer114").style.transform = "translateX(0)";
      document.getElementById("drawerMask514").style.display = "block";

    }, 30);
  } else {
    document.getElementById("drawer114").style.transform = "translateX(-400px) ";
    document.getElementById("drawerMask514").style.display = "none";
    // document.getElementById("drawer114514").className = "nav_collapse";
  }


}

let aside_flag = ref(true);
let asideIcon = ref('icon-menuoff')

function aside_collapse() {
  aside_flag.value = !aside_flag.value;
  let aside = document.getElementById("aside114")
  let container = document.getElementById("container")
  if (aside_flag.value) {
    aside.style.transform = "translateX(0)";
    aside.style.width = "250px";
    container.style.paddingLeft = "250px";
    asideIcon.value = 'icon-menuoff'
  } else {
    document.getElementById("aside114").style.transform = "translateX(-300px)";
    document.getElementById("aside114").style.width = "0px";
    container.style.paddingLeft = "0px";
    asideIcon.value = 'icon-menuon'
    setTimeout(function () {

    }, 200);
  }

}

let themeV2 = ref('')

function switchTheme() {
  console.log(themeV2.value)

  themeV2.value = themeV2.value === 'dark' ? 'light' : 'dark'

  const container = document.getElementById("container");
  let className = container.className;

  let list = className.split(" ");

  className = className.replace(list[list.length - 1], `theme_${themeV2.value}`)

  container.className = className

  document.getElementsByTagName("html").item(0).className = themeV2.value;

  localStorage.setItem("theme_v2", themeV2.value)
}

const rs = ref(routes);
let pageTitle = ref("");

function getPageTitle(path) {
  if (path === "/") return (pageTitle.value = "材料一图流");

  for (let i of rs.value) {
    if (i.path.indexOf(path) > -1) {
      pageTitle.value = i.text;
    }
  }

}

let i18nButtonVisible = ref(false)

const displayMenu = ['buildingSkill', 'schedule']

function i18nButtonDisplay() {
  i18nButtonVisible.value = false
  const url = window.location.href;
  for (const path of displayMenu) {
    if (url.indexOf(path) > -1) {
      i18nButtonVisible.value = true
      break
    }
  }
}

const route = useRoute();

watchEffect(() => {
  getPageTitle(route.path)
});


onMounted(() => {
  const pathName = window.location.pathname;
  getPageTitle(pathName);
  themeV2.value = localStorage.getItem('theme_v2') === 'dark' ? 'dark' : 'light'
  i18nButtonDisplay()
  console.log(themeV2.value)
});

let feedbackPopupVisible = ref(false)

let feedbackPopupStyle = 'width:500px;'

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
  <div class="header-bar">
    <i class="iconfont menu-button" :class="asideIcon" @click="menu_collapse(true)">
    </i>
    <i class="iconfont menu-button-desktop" :class="asideIcon" @click="aside_collapse()">
    </i>
    <div class="current-page-title" @click="aside_collapse()">
      {{ pageTitle }}
    </div>
    <div class="spacer"></div>
    <i class="iconfont icon-theme-style" :class="themeV2==='dark'?'icon-moon':'icon-sun'" @click="switchTheme()"></i>
    <div class="icon-button" @click="feedbackPopupVisible = !feedbackPopupVisible">
      <i class="iconfont icon-survey icon-feed-back-style"></i>
      <span class="header-button-label">反馈</span>
    </div>
    <c-popover name="language">
      <template #title>
        <div class="icon-button">
          <i class="iconfont icon-language icon-language-style"></i>
          <span class="header-button-label">{{ LanguageLabel[language] }}</span>
        </div>
      </template>
      <div class="language-options" id="language">
        <span @click="language='cn'">中文</span>
        <span @click="language='en'">English</span>
      </div>
    </c-popover>
    <user></user>

    <div class="drawer-container">
      <div class="drawer" id="drawer114">
        <div class="navigation-container">
          <!-- 标题区 -->
          <a href="/" style="text-decoration: none; color: white">
            <div class="side-website-title">明日方舟一图流</div>
          </a>
          <!-- 导航菜单 -->
          <div class="aside_menu_set" v-for="(parent, index) in LinkedTable" :key="index" v-show="parent.display">
            <!-- 一级标题 -->
            <router-link :to="parent.path" class="nav-bar nav-bar-parent">
              <div class="nav-bar-parent-icon"></div>
              <h3> {{ parent.text }}</h3>
            </router-link>

            <!-- 二级标题组 -->
            <router-link :to="child.path" :href="child.path" class="nav-bar nav-bar-child"
                         v-for="(child,index) in parent.child" :key="index">

              <i class="iconfont menu-icon" :class="`icon-${child.icon}`"></i>
              <span>{{ child.text }}</span>
            </router-link>
          </div>
        </div>
      </div>
      <div class="drawer-mask" id="drawerMask514" @click="menu_collapse(false)"></div>
    </div>
  </div>


  <c-popup v-model:visible="feedbackPopupVisible">
    <table class="feedback-table">
      <tbody>
      <tr>
        <td>反馈方式</td>
        <td>反馈流程(越靠前越推荐)</td>
        <td>点击转跳</td>
      </tr>
      <tr>
        <td>Github issues</td>
        <td>国内访问体验稍差一点</td>
        <td>
          <MyButton data-color="green"  @click="openNewPage(feedbackLinkList.GitHubIssues)">点击前往
          </MyButton>
        </td>
      </tr>
      <tr>
        <td>粉丝群539600566</td>
        <td>进群@山桜反馈，如果不在找管理员</td>
        <td>
          <MyButton data-color="green" @click="openNewPage(feedbackLinkList.QQFan)">点击前往</MyButton>
        </td>
      </tr>
      <tr>
        <td>B站@罗德岛基建BETA</td>
        <td>直接私信反馈</td>
        <td>
          <MyButton data-color="green" @click="openNewPage(feedbackLinkList.OfficialAccount)">点击前往
          </MyButton>
        </td>
      </tr>
      <tr>
        <td>开发群938710832</td>
        <td>如果有能力自己解决问题，可以加开发群</td>
        <td>

        </td>
      </tr>
      </tbody>
    </table>
  </c-popup>


</template>


<style scoped>


</style>
