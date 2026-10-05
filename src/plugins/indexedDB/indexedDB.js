import Dexie from 'dexie';
const myDatabase = new Dexie('myDatabase');
myDatabase.version(2).stores({
    item_value: 'itemId,itemName,itemValueAp,itemValue,rarity,cardNum,version',
    operator_progression_statistics: 'result,data',
    cache_data:'id,resource,version,createTime',
    cache_time: 'resource,version,createTime',
});


export default myDatabase