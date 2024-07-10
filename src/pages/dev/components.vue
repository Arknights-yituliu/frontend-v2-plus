<script setup>


import MyButton from "/src/components/Button.vue";
import {ref} from "vue";
import Button from "/src/components/Button.vue";

let status = ref(true)


const colors = ['blue', 'orange', 'green', 'red', 'purple', 'cyan']

let buttonLightStyle = ''
let buttonDarkStyle = ''
let buttonColorsMap = []
for (const color of colors) {
  buttonLightStyle +=
      `
      --c-button-${color}-background: var(--c-${color}-1);
      --c-button-${color}-hover: var(--c-${color}-2);
      --c-button-${color}-border: var(--c-${color}-5);
      --c-button-${color}-text: var(--c-${color}-5);
      --c-button-${color}-background-active: var(--c-${color}-5);
      `
  buttonDarkStyle +=
      `
      --c-button-${color}-background: var(--c-${color}-9);
      --c-button-${color}-hover: var(--c-${color}-5);
      --c-button-${color}-border: var(--c-${color}-3);
      --c-button-${color}-text: var(--c-${color}-3);
      --c-button-${color}-background-active: var(--c-${color}-5);
      `
  buttonColorsMap +=
      `
      '${color}': (
                background: var(--c-button-${color}-background),
                hover:var(--c-button-${color}-hover),
                border: var(--c-button-${color}-border),
                text:var(--c-button-${color}-text),
                background-active:var(--c-button-${color}-background-active),
        ),
      `
}
console.log('按钮亮色样式')
console.log(buttonLightStyle)
console.log('按钮暗色样式')
console.log(buttonDarkStyle)
console.log('按钮颜色变量')
console.log(buttonColorsMap)




</script>

<template>

  <div class="components-page">
    <div v-for="(color,index) in colors" >
      <my-button :data-color="color" >
        默认
      </my-button>
<!--      <my-button :data-color="color" data-hover >-->
<!--        悬停-->
<!--      </my-button>-->
      <my-button :data-color="color" :active="true" >
        触发
      </my-button>
    </div>
  </div>
</template>

<style>
.components-page {
  min-height: 95vh;
  padding: 12px;
}

.components-page button {
  margin: 4px;
}
</style>