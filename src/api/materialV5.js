import request from "/src/api/request";

export default {

    listStageInfo(){
        return request({
            url: `/stage/info`,
            method:"get"
        })
    },

    listActivityStore(){
        return request({
            url: "/item/v5/store/activity",
            method: "GET",
        })
    },

    packInfoVersion(){
        return request({
            url: "/item/v5/store/pack/version",
            method: "GET",
        })
    },

    listPackStoreInfo(){
        return request({
            url: "/item/v5/store/pack",
            method: "GET",
        })
    },

    listCustomItem(){
        return request({
            url: "/item/v5/custom",
            method: "GET",
        })
    }
}