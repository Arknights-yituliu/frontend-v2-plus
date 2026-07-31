import operatorItemCostTable from '/src/static/json/operator/operator_item_cost_table.json'
import operatorTable from '/src/static/json/operator/character_table_simple.json'
import operatorTableV2 from '/src/static/json/operator/character_table_simple.v2.json'
import {
  loadLogicalByteCharacterData,
  normalizeLogicalByteCharacterData,
} from '/src/utils/logicalByte/characterData.js'

const T5_MATERIAL_ID_REGEX = /^\d{4}5$/
const T4_MATERIAL_ID_REGEX = /^\d{4}4$/
const ELITE_LMD_COST_BY_RARITY = {
  3: [10000],
  4: [15000, 60000],
  5: [20000, 120000],
  6: [30000, 180000],
}
const ELITE_LEVELING_COST_BY_RARITY = {
  4: { lmd: 146241, exp: 150200 },
  5: { lmd: 251947, exp: 239400 },
  6: { lmd: 409841, exp: 361400 },
}
const LMD_ITEM_ID = '4001'
const BASIC_BATTLE_RECORD_ITEM_ID = '2001'
const BASIC_BATTLE_RECORD_EXP = 200

export function createItemInfoMap(list = []) {
  const map = new Map()

  for (const item of list) {
    map.set(item.itemId, {
      ...item,
      itemValue: getItemValue(item),
    })
  }

  return map
}

export function createYieldOverviewPptCalculator(itemInfoMap, showSkillT4Materials = false) {
  const uploadedCharacterData = loadUploadedCharacterData()
  const activeOperatorTable = {
    ...operatorTableV2,
    ...uploadedCharacterData.operatorTable,
  }
  const activeOperatorCostTable = {
    ...operatorItemCostTable,
    ...uploadedCharacterData.operatorCostTable,
  }

  function getDisplayRarity(charId) {
    return getDisplayRarityFromTables(
      charId,
      activeOperatorTable,
      uploadedCharacterData.operatorTable,
    )
  }

  const rankingContext = buildRankingContext(
    itemInfoMap,
    activeOperatorTable,
    activeOperatorCostTable,
    getDisplayRarity,
  )

  function getOperatorOptions() {
    return Object.entries(activeOperatorTable)
      .filter(([charId]) => Boolean(activeOperatorCostTable[charId]))
      .map(([charId, operator]) => ({
        charId,
        name: operator.name || operatorTable[charId]?.name || charId,
        rarity: getDisplayRarity(charId),
      }))
      .filter(operator => operator.name)
      .sort((left, right) => left.name.localeCompare(right.name, 'zh-CN'))
  }

  function buildOperators(charIds = []) {
    return charIds
      .map(charId => {
        const operator = activeOperatorTable[charId]
        if (!operator || !activeOperatorCostTable[charId]) {
          return null
        }

        const resolvedOperator = {
          charId,
          ...operator,
          name: operator.name || operatorTable[charId]?.name || charId,
          rarity: getDisplayRarity(charId),
        }
        const rows = buildOperatorRows(
          resolvedOperator,
          rankingContext,
          itemInfoMap,
          activeOperatorTable,
          activeOperatorCostTable,
          showSkillT4Materials,
        )
        return rows.length > 0 ? { ...resolvedOperator, rows } : null
      })
      .filter(Boolean)
  }

  function findOperatorIds(value) {
    const names = String(value || '')
      .split(/[,\uFF0C\n]/)
      .map(name => name.trim())
      .filter(Boolean)

    const options = getOperatorOptions()
    return names
      .map(name => {
        const exact = options.find(option => option.name === name || option.charId === name)
        return exact?.charId || options.find(option => option.name.includes(name))?.charId || ''
      })
      .filter(Boolean)
      .slice(0, 3)
  }

  return {
    activeOperatorTable,
    activeOperatorCostTable,
    getDisplayRarity,
    getOperatorOptions,
    buildOperators,
    findOperatorIds,
  }
}

function getItemValue(item) {
  const value = Number(item?.itemValue ?? item?.itemValueAp ?? 0)
  return Number.isFinite(value) ? value : 0
}

function loadUploadedCharacterData() {
  try {
    const saved = loadLogicalByteCharacterData()
    if (saved?.data) {
      return normalizeLogicalByteCharacterData(saved.data, operatorTableV2)
    }
  } catch (error) {
    console.warn('读取共享干员数据失败:', error)
  }

  return {
    operatorTable: {},
    operatorCostTable: {},
  }
}

function isT5Material(itemId, itemInfoMap) {
  return T5_MATERIAL_ID_REGEX.test(itemId) && itemInfoMap.get(itemId)?.type?.includes('精英')
}

function isT4Material(itemId, itemInfoMap) {
  return T4_MATERIAL_ID_REGEX.test(itemId) && itemInfoMap.get(itemId)?.type?.includes('精英')
}

function toCostEntries(costObject = {}, itemInfoMap) {
  return Object.entries(costObject)
    .filter(([, count]) => Number(count) > 0)
    .map(([itemId, count]) => {
      const item = itemInfoMap.get(itemId)
      return {
        itemId,
        count: Number(count),
        itemName: item?.itemName || itemId,
        rarity: item?.rarity || 0,
        type: item?.type || '',
        isT5: isT5Material(itemId, itemInfoMap),
        isT4: isT4Material(itemId, itemInfoMap),
      }
    })
    .sort((left, right) => {
      const leftT5 = isT5Material(left.itemId, itemInfoMap) ? 1 : 0
      const rightT5 = isT5Material(right.itemId, itemInfoMap) ? 1 : 0
      return rightT5 - leftT5
        || right.rarity - left.rarity
        || Number(right.itemId) - Number(left.itemId)
    })
}

function getMaterialCost(costObject = {}, itemInfoMap) {
  return Object.entries(costObject).reduce((total, [itemId, count]) => {
    return total + getItemValue(itemInfoMap.get(itemId)) * Number(count || 0)
  }, 0)
}

function addCostItem(costObject, itemId, count) {
  const numericCount = Number(count || 0)
  if (numericCount > 0) {
    costObject[itemId] = (costObject[itemId] || 0) + numericCount
  }
}

function getElite2MergedCost(operatorCost, rarity) {
  const mergedCost = mergeCostObjects([operatorCost.elite?.[1] || {}, operatorCost.elite?.[2] || {}])
  const lmdCost = ELITE_LMD_COST_BY_RARITY[rarity] || []
  if (lmdCost.length > 0) {
    addCostItem(mergedCost, LMD_ITEM_ID, lmdCost.reduce((total, count) => total + count, 0))
  }

  const levelingCost = ELITE_LEVELING_COST_BY_RARITY[rarity]
  if (levelingCost) {
    addCostItem(mergedCost, LMD_ITEM_ID, levelingCost.lmd)
    addCostItem(mergedCost, BASIC_BATTLE_RECORD_ITEM_ID, Math.ceil(levelingCost.exp / BASIC_BATTLE_RECORD_EXP))
  }

  return mergedCost
}

function getElite2RankingCost(operatorCost, rarity, itemInfoMap) {
  return getMaterialCost(getElite2MergedCost(operatorCost, rarity), itemInfoMap)
}

function getNonChipMaterialEntries(costObject, itemInfoMap) {
  return toCostEntries(costObject, itemInfoMap).filter(item => {
    return !itemInfoMap.get(item.itemId)?.type?.includes('芯片')
  })
}

function getSkillVisibleMaterialEntries(costObject, itemInfoMap, showSkillT4Materials) {
  return toCostEntries(costObject, itemInfoMap).filter(item => {
    if (isT5Material(item.itemId, itemInfoMap)) {
      return true
    }

    return showSkillT4Materials && isT4Material(item.itemId, itemInfoMap)
  })
}

function getSkillOtherMaterialSummary(costObject, itemInfoMap, showSkillT4Materials) {
  const otherEntries = toCostEntries(costObject, itemInfoMap).filter(item => {
    if (isT5Material(item.itemId, itemInfoMap)) {
      return false
    }

    if (showSkillT4Materials && isT4Material(item.itemId, itemInfoMap)) {
      return false
    }

    return true
  })

  if (otherEntries.length === 0) {
    return ''
  }

  return showSkillT4Materials ? '+若干蓝材料' : '+若干紫材料'
}

function getRank(list, cost) {
  const index = list.findIndex(item => item === cost)
  return index === -1 ? '-' : `${index + 1}/${list.length}`
}

function buildRankingContext(
  itemInfoMap,
  activeOperatorTable,
  activeOperatorCostTable,
  getDisplayRarity = charId => getDisplayRarityFromTables(charId, activeOperatorTable),
) {
  const eliteCostsByRarity = new Map()
  const skillCostsByRarity = new Map()

  for (const [charId, operatorCost] of Object.entries(activeOperatorCostTable)) {
    const rarity = getDisplayRarity(charId)
    if (!rarity) {
      continue
    }

    const elite2Cost = operatorCost.elite?.[2]
    if (elite2Cost && Object.keys(elite2Cost).length > 0) {
      if (!eliteCostsByRarity.has(rarity)) {
        eliteCostsByRarity.set(rarity, [])
      }
      eliteCostsByRarity.get(rarity).push(getElite2RankingCost(operatorCost, rarity, itemInfoMap))
    }

    for (const skillCostList of operatorCost.skills || []) {
      const mergedCost = mergeCostObjects(skillCostList)
      if (Object.keys(mergedCost).length > 0) {
        if (!skillCostsByRarity.has(rarity)) {
          skillCostsByRarity.set(rarity, [])
        }
        skillCostsByRarity.get(rarity).push(getMaterialCost(mergedCost, itemInfoMap))
      }
    }
  }

  for (const costs of eliteCostsByRarity.values()) {
    costs.sort((left, right) => right - left)
  }
  for (const costs of skillCostsByRarity.values()) {
    costs.sort((left, right) => right - left)
  }

  return { eliteCostsByRarity, skillCostsByRarity }
}

function getDisplayRarityFromTables(charId, activeOperatorTable, uploadedOperatorTable = {}) {
  const uploadedRarity = Number(uploadedOperatorTable[charId]?.displayRarity)
  if (Number.isFinite(uploadedRarity) && uploadedRarity > 0) {
    return uploadedRarity
  }

  const rarity = operatorTable[charId]?.rarity
  if (Number.isFinite(rarity)) {
    return rarity
  }

  const zeroBasedRarity = activeOperatorTable[charId]?.rarity
  return Number.isFinite(zeroBasedRarity) ? zeroBasedRarity + 1 : 0
}

function buildOperatorRows(
  operator,
  context,
  itemInfoMap,
  activeOperatorTable,
  activeOperatorCostTable,
  showSkillT4Materials,
) {
  const operatorCost = activeOperatorCostTable[operator.charId]
  if (!operatorCost) {
    return []
  }

  const rows = []
  const elite2Cost = operatorCost.elite?.[2] || {}
  if (Object.keys(elite2Cost).length > 0) {
    const totalCost = getElite2RankingCost(operatorCost, operator.rarity, itemInfoMap)
    rows.push({
      key: 'elite2',
      title: '精二',
      skillIcon: '',
      materials: getNonChipMaterialEntries(elite2Cost, itemInfoMap),
      otherSummary: '',
      totalCost,
      rank: getRank(context.eliteCostsByRarity.get(operator.rarity) || [], totalCost),
    })
  }

  const skillNameList = activeOperatorTable[operator.charId]?.skills || []
  ;(operatorCost.skills || []).forEach((skillCostList, index) => {
    const mergedCost = mergeCostObjects(skillCostList)
    if (Object.keys(mergedCost).length === 0) {
      return
    }

    const totalCost = getMaterialCost(mergedCost, itemInfoMap)
    rows.push({
      key: `skill${index + 1}`,
      title: `${index + 1}技能专精`,
      subtitle: skillNameList[index]?.skillName || '',
      skillIcon: skillNameList[index]?.skillIcon || skillNameList[index]?.skillId || '',
      materials: getSkillVisibleMaterialEntries(mergedCost, itemInfoMap, showSkillT4Materials),
      otherSummary: getSkillOtherMaterialSummary(mergedCost, itemInfoMap, showSkillT4Materials),
      totalCost,
      rank: getRank(context.skillCostsByRarity.get(operator.rarity) || [], totalCost),
    })
  })

  return rows
}

function mergeCostObjects(list = []) {
  return list.reduce((merged, item) => {
    for (const [itemId, count] of Object.entries(item || {})) {
      merged[itemId] = (merged[itemId] || 0) + Number(count || 0)
    }
    return merged
  }, {})
}
