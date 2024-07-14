<script setup>
import ITEM_COST_TABLE from '/src/static/json/survey/operator_item_cost_table.json'
import OPERATOR_TABLE from '/src/static/json/survey/character_list.json'
import materialAPI from '/src/api/material.js'
import operatorAPI from '/src/api/operator-data.js'
import {onMounted, ref} from "vue";
import {timeFormat} from "/src/utils/dateUtil.js";
import SpriteAvatar from "../../components/SpriteAvatar.vue";

const operatorMap = new Map()
const charIdMap = new Map()
for (const operator of OPERATOR_TABLE) {
  operatorMap.set(operator.charId, operator)
  charIdMap.set(operator.name,operator.charId)
}
console.log(charIdMap)

let skillCostRankList = []


async function initData() {
  const itemMap = new Map()

  await materialAPI.getItemValueTable(0.625).then(response => {
    const list = response.data
    for (const item of list) {
      itemMap.set(item.itemId, item.itemValueAp)
    }
  })

  const skillRankRatioMap = new Map()

  await operatorAPI.getCharStatisticsResult().then(response => {
    const result = response.data.result;

    for (const item of result) {
      const {charId, rarity, skill1, skill2, skill3} = item
      skillRankRatioMap.set(`${charId}S1`, skill1.rank3)
      skillRankRatioMap.set(`${charId}S2`, skill2.rank3)
      skillRankRatioMap.set(`${charId}S3`, skill3.rank3)
    }
  })

  for (const charId in ITEM_COST_TABLE) {
    const {skills, allSkill} = ITEM_COST_TABLE[charId]

    const {rarity, name, date} = operatorMap.get(charId);

    if (rarity !== 5) {
      continue
    }

    let mainApCost = 0
    for (const rankCost of allSkill) {
      for (const itemId in rankCost) {
        const num = rankCost[itemId]
        if (itemMap.get(itemId)) {
          mainApCost += itemMap.get(itemId) * num
        }
      }
    }

    let index = 1
    for (const skill of skills) {
      let apCost = 0
      for (const rankCost of skill) {
        for (const itemId in rankCost) {
          const num = rankCost[itemId]
          if (itemMap.get(itemId)) {
            apCost += itemMap.get(itemId) * num
          }
        }
      }

      const proportion = skillRankRatioMap.get(`${charId}S${index}`) ? skillRankRatioMap.get(`${charId}S${index}`) : 0
      skillCostRankList.push({
        charId: charId,
        name: name,
        apCost: apCost,
        skillIndex: index,
        rarity: rarity,
        mainApCost: mainApCost,
        proportion: proportion,
        time: timeFormat(new Date(date))
      })

      index++
    }

  }

  skillCostRankList = skillCostRankList.sort((a, b) => {
    return b.apCost - a.apCost
  }).filter(e => {
    return e.proportion > 0.1
  })

  const lastIndex = parseInt(skillCostRankList.length / 2)

  list1.value = skillCostRankList.slice(0, lastIndex)
  list2.value = skillCostRankList.slice(lastIndex)
  console.log(list1, list2)
}

let list1 = ref([])
let list2 = ref([])


onMounted(() => {
  initData()
})

function stress(data) {
  if (data.toString().indexOf('2024') > -1 || data.toString().indexOf('2023') > -1) {
    return 'table-114-td-stress'
  }
  if (data > 0.2) {
    return 'table-114-td-stress'
  }
}

const data = [
  {
    name:'蜜莓',
    skill:['技能1'],
    text:'是SP艾雅法拉实装之前最好用的损伤奶'
  },
  {
    name:'阿米娅（近卫）',
    skill:['技能2'],
    text:'真伤'
  },
  {
    name:'羽毛笔',
    skill:['技能1','技能2'],
    text:'非常好强力击，1、2技能都对一些需要击杀次数的敌人(例如将进酒)非常好用'
  },
  {
    name:'狮蝎',
    skill:['技能1'],
    text:'50%减速，不过现在伊桑更好用'
  },
  {
    name:'寒芒克洛丝',
    skill:['技能2'],
    text:'小能天使，肉鸽好用'
  },
  {
    name:'白面鸮',
    skill:['技能2'],
    text:'曾经的治疗量最高之一'
  },
  {
    name:'极境',
    skill:['技能1','技能2'],
    text:'1技能最高级的投锋技能，2技能破隐、减防、减速多种强力辅助效果'
  },
  {
    name:'拉普兰德',
    skill:['技能2'],
    text:'曾经好用的沉默对策干员，2技能在当时是比较缺的地面法伤，现版本不推荐专精'
  },
  {
    name:'巫恋',
    skill:['技能2'],
    text:'高额减攻，如果有技力拐可接近无缝技能，让一些高台都可以硬抗大爹一枪'
  },
  {
    name:'华法琳',
    skill:['技能2'],
    text:'攻击拐，无须多言，有需求的直接专就行了'
  },
  {
    name:'德克萨斯',
    skill:['技能2'],
    text:'技能初动较快，且带群控'
  },
  {
    name:'幽灵鲨',
    skill:['技能2'],
    text:'锁血15s'
  },
  {
    name:'晓歌',
    skill:['技能1','技能2'],
    text:'快速复活加快速回费'
  },
  {
    name:'蓝毒',
    skill:['技能1'],
    text:'好用的强力击技能，但是现版本不推荐专精'
  },
  {
    name:'白金',
    skill:['技能2'],
    text:'手长狙击，现版本不推荐专精'
  },
  {
    name:'陨星',
    skill:['技能1'],
    text:'在兰登刚出的时候活跃了一阵'
  }
]



</script>


<template>

  <div style="display: flex;flex-wrap: wrap">
    <div class="operator-114-card" v-for="(item,index) in data" :key="index">
      <sprite-avatar style="margin: auto" :name="charIdMap.get(item.name)" size="80">
      </sprite-avatar>
      {{charIdMap[item.name]}}
      <p><span v-for="(skill,index) in item.skill" :key="index" style="padding: 0 4px">{{skill}}</span></p>
      <p>{{ item.text }}</p>
    </div>
  </div>




  <div style="display: flex;flex-wrap: wrap">

    <table class="table-114">
      <tbody>
      <tr class="table-114-title">
        <td colspan="2">干员</td>
        <td>星级</td>
        <td>通用技能等级消耗</td>
        <td>技能</td>
        <td>专三消耗理智</td>
        <td>专三率</td>
        <td>实装日期</td>
      </tr>
      <tr v-for="(item,index) in list1" :key="index" :class="index%2!==0?'table-114-td-background':''">
        <td>
          <sprite-avatar :name="item.charId" size="40">
          </sprite-avatar>
        </td>
        <td>{{ item.name }}</td>
        <td>{{ item.rarity }}</td>
        <td>{{ item.mainApCost.toFixed(2) }}</td>
        <td>S{{ item.skillIndex }}</td>
        <td>{{ item.apCost.toFixed(2) }}</td>
        <td :class="stress(item.proportion)">{{ (item.proportion * 100).toFixed(2) }}%</td>
        <td :class="stress(item.time)">{{ item.time }}</td>
      </tr>
      </tbody>
    </table>

    <table class="table-114">
      <tbody>
      <tr class="table-114-title">
        <td colspan="2">干员</td>
        <td>星级</td>
        <td>通用技能等级消耗</td>
        <td>技能</td>
        <td>专三消耗理智</td>
        <td>专三率</td>
        <td>实装日期</td>
      </tr>
      <tr v-for="(item,index) in list2" :key="index" :class="index%2!==0?'table-114-td-background':''">
        <td>
          <sprite-avatar :name="item.charId" size="40">
          </sprite-avatar>
        </td>
        <td>{{ item.name }}</td>
        <td>{{ item.rarity }}</td>
        <td>{{ item.mainApCost.toFixed(2) }}</td>
        <td>S{{ item.skillIndex }}</td>
        <td>{{ item.apCost.toFixed(2) }}</td>
        <td :class="stress(item.proportion)">{{ (item.proportion * 100).toFixed(2) }}%</td>
        <td :class="stress(item.time)">{{ item.time }}</td>
      </tr>
      </tbody>
    </table>
    <div style="width: 90%;padding: 12px;color: var(--c-red-5)">
      <p>*S1代表1技能，以此类推</p>
      <p>*本表格仅展示专三率大于10%的五星干员技能，专三率数据来源：https://ark.yituliu.cn/survey/rank</p>
    </div>
  </div>



</template>

<style>
.table-114 {
  border-collapse: collapse;
  text-align: center;
  margin: 4px;
  font-size: 14px;
}

.table-114-title td {
  background-color: var(--c-blue-6);
  color: white;
  font-weight: bolder;
}

.table-114-td-background {
  background-color: #e1efff;
}

.table-114-td-stress {
  background-color: var(--c-orange-5);
  color: white;
}

.operator-114-card{
  width: 120px;
  margin: 8px;
  text-align: center;
}

.table-114 td {
  padding:4px 8px;
  border: 1px solid #a6a6a6;
}
</style>