<script setup>
import eliteData from '/src/pages/video-material/elite/elite.json'
import OperatorAvatar from "@/components/sprite/OperatorAvatar.vue";
import {operatorTableV2} from "/src/utils/gameData.js";
import {ref, onMounted, onUnmounted, watch} from "vue";

// 独立的存储键名 - elite页面专用（与returnbrief页面完全分离）
const ELITE_STORAGE_KEY = 'elite_page_data'

const charIdMap = ref(new Map())

for (const charId in operatorTableV2) {
  charIdMap.value.set(operatorTableV2[charId].name, charId)
}
console.log(charIdMap.value.get("溯光星源"))

// 从 localStorage 加载数据
const loadFromStorage = () => {
  try {
    const saved = localStorage.getItem(ELITE_STORAGE_KEY)
    if (saved) {
      const data = JSON.parse(saved)
      console.log('Elite 页面数据已从本地存储恢复:', ELITE_STORAGE_KEY)
    }
  } catch (error) {
    console.error('恢复 Elite 页面数据失败:', error)
  }
}

// 保存到 localStorage
const saveToStorage = (data) => {
  try {
    localStorage.setItem(ELITE_STORAGE_KEY, JSON.stringify(data))
    console.log('Elite 页面数据已保存:', ELITE_STORAGE_KEY)
  } catch (error) {
    console.error('保存 Elite 页面数据失败:', error)
  }
}

// 监听数据变化并自动保存
const stopWatch = watch([charIdMap], () => {
  const data = {
    lastVisited: new Date().toISOString()
  }
  saveToStorage(data)
}, { deep: true })

onMounted(() => {
  console.log('Elite 页面已加载，使用独立存储:', ELITE_STORAGE_KEY)
  loadFromStorage()
})

onUnmounted(() => {
  stopWatch()
})
</script>

<template>

  <div class="update-bg">
    <img alt="" src="/image/video/elite20251101-1.jpg" style="width: 1280px">
    <div class="update-elite-card" v-for="item in eliteData">
      <div class="update-avatar">
        <img alt="" :src="`https://cos.yituliu.cn/image2/avatar/${charIdMap.get(item.name)}.png`" style="width: 190px">
        <!--        <OperatorAvatar :char-id="charIdMap.get(item.name)" size="160" ></OperatorAvatar>-->
      </div>

      <table class="update-elite-table" :class="`tr-bg-${item.rarity}`">
        <tbody>
        <tr >
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
        <tr >
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
        <tr >
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

  .tr-bg-6{
    background: linear-gradient(to bottom, #ffa84c, #FFFFFF);
  }

  .tr-bg-5{
    background: linear-gradient(to bottom, #ffe45c, #FFFFFF);
  }

  .tr-bg-4{
    background: linear-gradient(to bottom, #cccccc, #FFFFFF);
  }
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