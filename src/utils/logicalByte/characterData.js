const CHARACTER_DATA_STORAGE_KEY = 'logicalByte_data_characterData'
const CHARACTER_DATA_UPDATED_AT_STORAGE_KEY = 'logicalByte_data_lastLoadTime'
const CHARACTER_DATA_STORAGE_VERSION = 2
const CHARACTER_DATA_UPDATED_EVENT = 'logicalByte-character-data-updated'

function getLocalStorage() {
  return typeof window === 'undefined' ? null : window.localStorage
}

function createCostObject(costList = []) {
  const cost = {}

  if (Array.isArray(costList)) {
    for (const item of costList) {
      const itemId = String(item?.id || '')
      const count = Number(item?.count || 0)
      if (!itemId || count <= 0) {
        continue
      }

      cost[itemId] = (cost[itemId] || 0) + count
    }
    return cost
  }

  if (costList && typeof costList === 'object') {
    for (const [itemId, count] of Object.entries(costList)) {
      const numericCount = Number(count || 0)
      if (!itemId || numericCount <= 0) {
        continue
      }

      cost[itemId] = (cost[itemId] || 0) + numericCount
    }
  }

  return cost
}

function getDisplayRarity(rarity) {
  const tierMatch = String(rarity || '').match(/^TIER_(\d+)$/)
  if (tierMatch) {
    return Number(tierMatch[1])
  }

  const numericRarity = Number(rarity)
  if (!Number.isFinite(numericRarity)) {
    return 0
  }

  return numericRarity >= 0 && numericRarity <= 5
    ? numericRarity + 1
    : numericRarity
}

function getSkillIcon(skillId = '') {
  return String(skillId)
    .replaceAll('[', 'x5b')
    .replaceAll(']', 'x5d')
}

function hasCostData(operatorCost) {
  return operatorCost.elite.some(cost => Object.keys(cost).length > 0)
    || operatorCost.skills.some(skill => skill.some(cost => Object.keys(cost).length > 0))
}

function findFallbackSkill(fallbackSkills, skillId, index) {
  return fallbackSkills.find(skill => skill?.skillId === skillId)
    || fallbackSkills[index]
    || {}
}

function normalizeOperator(charId, operator, fallbackOperator = {}) {
  const fallbackSkills = Array.isArray(fallbackOperator.skills)
    ? fallbackOperator.skills
    : []
  const displayRarity = getDisplayRarity(operator.rarity)
  const elite = Array.isArray(operator.phases)
    ? operator.phases.map(phase => createCostObject(phase?.evolveCost))
    : []
  const allSkill = Array.isArray(operator.allSkillLvlup)
    ? operator.allSkillLvlup.map(level => createCostObject(level?.lvlUpCost))
    : []
  const skills = Array.isArray(operator.skills)
    ? operator.skills.map((skill, index) => {
      const skillId = skill?.skillId || ''
      const fallbackSkill = findFallbackSkill(fallbackSkills, skillId, index)
      const specializationCosts = Array.isArray(skill?.levelUpCostCond)
        ? skill.levelUpCostCond.map(level => createCostObject(level?.levelUpCost))
        : []

      return {
        skillName: fallbackSkill.skillName || '',
        skillId,
        skillIcon: fallbackSkill.skillIcon || getSkillIcon(skillId),
        skillLevelUpCost: specializationCosts,
      }
    })
    : []

  return {
    operatorInfo: {
      ...fallbackOperator,
      charId,
      name: operator.name || fallbackOperator.name || charId,
      rarity: displayRarity > 0 ? displayRarity - 1 : fallbackOperator.rarity,
      displayRarity,
      skills,
      elite,
      allSkill,
    },
    operatorCost: {
      elite,
      allSkill,
      skills: skills.map(skill => skill.skillLevelUpCost),
    },
  }
}

export function saveLogicalByteCharacterData(data) {
  const storage = getLocalStorage()
  if (!storage) {
    throw new Error('localStorage is unavailable')
  }

  const normalized = normalizeLogicalByteCharacterData(data)
  const savedAt = new Date().toISOString()
  storage.setItem(CHARACTER_DATA_STORAGE_KEY, JSON.stringify({
    version: CHARACTER_DATA_STORAGE_VERSION,
    ...normalized,
  }))
  storage.setItem(CHARACTER_DATA_UPDATED_AT_STORAGE_KEY, savedAt)
  window.dispatchEvent(new CustomEvent(CHARACTER_DATA_UPDATED_EVENT, {
    detail: { savedAt },
  }))
  return savedAt
}

export function subscribeLogicalByteCharacterData(callback) {
  if (typeof window === 'undefined' || typeof callback !== 'function') {
    return () => {}
  }

  const handleCustomEvent = event => {
    callback({
      savedAt: event.detail?.savedAt || '',
      source: 'same-window',
    })
  }
  const handleStorageEvent = event => {
    if (event.key !== CHARACTER_DATA_STORAGE_KEY) {
      return
    }

    callback({
      savedAt: window.localStorage.getItem(CHARACTER_DATA_UPDATED_AT_STORAGE_KEY) || '',
      source: 'other-window',
    })
  }

  window.addEventListener(CHARACTER_DATA_UPDATED_EVENT, handleCustomEvent)
  window.addEventListener('storage', handleStorageEvent)

  return () => {
    window.removeEventListener(CHARACTER_DATA_UPDATED_EVENT, handleCustomEvent)
    window.removeEventListener('storage', handleStorageEvent)
  }
}

export function loadLogicalByteCharacterData() {
  const storage = getLocalStorage()
  const saved = storage?.getItem(CHARACTER_DATA_STORAGE_KEY)
  if (!saved) {
    return null
  }

  return {
    data: JSON.parse(saved),
    savedAt: storage.getItem(CHARACTER_DATA_UPDATED_AT_STORAGE_KEY) || '',
  }
}

export function normalizeLogicalByteCharacterData(data, fallbackOperatorTable = {}) {
  if (
    data
    && typeof data === 'object'
    && data.operatorTable
    && data.operatorCostTable
  ) {
    return {
      operatorTable: data.operatorTable,
      operatorCostTable: data.operatorCostTable,
    }
  }

  const operatorTable = {}
  const operatorCostTable = {}

  for (const [charId, operator] of Object.entries(data || {})) {
    if (!charId.startsWith('char_') || !operator || typeof operator !== 'object') {
      continue
    }

    const normalized = normalizeOperator(
      charId,
      operator,
      fallbackOperatorTable[charId],
    )
    operatorTable[charId] = normalized.operatorInfo

    if (hasCostData(normalized.operatorCost)) {
      operatorCostTable[charId] = normalized.operatorCost
    }
  }

  return {
    operatorTable,
    operatorCostTable,
  }
}
