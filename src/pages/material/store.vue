<script setup>
import ModuleHeader from '@/components/layout/ModuleHeader.vue'
import NoticeBoard from '@/components/layout/NoticeBoard.vue'
import { computed, nextTick, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { getStageConfig } from '/src/utils/user/userConfig.js'
import '/src/assets/css/material/store.scss'
import '/src/assets/css/material/store.phone.scss'
import '/src/assets/css/sprite/sprite_plane_icon.css'
import STORE_PERM_DATA from '/src/static/json/material/store_perm_table.json'
import itemCache from '/src/plugins/indexedDB/itemCache.js'
import itemAPI from '/src/api/materialV5.js'

const storeListFormat = ref([])
const actStoreList = ref([])
const actStoreRef = ref(null)
const isDevMode = ref(false)
const exportingActivityStoreIndex = ref(null)
const activityStoreColumnLimit = ref(5)
const includeActivityStoreBanner = ref(true)
const includeActivityStoreTags = ref(true)
const includeActivityStoreOutline = ref(false)
const activityStoreBackground = ref('transparent')

const storeTypeList = [
  { typeName: 'green', iconId: '4005', dividing: 0.8, tier: 0.024, borderColor: 'rgb(0, 162, 162)' },
  { typeName: 'yellow', iconId: '4004', dividing: 9.0, tier: 1.5, borderColor: 'rgb(251, 192, 45)' },
  { typeName: 'orange', iconId: 'EPGS_COIN', dividing: 1.22, tier: 0.05, borderColor: 'rgb(232, 93, 6)' },
  { typeName: 'purple', iconId: 'REP_COIN', dividing: 1.6, tier: 0.32, borderColor: 'rgb(163, 53, 238)' },
  { typeName: 'grey', iconId: 'SOCIAL_PT', dividing: 6.5, tier: 1.6, borderColor: 'rgb(160, 160, 160)' },
]

const stageConfig = getStageConfig()
let itemValueMap = new Map()

const activityStoreLayoutClass = computed(() => {
  if (!isDevMode.value) {
    return null
  }
  return `activity-store-layout-${activityStoreColumnLimit.value}`
})

const activityStoreBackgroundClass = computed(() => {
  if (!isDevMode.value) {
    return null
  }
  return `activity-store-background-${activityStoreBackground.value}`
})

async function loadingStoreData() {
  itemValueMap = await itemCache.getItemValueMapCacheByConfig(stageConfig)
  itemValueMap.set('itempack_main', 20.7)
  permStoreComputed()
  activityStoreComputed()
}

function permStoreComputed() {
  for (const storeInfo of storeTypeList) {
    const data = STORE_PERM_DATA[storeInfo.typeName]
    for (const item of data) {
      const itemValue = itemValueMap.get(item.itemId)
      let apEfficiency = itemValue * item.quantity / item.price
      if (storeInfo.typeName === 'grey') {
        apEfficiency *= 100
      }
      item.apEfficiency = apEfficiency
    }
    data.sort((a, b) => b.apEfficiency - a.apEfficiency)
    storeInfo.list = data
  }

  storeListFormat.value = storeTypeList
}

function activityStoreComputed() {
  itemAPI.listActivityStore().then(response => {
    actStoreList.value = response.data
    for (const item of actStoreList.value) {
      item.actStoreFormat = formatActStore(item.actStore)
    }
  })
}

function formatActStore(data) {
  const actStoreFormat = [[], [], [], [], []]
  for (const item of data) {
    const { itemArea, itemId, itemPrice, itemQuantity, itemName } = item
    const itemValue = itemValueMap.get(itemId)
    const itemPPR = itemValue * itemQuantity / itemPrice
    actStoreFormat[itemArea - 1].push({
      itemPrice,
      itemId,
      itemName,
      itemPPR,
    })
  }

  for (const list of actStoreFormat) {
    list.sort((a, b) => b.itemPPR - a.itemPPR)
  }

  return actStoreFormat
}

function getActStoreBackgroundImage(path) {
  return `https://cos.yituliu.cn/${path}`
}

function getBackground(path) {
  return `background: linear-gradient(rgba(144, 164, 174, 0.7), rgba(144, 164, 174, 0.7)), url(${getActStoreBackgroundImage(path)}) no-repeat 50% 50% /cover;`
}

function getColor(color, dividing = 4, tier = 1) {
  if (color < 0) return 'color_t6'
  if (color < dividing - 3 * tier) return 'color_t1'
  if (color < dividing - 2 * tier) return 'color_t2'
  if (color < dividing - 1 * tier) return 'color_t3'
  if (color < dividing) return 'color_t4'
  return 'color_t5'
}

function getEfficiency(num, acc = 2) {
  return parseFloat(num).toFixed(acc)
}

function switchStore(item) {
  item.hide = !item.hide
  const storeStatusList = storeListFormat.value.map(t => t.hide)
  localStorage.setItem('storeStatusList', JSON.stringify(storeStatusList))
}

function getActivityStoreExportFileName(activityStore, index) {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const storeName = activityStore?.actName || `activity_store_${index + 1}`
  const safeStoreName = storeName.replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_').trim()
  return `${year}${month}${day}_${safeStoreName}_${activityStoreColumnLimit.value}col.png`
}

async function waitForImages(container) {
  const images = Array.from(container?.querySelectorAll('img') || [])
  await Promise.all(images.map(image => {
    if (image.complete && image.naturalWidth > 0) {
      return Promise.resolve()
    }

    return new Promise((resolve, reject) => {
      const handleLoad = () => resolve()
      const handleError = () => reject(new Error('导出前图片未加载成功'))

      image.addEventListener('load', handleLoad, { once: true })
      image.addEventListener('error', handleError, { once: true })
    })
  }))
}

async function exportActivityStorePng(activityStore, index) {
  const storeContainer = actStoreRef.value?.querySelector(`[data-activity-store-index="${index}"]`)
  if (!isDevMode.value || !storeContainer || exportingActivityStoreIndex.value !== null) {
    return
  }

  try {
    exportingActivityStoreIndex.value = index
    await nextTick()
    await document.fonts?.ready
    await waitForImages(storeContainer)

    const html2canvas = (await import('html2canvas')).default
    const exportBackgroundColor = {
      transparent: 'transparent',
      white: '#ffffff',
      gray: '#d9d9d9',
    }[activityStoreBackground.value]

    const canvas = await html2canvas(storeContainer, {
      backgroundColor: exportBackgroundColor === 'transparent' ? null : exportBackgroundColor,
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      onclone: (_, clonedStoreContainer) => {
        clonedStoreContainer.style.setProperty('background', exportBackgroundColor)
      },
    })

    const link = document.createElement('a')
    link.download = getActivityStoreExportFileName(activityStore, index)
    link.href = canvas.toDataURL('image/png')
    link.click()
    ElMessage.success(`${activityStore?.actName || '活动商店'} PNG 已下载`)
  } catch (error) {
    console.error('活动商店截图失败', error)
    ElMessage.error(error?.message || '活动商店截图失败')
  } finally {
    exportingActivityStoreIndex.value = null
  }
}

onMounted(() => {
  isDevMode.value = new URLSearchParams(window.location.search).get('mode') === 'dev'
  loadingStoreData()
  const storeStatusList = JSON.parse(localStorage.getItem('storeStatusList') || '[]')
  for (let i = 0; i < storeListFormat.value.length; i++) {
    storeListFormat.value[i].hide = storeStatusList[i]
  }
})
</script>

<template>
  <div class="store-page">
    <div
      id="actStore"
      ref="actStoreRef"
      :class="[
        activityStoreLayoutClass,
        activityStoreBackgroundClass,
        {
          'activity-store-dev-mode': isDevMode,
        },
      ]"
    >
      <ModuleHeader title="活动商店" title-en="Event Store" />

      <div v-if="isDevMode" class="activity-store-dev-card">
        <div class="activity-store-dev-card-title">截图控制</div>
        <div class="activity-store-dev-card-actions">
          <v-btn-toggle v-model="activityStoreColumnLimit" mandatory color="primary" density="comfortable">
            <v-btn :value="4">限制 4 列</v-btn>
            <v-btn :value="5">限制 5 列</v-btn>
            <v-btn :value="6">限制 6 列</v-btn>
            <v-btn :value="7">限制 7 列</v-btn>
            <v-btn :value="8">限制 8 列</v-btn>
          </v-btn-toggle>
          <v-btn-toggle v-model="activityStoreBackground" mandatory color="primary" density="comfortable">
            <v-btn value="transparent">透明背景</v-btn>
            <v-btn value="white">白底</v-btn>
            <v-btn value="gray">灰底</v-btn>
          </v-btn-toggle>
          <div class="activity-store-export-options">
            <v-checkbox
              v-model="includeActivityStoreBanner"
              label="导出 Banner"
              density="compact"
              hide-details
            />
            <v-checkbox
              v-model="includeActivityStoreTags"
              label="导出 Tag"
              density="compact"
              hide-details
            />
            <v-checkbox
              v-model="includeActivityStoreOutline"
              label="导出细线"
              density="compact"
              hide-details
            />
          </div>
          <div class="activity-store-export-actions">
            <v-btn
              v-for="(singleAct, index) in actStoreList"
              :key="singleAct.actName || index"
              color="primary"
              size="small"
              :loading="exportingActivityStoreIndex === index"
              :disabled="exportingActivityStoreIndex !== null && exportingActivityStoreIndex !== index"
              @click="exportActivityStorePng(singleAct, index)"
            >
              导出 {{ singleAct.actName || `活动商店 ${index + 1}` }}
            </v-btn>
          </div>
        </div>
      </div>

      <div
        v-for="(singleAct, index) in actStoreList"
        :key="index"
        class="act_store_block"
        :data-activity-store-index="index"
      >
        <div
          v-show="!isDevMode || includeActivityStoreBanner"
          class="act-banner-background"
          :style="getBackground(singleAct.imageLink)"
        >
          <img class="act-banner-img" :src="getActStoreBackgroundImage(singleAct.imageLink)" :alt="singleAct.actName" />
        </div>

        <div v-show="!isDevMode || includeActivityStoreTags" class="tag-group">
          <span
            v-for="(singleTag, tagIndex) in singleAct.actTagArea"
            :key="tagIndex"
            :class="`tag-rank-${singleTag.tagRank}`"
          >
            {{ singleTag.tagText }}
          </span>
        </div>

        <div v-for="(singleArea, areaIndex) in singleAct.actStoreFormat" :key="areaIndex" class="activity-store-content">
          <div
            v-for="(singleItem, itemIndex) in singleArea"
            :key="itemIndex"
            class="activity-store-good"
            :class="[
              `activity-store-good-area-${areaIndex + 1}`,
              { 'activity-store-good-with-outline': isDevMode && includeActivityStoreOutline },
            ]"
          >
            <div class="activity-store-good-sprite">
              <div :class="`bg-${singleItem.itemId}`"></div>
            </div>
            <div class="activity-store-good-info">
              <span class="activity-store-good-name">{{ singleItem.itemName }}</span>
              <span
                class="activity-store-good-efficiency"
                :class="getColor(singleItem.itemPPR, singleAct.actPPRBase, singleAct.actPPRStair)"
              >
                {{ getEfficiency(singleItem.itemPPR) }}
              </span>
              <span class="activity-store-good-price">{{ singleItem.itemPrice }}代币</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div id="store">
      <ModuleHeader title="采购中心" title-en="Store Ranking" :tips="['*点击图标切换']">
        <div class="flex">
          <div
            v-for="(item, index) in storeListFormat"
            :key="index"
            class="permanent-store-checkbox-button"
            :style="item.hide ? '' : 'filter: none;'"
            @click="switchStore(item)"
          >
            <div :class="`bg-icon_${item.iconId}`"></div>
          </div>
        </div>
      </ModuleHeader>

      <div
        v-for="(item, index) in storeListFormat"
        :key="index"
        v-show="!item.hide"
        class="permanent-store-content"
        :style="{ borderColor: item.borderColor }"
      >
        <div class="permanent-store-icon">
          <div :class="`bg-icon_${item.iconId}`"></div>
        </div>
        <div v-for="(mData, goodIndex) in item.list" :key="goodIndex" class="permanent-store-good">
          <div class="permanent-store-good-sprite">
            <div :class="`bg-${mData.itemId}`"></div>
          </div>
          <p class="permanent-store-good-text" :class="getColor(mData.apEfficiency, item.dividing, item.tier)">
            {{ getEfficiency(mData.apEfficiency) }}
          </p>
        </div>
      </div>
    </div>

    <NoticeBoard module="store" />
  </div>
</template>

<style lang="scss">
#store {
  max-width: 1320px;

  .op_title {
    display: flex;
  }

  .op_title_tag {
    display: flex;
    align-items: flex-end;

    .op_title_tag_item {
      height: 45px;
      width: 45px;
      margin: 0 4px;
      box-shadow: 2px 2px 6px 0 rgba(0, 0, 0, 0.3);
      border-radius: 4px;
      background: #f0f0f0;
      display: flex;
      align-items: center;
      justify-content: center;

      &.hide {
        filter: grayscale(100%);
      }
    }
  }

  .store-content {
    border: 1px solid transparent;

    &.hide {
      display: none;
    }

    .permanent-store-good {
      flex-grow: 0;
    }
  }
}

#actStore {
  max-width: 1320px;

  p {
    margin: 0;
  }

  .activity-store-dev-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin: 12px 16px 16px;
    padding: 16px;
    background: rgba(255, 255, 255, 0.92);
    border: 1px solid rgba(0, 0, 0, 0.08);
    border-radius: 12px;
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08);
  }

  .activity-store-dev-card-title {
    font-size: 16px;
    font-weight: 700;
    color: #1f2937;
    white-space: nowrap;
  }

  .activity-store-dev-card-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 12px;
    flex-wrap: wrap;
  }

  .activity-store-export-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    flex-wrap: wrap;
  }

  .activity-store-export-options {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  &.activity-store-dev-mode {
    .activity-store-good {
      box-sizing: border-box;
      background: #ffffff;
      box-shadow: none;
    }

    .activity-store-good.activity-store-good-with-outline {
      border-top: 1px solid rgba(128, 128, 128, 0.5);
      border-right: 1px solid rgba(128, 128, 128, 0.5);
      border-bottom: 1px solid rgba(128, 128, 128, 0.5);
    }

    &.activity-store-background-transparent {
      .act_store_block {
        background: transparent;
      }
    }

    &.activity-store-background-white {
      .act_store_block {
        background: #ffffff;
      }
    }

    &.activity-store-background-gray {
      .act_store_block {
        background: #d9d9d9;
      }
    }
  }

  &.activity-store-layout-4 {
    width: 744px;
    max-width: 744px;
  }

  &.activity-store-layout-5 {
    width: 930px;
    max-width: 930px;
  }

  &.activity-store-layout-6 {
    width: 1116px;
    max-width: 1116px;
  }

  &.activity-store-layout-7 {
    width: 1302px;
    max-width: 1302px;
  }

  &.activity-store-layout-8 {
    width: 1488px;
    max-width: 1488px;
  }

  .act_content {
    justify-content: flex-start;

    .act_card_detail {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      height: 100%;
      padding: 12px 0;
      box-sizing: border-box;

      .act_card_item_name,
      .act_card_item_price {
        color: gray;
        font-size: 12px;
      }

      .act_card_item_efficiency {
        font-size: 30px;
        font-weight: bold;
      }
    }
  }
}
</style>
