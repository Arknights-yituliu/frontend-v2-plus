<script setup>
import { onMounted, ref, watch } from 'vue';
import { percentFormatter, costFormatter, initDetailData } from '../js/table'
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
// 默认技能列表
const skillList = ref(operatorList.value.flatMap(item => {
  return item.skills
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
  // 筛选后的干员列表拆出技能信息
  skillList.value = filteredOperators.flatMap(item => {
    return item.skills
  })
  // 默认根据技能材料消耗排序
  skillList.value.sort((a, b) => {
    return b.totalCost - a.totalCost
  });
}

// 根据搜索条件筛选与分页表格数据
const getTableData = () => {
  // 排序号
  skillList.value.forEach((item, index) => {
    item.index = index + 1
  })
  // 根据输入框输入干员名/技能名筛选
  const filteredSkills = skillList.value.filter(data => {
    return data.operatorName.includes(searchParams.searchKey) || data.name.includes(searchParams.searchKey)
  })
  // 最大条数
  total.value = filteredSkills.length;
  // 分页
  const currentData = filteredSkills.slice(current.value * size, (current.value + 1) * size)
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
  skillList.value.sort((a, b) => {
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
    <template #default="{ height }">
      <el-table
        :data="tableData"
        :height="height"
        stripe
        border
        highlight-current-row
        ref="tableRef"
        v-loadmore="loadmore"
        @sort-change="sortChange"
        @row-click="rowClick"
        row-class-name="clickable"
      >
        <el-table-column prop="index" label="排名" width="60" fixed></el-table-column>
        <el-table-column prop="name" label="技能名称" min-width="120"/>
        <el-table-column prop="totalCost" label="材料开销" sortable min-width="120" :formatter="costFormatter"/>
        <el-table-column prop="rank3.rate" label="专三率" sortable min-width="100" :formatter="percentFormatter"/>
        <el-table-column prop="operatorName" label="所属干员" min-width="120"/>
      </el-table>
    </template>
  </el-auto-resizer>
</template>