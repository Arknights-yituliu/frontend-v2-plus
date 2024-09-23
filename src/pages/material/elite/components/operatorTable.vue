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

// 监听页数变化
watch(() => current.value, () => {
  // 重置表格滚动条
  if (current.value === 0) resetTableScrollTop()
})

// 根据筛选条件筛选与分页表格数据
const getTableData = () => {
  console.log('getTableData')
  // 根据筛选条件筛选干员列表
  let arr = operatorList.value.filter((data) => {
    if (searchParams.rarityCheckedList.length && !searchParams.rarityCheckedList.includes(data.rarity)) return false; // 干员星级搜索
    if (!searchParams.professionCheckedList?.length) return true; // 干员子职业搜索: 没选就默认返回所有职业的干员
    return searchParams.professionCheckedList.includes(data.subProfessionId);
  });
  // 排序号
  arr.forEach((item, index) => {
    item.index = index + 1
  })
  // 根据输入框输入干员名/模组名筛选
  arr = arr.filter(data => {
    return data.name.includes(searchParams.searchKey)
  })
  // 最大条数
  total.value = arr.length;
  // 分页
  const currentData = arr.slice(current.value * size, (current.value + 1) * size)
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
  operatorList.value.sort((a, b) => {
    const sortDirection = order === 'ascending' ? 1 : -1;
    return sortDirection * ((getNestedProperty(a, prop) || 0) - (getNestedProperty(b, prop) || 0));
  });

  current.value = 0
  getTableData()
}

// 行点击唤起详情弹窗
const rowClick = (row) => {
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
        <el-table-column prop="name" label="干员代号" min-width="120"/>
        <el-table-column prop="elite.rank2.rate" label="精二率" sortable min-width="100" :formatter="percentFormatter"/>
        <el-table-column prop="elite.totalCost" sortable min-width="140" :formatter="costFormatter">
          <template #header>
            材料开销
            <el-tooltip content="仅计算精1和精2过程中龙门币、精英材料及芯片的价值（点击行查看材料消耗详情）" placement="bottom" effect="dark">
              <i class="iconfont icon-question"></i>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column prop="professionName" label="职业"/>
        <el-table-column prop="subProfessionName" label="分支" min-width="100"/>
        <el-table-column prop="itemObtainApproach" label="获取方式" min-width="100"/>
      </el-table>
    </template>
  </el-auto-resizer>
</template>