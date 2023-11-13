<template>
  <div :style="popupStyle" class="popup_page">
    <div class="popup_mask" @click="openAndClose(false)">
    </div>

    <div class="popup" :style="width_style">
      <slot name="header"></slot>
      <div class="popup_context" :style="context_height_style">
        <slot></slot>
      </div>
      <slot name="footer"></slot>
    </div>

  </div>
</template>

<script setup>
import {ref, watch} from "vue";

const emit = defineEmits(["update:visible","update:modelValue"]);
const props = defineProps(["modelValue", "visible", "width", "height"]);

const width_style = `width: ${props.width}`;
const context_height_style = `height:${props.height}`;

// console.log(props.visible)
// console.log(props.width)

let popupStyle = ref("display: none;");
if (props.visible||props.modelValue) {
  popupStyle.value = "display: block;";
}

function openAndClose(visible) {
  emit("update:visible", visible);
  emit("update:modelValue",visible)
  if (visible) {
    popupStyle.value = "display: block;";
  } else {
    popupStyle.value = "display: none;";
  }
}


watch(
    () => props.visible,
    (newVal) => {
      // console.log('visible新值：', newVal)
      if (newVal) {
        popupStyle.value = "display: block;";
      } else {
        popupStyle.value = "display: none;";
      }
    }
);

watch(
    () => props.modelValue,
    (newVal) => {
      // console.log('modelValue新值：', newVal)
      if (newVal) {
        popupStyle.value = "display: block;";
      } else {
        popupStyle.value = "display: none;";
      }
    }
);
</script>

<style scoped>
.popup_page {
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

.popup {
  /* display: none; */
  position: relative;
  z-index: 2100;
  margin: 10vh auto auto;
  width: 500px;
  background-color: var(--popup-card-bg);
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, .1);
  box-sizing: border-box;
}

.popup_context {
  width: 100%;
  max-height: 550px;
  overflow-y: auto;
  overflow-x: hidden;
}
</style>
