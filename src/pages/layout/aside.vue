<script setup>
import {onMounted, ref, watch} from "vue";
import routesJson from "/src/static/json/routes.json";
import {useRoute} from "vue-router";
import {LinkedTable} from '/src/router/routes.js'

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
  if (path === route.path) return "menu-selected";
  return "";
}




const route = useRoute()

onMounted(() => {
  const nowPathName = window.location.pathname;
  getPathName(nowPathName);

});
</script>

<template>
  <div class="side-navigation-container" id="aside114">
    <!-- 标题区 -->
    <a href="/" style="text-decoration: none; color: white">
      <div class="side-website-title">明日方舟一图流</div>
    </a>
    <!-- 导航菜单 -->
    <div class="aside_menu_set" v-for="(parent, index) in LinkedTable" :key="index">
      <!-- 一级标题 -->
      <router-link :to="parent.path"  class="nav-bar nav-bar-parent">
        <div class="nav-bar-parent-icon"></div>
        <h3> {{ parent.text }}</h3>
      </router-link>
      <!-- 二级标题组 -->
      <router-link :to="child.path" :href="child.path" class="nav-bar nav-bar-child" :class="navChildSelected(child.path)"
                   v-for="(child,index) in parent.child" :key="index">
        <i class="iconfont menu-icon" :class="`icon-${child.icon}`"></i>
        <span>{{ child.text }}</span>
      </router-link>
      <!-- <div class="aside-divider"></div> -->
    </div>

    <div style="height: 100px;width: 200px"></div>

  </div>
</template>


<style scoped>
.menu-icon {
  font-size: 18px;
  padding-right: 4px;
}

.menu-icon-large {
  font-size: 20px;
  padding-right: 4px;
}
</style>
