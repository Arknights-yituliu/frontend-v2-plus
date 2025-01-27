import Dexie from 'dexie';
const myDatabase = new Dexie('myDatabase');

myDatabase.version(1).stores({
    user_action_on_Seed: 'id,seedId,action,create_time', // Primary key and indexed props
});

function insert(data){
    myDatabase.user_action_on_Seed.add(data)
}

function list(key){
    return  myDatabase.user_action_on_Seed.toArray()
}

function queryByAction(action){
    return  myDatabase.user_action_on_Seed.where('action').equals(action).toArray()
}


export default {
     insert, list,queryByAction
}