<template>
  <div class="aside_table">
    <!-- 标题区 -->
    <a href="https://yituliu.site/" style="text-decoration: none; color: white">
      <div class="aside_title">明日方舟一图流</div>
    </a>
    <!-- 导航菜单 -->
    <div class="aside_menu_set" v-for="(r, index) in routes" :key="index">
      <!-- 一级标题 -->
      <a class="aside_menu_parent nav_href" :href="r.path">
        <div :class="navParentSelected(r.path)" v-show="r.isChild">
          {{ r.text }}
        </div>
      </a>
      <!-- 二级标题组 -->
      <a :href="c.path" class="nav_href" v-for="c in r.child">
        <div :class="navChildSelected(c.path)">
          {{ c.text }}
        </div>
      </a>
      <div class="aside_divider"></div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { mdiChartBoxOutline, mdiGiftOutline, mdiCalculator, mdiCalendarCursorOutline, mdiGold } from "@mdi/js";
import routesJson from "@/static/json/routes.json";

let pathName = ref("/");

function getPathName(path) {
  if (path == "/") {
    pathName.value = path;
    return 1;
  }

  let strLength = path.length;

  if (strLength < 2) {
    pathName.value = path;
    return 1;
  }

  const lastStr = path.substr(strLength - 1, strLength);

  if (lastStr == "/") {
    path = path.substr(0, strLength - 1);
    console.log("路径以“/”结尾，被截取后路径：", path);
    pathName.value = path;
    return 1;
  }

  pathName.value = path;
  return pathName;
}

function navParentSelected(path) {
  console.log(path, "==", pathName.value);
  if (path == pathName.value) return "aside_nav aside_parent aside_nav_selected";
  return "aside_nav aside_parent";
}

function navChildSelected(path) {
  console.log(path, "==", pathName.value);
  if (path == pathName.value) return "aside_nav aside_nav_selected";
  return "aside_nav";
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

const routesLength = ref(routesJson.length);
const routes = ref(routesJson);

onMounted(() => {
  // for (let i in routes) {
  //   if (routes[i].isChild) {
  //     navChildOpen(i, routes[i].child.length);
  //     navChildOpen(i, routes[i].child.length);
  //   }
  // }
  const domain = window.location.host;
  const nowPathName = window.location.pathname;
  getPathName(nowPathName);
  // if (domain.indexOf("dev") == -1) {
  //   routes.value[routesLength]=devRoute;
  // }
});
</script>
