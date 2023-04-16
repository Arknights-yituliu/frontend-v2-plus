<template>
  <div class="container" >
    <!-- <div style="color:white" @click="menu_collapse(true)" >
      这里是 <br> 个图标
    </div> -->
    <a :class="{ activate: homepage }" href="/">材料一图流</a>
    <a :class="{ activate: '/gachaCal' == pageContext.urlPathname }" href="/gachaCal">攒抽规划</a>
    <a :class="{ activate: '/riicCal' == pageContext.urlPathname }" href="/riicCal">排班生成器</a>
    <a :class="{ activate: '/pack' == pageContext.urlPathname }" href="/pack">礼包性价比</a>
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
   
  <div class="menu_div"> 
    <div class="menu-collapse" id="menu">
        <h1>明日方舟一图流</h1>
        <table>
          <tbody>
            <tr>
              <td >材料一图流</td>
            </tr>
            <tr>
              <td >攒抽规划</td>
            </tr>
            <tr>
              <td >排班生成器</td>
            </tr>
            <tr>
              <td></td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="menu-mask" v-show="menu_flag"  @click="menu_collapse(false)">
        
    </div>

  </div>

  
</div>

</template>

<script setup>
import { ref, watch, onMounted, computed } from "vue";
import { Sunny, Moon } from "@element-plus/icons-vue";
import cookie from "js-cookie";

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
        document.getElementById("menu").className = "menu-collapse ";
        setTimeout(function () {
          document.getElementById("menu").className = "menu-collapse menu-open";
        }, 30); 
      } else {
        document.getElementById("menu").className = "menu-collapse";
      }
      console.log(menu_flag.value)
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
</script>

<style scoped>
.container {
  display: flex;
  flex-direction: row;
  height: 54px;
  align-items: center;
  background-color: rgb(52, 68, 104);
  z-index: 100;
  box-shadow: none;
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



.menu_div {
  display: flex;
  width: 100%;
  height: auto;
  position: absolute;
  top: 0;
  left: 0;
  z-index: 200;
  /* border: solid red 1px; */
}

.menu-collapse {
  position: absolute;
  top:0;
  transform: translateX(-290px);
}

.menu-open {
  background-color: white;
  width: 200px;
  height: 1000px;
  white-space: nowrap;
  text-align: center;
  transition: all 0.3s;
  transform: translateX(0) !important;
  /* border: solid red 1px; */
}

.menu-mask{
  background:rgba(0,0,0,0.6);
  width: 100%;
  height: 1000px;
  /* border: solid red 1px; */
}
</style>
