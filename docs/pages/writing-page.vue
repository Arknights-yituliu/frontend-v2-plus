<script setup>
import LinkButton from "@/components/dev/LinkButton.vue";
</script>

<template>

  <h1 id="edit-page">编写主站点页面</h1>
  <v-divider></v-divider>

  <v-alert  border variant="tonal" type="info"  >
    <v-alert-title><span class="font-bold">注意事项</span></v-alert-title>
    编写页面需要对以下技术或语言有一定了解：<br>
    <LinkButton text="Vue" link="https://cn.vuejs.org/guide/introduction"></LinkButton>  、
    <LinkButton text="JavaScript" link="https://www.runoob.com/js/js-intro.html"></LinkButton>、
    <LinkButton text="HTML" link="https://www.runoob.com/html/html-tutorial.html"></LinkButton>、
    <LinkButton text="CSS" link="https://www.runoob.com/css/css-tutorial.html"></LinkButton>
  </v-alert>

  <h2 id="edit-page">编辑页面</h2>
  <v-divider></v-divider>
  <p>如果你想更新页面，直接在对应的页面内修改即可，文档页面目录路径为/src/pages</p>
  <h2 id="create-page">新建页面</h2>
  <v-divider></v-divider>
  <p>如果你想新增一个页面，以下为举例：</p>
  <h3 id="create-page-1">1.在目录src/pages下新建一个 writing-documentation.vue组件</h3>
  <h3 id="create-page-2">2.在组件内编写文档</h3>
  <p>一般一个组件包括
    script标签内为逻辑 (JavaScript)，template标签内为模板 (HTML) 和style标签内为样式
    (CSS)；一般只需要在template标签内编写</p>
  <p>我们可以在标签内写一个测试&lt;h1>hello world&lt;/h1></p>
  <pre><code>&lt;script setup>
&lt;/script>
&lt;template>
  &lt;h1>hello world&lt;/h1>
&lt;/template>
&lt;style scoped>
&lt;/style></code></pre>
  <h2 id="add-route">添加导航</h2>
  <v-divider></v-divider>
  <p>此时我们的组件还无法通过导航和链接访问，我们需要添加路由，添加路由的文件在src/router/routes.js文件内</p>
  <pre><code>//先将组件引入到路由文件中
import STAGE_RECOMMENDATION_REGISTER from '/src/pages/material/stageV3.vue'
import STORE from '/src/pages/material/store.vue'

//在路由数组中追加组件，按格式填写即可
const routes = [
  {
      path: '/',
      text: '关卡推荐',
      name: 'StageRecommendation',
      display: true,
      module: 'material',
      icon: "mdi-hexagon-multiple",
      component: STAGE_RECOMMENDATION_REGISTER
  },
  {
      path: '/material/store', //页面的转跳路径  必须以/docs/开头,否则会转跳到主站点去
      text: '商店性价比',//页面的标题
      name: 'MaterialStore',  //页面的名称，推荐为路径的的首字母大写，中间无连接符-
      display: true, //是否展示在侧边导航上
      module: 'material', //导航分组，目前仅有DevelopmentDocumentation组
      icon: "mdi-circle-multiple", //导航图标
      component: STORE //组件
  },
]</code></pre>

  <h2 id="check-page">检查页面是否可访问</h2>
  <v-divider></v-divider>
  <p>首先查看侧边导航栏是否有页面的导航，点击导航查看是否正常转跳</p>
</template>

<style scoped>

</style>
