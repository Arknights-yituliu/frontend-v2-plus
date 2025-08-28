<script setup>
// 依赖引入
import packInfoCache from "/src/plugins/indexedDB/packInfoCache.js";
import { ref, watch, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import PackCardContainer from '/src/components/material/PackCardGroup.vue';
import ModuleHeader from '/src/components/layout/ModuleHeader.vue';
import { getStageConfig } from "/src/utils/user/userConfig.js";
import PackTable from "/src/components/material/PackTable.vue";
import deepClone from "/src/utils/deepClone.js";
import '/src/assets/css/material/pack.scss';
import '/src/assets/css/material/pack.phone.scss';
import itemCache from "/src/plugins/indexedDB/itemCache.js";
import NoticeBoard from "@/components/layout/NoticeBoard.vue";
import { calculatePackEfficiency } from "@/utils/item/packEfficiency.js";
import {dateFormat} from "@/utils/dateUtil.js";


// 当前日期
const date = new Date()
// 当前路由
const route = useRoute()

// 所有分类后的礼包
const fixedPacks = ref([])


// 用于缓存
let packInfoVOListOnSale = ref([])
let packInfoResponseData = []
let packInfoVOList = []
let itemValueMap = new Map()

// 性价比开关
const isDrawOnly = ref(false)
const isKernelValuable = ref(false)

// 排序选项
const sortOption = ref('time') // 默认按上架时间
const options = [
  { value: 'time', label: '上架时间' },
  { value: 'price', label: '价格' },
  { value: 'efficiency', label: '抽卡性价比' },
  { value: 'overall', label: '综合性价比' },
]

// 弹窗相关
const isLoading = ref(false)
const showLoadingTime = ref(0)

// 页面强制刷新（点击重试按钮）
function reloadPage() {
  location.reload()
}

/**
 * 加载材料价值表，拿到后去算礼包性价比
 */
async function loadingItemValue() {

  const stageConfig = getStageConfig()
  itemValueMap = await itemCache.getItemValueMapCacheByConfig(stageConfig)

  await getPackInfoData()
}

/**
 * 读取本地缓存礼包，然后算性价比
 */
async function getPackInfoData() {
  packInfoVOList = []
  packInfoResponseData = await packInfoCache.listPackInfo()
  const timeStamp = Date.now()
  for (const item of packInfoResponseData) {
    const packInfoVO = calculatePackEfficiency(item, itemValueMap, isDrawOnly.value, isKernelValuable.value)
    packInfoVOList.push(packInfoVO)

    if (item.end > timeStamp) {
      packInfoVOListOnSale.value.push(packInfoVO)
    }
  }

  collectPackInfoVO()
}

const forceShow = ref(false)
const clickSequence = ref([])

function handleClick(divName) {
  // 更新点击顺序队列
  clickSequence.value.push(divName)
  if (clickSequence.value.length > 4) {
    clickSequence.value.shift() // 保持最近4个点击
  }

  // 判断是否满足触发顺序
  if (clickSequence.value.join(',') === 'div1,div2,div1,div2') {
    forceShow.value = true
    document.querySelectorAll('.pack-content').forEach(el => {
      el.style.background = '#ffffff'; // 或使用 'white'
    });
    console.log('隐藏模式触发，div3 和 div4 强制显示')
  }
}

/**
 * 分类礼包，把礼包分到不同分组里
 */
function collectPackInfoVO() {
  const currentTimeStamp = date.getTime()
  const packs = {}

  // 遍历礼包列表，组装到不同分组
  packInfoVOList.forEach(packInfoVO => {
    packInfoVO.lineChartData = [
      { label: '大月卡', value: 1.57, color: 'rgb(65,147,220)', display: true },
      { label: '648源石', value: 1.00, color: 'rgb(65,147,220)', display: true },
      { label: '仅抽卡', value: packInfoVO.drawEfficiency, color: '#F88C20', display: forceShow.value || isDrawOnly.value },
      { label: '全物品', value: packInfoVO.packEfficiency, color: 'rgb(250, 83, 83)', display: forceShow.value || !isDrawOnly.value },
    ].sort((a, b) => b.value - a.value)

    const { saleType } = packInfoVO
    if (!packs[saleType]) packs[saleType] = []

    // 龙门币单独处理
    if (saleType === 'lmd') return packs.lmd.push(packInfoVO)
    // 已过期的礼包丢弃
    if (packInfoVO.end < currentTimeStamp) return

    packs[saleType].push(packInfoVO)
  })

  // 默认对“活动礼包”分组进行排序
  if (Array.isArray(packs.activity)) {
    packs.activity.sort(sortFunction)
  }

  // 按分组输出给页面
  fixedPacks.value = [
    {
      title: '在售/即将开售的礼包',
      titleEn: 'New Packs',
      tips: ['*在售/即将开售的限时礼包，常驻、半常驻礼包和源石请往下翻'],
      list: [{ title: '', packs: packs.activity }]
    },
    {
      title: '半常驻礼包',
      titleEn: 'Chips Packs & LMD Packs',
      tips: ['*内容较为固定，规律较为明确的礼包'],
      list: [
        { title: '职业芯片礼包', packs: packs.chip },
        { title: '龙门币补给包', packs: packs.lmd },
      ]
    },
    {
      title: '常驻/周期性礼包',
      titleEn: 'Monthly & Weekly & Orundum',
      tips: ['*每月/每周礼包、新人/回归礼包、源石'],
      list: [
        { title: '每月/每周礼包', packs: [...packs.weekly, ...packs.monthly] },
        { title: '新人/回归礼包', packs: packs.newbie },
        { title: '源石/首充源石', packs: [...packs.originium, ...packs.originium2] },
      ]
    },
  ]

  filterPacksV2()
}

/**
 * 排序函数
 */
function sortFunction(a, b) {
  switch (sortOption.value) {
    case 'time':
      return new Date(b.start) - new Date(a.start)
    case 'price':
      return a.price - b.price
    case 'efficiency':
      return b.drawEfficiency - a.drawEfficiency
    case 'overall':
      return b.packEfficiency - a.packEfficiency
    default:
      return 0
  }
}

/**
 * 切换排序选项时，重新排序
 */
watch(sortOption, () => {
  const target = fixedPacks.value.find(item => item.titleEn === 'New Packs')
  if (!target || !target.list?.length) return

  const packs = target.list[0].packs
  if (!packs) return

  packs.sort(sortFunction)
})

/**
 * 路由变化时，重新加载数据（防止从其它页面跳转不刷新）
 */
// watch(() => route.fullPath, () => {
//   loadingItemValue()
// })

/**
 * 页面挂载时，读取开关状态、加载礼包、检测是否需要弹出加载中对话框
 */
onMounted(() => {
  isDrawOnly.value = localStorage.getItem('isDrawOnly') === 'true'
  isKernelValuable.value = localStorage.getItem('isKernelValuable') === 'true'

  loadingItemValue()


})

/**
 * 若礼包加载完成，但弹窗显示未满 2 秒，则保证至少显示 2 秒
 */
watch(fixedPacks, (newVal) => {
  if (Array.isArray(newVal) && newVal.length > 0 && isLoading.value) {
    const elapsed = Date.now() - showLoadingTime.value
    const minDuration = 2000
    if (elapsed < minDuration) {
      setTimeout(() => {
        isLoading.value = false
      }, minDuration - elapsed)
    } else {
      isLoading.value = false
    }
  }
}, { immediate: true })

/**
 * 保存两个性价比开关的值到 localStorage
 */
watch(() => isDrawOnly.value, (v) => {

  localStorage.setItem('isDrawOnly', v.toString())
})
watch(isKernelValuable, (v) => localStorage.setItem('isKernelValuable', v.toString()))

/**
 * 切换性价比模式
 */
function displayPackEfficiency() {
  isDrawOnly.value = !isDrawOnly.value
  packInfoVOList = packInfoResponseData.map(item => calculatePackEfficiency(item, itemValueMap, isDrawOnly.value, isKernelValuable.value))
  collectPackInfoVO()
}

function changeKernelValue() {
  isKernelValuable.value = !isKernelValuable.value
  packInfoVOList = packInfoResponseData.map(item => calculatePackEfficiency(item, itemValueMap, isDrawOnly.value, isKernelValuable.value))
  collectPackInfoVO()
}


// 筛选后的礼包
const filteredPackMap = ref(new Map)

// 售卖价格区间
const packSalePriceList = [
  { label: '0-100RMB', value: '0-100', min: 0, max: 100 },
  { label: '100-200RMB', value: '100-200', min: 100, max: 200 },
  { label: '200-648RMB', value: '200-648', min: 200, max: 648 },
]

// 包含的礼包标签
const packTags = [
  { label: "新人", value: "newbie" },
  { label: "含有模组块", value: "mod" },
  { label: "芯片", value: "chip" },
  { label: "活动礼包", value: "activity" },
  { label: "周期性礼包", value: "periodically" },
  { label: "绝版礼包", value: "event" },
  { label: "含有无法计价之物品", value: "special" },
  { label: "直升礼包", value: "elite" },
  { label: "龙门币礼包", value: "lmd" },
  { label: "定向抽卡类礼包", value: "operator" },
]

const tagMap = new Map()
for (const tag of packTags) {
  tagMap.set(tag.value, tag.label)
}

// 售卖价格区间
const packSaleDateList = [
  { label: "2019年", value: "2019" },
  { label: "2020年", value: "2020" },
  { label: "2021年", value: "2021" },
  { label: "2022年", value: "2022" },
  { label: "2023年", value: "2023" },
  { label: "2024年", value: "2024" },
  { label: "2025年", value: "2025" },
]


const packFilterConditions = ref({
  "tag": new Map(),
  "date": new Map(),
  "price": new Map()
})


const packSaleDate = packSaleDateList[packSaleDateList.length - 1]
packFilterConditions.value.date.set(packSaleDate.value, packSaleDate)


// 选择筛选条件
function choosePackOptionV2(type, obj) {
  const v = obj.value
  if (packFilterConditions.value[type].has(v)) {
    packFilterConditions.value[type].delete(v)
  } else {
    packFilterConditions.value[type].set(v, obj)
  }

  filterPacksV2()
}

// 按钮激活状态
const buttonActive = (type, v) => {

  if (packFilterConditions.value[type].has(v)) {
    return 'elevated'
  }


  return 'tonal'

}

const year2019 = new Date('2019/04/30 00:00:00');

const packCollect = ref([])

function filterPacksV2() {

  const result = new Map()


  for (const pack of packInfoVOList) {
    const packYear = new Date(pack.start).getFullYear()
    if (pack.start < year2019) {
      continue
    }

    const dateFlag = packFilterConditions.value.date.size === 0 || packFilterConditions.value.date.has(`${packYear}`)

    const tagFlag = packFilterConditions.value.tag.size === 0 || packFilterConditions.value.tag.has(pack.saleType)
    let priceFlag = packFilterConditions.value.price.size === 0
    for (const [k, v] of packFilterConditions.value.price) {
      const { max, min } = v
      if (pack.price >= min && pack.price <= max) {
        priceFlag = true
      }
    }

    // console.log(pack.officialName, 'dateFlag', dateFlag, 'tagFlag', tagFlag, 'priceFlag', priceFlag)

    if (dateFlag && tagFlag && priceFlag) {
      if (!result.has(packYear)) {
        result.set(packYear, [])
      }
      result.get(packYear).push(pack)
    }
  }

  const list = []
  for (const [k, v] of result) {
    list.push({
      year: k,
      list: v
    })
  }

  list.sort((a, b) => b.year - a.year)

  packCollect.value = list


  function _hasAnyKeyInMap(list, map) {
    return list.some(item => map.has(item));
  }
}


</script>


<template>
  <div>
    <div id="pack" class="pack-efficiency-page">
      <!-- 不会因为筛选改变的礼包 Start -->
      <template v-for="item in fixedPacks" :key="item.titleEn">

        <module-header :title="item.title" :title-en="item.titleEn" :tips="item.tips" />
        <div v-if="item.titleEn === 'New Packs'">
          <v-chip text="点击图片查看礼包详情" color="deep-orange" class="m-4" @click="handleClick('div1')"></v-chip>
          <v-chip text="材料按135理智=1源石折合成源石" color="deep-orange" class="m-4" @click="handleClick('div2')"></v-chip>
          <v-chip text="中坚寻访：1蓝抽也记为1抽，但价值视为0.837抽" color="deep-orange" class="m-4"></v-chip>
        </div>

        <div class="flex flex-wrap">
          <!-- 中坚寻访按钮 -->
          <v-btn v-if="item.titleEn === 'New Packs'" :color="isKernelValuable ? 'primary' : 'grey'"
            :variant="isKernelValuable ? 'flat' : 'outlined'" @click="changeKernelValue()"
            style="height: 36px;margin: 6px 4px;">
            需要中坚寻访
          </v-btn>

          <!-- 只看抽卡按钮 -->
          <v-btn v-if="item.titleEn === 'New Packs'" :color="isDrawOnly ? 'primary' : 'grey'"
            :variant="isDrawOnly ? 'flat' : 'outlined'" @click="displayPackEfficiency()"
            style="height: 36px;margin: 6px 4px;">
            只看抽卡
          </v-btn>

          <!-- 四选一排序按钮组 -->
          <v-btn-toggle v-if="item.titleEn === 'New Packs'" v-model="sortOption" mandatory class="m-0-8"
            style="height: 36px;margin: 6px 4px;">
            <v-btn v-for="option in options" :key="option.value" :value="option.value"
              :color="sortOption === option.value ? 'primary' : 'grey'"
              :variant="sortOption === option.value ? 'flat' : 'outlined'">
              {{ option.label }}
            </v-btn>
          </v-btn-toggle>
        </div>
        <template v-for="(packInfo, packIndex) in item.list" :key="packIndex">
          <h2 style="margin: 12px;" v-if="packInfo.title">{{ packInfo.title }}</h2>
          <v-chip v-if="packInfo.title === '新人/回归礼包'" text="由于新人进阶组合包的特殊性（内置了一张月卡），月卡党如仅考虑抽卡请参考“新人进阶组合包不计月卡”"
            color="red" class="m-4"></v-chip>
          <v-chip v-if="packInfo.title === '源石/首充源石'" text="每年周年庆会重置源石首充" color="red" class="m-4"></v-chip>
          <PackCardContainer v-model="packInfo.packs" />
        </template>
      </template>
      <!-- 不会因为筛选改变的礼包 End -->

      <!-- 历史礼包 Start -->
      <module-header title="历史礼包" title-en="Packs History" :tips="['*历史礼包存档']" />

      <div class="m-4">
        年份：
        <v-btn color="primary" v-for="(year, index) in packSaleDateList" :key="index"
          :variant="buttonActive('date', year.value)" @click="choosePackOptionV2('date', year)" class="m-4">
          {{ year.label }}
        </v-btn>
      </div>
      <div class="m-4">
        价格：
        <v-btn color="primary" v-for="(item, index) in packSalePriceList" :key="index"
          :variant="buttonActive('price', item.value)" @click="choosePackOptionV2('price', item)" class="m-4">
          {{ item.label }}
        </v-btn>
      </div>
      <div class="m-4">
        类型：
        <v-btn color="primary" v-for="(tag, index) in packTags" :key="index" :variant="buttonActive('tag', tag.value)"
          @click="choosePackOptionV2('tag', tag)" class="m-4">
          {{ tag.label }}
        </v-btn>
      </div>

      <!-- 按年份展示筛选礼包 -->
      <template v-for="collect in packCollect">
        <h2 style="margin: 12px;">{{ collect.year }}年</h2>
        <PackCardContainer :modelValue="collect.list" />
      </template>

      <!-- 礼包性价比总表 Start -->
      <module-header title="礼包性价比总表" title-en="Packs Value" />

      <v-chip text="由于新人进阶组合包的特殊性（内置了一张月卡），月卡党如仅考虑抽卡请参考“新人进阶组合包不计月卡”。" color="red" class="m-4"></v-chip>
      <v-chip text="性价比基准为648￥源石，移动端可左右滑动表格" color="red" class="m-4"></v-chip>

      <PackTable v-model="packInfoVOListOnSale">

      </PackTable>

    </div>

    <NoticeBoard module="pack">

    </NoticeBoard>


    <!-- <foot></foot> -->
  </div>
  <v-dialog v-model="isLoading" persistent max-width="300">
    <v-card>
      <v-card-title class="text-h6">加载中</v-card-title>
      <v-card-text>
        数据正在加载，请稍候…
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" @click="reloadPage">刷新页面</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style lang="scss">
#pack {
  /* background-color: #eeeeee; */
  /* max-width: 1080px; */
  margin: auto;
}

#pack_content {
  /* background-color: rgb(43,72,101); */
  padding: 0px 0px;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-around;
}
</style>
