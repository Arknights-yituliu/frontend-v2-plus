export const MOWER_OUTPUT_ROOM_IDS = [
  'room_1_1', 'room_1_2', 'room_1_3',
  'room_2_1', 'room_2_2', 'room_2_3',
  'room_3_1', 'room_3_2', 'room_3_3',
] as const

export const MOWER_ROOM_IDS = [
  ...MOWER_OUTPUT_ROOM_IDS,
  'central',
  'dormitory_1', 'dormitory_2', 'dormitory_3', 'dormitory_4',
  'meeting', 'factory', 'contact', 'train',
  'gaming_1', 'gaming_2', 'gaming_3',
] as const

export type MowerRoomId = (typeof MOWER_ROOM_IDS)[number]
export type MowerOutputRoomId = (typeof MOWER_OUTPUT_ROOM_IDS)[number]

export function mowerRoomToOutputRoomId(roomId: MowerOutputRoomId | string): string {
  const parts = roomId.split('_')
  if (parts.length === 3 && parts[0] === 'room') {
    return `B${parts[1]}0${parts[2]}`
  }
  const index = MOWER_OUTPUT_ROOM_IDS.findIndex(id => id === roomId)
  if (index >= 0) {
    const floor = Math.floor(index / 3) + 1
    const col = (index % 3) + 1
    return `B${floor}0${col}`
  }
  return roomId
}

export type MowerFacilityType =
  | 'manufacture'
  | 'trading'
  | 'power'
  | 'dormitory'
  | 'central'
  | 'meeting'
  | 'factory'
  | 'contact'
  | 'train'
  | 'gaming'
  | ''

export type MowerProduct = 'gold' | 'exp' | 'fragment' | 'money' | 'orundum'

export type MowerOccupant =
  | { kind: 'operator'; operatorId: string }
  | { kind: 'free' }
  | { kind: 'current' }
  | { kind: 'empty' }

export interface MowerSlot {
  occupant: MowerOccupant
  groupId: string | null
  replacements: string[]
  metadata?: Record<string, unknown>
}

export interface MowerFacility {
  roomId: MowerRoomId
  type: MowerFacilityType
  level: number
  product?: MowerProduct
  slots: MowerSlot[]
}

export interface MowerMainConf {
  ling_xi: 0 | 1 | 2 | 3
  exhaust_require: string[]
  rest_in_full: string[]
  resting_priority: string[]
  workaholic: string[]
  refresh_trading: string[]
  refresh_drained: string[]
  ope_resting_priority: string[]
  [customKey: string]: unknown
}

export interface MowerMainPlan {
  id: string
  name: string
  facilities: Record<MowerRoomId, MowerFacility>
  conf: MowerMainConf
}

export interface MowerCompatibilityEnvelope {
  sourceVersion?: string
  defaultPlanKey: string
  backupPlans: unknown[]
  otherPlans: Record<string, unknown>
  unrecognizedFields: Record<string, unknown>
  facilityMetadata?: Record<string, Record<string, unknown>>
  unrecognizedRooms?: Record<string, unknown>
  importedPresentRooms?: string[]
  importedHasConf?: boolean
  importedHasBackupPlans?: boolean
}

export interface RosterWorkspace {
  schemaVersion: 8
  name: string
  mainPlan: MowerMainPlan
  compatibility: MowerCompatibilityEnvelope
}
