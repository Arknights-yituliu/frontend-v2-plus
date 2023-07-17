<template>
  <div class="collapse_wrap">
    <div class="collapse_title" @click="collapse()">
      <!-- 这是个测试 -->
      <slot name="title"> </slot>
    </div>
    <div :class="collapse_item">
      <slot> </slot>
      <div><img src="/image/icon/down.png" alt="" /></div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from "vue";

const emit = defineEmits(["update:visible"]);
const props = defineProps(["modelValue", "visible", "index", "width"]);

let collapseFlag = ref(props.visible.indexOf(props.index) > -1);
let collapse_item = ref(props.visible.indexOf(props.index) > -1 ? "collapse_item collapse_item_open" : "collapse_item");

function collapse() {
  collapseFlag.value = !collapseFlag.value;
  console.log(collapseFlag.value);
  if (collapseFlag.value) {
    collapse_item.value = "collapse_item collapse_item_open";
  } else {
    collapse_item.value = "collapse_item";
  }
}

watch(
  () => props.visible,
  (newVal, oldVal) => {
    console.log(newVal, oldVal);
    if (newVal) {
      collapse_item.value = "collapse_item collapse_item_open";
    } else {
      collapse_item.value = "collapse_item";
    }
    emit("update:visible", newVal);
  }
);
</script>

<style scoped>
.collapse_wrap {
  /* width: 90%; */
  margin: auto;
  border-radius: 4px;
  border: 1px solid #ebebeb;
  margin-top: 6px;
}

.collapse_title {
  width: 100%;
  cursor: pointer;
  /* border-bottom: 1px solid rgb(220, 220, 220); */
}

.collapse_item {
  width: 100%;
  height: 0;
  overflow: hidden;
  /* border: 1px solid red; */
}

.collapse_item_open {
  height: auto;
  /* border: 1px solid red; */
}
</style>
