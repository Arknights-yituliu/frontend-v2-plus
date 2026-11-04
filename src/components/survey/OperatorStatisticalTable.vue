<script setup>
import {ref, watch} from "vue";
import OperatorBar from "/src/components/survey/OperatorBar.vue";
import '/src/assets/css/survey/operator.scss'
import '/src/assets/css/survey/operator.phone.scss'
import {statisticsOperatorInfo, splitMaterialByTier} from "/src/utils/survey/operatorStatistical"
import { getOperatorAvatarUrl } from "/src/utils/arknightsResource.js";
import { dateFormat } from "/src/utils/dateUtil.js";
import ItemImage from "/src/components/sprite/ItemImage.vue";


const props = defineProps(["modelValue"]);

let operatorInfo = ref([])
let apCost = ref(0) //理智消耗数量
let itemCostCollectOriginal = ref([])
let itemCostCollectData = ref([])
let apCostRankingData = ref([])
let notOwnData = ref([])
let activeStatisticsView = ref('operator')

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

  <div class="operator-statistical-page">
    <div class="operator-statistics-toggle-wrap">
      <v-btn-toggle v-model="activeStatisticsView" mandatory color="primary" class="operator-statistics-toggle">
        <v-btn class="operator-statistics-toggle-btn" value="operator">干员统计</v-btn>
        <v-btn class="operator-statistics-toggle-btn" value="material">材料消耗情况</v-btn>
        <v-btn class="operator-statistics-toggle-btn" value="apCostRanking">干员消耗理智排行</v-btn>
      </v-btn-toggle>
    </div>

    <div v-show="activeStatisticsView === 'operator'" class="operator-statistics-view operator-statistics-card-grid">
      <v-card class="operator-statistical-card" :title="group.title"
              v-for="(group,index) in operatorInfo" :key="index">
        <v-card-text>
          <div class="operator-statistical-item" v-for="(data,index) in group.data" :key="index">
            <span class="info-label">{{ data.label }}</span>
            <span class="info-value">{{ data.value }}</span>
          </div>
        </v-card-text>
      </v-card>

      <v-card class="operator-statistical-card operator-not-own-card" title="未招募干员">
        <div class="operator-not-own-list">
          <div class="operator-not-own-item" v-for="operator in notOwnData" :key="operator.charId">
            <img class="operator-not-own-avatar" :src="getOperatorAvatarUrl(operator.charId)"
                 :alt="operator.name" loading="lazy">
            <div class="operator-not-own-name" :title="operator.name">{{ operator.name }}</div>
            <div class="operator-not-own-date" v-if="operator.date">{{ dateFormat(operator.date) }} 实装</div>
          </div>
        </div>
      </v-card>
    </div>

    <div v-show="activeStatisticsView === 'material'" class="operator-statistics-view operator-material-cost-view">
      <div class="item-cost-data">
        <p class="operator-material-cost-summary">总计消耗{{ apCost.toFixed(0) }} 理智</p>
        <div class="operator-material-split-actions">
          <v-btn color="orange" @click="splitMaterialByRarity(5)">不拆分</v-btn>
          <v-btn color="purple" @click="splitMaterialByRarity(4)">拆分材料到紫色品质</v-btn>
          <v-btn color="blue" @click="splitMaterialByRarity(3)">拆分材料到蓝色品质</v-btn>
        </div>
        <div class="item-cost-group" v-for="(list,tier) in itemCostCollectData" :key="tier">
          <div class="item-cost-item" v-for="(item,index) in list" :key="index">
            <ItemImage :item-id="item.id" style="margin: auto"></ItemImage>
            <span class="item-cost-num">
                {{ strShowLength(item.count) }}
          </span>
          </div>
        </div>
      </div>
    </div>

    <div v-show="activeStatisticsView === 'apCostRanking'" class="operator-statistics-view operator-ap-cost-rank-list">
      <OperatorBar v-for="(item,index) in apCostRankingData" :key="index" :operator-info="item"></OperatorBar>
    </div>

  </div>

</template>

<style scoped>
/* 未招募干员列表：头像 + 名称 + 实装日期的小卡片网格 */
.operator-not-own-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding: 16px;
}

.operator-not-own-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 92px;
  box-sizing: border-box;
  padding: 8px 6px 7px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 10px;
  background-color: rgba(var(--v-theme-on-surface), 0.03);
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}

.operator-not-own-item:hover {
  border-color: rgba(var(--v-theme-on-surface), 0.24);
  box-shadow: 0 6px 16px rgba(var(--v-theme-on-surface), 0.16);
  transform: translateY(-2px);
}

.operator-not-own-avatar {
  display: block;
  width: 64px;
  height: 64px;
  border-radius: 6px;
  object-fit: cover;
}

.operator-not-own-name {
  width: 100%;
  margin-top: 6px;
  overflow: hidden;
  color: rgb(var(--v-theme-on-surface));
  font-size: 12px;
  font-weight: 600;
  line-height: 16px;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.operator-not-own-date {
  margin-top: 2px;
  color: rgba(var(--v-theme-on-surface), 0.62);
  font-size: 10px;
  line-height: 14px;
  white-space: nowrap;
}

@media screen and (max-width: 600px) {
  .operator-not-own-list {
    gap: 10px;
    padding: 12px;
  }

  .operator-not-own-item {
    width: 80px;
    padding: 6px 4px 6px;
  }

  .operator-not-own-avatar {
    width: 56px;
    height: 56px;
    border-radius: 5px;
  }

  .operator-not-own-name {
    margin-top: 4px;
    font-size: 11px;
    line-height: 14px;
  }
}
</style>
