<script setup>
import {professionDict} from '/src/utils/survey/common.js'
import {operatorTable} from "/src/utils/gameData.js";
import {onMounted, ref, watch} from "vue";
import '/src/assets/css/survey/questionnaire.scss'
import {createMessage} from "/src/utils/message.js";
import questionnaireAPI from "/src/api/questionnaire.js";
import OperatorAvatar from "/src/components/sprite/OperatorAvatar.vue";
import operatorProgressionStatisticsDataCache from "/src/utils/indexedDB/operatorProgressionStatisticsData.js";
import {formatNumber} from "/src/utils/format.js";
import {NDatePicker} from 'naive-ui'
import {dateFormat} from "@/utils/dateUtil.js";

let operatorGroupByProfession = new Map()

let operatorNameMap = new Map()

for (const charId in operatorTable) {
  const character = operatorTable[charId]
  const {profession, rarity, name} = character
  if (rarity < 4) {
    continue
  }
  operatorNameMap.set(charId, name)
  let list = operatorGroupByProfession.get(profession);
  if (list) {
    list.push(character)
    operatorGroupByProfession.set(profession, list)
  } else {
    operatorGroupByProfession.set(profession, [character])
  }
}

operatorGroupByProfession.forEach((v) => {
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
    createMessage({type: 'error', text: '不能选择超过12位干员'})
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

  // const initData = [
  //   {count: 0, value: "PIONEER"},
  //   {count: 0, value: "WARRIOR"},
  //   {count: 0, value: "TANK"},
  //   {count: 0, value: "SNIPER"},
  //   {count: 0, value: "CASTER"},
  //   {count: 0, value: "MEDIC"},
  //   {count: 0, value: "SUPPORT"},
  //   {count: 0, value: "SPECIAL"},
  // ]

  for (const {charId} of operatorTeam.value) {

    list.push(charId)
  }
  charIdList.value = list

}

let gameModuleCode = ref('101')

function uploadQuestionnaire() {
  const data = {
    questionnaireCode: gameModuleCode.value,
    operatorList: charIdList.value
  }
  questionnaireAPI.uploadQuestionnaireInfo(data).then(response => {

    createMessage({type: 'success', text: '提交成功'})
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
  {title: '使用次数', sortable: true, key: 'carryCount'},
  {title: '使用率', sortable: true, key: 'carryRate'},
  {title: '持有率', sortable: true, key: 'own'},
]

let listOperators = ref([])
let operatorCarryResult = ref({})
let operatorOwnMap = new Map()

let operatorCarryResultGroupByModule = {
  101: {},
  102: {},
  103: {},
}

let ownDataLoadingStatus = ref(false)


operatorProgressionStatisticsDataCache.getData().then(response => {
  const {result} = response
  for (const item of result) {

    operatorOwnMap.set(item.charId, item.own)
  }
  ownDataLoadingStatus.value = true;
  getOperatorCarryDataByModuleAndTime()

});


let selectedGameModuleCode = ref('101')
let selectedTimeGranularity = ref({code: 31, label: "过去7天内"})

const timeGranularity = [
  {code: 0, label: "自收集数据开始—至今"},
  {code: 31, label: "过去7天内"},
  {code: 32, label: "过去14天内"}
]

const OperatorCarryDataCache = ref({})

let dateRange = ref([new Date(Date.now() - 60 * 60 * 24 * 14 * 1000).getTime(), Date.now()])

function getOperatorCarryDataByModuleAndTime() {
  const cacheKey = selectedGameModuleCode.value + "-" + selectedTimeGranularity.value.code
  const dataCache = OperatorCarryDataCache.value[cacheKey];
  // if (dataCache) {
  //   formatOperatorCarryData(dataCache)
  //   return
  // }

  // const data = {
  //   questionnaireType:selectedGameModuleCode.value,
  //   startTime:dateRange.value[0],
  //   endTime:
  // }

  dateRange.value[1] = _adjustToLastSecond(dateRange.value[1])

  questionnaireAPI.getQuestionnaireResultV2(selectedGameModuleCode.value, dateRange.value).then(response => {
    const data = response.data;
    OperatorCarryDataCache.value[cacheKey] = data


    formatOperatorCarryData(data)
  })

  // 将时间戳调整到当天的 23:59:59
  function _adjustToLastSecond(timestamp) {
    const date = new Date(timestamp);
    date.setHours(23, 59, 59, 999); // 设置时间为 23:59:59.999
    return date.getTime();
  }
}

watch([() => dateRange.value[0], () => dateRange.value[1]], ([newStartTime, newEndTime]) => {
  getOperatorCarryDataByModuleAndTime()
})


function formatOperatorCarryData(data) {
  let {list, questionnaireType, questionnaireCode, sampleSize} = data
  // list = list.sort((a,b)=>b.carryCount-a.carryCount)
  let voList = []
  for (let item of list) {
    const {charId, carryCount} = item
    const carryRate = formatNumber(carryCount / sampleSize * 100, 2)
    const ownRate = operatorOwnMap.get(charId)
    const vo = {
      name: operatorNameMap.get(charId),
      charId: charId,
      carryCount: carryCount,
      carryRate: `${carryRate}%`,
      ownRate: `${ownRate}%`,
    }
    voList.push(vo)
  }

  operatorCarryResult.value = {
    questionnaireCode: questionnaireCode,
    questionnaireType: questionnaireType,
    sampleSize: sampleSize,
    voList: voList,
  }
}


let lineChartDialog = ref(false)


function getOperatorCarryRateDailyData(charId) {

  lineChartDialog.value = true
  let xData = []
  let yData = []

  const data = {
    questionnaireCode: selectedGameModuleCode.value,
    charId: charId,
    start: dateRange.value[0],
    end: dateRange.value[1],
  }


  questionnaireAPI.getOperatorCarryRateDailyData(data).then(response => {

    const lineChart = echarts.init(document.getElementById('carry-rate-chart'));


    const {list, date} = response.data
    for (let item of list) {
      const {carryCount, sampleSize} = item
      yData.push(formatNumber(carryCount / sampleSize * 100, 2))
    }

    for (const item of date) {
      xData.push(dateFormat(item))
    }

    const options = {
      title: {
        text: `${operatorNameMap.get(charId)}的携带率变化趋势`,
        left: 'center'
      },
      tooltip: {
        show: true,
        trigger: 'axis', // 触发方式为坐标轴触发
        alwaysShowContent: true, // 始终显示提示框
      },
      xAxis: {
        type: 'category',
        data: xData
      },
      yAxis: {
        type: 'value'
      },
      series: [{
        data: yData, // 确保数据是数组
        type: 'line',
        label: {
          show: true, // 显示数据标签
          position: 'top', // 标签位置（例如柱状图顶部）
          formatter: '{c}%', // 显示 y 轴的值（{c} 表示当前数据值）
          textStyle: {
            fontSize: '10'
          }
        },

      }]
    }

    console.log(lineChart)

    lineChart.setOption(options)
  })


}


onMounted(() => {

  //

  // const intervalId = setInterval(()=>{
  //   changeOperatorCarryDataByModule()
  //   if(ownDataLoadingStatus.value){
  //     clearInterval(intervalId); // 停止定时器
  //   }
  // }, 1000);

  getOperatorCarryDataByModuleAndTime()

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
        border="start"
        type="info"
        title="填写前须知"
        variant="tonal"
        density="compact"
    >
      <p class="font-bold m-12-0">Q：这个问卷是干什么的？可以当练卡参考吗？</p>
      <p>A：用于收集博士各模式优先携带的干员。由于提交的博士每个人的玩法有差异，故本问卷的调查结果仅供参考。</p>
      <p class="font-bold m-12-0">Q：需要登录吗？需要填满12人吗？如果我想再填一份怎么办？</p>
      <p>A：无需登录。最少填上6人即可提交。7天内提交的结果是可以被覆盖的。</p>
      <p class="font-bold m-12-0">Q：集成战略以那个主题为主？怎么填写</p>
      <p>A：考虑到时效性的问题，以当前主题为主要权重。集成战略模式填写你的高抓位干员。</p>
    </v-alert>


    <div class="operator-form-and-checkbox">
      <v-card title="选择各模式下会优先携带/高抓位的干员" class="operator-form">
        <v-card-text>
          <v-radio-group
              v-model="gameModuleCode"
              inline
              density="compact"
          >
            <v-radio
                label="主线&SideStory"
                value="101"
            ></v-radio>
            <v-radio
                label="集成战略"
                value="102"
            ></v-radio>
            <v-radio
                label="高难模式"
                value="103"
            ></v-radio>
          </v-radio-group>

          <div class="flex flex-wrap justify-center">
            <div v-for="(operator, index) of operatorTeam" :key="index" class="operator-team-item"
                 @click="removeOperator(operator)">
              <OperatorAvatar :char-id="operator.charId" :size="80" :mobile-size="44"></OperatorAvatar>
              <img src="/image/icon/cancel.png" alt="" class="cancel-icon">

            </div>
            <div v-for="x in placeholder" :key="x" class="operator-team-item item-placeholder">
              未选择
            </div>
          </div>

          <div class="flex justify-center">
            <v-btn color="primary" text="上传编队" @click="uploadQuestionnaire()"></v-btn>
          </div>
        </v-card-text>

      </v-card>

      <v-card title="待选干员" class="operator-checkbox">
        <v-card-text>
          <div class="flex justify-center">
            <img :src="`/image/survey/bg/${p.value}.png`" alt=""
                 class="profession-option"
                 v-for="(p, index) in professionDict"
                 :key="index"
                 @click="chooseOperatorProfession(p.value)">
          </div>
          <div class="flex flex-wrap justify-center">
            <div v-for="(operator, profession) of displayOperatorList" :key="profession" class="operator-option"
                 @click="chooseOperator(operator)">
              <OperatorAvatar :border="true" :char-id="operator.charId" :rarity="operator.rarity" :size="60"
                              :mobile-size="40"></OperatorAvatar>
              <div>{{ operator.name }}</div>
              <div :class="selectedOperatorClass(operator.charId)"></div>
            </div>
          </div>
        </v-card-text>
      </v-card>
    </div>


    <v-card class="m-a" max-width="700">
      <v-card-text>

        <v-radio-group
            v-model="selectedGameModuleCode"
            inline
            density="compact"
            @change="getOperatorCarryDataByModuleAndTime()"
        >
          <v-radio
              label="主线&SideStory"
              value="101"
          ></v-radio>
          <v-radio
              label="集成战略"
              value="102"
          ></v-radio>
          <v-radio
              label="高难模式"
              value="103"
          ></v-radio>
        </v-radio-group>

        <!--        <v-select-->
        <!--            density="compact"-->
        <!--            label="时间区间" color="primary"-->
        <!--            :items="timeGranularity"-->
        <!--            item-value="code"-->
        <!--            item-title="label"-->
        <!--            return-object-->
        <!--            v-model="selectedTimeGranularity"-->
        <!--            @update:modelValue="getOperatorCarryDataByModuleAndTime()"-->
        <!--        ></v-select>-->

        <n-date-picker v-model:value="dateRange" type="daterange" clearable/>
        <!--         {{dateRange}}-->
        <v-chip color="primary" :text="`提交人数：${operatorCarryResult.sampleSize}`" class="m-4"></v-chip>


        <v-data-table
            :headers="headers"
            :items="operatorCarryResult.voList"
            hide-default-footer
            items-per-page="-1"
            class="v-mobile-table">
          <template v-slot:item="{item,index}">
            <tr>
              <td>{{ index + 1 }}</td>
              <td>
<!--                <div class="operator-info">-->
<!--                  <OperatorAvatar :border="true" :char-id="item.charId" :size="50" class="m-4-a"></OperatorAvatar>-->
<!--                  {{ item.name }}-->
<!--                </div>-->


                  <OperatorAvatar :border="true" :char-id="item.charId" :size="50" class="m-4-0"></OperatorAvatar>


              </td>

              <td>
                {{ item.carryCount }}
              </td>
              <td>{{ item.carryRate }}</td>
              <td>{{ item.ownRate }}</td>
            </tr>
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>


    <v-dialog v-model="lineChartDialog" max-width="700">
      <v-card>
        <v-card-text>
          <div class="carry-rate-line-chart" id="carry-rate-chart">
          </div>
        </v-card-text>
      </v-card>
    </v-dialog>


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