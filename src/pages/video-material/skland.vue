<script setup>

import itemCache from "/src/plugins/indexedDB/itemCache.js";
import itemAPI from "/src/api/materialV5.js";
import {onMounted, ref} from "vue";
import {getStageConfig} from "/src/utils/user/userConfig.js";
import ItemImage from "@/components/sprite/ItemImage.vue";
import {formatNumber} from "/src/utils/format.js";
import { getStageData } from '/src/utils/item/stageEfficiencyCal.js'


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
     console.log(response)
    // 遍历活动列表
    actStoreData.value =   _format(response.data[0].actStore,1,0.5)
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

const orundumRecommendedStageList = ref([])

// 获取关卡推荐数据
function getStageResult() {
  const stageConfig = getStageConfig()
  getStageData(stageConfig).then(response => {

    const { recommendedStage, orundumRecommendedStageVO, historyActStage } = response

    // console.log(JSON.stringify(response))
    console.log(orundumRecommendedStageVO)

    const list =  orundumRecommendedStageVO.filter(item => item.stageType==='ACT'||item.stageType==='ACT_REP')
    list.push(orundumRecommendedStageVO[0],orundumRecommendedStageVO[1])

    orundumRecommendedStageList.value = list
    console.log(list)
  })

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
  getStageResult()
})

</script>

<template>



  <div class="skland-bg">
    <div class="skland-card-title">活动商店性价比</div>
    <div class="skland-store-card">
      <div v-for="(list,index) in actStoreData" class="flex flex-wrap">
        <div v-for="singleItem in list" class="skland-activity-store-good" :class="`skland-activity-store-good-area-${5-index}`">
<!--          <ItemImage :item-id="item.itemId" size="80"></ItemImage>-->
<!--          <div class="skland-activity-store-item-ppr" :class="`skland-t${5-index}`">{{formatNumber(item.itemPPR,2) }}</div>-->

            <div class="skland-activity-store-good-sprite">
              <div :class="`bg-${singleItem.itemId}`"></div>
            </div>
            <div class="skland-activity-store-good-info">
              <span class="skland-activity-store-good-name">{{ singleItem.itemName }}</span>
              <span class="skland-activity-store-good-efficiency"
                    :class="`skland-t${5-index}`">
                {{formatNumber(singleItem.itemPPR,2) }}
              </span>
              <span class="skland-activity-store-good-price">{{ singleItem.itemPrice }}代币</span>
            </div>
            <!-- </div> -->

        </div>
      </div>
    </div>

     <p class="skland-activity-store-tip"> 素材图片下方数字含义：物品价值/代币</p>




  <table class="orundum-table">
    <tr>
      <td>
        关卡
      </td>
      <td>
        每理智可产出玉
      </td>
      <td>
        每搓1抽消耗龙门币
      </td>
      <td>
        搓玉效率
      </td>
      <td>
        关卡效率
      </td>
    </tr>
    <tr v-for="item in orundumRecommendedStageList">
      <td>
         {{item.stageCode}}
      </td>
      <td>
        <div class="flex align-center">
        <item-image :item-id="'4003'" size="40"></item-image> X {{formatNumber(item.orundumPerAp,2)}}
        </div>
      </td>
      <td>
        <div class="flex align-center">
          <item-image :item-id="'4001'" size="40"></item-image> X {{formatNumber(item.lmdcost,2)}}万
        </div>
      </td>
      <td>
        {{formatNumber(item.orundumPerApEfficiency*100,1)}}%
      </td>
      <td>
        {{formatNumber(item.stageEfficiency*100,1)}}%
      </td>
    </tr>
    <tr v-for="item in orundumRecommendedStageList">
      <td>
        OS-4
      </td>
      <td>
        <div class="flex align-center">
          <item-image :item-id="'4003'" size="40"></item-image> X {{formatNumber(item.orundumPerAp,2)}}
        </div>
      </td>
      <td>
        <div class="flex align-center">
          <item-image :item-id="'4001'" size="40"></item-image> X {{formatNumber(item.lmdcost,2)}}万
        </div>
      </td>
      <td>
        {{formatNumber(item.orundumPerApEfficiency*100,1)}}%
      </td>
      <td>
        {{formatNumber(item.stageEfficiency*100,1)}}%
      </td>
    </tr>
  </table>
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
  //background-color: var(--c-secondary-color);
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
  width: 800px;
  border-radius: 12px;
}


.skland-store-card{
  padding: 20px;
  width: 1000px;
}

.skland-activity-store-good{
  border-radius: 8px;
  border: 0px solid rgb(235, 238, 245);
  background-color: rgba(255, 253, 253, 0.08);
  overflow: hidden;
  -webkit-transition: 0.3s;
  transition: 0.3s;
  margin: 3px;
  width: 180px;
  height: 90px;
  display: flex;
  align-items: center;
  border-left-width: 4px;
  border-left-style: solid;
  box-shadow: 2px 2px 2px 0 rgba(0, 0, 0, 0.2);
}

.skland-activity-store-good-sprite {
  width: 90px;
  height: 90px;
  position: relative;
}

.skland-activity-store-good-sprite div {
  position: absolute;
  transform: scale(calc(90 / 183));
  top: calc((-183px + 90px) / 2);
  left: calc((-183px + 90px) / 2);
}

.skland-activity-store-good-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
  height: 100%;
  width: 90px;
  text-align: center;
  box-sizing: border-box;

}

.skland-activity-store-good-name,
.skland-activity-store-good-price {
  color: gray;
  font-size: 12px;
  display: block;
  width: 100%;
}

.skland-activity-store-good-efficiency {
  font-size: 28px;
  font-weight: bolder;
  line-height: 28px;
}

.skland-activity-store-good-area-0 {
  border-left-color: #ff0000;
}

.skland-activity-store-good-area-5 {
  border-left-color: #e85d06;
}

.skland-activity-store-good-area-4 {
  border-left-color: #a335ee;
}

.skland-activity-store-good-area-3 {
  border-left-color: #0070dd;
}

.skland-activity-store-good-area-2 {
  border-left-color: #00a2a2;
}

.skland-activity-store-good-area-1 {
  border-left-color: #a0a0a0;
}







.skland-title-bottom {

}
.skland-activity-store-line{

  padding: 12px;
  border-bottom:2px solid var(--c-primary-color);

}

.orundum-table{
  background-color: rgba(0,0,0,0);
  border-collapse: collapse;
  font-size: 18px;
  font-weight: bolder;
  td{
    padding: 4px 12px;
    border: 2px solid var(--c-primary-color);
  }
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