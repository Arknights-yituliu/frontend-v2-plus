<script setup>
import {ref, onMounted} from "vue";
import toolApi from "/src/api/tool";
import login from "/src/pages/survey/login.vue";
import routesJson from "/src/static/json/routes.json";
import notUpdateVisitsRequestsJson from "/src/static/json/not_update_visits_requests.json";
import {language} from '/src/utils/i18n.js'

const LanguageLabel = {
  cn: '中文',
  en: 'English'
}

let menu_flag = ref(false);

function menu_collapse(flag) {
  menu_flag.value = flag;
  if (menu_flag.value) {
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
  // console.log(menu_flag.value);
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
  // console.log(aside_flag.value);
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

const routes = ref(routesJson);
const noUpVi = ref(notUpdateVisitsRequestsJson);

let pageTitle = ref("");

function getPageTitle(path) {
  if (path === "/") return (pageTitle.value = "材料一图流");

  for (let i of routes.value) {
    if (i.isChild) {
      // console.log(path, " ", i.path);
      if (i.path.indexOf(path) > -1) {
        pageTitle.value = i.text;

      }
      for (let c of i.child) {
        // console.log(path, " ", c.path);
        if (c.path.indexOf(path) > -1) {
          pageTitle.value = c.text;

        }
      }
    } else {
      // console.log(path, " ", i.path);
      if (i.path.indexOf(path) > -1) {
        pageTitle.value = i.text;

      }
    }
  }

  if (path.indexOf('tools/schedule') > -1) {
    aside_collapse()
  }

  if (path.indexOf('tools/rogueCal') > -1) {
    aside_collapse()
  }

  if (path.indexOf('tools/maa') > -1) {
    aside_collapse()
    pageTitle.value = "排班生成器旧版-已停止维护,请使用新版生成器"
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

function updateVisits(pathName) {
  //访问"/"直接更新
  if (pathName === "/") {
    console.log("访问的是首页");
    return 1;
  }

  //过滤掉不需要更新访问的路径
  let isUp = true
  for (let i of noUpVi.value) {
    if (i.path === pathName)
      isUp = false
  }

  if (isUp) {
    pathName = removeTrailingSlash(pathName, 2);
    console.log("访问的页面是：", pathName);
    toolApi.updateVisits(pathName);
  } else {
    pathName = removeTrailingSlash(pathName, 2); //剔除两次
    console.log("访问的页面是：", pathName);
  }
  return 1;
}

//剔除末尾“/”
function removeTrailingSlash(path, substrCount) {
  // substrCount 剔除次数
  let devPath = path.replace("/src/pages", "");
  for (let i = 0; i < substrCount; i++) {
    devPath = substrPath(devPath);
  }
  return devPath;
}

function substrPath(pathName) {
  let strLength = pathName.length;
  const lastStr = pathName.substr(strLength - 1, strLength);
  if (lastStr === "/") {
    pathName = pathName.substr(0, strLength - 1);
    console.log("路径以“/”结尾，被截取后路径：", pathName);
    return pathName;
  }
  return pathName
}

onMounted(() => {
  const pathName = window.location.pathname;
  updateVisits(pathName);
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
  <div class="header-wrap">
    <i class="menu-button iconfont" :class="asideIcon" @click="menu_collapse(true)">
    </i>
    <i class="menu-button-desktop iconfont" :class="asideIcon" @click="aside_collapse()">
    </i>
    <div class="page-title" @click="aside_collapse()">
      {{ pageTitle }}
    </div>


    <div class="spacer"></div>
    <i class="iconfont icon-theme-style" :class="themeV2==='dark'?'icon-moon':'icon-sun'" @click="switchTheme()"></i>
    <div class="icon-button" @click="feedbackPopupVisible = !feedbackPopupVisible">
      <i class="iconfont icon-survey icon-feed-back-style"></i>
      <span style="font-size: 14px;color: white;">反馈</span>
    </div>
    <c-popover :name="'language'" v-show="i18nButtonVisible">
      <template #title>
        <div class="icon-button">
          <i class="iconfont icon-language icon-language-style"></i>
          <span style="font-size: 14px;color: white;">{{ LanguageLabel[language] }}</span>
        </div>
      </template>
      <div class="language-options" id="language">
        <span @click="language='cn'">中文</span>
        <span @click="language='en'">English</span>
      </div>
    </c-popover>
    <login></login>


    <div class="drawer_wrap">
      <div class="drawer" id="drawer114">
        <div class="menu_table">
          <!-- 标题区 -->
          <a href="/" style="text-decoration: none; color: white">
            <div class="menu-label">明日方舟一图流</div>
          </a>
          <!-- 导航菜单 -->
          <div class="aside_menu_set" v-for="(r, index) in routes" :key="index">
            <!-- 一级标题 -->
            <a class="menu-bar menu-parent" :href="r.path" v-show="r.isChild">
              <div class="menu-parent-icon"></div>
              {{ r.text }}
            </a>
            <!-- 二级标题组 -->
            <a :href="c.path" class="menu-bar" v-for="(c,index) in r.child" :key="index">
                <i class="iconfont menu-icon" :class="`icon-${c.icon}`"></i>
                 {{ c.text }}
            </a>
            <div class="aside-divider"></div>
          </div>
        </div>
      </div>
      <div class="menu-mask" id="drawerMask514" @click="menu_collapse(false)"></div>
    </div>
  </div>


  <c-popup v-model:visible="feedbackPopupVisible" :style="feedbackPopupStyle">
    <table class="feedback-table">
      <tbody>
      <tr>
        <td>反馈方式</td>
        <td>反馈流程（越靠前越推荐）</td>
        <td style="width: 100px">点击转跳</td>
      </tr>
      <tr>
        <td>Github issues</td>
        <td>国内访问体验稍差一点</td>
        <td>
          <c-button :color="`green`" :status="true" @click="openNewPage(feedbackLinkList.GitHubIssues)">点击前往
          </c-button>
        </td>
      </tr>
      <tr>
        <td>粉丝群539600566</td>
        <td>进群@山桜反馈，如果不在找管理员</td>
        <td>
          <c-button :color="`green`" :status="true" @click="openNewPage(feedbackLinkList.QQFan)">点击前往</c-button>
        </td>
      </tr>
      <tr>
        <td>B站@罗德岛基建BETA</td>
        <td>直接私信反馈</td>
        <td>
          <c-button :color="`green`" :status="true" @click="openNewPage(feedbackLinkList.OfficialAccount)">点击前往
          </c-button>
        </td>
      </tr>
      <tr>
        <td>开发群938710832</td>
        <td>如果有能力自己解决问题，可以加开发群</td>
        <td>
          <!--          <c-button :color="`green`" :status="true" @click="openQQPage()">点击前往</c-button>-->
        </td>
      </tr>
      </tbody>
    </table>
  </c-popup>


</template>


<style scoped>
.menu-button {
  display: none;

}

.menu-button-desktop {
  display: block;
  font-size: 24px;
  color: rgb(230, 230, 230);
}

.icon-button {
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 0 8px;
}

.icon-theme-style {
  font-size: 24px;
  font-weight: bolder;
  padding-right: 4px;
  color: rgb(255, 255, 255);
}

.icon-language-style {
  font-size: 24px;
  color: white;
  padding-right: 4px;
  font-weight: bolder;
}

.icon-feed-back-style {
  font-size: 24px;
  color: white;
  padding-right: 4px;
  font-weight: bolder;
}

.menu-icon{
  font-size: 16px;
  padding: 0 8px;

}

@media (max-width: 1080px) {
  .menu-button {
    display: block;
    margin: 0 4px 0 20px;
    font-size: 40px;
    color: rgb(230, 230, 230)
  }

  .menu-button-desktop {
    display: none;
  }

  .icon-theme-style {
    font-size: 36px;
  }

  .icon-language-style {
    font-size: 36px;
  }

  .icon-feed-back-style {
    font-size: 36px;
  }

  .page-title {
    display: block;
    font-size: 24px;
  }

  .header-wrap {
    height: 72px;
  }

}

.language-options {
  width: 100px;
}

.language-options span {
  display: block;
  padding: 8px;
  font-size: 16px;
  cursor: pointer;
  width: 100px;
  box-sizing: border-box;
}


.feedback-table {
  margin-top: 12px;
  border-collapse: collapse;
  text-align: center;
}


.feedback-table td {
  padding: 12px;
  line-height: 24px;
  border-bottom: 1px solid var(--c-border-color);
}

</style>
