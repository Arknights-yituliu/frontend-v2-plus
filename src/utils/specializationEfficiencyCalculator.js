// 基础专精时间（小时）
const baseTrainingHours = {
  0: 0,     // 专精零（无时间）
  1: 8,     // 专精零到专精一
  2: 16,    // 专精一到专精二
  3: 24     // 专精二到专精三
};

// 专精总时长（基础）
const totalBaseHours = baseTrainingHours[1] + baseTrainingHours[2] + baseTrainingHours[3]; // 48小时

/**
 * 计算标准干员的实际专精效率
 * @param {Object} operator - 干员数据
 * @returns {number} - 实际专精效率
 */
function calculateStandardEfficiency(operator) {
  const baseEfficiency = operator.max_efficiency || 0;
  const baseRoomEfficiency = 0.05; // 训练室基础效率
  
  // 总共需要的训练时间（考虑效率加成）
  const totalHoursWithEfficiency = totalBaseHours / (1 + baseRoomEfficiency + baseEfficiency);
  
  // 计算对应的实际效率
  const actualEfficiency = (totalBaseHours / totalHoursWithEfficiency) - 1 - baseRoomEfficiency;
  
  return actualEfficiency;
}

/**
 * 计算左乐的实际专精效率
 * 左乐的特殊效果：武道达到上限时，下一次开始协助近卫干员训练专精技能至1级将立即完成
 * 武道上限为3，专精零->专精一累计1点；专精一->专精二累计2点；专精二->专精三累计3点
 * @returns {number} - 实际专精效率
 */
function calculateZuoleEfficiency(operator) {
  const baseEfficiency = operator.max_efficiency || 0;
  const baseRoomEfficiency = 0.05; // 训练室基础效率
  
  // 以下是一种可能的使用模式：先完成一次专精二到专精三，积累满武道，再进行一次专精零到专精一（立即完成）
  
  // 计算专精二到专精三所需时间
  const level3Hours = baseTrainingHours[3] / (1 + baseRoomEfficiency + baseEfficiency);
  
  // 专精零到专精一立即完成（时间为0）
  const level1Hours = 0;
  
  // 专精一到专精二正常时间
  const level2Hours = baseTrainingHours[2] / (1 + baseRoomEfficiency + baseEfficiency);
  
  // 总共需要的时间
  const totalHoursWithEfficiency = level1Hours + level2Hours + level3Hours;
  
  // 计算对应的实际效率
  const actualEfficiency = (totalBaseHours / totalHoursWithEfficiency) - 1 - baseRoomEfficiency;
  
  return actualEfficiency;
}

/**
 * 计算具有时间减半效果的干员的实际专精效率
 * 如艾丽妮、逻各斯的特殊效果：单次协助一名干员训练时长达5小时，则该名干员下次训练所需时间-50%
 * @param {Object} operator - 干员数据
 * @returns {number} - 实际专精效率
 */
function calculateTimeReductionEfficiency(operator) {
  const baseEfficiency = operator.max_efficiency || 0;
  const baseRoomEfficiency = 0.05; // 训练室基础效率
  const targetProfession = operator.conditions.target_profession || [];
  const timeReduction = 0.5; // 50%减半效果
  
  // 计算专精零到专精一所需时间（不适用减半效果，因为这是第一次训练）
  const level1Hours = baseTrainingHours[1] / (1 + baseRoomEfficiency + baseEfficiency);
  
  // 计算专精一到专精二所需时间（适用减半效果，因为之前的训练满足条件）
  const level2HoursBase = baseTrainingHours[2] / (1 + baseRoomEfficiency + baseEfficiency);
  const level2Hours = level2HoursBase * (1 - timeReduction);
  
  // 计算专精二到专精三所需时间（适用减半效果，因为之前的训练满足条件）
  const level3HoursBase = baseTrainingHours[3] / (1 + baseRoomEfficiency + baseEfficiency);
  const level3Hours = level3HoursBase * (1 - timeReduction);
  
  // 总共需要的时间
  const totalHoursWithEfficiency = level1Hours + level2Hours + level3Hours;
  
  // 计算对应的实际效率
  const actualEfficiency = (totalBaseHours / totalHoursWithEfficiency) - 1 - baseRoomEfficiency;
  
  return actualEfficiency;
}

/**
 * 计算特殊干员（如余）的实际专精效率
 * 具有特殊累积效果的干员
 * @param {Object} operator - 干员数据
 * @returns {number} - 实际专精效率
 */
function calculateSpecialOperatorEfficiency(operator) {
  if (operator.name === "余") {
    // 余的特殊效果：每1点人间烟火+1%专精效率，最多累计至70点
    const maxBonus = 0.7; // 人间烟火满时提供70%效率
    return operator.max_efficiency || maxBonus;
  } else if (operator.conditions.special) {
    // 其他具有special字段的干员按照max_efficiency计算
    return operator.max_efficiency;
  }
  
  return operator.max_efficiency;
}

/**
 * 获取干员效率计算的解释文本
 * @param {Object} operator - 干员数据
 * @returns {string} - 解释文本
 */
export function getEfficiencyExplanation(operator) {
  if (operator.name === "左乐") {
    return "左乐特殊效率计算：先完成一次专精二到专精三，积累满武道值，再进行一次专精零到专精一（立即完成），然后再正常完成专精一到专精二。";
  } else if (operator.name === "艾丽妮" || operator.name === "逻各斯") {
    return `${operator.name}特殊效率计算：完成专精零到专精一的训练后，下一次专精一到专精二和专精二到专精三的训练时间减半。`;
  } else if (operator.name === "余") {
    return "余特殊效率计算：基于人间烟火满值(70)时的效率计算。";
  } else if (operator.conditions.special) {
    return `${operator.name}特殊效率计算：基于${operator.conditions.special}。`;
  } else {
    return `${operator.name}效率计算：基于从专精零到专精三的全过程所需总时间。`;
  }
}

/**
 * 主效率计算函数
 * @param {Object} operator - 干员数据
 * @returns {number} - 实际专精效率
 */
export function calculateEfficiency(operator) {
  // 根据干员名称或特性选择不同的计算方法
  if (operator.name === "左乐") {
    return calculateZuoleEfficiency(operator);
  } else if (operator.conditions.time_effect) {
    return calculateTimeReductionEfficiency(operator);
  } else if (operator.name === "余" || operator.conditions.special) {
    return calculateSpecialOperatorEfficiency(operator);
  } else {
    return calculateStandardEfficiency(operator);
  }
}
