<script setup>
import '/src/assets/css/tool/schedule.css'
import '/src/assets/css/tool/building_skill.css'

import {operatorFilterConditionTable} from "/src/pages/tools/skillFilter";
import building_table from '/src/static/json/build/building_table.json'
import {ref} from "vue";

const COLOR = {BLUE: 'blue'}

let selectBtnKey = ref({})
let selectedOperatorList = ref({})

function filterBtnStatus(key, label) {
  return selectBtnKey.value === `${key}+${label}`
}

/**
 * 筛选干员
 * @param condition
 * @param key 选项的分类名
 */
function filterOperatorList(condition, key) {
  selectBtnKey.value = `${key}+${condition.label}`
  selectedOperatorList.value = {}
  for (const operator of building_table) {
    if (condition.func(operator)){
      if(!selectedOperatorList.value[operator.charId]){
        selectedOperatorList.value[operator.charId] = []
      }
      console.log(selectedOperatorList.value[operator.charId])
      selectedOperatorList.value[operator.charId].push(operator)
    }

  }
}

</script>
<template>

  <div class="filter-condition-box">
    <div class="condition-bar" v-for="(room,key) in operatorFilterConditionTable" v-show="room.display" :key="key">
      <span :style="`color:${room.color}`">{{ room.name }}</span>
      <c-button v-for="(condition,index) in room.conditions" :key="index"
                :color="COLOR.BLUE" :status="filterBtnStatus(key,condition.label)"
                @click="filterOperatorList(condition,key)">
        {{ condition.label }}
      </c-button>
    </div>
  </div>

  <div class="skill-card" v-for="(skills,index) in selectedOperatorList" :key="index">
    <div class="building-operator-name">{{skills[0].name}}</div>
    <div v-for="(skill,index) in skills" :key="index">
       {{skill.buffName}}
    </div>
  </div>


</template>
