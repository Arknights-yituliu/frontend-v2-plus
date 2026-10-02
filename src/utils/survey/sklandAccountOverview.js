import axios from "axios";

import { createMessage} from "/src/utils/message";
import toolAPI from '/src/api/backend/tool.js'
import { getWarehouseInfo, getHeaders } from "/src/utils/survey/skland.js";

// 森空岛域名（与 skland.js 保持一致）
const SKLAND_DOMAIN = "https://zonai.skland.com";
// 森空岛玩家信息接口路径（仅账号一图流使用）
const PLAYER_INFO_API = '/api/v1/game/player/info'


/**
 * 获取完整玩家信息（用于账号一图流）
 * 包括账号等级、干员、时装等信息
 * @param {string} akUid 明日方舟账号UID
 * @param {string} cred 森空岛凭证
 * @param {string} token 森空岛token
 * @returns {Promise<Object>} 玩家完整信息
 */
async function getPlayerInfoFull(akUid, cred, token) {
    const params = `uid=${akUid}`
    const headers = getHeaders(PLAYER_INFO_API, params, cred, token)
    const url = `${SKLAND_DOMAIN}${PLAYER_INFO_API}?${params}`

    let playerData = {
        status: null,       // 账号状态（等级等）
        chars: [],          // 干员列表
        charInfoMap: {},    // 干员详情映射
        skins: [],          // 时装列表
        building: null,     // 基建信息
        recruit: null,      // 招募信息
    }

    await axios.get(url, { headers: headers })
        .then(response => {
            response = response.data
            if (response.code === 0) {
                const data = response.data

                // 账号状态信息
                playerData.status = data.status || null

                // 干员信息
                playerData.chars = data.chars || []
                playerData.charInfoMap = data.charInfoMap || {}

                // 时装信息（可能是对象或数组）
                if (data.skins) {
                    if (Array.isArray(data.skins)) {
                        playerData.skins = data.skins
                    } else if (typeof data.skins === 'object') {
                        // 如果是对象，转换为数组
                        playerData.skins = Object.keys(data.skins).map(key => ({
                            skinId: key,
                            ...data.skins[key]
                        }))
                    }
                }

                // 基建信息
                playerData.building = data.building || null

                // 招募信息
                playerData.recruit = data.recruit || null

            } else {
                createMessage({type: 'error', text: "读取森空岛玩家信息失败"})
            }
        })
        .catch(error => {
            const log = {
                message: JSON.stringify(error.response),
                apiPath: PLAYER_INFO_API,
                logType: 'error'
            }
            toolAPI.collectLog(log)
            createMessage({type: 'error', text: '森空岛：' + (error.response?.data?.message || error.message)})
        })

    return playerData
}


/**
 * 获取账号一图流所需的全部数据
 * 合并玩家信息和仓库信息
 * @param {string} akUid 明日方舟账号UID
 * @param {string} nickName 昵称
 * @param {string} channelName 区服名称
 * @param {string} cred 森空岛凭证
 * @param {string} token 森空岛token
 * @returns {Promise<Object>} 账号一图流数据
 */
async function getAccountOverviewData(akUid, nickName, channelName, cred, token) {
    // 并行获取玩家信息和仓库信息
    const [playerInfo, warehouseInfo] = await Promise.all([
        getPlayerInfoFull(akUid, cred, token),
        getWarehouseInfo(akUid, cred, token)
    ])

    // 格式化干员数据（包含更多信息）
    const operatorDataList = warehouseInfo.operatorDataList || []

    // 构建干员信息映射，添加当前使用的时装信息
    const charInfoMap = playerInfo.charInfoMap || {}
    for (const operator of operatorDataList) {
        const charInfo = charInfoMap[operator.charId]
        if (charInfo) {
            operator.skinId = charInfo.skinId || null
            operator.defaultSkillId = charInfo.defaultSkillId || null
        }
    }

    return {
        uid: akUid,
        nickName: nickName,
        channelName: channelName,
        status: playerInfo.status,
        operatorDataList: operatorDataList,
        itemList: warehouseInfo.itemList || [],
        skins: playerInfo.skins || [],
        charInfoMap: charInfoMap
    }
}


export default {
    getAccountOverviewData
}
