import myDatabase from "/src/utils/indexedDB/indexedDB.js";
import operatorDataAPI from "/src/api/operatorData.js";
import {operatorTable} from "/src/utils/gameData.js";
import {formatNumber} from "@/utils/format.js";

function putCache(data) {
    myDatabase.cache_data.put(data)
}

async function getData() {
    const cacheKey = 'operatorProgressionStatisticsV4'
    let cacheData = await myDatabase.cache_data.get(cacheKey)

    if (cacheData && cacheData.resource.result.length) {
        if (new Date().getTime() - cacheData.createTime < 60 * 60 * 24 * 1000) {
            console.log(cacheKey, '返回缓存的数据')
            return cacheData.resource
        }
    }

    await operatorDataAPI.getOperatorStatisticsResult().then(response => {
        console.log(cacheKey, '返回来自服务器的数据')
        let data = response.data
        let {result,sampleSize} = data

        data.result = _formatData(result,sampleSize)
        const responseCache = {id: cacheKey, resource: data, version: "automated", createTime: new Date().getTime()}
        putCache(responseCache)
        cacheData = data
    })


    function _formatData(result,sampleSize) {
        for (const item of result) {
            let charInfo = operatorTable[item.charId]
            if (charInfo) {
                item.name = charInfo.name
                item.rarity = charInfo.rarity
                item.profession = charInfo.profession
                item.itemObtainApproach = charInfo.itemObtainApproach
                item.skill = charInfo.skill
                item.equip = charInfo.equip
                const {own, elite, skill1, skill2, skill3, modX, modY, modD, modA} = item
                item.ownRate = _resultFormat(own, sampleSize)
                item.eliteRank3 = _resultFormat(elite[2], own)
                item.skill1Rank3 = _resultFormat(skill1[3], own)
                item.skill2Rank3 = _resultFormat(skill2[3], own)
                item.skill3Rank3 = _resultFormat(skill3[3], own)
                item.modXRank3 = _resultFormat(modX[3], own)
                item.modYRank3 = _resultFormat(modY[3], own)
                item.modDRank3 = _resultFormat(modD[3], own)
                item.modARank3 = _resultFormat(modA[3], own)
                item.date = charInfo.date
            }
        }
        return result
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