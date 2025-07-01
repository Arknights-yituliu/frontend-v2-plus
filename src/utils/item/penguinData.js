import itemCache from "@/plugins/indexedDB/itemCache.js";
import ytlStageInfo from '/src/static/json/material/ytl_stage_info.json'
import deepClone from "@/utils/deepClone.js";


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


    penguinMatrix = await itemCache.getPenguinMatrixCache()
    let stageInfoList = await itemCache.getStageInfoCache()
    let stageInfoMap = new Map()
    for (const stage of stageInfoList) {
        const { stageId } = stage
        // console.log(stage)
        stageInfoMap.set(stageId, stage)
    }

    let toughStage = penguinMatrix.filter(e => e.stageId.indexOf("tough") > -1)
    let toughStageMap = new Map()

    for (const item of toughStage) {
        const key = `${item.stageId.replace('tough', 'main')}-${item.itemId}`
        toughStageMap.set(key, item)
    }

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

        const { stageId, itemId, quantity, times, start, end } = item

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

        const { stageCode, apCost, spm, stageType, zoneName, zoneId } = stageInfo

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

        let lmdDropTemplate = {
            stageId: stageId,
            itemId: "4001",
            quantity: apCost * 12,
            times: 1,
            start: stageInfo.start,
            end: stageInfo.end,
            stageCode: stageCode,
            apCost: apCost,
            spm: spm,
            stageType: stageType,
            zoneName: zoneName,
            zoneId: zoneId
        }

        const lmdDrop = deepClone(lmdDropTemplate)
        const storeUnlimitedExchangeDrop =deepClone(lmdDropTemplate)
        storeUnlimitedExchangeDrop.quantity = apCost * 20
        // {
        //     stageId: stageId,
        //     itemId: "4001",
        //     quantity: apCost * 20,
        //     times: 1
        // }


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

            let lmdDropTemplate = {
                stageId: dropInfo.stageId,
                itemId: "4001",
                quantity: dropInfo.apCost * 12,
                times: 1,
                start: dropInfo.start,
                end: dropInfo.end,
                stageCode: dropInfo.stageCode,
                apCost: dropInfo.apCost,
                spm: dropInfo.spm,
                stageType: dropInfo.stageType,
                zoneName: dropInfo.zoneName,
                zoneId: dropInfo.zoneId
            }

            const lmdDrop = deepClone(lmdDropTemplate)
            const storeUnlimitedExchangeDrop =deepClone(lmdDropTemplate)
            storeUnlimitedExchangeDrop.quantity = dropInfo.apCost * 20


            stageDropCollect.set(dropInfo.stageId, [dropInfo, lmdDrop, storeUnlimitedExchangeDrop])
        }
    }


    return stageDropCollect
}

export { getStageDropCollect }
