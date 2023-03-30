<template>
  <el-container>
    <el-header style="z-index: 100; height: 54px" v-if="'/maarecruitdata' != pageContext.urlPathname">
      <nav-bar />
    </el-header>
    <el-main style="z-index: 10; background-color: #808080">
      <slot></slot>
    </el-main>
    <el-footer style="z-index: 100; height: 40px; padding: 0px; background-color: rgb(52 68 104)">
      <myfooter />
    </el-footer>
  </el-container>
</template>

<script>
import "@/assets/css/basic.css";
import "@/assets/css/stage_v2.css";
import "@/assets/css/store_v2.css";
import "@/assets/css/sprite_item.css";
import "@/assets/css/sprite_item_large.css";
import "@/assets/css/sprite_index.css";
import "@/assets/css/sprite_gacha.css";
import "@/assets/css/sprite_icon.css";

// 旧版css，待修改
import "@/assets/css/item.css";
import "@/assets/css/recruit.css";

import NavBar from "@/components/NavBar.vue";
import myfooter from "@/components/myfooter.vue";

import { usePageContext } from "@/renderer/usePageContext";

export default {
  setup() {
    const pageContext = usePageContext();
    return { pageContext };
  },
  components: {
    NavBar,
    myfooter,
  },
};
</script>

<style scoped>
.el-container {
  height: 100vh; /* For browsers that don't support CSS variables */
  height: calc(var(--1dvh, 1vh) * 100); /* This is the "polyfill" */
  height: 100dvh; /* This is for future browsers that support svh, dvh and lvh viewport units */

  display: flex;
  flex-direction: column;
}

.el-main {
  padding: 0px;
  overflow-y: scroll;
  overflow-x: hidden;
  flex-shrink: 1;
}
.el-header {
  padding: 0px;
  box-shadow: 0 0 10px rgb(0 0 0);
}

.el-menu.el-menu--horizontal {
  border-bottom: none;
}

.el-slider__button-wrapper {
  z-index: auto;
}
</style>

<style>
body {
  overflow: hidden;
  text-size-adjust: none;
  -webkit-text-size-adjust: none;
  overscroll-behavior: none;
}
</style>
