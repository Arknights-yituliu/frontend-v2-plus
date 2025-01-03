import Dexie from 'dexie';


function addData(data) {
    const myDatabase = new Dexie('myDatabase');
    myDatabase.version(1).stores({
        cacheData: 'name, resource, updateTime', // Primary key and indexed props
    });
    myDatabase.cacheData.add(data)
}

async function getDataByKey(key) {
    const myDatabase = new Dexie('myDatabase');
    myDatabase.version(1).stores({
        cacheData: 'name, resources, updateTime', // Primary key and indexed props
    });

    return  myDatabase.cacheData.get(key)
}



function getOperatorData(){
    getDataByKey("operatorTable").then(result => {
        if(!result){
            //保存数据
        }
    })
}


export {
    addData, getDataByKey
}