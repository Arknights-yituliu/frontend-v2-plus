import request from "/src/api/request"

export default {

    uploadQuestionnaireInfo(data){
        return request({
            url:`/questionnaire/upload`,
            method:'post',
            data:data
        })
    },

    getQuestionnaireResult(){
        return request({
            url:`/questionnaire/operator-carry`,
            method:'get'
        })
    },

}