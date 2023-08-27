<template>
  <div :style="popupStyle">
    <div class="popup_mask" @click="openAndClose(false)"></div>

    <div class="popup" :style="widthStyle">
      <slot></slot>
     
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from "vue";

const emit = defineEmits(["update:visible"]);
const props = defineProps(["modelValue", "visible", "width"]);

const widthStyle = "width:" + props.width;

// console.log(props.visible)
// console.log(props.width)

let popupStyle = ref("display: none;");
if (props.visible) {
  popupStyle.value = "display: block;";
}

function openAndClose(visible) {
  emit("update:visible", visible);
  if (visible) {
    popupStyle.value = "display: block;";
  } else {
    popupStyle.value = "display: none;";
  }
}

watch(
  () => props.visible,
  (newVal, oldVal) => {
    console.log(newVal, oldVal);
    if (newVal) {
      popupStyle.value = "display: block;";
    } else {
      popupStyle.value = "display: none;";
    }
  }
);
</script>

<style scoped>
.popup_mask {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 30;
  width: 100%;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.6);
  /* display: none; */
}

.popup {
  /* display: none; */
  position: absolute;
  top: 30px;
  left: 0;
  right: 0;
  z-index: 2001;
  margin: auto;
  width: 500px;
  height: 500px;
  overflow: auto;
  background-color: rgba(255, 255, 255);
  border-radius: 6px;
  /* margin-top: 100px; */
}

</style>
