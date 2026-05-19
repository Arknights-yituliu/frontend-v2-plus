import fs from 'node:fs/promises'

const BUILDING_DATA_URL = 'https://raw.githubusercontent.com/Kengxxiao/ArknightsGameData/master/zh_CN/gamedata/excel/building_data.json'
const OUTPUT_PATH = 'src/static/json/build/logistics_skill_replace_groups.json'

const roomTypeMap = {
  CONTROL: 'control',
  DORMITORY: 'dormitory',
  HIRE: 'hire',
  MANUFACTURE: 'manufacture',
  MEETING: 'meeting',
  POWER: 'power',
  TRADING: 'trading',
  TRAINING: 'training',
  WORKSHOP: 'workshop',
}

function getPhaseNumber(phase) {
  return Number(String(phase || 'PHASE_0').replace('PHASE_', '')) || 0
}

function getSkillKey({charId, roomType, buffName, phase, level}) {
  return [charId, roomType, buffName, phase, level].join('|')
}

async function fetchBuildingData() {
  if (process.env.BUILDING_DATA_PATH) {
    return JSON.parse(await fs.readFile(process.env.BUILDING_DATA_PATH, 'utf8'))
  }

  const response = await fetch(process.env.BUILDING_DATA_URL || BUILDING_DATA_URL)
  if (!response.ok) {
    throw new Error(`Failed to fetch building_data.json: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

function buildSkillGroupTable(buildingData) {
  const skillGroupTable = {}

  for (const char of Object.values(buildingData.chars || {})) {
    for (const [groupIndex, buffGroup] of (char.buffChar || []).entries()) {
      const buffDataList = buffGroup.buffData || []
      if (buffDataList.length < 2) {
        continue
      }

      const groupKey = `${char.charId}|${groupIndex}`
      for (const buffData of buffDataList) {
        const buff = buildingData.buffs?.[buffData.buffId]
        if (!buff) {
          continue
        }

        const key = getSkillKey({
          charId: char.charId,
          roomType: roomTypeMap[buff.roomType] || String(buff.roomType || '').toLowerCase(),
          buffName: buff.buffName,
          phase: getPhaseNumber(buffData.cond?.phase),
          level: Number(buffData.cond?.level || 1),
        })
        skillGroupTable[key] = groupKey
      }
    }
  }

  return Object.fromEntries(Object.entries(skillGroupTable).sort(([a], [b]) => a.localeCompare(b)))
}

const buildingData = await fetchBuildingData()
const skillGroupTable = buildSkillGroupTable(buildingData)
await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(skillGroupTable, null, 2)}\n`)
console.log(`Generated ${Object.keys(skillGroupTable).length} skill group entries at ${OUTPUT_PATH}`)
