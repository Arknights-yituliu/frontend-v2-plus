<template>
  <button class="status-btn">
    <i class="iconfont icon-right status-right" v-show="modelValue"></i>
    <i class="iconfont icon-error status-error" v-show="!modelValue"></i>
    <span>{{ props.label }}</span>
  </button>
</template>
<script setup >
const props = defineProps(["modelValue",'label',"style"]);

</script>

<style scoped>
.status-btn{
  border:none;
  background-color: transparent;
  font-size: 14px;
  color:dodgerblue;
  font-weight: 600;
}

.status-error{
  color: #ffffff;
  background-color: #fa4141;
  border-radius: 1000px;
  margin: 2px 2px -2px;
}

.status-right{
  color: #ffffff;
  background-color: #21dc03;
  border-radius: 1000px;
  margin: 2px 2px -2px;
}
</style>