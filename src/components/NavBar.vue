<template>
  <div class="container">
    <a :class="{ activate: '/' == pageContext.urlPathname }" href="/">材料一图流</a>
    <a :class="{ activate: '/gachaCal' == pageContext.urlPathname }" href="/gachaCal">攒抽规划</a>
    <a :class="{ activate: '/riicCal' == pageContext.urlPathname }" href="/riicCal">排班生成器</a>
    <a :class="{ activate: '/pack' == pageContext.urlPathname }" href="/pack">礼包性价比</a>
    <div class="spacer"></div>
    <el-switch
      v-if="'/' == pageContext.urlPathname"
      class="navbar-switch"
      inline-prompt
      v-model="theme"
      :active-icon="Moon"
      :inactive-icon="Sunny"
      size="large"
    />
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from "vue";
import { Sunny, Moon } from "@element-plus/icons-vue";
import cookie from "js-cookie";

import { usePageContext } from "@/renderer/usePageContext";
const pageContext = usePageContext();

const theme = ref();

onMounted(() => {
  theme.value = cookie.get("theme") == "dark";
});

function switchTheme() {
  if (theme.value) {
    document.getElementById("indexDiv").style.background = "#222222";
    document.getElementById("indexDiv").style.color = "#ffffff";
    let titles = document.getElementsByClassName("op_title_ctext");
    for (let i = 0; i < titles.length; i++) titles[i].style.color = "#ffffffdd";
    titles = document.getElementsByClassName("op_title_etext");
    for (let i = 0; i < titles.length; i++) titles[i].style.WebkitTextStroke = "0.3px white";
    cookie.set("theme", "dark", { expires: 30 });
    console.log("nowdark");
  } else {
    document.getElementById("indexDiv").style.background = "#f0f0f0";
    document.getElementById("indexDiv").style.color = "#000000";
    let titles = document.getElementsByClassName("op_title_ctext");
    for (let i = 0; i < titles.length; i++) titles[i].style.color = "#000000dd";
    titles = document.getElementsByClassName("op_title_etext");
    for (let i = 0; i < titles.length; i++) titles[i].style.WebkitTextStroke = "0.6px black";
    cookie.set("theme", "light", { expires: 30 });
    console.log("nowlight");
  }
}

watch(theme, () => {
  switchTheme();
});
</script>

<style scoped>
.container {
  display: flex;
  flex-direction: row;
  height: 54px;
  align-items: center;
  background-color: rgb(52, 68, 104);
  z-index: 100;
  box-shadow: 0 0 10px rgb(0 0 0);
  gap: 8px;
  padding-left: 8px;
}

a {
  height: 100%;
  padding: 0 14px;
  font-size: 16px;
  vertical-align: center;
  line-height: 54px;
  text-decoration: none;
  color: white;
  box-sizing: border-box;
}

.activate {
  color: #ffd04b;
  border-bottom: 2px solid #ffd04b;
}

.navbar-switch {
  box-shadow: none;
  --el-switch-on-color: rgb(52, 68, 104);
  --el-switch-off-color: rgb(52, 68, 104);
  --el-switch-border-color: white;
  padding-right: 20px;
}

.spacer {
  flex-grow: 1;
}
</style>

<style>
.navbar-switch .el-icon {
  font-size: 16px !important;
}
</style>
