
import { getZoomScale, getBasePosition, getOffsetTop, getNestedProperty } from './utils'
import { totalCostObj, operatorList } from './formatOperatorData' // 总材料消耗对象, 干员列表
import { barWidth, barHeight } from './baseData' // 条的宽高
import { initFlag } from '../js/maps'
import { nextTick, ref } from 'vue';

// 格式化小数
export const formatNumber = (value, suffix = '', decimalPlaces = 1) => {
  return value ? value.toFixed(decimalPlaces) + suffix : '-';
}

// 表格材料开销格式化
export const costFormatter = (row, key) => {
  const value = getCellValue(row, key);
  return formatNumber(value);
}

// 表格百分比格式化
export const percentFormatter = (row, key) => {
  const value = getCellValue(row, key);
  return formatNumber(value * 100, '%');
}

// 获取表格单元格的值
export const getCellValue = (row, key) => {
  return row[key] || getNestedProperty(row, key) || 0;
}

const charIconBaseSize = 180;
const skillIconBaseSize = 128;
const charIconZoomScale = getZoomScale(barWidth, charIconBaseSize)
const skillIconZoomScale = getZoomScale(barWidth, skillIconBaseSize)
const charIconBasePosition = getBasePosition(charIconZoomScale, charIconBaseSize)
const skillIconBasePosition = getBasePosition(skillIconZoomScale, skillIconBaseSize)
const detailTableData = ref([])
const detailData = ref({})

// 点击行查看干员分析信息
export const initDetailData = (row) => {
  if (row.rarity > 3) {
    detailTableData.value = []
    const rarityObj = totalCostObj.value[row.rarity];
    const { eliteCosts, skillCosts, modCosts } = rarityObj;
    const { charId, elite, skills, mods } = row;
    setIconInfo('char', eliteCosts, elite, {
      name: '精英化二',
      charId,
      iconType: 'operator',
      style: {
        top: `${charIconBasePosition}px`,
      }
    });
    skills.forEach((item, index) => {
      setIconInfo('skill', skillCosts, item, {
        name: charId.includes('custom') ? item.name : `${index + 1}技能：${item.name}`, 
        iconType: 'skill',
        style: {
          top: `${skillIconBasePosition}px`,
        }
      });
    });

    mods.forEach(item => {
      setIconInfo('mods', modCosts, item, {
        name: charId.includes('custom') ? item.typeName2 : `${item.typeName2}模组：${item.uniEquipName}`, 
        iconType: 'equip',
      });
    });
  }
  detailData.value = row;
};

// 设置图标位置
const setIconInfo = (type, costs, item, tableIconInfo) => {
  const index = costs.findIndex(cost => cost === item.totalCost);
  const [ iconBasePosition, iconZoomScale ] = getIconBaseInfo(type);
  item.position = index + 1;
  item.totalPosition = costs.length;
  item.style = {
    top: `${iconBasePosition}px`,
    left: `${iconBasePosition}px`,
    transform: `scale(${iconZoomScale})`
  };
  item.contentStyle = {
    top: `${getOffsetTop([index + 1, costs.length, barHeight, barWidth])}px`,
  }
  item.textStyle = {
    right: `0`,
  }
  detailTableData.value.push({
    ...item,
    ...tableIconInfo,
    style: {
      ...item.style,
      ...tableIconInfo?.style,
    }
  });
};

// 获取图标基础样式信息
const getIconBaseInfo = (type) => {
  switch (type) {
    case 'char':
      return [ charIconBasePosition, charIconZoomScale ];
    case 'skill':
      return [ skillIconBasePosition, skillIconZoomScale ];
    default:
      return [ 0, 1 ];
  }
};

// 重置表格滚动条
export const resetTableScrollTop = (tableRef) => {
  const tableBody = tableRef.$el.querySelector('.el-scrollbar__wrap');
  if (tableBody) {
    tableBody.scrollTop = 0;
  }
}

// 筛选条件
const searchParams = ref({
  rarityCheckedList: [], // 当前已选择的干员星级列表
  professionCheckedList: [], // 已选择的职业列表
  searchKey: '', // 搜索关键词
})
// 分页参数
const size = 50
const tableDataMap = new Map()
const tableOptions = new Map([
  ['elite', [
    { key: 'index', title: '排名', minWidth: '90'},
    { key: 'name', title: '干员代号', minWidth: '140', sortable: false },
    { key: 'elite.rank2.rate', title: '精二率', minWidth: '120' },
    { key: 'elite.totalCost', title: '材料开销', minWidth: '140' },
    { key: 'professionName', title: '职业', minWidth: '90' },
    { key: 'subProfessionName', title: '分支', minWidth: '100' },
    { key: 'itemObtainApproach', title: '获取方式', minWidth: '110' },
  ]],
  ['skills', [
    { key: 'index', title: '排名', minWidth: '90' },
    { key: 'name', title: '技能名称', sortable: false },
    { key: 'totalCost', title: '材料开销' },
    { key: 'rank3.rate', title: '专三率' },
    { key: 'operatorName', title: '所属干员' },
    ]],
  ['mods', [
    { key: 'index', title: '排名', minWidth: '90' },
    { key: 'uniEquipName', title: '模组名称', sortable: false, minWidth: '220' },
    { key: 'typeName2', title: '模组类型', minWidth: '110' },
    { key: 'rank1.rate', title: '开一级模组率', minWidth: '140' },
    { key: 'rank1.totalCost', title: '材料开销', minWidth: '110' },
    { key: 'rank2.rate', title: '开二级模组率', minWidth: '140' },
    { key: 'rank2.totalCost', title: '材料开销', minWidth: '110' },
    { key: 'rank3.rate', title: '开三级模组率', minWidth: '140' },
    { key: 'totalCost', title: '材料开销', minWidth: '110' },
    { key: 'operatorName', title: '所属干员', sortable: false, minWidth: '140' },
  ]],
])

// 初始化表格数据
export const initTableData = () => {
  // 根据筛选条件筛选干员列表
  const filteredOperators = operatorList.value.filter((data) => {
    if (searchParams.value.rarityCheckedList.length && !searchParams.value.rarityCheckedList.includes(data.rarity)) return false; // 干员星级搜索
    if (!searchParams.value.professionCheckedList?.length) return true; // 干员子职业搜索: 没选就默认返回所有职业的干员
    return searchParams.value.professionCheckedList.includes(data.subProfessionId);
  });
  tableDataMap.set('elite', filteredOperators)
  // 筛选后的干员列表拆出技能信息, 并排序
  tableDataMap.set('skills', filteredOperators.flatMap(item => item.skills).sort((a, b) => b.totalCost - a.totalCost))
  // 筛选后的干员列表拆出模组信息, 并排序
  tableDataMap.set('mods', filteredOperators.flatMap(item => item.mods).sort((a, b) => b.totalCost - a.totalCost))
}
// 行点击唤起弹窗
export const rowClick = (row, emits) => {
  const { operatorName, charId } = row
  if (operatorName) row = operatorList.value.find(item => item.charId === charId)
  initDetailData(row)
  emits('openDetailDialog', true)
}

let HMRFlag = false // 热加载flag
export const usePaginationParams = (key) => {
  if (HMRFlag) { // 本地调试用: table.vue 热更新时重新调用此函数会重置tableData的值 todo:其他vue文件以及js文件热更新时还是会清空
    nextTick(() => {
      initFlag.value = !initFlag.value
    })
  }
  HMRFlag = true
  const current = ref(0)
  const total = ref(0);
  const tableData = ref([])
  const options = tableOptions.get(key)
  
  // 表格滚动底部加载更多
  const loadMore = () => {
    if (current.value * size < total.value) {
      current.value++
      getTableData()
    }
  }
  
  // 根据筛选条件筛选与分页表格数据
  const getTableData = () => {
    const tableList = tableDataMap.get(key)
    // console.log(`getTableData tableList`, tableList) 
    // console.log(`getTableData operatorList`, operatorList.value)
    const { searchKey } = searchParams.value
    const filterFn = (data) => {
      if (key === 'elite') return data.name.includes(searchKey)
      else if (key === 'skills') return data.operatorName.includes(searchKey) || data.name.includes(searchKey) 
      else return data.operatorName.includes(searchKey) || data.uniEquipName.includes(searchKey)
    }
    // 排序号, 筛选
    const tableListFormat = tableList.map((item, index) => ({
      ...item,
      index: index + 1
    })).filter(filterFn)
    // 最大条数
    total.value = tableListFormat.length;
    // 分页
    const currentData = tableListFormat.slice(current.value * size, (current.value + 1) * size)
    tableData.value = current.value === 0 ? currentData : tableData.value.concat(currentData)



    tableData.value = tableListFormat
  }
  
  // 表格排序
  const sortChange = ({prop, order}) => {
    const tableList = tableDataMap.get(key)
    tableList.sort((a, b) => {
      const sortDirection = order === 'ascending' ? 1 : -1;
      return sortDirection * ((getNestedProperty(a, prop) || 0) - (getNestedProperty(b, prop) || 0));
    });

    current.value = 0
    getTableData()
  }
  
  return {
    current,
    tableData,
    options,
    loadmore: loadMore,
    getTableData,
    sortChange,
  }
}

export {
  detailData,
  detailTableData,
  searchParams,
}