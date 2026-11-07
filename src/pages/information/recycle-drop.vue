<script setup>
import '/src/assets/css/information/recycle-drop.scss'
import {computed, onMounted, ref, watch} from 'vue'
import ItemImage from '/src/components/sprite/ItemImage.vue'
import recycleDropApi from '/src/api/backend/recycleDrop.js'
import itemInfoList from '/src/static/json/material/item_info.json'

/* 接口密钥：优先读本地保存的值，其次读构建期注入的 VITE_RECYCLE_DROP_KEY */
const STORAGE_KEY = 'RecycleDropAccessKey'
const ENV_KEY = String(import.meta.env.VITE_RECYCLE_DROP_KEY || '').trim()

const ITEM_INFO_BY_ID = new Map(itemInfoList.map(item => [String(item.itemId), item]))

/* 稀有度配色沿用站内材料格子约定（5 金 / 4 橙 / 3 紫 / 2 蓝 / 1 绿），
   针对深浅两套主题做了微调，保证标签文字在两种底色上都能读 */
const RARITY_COLORS = {
  5: '#D9A300',
  4: '#EF8B00',
  3: '#A855C8',
  2: '#2E9BE6',
  1: '#46A85A',
  0: '#9AA0A6',
}

const RARITY_LABELS = {5: 'T5', 4: 'T4', 3: 'T3', 2: 'T2', 1: 'T1', 0: '其他'}

const RANK_METRICS = [
  {key: 'rate', label: '掉率'},
  {key: 'quantity', label: '数量'},
  {key: 'expectValue', label: '折算价值'},
]

const accessKey = ref(localStorage.getItem(STORAGE_KEY) || ENV_KEY)
const keyDraft = ref('')
const keyPanelOpen = ref(false)

const rawItems = ref([])
const statsRange = ref({startDay: '', endDay: ''})
const loading = ref(false)
const loaded = ref(false)
const error = ref('')
const updatedAt = ref(null)

const rankSort = ref('rate')
const rankLimit = ref(12)
const keyword = ref('')
const rarityFilter = ref(-1)
const tableSort = ref({key: 'rate', dir: 'desc'})
const visibleCount = ref(30)

let requestSeq = 0

const hasData = computed(() => rawItems.value.length > 0)

/* ---------------- 数据 ---------------- */

async function load() {
  if (!accessKey.value) {
    return
  }
  const seq = ++requestSeq
  loading.value = true
  error.value = ''
  try {
    const res = await recycleDropApi.statistics(accessKey.value)
    if (seq !== requestSeq) {
      return
    }
    // 新接口返回 { startDay, endDay, items }；兼容旧版直接返回数组的情况
    const data = res?.data
    if (Array.isArray(data)) {
      rawItems.value = data
      statsRange.value = {startDay: '', endDay: ''}
    } else {
      rawItems.value = Array.isArray(data?.items) ? data.items : []
      statsRange.value = {
        startDay: data?.startDay || '',
        endDay: data?.endDay || '',
      }
    }
    loaded.value = true
    updatedAt.value = new Date()
  } catch (e) {
    if (seq !== requestSeq) {
      return
    }
    // 80001 = PERMISSION_NO_ACCESS，说明密钥不对，单独给一句更明确的提示
    error.value = e?.code === 80001
        ? '访问密钥无效或已失效'
        : e?.msg || '统计数据获取失败，请稍后重试'
  } finally {
    if (seq === requestSeq) {
      loading.value = false
    }
  }
}

/* times 是全部记录数总和，每条记录取到同一个值，取最大值即可 */
const totalRecords = computed(() => {
  const times = rawItems.value.map(item => Number(item?.times) || 0)
  const max = times.length ? Math.max(...times) : 0
  if (max > 0) {
    return max
  }
  return rawItems.value.reduce((sum, item) => sum + (Number(item?.quantity) || 0), 0)
})

const rangeLabel = computed(() => {
  const {startDay, endDay} = statsRange.value
  return startDay && endDay ? `${startDay} ~ ${endDay}` : '—'
})

/* 起止日都算在区间内，所以天数要 +1 */
const rangeDays = computed(() => {
  const {startDay, endDay} = statsRange.value
  if (!startDay || !endDay) {
    return 0
  }
  const start = Date.parse(`${startDay}T00:00:00`)
  const end = Date.parse(`${endDay}T00:00:00`)
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
    return 0
  }
  return Math.round((end - start) / 86400000) + 1
})

const dailyAverage = computed(() => (rangeDays.value ? Math.round(totalRecords.value / rangeDays.value) : 0))

const items = computed(() => {
  const total = totalRecords.value || 1
  return rawItems.value.map(raw => {
    const itemId = String(raw?.itemId ?? '')
    const info = ITEM_INFO_BY_ID.get(itemId)
    const quantity = Number(raw?.quantity) || 0
    const rarity = Number(info?.rarity)
    const itemValue = Number(info?.itemValueAp ?? info?.itemValue)
    const safeValue = Number.isFinite(itemValue) ? itemValue : 0
    const rate = quantity / total
    return {
      itemId,
      quantity,
      rate,
      name: info?.itemName || itemId || '未知物品',
      type: info?.type || '其他',
      rarity: Number.isFinite(rarity) ? rarity : 0,
      itemValue: safeValue,
      expectValue: rate * safeValue,
    }
  })
})

const sortedItems = computed(() => {
  const key = rankSort.value
  return [...items.value].sort((a, b) => (b[key] || 0) - (a[key] || 0))
})

const rankRows = computed(() => sortedItems.value.slice(0, rankLimit.value))
const rankMax = computed(() => Number(rankRows.value[0]?.[rankSort.value]) || 0)

const expectedValue = computed(() => items.value.reduce((sum, item) => sum + item.expectValue, 0))
const topItem = computed(() =>
    items.value.reduce((best, item) => (!best || item.rate > best.rate ? item : best), null),
)

const rarityGroups = computed(() => {
  const map = new Map()
  for (const item of items.value) {
    const rarity = RARITY_LABELS[item.rarity] ? item.rarity : 0
    const group = map.get(rarity) || {
      rarity,
      label: RARITY_LABELS[rarity],
      color: RARITY_COLORS[rarity],
      count: 0,
      rate: 0,
    }
    group.count += 1
    group.rate += item.rate
    map.set(rarity, group)
  }
  const list = [...map.values()].sort((a, b) => b.rarity - a.rarity)
  const total = list.reduce((sum, group) => sum + group.rate, 0) || 1
  return list.map(group => ({...group, share: (group.rate / total) * 100}))
})

const donutStyle = computed(() => {
  const groups = rarityGroups.value
  const total = groups.reduce((sum, group) => sum + group.rate, 0)
  if (!total) {
    return {}
  }
  let acc = 0
  const stops = groups.map(group => {
    const from = (acc / total) * 360
    acc += group.rate
    const to = (acc / total) * 360
    return `${group.color} ${from.toFixed(2)}deg ${to.toFixed(2)}deg`
  })
  return {background: `conic-gradient(${stops.join(', ')})`}
})

const rarityChips = computed(() => [
  {value: -1, label: '全部'},
  ...rarityGroups.value.map(group => ({
    value: group.rarity,
    label: group.rarity === 0 ? '其他' : `${RARITY_LABELS[group.rarity]} 材料`,
  })),
])

const tableRows = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  let list = items.value
  if (kw) {
    list = list.filter(item => item.name.toLowerCase().includes(kw) || item.itemId.toLowerCase().includes(kw))
  }
  if (rarityFilter.value >= 0) {
    list = list.filter(item => item.rarity === rarityFilter.value)
  }
  const {key, dir} = tableSort.value
  const factor = dir === 'asc' ? 1 : -1
  return [...list].sort((a, b) => {
    if (key === 'name') {
      return a.name.localeCompare(b.name, 'zh-CN') * factor
    }
    return ((a[key] || 0) - (b[key] || 0)) * factor
  })
})

const visibleRows = computed(() => tableRows.value.slice(0, visibleCount.value))
const tableMaxRate = computed(() => Math.max(...tableRows.value.map(item => item.rate), 0.000001))

/* ---------------- 格式化 ---------------- */

function formatCount(value) {
  return Number(value || 0).toLocaleString('zh-CN')
}

function formatRate(rate) {
  const pct = (Number(rate) || 0) * 100
  if (pct > 0 && pct < 0.01) {
    return '<0.01%'
  }
  return `${pct.toFixed(2)}%`
}

function formatValue(value) {
  const num = Number(value) || 0
  return num >= 10 ? num.toFixed(1) : num.toFixed(2)
}

function rarityColor(rarity) {
  return RARITY_COLORS[rarity] ?? RARITY_COLORS[0]
}

function rarityLabel(rarity) {
  return RARITY_LABELS[rarity] || '其他'
}

function rankBarWidth(item) {
  const max = rankMax.value || 1
  const value = Number(item[rankSort.value]) || 0
  return `${Math.max(3, (value / max) * 100).toFixed(2)}%`
}

function rankMain(item) {
  if (rankSort.value === 'quantity') {
    return formatCount(item.quantity)
  }
  if (rankSort.value === 'expectValue') {
    return formatValue(item.expectValue)
  }
  return formatRate(item.rate)
}

function rankSub(item) {
  if (rankSort.value === 'quantity') {
    return formatRate(item.rate)
  }
  if (rankSort.value === 'expectValue') {
    return '理智 / 次'
  }
  return `${formatCount(item.quantity)} 次`
}

function rateBarWidth(item) {
  return `${Math.max(2, (item.rate / tableMaxRate.value) * 100).toFixed(2)}%`
}

const updatedText = computed(() => {
  if (!updatedAt.value) {
    return '—'
  }
  const time = updatedAt.value
  const pad = value => String(value).padStart(2, '0')
  return `${pad(time.getHours())}:${pad(time.getMinutes())}:${pad(time.getSeconds())}`
})

/* ---------------- 交互 ---------------- */

function toggleSort(key) {
  if (tableSort.value.key === key) {
    tableSort.value = {key, dir: tableSort.value.dir === 'desc' ? 'asc' : 'desc'}
    return
  }
  tableSort.value = {key, dir: 'desc'}
}

function sortIcon(key) {
  if (tableSort.value.key !== key) {
    return 'mdi-unfold-more-horizontal'
  }
  return tableSort.value.dir === 'desc' ? 'mdi-chevron-down' : 'mdi-chevron-up'
}

function ariaSort(key) {
  if (tableSort.value.key !== key) {
    return 'none'
  }
  return tableSort.value.dir === 'desc' ? 'descending' : 'ascending'
}

function submitKey() {
  const value = keyDraft.value.trim()
  if (!value) {
    return
  }
  accessKey.value = value
  localStorage.setItem(STORAGE_KEY, value)
  keyDraft.value = ''
  keyPanelOpen.value = false
  loaded.value = false
  rawItems.value = []
  load()
}

function clearKey() {
  localStorage.removeItem(STORAGE_KEY)
  accessKey.value = ''
  keyDraft.value = ''
  keyPanelOpen.value = false
  rawItems.value = []
  loaded.value = false
  error.value = ''
  updatedAt.value = null
}

function exportCsv() {
  const header = ['物品', '物品ID', '稀有度', '类型', '掉落占比', '产出次数', '单次折算价值']
  const rows = tableRows.value.map(item => [
    item.name,
    item.itemId,
    rarityLabel(item.rarity),
    item.type,
    formatRate(item.rate),
    item.quantity,
    item.expectValue.toFixed(4),
  ])
  const csv = [header, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\r\n')
  const blob = new Blob(['\uFEFF' + csv], {type: 'text/csv;charset=utf-8'})
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `回收站掉落统计_${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

watch([keyword, rarityFilter], () => {
  visibleCount.value = 30
})

onMounted(() => {
  if (accessKey.value) {
    load()
  }
})
</script>

<template>
  <div class="rd-page">
    <!-- 未配置密钥：先让用户填一次 -->
    <div v-if="!accessKey" class="rd-gate">
      <div class="rd-gate__card">
        <span class="rd-gate__icon">
          <span class="mdi mdi-lock-outline"/>
        </span>
        <h2>需要访问密钥</h2>
        <p>回收站统计接口暂时用密钥鉴权。密钥只保存在本机浏览器，用于向统计接口发起请求，不会上传到其他位置。</p>
        <form class="rd-gate__form" @submit.prevent="submitKey">
          <input
              v-model="keyDraft"
              class="rd-input"
              type="password"
              placeholder="粘贴访问密钥"
              autocomplete="off"
          />
          <button class="rd-btn rd-btn--primary" type="submit" :disabled="!keyDraft.trim()">进入</button>
        </form>
        <p class="rd-gate__note">站点维护者也可以把密钥写进 <code>VITE_RECYCLE_DROP_KEY</code> 环境变量，构建后自动带上。</p>
      </div>
    </div>

    <template v-else>
      <header class="rd-hero">
        <div>
          <div class="rd-eyebrow">
            <span class="rd-eyebrow__dot"></span>
            RIIC · RECYCLE STATION
          </div>
          <h1 class="rd-title">回收站掉落统计</h1>
          <p class="rd-desc">
            汇总玩家上传的回收站产出记录，按自然日聚合后累计，展示每种材料的真实掉落占比与折算价值。
          </p>
        </div>
        <div class="rd-hero__side">
          <div class="rd-updated">统计区间 <strong>{{ rangeLabel }}</strong></div>
          <div class="rd-updated">最近更新 <strong>{{ updatedText }}</strong></div>
          <div class="rd-hero__btns">
            <button class="rd-btn" :disabled="loading" @click="load">
              <span class="mdi mdi-refresh" :class="{'rd-spin': loading}"/>
              刷新
            </button>
            <button class="rd-btn rd-btn--icon" aria-label="访问密钥" @click="keyPanelOpen = !keyPanelOpen">
              <span class="mdi mdi-cog-outline"/>
            </button>
          </div>
        </div>
      </header>

      <div v-if="keyPanelOpen" class="rd-keypanel">
        <span class="rd-keypanel__label">访问密钥</span>
        <input
            v-model="keyDraft"
            class="rd-input"
            type="password"
            placeholder="输入新的密钥后保存"
            autocomplete="off"
            @keyup.enter="submitKey"
        />
        <button class="rd-btn rd-btn--primary" :disabled="!keyDraft.trim()" @click="submitKey">保存</button>
        <button class="rd-btn" @click="clearKey">清除</button>
      </div>

      <!-- 拉取失败但还有上一次的数据 -->
      <div v-if="error && hasData" class="rd-alert">
        <span class="mdi mdi-alert-circle-outline"/>
        <span>{{ error }}，当前展示的是上一次成功获取的数据。</span>
        <button class="rd-link-btn" @click="load">重试</button>
      </div>

      <!-- 拉取失败且没有旧数据 -->
      <section v-if="error && !hasData" class="rd-card" style="margin-top: 18px">
        <div class="rd-state">
          <span class="mdi mdi-alert-circle-outline"/>
          <h3>没能取到统计数据</h3>
          <p>{{ error }}。如果是刚更换过密钥，请确认密钥有效；接口异常时也可以稍后再试。</p>
          <button class="rd-btn" @click="load">重新加载</button>
        </div>
      </section>

      <template v-else>
        <section class="rd-kpis">
          <article class="rd-kpi rd-kpi--blue">
            <div class="rd-kpi__label">采样记录</div>
            <div class="rd-kpi__value">
              <template v-if="loading && !hasData">—</template>
              <template v-else>{{ formatCount(totalRecords) }}<small>条</small></template>
            </div>
            <div class="rd-kpi__hint">
              <template v-if="rangeDays">区间 {{ rangeDays }} 天 · 日均 {{ formatCount(dailyAverage) }} 条</template>
              <template v-else>全部物品的回收站产出记录累计</template>
            </div>
          </article>

          <article class="rd-kpi rd-kpi--violet">
            <div class="rd-kpi__label">物品数</div>
            <div class="rd-kpi__value">
              <template v-if="loading && !hasData">—</template>
              <template v-else>{{ items.length }}<small>种</small></template>
            </div>
            <div class="rd-kpi__hint">出现在产出记录中的材料种类</div>
          </article>

          <article class="rd-kpi rd-kpi--teal">
            <div class="rd-kpi__label">单次期望价值</div>
            <div class="rd-kpi__value">
              <template v-if="loading && !hasData">—</template>
              <template v-else>{{ formatValue(expectedValue) }}<small>理智</small></template>
            </div>
            <div class="rd-kpi__hint">每一条产出记录折算成的理智价值</div>
          </article>

          <article class="rd-kpi rd-kpi--amber">
            <div class="rd-kpi__label">最常掉落</div>
            <div class="rd-kpi__value is-text">
              <span v-if="loading && !hasData">—</span>
              <span v-else-if="topItem">{{ topItem.name }}</span>
              <span v-else>暂无数据</span>
            </div>
            <div class="rd-kpi__hint">
              {{ topItem ? `占比 ${formatRate(topItem.rate)} · ${formatCount(topItem.quantity)} 次` : '等待接口返回' }}
            </div>
          </article>
        </section>

        <div class="rd-main">
          <section class="rd-card">
            <div class="rd-card__head">
              <div>
                <h2 class="rd-card__title">掉落排行</h2>
                <p class="rd-card__sub">占比 = 该物品产出次数 ÷ 全部产出记录数</p>
              </div>
              <div class="rd-segmented">
                <button
                    v-for="metric in RANK_METRICS"
                    :key="metric.key"
                    :class="{active: rankSort === metric.key}"
                    @click="rankSort = metric.key"
                >{{ metric.label }}
                </button>
              </div>
            </div>

            <ul v-if="loading && !hasData" class="rd-rank__list">
              <li v-for="n in 8" :key="n" class="rd-rank__row">
                <span class="rd-skeleton" style="height: 12px"></span>
                <span class="rd-skeleton" style="height: 34px; border-radius: 8px"></span>
                <span class="rd-skeleton" style="height: 14px"></span>
                <span class="rd-skeleton" style="height: 8px"></span>
                <span class="rd-skeleton" style="height: 14px"></span>
              </li>
            </ul>

            <ul v-else-if="rankRows.length" class="rd-rank__list">
              <li v-for="(item, index) in rankRows" :key="item.itemId" class="rd-rank__row">
                <span class="rd-rank__no" :class="{'is-top': index < 3}">
                  {{ String(index + 1).padStart(2, '0') }}
                </span>
                <span class="rd-rank__icon" :style="{'--rd-rarity': rarityColor(item.rarity)}">
                  <ItemImage :item-id="item.itemId" :size="30" :mobile-size="28"/>
                </span>
                <span class="rd-rank__name">
                  <span class="rd-rank__title">{{ item.name }}</span>
                  <span class="rd-rank__tag">{{ rarityLabel(item.rarity) }} · {{ item.type }}</span>
                </span>
                <span class="rd-rank__bar">
                  <span class="rd-rank__fill" :style="{width: rankBarWidth(item)}"></span>
                </span>
                <span class="rd-rank__value">
                  <strong>{{ rankMain(item) }}</strong>
                  <small>{{ rankSub(item) }}</small>
                </span>
              </li>
            </ul>

            <div v-else class="rd-state">
              <span class="mdi mdi-inbox-outline"/>
              <h3>暂无统计数据</h3>
              <p>接口返回为空，可能是统计任务还没有跑过，先等等定时任务。</p>
            </div>

            <div v-if="rankRows.length" class="rd-rank__foot">
              <span>共 {{ items.length }} 种物品，当前展示前 {{ rankRows.length }} 名</span>
              <button class="rd-link-btn" @click="rankLimit = rankLimit === 12 ? 24 : 12">
                {{ rankLimit === 12 ? '展开前 24 名' : '收起' }}
              </button>
            </div>
          </section>

          <aside class="rd-side">
            <section class="rd-card">
              <div class="rd-card__head">
                <div>
                  <h2 class="rd-card__title">稀有度构成</h2>
                  <p class="rd-card__sub">按掉落占比归并，可看出材料档位的分布</p>
                </div>
              </div>
              <div class="rd-mix">
                <div class="rd-donut" :style="donutStyle">
                  <div class="rd-donut__hole">
                    <strong>{{ items.length }}</strong>
                    <span>种材料</span>
                  </div>
                </div>
                <ul class="rd-legend">
                  <li v-for="group in rarityGroups" :key="group.rarity">
                    <span class="rd-legend__dot" :style="{background: group.color}"></span>
                    <span class="rd-legend__label">{{ group.label }} · {{ group.count }} 种</span>
                    <span class="rd-legend__bar">
                      <i :style="{width: `${Math.max(2, group.share)}%`, background: group.color}"></i>
                    </span>
                    <span class="rd-legend__pct">{{ group.share.toFixed(1) }}%</span>
                  </li>
                  <li v-if="!rarityGroups.length">
                    <span class="rd-legend__label">暂无数据</span>
                  </li>
                </ul>
              </div>
            </section>

            <section class="rd-card">
              <div class="rd-card__head">
                <div>
                  <h2 class="rd-card__title">统计口径</h2>
                  <p class="rd-card__sub">接口只返回聚合结果，这里说明每个字段怎么来的</p>
                </div>
              </div>
              <dl class="rd-defs">
                <div>
                  <dt>掉落占比</dt>
                  <dd>该物品产出次数 ÷ 全部物品的产出记录数，全部物品占比之和为 100%。</dd>
                </div>
                <div>
                  <dt>折算价值</dt>
                  <dd>掉落占比 × 物品价值（理智），即平均每次回收站产出该物品带来的理智收益。</dd>
                </div>
                <div>
                  <dt>数据范围</dt>
                  <dd>
                    仅包含未过期的每日统计，重复统计过的日期以最新一次任务结果为准。
                    <template v-if="rangeDays">当前统计区间 {{ rangeLabel }}，共 {{ rangeDays }} 天。</template>
                  </dd>
                </div>
              </dl>
            </section>
          </aside>
        </div>

        <section class="rd-card rd-table">
          <div class="rd-card__head">
            <div>
              <h2 class="rd-card__title">全部物品</h2>
              <p class="rd-card__sub">共 {{ tableRows.length }} 种 · 点击表头切换排序</p>
            </div>
            <div class="rd-tools">
              <label class="rd-search">
                <span class="mdi mdi-magnify"/>
                <input v-model="keyword" placeholder="搜索名称或物品 ID"/>
              </label>
              <button class="rd-btn rd-btn--ghost" :disabled="!tableRows.length" @click="exportCsv">
                <span class="mdi mdi-download-outline"/>
                导出 CSV
              </button>
            </div>
          </div>

          <div class="rd-chips">
            <button
                v-for="chip in rarityChips"
                :key="chip.value"
                class="rd-chip"
                :class="{active: rarityFilter === chip.value}"
                @click="rarityFilter = chip.value"
            >{{ chip.label }}
            </button>
          </div>

          <div class="rd-table__scroll">
            <table>
              <thead>
              <tr>
                <th
                    class="is-sortable"
                    :class="{'is-active': tableSort.key === 'name'}"
                    :aria-sort="ariaSort('name')"
                    @click="toggleSort('name')"
                >
                  物品 <span class="mdi" :class="sortIcon('name')"/>
                </th>
                <th>稀有度</th>
                <th>类型</th>
                <th
                    class="is-sortable"
                    :class="{'is-active': tableSort.key === 'rate'}"
                    :aria-sort="ariaSort('rate')"
                    @click="toggleSort('rate')"
                >
                  掉落占比 <span class="mdi" :class="sortIcon('rate')"/>
                </th>
                <th
                    class="is-sortable is-num"
                    :class="{'is-active': tableSort.key === 'quantity'}"
                    :aria-sort="ariaSort('quantity')"
                    @click="toggleSort('quantity')"
                >
                  产出次数 <span class="mdi" :class="sortIcon('quantity')"/>
                </th>
                <th
                    class="is-sortable is-num"
                    :class="{'is-active': tableSort.key === 'expectValue'}"
                    :aria-sort="ariaSort('expectValue')"
                    @click="toggleSort('expectValue')"
                >
                  折算价值/次 <span class="mdi" :class="sortIcon('expectValue')"/>
                </th>
              </tr>
              </thead>

              <tbody v-if="loading && !hasData">
              <tr v-for="n in 6" :key="n">
                <td colspan="6"><span class="rd-skeleton" style="display: block; height: 16px"></span></td>
              </tr>
              </tbody>

              <tbody v-else>
              <tr v-for="item in visibleRows" :key="item.itemId">
                <td>
                  <div class="rd-item">
                    <span class="rd-item__icon" :style="{'--rd-rarity': rarityColor(item.rarity)}">
                      <ItemImage :item-id="item.itemId" :size="28" :mobile-size="26"/>
                    </span>
                    <span style="min-width: 0">
                      <span class="rd-item__name">{{ item.name }}</span>
                      <span class="rd-item__id">{{ item.itemId }}</span>
                    </span>
                  </div>
                </td>
                <td>
                  <span
                      class="rd-rarity-tag"
                      :style="{'--rd-rarity': rarityColor(item.rarity)}"
                  >{{ rarityLabel(item.rarity) }}</span>
                </td>
                <td>{{ item.type }}</td>
                <td>
                  <div class="rd-rate">
                    <span class="rd-rate__bar">
                      <span class="rd-rate__fill" :style="{width: rateBarWidth(item)}"></span>
                    </span>
                    <span class="rd-rate__num">{{ formatRate(item.rate) }}</span>
                  </div>
                </td>
                <td class="is-num">{{ formatCount(item.quantity) }}</td>
                <td class="is-num">{{ formatValue(item.expectValue) }}</td>
              </tr>
              <tr v-if="!visibleRows.length">
                <td colspan="6">
                  <div class="rd-state">
                    <span class="mdi mdi-text-search"/>
                    <h3>没有匹配的物品</h3>
                    <p>换个关键词或切回「全部」稀有度试试。</p>
                  </div>
                </td>
              </tr>
              </tbody>
            </table>
          </div>

          <div class="rd-table__foot">
            <span>
              已显示 {{ visibleRows.length }} / {{ tableRows.length }} 种
              <template v-if="totalRecords"> · 分母 {{ formatCount(totalRecords) }} 条记录</template>
            </span>
            <button
                v-if="visibleRows.length < tableRows.length"
                class="rd-link-btn"
                @click="visibleCount += 30"
            >加载更多</button>
          </div>
        </section>
      </template>
    </template>
  </div>
</template>
