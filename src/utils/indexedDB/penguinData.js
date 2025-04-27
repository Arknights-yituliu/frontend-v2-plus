import itemCache from "@/utils/indexedDB/itemCache.js";

async function getStageDropCollect(stageConfig) {
    const source = stageConfig.source
    let penguinMatrix = []

    if ('yituliu' === source) {
        // penguinMatrix = tmpData.matrix
    } else {
        penguinMatrix = await itemCache.getPenguinMatrixCache()
    }

    let toughStage = penguinMatrix.filter(e => e.stageId.indexOf("tough") > -1)
    let toughStageMap = new Map()

    for (const item of toughStage) {
        const key = `${item.stageId.replace('tough', 'main')}-${item.itemId}`
        toughStageMap.set(key, item)
    }

    let stageBlacklistMap = new Map()

    if (stageConfig.stageBlacklist) {
        for (const item of stageConfig.stageBlacklist) {
            stageBlacklistMap.set(item.stageId, item.stageCode)
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
            console.log(stageId)
            continue
        }


        if (item.stageId.indexOf("main_14") > -1 && 'penguin' === source) {
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


        if (stageDropCollect.get(item.stageId)) {
            stageDropCollect.get(item.stageId).push(item)
        } else {
            stageDropCollect.set(item.stageId, [item])
        }
    }



    return stageDropCollect
}

export {getStageDropCollect}