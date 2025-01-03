import OperatorTable from '/src/static/json/game-data/operator_table.json'
import SkillTable from '/src/static/json/game-data/skill_table.json'




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

    projectile_extend


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

function getTalentsAttributes(operatorInfo) {
    const talents = operatorInfo.talents
    let talentsOptions = []
    if (!talents) {
        return []
    }
    for (const index in talents) {
        const talent = talents[index]
        let options = []
        const candidates = talent.candidates
        for (const candidate of candidates) {
            const phase = textParseInt(candidate.unlockCondition.phase)
            const potentialRank = candidate.requiredPotentialRank
            const blackboards = candidate.blackboard
            let buffs = []
            if (phase < 2) {
                continue;
            }
            for (const blackboard of blackboards) {
                const buff = formatBuff(blackboard);
                if(buff){
                    buffs.push()
                }
            }

            options.push({
                phase: phase,
                potentialRank: potentialRank,
                buffs: buffs
            })
        }
        talentsOptions.push(options)
    }

    return talentsOptions

}



function getOperatorInfo(){
    const operatorInfo = OperatorTable['char_1039_thorn2']
    const attributes = getAttributes(operatorInfo)
    console.log(attributes)
    const talentsAttributes = getTalentsAttributes(operatorInfo);
    console.log(talentsAttributes)
}


export {getOperatorInfo}

