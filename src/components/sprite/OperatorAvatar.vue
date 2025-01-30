<script setup>

import {onMounted, ref, watch} from "vue";
import {debounce} from "/src/utils/debounce.js";


const props = defineProps({
  charId: {
    type: String,
    default: "char_377_gdglow"
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
    size -= 4
    borderStyle.value = 'background: linear-gradient(45deg, #FF5722, #FDD835);border-radius: 4px;padding:2px'
    wrapStyle.value += `border-radius:4px;`
  }

  wrapStyle.value += `overflow: hidden;background-color:var(--c-background-color);position: relative;width: ${size}px;height: ${size}px;`

  if (props.rounded) {
    wrapStyle.value += `border-radius:100px;`
  }



  spriteStyle.value = `position: absolute;transform: scale(${size / 180});
  top: ${(size - 180) / 2}px;left: ${(size - 180) / 2}px;`
}


calculatedSize()


onMounted(() => {

})
window.addEventListener('resize', debounce(calculatedSize));


</script>

<template>

  <div :style="borderStyle">
    <div v-bind:style="wrapStyle">
      <div v-bind:style="spriteStyle" :class="`bg-${charId}`">
      </div>
    </div>
  </div>
</template>
