<script setup>
import {ref, watch} from "vue";
import '/src/assets/css/survey/operator.scss'
import '/src/assets/css/survey/operator.phone.scss'
import { statisticsOperatorInfo} from "/src/utils/survey/operatorStatistical"

const props = defineProps(["modelValue"]);

let operatorInfo = ref([])

function updateData(list) {

  const statisticsResult = statisticsOperatorInfo(list);

  const {info} = statisticsResult

  operatorInfo.value = _setData(info)[0]


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


watch(() =>props.modelValue.length,  (newVal, oldValue) => {
  console.log(newVal, oldValue)
  updateData(props.modelValue)
})

</script>


<template>

  <div class="operator-statistical-page flex justify-center flex-wrap m-a">
    <div class="operator-statistical-card m-0-8">
      <div class="operator-statistical-item" v-for="(data,index) in operatorInfo.data" :key="index">
        <span class="info-label">{{ data.label }}</span>
        <span class="info-value">{{ data.value }}</span>
      </div>
    </div>
  </div>

</template>