<template>
  <div class="aside-table" id="aside114">
    <!-- 标题区 -->
    <a href="/" style="text-decoration: none; color: white">
      <div class="menu-label">明日方舟一图流</div>
    </a>
    <!-- 导航菜单 -->
    <div class="aside_menu_set" v-for="(r, index) in routes" :key="index">
      <!-- 一级标题 -->
      <a class="menu-bar menu-parent" :href="r.path" :class="navParentSelected(r.path)"
         v-show="r.isChild">
        <div class="menu-parent-icon"></div>
<!--        <i class="iconfont menu-icon-large" :class="`icon-${r.icon}`"></i>-->
        <h3> {{ r.text }}</h3>
      </a>
      <!-- 二级标题组 -->
      <a :href="c.path" class="menu-bar menu-child" :class="navChildSelected(c.path)"
         v-for="(c,index) in r.child" :key="index">
        <i class="iconfont menu-icon" :class="`icon-${c.icon}`"></i>
        <span>{{ c.text }}</span>
      </a>

      <!-- <div class="aside-divider"></div> -->
    </div>

    <div style="height: 100px;width: 200px"></div>

  </div>
</template>

<script setup>
import {onMounted, ref} from "vue";
import routesJson from "/src/static/json/routes.json";

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
  if (path == pathName.value) return " menu-selected";
  return "";
}

function navChildSelected(path) {
  // console.log(path, "==", pathName.value);
  if (path == pathName.value) return "menu-selected";
  return "";
}


const routes = ref(routesJson);

onMounted(() => {


  const nowPathName = window.location.pathname;
  getPathName(nowPathName);

});
</script>

<style scoped>
.menu-icon {
  font-size: 18px;
  padding-right: 4px;
}

.menu-icon-large {
  font-size: 20px;
  padding-right:4px;
}
</style>
