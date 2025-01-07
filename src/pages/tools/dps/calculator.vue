<script setup>
import '/src/assets/css/tool/dps_calculator.scss'
import {getOperatorInfo, operatorList} from "/src/pages/tools/dps/getOperatorInfo.js";
import {filterOperatorList, operatorFilterCondition} from "/src/utils/survey/operatorFilter.js";
import deepClone from "@/utils/deepClone.js";
import {ref} from "vue";
import {debounce} from "@/utils/debounce.js";
import OperatorAvatar from "@/components/sprite/OperatorAvatar.vue";
import SkillIcon from "@/components/sprite/SkillIcon.vue";


const displayOperatorFilterCondition = ['profession', 'rarity']


const operatorProgression = {
  charId: 'char_1039_thorn2',
  level: 0,
  phase: 2,
  potentialRank: 1,
  skillIndex: 1,
  skillRank: 1,
  data: {}
}


let selectedOperator = ref({})

addOperator('char_1039_thorn2')

function addOperator(charId) {

  selectedOperator.value[charId] = getOperatorInfo(charId)
}

let operatorCheckBoxDialog = ref(false)


let displayOperatorList = ref([])

/**
 * 筛选干员
 * @param func 筛选函数
 * @param index 传入筛选条件索引
 */
const addFilterConditionAndFilterOperator = debounce((func, index) => {
  func(index)
  displayOperatorList.value = filterOperatorList(operatorList)

}, 500)

addFilterConditionAndFilterOperator(operatorFilterCondition.value.profession.actionFunc, 7)


/**
 * 根据按钮点击状态返回按钮样式
 * @param action 状态
 * @returns {string} 按钮样式
 */
function btnAction(action) {
  if (!action) {
    return "tonal"
  }
}

function isActive(current, value) {
  if (current === value) {
    return "active"
  }
}

</script>

<template>
  <div class="dps-calculator-page">
    <v-card title="选择干员" class="operator-card">
      <v-card-text>
        <v-list>
          <v-list-item v-for="(operator,index) in selectedOperator" :key="index">
            <v-list>
              <v-list-item title="头像">
                <OperatorAvatar :char-id="operator.charId" size="60" class="m-0-8">
                </OperatorAvatar>
              </v-list-item>
              <v-list-item title="潜能等级">
                <img :src="`/image/survey/rank/potential${i+1}.png`" alt=""
                     v-for="i in [0,1,2,3,4,5]" :key="i"
                     class="potential-icon disabled" :class="isActive(i,operator.potentialRank)"
                     @click="operator.potentialRank=i">
              </v-list-item>
              <v-list-item title="选择技能与技能等级">
                <div class="flex">
                    <SkillIcon :icon="skill.iconId" v-for="(skill,index) in operator.skills"
                               class="m-4 disabled" @click="operator.skillIndex=index" :class="isActive(index,operator.skillIndex)"></SkillIcon>
                   <div class="spacer-40"></div>
                  <img :src="`/image/survey/rank/skill-rank-${i}.png`" alt=""
                       v-for="i in [0,1,2,3]" :key="i"
                       class="skill-rank-icon disabled" :class="isActive(i,operator.skillRank)"
                       @click="operator.skillRank=i">
                </div>
              </v-list-item>
            </v-list>
          </v-list-item>
        </v-list>
        <div>
          <v-btn color="primary" variant="tonal" text="增加干员" @click="operatorCheckBoxDialog = true"></v-btn>
        </div>
      </v-card-text>
    </v-card>

    <v-dialog v-model="operatorCheckBoxDialog" max-width="800">
      <v-card text="选择干员"  class="m-a">
        <v-card-text>
          <div class="flex flex-wrap" v-for="(conditions,module) in operatorFilterCondition" :key="module"
               v-show="displayOperatorFilterCondition.includes(module)">
            <v-btn variant="text" class="m-4">{{ conditions.label }}</v-btn>
            <v-btn color="primary" :variant="btnAction(condition.action)"
                   class="m-4" rounded="x-large"
                   v-for="(condition,index) in conditions.conditions" :key="index"
                   @click="addFilterConditionAndFilterOperator(conditions.actionFunc,index)">
              {{ condition.label }}
            </v-btn>
          </div>
          <div class="flex flex-wrap">
            <OperatorAvatar v-for="(item,index) in displayOperatorList" :char-id="item.charId" size="50" class="m-4"
                            @click="addOperator(item.charId)"></OperatorAvatar>
          </div>
        </v-card-text>
      </v-card>
    </v-dialog>
  </div>
</template>