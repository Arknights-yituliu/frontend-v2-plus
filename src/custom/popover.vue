<template>
  <div class="popover_wrap">
    <div @click="openOrClose()" class="popover_title">
      <slot name="title">

      </slot>
    </div>
    <div class="popover_content" :id="content_wrap">
      <slot></slot>
    </div>
  </div>
</template>

<script setup>
const props = defineProps(["modelValue", "name", "menu"]);

let content_wrap = `popover-${props.name}`

function openOrClose() {
  let element = document.getElementById(content_wrap);

  const offsetHeight = element.offsetHeight;
  if (offsetHeight < 1) {
    console.log(props.menu)
    const slotElement = document.getElementById(props.menu);
    const slotHeight = slotElement.offsetHeight;
    const slotWidth = slotElement.offsetWidth;
    console.log(slotHeight, '-', slotWidth)
    element.style.height = `${slotHeight}px`
    element.style.width = `${slotWidth}px`
  } else {
    element.style.height = `0`
    element.style.width = `0`
  }

}

</script>

<style scoped>

.popover_wrap{
  position: relative;
}


.popover_title {
  padding: 4px;
  cursor: pointer;
  width: fit-content;
}


.popover_content {
  position: absolute;
  right: 0;
  width: 0;
  height: 0;
  overflow: hidden;
  transition: all 0.3s;
  z-index: 3000;
}


</style>