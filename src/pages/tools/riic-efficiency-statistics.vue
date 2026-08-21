<script setup>
import { computed, onMounted, ref } from 'vue'

const workbookUrl = '/data/riic-beginner-efficiency.xlsx'
const workbook = ref(null)
const activeSheet = ref('')
const searchText = ref('')
const errorMessage = ref('')

const sheets = computed(() => workbook.value?.sheets || [])
const currentSheet = computed(() => sheets.value.find(sheet => sheet.name === activeSheet.value) || sheets.value[0])
const filteredRows = computed(() => {
  const rows = currentSheet.value?.rows || []
  const keyword = searchText.value.trim().toLowerCase()
  if (!keyword) return rows
  return rows.filter(row => row.some(cell => String(cell.value ?? '').toLowerCase().includes(keyword)))
})

function normalizeCell(value) {
  if (value === null || value === undefined) return ''
  if (typeof value === 'number') {
    return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(4)))
  }
  return String(value)
}

async function loadWorkbook() {
  try {
    if (!window.XLSX) throw new Error('Excel解析组件尚未加载')
    const response = await fetch(workbookUrl)
    if (!response.ok) throw new Error(`工作簿加载失败（${response.status}）`)
    const bytes = await response.arrayBuffer()
    const parsed = window.XLSX.read(bytes, { type: 'array', cellFormula: false })
    workbook.value = {
      sheets: parsed.SheetNames.map(name => ({
        name,
        rows: buildSheetRows(parsed.Sheets[name]),
      })),
    }
    activeSheet.value = parsed.SheetNames[0] || ''
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '工作簿加载失败'
  }
}

onMounted(loadWorkbook)

function buildSheetRows(sheet) {
  const range = window.XLSX.utils.decode_range(sheet['!ref'] || 'A1:A1')
  const rows = Array.from({ length: range.e.r - range.s.r + 1 }, () =>
    Array.from({ length: range.e.c - range.s.c + 1 }, () => ({ value: '', covered: false })),
  )

  for (let rowIndex = range.s.r; rowIndex <= range.e.r; rowIndex++) {
    for (let columnIndex = range.s.c; columnIndex <= range.e.c; columnIndex++) {
      const address = window.XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex })
      rows[rowIndex - range.s.r][columnIndex - range.s.c].value = normalizeCell(sheet[address]?.v)
    }
  }

  for (const merge of sheet['!merges'] || []) {
    const row = merge.s.r - range.s.r
    const column = merge.s.c - range.s.c
    const anchor = rows[row]?.[column]
    if (!anchor) continue
    anchor.rowspan = merge.e.r - merge.s.r + 1
    anchor.colspan = merge.e.c - merge.s.c + 1
    for (let rowIndex = merge.s.r; rowIndex <= merge.e.r; rowIndex++) {
      for (let columnIndex = merge.s.c; columnIndex <= merge.e.c; columnIndex++) {
        if (rowIndex === merge.s.r && columnIndex === merge.s.c) continue
        const cell = rows[rowIndex - range.s.r]?.[columnIndex - range.s.c]
        if (cell) cell.covered = true
      }
    }
  }

  return rows
}
</script>

<template>
  <main class="riic-efficiency-page">
    <header class="riic-efficiency-header">
      <div>
        <p class="riic-efficiency-kicker">罗德岛基建 / 数据参考</p>
        <h1>基建效率统计与新手指南</h1>
        <p class="riic-efficiency-description">
          汇总新手可用干员、各设施效率、宿管、干员替换与特殊效率计算，数据来自分发表格，仅供统计与规划参考。
        </p>
      </div>
      <div class="riic-efficiency-note">
        <strong>使用说明</strong>
        <span>原表注明：统计可能存在错误或遗漏；发电站、会客室、办公室排序未考虑心情消耗。</span>
      </div>
    </header>

    <section v-if="errorMessage" class="riic-efficiency-state riic-efficiency-state--error">
      {{ errorMessage }}。请刷新页面后重试。
    </section>
    <section v-else-if="!currentSheet" class="riic-efficiency-state">正在加载工作簿...</section>
    <template v-else>
      <nav class="riic-efficiency-tabs" aria-label="工作表选择">
        <button
          v-for="sheet in sheets"
          :key="sheet.name"
          type="button"
          :class="{ active: sheet.name === currentSheet.name }"
          @click="activeSheet = sheet.name"
        >
          {{ sheet.name }}
        </button>
      </nav>

      <section class="riic-efficiency-toolbar">
        <span class="riic-efficiency-current">当前工作表：{{ currentSheet.name }}</span>
        <input v-model="searchText" type="search" placeholder="筛选当前工作表内容" aria-label="筛选当前工作表内容" />
        <span class="riic-efficiency-count">{{ filteredRows.length }} 行</span>
      </section>

      <section class="riic-efficiency-table-wrap">
        <table class="riic-efficiency-table">
          <tbody>
            <tr v-for="(row, rowIndex) in filteredRows" :key="`${currentSheet.name}-${rowIndex}`">
              <template v-for="(cell, cellIndex) in row" :key="`${rowIndex}-${cellIndex}`">
                <td
                  v-if="!cell.covered || searchText.trim()"
                  :colspan="searchText.trim() ? 1 : cell.colspan || 1"
                  :rowspan="searchText.trim() ? 1 : cell.rowspan || 1"
                  :class="{ 'is-heading': rowIndex < 3 }"
                >
                  {{ cell.value }}
                </td>
              </template>
            </tr>
          </tbody>
        </table>
      </section>
    </template>
  </main>
</template>

<style scoped>
.riic-efficiency-page {
  min-height: 100vh;
  padding: 24px 3vw 48px;
  color: var(--c-text-color);
}

.riic-efficiency-header {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  max-width: 1440px;
  margin: 0 auto 20px;
  padding-bottom: 18px;
  border-bottom: 1px solid var(--c-border-color);
}

.riic-efficiency-kicker {
  margin: 0 0 6px;
  color: var(--c-secondary-text-color);
  font-size: 13px;
}

h1 {
  margin: 0;
  font-size: clamp(22px, 3vw, 32px);
}

.riic-efficiency-description {
  max-width: 760px;
  margin: 10px 0 0;
  color: var(--c-secondary-text-color);
  line-height: 1.7;
}

.riic-efficiency-note {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-self: flex-start;
  max-width: 360px;
  padding: 12px 14px;
  border-left: 3px solid #d48b35;
  background: var(--c-page-background-color-secondary);
  color: var(--c-secondary-text-color);
  font-size: 13px;
  line-height: 1.6;
}

.riic-efficiency-note strong { color: var(--c-text-color); }
.riic-efficiency-tabs,
.riic-efficiency-toolbar,
.riic-efficiency-table-wrap { max-width: 1440px; margin-right: auto; margin-left: auto; }

.riic-efficiency-tabs {
  display: flex;
  gap: 4px;
  overflow-x: auto;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--c-border-color);
}

.riic-efficiency-tabs button {
  flex: 0 0 auto;
  padding: 9px 14px;
  border: 1px solid var(--c-border-color);
  border-radius: 4px 4px 0 0;
  background: var(--c-page-background-color-secondary);
  color: var(--c-secondary-text-color);
  cursor: pointer;
}

.riic-efficiency-tabs button.active {
  border-color: #2878c8;
  background: #2878c8;
  color: #fff;
}

.riic-efficiency-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 0 8px;
}

.riic-efficiency-current { font-weight: 600; }
.riic-efficiency-toolbar input { width: min(320px, 55vw); margin-left: auto; padding: 8px 10px; border: 1px solid var(--c-border-color); border-radius: 4px; background: var(--c-page-background-color); color: inherit; }
.riic-efficiency-count { color: var(--c-secondary-text-color); font-size: 13px; white-space: nowrap; }
.riic-efficiency-table-wrap { overflow: auto; }
.riic-efficiency-table { min-width: 760px; width: max-content; min-height: 120px; border-collapse: collapse; background: var(--c-page-background-color-secondary); font-size: 14px; line-height: 1.5; }
.riic-efficiency-table td { min-width: 110px; max-width: 520px; padding: 8px 10px; border: 1px solid var(--c-border-color); white-space: pre-line; vertical-align: top; }
.riic-efficiency-table td.is-heading { background: color-mix(in srgb, #2878c8 10%, var(--c-page-background-color-secondary)); font-weight: 600; }
.riic-efficiency-state { max-width: 1440px; margin: 40px auto; color: var(--c-secondary-text-color); }
.riic-efficiency-state--error { color: #c0392b; }

@media (max-width: 700px) {
  .riic-efficiency-page { padding: 16px 12px 32px; }
  .riic-efficiency-header { display: block; }
  .riic-efficiency-note { margin-top: 16px; }
  .riic-efficiency-toolbar { flex-wrap: wrap; }
  .riic-efficiency-toolbar input { order: 3; width: 100%; margin-left: 0; }
}
</style>
