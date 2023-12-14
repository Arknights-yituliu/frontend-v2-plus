<template>
  <div class="popover_wrap">
    <a @click="openOrClose()" class="popover_title">
      <slot name="title">
      </slot>
    </a>
    <div class="popover_content" :id="content_wrap">
      <slot></slot>
    </div>
  </div>
</template>

<script setup>
const props = defineProps(["modelValue", "name"]);

let content_wrap = `popover-${props.name}`

function openOrClose() {
  let element = document.getElementById(content_wrap);

  const offsetHeight = element.offsetHeight;

  if (offsetHeight < 5) {

    const slotElement = document.getElementById(props.name);
    const slotHeight = slotElement.offsetHeight;
    const slotWidth = slotElement.offsetWidth;

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
  cursor: pointer;
  line-height: normal;
}


.popover_content {
  position: absolute;
  top: 48px;
  right: 20px;
  width: 0;
  height: 0;
  overflow: hidden;
  transition: all 0.3s;
  z-index: 3000;
  background-color: var(--c-background-color);
  box-shadow: var(--c-box-shadow);
  border-radius: 4px;
}


</style>