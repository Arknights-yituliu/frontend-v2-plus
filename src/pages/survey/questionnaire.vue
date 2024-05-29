<script setup>
import { professionDict } from '/src/pages/survey/service/common.js'
import characterTable from '/src/static/json/survey/character_table_simple.json'
import { onMounted, ref } from "vue";
import '/src/assets/css/survey/questionnaire.scss'
import { cMessage } from "../../custom/message.js";
import surveyApi from '/src/api/survey.js'

let operatorGroupByProfession = new Map()

for (const charId in characterTable) {
  const character = characterTable[charId]
  const { profession, rarity } = character
  console.log(profession)
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


function removeOperator(operator) {
  operatorTeam.value = operatorTeam.value.filter(e => e.charId !== operator.charId)
}

chooseOperatorProfession('SNIPER')

console.log(operatorGroupByProfession)

function uploadSubmitContent() {

  let operatorList = []
  for (const o of operatorTeam.value) {
    operatorList.push(o.charId)
  }

  const data = {
    id: void 0,
    questionnaireType: 1,
    operatorList: operatorList
  }
  surveyApi.uploadQuestionnaireInfo(data)
}



</script>


<template>
  <div class="questionnaire-page">

    <div class="question">

      <div class="question-title">你会选择哪些干员加入开荒队？</div>
      <div class="info">
        选择你的开荒干员，看看有多少博士所见略同！<br>选择12位干员作为主力，还可以选择0-4位替补<br>*为保证统计数据的准确性，请先登录<br>*可以登录账号以在不同设备间同步<br>*您上次提交答卷是 114
        天前，统计时仅采用90天以内的答卷。</div>
      <div class="teams_area">
        <div class="team_area" style="padding-right:0px;">
          <div class="operator-team" id="team12">
            <div v-for="(operator, index) of operatorTeam" :key="index" class="operator-team-item">
              <div class="team-operator-avatar" @click="removeOperator(operator)">
                <div :class="`bg-${operator.charId}`"
                  style="background-color: #303030;box-shadow: 4px 4px 4px #00000080;"></div>
                <img src="/image/icon/cancel.png" alt="" class="cancel-icon">
              </div>
            </div>
            <div v-for="x in 12" class="operator-team-item item_placeholder">
              这是个占位符
            </div>
          </div>
          <div>主编队 (7/12)</div>
        </div>

        <div class="team_area" style="padding-left:0px;background-color: #707070;">
          <div class="operator-team" id="team4">
            <div v-for="x in 4" class="operator-team-item item_placeholder">
              这是个占位符
            </div>
          </div>
          <div style="padding-left: 8px;">替补干员(0/4)</div>
        </div>
      </div>
      <el-button type="primary" disabled>选好了！</el-button>
      <el-button type="primary">选好了！</el-button>
      <el-button type="primary">修改编队</el-button>
      <br>
      <el-checkbox  label="只显示已有干员" border />
      <el-checkbox  label="只显示已精二干员" border />
      <!-- <button @click="uploadSubmitContent()">上传</button> -->
      <!-- 这里塞一个筛选器 -->
      <div id="profession_filter" style="display: flex;">
        <div class="profession_filter_single" style="width: 60px;height: 60px;position: relative;background-color: black;padding: 0px 6px;">
          <img src="/image/survey/bg/PIONEER.png" width="60px">
          <div class="profession_mask"
            style="height: 100%;width: 64px;background: linear-gradient(to top, rgba(127, 127, 255, 1) 5%, rgba(63, 63, 127, 0.8) 5%, rgba(0, 0, 0, 0) 40%);position:absolute;bottom:0px;right:4px;">
          </div>
          <div class="profession_count"
            style="color: white;position:absolute;bottom:2px;right:8px;background-color: rgba(0, 0, 0, 0);">0</div>
        </div>
        <div class="profession_filter_single" style="width: 60px;height: 60px;position: relative;background-color: black;padding: 0px 6px;">
          <img src="/image/survey/bg/WARRIOR.png" width="60px">
          <!-- <div class="profession_mask" style="height: 100%;width: 100%;background: linear-gradient(to top, rgba(127, 127, 255, 1) , rgba(0, 0, 0, 0) 33%);position:absolute;bottom:0px;right:0px;"></div> -->
          <div class="profession_count"
            style="color: white;position:absolute;bottom:2px;right:4px;background-color: rgba(0, 0, 0, 0.5);">0</div>
        </div>
        <div class="profession_filter_single" style="width: 60px;height: 60px;position: relative;background-color: black;padding: 0px 6px;">
          <img src="/image/survey/bg/TANK.png" width="60px">
          <!-- <div class="profession_mask" style="height: 100%;width: 100%;background: linear-gradient(to top, rgba(127, 127, 255, 1) , rgba(0, 0, 0, 0) 33%);position:absolute;bottom:0px;right:0px;"></div> -->
          <div class="profession_count"
            style="color: white;position:absolute;bottom:2px;right:4px;background-color: rgba(0, 0, 0, 0.5);">0</div>
        </div>
        <div class="profession_filter_single" style="width: 60px;height: 60px;position: relative;background-color: black;padding: 0px 6px;">
          <img src="/image/survey/bg/SNIPER.png" width="60px">
          <!-- <div class="profession_mask" style="height: 100%;width: 100%;background: linear-gradient(to top, rgba(127, 127, 255, 1) , rgba(0, 0, 0, 0) 33%);position:absolute;bottom:0px;right:0px;"></div> -->
          <div class="profession_count"
            style="color: white;position:absolute;bottom:2px;right:4px;background-color: rgba(0, 0, 0, 0.5);">0</div>
        </div>
        <div class="profession_filter_single" style="width: 60px;height: 60px;position: relative;background-color: black;padding: 0px 6px;">
          <img src="/image/survey/bg/CASTER.png" width="60px">
          <!-- <div class="profession_mask" style="height: 100%;width: 100%;background: linear-gradient(to top, rgba(127, 127, 255, 1) , rgba(0, 0, 0, 0) 33%);position:absolute;bottom:0px;right:0px;"></div> -->
          <div class="profession_count"
            style="color: white;position:absolute;bottom:2px;right:4px;background-color: rgba(0, 0, 0, 0.5);">0</div>
        </div>
        <div class="profession_filter_single" style="width: 60px;height: 60px;position: relative;background-color: black;padding: 0px 6px;">
          <img src="/image/survey/bg/MEDIC.png" width="60px">
          <!-- <div class="profession_mask" style="height: 100%;width: 100%;background: linear-gradient(to top, rgba(127, 127, 255, 1) , rgba(0, 0, 0, 0) 33%);position:absolute;bottom:0px;right:0px;"></div> -->
          <div class="profession_count"
            style="color: white;position:absolute;bottom:2px;right:4px;background-color: rgba(0, 0, 0, 0.5);">1</div>
        </div>
        <div class="profession_filter_single" style="width: 60px;height: 60px;position: relative;background-color: black;padding: 0px 6px;">
          <img src="/image/survey/bg/SUPPORT.png" width="60px">
          <!-- <div class="profession_mask" style="height: 100%;width: 100%;background: linear-gradient(to top, rgba(127, 127, 255, 1) , rgba(0, 0, 0, 0) 33%);position:absolute;bottom:0px;right:0px;"></div> -->
          <div class="profession_count"
            style="color: white;position:absolute;bottom:2px;right:4px;background-color: rgba(0, 0, 0, 0.5);">1</div>
        </div>
        <div class="profession_filter_single" style="width: 60px;height: 60px;position: relative;background-color: black;padding: 0px 6px;">
          <img src="/image/survey/bg/SPECIAL.png" width="60px">
          <!-- <div class="profession_mask" style="height: 100%;width: 100%;background: linear-gradient(to top, rgba(127, 127, 255, 1) , rgba(0, 0, 0, 0) 33%);position:absolute;bottom:0px;right:0px;"></div> -->
          <div class="profession_count"
            style="color: white;position:absolute;bottom:2px;right:4px;background-color: rgba(0, 0, 0, 0.5);">0</div>
        </div>
      </div>

      <!-- 原有的职业筛选模块 -->
      <div class="profession-checkbox">
        <c-button v-for="(p, index) in professionDict" :key="index" @click="chooseOperatorProfession(p.value)"
          style="margin: 4px">
          {{ p.label }}
        </c-button>
      </div>
      <!-- 选择模块 -->
      <div class="operator-checkbox">
        <!-- 示例干员 -->
        <div  class="operator-option operator_selected">
          <div class="operator-avatar">
            <div class="bg-char_1013_chen2"></div>
          </div>
          <div class="operator_name_shell">
            <div class="operator_name">被选中的干员</div>
          </div>
        </div>
        <!-- 示例干员2 -->
        <div  class="operator-option operator_selected">
          <div class="operator-avatar">
            <div class="bg-char_1013_chen2"></div>
          </div>
          <div class="operator_name_shell">
            <div class="operator_name">被选中的八字干员</div>
          </div>
        </div>
        <!-- 正式区域 -->
        <div v-for="(operator, profession) of operatorListByProfession" :key="profession" class="operator-option"
          @click="chooseOperator(operator)">
          <div class="operator-avatar">
            <div :class="`bg-${operator.charId}`"></div>
          </div>
          <div class="operator_name_shell">
            <div class="operator_name">{{ operator.name }}</div>
          </div>

          <!-- <span></span> -->
          <!-- <span>选择率：50%</span> -->
        </div>
      </div>
      <!-- 个人结果展示模块 -->
      <div id="survey_result_personal">
        <div class="survey_result_operator"
          style="border: 1px solid #00000040;border-radius: 16px;height: 96px;width: 480px;">
          <div class="survey_result_avatar" style="width: 96px;height: 96px;display: inline-block;">
            <div class="bg-char_103_angel"
              style="background-color:chocolate;border-radius: 20px;scale: 0.4;position: relative;top: -42px;left: -42px;display: inline-block;">
            </div>
          </div>
          <div class="survey_result_info"
            style="display: inline-block;vertical-align: top;position: relative;left: 0px;top: 12px;width: 180px;">
            <img src="/image/survey/bg/SNIPER.png" width="24px">
            <div class="survey_result_info_profession"
              style="display: inline-block;vertical-align: top;padding: 2px 4px;font-size: 16px;">SNIPER</div>
            <div class="survey_result_info_name" style="font-size: 24px;line-height: 22px;">
              这是七字干员名
            </div>
            <img src="/image/survey/bg/rarity-6.png" height="20px"
              style="position: relative;left: -2px;padding-top: 2px;">
          </div>
          <div class="survey_result_set"
            style="height:72px;display: inline-block;vertical-align: top;position: relative;left: 0px;top: 12px;border-left: 1px dashed #00000020;padding-left: 8px;">
            <div class="survey_result_text_line">开荒上场率：10%</div>
            <div class="survey_result_text_line">开荒平均练度：精二 Lv.60</div>
            <div class="survey_result_text_line">干员持有率：90%</div>
          </div>
        </div>
        <div class="survey_result_operator"
          style="border: 1px solid #00000040;border-radius: 16px;height: 96px;width: 480px;">
          <div class="survey_result_avatar" style="width: 96px;height: 96px;display: inline-block;">
            <div class="bg-char_103_angel"
              style="background-color:chocolate;border-radius: 20px;scale: 0.4;position: relative;top: -42px;left: -42px;display: inline-block;">
            </div>
          </div>
          <div class="survey_result_info"
            style="display: inline-block;vertical-align: top;position: relative;left: 0px;top: 12px;width: 180px;">
            <img src="/image/survey/bg/SNIPER.png" width="24px">
            <div class="survey_result_info_profession"
              style="display: inline-block;vertical-align: top;padding: 2px 4px;font-size: 16px;">SNIPER</div>
            <div class="survey_result_info_name" style="font-size: 24px;line-height: 22px;">
              这是七字干员名
            </div>
            <img src="/image/survey/bg/rarity-6.png" height="20px"
              style="position: relative;left: -2px;padding-top: 2px;">
          </div>
          <div class="survey_result_set"
            style="height:72px;display: inline-block;vertical-align: top;position: relative;left: 0px;top: 12px;border-left: 1px dashed #00000020;padding-left: 8px;">
            <div class="survey_result_text_line">开荒上场率：10%</div>
            <div class="survey_result_text_line">开荒平均练度：精二 Lv.60</div>
            <div class="survey_result_text_line">干员持有率：90%</div>
          </div>
        </div>
      </div>
      <!-- 全站结果展示模块 -->
      这里是使用率最高的前50名干员，可以用tier maker的形式
      <!-- 先大概看下统计结果，然后看看怎么划段分级 -->
      <div id="survey_result_all">
        <div class="survey_result_all_tier" style="height: 72px;">
          <div class="tier_title" style="width: 96px;height: 96px;display: inline-block;">>15%</div>
          <div class="survey_result_avatar" style="width: 96px;height: 96px;display: inline-block;">
            <div class="bg-char_103_angel"
              style="background-color:chocolate;border-radius: 20px;scale: 0.4;position: relative;top: -42px;left: -42px;display: inline-block;">
            </div>
          </div>
          <div class="survey_result_avatar" style="width: 96px;height: 96px;display: inline-block;">
            <div class="bg-char_103_angel"
              style="background-color:chocolate;border-radius: 20px;scale: 0.4;position: relative;top: -42px;left: -42px;display: inline-block;">
            </div>
          </div>
        </div>
        <div class="survey_result_all_tier" style="height: 72px;">
          <div class="tier_title" style="width: 96px;height: 96px;display: inline-block;">>10%</div>
          <div class="survey_result_avatar" style="width: 96px;height: 96px;display: inline-block;">
            <div class="bg-char_103_angel"
              style="background-color:chocolate;border-radius: 20px;scale: 0.4;position: relative;top: -42px;left: -42px;display: inline-block;">
            </div>
          </div>
          <div class="survey_result_avatar" style="width: 96px;height: 96px;display: inline-block;">
            <div class="bg-char_103_angel"
              style="background-color:chocolate;border-radius: 20px;scale: 0.4;position: relative;top: -42px;left: -42px;display: inline-block;">
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

</template>