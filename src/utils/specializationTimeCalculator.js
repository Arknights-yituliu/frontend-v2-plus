/**
 * 专精时间计算工具函数
 */

/**
 * 计算专精所需时间
 * @param {Object} params - 计算参数
 * @param {number} params.baseHours - 基础专精时间（小时）
 * @param {number} params.efficiency - 效率加成（小数形式，如0.3表示30%）
 * @param {boolean} params.hasAscalon - 是否有阿斯卡纶/烛煌入驻控制中枢
 * @param {boolean} params.halfTimeEffect - 是否应用时间减半效果
 * @returns {number} 计算后的专精时间（小时）
 */
export function calculateSpecializationTime(params) {
  const { baseHours, efficiency, hasAscalon = false, halfTimeEffect = false } = params;
  
  // 额外效率，已包含训练室基础效率(0.05)和阿斯卡纶/烛煌效率(0.05)
  const extraEfficiency = 0.05 + (hasAscalon ? 0.05 : 0);
  
  // 计算总效率
  const totalEfficiency = 1 + efficiency + extraEfficiency;
  
  // 计算专精时间
  let time = baseHours / totalEfficiency;
  
  // 如果应用减半效果
  if (halfTimeEffect) {
    time *= 0.5;
  }
  
  return time;
}

/**
 * 计算减半干员替换时间点
 * @param {Object} params - 计算参数
 * @param {number} params.baseHours - 基础专精时间（小时）
 * @param {number} params.currentEfficiency - 当前效率加成
 * @param {number} params.halfOperatorEfficiency - a减半干员效率加成
 * @param {boolean} params.hasAscalon - 是否有阿斯卡纶/烛煌入驻控制中枢
 * @param {number} params.leadTimeMinutes - 提前多少分钟替换（默认5分钟）
 * @returns {Object} 包含替换时间点信息
 */
export function calculateSwitchTime(params) {
  const { 
    baseHours, 
    currentEfficiency, 
    halfOperatorEfficiency, 
    hasAscalon = false, 
    leadTimeMinutes = 5 
  } = params;
  
  // 额外效率
  const extraEfficiency = 0.05 + (hasAscalon ? 0.05 : 0);
  
  // 当前总效率
  const nowEfficiency = 1 + currentEfficiency + extraEfficiency;
  
  // 减半干员总效率
  const halfOpTotalEfficiency = 1 + halfOperatorEfficiency + extraEfficiency;
  
  // 换算为秒
  const baseSeconds = baseHours * 3600;
  const remainSeconds = baseSeconds / nowEfficiency;
  
  // 计算零效率下剩余的总秒数
  const zeroEffRemainSeconds = remainSeconds * nowEfficiency;
  
  // 零效率下，减半干员需要的秒数（5小时）
  const zeroEffNeedTime = 5 * 3600;
  
  // 同效率秒差
  let timeDifference = zeroEffRemainSeconds - zeroEffNeedTime;
  
  // 补上已有的效率加成条件
  timeDifference /= nowEfficiency;
  
  // 计算余裕时间秒数
  const ampleTime = timeDifference - (leadTimeMinutes * 60);
  
  return {
    // 替换时间点（从当前时间开始计算，单位为秒）
    switchTimeSeconds: ampleTime > 0 ? ampleTime : 0,
    // 是否有足够的余裕时间
    hasAmpleTime: ampleTime > 0,
    // 是否已晚于极限触发时间点
    isTooLate: timeDifference <= 0,
    // 实际余裕时间（分钟）
    ampleTimeMinutes: Math.floor(ampleTime / 60)
  };
}

/**
 * 获取专精所需基础时间（小时）
 * @param {number} level - 专精等级（1-3）
 * @returns {number} 基础专精时间（小时）
 */
export function getBaseHours(level) {
  const baseHours = {
    1: 8,
    2: 16,
    3: 24
  };
  
  return baseHours[level] || 0;
}

/**
 * 格式化时间为小时分钟格式
 * @param {number} hours - 小时数（可以是小数）
 * @returns {string} 格式化的时间字符串
 */
export function formatSpecializationTime(hours) {
  if (hours <= 0) return '0小时';
  
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  
  if (minutes === 0) {
    return `${wholeHours}小时`;
  } else if (wholeHours === 0) {
    return `${minutes}分钟`;
  } else {
    return `${wholeHours}小时${minutes}分钟`;
  }
} 