<template>
<div :style="popupStyle">
  <div class="popup_mask"  @click="openAndClose(false)">
  </div>
  
  <div class="popup" :style="widthStyle" >
      <slot></slot>
      <!-- <div class="popup_btn_wrap" >
        <div class="popup_btn" >取消</div>
        <div class="popup_btn" @click="openAndClose(false)">关闭</div>
      </div> -->
      
    </div>
    </div>
</template>

<script setup>
import { ref, watch } from "vue";

const emit = defineEmits(['update:visible'])
const props = defineProps(["modelValue", "visible", "width"]);

const widthStyle = 'width:'+props.width

// console.log(props.visible)
// console.log(props.width)

let popupStyle = ref("display: none;");
if (props.visible) {
  popupStyle.value = "display: block;";
}

function openAndClose(visible){
    emit('update:visible', visible)
    if(visible){
       popupStyle.value = "display: block;";
    }else{
      popupStyle.value = "display: none;";
    }
}



watch(
  () => props.visible,
  (newVal, oldVal) => {
    console.log(newVal, oldVal)
    if (newVal) {
      popupStyle.value = "display: block;";
    }else{
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
  background-color: rgba(0, 0, 0, 0.4);
  /* display: none; */
}

.popup {
  /* display: none; */
  position: absolute;;
  top: 50px;
  left: 0;
  right: 0;
  z-index: 1000;
  margin: auto;
  width: 540px;
  height:auto;
  overflow: auto;
  background-color: rgba(255, 255, 255);
  border-radius: 6px;
  /* margin-top: 100px; */
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

.popup_btn {
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
