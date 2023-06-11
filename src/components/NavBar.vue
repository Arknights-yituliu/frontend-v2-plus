<template>
  <div class="header_wrap">
    <div class="menu-button" @click="menu_collapse(true)">
      <div></div>
      <div></div>
      <div></div>
    </div>
    <div class="page-title">
      {{ route.text }}
    </div>
    <!-- <div class="bar-wrapper">
      <a v-for="r in routes" class="bar">
        <a class="bar" :class="{ activate: pageContext.urlPathname == r.path }" :href="r.path">
          <svg style="width: 24px; height: 24px" :style="{ fill: pageContext.urlPathname == r.path ? '#ffd04b' : 'white' }" viewbox="0 0 24 24">
            <path :d="r.icon" />
          </svg>
          {{ r.text }}
        </a>
        <div class="bar-wrapper2" v-show="r.isChild">
          <a v-for="child in r.child" class="bar" :class="{ activate: pageContext.urlPathname == child.path }" :href="child.path">
            <svg style="width: 24px; height: 24px" :style="{ fill: pageContext.urlPathname == child.path ? '#ffd04b' : 'white' }" viewbox="0 0 24 24">
              <path :d="child.icon" />
            </svg>
            {{ child.text }}
          </a>
        </div>
      </a>
    </div> -->
    <div class="spacer"></div>
    <el-switch class="navbar-switch" inline-prompt v-model="theme" :active-icon="Moon" :inactive-icon="Sunny" size="large" />
    <navBar></navBar>

    <div class="drawer_wrap">
      <div class="drawer" id="drawer114">
        <div class="menu_table">
          <div class="menu_title">明日方舟一图流</div>
          <div class="line"></div>
          <div v-for="(r, index) in routes" :key="index">
            <div :class="navSelected(index)" @click="navChildOpen(index, r.child.length)" v-show="r.isChild">
              <div class="nav_text_phone">{{ r.text }}</div>
              <div>
                <el-icon class="child_icon_phone"><ArrowDownBold :class="iconClass(index)" /></el-icon>
              </div>
            </div>
            <div :class="getChildClass(index)" :id="'nav_phone' + index" v-show="r.isChild">
              <a :href="c.path" class="nav_href" v-for="c in r.child">
                <div class="nav_child_phone">{{ c.text }}</div></a
              >
            </div>
            <div class="nav" v-show="!r.isChild">
              <a :href="r.path" class="nav_href">
                <div class="nav_text_phone">{{ r.text }}</div></a
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
import { mdiChartBoxOutline, mdiGiftOutline, mdiCalculator, mdiCalendarCursorOutline, mdiGold } from "@mdi/js";
import { usePageContext } from "@/renderer/usePageContext";
import navBar from "@/pages/survey/navBar.vue";
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
  if (nav_collapseFlag.value[index]) return "nav_child_wrap_phone_init";
  return "nav_child_wrap_phone";
}

function navChildOpen(index, childNum) {
  nav_collapseFlag.value[index] = !nav_collapseFlag.value[index];
  console.log(index, childNum);
  if (nav_collapseFlag.value[index]) {
    console.log(childNum * 34 + "px");
    console.log("nav" + index);
    document.getElementById("nav_phone" + index).style.height = childNum * 60 + "px";
    document.getElementById("nav_phone" + index).style.overflow = "";
  } else {
    document.getElementById("nav_phone" + index).style.height = "0px";
    document.getElementById("nav_phone" + index).style.overflow = "hidden";
  }
}

function navSelected(index) {
  if (nav_collapseFlag.value[index]) return "aside_nav aside_nav_selected";
  return "aside_nav";
}

function iconClass(index) {
  if (nav_collapseFlag.value[index]) return "child_icon_phone child_icon_phone_selected";
  return "child_icon_phone";
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

const routes = ref([
  {
    path: "/",
    text: "材料一图流",
    isChild: true,
    child: [
      {
        path: "/",
        text: "材料一图流",
      },
      {
        path: "/store",
        text: "商店性价比",
      },
      {
        path: "/value",
        text: "物品价值",
      },
    ],
  },

  {
    path: "/gachaCal",
    text: "攒抽规划",
    isChild: false,
  },
  {
    path: "/riicCal",
    text: "排班生成器",
    isChild: false,
  },
  {
    path: "/pack",
    text: "礼包性价比",
    isChild: false,
  },
]);

const route = computed(() => {
  for (let i of routes) {
    if (i.path == pageContext.urlPathname || i.path + "/" == pageContext.urlPathname) {
      return i;
    }
  }
  return {};
});

onMounted(() => {
  if (domain.indexOf("dev") == -1) {
    console.log(111)
    routes.value.push(devRoute);
  }
});
</script>

<style scoped></style>
