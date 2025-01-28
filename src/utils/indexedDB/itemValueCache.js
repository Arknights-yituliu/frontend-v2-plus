import myDatabase from "/src/utils/indexedDB/IndexedDB.js";
import materialAPI from "/src/api/material.js";
import {getStageConfig} from "@/utils/user/userConfig.js";
import checkCache from '/src/utils/indexedDB/cacheExpireTime.js'

myDatabase.version(1).stores({
    item_value: 'itemId,itemName,itemValueAp,rarity,cardNum,version',
});

function insert(data) {
    myDatabase.item_value.add(data)
}

function insertBatch(list) {
    myDatabase.item_value.bulkPut(list)
}

function list(key) {
    return myDatabase.item_value.toArray()
}

async function queryByVersion() {
    let list = await myDatabase.item_value.toArray();

    const expireFlag = await checkCache.checkResourceIsExpire("itemValue", 60 * 60 * 1000);
    if (list.length < 10 || expireFlag) {
        const stageConfig = getStageConfig()
        await materialAPI.getItemValueTableV4(stageConfig).then(response => {
            insertBatch(response.data)
            checkCache.insert({resource: "itemValue", version: stageConfig.id, createTime: new Date().getTime()})
            list = response.data
        })

        console.log("返回服务器的材料价值表")
         return list
    }
    console.log("返回缓存的材料价值表")
    return list
}


export default {
    insert, list, queryByVersion
}