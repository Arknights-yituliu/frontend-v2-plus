<template>
  <div class="bot_act_page">
    <div class="bot_act_title">
      <div>数据来源：penguin-stats.cn</div>
      <div>效率计算：yituliu.site</div>
      <div>以下理智转化率对比对象为主线为对应掉落材料的主线最优关</div>
    </div>
    <div v-for="(act,index) in actList" :key="index" class="bot_act_card" v-show="act.zoneName.indexOf('复刻')<0">
      <div class="bot_act_card_left">
        <img :src="`/image/act/${act.zoneName}.jpg`" class="bot_act_image">
        <div class="bot_act_name">{{ act.zoneName }}</div>
        <div class="bot_act_name">{{ act.endTime }}</div>
      </div>
      <div class="bot_act_card_right">
        <table class="bot_act_table">
          <tbody>
          <tr>
            <td>关卡名</td>
            <td>掉落</td>
            <td>掉率</td>
            <td>期望</td>
            <td>理智转化率</td>
          </tr>
          <tr v-for="(stage,index) in act.actStageList" :key="index">
            <td>{{ stage.stageCode }}</td>
            <td><img :src="`/image/items/${stage.itemId}.png`" style="width: 40px;"></td>
            <td>{{ (stage.knockRating * 100).toFixed(1) }}%</td>
            <td>{{ stage.apExpect.toFixed(1) }}</td>
            <td>{{ (stage.stageEfficiency * 100).toFixed(1) }}%</td>
          </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import stageApi from '/src/api/stage'
import {ref} from "vue";

let actList = ref([])

stageApi.getActStageResult(0.625).then(response => {
  actList.value = response.data
})

</script>

<style scoped>
.bot_act_page {
  background-color: #030303;
  color: #c9f1ff;
}

.bot_act_title{
  padding: 20px;
   text-align: center;
  width: 520px;
}

.bot_act_name {
  margin: 8px;
}

.bot_act_card {
  display: flex;

}

.bot_act_card_left {
  padding: 16px;
  width: 210px;
  text-align: center;
}

.bot_act_card_right {
  text-align: center;
}

.bot_act_table {
  border-collapse: collapse;
  width: 300px;
}

.bot_act_table td {
  border: 1px solid white;
}

.bot_act_image {
  width: 200px;
}
</style>