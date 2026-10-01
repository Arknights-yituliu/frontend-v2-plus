import {getAkAccountOperators, listAkAccounts} from "/src/api/uc/userCenterApi.js"
import {toOperatorDataList} from "/src/utils/survey/ucOperatorData.js"


export default {
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
