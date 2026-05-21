import {dateFormat, formatDateString} from '/src/utils/dateUtil.js'
import operatorTableSimple from '/src/static/json/operator/character_table_simple.json'
import OperatorUpdateTime from '/public/json/operator_update_time.json'
import operatorItemCostTable from '/src/static/json/operator/operator_item_cost_table.json'
import compositeTableJson from '/src/static/json/material/composite_table.v2.json'
import itemInfo from '/src/static/json/material/item_info.json'
import {getEquipUpdateTime} from '/src/utils/gameData.js'

const MATERIAL_ITEM_ID_REGEX = /^3\d{4}$/
const DEFAULT_DEMAND_ROUND_STEP = 100

let cachedStatistics = null

function buildMaterialDemandStatistics() {
  const compositeTable = {}
  for (const item of compositeTableJson) {
    const {itemId, resolve, pathway, rarity} = item
    compositeTable[itemId] = {resolve, pathway, rarity}
  }

  const itemInfoList = []
  const itemInfoMap = new Map()
  const r3MapTemplate = new Map()
  const r3ItemIdList = []

  for (const item of itemInfo) {
    itemInfoMap.set(item.itemId, item)
    if (MATERIAL_ITEM_ID_REGEX.test(item.itemId)) {
      itemInfoList.push(item)
      if (item.rarity === 3) {
        r3MapTemplate.set(item.itemId, 0)
        r3ItemIdList.push(item)
      }
    }
  }

  r3ItemIdList.sort((a, b) => Number(a.itemId) - Number(b.itemId))

  const mapItemCostStatistics = new Map()
  const operatorAndEquipCollectByDate = new Map()
  const equipUpdateTimeMap = getEquipUpdateTime()

  const updateItemCostStatisticsMap = (itemId, cost) => {
    const oldValue = mapItemCostStatistics.get(itemId) || 0
    mapItemCostStatistics.set(itemId, oldValue + cost)
  }

  const addItemCost = (collect, itemId, cost) => {
    const oldValue = collect.itemCost.get(itemId) || 0
    collect.itemCost.set(itemId, oldValue + cost)
    updateItemCostStatisticsMap(itemId, cost)
  }

  for (const charId in operatorTableSimple) {
    const operatorTableSimpleElement = operatorTableSimple[charId]
    const {equip} = operatorTableSimpleElement
    const operatorItemCostTableElement = operatorItemCostTable[charId]
    if (!operatorItemCostTableElement) {
      continue
    }

    const {skills, allSkill, elite} = operatorItemCostTableElement
    const operatorUpdateTimeElement = OperatorUpdateTime[charId]
    let operatorUpdateTime = new Date()
    let operatorUpdateTimeText = dateFormat(operatorUpdateTime)

    if (operatorUpdateTimeElement) {
      operatorUpdateTime = new Date(operatorUpdateTimeElement.updateTime)
      operatorUpdateTimeText = dateFormat(operatorUpdateTime)
    }

    let collectByOperator = operatorAndEquipCollectByDate.get(operatorUpdateTimeText)
    if (!collectByOperator) {
      collectByOperator = {
        updateTime: operatorUpdateTime.getTime(),
        updateTimeText: operatorUpdateTimeText,
        operator: [],
        equip: [],
        itemCost: new Map()
      }
    }

    collectByOperator.operator.push(charId)

    for (const table of [allSkill, elite]) {
      if (!table) {
        continue
      }
      for (const item of table) {
        for (const itemId in item) {
          if (MATERIAL_ITEM_ID_REGEX.test(itemId)) {
            addItemCost(collectByOperator, itemId, item[itemId])
          }
        }
      }
    }

    if (skills) {
      for (const skill of skills) {
        for (const item of skill) {
          for (const itemId in item) {
            if (MATERIAL_ITEM_ID_REGEX.test(itemId)) {
              addItemCost(collectByOperator, itemId, item[itemId])
            }
          }
        }
      }
    }

    operatorAndEquipCollectByDate.set(operatorUpdateTimeText, collectByOperator)

    if (equip) {
      let lastTime = operatorUpdateTimeText
      for (const item of equip) {
        const {uniEquipName, typeIcon, itemCost} = item
        let equipUpdateTimeText = equipUpdateTimeMap.get(uniEquipName)
        if (equipUpdateTimeText) {
          equipUpdateTimeText = formatDateString(equipUpdateTimeText)
          lastTime = equipUpdateTimeText
        } else {
          equipUpdateTimeText = lastTime
        }

        const equipUpdateTime = new Date(`${equipUpdateTimeText} 16:00:00`)
        if (Number.isNaN(equipUpdateTime.getTime())) {
          continue
        }

        let collectByEquip = operatorAndEquipCollectByDate.get(equipUpdateTimeText)
        if (!collectByEquip) {
          collectByEquip = {
            updateTime: equipUpdateTime.getTime(),
            updateTimeText: equipUpdateTimeText,
            operator: [],
            equip: [],
            itemCost: new Map()
          }
        }
        collectByEquip.equip.push(typeIcon)

        for (const obj of itemCost) {
          for (const itemId in obj) {
            if (MATERIAL_ITEM_ID_REGEX.test(itemId)) {
              addItemCost(collectByEquip, itemId, obj[itemId])
            }
          }
        }

        operatorAndEquipCollectByDate.set(equipUpdateTimeText, collectByEquip)
      }
    }
  }

  const listItemCostStatistics = []
  for (const [itemId, count] of mapItemCostStatistics) {
    const rarity = itemInfoMap.get(itemId)?.rarity || 0
    listItemCostStatistics.push({itemId, count, rarity})
  }
  listItemCostStatistics.sort((a, b) => b.rarity - a.rarity)

  const splitItem = (map) => {
    const copyMap = new Map(map)
    const tempMap = new Map(r3MapTemplate)

    for (const [itemId, value] of copyMap) {
      if (tempMap.get(itemId) === 0) {
        tempMap.set(itemId, value)
      }
      const compositeTableElement = compositeTable[itemId]
      if (!compositeTableElement) {
        continue
      }

      const {pathway, rarity} = compositeTableElement
      if (rarity === 5) {
        for (const item of pathway) {
          const oldValue = copyMap.get(item.itemId) || 0
          copyMap.set(item.itemId, oldValue + item.count * value)
        }
      }
    }

    for (const [itemId, value] of copyMap) {
      const compositeTableElement = compositeTable[itemId]
      if (!compositeTableElement) {
        continue
      }

      const {pathway, rarity} = compositeTableElement
      if (rarity === 4) {
        for (const item of pathway) {
          const oldValue = tempMap.get(item.itemId) || 0
          tempMap.set(item.itemId, oldValue + item.count * value)
        }
      }
    }

    const list = []
    for (const itemId of tempMap.keys()) {
      list.push({
        itemId: itemId,
        itemName: itemInfoMap.get(itemId)?.itemName || '',
        count: tempMap.get(itemId)
      })
    }
    list.sort((a, b) => Number(a.itemId) - Number(b.itemId))
    return list
  }

  const r3ItemCostList = splitItem(mapItemCostStatistics)
  const r3ItemCostListByDate = []
  const updateTimeList = []

  for (const [, value] of operatorAndEquipCollectByDate) {
    const {updateTime, itemCost} = value
    if (!Number.isFinite(updateTime)) {
      continue
    }

    const r3List = splitItem(itemCost)
    const totalCount = r3List.reduce((sum, item) => sum + item.count, 0)
    for (const item of r3List) {
      item.rate = totalCount > 0 ? item.count / totalCount : 0
    }

    updateTimeList.push(updateTime)
    r3ItemCostListByDate.push({
      updateTime,
      list: r3List
    })
  }

  updateTimeList.sort((a, b) => a - b)
  r3ItemCostListByDate.sort((a, b) => b.updateTime - a.updateTime)

  return {
    itemInfoList,
    itemInfoMap,
    r3ItemIdList,
    updateTimeList,
    mapItemCostStatistics,
    listItemCostStatistics,
    operatorAndEquipCollectByDate,
    r3ItemCostList,
    r3ItemCostListByDate,
    splitItem
  }
}

export function getMaterialDemandStatistics() {
  if (!cachedStatistics) {
    cachedStatistics = buildMaterialDemandStatistics()
  }
  return cachedStatistics
}

export function getR3MaterialDemandInRange(itemId, startTime, endTime = Date.now()) {
  if (!itemId || !Number.isFinite(startTime) || !Number.isFinite(endTime)) {
    return 0
  }

  const {r3ItemCostListByDate} = getMaterialDemandStatistics()
  return r3ItemCostListByDate.reduce((sum, versionCost) => {
    if (versionCost.updateTime < startTime || versionCost.updateTime > endTime) {
      return sum
    }

    const itemCost = versionCost.list.find(item => item.itemId === itemId)
    return sum + (itemCost?.count || 0)
  }, 0)
}

export function getRecentR3MaterialDemand(itemId, {years = 2, now = new Date()} = {}) {
  const endDate = now instanceof Date ? new Date(now) : new Date(now)
  if (Number.isNaN(endDate.getTime())) {
    return 0
  }

  const startDate = new Date(endDate)
  startDate.setFullYear(startDate.getFullYear() - years)
  startDate.setHours(0, 0, 0, 0)

  return getR3MaterialDemandInRange(itemId, startDate.getTime(), endDate.getTime())
}

export function formatMaterialDemandCount(count, roundStep = DEFAULT_DEMAND_ROUND_STEP) {
  if (!Number.isFinite(count) || count <= 0) {
    return ''
  }

  const roundedCount = Math.floor(count / roundStep) * roundStep
  return `${roundedCount > 0 ? roundedCount : Math.floor(count)}+`
}
