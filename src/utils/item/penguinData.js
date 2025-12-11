import itemCache from "/src/plugins/indexedDB/itemCache.js";
import ytlStageInfo from '/src/static/json/material/ytl_stage_info.json'
import deepClone from "/src/utils/deepClone.js";


/**
 * - 样本数小于 `stageConfig.sampleSize` 的作战不会包含在结果中
 * - `useStageBlacklist` 为真时，`stageConfig.stageBlacklist` 中的作战不会包含在结果中
 * - 无论 `stageConfig.useActivityStage` 和 `stageConfig.useActivityAverageStage` 真假，返回的结果总是包含活动作战
 *
 * @param {StageConfig} stageConfig
 * @param {boolean} useStageBlacklist
 * @returns {Promise<Map<string, Array<StageDropInfo>>>}
 * key 为作战 ID，value 为掉落列表，下标为 1 的元素为龙门币掉落，下标为 2 的元素为活动商店无限龙门币（如果是活动关）
 */
async function getStageDropCollect(stageConfig, useStageBlacklist) {

    let penguinMatrix = []

    //获取企鹅物流的源石数据
    penguinMatrix = await itemCache.getPenguinMatrixCache()

    //获取关卡信息
    let stageInfoList = await itemCache.getStageInfoCache()

    //将关卡信息转为一个<关卡id,关卡信息>的map
    let stageInfoMap = new Map()
    for (const stage of stageInfoList) {
        const {stageId} = stage
        // console.log(stage)
        stageInfoMap.set(stageId, stage)
    }

    //将磨难关卡分离出来，方便后面与标准关卡的掉率进行合并
    let toughStage = penguinMatrix.filter(e => e.stageId.indexOf("tough") > -1)
    let toughStageMap = new Map()
    for (const item of toughStage) {
        const key = `${item.stageId.replace('tough', 'main')}-${item.itemId}`
        toughStageMap.set(key, item)
    }

    //关卡黑名单
    let stageBlacklistMap = new Map()
    if (stageConfig.stageBlacklist && useStageBlacklist) {
        for (const item of stageConfig.stageBlacklist) {
            stageBlacklistMap.set(item, 1)
        }
    }

    let sampleSize = 300
    if (stageConfig.sampleSize) {
        sampleSize = stageConfig.sampleSize
    }


    let stageDropCollect = new Map()

    for (let item of penguinMatrix) {

        const {stageId, itemId, quantity, times, start, end} = item

        if (stageBlacklistMap.get(stageId)) {
            continue
        }

        if (item.stageId.indexOf("main_14") > -1) {
            if (item.end) {
                continue
            }
        }

        if (stageId.indexOf('tough') > -1) {
            continue
        }

        if (times < sampleSize) {
            continue
        }

        if (!stageInfoMap.has(stageId)) {
            continue
        }

        const stageInfo = stageInfoMap.get(stageId)

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
                start: start,
                end: end
            }
        }

        const {stageCode, apCost, spm, stageType, zoneName, zoneId} = stageInfo

        if (stageType === 'ACT' && apCost === 21 && ytlStageInfo[itemId]) {
            ytlStageInfo[itemId].quantity += item.quantity
            ytlStageInfo[itemId].times += item.times
        }

        const mergeItem = {
            stageId: stageId,
            itemId: itemId,
            quantity: item.quantity,
            times: item.times,
            start: stageInfo.start,
            end: stageInfo.end,
            stageCode: stageCode,
            apCost: apCost,
            spm: spm,
            stageType: stageType,
            zoneName: zoneName,
            zoneId: zoneId
        }


        const lmdDrop = createDropTemplate(stageInfo, {
            itemId: "4001",
            times: 1,
            quantity: stageInfo.apCost * 12,
        })
        const storeUnlimitedExchangeDrop = createDropTemplate(stageInfo, {
            itemId: "4001",
            times: 1,
            quantity: stageInfo.apCost * 20,
        })


        if (stageDropCollect.get(stageId)) {
            stageDropCollect.get(stageId).push(mergeItem)
        } else {
            stageDropCollect.set(stageId, [mergeItem, lmdDrop])
            if ("ACT" === stageType || "ACT_REP" === stageType) {
                stageDropCollect.get(stageId).push(storeUnlimitedExchangeDrop)
            }
        }
    }


    for (const itemId in ytlStageInfo) {
        const dropInfo = ytlStageInfo[itemId]
        if (dropInfo.times > 0) {

            const lmdDrop = createDropTemplate(dropInfo, {
                itemId: "4001",
                times: 1,
                quantity: dropInfo.apCost * 12,
            })
            const storeUnlimitedExchangeDrop = createDropTemplate(dropInfo, {
                itemId: "4001",
                times: 1,
                quantity: dropInfo.apCost * 20,
            })
            stageDropCollect.set(dropInfo.stageId, [dropInfo, lmdDrop, storeUnlimitedExchangeDrop])
        }
    }


    function createDropTemplate(stageInfo, shopRedemptionItems) {
        return {
            stageId: stageInfo.stageId,
            itemId: shopRedemptionItems.itemId,
            quantity: shopRedemptionItems.quantity,
            times: shopRedemptionItems.times,
            start: stageInfo.start,
            end: stageInfo.end,
            stageCode: stageInfo.stageCode,
            apCost: stageInfo.apCost,
            spm: stageInfo.spm,
            stageType: stageInfo.stageType,
            zoneName: stageInfo.zoneName,
            zoneId: stageInfo.zoneId
        }
    }


    return stageDropCollect
}


//这个对象是用于在计算活动效率时，判断无限兑换材料价值是否大于龙门币价值，大于则将默认计算的龙门币效率转为价值最高的无限兑换材料
const unlimitedMaterialsInStore = {
    "4001": {
        itemId: "4001",
        quantity: 20,
        minValue: 0.0036,
        price: 1``
    },
    "30073": {
        itemId: "30073",
        quantity: 1,
        minValue: 1.8,
        price: 25
    },
    "30083": {
        itemId: "30083",
        quantity: 1,
        minValue: 2.16,
        price: 30
    },
    "30093": {
        itemId: "30093",
        quantity: 1,
        minValue: 2.52,
        price: 35
    }
}

export {getStageDropCollect}
