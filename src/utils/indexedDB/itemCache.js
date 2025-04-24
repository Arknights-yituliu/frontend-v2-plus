import myDatabase from "/src/utils/indexedDB/indexedDB.js";
import materialAPI from "/src/api/material.js";
import axios from "axios";
import {createMessage} from "@/utils/message.js";
import {dateFormat} from "@/utils/dateUtil.js";
import {getCustomItemList} from "/src/utils/itemValue.js";

async function putCache(data) {
    myDatabase.cache_data.put(data)
}


async function getItemValueCacheByConfig(stageConfig, forceRefresh = false) {
    const cacheKey = 'itemValue'
    let cacheData

    await getCustomItemList(stageConfig).then(response => {
        console.log(`${cacheKey}.返回来自服务器的数据`)
        if (forceRefresh) {
            createMessage({text: "强制刷新材料价值成功", type: 'success'})
        }
        const itemList = response
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

const penguinCacheKey = "penguin-cache-v1";

async function getPenguinMatrixCache(forceRefresh = false) {
    const cacheKey = 'penguinMatrixV1'

    let penguinData = []

    //非强制刷新情况下，先判断是否有缓存
    if (!forceRefresh) {
        //获取indexDB中的缓存数据
        let cacheData = await myDatabase.cache_data.get(penguinCacheKey)
        //有缓存判断缓存时间是否超过设定时间，未超过直接返回缓存
        if (cacheData) {
            if (Date.now() - cacheData.createTime < 60 * 60 * 24 * 2 * 1000) {
                console.log(`${penguinCacheKey}.返回缓存的数据`)
                await loadingPenguinData(penguinCacheKey)
                return cacheData.resource
            }
        }
    }

    //如果超过设定缓存时间，从企鹅物流获取新的数据，如果10s企鹅物流未响应，则去加载一图流的企鹅物流数据镜像
    penguinData = await loadingPenguinData(penguinCacheKey)
    console.log(penguinData)
    // await axios.get('https://penguin-stats.io/PenguinStats/api/v2/_private/result/matrix/CN/global/automated', {
    //     timeout: 10000 // 设置超时时间为10秒
    // }).then(response => {
    //     console.log(`${cacheKey}.返回来自企鹅物流的数据`)
    //     const matrix = response.data.matrix
    //     const info = {
    //         id: cacheKey,
    //         resource: matrix,
    //         version: "automated",
    //         createTime: new Date().getTime()
    //     }
    //     putCache(info)
    //     penguinData = matrix
    // }).catch(e => {
    //     if (e.message === "请求超时") {
    //         console.log("企鹅物流请求超时")
    //     } else {
    //         createMessage(e);
    //     }
    // })

    //企鹅物流请求超时，加载一图流的企鹅物流数据镜像
    if (penguinData.length < 100) {
        penguinData = loadingPenguinImageData(penguinCacheKey)
        // await axios.get('https://cos.yituliu.cn/stage-drop/matrix.json').then(response => {
        //     console.log(`${cacheKey}.返回来自企鹅物流的镜像数据`)
        //     const matrix = response.data.matrix
        //     const info = {
        //         id: cacheKey,
        //         resource: matrix,
        //         version: "automated",
        //         createTime: new Date().getTime()
        //     }
        //     putCache(info)
        //     penguinData = matrix
        // })
    }


    return penguinData
}


async function loadingPenguinData(cacheKey) {
    let responseData = []
    //如果超过设定缓存时间，从企鹅物流获取新的数据，如果10s企鹅物流未响应，则去加载一图流的企鹅物流数据镜像
    await axios.get('https://penguin-stats.io/PenguinStats/api/v2/_private/result/matrix/CN/global/automated', {
        timeout: 10000 // 设置超时时间为10秒
    }).then(response => {
        console.log(`${cacheKey}.返回来自企鹅物流的数据`)
        const matrix = response.data.matrix
        const info = {
            id: cacheKey,
            resource: matrix,
            version: "automated",
            createTime: Date.now()
        }
        putCache(info)
        responseData =  matrix
    }).catch(e => {
        if (e.message === "请求超时") {
            console.log("企鹅物流请求超时")
        } else {
            createMessage(e);
        }
    })

    return responseData
}


async function loadingPenguinImageData(cacheKey) {
    let responseData = []
    await axios.get('https://cos.yituliu.cn/stage-drop/matrix.json').then(response => {
        console.log(`${cacheKey}.返回来自企鹅物流的镜像数据`)
        const matrix = response.data.matrix
        const info = {
            id: cacheKey,
            resource: matrix,
            version: "automated",
            createTime: new Date().getTime()
        }
        putCache(info)
        responseData =  matrix
    })

    return responseData
}

function getLastSynchronizationTime() {
    return myDatabase.cache_data.get(penguinCacheKey)
}

async function getStageInfoCache(forceRefresh = false) {
    const cacheKey = 'stageInfo'
    let cacheData
    // if (!forceRefresh) {
    //     let cacheData = await myDatabase.cache_data.get(cacheKey)
    //     if (cacheData) {
    //         if (new Date().getTime() - cacheData.createTime < 60 * 60 * 2 * 1000) {
    //             console.log(`${cacheKey}.返回缓存的数据`)
    //             return cacheData.resource
    //         }
    //     }
    // }

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
    getItemValueCacheByConfig, loadingPenguinData, getPenguinMatrixCache, getStageInfoCache, getLastSynchronizationTime
}