import surveyApi from '/src/api/operatorData'


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
        if (item.rarity < 6) continue;
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
            ratio: result.rank3
        }
    }


    for (const index in operatorTable) {
        const operator = operatorTable[index]
        if (operator.rarity < 6) continue;
        if (!operatorStatisticsResult[operator.charId]) continue;
        if (!operator.own) continue;
        const result = operatorStatisticsResult[operator.charId]
        for (const property in result) {
            const single = result[property]

            if (operator[property] < single.avg && single.avg > 1.0) {
                recommend.push({
                    name: operator.name,
                    charId: operator.charId,
                    current:operator[property],
                    info: getPropertyName(property, operator),
                    avg: single.avg,
                    ratio: single.ratio
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
        return {
            name: operator.skill[index].name,
            iconId: operator.skill[index].iconId,
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