<script setup>
import FixedNav from "/src/components/FixedNav.vue";
import ModuleHeader from '@/components/ModuleHeader.vue';
import {ref, onMounted} from "vue";
import {exportExcel} from "/src/utils/exportExcel";
import {getStageConfig} from "/src/utils/user/userConfig.js";
import ItemImage from "/src/components/sprite/ItemImage.vue";
import {formatNumber} from "@/utils/format.js";
import itemCache from "/src/utils/indexedDB/itemCache.js";
import NoticeBoard from "@/components/NoticeBoard.vue";



let itemValueCollect = ref([])

let itemValueList = ref([])



function exportItemValueJson() {
  let itemList = []
  for (const item of itemValueList.value) {
    itemList.push({
      id: item.itemId,
      name: item.itemName,
      apValue: item.itemValueAp,
      rarity: item.rarity
    })
  }
  let link = document.createElement('a')
  link.download = `item_value_table.json`
  link.href = 'data:text/plain,' + JSON.stringify(itemList)
  link.click()
}

function exportItemValueExcel() {
  let itemList = [[
    '物品id', '物品名称', '等效理智','物品稀有度'
  ]]
  for (const item of itemValueList.value) {
    itemList.push([
      item.itemId,
      item.itemName,
      item.itemValueAp,
      item.rarity
    ])
  }
  exportExcel('物品价值表', itemList)

}


function getSpriteImg(id) {
  return "bg-" + id + " item_image";
}

function getItemRarityColor(rarity) {
  if (rarity === 1) return 'border-color: var(--grey)'
  if (rarity === 2) return 'border-color: var(--green)'
  if (rarity === 3) return 'border-color: var(--blue)'
  if (rarity === 4) return 'border-color: var(--purple)'
  if (rarity === 5) return 'border-color: var(--orange)'
}




onMounted(() => {
  const stageConfig = getStageConfig()
  itemCache.getItemValueCacheByConfig(stageConfig).then(response=>{
    formatItem(response)
  })
});

function formatItem(data){

  itemValueList.value = data
  let tmpList = []
  for (const item of data) {
    const sortId = item.cardNum
    if (sortId > 90) {
      continue
    }
    item.itemValueAp = formatNumber(item.itemValueAp,4)
    let list = tmpList[sortId]
    if (list) {
      list.push(item)
    } else {
      list = [item]
    }
    tmpList[sortId] = list
  }


  for (const list of tmpList) {
    if (!list || list.length < 1) {
      continue
    }
    // itemValueCollect.value.push(list)
    if (list.length < 9) {
      itemValueCollect.value.push(list)
    } else {
      itemValueCollect.value.push(list.slice(0, 9))
      itemValueCollect.value.push(list.slice(9))
    }
  }
}


</script>

<template>
  <div id="value">
    <!-- 价值一览 Start -->
    <ModuleHeader title="价值一览" title-en="Material Value"></ModuleHeader>
    <v-btn color="primary" variant="tonal" class="m-4"
           @click="exportItemValueExcel">导出Excel
    </v-btn>
    <v-btn color="primary" variant="tonal" class="m-4"
           @click="exportItemValueJson">导出Json
    </v-btn>
    <div class="item-value-table-wrap color">
      <div v-for="(item_group, index) in itemValueCollect" :key="index" class="item-value-list">
        <div class="item-value-cell flex align-center" v-for="(item, index) in item_group" :key="index"
             :style="getItemRarityColor(item.rarity)">
          <ItemImage :item-id="item.itemId"></ItemImage>
          <div class="item-value">
            {{ item.itemValueAp }}
          </div>
        </div>
      </div>
    </div>
    <!-- 价值一览 End -->

    <NoticeBoard module="item">

    </NoticeBoard>


  </div>

  <fixed-nav/>
</template>

<style lang="scss" scoped>
@import '@/assets/css/material/value.scss';
@import '@/assets/css/material/value.phone.scss';

.value-button-group button {
  margin: 4px;
}
</style>


