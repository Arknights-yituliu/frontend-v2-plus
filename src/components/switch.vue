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
let switch_class = ref(props.modelValue?"switch":"switch switch_red");
let switch_left_class = ref(props.modelValue?"switch_left":"switch_left switch_white");
let switch_right_class = ref(props.modelValue?"switch_right switch_white":"switch_right switch_red");
// let switch_class = ref("switch");
// let switch_left_class = ref("switch_left");
// let switch_right_class = ref("switch_right switch_white");

function handleClick() {
  console.log(props.modelValue)
  if (!props.modelValue) {
    switch_class.value = "switch";
    switch_left_class.value = "switch_left";
    switch_right_class.value = "switch_right switch_white";
  } else {
    switch_class.value = "switch switch_red";
    switch_left_class.value = "switch_left switch_white";
    switch_right_class.value = "switch_right switch_red";
  }
  emit('update:modelValue', !props.modelValue)
}

watch(() => props.modelValue, (newVal, oldVal) => {
  if (newVal) {
    switch_class.value = "switch";
    switch_left_class.value = "switch_left";
    switch_right_class.value = "switch_right switch_white";
  } else {
    switch_class.value = "switch switch_red";
    switch_left_class.value = "switch_left switch_white";
    switch_right_class.value = "switch_right switch_red";
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

.switch_left {
  height: 16px;
  width: 16px;
  margin-left: -1px;
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

.switch_red{
  background: rgb(220, 0, 0);
}

.switch_white {
  background: white;
}
</style>
