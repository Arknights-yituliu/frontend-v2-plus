<script setup>
const props = defineProps(["link", 'text']);
</script>

<template>
  <a class="link-button color-primary"  :href="link">
    {{text}}
  </a>
</template>

<style scoped>

.link-button{
  font-weight: bolder;
}

</style>