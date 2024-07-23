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
      <div :class="`line-${index}`" v-for="(data,index) in lineData" :key="index" :style="`height:${data}%`">
      </div>
    </div>
    <div class="line-max">{{ getData() }}%</div>
  </div>
</template>

<style scoped>

.operator-data-line-chart-box {

  .operator-data-line-chart {
    height: 48px;
    display: flex;
    flex-wrap: wrap;
    align-items: end;
    margin: auto;
    width: 42px;

    .line-max {
      font-size: 14px;
    }

    .line-0 {
      width: 10px;
      margin: 2px;
      background-color: var(--c-blue-4)
    }

    .line-1 {
      width: 10px;
      margin: 2px;
      background-color: var(--c-purple-4)
    }

    .line-2 {
      width: 10px;
      margin: 2px;
      background-color: var(--c-orange-4)
    }

  }
}

</style>