import operator_table_simple from '/src/static/json/operator/character_table_simple.json'
import operator_add_time from '/src/static/json/operator/operator_update_time.json'




function getOperatorTable(){
    for(const charId in operator_table_simple){
        const {name} = operator_table_simple[charId]

        let updateTime = new Date().getTime()
        let itemObtainApproach = '常驻干员'
        if(operator_add_time[name]){
            const {addTime,obtainApproach} =operator_add_time[name]
            updateTime =  new Date(addTime).getTime()
            itemObtainApproach = obtainApproach
        }

        operator_table_simple[charId].date = updateTime
        operator_table_simple[charId].updateTime = updateTime
        operator_table_simple[charId].itemObtainApproach = itemObtainApproach
    }

    return operator_table_simple;
}

const operatorTable = getOperatorTable()

export { operatorTable}