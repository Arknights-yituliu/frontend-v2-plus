import myDatabase from "/src/plugins/indexedDB/indexedDB.js";
import operatorDataAPI from "/src/api/operatorData.js";
import {operatorTableV2} from "/src/utils/gameData.js";
import {formatNumber} from "/src/utils/format.js";

function putCache(data) {
    myDatabase.cache_data.put(data)
}

async function getData() {
    // 干员星级格式统一化修复: v2 数据 rarity 已改为 1-6 星级，旧缓存(V6)中的统计结果为 0-5 语义，升级版本号使旧缓存失效并强制重新拉取格式化
    const cacheKey = 'operatorProgressionStatisticsV7'
    let cacheData = await myDatabase.cache_data.get(cacheKey)

    // if (cacheData && cacheData.resource.result.length) {
    //     if (new Date().getTime() - cacheData.createTime < 60 * 60 * 24 * 1000) {
    //         console.log(cacheKey, '返回缓存的数据')
    //         return cacheData.resource
    //     }
    // }

    await operatorDataAPI.getOperatorStatisticsResult().then(response => {
        console.log(cacheKey, '返回来自服务器的数据')
        let data = response.data
        let {result} = data

        data.result = _formatData(result)
        const responseCache = {id: cacheKey, resource: data, version: "automated", createTime: new Date().getTime()}
        putCache(responseCache)
        cacheData = data
    })


    function _formatData(result) {
        let list = []
        for (const item of result) {
            let charInfo = operatorTableV2[item.charId]
            // console.log(item)
            if (charInfo) {
                const {own,sampleSize, elite, skill1, skill2, skill3, modX, modY, modD, modA,modB} = item

                let vo = {
                    charId:item.charId,
                    name: charInfo.name,
                    //干员星级格式统一化修复: v2 数据 rarity 已改为 1-6 星级，此处存储的即星级（无需转换）
                    rarity: charInfo.rarity,
                    profession: charInfo.profession,
                    itemObtainApproach: charInfo.itemObtainApproach,
                    //v2 数据中技能字段为 skills(数组元素含 skillName/skillIcon)
                    skills: charInfo.skills?charInfo.skills:[],
                    equip: charInfo.equip?charInfo.equip:[],
                    date: charInfo.date,
                    own: own,
                    sampleSize:sampleSize,
                    ownRate: _resultFormat(own, sampleSize),
                    eliteRank2: _resultFormat(elite[2], own),
                    skill1Rank3: _resultFormat(skill1[3], own),
                    skill2Rank3: _resultFormat(skill2[3], own),
                    skill3Rank3: _resultFormat(skill3[3], own),
                    modXRank3: _resultFormat(modX[3], own),
                    modYRank3: _resultFormat(modY[3], own),
                    modDRank3: _resultFormat(modD[3], own),
                    modARank3: _resultFormat(modA[3], own),
                    modBRank3: _resultFormat(modB[3], own)
                }

                const obj = {elite, skill1, skill2, skill3, modX, modY, modD, modA,modB}

                for (const name in obj) {
                    const ranks = obj[name]
                    let ranksVo = {}
                    // console.log(charInfo.name,name,ranks)
                    for(let i = 1; i < 4; i++){
                        ranksVo[`rank${ i}`] = ranks[ i]/own
                    }
                    vo[name] = ranksVo
                }

                // console.log(vo)
                list.push(vo)
            }
        }
        return list
    }

    function _resultFormat(dividend, divisor) {
        if (dividend) {
            return formatNumber(dividend / divisor * 100, 1)
        } else {
            return 0
        }
    }

    return cacheData

}


export default {
    getData
}