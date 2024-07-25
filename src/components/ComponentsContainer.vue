<script setup>
import {onMounted, watch} from "vue";
import {debounce} from "/src/utils/Debounce.js";

import {popupResize} from "/src/utils/Popover.js";
onMounted(() => {
  window.addEventListener('resize', debounce(popupResize));
})

</script>

<template>
<div id="components-container-114514"></div>
</template>

