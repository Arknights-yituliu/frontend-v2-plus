<script setup>
import '/src/assets/css/survey/skin-statistics.scss'
import {computed, onMounted, onUnmounted, ref, watch} from 'vue'
import {match} from 'pinyin-pro'
import {dateFormat} from '/src/utils/dateUtil.js'
import {getOperatorAvatarStyle, getOperatorAvatarUrl, getSkinAvatarUrl, getSkinPortraitUrl} from '/src/utils/arknightsResource.js'
import {getAkSkinStatisticsResult} from '/src/api/user-center/skinStatistics.js'
import {
  CHANNELS,
  buildSkinRecords,
  summarize,
} from '/src/utils/skinStatistics.js'

/* ---------------- 常量 ---------------- */

const RANK_METRICS = [
  {key: 'rate', label: '持有率'},
  {key: 'releaseTime', label: '最新上线'},
]

const PAGE_SIZE = 30

/* ---------------- 状态 ---------------- */

const records = ref([])
const sampleAccounts = ref(0)
const statCount = ref(0)
const loading = ref(true)
const loadError = ref('')

const rankMetric = ref('rate')
const rankLimit = ref(12)

const keyword = ref('')
/*
 * 四行筛选（星级 / 年份 / 系列 / 渠道）各自可以多选：
 * 空数组 = 该行不设限（等价于「全部」），行与行之间是「且」的关系
 */
const rarityFilter = ref([])
const yearFilter = ref([])
const seriesFilter = ref([])
const channelFilter = ref([])
const sortKey = ref('rate')
const sortDir = ref('desc')
const visibleCount = ref(PAGE_SIZE)

const notesOpen = ref(false)
const drawerSkin = ref(null)

let requestSeq = 0

/* ---------------- 派生数据 ---------------- */

const summary = computed(() => summarize(records.value))

/* 参与排行的渠道：商城上架 + 兑换礼包。活动赠送、集成战略、商城零元购这类渠道获取门槛完全不同，混进来比持有率没有可比性 */
const RANK_CHANNELS = ['shop', 'exchange']

const rankPool = computed(() => records.value.filter(item => RANK_CHANNELS.includes(item.channelKey)))
const rankPoolTotal = computed(() => rankPool.value.length)
const topSkin = computed(() => (sampleAccounts.value > 0 ? rankPool.value[0] || null : null))

const sampleText = computed(() => (sampleAccounts.value > 0 ? formatInt(sampleAccounts.value) : '—'))

/* 封面数字 */
const coverFigures = computed(() => {
  const data = summary.value
  return [
    {key: 'sample', value: sampleAccounts.value > 0 ? formatInt(sampleAccounts.value) : '—', label: '样本账号'},
    {key: 'total', value: formatInt(data.total), label: '收录时装'},
    {key: 'series', value: formatInt(data.seriesCount), label: '时装系列'},
  ]
})

const rankRows = computed(() => {
  const list = rankPool.value.filter(item => item.hasData)
  return [...list]
      .sort((a, b) => {
        const diff = rankValue(b) - rankValue(a)
        return diff !== 0 ? diff : b.rate - a.rate
      })
      .slice(0, rankLimit.value)
})

/* 筛选标签直接由数据里的实际取值生成，避免出现筛不到东西的空档位 */
const rarityChips = computed(() => {
  const counts = new Map()
  for (const item of records.value) {
    counts.set(item.rarity, (counts.get(item.rarity) || 0) + 1)
  }
  return [
    {value: 'all', label: '全部'},
    ...[...counts.entries()]
        .filter(([rarity]) => rarity > 0)
        .sort((a, b) => b[0] - a[0])
        .map(([rarity]) => ({value: rarity, label: `${rarity}★ 干员`})),
  ]
})

const channelChips = computed(() => {
  const present = new Set(records.value.map(item => item.channelKey))
  return [
    {value: 'all', label: '全部渠道'},
    ...CHANNELS.filter(channel => present.has(channel.key)).map(channel => ({
      value: channel.key,
      label: channel.label,
    })),
  ]
})

/* 年份取上线时间的年，新的排前面 */
const yearChips = computed(() => {
  const counts = new Map()
  for (const item of records.value) {
    if (!item.releaseTime) {
      continue
    }
    const year = new Date(item.releaseTime).getFullYear()
    counts.set(year, (counts.get(year) || 0) + 1)
  }
  return [
    {value: 'all', label: '全部年份'},
    ...[...counts.keys()]
        .sort((a, b) => b - a)
        .map(year => ({value: year, label: `${year} 年`})),
  ]
})

/* 系列取归并后的主系列名（去掉罗马数字分卷），件数多的排前面 */
const seriesChips = computed(() => {
  const counts = new Map()
  for (const item of records.value) {
    counts.set(item.seriesBase, (counts.get(item.seriesBase) || 0) + 1)
  }
  return [
    {value: 'all', label: '全部系列'},
    ...[...counts.entries()]
        .sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0], 'zh-CN'))
        .map(([name]) => ({value: name, label: name})),
  ]
})

const filteredRows = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  let list = records.value

  if (kw) {
    list = list.filter(item => {
      const name = item.name.toLowerCase()
      const charName = item.charName.toLowerCase()
      return name.includes(kw)
          || charName.includes(kw)
          || item.skinId.toLowerCase().includes(kw)
          || item.seriesName.toLowerCase().includes(kw)
          || match(item.name, keyword.value.trim())
          || match(item.charName, keyword.value.trim())
    })
  }
  if (rarityFilter.value.length) {
    list = list.filter(item => rarityFilter.value.includes(item.rarity))
  }
  if (yearFilter.value.length) {
    list = list.filter(item => yearFilter.value.includes(releaseYear(item)))
  }
  if (seriesFilter.value.length) {
    list = list.filter(item => seriesFilter.value.includes(item.seriesBase))
  }
  if (channelFilter.value.length) {
    list = list.filter(item => channelFilter.value.includes(item.channelKey))
  }

  const factor = sortDir.value === 'asc' ? 1 : -1
  return [...list].sort((a, b) => {
    if (sortKey.value === 'name') {
      return a.name.localeCompare(b.name, 'zh-CN') * factor
    }
    const left = Number(a[sortKey.value]) || 0
    const right = Number(b[sortKey.value]) || 0
    return (left - right) * factor
  })
})

const visibleRows = computed(() => filteredRows.value.slice(0, visibleCount.value))
const filterActive = computed(
    () => keyword.value.trim() !== ''
        || rarityFilter.value.length > 0
        || yearFilter.value.length > 0
        || seriesFilter.value.length > 0
        || channelFilter.value.length > 0,
)

/* 抽屉里只补一句该系列共几件，不再给系列平均值 */
const drawerSeriesCount = computed(() => {
  if (!drawerSkin.value) {
    return 0
  }
  return records.value.filter(item => item.seriesBase === drawerSkin.value.seriesBase).length
})

/* ---------------- 格式化 ---------------- */

function formatInt(value) {
  return Number(value || 0).toLocaleString('zh-CN')
}

function formatPct(rate, digits = 1) {
  const pct = (Number(rate) || 0) * 100
  if (pct > 0 && pct < 0.1) {
    return '<0.1%'
  }
  return `${pct.toFixed(digits)}%`
}

function pctWidth(rate) {
  return `${Math.max(0, Math.min(100, (Number(rate) || 0) * 100)).toFixed(2)}%`
}

function formatDate(timestamp) {
  if (!timestamp) {
    return '—'
  }
  return dateFormat(new Date(timestamp), 'yyyy-MM-dd')
}

/* 年份筛选用的取值：没有上线时间的记 0，永远匹配不到具体年份 */
function releaseYear(item) {
  return item.releaseTime ? new Date(item.releaseTime).getFullYear() : 0
}

/* 排行卡片副标题里的年份；静态表缺上线时间时退回占位符 */
function skinYear(item) {
  const year = releaseYear(item)
  return year > 0 ? `${year} 年` : '未知'
}

function avatarUrl(charId) {
  return getOperatorAvatarUrl(charId)
}

/* 表格里的小头像用该套时装自己的方形头像，取不到时退回干员默认头像 */
function skinAvatarUrl(item) {
  return getSkinAvatarUrl(item?.skinId) || avatarUrl(item?.charId)
}

function onAvatarError(event, item) {
  const img = event?.target
  if (!img || img.dataset.avatarFallback === '1') {
    return
  }
  img.dataset.avatarFallback = '1'
  img.src = avatarUrl(item?.charId)
}

/* 立绘取不到（新时装资源还没生成）时退回方形头像，只退一次，避免死循环 */
function skinArtUrl(item) {
  return getSkinPortraitUrl(item?.skinId) || avatarUrl(item?.charId)
}

function onArtError(event, item) {
  const img = event?.target
  if (!img || img.dataset.artFallback === '1') {
    return
  }
  img.dataset.artFallback = '1'
  img.classList.add('is-avatar')
  img.src = avatarUrl(item?.charId)
}

function avatarStyle(item, size = 32) {
  return getOperatorAvatarStyle({
    size,
    mobileSize: Math.max(22, size - 4),
    rarity: item.rarity,
    bordered: true,
  })
}

function toneStyle(item) {
  return {'--r': item.rarityColor}
}

/* ---------------- 排行 ---------------- */

function rankValue(item) {
  if (rankMetric.value === 'releaseTime') {
    return item.releaseTime
  }
  return item.rate
}

function rankMain(item) {
  if (rankMetric.value === 'releaseTime') {
    return dateFormat(new Date(item.releaseTime), 'yyyy.MM')
  }
  return formatPct(item.rate)
}

function rankSub(item) {
  if (rankMetric.value === 'releaseTime') {
    return formatPct(item.rate)
  }
  return `${formatInt(item.own)} 人拥有`
}

/* ---------------- 表格交互 ---------------- */

function toggleSort(key) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'desc' ? 'asc' : 'desc'
    return
  }
  sortKey.value = key
  sortDir.value = 'desc'
}

function sortIcon(key) {
  if (sortKey.value !== key) {
    return 'mdi-unfold-more-horizontal'
  }
  return sortDir.value === 'desc' ? 'mdi-chevron-down' : 'mdi-chevron-up'
}

function resetFilters() {
  keyword.value = ''
  rarityFilter.value = []
  yearFilter.value = []
  seriesFilter.value = []
  channelFilter.value = []
}

/**
 * 筛选 chip 的选中态：value 为 all 时看该行是否还没有任何选中项
 * @param {Array<string|number>} selection 该行已选中的取值
 * @param {string|number} value chip 的取值
 * @returns {boolean}
 */
function isChipActive(selection, value) {
  return value === 'all' ? selection.length === 0 : selection.includes(value)
}

/** 点「全部」清空该行，其余 chip 点一下加入、再点一下取消，多选之间取并集 */
function pickChip(selection, value) {
  if (value === 'all') {
    return []
  }
  return selection.includes(value)
      ? selection.filter(item => item !== value)
      : [...selection, value]
}

function toggleRarity(value) {
  rarityFilter.value = pickChip(rarityFilter.value, value)
}

function toggleYear(value) {
  yearFilter.value = pickChip(yearFilter.value, value)
}

function toggleSeries(value) {
  seriesFilter.value = pickChip(seriesFilter.value, value)
}

function toggleChannel(value) {
  channelFilter.value = pickChip(channelFilter.value, value)
}

function exportCsv() {
  const header = ['时装', '干员', '星级', '系列', '获取方式', '上线日期', '拥有账号', '持有率']
  const rows = filteredRows.value.map(item => [
    item.name,
    item.charName,
    item.rarity > 0 ? `${item.rarity}★` : '未知',
    item.seriesName,
    item.approach,
    formatDate(item.releaseTime),
    item.own,
    formatPct(item.rate, 2),
  ])
  const csv = [header, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\r\n')
  const blob = new Blob(['\uFEFF' + csv], {type: 'text/csv;charset=utf-8'})
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `干员时装持有统计_${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

/* ---------------- 抽屉 ---------------- */

function openSkin(item) {
  drawerSkin.value = item
}

function closeDrawer() {
  drawerSkin.value = null
}

function onKeydown(event) {
  if (event.key === 'Escape' && drawerSkin.value) {
    closeDrawer()
  }
}

/* ---------------- 数据 ---------------- */

async function load() {
  const seq = ++requestSeq
  loading.value = true
  loadError.value = ''
  try {
    const rows = await getAkSkinStatisticsResult()
    if (seq !== requestSeq) {
      return
    }
    const built = buildSkinRecords(rows)
    records.value = built.records
    sampleAccounts.value = built.sampleAccounts
    statCount.value = built.statCount
  } catch (error) {
    if (seq !== requestSeq) {
      return
    }
    loadError.value = error?.msg || error?.message || '统计数据获取失败，请稍后重试'
  } finally {
    if (seq === requestSeq) {
      loading.value = false
    }
  }
}

watch([keyword, rarityFilter, yearFilter, seriesFilter, channelFilter, sortKey, sortDir], () => {
  visibleCount.value = PAGE_SIZE
})

onMounted(() => {
  load()
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div class="sk-page">
    <!-- 封面 -->
    <header class="sk-cover">
      <div class="sk-cover__main">
        <div class="sk-kicker">
          ARKNIGHTS / SKIN ARCHIVE
          <span class="sk-kicker__dot"></span>
          VOL. 01
        </div>

        <h1 class="sk-cover__title">
          干员时装<span class="sk-cover__titleAccent">大数据</span>
        </h1>

        <div class="sk-figures">
          <div v-for="figure in coverFigures" :key="figure.key" class="sk-figure">
            <span class="sk-figure__value">{{ figure.value }}</span>
            <span class="sk-figure__label">{{ figure.label }}</span>
          </div>
        </div>
      </div>

      <aside class="sk-cover__aside">
        <figure v-if="topSkin" class="sk-heroCard">
          <div class="sk-heroCard__media" :style="toneStyle(topSkin)">
            <span class="sk-heroCard__no">Nº 01</span>
            <img class="sk-heroCard__img" :src="skinArtUrl(topSkin)" alt=""
                 @error="onArtError($event, topSkin)">
          </div>
          <figcaption class="sk-heroCard__caption">
            <span class="sk-heroCard__series">{{ topSkin.seriesName }}</span>
            <h2 class="sk-heroCard__name">{{ topSkin.name }}</h2>
            <div class="sk-heroCard__line">
              <span>{{ topSkin.charName }} · {{ topSkin.rarity }}★ · {{ topSkin.channelLabel }}</span>
              <strong>{{ formatPct(topSkin.rate) }}</strong>
            </div>
          </figcaption>
        </figure>

        <div v-else class="sk-heroCard is-empty">
          <div class="sk-heroCard__media" style="--r:#c9ccd2">
            <span class="sk-heroCard__no">Nº 01</span>
          </div>
          <figcaption class="sk-heroCard__caption">
            <span class="sk-heroCard__series">暂无封面</span>
            <h2 class="sk-heroCard__name">{{ loading ? '同步中' : '还没有持有记录' }}</h2>
          </figcaption>
        </div>
      </aside>
    </header>

    <div v-if="loadError" class="sk-alert">
      <span class="mdi mdi-alert-circle-outline"/>
      <span>{{ loadError }}</span>
      <button class="sk-ghost sk-ghost--sm" type="button" @click="load">重试</button>
    </div>

    <!-- 01 排行 -->
    <section class="sk-section">
      <div class="sk-section__head">
        <span class="sk-index">01</span>
        <h2 class="sk-section__title">持有率排行</h2>
        <span class="sk-section__note">商城 + 兑换礼包 · {{ formatInt(rankPoolTotal) }} 件</span>
        <div class="sk-tabs">
          <button
              v-for="metric in RANK_METRICS"
              :key="metric.key"
              class="sk-tab"
              :class="{'is-active': rankMetric === metric.key}"
              type="button"
              @click="rankMetric = metric.key"
          >{{ metric.label }}
          </button>
        </div>
      </div>

      <div v-if="loading && !records.length" class="sk-strip">
        <article v-for="n in 6" :key="n" class="sk-tile is-skeleton">
          <div class="sk-tile__media"><span class="sk-skeleton" style="width:100%;height:100%"/></div>
          <div class="sk-tile__meta">
            <span class="sk-skeleton" style="height:12px;width:70%"/>
            <span class="sk-skeleton" style="height:10px;width:45%"/>
          </div>
        </article>
      </div>

      <div v-else-if="rankRows.length" class="sk-strip" tabindex="0" aria-label="持有率排行，可横向滚动">
        <article
            v-for="(row, index) in rankRows"
            :key="row.skinId"
            class="sk-tile"
            @click="openSkin(row)"
        >
          <div class="sk-tile__media" :style="toneStyle(row)">
            <span class="sk-tile__no">{{ String(index + 1).padStart(2, '0') }}</span>
            <img class="sk-tile__img" :src="skinArtUrl(row)" alt=""
                 loading="lazy" @error="onArtError($event, row)">
          </div>
          <div class="sk-tile__meta">
            <span class="sk-tile__name">
              <span class="sk-tile__nameText">{{ row.name }}</span>
              <em class="sk-tile__year">· {{ skinYear(row) }}</em>
            </span>
            <span class="sk-tile__sub">{{ row.charName }} · {{ row.seriesName }}</span>
            <span class="sk-tile__value">
              {{ rankMain(row) }}
              <em>{{ rankSub(row) }}</em>
            </span>
          </div>
        </article>
      </div>

      <div v-else class="sk-empty">
        <span class="mdi mdi-inbox-outline"/>
        <p>本轮还没有商城或兑换礼包渠道的时装持有记录，等统计任务跑过一轮再看。</p>
      </div>
    </section>

    <!-- 02 全部时装 -->
    <section class="sk-section sk-catalog">
      <div class="sk-section__head">
        <span class="sk-index">02</span>
        <h2 class="sk-section__title">全部时装</h2>
        <span class="sk-section__meta">
          {{ formatInt(records.length) }} 件 · 其中有持有记录 {{ formatInt(statCount) }} 件 · 点击任意一行查看详情
        </span>
      </div>

      <div class="sk-toolbar">
        <div class="sk-filters">
          <div class="sk-filters__row">
            <button
                v-for="chip in rarityChips"
                :key="chip.value"
                class="sk-chip"
                :class="{'is-active': isChipActive(rarityFilter, chip.value)}"
                type="button"
                @click="toggleRarity(chip.value)"
            >{{ chip.label }}
            </button>
          </div>
          <div class="sk-filters__row">
            <button
                v-for="chip in yearChips"
                :key="chip.value"
                class="sk-chip"
                :class="{'is-active': isChipActive(yearFilter, chip.value)}"
                type="button"
                @click="toggleYear(chip.value)"
            >{{ chip.label }}
            </button>
          </div>
          <div class="sk-filters__row">
            <button
                v-for="chip in seriesChips"
                :key="chip.value"
                class="sk-chip"
                :class="{'is-active': isChipActive(seriesFilter, chip.value)}"
                type="button"
                @click="toggleSeries(chip.value)"
            >{{ chip.label }}
            </button>
          </div>
          <div class="sk-filters__row">
            <button
                v-for="chip in channelChips"
                :key="chip.value"
                class="sk-chip"
                :class="{'is-active': isChipActive(channelFilter, chip.value)}"
                type="button"
                @click="toggleChannel(chip.value)"
            >{{ chip.label }}
            </button>
          </div>
        </div>

        <div class="sk-tools">
          <label class="sk-search">
            <span class="mdi mdi-magnify"/>
            <input v-model="keyword" type="search" placeholder="搜索时装 / 干员 / 系列"/>
          </label>
          <button class="sk-ghost sk-ghost--sm" type="button" :disabled="!filteredRows.length" @click="exportCsv">
            <span class="mdi mdi-download-outline"/>
            CSV
          </button>
        </div>
      </div>

      <div class="sk-catalog__scroll">
        <table>
          <thead>
          <tr>
            <th class="is-sortable" :class="{'is-active': sortKey === 'name'}" @click="toggleSort('name')">
              时装 <span class="mdi" :class="sortIcon('name')"/>
            </th>
            <th>干员</th>
            <th class="is-sortable" :class="{'is-active': sortKey === 'releaseTime'}"
                @click="toggleSort('releaseTime')">
              上线 <span class="mdi" :class="sortIcon('releaseTime')"/>
            </th>
            <th>获取方式</th>
            <th class="is-num is-sortable" :class="{'is-active': sortKey === 'own'}" @click="toggleSort('own')">
              拥有 <span class="mdi" :class="sortIcon('own')"/>
            </th>
            <th class="is-num is-sortable" :class="{'is-active': sortKey === 'rate'}" @click="toggleSort('rate')">
              持有率 <span class="mdi" :class="sortIcon('rate')"/>
            </th>
          </tr>
          </thead>

          <tbody v-if="loading && !records.length">
          <tr v-for="n in 6" :key="n">
            <td colspan="6"><span class="sk-skeleton" style="display:block;height:14px"/></td>
          </tr>
          </tbody>

          <tbody v-else>
          <tr v-for="row in visibleRows" :key="row.skinId" class="sk-row" @click="openSkin(row)">
            <td>
              <div class="sk-cellSkin">
                <span class="sk-avatar" :style="avatarStyle(row, 39)">
                  <img :src="skinAvatarUrl(row)" alt="" loading="lazy"
                       @error="onAvatarError($event, row)">
                </span>
                <span class="sk-cellSkin__text">
                  <span class="sk-cellSkin__name">{{ row.name }}</span>
                  <span class="sk-cellSkin__series">{{ row.seriesName }}</span>
                </span>
              </div>
            </td>
            <td>
              <span class="sk-cellOp">{{ row.charName }}</span>
              <span class="sk-cellOp__sub">{{ row.rarity }}★ · {{ row.professionLabel }}</span>
            </td>
            <td class="sk-cellDate">{{ formatDate(row.releaseTime) }}</td>
            <td class="sk-cellChannel">{{ row.channelLabel }}</td>
            <td class="is-num">{{ formatInt(row.own) }}</td>
            <td class="is-num">
              <div class="sk-rate">
                <span class="sk-rate__track">
                  <i :style="{width: pctWidth(row.rate)}"></i>
                </span>
                <span class="sk-rate__num">{{ formatPct(row.rate) }}</span>
              </div>
            </td>
          </tr>
          <tr v-if="!visibleRows.length">
            <td colspan="6">
              <div class="sk-empty">
                <span class="mdi mdi-text-search"/>
                <p>没有匹配的时装，换个关键词或清空筛选试试。</p>
                <button v-if="filterActive" class="sk-link" type="button" @click="resetFilters">清除筛选</button>
              </div>
            </td>
          </tr>
          </tbody>
        </table>
      </div>

      <div class="sk-catalog__foot">
        <span>已显示 {{ formatInt(visibleRows.length) }} / {{ formatInt(filteredRows.length) }} 件</span>
        <button
            v-if="visibleRows.length < filteredRows.length"
            class="sk-ghost sk-ghost--sm"
            type="button"
            @click="visibleCount += PAGE_SIZE"
        >加载更多
        </button>
      </div>
    </section>

    <!-- 口径 -->
    <footer class="sk-notes">
      <button class="sk-notes__toggle" type="button" :aria-expanded="notesOpen" @click="notesOpen = !notesOpen">
        <span class="mdi mdi-information-outline"/>
        这些数字怎么来的
        <span class="mdi mdi-chevron-down sk-notes__chev" :class="{'is-open': notesOpen}"/>
      </button>
      <div v-show="notesOpen" class="sk-notes__grid">
        <p><b>持有率</b>拥有该时装的账号数 ÷ 本轮参与统计的账号总数，尚未被任何账号拥有的时装按 0 计入。</p>
        <p><b>排行口径</b>持有率排行只收商城上架与兑换礼包的时装（采购中心、特典、设定集兑换码、线下礼包等），活动赠送、集成战略、商城零元购等渠道不参与排名，避免把获取门槛不同的时装放在一起比。</p>
        <p><b>商城零元购</b>指挂在采购中心、但活动期间标价 0 的时装（目前是芬的十字郡、芙蓉的守岁人）。静态表只记「采购中心」，代码里按时装 ID 单独拎成这一类，不混进商城上架，也不进排行榜。</p>
        <p><b>样本口径</b>只统计在站内上传过数据的账号，本轮 {{ sampleText }} 个；样本扩容后历史数值会整体回落。</p>
        <p><b>更新频率</b>服务端每小时 10 分跑一轮全量统计，页面只读结果表，拿到的永远是最近一轮快照。</p>
        <p><b>系列归并</b>静态表里的系列名带罗马数字分卷（如「珊瑚海岸/VI」），榜单按分卷前的主系列名归并。</p>
      </div>
    </footer>

    <!-- 详情抽屉 -->
    <div v-if="drawerSkin" class="sk-drawer" role="dialog" aria-modal="true">
      <div class="sk-drawer__backdrop" @click="closeDrawer"></div>
      <aside class="sk-drawer__panel">
        <div class="sk-drawer__head">
          <span class="sk-index">SKIN / DETAIL</span>
          <button class="sk-drawer__close mdi mdi-close" type="button" aria-label="关闭" @click="closeDrawer"/>
        </div>

        <div class="sk-drawer__media" :style="toneStyle(drawerSkin)">
          <img :src="skinArtUrl(drawerSkin)" alt="" @error="onArtError($event, drawerSkin)">
          <span class="sk-drawer__no">{{ drawerSkin.rarity }}★</span>
        </div>

        <div class="sk-drawer__titleRow">
          <h3 class="sk-drawer__name">{{ drawerSkin.name }}</h3>
          <span class="sk-drawer__rate">{{ formatPct(drawerSkin.rate) }}</span>
        </div>
        <p class="sk-drawer__op">
          {{ drawerSkin.charName }} · {{ drawerSkin.professionLabel }} · {{ drawerSkin.seriesName }}
        </p>

        <div class="sk-drawer__meter">
          <i :style="{width: pctWidth(drawerSkin.rate)}"></i>
        </div>
        <p class="sk-drawer__meterText">
          {{ formatInt(drawerSkin.own) }} / {{ formatInt(drawerSkin.totalAccounts) }} 个账号拥有
        </p>

        <dl class="sk-drawer__facts">
          <div>
            <dt>上线时间</dt>
            <dd>{{ formatDate(drawerSkin.releaseTime) }}</dd>
          </div>
          <div>
            <dt>获取方式</dt>
            <dd>{{ drawerSkin.approach }}<template v-if="drawerSkin.tag"> · {{ drawerSkin.tag }}</template></dd>
          </div>
          <div>
            <dt>所属系列</dt>
            <dd>
              {{ drawerSkin.seriesName }}
              <template v-if="drawerSeriesCount">
                · 共 {{ drawerSeriesCount }} 件
              </template>
            </dd>
          </div>
        </dl>

        <p v-if="drawerSkin.description" class="sk-drawer__desc">{{ drawerSkin.description }}</p>

        <p class="sk-drawer__code">{{ drawerSkin.skinId }}</p>
      </aside>
    </div>
  </div>
</template>
