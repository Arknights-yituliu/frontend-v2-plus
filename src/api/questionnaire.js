import request from "/src/api/request"

export default {

    uploadQuestionnaireInfo(data){
        return request({
            url:`/survey/questionnaire/upload`,
            method:'post',
            data:data
        })
    },

    getQuestionnaireResult(type){
        return request({
            url:`/survey/questionnaire/result?questionnaireType=${type}`,
            method:'get'
        })
    },

}