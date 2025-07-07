<script setup>
import itemAPI from "/src/api/materialV5.js";
import packInfoCache from "/src/plugins/indexedDB/packInfoCache.js";
import { ref, watch, onMounted } from 'vue';
import PackCardContainer from '/src/components/material/PackCardGroup.vue'
import ModuleHeader from '/src/components/layout/ModuleHeader.vue';
import { getStageConfig } from "/src/utils/user/userConfig.js";
import PackTable from "/src/components/material/PackTable.vue";
import deepClone from "/src/utils/deepClone.js";
import '/src/assets/css/material/pack.scss';
import '/src/assets/css/material/pack.phone.scss';
import itemCache from "/src/plugins/indexedDB/itemCache.js";
import NoticeBoard from "@/components/layout/NoticeBoard.vue";
import { calculatePackEfficiency } from "@/utils/item/packEfficiency.js";

const date = new Date() // 当前日期
const fixedPacks = ref({})

//售卖类型
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

//价格区间
const packSalePriceList = [
  { label: '0-100RMB', min: 0, max: 100 },
  { label: '100-200RMB', min: 100, max: 200 },
  { label: '200-648RMB', min: 200, max: 648 },
]

//选择的礼包tag
const selectedPackTag = ref([])
//选择的礼包售卖类型
const selectedPackSaleDate = ref([])
//选择的礼包售卖价格
const selectedPackSalePrice = ref([])

// 筛选后的礼包列表
const filteredPackMap = ref(new Map())

//缓存的礼包数据，用于切换中坚性价比的数据时，直接用这个数据去覆盖
let packInfoVOListCache = []
let packInfoResponseData = []
//礼包性价比数据
let packInfoVOList = []
//当前在售的礼包性价比数据，用于礼包总表
let packInfoVOListOnSale = ref([])

//材料价值表
let itemValueMap = new Map()

//获取材料价值表
function loadingItemValue() {
  const stageConfig = getStageConfig()
  //获取本地计算的材料价值
  itemCache.getItemInfoMapCacheByConfig(stageConfig).then(response => {
    itemValueMap = response

    getPackInfoData()
  })
}


/**
 * 计算礼包性价比
 * @returns {Promise<void>}
 */
async function getPackInfoData() {
  packInfoVOListOnSale.value = []
  packInfoVOList = []
  // 等待获取接口返回的全部礼包信息
  const data = await packInfoCache.listPackInfo()
  packInfoResponseData = data
  //先计算礼包的性价比
  for (const item of data) {
    const packInfoVO = calculatePackEfficiency(item, itemValueMap, isDrawOnly.value, isKernelValuable.value)
    packInfoVOList.push(packInfoVO)
    packInfoVOListCache.push(deepClone(packInfoVO))
  }

  //礼包分类
  collectPackInfoVO()

}


let isDrawOnly = ref(false)

let isKernelValuable = ref(false)

// 2️⃣ 页面加载时，从 localStorage 读取
onMounted(() => {
  isDrawOnly.value = localStorage.getItem('isDrawOnly') === 'true'
  isKernelValuable.value = localStorage.getItem('isKernelValuable') === 'true'
})

// 3️⃣ 当值变化时，自动保存到 localStorage
watch(isDrawOnly, (newVal) => {
  localStorage.setItem('isDrawOnly', newVal)
})

watch(isKernelValuable, (newVal) => {
  localStorage.setItem('isKernelValuable', newVal)
})

function displayPackEfficiency() {
  let list = []
  for (const item of packInfoResponseData) {
    const packInfoVO = calculatePackEfficiency(item, itemValueMap, isDrawOnly.value, isKernelValuable.value)
    list.push(packInfoVO)
  }

  packInfoVOList = list
  collectPackInfoVO()
}

//如果是true就覆写数据，如果是false就用原始数据重置
function changeKernelValue() {

  let list = []
  for (const item of packInfoResponseData) {
    const packInfoVO = calculatePackEfficiency(item, itemValueMap, isDrawOnly.value, isKernelValuable.value)
    list.push(packInfoVO)
  }

  packInfoVOList = list

  // if (isKernelValuable.value) {
  //   for (const pack of packInfoVOList) {
  //     pack.draws = pack.drawsKernel
  //     pack.packEfficiency = pack.packEfficiencyKernel
  //     pack.packedOriginium = pack.packedOriginiumKernel
  //     pack.packedOriginiumPrice = pack.packedOriginiumPriceKernel
  //     pack.drawEfficiency = pack.drawEfficiencyKernel
  //     pack.drawPrice = pack.drawPriceKernel
  //     pack.packContentVO = pack.packContentContainsKernelVO
  //   }
  // } else {
  //   packInfoVOList = deepClone(packInfoVOListCache)
  // }

  collectPackInfoVO()
}

// 筛选按钮是否激活
const buttonActive = (v) => {
  if (selectedPackTag.value.includes(v) || selectedPackSaleDate.value.includes(v) || selectedPackSalePrice.value.includes(v)) {
    return 'elevated'
  }
  return 'tonal'
}


/**
 * 分类礼包
 */
function collectPackInfoVO() {

  // const currentTimeStamp = date.getTime()-60*60*24*100*1000 // 获取时间戳
  const currentTimeStamp = date.getTime()

  // 获取礼包性价比条
  const getLineChartData = pack => {
    const lineChartData = [
      { label: '大月卡', value: 1.57, color: 'rgb(65,147,220)', display: true },
      { label: '648源石', value: 1.00, color: 'rgb(65,147,220)', display: true },
      {
        label: '仅抽卡',
        value: pack.drawEfficiency,
        color: '#F88C20',
        display: isDrawOnly.value
      },
      { label: '全物品', value: pack.packEfficiency, color: 'rgb(250, 83, 83)', display: !isDrawOnly.value }
    ];
    return lineChartData.sort((a, b) => b.value - a.value);
  }

  const packs = {}

  packInfoVOListOnSale.value = []

  packInfoVOList.forEach(packInfoVO => {
    packInfoVO.lineChartData = getLineChartData(packInfoVO);
    packInfoVO.packRmbPerDraw = packInfoVO.packRmbPerDraw || 0;

    const { saleType } = packInfoVO;
    if (!packs[saleType]) {
      packs[saleType] = []
    }
    // 龙门币模板礼包不放入总表所以单独放入
    if (saleType === 'lmd') {
      return packs.lmd.push(packInfoVO)
    }

    // 除龙门币模板礼包外, 不放入过期礼包
    if (packInfoVO.end < currentTimeStamp) {
      return
    }

    //计算每个礼包的源石单价

    packInfoVOListOnSale.value.push(packInfoVO) // 放入总表
    packs[saleType].push(packInfoVO) // 放入各个类型
  })


  fixedPacks.value = [
    {
      title: '在售/即将开售的礼包',
      titleEn: 'New Packs',
      tips: ['*在售/即将开售的限时礼包，常驻、半常驻礼包和源石请往下翻'],
      list: [
        { title: '', packs: packs.activity },
      ]
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
  filterPacks()

}

// 礼包排序
const sortOption = ref('time') // 默认选项

const options = [
  { value: 'time', label: '上架时间' },
  { value: 'price', label: '价格' },
  { value: 'efficiency', label: '抽卡性价比' },
  { value: 'overall', label: '综合性价比' },
]

watch(
  sortOption,
  () => {
    const target = fixedPacks.value.find(item => item.titleEn === 'New Packs')

    if (
      !target ||
      !Array.isArray(target.list) ||
      !target.list.length ||
      !Array.isArray(target.list[0].packs)
    ) {
      console.log('target 或 packs 不存在')
      return
    }

    target.list[0].packs.sort((a, b) => {
      switch (sortOption.value) {
        case 'time':
          return new Date(a.start) - new Date(b.start)
        case 'price':
          return a.price - b.price
        case 'efficiency':
          return b.drawEfficiency - a.drawEfficiency
        case 'overall':
          return b.packEfficiency - a.packEfficiency
        default:
          return 0
      }
    })
  }
)



// 筛选礼包: 当前筛选逻辑是按照之前的"满足其中任何一个条件的礼包都会展示", 而不是"同时满足所有筛选条件的礼包才展示"
const filterPacks = () => {
  for (let year = date.getFullYear(); year >= 2019; year--) {
    filteredPackMap.value.set(year, [])
  }
  const filterData = packInfoVOList.filter(item => {
    // 根据标签筛选
    for (const tag of selectedPackTag.value) {
      if (item.tags.includes(tag)) return true
    }
    // 根据年份筛选
    const itemYear = new Date(item.start).getFullYear()
    if (selectedPackSaleDate.value.includes(itemYear)) {
      return true
    }
    // 根据价格筛选
    for (const priceName of selectedPackSalePrice.value) {
      const priceItem = packSalePriceList.find(item => priceName === item.label)
      if (item.price >= priceItem.min && item.price < priceItem.max) {
        return true
      }
    }
    return false
  })
  filterData.forEach(item => {
    const itemYear = new Date(item.start).getFullYear()
    filteredPackMap.value.set(itemYear, [...filteredPackMap.value.get(itemYear), item])
  })
}

// 重置筛选
const resetPackFilterOption = () => {
  selectedPackTag.value = []
  selectedPackSaleDate.value = []
  selectedPackSalePrice.value = []
  filterPacks()
}

// 选择筛选条件时向筛选列表添加或删除
function choosePackOption(list, value) {
  const index = list.indexOf(value);
  index > -1 ? list.splice(index, 1) : list.push(value)
  filterPacks()
}

loadingItemValue()
const isLoading = ref(false) // 初始 false，先不弹
const showLoadingTime = ref(0) // 记录开始显示的时间戳

function reloadPage() {
  location.reload()
}

onMounted(() => {
  // 2 秒内若没数据，则显示对话框
  setTimeout(() => {
    if (Array.isArray(fixedPacks.value) && fixedPacks.value.length === 0) {
      isLoading.value = true
      showLoadingTime.value = Date.now()
    }
  }, 1500)
})

// 监听数据，一旦有值则关闭对话框（但要保证至少显示 2 秒）
watch(
  fixedPacks,
  (newVal) => {
    if (Array.isArray(newVal) && newVal.length > 0) {
      if (isLoading.value) {
        const elapsed = Date.now() - showLoadingTime.value
        const minDuration = 2000
        if (elapsed < minDuration) {
          // 不足 2 秒，则延迟关闭
          setTimeout(() => {
            isLoading.value = false
          }, minDuration - elapsed)
        } else {
          isLoading.value = false
        }
      }
    }
  },
  { immediate: true }
)

</script>
<template>
  <div>
    <div id="pack" class="pack-efficiency-page">
      <!-- 不会因为筛选改变的礼包 Start -->
      <template v-for="item in fixedPacks" :key="item.titleEn">

        <module-header :title="item.title" :title-en="item.titleEn" :tips="item.tips" />
        <div v-if="item.titleEn === 'New Packs'">
          <v-chip text="点击图片查看礼包详情" color="deep-orange" class="m-4"></v-chip>
          <v-chip text="材料按135理智=1源石折合成源石" color="deep-orange" class="m-4"></v-chip>
          <v-chip text="中坚寻访：1蓝抽也记为1抽，但价值视为0.837抽" color="deep-orange" class="m-4"></v-chip>
        </div>

        <div class="flex flex-wrap">
          <!-- 中坚寻访按钮 -->
          <v-btn-toggle v-if="item.titleEn === 'New Packs'" v-model="isKernelValuable" class="m-0-8" style="height: 36px;margin: 6px 4px;">
            <v-btn :value="true" :color="isKernelValuable ? 'primary' : 'grey'"
              :variant="isKernelValuable ? 'flat' : 'outlined'" @click="changeKernelValue()">
              需要中坚寻访
            </v-btn>
          </v-btn-toggle>

          <!-- 只看抽卡按钮 -->
          <v-btn-toggle v-if="item.titleEn === 'New Packs'" v-model="isDrawOnly" class="m-0-8" style="height: 36px;margin: 6px 4px;">
            <v-btn :value="true" :color="isDrawOnly ? 'primary' : 'grey'" :variant="isDrawOnly ? 'flat' : 'outlined'"
              @click="displayPackEfficiency()">
              只看抽卡
            </v-btn>
          </v-btn-toggle>

          <!-- 四选一排序按钮组 -->
          <v-btn-toggle v-if="item.titleEn === 'New Packs'" v-model="sortOption" mandatory class="m-0-8" style="height: 36px;margin: 6px 4px;">
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
        <v-btn color="primary" v-for="[year] in filteredPackMap.entries()" :key="year" :variant="buttonActive(year)"
          @click="choosePackOption(selectedPackSaleDate, year)" class="m-4">
          {{ year }}年
        </v-btn>
      </div>
      <div class="m-4">
        价格：
        <v-btn color="primary" v-for="item in packSalePriceList" :key="item.label" :variant="buttonActive(item.label)"
          @click="choosePackOption(selectedPackSalePrice, item.label)" class="m-4">
          {{ item.label }}
        </v-btn>
      </div>
      <div class="m-4">
        类型：
        <v-btn color="primary" v-for="(tag, index) in packTags" :key="index" :variant="buttonActive(tag.value)"
          @click="choosePackOption(selectedPackTag, tag.value)" class="m-4">
          {{ tag.label }}
        </v-btn>
      </div>

      <!-- 按年份展示筛选礼包 -->
      <template v-for="[year, list] in filteredPackMap.entries()">
        <h2 style="margin: 12px;">{{ year }}年</h2>
        <PackCardContainer :modelValue="list" />
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
  <v-dialog
    v-model="isLoading"
    persistent
    max-width="300"
  >
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
