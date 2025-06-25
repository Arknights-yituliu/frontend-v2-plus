<script setup>
//引用css
import '/docs/css/app.scss'
import '/docs/css/html.scss'
import '/src/assets/css/atomic/atomic.scss'
import '/src/assets/css/sprite/sprite_item.css'
import '/src/assets/css/common/vuetify.scss'

//引用库
import {onMounted, ref, watch} from "vue";
import {LinkedTable, routeMap} from "/docs/router/routes.js";
import {useRouter, useRoute} from "vue-router";
import {menuList, getMenuList} from '/docs/utils/menu.js'
import {addImageClickEvent,imageDialog,imageUrl} from '/docs/utils/viewLargerImage.js'
import LinkButton from "@/components/dev/LinkButton.vue";
import {formatCodeElement} from "/docs/utils/formatCode.js";

const useRouterFunc = useRouter()
const useRouteFunc = useRoute()

let open = ref([])
for (const module in LinkedTable) {
  open.value.push(module)
}


const drawer = ref(true)



watch(
    () => useRouteFunc.path,
    (newPath, oldPath) => {
      if (newPath !== oldPath) {
        let max = 0
        const intervalId = setInterval(() => {
          if (max > 10) {
            clearInterval(intervalId)
          }
          getMenuList()
          formatCodeElement()
          addImageClickEvent()
          max++
        }, 500)

      }
    }
)

// router.afterEach((to, from) => {
//      // 确保DOM已经更新
// })


function toPage() {
  // 获取当前 URL 的查询参数部分
  const queryString = window.location.search;
  if (!queryString) {
    return
  }

// 使用 URLSearchParams 解析参数
  const urlParams = new URLSearchParams(queryString);

// 获取单个参数值
  const path = urlParams.get('path'); // 比如 ?id=123 → "123"

  const name = _formatPath(path)


  // 获取当前 hash
  const currentHash = window.location.hash;
  const decodedHash = decodeURIComponent(currentHash.replace(/^#/, ''));

  if (routeMap.has(name)) {
    useRouterFunc.push({name: name,hash: `#${decodedHash}`})
  } else {
    useRouterFunc.push({name: 'ProjectOverview'})
  }


  function _formatPath(str) {
    str = str.replace('/docs/', '').replace('docs/', '')

    // 将剩下的路径重新组合，然后按照 "-" 或 "_" 进行分割
    return str.split(/[\/\-_]/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join('');
  }
}

onMounted(() => {
  toPage()

})


</script>

<template>

  <v-app  class="app">
    <v-app-bar :elevation="1" >
      <template v-slot:prepend>
        <v-app-bar-nav-icon class="drawer-btn" @click="drawer=!drawer"></v-app-bar-nav-icon>
      </template>
      <v-app-bar-title>
        <div class="flex align-center">
        <img alt="" src="/image/website/ico64.webp" style="width: 40px;height: 40px;margin: 0 4px 0 0;border-radius: 4px">
        <span class="font-bold"> 明日方舟一图流</span>
        </div>
      </v-app-bar-title>
    </v-app-bar>
    <v-navigation-drawer v-model="drawer" width="240">
      <v-list color="primary" :opened="open" open-strategy="multiple" class="navigation-drawer" nav density="compact">
        <v-list-group v-for="(parent, module) in LinkedTable" :key="parent.text" :value="module">
          <template v-slot:activator="{ props }">
            <v-list-item v-bind="props" :title="parent.text">
              <template v-slot:prepend>
                <v-icon :icon="parent.icon"></v-icon>
              </template>
            </v-list-item>
          </template>

          <router-link v-for="(child,index) in parent.child" :key="index"
                       :to="child.path" :href="child.path" class="router-link">
            <v-list-item link color="primary" rounded :value="child.text" :title="child.text">
              <template v-slot:prepend>
                <v-icon :icon="child.icon"></v-icon>
              </template>
            </v-list-item>
          </router-link>
        </v-list-group>
      </v-list>
    </v-navigation-drawer>
    <v-navigation-drawer location="right"  class="right-drawer">
      <div class="side-menu">
        <span class="side-menu-title">目录</span>
       <a v-for="item in menuList" :href="`#${item.id}`"  :class="`side-menu-${item.nodeName}`">
         {{item.title}}
       </a>
<!--        <a v-for="h1 in menuList" class="side-menu-h1" :href="`#${h1.id}`" >-->
<!--          {{ h1.title }}-->
<!--          <a v-for="h2 in h1.child" class="side-menu-h2" :href="`#${h2.id}`" >-->
<!--            {{ h2.title }}-->
<!--            <a v-for="h3 in h2.child" class="side-menu-h3" :href="`#${h3.id}`" >-->
<!--              {{ h3.title }}-->
<!--            </a>-->
<!--          </a>-->
<!--        </a>-->
      </div>
    </v-navigation-drawer>
    <v-main>
      <v-container class="v-container">
        <router-view>
        </router-view>
      </v-container>
    </v-main>

    <v-dialog v-model="imageDialog" max-width="80%">
      <img :src="imageUrl" alt="" style="width: 100%">
    </v-dialog>
  </v-app>

  <!--  <v-app :class="customTheme" class="app">-->
  <!--    <div class="navigation-mask" @click="openNavigation()" id="docs-navigation-mask">-->
  <!--    </div>-->
  <!--      <div class="navigation" id="docs-navigation">-->
  <!--        <v-list color="primary" :opened="open" open-strategy="multiple" class="navigation-drawer" nav density="compact"-->
  <!--                width="240">-->
  <!--          <v-list-group v-for="(parent, module) in LinkedTable" :key="parent.text" :value="module">-->
  <!--            <template v-slot:activator="{ props }">-->
  <!--              <v-list-item v-bind="props" :title="parent.text">-->
  <!--                <template v-slot:prepend>-->
  <!--                  <v-icon :icon="parent.icon"></v-icon>-->
  <!--                </template>-->
  <!--              </v-list-item>-->
  <!--            </template>-->

  <!--            <router-link v-for="(child,index) in parent.child" :key="index"-->
  <!--                         :to="child.path" :href="child.path" class="router-link">-->
  <!--              <v-list-item color="primary" rounded :value="child.text" :title="child.text">-->
  <!--                <template v-slot:prepend>-->
  <!--                  <v-icon :icon="child.icon"></v-icon>-->
  <!--                </template>-->
  <!--              </v-list-item>-->
  <!--            </router-link>-->
  <!--          </v-list-group>-->
  <!--        </v-list>-->
  <!--      </div>-->

  <!--    <v-main>-->
  <!--      <v-app-bar :elevation="1" color="primary" class="v-app-bar">-->
  <!--        <template v-slot:prepend class="app-bar-phone-icon">-->
  <!--          <v-app-bar-nav-icon @click="openNavigation()" ></v-app-bar-nav-icon>-->
  <!--        </template>-->
  <!--        <v-app-bar-title>-->
  <!--          <span class="font-bold"> 明日方舟一图流</span>-->
  <!--        </v-app-bar-title>-->
  <!--      </v-app-bar>-->
  <!--      <div class="container">-->
  <!--        <router-view>-->
  <!--        </router-view>-->
  <!--      </div>-->
  <!--    </v-main>-->
  <!--  </v-app>-->

</template>

