import myDatabase from "/src/utils/indexedDB/IndexedDB.js";
import operatorDataAPI from "/src/api/operatorData.js";
import checkCache from '/src/utils/indexedDB/cacheExpireTime.js'

myDatabase.version(1).stores({
    operator_progression_statistics: 'result,data',
});

function insert(data) {
    myDatabase.operator_progression_statistics.put(data)
}

async function getData() {
    let result = await myDatabase.operator_progression_statistics.get("operatorProgressionStatistics");

    const expireFlag = await checkCache.checkResourceIsExpire("operatorProgressionStatistics", 60 * 60 * 1000);


    if (!result || expireFlag) {
        await operatorDataAPI.getOperatorStatisticsResult().then(response => {
            insert({result:'operatorProgressionStatistics',data:response.data})
            checkCache.insert({resource: "operatorProgressionStatistics", version: 11111, createTime: new Date().getTime()})

            result = response.data
        })
        console.log("返回服务器的干员练度统计数据")
        return result
    }

    console.log("返回缓存的干员练度统计数据")

    return result.data
}


export default {
    insert, getData
}