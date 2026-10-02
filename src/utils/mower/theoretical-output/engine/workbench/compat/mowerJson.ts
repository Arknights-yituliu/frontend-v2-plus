import { OPERATOR_MAP, OPERATORS, type OperatorRecord } from '../../domain/operators'
import { createDefaultWorkspace } from '../defaults'
import { inferFacilityLevels } from '../levelInference'
import {
  MOWER_ROOM_IDS,
  type MowerFacilityType,
  type MowerProduct,
  type MowerRoomId,
  type MowerSlot,
  type RosterWorkspace,
} from '../model'

const OPERATOR_BY_NAME = new Map<string, OperatorRecord>()
const OPERATOR_BY_APPELLATION = new Map<string, OperatorRecord>()
const OPERATOR_BY_ID = new Map<string, OperatorRecord>()

for (const op of OPERATORS) {
  OPERATOR_BY_NAME.set(op.name, op)
  OPERATOR_BY_APPELLATION.set(op.appellation.toLowerCase(), op)
  OPERATOR_BY_ID.set(op.charId, op)
}

export function resolveOperatorCharId(identifier: string): string {
  if (OPERATOR_BY_ID.has(identifier)) return identifier
  const byName = OPERATOR_BY_NAME.get(identifier)
  if (byName) return byName.charId
  const byAppellation = OPERATOR_BY_APPELLATION.get(identifier.toLowerCase())
  if (byAppellation) return byAppellation.charId
  return identifier
}

export function restoreOperatorMowerName(charIdOrName: string): string {
  const op = OPERATOR_MAP.get(charIdOrName)
  return op ? op.name : charIdOrName
}

export function parseProduct(product: unknown): MowerProduct | undefined {
  if (typeof product !== 'string') return undefined
  if (product === 'exp3' || product === 'exp') return 'exp'
  if (product === 'orirock' || product === 'fragment') return 'fragment'
  if (product === 'lmd' || product === 'money') return 'money'
  if (product === 'gold') return 'gold'
  if (product === 'orundum') return 'orundum'
  return undefined
}

export function serializeProduct(
  facilityType: MowerFacilityType,
  product: MowerProduct | undefined,
): string | undefined {
  if (facilityType === 'manufacture') {
    if (product === 'exp') return 'exp3'
    if (product === 'fragment') return 'orirock'
    if (product === 'gold') return 'gold'
    return undefined
  }
  if (facilityType === 'trading') {
    if (product === 'orundum') return 'orundum'
    if (product === 'money') return 'lmd'
    return undefined
  }
  return undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const CONF_LIST_FIELDS = [
  'exhaust_require',
  'rest_in_full',
  'resting_priority',
  'workaholic',
  'refresh_trading',
  'refresh_drained',
  'ope_resting_priority',
] as const

type ConfListField = (typeof CONF_LIST_FIELDS)[number]

function isConfListField(key: string): key is ConfListField {
  return (CONF_LIST_FIELDS as readonly string[]).includes(key)
}

export function importMowerJson(text: string): RosterWorkspace {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch (err) {
    throw new Error(`Invalid Mower JSON: ${err instanceof Error ? err.message : String(err)}`)
  }

  if (!isRecord(parsed)) {
    throw new Error('Invalid Mower JSON: Root must be an object')
  }

  const defaultKey = typeof parsed.default === 'string' && parsed.default.trim()
    ? parsed.default.trim()
    : 'plan1'

  const rawPlan = parsed[defaultKey]
  if (rawPlan === undefined) {
    throw new Error(`Invalid Mower JSON: Main plan "${defaultKey}" not found`)
  }
  if (!isRecord(rawPlan)) {
    throw new Error(`Invalid Mower JSON: Main plan "${defaultKey}" must be an object`)
  }

  const ws = createDefaultWorkspace()
  // Missing staffing is empty. Right-side facilities keep the source's
  // inferred physical levels; undeclared left-side production rooms are unbuilt.
  for (const roomId of MOWER_ROOM_IDS) {
    const facility = ws.mainPlan.facilities[roomId]
    facility.slots = []
    if (roomId.startsWith('room_')) {
      facility.type = ''
      facility.product = undefined
    }
  }
  ws.compatibility.defaultPlanKey = defaultKey
  ws.compatibility.facilityMetadata = {}
  ws.compatibility.unrecognizedRooms = {}

  const knownRoomSet = new Set<string>(MOWER_ROOM_IDS)
  const importedPresentRooms: string[] = []

  for (const [roomIdStr, rawFacility] of Object.entries(rawPlan)) {
    if (!knownRoomSet.has(roomIdStr)) {
      ws.compatibility.unrecognizedRooms[roomIdStr] = rawFacility
      continue
    }

    if (!isRecord(rawFacility)) {
      throw new Error(`Invalid Mower JSON: Room "${roomIdStr}" must be an object`)
    }

    importedPresentRooms.push(roomIdStr)
    const roomId = roomIdStr as MowerRoomId
    const facility = ws.mainPlan.facilities[roomId]

    const facilityExtra: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(rawFacility)) {
      if (k !== 'name' && k !== 'plans' && k !== 'product') {
        facilityExtra[k] = v
      }
    }

    if (rawFacility.name === '制造站') facility.type = 'manufacture'
    else if (rawFacility.name === '贸易站') facility.type = 'trading'
    else if (rawFacility.name === '发电站') facility.type = 'power'
    else if (typeof rawFacility.name === 'string' && rawFacility.name) {
      facility.type = ''
      facilityExtra.rawName = rawFacility.name
    }

    const parsedProduct = parseProduct(rawFacility.product)
    if (parsedProduct) {
      facility.product = parsedProduct
    } else {
      facility.product = undefined
      if (typeof rawFacility.product === 'string' && rawFacility.product) {
        facilityExtra.rawProduct = rawFacility.product
      }
    }

    if (Object.keys(facilityExtra).length > 0) {
      ws.compatibility.facilityMetadata[roomId] = facilityExtra
    }

    if (Array.isArray(rawFacility.plans)) {
      const slots: MowerSlot[] = []

      for (let i = 0; i < rawFacility.plans.length; i++) {
        const rawSlot = rawFacility.plans[i]
        if (!isRecord(rawSlot)) {
          throw new Error(`Invalid Mower JSON: Slot at index ${i} in room "${roomId}" must be an object`)
        }

        const slotExtra: Record<string, unknown> = {}
        for (const [sk, sv] of Object.entries(rawSlot)) {
          if (sk !== 'agent' && sk !== 'group' && sk !== 'replacement') {
            slotExtra[sk] = sv
          }
        }

        const rawAgent = typeof rawSlot.agent === 'string' ? rawSlot.agent.trim() : ''
        const lowerAgent = rawAgent.toLowerCase()
        let occupant: MowerSlot['occupant'] = { kind: 'empty' }
        if (lowerAgent === 'free') {
          occupant = { kind: 'free' }
        } else if (lowerAgent === 'current') {
          occupant = { kind: 'current' }
        } else if (rawAgent) {
          occupant = { kind: 'operator', operatorId: resolveOperatorCharId(rawAgent) }
        }

        const replacements: string[] = []
        if (Array.isArray(rawSlot.replacement)) {
          for (const item of rawSlot.replacement) {
            if (typeof item === 'string' && item) {
              replacements.push(resolveOperatorCharId(item))
            }
          }
        }

        const slot: MowerSlot = {
          occupant,
          groupId: typeof rawSlot.group === 'string' && rawSlot.group ? rawSlot.group : null,
          replacements,
        }
        if (Object.keys(slotExtra).length > 0) {
          slot.metadata = slotExtra
        }

        slots.push(slot)
      }

      facility.slots = slots
    }
  }

  ws.compatibility.importedPresentRooms = importedPresentRooms

  // Infer facility levels strictly according to existing inference rules
  inferFacilityLevels(ws.mainPlan.facilities)
  for (const roomId of MOWER_ROOM_IDS) {
    if (roomId.startsWith('room_') && !importedPresentRooms.includes(roomId)) {
      ws.mainPlan.facilities[roomId].level = 0
    }
  }

  // Parse conf
  const hasConf = parsed.conf !== undefined
  ws.compatibility.importedHasConf = hasConf

  if (hasConf) {
    if (!isRecord(parsed.conf)) {
      throw new Error('Invalid Mower JSON: "conf" must be an object')
    }
    const c = parsed.conf
    if (c.ling_xi === 0 || c.ling_xi === 1 || c.ling_xi === 2 || c.ling_xi === 3) {
      ws.mainPlan.conf.ling_xi = c.ling_xi
    } else {
      ws.mainPlan.conf.ling_xi = 1
    }

    for (const key of CONF_LIST_FIELDS) {
      const val = c[key]
      let items: string[] = []
      if (typeof val === 'string') {
        items = val
          .split(/[,，]/)
          .map((s) => s.trim())
          .filter(Boolean)
      } else if (Array.isArray(val)) {
        items = val
          .filter((item): item is string => typeof item === 'string')
          .map((s) => s.trim())
          .filter(Boolean)
      }
      ws.mainPlan.conf[key] = items.map(resolveOperatorCharId)
    }

    // Preserve unknown/extra conf fields (e.g. free_blacklist)
    for (const [k, v] of Object.entries(c)) {
      if (k !== 'ling_xi' && !isConfListField(k)) {
        ws.mainPlan.conf[k] = v
      }
    }
  }

  // Retain backup_plans
  const hasBackupPlans = parsed.backup_plans !== undefined
  ws.compatibility.importedHasBackupPlans = hasBackupPlans

  if (hasBackupPlans) {
    if (!Array.isArray(parsed.backup_plans)) {
      throw new Error('Invalid Mower JSON: "backup_plans" must be an array')
    }
    ws.compatibility.backupPlans = parsed.backup_plans
  } else {
    ws.compatibility.backupPlans = []
  }

  // Retain other secondary plans and unrecognized top-level fields
  const knownRootKeys = new Set(['default', defaultKey, 'conf', 'backup_plans'])
  for (const [k, v] of Object.entries(parsed)) {
    if (knownRootKeys.has(k)) continue
    if (k.startsWith('plan') && isRecord(v)) {
      ws.compatibility.otherPlans[k] = v
    } else {
      ws.compatibility.unrecognizedFields[k] = v
    }
  }

  return ws
}

export function exportMowerJson(workspace: RosterWorkspace): string {
  const planObj: Record<string, unknown> = {}
  const facilities = workspace.mainPlan.facilities
  const roomIdsToExport: MowerRoomId[] = []
  if (workspace.compatibility.importedPresentRooms) {
    const seen = new Set<string>()
    for (const rid of workspace.compatibility.importedPresentRooms) {
      if ((MOWER_ROOM_IDS as readonly string[]).includes(rid) && !seen.has(rid)) {
        seen.add(rid)
        roomIdsToExport.push(rid as MowerRoomId)
      }
    }
  } else {
    for (const rid of MOWER_ROOM_IDS) {
      roomIdsToExport.push(rid)
    }
  }

  for (const roomId of roomIdsToExport) {
    const f = facilities[roomId]
    const meta = workspace.compatibility.facilityMetadata?.[roomId]
    const extraMeta: Record<string, unknown> = {}
    if (meta) {
      for (const [k, v] of Object.entries(meta)) {
        if (
          k !== 'rawName' &&
          k !== 'rawProduct' &&
          k !== 'name' &&
          k !== 'product' &&
          k !== 'plans'
        ) {
          extraMeta[k] = v
        }
      }
    }

    let name = ''
    if (f.type === 'manufacture') name = '制造站'
    else if (f.type === 'trading') name = '贸易站'
    else if (f.type === 'power') name = '发电站'
    else if (typeof meta?.rawName === 'string' && meta.rawName) name = meta.rawName

    const plans = f.slots.map((slot) => {
      let agent = ''
      if (slot.occupant.kind === 'free') agent = 'Free'
      else if (slot.occupant.kind === 'current') agent = 'Current'
      else if (slot.occupant.kind === 'operator') {
        agent = restoreOperatorMowerName(slot.occupant.operatorId)
      }

      const replacement = slot.replacements.map(restoreOperatorMowerName)

      const slotObj: Record<string, unknown> = {
        ...(slot.metadata ?? {}),
        agent,
        group: slot.groupId || '',
        replacement,
      }
      return slotObj
    })

    const facilityData: Record<string, unknown> = {
      name,
      plans,
      ...extraMeta,
    }

    let exportedProduct: string | undefined
    if (f.type !== 'power') {
      const serialized = serializeProduct(f.type, f.product)
      if (serialized !== undefined) {
        exportedProduct = serialized
      } else if (f.product === undefined && typeof meta?.rawProduct === 'string' && meta.rawProduct) {
        exportedProduct = meta.rawProduct
      } else if (f.type === 'manufacture') {
        exportedProduct = 'gold'
      } else if (f.type === 'trading') {
        exportedProduct = 'lmd'
      }
    }

    if (exportedProduct !== undefined) {
      facilityData.product = exportedProduct
    }

    planObj[roomId] = facilityData
  }

  // Include any unrecognized rooms preserved from import
  if (workspace.compatibility.unrecognizedRooms) {
    for (const [uRoomId, uRoomData] of Object.entries(workspace.compatibility.unrecognizedRooms)) {
      planObj[uRoomId] = uRoomData
    }
  }

  // Serialize conf
  const conf: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(workspace.mainPlan.conf)) {
    if (k !== 'ling_xi' && !isConfListField(k)) {
      conf[k] = v
    }
  }
  conf.ling_xi = workspace.mainPlan.conf.ling_xi
  for (const field of CONF_LIST_FIELDS) {
    const list = workspace.mainPlan.conf[field] || []
    conf[field] = list.map(restoreOperatorMowerName).join(',')
  }

  const defaultKey = workspace.compatibility.defaultPlanKey || 'plan1'
  const output: Record<string, unknown> = {
    ...workspace.compatibility.otherPlans,
    ...workspace.compatibility.unrecognizedFields,
    default: defaultKey,
    [defaultKey]: planObj,
  }

  if (workspace.compatibility.importedHasConf !== false) {
    output.conf = conf
  }

  if (workspace.compatibility.importedHasBackupPlans !== false) {
    output.backup_plans = workspace.compatibility.backupPlans || []
  }

  return JSON.stringify(output, null, 2)
}
