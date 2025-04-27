import operator_table_simple from '/src/static/json/operator/character_table_simple.json'
import operator_update_time from '/public/json/operator_update_time.json'





function getOperatorTable(){
    for(const charId in operator_table_simple){
        const {name} = operator_table_simple[charId]

        let updateTimeStamp = new Date().getTime()
        let itemObtainApproach = '常驻干员'
        if(operator_update_time[charId]){
            const {updateTime,obtainApproach} =operator_update_time[charId]
            updateTimeStamp =  new Date(updateTime).getTime()
            itemObtainApproach = obtainApproach
        }

        operator_table_simple[charId].date = updateTimeStamp
        operator_table_simple[charId].updateTime = updateTimeStamp
        operator_table_simple[charId].itemObtainApproach = itemObtainApproach
    }




    return operator_table_simple;
}

const operatorTable = getOperatorTable()

export { operatorTable}