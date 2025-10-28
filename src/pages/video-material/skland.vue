<script setup>

import itemCache from "/src/plugins/indexedDB/itemCache.js";
import itemAPI from "/src/api/materialV5.js";
import {onMounted, ref} from "vue";
import {getStageConfig} from "/src/utils/user/userConfig.js";
import ItemImage from "@/components/sprite/ItemImage.vue";
import {formatNumber} from "../../utils/format.js";

const stageConfig = getStageConfig()


let itemValueMap = new Map()

async function getItemValueMap(){
  itemValueMap =  await itemCache.getItemValueMapCacheByConfig(stageConfig)
  console.log(itemValueMap)
  formatActivityStoreData()
}



const actStoreList = ref([]) // 活动列表

const actStoreData = ref([])


function formatActivityStoreData(){
  itemAPI.listActivityStore().then(response => {

    // 遍历活动列表
    actStoreData.value =   _format(response.data[0].actStore,1,0.3)
  })

  function _format(data,base,tier){
    const collect = [[],[],[],[],[],[],[],[],[]]
    for(const item of data){
      const { itemId, itemPrice, itemQuantity, itemName} = item
      const itemValue = itemValueMap.get(itemId)
       if(itemValue===undefined){
         continue
       }
      const itemPPR = itemValue * itemQuantity / itemPrice
      const number = Math.floor(itemPPR / tier);


      collect[number].push({
        itemPrice: itemPrice,
        itemId: itemId,
        itemName: itemName,
        itemPPR: itemPPR
      })
    }

    const result = []
    for(const list of collect){
      if(list.length>0){
        list.sort((a,b)=>b.itemPPR-a.itemPPR)
        result.unshift(list)
      }
    }
    console.log(result)
    return result

  }
}

function activityStoreComputed() {
  itemAPI.listActivityStore().then(response => {
    actStoreList.value = response.data
    // 遍历活动列表
    for (let item of actStoreList.value) {
      item.actStoreFormat = _formatActStore(item.actStore)
    }
  })
  function _formatActStore(data) {
    let actStoreFormat = [[], [], [], [], []]
    for (let item of data) {
      const {itemArea, itemId, itemPrice, itemQuantity, itemName} = item
      const itemValue = itemValueMap.get(itemId)
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

}

onMounted(() => {
  getItemValueMap()
})

</script>

<template>

  <div class="skland-bg">
    <div class="skland-card-title">活动商店性价比</div>
    <div class="skland-card">
      <div v-for="(list,index) in actStoreData" class="flex flex-wrap skland-activity-store-line">
        <div v-for="item in list" class="skland-activity-store-item">
          <ItemImage :item-id="item.itemId" size="80"></ItemImage>
          <div class="skland-activity-store-item-ppr" :class="`skland-t${5-index}`">{{formatNumber(item.itemPPR,2) }}</div>
        </div>
      </div>
    </div>

     <p class="skland-activity-store-tip"> 素材图片下方数字含义：物品价值/代币</p>

  </div>

</template>

<style scoped>
.skland-bg {
  --c-primary-color:#000fc4;
  --c-secondary-color: #f8f8f8;
  --c-border-color: #bca96d;
  width: 1080px;
  padding: 16px 0;
  box-sizing: border-box;
  background-color: var(--c-secondary-color);
}

.skland-card-title {
  margin: 20px 0 0 20px;
  width: 360px;
  font-size: 32px;
  text-align: center;
  color: #ffffff;
  background-color: var(--c-primary-color);
  border-bottom: 12px solid var(--c-border-color);
}

.skland-card{
  margin:8px 0 0 20px;
  border: 4px solid var(--c-primary-color);
  border-radius: 12px;
}

.skland-title-bottom {

}
.skland-activity-store-line{
  padding: 12px;
  border-bottom:1px solid var(--c-primary-color);

}


.skland-activity-store-item{
  margin: 0 12px;
}

.skland-activity-store-item-ppr{
  text-align: center;
  font-weight: bolder;
  font-size: 20px;
}

.skland-activity-store-tip{
  padding: 0 20px;
  font-size: 18px;
  color:  var(--c-primary-color);
}

.skland-t5{
  color: #ff7300;
}

.skland-t4{
  color: #7d00bb;
}

.skland-t3{
  color: #0080ff;
}

.skland-t2{
  color: #1bb219;
}

.skland-t1{
  color: #676767;
}
</style>