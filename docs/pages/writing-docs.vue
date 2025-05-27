<script setup>


const pageInfo = {
  path: '/docs',
  text: '编写文档',
  name: 'WritingDocumentation',
  display: true,
  module: 'DevelopmentDocumentation',
  icon: 'mdi-application-outline',
}





</script>

<template>

  <h1>编辑页面内容</h1>
  <v-divider></v-divider>
  <p>如果你想更新页面，直接在对应的页面内修改即可，文档页面目录路径为/docs/pages</p>
  <h2>新建页面</h2>
  <v-divider></v-divider>
  <p>如果你想新增一个页面，以下为举例：</p>
  <h3>1.在目录/docs/pages下新建一个 docs.vue文件</h3>
  <h3>2.此时vue文件内的结构为：</h3>
  <pre>
   <code>
   </code>
  </pre>
</template>

<style scoped>

</style>