import surveyApi from '/src/api/surveyOperator'

/**
 *
 * @param operatorTable
 * @returns {Promise<[]>}
 */
async function operatorRecommend(operatorTable) {

    let recommend = []

    let operatorStatisticsResult = {}
    await surveyApi.getCharStatisticsResult().then(response => {
        for (const result of response.data.result) {
            if (result.rarity < 6) continue;
            operatorStatisticsResult[result.charId] = {
                skill1: average(result.skill1),
                skill2: average(result.skill2),
                skill3: average(result.skill3),
                modX: average(result.modX),
                modY: average(result.modY),
            }
        }
    })


    for (const index in operatorTable) {
        const operator = operatorTable[index]
        if (operator.rarity < 6) continue;
        if (!operatorStatisticsResult[operator.charId]) continue;
        const result = operatorStatisticsResult[operator.charId]
        for (const property in result) {
            const single = result[property]

            if (operator[property] < single.avg && single.avg>1.2) {
                recommend.push({
                    name:operator.name,
                    charId: operator.charId,
                    info: getPropertyName(property,operator),
                    avg:single.avg,
                    ratio:single.ratio
                })
            }
        }
    }



   return recommend;
}


function average(result) {
    return {
        avg: result.rank1 * 1 + result.rank2 * 2 + result.rank3 * 3,
        ratio: result.rank3
    }
}

function getPropertyName(property, operator) {


    if(property.indexOf('skill')>-1){
        let index = 0;
        if(property==='skill2') index = 1
        if(property==='skill3') index = 2
        return {
            name:operator.skill[index].name,
            iconId: operator.skill[index].iconId,
            type:'skill'
        }
    }

    if(property.indexOf('mod')>-1) {
       for(const equip of operator.equip) {
          if(property === `mod${equip.typeName2}`) {
              return {
                  name:equip.uniEquipName,
                  iconId:equip.typeIcon,
                  type: 'equip'
              }
          }
       }
    }


}



export default { operatorRecommend }