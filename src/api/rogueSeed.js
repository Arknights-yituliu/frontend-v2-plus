import request from "/src/api/request";

export default {
    uploadRogueSeed(data) {
        return request({
            url: `rogue/seed/upload`, method: "post",
            data: data
        });
    },

    uploadRogueSeedSettlementChart(data) {
        return request({
            url: `auth/rogue-seed/settlement-chart`,
            method: "post",
            data: data
        });
    },

    rogueSeedRating(data) {
        return request({
            url: `rogue/seed/rating`,
            method: "post",
            data: data
        });
    },

    getRogueSeedPage(data) {
        return request({
            url: `rogue/seed/page`,
            method: "post",
            data: data
        });
    },



    getRogueSeedUserRating(uid) {
        return request({
            url: `rogue/seed/user/rating?uid=${uid}`,
            method: "get"
        });
    },

    rollRogueSeed(data) {
        return request({
            url: `rogue/seed/roll`,
            method: "post",
            data: data
        });
    }
}