const scheduleDefinitions = [
  {
    id: "summer",
    name: "夏活",
    startDate: "2026-08-01",
    lastDrawDate: "2026-08-14",
    activityType: "夏活限定",
    disabled: false,
    dailyGiftResources: true,
    accuracyFlag: true,
    historyStartDate: "2025-08-01",
    historyLastDrawDate: "2025-08-14",
  },
  {
    id: "p3r",
    name: "P3R联动",
    startDate: "2026-09-04",
    lastDrawDate: "2026-09-17",
    activityType: "联动限定",
    disabled: false,
    dailyGiftResources: true,
    accuracyFlag: false,
  },
  {
    id: "thanksgiving",
    name: "感谢庆典",
    startDate: "2026-11-01",
    lastDrawDate: "2026-11-14",
    activityType: "周年限定",
    disabled: true,
    dailyGiftResources: true,
    accuracyFlag: false,
    dateString: "敬请期待",
  },
]

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

export function getScheduleCalculationEndDate(schedule, calculateToPoolEnd) {
  return createDayEnd(calculateToPoolEnd ? schedule.lastDrawDate : schedule.startDate)
}

export function getDailyRewardRemainingDays(reward, currentTimestamp, schedule, calculateToPoolEnd) {
  const rewardStartDay = createDayStart(new Date(reward.start))
  const rewardLastDay = createDayStart(new Date(reward.end))
  const currentDay = createDayStart(new Date(currentTimestamp))
  const calculationLastDay = createDayStart(
    calculateToPoolEnd ? schedule.lastDrawDate : schedule.startDate
  )

  const firstAvailableDay = maxDate(rewardStartDay, currentDay)
  const lastAvailableDay = minDate(rewardLastDay, calculationLastDay)
  if (firstAvailableDay > lastAvailableDay) {
    return 0
  }

  return Math.floor((lastAvailableDay - firstAvailableDay) / 86400000) + 1
}

export function isRewardAvailableOnSelectedDates(reward, currentTimestamp, calculationEnd) {
  const currentDay = createDayStart(new Date(currentTimestamp))
  const calculationEndDay = createDayStart(new Date(calculationEnd))
  const rewardStartDay = createDayStart(new Date(reward.start))
  const rewardEndDay = createDayStart(new Date(reward.end))

  return rewardEndDay >= currentDay && rewardStartDay <= calculationEndDay
}

export function formatActivityDateRange(start, end) {
  return `${formatActivityDate(start)} - ${formatActivityDate(end)}`
}

function createDayStart(dateInput) {
  if (dateInput instanceof Date) {
    return new Date(dateInput.getFullYear(), dateInput.getMonth(), dateInput.getDate())
  }

  return new Date(`${dateInput}T00:00:00`)
}

function createDayEnd(dateInput) {
  const date = createDayStart(dateInput)
  date.setHours(23, 59, 59, 999)
  return date
}

function formatDateRange(startDate, lastDrawDate) {
  return `(${formatMonthDay(startDate)}-${formatMonthDay(lastDrawDate)})`
}

function formatMonthDay(dateString) {
  return dateString.slice(5).replace("-", "")
}

function formatDateOnly(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}/${month}/${day}`
}

function formatActivityDate(input) {
  const date = new Date(input)
  const dateOnly = formatDateOnly(date)

  if (typeof input === "string" && !/\s\d{1,2}:\d{2}/.test(input)) {
    return dateOnly
  }

  const hour = String(date.getHours()).padStart(2, "0")
  const minute = String(date.getMinutes()).padStart(2, "0")
  return `${dateOnly} ${hour}:${minute}`
}

function maxDate(left, right) {
  return left > right ? left : right
}

function minDate(left, right) {
  return left < right ? left : right
}
