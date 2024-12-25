<script setup>

import {onMounted} from "vue";
import {debounce} from "/src/utils/debounce.js";


const props = defineProps({
  itemId: {
    type: String,
    default: ""
  },
  rounded: {
    type: Boolean,
    default: false
  },
  size: {
    type: Number,
    default: 40
  }

});

let wrapStyle = ''
let spriteStyle = ''

function calculatedSize() {
  const innerWidth = window.innerWidth;
  let ratio = 1

  if (innerWidth < 600) {
    ratio = 0.7
  }

  const size = props.size * ratio;

  wrapStyle = `overflow: hidden;position: relative;width: ${size}px;height: ${size}px`
  if (props.rounded) {
    wrapStyle += `;border-radius:60px;`
  }

  spriteStyle = `position: absolute;transform: scale(${size / 183});
  top: ${(size - 183) / 2}px;left: ${(size - 183) / 2}px;`

}


calculatedSize()

onMounted(() => {
  window.addEventListener('resize', debounce(calculatedSize));
})


</script>

<template>

  <div :style="wrapStyle">
    <div :style="spriteStyle" :class="`bg-${itemId}`">
    </div>
  </div>

</template>
