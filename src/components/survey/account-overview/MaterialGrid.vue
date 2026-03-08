<script setup>
import { computed, ref } from 'vue'
import ItemImage from '/src/components/sprite/ItemImage.vue'
import itemInfoList from '/src/static/json/material/item_info.json'

const props = defineProps({
  items: {
    type: Array,
    required: true
  }
})

// 构建材料信息映射
const itemInfoMap = computed(() => {
  const map = new Map()
  for (const item of itemInfoList) {
    map.set(item.itemId, item)
  }
  return map
})

// 显示选项
const showMinQuantity = ref(1)  // 最小显示数量
const sortBy = ref('rarity')    // 排序方式: rarity, quantity, name

// 材料分类
const materialCategories = {
  '精英材料': { order: 1, color: '#FF9800' },
  '技能书': { order: 2, color: '#2196F3' },
  '芯片': { order: 3, color: '#9C27B0' },
  '模组': { order: 4, color: '#4CAF50' },
  '其他': { order: 5, color: '#607D8B' }
}

// 处理后的材料列表
const processedItems = computed(() => {
  const result = []
  
  for (const item of props.items) {
    const info = itemInfoMap.value.get(item.itemId)
    if (!info) continue
    
    // 过滤掉数量过少的材料
    if (item.quantity < showMinQuantity.value) continue
    
    // 排除一些不需要显示的物品（如招聘许可、家具零件等）
    const excludeIds = ['7001', '7002', '7003', '7004', 'furni', 'act']
    if (excludeIds.some(id => item.itemId.includes(id))) continue
    
    result.push({
      itemId: item.itemId,
      quantity: item.quantity,
      itemName: info.itemName,
      rarity: info.rarity || 0,
      type: info.type || '其他'
    })
  }
  
  // 排序
  result.sort((a, b) => {
    if (sortBy.value === 'rarity') {
      if (b.rarity !== a.rarity) return b.rarity - a.rarity
      return b.quantity - a.quantity
    } else if (sortBy.value === 'quantity') {
      return b.quantity - a.quantity
    } else {
      return a.itemName.localeCompare(b.itemName)
    }
  })
  
  return result
})

// 按类型分组
const groupedItems = computed(() => {
  const groups = {}
  
  for (const item of processedItems.value) {
    const type = item.type || '其他'
    if (!groups[type]) {
      groups[type] = []
    }
    groups[type].push(item)
  }
  
  // 按类型排序
  const sortedGroups = []
  for (const type in groups) {
    sortedGroups.push({
      type,
      items: groups[type],
      order: materialCategories[type]?.order || 99,
      color: materialCategories[type]?.color || '#607D8B'
    })
  }
  
  sortedGroups.sort((a, b) => a.order - b.order)
  
  return sortedGroups
})

// 格式化数量
function formatQuantity(num) {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + 'w'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k'
  }
  return num.toString()
}

// 稀有度对应颜色
function getRarityColor(rarity) {
  const colors = {
    5: '#FFD700',
    4: '#FF9800',
    3: '#9C27B0',
    2: '#2196F3',
    1: '#4CAF50',
    0: '#9E9E9E'
  }
  return colors[rarity] || colors[0]
}
</script>

<template>
  <div class="material-grid-section">
    <div class="section-header">
      <h2 class="section-title">仓库材料</h2>
      <div class="filter-options">
        <select v-model="sortBy" class="filter-select">
          <option value="rarity">按稀有度</option>
          <option value="quantity">按数量</option>
          <option value="name">按名称</option>
        </select>
        <label class="filter-label">
          最小数量:
          <input 
            type="number" 
            v-model.number="showMinQuantity" 
            class="quantity-input"
            min="1"
          />
        </label>
      </div>
    </div>
    
    <!-- 按类型分组展示 -->
    <template v-for="group in groupedItems" :key="group.type">
      <div v-if="group.items.length > 0" class="material-group">
        <div class="group-header">
          <span class="group-label" :style="{ backgroundColor: group.color }">
            {{ group.type }} ({{ group.items.length }})
          </span>
        </div>
        <div class="materials-grid">
          <div 
            v-for="item in group.items" 
            :key="item.itemId" 
            class="material-item"
            :style="{ '--rarity-color': getRarityColor(item.rarity) }"
          >
            <div class="item-image-container">
              <ItemImage 
                :item-id="item.itemId" 
                :size="48" 
                :mobile-size="40"
              />
            </div>
            <div class="item-quantity">{{ formatQuantity(item.quantity) }}</div>
            <div class="item-name">{{ item.itemName }}</div>
          </div>
        </div>
      </div>
    </template>
    
    <div v-if="processedItems.length === 0" class="no-materials">
      暂无材料数据
    </div>
  </div>
</template>

<style scoped>
.material-grid-section {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 12px;
}

.section-title {
  font-size: 20px;
  font-weight: bold;
  color: #fff;
  margin: 0;
}

.filter-options {
  display: flex;
  gap: 12px;
  align-items: center;
}

.filter-select {
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: rgba(0, 0, 0, 0.3);
  color: #fff;
  font-size: 14px;
  cursor: pointer;
}

.filter-label {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #fff;
  font-size: 14px;
}

.quantity-input {
  width: 60px;
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: rgba(0, 0, 0, 0.3);
  color: #fff;
  font-size: 14px;
}

.material-group {
  margin-bottom: 20px;
}

.group-header {
  margin-bottom: 12px;
}

.group-label {
  font-size: 14px;
  font-weight: bold;
  padding: 4px 12px;
  border-radius: 4px;
  color: #fff;
}

.materials-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.material-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 70px;
  padding: 8px 4px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  border-bottom: 3px solid var(--rarity-color);
  transition: transform 0.2s;
}

.material-item:hover {
  transform: translateY(-2px);
}

.item-image-container {
  margin-bottom: 4px;
}

.item-quantity {
  font-size: 14px;
  font-weight: bold;
  color: #fff;
}

.item-name {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.7);
  text-align: center;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.no-materials {
  text-align: center;
  color: rgba(255, 255, 255, 0.6);
  padding: 40px;
  font-size: 16px;
}

@media screen and (max-width: 600px) {
  .section-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .filter-options {
    width: 100%;
    flex-wrap: wrap;
  }
  
  .materials-grid {
    justify-content: center;
  }
  
  .material-item {
    width: 60px;
  }
}
</style>
