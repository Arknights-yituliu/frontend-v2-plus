<template>
  <div class="components-dev">
    {{selectValue}}
    <c-select :options="selectList" v-model="selectValue">

    </c-select>

  </div>
</template>

<script setup>
import {ref} from "vue";

const selectList = [
  {label:'243',value:243},
  {label:'153',value:153},
  {label:'333',value:333},
  {label:'252',value:252},
  {label:'342',value:342},
]

let selectValue = ref(243)



</script>


<style>

.components-dev {
  width: 100%;
  height: 100%;
  padding: 40px;
}
</style>
