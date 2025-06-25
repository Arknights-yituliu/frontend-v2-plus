import hmacSHA256 from 'crypto-js/hmac-sha256'
import md5 from 'crypto-js/md5'

import { createMessage} from "/src/utils/message";
import toolAPI from '/src/api/tool.js'
import {operatorTable} from "/src/utils/gameData.js";

import axios from "axios";

const SKLAND_DOMAIN = "https://zonai.skland.com";
const PLAYER_INFO_API = '/api/v1/game/player/info'
const PLAYER_BINDING_URL = '/api/v1/game/player/binding'
const OAUTH2_URL = "https://as.hypergryph.com/user/oauth2/v2/grant";
const GENERATE_CRED_BY_CODE_URL = "https://zonai.skland.com/api/v1/user/auth/generate_cred_by_code";
const CULTIVATE_PLAYER_API = '/api/v1/game/cultivate/player'


let equipDict = new Map()
if (equipDict.size < 100) {
    for (const charId in operatorTable) {
        const characterInfo = operatorTable[charId]
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
        toolAPI.collectLog(log)
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


async function getPlayerInfo(params, characterTable) {

    const {requestParam, token, cred, akUid, akNickName, channelName, channelMasterId} = params


    const url = `${SKLAND_DOMAIN}${PLAYER_INFO_API}?${requestParam}`
    // console.log(url)
    const headers = getHeaders(PLAYER_INFO_API, requestParam, cred, token)

    let uploadData = {}

    await axios.get(url,
        {
            headers: headers
        }
    ).then(response => {
        response = response.data
        if (response.code !== 0) {
            createMessage({type:'error',text:"读取森空岛数据失败"})
        } else {
            const data = response.data
            const chars = data.chars;
            const charInfoMap = data.charInfoMap;

            formattingOperatorData(chars, characterTable)

            uploadData = {
                akNickName: akNickName,
                akUid: akUid,
                channelMasterId: channelMasterId,
                channelName: channelName,
                chars: chars,
                charInfoMap: charInfoMap
            }
        }
    }).catch(error => {
        const log = {
            message: JSON.stringify(error.response),
            apiPath: PLAYER_INFO_API,
            logType: 'error'
        }
        toolAPI.collectLog(log)
        createMessage({type:'error',text:'森空岛：' + error})
        return void 0
    })

    return uploadData
}


async function getWarehouseInfo(akUid, cred, token) {

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


function formattingOperatorData(characterList) {

    let operatorList = []

    for (const character of characterList) {

        const {id, level, evolvePhase, mainSkillLevel, skills, equips, potentialRank} = character
        const potential = Math.ceil(potentialRank + 1)

        let rarity = 0;
        if (operatorTable[id]) {
            rarity = operatorTable[id].rarity
        } else {
            continue
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
            modA: 0
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

function getHeaders(url, params, cred, token) {
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
    getPlayerInfo,
    getWarehouseInfo
}