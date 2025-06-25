<script setup>
import { ref, watch } from 'vue';
import { initFlag } from '../js/maps'
import {
  percentFormatter,
  costFormatter,
  rowClick,
  usePaginationParams,
  resetTableScrollTop,
  formatNumber,
  getCellValue,
} from '../js/table'
// import { vLoadmore } from '../js/directives'

const props = defineProps({
  tableKey: String,
})

const emits = defineEmits(['openDetailDialog'])
const { current, tableData, options, loadmore, getTableData, sortChange } = usePaginationParams(props.tableKey)

// 表格数据
const tableRef = ref(null);

// // 监听页数变化
// watch(current, () => {
//   // 重置表格滚动条
//   if (current.value === 0) resetTableScrollTop(tableRef.value)
// })

// 监听初始化完成 
watch(initFlag, getTableData)

// 暴露给父组件
defineExpose({
  getTableData,
  // current,
})
</script>

<template>
  <v-data-table
    :headers="options"
    :items="tableData"
    hide-default-footer
    striped
    items-per-page="-1"
    height="calc(100vh - 213px - 2rem)"
  >
    <template v-slot:item="{ item }">
      <tr @click="rowClick(item, emits)" class="clickable">
        <td v-for="(t, i) in options" :key="i">
          <!-- 二级模组材料消耗 -->
          <span v-if="tableKey === 'mods' && t.key === 'rank2.totalCost'">{{ formatNumber(item.rank1.totalCost + item.rank2.totalCost) }}</span>
          <!-- 材料消耗列 -->
          <span v-else-if="t.key.includes('totalCost')">{{ costFormatter(item, t.key) }}</span>
          <!-- 精二/专三/模组升级率列 -->
          <span v-else-if="t.key.includes('rate')">{{ percentFormatter(item, t.key) }}</span>
          <!-- 其他列 -->
          <span v-else>{{ getCellValue(item, t.key) || '-' }}</span>
        </td>
      </tr>
    </template>
  </v-data-table>
</template>

<style lang="scss" scoped>
.cost-table {
  p {
    margin: 0;
  }
}
.clickable {
  cursor: pointer;
}
</style>