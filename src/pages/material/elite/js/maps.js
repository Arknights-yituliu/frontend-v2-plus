import materialAPI from "@/api/material"; // 材料字典
import surveyAPI from "@/api/operatorData"; // 练度调查结果
import operatorJSON from "@/static/json/survey/character_table_simple" // 干员信息JSON
import professionDictJSON from "@/static/json/survey/profession_dict"; // 职业字典JSON
import operatorMaterialJSON from "/src/static/json/survey/operator_item_cost_table.json"; // 干员精英化、技能消耗材料JSON

// 获取材料字典
const { data = [] } = await materialAPI.getItemValueTable(0.625)
const materialMap = new Map(data.map(item => [item.itemId, item])); // 材料总映射
const materialTypeMap = new Map() // 精英材料映射
const chipsTypeMap = new Map() // 芯片映射
const baseMaterialIdMap = new Map() // 基础材料id映射
// 添加不存在的材料
function addDefaultItem(materialMap, itemId, itemName, rarity) {
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

// 拆分出精英材料
const materialTypeList = [
  { type: 'orange', cardNums: [1, 2] }, // 以下cardNums长度多一位兼容未来YJ可能出新的材料
  { type: 'purple', cardNums: [2, 3, 4] },
  { type: 'blue', cardNums: [4, 5, 6] },
  { type: 'green', cardNums: [6, 7] },
  { type: 'grey', cardNums: [7, 8] }
]
// 芯片
const chipsTypeList = [
  { type: 'orange', cardNums: [11] },
  { type: 'purple', cardNums: [10] },
  { type: 'blue', cardNums: [9] }
]
const allTypeLists = [...materialTypeList, ...chipsTypeList];
// 基础材料(数值固定不变的)
const baseMaterialList = [ '龙门币', '技巧概要·卷3', '模组数据块', '数据增补条', '数据增补仪' ]
// 遍历材料字典构建映射
for (const [_, item] of materialMap.entries()) {
  for (const typeItem of allTypeLists) {
    if (!typeItem.materialList) typeItem.materialList = []
    const { type, cardNums } = typeItem
    if (cardNums.includes(item.cardNum) && item.type === type) {
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


// 职业映射
const professionMap = new Map();
const subProfessionMap = new Map();

// 构建职业和子职业映射
professionDictJSON.forEach(profession => {
  professionMap.set(profession.value, profession.label);
  profession.children.forEach(subProfession => {
    subProfessionMap.set(subProfession.value, subProfession.label);
  });
});

const { data: { result = [] } } = await surveyAPI.getCharStatisticsResult()
// 练度调查映射
const statisticsMap = new Map(result.map(item => [item.charId, item]));
// 干员信息映射
const operatorMap = new Map(Object.entries(operatorJSON));
// 干员精英化、专精技能消耗材料映射
const operatorMaterialMap = new Map(Object.entries(operatorMaterialJSON));

// 通用的干员消耗材料信息映射(老干员如银灰虽然不通用, 但这个主要是给新建自定义角色用的, 不影响)
const createOperatorRarityBaseMaterialMap = () => {
  const LMDId = baseMaterialIdMap.get('龙门币');
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
const operatorRarityBaseMaterialMap = createOperatorRarityBaseMaterialMap();

// 职业映射
export const useProfessionMaps = () => {
  // console.log(`干员主职业映射 professionMap`, professionMap)
  // console.log(`干员子职业映射 subProfessionMap`, subProfessionMap)
  return {
    professionMap,
    subProfessionMap,
  }
}

// 材料信息映射
export const useMaterialMaps = () => {
  // console.log(`精英材料映射 materialTypeMap`, materialTypeMap)
  // console.log(`芯片映射 chipsTypeMap`, chipsTypeMap)
  // console.log(`基础材料id映射 baseMaterialIdMap`, baseMaterialIdMap)
  return {
    materialMap,
    baseMaterialIdMap,
    materialTypeMap,
    chipsTypeMap,
  }
}

// 角色信息映射
export const useOperatorMaps = () => {
  // console.log(`练度调查映射 statisticsMap`, statisticsMap)
  // console.log(`干员信息映射 operatorMap`, operatorMap)
  // console.log(`干员精英化、专精技能消耗材料映射 operatorMaterialMap`, operatorMaterialMap)
  // console.log(`通用的干员消耗材料信息映射 operatorRarityBaseMaterialMap`, operatorRarityBaseMaterialMap)
  return {
    statisticsMap,
    operatorMap,
    operatorMaterialMap,
    operatorRarityBaseMaterialMap,
  }
}

export const useJSONData = () => {
  return {
    operatorJSON,
    operatorMaterialJSON,
    professionDictJSON,
  }
}