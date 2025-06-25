<script setup>

import {ref} from "vue";
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
    borderStyle.value = `width: ${size}px;height: ${size}px;background: rgb(33, 150, 243);border-radius: 4px;`
    wrapStyle.value += `border-radius:4px;`

  }

  if (innerWidth < 600) {
    size -= 2
    borderStyle.value +=`padding:1px;`
  }else {
    size -= 4
    borderStyle.value +=`padding:2px;`
  }

  wrapStyle.value += `overflow: hidden;position: relative;width: ${size}px;height: ${size}px;`

  if (props.rounded) {
    wrapStyle.value += `border-radius:60px;`
  }

  spriteStyle = `position: absolute;transform: scale(${size / 128});
  top: ${(size - 128) / 2}px;left: ${(size - 128) / 2}px;`

}


calculatedSize()

window.addEventListener('resize', debounce(calculatedSize));


function replaceId(str) {
  // 找到最后一个 '_' 的位置
  const lastUnderscoreIndex = str.lastIndexOf('_');

  // 如果没有找到 '_'，直接返回原字符串
  if (lastUnderscoreIndex === -1) {
    return str;
  }

  // 替换最后一个 '_' 为 'x5d'
  const replacedLast = str.slice(0, lastUnderscoreIndex) + 'x5d' + str.slice(lastUnderscoreIndex + 1);

  // 再次查找倒数第二个 '_'
  const secondLastUnderscoreIndex = replacedLast.lastIndexOf('_', lastUnderscoreIndex - 1);

  // 如果没有找到倒数第二个 '_'，直接返回当前结果
  if (secondLastUnderscoreIndex === -1) {
    return replacedLast;
  }

  // 替换倒数第二个 '_' 为 'x5b'
  return replacedLast.slice(0, secondLastUnderscoreIndex) +
      'x5b' +
      replacedLast.slice(secondLastUnderscoreIndex + 1);
}

</script>

<template>
  <div :style="borderStyle">
    <div :style="wrapStyle">
      <div :style="spriteStyle" :class="`sprite-skill bg-skill_icon_${icon} bg-skill_icon_${replaceId(icon)}`">
      </div>
    </div>
  </div>
</template>
