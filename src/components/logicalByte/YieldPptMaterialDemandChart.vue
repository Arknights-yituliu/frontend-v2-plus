<script setup>
import { computed } from 'vue'

const props = defineProps({
  points: {
    type: Array,
    default: () => [],
  },
})

const VIEW_WIDTH = 1200
const VIEW_HEIGHT = 560
const PADDING = {
  top: 28,
  right: 30,
  bottom: 72,
  left: 72,
}
const Y_TICK_COUNT = 5

const chartWidth = VIEW_WIDTH - PADDING.left - PADDING.right
const chartHeight = VIEW_HEIGHT - PADDING.top - PADDING.bottom

const chartData = computed(() => {
  const normalizedPoints = props.points.map((point, index) => ({
    index,
    month: String(point?.month || ''),
    count: Number(point?.count) || 0,
  }))
  const maxCount = Math.max(0, ...normalizedPoints.map(point => point.count))
  const yMax = maxCount > 0 ? Math.ceil(maxCount / 10) * 10 : 10
  const yTicks = Array.from({length: Y_TICK_COUNT + 1}, (_, index) => {
    const value = yMax * index / Y_TICK_COUNT
    return {
      value,
      y: PADDING.top + chartHeight - chartHeight * index / Y_TICK_COUNT,
    }
  })
  const pointStep = normalizedPoints.length > 1
    ? chartWidth / (normalizedPoints.length - 1)
    : 0
  const points = normalizedPoints.map(point => ({
    ...point,
    x: PADDING.left + point.index * pointStep,
    y: PADDING.top + chartHeight - point.count / yMax * chartHeight,
  }))
  const polylinePoints = points.map(point => `${point.x},${point.y}`).join(' ')
  const monthLabels = points.filter((point, index) => index % 3 === 0 || index === points.length - 1)

  return {
    points,
    polylinePoints,
    yTicks,
    monthLabels,
  }
})

function formatMonth(month) {
  return month.replace('-', '.')
}

function formatCount(value) {
  return Math.round(value).toLocaleString('zh-CN')
}
</script>

<template>
  <div class="yield-ppt-material-demand-chart">
    <svg
      :viewBox="`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="近两年月度材料需求折线图"
    >
      <g class="yield-ppt-material-demand-chart__grid">
        <line
          v-for="tick in chartData.yTicks"
          :key="tick.value"
          :x1="PADDING.left"
          :x2="VIEW_WIDTH - PADDING.right"
          :y1="tick.y"
          :y2="tick.y"
        />
      </g>

      <g class="yield-ppt-material-demand-chart__axis">
        <line
          :x1="PADDING.left"
          :x2="PADDING.left"
          :y1="PADDING.top"
          :y2="VIEW_HEIGHT - PADDING.bottom"
        />
        <line
          :x1="PADDING.left"
          :x2="VIEW_WIDTH - PADDING.right"
          :y1="VIEW_HEIGHT - PADDING.bottom"
          :y2="VIEW_HEIGHT - PADDING.bottom"
        />
      </g>

      <g class="yield-ppt-material-demand-chart__labels">
        <text
          v-for="tick in chartData.yTicks"
          :key="`label-${tick.value}`"
          :x="PADDING.left - 12"
          :y="tick.y + 6"
          text-anchor="end"
        >
          {{ formatCount(tick.value) }}
        </text>
        <text
          v-for="point in chartData.monthLabels"
          :key="`month-${point.month}`"
          :x="point.x"
          :y="VIEW_HEIGHT - PADDING.bottom + 30"
          text-anchor="end"
          :transform="`rotate(-35 ${point.x} ${VIEW_HEIGHT - PADDING.bottom + 30})`"
        >
          {{ formatMonth(point.month) }}
        </text>
      </g>

      <polyline
        v-if="chartData.polylinePoints"
        class="yield-ppt-material-demand-chart__line"
        :points="chartData.polylinePoints"
      />

      <g class="yield-ppt-material-demand-chart__points">
        <circle
          v-for="point in chartData.points"
          :key="point.month"
          :cx="point.x"
          :cy="point.y"
          r="5"
        >
          <title>{{ `${formatMonth(point.month)}：${formatCount(point.count)}` }}</title>
        </circle>
      </g>
    </svg>
  </div>
</template>

<style scoped>
.yield-ppt-material-demand-chart {
  width: 1200px;
  overflow: hidden;
  background: #ffffff;
}

.yield-ppt-material-demand-chart svg {
  display: block;
  width: 1200px;
  height: 560px;
}

.yield-ppt-material-demand-chart__grid line {
  stroke: #d9e0e8;
  stroke-width: 1;
}

.yield-ppt-material-demand-chart__axis line {
  stroke: #aab6c5;
  stroke-width: 1.5;
}

.yield-ppt-material-demand-chart__labels {
  fill: #657182;
  font-family: Arial, "Microsoft YaHei", sans-serif;
  font-size: 18px;
}

.yield-ppt-material-demand-chart__line {
  fill: none;
  stroke: #3867d6;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 5;
}

.yield-ppt-material-demand-chart__points circle {
  fill: #ffffff;
  stroke: #3867d6;
  stroke-width: 4;
}
</style>
