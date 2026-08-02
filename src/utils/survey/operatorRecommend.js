


/**
 *
 * @param operatorTable
 * @param operatorProgressionStatistics
 * @returns {Promise<[]>}
 */
async function operatorRecommend(operatorTable, operatorProgressionStatistics) {

    let recommend = []

    let operatorStatisticsResult = {}

    const {result} = operatorProgressionStatistics


    for (const item of result) {
        //统计结果中的 rarity 现为 v2 的 0-5, 仅统计 6 星(对应 v2 rarity 5)
        if (item.rarity < 5) continue;
        operatorStatisticsResult[item.charId] = {
            skill1: _average(item.skill1),
            skill2: _average(item.skill2),
            skill3: _average(item.skill3),
            modX: _average(item.modX),
            modY: _average(item.modY),
        }
    }


    function _average(result) {

        return {
            avg: result.rank1 + result.rank2 * 2 + result.rank3 * 3,
            ranks:[result.rank1,result.rank2,result.rank3],
        }
    }


    for (const index in operatorTable) {
        const operator = operatorTable[index]
        //v2 数据中 rarity 为 0-5, 原过滤条件为仅 6 星(星级 6), 对应 v2 rarity 5
        if (operator.rarity < 5) continue;
        if (!operatorStatisticsResult[operator.charId]) continue;
        if (!operator.own) continue;
        const result = operatorStatisticsResult[operator.charId]
        for (const property in result) {
            const single = result[property]

            if (operator[property] < single.avg && single.avg > 1.1) {
                recommend.push({
                    name: operator.name,
                    charId: operator.charId,
                    current:operator[property],
                    info: getPropertyName(property, operator),
                    avg: single.avg,
                    ranks: single.ranks
                })
            }
        }
    }

    // sort the operators by average in the reverse order
    recommend.sort((a, b) => (b.avg - a.avg))



    return recommend;
}


function getPropertyName(property, operator) {


    if (property.indexOf('skill') > -1) {
        let index = 0;
        if (property === 'skill2') index = 1
        if (property === 'skill3') index = 2
        //v2 数据中技能字段为 skills(数组元素含 skillName/skillIcon), 旧格式为 skill
        const skill = operator.skills[index] || {}
        return {
            name: skill.skillName,
            iconId: skill.skillIcon,
            type: 'skill'
        }
    }

    if (property.indexOf('mod') > -1) {
        for (const equip of operator.equip) {
            if (property === `mod${equip.typeName2}`) {
                return {
                    name: equip.uniEquipName,
                    iconId: equip.typeIcon,
                    type: 'equip'
                }
            }
        }
    }


}


export {operatorRecommend}