import { ref } from 'vue';
import {
  professionMap, // 主职业映射
  subProfessionMap, // 子职业映射
  operatorMaterialMap, // 干员精英化、专精技能消耗材料映射
  materialMap, // 材料总映射
  baseMaterialIdMap, // 基础材料id映射
  chipsTypeMap, // 芯片类型id映射
  statisticsMap, // 练度调查映射
  operatorMap, // 干员信息映射
  operatorRarityBaseMaterialMap, // 干员养成所需固定材料映射
  LMDId, // 龙门币ID
} from './maps'
import { initTableData } from './table'
import { sort } from './utils'
// import { test, showSingleInfo } from './test'

let fixedMaterialIds = [] // 合成固定材料id数组

const totalCostObj = ref({}) // 总材料消耗对象
const operatorOriginData = []; // 干员原始数据列表
const operatorList = ref([]) // 干员列表
// 插入新建自定义干员信息
export const insertOperatorData = (charId, charInfo) => {
  const operatorData = createOperatorData(charId, charInfo);
  operatorOriginData.push(operatorData);
}
// 删除新建自定义干员信息
export const deleteOperatorData = (charId) => {
  const index = operatorOriginData.findIndex(item => item.charId === charId)
  operatorOriginData.splice(index, 1)
}
// 将原始数据初始化后赋值到干员列表
export const initOperatorData = () => {
  // 清空总cost对象, 用于添加自定义干员后再次调用此函数时防止反复push
  totalCostObj.value = {}
  // 按精二成本排序
  sort(operatorOriginData, 'elite.totalCost', (a, b) => b.rarity - a.rarity || a.charId.split('_')[1] - b.charId.split('_')[1])
  // 统计材料总成本用来排位
  operatorOriginData.forEach((item, index) => {
    const { rarity, elite, skills, mods } = item
    if (rarity < 4) return
    item.index = index + 1;
    if (!totalCostObj.value[rarity]) {
      totalCostObj.value[rarity] = {
        eliteCosts: [],
        skillCosts: [],
        modCosts: []
      };
    }
    const { eliteCosts, skillCosts, modCosts } = totalCostObj.value[rarity]
    eliteCosts.push(elite.totalCost)
    skills.forEach(t => {
      skillCosts.push(t.totalCost)
    })
    mods.forEach(t => {
      modCosts.push(t.totalCost)
    })
  })
  // 排序材料总成本
  Object.values(totalCostObj.value).forEach(rarityObj => {
    const { eliteCosts, skillCosts, modCosts } = rarityObj
    eliteCosts.sort((a, b) => b - a);
    skillCosts.sort((a, b) => b - a);
    modCosts.sort((a, b) => b - a);
  });
  // console.log(`总材料消耗列表 totalCostObj.value`, totalCostObj.value)
  // console.log('初始化干员数据:', operatorOriginData);
  operatorList.value = operatorOriginData
}

// 创建单个干员数据
export const createOperatorData = (charId, charInfo) => {
  const { name, profession, subProfessionId, rarity, itemObtainApproach, equip, skill } = charInfo;
  let { skills, elite } = operatorMaterialMap.get(charId);

  // 20250504为解决重复计算阿米娅养成材料问题删掉了阿米娅其他升变形态的精英化材料 char_002_amiya char_1001_amiya2 char_1037_amiya3
  if (charId.includes('amiya')) {
    // 所有阿米娅升变形态皆取术兔精英化材料
    elite = operatorMaterialMap.get('char_002_amiya').elite
  }
  // 手动添加精英化所需的龙门币数量
  const filteredElite = elite.filter(obj => Object.keys(obj).length !== 0)
  // 精英化材料数据里面没有龙门币数据, 添加精英化时消耗的龙门币数量
  // 因为目前只有4,5,6星干员精二券(也只有4,5,6星干员能精二), 所以仅对4,5,6星干员添加龙门币数量
  if (rarity > 3) {
    const baseEliteMaterials = operatorRarityBaseMaterialMap.get(rarity).elite
    baseEliteMaterials.forEach((rankMaterials, index) => {
      const LMDItem = rankMaterials.fixedMaterialList.find(item => item.itemId === LMDId)
      filteredElite[index][LMDId] = LMDItem.quantity
    })
  }

  const eliteInfo = formatElite(filteredElite); // 格式化精英化材料
  const skillsInfo = mergeSkills(skill, skills, charId, name) // 格式化技能材料
  const modsInfo = formatMods(equip, name) // 格式化模组材料
  
  const charStatistics = statisticsMap.get(charId); // 干员统计数据
  if (charStatistics) { // 新干员前几天可能会没有统计数据
    // 精二率
    setRateForEntries(eliteInfo, charStatistics.elite);
    // 技能专三率
    skillsInfo.forEach((item, index) => {
      setRateForEntries(item, charStatistics[`skill${index + 1}`]);
    });
    // 开三级模组率
    modsInfo.forEach(item => {
      setRateForEntries(item, charStatistics[`mod${item.typeName2}`]);
    });
  }

  return {
    name,
    charId,
    profession,
    professionName: professionMap.get(profession),
    subProfessionId,
    subProfessionName: subProfessionMap.get(subProfessionId),
    rarity,
    itemObtainApproach,
    elite: eliteInfo,
    skills: skillsInfo,
    mods: modsInfo,
  };
}

// 设置对象中的 rate 属性
const setRateForEntries = (obj, statistics) => {
  if (!obj || !statistics) return;

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'object' && value !== null) {
      value.rate = statistics[key];
    }
  }
}

// 格式化精英化材料对象数组
const formatElite = (elite) => {
  return formatTotalMaterials(elite)
}

// 合并技能信息和技能材料
const mergeSkills = (skillInfoArr, skillItemsArr, charId, operatorName) => {
  return skillInfoArr.map((item, index) => ({
    charId, // 后续判断是否为自定义干员用
    operatorName, // 表格展示技能所属干员用
    ...item,
    ...formatTotalMaterials(skillItemsArr[index])
  }))
}

// 格式化模组材料对象数组
const formatMods = (mods, operatorName) => {
  if (!mods) return []
  return mods.map(item => {
    const { itemCost, ...modInfo } = item
    return {
      operatorName, // 表格展示模组所属干员用
      ...modInfo,
      ...formatTotalMaterials(itemCost)
    }
  })
}

// 格式化总材料对象数组
const formatTotalMaterials = (items) => {
  // 初始化一个空对象用于存储每个等级的材料和成本
  const obj = {};
  // 初始化总成本变量
  let totalCost = 0;
  items.forEach((item, i) => {
    const materials = formatRankMaterials(item)
    const rankTotalCost = materials.reduce((acc, cur) => acc + cur.totalCost, 0)
    // 计算当前等级材料的总成本并存入对象
    obj[`rank${i + 1}`] = {
      materials,
      totalCost: rankTotalCost
    };
    // 累加总成本
    totalCost += rankTotalCost;
  });
  
  obj.totalCost = totalCost
  return obj
}

// 格式化单个rank材料对象数组
const formatRankMaterials = (element) => {
  const arr = []
  let LMDQuantity = 0 // 龙门币数量
  const fixedMaterials = [] // 固定材料列表
  for (const [itemId, quantity] of Object.entries(element)) {
    if (fixedMaterialIds.includes(itemId)) { // 此为固定材料
      if (itemId === LMDId) LMDQuantity = quantity // 龙门币位置不对, 在下面单独插入
      else fixedMaterials.push(getItemInfo(itemId, quantity, materialMap))
      continue
    }
    const itemInfo = getItemInfo(itemId, quantity, materialMap)
    arr.push(itemInfo)
  }
  // 详情弹窗的材料展示顺序排序
  arr.sort((a, b) => b.rarity - a.rarity || b.itemId - a.itemId)
  // 将龙门币位置放在第一个
  if (LMDQuantity) {
    const LMDInfo = materialMap.get(LMDId)
    fixedMaterials.unshift({
      ...LMDInfo,
      quantity: LMDQuantity,
      totalCost: LMDInfo.itemValueAp * LMDQuantity
    })
  }
  return [...fixedMaterials, ...arr]
}

// 根据itemId获取材料信息
const getItemInfo = (itemId, quantity, map) => {
  const item = map.get(itemId) || {} // 材料对象
  const { itemName, rarity, itemValueAp } = item

  return {
    itemId,
    itemName,
    rarity,
    itemValueAp,
    quantity,
    totalCost: itemValueAp * quantity
  }
}

// 初始化干员数据
const operatorInit = () => {
  const baseMaterialIds = Array.from(baseMaterialIdMap.values()) // 基础材料id数组
  const chipIds = Array.from(chipsTypeMap.values()).flat().map(item => item.itemId) // 芯片id数组
  fixedMaterialIds = [...baseMaterialIds, ...chipIds] // 合成固定材料id数组
  
  for (const [charId, charInfo] of operatorMap.entries()) {
    insertOperatorData(charId, charInfo)
  }
  initOperatorData()
  initTableData() // 初始化表格数据
}

export {
  operatorList,
  totalCostObj,
  operatorInit
}