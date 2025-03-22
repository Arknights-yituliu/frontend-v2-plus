<script setup>
import '/src/assets/css/doc/doc.scss'
import {copyTextToClipboard} from "/src/utils/copyText.js";
import {onMounted, ref} from "vue";
import {addScrollListener} from "@/utils/windowListener.js";
import {debounce} from "@/utils/debounce.js";


let menuList = ref([])
let currentMenu = ref('')


function getMenuList() {
  const hElement = document.querySelectorAll('h1, h2, h3, h4, h5, h6');

  let list = []

  for (const item of hElement) {


    const {nodeName, innerText, id} = item;

    let h1LastChild = 0
    let h2LastChild = 0
    let h3LastChild = 0

    if (list.length) {
      h1LastChild = list.length - 1
      if (list[h1LastChild].child.length) {
        h2LastChild = list[h1LastChild].child.length - 1
        if (list[h1LastChild].child[h2LastChild].child.length) {
          h3LastChild = list[h1LastChild].child[h2LastChild].child.length - 1
        }
      }
    }

    if ('H1' === nodeName) {
      list.push({
        title: innerText,
        id: id,
        child: [],

      })
    }

    if ('H2' === nodeName) {
      list[h1LastChild].child.push({
        title: innerText,
        id: id,
        child: []
      })
    }

    if ('H3' === nodeName) {
      list[h1LastChild].child[h2LastChild].child.push({
        title: innerText,
        id: id,
        child: []
      })
    }

    if ('H4' === nodeName) {
      list[h1LastChild].child[h2LastChild].child[h3LastChild].child.push({
        title: innerText,
        id: id,
        child: []
      })
    }

  }

  menuList.value = list
  console.log(list)
}


function getCurrentMenu() {
  let hElement = document.querySelectorAll('h1, h2, h3, h4, h5, h6');

  for (const item of hElement) {
    let rect = item.getBoundingClientRect();
    console.log(item.id)

    window.history.replaceState({}, '', '#' + item.id);
    currentMenu.value = item.id

    if (_isElementInViewport(rect)) {
      break
    }

    if(rect.top>0){
      break
    }
  }


  // 判断一个元素是否接近视口顶部的方法
  function _isElementInViewport(rect) {

    const top = rect.top
    console.log(top)
    return (
        top >= 0 &&
        top <= (window.innerHeight || document.documentElement.clientHeight)
    );
  }

  console.log(currentMenu.value)
}

function currentMenuClass(id) {
  if (id === currentMenu.value) {
    return 'current-menu'
  }
}

onMounted(() => {
  getMenuList()
  addScrollListener(debounce(getCurrentMenu, 300))
})


</script>


<template>

  <div class="doc-page">
    <div class="doc-menu">
      <div class="doc-menu-title">目录</div>
      <div v-for="h1 in menuList">
       <a :href="`#${h1.id}`" class="href-black menu-item" :class="currentMenuClass(h1.id)">{{ h1.title }}</a>
        <div v-for="h2 in h1.child" >
          <a :href="`#${h2.id}`" class="href-black menu-item menu-item-h2" :class="currentMenuClass(h2.id)"> {{ h2.title }}</a>
          <div v-for="h3 in h2.child" >
            <a :href="`#${h3.id}`" class="href-black menu-item menu-item-h3" :class="currentMenuClass(h3.id)"> {{ h3.title }}</a>
          </div>
        </div>
      </div>
    </div>


    <div>
      <h1 id="project"> 项目简介 </h1>
      <v-divider class="border-opacity-50"></v-divider>
      <p>明日方舟一图流是一个无偿开源项目，旨在给各位博士提供一些游玩策略上的参考。包括以下内容：</p>
      <h2 id="item">材料规划</h2>
      <ul>
        <li>精英材料刷取推荐：提供刷取精英材料的最佳地点参考</li>
        <li>商店性价比：提供各种商店中的材料兑换优先级参考</li>
        <li>礼包性价比：氪金时的性价比参考</li>
        <li>材料价值表：如果有额外的对材料方面的需求，但是网站上没有，可以通过这个页面自行计算</li>
        <li>干员精二价值表：主要用于直升道具（使用将干员直接提升为精二1级状态）使用时的参考</li>
      </ul>
      <h2 id="tools">实用小工具</h2>
      <ul>
        <li>攒抽计算器：提供当前时间到未来多个限定卡池时的可获取的抽卡次数，为博士的抽卡策略提供参考</li>
        <li>排班生成器：提供帕拉斯的基建协议可视化编辑器</li>
        <li>专精减半计算器：提供减半类专精技能的计算</li>
      </ul>
      <h2 id="survey">调查与统计</h2>
      <ul>
        <li>干员练度调查结果：基于收集来的博士们的练度数据进行统计，为博士的技能专精提供数据参考</li>
        <li>公招tag调查：基于上传到一图流的公招词条，统计部分tag的出率情况</li>
      </ul>

      <h1 id="join-us">参与开发</h1>
      <v-divider class="border-opacity-50"></v-divider>
      <h2 id="preparations-before-development">开发前准备</h2>
      <h3 id="development-environment">准备开发环境</h3>
      <p></p>
      <ul>
        <li>代码编辑器，可以使用免费的 <a href="https://code.visualstudio.com/">Visual Studio Code</a></li>
        <li>运行环境node.js（目前项目是18版本）</li>
        <li>版本控制系统Git，安装最新版就行</li>
      </ul>
      <h3 id="pull-code">拉取代码</h3>
      <p>前往前端仓库，地址：<a href="https://github.com/Arknights-yituliu/frontend-v2-plus">https://github.com/Arknights-yituliu/frontend-v2-plus</a>,
        此时你可以看到这样的一个页面，点击上面的code按钮会弹窗一个小窗口，有三种下载方式，但是只推荐前两种，把前两种下载方式挑一个复制下来
      </p>
      <img src="/image/doc/拉取代码1.png" alt="">
      <p>
        复制好上面的链接后，在你的电脑上新建一个文件夹，例如frontend（你可以随便取，建议英文，避免一些不必要的问题），进入到frontend文件夹后，在文件夹内空白处点击鼠标右键唤出菜单</p>
      <img src="/image/doc/右键菜单.png" alt="">
      <p>点击上面的Open Git Bash here，此时会出现一个这样的终端页面，此时输入命令：git clone 加上从第一步复制的仓库链接
      </p>
      <code>git clone git@github.com:Arknights-yituliu/frontend-v2-plus.git</code>
      <img src="/image/doc/git终端.png" alt="">
      <p>
        输入上述命令后按确认，会出现如下打印内容，由于仓库的提交历史过大，需要下载一会，也可以通过追加命名参数选择不下载历史提交记录</p>
      <img src="/image/doc/下载仓库.jpg" alt="">
      <h3 id="install dependencies">安装依赖</h3>
      <p>
        等待下载完成后你的frontend文件夹里会出现一个新的文件夹frontend-v2-plus，点击进入这个文件夹，点击文件夹上的地址栏，输入命令cmd</p>
      <img src="/image/doc/项目文件夹.jpg" alt="">
      <p>在弹出的终端中输入命令：npm install，安装项目的依赖包</p>
      <code>npm install</code>
      <img src="/image/doc/安装依赖.jpg" alt="">
    </div>
  </div>
</template>

<style>

</style>


