<script setup>
import { computed, ref } from 'vue'
import OperatorCard from './OperatorCard.vue'
import { operatorTableV2 } from "/src/utils/gameData.js"

const props = defineProps({
  operators: {
    type: Array,
    required: true
  },
  limitedOperatorIds: {
    type: Set,
    default: () => new Set()
  },
  collabOperatorIds: {
    type: Set,
    default: () => new Set()
  },
  // 是否显示未获得干员
  showNotOwned: {
    type: Boolean,
    default: true
  }
})

// 联动干员名称列表
const COLLAB_OPERATOR_NAMES = new Set([
  '丰川祥子','若叶睦','八幡海铃','三角初华','祐天寺若麦',//母鸡卡联动
  '玛露西尔','莱欧斯','森西','齐尔查克',//迷宫饭联动
  '艾拉','双月','医生','导火索',//彩六联动2期
  '泰拉大陆调查团','麒麟R夜刀','火龙S黑角',//怪猎联动
  '灰烬','闪击','霜华','战车',//彩六联动1期
  '罗小黑'//罗小黑联动
])

// 根据名称获取联动干员charId集合
const localCollabOperatorIds = computed(() => {
  const ids = new Set()
  for (const charId in operatorTableV2) {
    const operator = operatorTableV2[charId]
    if (operator && COLLAB_OPERATOR_NAMES.has(operator.name)) {
      ids.add(charId)
    }
  }
  return ids
})

// 排序选项
const sortMode = ref('default') // default: 默认(联动-限定-等级), level: 等级, profession: 职业
// 显示非六星干员（默认只显示六星+限定/联动）
const showNonSixStar = ref(false)
// 显示非六星未获得干员
const showNonSixStarNotOwned = ref(false)

// 职业排序顺序
const PROFESSION_ORDER = ['PIONEER', 'WARRIOR', 'TANK', 'SNIPER', 'CASTER', 'MEDIC', 'SUPPORT', 'SPECIAL']

// 计算每个稀有度的干员总数（从operatorTableV2统计）
const rarityTotals = computed(() => {
  const totals = { 6: 0, 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  for (const charId in operatorTableV2) {
    const operator = operatorTableV2[charId]
    if (operator) {
      // operatorTableV2中的rarity是0-5，需要转换为1-6
      const actualRarity = (operator.rarity ?? -1) + 1
      if (actualRarity >= 1 && actualRarity <= 6) {
        totals[actualRarity]++
      }
    }
  }
  return totals
})

// 筛选后的干员列表
const filteredOperators = computed(() => {
  let list = [...props.operators]
  
  // 默认只显示六星 + 限定/联动干员
  // 勾选后显示全部干员
  if (!showNonSixStar.value) {
    list = list.filter(op => {
      // 六星干员始终显示
      if (op.rarity === 6) return true
      // 限定或联动干员显示
      if (props.limitedOperatorIds.has(op.charId) || localCollabOperatorIds.value.has(op.charId)) return true
      return false
    })
  }
  
  return list
})

// 对单个稀有度组内的干员进行排序
function sortOperatorsInGroup(operators) {
  const sorted = [...operators]
  
  if (sortMode.value === 'default') {
    // 默认排序: 联动 > 限定 > 等级(精英+等级)
    sorted.sort((a, b) => {
      const aIsCollab = props.collabOperatorIds.has(a.charId) || localCollabOperatorIds.value.has(a.charId)
      const bIsCollab = props.collabOperatorIds.has(b.charId) || localCollabOperatorIds.value.has(b.charId)
      const aIsLimited = props.limitedOperatorIds.has(a.charId)
      const bIsLimited = props.limitedOperatorIds.has(b.charId)
      
      // 联动优先
      if (aIsCollab !== bIsCollab) return aIsCollab ? -1 : 1
      // 限定次之
      if (aIsLimited !== bIsLimited) return aIsLimited ? -1 : 1
      // 然后按等级
      const aLevel = (a.elite || 0) * 100 + (a.level || 0)
      const bLevel = (b.elite || 0) * 100 + (b.level || 0)
      return bLevel - aLevel
    })
  } else if (sortMode.value === 'level') {
    // 按等级排序
    sorted.sort((a, b) => {
      const aLevel = (a.elite || 0) * 100 + (a.level || 0)
      const bLevel = (b.elite || 0) * 100 + (b.level || 0)
      return bLevel - aLevel
    })
  } else if (sortMode.value === 'profession') {
    // 按职业排序
    sorted.sort((a, b) => {
      const aIdx = PROFESSION_ORDER.indexOf(a.profession)
      const bIdx = PROFESSION_ORDER.indexOf(b.profession)
      if (aIdx !== bIdx) return aIdx - bIdx
      // 同职业按等级排序
      const aLevel = (a.elite || 0) * 100 + (a.level || 0)
      const bLevel = (b.elite || 0) * 100 + (b.level || 0)
      return bLevel - aLevel
    })
  }
  
  return sorted
}

// 已拥有干员的charId集合
const ownedCharIds = computed(() => {
  const ids = new Set()
  for (const op of props.operators) {
    ids.add(op.charId)
  }
  return ids
})

// 未获得干员列表（全部）
const allNotOwnedOperators = computed(() => {
  if (!props.showNotOwned) return []
  
  const notOwned = []
  for (const charId in operatorTableV2) {
    if (!ownedCharIds.value.has(charId)) {
      const charInfo = operatorTableV2[charId]
      // operatorTableV2中的rarity是0-5，需要转换为1-6
      // rarity: 5 = 六星, 4 = 五星, 3 = 四星, 2 = 三星, 1 = 二星, 0 = 一星
      const actualRarity = (charInfo?.rarity ?? -1) + 1
      // 排除一些特殊干员（如召唤物等）
      if (charInfo && actualRarity >= 1 && actualRarity <= 6) {
        notOwned.push({
          charId: charId,
          name: charInfo.name,
          rarity: actualRarity,  // 使用转换后的1-6稀有度
          profession: charInfo.profession,
          isLimited: props.limitedOperatorIds.has(charId),
          isCollab: localCollabOperatorIds.value.has(charId),
          notOwned: true
        })
      }
    }
  }
  
  // 按稀有度和charId排序
  notOwned.sort((a, b) => {
    if (b.rarity !== a.rarity) return b.rarity - a.rarity
    return a.charId.localeCompare(b.charId)
  })
  
  return notOwned
})

// 筛选后的未获得干员列表
const notOwnedOperators = computed(() => {
  let list = allNotOwnedOperators.value
  
  // 默认只显示六星 + 限定/联动干员
  // 勾选后显示全部干员
  if (!showNonSixStarNotOwned.value) {
    list = list.filter(op => {
      // 六星干员始终显示
      if (op.rarity === 6) return true
      // 限定或联动干员显示
      if (op.isLimited || op.isCollab) return true
      return false
    })
  }
  
  return list
})

// 按稀有度分组（并应用排序）
const groupedOperators = computed(() => {
  const groups = {
    6: [],
    5: [],
    4: [],
    3: [],
    2: [],
    1: []
  }
  
  for (const op of filteredOperators.value) {
    const rarity = op.rarity || 1
    if (groups[rarity]) {
      groups[rarity].push(op)
    }
  }
  
  // 对每个稀有度组应用排序
  for (const rarity in groups) {
    groups[rarity] = sortOperatorsInGroup(groups[rarity])
  }
  
  return groups
})

// 未获得干员按稀有度分组
const groupedNotOwnedOperators = computed(() => {
  const groups = {
    6: [],
    5: [],
    4: [],
    3: [],
    2: [],
    1: []
  }
  
  for (const op of notOwnedOperators.value) {
    const rarity = op.rarity || 1
    if (groups[rarity]) {
      groups[rarity].push(op)
    }
  }
  
  return groups
})

// 未获得干员总数
const notOwnedCount = computed(() => {
  return notOwnedOperators.value.length
})

// 稀有度标签
const rarityLabels = {
  6: '六星干员',
  5: '五星干员',
  4: '四星干员',
  3: '三星干员',
  2: '二星干员',
  1: '一星干员'
}

// 检查是否为联动干员
function isCollabOperator(charId) {
  return props.collabOperatorIds.has(charId) || localCollabOperatorIds.value.has(charId)
}
</script>

<template>
  <div class="operator-grid-section">
    <div class="section-header">
      <h2 class="section-title">干员一览</h2>
      <div class="filter-options">
        <select v-model="sortMode" class="filter-select">
          <option value="default">默认排序</option>
          <option value="level">按等级排序</option>
          <option value="profession">按职业排序</option>
        </select>
        <label class="filter-checkbox">
          <input type="checkbox" v-model="showNonSixStar" />
          显示非六星干员
        </label>
      </div>
    </div>
    
    <!-- 按稀有度分组展示 -->
    <template v-for="rarity in [6, 5, 4, 3, 2, 1]" :key="rarity">
      <div 
        v-if="groupedOperators[rarity] && groupedOperators[rarity].length > 0" 
        class="rarity-group"
      >
        <div class="rarity-header">
          <span class="rarity-label" :class="`rarity-${rarity}`">
            {{ rarityLabels[rarity] }} ({{ groupedOperators[rarity].length }}/{{ rarityTotals[rarity] }})
          </span>
        </div>
        <div class="operators-grid">
          <OperatorCard
            v-for="operator in groupedOperators[rarity]"
            :key="operator.charId"
            :operator="operator"
            :is-limited="limitedOperatorIds.has(operator.charId)"
            :is-collab="isCollabOperator(operator.charId)"
            :size="90"
          />
        </div>
      </div>
    </template>
    
    <!-- 未获得干员（在一星干员后显示） -->
    <div v-if="showNotOwned && allNotOwnedOperators.length > 0" class="rarity-group not-owned-section">
      <div class="rarity-header not-owned-header">
        <span class="rarity-label rarity-not-owned">
          未获得干员 ({{ notOwnedCount }}/{{ allNotOwnedOperators.length }})
        </span>
        <label class="filter-checkbox not-owned-filter">
          <input type="checkbox" v-model="showNonSixStarNotOwned" />
          显示非六星干员
        </label>
      </div>
      <!-- 按稀有度分组显示未获得干员 -->
      <template v-for="rarity in [6, 5, 4, 3, 2, 1]" :key="`not-owned-${rarity}`">
        <div 
          v-if="groupedNotOwnedOperators[rarity] && groupedNotOwnedOperators[rarity].length > 0"
          class="not-owned-rarity-group"
        >
          <div class="not-owned-rarity-label">
            {{ rarityLabels[rarity] }} ({{ groupedNotOwnedOperators[rarity].length }})
          </div>
          <div class="operators-grid">
            <OperatorCard
              v-for="operator in groupedNotOwnedOperators[rarity]"
              :key="operator.charId"
              :operator="operator"
              :is-limited="operator.isLimited"
              :is-collab="operator.isCollab"
              :is-not-owned="true"
              :size="90"
            />
          </div>
        </div>
      </template>
    </div>
    
    <div v-if="filteredOperators.length === 0 && notOwnedCount === 0" class="no-operators">
      暂无符合条件的干员
    </div>
  </div>
</template>

<style scoped>
.operator-grid-section {
  margin-top: 24px;
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

.filter-checkbox {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #fff;
  font-size: 14px;
  cursor: pointer;
}

.filter-checkbox input {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.rarity-group {
  margin-bottom: 16px;
}

.rarity-header {
  margin-bottom: 10px;
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.rarity-label {
  font-size: 15px;
  font-weight: bold;
  padding: 3px 10px;
  border-radius: 4px;
}

.rarity-6 {
  background: linear-gradient(135deg, #FF5722 0%, #FF9800 100%);
  color: #fff;
}

.rarity-5 {
  background: linear-gradient(135deg, #FFD700 0%, #FFC107 100%);
  color: #333;
}

.rarity-4 {
  background: linear-gradient(135deg, #9C27B0 0%, #BA68C8 100%);
  color: #fff;
}

.rarity-3 {
  background: linear-gradient(135deg, #2196F3 0%, #64B5F6 100%);
  color: #fff;
}

.rarity-2 {
  background: linear-gradient(135deg, #FFC107 0%, #FFEB3B 100%);
  color: #333;
}

.rarity-1 {
  background: linear-gradient(135deg, #9E9E9E 0%, #E0E0E0 100%);
  color: #333;
}

.rarity-not-owned {
  background: linear-gradient(135deg, #4B5563 0%, #6B7280 100%);
  color: #fff;
}

.not-owned-section {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 2px dashed rgba(255, 255, 255, 0.3);
}

.not-owned-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.not-owned-filter {
  font-size: 12px !important;
}

.not-owned-rarity-group {
  margin-bottom: 12px;
}

.not-owned-rarity-label {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 8px;
  padding-left: 4px;
}

.operators-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.no-operators {
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
  
  .operators-grid {
    justify-content: center;
    gap: 4px;
  }
}
</style>
