<script setup>
import {computed, onBeforeUnmount, onMounted, ref} from 'vue'

const NOTICE_ID = 'server-maintenance-20260927'
const STORAGE_KEY = `site-notice-read:${NOTICE_ID}`
const MAINTENANCE_START = Date.parse('2026-09-27T21:00:00+08:00')
const DISPLAY_CUTOFF = Date.parse('2026-09-27T22:00:00+08:00')

const currentTime = ref(Date.now())
const wasAcknowledged = ref(readAcknowledged())
let timerId

const shouldShowNotice = computed(() => currentTime.value < DISPLAY_CUTOFF && !wasAcknowledged.value)

const dialogOpen = computed({
  get: () => shouldShowNotice.value,
  set: (open) => {
    if (!open && shouldShowNotice.value) {
      acknowledgeNotice()
    }
  },
})

const countdownTitle = computed(() => {
  const remainingSeconds = Math.ceil((MAINTENANCE_START - currentTime.value) / 1000)
  if (remainingSeconds <= 0) return '服务器维护可能随时开始'

  const hours = Math.floor(remainingSeconds / 3600)
  const minutes = Math.floor((remainingSeconds % 3600) / 60)
  const seconds = remainingSeconds % 60
  const format = (value) => String(value).padStart(2, '0')
  return `距离服务器维护还有 ${format(hours)}:${format(minutes)}:${format(seconds)}`
})

function readAcknowledged() {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

function acknowledgeNotice() {
  wasAcknowledged.value = true
  try {
    localStorage.setItem(STORAGE_KEY, '1')
  } catch {
    // Keep the notice dismissed for this page even when browser storage is unavailable.
  }
}

function updateCurrentTime() {
  currentTime.value = Date.now()
  if (currentTime.value >= DISPLAY_CUTOFF && timerId !== undefined) {
    window.clearInterval(timerId)
    timerId = undefined
  }
}

function handleStorage(event) {
  if (event.key === STORAGE_KEY && event.newValue === '1') {
    wasAcknowledged.value = true
  }
}

onMounted(() => {
  window.addEventListener('storage', handleStorage)
  document.addEventListener('visibilitychange', updateCurrentTime)
  if (currentTime.value < DISPLAY_CUTOFF) {
    timerId = window.setInterval(updateCurrentTime, 1000)
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('storage', handleStorage)
  document.removeEventListener('visibilitychange', updateCurrentTime)
  if (timerId !== undefined) window.clearInterval(timerId)
})
</script>

<template>
  <v-dialog v-model="dialogOpen" max-width="480" aria-labelledby="maintenance-title">
    <v-card class="maintenance-dialog" rounded="lg">
      <div class="dialog-topline">
        <div class="notice-icon">
          <v-icon icon="mdi-wrench-clock" size="24" />
        </div>
        <v-btn
          icon="mdi-close"
          variant="text"
          size="small"
          aria-label="关闭维护提醒"
          @click="acknowledgeNotice"
        />
      </div>

      <div class="dialog-content">
        <div class="notice-kicker">服务器维护通知</div>
        <h2 id="maintenance-title">{{ countdownTitle }}</h2>
        <p class="notice-description">
          我们将于 2026年9月27日 21:00（UTC+8）对服务器进行维护，预计持续约3小时。<br />
          部分页面可以离线运行，如有需要可以提前打开。
        </p>

        <div class="dialog-actions">
          <v-btn color="primary" min-width="120" @click="acknowledgeNotice">
            知道了
          </v-btn>
        </div>
      </div>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.maintenance-dialog {
  padding: 20px 24px 24px;
}

.dialog-topline {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.notice-icon {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  border-radius: 8px;
  color: #9a5a12;
  background: #fff0d7;
}

.dialog-content {
  padding-top: 18px;
}

.notice-kicker {
  margin-bottom: 8px;
  color: #a46320;
  font-size: 13px;
  font-weight: 650;
}

.dialog-content h2 {
  margin: 0 0 12px;
  font-size: 22px;
  line-height: 1.35;
  font-weight: 650;
}

.notice-description {
  margin: 0;
  color: rgba(var(--v-theme-on-surface), 0.72);
  line-height: 1.65;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  padding-top: 24px;
}

@media (max-width: 600px) {
  .maintenance-dialog {
    padding: 16px 18px 20px;
  }
}
</style>
