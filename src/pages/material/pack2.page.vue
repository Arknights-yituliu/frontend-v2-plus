<script setup>
import storeAPI from "/src/api/store";
import { onMounted, ref } from "vue";

import '/src/assets/css/material/pack.scss'
import '/src/assets/css/material/pack.phone.scss'

let opETextTheme = "op_title_etext_light"

let packPPRResponse = ref([])
let packPPRInfoList = ref([])


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


let limitedPack = ref([])
let periodicPack = ref([])
let newbiePack = ref([])

function initData() {
  // packsPPRData.value = [];
  // packsPPRDataSort.value = [];
  const limitedType = ['limited']
  const periodicType = ['weekly', 'monthly', 'chips']
  const newbieType = ['chip', 'newbie']

  for (let i = 0; i < packPPRResponse.value.length; i += 1) {
    let pack = packPPRResponse.value[i]
    //下架礼包跳过
    if (0 == pack.packState) {
      // console.log('弹出：',this.packPPRResponse[i].packName);
      continue;
    }

    pack.lineChartData = getLineChartData(pack)
    //  console.log('正常：',this.packPPRResponse[i].packName);
    //性价比位置的为空的强制赋0
    if (!pack.packRmbPerDraw) {
      pack.packRmbPerDraw = 0;
    }

    if (pack.saleStatus < 0) {
      continue
    }


    packPPRInfoList.value.push(pack)

    if (limitedType.includes(pack.saleType)) {
      limitedPack.value.push(pack)
      continue
    }
    if (periodicType.includes(pack.saleType)) {
      periodicPack.value.push(pack)
      continue
    }
    if (newbieType.includes(pack.saleType)) {
      newbiePack.value.push(pack)
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
    { label: '大月卡', value: 1.57, color: 'rgb(65,147,220)' },
    { label: '648源石', value: 1.00, color: 'rgb(65,147,220)' },
    { label: '仅抽卡', value: pack.drawEfficiency, color: 'rgb(255, 135, 55)' },
    { label: '本礼包', value: pack.packEfficiency, color: 'rgb(250, 83, 83)' }
  ]

  lineChartData.sort((a, b) => b.value - a.value)

  return lineChartData
}

let screenWidth = ref(1080)

function getLineBarStyle(lineData) {

  let barWidth = 80

  if (screenWidth.value < 600 || !screenWidth.value) {
    barWidth = 50
  }
  const width = barWidth * lineData.value

  return `width: ${width}px;background-color: ${lineData.color}`
}

function getWidth(num, scale) {
  return "width:" + num * scale + "px";
}

function getFixed(num, acc) {
  acc = typeof acc !== "undefined" ? acc : 2;
  return parseFloat(num).toFixed(acc);
}

function getPackImgUrl(img) {
  return "/image/packs/" + img + ".png";
}

function getPackPic(img, fileName) {
  if (!fileName) {
    fileName = img + '.jpg'
  }
  return `background:url(https://ark.yituliu.cn/static/image/store/${fileName}) 0% 0% / cover no-repeat,#444444;`
}

function getPackImageLink(officialName, fileName) {
  if (!fileName) {
    fileName = officialName + '.jpg'
  }

  return `https://ark.yituliu.cn/static/image/store/${fileName}`
}

function getContentId(id, type) {
  return type + "_" + id;
}

function getContentId1(id, type) {
  return type + "_1_" + id;
}

function getContentId2(id, type) {
  return type + "_2_" + id;
}

function getContentId3(id, type) {
  return type + "_3_" + id;
}

function displayPackContent(id) {
  const element = document.getElementById(id)
  console.log(element)
  if ('flex' === element.style.display) {
    element.style.display = 'none'
  } else {
    element.style.display = 'flex'
  }
}

function switchPackContent(id, type) {
  if (document.getElementById(type + "_" + id).style.display == "none") {
    document.getElementById(type + "_" + id).style.display = "flex";
  } else document.getElementById(type + "_" + id).style.display = "none";
}

function switchPackContent1(id, type) {
  if (document.getElementById(type + "_1_" + id).style.display == "none") {
    document.getElementById(type + "_1_" + id).style.display = "flex";
  } else document.getElementById(type + "_1_" + id).style.display = "none";
}

function switchPackContent2(id, type) {
  if (document.getElementById(type + "_2_" + id).style.display == "none") {
    document.getElementById(type + "_2_" + id).style.display = "flex";
  } else document.getElementById(type + "_2_" + id).style.display = "none";
}

function switchPackContent3(id, type) {
  if (document.getElementById(type + "_3_" + id).style.display == "none") {
    document.getElementById(type + "_3_" + id).style.display = "flex";
  } else document.getElementById(type + "_3_" + id).style.display = "none";
}

onMounted(() => {
  storeAPI.getPackStore().then(response => {
    packPPRResponse.value = response.data
    initData();
  })


  screenWidth.value = window.screen.width

})

</script>
<template>
  <div>
    <div id="pack" class="pack-efficiency-page">
      <div class="module-header">
        <div class="module-title">
          <h1>在售礼包</h1>
          <h4>New Packs</h4>
        </div>
        <span class="module-tip">*当前在售的限时礼包，不包括常驻礼包和源石</span>
      </div>

      <div class="tag-group">
        <span class="tag-rank-5">
          点击图片可查看礼包内容，注意区分"仅抽卡"/"折合成源石"
        </span>
        <span class="tag-rank-5">
          “折合成源石”即将材料的理智价值按135：1换算成源石
        </span>
      </div>

      <div class="pack-card-container">
        <!-- <div v-for="(pack2, index) in packsPPRData" :key="index" class="pack_unit" :style="getDisplayStateDrawOnly(pack2.state, pack2.type, pack2.price, packFilter, pack2.drawEfficiency)"> -->
        <div v-for="(pack2, index) in limitedPack" :key="index" class="pack-card" @click="displayPackContent(pack2.id)">
          <!-- 图片部分 -->
          <div class="pack-card-part-left">
            <img :src="getPackImageLink(pack2.officialName, pack2.imageName)" alt="" class="pack-image">
            <span class="pack-display-name">
              {{ pack2.displayName }} ￥{{ pack2.price }}
            </span>
            <!-- 角标部分 -->
            <div class="pack-corner corner-new" v-show="pack2.saleType == 'limited'">New!</div>
            <div class="pack-corner corner-monthly" v-show="pack2.saleType == 'monthly'">每月</div>
            <div class="pack-corner corner-monthly" v-show="pack2.saleType == 'weekly'">每周</div>
            <div class="pack-corner corner-once" v-show="pack2.saleType == 'once'">一次</div>
            <div class="pack-corner corner-once" v-show="pack2.saleType == 'year'">双倍</div>
          </div>

          <!-- 表格部分 -->
          <div class="pack-info">
            <div class="pack-info-text">
              <span style="color: #ffb46e">折合{{ getFixed(pack2.packedOriginium, 1) }}石</span>
              <span style="color: #ffb46e">￥{{ getFixed(pack2.packedOriginiumPrice, 1) }}/石</span>
              <span style="height: 12px"></span>
              <span style="color: #ff6d6d;">共{{ getFixed(pack2.draws, 1) }}抽</span>
              <span style="color: #ff6d6d;">￥{{ getFixed(pack2.drawPrice, 1) }}/抽</span>
            </div>

            <div class="pack-chart-line">
              <div class="pack-chart-line-item" v-for="(line, index) in pack2.lineChartData">
                <span class="pack-chart-line-label">{{ line.label }}</span>
                <div class="pack-line-bar" :style="getLineBarStyle(line)">
                  <span>{{ getFixed(line.value * 100, 0) }}%</span>
                </div>
              </div>
            </div>
          </div>
          <!-- 详情部分 -->
          <div class="pack-content" :id="pack2.id">
            <div class="pack-content-gacha">
              <span>源石</span><span>X{{ pack2.originium }}</span>
              <span>合成玉</span><span>X{{ pack2.orundum }}</span>
              <span>单抽</span><span>X{{ pack2.gachaTicket }}</span>
              <span>十连</span><span>X{{ pack2.tenGachaTicket }}</span>
            </div>
            <div class="pack-content-material">
              <div class="pack-content-material-item" v-for="(item, index) in pack2.packContent" :key="index">
                <span class="pack-content-material-item-name">{{ item.itemName }}</span>
                <span class="pack-content-material-item-quantity">X{{ item.quantity }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="module-header">
        <div class="module-title">
          <h1>常驻/周期性礼包</h1>
          <h4>Monthly & Weekly & Orundum</h4>
        </div>
        <span class="module-tip">*每月/每周礼包、新人/回归礼包、源石</span>
      </div>

      <h2>每月/每周礼包</h2>
      <h2>新人/回归礼包</h2>
      <div class="tag-group">
        <span class="tag-rank-6">
          由于新人进阶组合包的特殊性（内置了一张月卡），月卡党如仅考虑抽卡请参考“新人进阶组合包不计月卡”。
        </span>
      </div>


      <h2>源石/首充源石</h2>
      <div class="tag-group">
        <span class="tag-rank-2">
          每年周年庆会重置源石首充
        </span>
      </div>
      <!-- all -->
      <div class="pack-card-container">
        <!-- <div v-for="(pack2, index) in packsPPRData" :key="index" class="pack_unit" :style="getDisplayStateDrawOnly(pack2.state, pack2.type, pack2.price, packFilter, pack2.drawEfficiency)"> -->
        <div v-for="(pack2, index) in periodicPack" :key="index" class="pack-card"
          @click="displayPackContent(pack2.id)">
          <!-- 图片部分 -->
          <div class="pack-card-part-left">
            <img :src="getPackImageLink(pack2.officialName, pack2.imageName)" alt="" class="pack-image">
            <span class="pack-display-name">
              {{ pack2.displayName }} ￥{{ pack2.price }}
            </span>
            <!-- 角标部分 -->
            <div class="pack-corner corner-new" v-show="pack2.saleType == 'limited'">New!</div>
            <div class="pack-corner corner-monthly" v-show="pack2.saleType == 'monthly'">每月</div>
            <div class="pack-corner corner-monthly" v-show="pack2.saleType == 'weekly'">每周</div>
            <div class="pack-corner corner-once" v-show="pack2.saleType == 'once'">一次</div>
            <div class="pack-corner corner-once" v-show="pack2.saleType == 'year'">双倍</div>
          </div>

          <!-- 表格部分 -->
          <div class="pack-info">
            <div class="pack-info-text">
              <span style="color: #ffb46e">折合{{ getFixed(pack2.packedOriginium, 1) }}石</span>
              <span style="color: #ffb46e">￥{{ getFixed(pack2.packedOriginiumPrice, 1) }}/石</span>
              <span style="height: 12px"></span>
              <span style="color: #ff6d6d;">共{{ getFixed(pack2.draws, 1) }}抽</span>
              <span style="color: #ff6d6d;">￥{{ getFixed(pack2.drawPrice, 1) }}/抽</span>
            </div>

            <div class="pack-chart-line">
              <div class="pack-chart-line-item" v-for="(line, index) in pack2.lineChartData">
                <span class="pack-chart-line-label">{{ line.label }}</span>
                <div class="pack-line-bar" :style="getLineBarStyle(line)">
                  <span>{{ getFixed(line.value * 100, 0) }}%</span>
                </div>
              </div>
            </div>
          </div>
          <!-- 详情部分 -->
          <div class="pack-content" :id="pack2.id">
            <div class="pack-content-gacha">
              <span>源石</span><span>X{{ pack2.originium }}</span>
              <span>合成玉</span><span>X{{ pack2.orundum }}</span>
              <span>单抽</span><span>X{{ pack2.gachaTicket }}</span>
              <span>十连</span><span>X{{ pack2.tenGachaTicket }}</span>
            </div>
            <div class="pack-content-material">
              <div class="pack-content-material-item" v-for="(item, index) in pack2.packContent" :key="index">
                <span class="pack-content-material-item-name">{{ item.itemName }}</span>
                <span class="pack-content-material-item-quantity">X{{ item.quantity }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="module-header">
        <div class="module-title">
          <h1>半常驻礼包</h1>
          <h4>Chips Packs & LMD Packs</h4>
        </div>
        <span class="module-tip">*内容较为固定，规律较为明确的礼包</span>
      </div>

      <h2>职业芯片礼包</h2>
      <div class="tag-group">
        <span class="tag-rank-2">
          芯片礼包价值有差异的原因见此处
        </span>
      </div>


      <h2>龙门币补给包</h2>

      <!-- all -->
      <div class="pack-card-container">
        <!-- <div v-for="(pack2, index) in packsPPRData" :key="index" class="pack_unit" :style="getDisplayStateDrawOnly(pack2.state, pack2.type, pack2.price, packFilter, pack2.drawEfficiency)"> -->
        <div v-for="(pack2, index) in newbiePack" :key="index" class="pack-card" @click="displayPackContent(pack2.id)">
          <!-- 图片部分 -->
          <div class="pack-card-part-left">
            <img :src="getPackImageLink(pack2.officialName, pack2.imageName)" alt="" class="pack-image">
            <span class="pack-display-name">
              {{ pack2.displayName }} ￥{{ pack2.price }}
            </span>
            <!-- 角标部分 -->
            <div class="pack-corner corner-new" v-show="pack2.saleType == 'limited'">New!</div>
            <div class="pack-corner corner-monthly" v-show="pack2.saleType == 'monthly'">每月</div>
            <div class="pack-corner corner-monthly" v-show="pack2.saleType == 'weekly'">每周</div>
            <div class="pack-corner corner-once" v-show="pack2.saleType == 'once'">一次</div>
            <div class="pack-corner corner-once" v-show="pack2.saleType == 'year'">双倍</div>
          </div>

          <!-- 表格部分 -->
          <div class="pack-info">
            <div class="pack-info-text">
              <span style="color: #ffb46e">折合{{ getFixed(pack2.packedOriginium, 1) }}石</span>
              <span style="color: #ffb46e">￥{{ getFixed(pack2.packedOriginiumPrice, 1) }}/石</span>
              <span style="height: 12px"></span>
              <span style="color: #ff6d6d;">共{{ getFixed(pack2.draws, 1) }}抽</span>
              <span style="color: #ff6d6d;">￥{{ getFixed(pack2.drawPrice, 1) }}/抽</span>
            </div>

            <div class="pack-chart-line">
              <div class="pack-chart-line-item" v-for="(line, index) in pack2.lineChartData">
                <span class="pack-chart-line-label">{{ line.label }}</span>
                <div class="pack-line-bar" :style="getLineBarStyle(line)">
                  <span>{{ getFixed(line.value * 100, 0) }}%</span>
                </div>
              </div>
            </div>
          </div>
          <!-- 详情部分 -->
          <div class="pack-content" :id="pack2.id">
            <div class="pack-content-gacha">
              <span>源石</span><span>X{{ pack2.originium }}</span>
              <span>合成玉</span><span>X{{ pack2.orundum }}</span>
              <span>单抽</span><span>X{{ pack2.gachaTicket }}</span>
              <span>十连</span><span>X{{ pack2.tenGachaTicket }}</span>
            </div>
            <div class="pack-content-material">
              <div class="pack-content-material-item" v-for="(item, index) in pack2.packContent" :key="index">
                <span class="pack-content-material-item-name">{{ item.itemName }}</span>
                <span class="pack-content-material-item-quantity">X{{ item.quantity }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="module-header">
        <div class="module-title">
          <h1>历史礼包</h1>
          <h4>Packs History</h4>
        </div>
        <span class="module-tip">*历史礼包存档</span>
      </div>
      <el-button color="#626aef" :dark="isDark">重置筛选</el-button>
      <el-button plain type="primary">芯片礼包</el-button> 
      <el-button plain type="primary">龙门币礼包</el-button>
      <el-button plain type="primary">包含特殊物品的纪念礼包</el-button>
      <el-button plain type="primary">五星/六星特训礼包</el-button>
      <el-button plain type="primary">包含模组块的礼包</el-button>
      <el-button type="primary">其它礼包</el-button>
<br>
<el-button-group>
    <el-button type="primary">2024</el-button>
    <el-button type="primary">2023</el-button>
    <el-button type="primary">2022</el-button>
    <el-button type="primary">2021</el-button>
    <el-button type="primary">2020</el-button>
  </el-button-group>

  <el-button-group>
    <el-button type="primary"> &lt; 100 RMB </el-button>
    <el-button type="primary">100-200 RMB </el-button>
    <el-button type="primary"> &gt; 200 RMB </el-button>
  </el-button-group>

      <h2>2024</h2>
      <h2>2023</h2>
      <h2>2022</h2>
      <h2>2021</h2>
      <h2>2020</h2>



      <h2>龙门币补给包</h2>

      <div class="module-header">
        <div class="module-title">
          <h1>礼包性价比总表</h1>
          <h4>Packs Value</h4>
        </div>
      </div>

      <div class="tag-group">
        <span class="tag-rank-5">
          性价比基准为648￥源石，移动端可左右滑动表格
        </span>
        <span class="tag-rank-6">
          由于新人进阶组合包的特殊性（内置了一张月卡），月卡党如仅考虑抽卡请参考“新人进阶组合包不计月卡”。
        </span>
      </div>



      <div class="pack-table-wrapper">
        <el-table :data="packPPRInfoList" class="pack-table" stripe table-layout="auto"
          :default-sort="{ prop: 'drawEfficiency', order: 'descending' }" border>
          <el-table-column sortable prop="displayName" label="名称" :sort-by="(row, index) => {
          return row.displayName;
        }
          " min-width="154" fixed />
          <el-table-column sortable label="类型" :formatter="(row, col) => {
          return {
            once: '一次性',
            monthly: '每月',
            weekly: '每周',
            year: '每年',
            permanent: '常驻',
            limited: '限时',
          }[row.saleType];
        }
          " :filters="[
          { value: 'once', text: '一次性' },
          { value: 'monthly', text: '每月' },
          { value: 'weekly', text: '每周' },
          { value: 'year', text: '每年' },
          { value: 'permanent', text: '常驻' },
          { value: 'limited', text: '限时' },
        ]" :filter-method="(value, row, column) => {
          return row.saleType == value;
        }
          " :filtered-value="['once', 'monthly', 'weekly', 'year', 'permanent', 'limited']" :sort-by="(row, index) => {
          return row.saleType;
        }
          " min-width="92" />
          <el-table-column sortable label="售价" :formatter="(row, col) => {
          return row.price + '元';
        }
          " :sort-by="(row, index) => {
          return row.price;
        }
          " min-width="80" />
          <el-table-column sortable label="抽数" :formatter="(row, col) => {
          return row.draws.toFixed(2);
        }
          " :sort-by="(row, index) => {
          return row.draws;
        }
          " min-width="80" />
          <el-table-column sortable label="源石" :formatter="(row, col) => {
          return row.originium;
        }
          " :sort-by="(row, index) => {
          return row.originium;
        }
          " min-width="80" />
          <el-table-column sortable label="抽卡性价比" :formatter="(row, col) => {
          return row.drawEfficiency.toFixed(2);
        }
          " :sort-by="(row, index) => {
          return row.drawEfficiency;
        }
          " min-width="120" />
          <el-table-column sortable label="综合性价比" prop="packEfficiency" :formatter="(row, col) => {
          return row.packEfficiency.toFixed(2);
        }
          " :sort-by="(row, index) => {
          return row.packEfficiency;
        }
          " min-width="120" />
        </el-table>
      </div>


    </div>
    <div class="op_title">
      <div class="op_title_text">
        <div class="op_title_ctext">算法说明</div>
        <div :class="opETextTheme">Algorithm</div>
      </div>
    </div>
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
              本项目为无偿开源项目，致力于方便明日方舟玩家。如有开发/数据分析/设计/美工经验，欢迎来<a href="https://jq.qq.com/?_wv=1027&k=ZmORnr5F">开发群</a>一叙。
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
