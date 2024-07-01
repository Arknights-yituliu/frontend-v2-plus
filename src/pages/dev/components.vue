<script setup>


import MyButton from "/src/components/Button.vue";
import {ref} from "vue";
import Button from "../../components/Button.vue";

let status = ref(true)


const colors = ['blue', 'orange', 'green', 'red', 'purple', 'cyan']

let buttonLightStyle = ''
let buttonDarkStyle = ''
let buttonColorsMap = []
for (const color of colors) {
  buttonLightStyle +=
      `
      --c-button-${color}-background: var(--c-${color}-primary);
      --c-button-${color}-hover: var(--c-${color}-primary-light);
      --c-button-${color}-border: var(--c-${color}-primary-light);
      --c-button-${color}-text: var(--c-${color}-primary);
      `
  buttonDarkStyle +=
      `
      --c-button-${color}-background: var(--c-${color}-primary);
      --c-button-${color}-hover: var(--c-${color}-primary-light);
      --c-button-${color}-border: var(--c-${color}-primary-light);
      --c-button-${color}-text: var(--c-${color}-primary-light);
      `
  buttonColorsMap +=
      `
      '${color}': (
                background: var(--c-button-${color}-background),
                hover:var(--c-button-${color}-hover),
                border: var(--c-button-${color}-border),
                text:var(--c-button-${color}-text),
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
    <my-button data-color="blue">
      11111
    </my-button>

    <my-button data-color="blue" :status="status" @click="status=!status">
      {{ status }}
    </my-button>

    <my-button data-color="orange">
      11111
    </my-button>

    <my-button data-color="orange" :status="status" @click="status=!status">
      {{ status }}
    </my-button>

    <my-button data-color="green">
      11111
    </my-button>

    <my-button data-color="green" :status="status" @click="status=!status">
      {{ status }}
    </my-button>

    <my-button data-color="red">
      11111
    </my-button>

    <my-button data-color="red" :status="status" @click="status=!status">
      {{ status }}
    </my-button>

    <my-button data-color="purple">
      11111
    </my-button>

    <my-button data-color="purple" :status="status" @click="status=!status">
      {{ status }}
    </my-button>
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