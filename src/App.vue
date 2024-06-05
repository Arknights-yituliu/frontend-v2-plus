<template>

    <div class="container color_var" id="container" :class="theme_type">
      <my-aside></my-aside>
      <loading></loading>
      <div class="header">
        <my-header/>
      </div>
      <div class="main">
        <div v-show="devVer">您正在访问的是开发版域名，此域名提供的服务可能存在不稳定的情况</div>
        <router-view>
        </router-view>
      </div>
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
import '/src/assets/css/layout/atom.css'
import "/src/assets/css/stage_v2.css";
import "/src/assets/css/store_v2.css";
import "/src/assets/css/sprite_item.css";
import "/src/assets/css/sprite_style.css";
import "/src/assets/css/sprite_icon.css";
import "/src/assets/css/about.css";
import "/src/assets/css/elite.css";
import '/src/assets/css/sprite/sprite_avatar.css'

import "/src/assets/css/stage_v3.css";

// 通用样式
import "/src/custom/css/btn.css";
import "/src/custom/css/input.css";

// svg字体

// 旧版css，待修改

import myHeader from "/src/pages/layout/myheader.vue";
import myFooter from "/src/pages/layout/myfooter.vue";
import myAside from "/src/pages/layout/aside.vue";
import loading from '/src/pages/layout/loading.vue'
import {onMounted, ref} from "vue";
import {onBeforeRouteUpdate, useRouter} from 'vue-router'


let theme_type = ref("theme_init")


let devVer = ref(false)

onMounted(() => {
  const theme_v2 = localStorage.getItem("theme_v2");

  if (theme_v2 === 'dark') {
    theme_type.value = 'theme_dark'
  } else {
    theme_type.value = 'theme_light'
  }

  const currentDomain = window.location.hostname;
  if(currentDomain.indexOf('dev')>-1){
    devVer.value = true
  }

  document.getElementsByTagName("html").item(0).className = theme_v2 === "dark" ? "dark" : "light";
})


// const theme = ref(pageContext.theme === "dark");
// provide("theme", theme);

</script>

<style>
@font-face {
  font-family: 'Roboto';
  src: url('/fonts/Roboto_Regular.ttf') format("truetype");
  font-weight: normal;
  font-style: normal;
}

@font-face {
  font-family: 'Roboto';
  src: url('/fonts/Roboto_Italic.ttf') format("truetype");
  font-weight: normal;
  font-style: italic;
}

@font-face {
  font-family: 'Roboto';
  src: url('/fonts/Roboto_Bold.ttf') format("truetype");
  font-weight: bold;
  font-style: italic;
}

:root {
  line-height: 1.5;
  font-weight: 400;
  //font-synthesis: none;
  //text-rendering: optimizeLegibility;
  //-webkit-font-smoothing: antialiased;
  //-moz-osx-font-smoothing: grayscale;
}

body {
  font-family: 'Roboto', sans-serif;
  margin: 0;
  width: 100%;
  height: 100vh;
}
</style>


