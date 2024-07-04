<script setup>

const props = defineProps(
    {
      modelValue:{
        default:''
      },
      status: {
        type: Boolean,
        default: false
      },
      active: {
        type: Boolean,
        default: false
      },
      color: {
        type: String,
        default: '',
      },
      style: {
        type: String
      }
    });


</script>


<template>
  <button class="my-button" :data-status="props.active?'on':'off'">
    <slot></slot>
  </button>
</template>

<style>



</style>