<template>
  <div class="selectPage" :style="widthStyle">
    <input :style="widthStyle" type="text" class="selectInput" @click="openAndColseOption()" v-model="props.modelValue" />
    <div class="options" :style="visibleStyle">
      <div class="option" v-for="(option, index) in options" :key="index" @click="selectOptions(option[props.value])">
        <!-- {{option}} -->
        {{ option[props.label] }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from "vue";

const emit = defineEmits(["update:modelValue"]);
const props = defineProps(["modelValue", "options", "label", "value", "width"]);

let visibleStyle = ref("display:none");
const widthStyle = "width:" + props.width;

let visible = false;

let options = ref(props.options);

// console.log('label：',props.label)
// console.log('key：',props.value)

function openAndColseOption() {
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
  openAndColseOption();
}

watch(
  () => props.options,
  (newVal, oldVal) => {
    // console.log(newVal)
    options.value = newVal;
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
.selectPage {
  /* border:none; */
  width: 200px;
  height: 26px;
  /* border: 1px red solid; */
}
.selectInput {
  /* border:none; */
  width: 194px;
  height: 22px;
  border-color: #409eff;
  outline: none;
  padding: 0;
  border: 1px #cee6ff solid;
  border-radius: 4px;
}

.options {
  /* border:none; */
  width: 100%;
  position: relative;
  top: 4px;
  background: white;
  box-shadow: 0 0 1px 1px rgb(217, 217, 217);
  overflow: auto;
  height: 100px;
  z-index: 2000;
  /* overflow-y: hidden; */
  margin: auto;
  scrollbar-width: none; /* firefox */
  -ms-overflow-style: none; /* IE 10+ */
}

::-webkit-scrollbar {
  display: none;
  /* Chrome Safari */
}

.option {
  margin-bottom: 2px;
  /* border:none; */
  width: 100%;
  height: 22px;
  line-height: 22px;
  font-weight: 600;
  color: rgb(68, 68, 68);
  padding-left: 4px;
  /* border: 1px rgb(0, 47, 255) solid; */
}
</style>
