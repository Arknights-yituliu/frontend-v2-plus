import myDatabase from "/src/utils/indexedDB/IndexedDB.js";
import materialAPI from "/src/api/material.js";
import axios from "axios";
import {cMessage} from "@/utils/message.js";


function putCache(data) {
    myDatabase.cache_data.put(data)
}

async function getItemValueCacheByConfig(stageConfig) {
    const cacheKey = 'itemValue'
    let cacheData = await myDatabase.cache_data.get(cacheKey)

    if (cacheData) {
        if (new Date().getTime() - cacheData.createTime < 60 * 60 * 1000) {
            console.log(`${cacheKey}.返回缓存的数据`)
            return cacheData.resource
        }
    }


    await materialAPI.getItemValueTableV4(stageConfig).then(response => {
        console.log(`${cacheKey}.返回来自服务器的数据`)
        const itemList = response.data
        const info = {id: cacheKey, resource: itemList, version: stageConfig.id, createTime: new Date().getTime()}
        myDatabase.cache_data.put(info)
        cacheData = itemList
    })

    return cacheData
}


async function getPenguinMatrixCache() {
    const cacheKey = 'penguinMatrix'
    let cacheData = await myDatabase.cache_data.get(cacheKey)

    if (cacheData) {
        if (new Date().getTime() - cacheData.createTime < 60 * 60 * 1000) {
            console.log(`${cacheKey}.返回缓存的数据`)
            return cacheData.resource
        }
    }

    await axios.get('https://penguin-stats.io/PenguinStats/api/v2/_private/result/matrix/CN/global/automated').then(response => {
        console.log(`${cacheKey}.返回来自服务器的数据`)
        const matrix = response.data.matrix
        const info = {id: cacheKey, resource: matrix, version: "automated", createTime: new Date().getTime()}
        putCache(info)
        cacheData = matrix
    }).catch(e => {
        cMessage(e)
    })

    return cacheData
}


export default {
    getItemValueCacheByConfig,getPenguinMatrixCache
}