<script setup>

const props = defineProps(["modelValue", 'info','func']);



</script>

<template>
  <div class="resources-line">
    <span class="resources-line-label" style="width: 240px">{{ props.info.name }}</span>
    <div class="resources-line-content">
      <div class="image-sprite" v-show="props.info.originium > 0">
        <div class="bg-icon_4002"></div>
      </div>
      <span v-show="props.info.originium > 0">{{ props.info.originium }}</span>
      <div class="image-sprite" v-show="props.info.orundum > 0">
        <div class="bg-icon_4003"></div>
      </div>
      <span v-show="props.info.orundum > 0">{{ props.info.orundum }}</span>
      <div class="image-sprite" v-show="props.info.gachaTicket > 0">
        <div class="bg-icon_7003"></div>
      </div>
      <span v-show="props.info.gachaTicket > 0">{{ props.info.gachaTicket }}</span>
      <div class="image-sprite" v-show="props.info.tenGachaTicket > 0">
        <div class="bg-icon_7004"></div>
      </div>
      <span v-show="props.info.tenGachaTicket > 0">{{ props.info.tenGachaTicket }}</span>

    </div>
  </div>
</template>

