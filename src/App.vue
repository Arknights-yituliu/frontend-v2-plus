<template>

  <div class="container color_var" id="container" :class="theme_type">

    <MyAside></MyAside>
    <Loading></Loading>
    <div class="header">
      <MyHeader></MyHeader>
    </div>
    <div class="main">
      <NoticeBoard></NoticeBoard>
      <router-view>
      </router-view>
    </div>
    <ComponentsContainer></ComponentsContainer>
    <MyFooter></MyFooter>
  </div>

</template>

<script setup>


//导航
import '/src/assets/svg/iconfont.css'

import "/src/assets/css/stage_v2.css";
import "/src/assets/css/store_v2.css";
import "/src/assets/css/sprite_item.css";
import "/src/assets/css/sprite_style.css";
import "/src/assets/css/sprite_icon.css";
import "/src/assets/css/about.scss";
import "/src/assets/css/elite.css";
import '/src/assets/css/sprite/sprite_avatar.css'

import "/src/assets/css/stage_v3.css";

// 通用样式
import '/src/assets/css/common/btn.scss'
import '/src/assets/css/common/checkbox.scss'
import '/src/assets/css/common/input.scss'
import '/src/assets/css/common/tip.scss'
import '/src/assets/css/common/title_and_tag.scss'
import '/src/assets/css/common/popover.scss'


import '/src/assets/css/layout/aside.scss'
import '/src/assets/css/layout/atom.scss'
import '/src/assets/css/layout/basic.scss'

import '/src/assets/css/layout/navigation.scss'

import '/src/assets/css/layout/main.scss'
import '/src/assets/css/common/theme.scss'

// svg字体

// 旧版css，待修改

import MyHeader from "/src/pages/layout/myheader.vue";
import MyFooter from "/src/pages/layout/myfooter.vue";
import MyAside from "/src/pages/layout/aside.vue";
import Loading from '/src/pages/layout/loading.vue'
import ComponentsContainer from "/src/components/ComponentsContainer.vue";
import {onMounted, ref} from "vue";
import NoticeBoard from "/src/pages/layout/NoticeBoard.vue";

let theme_type = ref("theme_init")



let componentsContainerId = 114514

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




