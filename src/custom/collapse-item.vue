<template>

    <div :id="collapse_wrap_id"  class="c_collapse_item_wrap">
      <div :id="collapse_item_id" class="c_collapse_item">
        <slot></slot>
      </div>
    </div>
</template>

<script setup>
import {watch,onMounted} from "vue";

const emit = defineEmits(["update:visible"]);
const props = defineProps(["modelValue", "visible", "name",'style']);

let collapse_wrap_id = "collapse_wrap_" + props.name
let collapse_item_id = "collapse_item_" + props.name

onMounted(()=>{
  if(props.visible){
    let element = document.getElementById(collapse_item_id);
    let height = element.offsetHeight;
    let element_wrap = document.getElementById(collapse_wrap_id);
    element_wrap.style.height = height + "px";
    setTimeout(() => {
      if (element_wrap.offsetHeight > 1) {
        element_wrap.style.height = 'auto'
      }
    }, 300);
  }

})


watch( () =>props.visible, (new_val) => {
  const wrapHeight = document.getElementById(collapse_wrap_id).offsetHeight;
  let element = document.getElementById(collapse_item_id);
  let height = element.offsetHeight;
  if (wrapHeight < 5) {
    document.getElementById(collapse_wrap_id).style.height = height + "px";
    setTimeout(() => {
      if (document.getElementById(collapse_wrap_id).offsetHeight > 1) {
        document.getElementById(collapse_wrap_id).style.height = 'auto'
      }
    }, 300);
  } else {
    document.getElementById(collapse_wrap_id).style.height = height + "px";
    setTimeout(() => {
      document.getElementById(collapse_wrap_id).style.height = 0 + "px";
    }, 50);
  }

  emit("update:visible", new_val);
})

</script>

<style scoped>

.c_collapse_item_wrap {
  height: 0;
  overflow: hidden;
  transition: all .3s;
}

.c_collapse_item {
  padding: 1px;
}


</style>
