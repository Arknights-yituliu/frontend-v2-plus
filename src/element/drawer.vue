<template>
  <div class="drawer_wrap" id="drawer_wrap">
    <div class="drawer-collapse" id="drawer">
      <slot></slot>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref, watch } from "vue";
const emit = defineEmits(["update:visible"]);
const props = defineProps(["modelValue", "visible", "width"]);

function nav_switch(flag) {
  if (flag) {
    setTimeout(function () {
      document.getElementById("drawer").className = "drawer-collapse drawer";
      document.getElementById("drawer_wrap").style.minWidth = "200px";
    }, 30);
  } else {
    document.getElementById("drawer").className = "drawer-collapse";
    document.getElementById("drawer_wrap").style.minWidth = "";
  }
  // console.log(menu_flag.value)
}

onMounted(() => {
  nav_switch(false);
});

watch(
  () => props.visible,
  (newVal, oldVal) => {
    nav_switch(newVal);
  }
);
</script>
<style scoped>
.drawer_wrap {
  height: 100%;
  width: 0px;
}

.drawer-collapse {
  transform: translateX(-400px);
  /* opacity: 0; */
  /* border: 1px red solid; */
}

.drawer {
  position: fixed;
  z-index: 2001;
  background: white;
  color: black;
  width: 200px;
  height: 99%;
  white-space: nowrap;
  text-align: center;
  transition: all 0.3s;
  transform: translateX(0) !important;
  /* border: 1px red solid; */
  opacity: 1;
  border-right: 1px solid rgb(213, 213, 213);
}

.btn {
  position: absolute;
  top: 200px;
  left: 50%;
}
</style>
