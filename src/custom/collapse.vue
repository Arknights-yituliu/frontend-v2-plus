<template>
  <div class="c_collapse_wrap">
    <div class="c_collapse_title" @click="collapse()">
      <!-- 这是个测试 -->
      <slot name="title"></slot>
    </div>
    <div :id="collapse_wrap_id" class="c_collapse_item_wrap">
      <div :id="collapse_item_id" class="c_collapse_item">
        <slot></slot>
      </div>
    </div>
  </div>
</template>

<script setup>
const emit = defineEmits(["update:visible"]);
const props = defineProps(["modelValue", "visible", "name"]);

let collapse_wrap_id = "collapse_wrap_" + props.name
let collapse_item_id = "collapse_item_" + props.name

function collapse() {
  const wrapHeight = document.getElementById(collapse_wrap_id).offsetHeight;
  let element = document.getElementById(collapse_item_id);

  let height = element.offsetHeight;

  if (wrapHeight < 1) {
    // document.getElementById(collapse_id).style.willChange = 'height'
    document.getElementById(collapse_wrap_id).style.height = height + "px";
    setTimeout(() => {
      if (document.getElementById(collapse_wrap_id).offsetHeight > 1) {
        // document.getElementById(collapse_wrap_id).style.height = 'auto'
      }
    }, 300);
  } else {
    document.getElementById(collapse_wrap_id).style.height = height + "px";
    setTimeout(() => {
      document.getElementById(collapse_wrap_id).style.height = 0 + "px";
    }, 50);
  }
}


</script>

<style scoped>
.c_collapse_wrap {
  border-radius: 4px;
  box-shadow: var(--c-box-shadow);
  background-color: var(--c-background-white-transparent);
}

.c_collapse_title {
  cursor: pointer;
  border-bottom: 1px solid #cecece;
}

.c_collapse_item_wrap {
  height: 0;
  overflow: hidden;
  transition: height 0.2s linear;
}

.c_collapse_item{
  padding: 1px;
}


</style>
