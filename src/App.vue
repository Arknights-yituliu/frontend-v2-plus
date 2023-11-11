<template>
  <div class="container color_var" id="container" :class="theme_type">
    <div class="aside" id="aside114" style="overflow-y: hidden">
      <my-aside></my-aside>
    </div>
    <div class="container is_vertical">
      <div class="header">
        <nav-bar/>
      </div>
      <div class="main">
        <slot></slot>
        <div class="footer">
          <my-footer></my-footer>
        </div>
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
import myFooter from "/src/components/myfooter.vue";
import myAside from "/src/components/aside.vue";


import { onMounted, ref} from "vue";


let theme_type = ref("theme_light")

onMounted(() => {
  const theme_v2 = localStorage.getItem("theme_v2");
  console.log(theme_v2)
  if (theme_v2 === 'dark') {
    theme_type.value = 'theme_dark'
  }

  document.getElementsByTagName("html")
      .item(0).className=theme_v2==="dark"?"dark":"light";



})


// const theme = ref(pageContext.theme === "dark");
// provide("theme", theme);

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
