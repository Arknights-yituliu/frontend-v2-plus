<template>
  <div  class="popup-wrap" v-show="visible||modelValue">
    <div class="popup_mask" @click="openAndClose(false)" >
    </div>

    <div class="popup-box" :style="style" >
      <slot name="header"></slot>
      <div class="popup-context" :style="contextHeightStyle">
        <slot></slot>
      </div>
      <slot name="footer"></slot>
    </div>

  </div>
</template>

<script setup>
import {ref} from "vue";
const emit = defineEmits(["update:visible","update:modelValue"]);
const props = defineProps(["modelValue", "visible", "width", "height",'style']);
const contextHeightStyle = `height:${props.height}`;


function openAndClose(visible) {
  emit("update:visible", visible);
  emit("update:modelValue",visible)
}

</script>

<style scoped>
.popup-wrap {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 3000;
  box-sizing: border-box;
}

.popup_mask {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.3);
  z-index: 2001;
}

.popup-box {
  /* display: none; */
  position: relative;
  z-index: 2100;
  margin: 10vh auto;
  box-sizing: border-box;
  padding: 8px;
  width: fit-content;
}

.popup-context {
  border-radius: 6px;
  max-height: 70vh;
  overflow-y: auto;
  overflow-x: hidden;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  background-color: var(--c-page-background-color);
  box-shadow: 1px 1px 10px var(--c-box-shadow-color);
  width: fit-content;
}
</style>
