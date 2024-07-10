<script setup>

const props = defineProps(["modelValue", 'data']);

// const data = {
//   avatar: "/image/website/GitHub.webp",
//   title: "前端仓库",
//   description: "这是一个测试描述",
//   tags: ['标签1', '标签2', '标签3']
// }

</script>

<template>
  <div class="dev-card-wrap">
    <a :href="props.data.link">
      <div class="dev-card">
        <img :src="props.data.avatar" alt="" class="avatar"/>
        <span class="title">
       {{ props.data.title }}
    </span>
        <span class="description">
      {{ props.data.description }}
    </span>
        <div class="dev-tag">
          <div class="div-tag-item" v-for="(tag,index) in props.data.tags" :key="index">
            {{ tag }}
          </div>
        </div>
      </div>
    </a>
  </div>

</template>

<style>
.dev-card-wrap {
  width: 320px;
  height: 120px;
  margin: 8px;
  border-radius: 4px !important;
  -webkit-box-shadow: 0 3px 1px -2px rgba(0, 0, 0, 0.2), 0 2px 2px 0 rgba(0, 0, 0, 0.14), 0 1px 5px 0 rgba(0, 0, 0, 0.12) !important;
  box-shadow: 0 3px 1px -2px rgba(0, 0, 0, 0.2), 0 2px 2px 0 rgba(0, 0, 0, 0.14), 0 1px 5px 0 rgba(0, 0, 0, 0.12) !important;
  position: relative;

  .dev-card{
    width: 320px;
    height: 120px;
  }

  .avatar {
    width: 60px;
    position: absolute;
    top: 30px;
    left: 16px;
    border-radius: 1000px;
  }

  .title {
    position: absolute;
    top: 8px;
    left: 90px;
    font-size: 18px;
    font-weight: 800;
    color: var(--c-text-color);
    display: block;
  }

  .description {
    position: absolute;
    top: 42px;
    left: 90px;
    color: var(--c-text-tip-color);
    font-style: italic;
    display: block;
  }

  .dev-tag {
    position: absolute;
    display: flex;
    top: 70px;
    left: 90px;
    color: var(--c-text-tip-color);
    font-style: italic;
  }

  .div-tag-item {
    margin-right: 4px;
  }
}


</style>
