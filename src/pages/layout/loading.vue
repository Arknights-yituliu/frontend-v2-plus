<script setup>

import {onMounted, ref} from "vue";

let loadingText = ref('加载中')


async function updateLoadingText(text) {

}

const intervalId = setInterval(() => {

  if(loadingText.value.length>9){
    loadingText.value = '加载'
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
      <h2 style="font-size: 32px; ">{{ loadingText }}</h2>
    </div>
  </div>

</template>
<style>
.loading {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100vh;
  background-color: white;
  z-index: 3000;
  font-size: 18px;
  color: black;
  display: flex;
  justify-content: center;
  align-items: center;
}


</style>