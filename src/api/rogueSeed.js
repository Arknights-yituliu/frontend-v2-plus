import request from "/src/api/request";
import requestBase from "/src/api/requestBase.js";
export default {
    uploadRogueSeed(data) {
        const token = `Bearer ${localStorage.getItem("USER_TOKEN")}`
        return request({
            headers:{"test":'11',Authorization:token},
            url: `rogue/seed/upload`,
            method: "post",
            data:data
        });
    },

    uploadRogueSeedSettlementChart(data) {
        const token = `Bearer ${localStorage.getItem("USER_TOKEN")}`
        return request({
            headers:{Authorization:token},
            url: `auth/rogue-seed/settlement-chart`,
            method: "post",
            data:data
        });
    },

    rogueSeedRating(data) {
        const token = `Bearer ${localStorage.getItem("USER_TOKEN")}`
        return request({
            headers:{Authorization:token},
            url: `auth/rogue-seed/rating`,
            method: "post",
            data:data
        });
    },

    getRogueSeedPage(data) {
        return request({
            url: `auth/rogue-seed/page`,
            method: "post",
            data:data
        });
    },

    getRogueSeedPageTag() {
        return request({
            url: `rogue-seed/page-tag`,
            method: "get"
        });
    },

    getRogueSeedPageByCOS(tag) {
        return requestBase({
            url: `https://cos.yituliu.cn/rogue-seed/page/${tag}.json`,
            method: "get"
        });
    },

    getRogueSeedRatingList() {
        const token = `Bearer ${localStorage.getItem("USER_TOKEN")}`
        return request({
            headers:{"test":'11',Authorization:token},
            url: `auth/rogue-seed/rating/list`,
            method: "get"
        });
    },
}