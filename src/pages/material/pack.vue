<script setup>
import storeAPI from "/src/api/store";
import {onMounted, ref} from "vue";

import packCardContainer from '/src/components/PackCardGroup.vue'

import '/src/assets/css/material/pack.scss'
import '/src/assets/css/material/pack.phone.scss'
import ModuleHeader from "../../components/ModuleHeader.vue";


let opETextTheme = "op_title_etext_light"

let packInfoList = ref([])
let currentPackInfoList = ref([])


function getPackList(packType, packState, type1, type2, type3) {
  if (packState < 0.5) {
    return "display: none;";
  }
  if (packType == type1) {
    return "";
  }
  if (packType == type2) {
    return "";
  }
  if (packType == type3) {
    return "";
  }
  return "display: none;";
}


let limitedPackInfoList = ref([])
let periodicPackInfoList = ref([])
let newbiePackInfoList = ref([])
let chipPackInfoList = ref([])
let lmdPackInfoList = ref([])
let originiumPackInfoList = ref([])

function initData() {

  const currentTimeStamp = new Date().getTime()

  for (let i = 0; i < packInfoList.value.length; i += 1) {
    let pack = packInfoList.value[i]
    //下架礼包跳过


    pack.lineChartData = getLineChartData(pack)

    //  console.log('正常：',this.packPPRResponse[i].packName);
    //性价比位置的为空的强制赋0
    if (!pack.packRmbPerDraw) {
      pack.packRmbPerDraw = 0;
    }

    if ('lmd' === pack.saleType) {
      lmdPackInfoList.value.push(pack)
      continue
    }

    if (pack.end < currentTimeStamp) {
      continue
    }

    currentPackInfoList.value.push(pack)

    if ('originium' === pack.saleType || 'originium2' === pack.saleType) {
      originiumPackInfoList.value.push(pack)
      continue
    }

    if ('activity' === pack.saleType) {
      limitedPackInfoList.value.push(pack)
      continue
    }

    if ('weekly' === pack.saleType || 'monthly' === pack.saleType || 'monthly' === pack.saleType) {
      periodicPackInfoList.value.push(pack)
      continue
    }

    if ('newbie' === pack.saleType) {
      newbiePackInfoList.value.push(pack)
      continue
    }

    if ('chip' === pack.saleType) {
      chipPackInfoList.value.push(pack)
      continue
    }


    // packsPPRData.value.push(pack);
  }

  // this.sortPackByPPRPerDraw();
}

const drawEfficiencyStandard = 157
const packEfficiencyStandard = 100

function getLineChartData(pack) {

  const drawEfficiency = getFixed(pack.drawEfficiency * 100, 0)
  const packEfficiency = getFixed(pack.packEfficiency * 100, 0)

  let lineChartData = [
    {label: '大月卡', value: 1.57, color: 'rgb(65,147,220)'},
    {label: '648源石', value: 1.00, color: 'rgb(65,147,220)'},
    {label: '仅抽卡', value: pack.drawEfficiency, color: 'rgb(255, 135, 55)'},
    {label: '本礼包', value: pack.packEfficiency, color: 'rgb(250, 83, 83)'}
  ]

  lineChartData.sort((a, b) => b.value - a.value)

  return lineChartData
}

let screenWidth = ref(1080)


function getFixed(num, acc) {
  acc = typeof acc !== "undefined" ? acc : 2;
  return parseFloat(num).toFixed(acc);
}


const filtersTable = [
  {value: 'newbie', text: '新人'},
  {value: 'monthly', text: '每月重置'},
  {value: 'weekly', text: '每周重置'},
  {value: 'elite', text: '直升礼包'},
  {value: 'chip', text: '芯片'},
  {value: 'lmd', text: '龙门币'},
  {value: 'activity', text: '活动礼包'},
  {value: 'originium', text: '非双倍源石'},
  {value: 'originium2', text: '双倍源石'},
]

const formatterSaleType = (row, col) => {
  return {
    newbie: '新人',
    monthly: '每月重置',
    weekly: '每周重置',
    elite: '直升礼包',
    chip: '芯片',
    lmd: '龙门币',
    activity: '活动礼包',
    originium: '非双倍源石',
    originium2: '双倍源石',
  }[row.saleType]
}


function filterPackInfo() {
  packInfoGroupByYear(packInfoList.value)
}

let packInfoListGroupByYear = ref({})

function packInfoGroupByYear(packInfoList) {
  let list = {
    2019: [],
    2020: [],
    2021: [],
    2022: [],
    2023: [],
    2024: [],
    2025: [],
  }
  for (const packInfo of packInfoList) {
    const year = new Date(packInfo.start).getFullYear();
    console.log(year)
    console.log(packInfo)
    list[year].push(packInfo)
  }
  packInfoListGroupByYear.value = list
  console.log(packInfoListGroupByYear.value)
}


onMounted(() => {
  storeAPI.getPackStore().then(response => {
    packInfoList.value = response.data
    initData();
    filterPackInfo()
  })

  screenWidth.value = window.screen.width
})

</script>
<template>
  <div>
    <div id="pack" class="pack-efficiency-page">
      <module-header title="在售/即将开售的礼包" title-en="New Packs"
                     :tips="['*当前在售的限时礼包，不包括常驻礼包和源石']">
      </module-header>

      <div class="tag-group">
        <span class="tag-rank-5">
          点击图片可查看礼包内容，注意区分"仅抽卡"/"折合成源石"
        </span>
        <span class="tag-rank-5">
          “折合成源石”即将材料的理智价值按135：1换算成源石
        </span>
      </div>

      <pack-card-container v-model="limitedPackInfoList">
      </pack-card-container>

      <module-header title="常驻/周期性礼包" title-en="Monthly & Weekly & Orundum"
                     :tips="['*每月/每周礼包、新人/回归礼包、源石']">
      </module-header>

      <h2 style="margin: 12px;">每月/每周礼包</h2>

      <pack-card-container v-model="periodicPackInfoList">

      </pack-card-container>

      <h2 style="margin: 12px;">新人/回归礼包</h2>
      <div class="tag-group">
        <span class="tag-rank-6">
          由于新人进阶组合包的特殊性（内置了一张月卡），月卡党如仅考虑抽卡请参考“新人进阶组合包不计月卡”。
        </span>
      </div>

      <pack-card-container v-model="newbiePackInfoList">

      </pack-card-container>

      <h2 style="margin: 12px;">源石/首充源石</h2>
      <div class="tag-group">
        <span class="tag-rank-2">
          每年周年庆会重置源石首充
        </span>
      </div>
      <pack-card-container v-model="originiumPackInfoList">

      </pack-card-container>


      <module-header title="半常驻礼包" title-en="Chips Packs & LMD Packs" :tips="['*内容较为固定，规律较为明确的礼包']">

      </module-header>

      <h2 style="margin: 12px;">职业芯片礼包</h2>
      <!-- <div class="tag-group">
        <span class="tag-rank-2">
          芯片礼包价值有差异的原因见此处
        </span>
      </div> -->
      <pack-card-container v-model="chipPackInfoList">

      </pack-card-container>

      <h2 style="margin: 12px;">龙门币补给包</h2>
      <pack-card-container v-model="lmdPackInfoList">
      </pack-card-container>

<!--      <module-header title="历史礼包" title-en="Packs History" :tips="['*历史礼包存档']">-->

<!--      </module-header>-->

<!--      <div>-->
<!--        售卖类型：-->
<!--        <button class="btn btn-red" >重置筛选</button>-->
<!--        <button class="btn">芯片礼包</button>-->
<!--        <button class="btn">龙门币礼包</button>-->
<!--        <button class="btn">包含特殊物品的纪念礼包</button>-->
<!--        <button class="btn">五星/六星特训礼包</button>-->
<!--        <button class="btn">包含模组块的礼包</button>-->
<!--        <button class="btn">其它礼包</button>-->
<!--      </div>-->
<!--      <div>-->
<!--        售卖年份：-->
<!--        <button class="btn">2024</button>-->
<!--        <button class="btn">2023</button>-->
<!--        <button class="btn">2022</button>-->
<!--        <button class="btn">2021</button>-->
<!--        <button class="btn">2020</button>-->
<!--        <button class="btn">2019</button>-->
<!--      </div>-->
<!--      <div>-->
<!--        售卖价格：-->
<!--        <button class="btn">0-100RMB</button>-->
<!--        <button class="btn">100-200RMB</button>-->
<!--        <button class="btn">200-648RMB</button>-->
<!--      </div>-->

<!--      <el-button color="#626aef" :dark="isDark">重置筛选</el-button>-->
<!--      <el-button plain type="primary">芯片礼包</el-button>-->
<!--      <el-button plain type="primary">龙门币礼包</el-button>-->
<!--      <el-button plain type="primary">包含特殊物品的纪念礼包</el-button>-->
<!--      <el-button plain type="primary">五星/六星特训礼包</el-button>-->
<!--      <el-button plain type="primary">包含模组块的礼包</el-button>-->
<!--      <el-button type="primary">其它礼包</el-button>-->
<!--      <br>-->
<!--      <el-button-group>-->
<!--        <el-button type="primary">2024</el-button>-->
<!--        <el-button type="primary">2023</el-button>-->
<!--        <el-button type="primary">2022</el-button>-->
<!--        <el-button type="primary">2021</el-button>-->
<!--        <el-button type="primary">2020</el-button>-->
<!--      </el-button-group>-->

<!--      <el-button-group>-->
<!--        <el-button type="primary"> &lt; 100 RMB</el-button>-->
<!--        <el-button type="primary">100-200 RMB</el-button>-->
<!--        <el-button type="primary"> &gt; 200 RMB</el-button>-->
<!--      </el-button-group>-->

<!--      <h2 style="margin: 12px;">2024年</h2>-->
<!--      <pack-card-container v-model="packInfoListGroupByYear['2024']">-->
<!--      </pack-card-container>-->



      <module-header title="礼包性价比总表" title-en="Packs Value"></module-header>
      <div class="tag-group">
         <span class="tag-rank-5">
                性价比基准为648￥源石，移动端可左右滑动表格
              </span>
        <span class="tag-rank-6">
                由于新人进阶组合包的特殊性（内置了一张月卡），月卡党如仅考虑抽卡请参考“新人进阶组合包不计月卡”。
              </span>
      </div>

      <div class="pack-table-wrapper">
        <el-table :data="currentPackInfoList" class="pack-table" stripe table-layout="auto"
                  :default-sort="{ prop: 'drawEfficiency', order: 'descending' }" border>
          <el-table-column sortable prop="displayName" label="名称" :sort-by="(row, index) => {return row.displayName;}"
                           min-width="154" fixed/>
          <el-table-column sortable label="类型" :formatter=formatterSaleType :filters=filtersTable
                           :filter-method="(value, row, column) => {return row.saleType === value;}"
                           :filtered-value="['newbie', 'monthly', 'weekly', 'elite', 'chip', 'lmd', 'activity', 'originium', 'originium2']"
                           :sort-by="(row, index) => {return row.saleType;}" min-width="92"/>
          <el-table-column sortable label="售价" :formatter="(row, col) => {return row.price + '元';}"
                           :sort-by="(row, index) => {return row.price;}" min-width="80"/>
          <el-table-column sortable label="抽数" :formatter="(row, col) => {return row.draws.toFixed(2);}"
                           :sort-by="(row, index) => { return row.draws;}" min-width="80"/>
          <el-table-column sortable label="源石" :formatter="(row, col) => {
          return row.originium;
        }
          " :sort-by="(row, index) => {
          return row.originium;
        }
          " min-width="80"/>
          <el-table-column sortable label="抽卡性价比" :formatter="(row, col) => {
          return row.drawEfficiency.toFixed(2);
        }
          " :sort-by="(row, index) => {
          return row.drawEfficiency;
        }
          " min-width="120"/>
          <el-table-column sortable label="综合性价比" prop="packEfficiency" :formatter="(row, col) => {
          return row.packEfficiency.toFixed(2);
        }
          " :sort-by="(row, index) => {
          return row.packEfficiency;
        }
          " min-width="120"/>
        </el-table>
      </div>
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

<style>
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
