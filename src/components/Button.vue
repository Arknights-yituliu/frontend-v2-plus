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
      }
    });


</script>


<template>
  <button class="my-button" :data-status="props.active?'on':'off'">
    <span style="max-height: 16px"> <slot>  </slot></span>
  </button>
</template>

<style>



</style>