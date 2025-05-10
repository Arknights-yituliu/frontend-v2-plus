import { ref } from 'vue'
import itemCache from "/src/utils/indexedDB/itemCache.js";

import operatorProgressionStatisticsDataCache from "/src/utils/indexedDB/operatorProgressionStatisticsData.js";// 练度调查结果
import {operatorTable} from "/src/utils/gameData.js";
import operatorMaterialJSON from "/src/static/json/operator/operator_item_cost_table.json"; // 干员精英化、技能消耗材料JSON
import professionDictJSON from "/src/static/json/operator/profession_dict"; // 职业字典JSON
import { operatorInit } from './formatOperatorData'
import {getStageConfig} from '/src/utils/user/userConfig.js'
// 获取材料字典
const materialMap = new Map(); // 材料总映射
const statisticsMap = new Map() // 练度调查映射
const materialTypeMap = new Map() // 精英材料映射
const chipsTypeMap = new Map() // 芯片类型id映射
const baseMaterialIdMap = new Map() // 基础材料id映射
let operatorRarityBaseMaterialMap = null // 干员养成所需固定材料映射
let LMDId = ''
const initFlag = ref(false)

// 拆分出精英材料
const materialTypeList = [
  { type: 'orange', rarity: 5, cardNums: [1] },
  { type: 'purple', rarity: 4, cardNums: [2] },
  { type: 'blue', rarity: 3, cardNums: [3] },
  { type: 'green', rarity: 2, cardNums: [4] },
  { type: 'grey', rarity: 1, cardNums: [5] }
].map(item => {
  // cardNums长度多一位兼容未来YJ可能出新的材料
  const lastCardNum = item.cardNums.at(-1);
  item.cardNums.push(lastCardNum + 1)
  return item
})
// 芯片
const chipsTypeList = [
  { type: 'orange', rarity: 5, cardNums: [9] },
  { type: 'purple', rarity: 4, cardNums: [8] },
  { type: 'blue', rarity: 3, cardNums: [7] }
]
const allTypeLists = [...materialTypeList, ...chipsTypeList];
// 基础材料(数值固定不变的)
const baseMaterialList = [ '龙门币', '技巧概要·卷3', '模组数据块', '数据增补条', '数据增补仪' ]
const professionMap = new Map() // 主职业映射
const subProfessionMap = new Map() // 子职业映射

// 构建职业和子职业映射
professionDictJSON.forEach(profession => {
  professionMap.set(profession.value, profession.label);
  profession.children.forEach(subProfession => {
    subProfessionMap.set(subProfession.value, subProfession.label);
  });
});

const operatorMap = new Map(Object.entries(operatorTable)) // 干员信息映射
const operatorMaterialMap = new Map(Object.entries(operatorMaterialJSON)) // 干员精英化、专精技能消耗材料映射

// 通用的干员消耗材料信息映射(老干员如银灰虽然不通用, 但这个主要是给新建自定义角色用的, 不影响)
const createOperatorRarityBaseMaterialMap = () => {
  LMDId = baseMaterialIdMap.get('龙门币');
  const skillSummaryId = baseMaterialIdMap.get('技巧概要·卷3');
  const moduleDataBlockId = baseMaterialIdMap.get('模组数据块');
  const dataSupplementStickId = baseMaterialIdMap.get('数据增补条');
  const dataSupplementInstrumentId = baseMaterialIdMap.get('数据增补仪');
  // 固定精英化材料
  const createEliteMaterials = (materialList) => {
    return materialList.map(([LMDQuantity, chipQuantity, selectMaterialTypes]) => ({
      fixedMaterialList: [
        { itemId: LMDId, quantity: LMDQuantity }, // 龙门币
        { quantity: chipQuantity }, // 芯片
      ],
      selectMaterialTypes
    }))
  }
  // 固定专精技能材料
  const createSkillMaterials = (quantityList) => {
    const materialTypesList = [
      ['purple', 'blue'],
      ['purple', 'purple'],
      ['orange', 'purple'],
    ]
    return quantityList.map((quantity, index) => ({
      fixedMaterialList: [
        { itemId: skillSummaryId, quantity }
      ],
      selectMaterialTypes: materialTypesList[index]
    }))
  }
  // 固定升级模组材料
  const createModMaterials = (moduleDataBlockQuantity, baseLMDQuantity, selectMaterialTypes, dataSupplementStickQuantity, dataSupplementInstrumentQuantity) => {
    const moduleUpdateMaterialList = [
      {}, // 开1级模组没有额外材料
      { itemId: dataSupplementStickId, quantity: dataSupplementStickQuantity },
      { itemId: dataSupplementInstrumentId, quantity: dataSupplementInstrumentQuantity },
    ]
    return moduleUpdateMaterialList.map((item, index) => ({
      fixedMaterialList: [
        { itemId: moduleDataBlockId, quantity: moduleDataBlockQuantity },
        { itemId: LMDId, quantity: baseLMDQuantity * (1 + index * 0.25) },
        index && item // 没材料会放个0在这, 新建自定义干员的时候遍历到这里会跳过
      ],
      selectMaterialTypes,
    }))
  }

  return new Map([
    [3, {
      elite: [
        {
          fixedMaterialList: [
            { itemId: LMDId, quantity: 10000 },
          ]
        }
      ]
    }],
    [4, {
      elite: createEliteMaterials([[15000, 3, ['green', 'green']], [60000, 5, ['blue', 'blue']]] ),
      skill: createSkillMaterials([2, 4, 6]),
      mod: createModMaterials(1, 20000, ['blue'], 15, 5),
    }],
    [5, {
      elite: createEliteMaterials([[20000, 4, ['green', 'green']], [120000, 3, ['purple', 'blue']]] ),
      skill: createSkillMaterials([5, 6, 10]),
      mod: createModMaterials(2, 40000, ['purple'], 20, 8),
    }],
    [6, {
      elite: createEliteMaterials([[30000, 5, ['green', 'green']], [180000, 4, ['orange', 'purple']]] ),
      skill: createSkillMaterials([8, 12, 15]),
      mod: createModMaterials(4, 80000, ['orange'], 60, 20),
    }],
  ]);
}

const init = async () => {
  // 练度调查映射
  const {  result = []  } = await operatorProgressionStatisticsDataCache.getData()
  result.forEach(item => statisticsMap.set(item.charId, item))
  // 材料总映射
  const stageConfig = getStageConfig()
  const data = await itemCache.getItemValueCacheByConfig(stageConfig)
  data.forEach(item =>{
    item.itemValueAp = item.itemValue
    materialMap.set(item.itemId, item)
  } )
  
  // 添加不存在的材料
  const addDefaultItem = (materialMap, itemId, itemName, rarity) => {
    if (!materialMap.has(itemId)) {
      materialMap.set(itemId, {
        itemId,
        itemName,
        rarity,
        itemValueAp: 0,
      });
    }
  }

  // 添加模组升级材料到字典
  addDefaultItem(materialMap, 'mod_update_token_1', '数据增补条', 4);
  addDefaultItem(materialMap, 'mod_update_token_2', '数据增补仪', 5);
  
  // 遍历材料字典构建映射
  for (const [_, item] of materialMap.entries()) {
    for (const typeItem of allTypeLists) {
      if (!typeItem.materialList) typeItem.materialList = []
      const { rarity, cardNums } = typeItem
      if (cardNums.includes(item.cardNum) && item.rarity === rarity) {
        typeItem.materialList.push(item);
      }
    }
    // 插入基本材料
    if (baseMaterialList.includes(item.itemName)) {
      baseMaterialIdMap.set(item.itemName, item.itemId);
    }
  }

  // 插入精英材料
  materialTypeList.forEach(item => {
    materialTypeMap.set(item.type, item.materialList)
  })
  // 插入芯片
  chipsTypeList.forEach(item => {
    chipsTypeMap.set(item.type, item.materialList)
  })
  
  operatorRarityBaseMaterialMap = createOperatorRarityBaseMaterialMap() // 干员养成所需固定材料映射
  initFlag.value = true
  operatorInit()
  // console.log(`map init over `, )
}

init()

// 职业映射
export {
  professionMap,
  subProfessionMap
}

// 材料信息映射
export {
  materialMap,
  baseMaterialIdMap,
  materialTypeMap,
  chipsTypeMap,
}

// 角色信息映射
export {
  statisticsMap,
  operatorMap,
  operatorMaterialMap,
  operatorRarityBaseMaterialMap,
}

export { 
  professionDictJSON,
  LMDId,
  initFlag,
}