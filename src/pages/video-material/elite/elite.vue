<script setup>
import eliteData from '/src/pages/video-material/elite/elite.json'
import OperatorAvatar from "@/components/sprite/OperatorAvatar.vue";
import {operatorTableV2} from "/src/utils/gameData.js";
import {ref} from "vue";

const charIdMap = ref(new Map())

for(const charId in operatorTableV2){
  charIdMap.value.set(operatorTableV2[charId].name,charId)
}
console.log(charIdMap.value.get("溯光星源"))
</script>

<template>

  <div class="update-bg">
    <img alt="" src="/image/video/elite20251101.jpg" style="width: 1440px">
    <div class="update-elite-card" v-for="item in eliteData">
      <div class="update-avatar">
        <img alt="" :src="`https://cos.yituliu.cn/image2/avatar/${charIdMap.get(item.name)}.png`" style="width: 170px">
<!--        <OperatorAvatar :char-id="charIdMap.get(item.name)" size="160" ></OperatorAvatar>-->
      </div>

      <table class="update-elite-table" >
        <tbody>
        <tr class="tr-1">
          <td>
            {{ item.name }}
          </td>
          <td>
            精二
          </td>
          <td>
            一技能专三
          </td>
          <td>
            二技能专三
          </td>
          <td>
            三技能专三
          </td>
        </tr>
        <tr class="tr-2">
          <td>
            理智消耗
          </td>
          <td>
            {{ item.elite.cost }}
          </td>
          <td>
            {{ item.skill1.cost }}
          </td>
          <td>
            {{ item.skill2.cost }}
          </td>
          <td>
            {{ item.skill3.cost }}
          </td>
        </tr>
        <tr class="tr-1">
          <td>
            消耗排名
          </td>
          <td>
            {{ item.elite.rank }}
          </td>
          <td>
            {{ item.skill1.rank }}
          </td>
          <td>
            {{ item.skill2.rank }}
          </td>
          <td>
            {{ item.skill3.rank }}
          </td>
        </tr>
        </tbody>
      </table>
    </div>

  </div>

</template>

<style>

.update-bg {
  width: 1440px;
  background-color: #f8fcff;
}

.update-elite-card {
  display: flex;
  align-items: center;
  padding: 8px;
}

.update-avatar{
  padding: 4px;
  box-shadow: 1px 1px 4px rgba(0, 0, 0, 0.54);
}

.update-elite-table{
  border-collapse: collapse;
  font-size: 32px;
  text-align: center;
  td{
    width:250px;
    padding: 4px;
    border: 1px solid #ffffff;
  }
  .tr-1{
        background-color: #e7f2ff;
  }
  .tr-2{
    background-color: #aaccfc;
  }
}

</style>