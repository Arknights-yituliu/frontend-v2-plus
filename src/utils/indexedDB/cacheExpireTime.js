import myDatabase from "/src/utils/indexedDB/IndexedDB.js";

// myDatabase.version(1).stores({
//     cache_time: 'resource,version,createTime',
// });

function insert(data) {
    myDatabase.cache_time.put(data)
}

async function checkResourceIsExpire(name, time) {
    const data = await myDatabase.cache_time.get(name);
    if (data) {
        if ((new Date().getTime() - data.createTime) > time) {
            // console.log(new Date().getTime(),'-',data.createTime,'=',
            //     (new Date().getTime() - data.createTime),'>',time)
            return true
        }
    } else {
        return true
    }
    return false
}

export default {
    checkResourceIsExpire, insert
}