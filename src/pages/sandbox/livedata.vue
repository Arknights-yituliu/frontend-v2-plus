<template>
  <v-container class="pa-4">
    <v-row>
      <v-col cols="12">
        <h2 class="text-h5 mb-4">直播数据表格（可多选+自动缓存）</h2>
      </v-col>

      <!-- JSON 输入 -->
      <v-col cols="12">
        <v-textarea
          v-model="jsonInput"
          label="输入完整 JSON"
          rows="12"
          placeholder="请粘贴完整接口返回 JSON"
          outlined
        ></v-textarea>
      </v-col>

      <!-- 时间选择 -->
      <v-col cols="12" md="6">
        <v-text-field
          v-model="startTime"
          label="起始时间"
          type="datetime-local"
        ></v-text-field>
      </v-col>
      <v-col cols="12" md="6">
        <v-text-field
          v-model="endTime"
          label="结束时间"
          type="datetime-local"
        ></v-text-field>
      </v-col>

      <!-- 按钮 -->
      <v-col cols="12">
        <v-btn color="primary" @click="parseJson" class="me-2">
          生成表格
        </v-btn>
        <v-btn color="success" @click="generateLink" class="me-2">
          生成链接
        </v-btn>
      </v-col>

      <!-- 错误提示 -->
      <v-col cols="12" v-if="errorMessage">
        <v-alert type="error" dense>{{ errorMessage }}</v-alert>
      </v-col>

      <!-- 表格 -->
      <v-col cols="12" v-if="tableData.length">
        <v-data-table
          v-model="selected"
          :headers="headers"
          :items="tableData"
          item-value="date"
          show-select
          class="elevation-1"
        ></v-data-table>

        <div class="mt-4">
          <strong>选中总时长(小时)：</strong> {{ totalSelectedDuration }}
          <br />
          <strong>选中有效观看(小时)：</strong> {{ totalSelectedEffective }}
        </div>
      </v-col>

      <!-- 链接展示 -->
      <v-col cols="12" v-if="generatedLink">
        <v-alert type="info" dense class="d-flex justify-space-between align-center">
          <div>
            <a :href="generatedLink" target="_blank">{{ generatedLink }}</a>
          </div>
          <v-btn small icon @click="copyLink">
            <v-icon>mdi-content-copy</v-icon>
          </v-btn>
        </v-alert>
      </v-col>

      <!-- 复制成功提示 -->
      <v-snackbar v-model="snackbar" color="success" timeout="2000">
        链接已复制到剪贴板
      </v-snackbar>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'

const tableData = ref([])

const headers = ref([
  { text: '日期', value: 'date' },
  { text: '标题', value: 'title' },
  { text: '分区', value: 'area_name' },
  { text: '开始时间', value: 'start_time' },
  { text: '结束时间', value: 'end_time' },
  { text: '时长(小时)', value: 'live_time_hours' },
  { text: '有效观看(小时)', value: 'effective_viewing_time_hours' },
  { text: '弹幕数', value: 'danmu_num' },
  { text: '最高在线', value: 'max_online' },
  { text: '打赏(RMB)', value: 'hamster_rmb' },
  { text: '新增关注', value: 'new_attention' },
  { text: '新增粉丝团', value: 'new_fans_club' },
])

watch([headers, tableData], () => {
  console.log('========== DEBUG ==========')
  console.log('HEADERS:', headers.value)
  console.log('TABLE DATA SAMPLE:', JSON.parse(JSON.stringify(tableData.value.slice(0, 1))))
  console.log('TABLE DATA KEYS:', Object.keys(tableData.value[0] || {}))
  console.log('===========================')
}, { deep: true })


// ✅ 响应式
const jsonInput = ref('')
const selected = ref([])
const errorMessage = ref('')


const startTime = ref('')
const endTime = ref('')
const generatedLink = ref('')
const snackbar = ref(false)

// ✅ 默认时间
onMounted(() => {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const hh = String(now.getHours()).padStart(2, '0')
  const min = String(now.getMinutes()).padStart(2, '0')

  startTime.value = `${yyyy}-${mm}-01T00:00`
  endTime.value = `${yyyy}-${mm}-${dd}T${hh}:${min}`

  // ✅ 加载 localStorage
  const saved = localStorage.getItem('session_table_data')
  if (saved) {
    try {
      tableData.value = JSON.parse(saved)
    } catch {}
  }
})

// ✅ 解析 JSON + 缓存
const parseJson = () => {
  errorMessage.value = ''
  try {
    const parsed = JSON.parse(jsonInput.value)
    const list = parsed.data?.date_info?.date_item_info
    if (!Array.isArray(list)) {
      throw new Error('找不到 data.date_info.date_item_info')
    }

    const rows = list.map(item => ({
      date: item.date,
      title: item.title,
      area_name: item.area_name,
      start_time: item.start_time,
      end_time: item.end_time,
      live_time_hours: Math.floor((item.live_time || 0) / 360) / 10,
      effective_viewing_time_hours: Math.floor((item.effective_viewing_time || 0) / 360) / 10,
      danmu_num: item.danmu_num,
      max_online: item.max_online,
      hamster_rmb: item.hamster_rmb,
      new_attention: item.new_attention,
      new_fans_club: item.new_fans_club,
    }))

    tableData.value = rows

    // ✅ 保存到 localStorage
    localStorage.setItem('session_table_data', JSON.stringify(rows))
  } catch (err) {
    errorMessage.value = '解析失败: ' + err.message
  }
}

// ✅ 多选汇总
const totalSelectedDuration = computed(() => {
  return selected.value.reduce((sum, row) => sum + (row.live_time_hours || 0), 0).toFixed(1)
})

const totalSelectedEffective = computed(() => {
  return selected.value.reduce((sum, row) => sum + (row.effective_viewing_time_hours || 0), 0).toFixed(1)
})

// ✅ 链接生成
const generateLink = () => {
  if (!startTime.value || !endTime.value) {
    generatedLink.value = ''
    errorMessage.value = '请先选择起始和结束时间'
    return
  }
  const startTimestamp = Math.floor(new Date(startTime.value).getTime() / 1000)
  const endTimestamp = Math.floor(new Date(endTime.value).getTime() / 1000)

  generatedLink.value = `https://api.live.bilibili.com/xlive/app-blink/v1/index/getSessionRecordList?start_date=${startTimestamp}&end_date=${endTimestamp}&platform=web&page_num=1&page_size=10`
  errorMessage.value = ''
}

const copyLink = async () => {
  try {
    await navigator.clipboard.writeText(generatedLink.value)
    snackbar.value = true
  } catch (err) {
    console.error('复制失败', err)
  }
}
</script>

<style scoped></style>
