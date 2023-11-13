<template>
  <button :class="btn_class" :style="props.style">
    <slot></slot>
  </button>
</template>

<script setup>
import {ref, watch} from "vue"

const props = defineProps(["modelValue", 'status', "color", "style"]);
const btn_color = `btn_${props.color == void 0 ? 'white' : props.color}`

let btn_class = ref(`btn`)
if (props.status !== void 0 && props.status) {
  btn_class.value = `btn ${btn_color}`
}


watch(() => props.status, (newVal) => {
  // console.log(newVal)
  if (props.status !== void 0 && newVal) {
    btn_class.value = `btn ${btn_color}`
  } else {
    btn_class.value = `btn`
  }
})


</script>