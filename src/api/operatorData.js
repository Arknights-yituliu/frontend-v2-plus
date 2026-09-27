import request from "/src/api/request"
import {getAkAccountOperators, listAkAccounts} from "/src/api/userCenterApi.js"
import {toOperatorDataList} from "/src/utils/survey/ucOperatorData.js"


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


    importWarehouseInfo(data){
        return request({
            url:`/survey/warehouse-info/import/skland`,
            method:'post',
            data:data
        })
    },

    getCredByHgToken(data){
        return request({
            url: `/survey/hg/cred-token`,
            method: "post",
            data: data,
        })
    },

    /**
     * 申请森空岛扫码登录二维码
     * @returns {Promise<{code: number, msg: string, data: {scanId: string, qrContent: string}}>}
     */
    createSklandQrCode() {
        return request({
            url: `/survey/skland/qr/create`,
            method: "post",
        })
    },

    /**
     * 查询森空岛扫码状态（轮询，1.5~2 秒一次）
     * @param {string} scanId 扫码会话 ID
     * @returns {Promise<{code: number, msg: string, data: {status: number, msg: string, cred: string|null, token: string|null}}>}
     */
    checkSklandQrStatus(scanId) {
        return request({
            url: `/survey/skland/qr/check`,
            method: "post",
            params: {scanId},
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
            url: `/survey/operator/result/v2`,
            method: "get",
        })
    },

    /**
     * 找回用户填写的干员数据
     *
     * <p>内部已改为 UC OAuth 游戏数据接口实现：先查绑定账号列表（UC 按最近导入时间倒序），
     * 取最新的 akUid 再拉该账号的干员数据。返回值仍保持旧接口格式
     * {@code {code, msg, data}}，调用方无需改动。</p>
     *
     * @returns {Promise<{code: number, msg: string, data: Array<Object>}>} 干员数据列表
     */
    async getOperatorData() {
        const accounts = await listAkAccounts()
        const latestAccount = accounts?.[0]
        if (!latestAccount) {
            return {code: 200, msg: "操作成功", data: []}
        }

        const operatorList = await getAkAccountOperators(latestAccount.akUid)
        return {code: 200, msg: "操作成功", data: toOperatorDataList(operatorList?.items)}
    },

}
