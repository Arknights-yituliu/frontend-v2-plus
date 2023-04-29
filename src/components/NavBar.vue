<template>
  <div class="container">
    <div class="menu-button" @click="menu_collapse(true)">
      <div></div>
      <div></div>
      <div></div>
    </div>
    <div class="page-title">
      {{ route.text }}
    </div>
    <div class="bar-wrapper">
      <a v-for="r in routes" class="bar" :class="{ activate: pageContext.urlPathname == r.path }" :href="r.path">
        <svg
          style="width: 24px; height: 24px"
          :style="{ fill: pageContext.urlPathname == r.path ? '#ffd04b' : 'white' }"
          viewbox="0 0 24 24"
        >
          <path :d="r.icon" />
        </svg>
        {{ r.text }}
      </a>
    </div>
    <div class="spacer"></div>
    <el-switch
      v-if="homepage"
      class="navbar-switch"
      inline-prompt
      v-model="theme"
      :active-icon="Moon"
      :inactive-icon="Sunny"
      size="large"
    />

    <div class="nav_div">
      <div class="nav_collapse" id="menu">
        <div class="menu_table">
          <div class="menu_title">明日方舟一图流</div>
          <div v-for="r in routes" class="menu_item">
            <a :href="r.path" style="display: flex; align-items: center; fill: white">
              <svg style="width: 24px; height: 24px" viewbox="0 0 24 24">
                <path :d="r.icon" />
              </svg>
              {{ r.text }}
            </a>
          </div>
        </div>
      </div>
      <div class="menu-mask" v-show="menu_flag" @click="menu_collapse(false)"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, computed } from "vue";
import { Sunny, Moon } from "@element-plus/icons-vue";
import cookie from "js-cookie";
import { mdiChartBoxOutline, mdiGiftOutline, mdiCalculator, mdiCalendarCursorOutline } from "@mdi/js";
import { usePageContext } from "@/renderer/usePageContext";
const pageContext = usePageContext();

const theme = ref();

const homepage = computed(() => {
  return "/" == pageContext.urlPathname;
});

let menu_flag = ref(false);

onMounted(() => {
  if (homepage.value) theme.value = cookie.get("theme") == "dark";
});

function menu_collapse(flag) {
  menu_flag.value = flag;
  if (menu_flag.value) {
    document.getElementById("menu").className = "nav_collapse ";
    setTimeout(function () {
      document.getElementById("menu").className = "nav_collapse menu-open";
    }, 30);
  } else {
    document.getElementById("menu").className = "nav_collapse";
  }
  console.log(menu_flag.value);
}

function switchTheme() {
  if (theme.value) {
    document.getElementById("indexDiv").style.background = "#222222";
    document.getElementById("indexDiv").style.color = "#ffffff";
    let titles = document.getElementsByClassName("op_title_ctext");
    for (let i = 0; i < titles.length; i++) titles[i].style.color = "#ffffffdd";
    titles = document.getElementsByClassName("op_title_etext");
    for (let i = 0; i < titles.length; i++) titles[i].style.WebkitTextStroke = "0.3px white";
    for (let i of document.querySelectorAll(".popup_card")) {
      i.style["background-color"] = "rgba(0, 0, 0, .95)";
    }
    for (let i of document.querySelectorAll(".popup_text")) {
      i.style["color"] = "#888";
    }
    for (let i of document.querySelectorAll(".popup_header_penguin")) {
      i.style["color"] = "#3f51b5";
    }
    cookie.set("theme", "dark", { expires: 30 });
    console.log("nowdark");
  } else {
    document.getElementById("indexDiv").style.background = "#f0f0f0";
    document.getElementById("indexDiv").style.color = "#000000";
    let titles = document.getElementsByClassName("op_title_ctext");
    for (let i = 0; i < titles.length; i++) titles[i].style.color = "#000000dd";
    titles = document.getElementsByClassName("op_title_etext");
    for (let i = 0; i < titles.length; i++) titles[i].style.WebkitTextStroke = "0.6px black";
    for (let i of document.querySelectorAll(".popup_card")) {
      i.style["background-color"] = "rgba(255, 255, 255, .83)";
    }
    for (let i of document.querySelectorAll(".popup_text")) {
      i.style["color"] = "#222";
    }
    for (let i of document.querySelectorAll(".popup_header_penguin")) {
      i.style["color"] = "blue";
    }
    cookie.set("theme", "light", { expires: 30 });
    console.log("nowlight");
  }
}

watch(theme, () => {
  switchTheme();
});

const routes = [
  {
    path: "/",
    text: "材料一图流",
    icon: mdiChartBoxOutline,
  },
  {
    path: "/gachaCal",
    text: "攒抽规划",
    icon: mdiGiftOutline,
  },
  {
    path: "/riicCal",
    text: "排班生成器",
    icon: mdiCalculator,
  },
  {
    path: "/pack",
    text: "礼包性价比",
    icon: mdiCalendarCursorOutline,
  },
];

const route = computed(() => {
  for (let i of routes) {
    if (i.path == pageContext.urlPathname) {
      return i;
    }
  }
  return {};
});
</script>

<style scoped>
.container {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue",
    sans-serif;
  display: flex;
  flex-direction: row;
  height: 54px;
  align-items: center;
  background-color: rgb(52, 68, 104);
  z-index: 100;
  box-shadow: none;
  gap: 8px;
  padding-left: 16px;
}

.bar-wrapper {
  display: flex;
}

.menu-button {
  display: none;
  width: 33px;
  height: 33px;
  padding: 6px 8px;
  margin-left: 12px;
  border: 2px solid white;
  border-radius: 6px;
}

.menu-button div {
  height: 3px;
  background-color: white;
  margin: 6px 0;
}

.page-title {
  color: white;
  font-size: 28px;
  display: none;
  padding-left: 24px;
}

@media (max-width: 680px) {
  .bar-wrapper {
    display: none;
  }
  .menu-button {
    display: block;
  }
  .page-title {
    display: block;
  }
  .container {
    height: 80px;
  }
  .bar {
    line-height: 80px;
  }
  .el-switch {
    scale: 1.5;
  }
}

.bar {
  height: 100%;
  padding: 0 14px;
  font-size: 18px;
  vertical-align: center;
  line-height: 54px;
  text-decoration: none;
  color: white;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 4px;
}

.activate {
  color: #ffd04b;
  border-bottom: 3px solid #ffd04b;
}

.navbar-switch {
  --el-switch-on-color: rgb(52, 68, 104);
  --el-switch-off-color: rgb(52, 68, 104);
  --el-switch-border-color: white;
  padding-right: 28px;
}

.spacer {
  flex-grow: 1;
}

.nav_div {
  display: flex;
  width: 100%;
  height: auto;
  position: absolute;
  top: 0;
  left: 0;
  z-index: 200;
  /* border: solid red 1px; */
}

.nav_collapse {
  position: absolute;
  top: 0;
  transform: translateX(-290px);
}

.menu-open {
  background-color: rgb(52 68 104);
  width: 200px;
  height: 100vh;
  white-space: nowrap;
  text-align: center;
  transition: all 0.3s;
  transform: translateX(0) !important;
  /* border: solid red 1px; */
}

.menu-mask {
  background: rgba(0, 0, 0, 0.6);
  width: 100%;
  height: 100vh;
  /* border: solid red 1px; */
}

.menu_table {
  display: flex;
  flex-direction: column;
  justify-content: center;
  color: white;
}

.menu_title {
  width: 199px;
  height: 100px;
  line-height: 100px;
  /* border: 1px red solid; */
  font-size: 26px;
  font-family: 800;
  text-align: center;
}

.menu_item {
  width: 170px;
  height: 60px;
  line-height: 60px;
  font-size: 20px;
  text-align: left;
}

.menu_item a {
  color: white;
  text-decoration: none;
}

:global(.navbar-switch .el-icon) {
  font-size: 16px !important;
}
</style>
