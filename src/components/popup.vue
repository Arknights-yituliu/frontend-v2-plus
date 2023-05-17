<template>
  <div class="popup_mask" :style="popupStyle">
    <div class="popup">
      <slot></slot>
      <div class="popup_btn_wrap">
        <div class="popup_btn_white" @click="popupStyle = 'display: block'">取消</div>
        <div class="popup_btn" @click="popupStyle = 'display: none'">关闭</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from "vue";

const props = defineProps(["modelValue", "visible", "width"]);

let popupStyle = ref("display: none;");
if (props.visible) {
  popupStyle.value = "display: block;";
}

watch(
  () => props.visible,
  (newVal, oldVal) => {
    if (newVal) {
      popupStyle.value = "display: block;";
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
  background-color: rgba(0, 0, 0, 0.4);
  /* display: none; */
}

.popup {
  /* display: none; */
  position: fixed;
  right: 0;
  left: 0;
  z-index: 50;
  margin: auto;
  margin-top: 100px;
  width: 540px;
  height: auto;
  background-color: rgba(255, 255, 255);
  border-radius: 6px;
}

.popup_btn_wrap {
  width: 90%;
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  justify-content: flex-end;
  margin: auto;
}

.popup_btn {
  margin: 6px;
  /* margin-right:30px; */
  min-width: 60px;
  height: 18px;
  padding: 4px;
  line-height: 18px;
  text-align: center;
  background: rgb(13, 135, 228);
  color: white;
  font-weight: 600;
  box-shadow: 0 0 1px 1px rgb(209, 209, 209);
  border-radius: 3px;
}

.popup_btn_white {
  margin: 6px;
  /* margin-right:30px; */
  min-width: 60px;
  height: 18px;
  padding: 4px;
  line-height: 18px;
  text-align: center;
  background: white;
  color: black;
  font-weight: 600;
  box-shadow: 0 0 1px 1px rgb(228, 228, 228);
  border-radius: 3px;
}
</style>
