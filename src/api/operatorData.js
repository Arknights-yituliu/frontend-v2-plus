import request from "/src/api/request"


export default {
    /**
     * 通过玩家uid找回干员信息
     * @param data  用户凭证，uid等
     * @returns {*} 是否成功的状态
     */
    retrievalOperatorDataByUid(data){
        return request({
            url: `/survey/operator/table`,
            method: "post",
            data: data,
        })
    },


    importSkLandOperatorDataV3(data){
        return request({
            url: `/auth/survey/operator/import/skland/v3`,
            method: "post",
            data: data,
        })
    },

    importWarehouseInfo(data){
        return request({
            url:`/survey/warehouse-info/import/skland`,
            method:'post',
            data:data
        })
    },


    getPlayBindingListByHgToken(data){
        return request({
            url: `/survey/hg/player-binding`,
            method: "post",
            data: data,
        })
    },

    /**
     * 重置干员练度数据
     * @param data
     * @returns {*} 是否成功的状态
     */
    resetOperatorData(data){
        return request({
            url: `/survey/operator/reset`,
            method: "post",
            data: data,
        })
    },

    getOperatorStatisticsResult() {
        return request({
            url: `/survey/operator/result`,
            method: "get",
        })
    },

    /**
     * 找回用户填写的干员数据
     * @returns {*}
     */
    getOperatorData() {
        const USER_TOKEN = encodeURIComponent(localStorage.getItem("USER_TOKEN"))
        return request({
            url: `/survey/operator/info?token=${USER_TOKEN}`,
            method: "get"
        })
    },

    uploadOperatorInfo(characterList) {
        return request({
            url: `/auth/survey/operator/upload`,
            method: "post",
            data: characterList,
        })
    },



}
