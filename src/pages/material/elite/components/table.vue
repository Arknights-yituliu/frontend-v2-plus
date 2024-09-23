<script setup>
import { onMounted, ref, watch } from 'vue';
import {
  percentFormatter,
  costFormatter,
  rowClick,
  usePaginationParams,
  resetTableScrollTop,
  formatNumber,
  getCellValue,
} from '../js/table'

import { vLoadmore } from '../js/directives'

const props = defineProps({
  tableKey: String,
  options: Array,
})

const emits = defineEmits(['openDetailDialog'])
const { current, tableData, loadmore, getTableData, sortChange } = usePaginationParams(props.tableKey)

// 表格数据
const tableRef = ref(null);

// 监听页数变化
watch(() => current.value, () => {
  // 重置表格滚动条
  if (current.value === 0) resetTableScrollTop(tableRef.value)
})

onMounted(() => {
  getTableData()
})

// 暴露给父组件
defineExpose({
  getTableData,
  current,
})
</script>

<template>
  <el-auto-resizer>
    <template #default="{ height }">
      <el-table
        class="cost-table"
        :data="tableData"
        :height="height"
        width="100%"
        stripe
        border
        highlight-current-row
        ref="tableRef"
        v-loadmore="loadmore"
        @sort-change="sortChange"
        @row-click="rowClick($event, emits)"
        row-class-name="clickable"
      >
        <el-table-column v-for="item in options" v-bind="item">
          <template #header>
            <div v-if="item.prop === 'elite.totalCost'">
              材料开销
              <el-tooltip content="仅计算精1和精2过程中龙门币、精英材料及芯片的价值（点击行查看材料消耗详情）" placement="bottom" effect="dark">
                <i class="iconfont icon-question"></i>
              </el-tooltip>
            </div>
          </template>
          <template v-slot="{ row, column }">
            <!-- 二级模组材料消耗 -->
            <p v-if="tableKey === 'mods' && item.prop === 'rank2.totalCost'">{{ formatNumber(row.rank1.totalCost + row.rank2.totalCost) }}</p>
            <!-- 材料消耗列 -->
            <p v-else-if="item.prop.includes('totalCost')">{{ costFormatter(row, column) }}</p>
            <!-- 精二/专三/模组升级率列 -->
            <p v-else-if="item.prop.includes('rate')">{{ percentFormatter(row, column) }}</p>
            <!-- 其他列 -->
            <p v-else>{{ getCellValue(row, column) || '-' }}</p>
          </template>
        </el-table-column>
      </el-table>
    </template>
  </el-auto-resizer>
</template>

<style lang="scss" scoped>
.cost-table {
  p {
    margin: 0;
  }
}
</style>