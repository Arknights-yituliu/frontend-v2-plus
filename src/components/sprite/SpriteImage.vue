<script setup>

import {onMounted} from "vue";
import {debounce} from "/src/utils/debounce.js";


const props = defineProps(["modelValue", 'originalSize', 'imageName', 'displaySize', 'roundedCorner','margin']);

let wrapStyle = ''
let spriteStyle = ''

function calculatedSize() {
  const innerWidth = window.innerWidth;
  let ratio = 1

  if(innerWidth<600){
    ratio = 0.7
  }

  const displaySize = props.displaySize ? props.displaySize * ratio : 40;

  wrapStyle = `overflow: hidden;position: relative;width: ${displaySize}px;height: ${displaySize}px`
  if(props.roundedCorner){
    wrapStyle += `;border-radius:${props.roundedCorner}px;`
  }
  if(props.margin){
    wrapStyle += `;margin:${props.margin}px;`
  }
  const originalSize = props.originalSize
  spriteStyle = `position: absolute;transform: scale(${displaySize / originalSize});
  top: ${(displaySize - originalSize) / 2}px;left: ${(displaySize - originalSize) / 2}px;`


}


calculatedSize()

onMounted(() => {
  window.addEventListener('resize', debounce(calculatedSize));
})


</script>

<template>

  <div :style="wrapStyle">
    <div :style="spriteStyle" :class="`bg-${imageName}`">
    </div>
  </div>

</template>
