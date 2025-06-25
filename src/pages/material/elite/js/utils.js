// 计算缩放比
export const getZoomScale = (barWidth, iconBaseSize) => {
  return barWidth / iconBaseSize;
};

// 计算基础位置
export const getBasePosition = (zoomScale, iconBaseSize) => {
  return (zoomScale - 1) * iconBaseSize / 2;
};

// 计算偏移量
export const getOffsetTop = ([rank, totalRank, barHeight, barWidth]) => {
  return (rank - 1) / (totalRank - 1) * (barHeight - barWidth)
};

// 计算图标位置
export const getIconTop = (iconBasePosition, ...params) => {
  return iconBasePosition + getOffsetTop(params)
};

// 通过材料名查询材料id
export const getMaterialIdByName = (name, itemMap) => {
  for (const [itemId, { itemName }] of itemMap) {
    if (itemName === name) return itemId;
  }
};

// 返回嵌套属性值
export const getNestedProperty = (obj, path) => {
  return path.split('.').reduce((o, i) => o?.[i], obj);
}

// 干员排序
export const sort = (arr, prop, spareFun = (a, b) => 0) => {
  return arr.sort((a, b) => {
    return getNestedProperty(b, prop) - getNestedProperty(a, prop) || spareFun(a, b)
  })
}