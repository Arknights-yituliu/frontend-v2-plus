<script setup>

import {onMounted, ref} from "vue";
import {debounce} from "/src/utils/debounce.js";
import {operatorTableV2} from "/src/utils/gameData.js";


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

function resolveDisplayRarity() {
  const rarity = Number(props.rarity)

  if (!Number.isFinite(rarity)) {
    return 6
  }

  if (props.charId && operatorTableV2?.[props.charId] && Number(operatorTableV2[props.charId].rarity) === rarity) {
    return Math.min(6, Math.max(1, Math.floor(rarity) + 1))
  }

  return Math.min(6, Math.max(1, Math.floor(rarity)))
}

function calculatedSize() {
  const innerWidth = window.innerWidth;
  wrapStyle.value = ''
  spriteStyle.value = ''
  borderStyle.value = ''


  let size = props.size;
  const displayRarity = resolveDisplayRarity()

  if (innerWidth < 600) {
    size = props.mobileSize;
  }

  const rarityColor = {
    6: 'linear-gradient(135deg, #ff8a3d, #ffd24a)',
    5: 'linear-gradient(135deg, #ffffff, #f2c75c)',
    4: 'linear-gradient(135deg, #ffffff, #d8c6ff)',
    3: 'linear-gradient(135deg, #ffffff, #7fb7ff)',
    2: 'linear-gradient(135deg, #ffffff, #7fd88f)',
    1: 'linear-gradient(135deg, #ffffff, #c5c9d3)'
  }



  const background = rarityColor[displayRarity] || rarityColor[1]
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
      <div v-bind:style="spriteStyle" :class="`sprite-avatar bg-${charId}`">
      </div>
    </div>
  </div>
</template>
