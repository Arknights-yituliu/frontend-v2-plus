import request from "/src/api/request";

export default {

    getActivityStore(){
        return request({
            url: "/item/v5/store/activity",
            method: "GET",
        })
    }

}