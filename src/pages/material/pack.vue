<script setup>
import materialAPI from "/src/api/material.js";
import {ref} from 'vue';
import PackCardContainer from '/src/components/material/PackCardGroup.vue'
import ModuleHeader from '/src/components/ModuleHeader.vue';
import {getStageConfig} from "/src/utils/user/userConfig.js";
import PackTable from "/src/components/material/PackTable.vue";
import deepClone from "/src/utils/deepClone.js";
import '/src/assets/css/material/pack.scss';
import '/src/assets/css/material/pack.phone.scss';

const currentPackInfoList = ref([])
const date = new Date() // 当前日期
const fixedPacks = ref({})


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
const packSalePriceList = [
  {label: '0-100RMB', min: 0, max: 100},
  {label: '100-200RMB', min: 100, max: 200},
  {label: '200-648RMB', min: 200, max: 648},
]
const selectedPackTag = ref([])
const selectedPackSaleDate = ref([])
const selectedPackSalePrice = ref([])
const filteredPackMap = ref(new Map()) // 筛选后的礼包列表
let packInfoListFromAPI = []
let packInfoList = []
//FromAPI是原始数据，用于重置packinfolist

const getPackInfoData = async () => {
  // 等待获取接口返回的全部礼包信息
  const config = getStageConfig()
  materialAPI.getStorePackV4(config).then(rep => {
    const data = rep.data
    packInfoListFromAPI = deepClone(data)
    packInfoList = data
    initData()
  })
}

const initData = () => {

  const currentTimeStamp = date.getTime() // 获取时间戳

  // 获取礼包性价比条
  const getLineChartData = pack => {
    const lineChartData = [
      {label: '大月卡', value: 1.57, color: 'rgb(65,147,220)'},
      {label: '648源石', value: 1.00, color: 'rgb(65,147,220)'},
      {label: '仅抽卡', value: pack.drawEfficiency, color: 'rgb(255, 135, 55)'},
      {label: '本礼包', value: pack.packEfficiency, color: 'rgb(250, 83, 83)'}
    ];
    return lineChartData.sort((a, b) => b.value - a.value);
  }

  const packs = {}
  currentPackInfoList.value = []
  packInfoList.forEach(packInfo => {
    packInfo.lineChartData = getLineChartData(packInfo);
    packInfo.packRmbPerDraw = packInfo.packRmbPerDraw || 0;
    if (!packs[packInfo.saleType]) packs[packInfo.saleType] = []
    // 龙门币模板礼包不放入总表所以单独放入
    if (packInfo.saleType === 'lmd') {
      return packs.lmd.push(packInfo)
    }
    // 除龙门币模板礼包外, 不放入过期礼包
    if (packInfo.end < currentTimeStamp) {
      return
    }

    packInfo.originiumUnitPrice = packInfo.originium?(packInfo.price/packInfo.originium).toFixed(1):packInfo.originium

    currentPackInfoList.value.push(packInfo) // 放入总表
    packs[packInfo.saleType].push(packInfo) // 放入各个类型
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

//如果是true就覆写数据，如果是false就用原始数据重置
function changeKernelValue() {
  // isKernelValuable.value = !isKernelValuable.value
  if (isKernelValuable.value) {
    for (const pack of packInfoList) {
      pack.draws = pack.drawsKernel
      pack.packEfficiency = pack.packEfficiencyKernel
      pack.packedOriginium = pack.packedOriginiumKernel
      pack.packedOriginiumPrice = pack.packedOriginiumPriceKernel
      pack.drawEfficiency = pack.drawEfficiencyKernel
      pack.drawPrice = pack.drawPriceKernel
    }
  } else {
    packInfoList = deepClone(packInfoListFromAPI)
  }
  initData()
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
  const filterData = packInfoList.filter(item => {
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
const choosePackOption = (list, value) => {
  const index = list.indexOf(value);
  index > -1 ? list.splice(index, 1) : list.push(value)
  filterPacks()
}




getPackInfoData()

</script>
<template>
  <div>
    <div id="pack" class="pack-efficiency-page">
      <!-- 不会因为筛选改变的礼包 Start -->
      <template v-for="item in fixedPacks" :key="item.titleEn">
        <module-header :title="item.title" :title-en="item.titleEn" :tips="item.tips"/>
        <div v-if="item.titleEn === 'New Packs'">
          <v-chip text="点击图片可查看礼包内容" color="deep-orange" class="m-4"></v-chip>
          <v-chip text="折合成源石：135理智=1源石" color="deep-orange" class="m-4"> </v-chip>
          <v-chip text="中坚寻访：1蓝抽也记为1抽，但价值视为0.837抽" color="deep-orange" class="m-4"></v-chip>
        </div>
        <v-switch v-if="item.titleEn === 'New Packs'"
                  color="primary" label="中坚寻访视为有价值"
                  @change="changeKernelValue" v-model="isKernelValuable" style="width: 200px">
        </v-switch>

        <template v-for="(packInfo, packIndex) in item.list" :key="packIndex">
          <h2 style="margin: 12px;" v-if="packInfo.title">{{ packInfo.title }}</h2>
          <v-chip v-if="packInfo.title === '新人/回归礼包'"
                  text="由于新人进阶组合包的特殊性（内置了一张月卡），月卡党如仅考虑抽卡请参考“新人进阶组合包不计月卡”"
                  color="red" class="m-4"></v-chip>
          <v-chip v-if="packInfo.title === '源石/首充源石'" text="每年周年庆会重置源石首充" color="red" class="m-4"></v-chip>
          <PackCardContainer v-model="packInfo.packs"/>
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

      <PackTable v-model="currentPackInfoList">

      </PackTable>

    </div>
      <module-header title="算法说明" title-en="Algorithm"></module-header>
      <div id="foot_main">
        <div class="foot_unit" style="width: 100%; white-space: normal">
          <el-card class="box-card">
            <el-collapse>
              <el-collapse-item name="2" style="">
                <template #title>
                <span style="font-size: large; display: flex; align-items: center">
                  <i class="iconfont icon-calculator"></i><b style="margin-left: 4px">计算方式</b></span>
                </template>

                <ul style="padding-left: 2em">
                  <li>仅计抽卡：仅计算礼包内的抽卡资源</li>
                  <li>材料折合源石：将所有材料折算成源石再计算性价比</li>
                  <li>性价比的基准为可无限购买的648源石，材料价值取自[物品价值表]</li>
                  <li>每月芯片自选包和每月材料自选包都用价值最高的材料进行计价</li>
                  <li>精二券暂以平均价值计价，详情可查阅[精二性价比]</li>
                  <li>模组块暂以120红票计价，模组条无法计价，请自行权衡</li>
                  <li>标准寻访是258黄票38抽，中坚寻访是216黄票38抽，因此价值暂定为216/258=0.837抽</li>
                  <li>家具零件视为0价值</li>
                </ul>
              </el-collapse-item>
              <el-collapse-item name="4" style="">
                <template #title>
                <span style="font-size: large; display: flex; align-items: center"><i
                    class="iconfont icon-publicity"></i><b style="margin-left: 4px">算法公示卡</b></span>
                </template>
                <table id="al_card">
                  <tbody>
                  <tr>
                    <td>算法代号</td>
                    <td>一图流_标准 v6.0</td>
                    <td>更新时间</td>
                    <td>
                      <!-- {{ updateTime }} -->
                    </td>
                  </tr>
                  <tr>
                    <td>数据源</td>
                    <td>企鹅物流</td>
                    <td>基准</td>
                    <td>常驻关卡</td>
                  </tr>
                  <tr>
                    <td>计算引擎</td>
                    <td>yituliuBackEnd</td>
                    <td>样本阈值</td>
                    <td>300</td>
                  </tr>
                  <tr>
                    <td>需求目标</td>
                    <td>无限需求</td>
                    <td>EXP系数</td>
                    <td>0.625</td>
                  </tr>
                  </tbody>
                </table>
              </el-collapse-item>
              <el-collapse-item name="5" style="">
                <template #title>
                <span style="font-size: large; display: flex; align-items: center">
                  <i class="iconfont icon-copyright"></i><b style="margin-left: 4px">版权声明与许可协议</b>
                </span>
                </template>
                网站所涉及的公司名称、商标、产品等均为其各自所有者的资产，仅供识别。网站内使用的游戏图片、动画、音频、文本原文，仅用于更好地表现游戏资料，其版权属于
                Arknights/上海鹰角网络科技有限公司。<br>
                除非另有声明，网站其他内容采用<a href="https://creativecommons.org/licenses/by-nc/4.0/deed.zh">知识共享
                署名-非商业性使用 4.0 国际
                许可协议</a>进行许可。转载、公开或以任何形式复制、发行、再传播本页任何内容时，必须注明从明日方舟一图流转载，并提供版权标识、许可协议标识、免责标识和直接指向被引用页面的链接；且未经许可不得将本站内容或由其衍生作品用于商业目的。<br>
                本项目为无偿开源项目，致力于方便明日方舟玩家。如有开发/数据分析/设计/美工经验，欢迎来<a
                  href="https://jq.qq.com/?_wv=1027&k=ZmORnr5F">开发群</a>一叙。
              </el-collapse-item>
            </el-collapse>
          </el-card>
        </div>
      </div>
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
