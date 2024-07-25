<template>
  <div class="switch" @click="handleClick()" :style="getBackgroundStyle(modelValue)">
    <div class="switch-status" :style="getStatusStyle(modelValue)">
    </div>
  </div>
</template>

<script setup>
import {ref, watch} from "vue";

const emit = defineEmits(["update:modelValue"]);
const props = defineProps(["modelValue"]);

function getBackgroundStyle(status){
  if (status) {
    return 'background-color:#13CE66FF'
  } else {
    return ''
  }
}

function getStatusStyle(status) {

  if (status) {
    return 'left:24px'
  } else {
    return ''
  }
}

if (typeof props.modelValue != "boolean") {

}

function handleClick() {
  emit("update:modelValue", !props.modelValue);
}

watch(
    () => props.modelValue,
    (newVal) => {
    }
);
</script>

<style scoped>
.switch {
  width: 40px;
  border-radius: 2000px;
  height: 16px;
  padding: 1px;
  background-color: #bebebe;
}

.switch-status {
  position: relative;
  left: 0;
  height: 16px;
  width: 16px;
  transition: all .1s linear;
  border-radius: 2000px;
  background-color: #ffffff;
}

</style>
