<template>
  <div class="container color_var" id="container" :class="theme_type">
    <my-aside></my-aside>
    <div class="header">
      <my-header/>
    </div>
    <router-view></router-view>
    <my-footer></my-footer>
  </div>
</template>

<script setup>
//导航
import "/src/assets/css/layout/main.css";
import '/src/assets/svg/iconfont.css'


import "/src/assets/css/layout/navigation.css";
import "/src/assets/css/layout/basic.css";
import "/src/assets/css/layout/theme.css"
import "/src/assets/css/layout/common.css"

import "/src/assets/css/stage_v2.css";
import "/src/assets/css/store_v2.css";
import "/src/assets/css/sprite_item.css";
import "/src/assets/css/sprite_style.css";
import "/src/assets/css/sprite_icon.css";
import "/src/assets/css/about.css";
import "/src/assets/css/elite.css";

import "/src/assets/css/stage_v3.css";

// 通用样式
import "/src/custom/css/btn.css";
import "/src/custom/css/input.css";

// svg字体

// 旧版css，待修改

import myHeader from "/src/pages/layout/myheader.vue";
import myFooter from "/src/pages/layout/myfooter.vue";
import myAside from "/src/pages/layout/aside.vue";

import {onMounted, ref} from "vue";

let theme_type = ref("theme_init")

onMounted(() => {
  const theme_v2 = localStorage.getItem("theme_v2");

  if (theme_v2 === 'dark') {
    theme_type.value = 'theme_dark'
  } else {
    theme_type.value = 'theme_light'
  }

  document.getElementsByTagName("html").item(0).className = theme_v2 === "dark" ? "dark" : "light";
})


// const theme = ref(pageContext.theme === "dark");
// provide("theme", theme);

</script>

<style>
@font-face {
  font-family: 'HarmonyOS_Sans_Regular';
  src: url('/fonts/HarmonyOS_Sans_Regular.ttf');
}

@font-face {
  font-family: 'Roboto_Regular_14';
  src: url('/fonts/Roboto_Regular_14.ttf');
}

@font-face {
  font-family: 'SourceHanSansSC_Regular_2';
  src: url('/fonts/SourceHanSansSC_Regular_2.otf');
}

@font-face {
  font-family: 'MiSans_Regular';
  src: url('/fonts/MiSans_Regular.otf');
}

:root {
  font-family: 'Roboto_Regular_14',sans-serif ;
  line-height: 1.5;
  font-weight: 400;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  margin: 0;
  width:100%;
  height: 100vh;
}
</style>


