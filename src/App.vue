<template>
  <!-- <el-container>
    <el-header class="header" v-if="'/maarecruitdata' != pageContext.urlPathname">
      <nav-bar />
    </el-header>
    <el-main style="z-index: 10; background-color: #808080">
      <slot></slot>
    </el-main>
    <el-footer style="z-index: 100; height: 40px; padding: 0px; background-color: rgb(52, 68, 104)">
      <myfooter />
    </el-footer>
  </el-container> -->


  <div class="container">
    <div :class="asideClass">
      <myaside></myaside>
    </div>
    <div class="container is_vertical">
      <div class="header"><nav-bar /></div>
      <div class="main"><slot></slot> <div class="footer"><myfooter></myfooter> </div></div>
     
    </div>
  </div>
</template>

<script setup>

//导航
import "@/assets/css/main.css";
import "@/assets/css/aside.css";
import "@/assets/css/navBar.css";


import "@/assets/css/basic.css";
import "@/assets/css/stage_v2.css";
import "@/assets/css/store_v2.css";
import "@/assets/css/sprite_item.css";
import "@/assets/css/sprite_item_png.css";
import "@/assets/css/sprite_item_large.css";
import "@/assets/css/sprite_item_large_png.css";
import "@/assets/css/sprite_style.css";
import "@/assets/css/sprite_icon.css";

// 旧版css，待修改
import "@/assets/css/item.css";
// import "@/assets/css/recruit.css";

import NavBar from "@/components/NavBar.vue";
import myfooter from "@/components/myfooter.vue";
import myaside from "@/components/aside.vue";



import { usePageContext } from "@/renderer/usePageContext";

const pageContext = usePageContext();

import { provide, ref } from "vue";

const theme = ref(pageContext.theme == "dark");
provide("theme", theme);

let asideVisible = ref(true);
let asideClass = ref("aside");


</script>

<style scoped>
.el-main {
  padding: 0px;
  overflow: inherit;
}
.el-header {
  padding: 0px;
  box-shadow: 0 0 10px rgb(0, 0, 0);
}

.el-menu.el-menu--horizontal {
  border-bottom: none;
}

.el-slider__button-wrapper {
  z-index: auto;
}

body {
  overflow-x: hidden;
  text-size-adjust: none;
  -webkit-text-size-adjust: none;
  overscroll-behavior: none;
}

/* .header {
  z-index: 100;
  height: 52px;
  position: sticky;
  width: 100%;
  top: 0px;
} */


</style>
