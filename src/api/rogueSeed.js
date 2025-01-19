import request from "/src/api/request";
import requestBase from "/src/api/requestBase.js";

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
            url: `auth/rogue/seed/rating`,
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



    getRogueSeedUserRating() {
        return request({
            url: `rogue/seed/user/rating`,
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