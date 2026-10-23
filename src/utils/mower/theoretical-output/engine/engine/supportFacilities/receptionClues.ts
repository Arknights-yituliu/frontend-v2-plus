import { operatorFor, hasOperatorSkill } from '../../domain/operatorContext'
import type { AppConfig } from '../../domain/types'
import { matchesRiicIdentity } from '../../domain/riicIdentity'
import { buildRiicGlobalContext } from '../globalContext'
import { isSupportOperatorWorking } from './conditions'
import { receptionClueProviderBonus, receptionMonsterCuisine } from './receptionClueProviders'

export const RECEPTION_CLUE_BASE_HOURS = 20
const RARITY_BONUS: Readonly<Record<number, number>> = { 4: 2, 5: 4, 6: 5 }

function isCountNeutralOrFixedSkill(description: string): boolean {
  const remainder = description.replace(/^进驻会客室时，线索搜集速度提升[\d.]+%/, '')
  if (remainder !== description) {
    return !remainder || /^，心情每小时消耗\+[\d.]+$/.test(remainder) ||
      /^，且更容易获得.+线索（工作时长影响概率）$/.test(remainder) ||
      remainder === '，且更容易获得线索板上尚未拥有的线索' ||
      remainder === '，当与虎狼丸进驻会客室一起工作时，更容易获得线索板上尚未拥有的线索'
  }
  return !description.includes('搜集速度') && /更容易获得|线索.*概率|线索倾向/.test(description)
}

// Reception formula, including passive rarity/promotion bonuses on exhausted occupants:
// https://prts.wiki/w/罗德岛基建/会客室#线索搜集速度
// 20 hours per clue; dormitories use the simulator's level-dependent maximum ambience.
export function receptionClueEfficiency(
  config: AppConfig,
  phases: ReadonlyMap<string, number>,
  tenure: ReadonlyMap<string, number> = new Map(),
): number {
  const ids = config.facilityOperatorIds.reception
  if (!config.facilities.reception || !ids.length) return 0
  const awake = ids.filter((id) => isSupportOperatorWorking(config, id))
  const ambience = config.facilities.dormitories.reduce<number>((sum, level) => sum + level * 1000, 0)
  let bonus =
    5 +
    2 * config.facilities.reception +
    (ambience >= 4000 ? 15 : ambience >= 3000 ? 10 : ambience >= 2000 ? 5 : 0)
  let global: ReturnType<typeof buildRiicGlobalContext> | undefined
  const resources = () => (global ??= buildRiicGlobalContext(config))
  bonus += receptionClueProviderBonus(config, resources)
  const controlWorking = (id: string) =>
    config.controlOperatorIds.includes(id) && isSupportOperatorWorking(config, id)
  const identityMatches = (id: string, dimension: Parameters<typeof matchesRiicIdentity>[1], value: string) => {
    const operator = operatorFor(config, id)
    if (!operator) throw new Error(`缺少基建干员档案：${id}`)
    return matchesRiicIdentity(operator, dimension, value)
  }
  for (const id of ids) {
    const operator = operatorFor(config, id)
    const phase = phases.get(id)
    if (!operator || phase === undefined || !Number.isInteger(phase) || phase < 0 || phase > 2) throw new Error(`缺少会客室干员练度：${id}`)
    bonus += (RARITY_BONUS[operator.rarity] ?? 0) + phase * 8
    if (!awake.includes(id)) continue
    bonus += 5
    for (const skill of operator.skills) {
      if (skill.roomType !== 'MEETING') continue
      const description = skill.description
      const fixed = description.match(/^进驻会客室时，线索搜集速度提升([\d.]+)%/)
      bonus += Number(fixed?.[1] ?? 0)
      if (description.includes('只有自身处于工作状态')) {
        if (awake.length === 1)
          bonus += Number(description.match(/搜集速度提升([\d.]+)%/)?.[1] ?? 0)
        continue
      }
      switch (skill.buffId) {
        case 'meet_spd&exchange[000]':
        case 'meet_spd&exchange[001]':
        case 'meet_spd&exchange[999]':
          bonus += 30
          break
        case 'meet_spd&cost_char[000]':
          if (awake.some((peer) => peer !== id)) bonus += 15
          break
        case 'meet_spd&bd[100]':
          if (awake.includes('char_358_lisa')) bonus += 30
          break
        case 'meet_spd&sami[000]':
        case 'meet_spd&sami[100]':
        case 'meet_spd&sami[110]': {
          const sami = skill.buffId === 'meet_spd&sami[000]'
          if (
            awake.some(
              (peer) =>
                peer !== id &&
                identityMatches(
                  peer,
                  sami ? 'nationId' : 'groupId',
                  sami ? 'sami' : 'blacksteel'
                )
            )
          )
            bonus += sami ? 5 : skill.buffId === 'meet_spd&sami[100]' ? 15 : 20
          break
        }
        case 'meet_spd&bd[000]':
        case 'meet_spd&bd[010]':
          if (awake.includes('char_2012_typhon')) bonus += 15
          break
        case 'meet_spd_ext&P[000]':
          if (
            config.facilityOperatorIds.dormitories.some((room) => room.includes('char_300_phenxi'))
          )
            bonus += 10
          break
        case 'meet_spd_bd[000]':
          if (
            controlWorking('char_456_ash') &&
            hasOperatorSkill(config, 'char_456_ash', 'control_mp_bd[000]')
          )
            bonus +=
              5 *
              config.controlOperatorIds.filter((peer) =>
                identityMatches(peer, 'teamId', 'rainbow')
              ).length
          break
        case 'meet_spd_bd[001]':
          bonus += receptionMonsterCuisine(config) * 2
          break
        case 'meet_spd_bd[002]':
          bonus += Math.floor(resources().worldlyFireworks / 10)
          break
        case 'meet_spd&clue[000]':
          bonus += Math.max(0, config.facilities.office - 1) * 5
          break
        case 'meet_spd_hast[000]':
          bonus += Math.min(10, (tenure.get(id) ?? 0) * 2)
          break
        case 'meet_spd_notOwned_P[000]':
          if (controlWorking('char_1048_orchd2')) bonus += 10
          break
        default:
          // Clue exchange is assumed always active for production; clue-type probabilities do not change counts.
          if (!isCountNeutralOrFixedSkill(description))
            throw new Error(`尚未支持的会客室技能：${skill.name}（${skill.buffId}）`)
      }
    }
  }
  return 1 + bonus / 100
}
