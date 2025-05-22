<script setup>
import '/src/assets/css/doc/doc.scss'
import {onMounted, ref} from "vue";
import {addScrollListener} from "/src/utils/windowListener.js";
import {debounce} from "/src/utils/debounce.js";


let menuList = ref([])
let currentMenu = ref('')
let imageUrl = ref('')

let imageDialog = ref(false)

function viewLargerImage(url){
  imageUrl.value = url
  imageDialog.value = true
}



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

    if (rect.top > 0) {
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

console.log(menuList.value)

let h1Open = ref(['project', 'join-us'])

</script>


<template>

  <div class="doc-page">
    <div class="doc-menu">

      <v-list :opened="h1Open" color="primary" title="目录" open-strategy="multiple">

        <v-list-group v-for="h1 in menuList" :value="h1.id">
          <template v-slot:activator="{ props }">
            <v-list-item
                v-bind="props"
                :title="h1.title"
            ></v-list-item>
          </template>


          <v-list-item v-show="h2.child.length===0"
                       v-for="h2 in h1.child"
                       :title="h2.title"
                       :value="h2.id"
          >
          </v-list-item>


          <v-list-group :value="h2.id" v-for="h2 in h1.child" v-show="h2.child.length>0">
            <template v-slot:activator="{ props }">
              <v-list-item
                  v-bind="props"
                  :title="h2.title"
              ></v-list-item>
            </template>
            <v-list-item
                v-for="h3 in h2.child"
                :title="h3.title"
                :value="h3.id"
            ></v-list-item>
          </v-list-group>
        </v-list-group>

      </v-list>


    </div>


    <div class="doc-container">
      <h1 id="project">项目简介</h1>
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
      <h2 id="project">网页PR方式</h2>
      <v-alert variant="tonal" type="info">
        此方法适用于想提交一些修改JSON文件、文档、错字之类的修改
      </v-alert>
      <p>1.首先来到前端仓库，点击右上角的<b> Fork </b>按钮复制一份代码</p>
      <img src="/image/doc/fork.jpg" alt="" @click="viewLargerImage('/image/doc/fork.jpg')">
      <p>2.然后直接点击<b> Create Fork </b>按钮</p>
      <img src="/image/doc/create-fork.jpg" alt="" @click="viewLargerImage('/image/doc/create-fork.jpg')">
      <p>
        3.接下来来到了你的个人仓库，可以看到标题是 “用户名称/frontend-v2-plus”，下面一行小字 forked from
        Arknights-yituliu/frontend-v2-plus
      </p>
      <img src="/image/doc/my-repositories.jpg" alt="" @click="viewLargerImage('/image/doc/my-repositories.jpg')">
      <p>4.找到你要改的文件，一般数据文件在<b> src/static/ </b>目录下，这里演示如何修改攒抽计算器的活动排期，
        活动排期文件为src/static/json/tools/schedule_by_honeycake.json（非固定活动）或
        src/static/json/tools/schedule_fixed.json（固定活动，如周年、夏活等）</p>
      <p>5.点击对应文件页面的右上角编辑按钮</p>
      <img src="/image/doc/web-edit.jpg" alt="" @click="viewLargerImage('/image/doc/web-edit.jpg')">
      <p>6.到这步就可以随便修改了，如果涉及大量修改还是直接拉取代码到本地用编译器编辑，编译器一般带JSON格式检查</p>
      <p>7.修改完后点击右上角绿色的<b> Commit-changes </b>按钮</p>
      <img src="/image/doc/web-commit-changes-1.jpg" alt="" @click="viewLargerImage('/image/doc/web-commit-changes-1.jpg')">
      <p>8.这时会弹出一个弹窗，在弹窗表单上的Commit message填写本次提交的大概描述，建议按统一格式写，填写完毕后点击<b> Commit
        changes </b>按钮</p>
      <v-alert variant="tonal" type="info" title="Commit message格式">
        提交类型(例如：更新-update、修复-fix)(修改区域):本次修改的大概描述
      </v-alert>
      <img src="/image/doc/web-commit-changes-2.jpg" alt="" @click="viewLargerImage('/image/doc/web-commit-changes-2.jpg')">
      <p>9.当你完成上述步骤，回到你fork的仓库主页，或者点击<b> code </b>按钮回到主页，此时会有两种情况：</p>
      <p>① 如果出现<b> Compare & Pull Requeste </b>按钮，直接点就行了。</p>
      <p>② 没有出现，就点击<b> Contribute </b>按钮，再点击<b> Open Pull Request </b></p>
      <img src="/image/doc/open-pull-request.jpg" alt="" @click="viewLargerImage('/image/doc/open-pull-request.jpg')">
      <p>10.此时会跳转到pull-request页面，可查看提交的内容是否是你想提交的。<br>
        之后填写Add a title和Add a description， title也最好按commit message格式填写。<br>
        以上都确认无误后，点击绿色的<b> Create pull request </b>按钮</p>
      <img src="/image/doc/create-pull-request.jpg" alt="" @click="viewLargerImage('/image/doc/create-pull-request.jpg')">
      <p>11.提交后等待组织仓库的持有人merge即可</p>


      <h2 id="preparations-before-development">本地PR方式</h2>
      <h3 id="development-environment">准备开发环境</h3>
      <ul>
        <li>代码编辑器，可以使用免费的 <a href="https://code.visualstudio.com/">Visual Studio Code</a></li>
        <li>运行环境node.js（目前项目是18版本）</li>
        <li>版本控制系统Git，安装最新版就行</li>
      </ul>
      <h3 id="pull-code">拉取代码</h3>
      <p>前往前端仓库，地址：<a href="https://github.com/Arknights-yituliu/frontend-v2-plus">https://github.com/Arknights-yituliu/frontend-v2-plus</a>,
        此时你可以看到这样的一个页面，点击上面的code按钮会弹窗一个小窗口，有三种下载方式，但是只推荐前两种，把前两种下载方式挑一个复制下来
      </p>
      <img src="/image/doc/pull-code.jpg" alt="" @click="viewLargerImage('/image/doc/pull-code.jpg')">
      <p>
        复制好上面的链接后，在你的电脑上新建一个文件夹，例如frontend（你可以随便取，建议英文，避免一些不必要的问题），进入到frontend文件夹后，在文件夹内空白处点击鼠标右键唤出菜单</p>
      <img src="/image/doc/right-click-menu.jpg" alt="" @click="viewLargerImage('/image/doc/right-click-menu.jpg')">
      <p>点击上面的Open Git Bash here，此时会出现一个这样的终端页面，此时输入命令：git clone 加上从第一步复制的仓库链接
      </p>
      <code>git clone git@github.com:Arknights-yituliu/frontend-v2-plus.git</code>
      <img src="/image/doc/git-terminal.jpg" alt="" @click="viewLargerImage('/image/doc/git-terminal.jpg')">
      <p>
        输入上述命令后按确认，会出现如下打印内容，由于仓库的提交历史过大，需要下载一会，也可以通过追加命名参数选择不下载历史提交记录</p>
      <img src="/image/doc/download-repository.jpg" alt="" @click="viewLargerImage('/image/docdownload-repository.jpg')">
      <h3 id="install dependencies">安装依赖</h3>
      <p>
        等待下载完成后你的frontend文件夹里会出现一个新的文件夹frontend-v2-plus，点击进入这个文件夹，点击文件夹上的地址栏，输入命令cmd</p>
      <img src="/image/doc/repository-folder.jpg" alt="">
      <p>在弹出的终端中输入命令：npm install，安装项目的依赖包</p>
      <code>npm install</code>
      <img src="/image/doc/install-package.jpg" alt="" @click="viewLargerImage('/image/doc/install-package.jpg')">


      <v-dialog v-model="imageDialog" max-width="80%">
        <img :src="imageUrl" alt="" >
      </v-dialog>

    </div>
  </div>
</template>

<style>

</style>


