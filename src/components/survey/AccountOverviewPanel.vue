<script setup>
import { ref, computed, watch } from 'vue'
import { createMessage } from "/src/utils/message.js"
import { operatorTableV2 } from "/src/utils/gameData.js"
import operatorUpdateTime from '/public/json/operator_update_time.json'

// 子组件
import AccountStats from './account-overview/AccountStats.vue'
import OperatorGrid from './account-overview/OperatorGrid.vue'
import MaterialGrid from './account-overview/MaterialGrid.vue'

const props = defineProps({
  // 从父组件传入的干员数据（练度调查数据）
  operatorList: {
    type: Array,
    default: () => []
  },
  // 森空岛完整账号数据
  sklandAccountData: {
    type: Object,
    default: () => null
  }
})

const exportContainerRef = ref(null)
const isExporting = ref(false)  // 导出状态

// 联动干员名称列表
const COLLAB_OPERATOR_NAMES = new Set([
  '丰川祥子','若叶睦','八幡海铃','三角初华','祐天寺若麦',//母鸡卡联动
  '玛露西尔','莱欧斯','森西','齐尔查克',//迷宫饭联动
  '艾拉','双月','医生','导火索',//彩六联动2期
  '泰拉大陆调查团','麒麟R夜刀','火龙S黑角',//怪猎联动
  '灰烬','闪击','霜华','战车',//彩六联动1期
  '罗小黑'//罗小黑联动
])

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

// 优先使用森空岛数据，否则使用练度调查数据
const useSklandData = computed(() => {
  return props.sklandAccountData && props.sklandAccountData.operatorDataList && props.sklandAccountData.operatorDataList.length > 0
})

// 材料列表
const itemList = computed(() => {
  if (useSklandData.value) {
    return props.sklandAccountData?.itemList || []
  }
  return []
})

// 格式化的干员数据（用于展示）
const formattedOperators = computed(() => {
  // 优先使用森空岛的完整数据
  if (useSklandData.value) {
    return props.sklandAccountData.operatorDataList.map(op => {
      const charInfo = operatorTableV2[op.charId]
      return {
        ...op,
        name: charInfo?.name || op.name,
        profession: charInfo?.profession || op.profession || '',
        skills: charInfo?.skills || op.skills || [],
        equip: charInfo?.equip || op.equip || [],
        isLimited: limitedOperatorIds.value.has(op.charId),
        isCollab: collabOperatorIds.value.has(op.charId)
      }
    })
  }
  
  // 使用练度调查数据
  if (!props.operatorList || props.operatorList.length === 0) {
    return []
  }
  
  const operators = props.operatorList
    .filter(op => op.own || op.elite > 0 || op.level > 0) // 显示已拥有或有练度的干员
    .map(op => {
      const charInfo = operatorTableV2[op.charId]
      return {
        ...op,
        name: charInfo?.name || op.name,
        profession: charInfo?.profession || '',
        skills: charInfo?.skills || [],
        equip: charInfo?.equip || [],
        isLimited: limitedOperatorIds.value.has(op.charId),
        isCollab: collabOperatorIds.value.has(op.charId)
      }
    })
    .sort((a, b) => {
      if (b.rarity !== a.rarity) return b.rarity - a.rarity
      if (b.elite !== a.elite) return b.elite - a.elite
      return b.level - a.level
    })
  
  return operators
})

// 账号数据（用于AccountStats组件）
const accountData = computed(() => {
  if (useSklandData.value) {
    return {
      uid: props.sklandAccountData?.uid || '',
      nickName: props.sklandAccountData?.nickName || '博士',
      channelName: props.sklandAccountData?.channelName || '',
      status: props.sklandAccountData?.status || { level: 0 },
      operatorDataList: formattedOperators.value,
      itemList: itemList.value,
      skins: props.sklandAccountData?.skins || [],
      charInfoMap: props.sklandAccountData?.charInfoMap || {}
    }
  }
  return {
    uid: '',
    nickName: '博士',
    channelName: '',
    status: { level: 0 },
    operatorDataList: formattedOperators.value,
    itemList: [],
    skins: [],
    charInfoMap: {}
  }
})

// 是否有数据可以展示
const hasData = computed(() => {
  return formattedOperators.value.length > 0
})

// 缓存 sprite 图片
let spriteImageCache = null
let spriteImageLoading = false
const spriteImagePromiseResolvers = []

// 加载 sprite 图片
async function loadSpriteImage() {
  if (spriteImageCache) return spriteImageCache
  
  if (spriteImageLoading) {
    return new Promise(resolve => {
      spriteImagePromiseResolvers.push(resolve)
    })
  }
  
  spriteImageLoading = true
  
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      spriteImageCache = img
      spriteImageLoading = false
      resolve(img)
      spriteImagePromiseResolvers.forEach(r => r(img))
      spriteImagePromiseResolvers.length = 0
    }
    img.onerror = () => {
      spriteImageLoading = false
      resolve(null)
      spriteImagePromiseResolvers.forEach(r => r(null))
      spriteImagePromiseResolvers.length = 0
    }
    // 使用 sprite 图片 URL
    img.src = 'https://cos.yituliu.cn/arknights/sprite/avatar2026-01-09.webp'
  })
}

// 从 sprite 中裁剪头像
function cropAvatarFromSprite(spriteImg, bgPositionX, bgPositionY, targetSize = 90) {
  if (!spriteImg) {
    console.error('[cropAvatarFromSprite] spriteImg 为空')
    return null
  }
  
  try {
    const canvas = document.createElement('canvas')
    canvas.width = targetSize
    canvas.height = targetSize
    const ctx = canvas.getContext('2d')
    
    // sprite 中的头像是 180x180，需要缩放到目标大小
    const sourceSize = 180
    // background-position 是负值，转换为正值就是在 sprite 中的位置
    const sx = Math.abs(bgPositionX)
    const sy = Math.abs(bgPositionY)
    
    console.log(`[cropAvatarFromSprite] 裁剪参数: sx=${sx}, sy=${sy}, sourceSize=${sourceSize}, targetSize=${targetSize}`)
    
    ctx.drawImage(spriteImg, sx, sy, sourceSize, sourceSize, 0, 0, targetSize, targetSize)
    
    const dataUrl = canvas.toDataURL('image/png')
    console.log(`[cropAvatarFromSprite] 裁剪成功，dataUrl长度: ${dataUrl.length}`)
    return dataUrl
  } catch (e) {
    console.error('[cropAvatarFromSprite] 裁剪失败:', e)
    return null
  }
}

// 获取元素的 background-position
function getBackgroundPosition(element, charId) {
  const style = window.getComputedStyle(element)
  const bgPosition = style.backgroundPosition || '0px 0px'
  const bgImage = style.backgroundImage || ''
  const [x, y] = bgPosition.split(/\s+/).map(v => parseInt(v, 10) || 0)
  console.log(`[getBackgroundPosition] charId=${charId}, bgPosition=${bgPosition}, bgImage=${bgImage.slice(0, 100)}..., parsed: x=${x}, y=${y}`)
  return { x, y }
}

// 预加载图片的工具函数（带超时和备用 URL 处理）
function preloadImage(url, fallbackUrl = null, timeout = 5000) {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    
    const timer = setTimeout(() => {
      console.warn(`[exportImage] 图片加载超时: ${url}`)
      if (fallbackUrl) {
        // 尝试备用 URL
        tryFallback()
      } else {
        resolve({ url, success: false, img: null })
      }
    }, timeout)
    
    const tryFallback = () => {
      const fallbackImg = new Image()
      fallbackImg.crossOrigin = 'anonymous'
      const fallbackTimer = setTimeout(() => {
        console.warn(`[exportImage] 备用图片加载超时: ${fallbackUrl}`)
        resolve({ url: fallbackUrl, success: false, img: null })
      }, timeout)
      
      fallbackImg.onload = () => {
        clearTimeout(fallbackTimer)
        resolve({ url: fallbackUrl, success: true, img: fallbackImg })
      }
      fallbackImg.onerror = () => {
        clearTimeout(fallbackTimer)
        console.warn(`[exportImage] 备用图片加载失败: ${fallbackUrl}`)
        resolve({ url: fallbackUrl, success: false, img: null })
      }
      fallbackImg.src = fallbackUrl
    }
    
    img.onload = () => {
      clearTimeout(timer)
      resolve({ url, success: true, img })
    }
    img.onerror = () => {
      clearTimeout(timer)
      console.warn(`[exportImage] 图片加载失败: ${url}`)
      if (fallbackUrl) {
        // 尝试备用 URL
        tryFallback()
      } else {
        resolve({ url, success: false, img: null })
      }
    }
    img.src = url
  })
}

// 导出图片
async function exportImage() {
  if (!exportContainerRef.value || isExporting.value) return
  
  isExporting.value = true
  console.log('[exportImage] 开始导出图片...')
  
  try {
    const html2canvas = (await import('html2canvas')).default
    
    const container = exportContainerRef.value
    
    // 修复 sprite 头像渲染问题
    // html2canvas 对 CSS sprite + transform: scale() 支持不好
    // 解决方案：用 <img> 元素替换 sprite div
    // const avatarContainers = container.querySelectorAll('.avatar-container')
    // const originalData = []
    //
    // console.log(`[exportImage] 找到 ${avatarContainers.length} 个头像容器`)
    //
    // // 收集所有需要加载的图片 URL 并预加载
    // const imagePromises = []
    // const charIdDataMap = new Map()
    //
    // for (const avatarContainer of avatarContainers) {
    //   const wrapper = avatarContainer.querySelector('.sprite-avatar')
    //   if (!wrapper) {
    //     console.warn('[exportImage] 未找到 .sprite-avatar')
    //     continue
    //   }
    //
    //   const classList = Array.from(wrapper.classList)
    //   // 匹配所有 bg- 开头的类名，并且包含 char_ 或其他角色ID格式
    //   const charIdClass = classList.find(c => c.startsWith('bg-') && c !== 'bg-')
    //   if (charIdClass) {
    //     const charId = charIdClass.replace('bg-', '')
    //     const imageUrl = `https://cos.yituliu.cn/image2/avatar/${charId}.png`
    //     // 备用 URL 使用 webp 格式
    //     const fallbackUrl = `https://cos.yituliu.cn/arknights/avatar/${charId}.webp`
    //     charIdDataMap.set(avatarContainer, { charId, wrapper, imageUrl })
    //     imagePromises.push(preloadImage(imageUrl, fallbackUrl).then(result => ({ ...result, avatarContainer })))
    //   } else {
    //     console.warn('[exportImage] 未找到 charId 类名，classList:', classList)
    //   }
    // }
    //
    // console.log(`[exportImage] 正在预加载 ${imagePromises.length} 个图片...`)
    //
    // // 预加载 sprite 图片（用于失败时的回退）
    // console.log('[exportImage] 正在加载 sprite 图片...')
    // const spriteImg = await loadSpriteImage()
    // console.log(`[exportImage] sprite 图片加载${spriteImg ? '成功' : '失败'}`)
    //
    // // 预加载所有图片
    // const loadResults = await Promise.all(imagePromises)
    //
    // const successCount = loadResults.filter(r => r.success).length
    // console.log(`[exportImage] 图片加载完成，成功: ${successCount}/${loadResults.length}`)
    //
    // // 替换为 img 元素
    // for (const result of loadResults) {
    //   const { avatarContainer, success, img, url } = result
    //   const data = charIdDataMap.get(avatarContainer)
    //   if (!data) continue
    //
    //   const { wrapper, charId } = data
    //   const size = avatarContainer.offsetWidth || 90
    //
    //   // 保存原始状态
    //   originalData.push({
    //     avatarContainer,
    //     containerStyle: avatarContainer.style.cssText,
    //     wrapper,
    //     wrapperStyle: wrapper.style.cssText,
    //     wrapperDisplay: wrapper.style.display,
    //     addedImg: null,
    //     charId
    //   })
    //
    //   // 保持容器原有的 grayscale filter
    //   const containerClasses = avatarContainer.className
    //   const hasGrayscale = containerClasses.includes('grayscale')
    //
    //   // 修改容器样式
    //   avatarContainer.style.cssText = `
    //     position: absolute;
    //     top: 50%;
    //     left: 50%;
    //     margin-top: -${size / 2}px;
    //     margin-left: -${size / 2}px;
    //     width: ${size}px;
    //     height: ${size}px;
    //     z-index: 1;
    //     overflow: hidden;
    //     transform: none;
    //     ${hasGrayscale ? 'filter: grayscale(100%) brightness(0.6);' : ''}
    //   `
    //
    //   if (success && img) {
    //     // 隐藏原始 sprite div
    //     wrapper.style.display = 'none'
    //
    //     // 创建并添加 img 元素
    //     const imgEl = document.createElement('img')
    //     imgEl.src = url
    //     imgEl.crossOrigin = 'anonymous'
    //     imgEl.style.cssText = `
    //       width: ${size}px;
    //       height: ${size}px;
    //       object-fit: cover;
    //       object-position: center 20%;
    //       position: absolute;
    //       top: 0;
    //       left: 0;
    //     `
    //     avatarContainer.appendChild(imgEl)
    //     originalData[originalData.length - 1].addedImg = imgEl
    //   } else {
    //     // 图片加载失败，使用 sprite 裁剪方案
    //     console.warn(`[exportImage] 使用 sprite 裁剪回退: ${charId}`)
    //
    //     // 获取 sprite 图片的 background-position
    //     const bgPos = getBackgroundPosition(wrapper, charId)
    //
    //     // 从 sprite 中裁剪头像
    //     const croppedDataUrl = cropAvatarFromSprite(spriteImg, bgPos.x, bgPos.y, size)
    //
    //     if (croppedDataUrl) {
    //       // 隐藏原始 sprite div
    //       wrapper.style.display = 'none'
    //
    //       // 创建并添加裁剪后的 img 元素
    //       const imgEl = document.createElement('img')
    //       imgEl.src = croppedDataUrl
    //       imgEl.style.cssText = `
    //         width: ${size}px;
    //         height: ${size}px;
    //         object-fit: cover;
    //         position: absolute;
    //         top: 0;
    //         left: 0;
    //       `
    //       avatarContainer.appendChild(imgEl)
    //       originalData[originalData.length - 1].addedImg = imgEl
    //     } else {
    //       console.error(`[exportImage] sprite 裁剪失败: ${charId}`)
    //     }
    //   }
    // }
    //
    // // 等待渲染完成
    // await new Promise(resolve => setTimeout(resolve, 800))
    
    const canvas = await html2canvas(container, {
      backgroundColor: '#1a1a2e',
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false
    })
    
    // // 恢复原始样式并移除添加的 img 元素
    // for (const item of originalData) {
    //   item.avatarContainer.style.cssText = item.containerStyle
    //   item.wrapper.style.cssText = item.wrapperStyle
    //   if (item.wrapperDisplay !== undefined) {
    //     item.wrapper.style.display = item.wrapperDisplay || ''
    //   }
    //   if (item.addedImg) {
    //     item.addedImg.remove()
    //   }
    // }
    
    // 转换为图片并下载
    const link = document.createElement('a')
    link.download = `明日方舟账号一图流_${accountData.value?.nickName || 'unknown'}_${Date.now()}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
    
    createMessage({ type: 'success', text: '图片已保存！' })
  } catch (error) {
    console.error(error)
    createMessage({ type: 'error', text: '图片生成失败' })
  } finally {
    isExporting.value = false
  }
}

// 暴露方法给父组件
defineExpose({
  exportImage
})
</script>

<template>
  <div class="account-overview-panel" style="position: relative;">
    <div v-if="!hasData" class="no-data-hint">
      <v-alert type="info" variant="tonal">
        请先从"数据导入导出"Tab导入您的森空岛数据，然后返回此页面查看一图流效果
      </v-alert>
    </div>
    
    <div v-else>
      <div class="toolbar">
        <v-btn color="primary" @click="exportImage" :loading="isExporting" :disabled="isExporting">
          <template v-slot:loader>
            <v-progress-circular indeterminate size="20" width="2" class="mr-2"></v-progress-circular>
            正在生成图片...
          </template>
          <v-icon>mdi-download</v-icon>
          下载一图流图片
        </v-btn>
      </div>
      
      <!-- 导出遮罩层 -->
      <v-overlay :model-value="isExporting" contained class="align-center justify-center" persistent>
        <div class="text-center">
          <v-progress-circular indeterminate size="64" color="primary"></v-progress-circular>
          <div class="mt-4 text-white">正在生成图片，请稍候...</div>
        </div>
      </v-overlay>
      
      <!-- 导出容器 -->
      <div ref="exportContainerRef" class="export-container">
        <!-- 账号统计信息 -->
        <AccountStats 
          :account-data="accountData"
          :limited-operator-ids="limitedOperatorIds"
          :total-limited-six-star="totalLimitedSixStar"
          :collab-operator-ids="collabOperatorIds"
          :total-collab-operators="totalCollabOperators"
        />
        
        <!-- 干员展示 -->
        <OperatorGrid 
          :operators="formattedOperators"
          :limited-operator-ids="limitedOperatorIds"
          :collab-operator-ids="collabOperatorIds"
        />
        
        <!-- 材料展示 -->
        <MaterialGrid 
          v-if="itemList.length > 0"
          :items="itemList"
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
.account-overview-panel {
  padding: 16px;
}

.no-data-hint {
  padding: 20px;
}

.toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 16px;
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
</style>
