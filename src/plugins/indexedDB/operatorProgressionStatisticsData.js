import myDatabase from "/src/plugins/indexedDB/indexedDB.js";
import operatorDataAPI from "/src/api/operatorData.js";



function putCache(data) {
    myDatabase.cache_data.put(data)
}

async function getData(cacheKey) {
    let cacheData = await myDatabase.cache_data.get(cacheKey)

    if (cacheData&&cacheData.resource.result.length) {
        if (new Date().getTime() - cacheData.createTime < 60 * 60 * 24 * 7 * 1000) {
            console.log(cacheKey,'返回缓存的数据')
            return cacheData.resource
        }
    }

    await operatorDataAPI.getOperatorStatisticsResult().then(response => {
        console.log(cacheKey,'返回来自服务器的数据')
        const data = response.data
        const serverData = {id: cacheKey, resource: data, version: "automated", createTime: new Date().getTime()}
        putCache(serverData)
        console.log(response.data)
        cacheData =  data
    })

    return cacheData
}


export default {
   getData
}