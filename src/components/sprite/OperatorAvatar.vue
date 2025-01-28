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
  size: {
    type: Number,
    default: 40
  },
  mobileSize: {
    type: Number,
    default: 40
  }
});

let wrapStyle = ''
let spriteStyle = ''
let charId = ref(props.charId);

function calculatedSize() {
  const innerWidth = window.innerWidth;

  charId.value = props.charId;

  let size = props.size;

  if (innerWidth < 600) {
    size = props.mobileSize;
  }


  wrapStyle = `overflow: hidden;position: relative;width: ${size}px;height: ${size}px`
  if (props.rounded) {
    wrapStyle += `;border-radius:60px;`
  }

  spriteStyle = `position: absolute;transform: scale(${size / 180});
  top: ${(size - 180) / 2}px;left: ${(size - 180) / 2}px;`

}


calculatedSize()


onMounted(() => {
  window.addEventListener('resize', debounce(calculatedSize));
})

watch(()=>props.charId,(newVal,oldVal)=>{
   // console.log(newVal);
  charId.value = props.charId;
})

</script>

<template>

  <div :style="wrapStyle">
    <div :style="spriteStyle" :class="`bg-${charId}`">
    </div>
  </div>

</template>
