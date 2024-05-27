<script setup>

import {ref} from "vue";
import {copyTextToClipboard} from "/src/utils/copyText.js";


const HYPERGRYPH_LINK = 'https://ak.hypergryph.com/user/home'
const HYPERGRYPH_TOKEN_API = 'https://web-api.hypergryph.com/account/info/hg'
const BILIBILI_TOKEN_API = 'https://web-api.hypergryph.com/account/info/ak-b'
const SKLAND_LINK = 'https://www.skland.com/'
const CONSOLE_CODE = 'localStorage.getItem(\'SK_OAUTH_CRED_KEY\')+\',\'+localStorage.getItem(\'SK_TOKEN_CACHE_KEY\')'

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

function copyText(text){
  copyTextToClipboard(text)
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

    <div class="import-step" v-show="'hg'===selectedOption">
      <div class="import-step-item">
        <h2>第一步</h2>
        <p>登录明日方舟官网</p>
        <button class="btn btn-blue" @click="openLinkOnNewPage(HYPERGRYPH_LINK)">官网链接</button>
      </div>

      <div class="import-step-item">
        <h2>第二步</h2>
        <img src="/image/skland/hgAPI.jpg"  alt="" class="import-step-image">
        <p>点击对应的服务器链接，将会返回如上图所示的一段数据，将其全部复制</p>
        <button class="btn btn-blue" style="margin: 0 12px" @click="openLinkOnNewPage(HYPERGRYPH_TOKEN_API)">官服
        </button>
        <button class="btn btn-red" style="margin: 0 12px" @click="openLinkOnNewPage(BILIBILI_TOKEN_API)">B服</button>
      </div>

      <div class="import-step-item">
        <h2>第三步</h2>
        <p>输入复制的内容</p>
        <input class="input" style="display: block;width: 300px;margin: 0 auto 20px">
        <button class="btn btn-blue">导入数据</button>
      </div>

      <div class="import-step-item">
        <h2>第四步</h2>
        <p>为了账号安全，导入后会强制退出官网登录，可以再次进入官网检查登录状态</p>
        <button class="btn btn-blue" @click="openLinkOnNewPage(HYPERGRYPH_LINK)">官网链接</button>
      </div>
    </div>

    <div class="import-step" v-show="'skland'===selectedOption">
      <div class="import-step-item">
        <h2>第一步</h2>
        <p>登录森空岛官网</p>
        <button class="btn btn-blue" @click="openLinkOnNewPage(SKLAND_LINK)">官网链接</button>
      </div>

      <div class="import-step-item">
        <h2>第二步</h2>
        <img src="/image/skland/step1.jpg"  alt="" class="import-step-image">
        <p>登录后按键盘F12调出开发者工具，在下方选择控制台(console)，输入以下命令：</p>
        <p style="color:#6ebeff">localStorage.getItem('SK_OAUTH_CRED_KEY')+','+ localStorage .getItem('SK_TOKEN_CACHE_KEY')</p>
        <button class="btn btn-orange" style="margin: 0 12px"
                @click="copyText(CONSOLE_CODE)">点击复制</button>

      </div>

      <div class="import-step-item">
        <h2>第三步</h2>
        <img src="/image/skland/step2.jpg"  alt="" class="import-step-image">
        <p>此时你可以获得一段神秘的字符，复制这段字符<b>（*不要带引号）</b>，输入到下面的输入框中</p>
        <input class="input" style="display: block;width: 300px;margin: 0 auto 20px">
        <button class="btn btn-blue">导入数据</button>
      </div>
    </div>
  </div>
</template>

<style>

.import-page {
  padding: 1px;
  min-height: 95vh;

  .checkbox {
    width:210px;
    margin: 12px auto;
  }

  .import-step {
    display: flex;
    flex-wrap: wrap;
  }

  .import-step-item {
    text-align: center;
    padding: 12px 16px;
    box-sizing: border-box;
    width: 400px;
    margin: 20px auto;
    box-shadow: 1px 1px 2px var(--c-box-shadow-color), -1px -1px 2px var(--c-box-shadow-color);
  }

  .import-step-image{
    width: 100%;
    margin: 0 auto;
  }
}


</style>