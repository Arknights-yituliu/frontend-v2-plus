<template>

  <div class="switch_btn_wrap">
  <div class="switch_btn" v-for="(value,key) in property_obj" @click="selectProperty(key)">
   {{value}}
  </div>
  </div>
  <div class="operator_card_wrap" ref="content" id="content">
    <div class="rank_type"> {{property_obj[property]}} 排行</div>

  <div v-for="operator in operator_list" class="operator_card">
    <div class="itemObtainApproach"><a
        v-show="'常驻干员'!==operator.itemObtainApproach">{{ operator.itemObtainApproach }}</a></div>
    <img :src="'/image/avatar/'+operator.charId+'.png'" class="operator_image">
    <div class="operator_name"> {{ operator.name }}</div>
    <div class="operator_subProfession">{{operator.profession}} -{{ operator.subProfession }}</div>
    <div class="operator_Bar_wrap">
      <div class="operator_Bar" :style="getBarWidth(operator[property])">{{ (operator[property] * 100).toFixed(2) }}%
      </div>
    </div>
  </div>
  </div>
</template>

<script setup>
import characterBasicInfo from "@/static/json/survey/character_table_simple.json";
import professionId from "@/static/json/survey/professionId.json";
import {onMounted, ref, watch} from "vue";
import surveyApi from "@/api/survey";
// import html2canvas from 'html2canvas';

let profession_table = {}
for (let element in professionId) {
  profession_table[element] = professionId[element].subProfessionName
}

let operator_list = ref([])

function getProfession(str) {
  if ("SNIPER" === str) return "狙击";
  if ("WARRIOR" === str) return "近卫";
  if ("SPECIAL" === str) return "特种";
  if ("MEDIC" === str) return "医疗";
  if ("SUPPORT" === str) return "辅助";
  if ("PIONEER" === str) return "先锋";
  if ("TANK" === str) return "重装";
  if ("CASTER" === str) return "术师";
  return "";
}

let property = ref('elite')

function getCharStatisticsResult() {
  surveyApi.getCharStatisticsResult().then((response) => {
    response = response.data
    const result_list = response.result;
    for (const result of result_list) {
      let charId = result.charId
      if (characterBasicInfo[charId] == undefined) continue
      const operatorData = characterBasicInfo[charId];
      if (operatorData.rarity < 6) continue
      let operator = {
        charId: result.charId,
        name: operatorData.name,
        profession: getProfession(operatorData.profession),
        subProfession: profession_table[operatorData.subProfessionId],
        elite: result.elite.rank2 != undefined ? result.elite.rank2 : 0.0,
        itemObtainApproach: operatorData.itemObtainApproach,
        own: result.own
      }

      if (result.skill1 != undefined) {
        operator.skill1 = result.skill1.rank3 != undefined ? result.skill1.rank3 : 0.0;
      }

      if (result.skill2 != undefined) {
        operator.skill2 = result.skill2.rank3 != undefined ? result.skill2.rank3 : 0.0;
      }

      if (result.skill3 != undefined) {
        operator.skill3 = result.skill3.rank3 != undefined ? result.skill3.rank3 : 0.0;
      }

      if (result.modX != undefined) {
        operator.modX = result.modX.rank3 != undefined ? result.modX.rank3 : 0.0;
      }

      if (result.modY != undefined) {
        operator.modY = result.modY.rank3 != undefined ? result.modY.rank3 : 0.0;
      }

      operator_list.value.push(operator)
    }

     selectProperty('elite')
    console.log(operator_list.value)
  })
}


function sortList(value) {
  operator_list.value.sort((a, b) => {
    return b[value] - a[value];
  })
}

function selectProperty(value){
  property.value = value
  sortList(property.value)
}


function getBarWidth(num) {
  return 'width:' + (250 * num) + 'px'
}

function down(){
  const ref = document.getElementById("content")
  html2canvas(ref, {
    scale: 4,
    dpi: 600,
    backgroundColor: null,
    useCORS: true // 如果截图的内容里有图片,可能会有跨域的情况,加上这个参数,解决文件跨域问题
  }).then(canvas => {
    const dataURL = canvas.toDataURL("image/jpeg");
    const creatDom = document.createElement("a");
    document.body.appendChild(creatDom);
    creatDom.href = dataURL;
    creatDom.download = "测试图片";
    creatDom.click();

  });
}

let property_obj = {
  own:'持有率',
  elite:'精二率',
  skill1:'一技能专三率',
  skill2:'二技能专三率',
  skill3:'三技能专三率',
  modX:'三级X模组开启率',
  modY:'三级Y模组开启率'
}



onMounted(() => {
  getCharStatisticsResult()

})

</script>

.
<style scoped>

.itemObtainApproach {
  width: 100px;
  text-align: center;
  line-height: 80px;
  font-size: 16px;
  font-weight: 600;
  color: #ff6200;
}

.operator_card_wrap{
  margin: 20px;
  width: 720px;
  height: 6591px;
  /*border: 1px solid black;*/
}

.rank_type{
  width: 700px;
  text-align: center;
  margin: 20px;
  font-size: 22px;
  font-weight: 600;
}

.operator_card {
  /*padding: 8px;*/
  display: flex;
  border-bottom: 1px solid grey;
}

.operator_image {
  width: 80px;
  display: block;
  position: relative;
}

.operator_name {
  width: 150px;
  /*text-align: center;*/
  /*line-height: 60px;*/
  font-size: 20px;
  font-weight: 600;
  height: 32px;
  line-height: 32px;
  padding: 0 0 0 24px;
  margin: 30px 0 0 -20px;
  background: linear-gradient(to right, #fcbb9a, #ffffffff);
}

.operator_subProfession {
  width: 120px;
  /*text-align: center;*/
  line-height: 80px;
  font-size: 16px;
  font-weight: 600;
}

.operator_Bar_wrap{
  width: 250px;
  border-right: 2px solid #0076a9;
  border-left: 2px solid #0076a9;
}

.operator_Bar {
  width: 250px;
  background: linear-gradient(to right, rgba(221, 241, 255, 0.81), rgba(168, 220, 255));
  height: 32px;
  margin: 24px 0 0 0;
  line-height: 32px;
  font-size: 18px;
  font-weight: 600;
  padding: 0 0 0 12px;
  box-sizing: border-box;
}


.switch_btn_wrap{
  display: flex;
}


.switch_btn{
  margin: 6px;
}


</style>