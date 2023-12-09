<template>
  <div class="switch" :class="switch_bg" @click="handleClick()">
<!--    <div :class="switch_left_class"></div>-->
<!--    <div :class="switch_right_class"></div>-->
    <div class="switch_left" :class="switch_left_class">
    </div>
    <div class="switch_right" :class="switch_right_class">
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from "vue";
const emit = defineEmits(["update:modelValue"]);
const props = defineProps(["modelValue"]);

// console.log('传入值', props.modelValue)

if (typeof props.modelValue != "boolean") {
  // console.log("测试", props.modelValue === undefined);
}

let switch_bg = ref( props.modelValue ? "switch_true" : "switch_false");
let switch_left_class = ref( props.modelValue ? "" : "switch_bg");
let switch_right_class = ref(props.modelValue ? "switch_bg" : "");

// let switch_class = ref("switch");
// let switch_left_class = ref("switch_left");
// let switch_right_class = ref("switch_right switch_white");

function handleClick() {
  // console.log(props.modelValue);
  if (!props.modelValue) {
    switch_bg.value = "switch_true";
    switch_left_class.value = "";
    switch_right_class.value = "switch_bg";
  } else {
    switch_bg.value = "switch_false";
    switch_left_class.value = "switch_bg";
    switch_right_class.value = "";
  }
  emit("update:modelValue", !props.modelValue);
}

watch(
  () => props.modelValue,
  (newVal, oldVal) => {
    if (newVal) {
      switch_bg.value = "switch_true";
      switch_left_class.value = "";
      switch_right_class.value = "switch_bg";
    } else {
      switch_bg.value = "switch_false";
      switch_left_class.value = "switch_bg";
      switch_right_class.value = "";
    }
  }
);
</script>

<style scoped>
.switch{
  width: 42px;
  border-radius: 25px;
  display: flex;
  justify-content: space-between;
  height: 19px;
}

.switch_false{
  border: 1px rgb(172, 178, 183) solid;
  background: rgb(78, 98, 128);
}

.switch_true {
  border: 1px #cce4ff solid;
  background: #5fa7f1;
}

.switch_left {
  height: 16px;
  width: 16px;
  margin: 1px;
  border-radius: 25px;

}

.switch_bg {
  background-color: #ffffff;
}

.switch_right {
  height: 16px;
  width: 16px;
  margin: 1px;
  border-radius: 25px;
}




</style>
