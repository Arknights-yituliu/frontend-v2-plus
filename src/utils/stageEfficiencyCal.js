import itemValueCache from "/src/utils/indexedDB/itemValueCache.js";
import penguinMatrixCache from "/src/utils/indexedDB/penguinMatrixCache.js";
import stageInfo from '/src/static/json/material/tmp_stage_info.json'
import {getStageConfig} from "@/utils/user/userConfig.js";

const stageConfig = getStageConfig()

let itemMap = new Map()
let stageInfoMap = new Map()
let stageDropCollect = new Map()

async function loadingData(config) {
    const itemList = await itemValueCache.getCacheByVersion("itemValue", config)
    for (const item of itemList) {
        itemMap.set(item.itemId, item)
    }

    for (const stage of stageInfo) {
        stageInfoMap.set(stage.stageId, stage)
    }

    const penguinMatrix = await penguinMatrixCache.getCache('penguinMatrix')

    for (const item of penguinMatrix) {

        if (stageDropCollect.get(item.stageId)) {
            stageDropCollect.get(item.stageId).push(item)
        } else {
            stageDropCollect.set(item.stageId, [item])
        }
    }

    calculation()
}

export {
    loadingData
}

function calculation() {
    for (const [stageId, list] of stageDropCollect) {
        const stageInfo = stageInfoMap.get(stageId)
        if (!stageInfo) {
            continue;
        }



    }
}

function addLmb(stageInfo){
     const {stageType} = stageInfo
}