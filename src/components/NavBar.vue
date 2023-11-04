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
          <!-- 标题区 -->
          <a href="https://yituliu.site/" style="text-decoration: none; color: white">
            <div class="aside_title">明日方舟一图流</div>
          </a>
          <!-- 导航菜单 -->
          <div class="aside_menu_set" v-for="(r, index) in routes" :key="index">
            <!-- 一级标题 -->
            <a class="aside_menu_parent nav_href" :href="r.path">
              <div class="aside_nav aside_parent" v-show="r.isChild">
                <div class="aside_menu_parent_icon"></div>
                {{ r.text }}
              </div>
            </a>
            <!-- 二级标题组 -->
            <a :href="c.path" class="nav_href" v-for="c in r.child">
              <div class="aside_nav">
                <div class="aside_menu_child_icon"></div>
                {{ c.text }}
              </div>
            </a>
            <div class="aside_divider"></div>
          </div>
        </div>
      </div>
      <div class="menu-mask" id="draweMask514" @click="menu_collapse(false)"></div>
    </div>
  </div>
</template>

<script setup>
import {ref, watch, computed, inject, onMounted} from "vue";
import { Sunny, Moon } from "@element-plus/icons-vue";
import cookie from "js-cookie";
import toolApi from "/src/api/tool";
import { usePageContext } from "/src/renderer/usePageContext";
import navBar from "/src/pages/survey/navBar.vue";
import routesJson from "/src/static/json/routes.json";
const pageContext = usePageContext();

const theme = inject("theme");

let menu_flag = ref(false);

function menu_collapse(flag) {
  menu_flag.value = flag;
  if (menu_flag.value) {
    setTimeout(function () {
      document.getElementById("drawer114").style.willChange = 'transform'
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



// function navParentSelected(path) {
//   console.log(path, "==", pathName.value);
//   if (path == pathName.value) return "aside_nav aside_parent aside_nav_selected";
//   return "aside_nav aside_parent";
// }
//
// function navChildSelected(path) {
//   console.log(path, "==", pathName.value);
//   if (path == pathName.value) return "aside_nav aside_nav_selected";
//   return "aside_nav";
// }

const routes = ref(routesJson);

// eslint-disable-next-line no-unused-vars
const route = computed(() => {
  for (let i of routes.value) {
    if (i.path == pageContext.urlPathname || i.path + "/" == pageContext.urlPathname) {
      return i;
    }
  }
  return {};
});

let pageTitle = ref("");

function getPageTitle(path) {
  if (path === "/") return (pageTitle.value = "材料一图流");
  
  if(path.indexOf('tools/maa')>-1) {
    aside_collapse()
  }

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

function updateVisits(pathName) {
  //访问/直接更新
  if (pathName == "/") {
    toolApi.updateVisits(pathName);
    return 1;
  }
  
  pathName = pathName.replace("/src/pages")
  pathName = substrPath(pathName);
  pathName = substrPath(pathName);

  console.log("访问的页面是：", pathName);
  toolApi.updateVisits(pathName);
  return 1;
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
});
</script>

<style scoped>
.icon_selected {
  transform: rotate(180deg);
}
</style>
