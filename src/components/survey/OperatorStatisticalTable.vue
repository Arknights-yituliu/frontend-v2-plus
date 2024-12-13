<script setup>
import {ref, watch} from "vue";
import OperatorInfo from "/src/components/OperatorInfo.vue";
import MyButton from "/src/components/Button.vue";
import '/src/assets/css/survey/operator.scss'
import '/src/assets/css/survey/operator.phone.scss'
const props = defineProps(["modelValue"]);
import {operatorStatisticalV2, splitMaterial} from "/src/utils/survey/operatorStatistical"
import SpriteImage from "/src/components/SpriteImage.vue";


let allData = ref([])
let itemCostList = ref([]) //材料消耗数量
let apCostCount = ref(0) //理智消耗数量
let itemCostMap = ref({}) //材料消耗数量
let apCostRanking = ref([])
let notOwn = ref([])

function updateData(list) {

  const statisticalInfo = operatorStatisticalV2(list);


  allData.value = []
  const operatorGroup = [
    {label: '全部干员', value: 'all'},
    {label: '6⭐干员', value: 'rarity6'},
    {label: '5⭐干员', value: 'rarity5'},
    {label: '4⭐干员', value: 'rarity4'}
  ]



  for (const item of operatorGroup) {
    setData(item,statisticalInfo)
  }

  itemCostList.value = statisticalInfo.itemCostList
  itemCostMap.value = statisticalInfo.itemCostMap
  apCostCount.value = statisticalInfo.apCostCount
  apCostRanking.value = statisticalInfo.apCostRanking
  notOwn.value = statisticalInfo.allNotOwn
}

function setData(group, statisticalInfo) {
  let value = group.value

  let data = [{
    label: '招募干员数量',
    value: `${statisticalInfo[`${value}Own`]}/${statisticalInfo[`${value}Count`]}`
  }]
  let rank = 2
  for (const num of statisticalInfo[`${value}Elite`]) {
    data.push({label: `精英阶段${rank}干员`, value: num.toString()})
    rank--
  }
  rank = 3
  for (const num of statisticalInfo[`${value}Skill`]) {
    if (rank === 0) {
      continue
    }
    const label = rank !== 0 ? `技能专精等级${rank}` : `技能未专精`
    data.push({label: label, value: num.toString()})
    rank--
  }
  rank = 3

  for (const num of statisticalInfo[`${value}Mod`]) {
    if (rank === 0) {
      continue
    }
    const label = rank !== 0 ? `模组等级${rank}` : `未开启模组`
    data.push({label: label, value: num.toString()})
    rank--
  }

  allData.value.push({
    title: group.label,
    data: data
  })
}


/**
 * 根据材料最大星级对材料进行拆解计算
 * @param highestRarity  材料最大星级
 */
function splitMaterialByRarity(highestRarity) {
  itemCostList.value = splitMaterial(highestRarity, itemCostMap.value);
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

watch(props.modelValue,() =>  (newVal,oldValue) => {

  updateData(props.modelValue)
})


</script>

<template>

  <div class="operator-statistical-page">
    <v-card class="operator-statistical-card m-4" :title="group.title"
            v-for="(group,index) in allData" :key="index"
    >
      <div class="operator-statistical-item" v-for="(data,index) in group.data" :key="index">
        <span class="info-label">{{ data.label }}</span>
        <span class="info-value">{{ data.value }}</span>
      </div>
    </v-card>

    <div class="operator-statistical-card">
      <div class="detail-card-title">未招募干员</div>
      <div style="margin: 4px;display: flex;flex-wrap: wrap">
        <SpriteImage :image-name="operator.charId" original-size="180" display-size="40"
                     style="margin: 4px"
                     v-for="(operator) in notOwn"></SpriteImage>
      </div>
    </div>

    <div class="operator-statistical-card">
      <div class="detail-card-title">干员消耗理智排行</div>
      <OperatorInfo v-for="(item,index) in apCostRanking" :key="index" :operator-info="item"></OperatorInfo>
    </div>

    <div class="operator-statistical-card">
      <div class="detail-card-title">材料消耗情况</div>
      <div class="item-cost-data">
        <p style="">总计消耗{{ apCostCount.toFixed(0) }} 理智</p>
        <!--          材料统计-->
        <my-button data-color="orange" @click="splitMaterialByRarity(5)">不拆分</my-button>
        <my-button data-color="purple" @click="splitMaterialByRarity(4)">拆分材料到紫色品质</my-button>
        <my-button data-color="blue" @click="splitMaterialByRarity(3)">拆分材料到蓝色品质</my-button>
        <div class="item-cost-group" v-for="(itemList,type) in itemCostList" :key="type">
          <div class="item-cost-item" v-for="(item,index) in itemList" :key="index">
            <SpriteImage original-size="183" display-size="40" :image-name="item.id" style="margin: auto"></SpriteImage>
            <span class="item-cost-num">
                  {{ strShowLength(item.count) }}
            </span>
          </div>
        </div>
      </div>
    </div>

  </div>

</template>

<style scoped>

</style>