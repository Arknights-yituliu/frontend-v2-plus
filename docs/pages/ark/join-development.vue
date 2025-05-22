<script setup>

</script>

<template>
  <h1 id="preparations-before-development">参与开发</h1>
  <h2 id="development-environment">准备开发环境</h2>
  <ul>
    <li>代码编辑器，可以使用免费的 <a href="https://code.visualstudio.com/">Visual Studio Code</a></li>
    <li>运行环境node.js（目前项目是18版本）</li>
    <li>版本控制系统Git，安装最新版就行</li>
  </ul>
  <h2 id="pull-code">拉取代码</h2>
  <p>前往前端仓库，地址：<a href="https://github.com/Arknights-yituliu/frontend-v2-plus">https://github.com/Arknights-yituliu/frontend-v2-plus</a>,
    此时你可以看到这样的一个页面，点击上面的code按钮会弹窗一个小窗口，有三种下载方式，但是只推荐前两种，把前两种下载方式挑一个复制下来
  </p>
  <img src="/image/doc/pull-code.jpg" alt="" >
  <p>
    复制好上面的链接后，在你的电脑上新建一个文件夹，例如frontend（你可以随便取，建议英文，避免一些不必要的问题），进入到frontend文件夹后，在文件夹内空白处点击鼠标右键唤出菜单</p>
  <img src="/image/doc/right-click-menu.jpg" alt="" >
  <p>点击上面的Open Git Bash here，此时会出现一个这样的终端页面，此时输入命令：git clone 加上从第一步复制的仓库链接
  </p>
  <code >git clone git@github.com:Arknights-yituliu/frontend-v2-plus.git</code>
  <img src="/image/doc/git-terminal.jpg" alt="" >
  <p>
    输入上述命令后按确认，会出现如下打印内容，由于仓库的提交历史过大，需要下载一会，也可以通过追加命名参数选择不下载历史提交记录</p>
  <img src="/image/doc/download-repository.jpg" alt="" >
  <h2 id="install dependencies">安装依赖</h2>
  <p>
    等待下载完成后你的frontend文件夹里会出现一个新的文件夹frontend-v2-plus，点击进入这个文件夹，点击文件夹上的地址栏，输入命令cmd</p>
  <img src="/image/doc/repository-folder.jpg" alt="">
  <p>在弹出的终端中输入命令：npm install，安装项目的依赖包</p>
  <v-sheet color="black" :elevation="2">npm install</v-sheet>
  <img src="/image/doc/install-package.jpg" alt="" >


</template>

<style scoped>

</style>