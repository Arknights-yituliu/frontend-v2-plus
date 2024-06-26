import request from '/src/api/requestBase.js'
export default {
    collectLog(logInfo){
         request({
             url:'log/collect',
             method:'post',
             data:logInfo
         })
    }
}