<script setup>
import {onMounted, ref, watch} from "vue";
import {Location, Refresh} from "@element-plus/icons-vue";
import optimalSpecialization from "@/static/json/build/optimal_specialization.json";
import OperatorAvatar from "@/components/sprite/OperatorAvatar.vue";

const professions = ref([
  "近卫", "狙击", "术师", "医疗", "重装", "辅助", "特种", "先锋"
]);

const activeProfession = ref("近卫");
const activeTab = ref("general");

// 每个职业的分支
const branchesByProfession = {
  "近卫": ["领主", "斗士"],
  "狙击": ["攻城手", "速射手"],
  "术师": [],
  "医疗": ["链愈师", "行医"],
  "重装": ["驭法铁卫"],
  "辅助": [],
  "特种": [],
  "先锋": []
};

// 专精基础时间（小时）
const baseHours = {
  1: 8,
  2: 16,
  3: 24
};

// 获取职业和专精级别对应的最佳干员
function getBestAssistant(profession, level, branch = null) {
  const professionData = optimalSpecialization.professions[profession];
  if (!professionData) return null;
  
  // 检查是否有分支特定的数据
  if (branch && professionData.branches && professionData.branches[branch]) {
    const branchData = professionData.branches[branch];
    // 分支数据存在，直接返回最佳助手
    if (branchData.best_assistant) {
      return branchData.best_assistant;
    }
  }
  
  // 没有分支特定数据或无效分支，使用通用数据
  return professionData.general[`specialization_${level}`]?.best_assistant;
}

// 获取职业对应的减半干员
function getHalfOperator(profession) {
  // 从JSON中获取减半干员信息
  const irene = optimalSpecialization.half_time_operators.irene;
  const logos = optimalSpecialization.half_time_operators.logos;

  if (["近卫", "狙击"].includes(profession)) {
    return {
      name: irene.name,
      efficiency: irene.efficiency,
      charId: irene.charId,
      note: "适用于所有干员",
      skill_name: irene.skill_name,
      description: irene.description
    };
  } else if (["术师", "辅助"].includes(profession)) {
    return {
      name: logos.name,
      efficiency: logos.efficiency,
      charId: logos.charId,
      note: "适用于所有干员",
      skill_name: logos.skill_name,
      description: logos.description
    };
  } else {
    // 医疗、重装、特种、先锋 - 返回单一选项，但在描述中包括两个选项
    return {
      name: `${irene.name}/${logos.name}`,
      efficiency: irene.efficiency, // 两者效率相同
      charId: irene.charId, // 默认显示艾丽妮的头像
      note: "可选择艾丽妮或逻各斯",
      skill_name: "特训指导/战术分析",
      description: "进驻训练室协助位时，专精训练可以触发减半效果",
      alternativeCharId: logos.charId // 添加替代头像
    };
  }
}

// 计算实际专精时间（小时）
function calculateSpecializationTime(baseTime, efficiency, halfTimeEffect = false) {
  // 先计算基础时间减少
  const calculated = baseTime / (1 + 0.05 + efficiency);
  // 如果有减半效果，再除以2
  return halfTimeEffect ? calculated * 0.5 : calculated;
}

// 计算综合效率 (根据总耗时来算)
function calculateOverallEfficiency(totalTime) {
  // 标准总时间 48 小时 (8 + 16 + 24)
  const standardTime = 48;
  // 效率 = 标准时间 / 优化后时间
  const efficiency = standardTime / totalTime;
  return (efficiency * 100).toFixed(0);
}

// 生成高亮的时间点文本
function highlightTimePoint(timeString, assistantName) {
  return `训练<span class="time-highlight">${timeString}</span>后替换为${assistantName}`;
}

// 格式化时间为小时分钟
function formatTime(hours) {
  const wholePart = Math.floor(hours);
  const decimalPart = hours - wholePart;
  const minutes = Math.round(decimalPart * 60);

  if (minutes === 0) {
    return `${wholePart}小时`;
  } else {
    return `${wholePart}小时${minutes}分钟`;
  }
}

// 生成耗时计算的详细提示
function generateTimeTooltip(baseTime, efficiency, halfEffect) {
  const baseReduceFactor = 1 + 0.05 + efficiency;
  const calculatedTime = baseTime / baseReduceFactor;
  const finalTime = halfEffect ? calculatedTime * 0.5 : calculatedTime;
  
  return `基础时间: ${baseTime}小时
基础减免: 5% (所有助手固有)
助手效率: ${(efficiency * 100).toFixed(0)}%
助手总效率: ${((efficiency + 0.05) * 100).toFixed(0)}%
计算公式: ${baseTime} / ${baseReduceFactor.toFixed(2)} ${halfEffect ? '× 0.5' : ''}
计算结果: ${finalTime.toFixed(2)}小时`;
}

// 生成总耗时计算的提示信息
function generateTotalTimeTooltip(steps) {
  if (!steps || steps.length === 0) return '';
  
  let tooltipText = '总耗时计算详情:\n\n';
  let totalTime = 0;
  
  steps.forEach((step, index) => {
    const stepTime = step.time;
    totalTime += stepTime;
    tooltipText += `${index + 1}. 专精${step.level}${step.part > 1 ? `-${step.part}` : ''} (${step.assistant.name}): ${stepTime.toFixed(2)}小时\n`;
  });
  
  tooltipText += `\n总计: ${totalTime.toFixed(2)}小时`;
  return tooltipText;
}

// 生成节省时间计算的提示信息
function generateSavingsTooltip(optimizedTime) {
  const baseReduceFactor = 1.05; // 基础的5%减少
  const defaultTime = baseHours[1] / baseReduceFactor + baseHours[2] / baseReduceFactor + baseHours[3] / baseReduceFactor;
  const savedHours = defaultTime - optimizedTime;
  const savedPercentage = (savedHours / defaultTime * 100).toFixed(1);
  
  return `节省时间计算详情:

无专精助手情况下总耗时:
- 专精1: ${(baseHours[1] / baseReduceFactor).toFixed(2)}小时
- 专精2: ${(baseHours[2] / baseReduceFactor).toFixed(2)}小时
- 专精3: ${(baseHours[3] / baseReduceFactor).toFixed(2)}小时
- 总计: ${defaultTime.toFixed(2)}小时

优化后总耗时: ${optimizedTime.toFixed(2)}小时
节省时间: ${savedHours.toFixed(2)}小时 (${savedPercentage}%)`;
}

// 计算完整专精路径
function calculateOptimalPath(profession, branch = null) {
  if (!profession) return null;

  // 获取减半干员
  const halfOperator = getHalfOperator(profession);

  // 获取各阶段最佳助手
  const bestOperatorS1 = getBestAssistant(profession, 1, branch);
  const bestOperatorS2 = getBestAssistant(profession, 2, branch);
  const bestOperatorS3 = getBestAssistant(profession, 3, branch);

  // 专精一分两段：
  // 前半段用最高效率助手
  const timeS1FirstHalf = calculateSpecializationTime(baseHours[1] * 0.5, bestOperatorS1?.efficiency);
  // 后半段用减半助手
  const timeS1SecondHalf = calculateSpecializationTime(baseHours[1] * 0.5, halfOperator?.efficiency);
  const totalTimeS1 = timeS1FirstHalf + timeS1SecondHalf;
  
  // 生成专精一各段的计算提示
  const tooltipS1FirstHalf = generateTimeTooltip(baseHours[1] * 0.5, bestOperatorS1?.efficiency, false);
  const tooltipS1SecondHalf = generateTimeTooltip(baseHours[1] * 0.5, halfOperator?.efficiency, false);
  
  // 计算专精一的替换时间点
  const switchTimeS1 = formatTime(timeS1FirstHalf);

  // 专精二分两段：
  // 前半段使用最高效率助手（已经触发了专精一的减半效果）
  const timeS2FirstHalf = calculateSpecializationTime(baseHours[2] * 0.5, bestOperatorS2?.efficiency, true);
  // 后半段使用减半助手
  const timeS2SecondHalf = calculateSpecializationTime(baseHours[2] * 0.5, halfOperator?.efficiency, true);
  const totalTimeS2 = timeS2FirstHalf + timeS2SecondHalf;
  
  // 生成专精二各段的计算提示
  const tooltipS2FirstHalf = generateTimeTooltip(baseHours[2] * 0.5, bestOperatorS2?.efficiency, true);
  const tooltipS2SecondHalf = generateTimeTooltip(baseHours[2] * 0.5, halfOperator?.efficiency, true);
  
  // 计算专精二的替换时间点
  const switchTimeS2 = formatTime(timeS2FirstHalf);

  // 专精三：使用专精三最高效率干员（已经触发了专精二的减半效果）
  const timeS3 = calculateSpecializationTime(baseHours[3], bestOperatorS3?.efficiency, true);
  
  // 生成专精三的计算提示
  const tooltipS3 = generateTimeTooltip(baseHours[3], bestOperatorS3?.efficiency, true);

  const totalTime = totalTimeS1 + totalTimeS2 + timeS3;

  const steps = [
    {
      level: 1,
      part: 1,
      assistant: bestOperatorS1,
      time: timeS1FirstHalf,
      timeTooltip: tooltipS1FirstHalf,
      halfEffect: false,
      description: `使用${bestOperatorS1.name}开始专精一训练，效率${(bestOperatorS1?.efficiency * 100).toFixed(0)}%，${highlightTimePoint(switchTimeS1, halfOperator.name)}`
    },
    {
      level: 1,
      part: 2,
      assistant: halfOperator,
      time: timeS1SecondHalf,
      timeTooltip: tooltipS1SecondHalf,
      halfEffect: false,
      description: `使用${halfOperator.name}完成专精一训练，积累减半效果`
    },
    {
      level: 2,
      part: 1,
      assistant: bestOperatorS2,
      time: timeS2FirstHalf,
      timeTooltip: tooltipS2FirstHalf,
      halfEffect: true,
      description: `使用${bestOperatorS2.name}开始专精二训练，效率${(bestOperatorS2?.efficiency * 100).toFixed(0)}%，享受减半效果，${highlightTimePoint(switchTimeS2, halfOperator.name)}`
    },
    {
      level: 2,
      part: 2,
      assistant: halfOperator,
      time: timeS2SecondHalf,
      timeTooltip: tooltipS2SecondHalf,
      halfEffect: true,
      description: `使用${halfOperator.name}完成专精二训练，积累减半效果`
    },
    {
      level: 3,
      part: 1,
      assistant: bestOperatorS3,
      time: timeS3,
      timeTooltip: tooltipS3,
      halfEffect: true,
      description: `使用${bestOperatorS3.name}进行专精三训练，效率${(bestOperatorS3?.efficiency * 100).toFixed(0)}%，享受减半效果`
    }
  ];

  return {
    totalTime: totalTime,
    totalTimeTooltip: generateTotalTimeTooltip(steps),
    savingsTooltip: generateSavingsTooltip(totalTime),
    steps: steps
  };
}

// 按职业计算最优路径
const optimalPaths = ref({});

// 初始化数据
function initializePaths() {
  // 计算每个职业的路径
  professions.value.forEach(profession => {
    if (!optimalPaths.value[profession]) {
      optimalPaths.value[profession] = {};
    }
    
    // 计算通用路径
    optimalPaths.value[profession].general = calculateOptimalPath(profession);
    
    // 计算分支路径
    if (branchesByProfession[profession].length > 0) {
      optimalPaths.value[profession].branches = {};
      branchesByProfession[profession].forEach(branch => {
        optimalPaths.value[profession].branches[branch] = calculateOptimalPath(profession, branch);
      });
    }
  });
}

// 计算相对于无助手情况的时间节省
function calculateSavingsFromDefault(optimizedTime) {
  // 无专精助手情况下的时间计算 (只有基础5%减少)
  const baseReduceFactor = 1.05; // 基础的5%减少
  const defaultTime = baseHours[1] / baseReduceFactor + baseHours[2] / baseReduceFactor + baseHours[3] / baseReduceFactor;
  
  const savedHours = defaultTime - optimizedTime;
  const savedPercentage = ((savedHours / defaultTime) * 100).toFixed(0);
  
  return { savedHours, savedPercentage };
}

// 组件挂载时初始化
onMounted(() => {
  initializePaths();
});
</script>

<template>
  <el-collapse-item name="OptimalSpecializationPaths">
    <template #title>
      <Location style="width: 13px;margin-inline: 8px"/>
      <el-text size="large" tag="b">职业专精最优路线</el-text>
    </template>

    <div class="optimal-path-container">
      <el-alert
          :closable="false"
          description="本功能展示从专精零到专精三的最优路线，综合应用最高效率干员与时间减半策略。专精一前半段使用效率最高助手，后半段换上专精减半助手（近卫/狙击换艾丽妮，术师/辅助换逻各斯，其它职业换艾丽妮/逻各斯均可）；专精二前半段使用效率最高助手（享受减半效果），后半段换上专精减半助手；专精三使用效率最高助手（享受减半效果）。每个职业均选用最高效率助手，如95%效率的归溟幽灵鲨（特种专精3）等。"
          show-icon
          style="margin-bottom: 15px"
          title="专精路线说明"
          type="info"
      />

      <!-- 职业选择 -->
      <div class="profession-filter">
        <div class="filter-title">选择职业:</div>
        <div class="filter-buttons">
          <button 
            v-for="profession in professions" 
            :key="profession" 
            :class="['profession-button', 'profession', {'active': activeProfession === profession}]"
            @click="activeProfession = profession"
          >
            {{ profession }}
          </button>
        </div>
      </div>

      <!-- 通用/分支选择 -->
      <div v-if="optimalPaths[activeProfession]">
        <el-tabs v-model="activeTab" class="branch-tabs">
          <el-tab-pane label="通用路线" name="general"></el-tab-pane>
          <el-tab-pane
              v-for="branch in branchesByProfession[activeProfession]"
              :key="branch"
              :label="branch"
              :name="branch"
          ></el-tab-pane>
        </el-tabs>

        <!-- 通用路线显示 -->
        <div v-if="activeTab === 'general' && optimalPaths[activeProfession].general">
          <div class="path-info">
            <div class="path-header">
              <h3>{{ activeProfession }}干员专精通用最优路线</h3>
              <div class="path-summary">
                <div class="time-info">
                  <span class="label">总耗时:</span>
                  <span class="value highlight tooltip-target" :title="optimalPaths[activeProfession].general.totalTimeTooltip">{{
                      formatTime(optimalPaths[activeProfession].general.totalTime)
                    }}</span>
                </div>
                <div class="time-info">
                  <span class="label">综合效率:</span>
                  <span class="value efficiency-value">{{
                      calculateOverallEfficiency(optimalPaths[activeProfession].general.totalTime)
                    }}%</span>
                </div>
                <div class="time-info">
                  <span class="label">相对无专精辅助干员节省:</span>
                  <span class="value success tooltip-target" :title="optimalPaths[activeProfession].general.savingsTooltip">{{
                      formatTime(calculateSavingsFromDefault(optimalPaths[activeProfession].general.totalTime).savedHours)
                    }} ({{ calculateSavingsFromDefault(optimalPaths[activeProfession].general.totalTime).savedPercentage }}%)</span>
                </div>
              </div>
            </div>

            <el-steps :active="5" direction="vertical" finish-status="success">
              <el-step
                  v-for="(step, index) in optimalPaths[activeProfession].general.steps"
                  :key="index"
                  :title="`专精${step.level}${step.part > 1 ? `-${step.part}` : ''}`"
              >
                <template #description>
                  <div class="step-description">
                    <div v-if="step.description" class="step-action" v-html="step.description"></div>
                    <div class="step-details">
                      <div class="assistant-info">
                        <OperatorAvatar 
                          v-if="step.assistant.charId" 
                          :char-id="step.assistant.charId" 
                          :size="40" 
                          rounded
                        />
                        <!-- 如果有替代头像，显示两个头像 -->
                        <OperatorAvatar 
                          v-if="step.assistant.alternativeCharId" 
                          :char-id="step.assistant.alternativeCharId" 
                          :size="40" 
                          rounded
                        />
                        <span class="assistant-name">{{ step.assistant.name }}</span>
                        <span v-if="step.assistant.note" class="assistant-note">{{ step.assistant.note }}</span>
                        <span class="assistant-efficiency">{{ (step.assistant?.efficiency * 100).toFixed(0) }}%</span>
                      </div>
                      <span :class="['time', step.halfEffect ? 'half-effect' : '', 'tooltip-target']" :title="step.timeTooltip">
                        耗时: {{ formatTime(step.time) }}
                        <span v-if="step.halfEffect" class="half-time-tag">减半效果</span>
                      </span>
                    </div>
                  </div>
                </template>
              </el-step>
            </el-steps>
          </div>
        </div>

        <!-- 分支路线显示 -->
        <div v-else-if="branchesByProfession[activeProfession].includes(activeTab) && 
                      optimalPaths[activeProfession].branches && 
                      optimalPaths[activeProfession].branches[activeTab]">
          <div class="path-info">
            <div class="path-header">
              <h3>{{ activeProfession }}-{{ activeTab }}分支专精最优路线</h3>
              <div class="path-summary">
                <div class="time-info">
                  <span class="label">总耗时:</span>
                  <span class="value highlight tooltip-target" :title="optimalPaths[activeProfession].branches[activeTab].totalTimeTooltip">{{
                      formatTime(optimalPaths[activeProfession].branches[activeTab].totalTime)
                    }}</span>
                </div>
                <div class="time-info">
                  <span class="label">综合效率:</span>
                  <span class="value efficiency-value">{{
                      calculateOverallEfficiency(optimalPaths[activeProfession].branches[activeTab].totalTime)
                    }}%</span>
                </div>
                <div class="time-info">
                  <span class="label">相对无专精辅助干员节省:</span>
                  <span class="value success tooltip-target" :title="optimalPaths[activeProfession].branches[activeTab].savingsTooltip">{{
                      formatTime(calculateSavingsFromDefault(optimalPaths[activeProfession].branches[activeTab].totalTime).savedHours)
                    }} ({{ calculateSavingsFromDefault(optimalPaths[activeProfession].branches[activeTab].totalTime).savedPercentage }}%)</span>
                </div>
              </div>
            </div>

            <el-steps :active="5" direction="vertical" finish-status="success">
              <el-step
                  v-for="(step, index) in optimalPaths[activeProfession].branches[activeTab].steps"
                  :key="index"
                  :title="`专精${step.level}${step.part > 1 ? `-${step.part}` : ''}`"
              >
                <template #description>
                  <div class="step-description">
                    <div v-if="step.description" class="step-action" v-html="step.description"></div>
                    <div class="step-details">
                      <div class="assistant-info">
                        <OperatorAvatar 
                          v-if="step.assistant.charId" 
                          :char-id="step.assistant.charId" 
                          :size="40" 
                          rounded
                        />
                        <!-- 如果有替代头像，显示两个头像 -->
                        <OperatorAvatar 
                          v-if="step.assistant.alternativeCharId" 
                          :char-id="step.assistant.alternativeCharId" 
                          :size="40" 
                          rounded
                        />
                        <span class="assistant-name">{{ step.assistant.name }}</span>
                        <span v-if="step.assistant.note" class="assistant-note">{{ step.assistant.note }}</span>
                        <span class="assistant-efficiency">{{ (step.assistant?.efficiency * 100).toFixed(0) }}%</span>
                      </div>
                      <span :class="['time', step.halfEffect ? 'half-effect' : '', 'tooltip-target']" :title="step.timeTooltip">
                        耗时: {{ formatTime(step.time) }}
                        <span v-if="step.halfEffect" class="half-time-tag">减半效果</span>
                      </span>
                    </div>
                  </div>
                </template>
              </el-step>
            </el-steps>
          </div>
        </div>
      </div>
    </div>
  </el-collapse-item>
</template>

<style scoped>
.optimal-path-container {
  padding: 15px;
}

/* 职业筛选栏样式 */
.profession-filter {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
  background-color: var(--c-page-background-color);
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 var(--c-box-shadow-color);
}

.filter-title {
  font-size: 14px;
  font-weight: bold;
  color: var(--c-text-tip-color);
}

.filter-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.profession-button {
  padding: 8px 16px;
  border-radius: 6px;
  border: 1px solid var(--c-border-color);
  background-color: var(--c-page-background-color);
  color: var(--c-text-color);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.profession-button:hover {
  border-color: var(--c-border-color);
  color: var(--c-text-color);
  background-color: var(--c-page-background-color-secondary);
}

.profession-button.active {
  background-color: var(--c-page-background-color-secondary);
  color: var(--c-text-color);
  border-color: var(--c-border-color);
  font-weight: bold;
}

/* 路径样式 */
.path-info {
  margin-top: 10px;
  background-color: var(--c-page-background-color);
  border-radius: 8px;
  padding: 15px;
  box-shadow: 0 2px 12px 0 var(--c-box-shadow-color);
}

.path-header {
  margin-bottom: 20px;
}

.path-header h3 {
  color: var(--c-text-color);
  font-size: 16px;
  margin: 0 0 15px 0;
}

.path-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  background-color: var(--c-page-background-color-secondary);
  padding: 10px;
  border-radius: 6px;
}

.time-info {
  display: flex;
  align-items: center;
}

.label {
  color: var(--c-text-tip-color);
  margin-right: 5px;
  font-size: 14px;
}

.value {
  color: var(--c-text-color);
  font-weight: bold;
  font-size: 14px;
}

.highlight {
  color: var(--c-text-color);
  text-decoration: underline;
}

.efficiency-value {
  color: var(--c-text-color);
  font-weight: bold;
}

.success {
  color: var(--c-text-color);
  font-weight: bold;
}

/* 工具提示样式 */
.tooltip-target {
  border-bottom: 1px dotted var(--c-border-color);
  cursor: help;
  position: relative;
}

.tooltip-target:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

/* 步骤样式 */
.step-description {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.step-action {
  font-size: 14px;
  color: var(--c-text-color);
  line-height: 1.5;
}

.time-highlight {
  color: var(--c-text-color);
  font-weight: bold;
}

.step-details {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: var(--c-page-background-color-secondary);
  padding: 8px 12px;
  border-radius: 6px;
}

.assistant-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.assistant-name {
  font-weight: bold;
  color: var(--c-text-color);
  margin-right: 5px;
}

.assistant-note {
  font-size: 12px;
  color: var(--c-text-tip-color);
  margin-right: 10px;
}

.assistant-efficiency {
  font-size: 12px;
  padding: 3px 6px;
  background-color: var(--c-page-background-color-secondary);
  color: var(--c-text-color);
  border-radius: 4px;
  border: 1px solid var(--c-border-color);
}

.time {
  color: var(--c-text-tip-color);
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.half-effect {
  color: var(--c-text-color);
  font-weight: bold;
}

.half-time-tag {
  display: inline-block;
  padding: 2px 6px;
  background-color: var(--c-page-background-color-secondary);
  color: var(--c-text-color);
  border: 1px solid var(--c-border-color);
  border-radius: 4px;
  font-size: 12px;
  margin-left: 5px;
}

/* 分支标签样式 */
.branch-tabs {
  margin-bottom: 15px;
}
</style> 