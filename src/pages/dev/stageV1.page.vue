<template>

  <div style="display: flex;flex-wrap: wrap">
    <table v-for="(list,index) in stageList" :key="index" class="table">
      <tr v-for="(stage,index) in list" :key="index">
        <td style="width: 120px;">{{ stage.stageCode }}</td>
        <td style="width: 80px;">{{ stage.stageEfficiency.toFixed(2) }}</td>
        <td style="width: 30px;"> {{ stage.stageColor }}</td>
      </tr>
    </table>
  </div>
</template>

<script setup>
import axios from 'axios'
import {ref} from "vue";

let stageList = ref([])

axios.get("http://127.0.0.1:10010/stage/t3?expCoefficient=0.625&sampleSize=300").then(response => {
  stageList.value = response.data.data
})

</script>

<style>
.table{
  border-collapse: collapse;
  text-align: center;
  margin: 20px;
}

.table td{
  border: 1px solid white;
  padding: 4px;

}

</style>