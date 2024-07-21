import request from "/src/api/request"

const api_name = `/survey`

export default {

    uploadQuestionnaireInfo(data){
        return request({
            url:`${api_name}/questionnaire/upload`,
            method:'post',
            data:data
        })
    },

}