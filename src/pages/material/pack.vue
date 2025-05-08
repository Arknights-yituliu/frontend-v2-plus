<script setup>
import itemAPI from "/src/api/materialV5.js";
import packInfoCache from "/src/utils/indexedDB/packInfoCache.js";
import {ref} from 'vue';
import PackCardContainer from '/src/components/material/PackCardGroup.vue'
import ModuleHeader from '/src/components/ModuleHeader.vue';
import {getStageConfig} from "/src/utils/user/userConfig.js";
import PackTable from "/src/components/material/PackTable.vue";
import deepClone from "/src/utils/deepClone.js";
import '/src/assets/css/material/pack.scss';
import '/src/assets/css/material/pack.phone.scss';
import itemCache from "/src/utils/indexedDB/itemCache.js";
import NoticeBoard from "@/components/NoticeBoard.vue";

const date = new Date() // 当前日期
const fixedPacks = ref({})

//售卖类型
const packTags = [
  {label: "新人", value: "newbie"},
  {label: "含有模组块", value: "mod"},
  {label: "芯片", value: "chip"},
  {label: "活动礼包", value: "activity"},
  {label: "周期性礼包", value: "periodically"},
  {label: "绝版礼包", value: "event"},
  {label: "含有无法计价之物品", value: "special"},
  {label: "直升礼包", value: "elite"},
  {label: "龙门币礼包", value: "lmd"},
  {label: "定向抽卡类礼包", value: "operator"},
]

//价格区间
const packSalePriceList = [
  {label: '0-100RMB', min: 0, max: 100},
  {label: '100-200RMB', min: 100, max: 200},
  {label: '200-648RMB', min: 200, max: 648},
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
  itemCache.getItemValueCacheByConfig(stageConfig).then(response => {
    for (const item of response) {
      const {itemId, itemValueAp} = item
      itemValueMap.set(itemId, itemValueAp)
    }

    //获取服务器上的自定义材料价值
    itemAPI.listCustomItem().then(response => {
      for (const item of response.data) {
        const {itemId, itemValue} = item
        itemValueMap.set(itemId, itemValue)
      }
      //开始计算礼包性价比
      getPackInfoData()
    })
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
  //先计算礼包的性价比
  for (const item of data) {
    const packInfoVO = _packPromotionRatioCalc(item)
    packInfoVOList.push(packInfoVO)
    packInfoVOListCache.push(deepClone(packInfoVO))
  }

  //礼包分类
  collectPackInfoVO()


  /**
   * 根据传入的礼包算出性价比
   * @param packInfoVO 礼包基本信息
   * @returns {*}  礼包各种性价比
   * @private
   */
  function _packPromotionRatioCalc(packInfoVO) {
    // 源石性价比基准
    const eachOriginalOriginiumPrice = 648 / 185.0;
    // 抽卡性价比基准
    const eachOriginalDrawPrice = 648.0 / 185 / 0.3;

    let draws = 0.0; // 抽数
    let drawPrice = 0.0; // 每一抽价格
    let packedOriginiumPrice = 0.0; // 每源石（折算物资后）价格
    let drawEfficiency = 0.0; // 仅抽卡性价比
    let packEfficiency = 0.0; // 综合性价比
    let packedOriginium = 0.0; // 礼包总价值折合成源石

    let drawsKernel = 0.0; // 抽数（含蓝抽）
    let drawPriceKernel = 0.0; // 每一抽价格（含蓝抽）
    let packedOriginiumPriceKernel = 0.0; // 每源石（折算物资后）价格（含蓝抽）
    let drawEfficiencyKernel = 0.0; // 仅抽卡性价比（含蓝抽）
    let packEfficiencyKernel = 0.0; // 综合性价比（含蓝抽）
    let packedOriginiumKernel = 0.0; // 礼包总价值折合成源石（含蓝抽）
    let originiumUnitPrice = 0.0;

    let apCount = 0.0; // 总价值（理智）
    let apCountKernel = 0.0; // 总价值（理智，含蓝抽）

    // 礼包内的物品的集合
    const packContentVOList = packInfoVO.packContent || [];
    // 直接计算抽数
    draws = (packInfoVO.orundum || 0) / 600 + (packInfoVO.originium || 0) * 0.3 + (packInfoVO.gachaTicket || 0) + (packInfoVO.tenGachaTicket || 0) * 10;
    apCount += draws * 450;
    drawsKernel += draws;
    apCountKernel += apCount;

    if (packContentVOList.length > 0) {
      for (let i = 0; i < packContentVOList.length; i++) {
        const packContentVO = packContentVOList[i];
        // 判断是否有不存在物品表中的物品
        if (itemValueMap.get(packContentVO.itemId)) {
          const itemValueAp = itemValueMap.get(packContentVO.itemId);
          // 蓝抽单独计算
          if (packContentVO.itemId === "classic_gacha") {
            drawsKernel += packContentVO.quantity;
          } else if (packContentVO.itemId === "classic_gacha_10") {
            drawsKernel += packContentVO.quantity * 10;
          } else {
            apCount += itemValueAp * packContentVO.quantity;
          }
          apCountKernel += itemValueAp * packContentVO.quantity;
        }
      }
    }

    // 总价值计算
    packedOriginium = apCount / 135; // 总源石
    packedOriginiumKernel += apCountKernel / 135; // 总源石（含蓝抽）

    if (packInfoVO.originium > 0) {
      originiumUnitPrice = packInfoVO.price / packInfoVO.originium
    }


    // 每源石花费计算
    packedOriginiumPrice = packedOriginium > 0 ? packInfoVO.price / packedOriginium : 0;
    packedOriginiumPriceKernel = packedOriginiumKernel > 0 ? packInfoVO.price / packedOriginiumKernel : 0;

    // 综合性价比计算
    packEfficiency = packedOriginiumPrice > 0 ? eachOriginalOriginiumPrice / packedOriginiumPrice : 0;
    packEfficiencyKernel = packedOriginiumPriceKernel > 0 ? eachOriginalOriginiumPrice / packedOriginiumPriceKernel : 0;

    // 抽卡性价比计算
    drawPrice = draws > 0 ? packInfoVO.price / draws : 0;
    drawEfficiency = drawPrice > 0 ? eachOriginalDrawPrice / drawPrice : 0;

    // 抽卡性价比计算(含蓝抽)
    drawPriceKernel = drawsKernel > 0 ? packInfoVO.price / drawsKernel : 0;
    drawEfficiencyKernel = drawPriceKernel > 0 ? eachOriginalDrawPrice / drawPriceKernel : 0;

    // 设置返回值
    packInfoVO.draws = draws;
    packInfoVO.drawPrice = drawPrice;
    packInfoVO.packedOriginiumPrice = packedOriginiumPrice;
    packInfoVO.drawEfficiency = drawEfficiency;
    packInfoVO.packedOriginium = packedOriginium;
    packInfoVO.packEfficiency = packEfficiency;

    packInfoVO.drawsKernel = drawsKernel;
    packInfoVO.drawPriceKernel = drawPriceKernel;
    packInfoVO.packedOriginiumPriceKernel = packedOriginiumPriceKernel;
    packInfoVO.drawEfficiencyKernel = drawEfficiencyKernel;
    packInfoVO.packedOriginiumKernel = packedOriginiumKernel;
    packInfoVO.packEfficiencyKernel = packEfficiencyKernel;
    packInfoVO.originiumUnitPrice = originiumUnitPrice;

    return packInfoVO
  }
}


let displayPackEfficiencyFlag = ref(false)

/**
 * 分类礼包
 */
function collectPackInfoVO() {

  // const currentTimeStamp = date.getTime()-60*60*24*100*1000 // 获取时间戳
  const currentTimeStamp = date.getTime()

  // 获取礼包性价比条
  const getLineChartData = pack => {
    const lineChartData = [
      {label: '大月卡', value: 1.57, color: 'rgb(65,147,220)',display:true},
      {label: '648源石', value: 1.00, color: 'rgb(65,147,220)',display:true},
      {label: '仅抽卡', value: pack.drawEfficiency, color: 'rgb(250, 83, 83)',display:!displayPackEfficiencyFlag.value},
      {label: '全物品', value: pack.packEfficiency, color: 'rgb(250, 83, 83)',display:displayPackEfficiencyFlag.value}
    ];
    return lineChartData.sort((a, b) => b.value - a.value);
  }

  const packs = {}

  packInfoVOListOnSale.value = []

  packInfoVOList.forEach(packInfoVO => {
    packInfoVO.lineChartData = getLineChartData(packInfoVO);
    packInfoVO.packRmbPerDraw = packInfoVO.packRmbPerDraw || 0;

    const {saleType} = packInfoVO;
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
        {title: '', packs: packs.activity},
      ]
    },
    {
      title: '半常驻礼包',
      titleEn: 'Chips Packs & LMD Packs',
      tips: ['*内容较为固定，规律较为明确的礼包'],
      list: [
        {title: '职业芯片礼包', packs: packs.chip},
        {title: '龙门币补给包', packs: packs.lmd},
      ]
    },
    {
      title: '常驻/周期性礼包',
      titleEn: 'Monthly & Weekly & Orundum',
      tips: ['*每月/每周礼包、新人/回归礼包、源石'],
      list: [
        {title: '每月/每周礼包', packs: [...packs.weekly, ...packs.monthly]},
        {title: '新人/回归礼包', packs: packs.newbie},
        {title: '源石/首充源石', packs: [...packs.originium, ...packs.originium2]},
      ]
    },
  ]
  filterPacks()
}

let isKernelValuable = ref(false)

function displayPackEfficiency(){
  collectPackInfoVO()
}

//如果是true就覆写数据，如果是false就用原始数据重置
function changeKernelValue() {

  if (isKernelValuable.value) {
    for (const pack of packInfoVOList) {
      pack.draws = pack.drawsKernel
      pack.packEfficiency = pack.packEfficiencyKernel
      pack.packedOriginium = pack.packedOriginiumKernel
      pack.packedOriginiumPrice = pack.packedOriginiumPriceKernel
      pack.drawEfficiency = pack.drawEfficiencyKernel
      pack.drawPrice = pack.drawPriceKernel
    }
  } else {

    packInfoVOList = deepClone(packInfoVOListCache)
  }

  collectPackInfoVO()
}

// 筛选按钮是否激活
const buttonActive = (v) => {
  if (selectedPackTag.value.includes(v) || selectedPackSaleDate.value.includes(v) || selectedPackSalePrice.value.includes(v)) {
    return 'elevated'
  }
  return 'tonal'
}

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

</script>
<template>
  <div>
    <div id="pack" class="pack-efficiency-page">
      <!-- 不会因为筛选改变的礼包 Start -->
      <template v-for="item in fixedPacks" :key="item.titleEn">
        <module-header :title="item.title" :title-en="item.titleEn" :tips="item.tips"/>
        <div v-if="item.titleEn === 'New Packs'">
          <v-chip text="点击图片可查看礼包内容" color="deep-orange" class="m-4"></v-chip>
          <v-chip text="折合成源石：135理智=1源石" color="deep-orange" class="m-4"></v-chip>
          <v-chip text="中坚寻访：1蓝抽也记为1抽，但价值视为0.837抽" color="deep-orange" class="m-4"></v-chip>
        </div>

        <div class="flex flex-wrap">
        <v-switch v-if="item.titleEn === 'New Packs'"
                  color="primary" label="中坚寻访视为有价值"
                  @change="changeKernelValue" v-model="isKernelValuable" class="m-0-8">
        </v-switch>

        <v-switch v-if="item.titleEn === 'New Packs'"
                  color="primary" label="展示全物品的综合性价比"
                  @change="displayPackEfficiency" v-model="displayPackEfficiencyFlag" class="m-0-8">
        </v-switch>
        </div>
        <template v-for="(packInfo, packIndex) in item.list" :key="packIndex">
          <h2 style="margin: 12px;" v-if="packInfo.title">{{ packInfo.title }}</h2>
          <v-chip v-if="packInfo.title === '新人/回归礼包'"
                  text="由于新人进阶组合包的特殊性（内置了一张月卡），月卡党如仅考虑抽卡请参考“新人进阶组合包不计月卡”"
                  color="red" class="m-4"></v-chip>
          <v-chip v-if="packInfo.title === '源石/首充源石'" text="每年周年庆会重置源石首充" color="red"
                  class="m-4"></v-chip>
          <PackCardContainer v-model="packInfo.packs" />
        </template>
      </template>
      <!-- 不会因为筛选改变的礼包 End -->

      <!-- 历史礼包 Start -->
      <module-header title="历史礼包" title-en="Packs History" :tips="['*历史礼包存档']"/>

      <div class="m-4">
        售卖类型：
        <v-btn color="primary" v-for="(tag, index) in packTags" :key="index" :variant="buttonActive(tag.value)"
               @click="choosePackOption(selectedPackTag, tag.value)" class="m-4">
          {{ tag.label }}
        </v-btn>
      </div>
      <div class="m-4">
        售卖年份：
        <v-btn color="primary" v-for="[year] in filteredPackMap.entries()" :key="year" :variant="buttonActive(year)"
               @click="choosePackOption(selectedPackSaleDate, year)" class="m-4">
          {{ year }}年
        </v-btn>
      </div>
      <div class="m-4">
        售卖价格：
        <v-btn color="primary" v-for="item in packSalePriceList" :key="item.label"
               :variant="buttonActive(item.label)" @click="choosePackOption(selectedPackSalePrice, item.label)"
               class="m-4">
          {{ item.label }}
        </v-btn>
      </div>


      <!-- 按年份展示筛选礼包 -->
      <template v-for="[year, list] in filteredPackMap.entries()">
        <h2 style="margin: 12px;">{{ year }}年</h2>
        <PackCardContainer :modelValue="list"/>
      </template>

      <!-- 礼包性价比总表 Start -->
      <module-header title="礼包性价比总表" title-en="Packs Value"/>

      <v-chip text="由于新人进阶组合包的特殊性（内置了一张月卡），月卡党如仅考虑抽卡请参考“新人进阶组合包不计月卡”。"
              color="red" class="m-4"></v-chip>
      <v-chip text="性价比基准为648￥源石，移动端可左右滑动表格" color="red" class="m-4"></v-chip>

      <PackTable v-model="packInfoVOListOnSale">

      </PackTable>

    </div>

    <NoticeBoard module="pack">

    </NoticeBoard>


    <!-- <foot></foot> -->
  </div>
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
