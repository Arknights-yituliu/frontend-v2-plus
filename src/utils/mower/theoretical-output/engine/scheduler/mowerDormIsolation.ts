// Mower alpha ab0a4e5 dorm_roommates/dorm_isolation_cost/plan_dorm_isolation (MIT).
import {alphaPosition, alphaRestingKey, alphaRestingTier} from './mowerAlphaDorm'
import {orderMowerAlphaDormIndices} from './mowerDormOrder'
import {projectMowerArrangements} from './mowerObservations'
import type {MowerSchedulingData} from './mowerSchedulingData'
import type {MowerTaskPlan} from './mowerTaskQueue'

const occupant = (name: string | undefined): name is string => !!name && name !== 'Free' && name !== 'Current'

/** Physical occupants, bed reservations and this pending arrangement share one view. */
export function mowerDormRoommates(data: MowerSchedulingData, room: string, index?: number, plan: MowerTaskPlan = {}): string[] {
  const moving = new Set(Object.values(plan).flat().filter(occupant))
  const beds = new Map(data.allDorms().map(bed => [alphaPosition(...bed.position), bed]))
  const row = plan[room] ?? [], names: string[] = []
  for (let position = 0; position < (data.plan[room]?.length ?? 0); position++) {
    if (position === index) continue
    let name: string | undefined
    if (position < row.length && row[position] !== 'Current') name = row[position]
    else {
      name = beds.get(alphaPosition(room, position))?.name || data.currentOperator(room, position)?.name
      if (name && moving.has(name)) continue
    }
    if (occupant(name)) names.push(name)
  }
  return names
}

/** Isolation breaks ties after bed availability, recovery tier and takeover cost. */
export function mowerDormIsolationCost(data: MowerSchedulingData, name: string, room: string, index?: number, plan: MowerTaskPlan = {}): number {
  if (!data.dormIsolation.length) return 0
  const roommates = new Set(mowerDormRoommates(data, room, index, plan))
  roommates.delete(name)
  return data.dormIsolation.reduce((cost, group) => cost + (group.includes(name) ? new Set(group.filter(member => roommates.has(member))).size : 0), 0)
}

/** Move only new admissions between equal-tier ordinary beds when a swap reduces collisions. */
export function planMowerDormIsolation(data: MowerSchedulingData, plan: MowerTaskPlan, reservedSlots: ReadonlySet<string> = new Set()): MowerTaskPlan {
  if (!data.dormIsolation.length || !Object.keys(plan).length) return plan
  const explicitOrder = data.dormOrder.some(option => option.endsWith('_low'))
  const projected = projectMowerArrangements(data, [plan])
  const beds = orderMowerAlphaDormIndices(projected).map(index => projected.dorms[index]!).filter(bed => projected.effectiveFreeSlot(bed))
  const first = new Map<string, number>()
  for (const bed of beds) first.set(bed.position[0], Math.min(first.get(bed.position[0]) ?? Infinity, bed.position[1]))
  const reserved = new Set([...reservedSlots, ...data.reservedProductBeds.keys()])
  const newcomers = new Set(Object.values(plan).flat().filter(name => data.operators[name] && !data.operators[name]!.isResting()))
  const movable = beds.filter(bed => !reserved.has(alphaPosition(...bed.position)) && bed.position[1] !== first.get(bed.position[0]) && (newcomers.has(bed.name) || !explicitOrder && !bed.name))
  if (movable.length < 2) return plan
  const result = structuredClone(plan)
  const roomCost = (room: string) => {
    const row = projected.currentRoom(room, true) ?? []
    for (const bed of beds) if (bed.position[0] === room) row[bed.position[1]] = bed.name
    const names = new Set(row.filter(occupant))
    return data.dormIsolation.reduce((cost, group) => {const count = new Set(group.filter(name => names.has(name))).size; return cost + count * (count - 1) / 2}, 0)
  }
  for (let pass = 0; pass < movable.length ** 2; pass++) {
    let best: [typeof beds[number], typeof beds[number]] | undefined, improvement = 0
    for (let i = 0; i < movable.length; i++) for (let j = i + 1; j < movable.length; j++) {
      const a = movable[i]!, b = movable[j]!
      if (a.position[0] === b.position[0] || a.name === b.name) continue
      if ((a.name ? alphaRestingTier(data, a.name) : 6) !== (b.name ? alphaRestingTier(data, b.name) : 6)) continue
      if (explicitOrder && JSON.stringify(alphaRestingKey(data, a.name)) !== JSON.stringify(alphaRestingKey(data, b.name))) continue
      const before = roomCost(a.position[0]) + roomCost(b.position[0])
      ;[a.name, b.name] = [b.name, a.name]
      const gain = before - roomCost(a.position[0]) - roomCost(b.position[0])
      ;[a.name, b.name] = [b.name, a.name]
      if (gain > improvement) {best = [a, b]; improvement = gain}
    }
    if (!best) break
    const [a, b] = best
    ;[a.name, b.name] = [b.name, a.name]
    for (const bed of best) (result[bed.position[0]] ??= Array(projected.plan[bed.position[0]]!.length).fill('Current'))[bed.position[1]] = bed.name || 'Free'
  }
  return result
}
