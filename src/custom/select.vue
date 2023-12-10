<template>
  <div class="select" :style="style">
    <div class="select-mask" :style="visibleStyle" @click="openAndCloseOption()"></div>
    <input readonly="readonly" :style="style" type="text" class="select-input" @click="openAndCloseOption()" :value="modelValue" />
    <div class="options" :style="visibleStyle">
      <div class="option" v-for="(option, index) in options" :key="index" @click="selectOptions(option.value)">
        {{ option.label }}
      </div>
    </div>
    <div class="select-arrow" :style="visibleStyle"></div>
  </div>
</template>

<script setup>
import { ref, watch } from "vue";

const emit = defineEmits(["update:modelValue"]);
const props = defineProps(["modelValue", "options", "style"]);

let visibleStyle = ref("display:none");

let visible = false;

let options = ref(props.options);

// console.log('label：',props.label)
// console.log('key：',props.value)

function openAndCloseOption() {
  // console.log(visible)
  if (!visible) {
    visibleStyle.value = "display:block";
  } else {
    visibleStyle.value = "display:none";
  }

  visible = !visible;
  // visibleStyle.value = 'display:none'
}

function selectOptions(option) {
  emit("update:modelValue", option);
  openAndCloseOption();
}

watch(
  () => props.options,
  (newVal, oldVal) => {
    if(newVal !== oldVal){
      options.value = newVal;
    }
  }
);

// watch(
//   () => props.label,
//   (newVal, oldVal) => {
//     console.log(newVal)
//     label.value = newVal
//   }
// )
</script>

<style scoped>
.select {
  /* border:none; */
  width: 160px;
  height: 28px;
  position: relative;
  cursor: pointer;
  /* border: 1px red solid; */
}

.select-mask{
  width: 100%;
  height: 100%;
  position: fixed;
  top: 0;
  left: 0;
}

.select-input {
  width: 160px;
  height: 28px;
  line-height: 28px;
  font-size: 18px;
  outline: none;
  padding: 0 4px;
  border: 1px #d7d7d7 solid;
  border-radius: 4px;
  box-sizing: border-box;
}

.select-input:focus{
  border: 2px #6cb3ff solid;
}

.select-arrow{
  width: 10px;
  height: 10px;
  background-color: white;
  position: absolute;
  top: 34px;
  transform: rotate(45deg);
  left: 75px;
  border: 1px solid #cecece;
}

.options-wrap{
  height: 0;
  overflow: auto;
  transition: height 0.25s ease;
}

.options {
  width: 98%;
  position: absolute;
  top: 38px;
  left: 1%;
  background: white;
  box-shadow: 0 1px 4px rgb(199, 184, 184);
  overflow: auto;
  z-index: 2000;
  margin: auto;
  scrollbar-width: none; /* firefox */
  -ms-overflow-style: none; /* IE 10+ */
}

::-webkit-scrollbar {
  display: none;
  /* Chrome Safari */
}

.option {
  margin: 8px;
  /* border:none; */
  width: 100%;
  height: 22px;
  font-size: 18px;
  line-height: 22px;
  color: rgb(84, 82, 82);
  padding-left: 4px;
  cursor: pointer;
  /* border: 1px rgb(0, 47, 255) solid; */
}
</style>
