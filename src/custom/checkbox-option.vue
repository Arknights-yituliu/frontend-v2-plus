<script setup>
import {ref, watch} from "vue"

const props = defineProps(["modelValue","label","value", "style"]);

let active = ref("")

if(props.label===props.value){
  active.value = 'active'
}

watch(() => props.value, (newVal) => {
  if (props.label===newVal) {
    active.value = 'active'
  } else {
    active.value = ''
  }
})

</script>
<template>
  <div class="checkbox-option">
    <button class="checkbox-btn"  :data-active="active">
      <slot></slot>
    </button>
    <div class="option-line" :data-active="active"></div>
  </div>
</template>