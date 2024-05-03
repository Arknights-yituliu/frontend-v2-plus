import hmacSHA256 from 'crypto-js/hmac-sha256'
import md5 from 'crypto-js/md5'
import request from "/src/api/requestBase";
import {cMessage} from "/src/custom/message";


const domain = "https://zonai.skland.com";
const playerInfoAPI = '/api/v1/game/player/info'
const PLAYER_BINDING_URL = '/api/v1/game/player/binding'
const OAUTH2_URL = "https://as.hypergryph.com/user/oauth2/v2/grant";
const GENERATE_CRED_BY_CODE_URL = "https://zonai.skland.com/api/v1/user/auth/generate_cred_by_code";


function getSign(path, requestParam, secret) {
    let timestamp = Math.floor((new Date().getTime() - 500) / 1000).toString();
    const headers = {
        platform: '3',
        timestamp: timestamp,
        dId: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/118.0',
        vName: '1.2.0'
    }
    requestParam = requestParam ? requestParam : ''
    let message = path + requestParam + timestamp + JSON.stringify(headers);

    const sign = md5(hmacSHA256(message, secret).toString()).toString()

    return {timestamp, sign}
}


async function getPlayBinding(defaultAkUid, requestParam, secret, cred) {

    cred = cred.replace(/\s+/g, '')
    cred = cred.replace(/["']/g, '')

    secret = secret.replace(/\s+/g, '')
    secret = secret.replace(/["']/g, '')

    const {timestamp, sign} = getSign(PLAYER_BINDING_URL, requestParam, secret);

    let uid = '0'
    let nickName = ""

    let channelName = '默认'
    let channelMasterId = -1

    const url = `${domain}${PLAYER_BINDING_URL}`
    // console.log(url)
    const headers = {
        "platform": '3',
        "timestamp": timestamp,
        "dId": 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/118.0',
        "vName": '1.2.0',
        "cred": cred,
        "sign": sign
    }
    // console.table(headers)

    let bindingData = {
        bindingList: [],
        uid: uid,
        nickName: nickName,
        channelName: '官服',
        channelMasterId: 1
    }


    await request({
        url: url,
        headers: headers,
        method: "get",
    }).then(response => {

        response = response.data
        // console.log(response)
        if (response.code !== 0) {
            cMessage("森空岛CRED错误或失效")
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
        cMessage('森空岛：' + error.response.data.message, 'error')
        return void 0
    })

    return bindingData;
}


async function getPlayerInfo(params, characterTable) {

    const {requestUrl, requestParam, secret, cred, akUid, akNickName, channelName, channelMasterId} = params

    const {timestamp, sign} = getSign(requestUrl, requestParam, secret);
    const url = `${domain}${requestUrl}?${requestParam}`
    // console.log(url)
    const headers = {
        "platform": '3',
        "timestamp": timestamp,
        "dId": 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/118.0',
        "vName": '1.2.0',
        "cred": cred,
        "sign": sign
    }
    // console.table(headers)

    let uploadData = {}

    await request({
        url: url,
        headers: headers,
        method: "get",
    }).then(response => {
        response = response.data
        if (response.code !== 0) {
            cMessage("读取森空岛数据失败")
        } else {
            const data = response.data
            const chars = data.chars;
            const charInfoMap = data.charInfoMap;

            FormattingOperatorData(chars,characterTable)

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
        console.log(error)
        cMessage('森空岛：' + error, 'error')
        return void 0
    })

    return uploadData
}

let equipDict = new Map()


function FormattingOperatorData(characterList, characterTable) {

    if (equipDict.size < 100) {
        for (const charId in characterTable) {
            const characterInfo = characterTable[charId]
            if (characterInfo.equip) {
                for (const equip of characterInfo.equip) {
                    equipDict.set(equip.uniEquipId, equip.typeName2)
                }
            }
        }
    }


    let operatorList = []

    for (const character of characterList) {
        const charId = character.charId
        let rarity = 0;
        if (characterTable[charId]) {
            rarity = characterTable[charId].rarity
        } else {
            continue
        }


        const level = character.level
        const elite = character.evolvePhase
        const potential = Math.ceil(character.potentialRank + 1)
        const mainSkill = character.mainSkillLvl


        let operator = {
            own: true,
            charId: charId,
            level: level,
            elite: elite,
            potential: potential,
            mainSkill: mainSkill,
            rarity: rarity,
            skill1: 0,
            skill2: 0,
            skill3: 0,
            modX: 0,
            modY: 0,
            modD: 0
        }


        const skills = character.skills
        if (skills) {
            for (let s = 0; s < skills.length; s++) {
                operator[`skill${s}`] = parseInt(skills[s].specializeLevel.toString())
            }
        }


        const equips = character.equip
        const defaultEquipId = character.defaultEquipId
        if (equips) {
            for (const equip of equips) {
                const equipType = equipDict.get(equip.id)
                if (equipType) {
                    if (defaultEquipId === equip.id) {
                        operator[`mod${equipType}`] = equip.level
                    }
                    if (equipType > 1) {
                        operator[`mod${equipType}`] = equip.level
                    }
                }
            }
        }


        operatorList.push(operator)
    }

    console.table(operatorList)
    return operatorList

}

export default {
    getPlayBinding,
    getPlayerInfo,
}