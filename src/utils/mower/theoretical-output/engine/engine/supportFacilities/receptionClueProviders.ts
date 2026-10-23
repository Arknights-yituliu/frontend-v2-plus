import { hasOperatorSkill, operatorFor } from '../../domain/operatorContext'
import { matchesRiicIdentity } from '../../domain/riicIdentity'
import type { AppConfig } from '../../domain/types'
import type { RiicGlobalContext } from '../globalContext'
import { isSupportOperatorWorking } from './conditions'

/** External workplace skills contribute to the room once, rather than once per occupant. */
export function receptionClueProviderBonus(
  config: AppConfig,
  globalContext: () => RiicGlobalContext,
): number {
  let additive = 0
  let highestControl = 0
  const control = config.facilities.central === 0 ? [] : config.controlOperatorIds
  const controlAwake = control.filter(id => isSupportOperatorWorking(config, id))
  const reception = config.facilityOperatorIds.reception
  for (const id of controlAwake) {
    let providerMaximum = 0
    for (const skill of operatorFor(config, id)?.skills ?? []) {
      if (skill.roomType !== 'CONTROL') continue
      switch (skill.buffId) {
        case 'control_upMeetingSpeed[000]': providerMaximum += 25; break
        case 'control_upMeetingSpeed[100]': providerMaximum += 15; break
        case 'control_meeting_spd&bd[000]': providerMaximum += 5; break
        case 'control_mp&meet_spd[000]':
          if (control.includes('char_4182_oblvns')) providerMaximum += 5
          break
        case 'control_meeting&mp_cost[000]':
        case 'control_meeting&mp_cost[100]': {
          const perCard = skill.buffId === 'control_meeting&mp_cost[000]' ? 4 : 5
          const count = globalContext().presentOperators.filter(operator =>
            matchesRiicIdentity(operator, 'nationId', 'minos'),
          ).length
          providerMaximum += Math.min(5, count) * perCard
          break
        }
        case 'control_meeting&ord[000]':
        case 'control_meeting&ord[001]':
          if (reception.includes('char_4087_ines')) additive += 5
          break
        case 'control_meeting_bd[000]':
          additive += reception.filter(peer => {
            const operator = operatorFor(config, peer)
            return operator && matchesRiicIdentity(operator, 'teamId', 'student')
          }).length * 10
          break
      }
    }
    highestControl = Math.max(highestControl, providerMaximum)
  }
  if (config.facilities.office) {
    for (const id of config.facilityOperatorIds.office) {
      if (!isSupportOperatorWorking(config, id)) continue
      for (const skill of operatorFor(config, id)?.skills ?? []) {
        if (skill.roomType === 'HIRE' && /^hire_spd&clue\[(100|101|110|120|121)\]$/.test(skill.buffId))
          additive += Math.max(0, config.facilities.office - 1) * 5
      }
    }
  }
  return highestControl + additive
}

/** Honor explicit resource overrides; otherwise require Senshi's unlocked E2 provider skill. */
export function receptionMonsterCuisine(config: AppConfig): number {
  if (config.efficiencyResources.monsterCuisine > 0) return config.efficiencyResources.monsterCuisine
  return config.facilityOperatorIds.dormitories.reduce((sum, ids, index) =>
    sum + (ids.some(id => hasOperatorSkill(config, id, 'dorm_rec_bd_dungeon[000]'))
      ? config.facilities.dormitories[index] ?? 0 : 0), 0)
}
