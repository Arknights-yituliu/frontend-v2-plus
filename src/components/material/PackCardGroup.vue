<script setup>
import { ref, watch } from "vue"
import ItemImage from "/src/components/sprite/ItemImage.vue";
import { formatNumber } from "/src/utils/format.js";

const id = generateRandomString(5)

function generateRandomString(length) {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

const props = defineProps(["modelValue", "displayPackEfficiency"]);

function getPackImageLink(link) {
  return `https://cos.yituliu.cn/${link}`
}


function displayPackContent(packId) {
  const element = document.getElementById(`${packId}${id}`)
  if ('flex' === element.style.display) {
    element.style.display = 'none'
  } else {
    element.style.display = 'flex'
  }
}

function getFixed(num, acc) {
  acc = typeof acc !== "undefined" ? acc : 2;
  return parseFloat(num).toFixed(acc);
}

let screenWidth = ref(1080)

function getLineBarStyle(lineData) {

  let barWidth = 80

  if (screenWidth.value < 600 || !screenWidth.value) {
    barWidth = 50
  }
  const width = barWidth * lineData.value

  return `width: ${width}px;background-color: ${lineData.color}`
}

watch(() => window.screen.width, (newVal) => {
  screenWidth.value = newVal
})


function itemAccentColor(name) {
  if (["合成玉", "至纯源石", "寻访凭证", "十连寻访凭证"].includes(name)) {
    return "color:#FF8F00;font-weight:600;"
  }
  if (["中坚寻访凭证", "十连中坚寻访凭证"].includes(name)) {
    return "color:#0052CC;font-weight:600;"
  }
  if (["模组数据块", "数据增补仪", "数据增补条"].includes(name)) {
    return "color:#6D4C41;font-weight:600;"
  }
}



// 历史礼包沿用月份标记；临期礼包移到图片上，避免挤压效率条。
function getPackCountdown(endDate, startDate) {
  const endTime = new Date(endDate).getTime()
  const now = Date.now()
  const diffMs = endTime - now
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  const startTime = new Date(startDate)
  const year = startTime.getFullYear()
  const month = String(startTime.getMonth() + 1).padStart(2, '0')
  if (diffDays <= 0) return {type: 'history', label: `${year}-${month}`}
  if (diffDays <= 7) return {type: 'soon', label: `${diffDays}天`}
  return null
}

function displayInfoCountdown(countdown) {
  return countdown?.type === 'history'
}
</script>

<template>
  <div class="pack-card-container">
    <div v-for="(packInfo, index) in props.modelValue" :key="index" class="pack-card">
      <!-- 图片部分 -->
      <div class="flex">
        <div class="pack-card-part-left" @click="displayPackContent(packInfo.id)">
          <img :src="getPackImageLink(packInfo.imageLink)" alt="" class="pack-image">
          <span class="pack-display-name">
            {{ packInfo.officialName }}
          </span>
          <!-- 7天内临期标记，放在图片上避免挤压效率条 -->
          <div class="pack-image-countdown" v-if="getPackCountdown(packInfo.end, packInfo.start)?.type === 'soon'">
            {{ getPackCountdown(packInfo.end, packInfo.start).label }}
          </div>
          <!-- 角标部分 -->
          <div class="pack-corner corner-orange"> ￥{{ packInfo.price }}</div>
        </div>

        <!-- 总结部分 -->
        <div class="pack-info" @click="displayPackContent(packInfo.id)">
          <div class="pack-info-text">
            <span style="color: #ffb46e">折合{{ getFixed(packInfo.packedOriginium, 1) }}石</span>
            <span style="color: #ffb46e">￥{{ getFixed(packInfo.packedOriginiumPrice, 1) }}/石</span>
            <span style="height: 8px"></span>
            <span style="color: #ff6d6d;">共{{ getFixed(packInfo.draws, 1) }}抽</span>
            <span style="color: #ff6d6d;">￥{{ getFixed(packInfo.drawPrice, 1) }}/抽</span>
          </div>
          <!-- 效率条部分 -->
          <div class="pack-chart-line">
            <div class="pack-chart-line-item" v-for="(line, index) in packInfo.lineChartData" v-show="line.display">
              <span class="pack-chart-line-label">{{ line.label }}</span>
              <div class="pack-line-bar" :style="getLineBarStyle(line)">
                <span>{{ getFixed(line.value * 100, 0) }}%</span>
              </div>
            </div>
          </div>
          <!-- 剩余时间 -->
          <div class="pack-info-countdown" v-if="displayInfoCountdown(getPackCountdown(packInfo.end, packInfo.start))">
            {{ getPackCountdown(packInfo.end, packInfo.start).label }}
          </div>
        </div>
      </div>

      <!-- 详情部分 -->
      <div class="pack-content" :id="`${packInfo.id}${id}`">
<!--        <div class="pack-content-gacha">-->
<!--          <ItemImage :item-id="'4002'" :size="40" :mobile-size="30"></ItemImage>-->
<!--          <span>X{{ packInfo.originium }}</span>-->
<!--          <ItemImage :item-id="'4003'" :size="40" :mobile-size="30"></ItemImage>-->
<!--          <span>X{{ packInfo.orundum }}</span>-->
<!--          <ItemImage :item-id="'7003'" :size="40" :mobile-size="30"></ItemImage>-->
<!--          <span>X{{ packInfo.gachaTicket }}</span>-->
<!--          <ItemImage :item-id="'7004'" :size="40" :mobile-size="30"></ItemImage>-->
<!--          <span>X{{ packInfo.tenGachaTicket }}</span>-->
<!--        </div>-->
        <div class="pack-content-material">
          <!-- 新增详情表格取代之前的列表 -->
          <v-table density="compact" style="width: 100%;">
            <thead>
              <tr>
                <th class="text-left">名称</th>
                <th class="text-left">数量</th>
                <th class="text-left">总价值</th>
                <th class="text-left">占比</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in packInfo.packContentVO.filter(i => i.quantity !== 0)" :key="item.itemId"
                :style="itemAccentColor(item.itemName)" >
                <td class="pack-content-item">
                  <ItemImage :item-id="item.itemId" :size="40" :mobile-size="30" class="m-a"></ItemImage>
                  <div class="pack-content-item-name">{{ item.itemName }}</div>
                </td>

<!--                <td>{{ item.itemName }}</td>-->
                <td>{{ item.quantity }}</td>
                <td>{{ formatNumber(item.apValue, 1) }}</td>
                <td>{{ formatNumber(item.itemRatio * 100, 1) }}%</td>
              </tr>
            </tbody>
          </v-table>
          <!-- <div class="pack-content-material-item" v-for="(item, index) in packInfo.packContent" :key="index"> -->
          <!--            <ItemImage :item-id="item.itemId" :size="40" :mobile-size="30" v-show="!item.custom"></ItemImage>-->
          <!-- <span class="pack-content-material-item-name">{{ item.itemName }}</span> -->
          <!-- <span class="pack-content-material-item-quantity">X{{ item.quantity }}</span> -->
          <!-- </div> -->
        </div>
      </div>

      <!-- 说明部分 -->
      <div class="pack-note">
        {{ packInfo.note }}
      </div>
    </div>
  </div>
</template>
