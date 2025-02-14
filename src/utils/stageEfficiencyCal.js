import stageDataCache from "/src/utils/indexedDB/stageDataCache.js";
import ITEM_SERIES_TABLE from '/src/static/json/material/item_series_table.json'
import ITEM_TYPE_TABLE from '/src/static/json/material/item_type_table.json'
import {getStageConfig} from "@/utils/user/userConfig.js";
import tmpData from '/src/static/json/tmp/yituliu.json'
import {dateFormat} from "@/utils/dateUtil.js";


async function loadingData(stageConfig) {

    let itemMap = new Map()
    let stageInfoMap = new Map()
    let stageDropCollect = new Map()

    let stageInfo = await stageDataCache.getStageInfoCache()

    for (const stage of stageInfo) {
        stageInfoMap.set(stage.stageId, stage)
    }
    let penguinMatrix = []
    const source =  stageConfig.source
    if('yituliu'===source){
         penguinMatrix = tmpData.matrix
    }else {
         penguinMatrix = await stageDataCache.getPenguinMatrixCache()
    }




    let toughStage = penguinMatrix.filter(e => e.stageId.indexOf("tough") > -1)
    let toughStageMap = new Map()

    for (const item of toughStage) {
        const key = `${item.stageId.replace('tough', 'main')}-${item.itemId}`
        toughStageMap.set(key, item)
    }

    const itemList = await stageDataCache.getItemValueCacheByConfig(stageConfig)
    for (const item of itemList) {
        if (item.cardNum > 99) {
            continue
        }
        itemMap.set(item.itemId, item)
    }

    let stageBlacklistMap = new Map()

    if(stageConfig.stageBlacklist){
        for (const item of stageConfig.stageBlacklist) {
            stageBlacklistMap.set(item.stageId, item.stageCode)
        }
    }

    let sampleSize = 300
    if(stageConfig.sampleSize){
        sampleSize = stageConfig.sampleSize
    }


    for (let item of penguinMatrix) {

        const {stageId,itemId,quantity,times,start,end} = item

        if (stageBlacklistMap.get(stageId)) {
            console.log(stageId)
            continue
        }



        if (item.stageId.indexOf("main_14") > -1&&'penguin'===source) {
            if (item.end) {
                continue
            }
        }

        if (stageId.indexOf('tough') > -1) {
            continue
        }

        if(times<sampleSize){
            continue
        }

        const toughKey = `${item.stageId}-${item.itemId}`

        if (toughStageMap.get(toughKey)) {
            const toughData = toughStageMap.get(toughKey)
            // if(stageId==='main_14-13'){
            //     console.log(toughData)
            // }
            item = {
                stageId: stageId,
                itemId: itemId,
                quantity: toughData.quantity + quantity,
                times: toughData.times + times,
                start:start,
                end: end
            }
        }



        if (stageDropCollect.get(item.stageId)) {
            stageDropCollect.get(item.stageId).push(item)
        } else {
            stageDropCollect.set(item.stageId, [item])
        }
    }

    return {itemMap, stageInfoMap, stageDropCollect}
}


async function calculationStageEfficiency(stageConfig) {
    const start = new Date().getTime()
    const {itemMap, stageInfoMap, stageDropCollect} = await loadingData(stageConfig)
    const loading = new Date().getTime()
    console.log("加载数据",loading-start,'ms')

    let stageResultList = []

    for (const [stageId, list] of stageDropCollect) {
        const stageInfo = stageInfoMap.get(stageId)

        //如果查不到关卡信息则跳过
        if (!stageInfo) {
            continue;
        }

        const {apCost, stageCode, zoneName, stageType,end} = stageInfo


        let stageEfficiency = 0.0;
        let dropValueCount = 0.0

        list.push({
            stageId: stageId,
            itemId: "4001",
            quantity: apCost * 12,
            times: 1
        })

        if ("ACT" === stageType || "ACT_REP" === stageType) {
            list.push({
                stageId: stageId,
                itemId: "4001",
                quantity: apCost * 20,
                times: 1
            })
        }


        let stageDropValue = []

        let endTimeStamp = 4073691312000

        for (const drop of list) {
            const {itemId, stageId, quantity, times} = drop
            const itemInfo = itemMap.get(itemId);
            //如果查不到材料信息则跳过
            if (!itemInfo) {
                continue
            }

            const {itemName, itemValueAp, rarity} = itemInfo;
            const knockRating = quantity / times
            const value = knockRating * itemValueAp
            dropValueCount += value

            const dropValue = {
                itemName: itemName,
                itemId: itemId,
                itemValue: itemValueAp,
                value: value,
                knockRating: knockRating,
                rarity: parseInt(rarity),
                quantity:quantity,
                times:times,
                sampleSize: times,
                end: end,
            }


            // if(stageId==='main_08-13'){
            //     console.log(dropValue)
            // }

            // if(stageId==='main_14-13'){
            //     console.log(dropValue)
            // }
            stageDropValue.push(dropValue)
        }



        stageDropValue.sort((a, b) => b.value - a.value)


        let seriesInfo = void 0
        let leT4Value = 0.0
        let leT3Value = 0.0
        let leT2Value = 0.0
        let mainApExpect = 0.0
        let mainKnockRating = 0.0
        let secondaryItemId = ''
        let mainSampleSize = 0
        let orundumPerAp = 0.0
        let itemRarity = 0
        let LMDCostPerAp = 0

        for (let i = 0; i < stageDropValue.length; i++) {

            const element = stageDropValue[i];
            const {itemId, itemName, rarity, knockRating, sampleSize, value, end} = element

            if (i === 0) {

                seriesInfo = ITEM_SERIES_TABLE[itemId]
                if (end) {
                    endTimeStamp = end
                }
                itemRarity = rarity
                mainApExpect = knockRating * apCost;
                mainKnockRating = knockRating;
                mainSampleSize = sampleSize
            }

            if (!seriesInfo) {
                break;
            }

            if ("30011" === itemId) {
                orundumPerAp += knockRating * 5 / 3
                LMDCostPerAp += knockRating * 800 / 3
            }
            if ("30012" === itemId) {
                orundumPerAp += knockRating * 5
                LMDCostPerAp += knockRating * 800
            }
            if ("30061" === itemId) {
                orundumPerAp += knockRating * 10 / 3
                LMDCostPerAp += knockRating * 1000 / 3
            }
            if ("30062" === itemId) {
                orundumPerAp += knockRating * 10
                LMDCostPerAp += knockRating * 1000
            }

            if (i === 1) {
                secondaryItemId = itemId
            }


            if (ITEM_TYPE_TABLE[seriesInfo.series]) {
                if (ITEM_TYPE_TABLE[seriesInfo.series][itemName]) {
                    if (1 === rarity || 2 === rarity) {
                        leT2Value += value / apCost;
                    }
                    if (3 === rarity) {
                        leT3Value += value / apCost;
                    }
                    if (4 === rarity) {
                        leT4Value += value / apCost;
                    }
                }
            }
        }

        orundumPerAp = orundumPerAp / apCost


        stageEfficiency = dropValueCount / apCost
        const leT4Efficiency = leT2Value + leT3Value + leT4Value
        const leT3Efficiency = leT2Value + leT3Value
        const leT2Efficiency = leT2Value

        if (!seriesInfo) {
            continue
        }


        const stageResult = {
            stageCode: stageCode,
            stageId: stageId,
            stageType: stageType,
            zoneName: zoneName,
            itemName: seriesInfo.series,
            itemId: seriesInfo.seriesId,
            itemRarity: itemRarity,
            secondaryItemId: secondaryItemId,
            apExpect: mainApExpect,
            knockRating: mainKnockRating,
            sampleSize: mainSampleSize,
            stageEfficiency: stageEfficiency,
            leT2Efficiency: leT2Efficiency,
            leT3Efficiency: leT3Efficiency,
            leT4Efficiency: leT4Efficiency,
            orundumPerAp: orundumPerAp,
            lmdcost:LMDCostPerAp*600/apCost/orundumPerAp/10000,
            end: endTimeStamp
        }


        stageResultList.push(stageResult)
    }


    console.log("计算效率",loading-start,'ms')
    return stageResultList


}


async function getStageData() {
    const stageConfig = getStageConfig()
    const start = new Date().getTime()
    let stageResultList = await calculationStageEfficiency(stageConfig)
    const getData = new Date().getTime()
    console.log("获取关卡效率",getData-start,'ms')
    let openStageResult = stageResultList.filter(e => e.end > new Date().getTime())
    const recommendedStage = getRecommendedStage(openStageResult)
    const orundumRecommendedStage = getOrundumRecommendedStage(openStageResult)
    const historyActStage = getHistoryActStage(stageResultList)
    console.log("返回结果",new Date().getTime()-getData,'ms')
    return {
        recommendedStage: recommendedStage,
        orundumRecommendedStageVO: orundumRecommendedStage,
        historyActStage: historyActStage,
        updateTimeVO:dateFormat(new Date(),'yyyy/MM/dd HH:mm')
    }
}


function getRecommendedStage(stageResultList) {

    stageResultList = stageResultList.filter(e => e.stageEfficiency > 0.5)


    let recommendedStageCollect = new Map()
    for (const item of stageResultList) {
        const {itemName, itemId} = item
        if (recommendedStageCollect.get(itemId)) {
            recommendedStageCollect.get(itemId).push(item)
        } else {
            recommendedStageCollect.set(itemId, [item])
        }
    }

    let recommendedStage = []
    for (let [key, value] of recommendedStageCollect) {
        recommendedStage.push({
            itemSeriesId: key,
            stageResultList: value
        })
    }

    return recommendedStage
}

function getOrundumRecommendedStage(stageResultList) {
    stageResultList = stageResultList
        .filter(e => e.orundumPerAp > 0.5||(e.stageType === 'ACT' || e.stageType === "ACT_REP"))
        .sort((a, b) => b.orundumPerAp - a.orundumPerAp)
    let maxOrundumPerAp = 1.0898
    if(stageResultList.length>1){
        maxOrundumPerAp = stageResultList[0].orundumPerAp
    }

    for (let item of stageResultList) {
        item.orundumPerApEfficiency = item.orundumPerAp / maxOrundumPerAp
    }
    return stageResultList
}

function getHistoryActStage(stageResultList) {
    stageResultList = stageResultList.filter(e => (e.stageType === 'ACT' || e.stageType === "ACT_REP") && e.itemRarity === 3)
    let historyActStageCollect = new Map()
    for (const item of stageResultList) {
        if (historyActStageCollect.get(item.zoneName)) {
            historyActStageCollect.get(item.zoneName).push(item)
        } else {
            historyActStageCollect.set(item.zoneName, [item])
        }
    }

    let historyActStageList = []

    for (const [zoneName, list] of historyActStageCollect) {
        historyActStageList.push({
            zoneName: zoneName,
            stageType: list[0].stageType,
            actStageList: list,
            endTime: list[0].end
        })
    }
    historyActStageList.sort((a, b) => b.endTime - a.endTime)
    return historyActStageList
}


export {
    getStageData
}