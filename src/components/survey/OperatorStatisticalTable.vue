<script setup>
import {ref, watch} from "vue";
import OperatorBar from "/src/components/survey/OperatorBar.vue";
import '/src/assets/css/survey/operator.scss'
import '/src/assets/css/survey/operator.phone.scss'
import {statisticsOperatorInfo, splitMaterialByTier} from "/src/utils/survey/operatorStatistical"
import OperatorAvatar from "/src/components/sprite/OperatorAvatar.vue";
import ItemImage from "/src/components/sprite/ItemImage.vue";
import {getStageConfig} from "/src/utils/user/userConfig.js";
import itemCache from "/src/utils/indexedDB/itemCache.js";


const props = defineProps(["modelValue"]);

let operatorInfo = ref([])
let apCost = ref(0) //理智消耗数量
let itemCostCollectOriginal = ref([])
let itemCostCollectData = ref([])
let apCostRankingData = ref([])
let notOwnData = ref([])

async function updateData(list) {



  const statisticsOperatorInfo1 = await statisticsOperatorInfo(list);

  const {notOwn, apCostRanking, itemCostCollect, apCostCount, info} = statisticsOperatorInfo1


  operatorInfo.value = _setData(info)

  const {T5, T4, T3, T2, T1} = itemCostCollect
  itemCostCollectData.value = [T5, T4, T3, T2, T1]
  itemCostCollectOriginal.value = itemCostCollect

  apCost.value = apCostCount

  try {
    apCostRankingData.value = apCostRanking
    notOwnData.value = notOwn
  } catch (error) {
    console.log(error)
  }


  function _setData(info) {
    let cardData = []
    for (let item of info) {
      const {elite, equip, skill, own, count} = item
      const data = [
        {label: '招募干员数量', value: `${own}/${count}`},
        {label: '精英阶段2干员', value: `${elite.rank2}`},
        {label: '专精三级技能数量', value: `${skill.rank3}`},
        {label: '专精二级技能数量', value: `${skill.rank2}`},
        {label: '专精一级技能数量', value: `${skill.rank1}`},
        {label: '三级模组数量', value: `${equip.rank3}`},
        {label: '二级模组数量', value: `${equip.rank2}`},
        {label: '一级模组数量', value: `${equip.rank1}`},
      ]
      cardData.push({title: item.module, data: data})
    }

    return cardData
  }

}


/**
 * 根据材料最大星级对材料进行拆解计算
 * @param highestRarity  材料最大星级
 */
function splitMaterialByRarity(highestRarity) {
  itemCostCollectData.value = splitMaterialByTier(highestRarity, itemCostCollectOriginal.value);
  // console.log(itemCostCollectData.value)
}

/**
 * 数字展示长度限制
 * @param num  原始数字
 * @returns {string|*}  格式化后的数字
 */
function strShowLength(num) {
  if (num > 99999999) {
    return (num / 100000000).toFixed(2) + "亿"
  }
  if (num > 9999) {
    return (num / 10000).toFixed(1) + "万"
  }
  return num
}


updateData(props.modelValue)
watch(() => props.modelValue.length, (newVal, oldValue) => {

  updateData(props.modelValue)
})


</script>

<template>

  <div class="operator-statistical-page flex justify-center flex-wrap m-a">
    <v-card class="operator-statistical-card m-4" :title="group.title"
            v-for="(group,index) in operatorInfo" :key="index">
      <v-card-text>
        <div class="operator-statistical-item" v-for="(data,index) in group.data" :key="index">
          <span class="info-label">{{ data.label }}</span>
          <span class="info-value">{{ data.value }}</span>
        </div>
      </v-card-text>
    </v-card>

    <v-card class="operator-statistical-card m-4" title="未招募干员">
      <div class="flex flex-wrap m-4">
        <OperatorAvatar :char-id="operator.charId"
                        v-for="(operator) in notOwnData"></OperatorAvatar>
      </div>
    </v-card>

    <v-card class="operator-ap-cost-rank-card m-4" title="干员消耗理智排行">
      <OperatorBar v-for="(item,index) in apCostRankingData" :key="index" :operator-info="item"></OperatorBar>
    </v-card>

    <v-card class="m-4" title="材料消耗情况">
      <v-card-text>
        <div class="item-cost-data">
          <p style="">总计消耗{{ apCost.toFixed(0) }} 理智</p>
          <!--          材料统计-->
          <v-btn color="orange" class="m-4" @click="splitMaterialByRarity(5)">不拆分</v-btn>
          <v-btn color="purple" class="m-4" @click="splitMaterialByRarity(4)">拆分材料到紫色品质</v-btn>
          <v-btn color="blue" class="m-4" @click="splitMaterialByRarity(3)">拆分材料到蓝色品质</v-btn>
          <div class="item-cost-group" v-for="(list,tier) in itemCostCollectData" :key="tier">
            <div class="item-cost-item" v-for="(item,index) in list" :key="index">
              <ItemImage :item-id="item.id" style="margin: auto"></ItemImage>
              <span class="item-cost-num">
                  {{ strShowLength(item.count) }}
            </span>
            </div>
          </div>
        </div>
      </v-card-text>
    </v-card>

  </div>

</template>

<style scoped>

</style>