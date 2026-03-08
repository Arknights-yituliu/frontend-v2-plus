<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { copyTextToClipboard } from "/src/utils/copyText.js"
import SklandAPI from '/src/utils/survey/skland.js'
import { createMessage } from "/src/utils/message.js"
import { operatorTableV2 } from "/src/utils/gameData.js"
import operatorUpdateTime from '/public/json/operator_update_time.json'
import operatorDataAPI from '/src/api/operatorData.js'
import { userInfo } from "/src/utils/user/userInfo.js"

// 子组件
import AccountStats from '/src/components/survey/account-overview/AccountStats.vue'
import OperatorGrid from '/src/components/survey/account-overview/OperatorGrid.vue'
import MaterialGrid from '/src/components/survey/account-overview/MaterialGrid.vue'

const router = useRouter()

// 森空岛链接和命令
const SKLAND_LINK = 'https://www.skland.com/index'
const CONSOLE_CODE = "copy(localStorage.getItem('SK_OAUTH_CRED_KEY')+','+localStorage.getItem('SK_TOKEN_CACHE_KEY'))"

// 联动干员名称列表
const COLLAB_OPERATOR_NAMES = new Set([
  '丰川祥子','若叶睦','八幡海铃','三角初华','祐天寺若麦',//母鸡卡联动
  '玛露西尔','莱欧斯','森西','齐尔查克',//迷宫饭联动
  '艾拉','双月','医生','导火索',//彩六联动2期
  '泰拉大陆调查团','麒麟R夜刀','火龙S黑角',//怪猎联动
  '灰烬','闪击','霜华','战车',//彩六联动1期
  '罗小黑'//罗小黑联动
])

// 状态管理
const loading = ref(false)
const uploading = ref(false)
const inputText = ref('')
const playBindingList = ref([])
const sklandCred = ref('')
const sklandToken = ref('')
const accountData = ref(null)
const rawWarehouseData = ref(null) // 保存原始仓库数据用于上传
const showPreview = ref(false)
const exportContainerRef = ref(null)
const currentBinding = ref(null) // 保存当前选择的账号信息

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

// 根据名称获取联动干员charId集合
const collabOperatorIds = computed(() => {
  const ids = new Set()
  for (const charId in operatorTableV2) {
    const operator = operatorTableV2[charId]
    if (operator && COLLAB_OPERATOR_NAMES.has(operator.name)) {
      ids.add(charId)
    }
  }
  return ids
})

// 联动干员总数
const totalCollabOperators = computed(() => {
  return COLLAB_OPERATOR_NAMES.size
})

// 获取限定六星总数（使用operator_update_time.json统计）
const totalLimitedSixStar = computed(() => {
  let count = 0
  for (const charId in operatorUpdateTime) {
    const updateInfo = operatorUpdateTime[charId]
    // 检查是否为限定干员
    if (updateInfo.obtainApproach === '限定干员') {
      // 从operatorTableV2获取rarity（0-5，其中5=六星）
      const operator = operatorTableV2[charId]
      if (operator && operator.rarity === 5) {
        count++
      }
    }
  }
  return count
})

// 检查用户是否登录
const isUserLoggedIn = computed(() => {
  return !!userInfo.value.token
})

// 打开新页面
function openLinkOnNewPage(url) {
  window.open(url)
}

// 复制文本
function copyText(text) {
  copyTextToClipboard(text)
}

// 解析凭证
function getCredAndSecret(text) {
  text = text.replace(/\s+/g, '').replace(/["']/g, '')
  const textArr = text.split(',')
  const cred = textArr[0]
  const token = textArr[1]
  return { cred, token }
}

// 获取森空岛账号绑定列表
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
    
    const playBinding = await SklandAPI.getPlayBindingV2('0', '', cred, token)
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

// 获取玩家数据
async function getPlayerData(binding) {
  const { uid, nickName, channelName, channelMasterId } = binding
  
  loading.value = true
  createMessage({ type: 'info', text: '正在获取账号数据，请稍候...' })
  
  try {
    // 保存当前选择的账号信息
    currentBinding.value = binding
    
    const data = await SklandAPI.getAccountOverviewData(
      uid,
      nickName,
      channelName,
      sklandCred.value,
      sklandToken.value
    )
    
    // 同时获取原始仓库数据用于干员练度调查上传
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
        
        // 检查是否为限定干员
        operator.isLimited = limitedOperatorIds.value.has(operator.charId)
        // 检查是否为联动干员
        operator.isCollab = collabOperatorIds.value.has(operator.charId)
      }
    }
    
    // 排序干员：先按稀有度降序，再按精英化降序，再按等级降序
    data.operatorDataList.sort((a, b) => {
      if (b.rarity !== a.rarity) return b.rarity - a.rarity
      if (b.elite !== a.elite) return b.elite - a.elite
      return b.level - a.level
    })
    
    accountData.value = data
    showPreview.value = true
    
    createMessage({ type: 'success', text: '账号数据获取成功！' })
  } catch (error) {
    console.error(error)
    createMessage({ type: 'error', text: '获取账号数据失败' })
  } finally {
    loading.value = false
  }
}

// 导出图片
async function exportImage() {
  if (!exportContainerRef.value) return
  
  createMessage({ type: 'info', text: '正在生成图片，请稍候...' })
  
  try {
    const html2canvas = (await import('html2canvas')).default
    
    const container = exportContainerRef.value
    
    // 修复 sprite 头像渲染问题
    const avatarContainers = container.querySelectorAll('.avatar-container')
    const originalContainerData = []
    const originalAvatarData = []
    
    for (const avatarContainer of avatarContainers) {
      const wrapper = avatarContainer.querySelector('.sprite-avatar')
      if (!wrapper) continue
      
      const classList = Array.from(wrapper.classList)
      const charIdClass = classList.find(c => c.startsWith('bg-char_'))
      if (charIdClass) {
        const charId = charIdClass.replace('bg-', '')
        const size = avatarContainer.offsetWidth || 90
        
        // 保存原始状态
        originalContainerData.push({
          el: avatarContainer,
          style: avatarContainer.style.cssText
        })
        originalAvatarData.push({
          el: wrapper,
          style: wrapper.style.cssText
        })
        
        // 修改 avatar-container 样式
        avatarContainer.style.cssText = `
          position: absolute;
          top: 50%;
          left: 50%;
          margin-top: -${size / 2}px;
          margin-left: -${size / 2}px;
          width: ${size}px;
          height: ${size}px;
          z-index: 1;
          overflow: hidden;
          transform: none;
        `
        
        // 使用项目 CDN 头像图片替代 sprite
        wrapper.style.cssText = `
          background-image: url(https://cos.yituliu.cn/image2/avatar/${charId}.png);
          background-size: cover;
          background-position: center 20%;
          width: ${size}px;
          height: ${size}px;
          position: absolute;
          top: 0;
          left: 0;
          margin: 0;
          transform: none;
        `
      }
    }
    
    // 等待图片加载
    await new Promise(resolve => setTimeout(resolve, 800))
    
    const canvas = await html2canvas(container, {
      backgroundColor: '#1a1a2e',
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false
    })
    
    // 恢复原始样式
    for (const item of originalContainerData) {
      item.el.style.cssText = item.style
    }
    for (const item of originalAvatarData) {
      item.el.style.cssText = item.style
    }
    
    // 转换为图片并下载
    const link = document.createElement('a')
    link.download = `明日方舟账号一图流_${accountData.value?.nickName || 'unknown'}_${Date.now()}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
    
    createMessage({ type: 'success', text: '图片已保存！' })
  } catch (error) {
    console.error(error)
    createMessage({ type: 'error', text: '图片生成失败' })
  }
}

// 上传到干员练度调查
async function uploadToOperatorSurvey() {
  if (!rawWarehouseData.value) {
    createMessage({ type: 'error', text: '没有可上传的数据' })
    return
  }
  
  if (!isUserLoggedIn.value) {
    createMessage({ type: 'error', text: '请先登录一图流账号，才能上传干员数据' })
    return
  }
  
  uploading.value = true
  
  try {
    await operatorDataAPI.importSkLandOperatorDataV3(rawWarehouseData.value)
    createMessage({ type: 'success', text: '干员数据已同步到练度调查！' })
  } catch (error) {
    console.error(error)
    createMessage({ type: 'error', text: '数据上传失败' })
  } finally {
    uploading.value = false
  }
}

// 跳转到干员练度调查页面
function goToOperatorSurvey() {
  router.push({ name: 'OperatorSurvey' })
}

// 返回数据输入页面
function goBack() {
  showPreview.value = false
}
</script>

<template>
  <div class="account-overview-page">
    <!-- 数据获取步骤 -->
    <div v-if="!showPreview" class="data-input-section">
      <h1 class="page-title">账号信息一图流</h1>
      <p class="page-desc">从森空岛获取您的明日方舟账号数据，生成精美的账号信息一图流，同时可同步到干员练度调查</p>
      
      <div class="steps-container">
        <!-- 第一步 -->
        <v-card class="step-card" title="第一步：登录森空岛">
          <v-card-text>
            <p>请先登录森空岛官网</p>
            <v-btn color="primary" @click="openLinkOnNewPage(SKLAND_LINK)" class="mt-2">
              打开森空岛
            </v-btn>
          </v-card-text>
        </v-card>
        
        <!-- 第二步 -->
        <v-card class="step-card" title="第二步：获取凭证">
          <v-card-text>
            <p>登录后按 F12 打开开发者工具，在控制台(Console)中输入以下命令：</p>
            <v-alert :icon="false" color="primary" variant="tonal" class="my-2 code-alert">
              <code>{{ CONSOLE_CODE }}</code>
            </v-alert>
            <p class="hint-text">执行后凭证会自动复制到剪贴板</p>
            <v-btn color="primary" @click="copyText(CONSOLE_CODE)" size="small">
              复制命令
            </v-btn>
          </v-card-text>
        </v-card>
        
        <!-- 第三步 -->
        <v-card class="step-card" title="第三步：输入凭证">
          <v-card-text>
            <p>将获取到的字符串粘贴到下方：</p>
            <v-text-field
              v-model="inputText"
              label="输入森空岛凭证"
              variant="outlined"
              density="compact"
              hide-details
              class="my-2"
            />
            <v-btn 
              color="primary" 
              @click="getPlayerBindingBySkland" 
              :loading="loading"
              class="mt-2"
            >
              获取账号列表
            </v-btn>
          </v-card-text>
        </v-card>
        
        <!-- 第四步 -->
        <v-card class="step-card" title="第四步：选择账号">
          <v-card-text>
            <p v-if="playBindingList.length === 0">请先完成前面的步骤获取账号列表</p>
            <div v-else>
              <p>选择要生成一图流的账号：</p>
              <v-btn
                v-for="binding in playBindingList"
                :key="binding.uid"
                color="primary"
                variant="outlined"
                class="binding-btn"
                @click="getPlayerData(binding)"
                :loading="loading"
              >
                <div class="binding-info">
                  <span class="nickname">{{ binding.nickName }}</span>
                  <span class="channel">{{ binding.channelName }} - {{ binding.uid }}</span>
                </div>
              </v-btn>
            </div>
          </v-card-text>
        </v-card>
      </div>
    </div>
    
    <!-- 预览和导出 -->
    <div v-else class="preview-section">
      <div class="preview-toolbar">
        <div class="toolbar-left">
          <v-btn color="secondary" @click="goBack" variant="outlined">
            <v-icon>mdi-arrow-left</v-icon>
            返回
          </v-btn>
        </div>
        <div class="toolbar-right">
          <v-btn 
            color="success" 
            @click="uploadToOperatorSurvey"
            :loading="uploading"
            :disabled="!isUserLoggedIn"
            class="mr-2"
          >
            <v-icon>mdi-upload</v-icon>
            同步到练度调查
          </v-btn>
          <v-btn color="info" @click="goToOperatorSurvey" variant="outlined" class="mr-2">
            <v-icon>mdi-chart-box</v-icon>
            查看练度调查
          </v-btn>
          <v-btn color="primary" @click="exportImage">
            <v-icon>mdi-download</v-icon>
            下载图片
          </v-btn>
        </div>
      </div>
      
      <!-- 用户未登录提示 -->
      <v-alert 
        v-if="!isUserLoggedIn" 
        type="info" 
        variant="tonal" 
        class="mb-4"
        closable
      >
        登录一图流账号后，可以将干员数据同步到练度调查功能
      </v-alert>
      
      <!-- 导出容器 -->
      <div ref="exportContainerRef" class="export-container">
        <!-- 账号统计信息 -->
        <AccountStats 
          v-if="accountData"
          :account-data="accountData"
          :limited-operator-ids="limitedOperatorIds"
          :total-limited-six-star="totalLimitedSixStar"
          :collab-operator-ids="collabOperatorIds"
          :total-collab-operators="totalCollabOperators"
        />
        
        <!-- 干员展示 -->
        <OperatorGrid 
          v-if="accountData"
          :operators="accountData.operatorDataList"
          :limited-operator-ids="limitedOperatorIds"
          :collab-operator-ids="collabOperatorIds"
        />
        
        <!-- 材料展示 -->
        <MaterialGrid 
          v-if="accountData"
          :items="accountData.itemList"
        />
        
        <!-- 水印 -->
        <div class="watermark">
          明日方舟一图流 ark.yituliu.cn
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.account-overview-page {
  min-height: 100vh;
  padding: 20px;
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
  margin-bottom: 30px;
}

.steps-container {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 16px;
  max-width: 1200px;
  margin: 0 auto;
}

.step-card {
  width: 280px;
  min-height: 200px;
}

.code-alert {
  font-size: 12px;
  word-break: break-all;
}

.hint-text {
  font-size: 12px;
  color: var(--c-text-secondary);
  margin: 4px 0;
}

.binding-btn {
  width: 100%;
  height: auto !important;
  padding: 12px !important;
  margin-top: 8px;
  text-transform: none !important;
}

.binding-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  width: 100%;
}

.binding-info .nickname {
  font-weight: bold;
  font-size: 16px;
}

.binding-info .channel {
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

.watermark {
  text-align: center;
  padding-top: 20px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.5);
}

@media screen and (max-width: 600px) {
  .step-card {
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
  
  .toolbar-right .v-btn {
    flex: 1;
    min-width: 0;
  }
}
</style>
