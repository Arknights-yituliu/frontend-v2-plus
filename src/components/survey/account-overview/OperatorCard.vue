<script setup>
import { computed } from 'vue'

const props = defineProps({
  operator: {
    type: Object,
    required: true
  },
  isLimited: {
    type: Boolean,
    default: false
  },
  isCollab: {
    type: Boolean,
    default: false
  },
  size: {
    type: Number,
    default: 90
  },
  // 是否未获得（灰色显示）
  isNotOwned: {
    type: Boolean,
    default: false
  }
})

// 稀有度对应的背景颜色（参考游戏截图的颜色）
const rarityColors = {
  6: { primary: '#FF6B35', secondary: '#FF9800' },  // 橙红色
  5: { primary: '#E5C100', secondary: '#FFD700' },  // 金黄色
  4: { primary: '#A855F7', secondary: '#C084FC' },  // 紫色
  3: { primary: '#3B82F6', secondary: '#60A5FA' },  // 蓝色
  2: { primary: '#6EE7B7', secondary: '#A7F3D0' },  // 浅绿色
  1: { primary: '#9CA3AF', secondary: '#D1D5DB' },  // 灰白色
  0: { primary: '#4B5563', secondary: '#6B7280' }   // 未获得灰色
}

// 职业英文名映射
const professionMap = {
  'PIONEER': 'PIONEER',
  'WARRIOR': 'WARRIOR',
  'TANK': 'TANK',
  'SNIPER': 'SNIPER',
  'CASTER': 'CASTER',
  'MEDIC': 'MEDIC',
  'SUPPORT': 'SUPPORT',
  'SPECIAL': 'SPECIAL'
}

// 获取卡片背景颜色
const cardColors = computed(() => {
  if (props.isNotOwned) {
    return rarityColors[0]  // 未获得使用灰色
  }
  const rarity = props.operator.rarity || 1
  return rarityColors[rarity] || rarityColors[1]
})

// 获取职业英文名
const professionName = computed(() => {
  return professionMap[props.operator.profession] || ''
})

// 是否显示限定标记
const showLimited = computed(() => {
  return props.isLimited && !props.isCollab
})

// 获取精英化等级
const eliteLevel = computed(() => props.operator.elite || 0)

// 获取潜能等级
const potentialLevel = computed(() => props.operator.potential || 1)

// 获取等级
const level = computed(() => props.operator.level || 1)

// 获取通用技能等级
const mainSkillLevel = computed(() => props.operator.mainSkill || 1)

// 获取所有技能的显示信息
const allSkillsDisplay = computed(() => {
  const skills = []
  const skillCount = props.operator.skills?.length || 0
  
  for (let i = 1; i <= Math.max(skillCount, 3); i++) {
    const mastery = props.operator[`skill${i}`] || 0
    if (props.operator.skills?.[i - 1] || mastery > 0) {
      skills.push({
        index: i,
        mastery: mastery,
        mainSkill: mainSkillLevel.value
      })
    }
  }
  
  return skills
})

// 模组类型映射（支持希腊字母）
const moduleTypeMap = {
  'X': 'X',
  'Y': 'Y',
  'D': 'Δ',  // Delta
  'A': 'α',  // Alpha
  'B': 'β'   // Beta
}

// 模组显示
const moduleDisplay = computed(() => {
  const op = props.operator
  const modules = []
  const types = ['X', 'Y', 'D', 'A', 'B']
  
  for (const type of types) {
    const level = op[`mod${type}`]
    if (level && level > 0) {
      modules.push({ 
        type, 
        level,
        displayType: moduleTypeMap[type] || type
      })
    }
  }
  
  return modules
})

// 星级数量
const stars = computed(() => {
  return props.operator.rarity || 1
})

// 获取干员头像sprite类名
const avatarClass = computed(() => {
  return `bg-${props.operator.charId}`
})
</script>

<template>
  <div 
    class="operator-card" 
    :class="{ 'not-owned': isNotOwned }"
    :style="{ 
      '--card-primary': cardColors.primary,
      '--card-secondary': cardColors.secondary
    }"
  >
    <!-- 背景层（带斜线纹理） -->
    <div class="card-background"></div>
    <div class="card-stripe-overlay"></div>
    
    <!-- 星级（绝对定位居中，不受其他元素影响） -->
    <div v-if="!isNotOwned" class="star-badge">
      <img :src="`/image/survey/bg/rarity-${stars}.png`" class="rarity-icon" :alt="`${stars}星`">
    </div>
    
    <!-- 顶部一行：职业图标 + 限定/联动标记（顶端对齐） -->
    <div class="top-row">
      <!-- 左侧：职业图标 -->
      <div v-if="professionName" class="profession-badge">
        <img :src="`/image/survey/bg/${professionName}.png`" class="profession-icon" :alt="professionName">
      </div>
      <div v-else class="profession-placeholder"></div>
      
      <!-- 右侧：限定/联动标记 -->
      <div class="top-right-badges">
        <div v-if="showLimited" class="limited-badge" title="限定">
          <span>限</span>
        </div>
        <div v-if="isCollab" class="collab-badge" title="联动">
          <span>联</span>
        </div>
      </div>
    </div>
    
    <!-- 中间：头像（未获得时显示灰色） -->
    <div class="avatar-container" :class="{ 'grayscale': isNotOwned }">
      <div class="sprite-avatar" :class="avatarClass"></div>
    </div>
    
    <!-- 以下内容仅在已获得时显示 -->
    <template v-if="!isNotOwned">
      <!-- 底部渐变遮罩（透明到黑色） -->
      <div class="bottom-gradient-overlay"></div>
      
      <!-- 左下角：潜能 + 精英化 + 等级 -->
      <div class="left-bottom-area">
        <!-- 潜能图标（带黑色圆角正方形背景） -->
        <div class="potential-wrapper">
          <img :src="`/image/survey/rank/potential${potentialLevel}.png`" class="potential-icon" :alt="`潜能${potentialLevel}`">
        </div>
        <!-- 精英化图标 -->
        <img :src="`/image/survey/rank/elite${eliteLevel}.png`" class="elite-icon" :alt="`精英${eliteLevel}`">
        <!-- 等级 -->
        <div class="level-badge">
          <img src="/image/survey/rank/lv-bg.png" class="level-bg">
          <span class="level-text">{{ level }}</span>
        </div>
      </div>
      
      <!-- 右下角区域：模组在上，技能在下 -->
      <div class="right-bottom-area">
        <!-- 模组（等级图标上叠加类型标记） -->
        <div v-if="moduleDisplay.length > 0" class="module-area">
          <div v-for="mod in moduleDisplay" :key="mod.type" class="module-item-compact">
            <img :src="`/image/survey/mod-rank-${mod.level}-v1.jpg`" class="module-level-icon-compact" :alt="`模组${mod.level}级`">
            <span class="module-type-overlay">{{ mod.displayType }}</span>
          </div>
        </div>
        
        <!-- 技能等级（使用黑色正方形背景） -->
        <div class="skill-area">
          <template v-if="allSkillsDisplay.length > 0">
            <div v-for="skill in allSkillsDisplay" :key="skill.index" class="skill-item">
              <div class="skill-box">
                <img v-if="skill.mastery > 0" :src="`/image/survey/rank/skill-rank-${skill.mastery}.png`" class="mastery-icon" :alt="`专精${skill.mastery}`">
                <span v-else class="skill-level-text">{{ skill.mainSkill }}</span>
              </div>
            </div>
          </template>
          <div v-else class="skill-box">
            <span class="skill-level-text">{{ mainSkillLevel }}</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.operator-card {
  position: relative;
  width: v-bind('size + "px"');
  height: v-bind('size + "px"');
  min-width: v-bind('size + "px"');
  border-radius: 4px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

/* 背景渐变层 */
.card-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, var(--card-primary) 0%, var(--card-secondary) 100%);
  z-index: 0;
}

/* 斜线纹理层（参考游戏截图效果） */
.card-stripe-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: repeating-linear-gradient(
    135deg,
    transparent,
    transparent 2px,
    rgba(255, 255, 255, 0.08) 2px,
    rgba(255, 255, 255, 0.08) 4px
  );
  z-index: 0;
}

/* 未获得干员样式 */
.operator-card.not-owned .card-background {
  background: linear-gradient(135deg, #374151 0%, #4B5563 100%);
}

.operator-card.not-owned .card-stripe-overlay {
  background: repeating-linear-gradient(
    135deg,
    transparent,
    transparent 2px,
    rgba(0, 0, 0, 0.15) 2px,
    rgba(0, 0, 0, 0.15) 4px
  );
}

/* 头像灰度效果 */
.avatar-container.grayscale {
  filter: grayscale(100%) brightness(0.6);
}

/* 星级（绝对定位居中，不受其他元素影响） */
.star-badge {
  position: absolute;
  top: 2px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  justify-content: center;
  align-items: flex-start;
  z-index: 11;
}

.rarity-icon {
  height: 10px;
  object-fit: contain;
}

/* 顶部一行：职业 + 限定（顶端对齐） */
.top-row {
  position: absolute;
  top: 2px;
  left: 2px;
  right: 2px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  z-index: 10;
}

.profession-placeholder {
  width: 18px;
  height: 18px;
}

/* 职业徽章 */
.profession-badge {
  display: flex;
  align-items: flex-start;
}

.profession-icon {
  width: 18px;
  height: 18px;
  object-fit: contain;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.5));
}

/* 右上角限定/联动标记 */
.top-right-badges {
  display: flex;
  flex-direction: row;
  gap: 2px;
  align-items: flex-start;
}

.limited-badge,
.collab-badge {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  font-weight: bold;
  color: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
}

.limited-badge {
  background: linear-gradient(135deg, #FF1744 0%, #D50000 100%);
}

.collab-badge {
  background: linear-gradient(135deg, #00BCD4 0%, #0097A7 100%);
}

/* 头像容器 */
.avatar-container {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: v-bind('size + "px"');
  height: v-bind('size + "px"');
  z-index: 1;
  overflow: hidden;
}

.sprite-avatar {
  position: absolute;
  width: 180px;
  height: 180px;
  transform: scale(v-bind('size / 180'));
  transform-origin: center center;
  top: 50%;
  left: 50%;
  margin-top: -90px;
  margin-left: -90px;
}

/* 底部渐变遮罩（透明到黑色，高度为卡片的1/8） */
.bottom-gradient-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 12.5%;
  background: linear-gradient(to bottom, transparent 0%, rgba(0, 0, 0, 0.7) 100%);
  z-index: 2;
  pointer-events: none;
}

/* 左下角区域：潜能 + 精英化 + 等级（更紧凑） */
.left-bottom-area {
  position: absolute;
  bottom: 2px;
  left: 2px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0px;
  z-index: 10;
}

/* 潜能包裹层（黑色圆角正方形背景） */
.potential-wrapper {
  background: rgba(0, 0, 0, 0.8);
  border-radius: 3px;
  padding: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: -2px;
}

.potential-icon {
  width: 14px;
  height: 14px;
  object-fit: contain;
  filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.3));
}

.elite-icon {
  width: 20px;
  height: 20px;
  object-fit: contain;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.5));
  margin-bottom: -2px;
}

.level-badge {
  position: relative;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: 2px;
}

.level-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.level-text {
  position: relative;
  font-size: 10px;
  font-weight: bold;
  color: #fff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
  z-index: 1;
  line-height: 1;
}

/* 右下角区域容器 */
.right-bottom-area {
  position: absolute;
  bottom: 2px;
  right: 2px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 1px;
  z-index: 10;
}

/* 模组区域（在技能上方，竖排显示） */
.module-area {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 1px;
}

/* 紧凑型模组项（等级图标上叠加类型标记） */
.module-item-compact {
  position: relative;
  width: 16px;
  height: 16px;
}

.module-level-icon-compact {
  width: 16px;
  height: 16px;
  object-fit: contain;
  border-radius: 2px;
}

/* 模组类型标记（叠加在等级图标右下角） */
.module-type-overlay {
  position: absolute;
  bottom: -1px;
  right: -1px;
  font-size: 7px;
  font-weight: bold;
  color: #4FC3F7;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 2px;
  padding: 0px 2px;
  line-height: 1.2;
  text-shadow: 0 0 2px rgba(0, 0, 0, 0.8);
}

/* 技能区域（在模组下方） */
.skill-area {
  display: flex;
  gap: 1px;
}

.skill-item {
  display: flex;
}

.skill-box {
  width: 16px;
  height: 16px;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 1px;
}

.skill-level-text {
  font-size: 10px;
  font-weight: bold;
  color: #fff;
}

.mastery-icon {
  width: 14px;
  height: 14px;
  object-fit: contain;
}
</style>
