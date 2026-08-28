import request from "/src/api/request";

const api_name = `/tool`;

export default {
    updateVisits(path) {
        return request({
            url: `/visits/page?path=${path}`,
            method: "get",
        });
    },

     accessLog(data) {
        return request({
            url: `/access-log`,
            method: "post",
            data:data
        });
    },

    getRecruitResult() {
        return request({
            url: `/maa/recruit/result`,
            method: "get",
        });
    },

    collectLog(logInfo){
        request({
            url:'/log/collect',
            method:'post',
            data:logInfo
        })
    }
};
