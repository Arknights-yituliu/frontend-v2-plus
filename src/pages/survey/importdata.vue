<script setup>
import { ref, computed, onMounted } from "vue"
import { copyTextToClipboard } from "/src/utils/copyText.js"
import SklandAPI from '/src/utils/survey/skland.js'
import { userInfo } from "/src/utils/user/userInfo.js"
import { createMessage } from "/src/utils/message.js"
import operatorDataAPI from '/src/api/operatorData.js'
import { useRouter } from "vue-router"
import { operatorTableV2 } from "/src/utils/gameData.js"
import operatorUpdateTime from '/public/json/operator_update_time.json'

// 子组件
import OperatorCard from '/src/components/survey/account-overview/OperatorCard.vue'

const router = useRouter()

const SKLAND_LINK = 'https://www.skland.com/index'
const CONSOLE_CODE = "copy(localStorage.getItem('SK_OAUTH_CRED_KEY')+','+localStorage.getItem('SK_TOKEN_CACHE_KEY'))"

// 联动干员ID列表
const COLLAB_OPERATOR_IDS = new Set([
  'char_197_poca', 'char_198_blackd', 'char_199_blitz', 'char_200_frost', 'char_201_moeshd',
  'char_276_blitz', 'char_277_tachak', 'char_278_ahorn',
  'char_4182_oblvns', 'char_4183_mortis', 'char_4186_tmoris', 'char_4184_dolris', 'char_4185_amoris'
])

// 状态管理
const loading = ref(false)
const inputText = ref('')
const playBindingList = ref([])
const sklandCred = ref('')
const sklandToken = ref('')
const accountData = ref(null)
const rawWarehouseData = ref(null)
const currentBinding = ref(null)

// 获取限定干员列表
const limitedOperatorIds = computed(() => {
  const ids = new Set()
  for (const charId in operatorUpdateTime) {
    if (operatorUpdateTime[charId].obtainApproach === '限定干员') {
      ids.add(charId)
    }
  }
  return ids
})


function openLinkOnNewPage(url) {
  window.open(url)
}

function copyText(text) {
  copyTextToClipboard(text)
}

function getCredAndSecret(text) {
  text = text.replace(/\s+/g, '').replace(/["']/g, '')
  const textArr = text.split(',')
  const cred = textArr[0]
  const token = textArr[1]
  return { cred, token }
}

async function getPlayerBindingBySkland() {
  if (!inputText.value) {
    createMessage({ type: 'error', text: '请输入森空岛凭证' })
    return
  }
  
  loading.value = true
  try {
    const { cred, token } = getCredAndSecret(inputText.value)
    sklandCred.value = cred
    sklandToken.value = token
    
    const playBinding = await SklandAPI.getPlayBindingV2('', '', cred, token)
    playBindingList.value = playBinding.bindingList
    
    if (playBinding.bindingList.length === 0) {
      createMessage({ type: 'warning', text: '未找到绑定的明日方舟账号' })
    }
  } catch (error) {
    console.error(error)
    createMessage({ type: 'error', text: '获取账号信息失败' })
  } finally {
    loading.value = false
  }
}

async function getPlayerData(binding) {
  const { uid, nickName, channelName, channelMasterId } = binding
  
  loading.value = true
  createMessage({ type: 'info', text: '正在获取账号数据，请稍候...' })
  
  try {
    currentBinding.value = binding
    
    // 获取账号概览数据
    const data = await SklandAPI.getAccountOverviewData(
      uid,
      nickName,
      channelName,
      sklandCred.value,
      sklandToken.value
    )
    
    // 同时获取原始仓库数据用于上传
    const warehouseData = await SklandAPI.getWarehouseInfo(uid, sklandCred.value, sklandToken.value)
    warehouseData.channelName = channelName
    warehouseData.channelMasterId = channelMasterId
    warehouseData.nickName = nickName
    rawWarehouseData.value = warehouseData
    
    // 添加干员详细信息
    for (const operator of data.operatorDataList) {
      const charInfo = operatorTableV2[operator.charId]
      if (charInfo) {
        operator.name = charInfo.name
        operator.profession = charInfo.profession
        operator.skills = charInfo.skills || []
        operator.equip = charInfo.equip || []
        operator.isLimited = limitedOperatorIds.value.has(operator.charId)
        operator.isCollab = COLLAB_OPERATOR_IDS.has(operator.charId)
      }
    }
    
    // 排序干员
    data.operatorDataList.sort((a, b) => {
      if (b.rarity !== a.rarity) return b.rarity - a.rarity
      if (b.elite !== a.elite) return b.elite - a.elite
      return b.level - a.level
    })
    
    accountData.value = data
    
    createMessage({ type: 'success', text: '账号数据获取成功！' })
  } catch (error) {
    console.error(error)
    createMessage({ type: 'error', text: '获取账号数据失败' })
  } finally {
    loading.value = false
  }
}

</script>

<template>
  <div class="import-page">
    <!-- 数据获取步骤 -->
    <div  class="data-input-section">
      <h1 class="page-title">森空岛数据导入</h1>
      <p class="page-desc">从森空岛获取您的明日方舟账号数据，可同步到干员练度调查，也可生成账号信息一图流</p>
      
      <div class="flex flex-wrap">
        <v-card class="import-step-card" title="第一步：登录森空岛">
          <v-card-text>
            <div class="flex flex-col flex-wrap justify-center">
              <p class="m-12 text-center">登录森空岛</p>
              <v-btn color="primary" text="森空岛官网链接" class="m-12-a"
                     @click="openLinkOnNewPage(SKLAND_LINK)">
              </v-btn>
              <v-alert :icon="false" color="primary" variant="tonal">此导入方式仅适合电脑，windows系统建议使用microsoft
                edge浏览器，iOS系统建议使用safari浏览器）
              </v-alert>
            </div>
          </v-card-text>
        </v-card>
        
        <v-card class="import-step-card" title="第二步：获取凭证">
          <v-card-text>
            <img src="/image/skland/step1.jpg" alt="" class="import-step-image">
            <div class="flex flex-col justify-center">
              <p>登录后按键盘F12调出开发者工具，在下方选择控制台(console)，输入以下命令：</p>
              <v-alert :icon="false" color="primary" variant="tonal" class="code-alert">
                <code>{{ CONSOLE_CODE }}</code>
              </v-alert>
              <p class="hint-text">执行后凭证会自动复制到剪贴板</p>
              <div class="flex flex-col justify-center m-8-a">
                <v-btn color="primary" text="点击复制" @click="copyText(CONSOLE_CODE)">
                </v-btn>
              </div>
            </div>
          </v-card-text>
        </v-card>
        
        <v-card class="import-step-card" title="第三步：输入凭证">
          <v-card-text>
            <div class="flex flex-col justify-center">
              <p>将获取的字符串<b>（*不要带引号）</b>，粘贴到下面的输入框中</p>
              <v-text-field label="输入神秘字符后点击获取按钮" v-model="inputText"
                            density="compact" hide-details variant="outlined"
                            class="m-8">
              </v-text-field>
              <v-btn color="primary" text="获取森空岛信息" class="m-8-a" @click="getPlayerBindingBySkland" :loading="loading"></v-btn>
            </div>
          </v-card-text>
        </v-card>
        
        <v-card class="import-step-card" title="第四步：选择账号">
          <v-card-text>
            <div>
              <p v-if="playBindingList.length === 0">请先完成前面的步骤获取账号列表</p>
              <div v-else>
                <p>选择要获取数据的账号：</p>
                <v-btn v-for="(binding, index) in playBindingList" :key="index"
                       color="primary"
                       style="width: 100%; max-width: none;height: auto;text-align: start;margin: 4px 0;padding: 12px;"
                       @click="getPlayerData(binding)" :loading="loading">
                  <div style="width: 100%;">
                    <span class="nickname">{{ binding.nickName }}</span><br>
                    <span class="channel">{{ `区服：${binding.channelName}  uid: ${binding.uid}` }}</span>
                  </div>
                </v-btn>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </div>
    </div>
    

  </div>
</template>

<style scoped>
.import-page {
  padding: 16px;
  min-height: 95vh;
}

.page-title {
  text-align: center;
  font-size: 28px;
  margin-bottom: 10px;
  color: var(--c-text-color);
}

.page-desc {
  text-align: center;
  color: var(--c-text-secondary);
  margin-bottom: 20px;
}

.import-step-card {
  width: 340px;
  margin: 4px;
}

.import-step-image {
  width: 95%;
  margin: 0 auto;
}

.code-alert {
  font-size: 12px;
  word-break: break-all;
  margin: 8px 0;
}

.hint-text {
  font-size: 12px;
  color: var(--c-text-secondary);
  margin: 4px 0;
  text-align: center;
}

.nickname {
  font-weight: bold;
  font-size: 16px;
}

.channel {
  font-size: 12px;
  opacity: 0.8;
}

.preview-section {
  max-width: 1400px;
  margin: 0 auto;
}

.preview-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 10px;
  background: var(--c-card-bg);
  border-radius: 8px;
  flex-wrap: wrap;
  gap: 10px;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.export-container {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  padding: 24px;
  border-radius: 12px;
  color: #fff;
}

.account-header {
  text-align: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.account-name {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 8px;
}

.account-stats {
  display: flex;
  justify-content: center;
  gap: 20px;
  color: rgba(255, 255, 255, 0.7);
}

.operator-grid-section {
  margin-top: 16px;
}

.rarity-group {
  margin-bottom: 16px;
}

.rarity-header {
  margin-bottom: 10px;
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.rarity-label {
  font-size: 15px;
  font-weight: bold;
  padding: 3px 10px;
  border-radius: 4px;
}

.rarity-6 {
  background: linear-gradient(135deg, #FF5722 0%, #FF9800 100%);
  color: #fff;
}

.rarity-5 {
  background: linear-gradient(135deg, #FFD700 0%, #FFC107 100%);
  color: #333;
}

.rarity-4 {
  background: linear-gradient(135deg, #9C27B0 0%, #BA68C8 100%);
  color: #fff;
}

.rarity-3 {
  background: linear-gradient(135deg, #2196F3 0%, #64B5F6 100%);
  color: #fff;
}

.rarity-2 {
  background: linear-gradient(135deg, #4CAF50 0%, #8BC34A 100%);
  color: #fff;
}

.rarity-1 {
  background: linear-gradient(135deg, #9E9E9E 0%, #E0E0E0 100%);
  color: #333;
}

.operators-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.watermark {
  text-align: center;
  padding-top: 20px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.5);
}

@media screen and (max-width: 600px) {
  .import-step-card {
    width: 100%;
  }
  
  .preview-toolbar {
    flex-direction: column;
    align-items: stretch;
  }
  
  .toolbar-left,
  .toolbar-right {
    width: 100%;
    justify-content: center;
  }
  
  .operators-grid {
    gap: 4px;
    justify-content: center;
  }
}
</style>