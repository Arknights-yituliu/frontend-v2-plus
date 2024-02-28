<template>
  <button class="btn" :class="btnClass" :style="props.style">
    <slot></slot>
  </button>
</template>

<script setup>
import {ref, watch} from "vue"

const props = defineProps(["modelValue", 'status', "color", "style"]);
const btnColor = `btn-${typeof props.color === "undefined" ? '' : props.color}`

let btnClass = ref(``)
if (props.status !== void 0 && props.status) {
  btnClass.value = `${btnColor}`
}


watch(() => props.status, (newVal) => {
  // console.log(newVal)
  if (props.status !== void 0 && newVal) {
    btnClass.value = `${btnColor}`
  } else {
    btnClass.value = ``
  }
})


</script>