import hmacSHA256 from 'crypto-js/hmac-sha256'
import md5 from 'crypto-js/md5'

import { createMessage} from "/src/utils/message";
import toolAPI from '/src/api/backend/tool.js'
import {operatorTableV2} from "/src/utils/gameData.js";

import axios from "axios";

const SKLAND_DOMAIN = "https://zonai.skland.com";
const PLAYER_BINDING_URL = '/api/v1/game/player/binding'
const CULTIVATE_PLAYER_API = '/api/v1/game/cultivate/player'
// 玩家完整信息接口：时装（data.skins）只在这个接口里返回，cultivate/player 没有
const PLAYER_INFO_API = '/api/v1/game/player/info'


let equipDict = new Map()
if (equipDict.size < 100) {
    for (const charId in operatorTableV2) {
        const characterInfo = operatorTableV2[charId]
        if (characterInfo.equip) {
            for (const equip of characterInfo.equip) {
                equipDict.set(equip.uniEquipId, equip.typeName2)
            }
        }
    }
}


async function getPlayBindingV2(defaultAkUid, params, cred, token) {


    let uid = '0'
    let nickName = ""

    let channelName = '默认'
    let channelMasterId = -1

    const url = `${SKLAND_DOMAIN}${PLAYER_BINDING_URL}`

    const headers = getHeaders(PLAYER_BINDING_URL, params, cred, token)

    let bindingData = {
        bindingList: [],
        uid: uid,
        nickName: nickName,
        channelName: '官服',
        channelMasterId: 1
    }


    await axios.get(url,
        {
            headers: headers
        }
    ).then(response => {

        response = response.data
        // console.log(response)
        if (response.code !== 0) {
            createMessage({type:'error',text:"森空岛CRED错误或失效"})
        } else {
            const list = response.data.list

            let akBindingList = []

            for (const item of list) {
                if (item.appCode === 'arknights') {
                    akBindingList = item.bindingList
                    break
                }
            }

            for (const binding of akBindingList) {
                if (defaultAkUid !== '0') {
                    if (binding.uid === defaultAkUid) {
                        uid = binding.uid;
                        nickName = binding.nickName;
                        channelName = binding.channelName
                        channelMasterId = binding.channelMasterId
                        break;
                    }
                }

                if (binding.isOfficial) {
                    uid = binding.uid;
                    nickName = binding.nickName;
                    channelName = binding.channelName
                    channelMasterId = binding.channelMasterId
                    break;
                }
            }

            if (typeof uid === "undefined") {
                const binding = list[0].bindingList[0]
                uid = binding.uid;
                nickName = binding.nickName;
                channelName = binding.channelName
                channelMasterId = binding.channelMasterId
            }

            bindingData.bindingList = akBindingList;
            bindingData.nickName = nickName;
            bindingData.uid = uid;
            bindingData.channelName = channelName
            bindingData.channelMasterId = channelMasterId
        }
    }).catch(error => {
        const log = {
            message: JSON.stringify(error.response),
            apiPath: PLAYER_BINDING_URL,
            logType: 'error'
        }

        console.log(error)
        createMessage({type:'error',text:'森空岛：' + error.response.data.message})
        return void 0
    })

    return bindingData;
}


/**
 * 获取cred和secret
 * @param text 用户输入的字符串
 * @return {{cred: *, secret: *}}  cred和secret
 */
function getCredAndSecret(text) {

    if (!text.includes(',')) {
        createMessage({type:'error',text:'输入格式不正确,应是一个中间包含逗号的一串字母'})
    }
    text = text.replace(/\s+/g, '')
        .replace(/["']/g, '')

    const textArr = text.split(',')
    const cred = textArr[0]
    const secret = textArr[1]
    return {cred, secret}

}



export async function getWarehouseInfo(akUid, cred, token) {

    const params = `uid=${akUid}`
    const headers = getHeaders(CULTIVATE_PLAYER_API, params, cred, token)
    const url = `${SKLAND_DOMAIN}${CULTIVATE_PLAYER_API}?${params}`
    let data = {}
    await axios.get(url,
        {
            headers: headers
        }
    ).then(response => {
        response = response.data

        if (response.code === 0) {
            const items = response.data.items
            const chars = response.data.characters

            const operatorDataList = formattingOperatorData(chars);

            let itemList = []
            for (const item of items) {
                itemList.push({itemId: item.id, quantity: item.count})
            }

            data = {
                uid: akUid,
                itemList: itemList,
                operatorDataList: operatorDataList,
            }

        }
    })


    return data
}


/**
 * 归一化森空岛 player/info 返回的时装集合
 *
 * <p>森空岛原始结构为 [{id, ts}]；同时兼容已归一化的 [{skinId, gainTs}] 与以 skinId 为键的对象形态。
 * 这里只做字段改名与结构展开，去重与合法性校验统一由 buildSkinEntries 处理。</p>
 *
 * @param {Array|Object} rawSkins player/info 的 data.skins
 * @returns {Array<{skinId: string, gainTs: number|undefined}>} 时装条目
 */
export function normalizeSklandSkins(rawSkins) {
    const entries = []

    if (Array.isArray(rawSkins)) {
        for (const skin of rawSkins) {
            if (!skin || typeof skin !== 'object') {
                continue
            }
            entries.push({skinId: skin.id ?? skin.skinId, gainTs: skin.ts ?? skin.gainTs})
        }
    } else if (rawSkins && typeof rawSkins === 'object') {
        for (const skinId in rawSkins) {
            const skin = rawSkins[skinId] || {}
            entries.push({skinId: skin.id ?? skinId, gainTs: skin.ts ?? skin.gainTs})
        }
    }

    return entries
}


/**
 * 读取账号已拥有的全部时装（森空岛 player/info 的 data.skins）
 *
 * <p>player/info 一次返回全量时装集合，因此结果可直接作为「全量对齐」上报的数据源。
 * 失败时返回 null：调用方应跳过 skins 字段（等价于不上报时装），而不是提交空集合。</p>
 *
 * @param {string} akUid 游戏账号 UID
 * @param {string} cred 森空岛 cred
 * @param {string} token 森空岛 token，仅用于计算 sign
 * @returns {Promise<Array<{skinId: string, gainTs: number}>|null>} 时装条目；请求失败为 null
 */
export async function getPlayerSkins(akUid, cred, token) {

    const params = `uid=${akUid}`
    const headers = getHeaders(PLAYER_INFO_API, params, cred, token)
    const url = `${SKLAND_DOMAIN}${PLAYER_INFO_API}?${params}`

    let skins = null

    await axios.get(url,
        {
            headers: headers
        }
    ).then(response => {
        const result = response.data

        if (result.code === 0) {
            skins = normalizeSklandSkins(result.data?.skins)
        } else {
            // 森空岛业务码在 code 字段，HTTP 状态始终 200；文案字段前后不一致，message / msg 都读
            createMessage({type: 'warn', text: '森空岛：' + (result.message ?? result.msg ?? '读取时装数据失败')})
        }
    }).catch(error => {
        console.log(error)
        createMessage({type: 'warn', text: '森空岛：' + (error.response?.data?.message || error.message)})
    })

    return skins
}


function formattingOperatorData(characterList) {

    let operatorList = []

    for (const character of characterList) {

        const {id, level, evolvePhase, mainSkillLevel, skills, equips, potentialRank} = character
        const potential = Math.ceil(potentialRank + 1)

        // 干员星级格式统一化修复: v2 数据 rarity 已改为 1-6 星级，去掉 +1 转换
        // 兜底：本地干员表未收录该干员（新干员/数据未同步）时不丢弃，星级默认 0
        let rarity = 0;
        if (operatorTableV2[id]) {
            rarity = operatorTableV2[id].rarity
        }


        let operator = {
            own: true,
            charId: id,
            level: level,
            elite: evolvePhase,
            potential: potential,
            mainSkill: mainSkillLevel,
            rarity: rarity,
            skill1: 0,
            skill2: 0,
            skill3: 0,
            modX: 0,
            modY: 0,
            modD: 0,
            modA: 0,
            modB:0
        }

        if (skills) {
            for (let i = 0; i < skills.length; i++) {
                if (skills[i]) {
                    operator[`skill${i + 1}`] = skills[i].level
                }
            }
        }

        if (equips) {
            for (const equip of equips) {
                const equipType = equipDict.get(equip.id)
                operator[`mod${equipType}`] = equip.level
            }
        }


        operatorList.push(operator)
    }


    return operatorList
}


function getSign(path, params, token) {
    let timestamp = Math.floor((new Date().getTime() - 300) / 1000).toString();

    const headers = {
        platform: '3',
        timestamp: timestamp,
        dId: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/118.0',
        vName: '1.2.0'
    }
    params = params ? params : ''
    let text = path + params + timestamp + JSON.stringify(headers);

    const sign = md5(hmacSHA256(text, token).toString()).toString()

    return {timestamp, sign}
}

export function getHeaders(url, params, cred, token) {
    const {timestamp, sign} = getSign(url, params, token);

    return {
        "platform": '3',
        "timestamp": timestamp,
        "dId": 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/118.0',
        "vName": '1.2.0',
        "cred": cred,
        "sign": sign
    }
}

export default {
    getPlayBindingV2,

    getWarehouseInfo,

    getPlayerSkins,
    normalizeSklandSkins
}
