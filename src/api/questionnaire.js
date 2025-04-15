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

    getQuestionnaireResultV2(questionnaireType,dateRange){
        return request({
            url:`/questionnaire/operator-carry/v2?questionnaireType=${questionnaireType}&startTime=${dateRange[0]}&endTime=${dateRange[1]}`,
            method:'get'
        })
    },

}