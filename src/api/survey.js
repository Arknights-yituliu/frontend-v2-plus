import request from "@/api/request";

const api_name = `/maa`;

export default {


    manualUploadOperBox(data) {
        return request({
            headers: {
                'Content-Type': 'application/json'
            },
            url: `${api_name}/upload/operBox/manual`,
            method: "post",
            data: data
        });
    },

    getOperatorDataResult() {
        return request({
            url: `${api_name}/operator/result`,
            method: "get"
        });
    },



    maaStatistical() {
        return request({
            url: `${api_name}/recruit/statistical`,
            method: "get",
        });
    },



};