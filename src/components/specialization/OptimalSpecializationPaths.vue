<script setup>
import {onMounted, ref} from "vue";
import {Location} from "@element-plus/icons-vue";
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

  let bestAssistant = null;

  // 检查是否有分支特定的数据
  if (branch && professionData.branches && professionData.branches[branch]) {
    const branchData = professionData.branches[branch];
    // 分支数据存在，直接返回最佳助手
    if (branchData.best_assistant) {
      bestAssistant = {...branchData.best_assistant};
    }
  }

  // 没有分支特定数据或无效分支，使用通用数据
  if (!bestAssistant) {
    bestAssistant = {...professionData.general[`specialization_${level}`]?.best_assistant};
  }

  if (bestAssistant) {
    // 添加canApplyEfficiency标志，这里通常都可以应用效率
    bestAssistant.canApplyEfficiency = true;
  }

  return bestAssistant;
}

// 获取职业对应的减半干员
function getHalfOperator(profession) {
  // 从JSON中获取减半干员信息
  const irene = optimalSpecialization.half_time_operators.irene;
  const logos = optimalSpecialization.half_time_operators.logos;

  let halfOperator;

  if (["近卫", "狙击"].includes(profession)) {
    halfOperator = {
      name: irene.name,
      efficiency: irene.efficiency,
      charId: irene.charId,
      note: "适用于所有干员",
      skill_name: irene.skill_name,
      description: irene.description,
      canApplyEfficiency: true
    };
  } else if (["术师", "辅助"].includes(profession)) {
    halfOperator = {
      name: logos.name,
      efficiency: logos.efficiency,
      charId: logos.charId,
      note: "适用于所有干员",
      skill_name: logos.skill_name,
      description: logos.description,
      canApplyEfficiency: true
    };
  } else {
    // 医疗、重装、特种、先锋 - 返回单一选项，但在描述中包括两个选项
    halfOperator = {
      name: `${irene.name}/${logos.name}`,
      efficiency: irene.efficiency, // 两者效率相同
      charId: irene.charId, // 默认显示艾丽妮的头像
      note: "可选择艾丽妮或逻各斯",
      skill_name: "特训指导/战术分析",
      description: "进驻训练室协助位时，专精训练可以触发减半效果",
      alternativeCharId: logos.charId, // 添加替代头像
      canApplyEfficiency: false
    };
  }

  return halfOperator;
}

// 计算综合效率 (根据总耗时来算)
function calculateOverallEfficiency(totalTime) {
  // 标准总时间 48 小时 (8 + 16 + 24)
  const standardTime = Object.values(baseHours).reduce((acc, cur) => acc + cur, 0);
  // 效率 = 标准时间 / 优化后时间
  const efficiency = standardTime / totalTime;
  return (efficiency * 100).toFixed(0);
}

// 生成高亮的时间点文本
function highlightTimePoint(timeString, assistantName) {
  return `训练<b>${timeString}</b>后替换为${assistantName}`;
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
function generateTimeTooltip(baseTime, efficiency) {
  const efficiencyDisplay = efficiency > 0 ? `${(efficiency * 100).toFixed(0)}%` : "0%";
  const baseReduceFactor = 1 + 0.05 + (efficiency || 0);
  const calculatedTime = baseTime / baseReduceFactor;

  return `基础时间: ${baseTime.toFixed(2)}小时
基础减免: 5% (所有助手固有)
助手效率: ${efficiencyDisplay}
助手总效率: ${((efficiency || 0) + 0.05) * 100}%
计算公式: ${baseTime.toFixed(2)} / ${baseReduceFactor.toFixed(2)}
计算结果: ${calculatedTime.toFixed(2)}小时`;
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

  // 计算各个干员的实际效率（基础+效率+额外5%）
  const bestS1TotalEff = 1 + bestOperatorS1?.efficiency + 0.05;
  const bestS2TotalEff = 1 + bestOperatorS2?.efficiency + 0.05;
  const bestS3TotalEff = 1 + bestOperatorS3?.efficiency + 0.05;

  // 减半干员效率，根据是否能应用效率加成判断
  const halfOperatorEff = halfOperator.canApplyEfficiency ? halfOperator.efficiency : 0;
  const halfOpTotalEff = 1 + halfOperatorEff + 0.05;

  // 减半干员需要工作的实际时间（5小时 * 效率）
  const halfOpRequiredHours = 5 * halfOpTotalEff;

  // 专精一计算
  // 如果专精一总时间（8小时）大于减半干员所需时间
  const s1TotalTimeInZeroEff = baseHours[1]; // 总时间（零效率下）

  // 计算减半干员需要的时间（实际工作时间）
  const s1HalfOpTimeInZeroEff = halfOpRequiredHours; // 减半干员需要的时间（零效率下）
  const s1HalfOpWorkTime = s1HalfOpTimeInZeroEff / halfOpTotalEff; // 减半干员实际工作时间

  // 计算剩余时间（给最高效率干员）
  const s1RemainingTimeInZeroEff = s1TotalTimeInZeroEff - s1HalfOpTimeInZeroEff; // 剩余时间（零效率下）
  const s1BestOpWorkTime = s1RemainingTimeInZeroEff / bestS1TotalEff; // 最佳干员实际工作时间

  // 专精一总工作时间
  const totalTimeS1 = s1HalfOpWorkTime + s1BestOpWorkTime;

  // 生成专精一各段的计算提示
  const tooltipS1HalfOp = generateTimeTooltip(s1HalfOpTimeInZeroEff, halfOperatorEff);
  const tooltipS1BestOp = generateTimeTooltip(s1RemainingTimeInZeroEff, bestOperatorS1?.efficiency);

  // 专精二计算（已有减半效果）
  const s2TotalTimeInZeroEff = baseHours[2]; // 总时间（零效率下）
  const s2ActualTotalTimeInZeroEff = s2TotalTimeInZeroEff * 0.5; // 实际总时间（有减半效果）

  // 计算减半干员需要的时间（已有减半效果）
  const s2HalfOpTimeInZeroEff = halfOpRequiredHours; // 减半干员需要的时间（零效率下）
  const s2HalfOpWorkTime = s2HalfOpTimeInZeroEff / halfOpTotalEff; // 减半干员实际工作时间

  // 计算剩余时间（给最高效率干员，已有减半效果）
  const s2RemainingTimeInZeroEff = s2ActualTotalTimeInZeroEff - s2HalfOpTimeInZeroEff; // 剩余时间（零效率下）
  // 如果剩余时间小于0，则全部给减半干员
  const s2BestOpWorkTime = s2RemainingTimeInZeroEff > 0 ?
      s2RemainingTimeInZeroEff / bestS2TotalEff : 0; // 最佳干员实际工作时间
  const adjustedS2HalfOpWorkTime = s2RemainingTimeInZeroEff > 0 ?
      s2HalfOpWorkTime : s2ActualTotalTimeInZeroEff / halfOpTotalEff;

  // 专精二总工作时间
  const totalTimeS2 = adjustedS2HalfOpWorkTime + s2BestOpWorkTime;

  // 生成专精二各段的计算提示
  const tooltipS2HalfOp = generateTimeTooltip(
      s2RemainingTimeInZeroEff > 0 ? s2HalfOpTimeInZeroEff : s2ActualTotalTimeInZeroEff,
      halfOperatorEff,
      true
  );
  const tooltipS2BestOp = s2RemainingTimeInZeroEff > 0 ?
      generateTimeTooltip(s2RemainingTimeInZeroEff, bestOperatorS2?.efficiency) :
      "没有足够时间使用最高效率干员";

  // 专精三计算（已有减半效果）
  const s3TotalTimeInZeroEff = baseHours[3]; // 总时间（零效率下）
  const s3ActualTotalTimeInZeroEff = s3TotalTimeInZeroEff * 0.5; // 实际总时间（有减半效果）
  const timeS3 = s3ActualTotalTimeInZeroEff / bestS3TotalEff; // 最佳干员实际工作时间

  // 生成专精三的计算提示
  const tooltipS3 = generateTimeTooltip(s3ActualTotalTimeInZeroEff, bestOperatorS3?.efficiency);

  // 计算总耗时
  const totalTime = totalTimeS1 + totalTimeS2 + timeS3;

  // 确定专精一的替换顺序（先用最高效率干员还是先用减半干员）
  const s1FirstIsHalfOp = s1HalfOpTimeInZeroEff >= s1TotalTimeInZeroEff;
  // 确定专精二的替换顺序
  const s2FirstIsHalfOp = s2RemainingTimeInZeroEff <= 0;

  const steps = [];

  // 专精一的步骤
  if (s1FirstIsHalfOp) {
    // 如果时间不够，仅使用减半干员
    steps.push({
      level: 1,
      part: 1,
      assistant: halfOperator,
      time: totalTimeS1,
      timeTooltip: tooltipS1HalfOp,
      halfEffect: false,
      description: `专精一时间较短，直接使用${halfOperator.name}进行专精一训练，积累减半效果（需至少${halfOperator.canApplyEfficiency ? '5小时' : '5小时15分钟'}）`
    });
  } else {
    // 先用最佳干员再用减半干员
    steps.push({
      level: 1,
      part: 1,
      assistant: bestOperatorS1,
      time: s1BestOpWorkTime,
      timeTooltip: tooltipS1BestOp,
      halfEffect: false,
      description: `使用${bestOperatorS1.name}开始专精一训练，效率${(bestOperatorS1?.efficiency * 100).toFixed(0)}%，${highlightTimePoint(formatTime(s1BestOpWorkTime), halfOperator.name)}`
    });
    steps.push({
      level: 1,
      part: 2,
      assistant: halfOperator,
      time: s1HalfOpWorkTime,
      timeTooltip: tooltipS1HalfOp,
      halfEffect: false,
      description: `使用${halfOperator.name}完成专精一训练，积累减半效果（需至少${halfOperator.canApplyEfficiency ? '5小时' : '5小时15分钟'}）`
    });
  }

  // 专精二的步骤
  if (s2FirstIsHalfOp) {
    // 如果时间不够，仅使用减半干员
    steps.push({
      level: 2,
      part: 1,
      assistant: halfOperator,
      time: totalTimeS2,
      timeTooltip: tooltipS2HalfOp,
      halfEffect: true,
      description: `专精二时间较短，直接使用${halfOperator.name}进行专精二训练，享受并积累减半效果（需至少${halfOperator.canApplyEfficiency ? '5小时' : '5小时15分钟'}）`
    });
  } else {
    // 先用最佳干员再用减半干员
    steps.push({
      level: 2,
      part: 1,
      assistant: bestOperatorS2,
      time: s2BestOpWorkTime,
      timeTooltip: tooltipS2BestOp,
      halfEffect: true,
      description: `使用${bestOperatorS2.name}开始专精二训练，效率${(bestOperatorS2?.efficiency * 100).toFixed(0)}%，享受减半效果，${highlightTimePoint(formatTime(s2BestOpWorkTime), halfOperator.name)}`
    });
    steps.push({
      level: 2,
      part: 2,
      assistant: halfOperator,
      time: adjustedS2HalfOpWorkTime,
      timeTooltip: tooltipS2HalfOp,
      halfEffect: true,
      description: `使用${halfOperator.name}完成专精二训练，继续积累减半效果（需至少${halfOperator.canApplyEfficiency ? '5小时' : '5小时15分钟'}）`
    });
  }

  // 专精三步骤
  steps.push({
    level: 3,
    part: 1,
    assistant: bestOperatorS3,
    time: timeS3,
    timeTooltip: tooltipS3,
    halfEffect: true,
    description: `使用${bestOperatorS3.name}进行专精三训练，效率${(bestOperatorS3?.efficiency * 100).toFixed(0)}%，享受减半效果`
  });

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

  return {savedHours, savedPercentage};
}

// 初始化最优路径计算
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
          description="本功能展示从专精零到专精三的最优路线，综合应用最高效率干员与时间减半策略。专精减半需要减半干员(艾丽妮/逻各斯)工作达到效率换算后的时间才能生效。近卫/狙击使用艾丽妮，术师/辅助使用逻各斯，它们各需5小时；其它职业（医疗/重装/特种/先锋）使用时，由于无法获得30%效率加成，需工作约5小时15分钟。若训练时间足够，先使用最高效率助手，再换减半干员以积累减半效果；专精二、专精三则享受累积的减半效果。"
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
                  <el-tooltip :content="optimalPaths[activeProfession].general.totalTimeTooltip" effect="light"
                              placement="top">
                    <span class="value highlight">{{
                        formatTime(optimalPaths[activeProfession].general.totalTime)
                      }}</span>
                  </el-tooltip>
                </div>
                <div class="time-info">
                  <span class="label">综合效率:</span>
                  <span class="value efficiency-value">{{
                      calculateOverallEfficiency(optimalPaths[activeProfession].general.totalTime)
                    }}%</span>
                </div>
                <div class="time-info">
                  <span class="label">相对无专精辅助干员节省:</span>
                  <el-tooltip :content="optimalPaths[activeProfession].general.savingsTooltip" effect="light"
                              placement="top">
                    <span class="value success">{{
                        formatTime(calculateSavingsFromDefault(optimalPaths[activeProfession].general.totalTime).savedHours)
                      }} ({{
                        calculateSavingsFromDefault(optimalPaths[activeProfession].general.totalTime).savedPercentage
                      }}%)</span>
                  </el-tooltip>
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
                        <el-tooltip :content="step.assistant.description" effect="light" placement="top">
                          <OperatorAvatar
                              v-if="step.assistant.charId"
                              :char-id="step.assistant.charId"
                              :size="40"
                              rounded
                          />
                        </el-tooltip>
                        <!-- 如果有替代头像，显示两个头像 -->
                        <el-tooltip v-if="step.assistant.alternativeCharId"
                                    :content="'进驻训练室协助位时，专精训练可以触发减半效果'" effect="light"
                                    placement="top">
                          <OperatorAvatar
                              :char-id="step.assistant.alternativeCharId"
                              :size="40"
                              rounded
                          />
                        </el-tooltip>
                        <span class="assistant-name">{{ step.assistant.name }}</span>
                        <span v-if="step.assistant.note" class="assistant-note">{{ step.assistant.note }}</span>
                        <div class="efficiency-badges">
                          <span class="assistant-efficiency base-efficiency">5%</span>
                          <span v-if="step.assistant.canApplyEfficiency !== false"
                                class="assistant-efficiency">{{ (step.assistant?.efficiency * 100).toFixed(0) }}%</span>
                        </div>
                      </div>
                      <el-tooltip :content="step.timeTooltip" effect="light" placement="top">
                        <span :class="['time', step.halfEffect ? 'half-effect' : '']">
                          耗时: {{ formatTime(step.time) }}
                          <span v-if="step.halfEffect" class="half-time-tag">减半效果</span>
                        </span>
                      </el-tooltip>
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
                  <el-tooltip :content="optimalPaths[activeProfession].branches[activeTab].totalTimeTooltip"
                              effect="light" placement="top">
                    <span class="value highlight">{{
                        formatTime(optimalPaths[activeProfession].branches[activeTab].totalTime)
                      }}</span>
                  </el-tooltip>
                </div>
                <div class="time-info">
                  <span class="label">综合效率:</span>
                  <span class="value efficiency-value">{{
                      calculateOverallEfficiency(optimalPaths[activeProfession].branches[activeTab].totalTime)
                    }}%</span>
                </div>
                <div class="time-info">
                  <span class="label">相对无专精辅助干员节省:</span>
                  <el-tooltip :content="optimalPaths[activeProfession].branches[activeTab].savingsTooltip"
                              effect="light" placement="top">
                    <span class="value success">{{
                        formatTime(calculateSavingsFromDefault(optimalPaths[activeProfession].branches[activeTab].totalTime).savedHours)
                      }} ({{
                        calculateSavingsFromDefault(optimalPaths[activeProfession].branches[activeTab].totalTime).savedPercentage
                      }}%)</span>
                  </el-tooltip>
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
                        <el-tooltip :content="step.assistant.description" effect="light" placement="top">
                          <OperatorAvatar
                              v-if="step.assistant.charId"
                              :char-id="step.assistant.charId"
                              :size="40"
                              rounded
                          />
                        </el-tooltip>
                        <!-- 如果有替代头像，显示两个头像 -->
                        <el-tooltip v-if="step.assistant.alternativeCharId"
                                    :content="'进驻训练室协助位时，专精训练可以触发减半效果'" effect="light"
                                    placement="top">
                          <OperatorAvatar
                              :char-id="step.assistant.alternativeCharId"
                              :size="40"
                              rounded
                          />
                        </el-tooltip>
                        <span class="assistant-name">{{ step.assistant.name }}</span>
                        <span v-if="step.assistant.note" class="assistant-note">{{ step.assistant.note }}</span>
                        <div class="efficiency-badges">
                          <span class="assistant-efficiency base-efficiency">5%</span>
                          <span v-if="step.assistant.canApplyEfficiency !== false"
                                class="assistant-efficiency">{{ (step.assistant?.efficiency * 100).toFixed(0) }}%</span>
                        </div>
                      </div>
                      <el-tooltip :content="step.timeTooltip" effect="light" placement="top">
                        <span :class="['time', step.halfEffect ? 'half-effect' : '']">
                          耗时: {{ formatTime(step.time) }}
                          <span v-if="step.halfEffect" class="half-time-tag">减半效果</span>
                        </span>
                      </el-tooltip>
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

.step-details {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  background-color: var(--c-page-background-color-secondary);
  padding: 8px 12px;
  border-radius: 6px;
  gap: 10px;
}

.assistant-info {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  flex: 1;
}

.assistant-name {
  font-weight: bold;
  color: var(--c-text-color);
}

.assistant-note {
  font-size: 12px;
  color: var(--c-text-tip-color);
}

.assistant-efficiency {
  font-size: 12px;
  padding: 3px 6px;
  background-color: var(--c-page-background-color-secondary);
  color: var(--c-text-color);
  border-radius: 4px;
  border: 1px solid var(--c-border-color);
}

.efficiency-badges {
  display: flex;
  gap: 4px;
  margin-left: auto;
}

.base-efficiency {
  background-color: #eaf4fe;
  color: #409EFF;
}

.time {
  color: var(--c-text-tip-color);
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: 10px;
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

:deep(.el-step__description) {
  padding-right: 0;
}
</style> 