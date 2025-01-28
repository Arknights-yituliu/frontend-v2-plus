import Dexie from 'dexie';
const myDatabase = new Dexie('myDatabase');
myDatabase.version(1).stores({
    item_value: 'itemId,itemName,itemValueAp,rarity,cardNum,version',
    operator_progression_statistics: 'result,data',
    user_action_on_Seed: 'id,seedId,action,create_time',
    cache_time: 'resource,version,createTime',
});


export default myDatabase