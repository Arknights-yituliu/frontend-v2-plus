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
  console.log(element)
  const offsetHeight = element.offsetHeight;
  console.log(offsetHeight)
  if (offsetHeight < 5) {
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
  top: 48px;
  right: 0;
  width: 0;
  height: 0;
  overflow: hidden;
  transition: all 0.3s;
  z-index: 3000;
  background-color: var(--c-bg);
  box-shadow: var(--c-box-shadow);
  border: var(--c-border);
  border-radius: 4px;
}


</style>