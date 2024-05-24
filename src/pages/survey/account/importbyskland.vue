<script setup>

import {ref} from "vue";

const hypergryphLink = 'https://ak.hypergryph.com/user/home'
const hypergryphTokenAPI = 'https://web-api.hypergryph.com/account/info/hg'
const BiliBiliTokenAPI = 'https://web-api.hypergryph.com/account/info/ak-b'

function openLinkOnNewPage(url) {
  window.open(url)
}

let selectedOption = ref('skland')

function optionLineClass(type) {
  if (type === selectedOption.value) {
    return 'option-line-active'
  } else {
    return 'option-line'
  }
}

function optionBtnColor(type) {
  if (type === selectedOption.value) {
    return 'color:#1f88ff'
  } else {
    return ''
  }
}

</script>

<template>
  <div class="import-page">

    <div class="checkbox">
      <div class="checkbox-option ">
        <button class="checkbox-btn" :style="optionBtnColor('hg')"
                @click="selectedOption='hg'">从官网导入
        </button>
        <div :class="optionLineClass('hg')"></div>
      </div>
      <div class="checkbox-option">
        <button class="checkbox-btn" :style="optionBtnColor('skland')"
                @click="selectedOption='skland'">从森空岛导入
        </button>
        <div :class="optionLineClass('skland')"></div>
      </div>
    </div>

    <div class="import-step" v-show="'skland'===selectedOption">
      <div class="import-step-item">
        <h2>第一步</h2>
        <p>登录明日方舟官网</p>
        <button class="btn btn-blue" @click="openLinkOnNewPage(hypergryphLink)">官网链接</button>
      </div>

      <div class="import-step-item">
        <h2>第二步</h2>
        <p>复制对应服务器API的全部内容</p>
        <button class="btn btn-blue" style="margin: 0 12px" @click="openLinkOnNewPage(hypergryphTokenAPI)">官服</button>
        <button class="btn btn-red" style="margin: 0 12px" @click="openLinkOnNewPage(BiliBiliTokenAPI)">B服</button>
      </div>

      <div class="import-step-item">
        <h2>第三步</h2>
        <p>输入复制的内容</p>
        <input class="input" style="display: block;width: 300px;margin: 0 auto 20px">
        <button class="btn btn-blue">官网链接</button>
      </div>
    </div>

    <div class="import-step" v-show="'hg'===selectedOption">
      <div class="import-step-item">
        <h2>第一步</h2>
        <p>登录森空岛</p>
        <button class="btn btn-blue" @click="openLinkOnNewPage(hypergryphLink)">官网链接</button>
      </div>

      <div class="import-step-item">
        <h2>第二步</h2>
        <p>复制对应服务器API的全部内容</p>
        <button class="btn btn-blue" style="margin: 0 12px" @click="openLinkOnNewPage(hypergryphTokenAPI)">官服</button>
        <button class="btn btn-red" style="margin: 0 12px" @click="openLinkOnNewPage(BiliBiliTokenAPI)">B服</button>
      </div>

      <div class="import-step-item">
        <h2>第三步</h2>
        <p>输入复制的内容</p>
        <input class="input" style="display: block;width: 300px;margin: 0 auto 20px">
        <button class="btn btn-blue">官网链接</button>
      </div>
    </div>
  </div>
</template>

<style>

.import-page {
  padding: 1px;

  .checkbox {
    width: 400px;
    margin: 12px auto;
  }

  .import-step {

  }

  .import-step-item {
    text-align: center;
    padding: 20px 0;
    width: 400px;
    margin: 20px auto;
    box-shadow: 1px 1px 2px var(--c-box-shadow-color), -1px -1px 2px var(--c-box-shadow-color);
  }
}


</style>