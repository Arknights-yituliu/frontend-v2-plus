<script setup>

import {onMounted, ref} from "vue";
import {debounce} from "/src/utils/debounce.js";


const props = defineProps({
  icon: {
    type: String,
    default: ""
  },
  rounded: {
    type: Boolean,
    default: false
  },
  border: {
    type: Boolean,
    default: false
  },
  size: {
    type: Number,
    default: 40
  },
  mobileSize: {
    type: Number,
    default: 40
  }
});

let wrapStyle = ref('')
let spriteStyle = ref('')
let borderStyle = ref('')

function calculatedSize() {
  const innerWidth = window.innerWidth;

  let size = props.size;

  if (innerWidth < 600) {
    size = props.mobileSize;
  }

  if (props.border) {
    borderStyle.value = `background: rgb(33, 150, 243);border-radius: 4px;padding:2px`
    wrapStyle.value += `border-radius:4px;`
    size -= 4
  }

  wrapStyle.value += `overflow: hidden;position: relative;width: ${size}px;height: ${size}px`

  if (props.rounded) {
    wrapStyle.value += `;border-radius:60px;`
  }

  spriteStyle = `position: absolute;transform: scale(${size / 128});
  top: ${(size - 128) / 2}px;left: ${(size - 128) / 2}px;`

}


calculatedSize()

window.addEventListener('resize', debounce(calculatedSize));


</script>

<template>
  <div :style="borderStyle">
    <div :style="wrapStyle">
      <div :style="spriteStyle" :class="`bg-skill_icon_${icon}`">
      </div>
    </div>
  </div>
</template>
