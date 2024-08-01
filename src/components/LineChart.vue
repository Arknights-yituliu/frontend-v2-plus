<script setup>
import '/src/assets/css/common/line_chart.scss'

const props = defineProps(["modelValue", 'lineData']);

function getData() {
  if (props.lineData) {
    return props.lineData[2].toFixed(1)
  }
}

</script>

<template>
  <div class="operator-data-line-chart-box">
    <div style="display: flex" class="operator-data-line-chart">
      <div class="line-bar" :class="`line-${index}`" v-for="(data,index) in lineData" :key="index"
           :style="`height:${data}%`">
        <div class="line-max" v-show="index===2">{{ getData() }}%</div>
      </div>
    </div>
  </div>
</template>

