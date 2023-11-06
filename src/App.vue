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
    <div class="aside" id="aside114" style="overflow-y: hidden">
      <myaside></myaside>
    </div>
    <div class="container is_vertical">
      <div class="header"><nav-bar /></div>
      <div class="main">
        <slot></slot>
        <div class="footer"><myfooter></myfooter></div>
      </div>
    </div>
  </div>
</template>

<script setup>
//导航
import "/src/assets/css/layout/main.css";
import "/src/assets/css/layout/aside.css";
import "/src/assets/css/layout/navBar.css";
import "/src/assets/css/layout/basic.css";
import "/src/assets/css/layout/theme.css"

import "/src/assets/css/stage_v2.css";
import "/src/assets/css/store_v2.css";
import "/src/assets/css/sprite_item.css";
import "/src/assets/css/sprite_style.css";
import "/src/assets/css/sprite_icon.css";
import "/src/assets/css/common.css";
import "/src/assets/css/about.css";

import "/src/assets/css/stage_v3.css";


// 旧版css，待修改
// import "/src/assets/css/recruit.css";

import NavBar from "/src/components/NavBar.vue";
import myfooter from "/src/components/myfooter.vue";
import myaside from "/src/components/aside.vue";

import { usePageContext } from "/src/renderer/usePageContext";

const pageContext = usePageContext();

import { provide, ref } from "vue";

const theme = ref(pageContext.theme == "dark");
provide("theme", theme);
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
