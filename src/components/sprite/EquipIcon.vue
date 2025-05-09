<script setup>

import {onMounted, ref, watch} from "vue";
import {debounce} from "/src/utils/debounce.js";


const props = defineProps({
  icon: {
    type: String,
    default: ""
  },
  rounded: {
    type: Boolean,
    default: false
  },
  size: {
    type: Number,
    default: 40
  },
  mobileSize: {
    type: Number,
    default: 40
  }
});


let iconUrl = ref('');

let imageStyle = ref('')

function calculatedSize() {
  const innerWidth = window.innerWidth;

  if(props.icon){
    iconUrl.value = `https://cos.yituliu.cn/icon/equip/${props.icon}.png`;
  }


  let size = props.size;

  if (innerWidth < 600) {
    size = props.mobileSize;
  }

  imageStyle.value =  `width:${size}px;height:${size}px;filter: drop-shadow(1px 1px 1px rgb(0, 0, 0));`
}


calculatedSize()


onMounted(() => {
  window.addEventListener('resize', debounce(calculatedSize));
})

watch(()=>props.icon,(newVal,oldVal)=>{
  calculatedSize()
})

</script>

<template>

  <img :src="iconUrl" alt="" :style="imageStyle">

</template>
