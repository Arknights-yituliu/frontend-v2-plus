<template>
  <button :class="btn_class">
    <slot></slot>
  </button>
</template>

<script setup>
import {ref, watch} from "vue"

const props = defineProps(["modelValue", 'status', 'isSelected', "color"]);
const btn_color = `btn_${props.color == void 0 ? 'white' : props.color}`

let btn_class = ref(`btn ${btn_color}`)
if (props.isSelected != void 0 && props.isSelected) {
  btn_class.value = `btn ${btn_color} ${btn_color}_selected`
}


watch(() => props.isSelected, (newVal) => {
  // console.log(newVal)
  if (props.isSelected != void 0 && newVal) {
    btn_class.value = `btn ${btn_color} ${btn_color}_selected`
  } else {
    btn_class.value = `btn ${btn_color} ${btn_color}`
  }
})


</script>