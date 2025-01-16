import request from "/src/api/request"

const api_name = `/survey`

export default {
    /**
     * 通过玩家uid找回干员信息
     * @param data  用户凭证，uid等
     * @returns {*} 是否成功的状态
     */
    retrievalOperatorDataByUid(data){
        return request({
            url: `${api_name}/operator/table`,
            method: "post",
            data: data,
        })
    },


    uploadSkLandOperatorDataV3(data){
        return request({
            url: `${api_name}/auth/operator/import/skland/v3`,
            method: "post",
            data: data,
        })
    },

    uploadWarehouseInfo(data){
        return request({
            url:`${api_name}/warehouse-info/import/skland`,
            method:'post',
            data:data
        })
    },


    getPlayBindingListByHgToken(data){
        return request({
            url: `${api_name}/hg/player-binding`,
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
            url: `${api_name}/operator/reset`,
            method: "post",
            data: data,
        })
    },

    getCharStatisticsResult() {
        return request({
            url: `${api_name}/operator/result`,
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
            url: `${api_name}/operator/info?token=${USER_TOKEN}`,
            method: "get"
        })
    },





}
