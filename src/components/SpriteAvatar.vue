<script setup>

const props = defineProps(["modelValue", 'name', 'size', 'roundedCorner']);

const size = props.size ? props.size : 40;

const wrapStyle = `position: relative;
width: ${size}px;
height: ${size}px;
overflow: hidden;`

const spriteStyle = `position: absolute;transform: scale(${size / 180});
top: ${(size - 180) / 2}px;left: ${(size - 180) / 2}px;`

</script>

<template>

  <div :style="wrapStyle">
    <div :style="spriteStyle" :class="`bg-${name}`">
    </div>
  </div>

</template>

