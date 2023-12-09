<template>
  <div class="aside-table" id="aside114">
    <!-- 标题区 -->
    <a href="https://yituliu.site/" style="text-decoration: none; color: white">
      <div class="aside-title">明日方舟一图流</div>
    </a>
    <!-- 导航菜单 -->
    <div class="aside_menu_set" v-for="(r, index) in routes" :key="index">
      <!-- 一级标题 -->
      <a class="nav-href" :href="r.path">
        <div :class="navParentSelected(r.path)" v-show="r.isChild">
          <div class="aside-menu-parent-icon"></div>
          {{ r.text }}
        </div>
      </a>
      <!-- 二级标题组 -->
      <a :href="c.path" class="nav-href" v-for="(c,index) in r.child" :key="index">
        <div :class="navChildSelected(c.path)">
          <div class="aside-menu-child-icon"></div>
          {{ c.text }}
        </div>
      </a>
      <!-- <div class="aside-divider"></div> -->
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from "vue";
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
    // console.log("路径以“/”结尾，被截取后路径：", path);
    pathName.value = path;
    return 1;
  }

  pathName.value = path;
  return pathName;
}

function navParentSelected(path) {
  // console.log(path, "==", pathName.value);
  if (path == pathName.value) return "aside-nav aside_parent aside-nav_selected";
  return "aside-nav aside_parent";
}

function navChildSelected(path) {
  // console.log(path, "==", pathName.value);
  if (path == pathName.value) return "aside-nav aside-nav_selected";
  return "aside-nav";
}



const routes = ref(routesJson);

onMounted(() => {


  const nowPathName = window.location.pathname;
  getPathName(nowPathName);

});
</script>
