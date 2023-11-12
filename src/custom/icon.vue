<template>
  <div>
    <svg :style="props.style" class="icon"  aria-hidden="true">
      <use :xlink:href="name"></use>
    </svg>
  </div>
</template>

<script setup>
import { defineProps } from "vue";
const props = defineProps(["name", "style"]);
const name = `#icon-${props.name}`;

</script>

<style scoped>
.icon{
  fill: var(--c-text-color);
}

</style>