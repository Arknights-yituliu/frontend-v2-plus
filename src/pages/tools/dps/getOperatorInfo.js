import OperatorTable from '/src/static/json/game-data/operator_table.json'
import SkillTable from '/src/static/json/game-data/skill_table.json'

let operatorList = []

for (const charId in OperatorTable) {
    const operator = OperatorTable[charId];
    let {name, profession,rarity} = operator
    console.log(rarity)
    rarity = textParseInt(rarity)
    if(rarity<5){
        continue
    }
    const item = {charId: charId, name: name, profession: profession,rarity:rarity};
    operatorList.push(item)
}


function textParseInt(text) {
    // 使用正则表达式匹配字符串中的数字
    const match = text.match(/(\d+)/);

    // 如果找到了数字，则将其转换为整数并返回
    if (match) {
        return parseInt(match[1], 10);
    }
}

function formatBuff(blackboard) {
    const {key, value, valueStr} = blackboard
    if ('atk' === key) {
        return {
            zone: 'B',
            value: value,
            source: 'talent',
            type: 'atk',
        }
    }

    if ('attack_speed_ally' === key) {
        return {
            zone: 'B',
            value: value,
            source: 'talent',
            type: 'attackSpeed',
        }
    }

    if ('projectile_extend' === key) {
        return {
            zone: 'B',
            value: value,
            source: 'talent',
            type: 'projectile',
        }
    }

    if ('hp_recovery_per_sec_ratio' === key) {
        return {
            zone: 'B',
            value: value,
            source: 'skill',
            type: 'healing',
        }
    }

    if ('projectile_delay_time' === key) {
        return {
            zone: 'B',
            value: value,
            source: 'skill',
            type: 'delay',
        }
    }
}

function getAttributes(operatorInfo) {
    const phases = operatorInfo.phases
    const rarity = textParseInt(operatorInfo.rarity)
    if (6 === rarity) {
        const phase2 = phases[2];
        if (!phase2) {
            return 0
        }
        const attributesKeyFrames = phase2.attributesKeyFrames;
        if (!attributesKeyFrames) {
            return 0
        }
        const lvMaxAttributes = attributesKeyFrames[1]
        if (!lvMaxAttributes) {
            return 0
        }
        return lvMaxAttributes.data
    }
}

function getTalents(operatorInfo) {
    const talents = operatorInfo.talents
    let talentsOptions = []
    if (!talents) {
        return []
    }
    for (const index in talents) {
        const talent = talents[index]
        let options = []
        const candidates = talent.candidates
        let name = ''
        for (const candidate of candidates) {
            const phase = textParseInt(candidate.unlockCondition.phase)
            const potentialRank = candidate.requiredPotentialRank
            const blackboards = candidate.blackboard
            let buffs = []
            if (phase < 2) {
                continue;
            }

            name = candidate.name
            for (const blackboard of blackboards) {
                const buff = formatBuff(blackboard);
                if (buff) {
                    buffs.push(buff)
                }
            }

            options.push({
                phase: phase,
                potentialRank: potentialRank,
                buffs: buffs
            })
        }

        talentsOptions.push({
            name: name,
            options: options,
        })
    }
    return talentsOptions
}


function getSkillInfo(operatorInfo) {
    const skills = operatorInfo.skills
    let skillOptions = []
    for (const skill of skills) {
        let options = []
        let name = ''
        const skillId = skill.skillId;
        const skillTableElement = SkillTable[skillId];
        let iconId = skillTableElement.iconId;
        if(!iconId){
            iconId = skillId
        }
        iconId.replace('[','_')
        iconId.replace(']','_')
        const levels = skillTableElement.levels
        for (const index in levels) {
            if(index<7){
                continue
            }
            const level = levels[index];
            name = level.name
            const blackboard = level.blackboard
            let buffs = []
            for (const item of blackboard) {
                const buff = formatBuff(blackboard);
                if (buff) {
                    buffs.push(buff)
                }
            }
            options.push({
                rank: parseInt(index) + 1,
                buffs: buffs
            })
        }
        skillOptions.push({
            skillId:skillId,
            iconId: iconId,
            name: name,
            options: options,
        })
    }

    return skillOptions
}


function getOperatorInfo(charId) {
    const operatorInfo = OperatorTable[charId]

    const {name} = operatorInfo

    const attributes = getAttributes(operatorInfo)

    const talents = getTalents(operatorInfo);

    const skills = getSkillInfo(operatorInfo)

    return {
        name: name,
        charId:charId,
        skillIndex:0,
        skillRank:3,
        potentialRank:4,
        attributes: attributes,
        talents: talents,
        skills: skills,
        panel:[]
    }
}


export {getOperatorInfo,operatorList}

