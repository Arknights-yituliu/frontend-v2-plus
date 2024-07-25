<script setup>

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
      <div :class="`line-bar line-${index}`" v-for="(data,index) in lineData" :key="index" :style="`height:${data}%`">
        <div class="line-max" v-show="index===2">{{ getData() }}%</div>
      </div>
    </div>
  </div>
</template>

<style scoped>

.operator-data-line-chart-box {

  .operator-data-line-chart {
    height: 54px;
    display: flex;
    flex-wrap: wrap;
    align-items: end;
    width: 54px;
    margin: auto;

    .line-max {
      font-size: 14px;
      position: absolute;
      right: -16px;
      top: -16px;
    }

    .line-bar{
      position: relative;
    }

    .line-0 {
      width: 10px;
      margin: 4px;
      background-color: var(--c-blue-4)
    }

    .line-1 {
      width: 10px;
      margin: 4px;
      background-color: var(--c-purple-4)
    }

    .line-2 {
      width: 10px;
      margin: 4px;
      background-color: var(--c-orange-4)
    }

  }
}

</style>