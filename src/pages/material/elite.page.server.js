import axios from "axios";
import { http } from "/src/api/baseURL";
import skillJSON from "/src/static/json/survey/operator_item_cost_table.json";
import characterJSON from "/src/static/json/survey/character_table_simple.json"
import professionDictJSON from "/src/static/json/survey/profession_dict.json";

const params = {
  expCoefficient: 0.625,
  sampleSize: 300,
}

const agentRarityMoneyList = [
  { rarity: 3, elite1: 10000 },
  { rarity: 4, elite1: 15000, elite2: 60000 },
  { rarity: 5, elite1: 20000, elite2: 120000 },
  { rarity: 6, elite1: 30000, elite2: 180000 },
]

function get_value() {
  return axios.get(`${http}item/value`, { params })
}

export async function onBeforeRender(pageContext) {
  const result = await get_value();
  const itemList = result.data.data;
  const agentList = []

  // 以skillJSON为准, idJSON因为有阿米娅升变信息所以多一条
  for (let key in skillJSON) {
    const agent = { ...characterJSON[key], ...skillJSON[key] } // 干员对象
    agent.eliteFormat = [] // 干员精英化材料列表
    agent.cost = 0
    for (let i = 1; i < agent.elite.length; i++) { // i = 1: 数据里面精0占用了下标0
      if (!agent.eliteFormat[i - 1]) agent.eliteFormat[i - 1] = [] // 初始化当前精英化等级数组
      const num = agentRarityMoneyList.find(t => t.rarity === agent.rarity)[`elite${i}`] // 精英化所需龙门币
      const money = Object.assign({ num }, itemList.find(t => t.itemId === '4001'))
      agent.eliteFormat[i - 1].push(money)
      for (let itemId in agent.elite?.[i]) { // 干员精英化材料列表
        const num = agent.elite?.[i][itemId] // 材料数量
        const item = itemList.find(t => t.itemId === itemId) // 材料信息
        agent.cost += item.itemValueAp * num // 材料消耗总理智
        agent.eliteFormat[i - 1].push({...item, num})
      }
    }
    const profession = professionDictJSON.find(t => t.value === agent.profession)
    agent.professionName = profession.label // 职业名称
    agent.subProfessionName = profession.children.find(t => t.value === agent.subProfessionId).label // 分支名称
    agent.cost = agent.cost.toFixed(2) // 材料消耗格式化
    agentList.push(agent)
  }

  // 按材料开销排序
  agentList.sort((a, b) => {
    if (a.cost === b.cost) {
      return b.rarity - a.rarity
    }
    return b.cost - a.cost
  })

  const pageProps = { itemList, agentList, professionDictJSON };

  return {
    pageContext: {
      pageProps,
    },
  };
}
