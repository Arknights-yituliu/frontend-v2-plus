<script setup>
import '/src/assets/css/doc.scss'
import {copyTextToClipboard} from "@/utils/copyText.js";
</script>
<template>
  <v-container class="doc-page">
    <h1> 项目简介 </h1>
    <p>明日方舟一图流是一个无偿开源项目，旨在给各位博士提供一些游玩策略上的参考。包括以下内容：</p>
    <h2>材料规划：</h2>
    <ul>
      <li><b>精英材料刷取推荐：</b>提供刷取精英材料的最佳地点参考</li>
      <li><b>商店性价比：</b>提供各种商店中的材料兑换优先级参考</li>
      <li><b>礼包性价比：</b>氪金时的性价比参考</li>
      <li><b>材料价值表：</b>如果有额外的对材料方面的需求，但是网站上没有，可以通过这个页面自行计算</li>
      <li><b>干员精二价值表：</b>主要用于直升道具（使用将干员直接提升为精二1级状态）使用时的参考</li>
    </ul>
    <h2>实用小工具：</h2>
    <ul>
      <li><b>攒抽计算器：</b>提供当前时间到未来多个限定卡池时的可获取的抽卡次数，为博士的抽卡策略提供参考</li>
      <li><b>排班生成器：</b>提供帕拉斯的基建协议可视化编辑器</li>
      <li><b>专精减半计算器：</b>提供减半类专精技能的计算</li>
    </ul>
    <h2>调查与统计：</h2>
    <ul>
      <li><b>干员练度调查结果：</b>基于收集来的博士们的练度数据进行统计，为博士的技能专精提供数据参考</li>
      <li><b>公招tag调查：</b>基于上传到一图流的公招词条，统计部分tag的出率情况</li>
    </ul>

    <h1>参与开发</h1>
    <h2>开发前准备</h2>
    <ul>
      <li>代码编辑器，可以使用免费的<b>Visual Studio Code</b></li>
      <li>运行环境<b>node.js</b>（目前项目是18版本）</li>
      <li>版本控制系统<b>Git</b>，安装最新版就行</li>
    </ul>
    <h2>开始开发</h2>
    <p>1、前往前端仓库，地址：（<a href="https://github.com/Arknights-yituliu/frontend-v2-plus">https://github.com/Arknights-yituliu/frontend-v2-plus</a>）,
      此时你可以看到这样的一个页面，点击上面的code按钮会弹窗一个小窗口，有三种下载方式，但是只推荐前两种，把前两种下载方式挑一个复制下来
    </p>
    <img src="/image/doc/拉取代码1.png" alt="">
    <p>
      2、复制好上面的链接后，在你电脑上新建一个文件夹，例如frontend（你可以随便取，推荐英文），进入到frontend文件夹后，在文件夹内空白处点击鼠标右键唤出菜单</p>
    <img src="/image/doc/右键菜单.png" alt="">
    <p>3、点击上面的<b>Open Git Bash here</b>，此时会出现一个这样的终端页面，此时输入命令：git clone 从第一步复制的仓库链接
    </p>
    <code>git clone git@github.com:Arknights-yituliu/frontend-v2-plus.git</code>
    <img src="/image/doc/git终端.png" alt="">
    <p>
      4、输入上述命令后按确认，会出现如下打印内容，由于仓库的提交历史过大，需要下载一会，也可以通过追加命名参数选择不下载历史提交记录</p>
    <img src="/image/doc/下载仓库.jpg" alt="">
    <p>
      等待下载完成后你的frontend文件夹里会出现一个新的文件夹frontend-v2-plus，点击进入这个文件夹，点击文件夹上的地址栏，输入命令cmd</p>
    <img src="/image/doc/项目文件夹.jpg" alt="">
    <p>在弹出的终端中输入命令：npm install，安装项目的依赖包</p>
    <code>npm install</code>
    <img src="/image/doc/安装依赖.jpg" alt="">
  </v-container>
</template>
