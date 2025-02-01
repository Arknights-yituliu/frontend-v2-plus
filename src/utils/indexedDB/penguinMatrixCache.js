import myDatabase from "/src/utils/indexedDB/IndexedDB.js";
import axios from "axios";
import {cMessage} from "@/utils/message.js";

function putCache(data) {
    myDatabase.cache_data.put(data)
}

async function getCache(cacheKey) {
    let cacheData = await myDatabase.cache_data.get(cacheKey)

    if (cacheData) {
        if (new Date().getTime() - cacheData.createTime < 60 * 60 * 12 * 1000) {
            console.log('返回缓存的数据')
            return cacheData.resource
        }
    }

    await axios.get('https://penguin-stats.io/PenguinStats/api/v2/_private/result/matrix/CN/global/automated').then(response => {
        console.log('返回来自服务器的数据')
        const matrix = response.data.matrix
        const cacheData = {id: cacheKey, resource: matrix, version: "automated", createTime: new Date().getTime()}
        putCache(cacheData)
        return matrix
    }).catch(e => {
        cMessage(e)
    })


}

export default {
     getCache
}
