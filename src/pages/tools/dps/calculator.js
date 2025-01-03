import deepClone from "@/utils/deepClone.js";


const operatorCalculatorResult = {
    hps: {value: 0, data: [], log: []},
    dps: {value: 0, data: [], log: []},
    dph: {value: 0, data: [], log: []},
    hph: {value: 0, data: [], log: []},
}

const logDict = {
    "A": "加算A区",
    "B": "乘算B区",
    "C": "最终加算C区",
    "D": "最终乘算D区",
    "skill": "技能",
    "talent": "天赋",
    "support": "辅助",
    "damage": "伤害",
    "healing": "治疗",
    "atk":"攻击力"
}





function char_1039_thorn2(operatorInfo, supportBuff) {

    //天赋
    //攻击力+10%，攻击范围内存在其他干员时，自身投掷的炼金单元持续时间延长3秒
    //在场时，所有友方单位攻击速度+5，敌方单位攻击速度-5；位于连续6格或以上直线道路的友方和敌方单位受到的效果翻倍

    //技能1
    //向友方单位投掷一个炼金单元，在x秒内使落点和周围8格的友方单位防御力+xxx，每秒回复相当于攻击力xx%的生命值

    const buff1 = {
        zone: 'A',
        value: 0,
        type: 'skill',
        action: '伤害',
    }

    function _skill1(operatorInfo, buffs) {
        //解构出干员攻击力atk（不含天赋），技能信息，天赋信息
        let log = []
        let {atk, skillInfo} = operatorInfo
        let {duration, spCost} = skillInfo
        buffs.sort((a, b) => a.zone - b.zone)
        log.push(`技能每秒的治疗量为${atk}`)

        const healingHitResult = getHealingHit(atk, buffs, log);
        log = healingHitResult.log
        const healingHit = healingHitResult.result

        const result = deepClone(operatorCalculatorResult);

        result.hps.value = atk
        let hpsData = []
        const skillCycle = duration < spCost ? spCost : duration
        for (let i = 0; i < 2; i++) {
            for (let second = 1; second <= skillCycle; second++) {
                if (second <= duration) {
                    hpsData.push(healingHit)
                } else {
                    hpsData.push(0)
                }
            }
        }
        result.hps.data = hpsData
    }

    function _skill2(operatorInfo, supportBuff) {
        const {skillInfo} = operatorInfo

        const {hpRatio} = skillInfo
        return {
            hps: finalAtk,
            dps: 0,
            dph: 0,
            hph: finalAtk,
        }
    }

}

function getOperatorData() {

}


function getHealingHit(atk, buffs, log) {
    let healing = atk


    for (const buff of buffs) {
        const {zone, value,  source, type} = buff
        const last = healing
        if (!('healing' === type || 'atk' === type)) {
            continue
        }
        let text = `治疗量受到${logDict[source]}的${logDict[zone]}从${last}提升为${healing}`
        if ("A" === zone) {
            healing += value
            text += `（${last}+${value}=${healing}）`
        }

        if ("B" === zone) {
            healing += healing * value
            text += `（${last}+${last}*${value}=${healing}）`
        }

        if ("C" === zone) {
            healing += value
            text += `（${last}+${value}=${healing}）`
        }

        if ("D" === zone) {
            healing += value
            text += `（${last}*${value}=${healing}）`
        }

        log.push(text)
    }

    return {result: healing, log: log}
}


function getDamageHit(atk, buffs, log) {
    let healing = atk

    buffs.sort((a, b) => a.zone - b.zone)
    for (const buff of buffs) {
        const {zone, value, type, action} = buff
        const last = healing
        if (!('damage' === action || 'atk' === action)) {
            continue
        }
        let text = `治疗量受到${logDict[type]}的${logDict[zone]}从${last}提升为${healing}`
        if ("A" === zone) {
            healing += value
            text += `（${last}+${value}=${healing}）`
        }

        if ("B" === zone) {
            healing += healing * value
            text += `（${last}+${last}*${value}=${healing}）`
        }

        if ("C" === zone) {
            healing += value
            text += `（${last}+${value}=${healing}）`
        }

        if ("D" === zone) {
            healing += value
            text += `（${last}*${value}=${healing}）`
        }

        log.push(text)
    }

    return {result: healing, log: log}
}

// function getHealing(operatorInfo, supportBuff) {
//     //解构出干员攻击力atk（不含天赋），技能信息，天赋信息
//     const {atk, talents, skillInfo} = operatorInfo
//     //从技能中解构出 加算A，乘算B，最终加算C，最终乘算B四类buff
//     const {skillBuffA, skillBuffB, skillBuffC, skillBuffD} = skillInfo.healing
//     //从天赋中解构出 加算A，乘算B，最终加算C，最终乘算B四类buff
//     const {talentBuffA, talentBuffB, talentBuffC, talentBuffD} = talents.healing
//     //从支援buff中解构出 加算A，乘算B，最终加算C，最终乘算B四类buff
//     const {supportBuffA, supportBuffB, supportBuffC, supportBuffD} = supportBuff.healing
//     //计算方式  ((atk + buffA) * (1 + buffB) + buffC) * buffD
//     const atkByBuffA = atk + skillBuffA + talentBuffA + supportBuffA
//     const atkByBuffB = atkByBuffA * (1 + skillBuffB + talentBuffB + supportBuffB);
//     const atkByBuffC = atkByBuffB + skillBuffC + talentBuffC + supportBuffC
//     return atkByBuffC * skillBuffD * talentBuffD * supportBuffD
// }

function getAttackSpeed(operatorInfo, supportBuff) {
    const {baseAttackTime, attackSpeed} = operatorInfo;
    const {supportAttackSpeed} = supportBuff;
    return baseAttackTime * (100 / (attackSpeed + supportAttackSpeed));
}


const operatorDPSCalculator = {
    char_1039_thorn2: char_1039_thorn2
}

