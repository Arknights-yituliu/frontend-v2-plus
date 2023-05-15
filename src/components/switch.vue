<template>
  <div :class="switch_class" @click="handleClick()">
    <div :class="switch_left_class"></div>
    <div :class="switch_right_class"></div>
  </div>
</template>

<script setup>
import { ref, watch } from "vue";
const emit =defineEmits(['update:modelValue'])
const props = defineProps(['modelValue']);

console.log(props.modelValue)
let switch_class = ref(props.modelValue?"switch":"switch switch_back");
let switch_left_class = ref(props.modelValue?"switch_left":"switch_left switch_color");
let switch_right_class = ref(props.modelValue?"switch_right switch_color":"switch_right switch_back");


function handleClick() {
  console.log(props.modelValue)
  if (!props.modelValue) {
    switch_class.value = "switch";
    switch_left_class.value = "switch_left";
    switch_right_class.value = "switch_right switch_color";
  } else {
    switch_class.value = "switch switch_back";
    switch_left_class.value = "switch_left switch_color";
    switch_right_class.value = "switch_right switch_back";
  }
  emit('update:modelValue', !props.modelValue)
}

watch(() => props.modelValue, (newVal, oldVal) => {
  if (newVal) {
    switch_class.value = "switch";
    switch_left_class.value = "switch_left";
    switch_right_class.value = "switch_right switch_color";
  } else {
    switch_class.value = "switch switch_back";
    switch_left_class.value = "switch_left switch_color";
    switch_right_class.value = "switch_right switch_back";
  }
})


</script>

<style scoped>
.switch {
  height: 16px;
  width: 38px;
  border: 1px rgb(201, 201, 201) solid;
  border-radius: 25px;
  display: flex;
  background: rgb(0, 140, 255);
}

.switch_back {
  background: rgb(163, 163, 163);
}

.switch_left {
  height: 16px;
  width: 16px;
  /* margin: 1px; */
  border-radius: 25px;
  /* background: white; */
}

.switch_right {
  height: 16px;
  width: 16px;
  /* margin: 1px; */
  margin-left: 6px;
  border-radius: 25px;
}

.switch_color {
  background: white;
}
</style>
