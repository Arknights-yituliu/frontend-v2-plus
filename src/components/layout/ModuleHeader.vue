
<script setup>
const props = defineProps(["modelValue","title","titleEn",'tips']);
</script>
<template>

  <div class="module-header">
    <div class="module-title">
      <h1>{{ props.title }}</h1>
      <h4>{{ props.titleEn }}</h4>
    </div>
    <slot></slot>
    <span class="module-tip" v-for="(tip,index) in tips" :key="index">{{tip}}</span>
  </div>

</template>