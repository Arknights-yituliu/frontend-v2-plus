<script setup>


import {ref,  watch} from "vue";
import OperatorInfo from "/src/components/OperatorInfo.vue";
import MyButton from "/src/components/Button.vue";

const props = defineProps(["modelValue", 'statisticalData']);
import operatorStatistical from "/src/pages/survey/service/operatorStatistical"
import SpriteImage from "/src/components/SpriteImage.vue";


let allData = ref([])


function updateData() {
  allData.value = []
  const operatorGroup = [
    {label: '全部干员', value: 'all'},
    {label: '6⭐干员', value: 'rarity6'},
    {label: '5⭐干员', value: 'rarity5'},
    {label: '4⭐干员', value: 'rarity4'}
  ]

  for (const item of operatorGroup) {
    setData(item)
  }

  itemCostList.value = props.modelValue.itemCostList
  itemCostMap.value = props.modelValue.itemCostMap
  apCostCount.value = props.modelValue.apCostCount
}

function setData(group) {
  let value = group.value

  let data = [{
    label: '招募干员数量',
    value: `${props.modelValue[`${value}Own`]}/${props.modelValue[`${value}Count`]}`
  }]
  let rank = 2
  for (const num of props.modelValue[`${value}Elite`]) {
    data.push({label: `精英阶段${rank}干员`, value: num.toString()})
    rank--
  }
  rank = 3
  for (const num of props.modelValue[`${value}Skill`]) {
    if (rank === 0) {
      continue
    }
    const label = rank !== 0 ? `技能专精等级${rank}` : `技能未专精`
    data.push({label: label, value: num.toString()})
    rank--
  }
  rank = 3
  for (const num of props.modelValue[`${value}Mod`]) {
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

let itemCostList = ref([]) //材料消耗数量
let apCostCount = ref(0) //理智消耗数量
let itemCostMap = ref({}) //材料消耗数量

/**
 * 根据材料最大星级对材料进行拆解计算
 * @param highestRarity  材料最大星级
 */
function splitMaterialByRarity(highestRarity) {
  itemCostList.value = operatorStatistical.splitMaterial(highestRarity, itemCostMap.value);
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

watch(() => props.modelValue, () => {
  updateData()
})


</script>

<template>

  <div class="statistical-popup-container">
    <div class="detail-card" v-for="(group,index) in allData" :key="index">
      <div class="detail-card-title">{{ group.title }}</div>
      <div class="operator-info-table">
        <div class="operator-info-item" v-for="(data,index) in group.data" :key="index">
          <span class="info-label">{{ data.label }}</span>
          <span class="info-value">{{ data.value }}</span>
        </div>
      </div>
    </div>

    <div class="detail-card">
      <div class="detail-card-title">干员消耗理智排行</div>
      <OperatorInfo v-for="(item,index) in modelValue.apCostRanking" :key="index" :operator-info="item"></OperatorInfo>
    </div>

    <div class="detail-card">
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