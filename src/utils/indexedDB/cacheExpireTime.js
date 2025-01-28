import myDatabase from "/src/utils/indexedDB/IndexedDB.js";

myDatabase.version(1).stores({
    cache_time: 'resource,version,createTime',
});

myDatabase.open().catch(function (err) {
    console.error ('打开数据库失败: ' + err);
});

function insert(data) {
    myDatabase.cache_time.add(data)
}