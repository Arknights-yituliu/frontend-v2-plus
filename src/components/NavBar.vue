<template>
  <div class="header_wrap">
    <div class="menu-button" @click="menu_collapse(true)">
      <div></div>
      <div></div>
      <div></div>
    </div>
    <div class="menu_button_desktop" @click="aside_collapse()">
      <div></div>
      <div></div>
      <div></div>
    </div>

    <div class="pageTitle" @click="aside_collapse()">
      {{ pageTitle }}
    </div>

    <div class="spacer"></div>
    <el-switch class="navbar-switch" inline-prompt v-model="theme" :active-icon="Moon" :inactive-icon="Sunny" size="large" />
    <navBar></navBar>

    <div class="drawer_wrap">
      <div class="drawer" id="drawer114">
        <div class="menu_table">
          <div class="menu_title">明日方舟一图流bar</div>
          <div class="line"></div>
          <div v-for="(r, index) in routes" :key="index">
            <div :class="navSelected(index)" @click="navChildOpen(index, r.child.length)" v-show="r.isChild">
              <div class="drawer_nav_text">{{ r.text }}</div>
              <div>
                <el-icon class="drawer_child_icon"><ArrowDownBold :class="iconClass(index)" /></el-icon>
              </div>
            </div>
            <div :class="getChildClass(index)" :id="'nav_phone' + index" v-show="r.isChild">
              <a :href="c.path" class="nav_href" v-for="c in r.child">
                <div class="drawer_nav_child">{{ c.text }}</div></a
              >
            </div>
            <div class="drawer_nav" v-show="!r.isChild">
              <a :href="r.path" class="nav_href">
                <div class="drawer_nav_text">{{ r.text }}</div></a
              >
            </div>
          </div>
        </div>
      </div>
      <div class="menu-mask" id="draweMask514" @click="menu_collapse(false)"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed, inject, onMounted } from "vue";
import { Sunny, Moon } from "@element-plus/icons-vue";
import cookie from "js-cookie";
import toolApi from "@/api/tool";
import { mdiChartBoxOutline, mdiGiftOutline, mdiCalculator, mdiCalendarCursorOutline, mdiGold } from "@mdi/js";
import { usePageContext } from "@/renderer/usePageContext";
import navBar from "@/pages/survey/navBar.vue";
import routesJson from "@/static/json/routes.json";
const pageContext = usePageContext();

const theme = inject("theme");

let menu_flag = ref(false);

function menu_collapse(flag) {
  menu_flag.value = flag;
  if (menu_flag.value) {
    setTimeout(function () {
      document.getElementById("drawer114").style.transform = "translateX(0)";
      document.getElementById("draweMask514").style.display = "block";
    }, 30);
  } else {
    document.getElementById("drawer114").style.transform = "translateX(-400px) ";
    document.getElementById("draweMask514").style.display = "none";
    // document.getElementById("drawer114514").className = "nav_collapse";
  }
  // console.log(menu_flag.value);
}

let aside_flag = ref(true);

function aside_collapse() {
  aside_flag.value = !aside_flag.value;
  if (aside_flag.value) {
    setTimeout(function () {
      document.getElementById("aside114").style.transform = "translateX(0)";
      document.getElementById("aside114").style.width = "250px";
    }, 30);
  } else {
    document.getElementById("aside114").style.transform = "translateX(-400px)";
    document.getElementById("aside114").style.width = "0px";
  }
  // console.log(aside_flag.value);
}

watch(theme, () => {
  const theme_name = theme.value ? "dark" : "light";
  const remove_name = theme.value ? "light" : "dark";
  const root_ele = document.querySelector(":root");
  if (root_ele.classList.contains(remove_name)) {
    root_ele.classList.remove(remove_name);
  }
  root_ele.classList.add(theme_name);
  cookie.set("theme", theme_name, { expires: 30 });
});

let nav_collapseFlag = ref([true, true, true, true, true, true]);

function getChildClass(index) {
  if (nav_collapseFlag.value[index]) return "drawer_nav_child_wrap_init";
  return "drawer_nav_child_wrap";
}

function navChildOpen(index, childNum) {
  nav_collapseFlag.value[index] = !nav_collapseFlag.value[index];
  console.log(index, childNum);
  if (nav_collapseFlag.value[index]) {
    console.log(childNum * 34 + "px");
    console.log("nav" + index);
    document.getElementById("drawer_nav" + index).style.height = childNum * 60 + "px";
    document.getElementById("drawer_nav" + index).style.overflow = "";
  } else {
    document.getElementById("drawer_nav" + index).style.height = "0px";
    document.getElementById("drawer_nav" + index).style.overflow = "hidden";
  }
}

function navSelected(index) {
  if (nav_collapseFlag.value[index]) return "drawer_nav aside_nav_selected";
  return "drawer_nav";
}

function iconClass(index) {
  if (nav_collapseFlag.value[index]) return "drawer_child_icon icon_selected";
  return "drawer_child_icon";
}

const devRoute = {
  path: "/survey",
  text: "干员调查",
  isChild: true,
  child: [
    {
      path: "/survey",
      text: "调查简介",
    },
    {
      path: "/survey/character",
      text: "干员练度调查",
    },
    {
      path: "/survey/score",
      text: "干员风评调查",
    },
    {
      path: "/survey/rank",
      text: "调查结果",
    },
  ],
};

const routes = ref(routesJson);

const route = computed(() => {
  for (let i of routes.value) {
    if (i.path == pageContext.urlPathname || i.path + "/" == pageContext.urlPathname) {
      return i;
    }
  }
  return {};
});

let pageTitle = ref("");

function getpageTitle(path) {
  if (path == "/") return (pageTitle.value = "材料一图流");

  for (let i of routes.value) {
    if (i.isChild) {
      // console.log(path, " ", i.path);
      if (i.path.indexOf(path) > -1) {
        pageTitle.value = i.text;
        break;
      }
      for (let c of i.child) {
        // console.log(path, " ", c.path);
        if (c.path.indexOf(path) > -1) {
          pageTitle.value = c.text;
          break;
        }
      }
    } else {
      // console.log(path, " ", i.path);
      if (i.path.indexOf(path) > -1) {
        pageTitle.value = i.text;
        break;
      }
    }
  }
}

function getPathName(pathName) {
  console.log('当前访问路径：',pathName);
  if (pathName == "/") {
    toolApi.updateVisits(pathName);
    return 1;
  }
  
  let strLength = pathName.length;

  if(strLength<2)  {
    toolApi.updateVisits(pathName);
    return 1;
  }
  
  const lastStr = pathName.substr(strLength - 1, strLength )

  if (lastStr=="/") {
    pathName = pathName.substr(0, strLength - 1);
    console.log("路径以“/”结尾，被截取后路径：", pathName);
    toolApi.updateVisits(pathName);
    return 1;
  }

  toolApi.updateVisits(pathName);
  return 1;
}

onMounted(() => {
  var domain = window.location.host;
  var pathName = window.location.pathname;

  // if (domain.indexOf("dev") == -1) {
  //   routes.value.push(devRoute);
  // }
  // getPathName(pathName);
  getpageTitle(pathName);
});
</script>

<style scoped>
.icon_selected {
  transform: rotate(180deg);
}
</style>
