import myDatabase from "/src/utils/indexedDB/indexedDB.js";
import materialAPI from "/src/api/materialV5.js";
import axios from "axios";

async function putCache(data) {
    myDatabase.cache_data.put(data)
}

const packInfoCacheKey = 'PackInfo-cache-v1'

async function listPackInfo() {
    let listPackInfo = [];
    const versionResponse = await materialAPI.packInfoVersion()
    const version = versionResponse.data
    const cacheData = await myDatabase.cache_data.get(packInfoCacheKey);
    if (cacheData) {
        console.log(cacheData)
        console.log(cacheData.version,version,cacheData.version === version)
        if (cacheData.version === version) {
            console.log(`${packInfoCacheKey}——返回缓存的数据——版本${version}`)
            return cacheData.resource
        }
    }


    await materialAPI.listPackStoreInfo().then(response => {
        const data = response.data
        const info = {
            id: packInfoCacheKey,
            resource: data,
            version: version,
            createTime: Date.now()
        }
        putCache(info)
        console.log(`${packInfoCacheKey}——返回服务器的数据——版本${version}`)
        listPackInfo = data
    })


    return listPackInfo

}

export default {
    listPackInfo
}