<template>
  <div>
    <div class="popover-mask" v-show="maskVisible" @click="openOrClose()"></div>
    <div class="popover-wrap">
      <a @click="openOrClose()" class="popover_title">
        <slot name="title">
        </slot>
      </a>
      <div class="popover-content" :id="contentElement">
        <slot></slot>
      </div>
    </div>
  </div>
</template>

<script setup>
import {ref} from "vue";

const props = defineProps(["modelValue", "name"]);
let contentElement = `popover-${props.name}`
let maskVisible = ref(false)

function openOrClose() {
  let element = document.getElementById(contentElement);
  const offsetHeight = element.offsetHeight;
  if (offsetHeight < 5) {
    const slotElement = document.getElementById(props.name);
    const slotHeight = slotElement.offsetHeight;
    const slotWidth = slotElement.offsetWidth;
    maskVisible.value = true
    element.style.height = `${slotHeight}px`
    element.style.width = `${slotWidth}px`
  } else {
    element.style.height = `0`
    element.style.width = `0`
    maskVisible.value = false
  }
}

</script>

<style scoped lang="scss">

.popover-wrap {
  position: relative;
}


.popover_title {
  cursor: pointer;
  line-height: normal;
}


.popover-content {
  position: absolute;
  top: 48px;
  right: 20px;
  width: 0;
  height: 0;
  overflow: hidden;
  transition: all 0.3s;
  z-index: 3000;
  background-color: var(--c-page-background-color);
  box-shadow: 1px 1px 10px var(--c-box-shadow-color);;
  border-radius: 4px;
}

.popover-mask {
  width: 100%;
  height: 100%;
  position: fixed;
  //background-color: rgba(0, 0, 0, 0.1);
  z-index: 3000;
  top: 0;
  left: 0;
}


</style>