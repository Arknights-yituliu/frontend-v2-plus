<script setup>
import '/src/assets/svg/iconfont.css'
import '/src/assets/css/stage_v2.css';
import '/src/assets/css/store_v2.css';
import '/src/assets/css/sprite_item.css';
import '/src/assets/css/sprite_style.css';
import '/src/assets/css/sprite_icon.css';
import '/src/assets/css/about.scss';
import '/src/assets/css/elite.css';
import '/src/assets/css/sprite/sprite_avatar.css'
import '/src/assets/css/stage_v3.css';

// 通用样式
import '/src/assets/css/common/btn.scss'
import '/src/assets/css/common/checkbox.scss'
import '/src/assets/css/common/input.scss'
import '/src/assets/css/common/tip.scss'
import '/src/assets/css/common/title_and_tag.scss'
import '/src/assets/css/common/popover.scss'
import '/src/assets/css/common/icon.scss'

import '/src/assets/css/layout/aside.scss'
import '/src/assets/css/layout/atom.scss'
import '/src/assets/css/layout/basic.scss'
import '/src/assets/css/layout/navigation.scss'
import '/src/assets/css/layout/main.scss'
import '/src/assets/css/common/theme.scss'

// svg字体
import Navigation from '/src/components/drawer/Navigation.vue'

// 旧版css，待修改

import {computed, onMounted, ref, watch} from "vue";
import {useRoute} from "vue-router";
import {routeMap} from "/src/router/routes";

let theme_type = ref("theme_init")
let drawer = ref(true)


onMounted(() => {
  const theme_v2 = localStorage.getItem("theme_v2");

  if (theme_v2 === 'dark') {
    theme_type.value = 'theme_dark'
  } else {
    theme_type.value = 'theme_light'
  }
  document.getElementsByTagName("html").item(0).className = theme_v2 === "dark" ? "dark" : "light";
})


const route = useRoute();
const currentPath = computed(() => route.path);

let pageTitle = ref("");

watch(currentPath, (newPath, oldPath) => {
  console.log(route)
  pageTitle.value = routeMap.get(normalizePath(newPath))||'未定义路径'
  // 在这里执行你想要的操作
});

function normalizePath(path) {
  // 如果路径是根路径 '/'，直接返回
  if (path === '/') {
    return path;
  }

  // 如果路径最后一位是 '/'，则去除它
  if (path.endsWith('/')) {
    return path.slice(0, -1);
  }

  // 否则，返回原路径
  return path;
}


</script>

<template>

<!--    <div class="container color_var" id="container" :class="theme_type">-->

<!--      <MyAside></MyAside>-->
<!--      <Loading></Loading>-->
<!--      <div class="header">-->
<!--        <MyHeader></MyHeader>-->
<!--      </div>-->
<!--      <div class="main">-->
<!--        <NoticeBoard></NoticeBoard>-->
<!--        <router-view>-->
<!--        </router-view>-->
<!--      </div>-->
<!--      <ComponentsContainer></ComponentsContainer>-->
<!--      <MyFooter></MyFooter>-->
<!--    </div>-->



  <!--  <v-layout class="rounded rounded-md color_var" :class="theme_type" id="container">-->
  <!--    <v-navigation-drawer>-->
  <!--      <v-list>-->
  <!--        <v-list-item title="Navigation drawer"></v-list-item>-->
  <!--      </v-list>-->
  <!--    </v-navigation-drawer>-->

  <!--    <v-app-bar title="Application bar"></v-app-bar>-->

  <!--    <v-main class="d-flex align-center justify-center" style="min-height: 300px;">-->
  <!--      Main Content-->
  <!--    </v-main>-->
  <!--  </v-layout>-->

  <v-responsive class="border rounded color_var" >
    <v-app>
      <v-navigation-drawer v-model="drawer" width="280">
         <Navigation></Navigation>
      </v-navigation-drawer>

      <v-app-bar :elevation="1">
        <template v-slot:prepend>
          <v-app-bar-nav-icon @click="drawer=!drawer"></v-app-bar-nav-icon>
        </template>

        <v-app-bar-title>{{ pageTitle }}</v-app-bar-title>
      </v-app-bar>

      <v-main>
        <v-container>
          <router-view>
          </router-view>
        </v-container>
      </v-main>
    </v-app>
  </v-responsive>

</template>





