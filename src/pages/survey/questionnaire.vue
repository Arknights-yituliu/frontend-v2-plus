<script setup>
import {professionDict} from '/src/pages/survey/service/common.js'
import characterTable from '/src/static/json/survey/character_table_simple.json'
import {onMounted, ref} from "vue";
import '/src/assets/css/survey/questionnaire.scss'
import {cMessage} from "../../utils/message.js";
import surveyApi from '/src/api/survey.js'
import character_table_simple from "../../static/json/survey/character_table_simple.json";

let operatorGroupByProfession = new Map()

for (const charId in characterTable) {
  const character = characterTable[charId]
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

let operatorListByProfession = ref([])
let operatorTeam = ref([])
let charIdList = ref([])
let selectedProfession = ref('')

function chooseOperatorProfession(profession) {
  selectedProfession.value = profession
  operatorListByProfession.value = operatorGroupByProfession.get(profession)
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
  getCharIdList()
}


function removeOperator(operator) {
  operatorTeam.value = operatorTeam.value.filter(e => e.charId !== operator.charId)
  getCharIdList()
}


let professionCount = ref([])

function countOperatorByProfession() {

}


chooseOperatorProfession('SNIPER')

console.log(operatorGroupByProfession)

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

function uploadSubmitContent() {

  const data = {
    id: void 0,
    questionnaireType: 1,
    operatorList: charIdList.value
  }
  surveyApi.uploadQuestionnaireInfo(data)
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

const colorList = [
  '#ff8c00',
  '#ffb400',
  '#ffdc00',
  '#ffff00',
  '#00ff64',
  '#ffffff',
]

function getCharStatisticsResult() {
  surveyApi.getCharStatisticsResult().then((response) => {
    let {result, userCount, updateTime} = response.data
    for (const item of result) {
      const charId = item.charId
      let char_info = character_table_simple[charId]
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
    console.log(listOperatorSlice.value)
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

  console.log(listResult)
  return listResult
}

onMounted(() => {
  getCharStatisticsResult()
})

</script>


<template>

  <div class="questionnaire-page">


    <!-- <el-header>Header</el-header> -->

    <h1>你会选择哪些干员加入开荒队？</h1>
    <li>选择你的开荒干员，看看有多少博士所见略同！</li>
    <el-divider style="margin: 12px 0px;"></el-divider>
    <el-alert title="选择12位干员作为主力开荒队" type="info" :closable="false"
              description="如难以取舍，可再选择0-4位干员作为替补"
              style="margin: 8px 0px;"/>
    <!-- 下面一条提示记录登陆后不可见 -->
    <el-alert title="登录可使用更多功能" type="info" :closable="false"
              description="可在不同设备间同步，筛选已有/已精二的干员"
              style="margin: 8px 0px;"/>
    <el-alert title="您还未提交过本答卷" type="success" :closable="false" description="提交后可查看其他博士们的选择"
              style="margin: 8px 0px;"/>
    <el-alert title="您上次提交答卷是14天前" type="success" :closable="false" description="大数据仅统计60天内的答卷"
              style="margin: 8px 0px;"/>
    <!-- 若大于60天 -->
    <el-alert title="您上次提交答卷是114天前" type="warning" :closable="false"
              description="大数据仅统计60天内的答卷，您的答卷将保留，但不参与统计"
              style="margin: 8px 0px;"/>
    <!-- 干员选择区域 -->
    <div class="teams-area">
      <div class="team-box" style="padding-right:0px;">
        <div class="operator-team" id="team12">
          <div v-for="(operator, index) of operatorTeam" :key="index" class="operator-team-item">
            <div class="team-operator-avatar" @click="removeOperator(operator)">
              <div :class="`bg-${operator.charId}`"
                   style="background-color: #303030;box-shadow: 4px 4px 8px #00000080;">
              </div>
              <img src="/image/icon/cancel.png" alt="" class="cancel-icon">
            </div>
          </div>
          <div v-for="x in 12" class="operator-team-item item-placeholder">
            这是个占位符
          </div>
        </div>
        <div style="padding-left: 8px;">主编队 ( {{ operatorTeam.length }} / 12 ) *至少选择8位干员</div>
      </div>
      <!--          <div class="team_area" style="padding-left:0px;background-color: #707070b0;">-->
      <!--            <div class="operator-team" id="team4">-->
      <!--              <div v-for="x in 4" class="operator-team-item item_placeholder">-->
      <!--                这是个占位符-->
      <!--              </div>-->
      <!--            </div>-->
      <!--            <div style="padding-left: 8px;">替补干员 ( 0 / 4 )</div>-->
      <!--          </div>-->
    </div>
    <!-- 操作区 -->

    <el-button type="primary" :disabled="operatorTeam.length<8" style="margin: 4px 0px;">选好了！</el-button>
    <!--        <el-button type="primary" style="margin: 4px 0px;">选好了！</el-button>-->

    <!-- 这里塞一个筛选器，代码比较冗长，或许可以重写一下？ -->
    <div id="profession_filter" style="display: flex;">
      <div class="profession-filter-single" v-for="(p, index) in professionDict"
           @click="chooseOperatorProfession(p.value)">
        <img :src="`/image/survey/bg/${p.value}.png`" style="width:46px" alt="">
        <div class="profession-mask" v-show="p.value===selectedProfession"></div>
        <div class="profession-count">0</div>
      </div>

      <div id="profession_options">
        <el-checkbox label="只显示已有干员" border size=large type="info" round style="margin: 12px 8px;"/>
        <el-checkbox label="只显示已精二干员" border size=large round style="margin: 12px 8px;"/>
      </div>
    </div>
    <!-- 选择模块 -->
    <div class="operator-checkbox">
      <!--          &lt;!&ndash; 示例干员 &ndash;&gt;-->
      <!--          <div class="operator-option operator_selected">-->
      <!--            <div class="operator-avatar">-->
      <!--              <div class="bg-char_1013_chen2"></div>-->
      <!--            </div>-->
      <!--            <div class="operator_name_shell">-->
      <!--              <div class="operator_name">被选中的干员</div>-->
      <!--            </div>-->
      <!--          </div>-->
      <!--          &lt;!&ndash; 示例干员2 &ndash;&gt;-->
      <!--          <div class="operator-option operator_selected">-->
      <!--            <div class="operator-avatar">-->
      <!--              <div class="bg-char_1013_chen2"></div>-->
      <!--            </div>-->
      <!--            <div class="operator_name_shell">-->
      <!--              <div class="operator_name">被选中的八字干员</div>-->
      <!--            </div>-->
      <!--          </div>-->
      <!-- 正式区域 -->
      <div v-for="(operator, profession) of operatorListByProfession" :key="profession" class="operator-option"
           @click="chooseOperator(operator)" :class="selectedOperatorClass(operator.charId)">
        <div class="operator-avatar">
          <div :class="`bg-${operator.charId}`"></div>
        </div>
        <div class="operator-name">{{ operator.name }}</div>
        <!-- <span></span> -->
        <!-- <span>选择率：50%</span> -->
      </div>
    </div>

    <!--    <div class="survey-result-table">-->
    <!--      <div class="survey-result-table-title">-->
    <!--        <div class="survey-result-table-tr">-->
    <!--          <div class="survey-result-table-operator-name" >干员名称</div>-->
    <!--          <div class="w-100">开荒上场率</div>-->
    <!--          <div class="w-110">开荒平均练度</div>-->
    <!--          <div class="w-100">干员持有率</div>-->
    <!--        </div>-->
    <!--        <div class="survey-result-table-tr">-->
    <!--          <div class="survey-result-table-operator-name" >干员名称</div>-->
    <!--          <div class="w-100">开荒上场率</div>-->
    <!--          <div class="w-110">开荒平均练度</div>-->
    <!--          <div class="w-100">干员持有率</div>-->
    <!--        </div>-->
    <!--      </div>-->
    <!--      <div class="survey-result-table-content">-->
    <!--        <div class="survey-result-table-content-item" v-for="(list,index) in listOperatorSlice" :key="index">-->
    <!--          <div v-for="(operator,index) in list" :key="index" class="survey-result-table-tr">-->
    <!--            <div class="survey-result-table-operator-name"  style="">-->
    <!--              <div class="survey-result-table-avatar">-->
    <!--                <div :class="`bg-${operator.charId}`"></div>-->
    <!--                <img :src="`/image/survey/bg/${operator.profession}.png`"-->
    <!--                     class="profession-icon-w-20" alt="" >-->
    <!--                <span>-->
    <!--                 {{operator.name}}-->
    <!--              </span>-->
    <!--              </div>-->

    <!--            </div>-->
    <!--            <div class="w-100">{{ operator.appearanceRate.toFixed(1) }} %</div>-->
    <!--            <div class="w-110">精英2 Lv.30</div>-->
    <!--            <div class="w-100">{{ (operator.own * 100).toFixed(1) }} %</div>-->
    <!--          </div>-->
    <!--        </div>-->
    <!--      </div>-->
    <!--    </div>-->


    <!-- 个人结果展示模块 -->
    <div id="survey_result_personal" class="survey-result-personal" >
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


    <div class="survey-ranking-table" style="display: none">
      <div v-for="(group,index) in listOperatorGroupByAttendance" :key="index" class="survey-ranking-tier">
        <div class="survey-ranking-tier-interval" :style="`background-color: ${colorList[index]}`">
          {{ group.interval }}
        </div>
        <div class="survey-ranking-tier-operators">
          <div v-for="(operator,index) in group.list" :key="index" class="survey-ranking-tier-avatar">
            <div :class="`bg-${operator.charId}`"></div>
          </div>
        </div>
      </div>
    </div>

  </div>

</template>