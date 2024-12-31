<script setup>
import FixedNav from "/src/components/FixedNav.vue";
import ModuleHeader from '@/components/ModuleHeader.vue';
import {onMounted, ref} from 'vue'
import materialAPI from '/src/api/material.js'
import userService from "/src/utils/user/userConfig.js";
import TMP_STORE_PERM from '/src/static/json/material/tmp_store_perm.json'

const storeListFormat = ref([]) // 常驻商店性价比集合
const actStoreList = ref([]) // 活动列表
const storeTypeList = [ // 常驻商店数据初始化格式
  {typeName: 'green', iconId: '4005', dividing: 0.8, tier: 0.024, borderColor: 'rgb(0, 162, 162)'},
  {typeName: 'yellow', iconId: '4004', dividing: 9.0, tier: 1.5, borderColor: 'rgb(251, 192, 45)'},
  {typeName: 'orange', iconId: 'EPGS_COIN', dividing: 1.22, tier: 0.05, borderColor: 'rgb(232, 93, 6)'},
  {typeName: 'purple', iconId: 'REP_COIN', dividing: 1.6, tier: 0.32, borderColor: 'rgb(163, 53, 238)'},
  {typeName: 'grey', iconId: 'SOCIAL_PT', dividing: 6.5, tier: 1.6, borderColor: 'rgb(160, 160, 160)'},
]


formatStorePerm(TMP_STORE_PERM)

function formatStorePerm(data){
  storeListFormat.value = []
  for (let i = 0; i < storeTypeList.length; i++) {
    const item = storeTypeList[i]
    const list = data[item.typeName]
    console.log(list)
    list.sort((a,b)=>b.costPer-a.costPer)
    storeListFormat.value.push({
      ...item,
      itemList: list
    })
  }
}

function getStoreData() {
  // 遍历常驻商店格式化数据
  const config = userService.getStageConfig()
  materialAPI.getStorePermDataV4(config).then(response => {
    formatStorePerm(response.data)
  })


  materialAPI.getActStoreV4(config).then(response => {
    actStoreList.value = response.data
    // 遍历活动列表
    actStoreList.value.forEach(act => {
      // 格式化活动商店材料
      if (!act.actStoreFormat) {
        act.actStoreFormat = []
      }
      // 商店区域(通常为三个区域)
      const areas = [...new Set(act.actStore.map(t => t.itemArea))].sort()
      // 每个区域独立数组
      areas.forEach(areaNo => {
        const areaItems = act.actStore.filter(item => item.itemArea === areaNo)

        act.actStoreFormat.push(areaItems)
      })
    })

  })


}


// const storeListFormat = ref(pageContext?.pageProps?.storeListFormat) // 常驻商店性价比集合
// const actStoreList = pageContext?.pageProps?.actStoreList || [] // 活动列表
const opETextTheme = ref('op_title_etext_light')

function getActStoreBackgroundImage(path){
   return `https://cos.yituliu.cn/${path}`
}

// 活动商店背景图
function getBackground(path) {
  return `background: linear-gradient(rgba(144, 164, 174, 0.7), rgba(144, 164, 174, 0.7)), url(${getActStoreBackgroundImage(path)}) no-repeat 50% 50% /cover;`
}

// 活动商店tag
function getTagClass(tier) {
  return `stage_hint_t${tier.toString()}`
}

// 材料图标
function getSpriteImg(id, type) {
  return type === 'icon' ? `bg-${id}_icon sprite_store_icon` : `bg-${id} store_sprite_${type}`
}

// 材料品质颜色
function getColor(color, dividing = 4, tier = 1) {
  if (color < 0) return 'color_t6'
  else if (color < dividing - 3 * tier) return 'color_t1'
  else if (color < dividing - 2 * tier) return 'color_t2'
  else if (color < dividing - 1 * tier) return 'color_t3'
  else if (color < dividing) return 'color_t4'
  else return 'color_t5'
}

// 格式化效率
function getEfficiency(num, acc = 2) {
  return parseFloat(num).toFixed(acc);
}

// 切换采购中心商店显隐
function switchStore(item) {
  item.hide = !item.hide
  const storeStatusList = storeListFormat.value.map(t => t.hide)
  localStorage.setItem('storeStatusList', JSON.stringify(storeStatusList))
}

onMounted(() => {
  getStoreData()
  const storeStatusList = JSON.parse(localStorage.getItem('storeStatusList') || '[]')
  for (let i = 0; i < storeListFormat.value.length; i++) {
    storeListFormat.value[i].hide = storeStatusList[i]
  }
})
</script>

<template>
  <div class="store-page">
    <!-- 活动商店 -->
    <div id="actStore" >
      <!-- 标题区域 -->
      <ModuleHeader title="活动商店" title-en="Event Store" />
      <!-- 标题区域end -->
      <!-- 内容区域 -->
      <div v-for="(singleAct, index) in actStoreList" :key="index" class="act_store_block">
        <!-- banner -->
        <div class="act_banner_background" :style="getBackground(singleAct.imageLink)">
          <div class="act_banner_img">
            <img class="act_img" :src="getActStoreBackgroundImage(singleAct.imageLink)" :alt="singleAct.actName"/>
          </div>
        </div>

        <!-- tag -->

        <div class="tag-group">
          <span :class="`tag-rank-${singleTag.tagRank}`" v-for="(singleTag, index) in singleAct.actTagArea" :key="index">
           {{ singleTag.tagText }}
          </span>
        </div>

        <!-- <div class="stage_hint">-->
        <!--          <div v-for="(singleTag, index) in singleAct.actTagArea" :key="index" :class="getTagClass(singleTag.tagRank)">-->
        <!--            {{ singleTag.tagText }}-->
        <!--          </div>-->
        <!--        </div>-->

        <!-- Area -->
        <div class="activity-store-content" v-for="(singleArea, index) in singleAct.actStoreFormat" :key="index">
          <div class="activity-store-good"
               :class="`activity-store-good-area-${index+1}`"
               v-for="(singleItem, i) in singleArea" :key="i">
            <div class="activity-store-good-sprite">
              <div :class="`bg-${singleItem.itemId}`"></div>
            </div>
            <div class="activity-store-good-info">
              <span class="activity-store-good-name">{{ singleItem.itemName }}</span>
              <span class="activity-store-good-efficiency"
                    :class="getColor(singleItem.itemPPR, singleAct.actPPRBase, singleAct.actPPRStair)">{{
                  getEfficiency(singleItem.itemPPR)
                }}</span>
              <span class="activity-store-good-price">{{ singleItem.itemPrice }}代币</span>
            </div>
            <!-- </div> -->
          </div>
        </div>
        <!-- 内容区域end -->
      </div>
    </div>
    <!-- 活动商店end -->

    <!-- 采购中心 -->
    <div id="store">
      <!-- 标题区域 -->
      <ModuleHeader title="采购中心" title-en="Store Ranking" :tips="['*点击图标切换']">
        <div class="permanent-store-checkbox">
          <div
            class="permanent-store-checkbox-button"
            v-for="(item, index) in storeListFormat"
            :key="index"
            :style="item.hide ? '' : 'filter: none;'"
            @click="switchStore(item)"
          >
            <div class="" :class="`bg-icon_${item.iconId}`"></div>
          </div>
        </div>
      </ModuleHeader>
      <!-- 标题区域end -->
      <!-- 内容区域 -->
      <div
        v-show="!item.hide"
        class="permanent-store-content"
        v-for="(item, index) in storeListFormat" :key="index"
        :style="{ borderColor: item.borderColor }"
      >
        <div class="permanent-store-icon">
          <div :class="`bg-icon_${item.iconId}`"></div>
        </div>
        <div v-for="(m_data, index) in item.itemList" class="permanent-store-good" :key="index">
          <div class="permanent-store-good-sprite">
            <div :class="`bg-${m_data.itemId}`"></div>
          </div>
          <p class="permanent-store-good-text" :class="getColor(m_data.costPer, item.dividing, item.tier)">
            {{ getEfficiency(m_data.costPer) }}
          </p>
        </div>
      </div>
    </div>
    <!-- 采购中心end -->

    <!-- 算法说明 -->
    <ModuleHeader title="算法说明" title-en="Algorithm" />
    <div id="foot_main">
      <div class="foot_unit" style="width: 100%; white-space: normal">
        <el-card class="box-card">
          <el-collapse>
            <el-collapse-item name="2" style="">
              <template #title>

                <span style="font-size: large; display: flex; align-items: center">
                  <i class="iconfont icon-calculator"></i>
                  <b style="margin-left: 4px">计算方式</b></span>
              </template>

              单位：理智/各货币
              <ul style="padding-left: 2em">
                <li>各商店之间货币不同，故<b>不可跨店对比数值</b>。</li>
                <li>根据<b>物品价值表</b>中的价格和商店售价得到的性价比值。</li>
                <li>活动商店采用相同算法。</li>
                <li>信用商店计价单位为100信用点。</li>
                <li>若源岩系材料的主要来源是1-7以外的关卡，则源岩系材料价值<a class="popover_color">+6%</a>。</li>
              </ul>


            </el-collapse-item>
            <el-collapse-item name="4" style="">
              <template #title>
                <span style="font-size: large; display: flex; align-items: center">
                  <i class="iconfont icon-publicity"></i>
                  <b style="margin-left: 4px">算法公示卡</b></span>
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
                <span style="font-size: large; display: flex; align-items: center"> <i class="iconfont icon-copyright"></i>
                  <b style="margin-left: 4px">版权声明与许可协议</b>
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
    <!-- 算法说明end -->
  </div>
  <fixed-nav/>
</template>

<style lang="scss">
@import '/src/assets/css/material/store.scss';
@import '/src/assets/css/material/store.phone.scss';
@import '/src/assets/css/sprite/sprite_plane_icon.css';

#store {
  .op_title {
    display: flex;
  }

  .op_title_tag {
    display: flex;
    align-items: flex-end;

    .op_title_tag_item {
      height: 45px;
      width: 45px;
      margin: 0px 4px;
      box-shadow: 2px 2px 6px 0 rgba(0, 0, 0, 0.3);
      border-radius: 4px;
      background: #f0f0f0;
      display: flex;
      align-items: center;
      justify-content: center;

      &.hide {
        filter: grayscale(100%);
      }
    }
  }

  .store-content {
    border: 1px solid transparent;

    &.hide {
      display: none;
    }

    .permanent-store-good {
      flex-grow: 0
    }
  }
}

#actStore {
  p {
    margin: 0;
  }

  .act_content {
    justify-content: flex-start;

    .act_card_detail {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      height: 100%;
      padding: 12px 0;
      box-sizing: border-box;

      .act_card_item_name,
      .act_card_item_price {
        color: gray;
        font-size: 12px;
      }

      .act_card_item_efficiency {
        font-size: 30px;
        font-weight: bold;
      }
    }
  }
}
</style>