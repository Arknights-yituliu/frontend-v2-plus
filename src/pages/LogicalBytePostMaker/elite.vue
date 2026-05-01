<template>
  <div class="logical-byte-container">
    <!-- 左栏：制图区 -->
    <div class="left-panel">
      <div class="panel-header">
        <h2>制图区</h2>
      </div>
      <div class="canvas-area">
        <!-- 图片预览区域 -->
        <div class="image-preview">
          <!-- 表头 -->
          <div class="image-section header-section">
            <div v-if="headerImageUrl" class="image-container">
              <img :src="headerImageUrl" alt="表头图片" @error="handleImageError('header')" />
            </div>
            <div v-else class="empty-placeholder">
              表头图片（请在右侧输入图片链接）
            </div>
          </div>

          <!-- 内容 -->
          <div class="image-section content-section">
            <div v-if="!hasVisibleSlots" class="empty-placeholder">
              内容区域（请在右侧配置槽位）
            </div>
            <div v-else class="tables-container">
              <div v-for="(slot, index) in slots" :key="index">
                <div v-if="slot && slot.show" class="data-table">
                  <div class="table-content">
                    <!-- 左侧头像 -->
                    <div class="avatar-section">
                      <div v-if="slot.avatar" class="avatar-image">
                        <img :src="slot.avatar" alt="头像" />
                      </div>
                      <div v-else class="avatar-placeholder">
                        {{ slot.star }}★
                      </div>
                    </div>

                    <!-- 右侧数据表格 -->
                    <div class="data-grid">
                      <table>
                        <thead>
                          <tr>
                            <th class="header-cell character-name-cell">{{ slot.title || '' }}</th>
                            <th class="header-cell">精二</th>
                            <th class="header-cell">一技能专三</th>
                            <th class="header-cell">二技能专三</th>
                            <th class="header-cell">三技能专三</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td class="data-cell row-header">理智消耗</td>
                            <td class="data-cell">{{ slot.data?.[0]?.[0] || '' }}</td>
                            <td class="data-cell">{{ slot.data?.[0]?.[1] || '' }}</td>
                            <td class="data-cell">{{ slot.data?.[0]?.[2] || '' }}</td>
                            <td class="data-cell">{{ slot.data?.[0]?.[3] || '' }}</td>
                          </tr>
                          <tr>
                            <td class="data-cell row-header">同星级排名</td>
                            <td class="data-cell">{{ slot.data?.[1]?.[0] || '' }}</td>
                            <td class="data-cell">{{ slot.data?.[1]?.[1] || '' }}</td>
                            <td class="data-cell">{{ slot.data?.[1]?.[2] || '' }}</td>
                            <td class="data-cell">{{ slot.data?.[1]?.[3] || '' }}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 页脚 -->
          <div class="image-section footer-section">
            <div class="footer-content">
              <div class="footer-text">
                <div class="footer-row">
                  <span class="footer-label">数据源：</span>
                  <span class="footer-value">明日方舟一图流 https://ark.yituliu.cn/</span>
                </div>
                <div class="footer-row">
                  <span class="footer-label"></span>
                  <span class="footer-value">企鹅物流数据统计 https://penguin-stats.cn/</span>
                </div>
                <div class="footer-row">
                  <span class="footer-label">数据整理：</span>
                  <span class="footer-value">逻辑元LogicalByte@Bilibili</span>
                </div>
              </div>
              <div class="footer-image">
                <!-- <img src="https://yituliu-dev-1307648010.cos.ap-beijing.myqcloud.com/image/website/QR/LogicalByteQR.png?q-sign-algorithm=sha1&q-ak=AKIDEpcgVogk4rlAG0uUqNmIbxGkHB2c-fZSPrhKJae_QsWKBmsS7zIM9HNMtc2mxSmU&q-sign-time=1773116074;1773119674&q-key-time=1773116074;1773119674&q-header-list=host&q-url-param-list=&q-signature=b9e546bf82f826a060854fcdc0a5a3063756d2fc&x-cos-security-token=XZiLyE60RcoeRbhoLkKT9Hkv7knzYMza8373400ba16a5183c4ec4f9b2dea3071TuKK-c_U9FCJX0kem7AsMITAqllPJwzA0HXlmHp6TKVKIE1cc5m83jQKrPLKM9yvzhyRz_PMaurjHeWcNZHDLhE2RSM-MX-ZwyvNmFPiFVVO7VC7-rH87SSB7s5xFjBWBT3BfGpjNoMZabi7foiFDeIC-bToPIWWg6MIQoBcfiZmnGeeQd9mpI1kXyOP2T_DvU_iZpME5KGrBe6oY3m8-5iBPEIz-MAqw9POKajK-DRk0WwoWk19A7GuyRaqO1bq0AVohPMiO6E4MGUblwqoLQ" alt="LogicalByte QR Code" /> -->
                <img src="/image/website/QR/LogicalByteQR.png" alt="LogicalByte QR Code" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 右栏：输入区 -->
    <div class="right-panel">
      <div class="panel-header">
        <h2>输入区</h2>
        <button @click="clearAllData" class="clear-all-btn" title="清除所有数据">
          🗑️ 清空
        </button>
      </div>
      <!-- 链接区 -->
      <div class="link-section">
        <a href="https://ak.hypergryph.com/news" target="_blank" class="news-link">
          <span class="link-icon">🔗</span>
          <span class="link-text">明日方舟官网新闻</span>
          <span class="external-icon">↗</span>
        </a>
        <a href="https://torappu.prts.wiki/gamedata/latest/excel/character_table.json" target="_blank"
          class="news-link">
          <span class="link-icon">📄</span>
          <span class="link-text">角色数据JSON下载</span>
          <span class="external-icon">↗</span>
        </a>
      </div>
      <div class="input-area">
        <!-- JSON数据加载模块 -->
        <div class="json-load-module">
          <div class="json-module-header">
            <h3>角色数据</h3>
            <button @click="triggerJsonFileInput" class="json-upload-btn" :disabled="jsonLoading">
              <span v-if="jsonLoading">处理中...</span>
              <span v-else>📁 上传JSON文件</span>
            </button>
            <input ref="jsonFileInput" type="file" accept="application/json" @change="handleJsonFileSelect"
              style="display: none" />
          </div>
          <div class="json-status">
            <div v-if="characterData && Object.keys(characterData).length > 0" class="json-success">
              ✓ 数据已加载
            </div>
            <div v-else-if="jsonLoading" class="json-loading">
              正在处理JSON文件...
            </div>
            <div v-else class="json-empty">
              请上传角色数据的JSON文件
            </div>
          </div>
          <div v-if="lastJsonLoadTime" class="json-load-time">
            上次加载时间: {{ lastJsonLoadTime }}
          </div>
          <div v-if="jsonLoadError" class="json-error">
            ✗ 加载失败: {{ jsonLoadError }}<br>
            <small>请确保文件格式正确</small>
          </div>
          <div class="json-help">
            <p><strong>使用说明：</strong></p>
            <ol>
              <li>点击上方按钮选择JSON文件，或</li>
              <li>在上方链接区点击"角色数据JSON下载"获取数据源</li>
              <li>上传后在输入框输入角色名即可显示对应的字段名</li>
            </ol>
          </div>
        </div>

        <!-- 表头图片输入 -->
        <div class="input-group">
          <label class="input-label">表头图片</label>
          <input ref="fileInput" v-model="headerImageUrl" type="text" class="input-field image-url-input"
            placeholder="输入图片链接，或点击后粘贴图片（Ctrl+V）" @click="triggerFileInput" @paste="handlePaste" />
          <div v-if="headerImageUrl" class="image-info">
            <span class="info-text">✓ 图片已加载</span>
            <button @click="clearHeaderImage" class="clear-btn">清除</button>
          </div>
          <div v-if="imageErrors.header" class="error-message">
            图片加载失败，请重试
          </div>
        </div>

        <!-- 数据文本解析 -->
        <div class="input-group">
          <label class="input-label">数据文本解析</label>
          <textarea v-model="dataText" type="text" class="input-field image-url-input"
            placeholder="输入数据文本，解析后显示在下方表格中" >
          </textarea>
        
           <button @click="saveData" class="json-upload-btn" >
           
              <span >保存数据</span>
            </button>

          <div>
            <div v-for="(item, index) in excelData" :key="index">
              {{ item }}
            </div>
          </div>
        </div>

        <!-- 槽位配置 -->
        <div class="input-group">
          <label class="input-label">数据表格（5个固定槽位）</label>

          <!-- 5个槽位配置 -->
          <div class="slots-container">
            <div v-for="(slot, index) in slots" :key="index">
              <div v-if="slot" class="slot-config">
                <div class="slot-header">
                  <span class="slot-number">槽位 {{ index + 1 }}</span>
                  <input v-model="slot.show" type="checkbox" class="slot-show-checkbox" />
                  <span class="slot-show-label">显示</span>
                </div>

                <div v-if="slot.show" class="slot-content">
                  <!-- 标题和星级 -->
                  <div class="slot-basic-info">
                    <div class="slot-title-wrapper">
                      <input v-model="slot.title" type="text" class="input-field slot-title-input" placeholder="输入角色名搜索"
                        @input="searchTitleCharacter(index, slot.title)" />
                      <div class="title-search-result"
                        v-if="slot.titleSearchResult && slot.titleSearchResult !== '未找到'">
                        {{ slot.titleSearchResult }}
                      </div>
                      <div class="title-search-result error" v-else-if="slot.titleSearchResult === '未找到'">
                        未找到
                      </div>
                    </div>
                    <select v-model="slot.star" class="slot-star-select">
                      <option value="4">4★</option>
                      <option value="5">5★</option>
                      <option value="6">6★</option>
                    </select>
                  </div>

                  <!-- 头像 -->
                  <div class="form-section">
                    <label class="form-label">头像图片</label>
                    <div class="avatar-paste-area" @click="triggerSlotAvatarFileInput(index)" tabindex="0">
                      <div v-if="slot.avatar" class="avatar-preview">
                        <img :src="slot.avatar" alt="头像预览" />
                        <button @click.stop="clearSlotAvatar(index)" class="clear-avatar-btn">×</button>
                      </div>
                      <div v-else class="paste-hint-small">
                        <span>📷</span>
                        <span>点击或粘贴图片</span>
                      </div>
                    </div>
                    <input :ref="el => setSlotAvatarFileInputRef(el, index)" type="file" accept="image/*"
                      @change="handleSlotAvatarFileSelect($event, index)" style="display: none" />
                  </div>

                  <!-- 数据输入 -->
                  <div class="form-section">
                    <label class="form-label">数据（2行 × 4列）</label>
                    <div class="data-rows-input">
                      <div class="data-row">
                        <span class="row-label">理智消耗</span>
                        <div class="row-cells">
                          <input v-for="(cell, cellIndex) in slot.data[0]" :key="'san-' + index + '-' + cellIndex"
                            v-model="slot.data[0][cellIndex]" type="text" class="input-field cell-field"
                            placeholder="" />
                        </div>
                      </div>
                      <div class="data-row">
                        <span class="row-label">同星级排名</span>
                        <div class="row-cells">
                          <input v-for="(cell, cellIndex) in slot.data[1]" :key="'rank-' + index + '-' + cellIndex"
                            v-model="slot.data[1][cellIndex]" type="text" class="input-field cell-field"
                            placeholder="" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'

const STORAGE_KEY = 'logicalByte_data'



// 组件挂载状态
const isMounted = ref(false)

// 图片链接（使用 base64 或 blob URL）
const headerImageUrl = ref('')

// 文件输入引用
const fileInput = ref(null)

// 图片加载错误状态
const imageErrors = ref({
  header: false,
  content: false,
  footer: false
})

// 角色数据映射
const characterData = ref({})

// JSON加载状态
const jsonLoading = ref(false)
const jsonLoadError = ref('')
const lastJsonLoadTime = ref('')

// 保存JSON数据到本地
const saveJsonToStorage = (data) => {
  try {
    localStorage.setItem(STORAGE_KEY + '_characterData', JSON.stringify(data))
    localStorage.setItem(STORAGE_KEY + '_lastLoadTime', new Date().toISOString())
    console.log('角色数据已保存到本地存储')
  } catch (error) {
    console.error('保存JSON数据失败:', error)
  }
}

// 从本地加载JSON数据
const loadJsonFromStorage = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY + '_characterData')
    const lastLoad = localStorage.getItem(STORAGE_KEY + '_lastLoadTime')
    if (saved) {
      characterData.value = JSON.parse(saved)
      lastJsonLoadTime.value = lastLoad ? new Date(lastLoad).toLocaleString() : ''
      console.log('已从本地存储恢复角色数据')
      return true
    }
  } catch (error) {
    console.error('从本地恢复JSON数据失败:', error)
  }
  return false
}

// 加载角色数据
const loadCharacterData = async () => {
  jsonLoading.value = true
  jsonLoadError.value = ''

  const urls = [
    'https://cdn.jsdelivr.net/gh/Kengxxiao/ArknightsGameData@latest/cht/gamedata/excel/character_table.json',
    'https://cdn.jsdelivr.net/gh/Kengxxiao/ArknightsGameData@latest/en_US/gamedata/excel/character_table.json',
    'https://cdn.jsdelivr.net/gh/Kengxxiao/ArknightsGameData@latest/zh_CN/gamedata/excel/character_table.json'
  ]

  for (const url of urls) {
    try {
      console.log(`尝试从 ${url} 加载数据...`)
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        cache: 'no-cache'
      })

      if (!response.ok) {
        throw new Error(`加载失败: ${response.status} ${response.statusText}`)
      }

      // 检查响应内容类型
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(`不是有效的JSON格式`)
      }

      const data = await response.json()
      characterData.value = data
      lastJsonLoadTime.value = new Date().toLocaleString()
      saveJsonToStorage(data)
      console.log('角色数据加载完成')
      jsonLoading.value = false
      return
    } catch (error) {
      console.warn(`从 ${url} 加载失败:`, error)
      if (url === urls[urls.length - 1]) {
        jsonLoadError.value = `${error.message}`
        console.error('所有数据源都加载失败')
      }
    }
  }
  jsonLoading.value = false
}

// 固定槽位数据（5个槽位）
const slots = ref([
  {
    show: true,
    star: 6,
    title: '槽位1',
    avatar: '',
    data: [
      ['', '', '', ''],
      ['', '', '', '']
    ],
    titleSearchResult: ''  // 标题搜索结果
  },
  {
    show: false,
    star: 5,
    title: '槽位2',
    avatar: '',
    data: [
      ['', '', '', ''],
      ['', '', '', '']
    ],
    titleSearchResult: ''
  },
  {
    show: false,
    star: 6,
    title: '槽位3',
    avatar: '',
    data: [
      ['', '', '', ''],
      ['', '', '', '']
    ],
    titleSearchResult: ''
  },
  {
    show: false,
    star: 5,
    title: '槽位4',
    avatar: '',
    data: [
      ['', '', '', ''],
      ['', '', '', '']
    ],
    titleSearchResult: ''
  },
  {
    show: false,
    star: 6,
    title: '槽位5',
    avatar: '',
    data: [
      ['', '', '', ''],
      ['', '', '', '']
    ],
    titleSearchResult: ''
  }
])

// 槽位头像文件输入引用数组
const slotAvatarFileInputs = ref([])

// JSON文件输入引用
const jsonFileInput = ref(null)

// 触发JSON文件选择
const triggerJsonFileInput = () => {
  jsonFileInput.value?.click()
}

// 处理JSON文件选择
const handleJsonFileSelect = async (event) => {
  const file = event.target.files[0]
  if (file && file.type === 'application/json') {
    await loadJsonFile(file)
  } else if (file) {
    jsonLoadError.value = '请选择JSON格式的文件'
  }
}

// 加载JSON文件
const loadJsonFile = async (file) => {
  jsonLoading.value = true
  jsonLoadError.value = ''

  try {
    const text = await file.text()
    const data = JSON.parse(text)
    characterData.value = data
    lastJsonLoadTime.value = new Date().toLocaleString()
    saveJsonToStorage(data)
    console.log('JSON文件加载完成')
  } catch (error) {
    jsonLoadError.value = `文件解析失败: ${error.message}`
    console.error('JSON文件加载失败:', error)
  } finally {
    jsonLoading.value = false
  }
}

// 搜索标题栏的角色名
const searchTitleCharacter = (slotIndex, name) => {
  if (!characterData.value || !name) {
    slots.value[slotIndex].titleSearchResult = ''
    return
  }

  const data = characterData.value
  const characterName = name.trim()

  // 遍历角色数据，查找匹配的角色
  for (const key in data) {
    const item = data[key]

    // 检查名称字段 - 完全匹配
    if (item.name && item.name === characterName) {
      // 获取父元素的字段名
      const parentName = key
      slots.value[slotIndex].titleSearchResult = parentName

      // 自动设置头像图片
      const avatarUrl = `https://torappu.prts.wiki/assets/char_avatar/${parentName}.png`
      slots.value[slotIndex].avatar = avatarUrl

      return
    }
  }

  // 未找到
  slots.value[slotIndex].titleSearchResult = '未找到'
}

// 检查是否有显示的槽位
const hasVisibleSlots = computed(() => {
  return slots.value && slots.value.some(slot => slot && slot.show)
})

// 从 localStorage 加载数据
const loadFromStorage = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const data = JSON.parse(saved)
      if (data.headerImageUrl) {
        headerImageUrl.value = data.headerImageUrl
      }
      if (data.slots && Array.isArray(data.slots) && data.slots.length === 5) {
        // 恢复槽位数据，确保每个槽位结构正确
        slots.value = data.slots.map(slot => ({
          show: Boolean(slot.show),
          star: [4, 5, 6].includes(slot.star) ? slot.star : 6,
          title: slot.title || '',
          avatar: slot.avatar || '',
          data: Array.isArray(slot.data) && slot.data.length === 2
            ? slot.data.map(row =>
              Array.isArray(row) && row.length === 4 ? [...row] : ['', '', '', '']
            )
            : [
              ['', '', '', ''],
              ['', '', '', '']
            ],
          titleSearchResult: slot.titleSearchResult || ''
        }))
      }
      console.log('数据已从本地存储恢复')
    }
  } catch (error) {
    console.error('恢复数据失败:', error)
  }
}

// 保存到 localStorage
const saveToStorage = () => {
  try {
    const data = {
      headerImageUrl: headerImageUrl.value || '',
      slots: slots.value || [],
      lastSaved: new Date().toISOString()
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    console.log('数据已自动保存')
  } catch (error) {
    console.error('保存数据失败:', error)
  }
}

// 监听数据变化并自动保存
const stopWatch = watch([headerImageUrl, slots], () => {
  // 只在组件挂载时才保存
  if (isMounted.value) {
    try {
      saveToStorage()
    } catch (error) {
      console.error('自动保存失败:', error)
    }
  }
}, { deep: true })

// 组件卸载时停止监听和设置挂载状态
onUnmounted(() => {
  isMounted.value = false
  stopWatch()
})

// 处理图片加载错误
const handleImageError = (section) => {   
  imageErrors.value[section] = true
}

// 触发文件选择
const triggerFileInput = () => {
  fileInput.value?.click()
}

// 处理文件选择
const handleFileSelect = (event) => {
  const file = event.target.files[0]
  if (file && file.type.startsWith('image/')) {
    loadImageFile(file)
  }
}

// 处理粘贴事件
const handlePaste = (event) => {
  const items = event.clipboardData?.items
  if (!items) return

  // 优先处理图片粘贴
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    if (item.type.startsWith('image/')) {
      event.preventDefault()
      const file = item.getAsFile()
      if (file) {
        loadImageFile(file)
      }
      return
    }
  }

  // 如果没有图片，尝试粘贴文本URL
  const text = event.clipboardData?.getData('text')
  if (text && isValidImageUrl(text)) {
    event.preventDefault()
    headerImageUrl.value = text.trim()
    imageErrors.value.header = false
  }
}

// 检查是否为有效的图片URL
const isValidImageUrl = (url) => {
  // 简单的URL验证（以http或https开头）
  return /^https?:\/\//i.test(url)
}

// 加载图片文件
const loadImageFile = (file) => {
  const reader = new FileReader()

  reader.onload = (e) => {
    // 只在组件挂载时才更新数据
    if (isMounted.value) {
      try {
        headerImageUrl.value = e.target.result
        imageErrors.value.header = false
      } catch (error) {
        console.error('加载图片失败:', error)
      }
    }
  }

  reader.onerror = () => {
    // 只在组件挂载时才更新数据
    if (isMounted.value) {
      try {
        imageErrors.value.header = true
      } catch (error) {
        console.error('设置图片错误状态失败:', error)
      }
    }
  }

  reader.readAsDataURL(file)
}

// 清除表头图片
const clearHeaderImage = () => {
  headerImageUrl.value = ''
  imageErrors.value.header = false
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

// 设置槽位头像文件输入引用
const setSlotAvatarFileInputRef = (el, index) => {
  if (el) {
    slotAvatarFileInputs.value[index] = el
  }
}

// 触发槽位头像文件选择
const triggerSlotAvatarFileInput = (index) => {
  const input = slotAvatarFileInputs.value[index]
  input?.click()
}

// 处理槽位头像文件选择
const handleSlotAvatarFileSelect = (event, index) => {
  const file = event.target.files[0]
  if (file && file.type.startsWith('image/')) {
    loadSlotAvatarFile(file, index)
  }
}

// 加载槽位头像文件
const loadSlotAvatarFile = (file, index) => {
  const reader = new FileReader()

  reader.onload = (e) => {
    // 只在组件挂载时才更新数据
    if (isMounted.value) {
      try {
        slots.value[index].avatar = e.target.result
      } catch (error) {
        console.error('加载头像失败:', error)
      }
    }
  }

  reader.onerror = () => {
    // 只在组件挂载时才更新数据
    if (isMounted.value) {
      try {
        alert('头像加载失败')
      } catch (error) {
        console.error('显示头像错误提示失败:', error)
      }
    }
  }

  reader.readAsDataURL(file)
}

// 清除槽位头像
const clearSlotAvatar = (index) => {
  slots.value[index].avatar = ''
  const input = slotAvatarFileInputs.value[index]
  if (input) {
    input.value = ''
  }
}

// 清除所有数据
const clearAllData = () => {
  if (confirm('确定要清除所有数据吗？此操作不可恢复！')) {
    headerImageUrl.value = ''
    // 重置槽位到默认状态
    slots.value = [
      {
        show: true,
        star: 6,
        title: '槽位1',
        avatar: '',
        data: [
          ['', '', '', ''],
          ['', '', '', '']
        ],
        titleSearchResult: ''
      },
      {
        show: false,
        star: 5,
        title: '槽位2',
        avatar: '',
        data: [
          ['', '', '', ''],
          ['', '', '', '']
        ],
        titleSearchResult: ''
      },
      {
        show: false,
        star: 6,
        title: '槽位3',
        avatar: '',
        data: [
          ['', '', '', ''],
          ['', '', '', '']
        ],
        titleSearchResult: ''
      },
      {
        show: false,
        star: 5,
        title: '槽位4',
        avatar: '',
        data: [
          ['', '', '', ''],
          ['', '', '', '']
        ],
        titleSearchResult: ''
      },
      {
        show: false,
        star: 6,
        title: '槽位5',
        avatar: '',
        data: [
          ['', '', '', ''],
          ['', '', '', '']
        ],
        titleSearchResult: ''
      }
    ]
    localStorage.removeItem(STORAGE_KEY)
    console.log('所有数据已清除')
  }
}


let excelData = ref([])
let dataText = ref('')

watch(dataText, (newVal) => {
  excelData.value = parseEliteText(newVal)
})


let slotIndex = ref(0)

function saveData(){
    let map = new Map()
    
    for(const item of excelData.value){
      if(!map.has(item.name)){
        map.set(item.name, {
          name: item.name,
          elite:{
            cost:0,
            rank:''
          },
          skill1:{
            cost:0,
            rank:''
          },
          skill2:{
            cost:0,
            rank:''
          },
          skill3:{
            cost:0,
            rank:''
          }
        })
      }
       if(item.key === '精二'){
        map.get(item.name).elite = {
          cost: item.cost,
          rank: item.rank
        }
       }
       if(item.key === '1技能专精'){
        map.get(item.name).skill1 = {
          cost: item.cost,
          rank: item.rank
        }
       }  
       if(item.key === '2技能专精'){
        map.get(item.name).skill2 = {
          cost: item.cost,
          rank: item.rank
        }
       }
       if(item.key === '3技能专精'){
        map.get(item.name).skill3 = {
          cost: item.cost,
          rank: item.rank
        } 
       }
    }

    for(const [name, data] of map){
         slots.value[slotIndex.value].title = name
         slots.value[slotIndex.value].show = true
         slots.value[slotIndex.value].data = [
          [data.elite.cost, data.skill1.cost, data.skill2.cost, data.skill3.cost],
          [data.elite.rank, data.skill1.rank, data.skill2.rank, data.skill3.rank]
         ]
        slotIndex.value++
    }
}

/**
 * 解析精英化查询文本，提取干员名称、查询内容、理智消耗和排名
 * @param {string} text - 包含干员查询结果的文本
 * @returns {Array<{name: string, key: string, cost: number, rank: string}>} 解析后的结构化数据
 */
function parseEliteText(text) {
  const results = []
  const lines = text.split('\n')

  let currentName = ''
  let currentKey = ''

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    // 匹配表头行：干员名    xxx    查询内容    xxx
    const headerMatch = trimmed.match(/干员名\s+(.+?)\s+查询内容\s+(.+)$/)
    if (headerMatch) {
      currentName = headerMatch[1].trim()
      currentKey = headerMatch[2].trim()
      continue
    }

    // 匹配数据行：理智消耗为xxx，在同稀有度的排名为xx/xx
    const dataMatch = trimmed.match(/理智消耗为([\d.]+)，在同稀有度的排名为(\d+\/\d+)/)
    if (dataMatch && currentName && currentKey) {
      results.push({
        name: currentName,
        key: currentKey,
        cost: parseFloat(dataMatch[1]),
        rank: dataMatch[2]
      })
    }
  }

  return results
}

onMounted(() => {
  isMounted.value = true
  console.log('LogicalByte 页面已加载')
  loadFromStorage()
  // 尝试从本地恢复JSON数据，如果存在则不加载
  if (!loadJsonFromStorage()) {
    console.log('本地未找到JSON数据，请手动刷新加载')
  }
})





</script>

<style scoped>
.logical-byte-container {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

/* 左栏：制图区 */
.left-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #ddd;
  background-color: #f5f5f5;
}

/* 右栏：输入区 */
.right-panel {
  width: 400px;
  display: flex;
  flex-direction: column;
  background-color: #fff;
}

/* 面板头部 */
.panel-header {
  padding: 16px 20px;
  border-bottom: 1px solid #ddd;
  background-color: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.panel-header h2 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
}

.clear-all-btn {
  padding: 6px 12px;
  background-color: #fff;
  border: 1px solid #ddd;
  border-radius: 4px;
  color: #666;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 4px;
}

.clear-all-btn:hover {
  background-color: #fee;
  border-color: #f56c6c;
  color: #f56c6c;
}

/* 制图区域 */
.canvas-area {
  flex: 1;
  padding: 20px;
  overflow: auto;
  display: flex;
  align-items: flex-start;
  justify-content: center;
}

/* 图片预览容器 */
.image-preview {
  width: 1080px;
  background-color: #fff;
  overflow: hidden;
}

/* 图片区块 */
.image-section {
  position: relative;
  border-bottom: 2px solid #e0e0e0;
}

.image-section:last-child {
  border-bottom: none;
}

/* 区块标签 */
.section-label {
  position: absolute;
  top: 8px;
  left: 8px;
  background-color: rgba(0, 0, 0, 0.6);
  color: #fff;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 0.85rem;
  font-weight: 500;
  z-index: 10;
}

/* 图片容器 */
.image-container {
  width: 100%;
  min-height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #fafafa;
}

.image-container img {
  max-width: 100%;
  height: auto;
  display: block;
}

/* 空白占位符 */
.empty-placeholder {
  min-height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #fafafa;
  color: #999;
  font-size: 0.95rem;
  border: 2px dashed #ddd;
  margin: 0;
}

/* 表头区域特殊样式 */
.header-section {
  background-color: #f0f7ff;
}

.header-section .empty-placeholder {
  background-color: #f0f7ff;
}

/* 内容区域 */
.content-section {
  min-height: 200px;
  padding: 0;
}

.content-section .empty-placeholder {
  min-height: 200px;
}

/* 表格容器 */
.tables-container {
  padding: 0;
}

/* 数据表格 */
.data-table {
  margin-bottom: 0;
  background-color: #fff;
  overflow: hidden;
}

.table-content {
  display: flex;
  gap: 0;
  padding: 0;
}

/* 头像区域 */
.avatar-section {
  flex-shrink: 0;
  width: 180px;
  height: 180px;
}

.avatar-image {
  width: 100%;
  height: 100%;
  overflow: hidden;
  background-color: #f0f0f0;
}

.avatar-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  font-size: 0.9rem;
  background-color: #fafafa;
}

/* 数据表格区域 */
.data-grid {
  width: 900px;
  overflow: hidden;
  display: block;
}

.data-grid table {
  width: 900px;
  border-collapse: collapse;
  font-size: 0.85rem;
  display: table;
  table-layout: fixed;
}

.header-cell {
  padding: 0;
  border: 2px solid #333;
  color: #333;
  text-align: center;
  width: 180px;
  height: 60px;
  vertical-align: middle;
  font-size: 1.35rem;
  font-weight: 600;
  display: table-cell;
  background-color: #f8f9fa;
}

.character-name-cell {
  background-color: #e3f2fd;
  font-weight: 700;
  color: #1565c0;
}

.empty-header {
  background-color: #f8f9fa;
}

.row-header {
  background-color: #f0f4f8;
  font-weight: 600;
  color: #555;
  font-size: 1.35rem;
}

.data-cell {
  padding: 0;
  border: 2px solid #333;
  color: #333;
  text-align: center;
  width: 180px;
  height: 60px;
  vertical-align: middle;
  font-size: 1.65rem;
  font-weight: 600;
  display: table-cell;
  background-color: white;
}

.data-grid tbody {
  display: table-row-group;
}

.data-grid tr {
  display: table-row;
}

.data-grid tbody tr:hover {
  background-color: transparent;
}

/* 页脚区域 */
.footer-section {
  height: 168px;
  min-height: 168px;
}

.footer-section .empty-placeholder {
  min-height: 100px;
}

.footer-content {
  height: 168px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: linear-gradient(135deg, #ff8a3d 0%, #ff6b35 100%);
  color: #fff;
  padding: 0 0 0 40px;
  gap: 32px;
}

.footer-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.footer-row {
  display: flex;
  align-items: baseline;
  font-size: 1.75rem;
  font-weight: bold;
}

.footer-label {
  min-width: 140px;
  flex-shrink: 0;
  color: #fff;
}

.footer-value {
  color: #fff;
  flex: 1;
}

.footer-image {
  width: 168px;
  height: 168px;
  flex-shrink: 0;
  background-color: rgba(255, 255, 255, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.footer-image img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

/* 输入区域 */
.input-area {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

/* 链接区 */
.link-section {
  padding: 12px 20px;
  background-color: #f8f9fa;
  border-bottom: 1px solid #e0e0e0;
}

.news-link {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background-color: #fff;
  border: 1px solid #ddd;
  border-radius: 6px;
  text-decoration: none;
  color: #333;
  transition: all 0.2s;
}

.news-link:hover {
  background-color: #e3f2fd;
  border-color: #2196f3;
  transform: translateX(2px);
}

.link-icon {
  font-size: 1.1rem;
}

.link-text {
  flex: 1;
  font-size: 0.9rem;
  font-weight: 500;
}

.external-icon {
  font-size: 1rem;
  color: #666;
  opacity: 0.6;
}

.news-link:hover .external-icon {
  opacity: 1;
  color: #2196f3;
}

/* 输入组 */
.input-group {
  margin-bottom: 24px;
}

.input-label {
  display: block;
  margin-bottom: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  color: #333;
}

/* 粘贴区域 */
.paste-area {
  width: 100%;
  padding: 30px 20px;
  border: 2px dashed #ddd;
  border-radius: 8px;
  background-color: #fafafa;
  cursor: pointer;
  transition: all 0.2s;
  box-sizing: border-box;
}

.paste-area:hover {
  border-color: #409eff;
  background-color: #f0f7ff;
}

.paste-area:focus {
  outline: none;
  border-color: #409eff;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.1);
}

.paste-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.paste-icon {
  font-size: 2rem;
}

.paste-text {
  text-align: left;
}

.paste-text>div:first-child {
  font-size: 0.95rem;
  color: #333;
  font-weight: 500;
  margin-bottom: 4px;
}

.paste-subtext {
  font-size: 0.8rem;
  color: #999;
}

/* 图片信息 */
.image-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 10px;
  padding: 8px 12px;
  background-color: #f0f9ff;
  border: 1px solid #b3e0ff;
  border-radius: 4px;
}

.info-text {
  color: #0c7cd5;
  font-size: 0.85rem;
  font-weight: 500;
}

.clear-btn {
  padding: 4px 12px;
  background-color: #fff;
  border: 1px solid #ddd;
  border-radius: 4px;
  color: #666;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
}

.clear-btn:hover {
  background-color: #fee;
  border-color: #f56c6c;
  color: #f56c6c;
}

/* JSON数据加载模块 */
.json-load-module {
  margin-bottom: 20px;
  padding: 16px;
  background-color: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
}

.json-module-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.json-module-header h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #333;
}

.json-upload-btn {
  padding: 6px 12px;
  background-color: #409eff;
  border: none;
  border-radius: 4px;
  color: #fff;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 4px;
}

.json-upload-btn:hover:not(:disabled) {
  background-color: #66b1ff;
}

.json-upload-btn:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.json-status {
  margin-bottom: 8px;
  font-size: 0.9rem;
}

.json-success {
  color: #2e7d32;
  font-weight: 500;
}

.json-loading {
  color: #409eff;
  font-weight: 500;
}

.json-empty {
  color: #999;
}

.json-load-time {
  font-size: 0.8rem;
  color: #999;
  margin-bottom: 8px;
}

.json-error {
  padding: 8px;
  background-color: #fee;
  border: 1px solid #f56c6c;
  border-radius: 4px;
  color: #f56c6c;
  font-size: 0.85rem;
}

.json-help {
  margin-top: 12px;
  padding: 12px;
  background-color: #f0f7ff;
  border: 1px solid #b3d8ff;
  border-radius: 4px;
  font-size: 0.85rem;
}

.json-help p {
  margin: 0 0 8px 0;
  font-weight: 600;
  color: #0c7cd5;
}

.json-help ol {
  margin: 0;
  padding-left: 20px;
  color: #555;
}

.json-help li {
  margin-bottom: 4px;
}

.input-field {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.input-field:focus {
  outline: none;
  border-color: #409eff;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.1);
}

.input-field::placeholder {
  color: #aaa;
}

/* 错误提示 */
.error-message {
  margin-top: 6px;
  color: #f56c6c;
  font-size: 0.85rem;
}

/* 图片链接输入框 */
.image-url-input {
  cursor: text;
  background-color: #fafafa;
  position: relative;
}

.image-url-input:hover {
  background-color: #f0f7ff;
}

.image-url-input:focus {
  background-color: #f0f7ff;
}

/* 表格表单 */
.table-form {
  margin-top: 10px;
  padding: 16px;
  background-color: #fafafa;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
}

/* 表单区块 */
.form-section {
  margin-top: 16px;
}

.form-section:first-child {
  margin-top: 12px;
}

.form-label {
  display: block;
  margin-bottom: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  color: #555;
}

/* 头像粘贴区 */
.avatar-paste-area {
  width: 100px;
  height: 100px;
  border: 2px dashed #ddd;
  border-radius: 8px;
  background-color: #fff;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  overflow: hidden;
}

.avatar-paste-area:hover {
  border-color: #409eff;
  background-color: #f0f7ff;
}

.avatar-paste-area:focus {
  outline: none;
  border-color: #409eff;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.1);
}

.avatar-preview {
  width: 100%;
  height: 100%;
  position: relative;
}

.avatar-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.clear-avatar-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 24px;
  height: 24px;
  padding: 0;
  background-color: rgba(0, 0, 0, 0.6);
  border: none;
  border-radius: 50%;
  color: #fff;
  font-size: 1.2rem;
  line-height: 1;
  cursor: pointer;
  transition: all 0.2s;
}

.clear-avatar-btn:hover {
  background-color: #f56c6c;
}

.paste-hint-small {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-size: 0.8rem;
  color: #999;
}

.paste-hint-small span:first-child {
  font-size: 1.5rem;
}

/* 表头输入 */
.headers-input {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
}

.header-field {
  padding: 8px;
  font-size: 0.85rem;
}

/* 数据行输入 */
.data-rows-input {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.data-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.row-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: #666;
  width: 40px;
  flex-shrink: 0;
}

.row-cells {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
}

.cell-field {
  padding: 8px;
  font-size: 0.85rem;
}

.input-with-result {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.search-result {
  padding: 4px 8px;
  background-color: #e8f5e9;
  border: 1px solid #c8e6c9;
  border-radius: 4px;
  font-size: 0.75rem;
  color: #2e7d32;
  font-weight: 500;
}

.search-result.error {
  background-color: #fee;
  border-color: #f56c6c;
  color: #f56c6c;
}

/* 槽位配置 */
.slots-container {
  margin-top: 10px;
}

.slot-config {
  margin-bottom: 16px;
  padding: 16px;
  background-color: #fafafa;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
}

.slot-config:last-child {
  margin-bottom: 0;
}

.slot-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #ddd;
}

.slot-number {
  font-size: 0.9rem;
  font-weight: 600;
  color: #333;
  flex: 1;
}

.slot-show-checkbox {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.slot-show-label {
  font-size: 0.85rem;
  color: #666;
}

.slot-content {
  margin-top: 12px;
}

.slot-basic-info {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.slot-title-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.slot-title-input {
  flex: 1;
}

.title-search-result {
  padding: 4px 8px;
  background-color: #e8f5e9;
  border: 1px solid #c8e6c9;
  border-radius: 4px;
  font-size: 0.75rem;
  color: #2e7d32;
  font-weight: 500;
}

.title-search-result.error {
  background-color: #fee;
  border-color: #f56c6c;
  color: #f56c6c;
}

.slot-star-select {
  width: 80px;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;
  background-color: #fff;
  cursor: pointer;
  transition: border-color 0.2s;
}

.slot-star-select:focus {
  outline: none;
  border-color: #409eff;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.1);
}

/* 暗色主题适配 */
@media (prefers-color-scheme: dark) {
  .left-panel {
    background-color: #1e1e1e;
    border-right-color: #444;
  }

  .right-panel {
    background-color: #2d2d2d;
  }

  .panel-header {
    background-color: #2d2d2d;
    border-bottom-color: #444;
    color: #e0e0e0;
  }

  .clear-all-btn {
    background-color: #2d2d2d;
    border-color: #555;
    color: #aaa;
  }

  .clear-all-btn:hover {
    background-color: #3d1f1f;
    border-color: #f56c6c;
    color: #f56c6c;
  }

  .image-preview {
    background-color: #2d2d2d;
  }

  .image-section {
    border-bottom-color: #444;
  }

  .image-container {
    background-color: #1e1e1e;
  }

  .empty-placeholder {
    background-color: #1e1e1e;
    border-color: #555;
    color: #888;
  }

  .header-section {
    background-color: #1a2332;
  }

  .header-section .empty-placeholder {
    background-color: #1a2332;
  }

  .input-label {
    color: #e0e0e0;
  }

  .input-field {
    background-color: #1e1e1e;
    border-color: #555;
    color: #e0e0e0;
  }

  .input-field:focus {
    border-color: #409eff;
  }

  .input-field::placeholder {
    color: #666;
  }

  .image-url-input {
    background-color: #1e1e1e;
  }

  .image-url-input:hover {
    background-color: #1a3a52;
  }

  .image-url-input:focus {
    background-color: #1a3a52;
  }

  .link-section {
    background-color: #1e1e1e;
    border-bottom-color: #444;
  }

  .news-link {
    background-color: #2d2d2d;
    border-color: #555;
    color: #e0e0e0;
  }

  .news-link:hover {
    background-color: #1a3a52;
    border-color: #2196f3;
  }

  .external-icon {
    color: #aaa;
  }

  .news-link:hover .external-icon {
    color: #2196f3;
  }

  .paste-area {
    background-color: #1e1e1e;
    border-color: #555;
  }

  .paste-area:hover {
    border-color: #409eff;
    background-color: #1a3a52;
  }

  .paste-text>div:first-child {
    color: #e0e0e0;
  }

  .paste-subtext {
    color: #888;
  }

  .image-info {
    background-color: #1a3a52;
    border-color: #2196f3;
  }

  .info-text {
    color: #64b5f6;
  }

  .clear-btn {
    background-color: #2d2d2d;
    border-color: #555;
    color: #e0e0e0;
  }

  .clear-btn:hover {
    background-color: #3d1f1f;
    border-color: #f56c6c;
    color: #f56c6c;
  }

  .data-table {
    background-color: #2d2d2d;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  }

  .table-title {
    background-color: #1e1e1e;
    color: #e0e0e0;
    border-bottom-color: #444;
  }

  .avatar-placeholder {
    background-color: #1e1e1e;
    color: #888;
  }

  .header-cell {
    border-color: #666;
    color: #aaa;
    background-color: #1e1e1e;
  }

  .character-name-cell {
    background-color: #1a3a52;
    color: #64b5f6;
  }

  .empty-header {
    background-color: #1e1e1e;
  }

  .row-header {
    background-color: #1e1e1e;
    color: #aaa;
  }

  .data-cell {
    border-color: #666;
    color: #e0e0e0;
    background-color: #2d2d2d;
  }

  .data-grid tbody tr:hover {
    background-color: transparent;
  }

  .table-form {
    background-color: #1e1e1e;
    border-color: #555;
  }

  .form-label {
    color: #aaa;
  }

  .avatar-paste-area {
    background-color: #2d2d2d;
    border-color: #555;
  }

  .avatar-paste-area:hover {
    border-color: #409eff;
    background-color: #1a3a52;
  }

  .clear-avatar-btn {
    background-color: rgba(0, 0, 0, 0.8);
  }

  .paste-hint-small {
    color: #888;
  }

  .row-label {
    color: #aaa;
  }

  .add-table-btn {
    background-color: #409eff;
  }

  .search-result {
    background-color: #1a3a1a;
    border-color: #2e7d32;
    color: #81c784;
  }

  .search-result.error {
    background-color: #3d1f1f;
    border-color: #f56c6c;
    color: #ff6b6b;
  }

  .json-load-module {
    background-color: #1e1e1e;
    border-color: #555;
  }

  .json-module-header h3 {
    color: #e0e0e0;
  }

  .json-empty {
    color: #888;
  }

  .json-load-time {
    color: #666;
  }

  .json-help {
    background-color: #1a3a52;
    border-color: #2196f3;
  }

  .json-help p {
    color: #64b5f6;
  }

  .json-help ol {
    color: #aaa;
  }

  .add-table-btn:hover:not(:disabled) {
    background-color: #66b1ff;
  }

  .add-table-btn:disabled {
    background-color: #555;
  }

  .slot-config {
    background-color: #1e1e1e;
    border-color: #555;
  }

  .slot-number {
    color: #e0e0e0;
  }

  .slot-show-label {
    color: #aaa;
  }

  .slot-star-select {
    background-color: #2d2d2d;
    border-color: #555;
    color: #e0e0e0;
  }

  .slot-star-select:focus {
    border-color: #409eff;
  }

  .title-search-result {
    background-color: #1a3a1a;
    border-color: #2e7d32;
    color: #81c784;
  }

  .title-search-result.error {
    background-color: #3d1f1f;
    border-color: #f56c6c;
    color: #ff6b6b;
  }
}
</style>
