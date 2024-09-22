<script setup>
import { onMounted, ref, watch } from 'vue';
import { percentFormatter, costFormatter, initDetailData, formatNumber } from '../js/table'
import { useOperatorData } from '../js/formatOperatorData'
import { getNestedProperty } from "../js/utils"

const emits = defineEmits(['openDetailDialog', 'reset'])
const props = defineProps({
  searchParams: Object,
})

const { operatorList } = useOperatorData()

// 筛选条件
const { searchParams } = props
// 分页参数
const size = 50;
const current = ref(0);
const total = ref(0);
// 表格数据
const tableData = ref([]);
const tableRef = ref(null);
// 默认模组列表
const modList = ref(operatorList.value.flatMap(item => {
  return item.mods
}));

// 监听页数变化
watch(() => current.value, () => {
  // 重置表格滚动条
  if (current.value === 0) resetTableScrollTop()
})
// 初始化表格数据
const initTableData = () => {
  // 根据筛选条件筛选干员列表
  const filteredOperators = operatorList.value.filter((data) => {
    if (searchParams.rarityCheckedList.length && !searchParams.rarityCheckedList.includes(data.rarity)) return false; // 干员星级搜索
    if (!searchParams.professionCheckedList?.length) return true; // 干员子职业搜索: 没选就默认返回所有职业的干员
    return searchParams.professionCheckedList.includes(data.subProfessionId);
  });
  // 筛选后的干员列表拆出模组信息
  modList.value = filteredOperators.flatMap(item => {
    return item.mods
  })
  // 默认根据模组材料消耗排序
  modList.value.sort((a, b) => {
    return b.totalCost - a.totalCost
  });
}

// 根据筛选条件筛选与分页表格数据
const getTableData = () => {
  // 排序号
  modList.value.forEach((item, index) => {
    item.index = index + 1
  })
  // 根据输入框输入干员名/模组名筛选
  const filteredMods = modList.value.filter(data => {
    return data.operatorName.includes(searchParams.searchKey) || data.uniEquipName.includes(searchParams.searchKey)
  })
  // 最大条数
  total.value = filteredMods.length;
  // 分页
  const currentData = filteredMods.slice(current.value * size, (current.value + 1) * size)
  tableData.value = current.value === 0 ? currentData : tableData.value.concat(currentData)
}

// 重置表格滚动条
const resetTableScrollTop = () => {
  const tableBody = tableRef.value.$el.querySelector('.el-scrollbar__wrap');
  if (tableBody) {
    tableBody.scrollTop = 0;
  }
}

// 表格排序
const sortChange = ({prop, order}) => {
  modList.value.sort((a, b) => {
    const sortDirection = order === 'ascending' ? 1 : -1;
    return sortDirection * ((getNestedProperty(a, prop) || 0) - (getNestedProperty(b, prop) || 0));
  });

  emits('reset')
  getTableData()
}

// 行点击唤起详情弹窗
const rowClick = ({ charId }) => {
  const row = operatorList.value.find(item => item.charId === charId)
  initDetailData(row)
  emits('openDetailDialog', true)
}

// 表格滚动底部加载更多
const loadmore = () => {
  if (current.value * size < total.value) {
    current.value++
    getTableData()
  }
}

// 自定义指令
const vLoadmore = {
  mounted: (el, binding) => {
    const selectWrap = el.querySelector(".el-scrollbar__wrap");
    selectWrap.addEventListener("scroll", (e) => {
      const {scrollHeight, scrollTop, clientHeight} = selectWrap;
      if (scrollHeight - scrollTop - 160 <= clientHeight) {
        binding.value();
      }
    });
  },
};

onMounted(() => {
  initTableData()
  getTableData()
})

// 暴露给父组件
defineExpose({
  initTableData,
  getTableData,
  current,
})
</script>

<template>
  <el-auto-resizer>
    <template #default="{ height, width }">
      <el-table
        :data="tableData"
        :height="height"
        :width="width"
        width="100%"
        stripe
        border
        highlight-current-row
        ref="tableRef"
        v-loadmore="loadmore"
        @sort-change="sortChange"
        @row-click="rowClick"
        row-class-name="clickable"
      >
        <el-table-column prop="index" label="排名" fixed width="60"></el-table-column>
        <el-table-column prop="uniEquipName" label="模组名称" min-width="180"/>
        <el-table-column prop="typeName2" label="模组类型" min-width="100"/>
        <el-table-column prop="rank1.rate" label="开一级模组率" sortable min-width="140" :formatter="percentFormatter"/>
        <el-table-column prop="rank1.totalCost" label="材料开销" sortable min-width="120" :formatter="costFormatter"/>
        <el-table-column prop="rank2.rate" label="开二级模组率" sortable min-width="140" :formatter="percentFormatter"/>
        <el-table-column prop="totalCost" label="材料开销" min-width="120" sortable>
          <template v-slot="{ row }">
            {{ formatNumber(row.rank1.totalCost + row.rank2.totalCost) }}
          </template>
        </el-table-column>
        <el-table-column prop="rank3.rate" label="开三级模组率" sortable min-width="140" :formatter="percentFormatter"/>
        <el-table-column prop="totalCost" label="材料开销" min-width="120" sortable :formatter="costFormatter"/>
        <el-table-column prop="operatorName" label="所属干员" fixed="right" min-width="120"/>
      </el-table>
    </template>
  </el-auto-resizer>
</template>