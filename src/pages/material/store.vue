<script setup>
import ModuleHeader from '@/components/ModuleHeader.vue';
import {onMounted, ref} from 'vue'
import {getStageConfig} from "/src/utils/user/userConfig.js";
import '/src/assets/css/material/store.scss';
import '/src/assets/css/material/store.phone.scss';
import '/src/assets/css/sprite/sprite_plane_icon.css';
import STORE_PERM_DATA from '/src/static/json/material/store_perm_table.json'
import itemCache from "/src/utils/indexedDB/itemCache.js";
import itemAPI from '/src/api/itemAPI.js'
import NoticeBoard from "@/components/NoticeBoard.vue";


const storeListFormat = ref([]) // 常驻商店性价比集合
const actStoreList = ref([]) // 活动列表

const storeTypeList = [ // 常驻商店数据初始化格式
  {typeName: 'green', iconId: '4005', dividing: 0.8, tier: 0.024, borderColor: 'rgb(0, 162, 162)'},
  {typeName: 'yellow', iconId: '4004', dividing: 9.0, tier: 1.5, borderColor: 'rgb(251, 192, 45)'},
  {typeName: 'orange', iconId: 'EPGS_COIN', dividing: 1.22, tier: 0.05, borderColor: 'rgb(232, 93, 6)'},
  {typeName: 'purple', iconId: 'REP_COIN', dividing: 1.6, tier: 0.32, borderColor: 'rgb(163, 53, 238)'},
  {typeName: 'grey', iconId: 'SOCIAL_PT', dividing: 6.5, tier: 1.6, borderColor: 'rgb(160, 160, 160)'},
]

const stageConfig = getStageConfig()
let itemValueMap = new Map()
itemValueMap.set("1873450981701000",21.518115440178397)

async function loadingStoreData(){
  const itemValueList = await itemCache.getItemValueCacheByConfig(stageConfig)

  for (const item of itemValueList) {
    itemValueMap.set(item.itemId, item.itemValueAp)
  }

  permStoreComputed()
  activityStoreComputed()
}

function permStoreComputed() {

  for (const storeInfo of storeTypeList) {
    const data = STORE_PERM_DATA[storeInfo.typeName]
    for (const item of data) {
      const itemValueAp = itemValueMap.get(item.itemId)
      let apEfficiency = itemValueAp * item.quantity / item.price
      if (storeInfo.typeName === 'grey') {
        apEfficiency *= 100
      }
      item.apEfficiency = apEfficiency

    }
    data.sort((a,b)=>b.apEfficiency-a.apEfficiency)
    storeInfo.list = data
  }

  storeListFormat.value = storeTypeList

}



function activityStoreComputed() {

  itemAPI.listActivityStore().then(response=>{
    actStoreList.value = response.data
    // 遍历活动列表
    for(let item of actStoreList.value){
      item.actStoreFormat = _formatActStore(item.actStore)
    }
  })


  function _formatActStore(data){
    let actStoreFormat = [[],[],[],[],[]]
    for(let item of data){
      const {itemArea,itemId,itemPrice,itemQuantity,itemName} = item
      const itemValueAp = itemValueMap.get(itemId)
      const itemPPR = itemValueAp * itemQuantity/itemPrice
      actStoreFormat[itemArea-1].push({
        itemPrice:itemPrice,
        itemId:itemId,
        itemName:itemName,
        itemPPR:itemPPR
      })
    }

    for (let list of actStoreFormat){
      list = list.sort((a,b)=>b.itemPPR-a.itemPPR)
    }

    return actStoreFormat
  }


}

const opETextTheme = ref('op_title_etext_light')

function getActStoreBackgroundImage(path) {
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
  console.log(item)
  item.hide = !item.hide
  const storeStatusList = storeListFormat.value.map(t => t.hide)
  localStorage.setItem('storeStatusList', JSON.stringify(storeStatusList))
}

onMounted(() => {
  loadingStoreData()
  const storeStatusList = JSON.parse(localStorage.getItem('storeStatusList') || '[]')
  for (let i = 0; i < storeListFormat.value.length; i++) {
    storeListFormat.value[i].hide = storeStatusList[i]
  }
})
</script>

<template>
  <div class="store-page">
    <!-- 活动商店 -->
    <div id="actStore">
      <!-- 标题区域 -->
      <ModuleHeader title="活动商店" title-en="Event Store"/>
      <!-- 标题区域end -->
      <!-- 内容区域 -->
      <div v-for="(singleAct, index) in actStoreList" :key="index" class="act_store_block">
        <!-- banner -->
        <div class="act-banner-background" :style="getBackground(singleAct.imageLink)">
          <img class="act-banner-img" :src="getActStoreBackgroundImage(singleAct.imageLink)" :alt="singleAct.actName"/>
        </div>

        <!-- tag -->

        <div class="tag-group">
          <span :class="`tag-rank-${singleTag.tagRank}`" v-for="(singleTag, index) in singleAct.actTagArea"
                :key="index">
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
        <div class="flex">
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
        <div v-for="(m_data, index) in item.list" class="permanent-store-good" :key="index">
          <div class="permanent-store-good-sprite">
            <div :class="`bg-${m_data.itemId}`"></div>
          </div>
          <p class="permanent-store-good-text" :class="getColor(m_data.apEfficiency, item.dividing, item.tier)">
            {{ getEfficiency(m_data.apEfficiency) }}
          </p>
        </div>
      </div>
    </div>
    <!-- 采购中心end -->

    <NoticeBoard module="store">

    </NoticeBoard>


    <!-- 算法说明end -->
  </div>

</template>

<style lang="scss">


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