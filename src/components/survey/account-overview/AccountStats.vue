<script setup>
import { computed, ref, onMounted } from 'vue'

// 攒抽计算器库存数据
const gachaInventory = ref({
  originium: 0,      // 源石
  orundum: 0,        // 合成玉
  gachaTicket: 0,    // 单抽券
  tenGachaTicket: 0  // 十连券
})

// 从localStorage读取攒抽计算器的库存数据
onMounted(() => {
  try {
    const lastSettings = localStorage.getItem('LastSettings')
    if (lastSettings) {
      const data = JSON.parse(lastSettings)
      gachaInventory.value.originium = Number(data.existOriginium) || 0
      gachaInventory.value.orundum = Number(data.existOrundum) || 0
      gachaInventory.value.gachaTicket = Number(data.existGachaTicket) || 0
      gachaInventory.value.tenGachaTicket = Number(data.existTenGachaTicket) || 0
    }
  } catch (e) {
    console.error('读取攒抽计算器数据失败:', e)
  }
})

// 计算总抽数
const totalDraws = computed(() => {
  const { originium, orundum, gachaTicket, tenGachaTicket } = gachaInventory.value
  // 源石转换: 1源石 = 180合成玉 = 0.3抽
  const originiumDraws = Math.floor(originium * 180 / 600)
  // 合成玉: 600合成玉 = 1抽
  const orundumDraws = Math.floor(orundum / 600)
  // 单抽券 = 1抽
  // 十连券 = 10抽
  return originiumDraws + orundumDraws + gachaTicket + tenGachaTicket * 10
})

// 是否有攒抽数据
const hasGachaInventory = computed(() => {
  const { originium, orundum, gachaTicket, tenGachaTicket } = gachaInventory.value
  return originium > 0 || orundum > 0 || gachaTicket > 0 || tenGachaTicket > 0
})

const props = defineProps({
  accountData: {
    type: Object,
    required: true
  },
  limitedOperatorIds: {
    type: Set,
    default: () => new Set()
  },
  totalLimitedSixStar: {
    type: Number,
    default: 0
  },
  collabOperatorIds: {
    type: Set,
    default: () => new Set()
  },
  totalCollabOperators: {
    type: Number,
    default: 0
  }
})

// 账号等级
const accountLevel = computed(() => {
  return props.accountData?.status?.level || '未知'
})

// 昵称
const nickName = computed(() => {
  return props.accountData?.nickName || '未知'
})

// 区服
const channelName = computed(() => {
  return props.accountData?.channelName || '未知'
})

// UID
const uid = computed(() => {
  return props.accountData?.uid || '未知'
})

// 干员统计
const operatorStats = computed(() => {
  const operators = props.accountData?.operatorDataList || []
  
  let total = operators.length
  let sixStar = 0
  let fiveStar = 0
  let limitedSixStar = 0
  let collabOperators = 0  // 联动干员数量
  let elite2Count = 0
  let skill3Count = 0  // 专三技能数量
  
  for (const op of operators) {
    if (op.rarity === 6) {
      sixStar++
      if (props.limitedOperatorIds.has(op.charId)) {
        limitedSixStar++
      }
    }
    if (op.rarity === 5) {
      fiveStar++
    }
    // 统计联动干员
    if (props.collabOperatorIds.has(op.charId)) {
      collabOperators++
    }
    if (op.elite === 2) {
      elite2Count++
    }
    // 统计专三技能
    if (op.skill1 === 3) skill3Count++
    if (op.skill2 === 3) skill3Count++
    if (op.skill3 === 3) skill3Count++
  }
  
  return {
    total,
    sixStar,
    fiveStar,
    limitedSixStar,
    collabOperators,
    elite2Count,
    skill3Count
  }
})

// 时装统计
const skinStats = computed(() => {
  // 优先从 skins 数组获取
  const skins = props.accountData?.skins || []
  if (skins.length > 0) {
    return {
      total: skins.length,
      dynamic: 0
    }
  }
  
  // 如果 skins 为空，尝试从 charInfoMap 统计使用了非默认皮肤的干员数量
  const charInfoMap = props.accountData?.charInfoMap || {}
  let skinCount = 0
  for (const charId in charInfoMap) {
    const charInfo = charInfoMap[charId]
    // skinId 不为空且不是默认皮肤（默认皮肤格式通常是 charId#1 或 charId#2）
    if (charInfo && charInfo.skinId) {
      // 检查skinId是否为非默认皮肤（通常包含@开头的部分表示特殊皮肤）
      const skinId = charInfo.skinId
      // 判断是否是自定义皮肤（不是默认的#1或#2结尾）
      if (!skinId.endsWith('#1') && !skinId.endsWith('#2')) {
        skinCount++
      }
    }
  }
  if (skinCount > 0) {
    return {
      total: skinCount,
      dynamic: 0
    }
  }
  
  // 如果 status 中有 skinCnt 字段
  const status = props.accountData?.status
  if (status && status.skinCnt !== undefined) {
    return {
      total: status.skinCnt || 0,
      dynamic: 0
    }
  }
  
  return {
    total: 0,
    dynamic: 0
  }
})

// 统计卡片数据
const statsCards = computed(() => {
  return [
    {
      label: '账号等级',
      value: accountLevel.value,
      icon: 'mdi-account-star',
      color: '#FFD700'
    },
    {
      label: '六星干员',
      value: operatorStats.value.sixStar,
      icon: 'mdi-star',
      color: '#FF6B35'
    },
    {
      label: '限定六星',
      value: `${operatorStats.value.limitedSixStar}/${props.totalLimitedSixStar}`,
      icon: 'mdi-diamond-stone',
      color: '#E91E63'
    },
    {
      label: '联动干员',
      value: `${operatorStats.value.collabOperators}/${props.totalCollabOperators}`,
      icon: 'mdi-handshake',
      color: '#00BCD4'
    },
    {
      label: '五星干员',
      value: operatorStats.value.fiveStar,
      icon: 'mdi-star-half-full',
      color: '#9C27B0'
    },
    {
      label: '精二干员',
      value: operatorStats.value.elite2Count,
      icon: 'mdi-chevron-double-up',
      color: '#2196F3'
    },
    {
      label: '专三技能',
      value: operatorStats.value.skill3Count,
      icon: 'mdi-arm-flex',
      color: '#4CAF50'
    },
    {
      label: '干员总数',
      value: operatorStats.value.total,
      icon: 'mdi-account-group',
      color: '#607D8B'
    },
    {
      label: '时装总数',
      value: skinStats.value.total,
      icon: 'mdi-tshirt-crew',
      color: '#FF9800'
    }
  ]
})
</script>

<template>
  <div class="account-stats-section">
    <!-- 账号基本信息 -->
    <div class="account-header">
      <div class="account-info">
        <h1 class="nick-name">{{ nickName }}</h1>
        <div class="account-meta">
          <span class="channel">{{ channelName }}</span>
        </div>
      </div>
      <div class="level-badge">
        <span class="level-label">Lv.</span>
        <span class="level-value">{{ accountLevel }}</span>
      </div>
    </div>
    
    <!-- 统计卡片 -->
    <div class="stats-grid">
      <div 
        v-for="(stat, index) in statsCards" 
        :key="index" 
        class="stat-card"
        :style="{ '--accent-color': stat.color }"
      >
        <div class="stat-icon">
          <v-icon :icon="stat.icon" size="28" />
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stat.value }}</div>
          <div class="stat-label">{{ stat.label }}</div>
        </div>
      </div>
    </div>
    
    <!-- 攒抽计算器库存（如果有数据） -->
    <div v-if="hasGachaInventory" class="gacha-inventory-section">
      <div class="gacha-inventory-header">
        <div class="gacha-title-group">
          <span class="gacha-inventory-title">抽卡库存</span>
          <v-tooltip location="top">
            <template v-slot:activator="{ props }">
              <v-icon v-bind="props" size="14" style="opacity: 0.5; margin-left: 4px; cursor: help;">mdi-information-outline</v-icon>
            </template>
            同步于攒抽计算器
          </v-tooltip>
        </div>
        <span class="gacha-total-draws">共 {{ totalDraws }} 抽</span>
      </div>
      <div class="gacha-inventory-grid">
        <div v-if="gachaInventory.originium > 0" class="gacha-item">
          <img src="/image/icon/至纯源石.png" class="gacha-icon" alt="源石">
          <span class="gacha-count">{{ gachaInventory.originium }}</span>
          <span class="gacha-draws">({{ Math.floor(gachaInventory.originium * 180 / 600) }})</span>
        </div>
        <div v-if="gachaInventory.orundum > 0" class="gacha-item">
          <img src="/image/icon/icon-4002.png" class="gacha-icon" alt="合成玉">
          <span class="gacha-count">{{ gachaInventory.orundum }}</span>
          <span class="gacha-draws">({{ Math.floor(gachaInventory.orundum / 600) }})</span>
        </div>
        <div v-if="gachaInventory.gachaTicket > 0" class="gacha-item">
          <img src="/image/icon/icon单抽.png" class="gacha-icon" alt="单抽券">
          <span class="gacha-count">{{ gachaInventory.gachaTicket }}</span>
          <span class="gacha-draws">({{ gachaInventory.gachaTicket }})</span>
        </div>
        <div v-if="gachaInventory.tenGachaTicket > 0" class="gacha-item">
          <img src="/image/icon/icon十连.png" class="gacha-icon" alt="十连券">
          <span class="gacha-count">{{ gachaInventory.tenGachaTicket }}</span>
          <span class="gacha-draws">({{ gachaInventory.tenGachaTicket * 10 }})</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.account-stats-section {
  padding-bottom: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.account-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding: 16px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
}

.account-info {
  flex: 1;
}

.nick-name {
  font-size: 28px;
  font-weight: bold;
  color: #fff;
  margin: 0 0 8px 0;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
}

.account-meta {
  display: flex;
  gap: 16px;
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
}

.channel {
  padding: 2px 10px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}

.uid {
  color: rgba(255, 255, 255, 0.6);
}

.level-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 20px;
  background: linear-gradient(135deg, #FFD700 0%, #FFA000 100%);
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(255, 215, 0, 0.3);
}

.level-label {
  font-size: 14px;
  color: #333;
  font-weight: bold;
}

.level-value {
  font-size: 32px;
  font-weight: bold;
  color: #333;
  line-height: 1;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 10px;
  border-left: 4px solid var(--accent-color);
  transition: transform 0.2s, box-shadow 0.2s;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.stat-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  color: var(--accent-color);
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #fff;
  line-height: 1.2;
}

.stat-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  margin-top: 2px;
}

/* 攒抽计算器库存样式 */
.gacha-inventory-section {
  margin-top: 16px;
  padding: 12px 16px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 10px;
  border-left: 4px solid #FFC107;
}

.gacha-inventory-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.gacha-title-group {
  display: flex;
  align-items: center;
}

.gacha-inventory-title {
  font-size: 14px;
  font-weight: bold;
  color: rgba(255, 255, 255, 0.9);
}

.gacha-total-draws {
  font-size: 16px;
  font-weight: bold;
  color: #FFC107;
}

.gacha-inventory-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.gacha-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 6px;
}

.gacha-icon {
  width: 28px;
  height: 28px;
  object-fit: contain;
}

.gacha-count {
  font-size: 16px;
  font-weight: bold;
  color: #fff;
}

.gacha-draws {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}

@media screen and (max-width: 600px) {
  .account-header {
    flex-direction: column;
    gap: 16px;
    text-align: center;
  }
  
  .account-meta {
    justify-content: center;
  }
  
  .nick-name {
    font-size: 22px;
  }
  
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .stat-card {
    padding: 12px;
  }
  
  .stat-value {
    font-size: 20px;
  }
}
</style>
