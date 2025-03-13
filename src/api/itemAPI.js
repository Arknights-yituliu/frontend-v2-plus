import request from "/src/api/request";

export default {

    listActivityStore(){
        return request({
            url: "/item/v5/store/activity",
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