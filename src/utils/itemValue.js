import ITEM_INFO from "@/static/json/material/item_info.json";
import COMPOSITE_TABLE from '/src/static/json/material/composite_table.v2.json'
import itemCache from "@/utils/indexedDB/itemCache.js";
import {getStageDropCollect} from "@/utils/penguinData.js";
import ITEM_SERIES_TABLE from "@/static/json/material/item_series_table.json";


//加工站每级期望产出理智
let workShopProducts = {
    t1: 0.393,
    t2: 1.172,
    t3: 5.204,
    t4: 17.598
}

//加工站每级期望产出理智
let itemValueCorrectionTerm = {
    30013: {correctionTerm: 1.00000137324044, itemName: '固源岩组'},
    30023: {correctionTerm: 1.0000040009822255, itemName: '糖组'},
    30033: {correctionTerm: 1.0000019925398336, itemName: '聚酸酯组'},
    30043: {correctionTerm: 0.9999483750088554, itemName: '异铁组'},
    30053: {correctionTerm: 1.0000022954075312, itemName: '酮凝集组'},
    30063: {correctionTerm: 1.0000013169421755, itemName: '全新装置'},
    30073: {correctionTerm: 0.9999649132885954, itemName: '扭转醇'},
    30083: {correctionTerm: 1.000002240727396, itemName: '轻锰矿'},
    30093: {correctionTerm: 1.0000022806201772, itemName: '研磨石'},
    30103: {correctionTerm: 1.0000130948559616, itemName: 'RMA70-12 '},
    31013: {correctionTerm: 0.9999904276257087, itemName: '凝胶'},
    31023: {correctionTerm: 1.0000248495124442, itemName: '炽合金'},
    31033: {correctionTerm: 1.00000158366126, itemName: '晶体元件'},
    31043: {correctionTerm: 0.999997836003829, itemName: '半自然溶剂'},
    31053: {correctionTerm: 1.000006210539448, itemName: '化合切削液'},
    31063: {correctionTerm: 0.9999981294168673, itemName: '转质盐组'},
    31073: {correctionTerm: 1.0001889176671603, itemName: '褐素纤维'},
    31083: {correctionTerm: 0.9996130718228801, itemName: '环烃聚质'}
}

let itemList = ITEM_INFO.filter(e => e.cardNum < 100)
let stageDropCollect = void 0
const baseLMDValue = 0.0036

function calculatedItemValue(stageConfig) {
    const {expCoefficient, lmdCoefficient, customItem} = stageConfig

    let customItemMap = new Map()
    for (const item of customItem) {
        customItemMap.set(item.itemId, item.itemValue)
    }

    let itemMap = new Map()

    for (let item of itemList) {
        const itemId = item.itemId
        if (itemId === "2004") {
            item.itemValueAp = baseLMDValue * expCoefficient * 2000
        }
        if (itemId === "2003") {
            item.itemValueAp = baseLMDValue * expCoefficient * 1000
        }
        if (itemId === "2002") {
            item.itemValueAp = baseLMDValue * expCoefficient * 400
        }
        if (itemId === "2001") {
            item.itemValueAp = baseLMDValue * expCoefficient * 200
        }
        if (itemId === "4001") {
            item.itemValueAp = baseLMDValue * lmdCoefficient
        }

        if (itemValueCorrectionTerm[itemId]) {
            // console.log(item.itemName, item.itemValueAp, '/', itemValueCorrectionTerm[itemId].correctionTerm)
            item.itemValueAp = item.itemValueAp / itemValueCorrectionTerm[itemId].correctionTerm
        }

        if (customItemMap.get(itemId)) {
            item.itemValueAp = customItemMap.get(itemId)
        }

        itemMap.set(itemId, item)
    }

    for (const table of COMPOSITE_TABLE) {
        const {itemId, resolve, pathway} = table
        if (customItemMap.get(itemId)) {
            continue
        }
        let item = itemMap.get(itemId);
        const rarity = item.rarity
        let newValue = 0.0
        if (resolve) {
            //灰，绿色品质是向下拆解   灰，绿色材料 = （蓝材料价值 + 副产物 - 龙门币）/合成蓝材料的所需灰绿材料数量
            const expectProductsValue = workShopProducts[`t${rarity}`]
            for (const cost of pathway) {
                const rawItem = itemMap.get(cost.itemId)
                newValue = (rawItem.itemValueAp + expectProductsValue - 0.36 * rarity) / cost.count
                // console.log(item.itemName + '=' + rawItem.itemName + '=(' + rawItem.itemValueAp + "+" + expectProductsValue + '-' + (0.36 * rarity) + ')/' + cost.count + '=' + newValue)
            }
        } else {
            //紫，金色品质是向上合成    紫，金色材料 =  合成所需蓝材料价值之和  + 龙门币 - 副产物
            const expectProductsValue = workShopProducts[`t${rarity - 1}`]
            for (const cost of pathway) {
                const rawItem = itemMap.get(cost.itemId)
                newValue += rawItem.itemValueAp * cost.count
                // console.log(item.itemName + '=' + rawItem.itemName + '*' + cost.count + '=' + newValue)

            }

            newValue = newValue + 0.36 * (rarity - 1) - expectProductsValue
            // console.log(item.itemName + '=' + (0.36 * (rarity - 1)) + '-' + expectProductsValue + '=' + newValue)

        }
        // console.log(newValue)
        // console.log(item)

        item.itemValueAp = newValue
        // console.log(newValue)
    }

    _getWorkShopProductValue(itemList)

    function _getWorkShopProductValue(itemList) {
        const knockRating = 0.2
        let collect = new Map()
        for (const item of itemList) {
            if (item.weight === 0) {
                continue
            }
            if (!collect.get(item.rarity)) {
                collect.set(item.rarity, [])
            }
            collect.get(item.rarity).push(item)
        }

        for (const [rarity, group] of collect) {
            let expectValue = 0.0
            for (const item of group) {
                const {itemValueAp, itemName, weight} = item
                expectValue += itemValueAp * weight
                // console.log('+=',itemName+'='+itemValueAp+'*'+weight,'=',expectValue)
            }

            expectValue = expectValue * knockRating
            // console.log(expectValue)
            workShopProducts[`t${rarity}`] = expectValue
        }
    }

}


async function getItemValueCorrectionTerm(stageConfig, index) {
    const useActivityStage = stageConfig.useActivityStage
    let itemMap = new Map()
    for (const item of itemList) {
        itemMap.set(item.itemId, item)
    }

    let stageInfoMap = new Map()
    let stageInfo = await itemCache.getStageInfoCache()
    for (const stage of stageInfo) {
        stageInfoMap.set(stage.stageId, stage)
    }

    let nextStageDropCollect = new Map()
    let nextItemCorrectionTerm = new Map()

    for (const [stageId, list] of stageDropCollect) {
        const stageInfo = stageInfoMap.get(stageId)
        //如果查不到关卡信息则跳过
        if (!stageInfo) {
            continue;
        }

        const {apCost, stageCode, zoneName, stageType, end} = stageInfo

        let stageEfficiency = 0.0
        let dropValueCount = 0.0

        if (index === 0) {
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
        }


        let mainItemId = ''
        let maxValue = 0

        for (const drop of list) {
            const {itemId, stageId, quantity, times} = drop
            const itemInfo = itemMap.get(itemId);
            //如果查不到材料信息则跳过
            if (!itemInfo) {
                continue
            }
            const {itemValueAp, itemName} = itemInfo;
            const knockRating = quantity / times
            const value = knockRating * itemValueAp
            if (value > maxValue) {
                mainItemId = itemId
                maxValue = value
            }
            // console.log(stageCode, '---', itemName, '=', itemValueAp, '*', knockRating, '=', value, '=', dropValueCount)
            dropValueCount += value
        }

        stageEfficiency = dropValueCount / apCost

        // console.log(stageCode, '---', stageEfficiency, '=', dropValueCount, '/', apCost)


        if (stageEfficiency < 0.7) {
            // console.log('效率低于0.7')
            continue
        }

        let seriesInfo = ITEM_SERIES_TABLE[mainItemId]

        if (!seriesInfo) {
            // console.log('不在18种材料中')
            continue
        }

        if (stageType === 'ACT' || stageType === 'ACT_REP') {
            if (!useActivityStage) {
                // console.log('跳过活动关卡')
                continue
            }
        }


        const {seriesId, series} = seriesInfo

        const seriesCorrectionTerm = {
            stageCode: stageCode,
            seriesId: seriesId,
            series: series,
            correctionTerm: stageEfficiency,
        }

        nextStageDropCollect.set(stageId, list)

        if (nextItemCorrectionTerm.get(seriesId)) {

            const correctionTerm = nextItemCorrectionTerm.get(seriesId).correctionTerm
            if (stageEfficiency > correctionTerm) {
                nextItemCorrectionTerm.set(seriesId, seriesCorrectionTerm)
            }
        } else {

            nextItemCorrectionTerm.set(seriesId, seriesCorrectionTerm)
        }


    }

    return {
        nextStageDropCollect: nextStageDropCollect,
        nextItemCorrectionTerm: nextItemCorrectionTerm
    }

}


async function getCustomItemList(stageConfig) {
    stageDropCollect = await getStageDropCollect(stageConfig)

    for (let i = 0; i < 10; i++) {
        // console.log(`第${i + 1}次迭代`)
        // console.table(itemList)
        calculatedItemValue(stageConfig)
        let complete =  true
        const {nextItemCorrectionTerm, nextStageDropCollect} = await getItemValueCorrectionTerm(stageConfig,i);
        for (const [seriesId, item] of nextItemCorrectionTerm) {
            itemValueCorrectionTerm[seriesId].correctionTerm = item.correctionTerm

        }
        // console.table(workShopProducts)
        stageDropCollect = nextStageDropCollect
    }

    console.log("材料价值：",itemList)

    return itemList
}


export {
    getCustomItemList
}