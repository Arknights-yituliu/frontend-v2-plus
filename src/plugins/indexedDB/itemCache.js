import myDatabase from "/src/plugins/indexedDB/indexedDB.js";
import materialAPI from "/src/api/materialV5.js";
import axios from "axios";
import {createMessage} from "@/utils/message.js";
import {getItemInfoList} from "/src/utils/item/itemValue.js";
import cacheKeyDict from "/src/plugins/indexedDB/cacheKeyDict.js";


async function putCache(data) {
    myDatabase.cache_data.put(data)
}

let localItemValueCache = new Map()


async function getItemValueCacheByConfig(stageConfig, forceRefresh = false) {

    let cacheKey = cacheKeyDict.LOCAL_ITEM_INFO_LIST

    let itemValue = []

    if (!forceRefresh) {
        if (localItemValueCache.has(cacheKey)) {
            console.log("返回了临时缓存材料价值——key:", cacheKey)
            return localItemValueCache.get(cacheKey)
        }
    } else {
        console.log("强制刷新了材料价值")
        cacheKey = Date.now()
    }


    await getItemInfoList(stageConfig).then(response => {
        console.log(`材料价值计算完毕`)
        if (forceRefresh) {
            createMessage({text: "强制刷新材料价值成功", type: 'success', duration: 4000})
        }

        localItemValueCache.set(cacheKey, response)
        itemValue = response
    })

    return itemValue
}



async function getItemInfoMapCacheByConfig(stageConfig, forceRefresh = false) {

    let itemInfoMap = new Map()

    let cacheKey = cacheKeyDict.LOCAL_ITEM_INFO_MAP

    if (!forceRefresh) {
        if (localItemValueCache.has(cacheKey)) {
            console.log("返回了临时缓存材料价值——key:", cacheKey)
            return localItemValueCache.get(cacheKey)
        }
    } else {
        console.log("强制刷新了材料价值")
        cacheKey = Date.now()
    }

    const itemList = await getItemInfoList(stageConfig)

    console.log(`材料价值计算完毕`)

    if (forceRefresh) {
        createMessage({text: "强制刷新材料价值成功", type: 'success', duration: 4000})
    }

    for (const item of itemList) {
        itemInfoMap.set(item.itemId, item)
    }

    localItemValueCache.set(cacheKey, itemInfoMap)
    return itemInfoMap
}


/**
 *
 * @param stageConfig
 * @param forceRefresh
 * @returns {Promise<Map<any, any>|any>}
 */
async function getItemValueMapCacheByConfig(stageConfig, forceRefresh = false) {

    let itemValueMap = new Map()

    let cacheKey = cacheKeyDict.LOCAL_ITEM_VAlUE_MAP

    if (!forceRefresh) {
        if (localItemValueCache.has(cacheKey)) {
            console.log("返回了临时缓存材料价值——key:", cacheKey)
            return localItemValueCache.get(cacheKey)
        }
    } else {
        console.log("强制刷新了材料价值")
        cacheKey = Date.now()
    }

    const itemList = await getItemInfoList(stageConfig)

    console.log(`材料价值计算完毕`)

    if (forceRefresh) {
        createMessage({text: "强制刷新材料价值成功", type: 'success', duration: 4000})
    }

    for (const item of itemList) {
        const {itemId, itemValue} = item
        itemValueMap.set(itemId, itemValue)
    }

    localItemValueCache.set(cacheKey, itemValueMap)
    return itemValueMap
}


const penguinDataMap = new Map()
const penguinCacheKey = "penguin-cache-v3";

async function getPenguinMatrixCache() {

    // const key = cacheKeyDict.LOCAL_PENGUIN_DATA
    //
    // if(penguinDataMap.has(key)){
    //     return  penguinDataMap.get(key)
    // }

    let penguinData = []

    //非强制刷新情况下，先判断是否有缓存

    //获取indexDB中的缓存数据
    let cacheData = await myDatabase.cache_data.get(penguinCacheKey)
    //有缓存判断缓存时间是否超过设定时间，未超过直接返回缓存
    if (cacheData) {
        if (Date.now() - cacheData.createTime < 60 * 60 * 1000) {
            console.log(`${penguinCacheKey}.返回缓存的数据`)

            return cacheData.resource
        }
    }


    // //如果超过设定缓存时间，从企鹅物流获取新的数据，如果10s企鹅物流未响应，则去加载一图流的企鹅物流数据镜像
    // // penguinData = await loadingPenguinData(penguinCacheKey)
    // // console.log(penguinData)
    // await axios.get('https://penguin-stats.io/PenguinStats/api/v2/_private/result/matrix/CN/global/automated', {
    //     timeout: 10000 // 设置超时时间为10秒
    // }).then(response => {
    //     console.log(`${penguinCacheKey}.返回来自企鹅物流的数据`)
    //     const matrix = response.data.matrix
    //     const info = {
    //         id: penguinCacheKey,
    //         resource: matrix,
    //         version: "automated",
    //         createTime: new Date().getTime()
    //     }
    //
    //     penguinDataMap.set()
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

        // penguinData = loadingPenguinImageData(penguinCacheKey)
        await axios.get('https://cos.yituliu.cn/stage-drop/matrix.json').then(response => {
            console.log(`${penguinCacheKey}.返回来自企鹅物流的镜像数据`)
            const matrix = response.data.matrix
            const info = {
                id: penguinCacheKey,
                resource: matrix,
                version: "automated",
                createTime: new Date().getTime()
            }
            putCache(info)
            penguinData = matrix
        })



    return penguinData
}



function getLastSynchronizationTime() {
    return myDatabase.cache_data.get(penguinCacheKey)
}

async function getStageInfoCache() {
    const cacheKey = 'stageInfo-v4'
    let stageInfo


    let cacheData = await myDatabase.cache_data.get(cacheKey)
    if (cacheData) {
        if (new Date().getTime() - cacheData.createTime < 60 * 60 * 1000) {
            console.log(`${cacheKey}.返回缓存的数据`)
            return cacheData.resource
        }
    }


    await materialAPI.listStageInfo().then(response => {
        console.log(`${cacheKey}.返回来自服务器的数据`)
        const data = response.data
        const info = {
            id: cacheKey,
            resource: data,
            version: new Date().getTime(),
            createTime: new Date().getTime()
        }
        putCache(info)
        stageInfo = data
    })

    return stageInfo
}


export default {
    getItemValueCacheByConfig,getItemValueMapCacheByConfig,getItemInfoMapCacheByConfig, getPenguinMatrixCache, getStageInfoCache, getLastSynchronizationTime
}