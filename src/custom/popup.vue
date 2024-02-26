<template>
  <div  class="popup-wrap" v-show="visible||modelValue">
    <div class="popup_mask" @click="openAndClose(false)" >
    </div>

    <div class="popup-box" :style="style" >
      <slot name="header"></slot>
      <div class="popup-context" :style="context_height_style">
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
const context_height_style = `height:${props.height}`;


function openAndClose(visible) {
  emit("update:visible", visible);
  emit("update:modelValue",visible)
  console.log(visible)
  // if (visible) {
  //   popupStyle.value = "display: block;";
  // } else {
  //   popupStyle.value = "display: none;";
  // }
}

</script>

<style scoped>
.popup-wrap {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 2000;
}

.popup_mask {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.3);
  z-index: 2001;

  /* display: none; */
}

.popup-box {
  /* display: none; */
  position: relative;
  z-index: 2100;
  margin: 10vh auto;
  background-color: var(--c-background-color);
  border-radius: 6px;
  box-sizing: border-box;
  box-shadow: var(--c-box-shadow);
  -webkit-backdrop-filter: blur(4px);
  backdrop-filter: blur(4px);
  width: fit-content;
}

.popup-context {
  max-height: 80vh;
  overflow-y: auto;
  overflow-x: hidden;
}
</style>
