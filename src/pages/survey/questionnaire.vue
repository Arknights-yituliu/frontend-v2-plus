<script setup>
import {professionDict} from '/src/pages/survey/service/common.js'
import characterTable from '/src/static/json/survey/character_table_simple.json'
import {onMounted, ref} from "vue";
import '/src/assets/css/survey/questionnaire.scss'
import {cMessage} from "../../custom/message.js";
import surveyApi from '/src/api/survey.js'

let operatorGroupByProfession = new Map()

for (const charId in characterTable) {
  const character = characterTable[charId]
  const {profession, rarity} = character
  console.log(profession)
  if (rarity < 6) continue
  let list = operatorGroupByProfession.get(profession);
  if (list) {
    list.push(character)
    operatorGroupByProfession.set(profession, list)
  } else {
    operatorGroupByProfession.set(profession, [character])
  }
}


let operatorListByProfession = ref([])
let operatorTeam = ref([])

function chooseOperatorProfession(profession) {
  operatorListByProfession.value = operatorGroupByProfession.get(profession)
}

function chooseOperator(operator) {
  console.log(operatorTeam.value)
  for (const o of operatorTeam.value) {
    if (o.name === operator.name) {
      cMessage("不可重复选择同一干员", 'error')
      return
    }
  }

  operatorTeam.value.push(operator)
}


chooseOperatorProfession('SNIPER')

console.log(operatorGroupByProfession)

function uploadSubmitContent() {

  let operatorList = []
  for(const o of operatorTeam.value){
    operatorList.push(o.charId)
  }

  const data = {
    id: void 0,
    questionnaireType:1,
    operatorList:operatorList
  }
  surveyApi.uploadQuestionnaireInfo(data)
}



</script>


<template>
  <div class="questionnaire-page">

    <div class="question">

      <h1>攻略新地图时，你会选择哪12位干员？</h1>
      <div class="operator-team">
        <div v-for="(operator,index) of operatorTeam" :key="index"
             class="operator-team-item">
          <div class="operator-avatar">
            <div :class="`bg-${operator.charId}`"></div>
          </div>
        </div>
      </div>

      <button @click="uploadSubmitContent()">上传</button>

      <div class="profession-checkbox">
        <c-button v-for="(p,index) in professionDict" :key="index"
                  @click="chooseOperatorProfession(p.value)" style="margin: 4px">
          {{ p.label }}
        </c-button>
      </div>

      <div class="operator-checkbox">
        <div v-for="(operator,profession) of operatorListByProfession" :key="profession"
             class="operator-option" @click="chooseOperator(operator)">
          <div class="operator-avatar">
            <div :class="`bg-${operator.charId}`"></div>
          </div>
          <span>{{ operator.name }}</span>
          <span>选择率：50%</span>
        </div>
      </div>
    </div>
  </div>

</template>