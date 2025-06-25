<script setup>

const props = defineProps(["modelValue", 'data']);

// const data = {
//   avatar: "/image/website/GitHub.webp",
//   title: "前端仓库",
//   description: "这是一个测试描述",
//   tags: ['标签1', '标签2', '标签3']
// }

function openNewPage(url) {
  window.open(url)
}

</script>

<template>
  <v-card class="developer-card" @click="openNewPage(props.data.url)">
    <v-card-item>
      <div class="flex">
        <img :src="props.data.avatar" alt="" class="developer-avatar"/>
        <div class="m-0-8">
          <v-card-title>{{ props.data.title }}</v-card-title>
          <v-card-subtitle>{{ props.data.description }}</v-card-subtitle>
        </div>
      </div>
    </v-card-item>
    <v-card-text>

      <v-chip color="primary" class="m-4" v-for="(tag,index) in props.data.tags" :key="index">
        {{ tag }}
      </v-chip>
    </v-card-text>
  </v-card>

</template>

<style>
.developer-avatar {
  width: 60px;
  border-radius: 1000px;
}

.developer-card {
  width: 300px;
  margin: 4px;
}


</style>
