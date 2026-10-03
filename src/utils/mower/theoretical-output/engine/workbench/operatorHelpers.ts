// Extracted unchanged report/validation helpers; see README.md and source-manifest.json.
import { OPERATOR_MAP, OPERATORS } from '../domain/operators'
import type { MowerFacilityType } from './model'

const OPERATOR_BY_NAME = new Map(OPERATORS.map((op) => [op.name, op]))
const OPERATOR_BY_APPELLATION = new Map(OPERATORS.map((op) => [op.appellation.toLowerCase(), op]))

export function getOperatorName(identifier: string | null | undefined): string {
  if (!identifier) return ''
  if (identifier === 'Free' || identifier === 'free') return 'Free'
  if (identifier === 'Current' || identifier === 'current') return 'Current'
  const op =
    OPERATOR_MAP.get(identifier) ||
    OPERATOR_BY_NAME.get(identifier) ||
    OPERATOR_BY_APPELLATION.get(identifier.toLowerCase())
  return op ? op.name : identifier
}

export function isFiammetta(identifier: string | null | undefined): boolean {
  if (!identifier) return false
  const name = getOperatorName(identifier)
  return name === '菲亚梅塔'
}

const FACILITY_TYPE_NAMES: Record<string, string> = {
  manufacture: '制造站',
  trading: '贸易站',
  power: '发电站',
  dormitory: '宿舍',
  central: '控制中枢',
  meeting: '会客室',
  factory: '加工站',
  contact: '办公室',
  train: '训练室',
  gaming: '活动室',
}

export function getRoomDisplayName(roomId: string, type?: MowerFacilityType | string): string {
  if (roomId.startsWith('room_')) {
    const parts = roomId.split('_')
    const floor = parts[1]
    const col = parts[2]
    const baseCode = `B${floor}0${col}`
    if (type && FACILITY_TYPE_NAMES[type]) {
      return `${baseCode} (${FACILITY_TYPE_NAMES[type]})`
    }
    return baseCode
  }
  if (roomId === 'central') return '控制中枢'
  if (roomId.startsWith('dormitory_') || roomId.startsWith('dorm_')) {
    const num = roomId.replace(/^(dormitory_|dorm_)/, '')
    return `宿舍${num}`
  }
  if (roomId === 'meeting') return '会客室'
  if (roomId === 'factory') return '加工站'
  if (roomId === 'contact') return '办公室'
  if (roomId === 'train') return '训练室'
  if (roomId.startsWith('gaming_')) {
    const num = roomId.replace('gaming_', '')
    return `活动室${num}`
  }
  return roomId
}

