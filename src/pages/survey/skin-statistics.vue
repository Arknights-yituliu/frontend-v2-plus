<script setup>
import '/src/assets/css/survey/skin-statistics.scss'
import {computed, onMounted, onUnmounted, ref, watch} from 'vue'
import {match} from 'pinyin-pro'
import {dateFormat} from '/src/utils/dateUtil.js'
import {getOperatorAvatarStyle, getOperatorAvatarUrl, getSkinPortraitUrl} from '/src/utils/arknightsResource.js'
import {getAkSkinStatisticsResult} from '/src/api/user-center/skinStatistics.js'
import {
  CHANNELS,
  buildSkinRecords,
  summarize,
} from '/src/utils/skinStatistics.js'

/* ---------------- 常量 ---------------- */

const RANK_METRICS = [
  {key: 'rate', label: '持有率'},
  {key: 'own', label: '拥有账号'},
  {key: 'releaseTime', label: '最新上线'},
]

const PAGE_SIZE = 30

/* ---------------- 状态 ---------------- */

const records = ref([])
const sampleAccounts = ref(0)
const statCount = ref(0)
const loading = ref(true)
const loadError = ref('')
const updatedAt = ref(null)

const rankMetric = ref('rate')
const rankLimit = ref(12)

const keyword = ref('')
const rarityFilter = ref('all')
const channelFilter = ref('all')
const sortKey = ref('rate')
const sortDir = ref('desc')
const visibleCount = ref(PAGE_SIZE)

const notesOpen = ref(false)
const drawerSkin = ref(null)

let requestSeq = 0

/* ---------------- 派生数据 ---------------- */

const summary = computed(() => summarize(records.value))
const topSkin = computed(() => (sampleAccounts.value > 0 ? summary.value.topSkin : null))

const sampleText = computed(() => (sampleAccounts.value > 0 ? formatInt(sampleAccounts.value) : '—'))

/* 封面数字 */
const coverFigures = computed(() => {
  const data = summary.value
  return [
    {key: 'sample', value: sampleAccounts.value > 0 ? formatInt(sampleAccounts.value) : '—', label: '样本账号'},
    {key: 'total', value: formatInt(data.total), label: '收录时装'},
    {key: 'series', value: formatInt(data.seriesCount), label: '时装系列'},
    {key: 'avg', value: data.total ? formatPct(data.avgRate) : '—', label: '平均持有率'},
  ]
})

const rankRows = computed(() => {
  const list = records.value.filter(item => item.hasData)
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
  if (rarityFilter.value !== 'all') {
    list = list.filter(item => item.rarity === rarityFilter.value)
  }
  if (channelFilter.value !== 'all') {
    list = list.filter(item => item.channelKey === channelFilter.value)
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
    () => keyword.value.trim() !== '' || rarityFilter.value !== 'all' || channelFilter.value !== 'all',
)

const drawerSeries = computed(() => {
  if (!drawerSkin.value) {
    return null
  }
  const list = records.value.filter(item => item.seriesBase === drawerSkin.value.seriesBase)
  const rateSum = list.reduce((sum, item) => sum + item.rate, 0)
  return {count: list.length, avgRate: list.length ? rateSum / list.length : 0}
})

const updatedText = computed(() => {
  if (!updatedAt.value) {
    return '尚未同步'
  }
  const time = updatedAt.value
  const pad = value => String(value).padStart(2, '0')
  return `${pad(time.getHours())}:${pad(time.getMinutes())}`
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

function avatarUrl(charId) {
  return getOperatorAvatarUrl(charId)
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
  if (rankMetric.value === 'own') {
    return item.own
  }
  if (rankMetric.value === 'releaseTime') {
    return item.releaseTime
  }
  return item.rate
}

function rankMain(item) {
  if (rankMetric.value === 'own') {
    return `${formatInt(item.own)} 人`
  }
  if (rankMetric.value === 'releaseTime') {
    return dateFormat(new Date(item.releaseTime), 'yyyy.MM')
  }
  return formatPct(item.rate)
}

function rankSub(item) {
  if (rankMetric.value === 'own') {
    return formatPct(item.rate)
  }
  if (rankMetric.value === 'releaseTime') {
    return `均 ${formatPct(item.rate)}`
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
  rarityFilter.value = 'all'
  channelFilter.value = 'all'
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
    updatedAt.value = new Date()
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

watch([keyword, rarityFilter, channelFilter, sortKey, sortDir], () => {
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

        <p class="sk-cover__lead">
          谁的衣服人手一件，哪套系列最经得起时间考验。以站内玩家上传的持有记录为样本，
          把 {{ formatInt(summary.total) }} 件时装按持有率排成一张榜单，附可检索的全量目录。
        </p>

        <div class="sk-figures">
          <div v-for="figure in coverFigures" :key="figure.key" class="sk-figure">
            <span class="sk-figure__value">{{ figure.value }}</span>
            <span class="sk-figure__label">{{ figure.label }}</span>
          </div>
        </div>

        <div class="sk-cover__foot">
          <button class="sk-ghost" type="button" :disabled="loading" @click="load">
            <span class="mdi mdi-refresh" :class="{'is-spinning': loading}"/>
            {{ loading ? '同步中' : '刷新数据' }}
          </button>
          <span class="sk-cover__stamp">最近同步 {{ updatedText }} · 每小时 10 分自动跑批</span>
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
            <span class="sk-tile__name">{{ row.name }}</span>
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
        <p>本轮还没有持有记录，等统计任务跑过一轮再看。</p>
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
                :class="{'is-active': rarityFilter === chip.value}"
                type="button"
                @click="rarityFilter = chip.value"
            >{{ chip.label }}
            </button>
          </div>
          <div class="sk-filters__row">
            <button
                v-for="chip in channelChips"
                :key="chip.value"
                class="sk-chip"
                :class="{'is-active': channelFilter === chip.value}"
                type="button"
                @click="channelFilter = chip.value"
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
                <span class="sk-avatar" :style="avatarStyle(row, 30)">
                  <img :src="avatarUrl(row.charId)" alt="" loading="lazy">
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
              <template v-if="drawerSeries">
                · {{ drawerSeries.count }} 件 · 均 {{ formatPct(drawerSeries.avgRate) }}
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
