<template>
  <div>
    <!-- 标题区域 -->
    <div class="op_title">
      <div class="op_title_text">
        <div class="op_title_ctext">五星六星精二性价比</div>
        <div :class="opETextTheme">Elite Efficiency</div>
      </div>
    </div>
    <!-- 标题区域end -->
    <!-- 内容区域 -->
    <el-table :data="tableData" style="width: 100%">
      <el-table-column prop="date" label="干员代号" />
      <!-- <el-table-column prop="name" label="职业" /> -->
      <el-table-column prop="address" label="材料开销" />
      <!-- <el-table-column prop="address" label="钱书开销" /> -->
      <!-- <el-table-column prop="address" label="总消耗" /> -->
      <!-- <el-table-column prop="address" label="折合源石" /> -->
      <!-- <el-table-column prop="address" label="礼包源石" /> -->
      <!-- <el-table-column prop="address" label="总源石" /> -->
      <!-- <el-table-column prop="address" label="性价比(相对648)" /> -->
    </el-table>
    <!-- 内容区域End -->
  </div>
</template>

<script setup>
import cookie from 'js-cookie'
import { onMounted, ref } from 'vue'
import skillJSON from "@/static/json/survey/operator_item_cost_table.json";
import idJSON from "@/static/json/survey/operator_id_table.json";
import itemJSON from '/src/static/json/item_list.json'

// 以skillJSON为准, idJSON因为有阿米娅升变信息所以多一条

console.log(`idJSON`, idJSON)
console.log(`skillJSON`, skillJSON)
console.log(`itemJSON`, itemJSON)

let fiveList = []
console.log(`fiveList`, fiveList)

let sixList = []

const itemList = itemJSON.data

let list1 = []
let list2 = []
for (let key in idJSON) {
  list1.push(key)
}
for (let key in skillJSON) {
  list2.push(key)
}

console.log(`list1`, list1)
console.log(`list2`, list2)

for (let key in skillJSON) {
  let name = idJSON[key] // 干员中文名
  let agent = skillJSON[key] // 干员对象
  agent.eliteFormat = [[], []] // 干员精英化列表
  agent.cost = 0
  for (let i = 0; i < agent.eliteFormat.length; i++) {
    for (let itemId in agent.elite[i + 1]) { // 干员精英化材料列表
      let num = agent.elite[i + 1][itemId] // 材料数量
      let item = itemList.find(t => t.itemId === itemId) // 材料信息
      agent.cost += item.itemValueAp * num
      agent.eliteFormat[i].push({...item, num})
    }
  }
  if (agent.allSkill?.[0]?.['3301'] === 5) sixList.push({...agent, name})
  else if (agent.allSkill?.[0]?.['3301'] === 4) fiveList.push({...agent, name})
}

console.log(`sixList`, sixList)
console.log(`fiveList`, fiveList)

const opETextTheme = ref('op_title_etext_light')

const tableData = ref([])

// 材料图标
function getSpriteImg(id, type) {
  return type === 'icon' ? `bg-${id}_icon sprite_store_icon` : `bg-${id} store_sprite_${type}`
}
// 材料品质颜色
function getColor(color, dividing = 4, tier = 1) {
  if (color < 0) return 'color_t6'
  else if (color < dividing - 3 * tier) return 'color_t1'
  else if (color < dividing - 2 * tier) return 'color_t2'
  else if (color < dividing - 1 * tier) return 'color_t3'
  else if (color < dividing) return 'color_t4'
  else return 'color_t5'
}
// 格式化效率
function getEfficiency(num, acc = 2) {
  return parseFloat(num).toFixed(acc);
}

onMounted(() => {
})
</script>

<style lang="scss">
</style>