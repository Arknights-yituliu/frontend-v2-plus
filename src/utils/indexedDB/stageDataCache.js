import myDatabase from "/src/utils/indexedDB/IndexedDB.js";
import materialAPI from "/src/api/material.js";
import axios from "axios";
import {cMessage} from "@/utils/message.js";


async function putCache(data) {
    myDatabase.cache_data.put(data)
}

async function getItemValueCacheByConfig(stageConfig, forceRefresh = false) {
    const cacheKey = 'itemValue'
    let cacheData
    if (!forceRefresh) {
        let cacheData = await myDatabase.cache_data.get(cacheKey)
        if (cacheData) {
            if (new Date().getTime() - cacheData.createTime < 60 * 60 * 1000) {
                console.log(`${cacheKey}.返回缓存的数据`)
                return cacheData.resource
            }
        }
    }


    await materialAPI.getItemValueTableV4(stageConfig).then(response => {
        console.log(`${cacheKey}.返回来自服务器的数据`)
        if(forceRefresh){
            cMessage("强制刷新材料价值成功")
        }
        const itemList = response.data
        const info = {
            id: cacheKey,
            resource: itemList,
            version: stageConfig.id,
            createTime: new Date().getTime()
        }
        myDatabase.cache_data.put(info)
        cacheData = itemList
    })

    return cacheData
}


async function getPenguinMatrixCache(forceRefresh = false) {
    const cacheKey = 'penguinMatrix'
    let cacheData
    if (!forceRefresh) {
        let cacheData = await myDatabase.cache_data.get(cacheKey)
        if (cacheData) {
            if (new Date().getTime() - cacheData.createTime < 60 * 60 * 1000) {
                console.log(`${cacheKey}.返回缓存的数据`)
                return cacheData.resource
            }
        }
    }

    await axios.get('https://penguin-stats.io/PenguinStats/api/v2/_private/result/matrix/CN/global/automated').then(response => {
        console.log(`${cacheKey}.返回来自服务器的数据`)
        const matrix = response.data.matrix
        const info = {
            id: cacheKey,
            resource: matrix,
            version: "automated",
            createTime: new Date().getTime()
        }
        putCache(info)
        cacheData = matrix
    }).catch(e => {
        cMessage(e)
    })

    return cacheData
}

async function getStageInfoCache(forceRefresh = false) {
    const cacheKey = 'stageInfo'
    let cacheData
    if (!forceRefresh) {
        let cacheData = await myDatabase.cache_data.get(cacheKey)
        if (cacheData) {
            if (new Date().getTime() - cacheData.createTime < 60 * 60 * 24 * 14 * 1000) {
                console.log(`${cacheKey}.返回缓存的数据`)
                return cacheData.resource
            }
        }
    }

    await materialAPI.getStageInfo().then(response => {
        console.log(`${cacheKey}.返回来自服务器的数据`)
        const stageInfo = response.data
        const info = {
            id: cacheKey,
            resource: stageInfo,
            version: new Date().getTime(),
            createTime: new Date().getTime()
        }
        putCache(info)
        cacheData = stageInfo
    })

    return cacheData
}


export default {
    getItemValueCacheByConfig, getPenguinMatrixCache, getStageInfoCache
}