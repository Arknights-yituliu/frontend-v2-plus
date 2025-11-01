<script setup>
import eliteData from '/src/pages/video-material/elite/elite.json'
import OperatorAvatar from "@/components/sprite/OperatorAvatar.vue";
import {operatorTableV2} from "/src/utils/gameData.js";
import {ref} from "vue";

const charIdMap = ref(new Map())

for (const charId in operatorTableV2) {
  charIdMap.value.set(operatorTableV2[charId].name, charId)
}
console.log(charIdMap.value.get("溯光星源"))
</script>

<template>

  <div class="update-bg">
    <img alt="" src="/image/video/elite20251101-1.jpg" style="width: 1280px">
    <div class="update-elite-card" v-for="item in eliteData">
      <div class="update-avatar">
        <img alt="" :src="`https://cos.yituliu.cn/image2/avatar/${charIdMap.get(item.name)}.png`" style="width: 190px">
        <!--        <OperatorAvatar :char-id="charIdMap.get(item.name)" size="160" ></OperatorAvatar>-->
      </div>

      <table class="update-elite-table">
        <tbody>
        <tr class="tr-1">
          <td style="width: 280px">
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
            同星级消耗排名
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
    <div class="update-footer">
      <table class="update-footer-table">
        <tbody>
        <tr>
          <td>数据源：</td>
          <td>明日方舟一图流</td>
          <td>https://ark.yituliu.cn</td>
        </tr>
        <tr>
          <td></td>
          <td>企鹅物流数据统计</td>
          <td>https://penguin-stats.cn</td>
        </tr>
        <tr>
          <td>数据整理：</td>
          <td>逻辑元LogicalByte@Bilibili</td>
          <td></td>
        </tr>
        </tbody>
      </table>
      <img src="/image/video/cq.png" alt="" style="width: 180px;margin: 0 0 0 60px">
    </div>

  </div>

</template>

<style>

.update-bg {
  width: 1280px;
  background-color: #f8fcff;
}

.update-elite-card {
  display: flex;
  align-items: center;
  padding: 8px;
}

.update-avatar {
  padding: 4px;
  box-shadow: 1px 1px 4px rgba(0, 0, 0, 0.54);
}

.update-elite-table {
  border-collapse: collapse;
  font-size: 28px;
  text-align: center;

  td {
    width: 240px;
    padding: 12px 4px;
    border: 1px solid #ffffff;
  }

  .tr-1 {
    background-color: #e7f2ff;
  }

  .tr-2 {
    background-color: #aaccfc;
  }
}

.update-footer {
  display: flex;
  align-items: center;
  background-color: #DB895E;
}

.update-footer-table{
  font-size: 36px;
  color:white;
}

</style>