<script setup>

import {onMounted, ref} from "vue";
import {onBeforeRouteUpdate} from "vue-router";

let loadingText = ref('加载中')




const intervalId = setInterval(() => {
  if(loadingText.value.length>9){
    loadingText.value = '加载中'
  }else {
    loadingText.value = loadingText.value + '·'
  }
}, 500);



</script>

<template>
  <div class="loading" id="loading">
    <div style="text-align: center">
      <img style="width: 128px;margin: auto" src="/image/website/icon-large.webp" alt=""/>
      <h1 style="">明日方舟一图流</h1>
      <h2 style="">{{ loadingText }}</h2>
    </div>
  </div>

</template>

<style>
.loading {
  width: 100%;
  height: calc(100vh);
  background-color: var(--c-page-background-color);
  z-index: 3000;
  //font-size: 18px;
  display: flex;
  position: fixed;
  justify-content: center;
  align-items: center;
}

@media screen and (max-width: 600px){


}

</style>