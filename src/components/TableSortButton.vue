<script setup>
const props = defineProps(['modelValue','label','value','order']);

function order(order){
  if(props.value){
    if(props.value===props.label){
      if(order===props.order){
        return 'on'
      }
    }
  }
}


</script>

<template>

  <div class="sort-button">
    <slot></slot>
    <div v-show="label!=='charId'">
      <span class="sort-asc-icon" :data-active="order('asc')"></span>
      <span class="sort-desc-icon" :data-active="order('desc')"></span>
    </div>
  </div>

</template>

<style scoped>

.sort-button {
  display: flex;
  align-items: center;
  cursor: pointer;
  justify-content: center;
}

.sort-icon{
  display: none;
}

.sort-icon[sort]{
  display: block;
}

.sort-desc-icon {
  border-top: 6px solid #c4c4c4;
  border-right: 6px solid transparent;
  border-left: 6px solid transparent;
  display: block;
  margin: 4px 0 4px 2px;
}

.sort-asc-icon {
  border-bottom: 6px solid #c4c4c4;
  border-right: 6px solid transparent;
  border-left: 6px solid transparent;
  display: block;
  margin: 4px 0 4px 2px;
}

.sort-desc-icon[data-active='on'] {
  border-top: 6px solid #2692fd;
}

.sort-asc-icon[data-active='on'] {
  border-bottom: 6px solid #2692fd;
}

</style>