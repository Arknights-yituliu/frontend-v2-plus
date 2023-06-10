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

import "@/assets/css/basic.css";
import "@/assets/css/stage_v2.css";
import "@/assets/css/store_v2.css";
import "@/assets/css/sprite_item.css";
import "@/assets/css/sprite_item_png.css";
import "@/assets/css/sprite_item_large.css";
import "@/assets/css/sprite_item_large_png.css";
import "@/assets/css/sprite_style.css";
import "@/assets/css/sprite_icon.css";
import "@/assets/css/components.css";

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

function aside() {
  asideVisible.value = !asideVisible.value;
  console.log(asideVisible.value);
  if (asideVisible.value) {
    asideClass.value = "aside_hidden aside";
  } else {
    asideClass.value = "aside_hidden";
  }
}
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


.header {
  height: 54px;
  line-height: 50px;
  /* border: 1px solid rgb(223, 223, 223); */
}

@media (max-width: 1280px) {
  .header {
    height: 78px;
  }
}

.container {
  display: flex;
  flex: 1;
  /* border: 1px solid rgb(0, 119, 255); */
  height: calc(100vh - 0px);
  overflow: hidden;
}

.is_vertical {
  flex-direction: column;
}

.aside_hidden {
  width: 0px;
  overflow: auto;
  transform: translateX(-500px);
}

.aside {
  width: 220px;
  transition: all 0.2s;
  transform: translateX(0) !important;
  background-color: #545c64;
}


.main {
  display: block;
  flex: 1;
  overflow: auto;
  /* background-color: #bb0000ce */
}

.footer{
  height: 40px;
  line-height: 40px;
  background-color: rgb(52, 68, 104);
}
</style>
