import request from "/src/api/backend/request"

/**
 * 森空岛凭证获取接口：由本站后端代理森空岛，向前端下发可用于拉取账号列表的凭证。
 * 供「干员数据导入」向导使用：官网 token 换取凭证、扫码登录二维码申请与状态轮询。
 */
export default {
    /**
     * 用官网 account/info/hg 返回的 token 换取森空岛凭证
     * @param {Object} data 请求体，形如 {token: string}
     * @returns {Promise<{code: number, msg: string, data: {cred: string, token: string}}>} 森空岛凭证
     */
    getCredByHgToken(data){
        return request({
            url: `/survey/hg/cred-token`,
            method: "post",
            data: data,
        })
    },

    /**
     * 申请森空岛扫码登录二维码
     * @returns {Promise<{code: number, msg: string, data: {scanId: string, qrContent: string}}>} 二维码内容与本次扫码会话 ID
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
     * @returns {Promise<{code: number, msg: string, data: {status: number, msg: string, cred: string|null, token: string|null}}>} 扫码状态，status 为 0 时表示用户已确认并返回凭证
     */
    checkSklandQrStatus(scanId) {
        return request({
            url: `/survey/skland/qr/check`,
            method: "post",
            params: {scanId},
        })
    },

}
