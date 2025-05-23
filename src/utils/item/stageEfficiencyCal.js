import itemCache from "/src/plugins/indexedDB/itemCache.js";
import {getStageDropCollect} from "/src/plugins/indexedDB/penguinData.js";
import {itemSeriesInfoByItemId} from "/src/utils/item/itemSeries.js";



/**
 * 获取材料价值
 * @param stageConfig
 * @returns {Promise<Map<any, any>>}
 */
async function getItemMap(stageConfig) {
    let itemMap = new Map()

    await itemCache.getItemValueCacheByConfig(stageConfig).then(response => {
        for (let item of response) {
            if (item.cardNum > 99) {
                continue
            }
            itemMap.set(item.itemId, item)
        }
    })

    return itemMap
}


async function calculationStageEfficiency(stageConfig) {
    const start = new Date().getTime()

    const itemMap = await getItemMap(stageConfig)
    const stageDropCollect = await getStageDropCollect(stageConfig)
    const loading = new Date().getTime()
    // console.log("加载数据", loading - start, 'ms')

    let stageResultList = []

    for (const [stageId, list] of stageDropCollect) {


        const {apCost, stageCode, zoneName,spm, stageType, end} = list[0]

        if(!stageConfig.useActivityAverageStage){
            if("YTL_VIRTUAL"===stageType){
                continue
            }
        }

        let stageEfficiency = 0.0;
        let dropValueCount = 0.0

        // list.push({
        //     stageId: stageId,
        //     itemId: "4001",
        //     quantity: apCost * 12,
        //     times: 1
        // })
        //
        // if ("ACT" === stageType || "ACT_REP" === stageType) {
        //     list.push({
        //         stageId: stageId,
        //         itemId: "4001",
        //         quantity: apCost * 20,
        //         times: 1
        //     })
        // }


        let stageDropValue = []

        let endTimeStamp = 4073691312000

        for (const drop of list) {
            const {itemId, stageId, quantity, times} = drop
            const itemInfo = itemMap.get(itemId);
            //如果查不到材料信息则跳过
            if (!itemInfo) {
                continue
            }

            const {itemName, itemValue, rarity} = itemInfo;
            const knockRating = quantity / times
            const value = knockRating * itemValue
            dropValueCount += value

            const dropValue = {
                itemName: itemName,
                itemId: itemId,
                itemValue: itemValue,
                value: value,
                knockRating: knockRating,
                rarity: parseInt(rarity),
                quantity: quantity,
                times: times,
                sampleSize: times,
                end: end,
            }


            // if(stageId==='main_14-13'){
            //     console.log(dropValue)
            // }
            stageDropValue.push(dropValue)
        }

        // if(stageId==='main_01-07'){
        //     console.table(stageDropValue)
        // }

        stageDropValue.sort((a, b) => b.value - a.value)


        let mainSeriesInfo = void 0
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
        let mainItemId = '0'
        let mainItemName = '0'
        for (let i = 0; i < stageDropValue.length; i++) {

            const element = stageDropValue[i];
            const {itemId, itemName, rarity, knockRating, sampleSize, value, end} = element

            if (i === 0) {

                mainSeriesInfo = itemSeriesInfoByItemId.get(itemId)
                if (end) {
                    endTimeStamp = end
                }
                mainItemId = itemId
                mainItemName = itemName
                itemRarity = rarity
                mainApExpect = apCost / knockRating;
                mainKnockRating = knockRating;
                mainSampleSize = sampleSize
            }

            if (!mainSeriesInfo) {
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


            const seriesInfo = itemSeriesInfoByItemId.get(itemId)


            if (seriesInfo && seriesInfo.seriesId === mainSeriesInfo.seriesId) {

                if (1 === rarity || 2 === rarity) {
                    leT2Value += value;
                }
                if (3 === rarity) {
                    leT3Value += value;
                }
                if (4 === rarity) {
                    leT4Value += value;
                }

            }


        }

        if (!mainSeriesInfo) {
            continue
        }

        orundumPerAp = orundumPerAp / apCost


        stageEfficiency = dropValueCount / apCost
        const leT4Efficiency = (leT2Value + leT3Value + leT4Value) / apCost
        const leT3Efficiency = (leT2Value + leT3Value) / apCost
        const leT2Efficiency = leT2Value / apCost


        const stageResult = {
            stageCode: stageCode,
            stageId: stageId,
            stageType: stageType,
            zoneName: zoneName,
            itemName: mainItemName,
            itemId: mainItemId,
            itemSeriesId: mainSeriesInfo.seriesId,
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
            lmdcost: LMDCostPerAp * 600 / apCost / orundumPerAp / 10000,
            end: endTimeStamp,
            spm:spm
        }


        stageResultList.push(stageResult)
    }


    // console.log("计算效率", loading - start, 'ms')
    return stageResultList


}


async function getStageData(stageConfig) {

    const start = new Date().getTime()
    let stageResultList = await calculationStageEfficiency(stageConfig)
    const getData = new Date().getTime()
    // console.log("获取关卡效率", getData - start, 'ms')
    let openStageResult = stageResultList.filter(e => e.end > new Date().getTime())
    const recommendedStage = getRecommendedStage(openStageResult)
    const orundumRecommendedStage = getOrundumRecommendedStage(openStageResult)
    const historyActStage = getHistoryActStage(stageResultList)
    // console.log("返回结果", new Date().getTime() - getData, 'ms')


    return {
        recommendedStage: recommendedStage,
        orundumRecommendedStageVO: orundumRecommendedStage,
        historyActStage: historyActStage,
    }
}


function getRecommendedStage(stageResultList) {

    stageResultList = stageResultList.filter(e => e.stageEfficiency > 0.5)


    let recommendedStageCollect = new Map()
    for (const item of stageResultList) {
        const {itemName, itemId, itemSeriesId} = item
        if (recommendedStageCollect.get(itemSeriesId)) {
            recommendedStageCollect.get(itemSeriesId).push(item)
        } else {
            recommendedStageCollect.set(itemSeriesId, [item])
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
        .filter(e => e.orundumPerAp > 0.2)
        .sort((a, b) => b.orundumPerAp - a.orundumPerAp)

    let list = stageResultList


    list.sort((a, b) => b.orundumPerAp - a.orundumPerAp)

    let maxOrundumPerAp = 1.0898
    if (list.length > 1) {
        maxOrundumPerAp = list[0].orundumPerAp
    }

    for (let item of list) {
        item.orundumPerApEfficiency = item.orundumPerAp / maxOrundumPerAp
    }
    return list
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