<template>
  <div class="aside_table" id="aside114">
    <!-- 标题区 -->
    <a href="https://yituliu.site/" style="text-decoration: none; color: white">
      <div class="aside_title">明日方舟一图流</div>
    </a>
    <!-- 导航菜单 -->
    <div class="aside_menu_set" v-for="(r, index) in routes" :key="index">
      <!-- 一级标题 -->
      <a class="nav_href" :href="r.path">
        <div :class="navParentSelected(r.path)" v-show="r.isChild">
          <div class="aside_menu_parent_icon"></div>
          {{ r.text }}
        </div>
      </a>
      <!-- 二级标题组 -->
      <a :href="c.path" class="nav_href" v-for="(c,index) in r.child" :key="index">
        <div :class="navChildSelected(c.path)">
          <div class="aside_menu_child_icon"></div>
          {{ c.text }}
        </div>
      </a>
      <!-- <div class="aside_divider"></div> -->
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
  if (path == pathName.value) return "aside_nav aside_parent aside_nav_selected";
  return "aside_nav aside_parent";
}

function navChildSelected(path) {
  // console.log(path, "==", pathName.value);
  if (path == pathName.value) return "aside_nav aside_nav_selected";
  return "aside_nav";
}



const routes = ref(routesJson);

onMounted(() => {


  const nowPathName = window.location.pathname;
  getPathName(nowPathName);

});
</script>
