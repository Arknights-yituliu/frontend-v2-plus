/**
 * 干员时装持有数据 · 静态表拼装
 *
 * <p>统计接口只返回 {@code skinId / own / totalAccounts} 三个字段，页面需要的时装名、干员、系列、
 * 获取方式、上线时间全部来自站内静态表。所有函数都是纯函数（不依赖 Vue），方便单独跑脚本核对口径。</p>
 *
 * <p>口径：持有率 = {@code own / totalAccounts}，分母是本轮参与统计的账号总数，
 * 同一轮内每条记录取到同一个值；静态表里有、但本轮没有任何账号拥有的时装不会出现在接口结果里，
 * 这类记录按 own = 0 补齐，保证「全部时装」表是完整的一览而不是残缺列表。</p>
 */

import skinTableRaw from '/src/static/json/operator/skin_table_simple.json'
import operatorTableRaw from '/src/static/json/operator/character_table_simple.v2.json'
import PROFESSION_DICT from '/src/static/json/operator/profession_dict.json'

/* ---------------- 常量 ---------------- */

/**
 * 干员星级配色：与站内材料格子的分档保持一致（6 橙 / 5 金 / 4 紫 / 3 蓝 / 2 绿 / 1 灰白）
 * 0 用于静态表里查不到干员的兜底情况
 */
const RARITY_COLORS = {
  6: '#E8773C',
  5: '#D9A300',
  4: '#A855C8',
  3: '#2E9BE6',
  2: '#46A85A',
  1: '#7C848E',
  0: '#9AA0A6',
}

/** 获取渠道分组：静态表里的 obtainApproach 取值很碎，页面上归成 6 类 */
const CHANNELS = [
  {key: 'shop', label: '商城上架', color: '#2E9BE6'},
  {key: 'free', label: '商城零元购', color: '#E2593F'},
  {key: 'event', label: '活动产出', color: '#A855C8'},
  {key: 'gameplay', label: '玩法产出', color: '#46A85A'},
  {key: 'exchange', label: '兑换 · 礼包', color: '#D9A300'},
  {key: 'other', label: '其他来源', color: '#9AA0A6'},
]

/** obtainApproach 原文 → 渠道 key。未列出的取值统一落到 other，页面会把它显示成「其他来源」 */
const APPROACH_CHANNEL = new Map([
  ['采购中心', 'shop'],
  ['采购中心、兑换码获得', 'exchange'],
  ['活动获得', 'event'],
  ['活动赠送', 'event'],
  ['集成战略', 'gameplay'],
  ['生息演算', 'gameplay'],
  ['任务奖励', 'gameplay'],
  ['特典获得', 'exchange'],
  ['设定集兑换码兑换', 'exchange'],
  ['线下礼包获得', 'exchange'],
])

/**
 * 按 skinId 单独指定渠道的特例表，优先级高于 obtainApproach 映射
 *
 * <p>静态表只给到获取方式的原文，区分不了「同一个渠道、不同的付钱方式」。
 * 判定零元购的特征是：obtainApproach 写「采购中心」，但 displayTagId 是「活动获得」——
 * 即活动期间挂在商城 0 元领取，直接归到商城上架会和源石买的时装混在一起。
 * 全表符合该特征的就是下面两件，以后遇到同类时装往这里加一行即可。</p>
 */
const SKIN_CHANNEL_OVERRIDE = new Map([
  ['char_123_fang@winter#1', 'free'], // 十字郡（芬）
  ['char_120_hibisc@nian#1', 'free'], // 守岁人（芙蓉）
])

const CHANNEL_BY_KEY = new Map(CHANNELS.map(channel => [channel.key, channel]))

/** 职业中文名：profession_dict 是树形结构，这里只取一级目录 */
const PROFESSION_LABELS = new Map(PROFESSION_DICT.map(item => [item.value, item.label]))

const SKIN_TABLE = Object.values(skinTableRaw || {})

/* ---------------- 小工具 ---------------- */

function toNumber(value) {
  const num = Number(value)
  return Number.isFinite(num) ? num : 0
}

/** 文案字段里带 <color name=#ffffff> 之类的富文本标签与 CRLF，统一洗成纯文本；顺带去掉首行的限定角标 */
function stripTags(text) {
  return String(text || '')
      .replace(/<[^>]+>/g, '')
      .replace(/\r\n?/g, '\n')
      .replace(/^[ \t]*LIMITED[ \t]+EDITION[ \t]*\n?/i, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
}

/** 系列名形如「珊瑚海岸/VI」，去掉罗马数字后缀后同一套系列会聚在一起 */
function resolveSeriesName(groupName) {
  const full = String(groupName || '').trim()
  if (!full) {
    return {full: '未归类', base: '未归类'}
  }
  const base = full.split('/')[0].trim() || full
  return {full, base}
}

/**
 * 解析时装的获取渠道
 * @param {string} approach 静态表里的 obtainApproach 原文
 * @param {string} skinId 时装 ID，用于查特例表
 * @returns {{key: string, label: string, color: string}}
 */
function resolveChannel(approach, skinId) {
  const key = SKIN_CHANNEL_OVERRIDE.get(skinId) || APPROACH_CHANNEL.get(approach) || 'other'
  return CHANNEL_BY_KEY.get(key) || CHANNELS[CHANNELS.length - 1]
}

/**
 * 干员星级配色
 * @param {number} rarity 星级（1-6，0 为未知）
 * @returns {string} 十六进制色值
 */
function rarityColor(rarity) {
  return RARITY_COLORS[rarity] ?? RARITY_COLORS[0]
}

/* ---------------- 拼装 ---------------- */

/**
 * 把接口统计结果与静态表拼成页面用的记录数组
 *
 * @param {Array<{skinId: string, own: number, totalAccounts: number}>} statRows 接口返回的统计结果
 * @returns {{records: Array<Object>, sampleAccounts: number, statCount: number}}
 *   - records：按持有率降序、同率按拥有数降序、再按上线时间降序排列
 *   - sampleAccounts：本轮参与统计的账号总数（取所有记录里的最大值）
 *   - statCount：接口实际返回的记录条数（有持有记录的时装数）
 */
function buildSkinRecords(statRows) {
  const statMap = new Map()
  let sampleAccounts = 0

  for (const row of Array.isArray(statRows) ? statRows : []) {
    const skinId = String(row?.skinId || '').trim()
    if (!skinId) {
      continue
    }
    const own = toNumber(row?.own)
    const total = toNumber(row?.totalAccounts)
    statMap.set(skinId, {own, total})
    if (total > sampleAccounts) {
      sampleAccounts = total
    }
  }

  const records = SKIN_TABLE.map(raw => {
    const display = raw?.displaySkin || {}
    const skinId = String(raw?.skinId || '')
    const charId = String(raw?.charId || skinId.split('@')[0])
    const operator = operatorTableRaw?.[charId] || {}
    const stat = statMap.get(skinId)
    const own = stat ? stat.own : 0
    const total = stat && stat.total > 0 ? stat.total : sampleAccounts
    const series = resolveSeriesName(display.skinGroupName)
    const approach = String(display.obtainApproach || '').trim() || '未知'
    const channel = resolveChannel(approach, skinId)
    const getTime = toNumber(display.getTime)
    const rarity = Number.isFinite(Number(operator.rarity)) ? Number(operator.rarity) : 0

    return {
      skinId,
      name: String(display.skinName || '').trim() || skinId,
      seriesName: series.full,
      seriesBase: series.base,
      charId,
      charName: String(operator.name || charId),
      rarity,
      rarityColor: rarityColor(rarity),
      professionLabel: PROFESSION_LABELS.get(operator.profession) || '未知职业',
      approach,
      channelKey: channel.key,
      channelLabel: channel.label,
      channelColor: channel.color,
      tag: String(display.displayTagId || '').trim(),
      description: stripTags(display.content),
      releaseTime: getTime > 0 ? getTime * 1000 : 0,
      own,
      totalAccounts: total,
      rate: total > 0 ? own / total : 0,
      hasData: own > 0,
    }
  })

  records.sort((a, b) => {
    if (b.rate !== a.rate) {
      return b.rate - a.rate
    }
    if (b.own !== a.own) {
      return b.own - a.own
    }
    return b.releaseTime - a.releaseTime
  })

  return {records, sampleAccounts, statCount: statMap.size}
}

/**
 * 页面顶部指标
 * @param {Array<Object>} records buildSkinRecords 产出的记录
 * @returns {{total: number, avgRate: number, topSkin: Object|null, seriesCount: number}}
 */
function summarize(records) {
  const total = records.length
  const rateSum = records.reduce((sum, record) => sum + record.rate, 0)
  const seriesSet = new Set(records.map(record => record.seriesBase))

  return {
    total,
    avgRate: total ? rateSum / total : 0,
    topSkin: records.length ? records[0] : null,
    seriesCount: seriesSet.size,
  }
}

export {
  CHANNELS,
  buildSkinRecords,
  summarize,
}
