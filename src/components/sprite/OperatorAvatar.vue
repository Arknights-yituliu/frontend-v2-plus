<script setup>

import {onMounted, ref} from "vue";
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
  rarity: {
    type: Number,
    default: 6
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

  const rarityColor = {
    6: 'linear-gradient(45deg, #FF5722, #FDD835)',
    5: 'linear-gradient(45deg, #9C27B0, #1E88E5)',
    4: 'linear-gradient(45deg, #2196F3, #B3E5FC)',
    3: 'linear-gradient(45deg, #B0BEC5, #ECEFF1)',
    2: 'linear-gradient(45deg, #B0BEC5, #ECEFF1)',
    1: 'linear-gradient(45deg, #B0BEC5, #ECEFF1)'
  }



  const background = rarityColor[props.rarity]
  borderStyle.value = `width:${size}px;height: ${size}px;`
  if (props.border) {
    borderStyle.value += `background: ${background};border-radius: 4px;`
    wrapStyle.value += `border-radius:4px;`

    if (innerWidth < 600) {
      size -= 2
      borderStyle.value += `padding:1px;`
    } else {
      size -= 4
      borderStyle.value += `padding:2px;`
    }
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
      <div v-bind:style="spriteStyle" :class="`sprite bg-${charId}`">
      </div>
    </div>
  </div>
</template>
