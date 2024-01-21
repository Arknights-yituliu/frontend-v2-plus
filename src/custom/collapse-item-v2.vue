<template>

  <div :id="collapseWrapId" class="c_collapse_item_wrap">
    <div :id="collapseItemId" class="c_collapse_item">
      <slot></slot>
    </div>
  </div>
</template>

<script setup>
import {watch, onMounted} from "vue";

const emit = defineEmits(["update:visible"]);
const props = defineProps(["modelValue", "visible", "name", 'style']);

let collapseWrapId = "collapse-wrap-" + props.name
let collapseItemId = "collapse-item-" + props.name

onMounted(() => {
  if (props.visible) {
    let element = document.getElementById(collapseItemId);
    let height = element.offsetHeight;
    let element_wrap = document.getElementById(collapseWrapId);
    element_wrap.style.height = height + "px";
    setTimeout(() => {
      if (element_wrap.offsetHeight > 1) {
        element_wrap.style.height = 'auto'
      }
    }, 300);
  }
})


function collapse(flag) {

  let wrapElement = document.getElementById(collapseWrapId);

  let start = new Date()

  let contentElement = document.getElementById(collapseItemId);
  let height = contentElement.clientHeight;
  console.log(height)

  let ratio = 1.0
  const animate = () => {

    const elapsed = Date.now() - start;

    const progress = Math.min(elapsed / 200, 1) *ratio

    const heightStep = flag ? height * progress : height * (1 - progress)

    wrapElement.style.height = `${heightStep}px`
    ratio+=0.1
    // console.log(progress, '高度步进', heightStep)
    if (progress < 1) {
      requestAnimationFrame(animate)
    } else {

      wrapElement.style.height = flag?`${height}px`:'0px'
    }

  }

  animate()
}

watch(() => props.visible, (new_val) => {
  collapse(new_val)
  emit("update:visible", new_val);
})

</script>

<style scoped>

.c_collapse_item_wrap {
  height: 0;
  overflow: hidden;
  //transition: height 0.2s ease;
}

.c_collapse_item {
  padding: 1px;
}


</style>
