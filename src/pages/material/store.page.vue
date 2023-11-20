<template>
  <div>
    <!-- 活动商店 -->
    <div id="actStore">
      <!-- 标题区域 -->
      <div class="op_title">
        <div class="op_title_text">
          <div class="op_title_ctext">活动商店</div>
          <div :class="opETextTheme">Event Store</div>
        </div>
      </div>
      <!-- 标题区域end -->
      <!-- 内容区域 -->
      <div v-for="(singleAct, index) in actStoreList" :key="index">
        <!-- banner -->
        <div class="act_banner_background" :style="getBackground(singleAct.actImgUrl)">
          <div class="act_banner_img">
            <img class="act_img" :src="singleAct.actImgUrl" :alt="singleAct.actName" />
          </div>
        </div>

        <!-- tag -->
        <div class="stage_hint">
          <div v-for="(singleTag, index) in singleAct.actTagArea" :key="index" :class="getTagClass(singleTag.tagRank)">
            {{ singleTag.tagText }}
          </div>
        </div>

        <!-- Area -->
        <div class="act_content" v-for="(singleArea, index) in singleAct.actStoreFormat" :key="index">
          <div
              :class="['act_card uni_shadow_2', `act_area${index === 0 ? index + 1 : index + 2}_border`]"
              v-for="(singleItem, i) in singleArea"
              :key="i"
          >
            <div class="act_card_img">
              <div class="store_sprite_act_wrap"><div :class="getSpriteImg(singleItem.itemId, 'act')"></div></div>
            </div>
            <div class="act_card_detail">
              <p class="act_card_item_name">{{ singleItem.itemName }}</p>
              <p class="act_card_item_efficiency" :class="getColor(singleItem.itemPPR, singleAct.actPPRBase, singleAct.actPPRStair)">{{ getEfficiency(singleItem.itemPPR) }}</p>
              <p class="act_card_item_price">{{ singleItem.itemPrice }}代币</p>
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
      <div class="op_title">
        <div class="op_title_text">
          <div class="op_title_ctext">采购中心</div>
          <div :class="opETextTheme">Store Ranking</div>
        </div>
        <div class="op_title_tag">
          <div class="op_title_tag_item" :class="[{hide: item.hide}]" v-for="(item, index) in storeListFormat" :key="index" @click="switch_store(item)">
            <div style="margin: 3px" :class="getSpriteImg(item.imgId, 'icon')"></div>
          </div>
          <div class="tab_text">*点击图标切换</div>
        </div>
      </div>
      <!-- 标题区域end -->
      <!-- 内容区域 -->
      <div :class="['store_content', {hide: item.hide}]"
            v-for="(item, index) in storeListFormat"
           :key="index"
           :style="{borderColor: item.borderColor}">
        <div class="store_unit_first_icon">
          <div :class="getSpriteImg(item.imgId, 'icon')"></div>
        </div>
        <div v-for="(m_data, index) in item.itemList" class="store_unit" :key="index">
          <div class="store_sprite_perm_wrap"><div :class="getSpriteImg(m_data.itemId, 'perm')"></div></div>
          <p class="store_unit_text" :class="getColor(m_data.costPer, item.dividing, item.tier)">
            {{ getEfficiency(m_data.costPer) }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import cookie from 'js-cookie'
import { usePageContext } from '@/renderer/usePageContext'
import { onMounted, ref } from 'vue'
const pageContext = usePageContext()
const storeListFormat = ref(pageContext?.pageProps?.storeListFormat) // 常驻商店性价比集合
const actStoreList = pageContext?.pageProps?.actStoreList || [] // 活动列表
const opETextTheme = ref('op_title_etext_light')
// 活动商店背景图
function getBackground(url) {
  return `background: linear-gradient(rgba(144, 164, 174, 0.7), rgba(144, 164, 174, 0.7)), url(${url}) no-repeat 50% 50% /cover;`
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
function switch_store(item) {
  item.hide = !item.hide
  const storeStatusList = storeListFormat.value.map(t => t.hide)
  cookie.set('storeStatusList', JSON.stringify(storeStatusList), { expires: 30 })
}

onMounted(() => {
  // 取cookie存的商店显隐状态
  const storeStatusList = JSON.parse(cookie.get('storeStatusList') || '[]')
  for (let i = 0; i < storeListFormat.value.length; i++) {
    storeListFormat.value[i].hide = storeStatusList[i]
  }
})
</script>

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
  .store_content {
    border: 1px solid transparent;
    &.hide {
      display: none;
    }
    .store_unit {
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
      .act_card_item_name, .act_card_item_price {
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