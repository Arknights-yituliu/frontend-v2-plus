<script setup>
import {professionDict} from '/src/utils/survey/common.js'
import {operatorTable} from "/src/utils/gameData.js";
import {onMounted, ref} from "vue";
import '/src/assets/css/survey/questionnaire.scss'
import {cMessage} from "/src/utils/message.js";
import operatorDataAPI from '/src/api/operatorData.js'
import questionnaireAPI from "/src/api/questionnaire.js";
import OperatorAvatar from "@/components/sprite/OperatorAvatar.vue";

let operatorGroupByProfession = new Map()

for (const charId in operatorTable) {
  const character = operatorTable[charId]
  const {profession, rarity} = character
  // if (rarity < 6) continue
  let list = operatorGroupByProfession.get(profession);
  if (list) {
    list.push(character)
    operatorGroupByProfession.set(profession, list)
  } else {
    operatorGroupByProfession.set(profession, [character])
  }
}

operatorGroupByProfession.forEach((v, k) => {
  v.sort((a, b) => b.rarity - a.rarity)
})

let displayOperatorList = ref([])
let operatorTeam = ref([])
let charIdList = ref([])
let selectedProfession = ref('')
let placeholder = ref(12)

function chooseOperatorProfession(profession) {
  selectedProfession.value = profession
  displayOperatorList.value = operatorGroupByProfession.get(profession)
}

function chooseOperator(operator) {
  if (operatorTeam.value.length > 11) {
    cMessage('不能选择超过12位干员', 'error')
    return;
  }

  for (const o of operatorTeam.value) {
    if (o.name === operator.name) {
      removeOperator(operator)
      return
    }
  }
  operatorTeam.value.push(operator)
  placeholder.value--
  getCharIdList()
}


function removeOperator(operator) {
  operatorTeam.value = operatorTeam.value.filter(e => e.charId !== operator.charId)
  placeholder.value++
  getCharIdList()
}




chooseOperatorProfession('SNIPER')


function getCharIdList() {
  let list = []

  const initData = [
    {count: 0, value: "PIONEER"},
    {count: 0, value: "WARRIOR"},
    {count: 0, value: "TANK"},
    {count: 0, value: "SNIPER"},
    {count: 0, value: "CASTER"},
    {count: 0, value: "MEDIC"},
    {count: 0, value: "SUPPORT"},
    {count: 0, value: "SPECIAL"},
  ]

  for (const {charId, profession} of operatorTeam.value) {

    list.push(charId)
  }
  charIdList.value = list

}

function uploadQuestionnaire() {
  const data = {
    questionnaireType: 1,
    operatorList: charIdList.value
  }
  questionnaireAPI.uploadQuestionnaireInfo(data)
}

function selectedOperatorClass(charId) {
  if (charIdList.value.indexOf(charId) < 0) {
    return ''
  } else {
    return 'operator-selected'
  }
}

let listOperatorSlice = ref([]);
let listOperators = ref([])



function getCharStatisticsResult() {
  operatorDataAPI.getCharStatisticsResult().then((response) => {
    let {result, userCount, updateTime} = response.data
    for (const item of result) {
      const charId = item.charId
      let char_info = operatorTable[charId]
      item.name = char_info.name
      item.rarity = char_info.rarity
      item.profession = char_info.profession
      item.itemObtainApproach = char_info.itemObtainApproach
      item.skill = char_info.skill
      item.equip = char_info.equip

      if (item.rarity < 6) {
        item.appearanceRate = Math.floor(Math.random() * 41)
      } else {
        item.appearanceRate = Math.floor(Math.random() * 100)
      }
    }

    result = result.filter(e => e.rarity === 6).sort((a, b) => {
      return b.appearanceRate - a.appearanceRate
    })

    listOperatorGroupByAttendance.value = operatorsGroupByAttendance(result, 17)

    const sliceLength = Math.ceil(result.length / 2)

    listOperators.value = result
    listOperatorSlice.value.push(result.slice(0, sliceLength))
    listOperatorSlice.value.push(result.slice(sliceLength))
  });
}

let listOperatorGroupByAttendance = ref([])

function operatorsGroupByAttendance(list, interval) {

  // 初始化分组结果数组
  let listResult = [];

  // 计算总共需要的分组数
  let totalGroups = Math.ceil(100 / interval);

  // 从最大值开始，向最小值遍历创建分组

  for (const item of list) {
    const quotient = Math.floor(item.appearanceRate / interval)
    const index = totalGroups - quotient - 1
    if (!listResult[index]) {
      listResult[index] = {
        interval: `T${index}`,
        list: []
      }
    }
    listResult[index].list.push(item)
  }

  return listResult
}

onMounted(() => {
  getCharStatisticsResult()
})

</script>


<template>

  <div class="questionnaire-page">


    <!-- <el-header>Header</el-header> -->

    <!--    <h1>你会选择哪些干员加入开荒队？</h1>-->
    <!--    <p>选择你的开荒干员，看看有多少博士所见略同！</p>-->
    <!--    <v-divider ></v-divider>-->
    <!--    <el-alert title="选择12位干员作为主力开荒队" type="info" :closable="false"-->
    <!--              description="如难以取舍，可再选择0-4位干员作为替补"-->
    <!--              style="margin: 8px 0px;"/>-->
    <!--    &lt;!&ndash; 下面一条提示记录登陆后不可见 &ndash;&gt;-->
    <!--    <el-alert title="登录可使用更多功能" type="info" :closable="false"-->
    <!--              description="可在不同设备间同步，筛选已有/已精二的干员"-->
    <!--              style="margin: 8px 0px;"/>-->
    <!--    <el-alert title="您还未提交过本答卷" type="success" :closable="false" description="提交后可查看其他博士们的选择"-->
    <!--              style="margin: 8px 0px;"/>-->
    <!--    <el-alert title="您上次提交答卷是14天前" type="success" :closable="false" description="大数据仅统计60天内的答卷"-->
    <!--              style="margin: 8px 0px;"/>-->
    <!--    &lt;!&ndash; 若大于60天 &ndash;&gt;-->
    <!--    <el-alert title="您上次提交答卷是114天前" type="warning" :closable="false"-->
    <!--              description="大数据仅统计60天内的答卷，您的答卷将保留，但不参与统计"-->
    <!--              style="margin: 8px 0px;"/>-->

    <v-alert
        title="Alert title"
        type="info"
        class="m-12-0"
    >

      <p>1.提交的干员数量必须大于6人</p>
      <p>2.由于提交的博士每个人的玩法差异较大，故本问卷的调查结果仅供参考，并不能认为是一个权威榜单</p>

    </v-alert>

    <div class="operator-form-and-checkbox">
      <v-card title="选择12位你开荒时会优先选择的干员" class="operator-form">
        <v-card-text>
          <div class="flex flex-wrap justify-center">
            <div v-for="(operator, index) of operatorTeam" :key="index" class="operator-team-item"
                 @click="removeOperator(operator)">
              <OperatorAvatar :char-id="operator.charId" size="80" mobile-size="80"></OperatorAvatar>
              <img src="/image/icon/cancel.png" alt="" class="cancel-icon">

            </div>
            <div v-for="x in placeholder" class="operator-team-item item-placeholder">
              未选择
            </div>
          </div>
          <div class="flex justify-center">
            <v-btn color="primary" text="上传编队" @click="uploadQuestionnaire()"></v-btn>
          </div>
        </v-card-text>

      </v-card>

      <v-card class="operator-checkbox">
        <v-card-text>
          <div>
            <img :src="`/image/survey/bg/${p.value}.png`" alt=""
                 class="profession-option"
                 v-for="(p, index) in professionDict"
                 @click="chooseOperatorProfession(p.value)">
          </div>
          <div class="flex flex-wrap justify-center">
            <div v-for="(operator, profession) of displayOperatorList" :key="profession" class="operator-option"
                 @click="chooseOperator(operator)" :class="selectedOperatorClass(operator.charId)">
              <OperatorAvatar :char-id="operator.charId" size="60" mobile-size="60"></OperatorAvatar>
            </div>
          </div>
        </v-card-text>
      </v-card>
    </div>

    <v-data-table hide-default-footer items-per-page="-1">

    </v-data-table>

    <!-- 个人结果展示模块 -->
    <div id="survey_result_personal" class="survey-result-personal" style="display: none">
      <div class="survey-result-operator" v-for="(operator,index) in listOperators.slice(0,12)" :key="index">
        <div class="survey-result-avatar" style="">
          <div :class="`bg-${operator.charId}`">
          </div>
        </div>
        <div class="survey-result-info"
             style="">
          <img src="/image/survey/bg/SNIPER.png" alt="" class="survey-result-info-profession-icon">
          <div class="survey-result-info-profession"
               style="">SNIPER
          </div>
          <div class="survey-result-info-name" style="">
            {{ operator.name }}
          </div>
          <img :src="`/image/survey/bg/rarity-${operator.rarity}.png`" class="survey-result-rarity-icon" alt="">
        </div>
        <div class="survey-result-data"
             style="">
          <div class="survey_result_text_line">开荒上场率：{{ operator.appearanceRate.toFixed(1) }}%</div>
          <div class="survey_result_text_line">开荒平均练度：精二 Lv.60</div>
          <div class="survey_result_text_line">干员持有率：90%</div>
        </div>
      </div>
    </div>
    <!-- 全站结果展示模块 -->
    <!--    这里是使用率最高的前50名干员，可以用tier maker的形式-->
    <!-- 先大概看下统计结果，然后看看怎么划段分级 -->




  </div>

</template>