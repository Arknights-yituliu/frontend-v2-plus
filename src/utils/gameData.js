import operator_table_simple from '/src/static/json/operator/character_table_simple.json'
import operator_update_time from '/public/json/operator_update_time.json'

import operator_table_v2 from '/src/static/json/operator/character_table_simple.v2.json'

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

function getOperatorTableV2(){
    for(const charId in operator_table_v2){
        const {name} = operator_table_v2[charId]

        let updateTimeStamp = new Date().getTime()
        let itemObtainApproach = '常驻干员'
        if(operator_update_time[charId]){
            const {updateTime,obtainApproach} =operator_update_time[charId]
            updateTimeStamp =  new Date(updateTime).getTime()
            itemObtainApproach = obtainApproach
        }

        operator_table_v2[charId].date = updateTimeStamp
        operator_table_v2[charId].updateTime = updateTimeStamp
        operator_table_v2[charId].itemObtainApproach = itemObtainApproach
    }
    return operator_table_v2;
}

const operatorTable = getOperatorTable()

const operatorTableV2 = getOperatorTableV2()

export { operatorTable,operatorTableV2}