<script setup>

import itemCache from "/src/plugins/indexedDB/itemCache.js";
import itemAPI from "/src/api/materialV5.js";
import {onMounted, ref} from "vue";
import {getStageConfig} from "/src/utils/user/userConfig.js";
const stageConfig = getStageConfig()


let itemValueMap = ref(new Map())
itemCache.getItemValueMapCacheByConfig(stageConfig).then(response=>{
  itemValueMap.value = response
})

const actStoreList = ref([]) // 活动列表

function activityStoreComputed() {
  itemAPI.listActivityStore().then(response => {
    actStoreList.value = response.data
    // 遍历活动列表
    for (let item of actStoreList.value) {
      item.actStoreFormat = _formatActStore(item.actStore)
    }

    function _formatActStore(data) {
      let actStoreFormat = [[], [], [], [], []]
      for (let item of data) {
        const {itemArea, itemId, itemPrice, itemQuantity, itemName} = item
        const itemValue = itemValueMap.value.get(itemId)
        const itemPPR = itemValue * itemQuantity / itemPrice
        actStoreFormat[itemArea - 1].push({
          itemPrice: itemPrice,
          itemId: itemId,
          itemName: itemName,
          itemPPR: itemPPR
        })
      }

      for (let list of actStoreFormat) {
        list = list.sort((a, b) => b.itemPPR - a.itemPPR)
      }

      return actStoreFormat
    }

    console.log(actStoreList.value)


  })

}

onMounted(() => {
  activityStoreComputed()
})

</script>

<template>

  <div class="skland-bg">
    <div class="skland-title1">活动商店性价比</div>
    <div></div>
  </div>

</template>

<style scoped>

.skland-title1 {
  font-size: 32px;
  text-align: center;
  color: #ffffff;
  background-color: #000fc4;
  border-bottom: 12px solid #bca96d;
}

.skland-title-bottom {

}

.skland-bg {
  width: 1080px;
  padding: 16px 0;
  box-sizing: border-box;
  background-color: #e9f7ff;
}

</style>