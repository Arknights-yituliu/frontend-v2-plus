<template>


  <div class="control_bar_wrap">
    搜索干员： <input v-model="cal_operator_name" @input="queryOperator()" class="input">
    <c-button :color="'blue'" :status="true" @click="planCal()" :style="btn_style">
      开始计算
    </c-button>


    <div class="query_result_wrap">
      <div class="query_result" v-for="(result,index) in  query_result" :key="index"
           @click="updateOperatorPopup(result.index)">
        <div class="avatar_image_wrap" style="left: 20px">
          <div :class="getAvatarSprite(result.id)"></div>
          <div class="query_result_name">
            {{ result.name }}
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="control_bar_wrap">
    筛选材料
    <c-button :color="'blue'" :status="itemFilterCondition.unused" :style="btn_style"
              @click="addItemFilterCondition('unused')">
      未使用材料
    </c-button>
    <c-button :color="'blue'" :status="itemFilterCondition.rarity.includes(5)" :style="btn_style"
              @click="addItemFilterCondition('rarity',5)">
      橙色
    </c-button>
    <c-button :color="'blue'" :status="itemFilterCondition.rarity.includes(4)" :style="btn_style"
              @click="addItemFilterCondition('rarity',4)">
      紫色
    </c-button>
    <c-button :color="'blue'" :status="itemFilterCondition.rarity.includes(3)" :style="btn_style"
              @click="addItemFilterCondition('rarity',3)">
      蓝色
    </c-button>
    <c-button :color="'blue'" :status="itemFilterCondition.rarity.includes(2)" :style="btn_style"
              @click="addItemFilterCondition('rarity',2)">
      绿色
    </c-button>
    <c-button :color="'blue'" :status="itemFilterCondition.rarity.includes(1)" :style="btn_style"
              @click="addItemFilterCondition('rarity',1)">
      白色
    </c-button>
    <c-button :color="'blue'" :status="itemFilterCondition.chip" :style="btn_style"
              @click="addItemFilterCondition('chip')">
      芯片
    </c-button>
    <c-button :color="'blue'" :status="itemFilterCondition.book" :style="btn_style"
              @click="addItemFilterCondition('book')">
      技巧概要
    </c-button>
  </div>

  <div class="control_bar_wrap">
    <div class="query_result_title"> 已选择干员</div>
    <div v-for="(plan,charId) in operator_plan" :key="charId" class="query_result">
      <div class="avatar_image_wrap" style="left: 20px">
        <div :class="getAvatarSprite(charId)"></div>
        <div class="query_result_name">
          {{ plan.name }}
        </div>
        <div class="delete_icon" @click="deletePlan(charId)">
          <i class="menu_button_desktop iconfont icon-error" style="color: white;font-size: 20px"></i>
        </div>
      </div>
    </div>
  </div>


  <c-collapse :name="'item'" :visible="true" :style="'width:98%;margin:auto'">
    <template #title>
      <div class="plan_detail_title">展开干员练度计划明细</div>
    </template>
    <div v-for="(operator,charId) in operator_plan_detail" :key="charId">
      <div class="avatar_image_wrap query_result">
        <div :class="getAvatarSprite(charId)"></div>
      </div>

      <table>
        <tbody>
        <tr v-for="(plan,index) in operator.cost" :key="index">
          <td>{{ plan.text }}</td>
          <td v-for="(count,id) in  plan.cost" :key="id">
            <div class="item_image_wrap_small">
              <div :class="`bg-${id} item_image_small`"></div>
              <div class="cal_item_count">x{{ count }}</div>
            </div>

          </td>
        </tr>
        </tbody>
      </table>

    </div>
  </c-collapse>

  <c-popup v-model="operator_popup_visible" :width="'500px'" :height="'500px'">
    <div class="plan_popup_card">
      <div class="plan_popup_title">
        <div class="avatar_image_wrap">
          <div :class="getAvatarSprite(operator_popup_data.charId)"></div>
        </div>
        <div class="cal_operator_name">{{ operator_popup_data.name }}</div>
      </div>
      <div class="option_column_wrap">
        <!--      练度项目-->
        <div class="option_column">
          <div class="option_row">
            <div class="option">
              <img :src="`/image/survey/rank/elite${operator_popup_data.elite}.png`" class="skill_rank">
            </div>
          </div>
          <div class="option_row">
            <div class="option_small">
              通用技能
            </div>
          </div>
          <div class="option_row" v-for="(skill,index) in operator_popup_data.skill" :key="index">
            <div class="option">
              <div :class="getSkillSprite(skill.iconId)"
                   @click="updateOperatorData(operator_popup_data.charId,`skill${index+1}`,0)">
              </div>
              <img :src="`/image/survey/skill-rank-${operator_popup_data[`skill${index+1}`]}.jpg`"
                   v-show="operator_popup_data[`skill${index+1}`]>0" class="skill_rank_icon">
            </div>
          </div>

          <div class="option_row" v-for="(equip,index) in operator_popup_data.equip" :key="index">
            <div class="option">
              {{ `${equip.typeName1}-${equip.typeName2}` }}
            </div>
          </div>
        </div>
        <!--      当前练度-->
        <div class="option_column">
          <div class="option_row">
            <div class="option" v-for="rank in [0,1,2]" :key="rank"
                 @click="updateOperatorData(operator_popup_data.charId,`elite`,rank)"
                 :class="dataOptionClass(rank,operator_popup_data.charId,`elite`)">
              <img :src="`/image/survey/rank/elite${rank}.png`" class="skill_rank">
            </div>
          </div>

          <div class="option_row">
            <div class="option_small" v-for="rank in [1,2,3,4,5,6,7]" :key="rank"
                 @click="updateOperatorData(operator_popup_data.charId,`mainSkill`,rank)"
                 :class="dataOptionClass(rank,operator_popup_data.charId,`mainSkill`)">
              {{ rank }}
            </div>
          </div>

          <div class="option_row" v-for="(skill,index) in operator_popup_data.skill" :key="index">
            <div class="option" v-for="rank in [1,2,3]" :key="rank"
                 @click="updateOperatorData(operator_popup_data.charId,`skill${index+1}`,rank)"
                 :class="dataOptionClass(rank,operator_popup_data.charId,`skill${index+1}`)">
              <img :src="`/image/survey/rank/skill-rank-${rank}.png`" class="skill_rank"/>
            </div>
          </div>

          <div class="option_row" v-for="(equip,index) in operator_popup_data.equip" :key="index">
            <div class="option" v-for="rank in [1,2,3]" :key="rank"
                 @click="updateOperatorData(operator_popup_data.charId,`mod${equip.typeName2}`,rank)"
                 :class="dataOptionClass(rank,operator_popup_data.charId,`mod${equip.typeName2}`)">
              <img :src="`/image/survey/rank/mod-rank-${rank}.png`" class="mod_rank"/>
            </div>
          </div>
        </div>

        <!--      计划练度-->
        <div class="option_column">
          <div class="option_row">
            <div class="option" v-for="rank in [0,1,2]" :key="rank"
                 @click="updateOperatorPlan(operator_popup_data.charId,`elite`,rank)"
                 :class="planOptionClass(rank,operator_popup_data.charId,`elite`)">
              <img :src="`/image/survey/rank/elite${rank}.png`" class="skill_rank">
            </div>
          </div>

          <div class="option_row">
            <div class="option_small" v-for="rank in [1,2,3,4,5,6,7]" :key="rank"
                 @click="updateOperatorPlan(operator_popup_data.charId,`mainSkill`,rank)"
                 :class="planOptionClass(rank,operator_popup_data.charId,`mainSkill`)">
              {{ rank }}
            </div>
          </div>

          <div class="option_row" v-for="(skill,index) in operator_popup_data.skill" :key="index">
            <div class="option" v-for="rank in [1,2,3]" :key="rank"
                 @click="updateOperatorPlan(operator_popup_data.charId,`skill${index+1}`,rank)"
                 :class="planOptionClass(rank,operator_popup_data.charId,`skill${index+1}`)">
              <img :src="`/image/survey/rank/skill-rank-${rank}.png`" class="skill_rank"/>
            </div>
          </div>

          <div class="option_row" v-for="(equip,index) in operator_popup_data.equip" :key="index">
            <div class="option" v-for="rank in [1,2,3]" :key="rank"
                 @click="updateOperatorPlan(operator_popup_data.charId,`mod${equip.typeName2}`,rank)"
                 :class="planOptionClass(rank,operator_popup_data.charId,`mod${equip.typeName2}`)">
              <img :src="`/image/survey/rank/mod-rank-${rank}.png`" class="mod_rank"/>
            </div>
          </div>
        </div>
      </div>
    </div>
  </c-popup>

  <div class="item_info_card_wrap">
    <div class="item_info_card" v-for="(item,index) in item_info" :key="index"
         :class="`rarity_${item.rarity}`" v-show="item.show">
      <div class="item_info_card_left">
        <div class="item_image_wrap">
          <div :class="getItemSprite(item.id)">
          </div>
        </div>
        <div class="item_name">{{ item.name }}</div>
      </div>
      <div class="item_info_card_right">
        <div class="item_input">库存：<input class="input" style="width: 60px;" v-model="item.own"></div>
        <div class="item_input">需求：<input class="input" style="width: 60px;" v-model="item.need"></div>
        <div class="item_input">缺口：{{ item.cost }}</div>
      </div>
    </div>
  </div>

</template>

<script setup>
// eslint-disable-next-line no-unused-vars
import item_list from '/src/static/json/survey/item_list.json'
import item_init_list from '/src/static/json/survey/item_init_table.json'
import character_list from '/src/static/json/survey/character_list.json'
import {onMounted, ref} from "vue";
import {cMessage} from "../../custom/message";
import surveyApi from "../../api/surveyUser";
import operatorStatistics from "/src/pages/survey/operatorStatistics"
import operator_cost_table from '/src/static/json/survey/operator_item_cost_table.json'

// 用户数据
let userData = ref({userName: "未登录", status: -100, token: void 0});  //用户信息


/**
 * 获取本地缓存的用户信息
 */
function getCacheUserData() {
  let cacheData = localStorage.getItem("globalUserData");
  if (cacheData == void 0 || cacheData == 'undefined') {
    // cMessage('未登录或登录失效', 'error')
  } else {
    userData.value = JSON.parse(cacheData);
  }
}

let operator_list = ref(character_list);   //干员列表

function getOperatorData() {
  //检查是否登录
  if (checkUserStatus(false)) return;

  const data = {token: userData.value.token}

  //根据一图流的token查询用户填写的干员数据
  surveyApi.getSurveyOperatorData(data).then((response) => {
    let list = response.data; //后端返回的数据
    let obj = {}
    for (const item of list) {
      obj[item.charId] = item
    }

    //转为前端的数据格式
    for (let index in operator_list.value) {
      if (obj[operator_list.value[index].charId]) {
        const e = obj[operator_list.value[index].charId]
        if (!e.own) continue;
        operator_list.value[index].elite = e.elite;
        operator_list.value[index].level = e.level;
        operator_list.value[index].potential = e.potential;
        operator_list.value[index].mainSkill = e.mainSkill;
        operator_list.value[index].skill1 = e.skill1;
        operator_list.value[index].skill2 = e.skill2;
        operator_list.value[index].skill3 = e.skill3;
        operator_list.value[index].modX = e.modX;
        operator_list.value[index].modY = e.modY;
        operator_list.value[index].modD = e.modD;
        operator_list.value[index].own = e.own;
      }
    }
    // statisticsCollapse()
    cMessage("导入了 " + list.length + " 条数据");
  });
}

let character_id_menu = ref([])
let cal_operator_name = ref('')
let query_result = ref([])

/**
 * 搜索干员
 */
function queryOperator() {
  query_result.value = []
  if (cal_operator_name.value === '') return;
  for (const e of character_id_menu.value) {
    if (e.name.indexOf(cal_operator_name.value) > -1) {
      query_result.value.push(e)
    }
  }

}


/**
 * 获取干员目录
 */
function getOperatorMenu() {
  character_id_menu.value = []
  for (const index in character_list) {
    character_id_menu.value.push({
      index: index,
      name: character_list[index].name,
      id: character_list[index].charId
    })
  }
}

let operator_popup_visible = ref(false)
let operator_popup_index = ref(0)
let operator_popup_data = ref({})
let operator_plan = ref({})
let operator_data = ref({})

function updateOperatorPopup(index) {
  // console.log(operator_popup_visible.value)
  operator_popup_visible.value = true;
  let operator = operator_list.value[index]
  const char_id = operator.charId
  operator_popup_index.value = index
  operator_popup_data.value = operator
  operator_data.value[char_id] = operator
  operator_plan.value[char_id] = JSON.parse(JSON.stringify(operator))
  operator_plan.value[char_id].cost = operator_cost_table[char_id]
}



function deletePlan(charId) {
  delete operator_plan.value[charId]
  delete operator_data.value[charId]
  planCal()
}

function updateOperatorData(char_id, property, new_value) {
  operator_popup_data.value[property] = new_value
}

function dataOptionClass(current, char_id, property) {
  if (current === operator_popup_data.value[property]) return 'option_bg_selected'
  return ''
}

function updateOperatorPlan(char_id, property, new_value) {
  if (new_value <= operator_popup_data.value[property]) {
    cMessage('不能比现有练度低哦')
    return;
  }
  operator_plan.value[char_id][property] = new_value
  operator_plan.value[char_id].show = true
}

function planOptionClass(current, char_id, property) {
  if (operator_plan.value[char_id] == void 0) return ''
  if (current === operator_plan.value[char_id][property]) return 'option_bg_selected'
  return ''
}

function planCal() {
  const {itemList, apCostCount, itemMap} = operatorStatistics.operatorPlanCal(operator_data.value, operator_plan.value)

  for (const index in item_info.value) {
    const id = item_info.value[index].id
    if (itemMap[id]) {
      item_info.value[index].need = itemMap[id].count
    }
  }

  planDetail()
  itemShow()
}

let operator_plan_detail = ref({})

function planDetail() {
  operator_plan_detail.value = {}

  for (let charId in operator_plan.value) {
    const current = operator_data.value[charId]
    if (current == void 0) continue;
    const cost_table = operator_cost_table[charId]
    if (cost_table == void 0) continue;
    const plan = operator_plan.value[charId]
    operator_plan_detail.value[charId] = {cost: []}

    for (let rank = current.elite; rank < plan.elite; rank++) {
      operator_plan_detail.value[charId].cost.push({
        text: `精英${rank} -> 精英${rank + 1}`,
        cost: cost_table.elite[rank + 1]
      })
    }

    for (let rank = current.mainSkill; rank < plan.mainSkill; rank++) {
      if (rank === 0) continue
      operator_plan_detail.value[charId].cost.push({
        text: `通用技能 等级${rank} -> 等级${rank + 1}`,
        cost: cost_table.allSkill[rank - 1]
      })
    }

    const current_skill_ranks = [current.skill1, current.skill2, current.skill3]
    const target_skill_ranks = [plan.skill1, plan.skill2, plan.skill3]


    for (const index in plan.skill) {
      for (let rank = current_skill_ranks[index]; rank < target_skill_ranks[index]; rank++) {
        operator_plan_detail.value[charId].cost.push({
          text: `${plan.skill[index].name} 专精${rank} -> 专精${rank + 1}`,
          cost: cost_table.skills[index][rank]
        })
      }
    }


    const current_mod_ranks = {"X": current.modX, "Y": current.modD}
    const target_mod_ranks = {"X": plan.modX, "Y": plan.modY}
    for (const type in current_mod_ranks) {
      if (cost_table[`mod${type}`] == void 0) continue;
      for (let rank = current_mod_ranks[type]; rank < target_mod_ranks[type]; rank++) {
        operator_plan_detail.value[charId].cost.push({
          text: `${type}模组 等级${rank} -> 等级${rank + 1}`,
          cost: cost_table[`mod${type}`][rank]
        })
      }
    }

  }

  console.log(operator_plan_detail.value)
}

function checkUserStatus(notice) {
  if (userData.value.token == void 0 || userData.value.token == 'undefined') {
    if (notice) cMessage('请先注册或登录一图流账号', 'error')
    return true;
  }
  return false
}

let itemFilterCondition = ref({
  rarity: [1, 2, 3, 4, 5],
  unused: true,
  chip: true,
  book: true,

})

function itemShow() {
  for (const index in item_info.value) {
    let item = item_info.value[index]
    let show = true
    show = show && itemFilterCondition.value.rarity.includes(item.rarity) > 0

    if (item.need < 1) {
      show = show && itemFilterCondition.value.unused
    }


    if (item.name.indexOf('芯片') > -1) {
      show = show && itemFilterCondition.value.chip
    }
    if (item.name.indexOf('技巧概要') > -1) {
      show = show && itemFilterCondition.value.book
    }

    item_info.value[index].show = show
  }
}

function addItemFilterCondition(property, condition) {
  if (property === 'rarity') {
    if (itemFilterCondition.value[property].includes(condition)) {
      itemFilterCondition.value[property] = itemFilterCondition.value[property]
          .filter(e => e !== condition)
    } else {
      itemFilterCondition.value[property].push(condition)
    }
  } else {
    itemFilterCondition.value[property] = !itemFilterCondition.value[property]
  }

  itemShow()
}

let item_info = ref(item_init_list)

function getItemSprite(id) {
  return `bg-${id} item_image`
}


function getAvatarSprite(charId) {
  return `bg-${charId} avatar_image`
}

function getSkillSprite(id) {
  return "bg-skill_icon_" + id + " skill_icon";
}


onMounted(() => {
  getOperatorMenu()
  getCacheUserData()
  getOperatorData()
})

const btn_style = 'margin:2px'

// for (const item of item_list) {
//   if (item.cardNum > 7) continue
//   item_info.value.push({
//     name: item.itemName,
//     id: item.itemId,
//     own: 0,
//     cost: 0,
//     need: 0,
//     rarity:item.rarity,
//     row: item.cardNum
//   })
// }
// item_info.value.sort((a, b) => a.row - b.row)
// console.log(JSON.stringify(item_info.value))


</script>


<style>



</style>

