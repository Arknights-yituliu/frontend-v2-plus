<template>
  <div :class="switch_class" @click="handleClick()">
    <div :class="switch_left_class"></div>
    <div :class="switch_right_class"></div>
  </div>
</template>

<script setup>
import { ref } from "vue";
const emit = defineEmits(["update:modelValue"]);
const props = defineProps(["modelValue"]);

let switch_class = ref("switch");
let switch_left_class = ref("switch_left");
let switch_right_class = ref("switch_right switch_color");

function handleClick() {
  console.log(props.modelValue);
  if (!props.modelValue) {
    switch_class.value = "switch";
    switch_left_class.value = "switch_left ";
    switch_right_class.value = "switch_right switch_color";
  } else {
    switch_class.value = "switch switch_back";
    switch_left_class.value = "switch_left switch_color";
    switch_right_class.value = "switch_right switch_back";
  }
  emit("update:modelValue", !props.modelValue);
}
</script>

<style scoped>
.switch {
  height: 12px;
  width: 26px;
  border: 1px rgb(201, 201, 201) solid;
  border-radius: 25px;
  display: flex;
  background: rgb(0, 140, 255);
}

.switch_back {
  background: rgb(163, 163, 163);
}

.switch_left {
  height: 10px;
  width: 10px;
  margin: 1px;
  border-radius: 25px;
  /* background: white; */
}

.switch_right {
  height: 10px;
  width: 10px;
  margin: 1px;
  margin-left: 6px;
  border-radius: 25px;
}

.switch_color {
  background: white;
}
</style>
