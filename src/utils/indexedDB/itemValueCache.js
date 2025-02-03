import myDatabase from "/src/utils/indexedDB/IndexedDB.js";
import materialAPI from "/src/api/material.js";


function putCache(data) {
    myDatabase.cache_data.put(data)
}

async function getCacheByVersion(cacheKey, stageConfig) {
    let cacheData = await myDatabase.cache_data.get(cacheKey)

    if (cacheData) {
        if (new Date().getTime() - cacheData.createTime < 60 * 60  * 1000) {
            console.log('返回缓存的数据')
            return cacheData.resource
        }
    }


    await materialAPI.getItemValueTableV4(stageConfig).then(response => {
        console.log('返回来自服务器的数据')
        const data = response.data
        const serverData = {id: cacheKey, resource: data, version: "automated", createTime: new Date().getTime()}
        putCache(serverData)
        cacheData = data
    })

   return   cacheData

}


export default {
    getCacheByVersion
}