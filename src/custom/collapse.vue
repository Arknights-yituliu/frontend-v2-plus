<template>
  <div class="collapse_wrap">
    <div class="collapse_title" @click="collapse()">
      <!-- 这是个测试 -->
      <slot name="title"></slot>
    </div>
    <div :id="collapse_wrap_id" class="collapse_item_wrap">
      <div :id="collapse_item_id" class="collapse_item">

        <slot></slot>

      </div>
    </div>
  </div>
</template>

<script setup>
import {ref, watch} from "vue";

const emit = defineEmits(["update:visible"]);
const props = defineProps(["modelValue", "visible", "name"]);

console.log(props)
let collapse_wrap_id = "collapse_wrap_" + props.name
let collapse_item_id = "collapse_item_" + props.name

function collapse() {
  const wrapHeight = document.getElementById(collapse_wrap_id).offsetHeight;
  let element = document.getElementById(collapse_item_id);
  console.log(collapse_item_id)
  let height = element.offsetHeight;
  // for (let e of elements) {
  //     height += e.offsetHeight;
  // }

  console.log(height)
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
.collapse_wrap {
  width: 100%;
  border-radius: 4px;
  border: 1px solid #a1a1a1;
  box-shadow: 0 0 2px #b6b6b6, 0 1px 1px #b6b6b6;
}

.collapse_title {
  width: 100%;
  cursor: pointer;
  border-bottom: 1px solid #cecece;
  height: 32px;
  font-size: 18px;
  font-weight: 600;
  line-height: 32px;
  text-align: center;
}

.collapse_item_wrap {
  width: 100%;
  height: 0;
  overflow: hidden;
  transition: all .3s;
}

.collapse_item{
  padding: 1px;
}


</style>
