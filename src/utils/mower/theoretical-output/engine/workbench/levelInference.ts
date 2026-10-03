import { MOWER_OUTPUT_ROOM_IDS, type MowerFacility, type MowerRoomId } from './model'

export function inferFacilityLevels(facilities: Record<MowerRoomId, MowerFacility>): void {
  let powerCount = 0
  for (const roomId of MOWER_OUTPUT_ROOM_IDS) {
    if (facilities[roomId].type === 'power') {
      powerCount++
    }
  }

  if (powerCount === 3) {
    // 3 Power Plants: all max level
    for (const roomId of MOWER_OUTPUT_ROOM_IDS) {
      facilities[roomId].level = 3
    }
    for (let i = 1; i <= 4; i++) {
      facilities[`dormitory_${i}` as MowerRoomId].level = 5
    }
    facilities.meeting.level = 3
    facilities.contact.level = 3
    facilities.factory.level = 3
    facilities.train.level = 3
    facilities.central.level = 5
  } else if (powerCount === 2) {
    // 2 Power Plants: stepped inference
    for (let i = 1; i <= 4; i++) {
      facilities[`dormitory_${i}` as MowerRoomId].level = 1
    }
    facilities.meeting.level = 3
    facilities.contact.level = 3
    facilities.factory.level = 3
    facilities.train.level = 3
    facilities.central.level = 5

    for (const roomId of MOWER_OUTPUT_ROOM_IDS) {
      const facility = facilities[roomId]
      if (facility.type === 'power') {
        facility.level = 3
      } else if (facility.type === 'manufacture' || facility.type === 'trading') {
        const staffedCount = facility.slots.filter(
          (s) => s.occupant.kind === 'operator' || s.occupant.kind === 'free' || s.occupant.kind === 'current',
        ).length
        facility.level = Math.max(1, Math.min(3, staffedCount || 1))
      }
    }
  }
}
