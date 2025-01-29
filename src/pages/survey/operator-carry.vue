<script setup>
import {professionDict} from '/src/utils/survey/common.js'
import {operatorTable} from "/src/utils/gameData.js";
import {onMounted, ref} from "vue";
import '/src/assets/css/survey/questionnaire.scss'
import {cMessage} from "/src/utils/message.js";
import questionnaireAPI from "/src/api/questionnaire.js";
import OperatorAvatar from "@/components/sprite/OperatorAvatar.vue";
import operatorProgressionStatisticsDataCache from "@/utils/indexedDB/operatorProgressionStatisticsData.js";
import {formatNumber} from "/src/utils/format.js";
import {dateFormat} from "@/utils/dateUtil.js";

let operatorGroupByProfession = new Map()

for (const charId in operatorTable) {
  const character = operatorTable[charId]
  const {profession, rarity} = character
  if (rarity < 4) {
    continue
  }
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
  questionnaireAPI.uploadQuestionnaireInfo(data).then(response=>{
    cMessage('提交成功')
  })
}

function selectedOperatorClass(charId) {
  if (charIdList.value.indexOf(charId) < 0) {
    return ''
  } else {
    return 'operator-selected'
  }
}

const headers = [
  {title: '序号', sortable: false, key: 'index'},
  {title: '干员', sortable: false, key: 'charId'},
  {title: '携带人数', sortable: true, key: 'carryCount'},
  {title: '携带率', sortable: true, key: 'carryRate'},
  {title: '持有人数', sortable: true, key: 'ownCount'},
  {title: '持有率', sortable: true, key: 'own'},
]

let listOperators = ref([])
let operatorCarryResult = ref([])
let updateTime = ref('')
let carryRateSampleSize = ref('')
let ownSampleSize = ref('')


async function getOperatorCarryStatisticsResult() {
  const data = await operatorProgressionStatisticsDataCache.getData();
  questionnaireAPI.getQuestionnaireResult(1).then(response => {
    operatorCarryResult.value = []
    updateTime.value = dateFormat(response.data.updateTime, 'yyyy/MM/dd HH:mm')
    carryRateSampleSize.value = response.data.sampleSize
    const carryRateData = new Map()
    for (const item of response.data.list) {
      const {charId, carryRate} = item
      carryRateData.set(charId, carryRate)
    }

    for (let item of data.result) {
      ownSampleSize.value = data.userCount
      const carryRate = carryRateData.get(item.charId);
      if (carryRate) {
        item.carryRate = carryRate
        item.carryCount = formatNumber(carryRateSampleSize.value * carryRate, 0)
        item.ownCount = formatNumber(item.own * ownSampleSize.value, 0)
        operatorCarryResult.value.push(item)
      }
    }

    operatorCarryResult.value.sort((a, b) => b.carryRate - a.carryRate)
  })
}

getOperatorCarryStatisticsResult()


onMounted(() => {

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

    <v-expansion-panels class="m-4">
      <v-expansion-panel
          title="Q&A"
          color="primary"
      >
        <v-expansion-panel-text>
        <p class="font-bold m-12-0">Q：这个问卷是干什么的</p>
        <p>A：用于收集博士心目中的最强开荒队伍</p>
        <p class="font-bold m-12-0">Q：填写要求</p>
        <p>A：提交的干员数量至少6位，至多可填12位</p>
        <p class="font-bold m-12-0">Q：可以当练卡参考吗</p>
        <p>A：由于提交的博士每个人的玩法有差异，有博士倾向日常挂机，也有博士倾向肉鸽，故本问卷的调查结果仅供参考</p>
        <p class="font-bold m-12-0">Q：如果我想再填一份怎么办</p>
        <p>A：7天内提交的结果是可以被覆盖的</p>
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>



    <div class="operator-form-and-checkbox">
      <v-card title="选出你心目中的最强编队" class="operator-form">
        <v-card-text>
          <div class="flex flex-wrap justify-center">
            <div v-for="(operator, index) of operatorTeam" :key="index" class="operator-team-item"
                 @click="removeOperator(operator)">
              <OperatorAvatar :char-id="operator.charId" size="80" mobile-size="44"></OperatorAvatar>
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
          <div class="flex justify-center">
            <img :src="`/image/survey/bg/${p.value}.png`" alt=""
                 class="profession-option"
                 v-for="(p, index) in professionDict"
                 @click="chooseOperatorProfession(p.value)">
          </div>
          <div class="flex flex-wrap justify-center">
            <div v-for="(operator, profession) of displayOperatorList" :key="profession" class="operator-option"
                 @click="chooseOperator(operator)" >
              <OperatorAvatar :char-id="operator.charId" size="60" mobile-size="50"></OperatorAvatar>
              <div :class="selectedOperatorClass(operator.charId)" >

              </div>
            </div>
          </div>
        </v-card-text>
      </v-card>
    </div>

    <v-card class="m-a" max-width="700">
      <v-card-text>
        <v-chip color="primary" :text="`更新时间：${updateTime}`" class="m-4"></v-chip>
        <v-chip color="primary" :text="`携带率样本量：${carryRateSampleSize}`" class="m-4"></v-chip>
        <v-chip color="primary" :text="`持有率样本量：${ownSampleSize}`" class="m-4"></v-chip>
        <v-data-table
            :headers="headers"
            :items="operatorCarryResult"
            hide-default-footer
            items-per-page="-1">
          <template v-slot:item="{item,index}">
            <tr>
              <td>{{ index + 1 }}</td>
              <td>
                <OperatorAvatar :char-id="item.charId"></OperatorAvatar>
              </td>
              <td>{{item.carryCount}}</td>
              <td>{{ formatNumber(item.carryRate * 100, 2) }}%</td>
              <td>{{item.ownCount}}</td>
              <td>{{ formatNumber(item.own * 100, 2) }}%</td>
            </tr>
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>


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