import myDatabase from "/src/utils/indexedDB/IndexedDB.js";
import materialAPI from "/src/api/material.js";
import {getStageConfig} from "@/utils/user/userConfig.js";

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

    if (list.length < 10) {
        const stageConfig = getStageConfig()
        await materialAPI.getItemValueTableV4(stageConfig).then(response => {

            insertBatch(response.data)
            list = response.data
        })
    }
    return list
}


export default {
    insert, list, queryByVersion
}