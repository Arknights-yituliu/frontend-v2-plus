import Dexie from 'dexie';
const myDatabase = new Dexie('myDatabase');

function addData(data) {
    myDatabase.version(1).stores({
        cacheData: 'name, resource, updateTime', // Primary key and indexed props
    });
    myDatabase.cacheData.add(data)
}


myDatabase.version(1).stores({
    user_action_on_Seed: 'id,seedId, action, create_time', // Primary key and indexed props
});



async function getDataByKey(key) {
    const myDatabase = new Dexie('myDatabase');
    myDatabase.version(1).stores({
        cacheData: 'name, resources, updateTime', // Primary key and indexed props
    });

    return  myDatabase.cacheData.get(key)
}


function insertUserActionOnSeed(data){
    myDatabase.user_action_on_Seed.add(data)
}

function listUserActionOnSeed(key){
    return  myDatabase.user_action_on_Seed.toArray()
}

function queryUserActionOnSeed(key){
    return  myDatabase.user_action_on_Seed
}


export {
    addData, getDataByKey
}