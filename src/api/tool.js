import request from "/src/api/request";

const api_name = `/tool`;

export default {
    updateVisits(path) {
        return request({
            url: `/visits/page?path=${path}`,
            method: "get",
        });
    },

    getRecruitResult() {
        return request({
            url: `/maa/recruit/result`,
            method: "get",
        });
    },
};
