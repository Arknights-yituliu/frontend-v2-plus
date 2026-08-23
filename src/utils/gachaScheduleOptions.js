/**
 * 卡池排期定义数组
 * 每项定义了一个限定卡池的起止时间、类型、历史同期时间范围等信息，
 * 供攒抽计算器生成可选择的目标卡池列表
 */
const scheduleDefinitions = [
  {
    id: "p3r",
    name: "P3R联动",
    startDate: "2026-09-04",
    lastDrawDate: "2026-09-17",
    activityType: "联动限定",
    disabled: false,
    dailyGiftResources: true,
    accuracyFlag: false,              // 预测排期，会在 UI 中展示提示
  },
  {
    id: "thanksgiving",
    name: "感谢庆典",
    startDate: "2026-11-01",
    lastDrawDate: "2026-11-14",
    activityType: "周年限定",
    disabled: false,
    dailyGiftResources: true,
    accuracyFlag: false,
    dateString: "敬请期待",            // 自定义日期展示文字，覆盖自动生成的格式
  },
]

/**
 * 生成攒抽计算器的卡池选项列表
 * 将原始排期定义（scheduleDefinitions）中的日期字符串转为 Date 对象，
 * 并补充 dateString、start、end 等字段供 UI 使用
 *
 * @returns {Array<{
 *   id: string,                   // 卡池唯一标识
 *   name: string,                 // 卡池展示名称
 *   dateString: string,           // 日期范围展示文字，如 "(0801-0814)"
 *   start: Date,                  // 卡池开放日期（当天 00:00:00）
 *   end: Date,                    // 卡池结束日期（当天 23:59:59.999）
 *   activityType: string,         // 活动类型
 *   disabled: boolean,            // 是否禁用
 *   dailyGiftResources: boolean,  // 是否有每日赠送
 *   accuracyFlag: boolean,        // 是否为准确排期
 *   historyStartTime: Date|null,  // 历史同期礼包起始时间
 *   historyEndTime: Date|null     // 历史同期礼包结束时间
 * }>}
 */
export function createGachaScheduleOptions() {
  return scheduleDefinitions.map((schedule) => ({
    ...schedule,
    dateString: schedule.dateString || formatDateRange(schedule.startDate, schedule.lastDrawDate),
    start: createDayStart(schedule.startDate),
    end: createDayEnd(schedule.lastDrawDate),
    historyStartTime: schedule.historyStartDate ? createDayStart(schedule.historyStartDate) : null,
    historyEndTime: schedule.historyLastDrawDate ? createDayEnd(schedule.historyLastDrawDate) : null,
  }))
}

/**
 * 获取卡池计算的截止日期
 * 根据用户选择的计算模式（到卡池结束当天 / 到卡池开放当天）返回对应的截止日期时间
 *
 * @param {{ startDate: string, lastDrawDate: string }} schedule - 卡池排期对象
 * @param {boolean} calculateToPoolEnd - true 表示计算到卡池最后一天，false 表示计算到卡池开放当天
 * @returns {Date} 截止日期时间（当天 23:59:59.999）
 */
export function getScheduleCalculationEndDate(schedule, calculateToPoolEnd) {
  return createDayEnd(calculateToPoolEnd ? schedule.lastDrawDate : schedule.startDate)
}

/**
 * 计算某个奖励在计算周期内的有效天数
 * 用于计算「每日赠送单抽」和「每日赠送合成玉」这类按天累加的资源
 *
 * 有效天数 = min(奖励结束日, 计算截止日) - max(奖励起始日, 当前时间) + 1
 *
 * @param {{ start: number, end: number }} reward - 奖励的起始/结束时间戳
 * @param {number} currentTimestamp - 当前时间戳
 * @param {{ startDate: string, lastDrawDate: string }} schedule - 卡池排期
 * @param {boolean} calculateToPoolEnd - 是否计算到卡池结束当天
 * @returns {number} 有效天数，无重叠时返回 0
 */
export function getDailyRewardRemainingDays(reward, currentTimestamp, schedule, calculateToPoolEnd) {
  const rewardStartDay = createDayStart(new Date(reward.start))
  const rewardLastDay = createDayStart(new Date(reward.end))
  const currentDay = createDayStart(new Date(currentTimestamp))
  const calculationLastDay = createDayStart(
    calculateToPoolEnd ? schedule.lastDrawDate : schedule.startDate
  )

  // 奖励有效区间 = [rewardStart, rewardLast] ∩ [current, calculationLast]
  const firstAvailableDay = maxDate(rewardStartDay, currentDay)
  const lastAvailableDay = minDate(rewardLastDay, calculationLastDay)
  if (firstAvailableDay > lastAvailableDay) {
    return 0
  }

  // 包含头尾的天数 = 时间差(毫秒) / 86400000 + 1
  return Math.floor((lastAvailableDay - firstAvailableDay) / 86400000) + 1
}

/**
 * 判断某个奖励/礼包是否可在当前选定的时间段内获取
 * 条件：奖励结束日期 >= 当前日期 AND 奖励起始日期 <= 计算截止日期
 *
 * @param {{ start: number, end: number }} reward - 奖励的起始/结束时间戳
 * @param {number} currentTimestamp - 当前时间戳
 * @param {Date} calculationEnd - 计算截止日期
 * @returns {boolean} 是否可计入
 */
export function isRewardAvailableOnSelectedDates(reward, currentTimestamp, calculationEnd) {
  const currentDay = createDayStart(new Date(currentTimestamp))
  const calculationEndDay = createDayStart(new Date(calculationEnd))
  const rewardStartDay = createDayStart(new Date(reward.start))
  const rewardEndDay = createDayStart(new Date(reward.end))

  return rewardEndDay >= currentDay && rewardStartDay <= calculationEndDay
}

/**
 * 格式化活动排期的日期范围，用于 UI 展示
 * 根据输入是否为含时间的完整日期字符串，决定是否显示时分
 *
 * @param {string|number} start - 起始时间
 * @param {string|number} end - 结束时间
 * @returns {string} 格式化后的日期范围字符串，如 "2025/09/04 16:00 - 2025/09/18 04:01"
 */
export function formatActivityDateRange(start, end) {
  return `${formatActivityDate(start)} - ${formatActivityDate(end)}`
}

/**
 * 创建当天 00:00:00 的 Date 对象
 * 去除日期中的时分秒部分，仅保留年/月/日，用于日期边界比较
 *
 * @param {Date|string} dateInput - 日期对象或日期字符串
 * @returns {Date} 当天 00:00:00 的 Date 对象
 */
function createDayStart(dateInput) {
  if (dateInput instanceof Date) {
    return new Date(dateInput.getFullYear(), dateInput.getMonth(), dateInput.getDate())
  }

  // 传入字符串时，用 T00:00:00 确保总是以本地时区的 0 点解析
  return new Date(`${dateInput}T00:00:00`)
}

/**
 * 创建当天 23:59:59.999 的 Date 对象
 * 在 createDayStart 基础上加上一天的末尾时间，用于代表"截止到本日结束"
 *
 * @param {Date|string} dateInput - 日期对象或日期字符串
 * @returns {Date} 当天 23:59:59.999 的 Date 对象
 */
function createDayEnd(dateInput) {
  const date = createDayStart(dateInput)
  date.setHours(23, 59, 59, 999)
  return date
}

/**
 * 格式化卡池日期范围为简短字符串，如 "(0801-0814)"
 * 用于卡池选项按钮上的副标题展示
 *
 * @param {string} startDate - 起始日期，如 "2026-08-01"
 * @param {string} lastDrawDate - 结束日期，如 "2026-08-14"
 * @returns {string} 格式化结果，如 "(0801-0814)"
 */
function formatDateRange(startDate, lastDrawDate) {
  return `(${formatMonthDay(startDate)}-${formatMonthDay(lastDrawDate)})`
}

/**
 * 从完整日期字符串中提取 MM-DD 格式的部分
 * 如 "2026-08-14" → "0814"
 *
 * @param {string} dateString - 完整日期字符串
 * @returns {string} 提取后的"月日"字符串
 */
function formatMonthDay(dateString) {
  return dateString.slice(5).replace("-", "")
}

/**
 * 将 Date 对象格式化为 yyyy/MM/dd 格式
 *
 * @param {Date} date - 日期对象
 * @returns {string} 格式化后的日期字符串
 */
function formatDateOnly(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}/${month}/${day}`
}

/**
 * 格式化活动日期显示
 * 如果输入是纯日期字符串（不含时间部分），只返回日期；
 * 如果含时间部分（如 "2025/09/04 16:00"），则同时显示日期和时间
 *
 * @param {string|number} input - 日期字符串或时间戳
 * @returns {string} 格式化结果，如 "2025/09/04" 或 "2025/09/04 16:00"
 */
function formatActivityDate(input) {
  const date = new Date(input)
  const dateOnly = formatDateOnly(date)

  // 检测输入是否包含具体时间（时:分）
  if (typeof input === "string" && !/\s\d{1,2}:\d{2}/.test(input)) {
    return dateOnly
  }

  const hour = String(date.getHours()).padStart(2, "0")
  const minute = String(date.getMinutes()).padStart(2, "0")
  return `${dateOnly} ${hour}:${minute}`
}

/**
 * 返回两个日期中较大的一个
 *
 * @param {Date} left - 左值
 * @param {Date} right - 右值
 * @returns {Date} 较晚的日期
 */
function maxDate(left, right) {
  return left > right ? left : right
}

/**
 * 返回两个日期中较小的一个
 *
 * @param {Date} left - 左值
 * @param {Date} right - 右值
 * @returns {Date} 较早的日期
 */
function minDate(left, right) {
  return left < right ? left : right
}
