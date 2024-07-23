<script setup>

import {ref} from "vue";

const props = defineProps(["modelValue", 'originalSize', 'id', 'displaySize', 'roundedCorner']);

let wrapStyle = ref('')
let spriteStyle = ref('')

function calculatedSize() {
  const displaySize = props.displaySize ? props.displaySize : 40;

  wrapStyle.value = `position: relative;width: ${displaySize}px;height: ${displaySize}px;overflow: hidden;`
  const originalSize = props.originalSize
  spriteStyle.value = `position: absolute;transform: scale(${displaySize / originalSize});
  top: ${(displaySize - originalSize) / 2}px;left: ${(displaySize - originalSize) / 2}px;`
}
calculatedSize()

</script>

<template>

  <div :style="wrapStyle">
    <div :style="spriteStyle" :class="`bg-${id}`">
    </div>
  </div>

</template>
