<template>
  <div :style="popupStyle" class="popup_page">
    <div class="popup_mask" @click="openAndClose(false)">

    </div>
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
.popup_page{
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
  margin: 15vh auto auto;
  width: 500px;
  height: 500px;
  overflow: auto;
  background: #fff;
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0,0,0,.1);
  box-sizing: border-box;

}
</style>
