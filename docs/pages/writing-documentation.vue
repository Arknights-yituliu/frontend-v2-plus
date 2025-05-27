<script setup>



import LinkButton from "@/components/dev/LinkButton.vue";
</script>

<template>

  <h1 id="edit-page">编写文档站页面</h1>
  <v-divider></v-divider>
  <v-alert variant="tonal" type="info"  >
    <v-alert-title><span class="font-bold">注意事项</span></v-alert-title>
    编写页面需要对以下技术或语言有一定了解：<br>
    <LinkButton text="Vue" link="https://cn.vuejs.org/guide/introduction"></LinkButton>、
    <LinkButton text="JavaScript" link="https://www.runoob.com/js/js-intro.html"></LinkButton>、
    <LinkButton text="HTML" link="https://www.runoob.com/html/html-tutorial.html"></LinkButton>
  </v-alert>

  <h2 id="edit-page">编辑内容</h2>
  <v-divider></v-divider>
  <p>如果你想更新页面，直接在对应的页面内修改即可，文档页面目录路径为/docs/pages</p>
  <h2 id="create-page">新建页面</h2>
  <v-divider></v-divider>
  <p>如果你想新增一个页面，以下为举例：</p>
  <h3 id="create-page-1">1.在目录/docs/pages下新建一个 writing-documentation.vue组件</h3>
  <h3 id="create-page-2">2.在组件内编写文档</h3>
  <p>一般一个组件包括
  script标签内为逻辑 (JavaScript)，template标签内为模板 (HTML) 和style标签内为样式 (CSS)；一般只需要在template标签内编写</p>
  <p>我们可以在标签内写一个测试文本&lt;h2>hello world&lt;/h2></p>
  <pre>
<code>
&lt;script setup>
&lt;/script>
&lt;template>
  &lt;h2>hello world&lt;/h2>
&lt;/template>
&lt;style scoped>
&lt;/style>
    </code>
  </pre>

  <h2 id="add-route">添加导航</h2>
  <v-divider></v-divider>
  <p>此时我们的组件还无法通过导航和链接访问，我们需要添加路由，添加路由的文件在docs/router/routes.js文件内</p>
  <pre>
<code>
  //先将组件引入到路由文件中
  import WritingDocumentation from "/docs/pages/writing-documentation.vue";
  const routes = [
    {
      path: '/docs',
      text: '项目简介',
      name: 'ProjectOverview',
      display: true,
      module: 'DevelopmentDocumentation',
      icon: 'mdi-application-outline',
      component: ProjectOverview
    },
    {
      path: '/docs/writing-documentation', //页面的转跳路径  必须以/docs/开头,否则会转跳到主站点去
      text: '编写文档',  //页面的标题
      name: 'WritingDocumentation', //页面的名称，必须为路径的的首字母大写，中间无连接符-，例如路径为/docs/writing-documentation，则name为WritingDocumentation
      display: true, //是否展示在侧边导航上
      module: 'DevelopmentDocumentation', //导航分组，目前仅有DevelopmentDocumentation组
      icon: 'mdi-code-braces', //导航图标
      component: WritingDocumentation //组件
    }
  ]
      </code>
  </pre>

  <h2 id="check-page">检查页面是否可访问</h2>
  <v-divider></v-divider>
  <p>首先查看侧边导航栏是否有页面的导航，点击导航查看是否正常转跳</p>

</template>

<style scoped>

</style>