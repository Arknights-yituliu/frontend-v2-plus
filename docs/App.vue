<script setup>
//引用css
import '/docs/css/app.scss'
import '/docs/css/html.scss'
import '/src/assets/css/common/atomic.scss'

//引用库
import {onMounted, ref} from "vue";
import {LinkedTable} from "/docs/router/routes.js";


let customTheme = ref("theme-light")
const drawer = ref(true)

onMounted(() => {

})


</script>

<template>

  <v-app :class="customTheme" class="app">
    <v-layout class="rounded rounded-md border">
      <v-app-bar :elevation="1" color="primary">
        <template v-slot:prepend>
          <v-app-bar-nav-icon @click="drawer=!drawer"></v-app-bar-nav-icon>
        </template>
        <v-app-bar-title>
          <h3> 明日方舟一图流</h3>
        </v-app-bar-title>
      </v-app-bar>
      <v-navigation-drawer v-model="drawer" width="280">
        <v-list color="primary" open-strategy="multiple" class="navigation-drawer" >
          <v-list-group v-for="module in LinkedTable" :key="module.text">
            <template v-slot:activator="{ props }">
              <v-list-item v-bind="props" :title="module.text"
              ></v-list-item>
            </template>

            <router-link v-for="(child,index) in module.child" :key="index"
                         :to="child.path" :href="child.path" class="router-link">
              <v-list-item color="primary" rounded :value="child.text">
                <div class="navigation-item-content">
                  <v-icon :icon="child.icon"></v-icon>
                  <div class="navigation-item-content-spacer"></div>
                  {{ child.text }}
                </div>
              </v-list-item>
            </router-link>
          </v-list-group>
        </v-list>
      </v-navigation-drawer>
      <v-main>
        <v-container class="v-container1">
          <router-view>
          </router-view>
        </v-container>
      </v-main>
    </v-layout>
  </v-app>

</template>

