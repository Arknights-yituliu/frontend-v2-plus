<template>
  <div class="container color_var" id="container" :class="theme_type">
    <my-aside></my-aside>
    <div class="header">
      <nav-bar/>
    </div>
    <slot></slot>
    <my-footer></my-footer>
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
import "/src/assets/css/about.css";
import "/src/assets/css/elite.css";

import "/src/assets/css/stage_v3.css";

// 通用样式
import "/src/custom/css/btn.css";
import "/src/custom/css/input.css";

// svg字体
import '/src/assets/svg/iconfont.css'



// 旧版css，待修改

import NavBar from "/src/components/NavBar.vue";
import myFooter from "/src/components/myfooter.vue";
import myAside from "/src/components/aside.vue";

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


svg {
  fill: var(--c-text-color);
}

/* .header {
  z-index: 100;
  height: 52px;
  position: sticky;
  width: 100%;
  top: 0px;
} */
</style>
