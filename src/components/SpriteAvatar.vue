<script setup>

const props = defineProps(["modelValue", 'name', 'size','roundedCorner']);

const wrapStyle = `position: relative;
width: ${props.size}px;
height: ${props.size}px;
overflow: hidden;`

const spriteStyle = `position: absolute;transform: scale(${props.size / 180});
top: ${(props.size-180)/2}px;left: ${(props.size-180)/2}px;`

</script>

<template>

  <div :style="wrapStyle">
    <div :style="spriteStyle" :class="`bg-${name}`">
    </div>
  </div>

</template>

