
import { getZoomScale, getBasePosition, getOffsetTop, getNestedProperty } from './utils'
import { useOperatorData } from './formatOperatorData'
import { useBaseData } from './baseData'
import { ref } from 'vue';

// 格式化小数
export const formatNumber = (value, suffix = '', decimalPlaces = 1) => {
  return value ? value.toFixed(decimalPlaces) + suffix : '-';
}

// 表格材料开销格式化
export const costFormatter = (row, col) => {
  const value = getCellValue(row, col);
  return formatNumber(value);
}

// 表格百分比格式化
export const percentFormatter = (row, col) => {
  const value = getCellValue(row, col);
  return formatNumber(value * 100, '%');
}

// 获取表格单元格的值
const getCellValue = (row, col) => {
  return row[col.property] || getNestedProperty(row, col.property) || 0;
}

const { barWidth, barHeight } = useBaseData()
const charIconBaseSize = 180;
const skillIconBaseSize = 128;
const charIconZoomScale = getZoomScale(barWidth, charIconBaseSize)
const skillIconZoomScale = getZoomScale(barWidth, skillIconBaseSize)
const charIconBasePosition = getBasePosition(charIconZoomScale, charIconBaseSize)
const skillIconBasePosition = getBasePosition(skillIconZoomScale, skillIconBaseSize)

const detailTableData = ref([])
const detailData = ref({})
const { totalCostObj } = useOperatorData()

// 点击行查看干员分析信息
export const initDetailData = (row) => {
  if (row.rarity > 3) {
    detailTableData.value = []
    const rarityObj = totalCostObj.value[row.rarity];
    const { eliteCosts, skillCosts, modCosts } = rarityObj;
    const { charId, elite, skills, mods } = row;
    let iconClass = elite.iconClass = `char-icon bg-${charId.includes('custom') ? 'custom' : charId}`
    setIconInfo('char', eliteCosts, elite, {
      name: '精英化二',
      iconClass,
      style: {
        top: `${charIconBasePosition}px`,
      }
    });
    skills.forEach((item, index) => {
      iconClass = item.iconClass = `skill-icon bg-skill_icon_${item.iconId}`
      setIconInfo('skill', skillCosts, item, {
        name: charId.includes('custom') ? item.name : `${index + 1}技能：${item.name}`, 
        iconClass,
        style: {
          top: `${skillIconBasePosition}px`,
        }
      });
    });

    mods.forEach(item => {
      setIconInfo('mods', modCosts, item, {
        name: charId.includes('custom') ? item.typeName2 : `${item.typeName2}模组：${item.uniEquipName}`, 
      });
    });

    console.log('detailTableData.value', detailTableData.value);
  }

  console.log('row', row);
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

export const useTableData = () => {
  return {
    detailData,
    detailTableData,
  }
}